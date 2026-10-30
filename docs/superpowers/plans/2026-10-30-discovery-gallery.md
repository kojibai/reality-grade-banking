# Discovery Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the selected mobile discovery gallery over existing public proof objects.
**Architecture:** A small public runtime renders source-bound HTML, hydrates the same gallery, and uses the existing coalesced Feed source for further discovery. Its display index and views compose current Feed and Bank actions without another authority.
**Tech Stack:** Existing React, TypeScript, Vite, lucide-react, public navigation and Sheet.
**Spec:** docs/superpowers/specs/2026-10-30-discovery-gallery.md

## Global Constraints
- /discover/; no new dependencies, DB, migration, account-entry or money rules.
- Real source content only; exact selected visual hierarchy and existing brand assets.
- Source-bound first paint; no hosted quote/account waits, polling or query calls.
- Preserve main head and every unrelated dirty file; commit only owned paths.

## Review Focus
- Unsafe creator/artwork inputs stay subject to current public parsers.
- Mixed text, books, video and documents remain legible with their correct viewing paths.
- Selected work opens first; closing/reopening and hidden runtimes preserve continuity.
- Search/category changes update works and people without network requests.
- 375px mobile, keyboard, safe area, desktop, production/offline entry remain functional.

### Task 1: Source index and gallery
**Files:** Create src/public-discover/{discovery-index.ts,Discover.tsx,discover.css,main.tsx}, tests/public-discover.test.tsx, tests/discovery-index.test.ts.
**Interfaces:** buildDiscoveryIndex(items) and searchDiscovery(index,query,filter) return public rows/creators only. Discover consumes seed:PublicMarketItem[],active:boolean; emits existing viewer actions.
- [x] Write/run meaningful source-search and no-authority contracts RED.
- [x] Implement pure index, real-media gallery, local search/filter/people and bounded continuation.
- [x] Run contracts GREEN and inspect mobile layout against approved image.

### Task 2: Existing viewer and public routing
**Files:** Extend MarketFeedPopover.tsx selectedItemId; scoped PublicFeed trade pathname; create discover/index.html, scripts/discover-page.mjs and declarations; wire Vite/build/public-runtime/public reservation/offline/Vercel and metadata; add restrained entry links to Market/Explorer/Feed.
**Interfaces:** selectedItemId?:string retains current default when absent. Existing first-paint render/apply helpers produce matching seed and HTML for new runtime discover.
- [x] Test exact selected media, safe close, local query, SSR seed, route and action reuse RED.
- [x] Implement scoped composition; regenerate canonical social output for new route.
- [x] Run focused routing/viewer tests GREEN.

### Task 3: Verification and main integration
**Files:** verification report/design-qa.md plus exact owned patch.
- [x] Production build, complete Bank suite, generated source checks, browser search/filter/media/close/navigation and mobile/desktop geometry.
- [x] Compare approved visual with implementation side-by-side; fix actionable differences and record evidence.
- [x] Inspect exact owned diff, recheck protected dirty bytes, apply and commit on current main without reset/rebase/push.
