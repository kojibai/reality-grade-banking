# Real product walkthroughs · 2026-10-26

## Scope

Bankeiz main (`/Users/bjklock/Kai-Turah/bank`). `/action/` is the canonical Business-in-action document; `/in-action/` remains an alias. `/banking/` is the separate core banking journey. Actual UI moments also clarify Business, all 30 audience fits, Your Twin, Your agent and Vaults. Existing code-driven illustrations, public Twin conversations and the exact Business upgrade destination remain.

The walkthrough statically renders `Entrance`, `ConsoleShell`, `LiveAccount`, `BalanceChart`, `LiveDeposit`, `LiveReceive`, `LiveSend`, `LedgerInspector`, `VaultExperience`, and the unchanged production message composer/typing/message components. It is an inert, explicitly labeled illustration with example data. It never creates or admits identity, funds, custody, proof, booking or model responses. The actual BJ Twin remains outside the example boundary. The receiving example QR targets `https://example.invalid/`.

Source-derived CSS is scoped to `.product-screen`; SVG/ARIA IDs are instance-local. Page-only illustration code has no transport or financial API. The existing shared public-navigation script is unchanged. Real-component HTML and CSS are carried with retained navigation; no React/account runtime is fetched to paint these examples. Mobile places each screen directly beneath its step controls. Reduced motion keeps the full static conversation legible.

## Evidence

- `npm run build`: passed the complete production script, including TypeScript, exact previews, canonical/social metadata, static pages, source/archive, licensing, offline-shell, conformance import boundary and checkout boundary gates. 148 canonical social images; 307 exact offline resources.
- `npx vitest run --maxWorkers=3`: 555 files, 3,520 tests passed on the final source state.
- Focused route, preview, keyboard, repeat-selection, source/ID/CSS, example animation, cold-agent and checkout contracts passed.
- Independent read-only review: no remaining Critical or Important findings. Fixed cold `/agent/` example placement and added a regression contract.
- Browser: actual source fixture inspected; `/action/` desktop and 320px mobile and `/banking/` 390px mobile inspected. No horizontal overflow at checked widths. Account/Vault selection and exact existing checkout links confirmed. No payment, model, booking, custody or identity mutation was performed.
- Browser evidence: `/private/tmp/bankeiz-product-source-capture.png`, `/private/tmp/bankeiz-banking-mobile-full.png`, `/private/tmp/bankeiz-banking-mobile.png`, `/private/tmp/bankeiz-action-mobile-full.png`.
- Sharing PNGs inspected after correcting unsupported WebP embedding. Actual UI captures, no price, explicit example label. Stored screenshot sources are documented in `scripts/social/screens/README.md`.
- `git diff --check`: passed.

## Environment and boundaries

The untracked pnpm lockfile auto-installed React 19.3.1, while the committed npm lockfile pins 19.3.0. Restored dependencies with `npm ci --ignore-scripts --offline --no-audit --fund=false` and ran the identical production script through `npm run build`; no dependency manifest or committed lockfile version was changed. The untracked pnpm lockfile and other agents' native/runtime/output changes are excluded from this commit.

No push/deploy or live financial/model/booking operation. No stronger artifact, custody, identity or financial truth was replaced by example/UI/server/session state. The later request for a live two-path crypto/NFT/fiat upgrade and private proof frontend is a separate pending implementation; this commit does not claim that external-asset custody integration exists.
