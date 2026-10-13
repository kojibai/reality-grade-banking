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

## Current integration

- Native Create / Import Receiz Identity Seal entrance and device-held restoration. Returning users open Account. The routed app does not read or display old demo storage.
- Dedicated Receiz Bank public client `rc_QlCRCxBk8zyT4ajGLrIRPIQd`, read-only wallet/Reserve/Settlement scopes, no client secret.
- Canonical SDK verification/admission, encrypted device custody, signed native read consent, proof-authority exchange and scope inspection.
- Shared account read through `client.connect.wallet()`, the same wallet loader used by Receiz. Exact Reserve, Settlement and total, no second balance, no synthetic account chart. Real deposits on Receiz are reflected by the next successful shared read.
- Live public Market from Receiz's full public showcase collection, real quotes/charts, search, infinite scroll, owner display and exact original-source verification.
- Public Ledger using the same recorded actions, wallet movements, Proof Graph and public showcase sources as Mind Activity, with independent refresh/paging and safe details.
- Personal history only from the opened identity's SDK-verified portable state. Live private additions remain unfinished.

A real user's identity grant, shared-wallet response and reload still need user-operated validation. The bank's custody intake, native transfers, fractional sales, currency issuance and financial recovery are **not yet connected**. Current action sheets expose native Receiz wallet links or an explicit unavailable boundary. Old demo helpers remain solely in unexposed source/test fixtures; they do not process live actions.

All three coordinated Receiz packages remain **129.0.0**. No external provider or dependency was added. Canonical proof resource SHA-256 hashes match the SDK manifest. The service worker caches only the shell/proof resources, never account APIs or financial requests. Private signing material and grant bearers never enter public caches.

Vite dev/preview provide fixed native and public middleware. Static-only hosting requires equivalent Node routes. A production domain/deployment has not been configured. See [live-bank status](docs/live-bank-status.md) for the actual qualification boundary.

## Source and verification

- [Approved design](docs/superpowers/specs/2026-10-12-receiz-bank-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-12-receiz-bank-console.md)
- [Verification record](docs/verification.md)
- [Public Market integration](docs/superpowers/plans/2026-10-13-live-public-market.md)

SDK chunks are lazy-loaded to keep first paint small. Canonical SDK and offline sealing chunks are split and downloaded during offline shell installation.

The test runner is Vitest 5.0.4. A compatible Underscore 1.13.8 override resolves the existing snarkjs transitive advisory while all Receiz packages remain 129.0.0. Package audit reports zero advisories after the update.

Public Ledger source and final-review evidence: [shared-ledger verification](docs/shared-ledger-verification.md).
