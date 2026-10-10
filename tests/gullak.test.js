const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const G = require(path.join(__dirname, '..', 'gullak', 'game.js'));

const MIX = { sav: 10, fd: 10, ppf: 10, nifty: 30, gold: 10, hot: 15, crypto: 15 };
function playAll(seed, alloc) { const g = G.createGame(seed); while (!g.done) g.step(alloc || MIX); return g; }

test('same seed gives identical outcome', () => {
  const a = playAll(42), b = playAll(42);
  assert.deepStrictEqual(a.me.nwHist, b.me.nwHist);
  assert.deepStrictEqual(a.netWorth(), b.netWorth());
  assert.notDeepStrictEqual(playAll(43).me.nwHist, a.me.nwHist);
});

test('20 rounds end the game', () => {
  const g = G.createGame(7);
  for (let i = 0; i < 19; i++) { g.step(MIX); assert.strictEqual(g.done, false); }
  g.step(MIX);
  assert.strictEqual(g.done, true);
  assert.strictEqual(g.history.length, 20);
  assert.strictEqual(g.me.nwHist.length, 20);
  assert.strictEqual(g.step(MIX), null);
});

function forcedGame(r, x) {
  // Build a game and inject a big expense into round r
  const g = G.createGame(1);
  for (const s of g.sched) s.life = null;
  g.sched[r].life = { id: 'test', t: 't', e: '', x, s: '' };
  return g;
}

test('forced sale order: savings, then FD with 1% penalty; PPF locked before 2020', () => {
  const g = forcedGame(3, -6);
  g.step({ sav: 1, fd: 1, ppf: 1, gold: 1 });
  g.step({ sav: 1, fd: 1, ppf: 1, gold: 1 });
  g.step({ sav: 1, fd: 1, ppf: 1, gold: 1 }); // now round 3 begins with -6x income expense
  const sales = g.me.log.sales.map(s => s.k);
  assert.deepStrictEqual(sales.slice(0, 3), ['sav', 'fd', 'gold']);
  assert.ok(!sales.includes('ppf'), 'PPF must stay locked');
  const fdSale = g.me.log.sales.find(s => s.k === 'fd');
  assert.ok(Math.abs(fdSale.pen - fdSale.amt * 0.01) < 1e-6);
  assert.ok(g.me.h.ppf > 0);
  assert.ok(g.me.debt > 0, 'shortfall goes to credit card');
});

test('PPF can be sold after it unlocks (2020)', () => {
  const g = forcedGame(16, -20);
  while (g.round < 16) g.step({ ppf: 1 });
  assert.ok(g.me.log.sales.some(s => s.k === 'ppf'));
});

test('debt accrues 18% and is repaid first from next income', () => {
  const g = forcedGame(1, -3);
  g.step({ nifty: 0, sav: 1 });           // round 0: savings ~1.2L
  const debt0 = g.me.debt;                // round 1 starts with a forced sale + debt
  assert.ok(debt0 > 0);
  g.step({ sav: 1 });                     // interest accrues
  assert.ok(Math.abs(g.history[1].interest - debt0 * 0.18) < 1e-6);
  const log = g.me.log;                   // round 2: repay first
  assert.ok(log.debtPaid > 0);
  assert.ok(Math.abs(log.debtPaid - Math.min(log.income, debt0 * 1.18)) < 1e-6);
});

test('fast-forward skips up to 5 years, stops before big events, never skips the last year', () => {
  const g = G.createGame(5);
  assert.strictEqual(g.ff(MIX).length, 3);      // 2005-2007, stops before 2008 crash
  assert.strictEqual(g.current().y, 2008);
  assert.strictEqual(g.ff(MIX).length, 1);      // plays 2008, stops before 2009 rebound
  assert.strictEqual(g.ff(MIX).length, 4);      // 2009-2012, stops before 2013
  assert.strictEqual(g.ff(MIX).length, 3);      // 2013-2015, stops before 2016
  assert.strictEqual(g.ff(MIX).length, 1);      // 2016
  assert.strictEqual(g.ff(MIX).length, 3);      // 2017-2019, stops before 2020
  assert.strictEqual(g.ff(MIX).length, 2);      // 2020-2021
  assert.strictEqual(g.ff(MIX).length, 2);      // 2022-2023, final year left
  assert.strictEqual(g.current().y, 2024);
  assert.strictEqual(g.done, false);
  assert.strictEqual(g.ff(MIX).length, 0);
  g.step(MIX); assert.strictEqual(g.done, true);
});

test('fast-forward advances a full 5 years when no event is in the way', () => {
  const g = G.createGame(5);
  while (g.current().y < 2009) g.step(MIX);    // at 2009
  g.step(MIX);                                  // at 2010
  assert.strictEqual(g.ff(MIX).length, 3);      // 2010-2012 then 2013 event
  const h = G.createGame(5);
  for (const s of h.sched) s.event = false;     // no events -> capped at 5
  assert.strictEqual(h.ff(MIX).length, 5);
  assert.strictEqual(h.round, 5);
});

test('takeaways return 3 items', () => {
  for (const seed of [1, 2, 3, 99, 12345]) {
    for (const alloc of [MIX, { sav: 1 }, { nifty: 1 }, { crypto: 1, hot: 1 }]) {
      const t = playAll(seed, alloc).takeaways();
      assert.strictEqual(t.length, 3);
      for (const x of t) assert.ok(x.title && x.text && Number.isFinite(x.impact));
    }
  }
});

test('crypto returns follow the real Bitcoin table and unlock in 2014', () => {
  const table = { 2014: -56, 2015: 45, 2016: 128, 2017: 1200, 2018: -71, 2019: 97, 2020: 310, 2021: 62, 2022: -58, 2023: 157, 2024: 125 };
  for (const seed of [1, 2, 777]) for (const y of G.buildSchedule(seed)) {
    if (y.y < 2014) { assert.strictEqual(y.ret.crypto, 0); assert.strictEqual(G.enabled('crypto', y.r), false); }
    else assert.ok(Math.abs(y.ret.crypto - table[y.y] / 100) < 1e-12, String(y.y));
  }
});

test('hot tips keep the sign of big Nifty years', () => {
  for (let seed = 1; seed <= 200; seed++) for (const y of G.buildSchedule(seed))
    if (Math.abs(y.ret.nifty) > 0.2) assert.strictEqual(Math.sign(y.ret.hot), Math.sign(y.ret.nifty));
});

test('inr formatting', () => {
  assert.strictEqual(G.inr(45000), '₹45,000');
  assert.strictEqual(G.inr(1240000), '₹12.4 L');
  assert.strictEqual(G.inr(12300000), '₹1.23 Cr');
});

test('selling: proceeds join the cash pool, FD pays 1%, PPF locked until it unlocks', () => {
  const g = G.createGame(3);
  for (const s of g.sched) s.life = null;
  g.step({ nifty: 1, fd: 1, ppf: 1 });
  const cash0 = g.me.cash, nifty0 = g.me.h.nifty, fd0 = g.me.h.fd;
  const x = g.sell('nifty', 0.5);
  assert.ok(Math.abs(x.amt - nifty0 / 2) < 1e-6 && x.pen === 0);
  assert.ok(Math.abs(g.me.cash - (cash0 + nifty0 / 2)) < 1e-6);
  const y = g.sell('fd', 1);
  assert.ok(Math.abs(y.pen - fd0 * 0.01) < 1e-6);
  assert.strictEqual(g.me.h.fd, 0);
  assert.ok(Math.abs(g.me.cash - (cash0 + nifty0 / 2 + fd0 * 0.99)) < 1e-6);
  assert.strictEqual(g.sell('ppf', 1), null, 'PPF is locked');
  assert.strictEqual(g.canSell('crypto'), false);
  const before = g.me.cash;
  const rec = g.step({ sav: 1 });
  assert.ok(Math.abs(rec.invested - before) < 1e-6, 'proceeds were invested with new savings');
  assert.strictEqual(rec.sells.length, 2);
  while (g.round < G.PPF_R) g.step({ sav: 1 });
  assert.ok(g.sell('ppf', 1).amt > 0, 'PPF sellable once unlocked');
});

test('fast-forward never sells', () => {
  const g = G.createGame(9);
  g.step(MIX);
  const recs = g.ff(MIX);
  for (const r of recs) assert.strictEqual(r.sells.length, 0);
  assert.strictEqual(g.me.stats.chosenSold, 0);
});

test('panic sell after a crash shows up in takeaways', () => {
  const g = G.createGame(4);
  for (const s of g.sched) s.life = null;
  while (g.current().y < 2009) g.step({ nifty: 1 });   // lived through the crash fully invested
  g.sell('nifty', 1);
  while (!g.done) g.step({ fd: 1 });
  const ids = g.takeaways().map(t => t.id);
  assert.ok(ids.includes('panicSell'), ids.join(','));
});

test('story copy never reveals years or says crypto/Bitcoin', () => {
  const g = G.createGame(1);
  const texts = [];
  for (const s of g.sched) { const c = G.chapter(s, 'Riya'); texts.push(c.title, c.sub, c.headline, c.text); }
  for (const l of G.LIFE) texts.push(l.t, l.s);
  for (const a of G.ASSETS) texts.push(a.n, a.f);
  for (const t of texts) {
    assert.ok(!/\b(19|20)\d\d\b/.test(t), 'year leaked: ' + t);
    assert.ok(!/crypto|bitcoin/i.test(t), 'crypto word leaked: ' + t);
  }
});
