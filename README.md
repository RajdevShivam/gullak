# Gullak 🏺

*A storybook about 20 years of your money.*

![A chapter of Gullak: the ledger page with each investment's return, a forwarded hot tip and the fear/greed gauge](gullak/shot-chapter.png)

Gullak is the clay piggy bank every Indian kid had. In this game you get one: you're 25, and each chapter is a year of your life: twenty years in all. The years are hidden (just Year 1 to Year 20), so you can't game history you remember. It's revealed at the end. Every year your savings arrive, life happens (a cousin's wedding, a medical bill, a Diwali bonus, a layoff), the markets do what they actually did, and you decide where the money goes.

At 45 the gullak cracks open. You're ranked against **FD Uncle**, who kept everything in fixed deposits, and **SIP Aunty**, who put every rupee into a Nifty 50 index fund. Then you get three takeaways drawn from your own run.

Inspired by NGPF's [Build Your Stax](https://buildyourstax.com/), re-imagined for India.

**Play it:** https://shivamrajdev.com/gullak/ (about 10–15 minutes). Same 20 years as a friend: add `?seed=42`.

## How it plays

- **Your life, your city:** pick a city (Mumbai, Bengaluru, Delhi or a small town) and a first job (IT, government, startup or family business). Big cities pay more and charge rent that rises every year; government jobs never lay you off; startups pay most but can fold. Personal beats land in the quiet years: Mummy's gold fund, a flat deposit, school fees, Papa retiring with no pension.
- **20 chapters (Year 1 to Year 20):** split each year's new savings across the jars (money already in a jar stays put):

  | Option | What it is |
  |---|---|
  | Savings account | Safe, low return |
  | Fixed deposit | Safe, but breaking it early costs 10% |
  | PPF | Government savings scheme, locked for 15 years |
  | Nifty 50 index fund | Follows the market |
  | Gold | Tends to rise in a crisis |
  | Stock tips A, B, C | Single stocks forwarded on WhatsApp, names hidden. A is there from Year 1, B arrives in Year 4, C in Year 8. Revealed at the end |

- **Real history, in disguise:** the markets follow what actually happened in India from 2005 to 2024, using approximate real yearly returns. The news cards hint at events without naming them, and the end screen reveals which 20 years you just lived.
- **Bills you have to pay, now:** when an expense is bigger than this year's savings, a bill pops up. Each investment shows what selling it does ("Locks in a ₹30,470 loss", "Cashes ₹43,400 of profit… and pays tax", "10% penalty"). Sell, or put it all on the credit card at 36% a year and continue.
- **One simple tax rule:** 10% of the profit when you sell shares, stock tips or gold. Savings, FD and PPF are never taxed here.
- **A clock, if you want one:** 45 seconds per decision, per year and per bill. Run out and you get the usual choice, your current split, or the card. Pick "No timer, let me think" on the title page (or tap it next to any clock) to play at your own pace.
- **Family decisions you can't dodge:** your own wedding (big fat, respectable or court marriage), the car, your sister's wedding, Papa's surgery. If you can't afford it, choose: sell investments, or swipe the credit card at 36% a year.
- **The lottery:** you win the Diwali bumper, minus 31.2% tax. Then Mama-ji's business idea, forty new cousins, and a lifestyle upgrade that eats your savings forever arrive.
- **Fear and greed:** Sharma-ji (15 years in the market), Arvind on TV, Kavya the full-time trader and WhatsApp-forward hot tips all comment on the asset you're looking at. They're timed against real history, so the panic calls land before rebounds.
- **⏩ Fast-forward:** skip up to 5 years with a recap. It stops before big market events so you can react.
- **Same seed, same 20 years:** add `?seed=42` to the URL so friends play the identical game.

## Run it

No build step, no backend, no API keys.

```bash
cd gullak && python -m http.server 5175
```

Then open http://localhost:5175.

## Tests

```bash
node --test tests/          # 33 rule tests, incl. a money-conservation audit over 60 random games (no dependencies)
npm install && npx playwright test   # 2 browser tests: a full game through the real UI, bills and timers (uses installed Chrome)
```

## Publish

The live copy is served from the portfolio-website repo, so pushing this repo does **not** update the site. Run:

```bash
scripts/deploy-site.sh      # tests, copies gullak/ into the site's public/gullak/, pushes, waits until live
```

## Data note

Market returns are approximate calendar-year figures for Nifty 50 (price) and gold in INR, written from memory during the hackathon and not yet checked against a primary source. The three stock tips are stylised: they follow the real story of each company, not its exact prices, and the end screen says so. This is an educational game, not financial advice.

## Built at

A 2-hour Claude hackathon (fun track), 2026-10-10, built with Claude Code.
