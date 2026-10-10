# Gullak: Indian "Build Your Stax" storybook investing game, built at a 2-hour Claude hackathon

**Date:** 2026-10-10
**Status:** IN PROGRESS (hackathon demo is playable and pushed; repo still private; next work is "make it more relatable and better")
**Bead(s):** none (no `bd` installed on this machine)
**Epic:** Gullak hackathon game (GitHub map issue: https://github.com/RajdevShivam/gullak/issues/7)
**Chain:** `standalone-4d377cee` seq `1`
**Parent:** `none — first in chain`
**Prior chain:** none — first in chain

---

## Reference Documents

- `README.md` — what the game is, how it plays, run/test commands, data note.
- `docs/demo-script.md` — 3-minute judge demo walkthrough on `?seed=42`.
- `docs/stax-vs-gullak.md` — research comparison with NGPF's Build Your Stax (STAX), ranked gaps with exact function pointers. MOST useful doc for "make it better".
- `docs/ui-ux-plan.md` — UI/UX research written for the DROPPED physics game; only its generic juice/onboarding points apply.
- `themes/README.md` — three theme directions (editorial, swiss, bahi-khata ledger), taste audit of the pre-ledger build, change list. Ledger was chosen and applied.
- GitHub map issue #7 (wayfinder map) + closed tickets #1–#5 + open ticket #6 "Make the repo public".
- `C:\Users\shiva\.claude\CLAUDE.md` (user global): tests go in `tests/`; for creative work ask ONE feeling/outcome question before options; no rationale appended after creative writing.
- `C:\Users\shiva\Desktop\projects\CLAUDE.md` → `@AGENTS.md` (AWS guidance; irrelevant to this game).

## The Goal

The user (Shivam, quant-finance background) entered a ~2-hour Claude hackathon (deadline **17:45 on 2026-10-10**, local time) on the "just fun" track, with the explicit aim of **having a good time**. After a dropped physics-puzzle idea, they chose to build an **Indian take on NGPF's "Build Your Stax"**: a no-AI-at-runtime static web game where you live 20 years of real Indian market history (2005–2024, hidden as Year 1–20), make money decisions under family pressure, feel fear/greed, and at 45 your clay piggy bank (gullak) cracks open and you are ranked against FD Uncle and SIP Aunty. Audience: hackathon judges/friends **and** students. The game is now playable, tested (26 tests), themed (bahi-khata ledger), and pushed to a private GitHub repo. The user's stated next direction (handoffplan argument): **"How to make this relatable and better from here."**

## Where We Are

- **Game lives in `gullak/`**: `index.html` (92 lines), `style.css` (382), `game.js` (494, pure rules, no DOM, loads in Node via `module.exports`), `ui.js` (622, all rendering). Served locally with `python -m http.server 5175` from `gullak/` (background process still running at http://localhost:5175).
- **Tests**: `tests/gullak.test.js` (319 lines) + `tests/index.js` (2-line shim so `node --test tests/` works on Node 24). Current result: **26 pass, 0 fail** (`node --test tests/`).
- **Repo**: https://github.com/RajdevShivam/gullak — **PRIVATE**. Branch `main`, clean working tree, last commit `c1e61ca`. Was created as `claude-hackathon`, then renamed to `gullak` at user request; local remote updated to `https://github.com/RajdevShivam/gullak.git`.
- **20 yearly rounds** (`R = 20`, `START_YEAR = 2005`, `START_AGE = 25`). Years never shown during play (Year 1…20); real years revealed only on the end screen ("Surprise: you just lived through 2005–2024").
- **Investments (8 rows in `ASSETS`)**: Savings (3%/yr), Fixed Deposit (7%/yr, **10% break penalty**), PPF (7.5%, locked until round 15 = Year 16), Nifty 50 index fund (real-ish yearly returns), Gold (real-ish INR yearly returns), **Stock tip A / B / C** (hidden names; stylised return tables shaped on Yes Bank / Suzlon Energy / Bajaj Finance; revealed at end). Crypto ("Rollercoaster") **removed** — key `crypto` survives only as a zero placeholder in `emptyH()` and `ret.crypto = 0`.
- **Income**: `START_INCOME = 120000` (₹1.2 L savings/yr), `RAISE = 0.08`, promotion life event `PROMO = 0.2` permanent.
- **Random life events (`LIFE`)**: ~35%/yr seeded; wedding (cousin) −0.8×, medical −1.4×, Diwali bonus +0.25×, phone −0.15×, laid off (no income, −0.25× rent), promotion, scooter −0.15×, Goa −0.35× (multiples of that year's savings). Harsher than first briefed so forced sales actually happen (user: "Keep harsher").
- **Forced family decisions (`DILEMMAS`)**, 4 per game at seeded rounds: wedding (rounds 3–5; big fat −3.0×, respectable −1.5×, court −0.3×), car (6–7; SUV −1.6×, hatchback −0.6×, scooter 0), sister's wedding (9–11; half −2.0×, gold set −0.8×, envelope −0.2×), Papa's surgery (13–14; private −1.5×, government waitlist −0.3×). Rivals take `def` option. Block the year until chosen; fast-forward stops before them.
- **Lottery (`LOTTERY`, `LOTTO_ASKS`)**: player only (rivals never), one year in rounds 7–10 (not a decision year); gross 10× that year's savings, 31.2% tax; followed by 3 own-only asks in the next free rounds: lifestyle (villa −0.5×prize + **creep 30%** permanent savings cut; bigger flat −0.25× + creep 10%; change nothing), Mama-ji's business (−0.35×, −0.1×, no), forty cousins (−0.3×, −0.08×, none).
- **Bills popup ("payup")**: in UI ("manual") mode, any shortfall from a life event or decision freezes the year; modal "₹X is due. Now." lists every holding with worth/put-in, "Locks in a ₹Y loss" / "Cashes ₹Z of profit …and pays ₹T tax" / "Locked until Year 16" / "10% penalty for breaking it early", Sell buttons, character heckle, and "Swipe the credit card: ₹X at 36% a year". **15-second countdown**; on expiry the bill goes on the card.
- **Credit card**: `DEBT_RATE = 0.36`; income repays debt first each year; **selling repays card before reinvesting** (`G.sell`). Red "Credit card −₹X at 36%" row in header while in debt.
- **Tax**: `GAINS_TAX = 0.10` on the profit part of a sale of `TAXED = ['nifty','gold','hot','hot2','hot3']`; savings/FD/PPF/losses untaxed.
- **Fear & greed**: big ₹ gain/loss reveal per year (64px serif figure, red flash/shake/crack for loss, coin shower for gain); per-asset "last yr" and "overall" P&L on each ledger row; fear↔greed tick gauge in header; recurring cast (Sharma-ji 15 yrs in market, Arvind TV expert, Kavya full-time trader, WhatsApp uncle, SIP Aunty, FD Uncle) with quotes placed **inside the row of the asset they're about**; timed against real history (fear before rebounds, greed near peaks).
- **Hot-tip WhatsApp forwards**: one per year on one of the three stock-tip rows (`tipKey(r) = TIP_KEYS[(seed + r) % 3]`), text pool per stock (`TIPS_BY` in ui.js, 4 each), outcome line next year matched to sign of that stock's return (`TIP_UP`/`TIP_DOWN` pools).
- **Fast-forward ("Skip N years")**: up to 5 years, keeps allocation, never sells, stops before big market years (`EVENT_YEARS = [2008, 2009, 2013, 2016, 2017, 2020, 2022]`), decision years and the lottery year; one-page recap.
- **End screen**: gullak cracks (SVG), years reveal + real event per year, family decisions timeline incl. lottery win, stock reveal ("A was Yes Bank …"), podium vs FD Uncle & SIP Aunty, **3 takeaways** chosen by ₹ impact, Chart.js line chart (Riya red, SIP Aunty grey, FD Uncle dashed), "What spilled out" allocation table incl. credit-card debt, play again, seed link.
- **Theme**: bahi-khata ledger (cream ruled paper, double red margin line, red cloth header strip, "॥ शुभ लाभ ॥" title page, Kalam/Newsreader/IBM Plex Mono, single accent `#9E2B25`, gains `#346538`/losses `#9F2F2D`, no emoji in chrome, monogram squircle avatars, mono asset codes SB/FD/PF/N50/AU/TA/TB/TC).
- **Verified end-to-end in Playwright** multiple times (seeds 42, 777): full 20-year runs reach end screen, chart renders, 0 console errors/warnings. Worst-case run (always most expensive option, alternating card/sell) ended at **−₹26.7 L** with ₹97.5 L card debt, 3rd place (SIP Aunty ₹1.48 Cr, FD Uncle ₹88.7 L).
- **Docs**: README (with screenshot `gullak/shot-chapter.png`), demo script, Stax comparison, themes README — all committed.
- **NOT done**: repo not public (needs explicit user yes, ticket #6); no rehearsal run by user yet; rank-drop sting, projection-at-65, ramping life events, idle-cash nag (Stax gaps 3–6) not implemented; dead code `renderFunding()`/`salePlan()` left in ui.js.

## What We Tried (Chronological)

### Early chunk (15:07–15:45): setup and the dropped physics game
1. **System check / cleanup** — RAM was 2.8/14.8 GB free. Killed (with user approval via AskUserQuestion) old dev servers (newsAggregator `wrangler dev` pids 38300/19580, stray `serve-dist.cjs` pid 35576), PhoneExperienceHost, CrossDeviceService, AdobeCollabSync, Antigravity + language_server, msedge → RAM free 4.6 GB. Kept Docker/WSL and Chrome.
2. **Broken `node` in Git Bash** — a bogus global npm package named `node` shadowed real Node; `npm uninstall -g node` fixed it → `node --version` = v24.19.0.
3. **Playwright MCP** — not configured; added `claude mcp add playwright -s user -- npx @playwright/mcp@latest` (user chose this over built-in-browser-only). Worked after new session; it writes snapshots to `.playwright-mcp/` (gitignored). `aws-mcp` failed to connect (timeout, later -32602) — irrelevant.
4. **Track choice** — I recommended "couldn't be done before"; user picked "good time" → fun track. Then "between playing and making". User rejected AI-at-runtime ideas ("something which doesn't use ai in background would be better").
5. **Contraption Builder physics prototype** (`prototype/index.html`, Matter.js 0.19, one level, ramp/bouncer/fan/crate, win detection). Verified solvable via Playwright (two ramps → ★★★ in 4.9 s). A background research agent wrote `docs/ui-ux-plan.md` (ghost trail, instant retry, star goals, 5 teaching levels). **User verdict: "ah this game doesnt seem good."** → dropped. Kept in repo as process history.

### Mid chunk (15:45–16:25): pivot to Build Your Stax for India, wayfinder, build
6. **Researched Build Your Stax** (buildyourstax.com canvas UI hard to drive; used web search): 20 years in ~20 min, cash every 6 months, stocks/bonds/index funds, emergency fund lesson, biggest "stax" wins.
7. **"Paisa Stax" prototype** (`prototype-stax/index.html`, single file, built by background agent): 40 half-year rounds, 7 assets incl. crypto, seeded RNG (mulberry32, `?seed=`), real-ish Nifty/gold, scripted news, life events, forced-sale order Savings→FD→Gold→Nifty→Hot→Crypto, PPF lock, 18% card, FD Uncle/SIP Aunty, Chart.js end screen. Playtest finding: **crypto dominated** (10–20% crypto slice won most seeds); hot-tip noise could flip sign vs crash years.
8. **/wayfinder** invoked by user — charted map. First as local `.scratch/gullak/` markdown (now gitignored, stale), then user asked for a **private GitHub repo with wayfinder tickets** → issues #1–#6 + map #7 with native sub-issues. Decisions recorded as comments on #7.
9. **Grilling rounds via compass grill tab** (user said later "I dont see anything in grill ask me here" — one question had to be re-asked via AskUserQuestion). Answers: destination = playable demo by deadline; audience = judges/friends + students; real history; solo first (seed link later); keep all four Stax mechanics; 20 years + fast-forward; keep all assets (later reversed for crypto); end takeaways; vibe = **warm storybook**; name = **Gullak**; player's own name; FF = keep allocation + recap AND stop at big events; crypto = real BTC history (later removed entirely); keep harsher event costs; FF keeps stopping; commit WIP; lottery player-only; keep all files when public.
10. **Main build agent ("gullak-builder")** evolved the prototype into `gullak/` (split files, storybook theme Fraunces+Nunito, gullak SVG fills/glows, name entry, 20 yearly rounds, FF, takeaways, tests). Mid-flight messages relayed: real BTC returns + FF stops; **hidden years / no "crypto" word** (user: "Dont add year. People remember what happened when… dont say crypto describe it as something volatile"); **fear & greed + selling** (user: "Show losses and gains. Make people fearful and greedy"); **dramatic credible cast** (user: "dont say neighbour… a smart colleague doing this for 15 years… make it dramatic").
11. **WIP checkpoint** at 16:18 (15 tests passing) pushed before features landed.

### Late chunk (16:20–17:00): theme, decisions, debt, lottery, pain loop, Stax gaps
12. **Theme exploration agent ("theme-explorer")** — user: "The ui looks bit weird… minimalistic and looks less AI". User pointed to `npx skills add Leonxlnx/taste-skill`; I **read** the repo's `minimalist-skill` and `redesign-skill` SKILL.md via `gh api` (did NOT run npx install) and relayed the rules. User picked **bahi-khata ledger** before mockups were done → agent applied it directly to `gullak/`, plus "one place to look" (returns + character tips inline on each asset row) and dramatic WhatsApp-forward hot tips.
13. **Forced life decisions** (user: "Life events dont seem dramatic enough. We arent forced to do anything. Add marriage expanse since its India") — I implemented `DILEMMAS`, `G.pending`, `G.previewChoice`, `G.choose` in game.js; theme agent built decision cards.
14. **Credit card made real** (user: "yes add CC debt and other things if needed") — 18%→36%, `fund='card'` option, debt takeaway; "How will you pay?" screen (later superseded by payup popup).
15. **Lottery** (user: "make someone win lottery too! … people ask more money … most lottery people end up poor") — first patch attempt via bash heredoc **failed** with `unexpected EOF while looking for matching '` (curly quotes/apostrophes inside heredoc in this Git Bash); fixed by writing Python patch scripts to the scratchpad and running `python -I script.py <root>`. Same script also **removed crypto** (user: "maybe remove crypto") and rewrote news 2014/2017/2018/2021/2022.
16. **Readiness check** (user: "Wait. Is everything ready?") — full playthrough found two bugs: (a) credit-card interest double-counted in two takeaways → emergency takeaway excludes interest when the debt takeaway fires; (b) selling didn't repay 36% debt (debt spiral while holding assets) → `G.sell` repays card first. Also added lottery to end-screen decisions list and README screenshot.
17. **Pain loop** (user: "in build your stacks you feel the pain when you have to take out the money … Here nothing … Like popup? Sell this or that!") — manual mode: `opts.manual`, `p.owe`, `sellFor`, `coverAuto`, `G.owed/canPayWith/payWith/payCard`; payup modal in ui.js. Verified: wedding bill ₹3.3 L, selling Nifty "locked in a ₹30,470 loss", bill dropped to ₹1.2 L.
18. **Three hidden stock tips** (user: "dont give one hot stock maybe give 2-3 and hide the names!! … In the end reveal everything") — `STOCKS` tables; first slip text mismatch (Stock C "lending company" got a "diabetes cure" forward) → per-stock `TIPS_BY` pools.
19. **Simple gains tax** (user: "arent we doing taxes while selling? Maybe make very simple tax thing … or unnecessary complication?") — I recommended exactly one rule; implemented 10% on profit for shares/tips/gold. Verified gold sale "₹43,400 of it profit (the taxman took ₹4,340)".
20. **Stax comparison research agent ("stax-researcher")** — read Stax's own `wp-json/dev-api/v1/app-data/` config + `app.js` as text. User then picked gaps 1 (FD penalty 1%→10%) and 2 (15 s countdown → card). Verified countdown: debt 0 → ₹3,26,517 after expiry, popup closed.

## Key Decisions

- **No AI at runtime, static page, no backend** — user preference ("something which doesn't use ai in background would be better"); also zero API keys = safe to make public.
- **Real history but hidden years** — the hook is "you lived this"; hiding years prevents gaming. Real years + event names + stock identities revealed only on the end screen. Rejected: fictional random markets.
- **Rivals take the default option and never win the lottery** — keeps comparison fair-ish while letting the player's choices be the variable; user confirmed "Player only".
- **Crypto removed** (after first being "real BTC history") — it dominated outcomes (~174× from Year 10) and drowned other lessons. Rejected: tuned ~0-mean crypto (user picked real history first, then removed).
- **Manual bills over auto forced-sale** — pain requires agency; the automatic order Savings→FD→PPF→Gold→Nifty→A→B→C is kept only as fallback (`coverAuto`) for scripted play / tests / unpaid bill on `step`.
- **36% credit card, 10% FD penalty, 10% gains tax** — each a single, legible rule; rejected realistic STCG/LTCG slabs as "unnecessary complication".
- **Stock tips shaped on real stocks but "stylised, not exact prices"** — names hidden in play, revealed with honest caveat. Risk: numbers are from memory, not sourced (see Risks).
- **One place to look** — user: "user can only focus on one place at a time" → each asset row carries amount, last-year return, overall P&L, holding, and the character note about it.
- **Wayfinder lightweight** — map as one GitHub issue + tickets, decisions logged as comments; local `.scratch/` copy abandoned.
- **Did not install taste-skill** — read its SKILL.md files and applied rules instead (installing runs an npm package and changes config).
- **Repo public only with explicit yes** — ticket #6; user answered "Keep all" (don't prune) but has not yet said "make it public".

## Evidence & Data

### Commit log (all on `main`, pushed)

| Hash | Summary |
|---|---|
| `3a2b761` | Hackathon start: physics prototype, Paisa Stax prototype, UI/UX research |
| `a2225ac` | Add README and demo script |
| `b238426` | Docs: hidden years, Rollercoaster asset |
| `1cc158d` | WIP checkpoint: Gullak game in progress (15/15 tests) |
| `ec9477f` | Gullak: storybook game with hidden years, selling, fear/greed cast, takeaways |
| `d245bdc` | Ledger theme, forced life decisions, credit card at 36%, dramatic hot tips (20 tests) |
| `9292d19` | Lottery win with relatives' asks and lifestyle creep; remove the Rollercoaster (crypto) (22 tests) |
| `de175a3` | Docs: lottery, decisions, no crypto |
| `1d7b32f` | Selling clears credit-card debt first; no double-counted interest in takeaways (23 tests) |
| `8f96714` | End screen lists the lottery win; README screenshot |
| `dd7e7cb` | Bills pop up: player must choose what to sell (shows loss locked in) or swipe the card (25 tests) |
| `d3a6e1f` | Three hidden stock tips (A/B/C) shaped on real stories, revealed at the end |
| `ac23caf` | Simple 10% tax on profit when selling shares, stock tips or gold (26 tests) |
| `cf27b6f` | Docs: Build Your Stax vs Gullak comparison |
| `c1e61ca` | 10% FD break penalty; 15-second countdown on bills (then it goes on the card) |

### Test count history

| Point | Tests | Notes |
|---|---:|---|
| Builder first report | 15 | determinism, 20 rounds, forced-sale order, PPF lock, debt, FF, takeaways, crypto table, hot sign, inr, selling, FF never sells, panic sell, no year/crypto leak |
| + dilemmas | 19 | 4 decision tests; old tests isolated with `noChoices()` / `forcedGame` clearing `s.choice` |
| + card funding | 20 | card instead of sell; 36% interest |
| + lottery/no crypto | 22 | lottery win/asks/creep; crypto-gone test replaced BTC table test |
| + sell repays card | 23 | |
| + manual bills | 25 | payWith/payCard; step auto-covers |
| + 3 stocks (replaced hot-sign test) + tax | 26 | |

### Market data tables in `game.js` (approximate, from memory — NOT sourced)

```
NIFTY (% calendar-year price return):
2005 36, 2006 40, 2007 55, 2008 -52, 2009 76, 2010 18, 2011 -25, 2012 28, 2013 7, 2014 31,
2015 -4, 2016 3, 2017 29, 2018 3, 2019 12, 2020 15, 2021 24, 2022 4, 2023 20, 2024 9
GOLD INR (%):
2005 20, 2006 22, 2007 17, 2008 30, 2009 24, 2010 23, 2011 32, 2012 12, 2013 -5, 2014 -8,
2015 -6, 2016 11, 2017 5, 2018 7, 2019 24, 2020 28, 2021 -4, 2022 14, 2023 15, 2024 21
STOCKS (stylised % per year):
hot  (Yes Bank):      60 50 40 -60 120 30 -20 50 -20 80 10 50 30 -30 -80 -60 -10 5 10 5
hot2 (Suzlon Energy): 80 100 60 -80 30 -40 -50 -30 -40 80 20 -20 -10 -60 -40 20 60 20 350 60
hot3 (Bajaj Finance): 20 10 30 -60 250 100 30 80 5 130 60 60 100 50 60 20 30 -5 -5 0
SAFE_RET: sav 3%, fd 7%, ppf 7.5%
```

### Game constants

| Constant | Value | Where |
|---|---|---|
| `R`, `START_YEAR`, `START_AGE` | 20, 2005, 25 | game.js:21 |
| `CRYPTO_R` | 9 (unused now; crypto removed) | game.js:22 |
| `PPF_R` | 15 (Year 16 = 2020) | game.js:23 |
| `START_INCOME`, `RAISE`, `PROMO` | 120000, 0.08, 0.2 | game.js:24 |
| `DEBT_RATE` | 0.36 (was 0.18) | game.js:24 |
| `FD_PENALTY` | 0.10 (was 0.01) | game.js:24 |
| `GAINS_TAX` | 0.10 | game.js:24 |
| `EVENT_YEARS` | 2008, 2009, 2013, 2016, 2017, 2020, 2022 | game.js:58 |
| `LOTTERY` | at rounds 7–10, gross 10×, tax 31.2% | game.js:123 |
| `PAY_SECONDS` | 15 | ui.js (showPayup) |
| Life-event chance | 35%/yr, no repeat within 3 | buildSchedule |

### Seeded schedule layouts (`node` probe; L = lottery, * = big market year)

```
seed 1  : . . . wed * . car . * . L sis lif mam sur cou . * . .
seed 42 : . . . * wed . . car * . L sis lif mam sur cou . * . .
seed 7  : . . . * * wed car . L lif mam sis cou sur . * . * . .
```
Note: the middle of the game (rounds 9–15) is now very dense with decisions; rounds 16–19 are quiet.

### Playtest outcomes

| Run | Strategy | Result |
|---|---|---|
| Physics prototype | two ramps at (170,150,0.3) and (335,205,0.3) | ★★★, 4.9 s |
| Paisa Stax seed 2 | agent playthrough | You #2 ₹1.53 Cr vs SIP Aunty ₹1.58 Cr vs FD Uncle ₹1.01 Cr |
| Gullak seed 777 | most expensive options, alternating card/sell | You −₹26.7 L, card debt ₹97.5 L, interest ₹1.12 Cr; SIP Aunty ₹1.48 Cr; FD Uncle ₹88.7 L |
| Gullak seed 777 | cheapest options | lottery shown on end list; Year 11 win +₹21.4 L |
| Gullak seed 42 | all three tips + nifty | takeaways: "Stock tip C (Bajaj Finance) paid off", "You beat the index", "Beyond the FD" |
| Gullak seed 42 bill | big fat wedding at Year 5 | ₹3.3 L due; FD ₹93,189 (+₹13,669 profit); Nifty ₹2.1 L (locks ₹30,470 loss); after selling Nifty ₹1.2 L still due |
| Countdown | wait 16 s | debt 0 → ₹3,26,517, popup closed, 0 console errors |
| Lottery seed 42 | | Year 11, gross ₹25.9 L, net ₹17.8 L; then sister → lifestyle (villa −₹8.9 L, would force-sell ₹5.3 L) |

### Build Your Stax facts (from `docs/stax-vs-gullak.md`, read from Stax's app-data feed + app.js; feel = inferred)

- Real-time clock, 5 s/tick, ~20 min for 20 years; cash every 6 months, ~$4k/yr start.
- 7 investments unlocking over time with lesson pauses; CD early-withdrawal 10%; bonds can't be cashed early; no fees/expense ratios in code.
- 23 life-event cards (up to $10k lawsuit), chance ramps with time since last.
- Bill card freezes game, shakes if cash short; "Find Funds" restarts clock while you sell; buying disabled until paid; **never lets you go into debt** (bill only drawn if net worth covers it).
- Computer player = index only; end screen "the computer wins 70% of the time".
- Remaining unimplemented gaps (ranked): rank-drop sting (~10 min, `showReveal()`), projection at 65 + "SIP Aunty wins X%" (~10 min, `showEnd()`), ramping life-event chance (~10 min, `buildSchedule()`), idle-cash nag (~5 min, `voices()`), lock-the-door friction (moot: modal blocks).

### Story copy inventory: NEWS by year (game.js `NEWS`; [headline, story, real event revealed at end])

| Year (round) | Headline in play | Real event (end screen only) |
|---|---|---|
| 2005 (1) | A gullak of one's own | Markets were warming up |
| 2006 (2) | Stocks are the talk of the town | Sensex crossed 10,000 |
| 2007 (3) | Everyone's a genius | The great bull run |
| 2008 (4) * | Trouble overseas ("A giant bank collapses overseas…") | Global financial crisis (Lehman) |
| 2009 (5) * | "Stay away from shares" | The big rebound (+76%) |
| 2010 (6) | A calm year ("Markets are calm; onion prices are not.") | Steady recovery |
| 2011 (7) | Gloomy headlines, golden gold | Markets fell, gold boomed |
| 2012 (8) | Slow and steady | Quiet recovery |
| 2013 (9) * | The rupee tumbles | Taper tantrum, rupee 68/$ |
| 2014 (10) | New hope | Election rally |
| 2015 (11) | A shrug of a year | China slowdown wobble |
| 2016 (12) * | Notes cancelled! | Demonetisation |
| 2017 (13) * | Everyone is buying | Small-cap mania |
| 2018 (14) | The hangover | Small-cap crash |
| 2019 (15) | A steady year | Steady gains |
| 2020 (16) * | The world stops (+ PPF unlocks) | COVID crash and recovery |
| 2021 (17) | Everyone is a trader now | Retail-investor boom |
| 2022 (18) * | Rates go up | Rate hikes; retail frenzy cools |
| 2023 (19) | Good news from space | Chandrayaan-3 |
| 2024 (20) | The last page | Markets near record highs |

`*` = `EVENT_YEARS` (fast-forward stops before these). Note the stories are mostly **macro/news**; the *personal* life of the player is carried only by `LIFE`, `DILEMMAS` and `LOTTO_ASKS` — relevant for the "relatable" goal.

### Character cast (ui.js `voices()` / `HECKLE`)

| Character | Credential line | Role | Example |
|---|---|---|---|
| Sharma-ji | senior colleague, 15 years in the market | fear before rebounds, "never sell in a panic" | "I sold everything at 9:15 this morning…" |
| Arvind | TV market expert, banging the desk | fear and greed extremes | "Cash is king! Raise cash NOW!" |
| Kavya | batchmate who quit to "trade full-time" | greed near peaks, panic at bottoms | "I made more in three weeks … than my entire annual bonus." |
| WhatsApp uncle | forwards | hot-tip slips | "Don't share outside family!!!" |
| SIP Aunty | at the family dinner | rival taunt (header) | "Beta, I'm ₹14.6 L ahead. … Pass the raita." |
| FD Uncle | rival | taunt / "suddenly very interested" after lottery | "Seven percent, guaranteed… Sleep is also a return, beta." |

Bill-popup heckles (`HECKLE`, 5): Sharma-ji "Never sell in a panic" (from his second SUV), Kavya "Sell the boring stuff. Keep the winners", FD Uncle "This is why I keep everything in FD, beta", SIP Aunty "Selling the index? At these prices? Hai Ram.", Arvind "Cash is king! Raise cash NOW!".

### Decision and ask consequence notes (game.js; these are the funniest, most relatable lines — reuse their tone)

- Wedding big fat: "Mummy cries happy tears. Relatives talk about the paneer for years." / respectable: "Bua-ji still says the sweets were just okay." / court: "Some relatives have quietly stopped calling."
- Car SUV: "Everyone in the society notices. So does the EMI." / scooter: "The scooter coughs every morning, but it is paid for."
- Sister half: "Papa hugs {n} for the first time in years." / envelope: "Mummy says nothing. That is worse."
- Surgery private: "Papa walks to the gate on his own within a month." / govt: "Six months on the list. Papa says he is fine. He is not."
- Lottery villa: "The EMIs, the driver and the club fees now eat 30% of what {n} saves. Every year. Forever."
- Mama-ji back it: "The franchise shuts in eight months. Mama-ji blames the economy." / no: "By evening the whole family knows that {n} has changed."
- Cousins all: "The phone now rings every Sunday. Word has spread." / none: "The family WhatsApp group goes quiet whenever {n} posts."

### Stock-tip forwards (ui.js `TIPS_BY`, 4 per stock) and outcomes (`TIP_UP`/`TIP_DOWN`)

- A (bank): "Best private bank in India… CEO is a genius", "My bank RM himself told me. Put your FD money in this. Safer than FD!!!", "Temporary dip only… BUY THE DIP!!!"
- B (green energy): "Wind is the future. Next Reliance.", "Penny stock now, multibagger later. Operator is accumulating.", "Debt restructuring done. Comeback story of the decade."
- C (lender): "Small lender, nobody knows it yet. Consumer loans on every TV and fridge.", "Boring company, crazy growth… Don't sell ever!!!"
- Up outcomes: "doubled. Uncle has changed the group name to 'Crorepati Parivaar'", "Uncle now signs every message '— market guru'". Down: "promoter arrested. Stock frozen. Uncle has left the group", "auditor resigned", "delisted. Uncle is now forwarding yoga videos instead."
- The older generic pool `TIPS` (12 fake companies like "Bharat Mega Infra (BMIL)", "Shree Ganesh Lithium", "Navratna Solar Pvt") still exists in ui.js but is now only used for target prices fallback — effectively unused.

### Background agents used this session

| Name | Task | Duration / tokens | Output |
|---|---|---|---|
| (unnamed) UI/UX research | physics-game UX plan | 136 s / 89K | `docs/ui-ux-plan.md` (dropped game) |
| (unnamed) Paisa Stax prototype | single-file prototype | 186 s / 86K | `prototype-stax/index.html` + shots |
| gullak-builder | full game build + 4 mid-flight updates | 978 s / 212K | `gullak/*`, `tests/*` (15 tests) |
| theme-explorer | 3 theme directions → applied ledger + decisions UI + inline rows + tips | 845 s / 223K | `themes/*`, ledger restyle |
| stax-researcher | Stax vs Gullak | 311 s / 141K | `docs/stax-vs-gullak.md`; Stax files in scratchpad `stax/` |

Pattern that worked: main session owns `game.js` rules + commits; agents own UI files; told agents "no git commands"; relayed user feedback via SendMessage mid-flight.

### Pitch points vs Build Your Stax (from `docs/stax-vs-gullak.md` §4)

- Real debt (36% compounding card); Stax never lets you go negative.
- Loss shown at the moment of sale ("Locks in a ₹X loss").
- Moral/family dilemmas + lottery curse with permanent lifestyle creep.
- Fear/greed voices timed against real history; WhatsApp tip slips.
- Personalised takeaways (panic tax, lottery curse, wedding FV, emergency fund).
- Indian context (PPF, gold, Nifty hidden until end, gullak metaphor).
- Offline static page, no sign-in, seed sharing, FF that stops before crashes.

### Environment gotchas discovered

- **Bash heredocs with curly quotes/apostrophes** (`’`) inside `python - <<'EOF'` failed with "unexpected EOF while looking for matching `''" on one large patch → write the Python patch to the scratchpad with the Write tool, run `python -I "$(cygpath -w "$TEMP")/claude/<session>/scratchpad/patch.py" "$(pwd)"`.
- `sed -i` replacement that appended a `// comment` mid-declaration swallowed `FD_PENALTY = 0.01;` → SyntaxError; check constants lines after sed.
- Removing `.scratch/gullak/issues` failed ("Device or resource busy") because it was the shell's primary cwd; ignored via `.gitignore` instead.
- `git init` reported "re-init" once (a `.git` already existed, probably created by an agent); history is clean (first commit `3a2b761`).
- Built-in browser pane cannot navigate tabs showing local files → it opens a new tab.
- Playwright MCP browser is **shared** across agents; the builder saw sliders move by themselves — use a fresh tab per agent.
- `window.__gullak.state` is null before the first `next()`; in playthrough scripts call `W.next()` first.
- Windows Git Bash prints LF→CRLF warnings on every commit — harmless.

### Demo script outline (`docs/demo-script.md`, ~3 min, `?seed=42`)

0:00 hook ("we just won't tell you which 20") → 0:15 type judge's name → 0:30 chapter 1 safe FD/PPF → 1:00 fast-forward stops before crash, go heavy Nifty → 1:20 "Everyone says stay away" hold vs sell (room votes) → 1:45 big fat wedding, short, sell vs card → 2:10 lottery, say yes to villa + Mama-ji → 2:25 end: years reveal, podium, takeaways. Needs a refresh for: the bill popup + countdown, three hidden stock tips reveal, tax line.

### Relatability ideas raised or implied during the session (not yet built)

- User wanted it to feel Indian and dramatic: marriage expense, family asks, WhatsApp uncle, "Hai Ram", raita — these landed best. More of this, closer to the player's own life, is the obvious lever.
- Player currently is always a salaried 25-year-old saving ₹1.2 L/yr; no city, job, family structure, rent, EMI, or goals (house, kids' education, parents' retirement).
- Money is shown only as ₹ L / Cr; no everyday equivalents (months of rent, iPhones, a Maruti, a 2BHK down payment) — students may not feel ₹3.3 L.
- No goal to aim for (Stax: "biggest stax wins"); Gullak ranks vs rivals but no personal target like "retire at 45 with ₹X" or "buy a home by Year 12".
- Audience includes students → plain-English explainers exist per asset; no "why" moments after mistakes (Stax has lesson pauses).

### Session timeline (local time, 2026-10-10)

| Time | Event |
|---|---|
| ~15:07 | Session start; system check; process cleanup; node fix; Playwright MCP added |
| ~15:15 | Track = fun; "between playing and making"; no runtime AI |
| ~15:25 | Contraption Builder physics prototype + UI/UX research agent |
| ~15:45 | User drops it; points at buildyourstax.com "for India" |
| ~15:50 | Paisa Stax prototype agent; /wayfinder; grill rounds 1–2 |
| ~16:05 | "start building while I answer the rest" → gullak-builder agent; private repo + tickets |
| ~16:10 | Hidden years, no crypto word; fear & greed; dramatic cast (relayed to builder) |
| 16:18 | WIP checkpoint pushed (15 tests); deadline corrected to 17:45 |
| ~16:20 | Builder done; theme-explorer started; taste-skill read; ledger picked |
| 16:24–16:32 | Inline rows + dramatic tips; forced life decisions (game.js) |
| 16:33–16:39 | 36% card + funding choice; lottery + crypto removal |
| 16:41–16:44 | Readiness check; two bugs fixed; lottery on end list; README screenshot |
| 16:45–16:50 | Bills popup (manual mode); Stax research agent; three hidden stock tips |
| 16:50–16:56 | 10% gains tax; Stax gaps chosen; 10% FD penalty; 15 s countdown |
| ~16:59 | /handoffplan invoked |

### Wayfinder tickets (GitHub, RajdevShivam/gullak)

| # | Title | State | Resolution |
|---|---|---|---|
| 1 | What to keep from Build Your Stax | closed | keep all four mechanics |
| 2 | Rein in crypto | closed | real BTC history (later: crypto removed entirely, logged on #7) |
| 3 | Game name | closed | Gullak |
| 4 | Protagonist | closed | player's own name, third-person chapters |
| 5 | Fast-forward behaviour | closed | ≤5 yrs, keep allocation + recap, stop before big events |
| 6 | Make the repo public | **open** | needs explicit user yes; "Keep all" files |
| 7 | Map: Gullak (India Build Your Stax) | open (map) | destination, decisions, out of scope; decision comments appended |

Map "Out of scope": physics Contraption game (dropped), runtime AI, backend, accounts, live multiplayer.

### Compass grill questions asked (id → answer)

| id | Question | Answer |
|---|---|---|
| dest | destination | playable demo by deadline |
| audience | who it's for | judges/friends + students ("2 and 3") |
| realism | real vs fictional markets | real history |
| group | group play | solo first, seed link if time |
| Q11 | keep from Stax | (unclear "1 and 2") → re-asked in chat → all four |
| rounds | game length | 20 years + fast-forward |
| assets | options | keep all 7 (later crypto removed) |
| lessons | end takeaways | yes, 3 personalised |
| vibe | feeling | warm storybook |
| crypto-balance | crypto | real BTC history |
| name | name | Gullak |
| hero | protagonist | player's own name |
| ff | fast-forward | "1 and 3" (keep+recap AND stop at events) |
| timebox | (compass-generated) skip map | "Lightweight map.md" |
| repo-name | (compass-generated) rename | gullak |
| scope-risk | (compass-generated) trim scope | keep everything |
| theme-pick | theme | bahi-khata ledger |
| event-costs / ff-short | | keep harsher / keep stopping |
| commit-wip / lotto-rivals / public-junk | | commit now / player only / keep all |

Some questions (Q26, Q27, Q29+) were generated by the compass plugin itself, not by this session; answers were still honoured.

### Takeaway impact weights (`takeaways()`; top 3 by `impact`)

| id | Fires when | impact |
|---|---|---|
| worst | any losing year | −worst-year ₹ |
| emergency | forced sales happened | penalty + tax (+ interest if ≤ ₹10k) + 0.25 × risky sold |
| sip | always | 0.6 × |you − SIP Aunty| |
| panicSell | sold after a −15% year, recovered later | 1.2 × extra ₹ |
| panic | cut equity ≥15 pts after −20% Nifty year | missed ₹ |
| lottery | won | 1.4 × (given + creep) if cursed, else 0.15 × FV |
| debt | interest > ₹10k | 1.5 × interest |
| choice | biggest decision FV > 1.5 × cost | 0.5 × (FV − cost) |
| hot/hot2/hot3 | contributed > ₹1,000 | |gain| |
| ppf | gain > ₹1,000 | 0.3 × gain |
| fd | always | 0.2 × |you − FD Uncle| |

### UI flow (screens)

1. Title page (शुभ लाभ, gullak SVG, 3-line how-to, name box default "Riya") →
2. Chapter page: left ledger page (story, news note, life/jackpot note, ledger lines, best/worst year, mini pot) + right panel (decision card if `G.pending`; else asset rows with sliders/sell/notes, invest + skip buttons) →
3. Bill popup (if `G.owed() > 0`, 15 s countdown) →
4. Reveal modal after "Drop it in the gullak": big ₹ gain/loss, per-asset rows, tip outcome, rival line →
5. Fast-forward recap page (if skipped) →
6. End screen after Year 20.

### Earlier prototypes (for reference; not to be revived)

- **Contraption Builder** (`prototype/index.html`): 960×600 Matter.js canvas, floor top y=520, pit 830–910, middle wall x=470 (y 320–520), parts: ramp 180×14, bouncer 100×16 restitution 1.25, fan 44×44 (zone 280×70, force 0.0018·mass), crate 50×50; win = ball in pit 20 frames; fail = 12 s or still 90 frames. Research plan recommended ghost trail, instant retry, star goals, 5 teaching levels.
- **Paisa Stax** (`prototype-stax/index.html`): dark money-green theme (#0d1f17), saffron #ff9933, 40 half-years, ₹60k/half-year, 7 sliders, challenge link; crypto overpowered; laid-off rounds looked empty; no reveal step.

### Theme directions explored (`themes/README.md`)

- **Editorial newspaper**: off-white, black ink, one terracotta accent, serif headlines, hairlines — mockup partial.
- **Swiss minimal**: grotesk, strict grid, colour only for gains/losses — mockup partial, still breaks taste rules (saturated red/green).
- **Bahi-khata ledger** (chosen, applied): see Where We Are. Taste rules applied from taste-skill: no Inter/Roboto, no gradients/heavy shadows, ≤8px radii, one accent, no emoji chrome, sentence case, tabular/mono numbers, gains/losses as the only loud moments.

### System state at session start (historical)

| Item | Value |
|---|---|
| RAM | 2.8 → 4.6 GB free of 14.8 |
| Disk C: | 159 GB free |
| Tools | node 24.19, npm 11.19, bun 1.3.11, python 3.13.2, uv 0.12.6, git 2.48.1, gh 2.79, docker 28.0.4 |
| MCP | playwright (added), compass grill, Claude Docs, Notion, Gmail, Drive, alphaXiv connected; GitHub/context7/Slack need auth; aws-mcp failing |

## Code Analysis

### `gullak/game.js` (pure rules; `window.Gullak` in browser, `module.exports` in Node)
- `makeRng(seed)` / `mulberry32` — seeded RNG; `rng.gauss()` still called once per round purely to keep the stream identical to earlier versions (hot-tip noise removed).
- `buildSchedule(seed)` → array of 20 `{ r, y, age, news, event, life, inc, ret:{sav,fd,ppf,nifty,gold,hot,hot2,hot3,crypto:0}, choice?, lottery? }`. Uses a **second RNG stream** `makeRng(seed ^ 0x9e3779b9)` for dilemma/lottery placement so market/life rolls are unchanged.
- `beginRound(p, s, choiceX, fund)` — income × `p.incMult` (lifestyle creep), lottery cash if `p.lucky`, life + choice costs (`choice.base` = lottery net for asks), repays debt from positive cash, then shortfall handling: `fund==='card'` → debt; `fund==='manual'` → `p.owe`; else `coverAuto`.
- `sellFor(p, s, k, need)` — sells up to need/(1−penalty) from k, reduces `contrib` by cost basis, computes `pen`, `tax = gainsTax(k, pnl)`, `got = sell*mult − tax`, pushes to `log.sales`, counts `forcedYears` once per round via `log.forced`.
- `coverAuto(p, s, need)` — order `sav, fd, (ppf if unlocked), gold, nifty, hot, hot2, hot3`, then card.
- `createGame(seed, { name, manual })` → `G` with `step(alloc)`, `ff(alloc)`, `ffYears()`, `choose(i, fund)`, `previewChoice(i)` → `{cost, shortfall, creep}`, `sell(k, frac)` (repays card first, tax on profit), `canSell`, `owed()`, `canPayWith(k)`, `payWith(k)`, `payCard()`, `takeaways()`, `netWorth()`; state `G.me/fd/sip`, `G.history`, `G.choices`, `G.pending`.
- `takeaways(G)` — candidates sorted by `impact`, top 3: worst year, emergency fund (penalty+tax+interest unless debt takeaway), SIP comparison (×0.6), panic sell (×1.2), panic cut, lottery curse (×1.4) / boring winner, credit card (×1.5 when interest > ₹10k), "real price of a big day" (FV of biggest decision in Nifty, ×0.5), per-stock tip paid off / bit back (named with real company), PPF, FD Uncle fallback.
- `chapter(s, name)` — story text = news + lottery line + decision story + life story; title "Chapter N · Year N".
- Exported API: `FD_PENALTY, GAINS_TAX, TAXED, STOCKS, DEBT_RATE, R, START_YEAR, START_AGE, CRYPTO_R, PPF_R, START_INCOME, ASSETS, KEYS, NIFTY, GOLD, CRYPTO, EVENT_YEARS, NEWS, LIFE, DILEMMAS, LOTTERY, LOTTO_ASKS, mulberry32, makeRng, buildSchedule, createGame, normAlloc, enabled, netWorth, inr, chapter, takeaways`.

### `gullak/ui.js` (rendering; IIFE)
- `startGame(name)` creates `createGame(SEED, { name, manual: true })`.
- `render()` = `renderTop(); renderPage(); renderJars();` then `showPayup()` if `G.owed() > 0`.
- `renderPage()` — left ledger page (chapter, news note, lottery "Jackpot" note, life note, ledger lines: salary, lottery prize, life, decision, debt repaid, sells incl. "Used to clear the credit card", tax/penalty smalls).
- `renderJars()` — right panel: decision view (`renderDecision`) when `G.pending`, else asset rows with sliders, Sell half/all, inline character quotes (`voices()`), tip slip/outcome on `tipKey(r)` row; invest + skip buttons.
- `showPayup(flash)` / `tickPay()` / `closePayup()` — bill modal with countdown (`payTimer`, `payLeft`, `PAY_SECONDS = 15`), `HECKLE` list of 5 character lines.
- `showReveal(rec)` — yearly ₹ gain/loss modal (`#modal/#sheet`), per-asset rows, tip outcome.
- `showEnd()` — cracked pot, `#yearsReveal` (years, events, decisions incl. lottery, `.stockreveal`), podium, takeaways, Chart.js, spilled-out table.
- Test hook `window.__gullak` = `{ state (getter, may be function or object — tests used `typeof W.state === 'function' ? W.state() : W.state`), next(alloc) (quiet; auto `payCard()` on unpaid bill), ff(), seed, netWorth() }`.
- **Dead/leftover code**: `renderFunding()` and `salePlan()` (unused since payup popup); `CODE.crypto`, `COL.crypto`, `CRYPTO_R` import; fear gauge still includes `0.25 * last.ret.crypto` (always 0).

## Files Changed

### Source code
- `gullak/game.js` — all rules (see Code Analysis). Built by builder agent; extended by main session (dilemmas, card funding, lottery, crypto removal, manual bills, stocks, tax, FD penalty).
- `gullak/ui.js` — all rendering; ledger restyle + inline quotes + hot-tip slips by theme agent; main session added lottery notes, payup popup + countdown, per-stock tips, stock reveal, card-repay line, decisions list with lottery, tax/penalty text.
- `gullak/style.css` — ledger theme (theme agent) + `.note.lotto`, `.sheet.payup`, `.payrow`, `.clock.hurry` (main session).
- `gullak/index.html` — fonts, शुभ लाभ title, `#taunt`, `#modal`, `#payup` modal.
- `prototype/index.html` — dropped physics prototype (kept).
- `prototype-stax/index.html` — Paisa Stax prototype (kept; still served on :5174 earlier).
- `themes/editorial/index.html`, `themes/swiss/index.html` — partial mockups (swiss breaks taste rules); `themes/bahikhata/*` screenshots incl. `before/`.

### Tests
- `tests/gullak.test.js` — 26 tests (see table). Helpers: `MIX`, `playAll`, `forcedGame(r, x)` (clears life + choices), `noChoices(g)`.
- `tests/index.js` — loads gullak.test.js for `node --test tests/`.

### Data & results (screenshots, all committed)
- `gullak/shot-title.png`, `shot-chapter.png`, `shot-decision.png`, `shot-decision-pay.png` (old "how will you pay" screen, superseded), `shot-end.png`, `shot-mobile.png`, `shot-lottery.png`, `shot-lottery-ask.png`, `shot-end-debt.png` (seed 777 worst case), `shot-payup.png` (bill popup).
- `prototype-stax/shot-*.png`, `prototype/screenshot-build.png`.

### Docs / config
- `README.md`, `docs/demo-script.md`, `docs/stax-vs-gullak.md`, `docs/ui-ux-plan.md`, `themes/README.md`.
- `.gitignore` — `.playwright-mcp/`, `.scratch/`, `node_modules/`, `__pycache__/`, `.DS_Store`.
- `~/.claude.json` — user-level Playwright MCP added (outside repo).
- Scratchpad patch scripts (not in repo): `patch_lottery.py`, `patch_payup.py`, `patch_payup_ui.py`, `patch_tips.py`.

## User Feedback & Preferences (REQUIRED — never omit)

- "We are gonna do a hackathon for next 3hrs" → later corrected: "we have 2 hrs to be precise", then "we have deadline of 5.45".
- Goal for the hackathon: **"good time"**; track fun; "something between playing and making".
- "something which doesnt use ai in background would be better."
- On physics prototype: "ah this game doesnt seem good. See this https://buildyourstax.com/ something like this for India".
- "in the background start a agent to research on ui and ux best practices" / "let the prototype build happen in background" / "start building while I answer the rest" — likes parallel background agents and not blocking.
- "lets also setup a private github repo for now with wayfinder tickets and we need to make it public towards the end of the game".
- "Dont add year. People remember what happened when. Just start y1, y2… Also dont say crypto describe it as something volatile."
- "Show losses and gains. Make people fearful and greedy."
- "dont say neighbour. but say a smart colleague who is doing this for 15 years etc. You know make it dramatic".
- "The ui looks bit weird… Something minimalistic and looks less AI"; pointed to `npx skills add Leonxlnx/taste-skill`; picked **Bahi-khata ledger**.
- "make the hot tips more dramatic too. And show return right beside investment and tip also there. You see user can only focus on one place at a time".
- "show me the screenshots when it's done" (twice) — wants visual proof.
- "Life events dont seem dramatic enough. We arent forced to do anything. Add marriage expense since its India".
- "Also yes add CC debt and other things if needed".
- "make someone win lottery too! (And you know how people ask more money when you win lottery and most lottery people end up poor)".
- "maybe remove crypto".
- "wait why is 7th looking different from remaining 6" — confused by a comparison screenshot without clear labelling → label comparisons explicitly.
- "Wait. Is everything ready?" — wants verified status, not optimism.
- "in build your stacks you feel the pain when you have to take out the money … Here nothing. Can we do something about it? Like popup? Sell this or that!"
- "research build your stacks game online via an agent and see where all do we defer? Also dont give one hot stock maybe give 2-3 and hide the names!!" + "In the end reveal everything".
- "arent we doing taxes while selling? Maybe make very simple tax thing … (Or you think its unnecessary complication…)" — open to pushback; accepted one simple rule.
- Picked Stax gaps: bigger FD penalty + countdown; skipped rank-drop sting.
- Compass grill: sometimes answers there, sometimes doesn't see questions — fall back to AskUserQuestion in chat.
- Global CLAUDE.md: tests in `tests/`; ask one feeling question before creative options; no rationale after creative writing.

## Where We're Going

1. **Hackathon close-out (if session still before 17:45)**: user rehearses with `docs/demo-script.md` on `?seed=42`; on explicit "yes", `gh repo edit RajdevShivam/gullak --visibility public --accept-visibility-change-consequences`, close ticket #6.
2. **Relatability pass** (user's next direction): make the life feel like *theirs* — personal setup (city, salary band, family), everyday ₹ equivalents, more Indian life beats, Hinglish-lite copy, student-friendly explainers.
3. **Remaining Stax gaps**: rank-drop sting, projection at 65 + "SIP Aunty wins X% of games", ramping life-event chance, idle-cash nag.
4. **Data honesty**: source and cite Nifty/gold/stock series (or label as stylised everywhere); consider Nifty TRI vs price.
5. **Shareability / group play**: results card image, seed challenge leaderboard.
6. **Code health**: remove `renderFunding`/`salePlan`/crypto leftovers; split ui.js (622 lines).

## Risks & Blockers

- **Market numbers are from memory** — Nifty/gold yearly returns and stylised stock tables are unsourced; real-company names (Yes Bank, Suzlon, Bajaj Finance) attached to stylised numbers could mislead if public. Mitigation: verify against a source or keep "stylised, not exact prices" prominent.
- **Decision density**: rounds 9–15 stack sister wedding + lottery + 3 asks + surgery; may feel like a chore; rounds 16–19 quiet.
- **Debt spiral**: 36% compounding can produce absurd end states (−₹26.7 L, ₹1.12 Cr interest) — dramatic but may read as broken.
- **`window.__gullak.state`** shape inconsistent (getter vs function) — test scripts must handle both.
- Repo still private; ticket #6 open; making public needs explicit user yes.

## Open Questions

- Does the user want the repo public now (before 17:45)?
- For "relatable": should the player pick a starting profile (city/salary/family) or keep one fixed story?
- Keep real company names for stock tips once public, or switch to "modeled on" phrasing / fictional names?
- Is 15 s the right countdown, and should forced sales during fast-forward also pop up?

## Quick Start for Next Session

```bash
# Restore context
cat "plans/handoffs/HANDOFF_standalone-4d377cee_gullak-game_2026-10-10.md"
gh issue view 7 -R RajdevShivam/gullak --comments   # wayfinder map + decisions

# Key files to read first
gullak/game.js        # rules, constants, takeaways
gullak/ui.js          # rendering, payup popup, voices/tips
docs/stax-vs-gullak.md
tests/gullak.test.js

# Verify current state
node --test tests/                       # expect 26 pass, 0 fail
cd gullak && python -m http.server 5175  # then open http://localhost:5175/?seed=42

# Next action
# Start the relatability pass (see PLAN file), beginning with the player profile + everyday-₹ equivalents.
```
