# Live public Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the unchanged bank Market with Receiz's whole public showcase collection and real public price/chart projections.

**Architecture:** A bounded fixed-origin proxy serves Receiz's public GET contracts through Vite development and preview middleware. A projection-only catalog parser combines complete public membership with public quotes. The Market uses this catalog independently of account holdings and opens original proof inspection in the existing sheet component.

**Tech Stack:** Existing React, TypeScript, Vite, Node built-ins, Receiz SDK/MCP/AI Skills 129.0.0, Vitest.

**Spec:** docs/superpowers/specs/2026-10-13-live-public-market.md

## Global Constraints

- Preserve the approved bank console and Market layout.
- SDK/MCP/AI Skills remain pinned to 129.0.0.
- Use only Receiz infrastructure and existing dependencies.
- No invented charts, balances, or prices.
- Membership and prices are projections, never authority.
- Selected public objects must never reach the demo trade reducer.

## Review Focus

- A public object is removed: full refresh removes it; failure retains the last successful collection with stale indication.
- Malicious media/verify links: only known public Receiz paths are opened or fetched; no proxy SSRF or arbitrary credential forwarding.
- Quotes change independently: existing catalog updates without replacing account authority or selection identity.
- Thousands of long titles: full search and incremental rendering remain usable on narrow mobile screens.
- Original digest mismatch: exact enclosing verification fails without ownership or balance changes.

### Task 1: Public source transport and catalog

**Files:** server/public-market.ts; src/receiz/public-market.ts; vite.config.ts; tests/public-market.test.ts; tests/public-market-proxy.test.ts.

**Interfaces:** Produces `parsePublicMarket(membership: unknown, snapshot?: unknown): PublicMarketCatalog`, `fetchPublicMarket(signal?: AbortSignal): Promise<PublicMarketCatalog>`, and `publicMarketPlugin(): Plugin`. Catalog has exact IDs, safe public links, nullable projected price/chart, completeness, revision and descriptive observation time. All entries are `authority: 'projection-only'` and `canTrade: false`.

- [ ] Write parser tests for 1,001 items, duplicate IDs, private entries, incomplete membership, unsafe URLs, unknown prices, exact digest preservation, quote joining and removed membership.
- [ ] Run `npm test -- public-market`; expected missing-module failure.
- [ ] Implement bounded exact-contract parser and allowlist proxy, including request coalescing, ETag handling and no credential forwarding.
- [ ] Run parser and proxy tests; expected all pass.
- [ ] Commit `feat: connect complete Receiz public market source`.

### Task 2: Preserve Market UI with live catalog

**Files:** src/features/market/Market.tsx; src/features/market/PublicAssetDetail.tsx; src/receiz/usePublicMarket.ts; src/styles/features.css; tests/live-market.test.tsx.

**Interfaces:** Consumes Task 1's catalog. Produces a Market with independent public selection, refresh/status, whole-catalog search and progressive rows; original verification consumes exact bytes plus source digest through SDK 129.

- [ ] Add mounted tests: 1,001 searchable items, public selection cannot call `commit`, network error cannot seed demo assets, removed membership removes rows, no fabricated chart when no chart exists.
- [ ] Run `npm test -- live-market`; expected assertions fail against old demo Market.
- [ ] Implement live data hook and unchanged featured/search/filter/action/row containers; source sheet uses `Sheet`, `AssetMark`, `ValueChart`, verified original inspection.
- [ ] Run `npm test -- live-market public-market`; expected pass.
- [ ] Commit `feat: show live public showcase objects in bank Market`.

### Task 3: Verify runtime and document remaining live-bank gates

**Files:** docs/live-bank-status.md; README.md; docs/execution-notes.md.

**Interfaces:** Consumes complete integration from Tasks 1–2. Document public Market live qualification separately from unavailable financial account registration/custodian source/execution qualification.

- [ ] Run `npm run typecheck`, `npm test`, `npm run build`; expected pass, known SDK lazy chunk warning allowed.
- [ ] In the browser verify mobile full-catalog load/search, source sheet and failure message; observe actual public collection count and no simulated trade execution.
- [ ] Obtain independent final review, fix important findings with regression evidence.
- [ ] Commit evidence and report actual remaining live-bank boundary. Do not claim the whole bank is live.
