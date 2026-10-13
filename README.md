# Receiz Bank

A mobile banking console for holding and using value through Receiz proof objects. One account view, central Send / Receive actions, and persistent Account, Market, Deposit, Assets and Ledger navigation.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173. Production PWA:

```sh
npm test
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open http://127.0.0.1:4173. Install through your browser's Install / Add to Home Screen action. The production service worker retains the shell and verifier chunks; it never replays financial API calls. Updates wait for existing clients: close all Receiz app tabs and reopen to activate a waiting build.

## What works

- Persistent, responsive single-page console, charts, categories/search, action sheets and shareable asset references.
- Live public Market discovery from Receiz's complete public showcase collection, with real public quotes/charts, whole-collection search and original source inspection. The saved public feed contains 1,678 actual objects and refreshes while Market is visible.
- Explicit local Demo account: custody deposits, exact whole/fractional ownership, Reserve and Settlement, sale to the bank or simulated market buyer, buy-back, ownership transfer, full-ownership redemption, exchange, currency backing and draft allocation rules.
- Custody creates no cash. A deposit preserves its owned quantity; a funded sale exchanges the chosen quantity for value. Held asset value appears once in the total, separately from liquid rails.
- Local demo state restores after reload; semantic operation IDs prevent duplicate application. Profile provides Reset demonstration account.
- Actual `@receiz/sdk@129.0.0` original-byte `verifyReceizArtifact` integration. A verified artifact alone grants neither value credit nor ownership.
- Live public Ledger combining the same actions, wallet movements, Proof Graph and public showcase sources as Receiz Mind Activity. Retained real capture plus live additions, independent source coverage, infinite scrolling and safe source inspection. My history stays separate from global/demo data.
- Actual `client.wallet.publicLedger` read adapter. SDK projection is labeled separately from enclosing proof verification; a failed read retains existing history.
- Cryptographic aliases by default, with explicit demo username consent.
- External Settlement support is assessed at the receiving institution. An unqualified destination is unavailable without changing the source balance.

## Demo and live boundaries

Account balances, holdings, growth, deposits, currency creation and financial actions remain **demonstration data**. Public Market discovery, prices and charts come from actual Receiz public feeds and stay separate from account authority. Public objects cannot be purchased through the demo reducer. Demo account display uses exact BigInt Phi micro-units at an explicitly described 1 Phi = $1 basis. No real funds, assets, custody, issuance, delegation or public publication are performed.

Coordinated packages are pinned to **129.0.0**: `@receiz/sdk`, `@receiz/mcp-server`, `@receiz/ai-skills`. MCP and AI skills are installed for trusted-host integration and stay out of the browser bundle. The existing connected MCP host reported compatibility `>=128.0.0 <129.0.0`; package installation does not upgrade or qualify that host. The restricted marketplace profile is not used to execute financial actions.

Real execution requires a dedicated registered application, device-held identity and consent, exact admitted source contracts, custody/title evidence, genuine Reserve/Settlement funding, funded bank or market quotes, and qualified receiving routes. Currency issuance, backing, redemption and bridges require sealed supply/ownership terms and continuity without duplicate spendable value. Draft rules require admitted mandates before activation. Secrets never belong in frontend configuration. The [live-bank status](docs/live-bank-status.md) records what is actually connected and what remains unfinished.

The Market uses a bounded same-origin public GET proxy in Vite development and preview; a static-only deployment must provide equivalent Node middleware for `/api/bank/public-market/*` and `/api/bank/public-network`. Refreshes never forward private cookies or bearer tokens. The separate legacy public wallet-ledger adapter had a browser CORS failure during earlier verification. The canonical verifier passed actual rejection tests; browser upload remains unverified.

Refresh the dated public discovery seed with `npm run market:seed` (Node.js 22.18+ or 24+). It reads Receiz public data, preserves its observation date, and grants no ownership or financial authority.

## Source and verification

- [Approved design](docs/superpowers/specs/2026-10-12-receiz-bank-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-12-receiz-bank-console.md)
- [Verification record](docs/verification.md)
- [Public Market integration](docs/superpowers/plans/2026-10-13-live-public-market.md)

SDK chunks are lazy-loaded to keep first paint small. The native SDK chunk triggers Vite's size warning; production offline installation downloads these chunks in the background.

The test runner is Vitest 5.0.4. A compatible Underscore 1.13.8 override resolves the existing snarkjs transitive advisory while all Receiz packages remain 129.0.0. Package audit reports zero advisories after the update.

Public Ledger source and final-review evidence: [shared-ledger verification](docs/shared-ledger-verification.md).
