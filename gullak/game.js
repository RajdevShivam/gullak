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
  const START_INCOME = 120000, RAISE = 0.08, PROMO = 0.2, DEBT_RATE = 0.36, FD_PENALTY = 0.10, GAINS_TAX = 0.10;   // cards charge ~3% a month

  const ASSETS = [
    { k: 'sav', n: 'Savings account', i: '🏦', c: '#7b9cc4', f: 'Your bank account. Safe, ~3% a year, take it out anytime.' },
    { k: 'fd', n: 'Fixed Deposit', i: '📜', c: '#8aa95c', f: 'Lend to the bank for a while. ~7% a year, but breaking it early costs 10%.' },
    { k: 'ppf', n: 'PPF', i: '🔒', c: '#2f6b4f', f: 'Govt savings scheme. ~7.5%, tax-free, locked for 15 years (till Year 16).' },
    { k: 'nifty', n: 'Nifty 50 index fund', i: '📈', c: '#c4553a', f: "A tiny slice of India's 50 biggest companies. Grows over time, some years hurt." },
    { k: 'gold', n: 'Gold', i: '🪙', c: '#e3a33b', f: 'What Nani trusts. Often shines when stocks panic.' },
    { k: 'hot', n: 'Stock tip A', i: '🔥', c: '#e0782f', f: '“The private bank every uncle swears by.” Real name revealed at the end.' },
    { k: 'hot2', n: 'Stock tip B', i: '🔥', c: '#c4562a', f: '“The green-energy rocket. The next big thing.” Real name revealed at the end.' },
    { k: 'hot3', n: 'Stock tip C', i: '🔥', c: '#a8431f', f: '“A quiet lending company nobody at the party has heard of.” Real name revealed at the end.' },
  ];
  const KEYS = ASSETS.map(a => a.k);
  // One simple rule: 10% tax on the profit part of a sale of shares or gold. Savings, FD and PPF are never taxed here.
  const TAXED = ['nifty', 'gold', 'hot', 'hot2', 'hot3'];
  const gainsTax = (k, pnl) => TAXED.includes(k) && pnl > 0 ? pnl * GAINS_TAX : 0;
  const SAFE_RET = { sav: 0.03, fd: 0.07, ppf: 0.075 };

  // Yearly returns (approx. Nifty 50 price return, gold in INR), %
  const NIFTY = { 2005: 36, 2006: 40, 2007: 55, 2008: -52, 2009: 76, 2010: 18, 2011: -25, 2012: 28, 2013: 7, 2014: 31, 2015: -4, 2016: 3, 2017: 29, 2018: 3, 2019: 12, 2020: 15, 2021: 24, 2022: 4, 2023: 20, 2024: 9 };
  const GOLD = { 2005: 20, 2006: 22, 2007: 17, 2008: 30, 2009: 24, 2010: 23, 2011: 32, 2012: 12, 2013: -5, 2014: -8, 2015: -6, 2016: 11, 2017: 5, 2018: 7, 2019: 24, 2020: 28, 2021: -4, 2022: 14, 2023: 15, 2024: 21 };
  // Approx. real Bitcoin yearly returns in INR, %
  // Three single stocks, hidden during play. Stylised yearly returns (%) shaped on real Indian stock stories —
  // not exact prices. Revealed on the end screen.
  const STOCKS = {
    hot:  { real: 'Yes Bank', story: 'the star private bank that collapsed in 2019–20',
      r: { 2005: 60, 2006: 50, 2007: 40, 2008: -60, 2009: 120, 2010: 30, 2011: -20, 2012: 50, 2013: -20, 2014: 80, 2015: 10, 2016: 50, 2017: 30, 2018: -30, 2019: -80, 2020: -60, 2021: -10, 2022: 5, 2023: 10, 2024: 5 } },
    hot2: { real: 'Suzlon Energy', story: 'the wind-energy darling that crashed over 95%, then came roaring back',
      r: { 2005: 80, 2006: 100, 2007: 60, 2008: -80, 2009: 30, 2010: -40, 2011: -50, 2012: -30, 2013: -40, 2014: 80, 2015: 20, 2016: -20, 2017: -10, 2018: -60, 2019: -40, 2020: 20, 2021: 60, 2022: 20, 2023: 350, 2024: 60 } },
    hot3: { real: 'Bajaj Finance', story: 'the quiet lender that became one of India’s biggest compounders',
      r: { 2005: 20, 2006: 10, 2007: 30, 2008: -60, 2009: 250, 2010: 100, 2011: 30, 2012: 80, 2013: 5, 2014: 130, 2015: 60, 2016: 60, 2017: 100, 2018: 50, 2019: 60, 2020: 20, 2021: 30, 2022: -5, 2023: -5, 2024: 0 } },
  };
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
    2014: ['New hope', 'A big election result has markets cheerful. Every uncle at the wedding has a stock tip.', 'Election rally'],
    2015: ['A shrug of a year', 'Trouble in a faraway economy; markets shrug and dip a little.', 'China slowdown wobble'],
    2016: ['Notes cancelled!', 'Overnight, big notes are cancelled. Queues at every ATM. {n} spends a weekend in line, making friends.', 'Demonetisation'],
    2017: ['Everyone is buying', 'Small-company shares shoot up. The chaiwala, the cousin and the cousin’s dog all have a demat account now.', 'Small-cap mania'],
    2018: ['The hangover', 'Last year’s hot small companies crash hard. The cousin goes very quiet on WhatsApp.', 'Small-cap crash'],
    2019: ['A steady year', 'Markets inch up, nothing explodes. {n} enjoys the boring peace.', 'Steady gains'],
    2020: ['The world stops', 'A strange illness spreads; the country locks down and markets plunge. Then, months later, the world reopens and markets roar. {n}’s PPF also finally unlocks.', 'COVID crash and recovery'],
    2021: ['Everyone is a trader now', 'Trading apps boom, every tip seems to work, and {n}’s cousin quits his job to “trade full-time”.', 'Retail-investor boom'],
    2022: ['Rates go up', 'Loans get costlier, the trading-app crowd thins out, and the cousin un-quits his job.', 'Rate hikes; retail frenzy cools'],
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

  // Big life decisions the player must make before investing that year. x = multiple of this year's salary savings.
  // `at` = possible rounds (seeded pick); `def` = the option FD Uncle and SIP Aunty take.
  const DILEMMAS = [
    { id: 'wedding', at: [3, 4, 5], def: 1, t: 'The wedding', s: '{n} is getting married! Mummy has already booked the astrologer, and the guest list is at 600 and climbing.',
      options: [
        { label: 'Big fat wedding: three days, 600 guests, the band, the horse', x: -3.0, note: 'Mummy cries happy tears. Relatives talk about the paneer for years.' },
        { label: 'Respectable wedding: one grand reception', x: -1.5, note: 'Sensible. Bua-ji still says the sweets were just okay.' },
        { label: 'Court marriage and dinner for close family', x: -0.3, note: 'Cheap and lovely. Some relatives have quietly stopped calling.' } ] },
    { id: 'car', at: [6, 7], def: 1, t: 'The car question', s: 'Every colleague now drives an SUV. Sharma-ji just bought his second one.',
      options: [
        { label: 'New SUV, top variant', x: -1.6, note: 'Everyone in the society notices. So does the EMI.' },
        { label: 'Sensible hatchback', x: -0.6, note: 'Fits in the parking spot, and in the budget.' },
        { label: 'Keep the old scooter', x: 0, note: 'The scooter coughs every morning, but it is paid for.' } ] },
    { id: 'sister', at: [9, 10, 11], def: 1, t: 'Sister’s wedding', s: '{n}’s sister is getting married, and Papa quietly asks how much {n} can help with.',
      options: [
        { label: 'Pay for half the wedding', x: -2.0, note: 'Papa hugs {n} for the first time in years.' },
        { label: 'Gift her a gold set', x: -0.8, note: 'The set is admired at every function. Twice.' },
        { label: 'A generous envelope', x: -0.2, note: 'Mummy says nothing. That is worse.' } ] },
    { id: 'surgery', at: [13, 14], def: 0, t: 'Papa’s surgery', s: 'The doctor says Papa needs knee surgery. The private hospital can do it next week. The government hospital has a waiting list.',
      options: [
        { label: 'Private hospital, next week', x: -1.5, note: 'Papa walks to the gate on his own within a month.' },
        { label: 'Wait for the government hospital', x: -0.3, note: 'Six months on the list. Papa says he is fine. He is not.' } ] },
  ];

  // The lottery: the player (only) wins once, then the asks begin. Ask options use `x` as a share of the
  // after-tax prize; `creep` permanently cuts future savings (lifestyle creep). `own` = rivals don't face it.
  const LOTTERY = { at: [7, 8, 9, 10], gross: 10, tax: 0.312 };
  const LOTTO_ASKS = [
    { id: 'lifestyle', own: 1, def: 2, t: 'A lottery winner’s lifestyle', s: 'Everyone agrees: a lottery winner cannot keep living in a 1BHK and riding a scooter.',
      options: [
        { label: 'Villa, SUV, the works', x: -0.5, creep: 0.3, note: 'The EMIs, the driver and the club fees now eat 30% of what {n} saves. Every year. Forever.' },
        { label: 'A bigger flat, nothing crazy', x: -0.25, creep: 0.1, note: 'Bigger flat, bigger bills. Savings quietly shrink by 10% for good.' },
        { label: 'Change nothing', x: 0, note: 'The neighbours are convinced {n} is hiding the money somewhere.' } ] },
    { id: 'mamaji', own: 1, def: 2, t: 'Mama-ji’s business idea', s: 'Mama-ji visits with sweets and a sure-shot plan: a franchise of a franchise. He only needs a little capital.',
      options: [
        { label: 'Back Mama-ji’s business', x: -0.35, note: 'The franchise shuts in eight months. Mama-ji blames the economy.' },
        { label: 'Lend him a little', x: -0.1, note: 'It is never mentioned again. Mama-ji still comes for Diwali.' },
        { label: 'Politely say no', x: 0, note: 'By evening the whole family knows that {n} has changed.' } ] },
    { id: 'cousins', own: 1, def: 2, t: 'Forty new cousins', s: 'Suddenly {n} has forty cousins. Three of them need help: college fees, a wedding, and a medical thing nobody will explain.',
      options: [
        { label: 'Help all of them', x: -0.3, note: 'The phone now rings every Sunday. Word has spread.' },
        { label: 'Help just the college fees', x: -0.08, note: 'One cousin sends a thank-you card. The other two do not.' },
        { label: 'Help none of them', x: 0, note: 'The family WhatsApp group goes quiet whenever {n} posts.' } ] },
  ];

  // Player profile (optional). City: bigger pay, bigger rent (yearly, rises RENT_HIKE a year). Job: starting savings and raises.
  const RENT_HIKE = 0.1;
  const CITIES = {
    mumbai: { n: 'Mumbai', pay: 1.3, rent: 36000, line: 'The Mumbai landlord wants eleven months’ rent as deposit, and a promise of “no non-veg”.' },
    bengaluru: { n: 'Bengaluru', pay: 1.25, rent: 30000, line: 'The Bengaluru landlord raises the rent again, citing “the metro is coming”.' },
    delhi: { n: 'Delhi', pay: 1.2, rent: 24000, line: 'The Delhi PG aunty serves rajma every Monday and raises the rent every April.' },
    town: { n: 'a small town', pay: 1, rent: 0, line: 'Living at home means no rent, and Mummy knowing exactly what time {n} gets in.' },
  };
  const JOBS = {
    it: { n: 'starts an IT job', income: 120000, raise: RAISE },
    govt: { n: 'starts a government job', income: 90000, raise: 0.07, safe: 1 },
    startup: { n: 'joins a startup', income: 150000, raise: 0.1 },
    family: { n: 'joins the family business', income: 110000, raise: RAISE },
  };
  // Personal beats in the quiet years (rounds 1–2 and 15–19). x = multiple of this year's salary savings.
  const BEATS = [
    { id: 'goldfund', at: [1, 2], beat: 1, t: 'Mummy’s gold fund', e: '', x: -0.4, s: 'Mummy has started buying gold “for {n}’s wedding”, one bangle at a time. {n} is asked to chip in.' },
    { id: 'deposit', at: [1, 2], beat: 1, t: 'A new flat, a new deposit', e: '', x: -0.3, s: 'The flatmate moves out. {n} pays the deposit on a new place and buys a fridge off OLX.' },
    { id: 'school', at: [15, 16, 17], beat: 1, t: 'School admission fees', e: '', x: -0.7, s: 'The little one starts school. The “building fund” alone costs more than {n}’s first bike.' },
    { id: 'retire', at: [17, 18, 19], beat: 1, t: 'Papa retires', e: '', x: -0.5, s: 'Papa retires with a shawl, a cake and no pension. {n} quietly starts sending money home every month.' },
  ];
  const FOLD = { id: 'fold', beat: 1, laid: 1, t: 'The startup shuts down', e: '', x: -0.25, s: 'The startup runs out of money. The founders post “an incredible journey” on LinkedIn. {n} has no salary this year.' };

  // ---------- Schedule (all randomness decided up front from the seed) ----------
  function buildSchedule(seed, profile) {
    const rng = makeRng(seed >>> 0);
    const city = profile && CITIES[profile.city], job = profile && JOBS[profile.job];
    const raise = job ? job.raise : RAISE;
    const out = []; let base = job ? job.income * (city ? city.pay : 1) : START_INCOME; const recent = [];
    for (let r = 0; r < R; r++) {
      const y = START_YEAR + r;
      if (r > 0) base *= 1 + raise;
      const nifty = NIFTY[y] / 100, gold = GOLD[y] / 100;
      rng.gauss();   // keep the seeded stream identical to earlier versions
      const hot = STOCKS.hot.r[y] / 100, hot2 = STOCKS.hot2.r[y] / 100, hot3 = STOCKS.hot3.r[y] / 100;
      const crypto = 0;   // the Rollercoaster was removed from the game
      const roll = rng(), pick = Math.floor(rng() * LIFE.length);
      let life = null;
      if (r > 0 && roll < 0.35) { const c = LIFE[pick]; if (!recent.slice(-3).includes(c.id) && !(c.laid && job && job.safe)) life = c; }
      recent.push(life ? life.id : null);
      const inc = base;
      if (life && life.promo) base *= 1 + PROMO;
      out.push({ r, y, age: START_AGE + r, news: NEWS[y], event: EVENT_YEARS.includes(y), life, inc: life && life.promo ? base : inc,
        ret: { sav: SAFE_RET.sav, fd: SAFE_RET.fd, ppf: SAFE_RET.ppf, nifty, gold, hot, hot2, hot3, crypto } });
      if (city) Object.assign(out[r], { rent: city.rent * Math.pow(1 + RENT_HIKE, r), profile: { city, job } });
    }
    const drng = makeRng((seed ^ 0x9e3779b9) >>> 0);   // separate stream so market/life rolls stay unchanged
    for (const d of DILEMMAS) {
      const s = out[d.at[Math.floor(drng() * d.at.length)]];
      s.choice = d;
      if (s.life && !s.life.promo) s.life = null;   // one family drama per year
    }
    const free = out.filter(s => LOTTERY.at.includes(s.r) && !s.choice);
    const win = free[Math.floor(drng() * free.length)];
    win.lottery = { gross: LOTTERY.gross * win.inc, net: LOTTERY.gross * win.inc * (1 - LOTTERY.tax) };
    if (win.life && !win.life.promo) win.life = null;
    let r = win.r + 1;
    for (const a of LOTTO_ASKS) {
      while (r < R - 1 && out[r].choice) r++;
      if (r >= R - 1) break;
      out[r].choice = Object.assign({ base: win.lottery.net }, a);
      if (out[r].life && !out[r].life.promo) out[r].life = null;
      r++;
    }
    if (city && job) {   // personal beats: a third stream, so nothing above changes
      const prng = makeRng((seed ^ 0x51ed270b) >>> 0);
      const place = (b, at) => {
        const free = out.filter(s => at.includes(s.r) && !s.choice && !s.lottery && !(s.life && s.life.beat));
        if (free.length) free[Math.floor(prng() * free.length)].life = b;
      };
      for (const b of BEATS) place(b, b.at);
      if (job === JOBS.startup) place(FOLD, [3, 4, 5, 6, 7, 8]);
    }
    return out;
  }

  // New stock tips arrive in the family WhatsApp group over the years (round index: Year 4, Year 8). Held tips stay sellable.
  const UNLOCK = { hot2: 3, hot3: 7 };
  const enabled = (k, r) => !(k === 'crypto' && r < CRYPTO_R) && !(r < (UNLOCK[k] || 0));
  const emptyH = () => ({ sav: 0, fd: 0, ppf: 0, nifty: 0, gold: 0, hot: 0, hot2: 0, hot3: 0, crypto: 0 });
  function newPlayer() {
    return { h: emptyH(), contrib: emptyH(), debt: 0, cash: 0, nwHist: [], log: null,
      incMult: 1, lucky: false,
      stats: { penalty: 0, interest: 0, sold: 0, soldRisky: 0, forcedYears: 0, chosenSold: 0, cardYears: 0, creepLost: 0, tax: 0 } };
  }
  const netWorth = p => KEYS.reduce((a, k) => a + p.h[k], 0) - p.debt;

  // fund: how a shortfall is covered. 'sell' (default) force-sells investments; 'card' puts it all on the credit card.
  function beginRound(p, s, choiceX, fund) {
    const log = { income: 0, life: 0, choice: 0, rent: 0, debtPaid: 0, sales: [], newDebt: 0, sells: [] };
    log.income = (s.life && s.life.laid ? 0 : s.inc) * p.incMult;
    if (p.incMult < 1 && !(s.life && s.life.laid)) p.stats.creepLost += s.inc * (1 - p.incMult);
    log.lottery = s.lottery && p.lucky ? s.lottery.net : 0;
    log.life = s.life ? s.life.x * s.inc : 0;
    log.choice = (choiceX || 0) * ((s.choice && s.choice.base) || s.inc);
    log.rent = -(s.rent || 0);
    let cash = log.income + log.lottery + log.life + log.choice + log.rent;
    if (cash > 0 && p.debt > 0) { const pay = Math.min(cash, p.debt); p.debt -= pay; cash -= pay; log.debtPaid = pay; }
    if (cash < 0 && fund === 'card') {
      p.debt += -cash; log.newDebt = -cash; log.onCard = true; p.stats.cardYears++; cash = 0;
    }
    p.log = log; p.owe = 0;
    if (cash < 0 && fund === 'manual') { p.owe = -cash; cash = 0; }   // the player picks what to sell (G.payWith / G.payCard)
    if (cash < 0) { coverAuto(p, s, -cash); cash = 0; }
    p.cash = cash; return log;
  }

  // Sell up to `need` (after penalty) from asset k to pay a bill. Returns the sale, or null.
  function sellFor(p, s, k, need) {
    const log = p.log, avail = p.h[k];
    if (avail <= 0.5 || need <= 0 || (k === 'ppf' && s.r < PPF_R)) return null;
    const mult = k === 'fd' ? 1 - FD_PENALTY : 1;
    const sell = Math.min(avail, need / mult), basis = p.contrib[k] * sell / avail;
    p.contrib[k] -= basis; p.h[k] -= sell;
    const pen = k === 'fd' ? sell * FD_PENALTY : 0, tax = gainsTax(k, sell - basis);
    const x = { k, amt: sell, pen, tax, got: sell * mult - tax, pnl: sell - basis };
    log.sales.push(x);
    p.stats.penalty += pen; p.stats.tax += tax; p.stats.sold += sell;
    if (!SAFE_RET[k]) p.stats.soldRisky += sell;
    if (!log.forced) { log.forced = true; p.stats.forcedYears++; }
    return x;
  }
  // The old automatic order: safest first, then the card.
  function coverAuto(p, s, need) {
    const order = s.r >= PPF_R ? ['sav', 'fd', 'ppf', 'gold', 'nifty', 'hot', 'hot2', 'hot3'] : ['sav', 'fd', 'gold', 'nifty', 'hot', 'hot2', 'hot3'];
    for (const k of order) { if (need < 1e-6) break; const x = sellFor(p, s, k, need); if (x) need -= x.got; }
    if (need > 1e-6) {
      p.debt += need; p.log.newDebt += need;
      if (!p.log.forced) { p.log.forced = true; p.stats.forcedYears++; }
    }
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
    const profile = opts && opts.profile && CITIES[opts.profile.city] && JOBS[opts.profile.job] ? opts.profile : null;
    const sched = buildSchedule(seed, profile);
    const G = {
      seed, sched, R, round: 0, done: false, profile,
      name: (opts && opts.name) || 'Riya',
      me: Object.assign(newPlayer(), { lucky: true }), fd: newPlayer(), sip: newPlayer(),
      manual: !!(opts && opts.manual),   // UI mode: shortfalls wait for the player to choose what to sell
      alloc: { sav: 30, fd: 30, ppf: 0, nifty: 40, gold: 0, hot: 0, hot2: 0, hot3: 0, crypto: 0 },
      history: [], choices: [], pending: null,
    };
    function start() {
      const s = sched[G.round];
      const defX = s.choice && !s.choice.own ? s.choice.options[s.choice.def].x : 0;
      beginRound(G.fd, s, defX); beginRound(G.sip, s, defX);
      if (s.choice) G.pending = s.choice;   // the player's round begins once they choose
      else beginRound(G.me, s, 0, G.manual ? 'manual' : undefined);
    }
    // What an option would do, without committing: its cost and how much would have to be force-sold.
    G.previewChoice = function (i) {
      const s = sched[G.round], o = G.pending && G.pending.options[i];
      if (!o) return null;
      const income = (s.life && s.life.laid ? 0 : s.inc) * G.me.incMult, life = s.life ? s.life.x * s.inc : 0;
      const cost = -o.x * (G.pending.base || s.inc);
      return { cost, shortfall: Math.max(0, cost - income - life + (s.rent || 0)), creep: o.creep || 0 };
    };
    G.choose = function (i, fund) {
      const d = G.pending, o = d && d.options[i];
      if (!o) return null;
      const s = sched[G.round];
      const log = beginRound(G.me, s, o.x, fund || (G.manual ? 'manual' : undefined));
      if (o.creep) G.me.incMult *= 1 - o.creep;
      G.choices.push({ r: s.r, y: s.y, id: d.id, t: d.t, i, label: o.label, note: o.note, cost: -o.x * (d.base || s.inc), def: i === d.def,
        fund: log.onCard ? 'card' : 'sell', lotto: !!d.own, creep: o.creep || 0 });
      G.pending = null;
      return log;
    };
    G.current = () => sched[Math.min(G.round, R - 1)];
    G.netWorth = () => ({ me: netWorth(G.me), fd: netWorth(G.fd), sip: netWorth(G.sip) });
    G.step = function (alloc) {
      if (G.done) return null;
      if (alloc) G.alloc = Object.assign(emptyH(), alloc);
      if (G.pending) G.choose(G.pending.def);
      const s = sched[G.round];
      if (G.me.owe > 0) { coverAuto(G.me, s, G.me.owe); G.me.owe = 0; }
      const nwBefore = G.history.length ? G.history[G.history.length - 1].nwAfter : 0;
      const log = G.me.log;
      const res = endRound(G.me, s, G.alloc);
      endRound(G.fd, s, { fd: 1 }); endRound(G.sip, s, { nifty: 1 });
      const rec = { r: s.r, y: s.y, age: s.age, news: s.news, life: s.life, choice: G.choices.find(c => c.r === s.r) || null, log, sells: log.sells, ret: s.ret,
        shares: res.shares, invested: res.invested, pnl: res.pnl, interest: res.interest,
        nwBefore, nwAfter: netWorth(G.me), fdAfter: netWorth(G.fd), sipAfter: netWorth(G.sip) };
      G.history.push(rec);
      G.round++;
      if (G.round >= R) G.done = true; else start();
      return rec;
    };
    // Skip up to 5 years, never the final year, and stop before the next big market event or life decision.
    G.ffYears = () => {
      const max = Math.max(0, Math.min(5, R - 1 - G.round));
      let n = 0;
      while (n < max && (n === 0 || !(sched[G.round + n].event || sched[G.round + n].choice || sched[G.round + n].lottery))) n++;
      return n;
    };
    G.ff = function (alloc) {
      const n = G.ffYears(), recs = [];
      for (let i = 0; i < n; i++) recs.push(G.step(alloc));
      return recs;
    };
    // Player-chosen sale during the investing phase. Proceeds join this year's cash pool.
    // Paying a bill that is due now (manual mode)
    G.owed = () => G.me.owe || 0;
    G.canPayWith = k => G.owed() > 0 && G.me.h[k] > 0.5 && !(k === 'ppf' && G.round < PPF_R);
    G.payWith = function (k) {
      if (!G.canPayWith(k)) return null;
      const x = sellFor(G.me, sched[G.round], k, G.me.owe);
      G.me.owe = Math.max(0, G.me.owe - x.got); if (G.me.owe < 1) G.me.owe = 0;
      return x;
    };
    G.payCard = function () {
      const amt = G.owed(); if (!amt) return 0;
      const p = G.me; p.debt += amt; p.log.newDebt += amt; p.log.onCard = true; p.stats.cardYears++; p.owe = 0;
      if (!p.log.forced) { p.log.forced = true; p.stats.forcedYears++; }
      return amt;
    };
    G.canSell = k => !G.done && !G.pending && !G.owed() && KEYS.includes(k) && G.me.h[k] > 0.5 && !(k === 'ppf' && G.round < PPF_R);
    G.sell = function (k, frac) {
      if (!G.canSell(k)) return null;
      frac = Math.max(0, Math.min(1, +frac || 0)); if (!frac) return null;
      const p = G.me, amt = frac >= 1 ? p.h[k] : p.h[k] * frac;
      const basis = p.contrib[k] * amt / p.h[k], tax = gainsTax(k, amt - basis);
      const pen = k === 'fd' ? amt * FD_PENALTY : 0, proceeds = amt - pen - tax;
      p.stats.tax += tax;
      p.contrib[k] *= 1 - amt / p.h[k];
      p.h[k] = frac >= 1 ? 0 : p.h[k] - amt;
      p.cash += proceeds; p.stats.penalty += pen; p.stats.chosenSold += amt;
      const repay = Math.min(p.cash, p.debt);   // selling clears the 36% card before anything is reinvested
      p.debt -= repay; p.cash -= repay;
      const x = { k, amt, pen, tax, proceeds, repay }; p.log.sells.push(x);
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
    if (s.profile && s.r === 0) parts.push(`${name} ${s.profile.job.n} in ${s.profile.city.n}.`);
    if (s.profile && (s.r === 0 || s.r === 9)) parts.push(fill(s.profile.city.line, name));
    if (s.lottery) parts.push(`${name}’s Diwali bumper lottery ticket WINS ${inr(s.lottery.gross)}! The tax department takes 31.2% before anyone else can, leaving ${inr(s.lottery.net)}. Then ${name}’s phone starts ringing.`);
    if (s.choice) parts.push(fill(s.choice.s, name));
    if (s.life) parts.push(fill(s.life.s, name));
    return { title: `Chapter ${s.r + 1} · Year ${s.r + 1}`, sub: `${name} is ${s.age}.`, headline: s.news[0], text: parts.join(' ') };
  }
  const A = k => ASSETS.find(a => a.k === k);

  // ---------- Takeaways ----------
  function takeaways(G) {
    const H = G.history, me = G.me, name = G.name, out = [];
    const growth = r => H.filter(h => h.r >= r).reduce((g, h) => g * (1 + h.ret.nifty), 1);
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
    const st = me.stats, cost = st.penalty + st.tax + (st.interest > 10000 ? 0 : st.interest);   // big interest gets its own takeaway
    if (st.forcedYears > 0) {
      out.push({ id: 'emergency', icon: '🧯', impact: cost + 0.25 * st.soldRisky,
        title: 'Keep an emergency fund',
        text: `Life forced ${name} to sell ${inr(st.sold)} of investments in ${st.forcedYears} year${st.forcedYears > 1 ? 's' : ''}` +
          (cost > 1 ? `, costing ${inr(cost)} in penalties and tax${st.interest > 10000 ? '' : ' and credit-card interest'}.` : '.') +
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
      const eq = h => h.shares.nifty + h.shares.hot + h.shares.hot2 + h.shares.hot3;
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
    // 5. Hot tips
    for (const k of ['hot', 'hot2', 'hot3']) {
      const gain = me.h[k] - me.contrib[k], nm = `${A(k).n} (${STOCKS[k].real})`;
      if (me.contrib[k] > 1000) out.push({ id: k, icon: A(k).i, impact: Math.abs(gain),
        title: gain >= 0 ? `${nm} paid off` : `${nm} bit back`,
        text: gain >= 0 ? `${A(k).n} turned ${inr(me.contrib[k])} into ${inr(me.h[k])}. Lucky this time — the ride was wild, and it doesn’t always end this way.`
          : `${inr(me.contrib[k])} went into ${A(k).n}; ${inr(me.h[k])} is left. Exciting is not the same as profitable.` });
    }
    // 4c. Lottery
    const won = H.find(h => h.log && h.log.lottery);
    if (won) {
      const net = won.log.lottery, given = G.choices.filter(c => c.lotto).reduce((a, c) => a + c.cost, 0), creep = me.stats.creepLost;
      const fv = net * growth(won.r), cursed = given + creep > 0.2 * net;
      out.push({ id: 'lottery', icon: '🎟️', impact: cursed ? (given + creep) * 1.4 : fv * 0.15,
        title: cursed ? 'The lottery curse' : 'A lottery winner who stayed boring',
        text: cursed
          ? `${name} won ${inr(net)} after tax in Year ${won.r + 1}. Then ${inr(given)} went to asks and upgrades` + (creep > 0 ? `, and lifestyle creep cost another ${inr(creep)} in lost savings` : '') + `. Left untouched in the Nifty 50, the prize alone would be ${inr(fv)} today. Many winners end up broke, not from the win but from what comes after.`
          : `${name} won ${inr(net)} after tax and mostly said no. Left untouched in the Nifty 50, the prize alone grew to ${inr(fv)}. Saying no to Mama-ji is a financial skill.` });
    }
    // 5a. Credit card
    if (st.interest > 10000) out.push({ id: 'debt', icon: '💳', impact: st.interest * 1.5,
      title: 'The credit card always wins',
      text: `${name} paid ${inr(st.interest)} in credit-card interest at 36% a year. No investment in this game reliably beats that rate. Clear the card first, invest second.` });
    // 5b. Big life decisions: what the money would have become in the index
    let big = null;
    for (const c of G.choices) if (c.cost > 0) { const fv = c.cost * growth(c.r); if (!big || fv > big.fv) big = Object.assign({ fv }, c); }
    if (big && big.fv > big.cost * 1.5) out.push({ id: 'choice', icon: '💍', impact: (big.fv - big.cost) * 0.5,
      title: 'The real price of a big day',
      text: `${big.t} in Year ${big.r + 1} cost ${inr(big.cost)} (${big.label.split(':')[0].toLowerCase()}). Left in the Nifty 50 instead, it would be ${inr(big.fv)} today. ${fill(big.note, name)}` });
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

  const api = { FD_PENALTY, GAINS_TAX, TAXED, STOCKS, DEBT_RATE, R, START_YEAR, START_AGE, CRYPTO_R, PPF_R, START_INCOME, UNLOCK, CITIES, JOBS, BEATS, ASSETS, KEYS, NIFTY, GOLD, CRYPTO, EVENT_YEARS, NEWS, LIFE, DILEMMAS, LOTTERY, LOTTO_ASKS,
    mulberry32, makeRng, buildSchedule, createGame, normAlloc, enabled, netWorth, inr, chapter, takeaways };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gullak = api;
})(typeof window !== 'undefined' ? window : globalThis);
