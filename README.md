# Gullak 🏺

*A storybook about 20 years of your money.*

Gullak is the clay piggy bank every Indian kid had. In this game you get one: you're 25, it's 2005, and each chapter is a year of your life up to 2024. Every year your savings arrive, life happens (a cousin's wedding, a medical bill, a Diwali bonus, a layoff), the markets do what they actually did, and you decide where the money goes.

At 45 the gullak cracks open. You're ranked against **FD Uncle**, who kept everything in fixed deposits, and **SIP Aunty**, who put every rupee into a Nifty 50 index fund. Then you get three takeaways drawn from your own run.

Inspired by NGPF's [Build Your Stax](https://buildyourstax.com/), re-imagined for India.

## How it plays

- **20 chapters (2005–2024):** split each year's savings across 7 options:

  | Option | What it is |
  |---|---|
  | Savings account | Safe, low return |
  | Fixed deposit | Safe, small penalty if you break it early |
  | PPF | Government savings scheme, locked for 15 years |
  | Nifty 50 index fund | Follows the market |
  | Gold | Tends to rise in a crisis |
  | Hot stock tips | Risky |
  | Crypto | Unlocks in 2014 |

- **Real history:** the 2008 crash, the 2009 rebound, the taper tantrum, demonetisation, the 2017 crypto mania, the COVID crash and recovery, and the crypto winter, using approximate real yearly returns.
- **Life events and the emergency-fund lesson:** if you can't cover an expense, you're forced to sell investments, at a loss if the timing is bad. If that's not enough, the rest goes on a credit card at 18%.
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
node --test tests/
```

## Data note

Market returns are approximate calendar-year figures for Nifty 50 (price), gold in INR and Bitcoin in INR. This is an educational game, not financial advice.

## Built at

A 2-hour Claude hackathon (fun track), 2026-10-10, built with Claude Code.
