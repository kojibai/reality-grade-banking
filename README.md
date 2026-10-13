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
- Explicit local Demo account: custody deposits, exact whole/fractional ownership, Reserve and Settlement, sale to the bank or simulated market buyer, buy-back, ownership transfer, full-ownership redemption, exchange, currency backing and draft allocation rules.
- Custody creates no cash. A deposit preserves its owned quantity; a funded sale exchanges the chosen quantity for value. Held asset value appears once in the total, separately from liquid rails.
- Local demo state restores after reload; semantic operation IDs prevent duplicate application. Profile provides Reset demonstration account.
- Actual `@receiz/sdk@129.0.0` original-byte `verifyReceizArtifact` integration. A verified artifact alone grants neither value credit nor ownership.
- Actual `client.wallet.publicLedger` read adapter. SDK projection is labeled separately from enclosing proof verification; a failed read retains existing history.
- Cryptographic aliases by default, with explicit demo username consent.
- External Settlement support is assessed at the receiving institution. An unqualified destination is unavailable without changing the source balance.

## Demo and live boundaries

All money, prices, charts, growth, holdings, receipts and financial actions in this account are **demonstration data**. Demo display uses exact BigInt Phi micro-units at an explicitly described 1 Phi = $1 basis. No real funds, assets, custody, issuance, delegation or public publication are performed. Market sales simulate a funded counterparty; no real order book or buyer is connected.

Coordinated packages are pinned to **129.0.0**: `@receiz/sdk`, `@receiz/mcp-server`, `@receiz/ai-skills`. MCP and AI skills are installed for trusted-host integration and stay out of the browser bundle. The existing connected MCP host reported compatibility `>=128.0.0 <129.0.0`; package installation does not upgrade or qualify that host. The restricted marketplace profile is not used to execute financial actions.

Real execution requires a registered application, device-held identity and consent, exact admitted source contracts, custody/title and authentication processes, funded bank or market quotes, fiat provider completion evidence, and qualified receiving routes. Currency issuance, backing, redemption and bridges require sealed supply/ownership terms and continuity without duplicate spendable value. Draft rules require admitted mandates before activation. Secrets never belong in frontend configuration.

The live public read failed with `Failed to fetch` in the local browser during verification; success from this origin is not established. Deployment may require an authorized same-origin backend read route. The canonical verifier passed actual rejection tests. Browser file selection stalled, so an end-to-end browser upload was not verified.

## Source and verification

- [Approved design](docs/superpowers/specs/2026-10-12-receiz-bank-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-12-receiz-bank-console.md)
- [Verification record](docs/verification.md)

SDK chunks are lazy-loaded to keep first paint small. The native SDK chunk triggers Vite's size warning; production offline installation downloads these chunks in the background.

The test runner is Vitest 5.0.4. A compatible Underscore 1.13.8 override resolves the existing snarkjs transitive advisory while all Receiz packages remain 129.0.0. Package audit reports zero advisories after the update.
