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
  for (const s of g.sched) { s.life = null; s.choice = null; }
  g.sched[r].life = { id: 'test', t: 't', e: '', x, s: '' };
  return g;
}

test('forced sale order: savings, then FD with 10% penalty; PPF locked before 2020', () => {
  const g = forcedGame(3, -6);
  g.step({ sav: 1, fd: 1, ppf: 1, gold: 1 });
  g.step({ sav: 1, fd: 1, ppf: 1, gold: 1 });
  g.step({ sav: 1, fd: 1, ppf: 1, gold: 1 }); // now round 3 begins with -6x income expense
  const sales = g.me.log.sales.map(s => s.k);
  assert.deepStrictEqual(sales.slice(0, 3), ['sav', 'fd', 'gold']);
  assert.ok(!sales.includes('ppf'), 'PPF must stay locked');
  const fdSale = g.me.log.sales.find(s => s.k === 'fd');
  assert.ok(Math.abs(fdSale.pen - fdSale.amt * 0.10) < 1e-6);
  assert.ok(g.me.h.ppf > 0);
  assert.ok(g.me.debt > 0, 'shortfall goes to credit card');
});

test('PPF can be sold after it unlocks (2020)', () => {
  const g = forcedGame(16, -20);
  while (g.round < 16) g.step({ ppf: 1 });
  assert.ok(g.me.log.sales.some(s => s.k === 'ppf'));
});

test('debt accrues 36% and is repaid first from next income', () => {
  const g = forcedGame(1, -3);
  g.step({ nifty: 0, sav: 1 });           // round 0: savings ~1.2L
  const debt0 = g.me.debt;                // round 1 starts with a forced sale + debt
  assert.ok(debt0 > 0);
  g.step({ sav: 1 });                     // interest accrues
  assert.ok(Math.abs(g.history[1].interest - debt0 * 0.36) < 1e-6);
  const log = g.me.log;                   // round 2: repay first
  assert.ok(log.debtPaid > 0);
  assert.ok(Math.abs(log.debtPaid - Math.min(log.income, debt0 * 1.36)) < 1e-6);
});

const noChoices = g => { for (const s of g.sched) s.choice = null; return g; };

test('fast-forward skips up to 5 years, stops before big events, never skips the last year', () => {
  const g = noChoices(G.createGame(5));
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
  const g = noChoices(G.createGame(5));
  while (g.current().y < 2009) g.step(MIX);    // at 2009
  g.step(MIX);                                  // at 2010
  assert.strictEqual(g.ff(MIX).length, 3);      // 2010-2012 then 2013 event
  const h = noChoices(G.createGame(5));
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

test('the Rollercoaster (crypto) is gone', () => {
  assert.ok(!G.KEYS.includes('crypto'));
  for (const s of G.createGame(3).sched) assert.strictEqual(s.ret.crypto, 0);
});

test('three hidden stock tips follow their own tables', () => {
  assert.ok(['hot', 'hot2', 'hot3'].every(k => G.KEYS.includes(k)));
  for (const s of G.createGame(9).sched)
    for (const k of ['hot', 'hot2', 'hot3']) assert.ok(Math.abs(s.ret[k] - G.STOCKS[k].r[s.y] / 100) < 1e-12);
  for (const a of G.ASSETS) assert.ok(!/Yes Bank|Suzlon|Bajaj/.test(a.n + a.f), 'real name leaked: ' + a.n);
});

test('inr formatting', () => {
  assert.strictEqual(G.inr(45000), '₹45,000');
  assert.strictEqual(G.inr(1240000), '₹12.4 L');
  assert.strictEqual(G.inr(12300000), '₹1.23 Cr');
});

test('selling: proceeds join the cash pool, FD pays 10%, PPF locked until it unlocks', () => {
  const g = G.createGame(3);
  for (const s of g.sched) s.life = null;
  g.step({ nifty: 1, fd: 1, ppf: 1 });
  const cash0 = g.me.cash, nifty0 = g.me.h.nifty, fd0 = g.me.h.fd;
  const x = g.sell('nifty', 0.5);
  assert.ok(Math.abs(x.amt - nifty0 / 2) < 1e-6 && x.pen === 0);
  assert.ok(Math.abs(g.me.cash - (cash0 + nifty0 / 2 - x.tax)) < 1e-6);   // minus 10% tax on the profit part
  const y = g.sell('fd', 1);
  assert.ok(Math.abs(y.pen - fd0 * 0.10) < 1e-6);
  assert.strictEqual(g.me.h.fd, 0);
  assert.ok(Math.abs(g.me.cash - (cash0 + nifty0 / 2 - x.tax + fd0 * 0.90)) < 1e-6);
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

test('life decisions: every game has all four, at their seeded rounds, one per year', () => {
  for (const seed of [1, 2, 3, 42, 777]) {
    const g = G.createGame(seed);
    const at = g.sched.filter(s => s.choice && !s.choice.own).map(s => [s.choice.id, s.r]);
    assert.deepStrictEqual(at.map(a => a[0]), ['wedding', 'car', 'sister', 'surgery']);
    for (const [id, r] of at) assert.ok(G.DILEMMAS.find(d => d.id === id).at.includes(r));
    for (const s of g.sched) if (s.choice && s.life) assert.ok(s.life.promo, 'only a promotion can share a decision year');
  }
});

test('life decisions: must choose before investing; cost hits cash and can force a sale', () => {
  const g = G.createGame(42);
  const r = g.sched.find(s => s.choice).r;
  while (g.round < r) g.step({ nifty: 1 });
  assert.ok(g.pending, 'decision pending at the start of the year');
  assert.strictEqual(g.canSell('nifty'), false, 'no selling until decided');
  const p = g.previewChoice(0);
  assert.ok(p.cost > 0 && p.shortfall > 0, 'big option previews a forced sale');
  const log = g.choose(0);
  assert.strictEqual(g.pending, null);
  assert.ok(Math.abs(log.choice + p.cost) < 1e-6);
  assert.ok(log.sales.length > 0 || log.newDebt > 0, 'shortfall is force-sold');
  assert.strictEqual(g.choices[0].i, 0);
});

test('life decisions: step auto-picks the default; rivals always take the default', () => {
  const g = G.createGame(7);
  const r = g.sched.find(s => s.choice).r;
  while (g.round < r) g.step({ sav: 1 });
  const d = g.pending;
  const rivalCost = -g.fd.log.choice;
  assert.ok(Math.abs(rivalCost - (-d.options[d.def].x * g.current().inc)) < 1e-6);
  g.step({ sav: 1 });
  assert.strictEqual(g.choices[0].i, d.def);
});

test('fast-forward stops before a life decision', () => {
  const g = G.createGame(42);
  for (const s of g.sched) s.event = false;
  const r = g.sched.find(s => s.choice).r;
  g.ff({ sav: 1 });
  assert.ok(g.round <= r);
  if (g.round === r) assert.ok(g.pending);
});

test('a decision can be put on the credit card instead of selling', () => {
  const g = G.createGame(42);
  const r = g.sched.find(s => s.choice).r;
  while (g.round < r) g.step({ nifty: 1 });
  const before = Object.assign({}, g.me.h), p = g.previewChoice(0);
  const log = g.choose(0, 'card');
  assert.strictEqual(log.sales.length, 0, 'nothing sold');
  assert.deepStrictEqual(g.me.h, before);
  assert.ok(Math.abs(g.me.debt - p.shortfall) < 1e-6);
  g.step({ nifty: 1 });
  assert.ok(Math.abs(g.history[g.history.length - 1].interest - p.shortfall * 0.36) < 1e-6);
  assert.ok(g.me.stats.cardYears === 1);
});

test('lottery: the player wins once (after tax), rivals do not, then the asks arrive', () => {
  for (const seed of [1, 2, 42, 99]) {
    const g = G.createGame(seed);
    const wins = g.sched.filter(s => s.lottery);
    assert.strictEqual(wins.length, 1);
    const w = wins[0];
    assert.ok(G.LOTTERY.at.includes(w.r) && !w.choice);
    assert.ok(Math.abs(w.lottery.net - w.lottery.gross * (1 - 0.312)) < 1e-6);
    const asks = g.sched.filter(s => s.choice && s.choice.own).map(s => s.choice.id);
    assert.deepStrictEqual(asks, ['lifestyle', 'mamaji', 'cousins']);
    while (g.round < w.r) g.step({ sav: 1 });
    assert.ok(Math.abs(g.me.log.lottery - w.lottery.net) < 1e-6);
    assert.strictEqual(g.fd.log.lottery, 0);
    assert.strictEqual(g.sip.log.lottery, 0);
  }
});

test('lottery asks cost a share of the prize; lifestyle creep cuts savings for good', () => {
  const g = G.createGame(42);
  while (!(g.pending && g.pending.id === 'lifestyle')) g.step({ sav: 1 });
  const net = g.sched.find(s => s.lottery).lottery.net;
  assert.ok(Math.abs(g.previewChoice(0).cost - 0.5 * net) < 1e-6);
  g.choose(0);
  assert.ok(Math.abs(g.me.incMult - 0.7) < 1e-9);
  g.step({ sav: 1 });
  if (!g.pending) assert.ok(Math.abs(g.me.log.income - g.current().inc * 0.7) < 1e-6 || g.current().life);
  while (!g.done) g.step({ sav: 1 });
  assert.ok(g.me.stats.creepLost > 0);
  assert.ok(g.takeaways().length === 3);
  const all = [];
  const h = G.createGame(42); while (!h.done) h.step({ sav: 1 });
  assert.ok(h.choices.some(c => c.lotto));
});

test('selling pays off credit-card debt before reinvesting', () => {
  const g = G.createGame(42);
  const r = g.sched.find(s => s.choice).r;
  while (g.round < r) g.step({ nifty: 1 });
  g.choose(0, 'card');
  const debt = g.me.debt, cash = g.me.cash, nifty = g.me.h.nifty;
  const x = g.sell('nifty', 1);
  assert.ok(Math.abs(x.repay - Math.min(debt, cash + nifty)) < 1e-6);
  assert.ok(Math.abs(g.me.debt - Math.max(0, debt - cash - nifty)) < 1e-6);
});

test('manual mode: a shortfall waits; the player picks what to sell, sees the loss, or swipes the card', () => {
  const g = G.createGame(42, { manual: true });
  const r = g.sched.find(s => s.choice).r;
  while (g.round < r) g.step({ nifty: 1, fd: 1 });
  const f0 = g.me.stats.forcedYears;
  g.choose(0);
  const owe = g.owed();
  assert.ok(owe > 0, 'big wedding leaves a bill');
  assert.strictEqual(g.me.log.sales.length, 0, 'nothing sold automatically');
  assert.strictEqual(g.canSell('nifty'), false);
  const x = g.payWith('nifty');
  assert.ok(x && Number.isFinite(x.pnl));
  assert.ok(Math.abs(g.owed() - Math.max(0, owe - x.got)) < 1);
  if (g.owed() > 0) g.payWith('fd');
  if (g.owed() > 0) { const before = g.me.debt; const c = g.payCard(); assert.ok(Math.abs(g.me.debt - before - c) < 1e-6); }
  assert.strictEqual(g.owed(), 0);
  assert.strictEqual(g.me.stats.forcedYears, f0 + 1);
});

test('manual mode: step covers an unpaid bill the old way, and PPF stays locked', () => {
  const g = G.createGame(42, { manual: true });
  const r = g.sched.find(s => s.choice).r;
  while (g.round < r) g.step({ ppf: 1, sav: 1 });
  g.choose(0);
  assert.strictEqual(g.canPayWith('ppf'), false);
  g.step({ sav: 1 });
  assert.strictEqual(g.owed(), 0);
  assert.ok(g.history[g.history.length - 1].log.sales.length > 0 || g.history[g.history.length - 1].log.newDebt > 0);
});

test('selling at a profit pays 10% tax on the profit; FD/PPF/savings and losses do not', () => {
  const g = G.createGame(3);
  g.step({ nifty: 1, fd: 1 });   // 2005: Nifty +36%
  const h = g.me.h.nifty, basis = g.me.contrib.nifty, cash0 = g.me.cash;
  const x = g.sell('nifty', 1);
  assert.ok(Math.abs(x.tax - (h - basis) * 0.10) < 1e-6 && x.tax > 0);
  assert.ok(Math.abs(g.me.cash - cash0 - (h - x.tax)) < 1e-6);
  const y = g.sell('fd', 1);
  assert.strictEqual(y.tax, 0);
});
