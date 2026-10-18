// Browser checks for the site theme: follows the saved theme / OS setting, the toggle
// persists, and every screen (title, play, reveal, end with chart) renders in both themes.
const { test, expect } = require('@playwright/test');

function watchConsole(page) {
  const bad = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') bad.push(m.text()); });
  page.on('pageerror', e => bad.push(e.message));
  return bad;
}
const bg = page => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function begin(page) {
  await page.goto('/?seed=42');
  await page.click('.pick[data-k=timer] [data-v=off]');
  await page.fill('#nameIn', 'Tester');
  await page.click('#nameForm button[type=submit]');
  await expect(page.locator('#play')).toBeVisible();
}
async function playStep(page) {
  if (await page.locator('#payup').isVisible()) return page.click('#payCard');
  const opt = page.locator('[data-choose="0"]');
  if (await opt.count()) return opt.click();
  await page.click('#goBtn');
  await page.locator('#contBtn').click();
}

test('saved theme wins over the OS setting', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await bg(page)).toBe('rgb(255, 255, 255)');
  await ctx.close();
});

test('an invalid saved value falls back to the OS setting', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('theme', 'purple'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await ctx.close();
});

test('the toggle survives a reload and a new game', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light'); });
  await page.goto('/');
  await page.click('#themeBtn');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await begin(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the toggle works while playing and recolours the pot and jars', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await begin(page);
  const potFill = () => page.locator('#miniPot circle[fill="var(--red)"]').first().evaluate(el => getComputedStyle(el).fill);
  const light = await potFill();
  await page.click('#themeBtn');
  const dark = await potFill();
  expect(dark).not.toBe(light);
  expect(await bg(page)).toBe('rgb(3, 7, 18)');
});

for (const theme of ['light', 'dark']) {
  test(`full game in ${theme} mode: no console errors and the end chart draws`, async ({ page }) => {
    await page.addInitScript(t => localStorage.setItem('theme', t), theme);
    const bad = watchConsole(page);
    await begin(page);
    for (let i = 0; i < 80 && !(await page.locator('#end').isVisible()); i++) await playStep(page);
    await expect(page.locator('#end')).toBeVisible();
    await expect(page.locator('#chart')).toBeVisible();
    // the chart canvas must actually have painted something (non-transparent pixels)
    await page.waitForTimeout(1500);
    const painted = await page.locator('#chart').evaluate(c => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    });
    expect(painted).toBe(true);
    expect(bad).toEqual([]);
  });
}

test('mobile width: no horizontal scroll on title, play and end screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await page.goto('/?seed=42');
  expect(await overflow()).toBe(false);
  await begin(page);
  expect(await overflow()).toBe(false);
  for (let i = 0; i < 80 && !(await page.locator('#end').isVisible()); i++) await playStep(page);
  expect(await overflow()).toBe(false);
});
