# Crypto and NFT Pages Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved plan.

**Goal:** Two useful, visually explanatory entrances for people who already hold crypto or NFTs.

**Architecture:** Add one public content catalog, static template, coded art and page-only CSS. Compose existing build, metadata, alias, footer and native public Twin context paths. No new financial or identity authority.

**Tech Stack:** Existing JavaScript/TypeScript, static HTML, CSS, SVG, Vitest and Vite.

**Spec:** `docs/superpowers/specs/2026-10-26-crypto-nft-pages-design.md`.

## Global constraints

No new dependencies, shared JS, account-entry changes or financial writes. Logo-led white/cobalt/glass styling; price-free social art. Core use is separate from optional Business. All previous suites and old routes remain available. Work is on Bankeiz main as explicitly requested.

## Review focus

- A proof snapshot must not be advertised as token custody, current ownership, a completed transfer or universal offline spending.
- `/nft/` must resolve to `/nfts/`, while `/u/nft/`, `/u/nfts/` and `/u/crypto/` remain profiles.
- Every repeated CTA resolves the actual conversation again; no new public thread/history or cold request.
- SVG identities stay unique across multiple scenes, mobile objects remain in bounds and reduced motion keeps the entire story visible.
- Carried navigation preserves the account, exact page CSS, canonical metadata and correct native conversation context.

## Task 1: Complete holder-facing page suite

- [x] Write failing page, art, discovery, alias, hosting and exact native-context contracts in `tests/portability-pages.test.ts` and `tests/portability-context.test.ts`. Expected: missing modules / routes fail before implementation.
- [x] Add `src/content/portability-pages.mjs`, `scripts/portability-page.mjs`, `scripts/portability-art.mjs`, their type declarations and `public/learn/portability.css`; reuse the existing conversation and motion observer.
- [x] Wire static page build, metadata, unique social cards, native page context, offline routing, preview/hosting and profile-name reservation. Add footer and contextual discovery. Expected: both page contracts pass and older routes remain valid.
- [x] Generate share PNGs; run typecheck, focused contracts, full suite and complete build. Expected: exact metadata/archive/offline gates pass and shared presentation stays within 15,000 gzip bytes.
- [x] Inspect both pages in desktop/mobile browser layouts, repeated CTAs and the shared Twin composer without production sends. Save visual evidence. Expected: no clipping, header overlap, extra form or unwanted account action.
- [x] Get one independent final review under the requesting-code-review skill; fix important findings, verify and commit only owned files on main. Expected: tracked work is committed and unrelated files unchanged.

## Execution ledger

Approved framing and direct-main destination are supplied by the user. External API research is unnecessary: existing repo implementation supplies the relevant mechanics and product boundaries.

Task 1: verification complete. The two new module contracts failed before implementation; extracted share transparency failed before correction. Final focused suite: 9/9; full suite: 554 files and 3,500 tests. TypeScript and complete production build passed; exact archive is refreshed after this validation record. Browser and independent review evidence is recorded in `docs/validation/2026-10-26-crypto-nft-pages.md`.

Final review: no Critical/Important findings and no deferred minors. Final: Ruling: deployed wallet/AI/financial execution was not exercised — local synthetic conversation checks and repo-bound implementation evidence are the authorized scope; wrong deployment configuration remains a deployment verification boundary.
