# Make Gullak relatable and better: personal life, felt money, sharper lessons

**Date:** 2026-10-10
**Status:** PLANNED
**Bead(s):** none
**Epic:** Gullak (GitHub map issue RajdevShivam/gullak#7)
**Chain:** `standalone-4d377cee` seq `1`
**Context:** See `HANDOFF_standalone-4d377cee_gullak-game_2026-10-10.md` for session data, constants, copy inventory, test history and prior approaches.

---

## Problem Statement

Gullak works (26/26 tests, full 20-year runs with 0 console errors), but the player's *life* is thin. Everyone is the same salaried 25-year-old saving ₹1.2 L a year, with no city, rent, EMI or goals. The NEWS copy is mostly macro, and amounts like "₹3.3 L due" don't land for students. The parts users loved most were personal and Indian: the wedding, Mama-ji, the WhatsApp uncle, "Pass the raita". Three Build Your Stax gaps remain open: the rank-drop sting, the projection at 65, and ramping life events. The market numbers are also unsourced. See Evidence & Data and "Relatability ideas" in the handoff.

## Key Findings

- The funniest, most memorable lines are the family-decision consequence notes and the cast → drives Phase 1 (more personal beats in that tone).
- Students can't feel ₹ L / Cr amounts; nothing translates money into everyday terms → drives Phase 2.
- There's no personal goal; Stax's "biggest stax wins" plus the computer-player comparison creates drive → drives Phase 3.
- Decision density: rounds 9–15 are crowded and 16–19 are quiet (schedule probe in the handoff) → drives Phase 1 placement.
- Stax gaps 3–5 (rank-drop sting, projection plus "SIP Aunty wins X%", ramping events) each take about 10 minutes, with function pointers in `docs/stax-vs-gullak.md` → Phase 3.
- Nifty, gold and stock tables are from memory; real company names sit next to stylised numbers → Phase 4 before going public.
- `ui.js` is 622 lines and carries dead code (`renderFunding`, `salePlan`, crypto leftovers) → Phase 5.

## Anti-Goals (What NOT To Do)

- Don't add AI at runtime or a backend (the user rejected both; the game must stay a static page).
- Don't bring back crypto or random markets; real history with hidden years is the hook.
- Don't add realistic tax slabs (STCG/LTCG). One legible rule per mechanic (user agreed "very simple").
- Don't revive the physics prototype or the Paisa Stax dark theme.
- Don't make the repo public without an explicit yes (ticket #6).

## Plan

### Phase 1: The player's own life (profile + personal beats)

**Goal:** Make the 20 years feel like the player's life, not a generic one.
**Why this approach:** The personal or family copy (DILEMMAS, LOTTO_ASKS) is what landed best; NEWS is impersonal.

- Title page: after the name, add 2 quick taps: **city** (Mumbai / Bengaluru / Delhi / small town) and **first job** (IT / govt / startup / family business). Store them in `opts.profile`.
- `createGame(seed, { name, manual, profile })`: profile sets `START_INCOME` (e.g. govt ₹0.9 L steady, startup ₹1.5 L with a seeded layoff risk) and yearly **rent** as a fixed cost line in `beginRound` (Mumbai higher). Keep rivals on the same profile for fairness.
- Add 4–6 personal `LIFE` beats in the existing tone and spread them into rounds 1–2 and 16–19 (the quiet stretch): rent hike, Mummy's gold-for-wedding fund, first home down-payment decision (a new DILEMMA around rounds 16–17: buy a 2BHK on EMI / keep renting), a child's school fees, parents' retirement.
- Add 1–2 player-specific lines per profile to `chapter()` (e.g. "The Bengaluru landlord raises rent again").
- Add tests in `tests/`: the profile changes income; rent is deducted; the home DILEMMA lands in rounds 16–17; there are still no year/crypto leaks.

**Files:** `gullak/game.js` (profile, rent, new LIFE/DILEMMA), `gullak/ui.js` + `index.html` (title taps), `tests/gullak.test.js`
**Validates with:** `node --test tests/` all pass; Playwright run on seed 42 with each city → different incomes, 0 console errors.
**Rollback:** `git revert` the phase commit; the profile is optional (`opts.profile` undefined = today's behaviour).

### Phase 2: Money you can feel

**Goal:** Translate ₹ into everyday terms at the painful moments.

- Add a helper `feel(amount)` in ui.js: pick the closest of months of rent (from the profile), years of savings, "a Maruti Swift", "an iPhone", "a 2BHK down payment". Show it under the big reveal number, under payup "₹X is due", and on takeaways.
- On the end screen, show net worth as "≈ N years of your salary".
- Keep it to one equivalent per number (taste rule: one loud thing).

**Files:** `gullak/ui.js`, `gullak/style.css`
**Validates with:** screenshots of the reveal, payup and end screens; no layout break at 390px.
**Rollback:** remove the `feel()` calls.

### Phase 3: Goals and stings (remaining Stax gaps)

- **Personal goal** picked on the title page ("Retire comfortably", "Own a home by 40", "Beat SIP Aunty"); judged on the end screen.
- **Rank-drop sting** in `showReveal()`: if `rec.nwBefore > rec.sipBefore` and `rec.nwAfter < rec.sipAfter` (same for FD Uncle), show a red banner plus `sad()`.
- **Projection** in `showEnd()`: "At 65 (6% a year) this becomes ₹X", plus "SIP Aunty wins N% of games", precomputed by running `createGame` for 50 seeds with default choices.
- **Ramping life events** in `buildSchedule()`: chance = 0.2 + 0.1 × quiet years (cap at 0.6), using the existing seeded stream.
- Test each one.

**Files:** `gullak/game.js`, `gullak/ui.js`, `tests/gullak.test.js`
**Validates with:** tests; a seed where SIP Aunty overtakes shows the banner.
**Rollback:** each is independent; revert individually.

### Phase 4: Data honesty before going public

- Source Nifty 50 (price or TRI), gold INR and the three stocks' yearly returns from a primary source; record the sources in `docs/data-sources.md`. Replace the tables in `game.js` or keep them stylised with "shaped on" wording everywhere real names appear.
- Then ask the user and flip the repo public (`gh repo edit … --visibility public`), and close #6.

**Validates with:** the doc cites a source for each series; the stock-tips test still passes.

### Phase 5: Code health and demo refresh (parallelisable)

- Delete `renderFunding`, `salePlan`, the `CODE.crypto`/`COL.crypto` entries and the crypto term in the gauge; split `ui.js` into `ui-page.js`, `ui-modals.js` and `ui-end.js` if over about 600 lines after Phases 1–3.
- Make `window.__gullak.state` consistently a function.
- Update `docs/demo-script.md` for the bill popup, countdown, stock reveal and profile.

## Dependencies & Order

- Phase 1 comes before Phase 2 (`feel()` uses the profile's rent).
- Phase 3 is independent of 1–2 but should follow Phase 1 so the goal choice sits on the same title page.
- Phase 4 must be done before making the repo public. Phase 5 can run in parallel with anything (separate worktree).

## Risks & Mitigations

- **More decisions make it a chore** (rounds 9–15 are already dense): put new beats only in quiet rounds 1–2 and 16–19, and keep at most one family drama per year.
- **Profile income breaks balance or tests**: default the profile equal to today's numbers; add tests per profile.
- **Real-name stock data is challenged once public**: Phase 4 sources the data or keeps clearly "stylised" labelling.
- **Scope creep**: each phase is a separate commit with all tests passing.

## Success Criteria

- Minimum: Phase 1 shipped, with a profile picker and at least 4 new personal beats; `node --test tests/` fully green; a Playwright full run with 0 console errors.
- Full: Phases 1–4 done; every painful moment shows an everyday equivalent; the rank-drop sting and the 65 projection work; data sources documented; the repo is public with the user's yes.

## Quick Start

```bash
cat "plans/handoffs/HANDOFF_standalone-4d377cee_gullak-game_2026-10-10.md"
gh issue view 7 -R RajdevShivam/gullak --comments
# read: gullak/game.js (LIFE, DILEMMAS, beginRound, createGame), gullak/ui.js (title page, startGame), docs/stax-vs-gullak.md
node --test tests/        # expect 26 pass
cd gullak && python -m http.server 5175
# First action: add opts.profile to createGame + rent line in beginRound, with a failing test first in tests/gullak.test.js
```
