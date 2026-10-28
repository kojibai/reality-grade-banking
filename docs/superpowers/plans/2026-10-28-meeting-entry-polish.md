# Meeting entry polish implementation plan

> **For agentic workers:** Use superpowers:executing-plans; implement and verify in this session.

**Goal:** Make meeting creation direct, guest entry reliable and Identity Record entry recognizable.
**Architecture:** Compose the existing Checkout identity session, PBI recovery, organizer saveEvent and verified meeting admission. Preserve actual calendar/chat/call truth and all existing permission checks. No new identity or admission authority.
**Tech Stack:** Existing React/TypeScript, canonical Receiz primitives, Vite and repo tests.
**Spec:** User's explicit meeting-entry, speed, guest recovery and custom icon requests in this chat.

## Global constraints
- Work on main in the user-designated Bankeiz and Receiz checkouts; commit only owned files.
- Identity Record icon replaces generic upload glyphs for identity entry. No extra visible name. Fingerprint retains existing PBI recovery.
- Start a meeting creates one real room through canonical account entry and opens its join lobby, without camera/microphone activation.
- iPhone actions stack and center; wider devices keep a row.
- Reuse a request ID through retries. Never create a replacement identity after failed restore.
- Preserve verified identity/room checks and all accepted source truth. No production schema/config mutation.
- Global cash-language refinement remains a separate pending task after meeting repairs.

## Review focus
- Import or PBI overlaps Join: serialize identity selection; never admit previous identity.
- New guest source exists without legacy SQL account: selected source remains authoritative, absent source fails closed.
- Room creation accepted but response lost: same request ID, no duplicate meeting.
- Close/unmount during entry: no late adopted identity or media; dispose accepted resources.
- Actual upstream refusal: informative bounded error; shape mismatch remains rejected.

### Task 1: Identity Record icon and guest entry
- [x] Add shared vector icon and replace Identity Record import glyphs without label/behavior changes.
- [x] Add session PBI selection and guest icon entry, with import/Join concurrency and cancellation tests RED→GREEN.
- [x] Browser-check homepage and lobby at phone/desktop widths.

### Task 2: Meeting admission diagnosis and repair
- [x] Trace exact live read-only evidence and compare actual existing source-aware auth/conversation/call paths.
- [x] Reproduce confirmed implementation gap before patching; retain shape/identity refusal tests.
- [x] Preserve upstream error categories and bounded server diagnostics where failure remains masked.
- [x] Run Receiz focused tests and account-entry freeze for identity-adjacent changes.

### Task 3: Direct and fast creation
- [x] Test one Start a meeting intent through canonical entry and organizer, including lost response/reload/repeated taps.
- [x] Reuse existing meet room entry for /meet/start/; navigate only after accepted real meeting location.
- [x] Remove creation's redundant empty work and parallelize independent work with timing contracts.
- [x] Update public CTA and phone layout; regenerate source-bound previews.

### Completion
- [x] Run Bank test suite, types/build and relevant Receiz contracts; record exact limitations.
- [x] One fresh read-only final reviewer; address important findings with regression tests.
- [x] Commit owned changes on main, preserving other work. No push or deploy.

## Execution evidence
- Actual join failure: the existing Bank native relay rejected a POST without application/json before reaching Receiz. Real-relay regression failed with MEETING_ADMISSION_UNCONFIRMED and passes with the required header and empty JSON body. No admission check was relaxed.
- Ruling: Do not alter shared source-aware chat auth or add diagnostic authority. Read-only investigation ruled in the relay request defect; broader cutover work is unrelated.
- Creation now skips opening Messages/Calendar lists; backend reuses INSERT RETURNING for newly accepted conversations, retaining SELECT on duplicate/rejoin.
- Review finding fixed RED→GREEN: bind accepted owner, request metadata and private key to the persisted start intent before clearing it. Native event IDs remain distinct from request IDs.
- All 4,097 tests across 664 files passed with isolated locked dependencies. Production build, offline/source/licensing/conformance/public-page checks passed. Initial symlinked-dependency verification exposed an external sourcemap path; isolated npm ci removed that verification-environment artifact.
- Receiz: conversation/admission/call/creation/messaging 19 passed; account-entry freeze 57 passed; visual evidence, primitive binding, repo-only and governance gates passed.
- Visual: 320/390/440/768/1280 lobby and homepage screenshots confirm the passport/key icon; 320/390/440/520 actions stack centered; 768/1024/1280 remain a row. No contradictory evidence.
- Boundary: no production call or media join was initiated, no database mutation/migration, no deploy or push. Physical iPhone biometric interaction remains untested.
- Global cash-language audit is retained as the next pending independent task; it is not claimed complete here.
