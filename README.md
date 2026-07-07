# Forward Focus

An ADHD-friendly financial dashboard that acts like an external executive function: it answers the same three questions in under ten seconds, makes future consequences visible before the impulse wins, and surfaces exactly **one** next action.

Built as a mobile-first PWA. **All data stays on your device** (IndexedDB) — no account, no server, no analytics. Back up with an encrypted export (AES-256-GCM, passphrase never stored).

## The five behavioral rules

1. Externalize memory and future consequences
2. Minimize manual categorization and repeated decisions
3. Surface one next action, not many
4. Separate household stability from speculative risk
5. Reduce shame without hiding reality

## What's in v1

- **Home** — Safe-to-Spend (cash − bills before payday − buffer floor − savings goal), Bills Runway with coverage simulation, and the One Next Move card
- **Impulse Interceptor** — amount → annualized cost → impact on safe-to-spend → *Wait 24h / Buy it / Skip it*, with a running "money kept" total
- **Chapter 7 Means-Test Screener** — Form 122A-1 logic: 6 full calendar months of gross income, annualized, vs. the state median (Colorado 1-person preloaded; always verify at [justice.gov/ust/means-testing](https://www.justice.gov/ust/means-testing)). **Screening estimate only — not legal advice.**
- **Money** — cash on hand, base paycheck, income logging, bills with autopay flags, a deterministic Paste Inbox (parsed transactions land in a confirm queue — nothing commits silently), settings, and encrypted backup

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests for all money math
npm run build    # production build to dist/
```

Deploys to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

## v2 backlog

Trading guardrails (speculative-capital firewall, loss cooldowns), LLM-assisted Smart-Paste, multi-account, device sync, "Prior Chapter" soft-reset vault, credit-utilization rebuild dashboard.
