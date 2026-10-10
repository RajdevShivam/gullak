// Plays Gullak through the real UI in Chrome: title picks, decisions, bills, reveals, end screen.
const { test, expect } = require('@playwright/test');

function watchConsole(page) {
  const bad = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') bad.push(m.text()); });
  page.on('pageerror', e => bad.push(e.message));
  return bad;
}
async function begin(page, { timer = 'on', city = 'mumbai', job = 'it' } = {}) {
  await page.goto('/?seed=42');
  await page.click(`.pick[data-k=city] [data-v=${city}]`);
  await page.click(`.pick[data-k=job] [data-v=${job}]`);
  await page.click(`.pick[data-k=timer] [data-v=${timer}]`);
  await page.fill('#nameIn', 'Tester');
  await page.click('#nameForm button[type=submit]');
  await expect(page.locator('#play')).toBeVisible();
}
// One step of play: pay a bill on the card, else take a decision, else invest and close the reveal.
async function playStep(page, pick = 0) {
  if (await page.locator('#payup').isVisible()) return page.click('#payCard');
  const opt = page.locator(`[data-choose="${pick}"]`);
  if (await opt.count()) return opt.click();
  await page.click('#goBtn');
  await page.locator('#contBtn').click();
}

test('a full 20-year game through the UI reaches the end screen with no console errors', async ({ page }) => {
  const bad = watchConsole(page);
  await begin(page, { timer: 'off' });
  await expect(page.locator('.story')).toContainText('in Mumbai');
  await expect(page.locator('#page')).toContainText('Rent in Mumbai');
  await expect(page.locator('#moveClock')).toHaveCount(0);
  for (let i = 0; i < 80 && !(await page.locator('#end').isVisible()); i++) await playStep(page);
  await expect(page.locator('#end')).toBeVisible();
  await expect(page.locator('#podium .pod')).toHaveCount(3);
  await expect(page.locator('.podnote')).toContainText('paid for a life');
  await expect(page.locator('#takeaways .tk')).toHaveCount(3);
  await expect(page.locator('.stockreveal')).toContainText('Yes Bank');
  expect(bad).toEqual([]);
});

test('bills: 45 s clock, guide box on the first bill only, and the timer can be switched off', async ({ page }) => {
  const bad = watchConsole(page);
  await begin(page);
  await expect(page.locator('#moveClock')).toHaveText(/^4\ds$/);
  // the most expensive option at every decision, until bills pile up
  let bills = 0;
  for (let i = 0; i < 80 && bills < 2 && !(await page.locator('#end').isVisible()); i++) {
    if (await page.locator('#payup').isVisible()) {
      bills++;
      const guide = page.locator('#payupSheet .yourmove');
      if (bills === 1) {
        await expect(guide).toBeVisible();
        await expect(page.locator('#payClock')).toHaveText(/^4\ds$/);
        await page.click('#noTimer');
        await expect(page.locator('#payClock')).toHaveCount(0);
        await page.waitForTimeout(1500);
        await expect(page.locator('#payup')).toBeVisible();   // no timer: the bill waits
      } else {
        await expect(guide).toHaveCount(0);
      }
      await page.click('#payCard');
      continue;
    }
    await playStep(page, 0);
  }
  expect(bills).toBe(2);
  await expect(page.locator('#moveClock')).toHaveCount(0);   // switching off the bill clock switches off the move clock too
  expect(bad).toEqual([]);
});
