# Gullak theme directions

Three minimal directions were explored. The user picked **bahi-khata ledger**, and it is now applied to `gullak/`. The other two are kept as rough static mockups and were not polished further.

## 1. Editorial / newspaper (`editorial/index.html`, mockup only)
Off-white paper `#F7F6F3`, ink `#111111`, secondary `#787774`, hairlines `#EAEAEA`, one accent terracotta `#A8361C`. Gains are `#346538` on `#EDF3EC` and losses are `#9F2F2D` on `#FDEBEC`. Type is Newsreader (headlines, story, pull-quotes) with Libre Franklin (labels). The page is a masthead with a double rule, a dateline holding the year beads, a drop cap, a 112px serif loss figure on a red tint, and the market table as hairline rows with underlined "Sell half" / "Sell all" links. It has no cards and no shadows.

## 2. Swiss / brutalist (`swiss/index.html`, mockup only)
White `#FFFFFF`, ink `#0B0B0B`, grey `#7A7A7A`, rules `#E2E2E2`, gain `#00873E`, loss `#E3120B`. It uses one typeface, Schibsted Grotesk, on a 12-column grid. A full-bleed red block holds a 168px "−₹2.1 L", P&L cells are solid green or red blocks with white numbers, and the gauge is a 10-segment bar. This mockup predates the taste rules, so its palette is not yet aligned with them.

## 3. Bahi-khata ledger (applied to `gullak/`)
- **Palette:** cream paper `#F4EDDC` / `#FBF7EC`, ink `#2B2A26`, secondary `#787268`, ruling `#E9E0CC` and `#E6DCC6`, and the one accent, ledger red `#9E2B25` (dark `#7A1F1A`). Gains are `#346538` on `#EDF3EC` and losses are `#9F2F2D` on `#FDEBEC`.
- **Fonts:**
  - Kalam (Indian handwritten) for headings, character names and margin notes.
  - Newsreader for story text and pull-quotes.
  - IBM Plex Mono for every ₹ figure.
- **Key moves:**
  - Ruled paper with a double red margin line.
  - A red cloth-bound header strip.
  - A "॥ शुभ लाभ ॥" title page.
  - A flat SVG gullak drawn in red clay with ink outlines and cream coins.
  - The fear/greed gauge as a tick scale.
  - Assets as ledger rows with mono codes (SB, FD, PF, N50, AU, HT, RC) instead of emoji.
  - Characters as pull-quotes with squircle monograms.
  - Gains and losses are the only loud moments. Losses get a 64px serif figure on a red tint, a red frame flash, a shaking sheet and a cracking pot.

## Taste audit of the old `gullak/` (before → fix)
| Generic pattern | Fix |
|---|---|
| Radial-gradient page background, gradient pot, gradient gauge, gradient coins | Flat fills only, with a subtle SVG grain and ruled lines |
| `--shadow` on every card and pot glow `drop-shadow` | No shadows. Hairlines (`#D9CDB2` / `#E6DCC6`) and double rules instead |
| 14–24px radii, pill chips and pill buttons (`99px`) | 3–6px radii. Chips are 3px tags, sell buttons are underlined text links |
| Emoji in chrome (asset icons, rivals, buttons, records, takeaways, cast avatars, ⏩, 🪙, 🔨) | Mono asset codes, squircle monograms, roman-numeral takeaways, plain-text buttons |
| Chat-bubble quote cards with coloured fills | Pull-quotes with a left rule (red = fear, green = greed, grey = taunt) |
| Nunito plus several warm accents (terra, marigold, green) | One accent (ledger red). Mixbar and inside-bar use ink shades |
| All-caps letter-spaced kickers | Sentence-case handwritten kickers |
| Quotes and the "last year" chip strip far from the sliders | Everything about an asset sits on its own row |

## What changed in `gullak/`
- **`style.css`:** fully rewritten for the ledger theme.
- **`index.html`:**
  - Font link changed to Kalam, Newsreader and IBM Plex Mono.
  - Added a `.shubh` line on the title page.
  - Added `<div class="taunts" id="taunt">` under the header.
  - Removed the emoji from the replay button.
- **`ui.js`** (UI only; `game.js` untouched):
  - Flat pot SVG; glow removed.
  - Gauge is now a scale.
  - `CODE` / `COL` maps replace `a.i` / `a.c`.
  - Cast emoji replaced by monograms.
  - Quotes are tagged with an asset key and rendered inside that row (`.rownotes`). Taunts go in `#taunt`.
  - The separate quote area and the last-year chip strip are removed.
- **Hot tips (also in `ui.js`):**
  - A seeded pool of 12 forwarded tips (`TIPS`), shown as a taped slip on the Hot tips row.
  - An outcome line whose sign follows that year's hot-tips return, shown on the row and in the reveal.
- **Family decisions (also in `ui.js`):**
  - A decision view (`.jars.decide`) shows option rows with the cost and a pulsing "You'll have to sell ₹X" warning taken from `previewChoice`.
  - After a choice: a consequence note and a stamped "FORCED SALE" box.
  - Decisions also appear in the fast-forward recap and the end-screen year list.
- **Paying for a decision (also in `ui.js`):**
  - When an option has a shortfall, a second step asks how to pay: sell investments (with a preview of what would be sold) or swipe the credit card at `DEBT_RATE`.
  - While there is debt, a credit-card row stays in the header.
  - Each year's reveal shows "Interest charged".
- **Chart:** ink and grey lines, red for the player, dashed FD Uncle, no fill.

Screenshots of the old build are in `bahikhata/before/`.

## Site theme (current)
`gullak/` now uses the shivamrajdev.com palette instead of the ledger theme: white / near-black surfaces, the site blue accent, system fonts, 8-12px radii, and a slim site bar with a theme toggle. It reads the site's saved `theme` from localStorage (else the OS setting) and sets `html[data-theme]`. The old ledger look is in git history (before this change).
