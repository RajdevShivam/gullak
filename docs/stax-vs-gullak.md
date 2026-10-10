# Stax vs Gullak

**How claims are tagged.** **[V]** means verified from a source. The best source turned out to be Stax's own config feed ([app-data JSON](https://buildyourstax.com/wp-json/dev-api/v1/app-data/)) and its [app.js bundle](https://buildyourstax.com/wp-content/themes/fat-stax/build/js/app.js), which I read as text. **[I]** means inferred from code or config and not seen in play. I did not watch the YouTube walkthroughs ([Volz](https://www.youtube.com/watch?v=ZN1PgS1WH3U), [Page](https://www.youtube.com/watch?v=xMIMUcXv4qo)).

## 1. How Stax works

- **Clock:** 20 game years in about 20 minutes, in real time. One tick is 5 s (`tick_time: 5000`) and a game year is a draining time bar [V: config, [NGPF blog](https://www.ngpf.org/blog/index-funds/stax-an-investment-game-that-every-high-school-and-college-student-should-play)]. One tick looks like one month, since there are 240 ticks in 20 minutes [I].
- **Income:** "Pocket Cash" refills every 6 months. The yearly income table starts at $4,000, rises about 3% a year and dips in recession years [V].
- **7 investments that unlock over time** [V]. The unlock ticks are: Savings 0, CD 12, Index fund 24, Individual stocks 36, Govt bonds 84, Crop commodity 102, Gold 120. Each unlock pauses the game for a short lesson.
  - **CDs:** terms of 3, 12 or 36 months, with minimums of $250, $500 and $1,000. Cashing out before maturity costs a **10% penalty**, behind a warning ("There is a 10% penalty for collecting early"). A pie timer fills as the CD matures [V].
  - **Bonds:** 1, 5 or 10 years, and they **can't be collected early** [V].
  - **Stocks:** cards with real stocks under hidden names, bought and sold per share ("try to remember what you paid") [V].
  - **Fees:** the bundle has no trading fees, commissions or expense ratios. No "fee" or "commission" strings appear [V, from their absence].
- **Life events ("situations"):** 23 cards, 15 of them costs, from a $150 fencing fee to a **$10,000 lawsuit** and a $7,000 wedding [V]. The chance of a card goes up with every tick since the last one [V: `tickSinceLastSituation*(0.1/12)`]. A cost is only served if it is no bigger than your net worth, so Stax never puts you into debt [V].
- **The pain loop:** a card freezes the game and the only button is "pay with pocket cash". If you're short, the card **shakes**. Pressing "Find Funds" **docks the card and restarts the clock** while you withdraw or sell to raise cash. Deposits and buying are disabled until it's paid [V: code; the felt experience is I].
- **Feedback:** the pig comments on your money ("Oh no! You've got a bad stock!", "That's a lot of pocket cash! Try investing it.") [V]. Market news flashes across the screen [V: blog]. The game uses a sound system (Howler) [V], but I couldn't find which sounds it plays.
- **Class play:** the teacher hosts with a group code and a countdown, and can pause the game. A live leaderboard includes a **computer player that only buys the index fund** [V]. There are 26 achievements [V].
- **Debrief:** "In 20 years, you made…". It shows money received, the impact of life events, earnings, your best and worst investments, and your portfolio next to the computer's. It reveals the real years and stock names, projects your total 20 more years at 6%, and tells you "the computer wins 70% of the time" [V]. A [reflection worksheet](https://docs.google.com/document/d/1zwDZOsxepaRrszBiH7OZfG30PJ5JBIaExMES4GqS67Y/edit) asks about emotions [V: [NGPF](https://ngpf.org/blog/activities/how-to-incorporate-arcade-games-in-the-classroom-stax)].

## 2. Side by side

| | Stax | Gullak |
|---|---|---|
| Time | Real-time clock, 5 s a month | Turn-based years, no timer, plus fast-forward |
| Income | Every 6 months, ~$4k a year | Yearly ₹1.2L, +8% a year, promotions, layoffs |
| Options | 7, unlocked gradually | 6, all open from Year 1 |
| Early-exit cost | CD 10%; bonds fully locked | FD **1%**; PPF locked 15 years |
| Trading fees | None | None |
| Life events | 23 random cards, ramping chance | 8 random events, 4 dilemmas, lottery and its asks |
| When you're short | Leave the card, sell **while the clock runs** | Modal freezes time; one-click sell or card |
| Debt | Never | Credit card at 36%, compounding |
| Showing a loss | Pig quip, red cards, no compulsory review | Red reveal sheet, pot cracks, shake, sad tone, "Locks in a ₹X loss" |
| Rivals | Live classmates + index-fund computer | FD Uncle + SIP Aunty, same seed for friends |
| Debrief | Stats, real years, 6% projection, "computer wins 70%" | Years revealed, ranking, chart, 3 personalised takeaways |

## 3. Gaps, ranked by impact vs effort (about 30 minutes each or less)

1. **Make breaking an FD actually hurt.** High impact, about 5 min. Our 1% is a rounding error, while Stax charges 10%. Raise `FD_PENALTY` in `game.js` to 0.1. Better still, add a maturity date per FD so the penalty only applies early. That touches `sellFor()` and `G.sell()`. Also update the hardcoded `0.99` and "1% penalty" text in `ui.js`'s `showPayup()` and `renderJars()`, and the asset's `f` blurb.
2. **"The market is moving" while you pay.** High impact, about 15 min. In Stax the clock keeps running while you scramble for money. In Gullak, `showPayup()` freezes time. Add a 10 to 15 s countdown bar to `showPayup()` in `ui.js`. If it runs out, call `G.payCard()`, so the bill lands on the 36% card by default. Run the timer with `setInterval` and clear it in `closePayup()`.
3. **Rank-drop sting.** Medium-high impact, about 10 min. Stax's live leaderboard makes being passed sting. In `showReveal()`, compare `rec.nwBefore` and `rec.nwAfter` with `rec.sipAfter` and `rec.fdAfter`. If a rival just passed you, show a red banner ("SIP Aunty just overtook you") and play `sad()`.
4. **Projection and baseline in the debrief.** Medium impact, about 10 min. In `showEnd()`, add the 6% projection: "At 65 this becomes ₹X". Also add one line about how often SIP Aunty wins, for example by running `createGame` for 50 seeds with default allocations.
5. **Life events that ramp up.** Low-medium impact, about 10 min. In `buildSchedule()`, replace the flat `roll < 0.35` with a chance that grows each quiet year, so calm stretches feel ominous.
6. **Idle-cash nag.** Low impact, about 5 min. Stax's pig nags about too much pocket cash. In `voices()` or `renderJars()`, add a quote when Savings makes up more than 50% of holdings.
7. **Lock-the-door friction.** Medium impact, about 25 min. While a bill is unpaid, Stax disables buying. Gullak already blocks with a modal, so this only matters if gap 2 lets players dismiss it.

## 4. What Gullak has that Stax doesn't (for the pitch)

- **Real debt:** a 36% credit card that compounds. Stax never lets you go negative.
- **The loss shown at the moment of sale:** the payup sheet shows the cost basis on every row, "Locks in a ₹X loss".
- **Moral and family dilemmas:** wedding size, car, sister's wedding, Papa's surgery, and a lottery followed by Mama-ji and lifestyle creep that permanently cuts savings.
- **Fear and greed voices** timed against real history, plus the hot-tips slip.
- **Personalised takeaways:** the panic tax, the lottery curse, what the wedding money would have become, the emergency fund.
- **Indian context:** PPF, gold, Nifty 2005–2024 hidden until the end, and the gullak metaphor.
- **Easy to run and share:** offline, a static page with no server or sign-in, the same seed for friends, and fast-forward that stops before crashes.
