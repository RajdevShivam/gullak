// Gullak — DOM, rendering and animation. All game rules live in game.js.
(function () {
  'use strict';
  const { ASSETS, KEYS, inr, chapter, enabled, R, CRYPTO_R, PPF_R, UNLOCK } = window.Gullak;
  const $ = id => document.getElementById(id);
  const A = k => ASSETS.find(a => a.k === k);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(Math.abs(x) < 0.1 && x !== 0 ? 1 : 0) + '%';
  const RIVAL_COLORS = { me: '#9E2B25', fd: '#2B2A26', sip: '#9A9284' };
  // Ledger theme: assets are ink shades + a short code instead of emoji
  const DR = (window.Gullak.DEBT_RATE || 0.36), DRT = Math.round(DR * 100) + '%';
  const CODE = { sav: 'SB', fd: 'FD', ppf: 'PF', nifty: 'N50', gold: 'AU', hot: 'TA', hot2: 'TB', hot3: 'TC', crypto: 'RC' };
  const COL = { sav: '#D6CDB9', fd: '#BCB29D', ppf: '#A09682', nifty: '#2B2A26', gold: '#857C6A', hot: '#625B4E', hot2: '#4A443A', hot3: '#9E2B25', crypto: '#9E2B25' };

  // ---------- Seed ----------
  const params = new URLSearchParams(location.search);
  let SEED = parseInt(params.get('seed'), 10);
  if (!Number.isFinite(SEED)) { SEED = Math.floor(Math.random() * 1e9); history.replaceState(null, '', '?seed=' + SEED); }

  let G = null, NAME = 'Riya', shownNW = 0, chart = null;

  // ---------- The gullak (inline SVG) ----------
  let potId = 0;
  function level(nw) { return Math.max(0, Math.min(1, Math.log10(1 + Math.max(0, nw) / 40000) / Math.log10(1 + 3e7 / 40000))); }
  function potSVG(lv) {
    const id = 'p' + (++potId);
    let coins = '';
    for (let row = 0; row < 12; row++) for (let c = 0; c < 8; c++) {
      const x = 30 + c * 20 + (row % 2) * 10, y = 186 - row * 13;
      coins += `<ellipse cx="${x}" cy="${y}" rx="10" ry="5.5" fill="#F4EDDC" stroke="#2B2A26" stroke-width="1.1"/>`;
    }
    return `<svg viewBox="0 0 200 210" aria-hidden="true">
      <defs><clipPath id="${id}c"><circle cx="100" cy="118" r="69"/></clipPath></defs>
      <ellipse cx="100" cy="198" rx="58" ry="6" fill="#2B2A26" opacity=".12"/>
      <circle cx="100" cy="118" r="72" fill="#9E2B25"/>
      <g clip-path="url(#${id}c)"><g class="coins" style="transform:translateY(${(1 - lv) * 150}px)">
        <rect x="20" y="40" width="160" height="160" fill="#E9DFC8"/>${coins}</g></g>
      <circle cx="100" cy="118" r="72" fill="none" stroke="#2B2A26" stroke-width="3"/>
      <path d="M78 54 Q80 36 100 34 Q120 36 122 54 Z" fill="#7A1F1A" stroke="#2B2A26" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="100" cy="34" rx="15" ry="5" fill="#9E2B25" stroke="#2B2A26" stroke-width="3"/>
      <rect x="80" y="66" width="40" height="7" rx="2" fill="#2B2A26"/>
      <ellipse class="slotcoin" cx="100" cy="62" rx="9" ry="3.5" fill="#F4EDDC" stroke="#2B2A26" opacity="0"/>
      <path class="crackline" d="M104 76 L112 98 L94 118 L114 140 L96 162 L104 188" fill="none" stroke="#2B2A26" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }
  function mountPot(el, nw) { el.classList.add('pot'); el.innerHTML = potSVG(level(nw)); glow(el, nw); }
  function setPot(el, nw, drop) {
    if (!el.querySelector('svg')) return mountPot(el, nw);
    el.querySelector('.coins').style.transform = `translateY(${(1 - level(nw)) * 150}px)`;
    glow(el, nw);
    if (drop) { el.classList.remove('drop', 'wobble'); void el.offsetWidth; el.classList.add(nw < 0 ? 'wobble' : 'drop'); }
  }
  function glow(el) { el.style.filter = 'none'; }

  // ---------- Sound (tiny, optional) ----------
  let AC = null;
  function tone(freqs, dur, type) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.value = f;
        const t = AC.currentTime + i * dur; g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.8);
        o.connect(g).connect(AC.destination); o.start(t); o.stop(t + dur * 2);
      });
    } catch (e) { /* no audio, no problem */ }
  }
  const clink = () => tone([1568, 2093, 2637], 0.06, 'triangle');
  const sad = () => tone([392, 330, 262], 0.16, 'sine');

  // ---------- Count-up ----------
  function countUp(el, from, to, ms, cls) {
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3), v = from + (to - from) * e;
      el.textContent = inr(v); el.classList.toggle(cls || 'neg', v < 0);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- Screens ----------
  function show(id) { for (const s of ['title', 'play', 'end']) $(s).hidden = s !== id; window.scrollTo(0, 0); }

  function startGame(name) {
    NAME = (name || '').trim().slice(0, 18) || 'Riya';
    try { localStorage.setItem('gullak-name', NAME); } catch (e) { }
    G = window.Gullak.createGame(SEED, { name: NAME, manual: true, profile: PROFILE });
    shownNW = 0;
    show('play');
    mountPot($('miniPot'), 0);
    render();
  }

  // ---------- Play render ----------
  function render() { renderTop(); renderPage(); renderJars(); if (G.owed() > 0) showPayup(); }

  // ---------- The bill: a shortfall the player must cover, one painful sale at a time ----------
  const HECKLE = [
    ['Sharma-ji', '“Never sell in a panic.” He says this from his second SUV.'],
    ['Kavya', '“Sell the boring stuff. Keep the winners. Obviously.”'],
    ['FD Uncle', '“This is why I keep everything in FD, beta.”'],
    ['SIP Aunty', '“Selling the index? At these prices? Hai Ram.”'],
    ['Arvind on TV', '“Cash is king! Raise cash NOW!”'],
  ];
  let payTimer = null, payLeft = 0, TIMED = true;
  const PAY_SECONDS = 45;
  function tickPay() {
    payLeft--;
    const el = $('payClock'); if (el) { el.textContent = payLeft + 's'; el.parentNode.classList.toggle('hurry', payLeft <= 5); }
    if (payLeft <= 0) {
      clearInterval(payTimer); payTimer = null;
      if (G.owed() > 0) { G.payCard(); sad(); }
      closePayup();
    }
  }
  function showPayup(flash) {
    if (TIMED && !payTimer) { payLeft = PAY_SECONDS; payTimer = setInterval(tickPay, 1000); }
    const owe = G.owed(), s = G.current(), c = G.choices.find(x => x.r === G.round), l = G.me.log, p = G.me;
    const why = c ? `${c.t}: ${c.label}` : s.life ? s.life.t : 'This year’s bills';
    const hk = HECKLE[(G.round + l.sales.length) % HECKLE.length];
    const rows = ASSETS.filter(a => p.h[a.k] > 0.5).map(a => {
      const k = a.k, h = p.h[k], mult = k === 'fd' ? 1 - window.Gullak.FD_PENALTY : 1, sell = Math.min(h, owe / mult);
      const pnl = sell - p.contrib[k] * sell / h, locked = !G.canPayWith(k);
      const tax = window.Gullak.TAXED.includes(k) && pnl > 0 ? pnl * window.Gullak.GAINS_TAX : 0;
      return `<div class="payrow${locked ? ' locked' : ''}"><div class="pr-name"><span class="code">${CODE[k]}</span><b>${esc(a.n)}</b>
          <small>worth ${inr(h)} · you put in ${inr(p.contrib[k])}</small></div>
        <div class="pr-hit">${locked ? '<span class="mut">Locked until Year 16</span>'
          : pnl < -0.5 ? `<span class="negc">Locks in a ${inr(-pnl)} loss</span>` : pnl > 0.5 ? `<span class="pos">Cashes ${inr(pnl)} of profit</span>${tax > 0.5 ? `<small class="negc">…and pays ${inr(tax)} tax on it, so a small amount may still be due</small>` : ''}` : '<span class="mut">No gain, no loss</span>'}
          ${k === 'fd' && !locked ? '<small>10% penalty for breaking it early</small>' : ''}${sell >= h - 0.5 && !locked ? '<small>This empties it</small>' : ''}</div>
        <button class="btn sell" data-pay="${k}" ${locked ? 'disabled' : ''}>Sell ${inr(sell)}</button></div>`;
    }).join('');
    $('payupSheet').className = 'sheet payup' + (flash ? ' loss' : '');
    $('payupSheet').innerHTML = `<div class="kicker">Year ${G.round + 1} · ${esc(why)}</div>
      <h2><span class="negc mono">${inr(owe)}</span> is due. Now.</h2>
      <div class="yourmove"><b>Your move:</b> this year’s savings aren’t enough. Pay the bill one of two ways:
        <ol><li>Tap <b>Sell</b> next to an investment below, or</li><li>skip it: put it all on the credit card and move on.</li></ol></div>
      <button class="btn card" id="payCard">Put it all on the credit card and continue → <small>${inr(owe)} at ${DRT} a year: about ${inr(owe * DR)} interest next year, and the year after…</small></button>
      ${TIMED ? `<p class="clock">Decide in <b id="payClock">${payLeft}s</b> or it goes on the credit card. <button class="linkbtn" id="noTimer">No timer, let me think</button></p>` : ''}
      ${flash ? `<p class="flash">${flash}</p>` : ''}
      <p class="heckle"><b>${hk[0]}:</b> ${hk[1]}</p>
      <div class="payrows">${rows || '<p class="mut">Nothing left to sell.</p>'}</div>
`;
    $('payup').hidden = false;
    $('payupSheet').querySelectorAll('[data-pay]').forEach(b => b.onclick = () => {
      const x = G.payWith(b.dataset.pay); if (!x) return;
      sad();
      const msg = `Sold ${inr(x.amt)} of ${A(x.k).n}` + (x.pnl < -0.5 ? ` and locked in a <b class="negc">${inr(-x.pnl)}</b> loss.` : x.pnl > 0.5 ? `, ${inr(x.pnl)} of it profit${x.tax > 0.5 ? ` (the taxman took ${inr(x.tax)})` : ''}.` : '.');
      if (G.owed() > 0) showPayup(msg); else closePayup();
    });
    $('payCard').onclick = () => { G.payCard(); sad(); closePayup(); };
    if ($('noTimer')) $('noTimer').onclick = () => { TIMED = false; stopMove(); clearInterval(payTimer); payTimer = null; showPayup(); };
  }
  function closePayup() { if (payTimer) { clearInterval(payTimer); payTimer = null; } $('payup').hidden = true; renderTop(); renderPage(); renderJars(); window.scrollTo(0, 0); }

  function renderTop() {
    const nw = G.netWorth();
    $('beads').innerHTML = G.sched.map((s, i) => `<i class="${i < G.round ? 'done' : i === G.round ? 'cur' : ''} ${s.event ? 'ev' : ''}" title="Year ${i + 1}"></i>`).join('');
    const el = $('nw');
    if (shownNW !== nw.me) { countUp(el, shownNW, nw.me, 700); shownNW = nw.me; } else { el.textContent = inr(nw.me); el.classList.toggle('neg', nw.me < 0); }
    $('rivals').innerHTML = `<span>FD Uncle <b>${inr(nw.fd)}</b></span><span>SIP Aunty <b>${inr(nw.sip)}</b></span>` +
      (G.me.debt > 0.5 ? `<span class="debtrow">Credit card <b>−${inr(G.me.debt)}</b> at ${DRT}</span>` : '');
    setPot($('miniPot'), nw.me);
    renderGauge();
    $('taunt').innerHTML = voices().filter(q => !q.k).slice(0, 1).map(quoteHTML).join('');
    const p = G.me, tot = KEYS.reduce((a, k) => a + p.h[k], 0) + p.debt;
    let bars = ASSETS.filter(a => p.h[a.k] > 0.5).map(a => `<div style="flex-grow:${p.h[a.k] / tot};background:${COL[a.k]}" title="${a.n}: ${inr(p.h[a.k])}"></div>`).join('');
    if (p.debt > 0.5) bars += `<div style="flex-grow:${p.debt / tot};background:#9F2F2D;opacity:.6" title="Credit-card debt: ${inr(p.debt)}"></div>`;
    $('inside').innerHTML = bars;
    $('inside').title = 'What’s inside the gullak';
  }

  const signed = v => (v < 0 ? '−' : '+') + inr(Math.abs(v));
  const marketGain = h => KEYS.reduce((a, k) => a + h.pnl[k], 0) - h.interest;
  function records() {
    let best = null, worst = null;
    for (const h of G.history) { const g = marketGain(h); if (!best || g > best.g) best = { g, h }; if (!worst || g < worst.g) worst = { g, h }; }
    return { best, worst };
  }
  // Fear <-> greed: flavour only, driven by last year's index and Rollercoaster returns
  function mood() {
    const last = G && G.history[G.history.length - 1];
    if (!last) return 0;
    return Math.tanh(1.8 * last.ret.nifty + 0.25 * last.ret.crypto + 0.5 * (last.ret.hot - last.ret.nifty));
  }
  function renderGauge() {
    const m = mood(), word = m < -0.5 ? 'Panic' : m < -0.15 ? 'Fear' : m > 0.5 ? 'Mania' : m > 0.15 ? 'Greed' : 'Calm';
    const ticks = [0, 25, 50, 75, 100].map(x => `<i class="${x === 50 ? 'mid' : ''}" style="left:${x}%"></i>`).join('');
    $('gauge').innerHTML = `<div class="gw"><span>fear</span><span>greed</span></div><div class="scale">${ticks}<span class="needle" style="left:${(50 + m * 50).toFixed(1)}%"></span></div><span class="word">${word}</span>`;
    $('gauge').title = 'The family mood after last year — fear or greed. Just for fun.';
  }

  // ---------- The cast: dramatic voices, sometimes right, often wrong ----------
  const CAST = {
    sharma: { e: 'S', n: 'Sharma-ji', c: 'senior colleague, 15 years in the market' },
    arvind: { e: 'A', n: 'Arvind', c: 'TV market expert, loud tie' },
    kavya: { e: 'K', n: 'Kavya', c: 'batchmate, quit her job to “trade full-time”' },
    uncle: { e: 'W', n: 'WhatsApp uncle', c: 'family group admin' },
    sip: { e: 'SA', n: 'SIP Aunty', c: 'at the family dinner' },
    fd: { e: 'FD', n: 'FD Uncle', c: 'at the family dinner' },
  };
  const FEAR = [
    ['sharma', 'I’ve seen this before. Dot-com bust all over again. I sold everything at 9:15 this morning. If you’re still holding by Friday… don’t say I didn’t warn you.', 'lowering his voice'],
    ['arvind', 'This is NOT a dip. This is the beginning of a decade-long winter. Cash is king!', 'sleeves rolled up'],
    ['sharma', 'My CA called me personally. He’s moving everything to gold. Everything.', 'lowering his voice'],
    ['kavya', 'I’ve gone 100% cash. {asset} down {pct}? It’s going to zero. Get out while there’s something left.', 'from her trading desk at home'],
    ['uncle', 'URGENT!!! Forward to all family. Experts say it will fall another 50%. SELL and keep cash at home!!! 🙏🙏', 'forwarded many times'],
  ];
  const GREED = [
    ['kavya', 'I made more in three weeks on {asset} than my entire annual bonus. I’m buying a flat. Cash. Are you seriously still in FDs?', 'showing you her phone'],
    ['sharma', '{asset} is up {pct}. Even my driver is in. You know what they say: the train is leaving the station.', 'tapping his Bloomberg screen'],
    ['uncle', '100% sure-shot. My friend’s brother-in-law is on the board. Last chance before it doubles!!! 🚀🚀🚀', 'forwarded many times'],
    ['arvind', '{asset} is the opportunity of a GENERATION. If you’re not in, you’re already late!', 'banging the desk'],
  ];
  function quote(who, line, how, vars) {
    const c = CAST[who];
    for (const k in vars || {}) line = line.split('{' + k + '}').join(vars[k]);
    return { e: c.e, n: c.n, c: how || c.c, t: line, mood: '' };
  }
  function voices() {
    const last = G.history[G.history.length - 1]; if (!last) return [];
    const out = [], tot = KEYS.reduce((a, k) => a + G.me.h[k], 0) || 1, r = last.r, spin = r + (G.seed % 7);
    const falling = ASSETS.filter(a => enabled(a.k, r) && last.ret[a.k] <= -0.15 && (G.me.h[a.k] > 1000 || a.k === 'nifty')).sort((a, b) => last.ret[a.k] - last.ret[b.k])[0];
    if (falling) { const q = FEAR[spin % FEAR.length]; out.push(Object.assign(quote(q[0], q[1], q[2], { asset: A(falling.k).n, pct: Math.round(-last.ret[falling.k] * 100) + '%' }), { mood: 'fear', k: falling.k })); }
    const hot = ASSETS.filter(a => enabled(a.k, r) && last.ret[a.k] >= 0.4 && G.me.h[a.k] / tot < 0.1).sort((a, b) => last.ret[b.k] - last.ret[a.k])[0];
    if (hot) { const q = GREED[spin % GREED.length]; out.push(Object.assign(quote(q[0], q[1], q[2], { asset: A(hot.k).n, pct: Math.round(last.ret[hot.k] * 100) + '%' }), { mood: 'greed', k: hot.k })); }
    const nw = G.netWorth(), gap = nw.sip - nw.me, fgap = nw.fd - nw.me;
    if (gap > Math.max(20000, nw.me * 0.08)) out.push(Object.assign(quote('sip', `Beta, I’m ${inr(gap)} ahead. I didn’t even look at my portfolio this year. Pass the raita.`), { mood: 'taunt' }));
    else if (fgap > 20000) out.push(Object.assign(quote('fd', `Seven percent, guaranteed. I’m ${inr(fgap)} ahead of you and I sleep like a baby. Sleep is also a return, beta.`), { mood: 'taunt' }));
    else if (nw.me > nw.sip && nw.me > nw.fd && G.round > 2) out.push(Object.assign(quote('fd', 'So… very casually… what exactly have you been investing in?', 'suddenly very interested'), { mood: 'taunt' }));
    return out.slice(0, 3);
  }
  // One quote, rendered as a pull-quote. Asset quotes sit inside that asset's ledger row; taunts sit by the net worth.
  function quoteHTML(q, i) {
    return `<figure class="quote ${q.mood}" style="animation-delay:${0.15 + (i || 0) * 0.25}s"><div class="qav">${q.e}</div><figcaption><b>${esc(q.n)}</b>, <span>${esc(q.c)}</span></figcaption><blockquote>“${esc(q.t)}”</blockquote></figure>`;
  }

  // ---------- Hot stock tips: one forwarded tip a year, drawn by the seed ----------
  const TIPS = [
    { co: 'Bharat Mega Infra', tk: 'BMIL', from: 47, to: 300, t: 'by Diwali. Board meeting Friday. Promoter buying. Don’t share outside family!!!' },
    { co: 'Shree Ganesh Lithium', tk: 'SGLI', from: 18, to: 150, t: 'in 3 months. Govt EV order coming. My CA’s cousin confirmed. Buy before Monday!!' },
    { co: 'Navratna Solar Pvt', tk: 'NAVSOL', from: 62, to: 500, t: 'target. Adani-level story. Operator is accumulating. Last chance!!!' },
    { co: 'Kaveri Agro Exports', tk: 'KAVAGRO', from: 23, to: 180, t: 'by March. Big export deal with Dubai. Only for our group members.' },
    { co: 'Om Sai Pharma', tk: 'OMSAI', from: 91, to: 700, t: 'by year end. Cure for diabetes in trials. 100% sure-shot, I have put my PF in.' },
    { co: 'Rajdhani Steel Tubes', tk: 'RSTL', from: 34, to: 250, t: 'in 6 months. Railway contract news tomorrow. Delete after reading!!' },
    { co: 'Lakshmi Gold Finance', tk: 'LGFL', from: 12, to: 120, t: '10 bagger. Big foreign fund entering. Don’t tell Sharma-ji.' },
    { co: 'Vikas Telecom Infra', tk: 'VTIL', from: 8, to: 80, t: 'penny stock = big money. 5G tower deal. Buy minimum 10,000 shares!!!' },
    { co: 'Sona Cement & Paints', tk: 'SONACEM', from: 55, to: 400, t: 'by Holi. Merger with big MNC. Inside news from Mumbai office.' },
    { co: 'Ganga Hydro Power', tk: 'GANGAHP', from: 29, to: 220, t: 'target. Govt approval in hand. TV wala expert also bullish.' },
    { co: 'Annapurna Foods Digital', tk: 'ANNAFD', from: 41, to: 333, t: 'by Navratri. App launch with cricket star. Upper circuit guaranteed.' },
    { co: 'Swastik Rare Earths', tk: 'SWARE', from: 16, to: 160, t: 'in 100 days. China ban = our chance. Promoter is my neighbour’s friend.' },
  ];
  const TIP_UP = [
    '{tk} hit upper circuit three days in a row. Uncle has sent 14 voice notes.',
    '{tk} doubled. Uncle has changed the group name to “Crorepati Parivaar”.',
    '{tk} up big. Uncle now signs every message “— market guru”.',
    '{tk} rallied. The group is planning a Goa trip on Uncle’s profits.',
  ];
  const TIP_DOWN = [
    '{tk} promoter arrested. Stock frozen. Uncle has left the group.',
    '{tk} hit lower circuit five days straight. Uncle says “long-term hold only”.',
    '{tk} auditor resigned. Uncle has stopped replying to messages.',
    '{tk} delisted. Uncle is now forwarding yoga videos instead.',
  ];
  const tipFor = r => TIPS[((G.seed % 12) + r * 5) % 12];
  const TIP_KEYS = ['hot', 'hot2', 'hot3'], NAME_OF = { hot: 'Stock A', hot2: 'Stock B', hot3: 'Stock C' };
  // Forwards that fit each hidden stock's story (the generic pool above stays as fallback flavour).
  const TIPS_BY = {
    hot: [
      { from: 60, to: 400, t: 'Best private bank in India. Fastest loan growth ever. CEO is a genius. Don’t share outside family!!!' },
      { from: 90, to: 600, t: 'Foreign funds buying. Bank will be bigger than HDFC in 5 years. Sure-shot!!' },
      { from: 120, to: 1000, t: 'My bank RM himself told me. Put your FD money in this. Safer than FD!!!' },
      { from: 45, to: 300, t: 'Temporary dip only. Promoter will never let it fall. BUY THE DIP!!!' } ],
    hot2: [
      { from: 70, to: 700, t: 'Wind is the future. Next Reliance. Orders from 20 countries. Buy before Monday!!' },
      { from: 30, to: 300, t: 'Green energy subsidy coming in budget. My CA’s cousin confirmed. Load up!!!' },
      { from: 12, to: 150, t: 'Penny stock now, multibagger later. Operator is accumulating. Last chance!!!' },
      { from: 8, to: 100, t: 'Debt restructuring done. Comeback story of the decade. 100% sure-shot!!' } ],
    hot3: [
      { from: 40, to: 200, t: 'Small lender, nobody knows it yet. Consumer loans on every TV and fridge. Quiet compounder!!' },
      { from: 150, to: 900, t: 'Fund managers secretly buying. EMI card in every wallet soon. Hold 10 years!!' },
      { from: 500, to: 3000, t: 'Boring company, crazy growth. Uncle has held since the start. Don’t sell ever!!!' },
      { from: 900, to: 5000, t: 'Still cheap for what it is. Long term only. Forward to your children!!' } ],
  };
  const tipKey = r => { const on = TIP_KEYS.filter(k => enabled(k, r)); return r === UNLOCK.hot2 ? 'hot2' : r === UNLOCK.hot3 ? 'hot3' : on[(G.seed + r) % on.length]; };   // this year's WhatsApp forward: a newly arrived tip, else one of those on offer
  const FWD = '<svg viewBox="0 0 16 12" width="14" height="11" aria-hidden="true"><path d="M9 1l5 4.5L9 10M14 5.5H6C3.5 5.5 2 7 2 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function tipSlip(r) {
    const k = tipKey(r), pool = TIPS_BY[k], t = pool[(G.seed + r) % pool.length], nm = NAME_OF[k];
    return `<div class="slip"><div class="fwd">${FWD} Forwarded many times</div><p><b>${nm}</b> <span class="tgt">₹${t.from} → ₹${t.to}</span> ${esc(t.t)}</p></div>`;
  }
  function tipOutcome(h, k) {
    k = k || tipKey(h.r);
    const up = h.ret[k] >= 0, pool = up ? TIP_UP : TIP_DOWN;
    return { up, t: pool[(h.r + G.seed) % pool.length].split('{tk}').join(NAME_OF[k]) };
  }

  function renderPage() {
    const s = G.current(), ch = chapter(s, NAME), l = G.me.log;
    let h = `<div class="kicker">${ch.title}</div><h2>${esc(ch.sub)}</h2><p class="story${/^\S\s/.test(ch.text) ? ' nocap' : ''}">${esc(ch.text)}</p><div class="notes">`;
    h += `<div class="note"><div><span class="tag news">In the news</span>${s.event ? '<span class="tag big">Big market year</span>' : ''}<b>${esc(s.news[0])}</b></div></div>`;
    for (const k of TIP_KEYS) if (UNLOCK[k] === s.r) h += `<div class="note"><div><span class="tag big">New tip</span><b>${NAME_OF[k]} just landed in the family WhatsApp group</b></div></div>`;
    if (s.lottery) {
      h += `<div class="note lotto"><div><span class="tag big">Jackpot</span><b>Diwali bumper lottery: you won</b></div>` +
        `<span class="amt pos">+${inr(s.lottery.net)}</span></div>`;
    }
    if (s.life) {
      h += `<div class="note"><div><span class="tag life">Life happens</span><b>${esc(s.life.t)}</b></div>` +
        (l.life ? `<span class="amt ${l.life < 0 ? 'negc' : 'pos'}">${l.life < 0 ? '−' : '+'}${inr(Math.abs(l.life))}</span>` : '') + `</div>`;
    }
    h += `</div>`;
    if (G.pending) {
      h += `<div class="yourmove"><b>Your move:</b> ${esc(G.pending.t)}. Pick one option ${window.innerWidth < 900 ? 'below' : 'on the right'}. Nothing else happens this year until you decide.</div>`;
      h += `<div class="ledger"><div class="line total"><span>Ready for the gullak</span><span>—</span></div></div>`;
    } else {
    const ch0 = G.choices.find(c => c.r === G.round);
    h += `<div class="ledger">`;
    h += `<div class="line"><span>Salary savings this year</span><b>${l.income ? inr(l.income) : '₹0 <small>(no job)</small>'}</b></div>`;
    if (l.rent) h += `<div class="line"><span>Rent in ${esc(s.profile.city.n)}</span><b class="negc">−${inr(-l.rent)}</b></div>`;
    if (l.lottery) h += `<div class="line"><span>Lottery prize, after 31.2% tax</span><b class="pos">+${inr(l.lottery)}</b></div>`;
    if (l.life) h += `<div class="line"><span>${esc(s.life.t)}</span><b class="${l.life < 0 ? 'negc' : 'pos'}">${l.life < 0 ? '−' : '+'}${inr(Math.abs(l.life))}</b></div>`;
    if (ch0 && l.choice) h += `<div class="line"><span>${esc(ch0.t)}</span><b class="${l.choice < 0 ? 'negc' : 'pos'}">${l.choice < 0 ? '−' : '+'}${inr(Math.abs(l.choice))}</b></div>`;
    if (l.debtPaid) h += `<div class="line"><span>Paid off credit-card debt first</span><b class="negc">−${inr(l.debtPaid)}</b></div>`;
    if (!ch0 && (l.sales.length || l.newDebt)) {
      h += `<div class="forced"><b>${safeHead(l)}</b>`;
      for (const x of l.sales) h += `<div class="line"><span>Sold ${A(x.k).n}</span><span>${inr(x.amt)}${x.pen ? ` <small>(−${inr(x.pen)} penalty)</small>` : ''}</span></div>`;
      if (l.newDebt) h += `<div class="line negc"><span>Put on the credit card (${DRT} a year)</span><b>${inr(l.newDebt)}</b></div>`;
      const safeOnly = !l.newDebt && l.sales.every(x => x.k === 'sav' || x.k === 'fd');
      h += safeOnly ? `<p>Good thing there was a cushion — Savings and FD took the hit, so ${esc(NAME)} didn’t have to sell investments in a hurry.</p></div>`
        : `<p>Without enough cushion in Savings or FD, ${esc(NAME)} had to sell investments — whatever the market was doing.</p></div>`;
    }
    for (const x of l.sells) h += `<div class="line"><span>You sold ${A(x.k).n}</span><b class="pos">+${inr(x.proceeds)}${x.pen ? ` <small>(−${inr(x.pen)} penalty)</small>` : ''}${x.tax > 0.5 ? ` <small>(−${inr(x.tax)} tax on profit)</small>` : ''}</b></div>`;
    for (const x of l.sells) if (x.repay > 0.5) h += `<div class="line"><span>Used to clear the credit card</span><b class="negc">−${inr(x.repay)}</b></div>`;
    h += `<div class="line total"><span>Ready for the gullak</span><span>${inr(G.me.cash)}</span></div></div>`;
    }
    const rec = records();
    if (rec.best && G.history.length > 1) h += `<div class="records"><span>Best year <b class="pos">${signed(rec.best.g)}</b> <small>(Year ${rec.best.h.r + 1})</small></span><span>Worst year <b class="${rec.worst.g < 0 ? 'negc' : 'pos'}">${signed(rec.worst.g)}</b> <small>(Year ${rec.worst.h.r + 1})</small></span></div>`;
    const nwm = G.netWorth().me;
    h += `<div class="shelf"><div id="shelfPot"></div><p>${esc(NAME)}’s gullak holds <b>${inr(nwm)}</b>${G.me.debt > 0.5 ? ` — and a credit-card bill of <b class="negc">${inr(G.me.debt)}</b>` : ''}. ${G.round === 0 ? 'Empty for now. Let’s fill it.' : nwm > G.netWorth().sip ? 'Heavier than SIP Aunty’s!' : 'It grows a little every year.'}</p></div>`;
    $('page').innerHTML = h;
    mountPot($('shelfPot'), nwm);
    $('page').style.animation = 'none'; void $('page').offsetWidth; $('page').style.animation = '';
  }
  function safeHead(l) { return !l.newDebt && l.sales.every(x => x.k === 'sav' || x.k === 'fd') ? 'Dipped into the emergency cushion' : 'Forced sale — the money had to come from somewhere'; }
  function retChip(k, r) { return `<span class="chip ${r > 0.001 ? 'up' : r < -0.001 ? 'dn' : 'flat'}"><span class="cd">${CODE[k]}</span>${pct(r)}</span>`; }

  function renderJars() {
    const s = G.current(), r = G.round, cash = G.me.cash, ffN = G.ffYears();
    const ffBtn = `<button class="btn ghost" id="ffBtn" ${ffN ? '' : 'disabled'}>${ffN ? `Skip ${ffN} year${ffN > 1 ? 's' : ''} »` : 'Last page'}</button>`;
    const ffNote = ffN ? `Fast-forward keeps this mix and never sells${ffN < 5 && r + ffN < R - 1 ? ` · stops before Year ${r + ffN + 1}` : ''}.` : 'No skipping the final year.';
    if (G.pending) { renderDecision(); moveClock(); return; }
    const verdict = choiceVerdict();
    if (cash < 1) {
      $('jars').className = 'jars';
      $('jars').innerHTML = verdict + `<div class="waits"><div id="waitPot"></div><h3>${G.me.log.income ? 'Nothing left to save this year' : 'No salary this year — the gullak waits.'}</h3>
        <p>${G.me.log.income ? 'Life took it all. The gullak sits quietly on the shelf.' : `${esc(NAME)} keeps the lights on and the pot keeps its coins. Better years are coming.`}</p></div>
        <div class="actions"><button class="btn primary" id="goBtn">Turn the page →</button>${ffBtn}</div><div class="ffnote">${ffNote}</div>`;
      mountPot($('waitPot'), G.netWorth().me);
    } else {
      const first = r === 0;
      $('jars').className = 'jars' + (first ? ' coach' : '');
      const vs = voices(), lastH = G.history[G.history.length - 1];
      $('jars').innerHTML = verdict + (first ? `<div class="coachtip">Slide to split this year’s ${inr(cash)} between the jars. Then drop it in the gullak.</div>` : '') +
        `<h3>Where does ${inr(cash)} go?</h3><p class="sub">This year’s savings${G.me.log.sells.length ? ' plus what you sold' : ''}. The sliders split only this new money; what’s already in each jar stays put. Nervous — or greedy? Sell from a jar to move money around.</p>` +
        `<div class="mixbar" id="mixbar"></div><div class="sumhint" id="sumhint"></div>` +
        ASSETS.map(a => {
          const on = enabled(a.k, r), hold = G.me.h[a.k], last = G.history[G.history.length - 1];
          const lock = !on ? `<span class="lock">arrives Year ${(UNLOCK[a.k] || CRYPTO_R) + 1}</span>` : a.k === 'ppf' ? `<span class="lock">${r >= PPF_R ? 'unlocked' : 'locked till Year 16'}</span>` : '';
          const overall = hold - G.me.contrib[a.k];
          const held = hold > 0.5 || Math.abs(G.me.contrib[a.k]) > 0.5;
          const perf = last && enabled(a.k, last.r) ? `<div class="perf ${held && last.pnl[a.k] < -0.5 ? 'hit' : held && last.pnl[a.k] > 0.5 && last.ret[a.k] >= 0.25 ? 'win' : ''}">${retChip(a.k, last.ret[a.k])}` +
            (held ? `<span>last yr <b class="${last.pnl[a.k] < 0 ? 'negc' : 'pos'}">${signed(last.pnl[a.k])}</b></span><span>overall <b class="${overall < 0 ? 'negc' : 'pos'}">${signed(overall)}</b></span>` : `<span>last year</span>`) + `</div>` : '';
          let notes = '';
          if (TIP_KEYS.includes(a.k) && on) {
            if (lastH && tipKey(lastH.r) === a.k) { const o = tipOutcome(lastH, a.k); notes += `<div class="outcome ${o.up ? 'pos' : 'negc'}">${esc(o.t)}</div>`; }
            if (tipKey(r) === a.k) notes += tipSlip(r);
          }
          notes += vs.filter(q => q.k === a.k).map(quoteHTML).join('');
          const sell = hold > 0.5 ? (G.canSell(a.k) ? `<div class="sells"><button class="sellbtn" data-sell="${a.k}" data-f="0.5">Sell half</button><button class="sellbtn" data-sell="${a.k}" data-f="1">Sell all</button>${a.k === 'fd' ? '<small>10% penalty</small>' : ''}${G.me.log.sells.some(x => x.k === a.k) && (G.alloc[a.k] || 0) > 0 ? '<small class="negc">Set this jar’s share to 0% if you don’t want to buy it again.</small>' : ''}</div>` : `<div class="sells"><small>locked — can’t sell yet</small></div>`) : '';
          return `<div class="asset ${on ? '' : 'off'}"><div class="ico" aria-hidden="true">${CODE[a.k]}</div>
            <div><div class="nm" title="${esc(a.f)}">${a.n} ${lock}</div><div class="why">${esc(a.f)}</div></div>
            <div><div class="amt" id="amt-${a.k}">—</div><div class="hold">has ${inr(hold)}</div></div>
            ${perf}${notes ? `<div class="rownotes">${notes}</div>` : ''}${sell}
            <input type="range" min="0" max="100" step="5" value="${on ? G.alloc[a.k] || 0 : 0}" style="--p:${on ? G.alloc[a.k] || 0 : 0}%" data-k="${a.k}" ${on ? '' : 'disabled'} aria-label="${a.n} share"></div>`;
        }).join('') +
        `<div class="actions"><button class="btn primary" id="goBtn">Drop it in the gullak</button>${ffBtn}</div><div class="ffnote">${ffNote}</div>`;
      $('jars').querySelectorAll('input[type=range]').forEach(inp => inp.oninput = () => {
        G.alloc[inp.dataset.k] = +inp.value; inp.style.setProperty('--p', inp.value + '%'); $('jars').classList.remove('coach'); updateAmts();
      });
      updateAmts();
    }
    $('jars').querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const x = G.sell(b.dataset.sell, +b.dataset.f); if (!x) return;
      tone([660, 520], 0.08, 'triangle');
      const y = window.scrollY; renderTop(); renderPage(); renderJars(); window.scrollTo(0, y);
    });
    $('goBtn').onclick = () => invest();
    $('ffBtn').onclick = () => fastForward();
    moveClock();
  }
  // ---------- Move timer: every decision and every year's investing gets PAY_SECONDS (unless the timer is off) ----------
  let moveTimer = null, moveLeft = 0, moveKey = '';
  function stopMove() { if (moveTimer) { clearInterval(moveTimer); moveTimer = null; } }
  function moveClock() {
    if (!TIMED || !G || G.done) { stopMove(); return; }
    const key = G.round + (G.pending ? 'd' : 'i');
    if (key !== moveKey) { moveKey = key; moveLeft = PAY_SECONDS; }
    if (!moveTimer) moveTimer = setInterval(tickMove, 1000);
    const then = G.pending ? 'you get the usual choice (the one FD Uncle and SIP Aunty make)' : 'the money drops into the gullak as split';
    $('jars').insertAdjacentHTML('afterbegin', `<p class="clock movec${moveLeft <= 10 ? ' hurry' : ''}">Decide in <b id="moveClock">${moveLeft}s</b> or ${then}. <button class="linkbtn" id="noMoveTimer">No timer, let me think</button></p>`);
    $('noMoveTimer').onclick = () => { TIMED = false; stopMove(); const y = window.scrollY; renderJars(); window.scrollTo(0, y); };
  }
  function tickMove() {
    if (!$('payup').hidden || !$('modal').hidden || $('play').hidden || busy) return;   // paused while a popup is open
    moveLeft--;
    const el = $('moveClock'); if (el) { el.textContent = moveLeft + 's'; el.parentNode.classList.toggle('hurry', moveLeft <= 10); }
    if (moveLeft > 0) return;
    stopMove();
    if (G.pending) commitChoice(G.pending.def); else invest();
  }
  // ---------- Family decisions: block the year until the player chooses ----------
  const fillN = t => String(t).split('{n}').join(NAME);
  const costTxt = c => c > 0.5 ? '−' + inr(c) : c < -0.5 ? '+' + inr(-c) : '₹0';
  function renderDecision() {
    const d = G.pending, s = G.current();
    $('jars').className = 'jars decide';
    $('jars').innerHTML = `<div class="kicker">A family decision · Year ${s.r + 1}</div><h3>${esc(d.t)}</h3><p class="dstory">${esc(fillN(d.s))}</p>
      <div class="opts">${d.options.map((o, i) => {
        const pv = G.previewChoice(i);
        return `<button class="opt" data-choose="${i}"><span class="ol">${esc(o.label)}</span><span class="oc ${pv.cost > 0.5 ? 'negc' : ''}">${costTxt(pv.cost)}</span>` +
          (pv.shortfall > 0.5 ? `<span class="warn">You’ll have to sell ${inr(pv.shortfall)} of investments for this</span>` : '') +
          (pv.creep ? `<span class="warn">…and bigger bills every year after</span>` : '') + `</button>`;
      }).join('')}</div>
      <p class="sub">${d.own ? 'FD Uncle and SIP Aunty never won anything. This one is all yours.' : 'FD Uncle and SIP Aunty face the same choice.'} Nothing else happens this year until you decide.</p>`;
    $('jars').querySelectorAll('[data-choose]').forEach(b => b.onclick = () => {
      if (!G.pending) return;
      const i = +b.dataset.choose, pv = G.previewChoice(i);
      commitChoice(i);
    });
  }
  function commitChoice(i, fund) {
    G.choose(i, fund);
    if (!G.owed()) clink();
    render();
    window.scrollTo(0, 0);
  }
  // Which jars a forced sale would empty (same order as game.js; preview only)
  function salePlan(need) {
    const order = G.round >= PPF_R ? ['sav', 'fd', 'ppf', 'gold', 'nifty', 'hot', 'hot2', 'hot3'] : ['sav', 'fd', 'gold', 'nifty', 'hot', 'hot2', 'hot3'], out = [];
    for (const k of order) {
      if (need <= 0) break;
      const avail = G.me.h[k]; if (avail <= 0.5) continue;
      const mult = k === 'fd' ? 1 - window.Gullak.FD_PENALTY : 1, sell = Math.min(avail, need / mult);
      out.push({ k, sell }); need -= sell * mult;
    }
    return { out, left: Math.max(0, need) };
  }
  function renderFunding(i, pv) {
    const d = G.pending, o = d.options[i], plan = salePlan(pv.shortfall);
    $('jars').className = 'jars decide';
    $('jars').innerHTML = `<div class="kicker">${esc(d.t)} · ${esc(o.label)}</div>
      <h3>You’re short by <span class="negc mono">${inr(pv.shortfall)}</span>. How will you pay?</h3>
      <div class="opts fund">
        <button class="opt" data-fund="sell"><span class="ol">Sell investments</span><span class="oc negc">−${inr(pv.shortfall)}</span>
          <span class="plan">${plan.out.map(x => `${A(x.k).n} <b>${inr(x.sell)}</b>`).join(' · ') || 'Nothing to sell'}${plan.left > 0.5 ? ` · the rest (${inr(plan.left)}) goes on the card` : ''}</span>
          <span class="fnote">Sharma-ji: “Never sell in a panic.” Easy for him to say.</span></button>
        <button class="opt card" data-fund="card"><span class="ol">Swipe the credit card (${DRT} a year)</span><span class="oc negc">−${inr(pv.shortfall)}</span>
          <span class="plan">Nothing is sold. Next year the bank adds about <b>${inr(pv.shortfall * DR)}</b> in interest — and keeps adding it until it is paid.</span>
          <span class="fnote">The bank sends a congratulatory SMS.</span></button>
      </div>
      <button class="linkbtn back" id="fundBack">← choose a different option</button>`;
    $('jars').querySelectorAll('[data-fund]').forEach(b => b.onclick = () => commitChoice(i, b.dataset.fund));
    $('fundBack').onclick = () => renderDecision();
  }
  function choiceVerdict() {
    const c = G.choices.find(x => x.r === G.round); if (!c) return '';
    const l = G.me.log, forced = l.sales.length || l.newDebt;
    let h = `<div class="verdictbox"><div class="kicker">${esc(c.t)} · ${esc(c.label)}</div><p class="consequence">${esc(fillN(c.note))}</p>`;
    if (forced) {
      h += `<div class="stamp"><span class="stampmark">${l.onCard && !l.sales.length ? 'On the card' : 'Forced sale'}</span><div>`;
      for (const x of l.sales) h += `<div class="line"><span>Sold ${A(x.k).n}</span><span class="negc">${inr(x.amt)}${x.pen ? ` <small>(−${inr(x.pen)} penalty)</small>` : ''}</span></div>`;
      if (l.newDebt) h += `<div class="line"><span>Put on the credit card (${DRT} a year)</span><span class="negc">${inr(l.newDebt)}</span></div>`;
      h += `</div></div>`;
    }
    return h + `</div>`;
  }
  function updateAmts() {
    const r = G.round, sh = window.Gullak.normAlloc(G.alloc, r);
    let tot = 0; for (const k of KEYS) if (enabled(k, r)) tot += +G.alloc[k] || 0;
    for (const k of KEYS) { const el = $('amt-' + k); if (el) el.textContent = enabled(k, r) ? `${Math.round(sh[k] * 100)}% · ${inr(G.me.cash * sh[k])}` : '—'; }
    $('mixbar').innerHTML = ASSETS.filter(a => sh[a.k] > 0).map(a => `<div style="flex-grow:${sh[a.k]};background:${COL[a.k]}"></div>`).join('');
    $('sumhint').textContent = tot === 0 ? 'All sliders at zero → it all goes to Savings' : 'Sliders are relative — they always add up to 100%';
  }

  // ---------- Turn ----------
  let busy = false;
  function invest(quiet) {
    if (!G || G.done || busy) return;
    const rec = G.step(Object.assign({}, G.alloc));
    if (quiet) { afterTurn(true); return rec; }
    busy = true; clink();
    showReveal(rec);
    return rec;
  }
  function afterTurn(quiet) {
    $('modal').hidden = true; busy = false;
    if (quiet && G.owed()) { G.payCard(); }   // test hook: never block scripted play
    if (G.done) { showEnd(); return; }
    render();
    const l = G.me.log;
    if (!quiet && (l.sales.length || l.newDebt)) sad();
  }

  function showReveal(rec) {
    const up = rec.nwAfter - rec.nwBefore, gain = marketGain(rec), r = records();
    const isBest = r.best && r.best.h === rec && G.history.length > 1 && gain > 0, isWorst = r.worst && r.worst.h === rec && G.history.length > 1 && gain < 0;
    const held = ASSETS.filter(a => enabled(a.k, rec.r) && (Math.abs(rec.pnl[a.k]) > 0.5 || rec.shares[a.k] > 0));
    const rows = held.map((a, i) => {
      const overall = G.me.h[a.k] - G.me.contrib[a.k];
      const o = a.k === tipKey(rec.r) ? tipOutcome(rec, a.k) : null;
      return `<div class="rrow" style="animation-delay:${0.45 + i * 0.12}s"><span>${a.n}</span>${retChip(a.k, rec.ret[a.k])}<b class="${rec.pnl[a.k] < 0 ? 'negc' : 'pos'}">${signed(rec.pnl[a.k])}</b><small>${signed(overall)} overall</small>${o ? `<div class="outcome ${o.up ? 'pos' : 'negc'}">${esc(o.t)}</div>` : ''}</div>`;
    }).join('');
    $('sheet').className = 'sheet ' + (gain < 0 ? 'loss' : 'win');
    $('sheet').innerHTML = `<div class="kicker">The end of Year ${rec.r + 1}</div>
      <div class="headline ${gain < 0 ? 'negc' : 'pos'}">${signed(gain)}<small>${gain < 0 ? 'lost to the markets this year' : 'made in the markets this year'}</small></div>
      <div class="subhead">${gain < 0 ? 'The markets took a bite out of the gullak.' : 'The markets were kind to the gullak.'}${isBest ? ' <span class="tag life">New best year</span>' : ''}${isWorst ? ' <span class="tag big">New worst year</span>' : ''}</div>
      <div class="reveal-top"><div id="revPot"></div><div><small>In the gullak now</small><div class="bignum" id="revNum">${inr(rec.nwBefore)}</div>
      <div class="delta">${signed(up)} since last year, after adding ${inr(rec.invested)}</div></div></div>
      <div class="rtable">${rows || '<p class="sub">Nothing invested yet.</p>'}</div>
      ${rec.interest > 1 ? `<div class="forced" style="margin-top:0"><b>Interest charged: −${inr(rec.interest)}</b> <small>(credit card at ${DRT} a year)</small></div>` : ''}
      <div class="rivalline">FD Uncle <b>${inr(rec.fdAfter)}</b> · SIP Aunty <b>${inr(rec.sipAfter)}</b></div>
      <button class="btn primary" id="contBtn">${G.done ? 'Break the gullak' : `Turn to chapter ${rec.r + 2} →`}</button>`;
    $('modal').hidden = false;
    mountPot($('revPot'), rec.nwBefore);
    if (gain < 0) { sad(); document.body.classList.remove('ouch'); void document.body.offsetWidth; document.body.classList.add('ouch'); setTimeout(() => $('revPot').classList.add('cracked'), 300); }
    else { coinShower($('sheet'), Math.min(28, 8 + Math.round(Math.log10(1 + gain / 10000) * 6))); }
    setTimeout(() => { setPot($('revPot'), rec.nwAfter, true); countUp($('revNum'), rec.nwBefore, rec.nwAfter, 1100); }, 250);
    $('contBtn').onclick = () => afterTurn(false);
    $('contBtn').focus({ preventScroll: true });
  }
  function coinShower(host, n) {
    const box = document.createElement('div'); box.className = 'shower';
    box.innerHTML = Array.from({ length: n }, (_, i) => `<i style="left:${(Math.random() * 96).toFixed(1)}%;--d:${(Math.random() * 0.6).toFixed(2)}s;--t:${(0.9 + Math.random() * 0.7).toFixed(2)}s"></i>`).join('');
    host.appendChild(box); setTimeout(() => box.remove(), 2600);
  }

  function fastForward(quiet) {
    if (!G || G.done || busy || !G.ffYears()) return [];
    const recs = G.ff(Object.assign({}, G.alloc));
    if (quiet) { afterTurn(true); return recs; }
    busy = true; clink();
    $('sheet').className = 'sheet';
    const a = recs[0], b = recs[recs.length - 1], up = b.nwAfter - a.nwBefore, nxt = G.current();
    $('sheet').innerHTML = `<div class="kicker">Fast-forward · Year ${a.r + 1}${recs.length > 1 ? '–' + (b.r + 1) : ''}</div>
      <h2>${recs.length > 1 ? `${recs.length} years fly by.` : 'A year flies by.'} ${esc(NAME)} is now ${nxt.age}.</h2>
      ${nxt.event ? `<div class="stopnote">Stopping here — something big is about to happen. Better be at the wheel for this one.</div>` : ''}
      <ul class="recap">${recs.map(r => {
        const d = marketGain(r), f = r.log.sales.length || r.log.newDebt;
        return `<li><span class="yr">Y${r.r + 1}</span><span>${esc(r.news[0])}</span><span class="d ${d < 0 ? 'negc' : 'pos'}">${d < 0 ? '−' : '+'}${inr(Math.abs(d))}</span>
          <span class="ev">${r.choice ? `${esc(r.choice.t)}: ${esc(r.choice.label)} (${costTxt(r.choice.cost)})` : r.life ? esc(r.life.t) : 'A quiet year at home.'}${f ? ' · <b class="negc">forced sale</b>' : ''}</span></li>`;
      }).join('')}</ul>
      <div class="reveal-top"><div id="revPot"></div><div><small>In the gullak</small><div class="bignum" id="revNum">${inr(a.nwBefore)}</div>
      <div class="delta ${up < 0 ? 'negc' : 'pos'}">${signed(up)} over ${recs.length} year${recs.length > 1 ? 's' : ''} (with savings)</div></div></div>
      <div class="rivalline">FD Uncle <b>${inr(b.fdAfter)}</b> · SIP Aunty <b>${inr(b.sipAfter)}</b></div>
      <button class="btn primary" id="contBtn">Read chapter ${nxt.r + 1} →</button>`;
    $('modal').hidden = false;
    mountPot($('revPot'), a.nwBefore);
    setTimeout(() => { setPot($('revPot'), b.nwAfter, true); countUp($('revNum'), a.nwBefore, b.nwAfter, 1300); }, 250);
    $('contBtn').onclick = () => afterTurn(false);
    $('contBtn').focus({ preventScroll: true });
    return recs;
  }

  // ---------- End ----------
  function showEnd() {
    show('end');
    const nw = G.netWorth();
    const stage = $('breakStage');
    stage.innerHTML = `<div class="half l"></div><div class="half r"></div>` +
      Array.from({ length: 34 }, (_, i) => {
        const ang = Math.PI * (0.05 + 0.9 * Math.random()), dist = 60 + Math.random() * 110;
        const x = Math.cos(ang) * dist * (Math.random() < .5 ? -1 : 1), y = 50 + Math.random() * 80;
        return `<i class="coin" style="--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--rot:${(Math.random() * 720 - 360).toFixed(0)}deg;--d:${(1.3 + i * 0.025).toFixed(2)}s"></i>`;
      }).join('');
    stage.querySelectorAll('.half').forEach(h => mountPot(h, nw.me));
    stage.classList.remove('go'); void stage.offsetWidth; stage.classList.add('go');
    setTimeout(() => tone([523, 659, 784, 1047], 0.09, 'triangle'), 1150);

    const res = [{ n: NAME, v: nw.me, me: 1 }, { n: 'FD Uncle', v: nw.fd }, { n: 'SIP Aunty', v: nw.sip }].sort((a, b) => b.v - a.v);
    const rank = res.findIndex(x => x.me) + 1;
    $('endTitle').textContent = `${NAME} is 45. Time to break the gullak.`;
    const ST = window.Gullak.STOCKS;
    $('yearsReveal').innerHTML = `<b>Surprise: you just lived through 2005–2024</b> — real Indian market history.` +
      `<p class="stockreveal">The three stock tips: <b>A was ${ST.hot.real}</b> (${ST.hot.story}), <b>B was ${ST.hot2.real}</b> (${ST.hot2.story}), and <b>C was ${ST.hot3.real}</b> (${ST.hot3.story}). Returns are stylised, not exact prices.</p>` +
      `<ul>${G.sched.filter(s => s.event || s.y === 2014).map(s => `<li><span>Year ${s.r + 1} = ${s.y}</span> ${esc(s.news[2])}</li>`).join('')}</ul>` +
      (G.choices.length ? `<b>Your family decisions</b><ul>${(() => { const w = G.history.find(h => h.log && h.log.lottery);
        const rows = G.choices.map(c => ({ r: c.r, html: `<li><span>Year ${c.r + 1}</span> ${esc(c.t)}: ${esc(c.label)} <b class="negc">${costTxt(c.cost)}</b></li>` }));
        if (w) rows.push({ r: w.r - 0.5, html: `<li><span>Year ${w.r + 1}</span> Won the Diwali bumper lottery <b class="pos">+${inr(w.log.lottery)}</b></li>` });
        return rows.sort((a, b) => a.r - b.r).map(x => x.html).join(''); })()}</ul>` : '');
    $('verdict').textContent = rank === 1 ? `Out spills ${inr(nw.me)} — more than FD Uncle and SIP Aunty. The family WhatsApp group is speechless.`
      : rank === 2 ? `Out spills ${inr(nw.me)}. One relative beaten, one to go — Diwali dinner will be lively.`
      : `Out spills ${inr(nw.me)}. Even FD Uncle did better… he will mention this at every family dinner.`;
    $('podium').innerHTML = res.map((x, i) => `<div class="pod ${x.me ? 'me' + (i === 0 ? ' win' : '') : ''}"><div class="rk">${['1st', '2nd', '3rd'][i]}</div><div class="who">${esc(x.n)}</div><b class="${x.v < 0 ? 'negc' : ''}">${inr(x.v)}</b></div>`).join('');
    $('podium').insertAdjacentHTML('beforeend', `<p class="podnote">Balances reflect luck, life expenses and investing choices. ${esc(NAME)}’s gullak also paid for a life: a smaller balance doesn’t mean a worse one.</p>`);
    $('takeaways').innerHTML = G.takeaways().map((t, i) => `<div class="tk" style="animation-delay:${1.8 + i * 0.2}s"><div class="em">${['i.', 'ii.', 'iii.'][i] || ''}</div><h4>${esc(t.title)}</h4><p>${esc(t.text)}</p></div>`).join('');
    const tot = KEYS.reduce((a, k) => a + G.me.h[k], 0) || 1;
    $('finalAlloc').innerHTML = ASSETS.filter(a => G.me.h[a.k] > 0.5).map(a => `<div class="line"><span>${a.n}</span><span><b>${inr(G.me.h[a.k])}</b> · ${(G.me.h[a.k] / tot * 100).toFixed(0)}%</span></div>`).join('') +
      (G.me.debt > 0.5 ? `<div class="line negc"><span>Credit-card debt</span><b>−${inr(G.me.debt)}</b></div>` : '') || '<p>Nothing — the gullak was empty.</p>';
    const link = location.origin + location.pathname + '?seed=' + SEED;
    $('seedNum').textContent = SEED; $('seedLink').href = link;
    drawChart();
  }
  function drawChart() {
    if (!window.Chart) return;
    try {
      if (chart) chart.destroy();
      const ds = (label, data, c, w) => ({ label, data: [0].concat(data), borderColor: c, backgroundColor: c, borderWidth: w, pointRadius: 0, pointHoverRadius: 5, tension: .25, fill: false });
      chart = new Chart($('chart'), {
        type: 'line',
        data: { labels: ['Start'].concat(G.sched.map(s => String(s.y))), datasets: [ds(NAME, G.me.nwHist, RIVAL_COLORS.me, 3.5), Object.assign(ds('FD Uncle', G.fd.nwHist, RIVAL_COLORS.fd, 1.5), { borderDash: [5, 4] }), ds('SIP Aunty', G.sip.nwHist, RIVAL_COLORS.sip, 2)] },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 1200 }, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#2B2A26', font: { family: 'Newsreader', size: 14 }, usePointStyle: true, pointStyle: 'line' } },
            tooltip: { backgroundColor: '#2B2A26', cornerRadius: 3, titleFont: { family: 'IBM Plex Mono' }, bodyFont: { family: 'IBM Plex Mono' }, callbacks: { label: c => ' ' + c.dataset.label + ': ' + inr(c.parsed.y) } } },
          scales: {
            x: { ticks: { color: '#787268', maxRotation: 0, autoSkipPadding: 12, font: { family: 'IBM Plex Mono', size: 11 } }, grid: { display: false } },
            y: { ticks: { color: '#787268', callback: v => inr(v), font: { family: 'IBM Plex Mono', size: 11 } }, grid: { color: '#E2D7BF' }, border: { display: false } },
          },
        },
      });
    } catch (e) { console.warn('chart failed', e); }
  }

  // ---------- Boot ----------
  mountPot($('heroPot'), 2.5e6);
  try { const saved = localStorage.getItem('gullak-name'); if (saved) $('nameIn').value = saved; } catch (e) { }
  const PROFILE = { city: 'bengaluru', job: 'it' };
  for (const g of document.querySelectorAll('.pick')) g.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    for (const x of g.children) x.classList.toggle('on', x === b);
    if (g.dataset.k === 'timer') TIMED = b.dataset.v === 'on'; else PROFILE[g.dataset.k] = b.dataset.v;
  };
  $('nameForm').onsubmit = e => { e.preventDefault(); startGame($('nameIn').value); };
  $('again').onclick = () => { location.href = location.pathname + '?seed=' + Math.floor(Math.random() * 1e9); };
  $('copySeed').onclick = () => {
    const link = location.origin + location.pathname + '?seed=' + SEED;
    try { navigator.clipboard.writeText(link).then(() => { $('copySeed').textContent = 'copied!'; }, () => { }); } catch (e) { }
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('modal').hidden && $('contBtn')) $('contBtn').click(); });

  window.__gullak = {
    get state() { return G; },
    get seed() { return SEED; },
    start: name => startGame(name),
    next: alloc => { if (!G) startGame(NAME); if (alloc) G.alloc = Object.assign({ sav: 0, fd: 0, ppf: 0, nifty: 0, gold: 0, hot: 0, hot2: 0, hot3: 0, crypto: 0 }, alloc); return invest(true); },
    ff: () => { if (!G) startGame(NAME); return fastForward(true); },
    netWorth: () => G && G.netWorth(),
  };
})();
