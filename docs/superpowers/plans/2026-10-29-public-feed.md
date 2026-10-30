# Public Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans; implement inline, followed by one independent whole-change review.

**Goal:** Ship `/feed/` as a full-screen, lightweight discovery and engagement surface for existing public proof objects.
**Architecture:** A dedicated retained public runtime renders carried source rows before network work. Existing readers, public media roles, purchase portal and hosted checkout provide the deeper actions. Virtualized native scroll limits active work.
**Tech Stack:** Existing React/Vite/TypeScript, native media, Lucide, existing Receiz SDK/BFF only.
**Spec:** `docs/superpowers/specs/2026-10-29-feed-design.md` and approved chat images.

## Global constraints / preflight
- Primitive affected: public proof, media, provenance, ownership and payment presentation.
- Source of truth: existing Originals and their public projections; existing canonical readers and existing financial execution routes.
- Stronger/weaker risk: a feed item is presentation, never ownership, verification or spending authority. No new authority layer.
- First-paint risk: render real carried rows with inline CSS; no membership, quote, identity or verifier round trip before paint.
- External convention: native browser scrolling/media only. No outside product authority or dependencies.
- Account entry and existing trading/settlement behavior remain unchanged; unrelated main/dirty work is preserved.
- Exact uncertainty: rendered gesture/layout behavior and existing payment/purchase composition require tests and browser evidence.

## Review focus
- An image-less or extremely long moment remains beautiful and readable, with the exact source words available in its full view.
- Rapid swipes, hidden tabs and modal actions cannot leave multiple audible/video sessions or stale requests active.
- Returning from readers, profiles and asset pages retains the same feed item and scroll position.
- Paid/private media, unsigned objects and sports objects retain existing visibility, source and purchase boundaries.
- Slow/offline public discovery cannot erase or replace the real carried initial stage.

### Task 1: source and ordering
Files: `src/public-feed/feed-items.ts`, `feed-source.ts`, `tests/public-feed-source.test.ts`.
- [x] RED: all content families, exact moment text, stable unique diverse order, append-only rows, safe initial seed, coalesced source read; no quotes/identity calls.
- [x] Implement `feedKind`, `feedText`, `orderFeedItems`, `appendFeedItems`, `readFeedSeed`, `prepareFeedItems` using existing public parser/reader.
- [x] GREEN focused tests; record result.

### Task 2: immersive stage and readers/actions
Files: `PublicFeed.tsx`, `FeedStage.tsx`, `FeedPlayback.tsx`, `FeedExperience.tsx`, `FeedPayment.tsx`, `feed.css`; tests `public-feed.test.tsx`.
- [x] RED: This happened, bounded mounted window, hide/reveal, exact purchase intent, canonical share/asset links, payment recipient, pause on inactive/panel; no network during render.
- [x] Implement native snap scrolling and accessible overlays; reuse existing readers/payment/purchase primitives lazily after intent.
- [x] GREEN focused tests and types.

### Task 3: direct entry and retained navigation
Files: `feed/index.html`, `src/public-feed/main.tsx`, `vite.config.ts`, `src/core/public-runtime.ts`, `scripts/build-public-pages.mjs`, `scripts/public-runtime-document.mjs`, `src/core/asset-return.ts`.
- [x] Add dedicated entry, real source SSR/seed, inline emitted styles and async entry. Reuse existing compact navigation with a lean feed-specific bundle instead of marketing/example payloads.
- [x] Pin built first paint, import boundaries, entry size, account/purchase host and return route in tests/build checks.

### Task 4: verify and integrate
- [x] Browser: mobile 320/390, tablet/desktop and landscape; swipe, moment/text, audio/video, essay/book/PDF/image, hide/show, filters, payment/purchase opening and back/close. No real financial submission in QA.
- [x] Full production build and complete tests sequentially; account-entry freeze where identity composition applies.
- [x] Fresh independent source review; fix material findings with regression tests.
- [ ] Scoped commit on current Bankeiz main; verify all original dirty bytes retained. No native DB migration or deployment.

## Verification ledger
- Source/UI/payment/playback/import boundaries: 24 focused tests passed; TypeScript passed. RED/GREEN logs retained in the isolated verification directory.
- Browser: real source count 1,679; bounded mounted neighborhood; actual video autoplay muted and source swap; actual music play/pause; verified 53,699-character essay; verified 633-page EPUB; verified 53-page PDF; 320px/390px/tablet/desktop/landscape geometry inspected.
- Visual correction: atmospheric overflow allowed focus restoration to move the header by 34px. Stage now clips without becoming a scroll container. Browser confirms header at 23px and internal scroll zero. Book plus long-form text opens the actual media reader, retaining its separate carried-text action.
- Final review: one independent read-only review found three Important issues. Fixed with regression tests RED→GREEN: complete Original source exposed alongside legacy carried excerpts; reserved system routes use the existing shared profile route names instead of being inferred as usernames in lean navigation; both /feed and /feed/ return as Feed. No new proof/identity/financial authority.
- Ruling: carried source words remain exact; legacy truncated public summaries are identified as carried excerpts and link to the already-existing complete canonical Original. A public projection does not claim to contain source words it does not carry. Cost if wrong: the existing canonical Original may be unavailable; no invented text or weakened verifier is substituted.
- Ruling: Feed uses the existing shipped public market projection after its carried first paint, coalesced once. Live Refresh is explicit. Cost if wrong: new hosted additions appear after explicit refresh; known verified content is never replaced by a thinner refresh.
- Ruling: the dedicated Feed root matches the existing dedicated Checkout lifetime rather than replaying it under StrictMode; identity session disposal remains unchanged. Cost if wrong: integration relies on the existing Checkout session lifecycle, covered by its tests and account-entry freeze.
- Existing verified-media modal behavior is reused; stage visibility cleanup is verified. Hidden-tab playback inside an explicitly opened media modal is not newly changed by Feed.
- Full production build passed; complete suite 4,560 tests / 737 files passed; native account-entry freeze 57/57 passed. No live payment or ownership submission during browser QA.

- Final video screenshot exposed the initial swipe prompt overlapping transport. Removed the redundant prompt on video; regression test failed before the fix and passed after it. Final validation rerun includes this visual correction.
