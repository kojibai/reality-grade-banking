# Public Machine Reading Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline, with a fresh review at the end. Track the checks below.

**Goal:** Make existing public content and source evidence readable without running the app, with no app behavior or source-call changes.

**Architecture:** Build static reading pages from existing authored markup and admitted public snapshots. Serve named profiles and exact Originals through a separate, anonymous reading endpoint using the existing public readers. Ordinary app routes retain their current HTML and runtime; only inert alternate-link metadata is added.

**Tech Stack:** Existing TypeScript, Node, Vite build, Happy DOM build-only parsing, Vitest and semantic HTML/text.

**Spec:** [Approved public reading design](../specs/2026-10-31-public-machine-reading.md)

## Global constraints

- No new account permissions, private reads, financial operations or production configuration changes.
- No browser timers, subscriptions, preparation, prefetching or additional app source calls.
- Preserve account entry, all existing interactive UI, prices and proof objects.
- Respect current public refusals, signed-Original profile visibility and paid/private material controls.
- Preserve unrelated ownership work and other developers' changes; commit on main and leave pushing to the user.

## Review focus

- Reader routes must not capture existing valid profile handles or app URLs.
- A private/refused profile or Original must not fall back to stale public snapshots.
- Untrusted public text and links must stay inert, including JSON and Markdown delimiters.
- Observed price/source fields must not be mislabeled as execution terms or fresh valuation results.
- HEAD and ordinary app requests must not perform reader preparation or source reads.

### Task 1: Inert, shared reading documents

**Files:** `server/public-reading-document.ts`, `tests/public-reading-document.test.ts`.

**Interfaces:** `ReadingDocument` carries canonical URL, title, description and semantic body; `renderReadingDocument(document, format)` returns HTML or text. Asset/profile projections consume existing `PublicMarketItem`/`PublicProfile` objects without computing prices or verifying proofs.

- [x] Write tests for complete carried text, observed pricing inputs, proof/material references, escaped hostile content, profile filtering and pagination links.
- [x] Run the tests and observe missing reading functionality.
- [x] Implement bounded explicit public projections and semantic HTML/text output.
- [x] Run the tests; require passing behavior and no mutation of source objects.

### Task 2: Separate anonymous reading route

**Files:** `server/public-reading.ts`, `api/read.ts`, `scripts/build-public-reading.mjs`, `tests/public-reading.test.ts`, `vercel.json`, `scripts/check-server-entrypoints.mjs`.

**Interfaces:** `handlePublicReading(request, dependencies?)` consumes one existing public profile/Original/catalog reader. Routes are `/read/profiles/:username/` and `/read/assets/:asset/`; `/read/` itself remains available as an existing profile handle.

- [x] Write tests for one source read, cheap HEAD, invalid coordinates, 403/404/503 preservation, no fallback, GET-only behavior and text negotiation.
- [x] Observe the expected missing-handler failures, then implement the dedicated route and emitted Node entry.
- [x] Check production rewrite parity and plain Node imports; never alter existing route destinations.

### Task 3: Build-time public pages and discovery

**Files:** `scripts/public-reading-pages.mjs`, `scripts/build-public-pages.mjs`, `tests/public-reading-pages.test.ts`, `public/llms.txt`, `public/robots.txt`.

**Interfaces:** `writePublicReadingPages({outdir,pages,catalog,ledger})` writes inert guide views, a public directory, bounded catalog/Ledger pages and text counterparts. It uses already-loaded build data and the existing public-only Ledger parser once.

- [x] Write tests for no scripts/styles/templates/forms, crawlable asset/owner links, exact public evidence, private-authority rejection and no input mutation.
- [x] Observe failure, implement the build projection and link-only discovery metadata, then rerun tests.
- [x] Include public text/material/price references; do not download media, transcribe content or add missing facts.

### Task 4: Verify and commit

**Files:** verification notes under `docs/verification/`; only this plan's paths staged.

- [x] Compare baseline and candidate app HTML, JS and CSS; ignore only the new alternate-link metadata and machine guides.
- [x] Measure representative reader response sizes and inspect real public text/proof fields without JavaScript.
- [x] Run focused tests, the full suite, typecheck, production build, browser regressions, Vault browser checks and source-archive verification in a clean scoped snapshot.
- [x] Obtain a fresh whole-change review, address findings, and commit on main without pushing.
