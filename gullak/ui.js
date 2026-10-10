// Gullak — DOM, rendering and animation. All game rules live in game.js.
(function () {
  'use strict';
  const { ASSETS, KEYS, inr, chapter, enabled, R, CRYPTO_R, PPF_R } = window.Gullak;
  const $ = id => document.getElementById(id);
  const A = k => ASSETS.find(a => a.k === k);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(Math.abs(x) < 0.1 && x !== 0 ? 1 : 0) + '%';
  const RIVAL_COLORS = { me: '#c4553a', fd: '#2f6b4f', sip: '#e8a33b' };

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
      coins += `<ellipse cx="${x}" cy="${y}" rx="10" ry="5.5" fill="${(row + c) % 3 ? '#f0b54a' : '#ffd77a'}" stroke="#b77a1e" stroke-width="1.2"/>`;
    }
    return `<svg viewBox="0 0 200 210" aria-hidden="true">
      <defs>
        <radialGradient id="${id}b" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#e98a5f"/><stop offset=".55" stop-color="#c4553a"/><stop offset="1" stop-color="#8e3522"/></radialGradient>
        <clipPath id="${id}c"><circle cx="100" cy="118" r="70"/></clipPath>
      </defs>
      <ellipse cx="100" cy="196" rx="62" ry="8" fill="rgba(90,50,20,.18)"/>
      <circle cx="100" cy="118" r="72" fill="url(#${id}b)"/>
      <g clip-path="url(#${id}c)" opacity=".92"><g class="coins" style="transform:translateY(${(1 - lv) * 150}px)">
        <rect x="20" y="40" width="160" height="160" fill="#e8a33b"/>${coins}
        <rect x="20" y="40" width="160" height="4" fill="#ffe7a8"/></g></g>
      <circle cx="100" cy="118" r="72" fill="none" stroke="#8e3522" stroke-width="3"/>
      <path d="M38 132 Q100 150 162 132" fill="none" stroke="#f6e3c2" stroke-width="4" stroke-dasharray="1 9" stroke-linecap="round" opacity=".9"/>
      <path d="M44 146 Q100 166 156 146" fill="none" stroke="#e8a33b" stroke-width="3" opacity=".75"/>
      <path d="M78 54 Q80 34 100 32 Q120 34 122 54 Z" fill="#b5492f" stroke="#8e3522" stroke-width="3"/>
      <ellipse cx="100" cy="32" rx="16" ry="6" fill="#d06a4b" stroke="#8e3522" stroke-width="3"/>
      <rect x="80" y="66" width="40" height="8" rx="4" fill="#3a1f14"/>
      <ellipse class="slotcoin" cx="100" cy="62" rx="9" ry="3.5" fill="#f0b54a" stroke="#b77a1e" opacity="0"/>
      <ellipse cx="68" cy="86" rx="14" ry="8" fill="#fff" opacity=".22" transform="rotate(-30 68 86)"/>
      <path class="crackline" d="M104 76 L112 98 L94 118 L114 140 L96 162 L104 188" fill="none" stroke="#2a120a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }
  function mountPot(el, nw) { el.classList.add('pot'); el.innerHTML = potSVG(level(nw)); glow(el, nw); }
  function setPot(el, nw, drop) {
    if (!el.querySelector('svg')) return mountPot(el, nw);
    el.querySelector('.coins').style.transform = `translateY(${(1 - level(nw)) * 150}px)`;
    glow(el, nw);
    if (drop) { el.classList.remove('drop', 'wobble'); void el.offsetWidth; el.classList.add(nw < 0 ? 'wobble' : 'drop'); }
  }
  function glow(el, nw) { const lv = level(nw); el.style.filter = lv > 0.05 ? `drop-shadow(0 0 ${4 + lv * 18}px rgba(232,163,59,${0.25 + lv * 0.5}))` : 'none'; }

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
    G = window.Gullak.createGame(SEED, { name: NAME });
    shownNW = 0;
    show('play');
    mountPot($('miniPot'), 0);
    render();
  }

  // ---------- Play render ----------
  function render() { renderTop(); renderPage(); renderJars(); }

  function renderTop() {
    const nw = G.netWorth();
    $('beads').innerHTML = G.sched.map((s, i) => `<i class="${i < G.round ? 'done' : i === G.round ? 'cur' : ''} ${s.event ? 'ev' : ''}" title="Year ${i + 1}"></i>`).join('');
    const el = $('nw');
    if (shownNW !== nw.me) { countUp(el, shownNW, nw.me, 700); shownNW = nw.me; } else { el.textContent = inr(nw.me); el.classList.toggle('neg', nw.me < 0); }
    $('rivals').innerHTML = `<span>👴 FD Uncle <b>${inr(nw.fd)}</b></span><span>👩 SIP Aunty <b>${inr(nw.sip)}</b></span>`;
    setPot($('miniPot'), nw.me);
    renderGauge();
    const p = G.me, tot = KEYS.reduce((a, k) => a + p.h[k], 0) + p.debt;
    let bars = ASSETS.filter(a => p.h[a.k] > 0.5).map(a => `<div style="flex-grow:${p.h[a.k] / tot};background:${a.c}" title="${a.n}: ${inr(p.h[a.k])}"></div>`).join('');
    if (p.debt > 0.5) bars += `<div style="flex-grow:${p.debt / tot};background:repeating-linear-gradient(45deg,#b13b2c 0 6px,#d9604f 6px 12px)" title="Credit-card debt: ${inr(p.debt)}"></div>`;
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
    const m = mood(), ang = m * 80, word = m < -0.5 ? 'Panic' : m < -0.15 ? 'Fear' : m > 0.5 ? 'Mania' : m > 0.15 ? 'Greed' : 'Calm';
    $('gauge').innerHTML = `<svg viewBox="0 0 120 70" aria-hidden="true">
      <defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#b13b2c"/><stop offset=".5" stop-color="#ecd9b0"/><stop offset="1" stop-color="#2f6b4f"/></linearGradient></defs>
      <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round"/>
      <g class="needle" style="transform:rotate(${ang}deg)"><line x1="60" y1="62" x2="60" y2="22" stroke="#3a281d" stroke-width="4" stroke-linecap="round"/></g>
      <circle cx="60" cy="62" r="6" fill="#3a281d"/></svg><div class="gw"><small>Fear</small><b>${word}</b><small>Greed</small></div>`;
    $('gauge').title = 'The family mood after last year — fear or greed. Just for fun.';
  }

  // ---------- The cast: dramatic voices, sometimes right, often wrong ----------
  const CAST = {
    sharma: { e: '🧔', n: 'Sharma-ji', c: 'senior colleague, 15 years in the market' },
    arvind: { e: '📺', n: 'Arvind', c: 'TV market expert, loud tie' },
    kavya: { e: '💼', n: 'Kavya', c: 'batchmate, quit her job to “trade full-time”' },
    uncle: { e: '📱', n: 'WhatsApp uncle', c: 'family group admin' },
    sip: { e: '👩', n: 'SIP Aunty', c: 'at the family dinner' },
    fd: { e: '👴', n: 'FD Uncle', c: 'at the family dinner' },
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
    if (falling) { const q = FEAR[spin % FEAR.length]; out.push(Object.assign(quote(q[0], q[1], q[2], { asset: A(falling.k).n, pct: Math.round(-last.ret[falling.k] * 100) + '%' }), { mood: 'fear' })); }
    const hot = ASSETS.filter(a => enabled(a.k, r) && last.ret[a.k] >= 0.4 && G.me.h[a.k] / tot < 0.1).sort((a, b) => last.ret[b.k] - last.ret[a.k])[0];
    if (hot) { const q = GREED[spin % GREED.length]; out.push(Object.assign(quote(q[0], q[1], q[2], { asset: A(hot.k).n, pct: Math.round(last.ret[hot.k] * 100) + '%' }), { mood: 'greed' })); }
    const nw = G.netWorth(), gap = nw.sip - nw.me, fgap = nw.fd - nw.me;
    if (gap > Math.max(20000, nw.me * 0.08)) out.push(Object.assign(quote('sip', `Beta, I’m ${inr(gap)} ahead. I didn’t even look at my portfolio this year. Pass the raita.`), { mood: 'taunt' }));
    else if (fgap > 20000) out.push(Object.assign(quote('fd', `Seven percent, guaranteed. I’m ${inr(fgap)} ahead of you and I sleep like a baby. Sleep is also a return, beta.`), { mood: 'taunt' }));
    else if (nw.me > nw.sip && nw.me > nw.fd && G.round > 2) out.push(Object.assign(quote('fd', 'So… very casually… what exactly have you been investing in?', 'suddenly very interested'), { mood: 'taunt' }));
    return out.slice(0, 2);
  }
  function quoteCards() {
    return voices().map((q, i) => `<figure class="quote ${q.mood}" style="animation-delay:${0.15 + i * 0.25}s"><div class="qav">${q.e}</div><div><figcaption><b>${esc(q.n)}</b>, <span>${esc(q.c)}</span></figcaption><blockquote>“${esc(q.t)}”</blockquote></div></figure>`).join('');
  }

  function renderPage() {
    const s = G.current(), ch = chapter(s, NAME), l = G.me.log;
    let h = `<div class="kicker">${ch.title}</div><h2>${esc(ch.sub)}</h2><p class="story">${esc(ch.text)}</p><div class="notes">`;
    h += `<div class="note"><span class="em">📰</span><div><span class="tag news">In the news</span>${s.event ? '<span class="tag big">Big market year</span>' : ''}<b>${esc(s.news[0])}</b></div></div>`;
    if (s.life) {
      h += `<div class="note"><span class="em">${s.life.e}</span><div><span class="tag life">Life happens</span><b>${esc(s.life.t)}</b></div>` +
        (l.life ? `<span class="amt ${l.life < 0 ? 'negc' : 'pos'}">${l.life < 0 ? '−' : '+'}${inr(Math.abs(l.life))}</span>` : '') + `</div>`;
    }
    h += `</div><div class="ledger">`;
    h += `<div class="line"><span>Salary savings this year</span><b>${l.income ? inr(l.income) : '₹0 <small>(no job)</small>'}</b></div>`;
    if (l.life) h += `<div class="line"><span>${esc(s.life.t)}</span><b class="${l.life < 0 ? 'negc' : 'pos'}">${l.life < 0 ? '−' : '+'}${inr(Math.abs(l.life))}</b></div>`;
    if (l.debtPaid) h += `<div class="line"><span>Paid off credit-card debt first</span><b class="negc">−${inr(l.debtPaid)}</b></div>`;
    if (l.sales.length || l.newDebt) {
      h += `<div class="forced"><b>${safeHead(l)}</b>`;
      for (const x of l.sales) h += `<div class="line"><span>Sold ${A(x.k).i} ${A(x.k).n}</span><span>${inr(x.amt)}${x.pen ? ` <small>(−${inr(x.pen)} penalty)</small>` : ''}</span></div>`;
      if (l.newDebt) h += `<div class="line negc"><span>💳 Put on the credit card (18%/yr)</span><b>${inr(l.newDebt)}</b></div>`;
      const safeOnly = !l.newDebt && l.sales.every(x => x.k === 'sav' || x.k === 'fd');
      h += safeOnly ? `<p>Good thing there was a cushion — Savings and FD took the hit, so ${esc(NAME)} didn’t have to sell investments in a hurry.</p></div>`
        : `<p>Without enough cushion in Savings or FD, ${esc(NAME)} had to sell investments — whatever the market was doing.</p></div>`;
    }
    for (const x of l.sells) h += `<div class="line"><span>You sold ${A(x.k).i} ${A(x.k).n}</span><b class="pos">+${inr(x.proceeds)}${x.pen ? ` <small>(−${inr(x.pen)} penalty)</small>` : ''}</b></div>`;
    h += `<div class="line total"><span>Ready for the gullak</span><span>${inr(G.me.cash)}</span></div></div>`;
    const last = G.history[G.history.length - 1];
    if (last) h += `<div class="lastyr">Last year: ` + ASSETS.filter(a => enabled(a.k, last.r)).map(a => retChip(a.k, last.ret[a.k])).join('') + `</div>`;
    const rec = records();
    if (rec.best && G.history.length > 1) h += `<div class="records"><span>🏆 Best year <b class="pos">${signed(rec.best.g)}</b> <small>(Year ${rec.best.h.r + 1})</small></span><span>🌧️ Worst year <b class="${rec.worst.g < 0 ? 'negc' : 'pos'}">${signed(rec.worst.g)}</b> <small>(Year ${rec.worst.h.r + 1})</small></span></div>`;
    const nwm = G.netWorth().me;
    h += `<div class="shelf"><div id="shelfPot"></div><p>${esc(NAME)}’s gullak holds <b>${inr(nwm)}</b>${G.me.debt > 0.5 ? ` — and a credit-card bill of <b class="negc">${inr(G.me.debt)}</b>` : ''}. ${G.round === 0 ? 'Empty for now. Let’s fill it.' : nwm > G.netWorth().sip ? 'Heavier than SIP Aunty’s!' : 'It grows a little every year.'}</p></div>`;
    $('page').innerHTML = h;
    mountPot($('shelfPot'), nwm);
    $('page').style.animation = 'none'; void $('page').offsetWidth; $('page').style.animation = '';
  }
  function safeHead(l) { return !l.newDebt && l.sales.every(x => x.k === 'sav' || x.k === 'fd') ? '🧯 Dipped into the emergency cushion' : '🚨 Forced sale — the money had to come from somewhere'; }
  function retChip(k, r) { return `<span class="chip ${r > 0.001 ? 'up' : r < -0.001 ? 'dn' : 'flat'}">${A(k).i} ${pct(r)}</span>`; }

  function renderJars() {
    const s = G.current(), r = G.round, cash = G.me.cash, ffN = G.ffYears();
    const ffBtn = `<button class="btn ghost" id="ffBtn" ${ffN ? '' : 'disabled'}>${ffN ? `⏩ ${ffN} year${ffN > 1 ? 's' : ''}` : '⏩ Last page'}</button>`;
    const ffNote = ffN ? `Fast-forward keeps this mix and never sells${ffN < 5 && r + ffN < R - 1 ? ` · stops before Year ${r + ffN + 1}` : ''}.` : 'No skipping the final year.';
    if (cash < 1) {
      $('jars').className = 'jars';
      $('jars').innerHTML = quoteCards() + `<div class="waits"><div id="waitPot"></div><h3>${G.me.log.income ? 'Nothing left to save this year' : 'No salary this year — the gullak waits.'}</h3>
        <p>${G.me.log.income ? 'Life took it all. The gullak sits quietly on the shelf.' : `${esc(NAME)} keeps the lights on and the pot keeps its coins. Better years are coming.`}</p></div>
        <div class="actions"><button class="btn primary" id="goBtn">Turn the page →</button>${ffBtn}</div><div class="ffnote">${ffNote}</div>`;
      mountPot($('waitPot'), G.netWorth().me);
    } else {
      const first = r === 0;
      $('jars').className = 'jars' + (first ? ' coach' : '');
      $('jars').innerHTML = quoteCards() + (first ? `<div class="coachtip">👉 Slide to split this year’s ${inr(cash)} between the jars. Then drop it in the gullak!</div>` : '') +
        `<h3>Where does ${inr(cash)} go?</h3><p class="sub">This year’s savings${G.me.log.sells.length ? ' plus what you sold' : ''}. Nervous — or greedy? You can sell from a jar to move money around.</p>` +
        `<div class="mixbar" id="mixbar"></div><div class="sumhint" id="sumhint"></div>` +
        ASSETS.map(a => {
          const on = enabled(a.k, r), hold = G.me.h[a.k], last = G.history[G.history.length - 1];
          const lock = !on ? `<span class="lock">unlocks Year 10</span>` : a.k === 'ppf' ? `<span class="lock">${r >= PPF_R ? '🔓 unlocked' : '🔒 locked till Year 16'}</span>` : '';
          const overall = hold - G.me.contrib[a.k];
          const perf = hold > 0.5 && last && enabled(a.k, last.r) ? `<div class="perf">${retChip(a.k, last.ret[a.k])} <b class="${last.pnl[a.k] < 0 ? 'negc' : 'pos'}">${signed(last.pnl[a.k])}</b> last year · <b class="${overall < 0 ? 'negc' : 'pos'}">${signed(overall)}</b> overall</div>` : '';
          const sell = hold > 0.5 ? (G.canSell(a.k) ? `<div class="sells"><button class="sellbtn" data-sell="${a.k}" data-f="0.5">Sell half</button><button class="sellbtn" data-sell="${a.k}" data-f="1">Sell all</button>${a.k === 'fd' ? '<small>1% penalty</small>' : ''}</div>` : `<div class="sells"><small>🔒 can’t sell yet</small></div>`) : '';
          return `<div class="asset ${on ? '' : 'off'}" style="--c:${a.c}"><div class="ico">${a.i}</div>
            <div><div class="nm" title="${esc(a.f)}">${a.n} ${lock}</div><div class="why">${esc(a.f)}</div></div>
            <div><div class="amt" id="amt-${a.k}">—</div><div class="hold">has ${inr(hold)}</div></div>
            ${perf}${sell}
            <input type="range" min="0" max="100" step="5" value="${on ? G.alloc[a.k] || 0 : 0}" style="--p:${on ? G.alloc[a.k] || 0 : 0}%" data-k="${a.k}" ${on ? '' : 'disabled'} aria-label="${a.n} share"></div>`;
        }).join('') +
        `<div class="actions"><button class="btn primary" id="goBtn">Drop it in the gullak 🪙</button>${ffBtn}</div><div class="ffnote">${ffNote}</div>`;
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
  }
  function updateAmts() {
    const r = G.round, sh = window.Gullak.normAlloc(G.alloc, r);
    let tot = 0; for (const k of KEYS) if (enabled(k, r)) tot += +G.alloc[k] || 0;
    for (const k of KEYS) { const el = $('amt-' + k); if (el) el.textContent = enabled(k, r) ? `${Math.round(sh[k] * 100)}% · ${inr(G.me.cash * sh[k])}` : '—'; }
    $('mixbar').innerHTML = ASSETS.filter(a => sh[a.k] > 0).map(a => `<div style="flex-grow:${sh[a.k]};background:${a.c}"></div>`).join('');
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
      return `<div class="rrow" style="animation-delay:${0.45 + i * 0.12}s"><span>${a.i} ${a.n}</span>${retChip(a.k, rec.ret[a.k])}<b class="${rec.pnl[a.k] < 0 ? 'negc' : 'pos'}">${signed(rec.pnl[a.k])}</b><small>${signed(overall)} overall</small></div>`;
    }).join('');
    $('sheet').className = 'sheet ' + (gain < 0 ? 'loss' : 'win');
    $('sheet').innerHTML = `<div class="kicker">The end of Year ${rec.r + 1}</div>
      <div class="headline ${gain < 0 ? 'negc' : 'pos'}">${signed(gain)} this year ${gain < 0 ? '😱' : '🎉'}</div>
      <div class="subhead">${gain < 0 ? 'The markets took a bite out of the gullak.' : 'The markets were kind to the gullak.'}${isBest ? ' <span class="tag big" style="background:#dcebd9;color:#2f6b4f">New best year!</span>' : ''}${isWorst ? ' <span class="tag big">New worst year</span>' : ''}</div>
      <div class="reveal-top"><div id="revPot"></div><div><small>In the gullak now</small><div class="bignum" id="revNum">${inr(rec.nwBefore)}</div>
      <div class="delta">${signed(up)} since last year, after adding ${inr(rec.invested)}</div></div></div>
      <div class="rtable">${rows || '<p class="sub">Nothing invested yet.</p>'}</div>
      ${rec.interest > 1 ? `<div class="forced" style="margin-top:0"><b>💳 Credit-card interest: −${inr(rec.interest)}</b></div>` : ''}
      <div class="rivalline">👴 FD Uncle ${inr(rec.fdAfter)} · 👩 SIP Aunty ${inr(rec.sipAfter)}</div>
      <button class="btn primary" id="contBtn">${G.done ? 'Break the gullak 🔨' : `Turn to chapter ${rec.r + 2} →`}</button>`;
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
      ${nxt.event ? `<div class="stopnote">⏸️ Stopping here — something big is about to happen. Better be at the wheel for this one.</div>` : ''}
      <ul class="recap">${recs.map(r => {
        const d = marketGain(r), f = r.log.sales.length || r.log.newDebt;
        return `<li><span class="yr">Y${r.r + 1}</span><span>${esc(r.news[0])}</span><span class="d ${d < 0 ? 'negc' : 'pos'}">${d < 0 ? '−' : '+'}${inr(Math.abs(d))}</span>
          <span class="ev">${r.life ? `${r.life.e} ${esc(r.life.t)}` : 'A quiet year at home.'}${f ? ' · <b class="negc">🚨 forced sale</b>' : ''}</span></li>`;
      }).join('')}</ul>
      <div class="reveal-top"><div id="revPot"></div><div><small>In the gullak</small><div class="bignum" id="revNum">${inr(a.nwBefore)}</div>
      <div class="delta ${up < 0 ? 'negc' : 'pos'}">${signed(up)} over ${recs.length} year${recs.length > 1 ? 's' : ''} (with savings)</div></div></div>
      <div class="rivalline">👴 FD Uncle ${inr(b.fdAfter)} · 👩 SIP Aunty ${inr(b.sipAfter)}</div>
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

    const res = [{ n: NAME, e: '😊', v: nw.me, me: 1 }, { n: 'FD Uncle', e: '👴', v: nw.fd }, { n: 'SIP Aunty', e: '👩', v: nw.sip }].sort((a, b) => b.v - a.v);
    const rank = res.findIndex(x => x.me) + 1;
    $('endTitle').textContent = `${NAME} is 45. Time to break the gullak.`;
    $('yearsReveal').innerHTML = `<b>Surprise: you just lived through 2005–2024 🇮🇳</b> — real Indian market history. The Rollercoaster was <b>Bitcoin</b>.` +
      `<ul>${G.sched.filter(s => s.event || s.y === 2014).map(s => `<li><span>Year ${s.r + 1} = ${s.y}</span> ${esc(s.news[2])}</li>`).join('')}</ul>`;
    $('verdict').textContent = rank === 1 ? `Out spills ${inr(nw.me)} — more than FD Uncle and SIP Aunty. The family WhatsApp group is speechless.`
      : rank === 2 ? `Out spills ${inr(nw.me)}. One relative beaten, one to go — Diwali dinner will be lively.`
      : `Out spills ${inr(nw.me)}. Even FD Uncle did better… he will mention this at every family dinner.`;
    $('podium').innerHTML = res.map((x, i) => `<div class="pod ${x.me ? 'me' : ''}"><div class="rk">${['1st', '2nd', '3rd'][i]}</div><div class="who">${x.e} ${esc(x.n)}</div><b class="${x.v < 0 ? 'negc' : ''}">${inr(x.v)}</b></div>`).join('');
    $('takeaways').innerHTML = G.takeaways().map((t, i) => `<div class="tk" style="animation-delay:${1.8 + i * 0.2}s"><div class="em">${t.icon}</div><h4>${esc(t.title)}</h4><p>${esc(t.text)}</p></div>`).join('');
    const tot = KEYS.reduce((a, k) => a + G.me.h[k], 0) || 1;
    $('finalAlloc').innerHTML = ASSETS.filter(a => G.me.h[a.k] > 0.5).map(a => `<div class="line"><span>${a.i} ${a.n}</span><span><b>${inr(G.me.h[a.k])}</b> · ${(G.me.h[a.k] / tot * 100).toFixed(0)}%</span></div>`).join('') +
      (G.me.debt > 0.5 ? `<div class="line negc"><span>💳 Credit-card debt</span><b>−${inr(G.me.debt)}</b></div>` : '') || '<p>Nothing — the gullak was empty.</p>';
    const link = location.origin + location.pathname + '?seed=' + SEED;
    $('seedNum').textContent = SEED; $('seedLink').href = link;
    drawChart();
  }
  function drawChart() {
    if (!window.Chart) return;
    try {
      if (chart) chart.destroy();
      const ds = (label, data, c, w) => ({ label, data: [0].concat(data), borderColor: c, backgroundColor: c, borderWidth: w, pointRadius: 0, pointHoverRadius: 5, tension: .3 });
      chart = new Chart($('chart'), {
        type: 'line',
        data: { labels: ['Start'].concat(G.sched.map(s => String(s.y))), datasets: [ds(NAME, G.me.nwHist, RIVAL_COLORS.me, 4), ds('FD Uncle', G.fd.nwHist, RIVAL_COLORS.fd, 2.5), ds('SIP Aunty', G.sip.nwHist, RIVAL_COLORS.sip, 2.5)] },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 1200 }, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: '#3a281d', font: { family: 'Nunito', weight: '700' }, usePointStyle: true, pointStyle: 'circle' } },
            tooltip: { backgroundColor: '#3a281d', titleFont: { family: 'Fraunces' }, bodyFont: { family: 'Nunito' }, callbacks: { label: c => ' ' + c.dataset.label + ': ' + inr(c.parsed.y) } } },
          scales: {
            x: { ticks: { color: '#8a705b', maxRotation: 0, autoSkipPadding: 12, font: { family: 'Nunito' } }, grid: { display: false } },
            y: { ticks: { color: '#8a705b', callback: v => inr(v), font: { family: 'Nunito' } }, grid: { color: '#eadcc4' }, border: { display: false } },
          },
        },
      });
    } catch (e) { console.warn('chart failed', e); }
  }

  // ---------- Boot ----------
  mountPot($('heroPot'), 2.5e6);
  try { const saved = localStorage.getItem('gullak-name'); if (saved) $('nameIn').value = saved; } catch (e) { }
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
    next: alloc => { if (!G) startGame(NAME); if (alloc) G.alloc = Object.assign({ sav: 0, fd: 0, ppf: 0, nifty: 0, gold: 0, hot: 0, crypto: 0 }, alloc); return invest(true); },
    ff: () => { if (!G) startGame(NAME); return fastForward(true); },
    netWorth: () => G && G.netWorth(),
  };
})();
