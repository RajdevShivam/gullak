// Gullak — pure simulation logic. No DOM. Works in the browser (window.Gullak) and Node (module.exports).
(function (root) {
  'use strict';

  // ---------- RNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    const rng = mulberry32(seed);
    rng.gauss = () => { let u = 0; while (!u) u = rng(); const v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return rng;
  }

  // ---------- Data ----------
  const R = 20, START_YEAR = 2005, START_AGE = 25;
  const CRYPTO_R = 9;   // 2014
  const PPF_R = 15;     // 2020 — 15 years after 2005
  const START_INCOME = 120000, RAISE = 0.08, PROMO = 0.2, DEBT_RATE = 0.18, FD_PENALTY = 0.01;

  const ASSETS = [
    { k: 'sav', n: 'Savings account', i: '🏦', c: '#7b9cc4', f: 'Your bank account. Safe, ~3% a year, take it out anytime.' },
    { k: 'fd', n: 'Fixed Deposit', i: '📜', c: '#8aa95c', f: 'Lend to the bank for a while. ~7% a year; small 1% penalty if broken early.' },
    { k: 'ppf', n: 'PPF', i: '🔒', c: '#2f6b4f', f: 'Govt savings scheme. ~7.5%, tax-free, locked for 15 years (till Year 16).' },
    { k: 'nifty', n: 'Nifty 50 index fund', i: '📈', c: '#c4553a', f: "A tiny slice of India's 50 biggest companies. Grows over time, some years hurt." },
    { k: 'gold', n: 'Gold', i: '🪙', c: '#e3a33b', f: 'What Nani trusts. Often shines when stocks panic.' },
    { k: 'hot', n: 'Hot stock tips', i: '🔥', c: '#e0782f', f: 'Tips from the family WhatsApp group. Like the index, but louder.' },
    { k: 'crypto', n: 'Rollercoaster', i: '🎢', c: '#8a68b8', f: 'A new, extremely volatile investment. Could multiply many times, could crash 70% in a year.' },
  ];
  const KEYS = ASSETS.map(a => a.k);
  const SAFE_RET = { sav: 0.03, fd: 0.07, ppf: 0.075 };

  // Yearly returns (approx. Nifty 50 price return, gold in INR), %
  const NIFTY = { 2005: 36, 2006: 40, 2007: 55, 2008: -52, 2009: 76, 2010: 18, 2011: -25, 2012: 28, 2013: 7, 2014: 31, 2015: -4, 2016: 3, 2017: 29, 2018: 3, 2019: 12, 2020: 15, 2021: 24, 2022: 4, 2023: 20, 2024: 9 };
  const GOLD = { 2005: 20, 2006: 22, 2007: 17, 2008: 30, 2009: 24, 2010: 23, 2011: 32, 2012: 12, 2013: -5, 2014: -8, 2015: -6, 2016: 11, 2017: 5, 2018: 7, 2019: 24, 2020: 28, 2021: -4, 2022: 14, 2023: 15, 2024: 21 };
  // Approx. real Bitcoin yearly returns in INR, %
  const CRYPTO = { 2014: -56, 2015: 45, 2016: 128, 2017: 1200, 2018: -71, 2019: 97, 2020: 310, 2021: 62, 2022: -58, 2023: 157, 2024: 125 };
  // Big scripted market years: fast-forward stops before these so the player can react
  const EVENT_YEARS = [2008, 2009, 2013, 2016, 2017, 2020, 2022];

  // News: [headline, story, what really happened]. Headlines/stories never name a year or a datable event —
  // players would game the history. The real event is revealed only on the end screen. {n} = player name.
  const NEWS = {
    2005: ['A gullak of one’s own', '{n} has a first salary, a brand-new bank passbook, and a clay gullak from Nani. Everyone has advice; nobody agrees.', 'Markets were warming up'],
    2006: ['Stocks are the talk of the town', 'Share prices keep climbing, and even the chaiwala outside {n}’s office has a stock opinion.', 'Sensex crossed 10,000'],
    2007: ['Everyone’s a genius', 'Markets are on fire, and every uncle at every wedding is suddenly an investing expert.', 'The great bull run'],
    2008: ['Trouble overseas', 'A giant bank collapses overseas; markets everywhere are shaking. The office canteen talks of nothing else.', 'Global financial crisis (Lehman Brothers)'],
    2009: ['“Stay away from shares”', 'Everyone says stay away from shares. A TV anchor calls the stock market “finished”.', 'The big rebound (+76%)'],
    2010: ['A calm year', 'Markets are calm; onion prices are not.', 'Steady recovery'],
    2011: ['Gloomy headlines, golden gold', 'Scandals fill the news, stocks feel heavy, and gold glitters the way Nani always said it would.', 'Markets fell, gold boomed'],
    2012: ['Slow and steady', 'Stocks crawl back up. {n} learns the word “volatility” and pretends to have always known it.', 'Quiet recovery'],
    2013: ['The rupee tumbles', 'The rupee suddenly tumbles against the dollar. Imported things get pricier overnight.', 'The “taper tantrum” — rupee hit 68/$'],
    2014: ['New hope — and a new thing', 'A big election result has markets cheerful. And a strange new investment appears — {n}’s cousin won’t stop talking about it. The Rollercoaster is now unlocked.', 'Election rally; Bitcoin exchanges opened in India'],
    2015: ['A shrug of a year', 'Trouble in a faraway economy; markets shrug and dip a little.', 'China slowdown wobble'],
    2016: ['Notes cancelled!', 'Overnight, big notes are cancelled. Queues at every ATM. {n} spends a weekend in line, making friends.', 'Demonetisation'],
    2017: ['The Rollercoaster goes vertical', 'That strange new investment shoots up many times over. The chaiwala, the cousin and the cousin’s dog are all buying.', 'Bitcoin mania (+1200%)'],
    2018: ['The hangover', 'The Rollercoaster loses most of its value. The cousin goes very quiet on WhatsApp.', 'Bitcoin crash (−71%)'],
    2019: ['A steady year', 'Markets inch up, nothing explodes. {n} enjoys the boring peace.', 'Steady gains'],
    2020: ['The world stops', 'A strange illness spreads; the country locks down and markets plunge. Then, months later, the world reopens and markets roar. {n}’s PPF also finally unlocks.', 'COVID crash and recovery'],
    2021: ['Everyone is a trader now', 'Trading apps boom, the Rollercoaster climbs again, and {n}’s cousin quits his job to “trade full-time”.', 'Retail-investor boom'],
    2022: ['Winter for the wild one', 'The wild asset everyone loved collapses, and the government taxes it heavily. The cousin un-quits his job.', 'Crypto winter + 30% crypto tax'],
    2023: ['Good news from space', 'India pulls off something historic in space, and markets climb cheerfully.', 'Chandrayaan-3 landed on the moon'],
    2024: ['The last page', 'Markets sit near their highest ever. {n} turns 45 and wonders what the gullak holds.', 'Markets near record highs'],
  };

  // Life events. x = multiple of this year's salary savings.
  const LIFE = [
    { id: 'wedding', t: 'Cousin’s big fat wedding', e: '💍', x: -0.8, s: 'Then a cousin’s big fat wedding lands — and somehow {n} is paying for the sangeet.' },
    { id: 'medical', t: 'Medical emergency', e: '🏥', x: -1.4, s: 'A sudden hospital stay for Papa. Everyone is fine, but the bill is not.' },
    { id: 'diwali', t: 'Diwali bonus', e: '🪔', x: 0.25, s: 'A surprise Diwali bonus! {n} buys sweets and drops the rest in the gullak.' },
    { id: 'phone', t: 'Phone stolen', e: '📱', x: -0.15, s: 'Someone on the metro walks off with {n}’s phone. A new one is needed.' },
    { id: 'laid', t: 'Laid off', e: '😬', x: -0.25, laid: 1, s: '{n} is laid off. No salary this year — and rent still has to be paid.' },
    { id: 'promo', t: 'Promotion!', e: '🎉', x: 0, promo: 1, s: '{n} gets promoted! Salary savings go up 20% — for good.' },
    { id: 'bike', t: 'Scooter repair', e: '🛵', x: -0.15, s: 'The trusty scooter finally gives up. The mechanic smiles; {n} does not.' },
    { id: 'goa', t: 'Goa trip with friends', e: '🏖️', x: -0.35, s: 'The friends finally do the Goa trip. Worth every rupee, {n} insists.' },
  ];

  // ---------- Schedule (all randomness decided up front from the seed) ----------
  function buildSchedule(seed) {
    const rng = makeRng(seed >>> 0);
    const out = []; let base = START_INCOME; const recent = [];
    for (let r = 0; r < R; r++) {
      const y = START_YEAR + r;
      if (r > 0) base *= 1 + RAISE;
      const nifty = NIFTY[y] / 100, gold = GOLD[y] / 100;
      let hot = nifty * 1.5 + rng.gauss() * 0.25;
      if (Math.abs(nifty) > 0.2 && Math.sign(hot) !== Math.sign(nifty)) hot = nifty * 0.75; // noise can't flip big years
      hot = Math.max(-0.8, hot);
      const crypto = r >= CRYPTO_R ? CRYPTO[y] / 100 : 0;
      const roll = rng(), pick = Math.floor(rng() * LIFE.length);
      let life = null;
      if (r > 0 && roll < 0.35) { const c = LIFE[pick]; if (!recent.slice(-3).includes(c.id)) life = c; }
      recent.push(life ? life.id : null);
      const inc = base;
      if (life && life.promo) base *= 1 + PROMO;
      out.push({ r, y, age: START_AGE + r, news: NEWS[y], event: EVENT_YEARS.includes(y), life, inc: life && life.promo ? base : inc,
        ret: { sav: SAFE_RET.sav, fd: SAFE_RET.fd, ppf: SAFE_RET.ppf, nifty, gold, hot, crypto } });
    }
    return out;
  }

  const enabled = (k, r) => !(k === 'crypto' && r < CRYPTO_R);
  const emptyH = () => ({ sav: 0, fd: 0, ppf: 0, nifty: 0, gold: 0, hot: 0, crypto: 0 });
  function newPlayer() {
    return { h: emptyH(), contrib: emptyH(), debt: 0, cash: 0, nwHist: [], log: null,
      stats: { penalty: 0, interest: 0, sold: 0, soldRisky: 0, forcedYears: 0, chosenSold: 0 } };
  }
  const netWorth = p => KEYS.reduce((a, k) => a + p.h[k], 0) - p.debt;

  function beginRound(p, s) {
    const log = { income: 0, life: 0, debtPaid: 0, sales: [], newDebt: 0, sells: [] };
    log.income = s.life && s.life.laid ? 0 : s.inc;
    log.life = s.life ? s.life.x * s.inc : 0;
    let cash = log.income + log.life;
    if (cash > 0 && p.debt > 0) { const pay = Math.min(cash, p.debt); p.debt -= pay; cash -= pay; log.debtPaid = pay; }
    if (cash < 0) {
      let need = -cash; cash = 0;
      const order = s.r >= PPF_R ? ['sav', 'fd', 'ppf', 'gold', 'nifty', 'hot', 'crypto'] : ['sav', 'fd', 'gold', 'nifty', 'hot', 'crypto'];
      for (const k of order) {
        if (need <= 0) break;
        const avail = p.h[k]; if (avail <= 0) continue;
        const mult = k === 'fd' ? 1 - FD_PENALTY : 1;
        const sell = Math.min(avail, need / mult);
        p.contrib[k] *= avail > 0 ? 1 - sell / avail : 0;
        p.h[k] -= sell; need -= sell * mult;
        const pen = k === 'fd' ? sell * FD_PENALTY : 0;
        log.sales.push({ k, amt: sell, pen });
        p.stats.penalty += pen; p.stats.sold += sell;
        if (!SAFE_RET[k]) p.stats.soldRisky += sell;
        if (need < 1e-6) need = 0;
      }
      if (need > 0) { p.debt += need; log.newDebt = need; }
      if (log.sales.length || log.newDebt) p.stats.forcedYears++;
    }
    p.cash = cash; p.log = log; return log;
  }

  function normAlloc(alloc, r) {
    let tot = 0; const out = emptyH();
    for (const k of KEYS) if (enabled(k, r)) tot += Math.max(0, +(alloc && alloc[k]) || 0);
    if (tot <= 0) { out.sav = 1; return out; }
    for (const k of KEYS) out[k] = enabled(k, r) ? Math.max(0, +(alloc[k]) || 0) / tot : 0;
    return out;
  }

  function endRound(p, s, alloc) {
    const sh = normAlloc(alloc, s.r);
    const invested = p.cash;
    for (const k of KEYS) { p.h[k] += invested * sh[k]; p.contrib[k] += invested * sh[k]; }
    p.cash = 0;
    const pnl = {};
    for (const k of KEYS) { pnl[k] = p.h[k] * s.ret[k]; p.h[k] *= 1 + s.ret[k]; }
    const interest = p.debt * DEBT_RATE; p.debt += interest; p.stats.interest += interest;
    p.nwHist.push(netWorth(p));
    return { shares: sh, invested, pnl, interest };
  }

  // ---------- Game ----------
  function createGame(seed, opts) {
    seed = (Number.isFinite(+seed) ? +seed : Math.floor(Math.random() * 1e9)) >>> 0;
    const sched = buildSchedule(seed);
    const G = {
      seed, sched, R, round: 0, done: false,
      name: (opts && opts.name) || 'Riya',
      me: newPlayer(), fd: newPlayer(), sip: newPlayer(),
      alloc: { sav: 30, fd: 30, ppf: 0, nifty: 40, gold: 0, hot: 0, crypto: 0 },
      history: [],
    };
    function start() {
      const s = sched[G.round];
      beginRound(G.me, s); beginRound(G.fd, s); beginRound(G.sip, s);
    }
    G.current = () => sched[Math.min(G.round, R - 1)];
    G.netWorth = () => ({ me: netWorth(G.me), fd: netWorth(G.fd), sip: netWorth(G.sip) });
    G.step = function (alloc) {
      if (G.done) return null;
      if (alloc) G.alloc = Object.assign(emptyH(), alloc);
      const s = sched[G.round];
      const nwBefore = G.history.length ? G.history[G.history.length - 1].nwAfter : 0;
      const log = G.me.log;
      const res = endRound(G.me, s, G.alloc);
      endRound(G.fd, s, { fd: 1 }); endRound(G.sip, s, { nifty: 1 });
      const rec = { r: s.r, y: s.y, age: s.age, news: s.news, life: s.life, log, sells: log.sells, ret: s.ret,
        shares: res.shares, invested: res.invested, pnl: res.pnl, interest: res.interest,
        nwBefore, nwAfter: netWorth(G.me), fdAfter: netWorth(G.fd), sipAfter: netWorth(G.sip) };
      G.history.push(rec);
      G.round++;
      if (G.round >= R) G.done = true; else start();
      return rec;
    };
    // Skip up to 5 years, never the final year, and stop before the next big market event.
    G.ffYears = () => {
      const max = Math.max(0, Math.min(5, R - 1 - G.round));
      let n = 0;
      while (n < max && (n === 0 || !sched[G.round + n].event)) n++;
      return n;
    };
    G.ff = function (alloc) {
      const n = G.ffYears(), recs = [];
      for (let i = 0; i < n; i++) recs.push(G.step(alloc));
      return recs;
    };
    // Player-chosen sale during the investing phase. Proceeds join this year's cash pool.
    G.canSell = k => !G.done && KEYS.includes(k) && G.me.h[k] > 0.5 && !(k === 'ppf' && G.round < PPF_R);
    G.sell = function (k, frac) {
      if (!G.canSell(k)) return null;
      frac = Math.max(0, Math.min(1, +frac || 0)); if (!frac) return null;
      const p = G.me, amt = frac >= 1 ? p.h[k] : p.h[k] * frac;
      const pen = k === 'fd' ? amt * FD_PENALTY : 0, proceeds = amt - pen;
      p.contrib[k] *= 1 - amt / p.h[k];
      p.h[k] = frac >= 1 ? 0 : p.h[k] - amt;
      p.cash += proceeds; p.stats.penalty += pen; p.stats.chosenSold += amt;
      const x = { k, amt, pen, proceeds }; p.log.sells.push(x);
      return x;
    };
    G.takeaways = () => takeaways(G);
    start();
    return G;
  }

  // ---------- Formatting / story ----------
  function inr(v) {
    const neg = v < 0; v = Math.abs(v); let s;
    if (v >= 1e7) s = '₹' + (v / 1e7).toFixed(2) + ' Cr';
    else if (v >= 1e5) s = '₹' + (v / 1e5).toFixed(1) + ' L';
    else s = '₹' + Math.round(v).toLocaleString('en-IN');
    return (neg ? '−' : '') + s;
  }
  const fill = (t, name) => t.replace(/\{n\}/g, name);
  function chapter(s, name) {
    const parts = [fill(s.news[1], name)];
    if (s.life) parts.push(fill(s.life.s, name));
    return { title: `Chapter ${s.r + 1} · Year ${s.r + 1}`, sub: `${name} is ${s.age}.`, headline: s.news[0], text: parts.join(' ') };
  }
  const A = k => ASSETS.find(a => a.k === k);

  // ---------- Takeaways ----------
  function takeaways(G) {
    const H = G.history, me = G.me, name = G.name, out = [];
    const nw = G.netWorth();
    // 1. Worst year
    let worst = null;
    for (const h of H) { const t = KEYS.reduce((a, k) => a + h.pnl[k], 0); if (!worst || t < worst.t) worst = { h, t }; }
    if (worst && worst.t < 0) {
      const k = KEYS.reduce((a, b) => worst.h.pnl[b] < worst.h.pnl[a] ? b : a);
      out.push({ id: 'worst', icon: '🌧️', impact: -worst.t,
        title: `Your stormiest year: Year ${worst.h.r + 1}`,
        text: `The gullak lost ${inr(-worst.t)} in Year ${worst.h.r + 1} (that was ${worst.h.y} — ${worst.h.news[2]}), mostly from ${A(k).n}. Storms pass — what matters is not selling in the middle of one.` });
    } else if (H.length) {
      out.push({ id: 'worst', icon: '☀️', impact: 1, title: 'Never a losing year', text: `${name}’s gullak never shrank from markets in a single year. Very calm — maybe a little too calm?` });
    }
    // 2. Emergency fund
    const st = me.stats, cost = st.penalty + st.interest;
    if (st.forcedYears > 0) {
      out.push({ id: 'emergency', icon: '🧯', impact: cost + 0.25 * st.soldRisky,
        title: 'Keep an emergency fund',
        text: `Life forced ${name} to sell ${inr(st.sold)} of investments in ${st.forcedYears} year${st.forcedYears > 1 ? 's' : ''}` +
          (cost > 1 ? `, costing ${inr(cost)} in FD penalties and credit-card interest.` : '.') +
          ` A few months of expenses kept in Savings/FD means emergencies don’t get to choose when you sell.` });
    } else {
      out.push({ id: 'emergency', icon: '🧯', impact: 0.5, title: 'No forced sales', text: `${name} never had to sell in a hurry. A cushion in Savings or FD is what makes that possible.` });
    }
    // 3. SIP Aunty comparison
    const diff = nw.me - nw.sip;
    out.push({ id: 'sip', icon: diff >= 0 ? '🏅' : '👩', impact: Math.abs(diff) * 0.6,
      title: diff >= 0 ? 'You beat the index' : 'SIP Aunty’s secret: just stay invested',
      text: diff >= 0 ? `${name} finished ${inr(diff)} ahead of SIP Aunty, who put everything into the Nifty 50 and never touched it. Nicely done.`
        : `Simply putting everything in the Nifty 50 every year and ignoring the news would have beaten ${name} by ${inr(-diff)}.` });
    // 4a. Panic sells: sold an asset right after it fell 15%+, then it recovered
    let ps = null;
    for (let i = 1; i < H.length; i++) {
      const prev = H[i - 1], cur = H[i];
      for (const x of cur.sells || []) {
        if (prev.ret[x.k] > -0.15) continue;
        let gk = 1, safe = 1;
        for (let j = i; j < H.length; j++) { gk *= 1 + H[j].ret[x.k]; safe *= 1 + SAFE_RET.fd; }
        const more = x.amt * gk - x.proceeds * safe;
        if (!ps) ps = { sold: 0, more: 0, k: x.k, y: prev };
        ps.sold += x.amt; ps.more += more;
      }
    }
    if (ps && ps.more > 0) out.push({ id: 'panicSell', icon: '😱', impact: ps.more * 1.2,
      title: 'The panic tax',
      text: `${name} sold ${inr(ps.sold)} of ${A(ps.k).n} after the Year ${ps.y.r + 1} crash (that was ${ps.y.y}). Holding on would have made about ${inr(ps.more)} more.` });
    // 4b. Panic after a crash (cut new money into stocks)
    let panic = null;
    for (let i = 1; i < H.length; i++) {
      const prev = H[i - 1], cur = H[i];
      if (prev.ret.nifty > -0.2) continue;
      const eq = h => h.shares.nifty + h.shares.hot;
      const drop = eq(prev) - eq(cur);
      if (drop < 0.15 || cur.invested <= 0) continue;
      let grow = 1, safe = 1;
      for (let j = i; j < H.length; j++) { grow *= 1 + H[j].ret.nifty; safe *= 1 + SAFE_RET.fd; }
      const missed = drop * cur.invested * (grow - safe);
      if (missed > 0 && (!panic || missed > panic.missed)) panic = { missed, y: `Year ${cur.r + 1}`, crashY: `Year ${prev.r + 1} (${prev.y})`, drop };
    }
    if (panic && !(ps && ps.more > 0)) out.push({ id: 'panic', icon: '😱', impact: panic.missed,
      title: 'The panic tax',
      text: `After the ${panic.crashY} crash, ${name} cut stocks by ${Math.round(panic.drop * 100)} points in ${panic.y} — right before the rebound. That flinch cost about ${inr(panic.missed)} by the end.` });
    // 5. Crypto / hot tips
    const totalGain = nw.me - KEYS.reduce((a, k) => a + me.contrib[k], 0);
    const cGain = me.h.crypto - me.contrib.crypto;
    if (me.contrib.crypto > 1000 && cGain > 0 && totalGain > 0 && cGain / totalGain > 0.25) {
      out.push({ id: 'cryptoShare', icon: '🎢', impact: cGain,
        title: 'The Rollercoaster did the heavy lifting',
        text: `The Rollercoaster — it was Bitcoin! — made ${inr(cGain)} of ${name}’s gains (${Math.round(Math.min(1, cGain / totalGain) * 100)}%) — a wild ride most real investors didn’t hold through the −71% and −58% years.` });
    } else if (me.contrib.crypto <= 1000) {
      let slice = 0;
      for (const h of H) if (h.r >= CRYPTO_R) {
        let g = 1; for (const j of H) if (j.r >= h.r) g *= 1 + j.ret.crypto;
        slice += 0.05 * h.invested * (g - 1);
      }
      if (slice > 0) out.push({ id: 'cryptoSkip', icon: '🎢', impact: slice * 0.08, // hypothetical — discount heavily
        title: 'The Rollercoaster not ridden',
        text: `${name} skipped the Rollercoaster (it was Bitcoin). A tiny 5% slice of each year’s savings from Year 10 would have become ${inr(slice)} more — if ${name} could sit through two 60–70% crashes. Many couldn’t.` });
    }
    for (const k of ['hot']) {
      const gain = me.h[k] - me.contrib[k];
      if (me.contrib[k] > 1000) out.push({ id: k, icon: A(k).i, impact: Math.abs(gain),
        title: gain >= 0 ? `${A(k).n} paid off` : `${A(k).n} bit back`,
        text: gain >= 0 ? `${A(k).n} turned ${inr(me.contrib[k])} into ${inr(me.h[k])}. Lucky this time — the ride was wild, and it doesn’t always end this way.`
          : `${inr(me.contrib[k])} went into ${A(k).n}; ${inr(me.h[k])} is left. Exciting is not the same as profitable.` });
    }
    // 6. PPF
    const ppfGain = me.h.ppf - me.contrib.ppf;
    if (ppfGain > 1000) out.push({ id: 'ppf', icon: '🔒', impact: ppfGain * 0.3,
      title: 'Quiet, tax-free compounding',
      text: `PPF grew ${inr(me.contrib.ppf)} into ${inr(me.h.ppf)} — all of it tax-free. Boring and locked is sometimes exactly the point.` });
    // fallback: FD Uncle
    const fdd = nw.me - nw.fd;
    out.push({ id: 'fd', icon: '👴', impact: Math.abs(fdd) * 0.2,
      title: fdd >= 0 ? 'Beyond the FD' : 'FD Uncle wins this round',
      text: fdd >= 0 ? `Taking some risk put ${name} ${inr(fdd)} ahead of FD Uncle’s safe-and-steady deposits.`
        : `FD Uncle, who never took a single risk, ended ${inr(-fdd)} ahead. Risk only helps when you can sit through it.` });
    out.sort((a, b) => b.impact - a.impact);
    return out.slice(0, 3);
  }

  const api = { R, START_YEAR, START_AGE, CRYPTO_R, PPF_R, START_INCOME, ASSETS, KEYS, NIFTY, GOLD, CRYPTO, EVENT_YEARS, NEWS, LIFE,
    mulberry32, makeRng, buildSchedule, createGame, normAlloc, enabled, netWorth, inr, chapter, takeaways };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gullak = api;
})(typeof window !== 'undefined' ? window : globalThis);
