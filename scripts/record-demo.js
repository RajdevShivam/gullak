// Records a silent walkthrough of the live game (seed 42, Mumbai, IT, no timer) to demo/gullak-demo.webm.
// Usage: node scripts/record-demo.js [url]
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const URL = process.argv[2] || 'https://shivamrajdev.com/gullak/?seed=42';
const OUT = path.join(__dirname, '..', 'demo');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const size = { width: 1280, height: 720 };
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: OUT, size } });
  const page = await ctx.newPage();
  const wait = ms => page.waitForTimeout(ms);
  const state = fn => page.evaluate(fn);
  const top = () => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const reveal = async (ms = 2600) => { await page.click('#goBtn'); await wait(ms); await page.click('#contBtn'); await wait(700); };
  const skip = async (ms = 2200) => { await page.click('#ffBtn'); await wait(ms); await page.click('#contBtn'); await wait(700); };
  const choose = async (i, ms = 1800) => { await page.click(`[data-choose="${i}"]`); await wait(ms); };
  const card = async (ms = 1200) => { if (await page.locator('#payup').isVisible()) { await page.click('#payCard'); await wait(ms); } };
  // Caption bar narrating the video (a fixed overlay; the game never reloads, so it persists)
  const cap = text => page.evaluate(t => {
    let el = document.getElementById('democap');
    if (!el) {
      el = document.createElement('div'); el.id = 'democap';
      el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;max-width:1060px;width:max-content;padding:12px 22px;background:rgba(43,42,38,.92);color:#FBF7EC;font:500 24px/1.35 Newsreader,Georgia,serif;border-left:5px solid #9E2B25;border-radius:4px;box-shadow:0 6px 24px rgba(0,0,0,.25);transition:opacity .3s';
      document.body.appendChild(el);
    }
    el.style.opacity = t ? 1 : 0; if (t) el.textContent = t;
  }, text);
  const pendingId = () => state(() => window.__gullak.state.pending && window.__gullak.state.pending.id);

  // Title page
  await page.goto(URL); await cap('Every Indian kid had a gullak. Here are 20 real years of Indian markets to fill it.'); await wait(3500);
  await cap('We just won’t tell you which 20.'); await wait(2200);
  await page.evaluate(() => document.querySelector('#nameForm').scrollIntoView({ behavior: 'smooth', block: 'center' })); await wait(1200);
  await cap('Pick a life: Mumbai, an IT job.');
  for (const s of ['.pick[data-k=city] [data-v=mumbai]', '.pick[data-k=job] [data-v=it]', '.pick[data-k=timer] [data-v=off]']) { await page.click(s); await wait(600); }
  await page.fill('#nameIn', ''); await page.type('#nameIn', 'Judge', { delay: 120 }); await wait(500);
  await page.click('#nameForm button[type=submit]'); await cap('Year 1. Mumbai pay, Mumbai rent: ₹1.2 L left for the gullak.'); await wait(4000);

  // Year 1: move the sliders to 70% Nifty / 30% FD, then invest
  await page.evaluate(() => {
    const set = (k, v) => { const el = document.querySelector(`input[type=range][data-k="${k}"]`); el.value = v; el.dispatchEvent(new Event('input')); };
    set('sav', 0); set('fd', 30); set('nifty', 70);
  });
  await cap('70% index fund, 30% fixed deposit. In it goes.'); await wait(2200); await reveal(); await top();

  // Fast-forward to the crash year; note the new stock tip; take the hit
  await cap('Fast-forward… which stops right before anything big.'); await skip(); await top();
  await cap('A giant bank collapses overseas. Also, a new stock tip lands in the family WhatsApp group.'); await wait(4200);
  await cap('Ouch. The worst year yet.'); await reveal(3600); await top();

  // Year 5: "stay away from shares" + the big fat wedding -> the bill
  await cap('“Everyone says stay away from shares.” Also: you’re getting married.'); await wait(3800);
  await cap('Big fat wedding. Three days, 600 guests, the band, the horse.'); await choose(0, 1200);
  await cap('₹4.8 L is due. Now. Sell at a loss, or swipe the card at 36%?'); await wait(5500);
  await cap('Card it. What could go wrong?'); await card(); await top(); await wait(1500); await cap('Markets bounce back +76%. Not that it helps the card.'); await reveal(); await top();

  await cap('Years fly by…');
  for (let i = 0; i < 8; i++) {
    const r = await state(() => window.__gullak.state.round);
    if (r >= 10) break;
    if (await pendingId()) { await choose(1); await card(); continue; }
    await skip(1800); await top();
  }
  await cap('Diwali bumper lottery: ₹33.7 L! Then the phone starts ringing.'); await wait(4200);
  await reveal(); await top();
  await cap('A villa? Yes. Mama-ji’s franchise of a franchise? Obviously.');

  // The asks: villa and Mama-ji yes, defaults otherwise; card every bill; skip when possible
  for (let i = 0; i < 40; i++) {
    const done = await state(() => window.__gullak.state.done);
    if (done) break;
    if (await page.locator('#payup').isVisible()) { await wait(1200); await card(); continue; }
    const id = await pendingId();
    if (id) {
      const pick = ['lifestyle', 'mamaji'].includes(id) ? 0 : await state(() => window.__gullak.state.pending.def);
      await wait(1500); await choose(pick); continue;
    }
    if ((await page.locator('#ffBtn').innerText()).startsWith('Skip')) { await skip(1500); await top(); }
    else { await reveal(1800); }
  }

  // The end: let the gullak crack, then scroll through reveal, podium, takeaways, chart
  await cap('At 45, the gullak cracks.'); await wait(4500);
  const ends = [['#yearsReveal', 'Surprise: you just lived through 2005 to 2024. Stock tip A? Yes Bank.'],
    ['#podium', 'SIP Aunty did nothing for 20 years. She won. Pass the raita.'],
    ['#takeaways', 'Three lessons, drawn from your own life.'],
    ['.endgrid', 'No AI, no login, one static page. Play it: shivamrajdev.com/gullak']];
  for (const [sel, t] of ends) {
    await page.evaluate(s => document.querySelector(s).scrollIntoView({ behavior: 'smooth', block: 'center' }), sel);
    await cap(t); await wait(4500);
  }
  await wait(1500);
  const video = page.video();
  await ctx.close(); await browser.close();
  const file = path.join(OUT, 'gullak-demo.webm');
  fs.renameSync(await video.path(), file);
  console.log('saved', file);
})();
