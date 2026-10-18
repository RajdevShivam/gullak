// Static checks on the site theme: tokens are consistent, nothing is hard-coded
// outside the token blocks, and text stays readable (WCAG AA) in light and dark.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'gullak');
const css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8').replace(/\r\n/g, '\n');
const ui = fs.readFileSync(path.join(dir, 'ui.js'), 'utf8');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

function block(selectorStart) {
  const i = css.indexOf(selectorStart);
  assert.ok(i >= 0, selectorStart + ' block missing');
  return css.slice(i, css.indexOf('}', i));
}
function tokens(b) {
  const out = {};
  for (const m of b.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const light = tokens(block(':root{'));
const dark = tokens(block('html[data-theme="dark"]{'));

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// Tokens that are flat hex in both themes; translucent ones (rgba) are composited onto the page.
function over(bgHex, rgba) {
  const m = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  const [r, g, b, a] = [+m[1], +m[2], +m[3], +m[4]];
  const n = parseInt(bgHex.slice(1), 16);
  const mix = (c, base) => Math.round(c * a + base * (1 - a));
  const h = v => v.toString(16).padStart(2, '0');
  return '#' + h(mix(r, (n >> 16) & 255)) + h(mix(g, (n >> 8) & 255)) + h(mix(b, n & 255));
}
const solid = (theme, name, bg) => (theme[name].startsWith('rgba') ? over(bg, theme[name]) : theme[name]);

test('dark theme overrides the same colour tokens the light theme defines', () => {
  const colourTokens = Object.keys(light).filter(k => /^#|^rgba/.test(light[k]));
  const missing = colourTokens.filter(k => !(k in dark));
  assert.deepStrictEqual(missing, []);
});

test('every var(--x) used in the CSS and JS is defined', () => {
  const used = new Set();
  for (const src of [css, ui]) for (const m of src.matchAll(/var\(--([a-z0-9-]+)\)/g)) used.add(m[1]);
  const defined = new Set([...Object.keys(light), ...Object.keys(dark), 'p', 'd', 't', 'x', 'y', 'rot']);
  const undefinedVars = [...used].filter(v => !defined.has(v));
  assert.deepStrictEqual(undefinedVars, []);
});

test('no hard-coded colours outside the token blocks (CSS and ui.js)', () => {
  const afterTokens = css.slice(css.indexOf('*{box-sizing'));
  const hex = afterTokens.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  const rgba = afterTokens.match(/rgba?\(/g) || [];
  assert.deepStrictEqual(hex, [], 'hex colours in style.css rules');
  assert.deepStrictEqual(rgba, [], 'rgb()/rgba() colours in style.css rules');
  assert.deepStrictEqual(ui.match(/#[0-9a-fA-F]{6}\b/g) || [], [], 'hex colours in ui.js');
});

for (const [name, theme] of [['light', light], ['dark', dark]]) {
  const t = k => theme[k] || light[k];
  test(`${name}: body text and secondary text meet AA contrast on the page and card`, () => {
    for (const bg of ['paper', 'paper2']) {
      assert.ok(contrast(t('ink'), t(bg)) >= 4.5, `ink on ${bg}`);
      assert.ok(contrast(t('mut'), t(bg)) >= 4.5, `mut on ${bg}`);
    }
  });
  test(`${name}: accent text and button label are readable`, () => {
    assert.ok(contrast(t('red'), t('paper')) >= 4.5, 'accent text on paper');
    assert.ok(contrast(t('on-red'), t('red')) >= 4.5, 'label on accent button');
    assert.ok(contrast(t('on-red'), t('red-d')) >= 4.5, 'label on hovered accent button');
  });
  test(`${name}: gains and losses are readable on their tints`, () => {
    const g = solid(theme, 'gain-bg', t('paper')), l = solid(theme, 'loss-bg', t('paper'));
    assert.ok(contrast(t('gain'), g) >= 4.5, 'gain on gain-bg');
    assert.ok(contrast(t('loss'), l) >= 4.5, 'loss on loss-bg');
    assert.ok(contrast(t('gain'), t('paper')) >= 4.5, 'gain on paper');
    assert.ok(contrast(t('loss'), t('paper')) >= 4.5, 'loss on paper');
  });
}

test('page loads no web fonts and reads the site theme before first paint', () => {
  assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(html), 'no Google Fonts requests');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(/localStorage\.getItem\('theme'\)/.test(head), 'theme script is in <head>');
  assert.ok(/data-theme/.test(head));
});

test('site bar and theme toggle are in the page', () => {
  assert.ok(html.includes('class="sitebar"'));
  assert.ok(html.includes('id="themeBtn"'));
  for (const href of ['"/"', '"/posts"', '"/news"', '"/about"']) assert.ok(html.includes('href=' + href), href);
});
