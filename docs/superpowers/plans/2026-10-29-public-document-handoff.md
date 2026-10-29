# Public document handoff implementation plan

> Use superpowers:executing-plans, test-driven-development and verification-before-completion. One fresh final review after implementation.

**Goal:** Make the existing asset, receipt, Explore/category/global-cap, Ledger, verification and conformance runtimes usable before unrelated trailing navigation data completes, preserving their exact source, artwork, controls and continuity.
**Architecture:** Reuse the implemented profile readiness primitive as one shared mechanical document-readiness helper. An asynchronous public module may start only after its complete root and following navigation element exist. Keep profile-specific complete-seed admission. Carry the same digest-checked receipt before that element. Deliver existing asset/profile metadata to the existing navigation listener after it is installed; never rediscover source. Preserve the complete navigation catalog and explicit-navigation behavior.
**Spec:** User approved this exact scoped latency reduction in this chat. Content, artwork, controls and behavior stay the same. Account entry, booking, actual meeting rooms, Pay, custody, pricing and monetary execution are excluded.

## Preflight
- Primitive affected: public proof, ownership, receipt, verification, deterministic first paint and visible continuity.
- Source: existing carried asset/profile/receipt and existing held public source readers. A display projection never becomes spending or ownership authority.
- Baseline: Bankeiz main `579a21067bd405563052cf4129838cb184b0a25a`.
- Stronger/weaker risk: no new source/issuer/session/DB/verification layer; all verifiers and full payloads remain unchanged.
- First-paint risk: never mount against an incomplete root/seed; late navigation must preserve focus, scroll, controls and source metadata.
- External convention: HTML module scheduling mechanics only.
- Exact paths: `scripts/build-public-pages.mjs` emits deferred modules ahead of a 7.46 MB navigation payload; five `main.tsx` public entries wait for parsing; `server/receipt-preview.ts` currently puts the receipt after that payload. Asset metadata can precede its deferred listener.
- Checks: RED→GREEN readiness/template/receipt/metadata contracts; public navigation and proof tests; production build with unchanged size gates; mobile production browser with delayed tail and real controls.
- Uncertainty: native iOS Instagram WebKit unavailable; controlled browser timing is not native cold-load timing.

## Tasks
1. [x] Capture the existing delayed entry and test complete/incomplete-root scheduling; preserve profile readiness and loaded/dev document fallback. Extract shared readiness, use only for the five public runtimes, emit async only for their existing entry modules.
2. [x] Test and move the same server-verified receipt seed before navigation. Queue existing asset metadata using the same readiness rule as profiles, dropping replaced source events. Preserve digest refusal, legacy receipts, head and retained explicit return.
3. [x] Run focused suites and production build. Compare original artwork/source and mobile interaction/focus/scroll before and after the trailing payload. Run fresh final review, fix Important findings with RED→GREEN tests, then commit only scoped files onto the current main head; preserve 21 unrelated dirty files byte-for-byte.

## Review focus
- Root exists while its children are still arriving: no premature mount or incomplete-data request.
- Async entry executes after parsing but before the deferred metadata listener: no lost specific asset/profile head.
- Short receipt has a valid enclosing digest/read before source admission; moving presentation must not skip verification or cause a second source request.
- Early user input, disclosure, file selection and scroll survive late navigation initialization and explicit navigation/return.
- Loaded dynamic runtime imports, source refusals and dev pages without a navigation payload retain their existing behavior; account entry never changes.

## Rulings and evidence
- Baseline fixture ruling: the public-trade navigation test omitted the generated document’s `data-bank-surface="explore"` while asserting that same initial surface. The router’s previously committed canonical adoption no longer recreates the initial document. Align the fixture with the actual generated document; retain every assertion on bank intent, hidden root, location, title, styles and reuse. No product behavior changes to satisfy this incomplete fixture.
- Readiness, receipt placement and superseded-source metadata tests reproduced their missing boundaries and passed after the scoped changes. The real late-router asset-return regression produced a generic “Public asset” title with the old immediate metadata event and preserves the carried Original title after the fix.

## Final review correction
- Important: an early Buy/Sell click could precede the existing Bank-runtime listener and produce a false connection error. Queue the same explicitly requested runtime event until that listener is installed; reuse its existing import, account primitive and monetary authority. The equivalent profile Message-navigation event uses the same readiness gate. Both failures reproduced RED before correction; ordinary ready-document delivery remains immediate.
- Description ruling: classify the empty-summary description mismatch as Important for this task’s exact carried-head continuity contract. Normalize event description exactly as the existing server does, including its existing empty-summary fallback. The Original’s source and displayed caption are unchanged. Newline and empty-summary cases reproduced RED before correction.
- Browser diagnostic: the exact opened Share Inventory details remained connected, open and focused. An existing media reader appends an earlier “Media & proof” details, so a query-first test observed a different element. Track the exact interacted element instead; no product disclosure behavior was changed.
- Calendar inspection: no duplicate read or document-tail wait found after profile entry. Existing service retains its one availability response and prepared timezone map. A single live public availability read returned 663 slots in 2,290 ms. Controlled local source rendering at mobile viewport showed dialog26/69 ms, time chooser46/88 ms, return18/47 ms and panel reopen32/67 ms at CPU1×/4× respectively, one source read per visit and no errors. These are not native Instagram engine measurements. No unproven booking change is included.

## Final validation
- 344 focused tests across75 files passed, including early ownership/runtime and profile Message delivery, ordinary ready-page delivery/refusal, carried metadata, source-read reuse, timezone reuse, receipt, profile, public navigation and explicit trade handoff. Happy DOM reports its existing disabled synthetic checkout-iframe limitation; no browser app error occurred.
- Full production build passed after the final implementation and review correction, including TypeScript, unchanged size budgets, public pages, docs, source archive, conformance boundaries and complete offline shell.
- Controlled 390×844 mobile Chromium, CPU4×, same2200ms unrelated tail: complete-root-to-runtime handoff reduced from2550→323ms(asset),2623→168ms(receipt),2588→232ms(Explore),2551→231ms(global cap),2540→200ms(Ledger),2521→116ms(verification),2515→170ms(conformance). This demonstrates removal of the controlled tail wait, not a claimed native Instagram cold-load duration.
- All seven production-bundle routes became interactive before document completion. Exact interacted nodes, disclosure state, typed input, focus, scroll and source head remained intact; receipt used zero additional snapshot reads. Browser errors:0. Screenshots confirm the same actual artwork and product surfaces; no contradictory visual evidence remains. The original media decoder still presents the verified original, not a receipt-art substitute.
- Fresh review’s Important early-action issue and the reclassified exact-description issue were resolved in one fix pass with RED→GREEN regressions and a green focused suite. No deferred minor findings remain. No production trade, payment, booking, message, SQL change or account-entry change was performed.
- Integration: commit these scoped files onto the current Bankeiz main head, preserving all21 unrelated dirty files and any later main commits.
