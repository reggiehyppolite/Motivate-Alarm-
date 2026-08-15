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
- **AI Smart-Paste** (optional) — Claude parses messy bank text into proposed transactions via structured outputs, deterministically validated before they reach the same confirm queue. Bring your own Anthropic API key: memory-only by default, or stored encrypted (AES-256-GCM + passphrase) on-device
- **Prior Chapter vault** — a soft reset for post-discharge fresh starts: transactions, income, impulses, and means-test months are archived (never deleted) into a viewable, exportable vault; bills, paycheck, cash, and settings carry forward
- **Dating coach** — a conversational coach grounded in a personal playbook (see below)

## Dating coach

A chat coach that works only from a playbook of real material rather than generic advice. Pick the stage you're at — meeting people, profile, first message, texting, intrigue, asking her out, she went quiet, ending it — describe the situation or paste what she wrote, and it gives you a read on what's happening, **one** line to send (copyable, adapted to her actual messages), and the thing to watch for.

How it stays grounded:

- `src/coach/playbook.ts` — the knowledge base: plays tagged by stage, each carrying its source doc and a note on when it backfires, plus always-on principles (1-for-1 texting, match her length, never interview her, close on a high note).
- `src/coach/retrieval.ts` — deterministic keyword scoring picks the handful of plays that match the situation. A play must earn its place on what you described; the stage you're on only re-ranks what already matched, so describing a dead thread from the "first message" tab still surfaces the revival play. Unit-tested, so advice can't quietly drift into generic internet dating advice.
- `src/coach/prompt.ts` — injects those plays verbatim and requires the model to name the play it used, so every suggestion is checkable against the source.

Each reply lists what it "worked from." Uses the same BYO Anthropic key as Smart-Paste — the call goes straight from your device to Anthropic, and the thread is never stored.

### Rebuilding the playbook from an Obsidian vault

The checked-in playbook was transcribed from six shared docs. To regenerate it from your own notes:

```bash
node scripts/import-vault.mjs ~/Obsidian/SecondBrain/Dating > src/coach/playbook.generated.ts
```

It reads optional frontmatter (`stage`, `tags`, `source`, `caution`); without it, the stage is guessed from keywords and tags come from the note's `#hashtags` and title. Review the output, then move `SOURCES` and `PLAYS` into `playbook.ts` — `PRINCIPLES` is hand-maintained.

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests for all money math
npm run build    # production build to dist/
```

Deploys to GitHub Pages via `.github/workflows/deploy.yml`. One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

## Backlog

Trading guardrails (speculative-capital firewall, loss cooldowns), multi-account, device sync, credit-utilization rebuild dashboard.
