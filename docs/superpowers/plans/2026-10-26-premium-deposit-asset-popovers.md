# Premium deposit and asset popovers implementation plan

> **For agentic workers:** Use superpowers:executing-plans for the user-authorized inline implementation; separate asset-production tasks and one independent final review.

**Goal:** Implement the two approved popovers and make all product/message examples fully readable.
**Architecture:** Keep existing native controllers and Sheet. Add scoped presentation, generated raster assets, retained File previews and build-time safe scrollable examples.
**Tech stack:** Existing React/Vite, native CSS, Image Gen assets, Vitest and in-app browser.
**Spec:** docs/superpowers/specs/2026-10-26-premium-deposit-asset-popovers.md

## Global constraints
- Bank repo main only; preserve other agents’ files.
- No monetary, provider, source, identity, account-entry or approval changes.
- Keep intake/custody, provider payment/credit and local seal/publication results exact.
- No page navigation runtime growth or unnecessary preview file reads.

## Review focus
- Native scroll and manual rereading work at 320/390px, with no working example financial controls.
- Chat auto-follow never overrides a reader who scrolled back.
- All existing deposit methods and saved checkout/payment/purchase continuations still bind their original values.
- Every supported media kind preserves actual source/cover bytes, metadata, attachments, full text and capacity refusal.
- Create-with-backing and retained publication recovery preserve exact review/consent and retries.

## Tasks
- [x] Add failing published-preview scroll/manual-chat contracts; isolate controls and retain native scroll; verify and commit.
- [x] Produce the approved glass frame/sound imagery as separate transparent assets.
- [x] Refine Deposit layout, source choice/detail/result states and scoped styles; run exact-input and recovery tests.
- [x] Refine Create/Composer live preview and progressive details; preserve backing/retry and media semantics; test.
- [x] Regenerate actual public UI previews and verify desktop/mobile, repeats, keyboard and reduced motion.
- [x] Run appropriate full checks, independent review, source/offline validation and commit only owned files.

## Completion ledger

Ruling: preserve existing native Sheet dimensions and financial controllers; generated imagery is presentation only. Cost if wrong: visual mismatch; user approved rendered appearance and actual browser states were checked.
Ruling: expanded forms and the user’s later published-Original deposit model follow this requested visual checkpoint; current request intake is not described as credited funds. Cost if wrong: user expects a financial effect this checkpoint does not implement; validation and completion explicitly name that boundary.
Final review: one Important step-switch reading-position issue fixed with a failing then passing regression; no deferred minors.
Final user visual finding: backdrop focus scroll shifted bottom navigation; replace hidden with clip only on the background console, verified backdrop scrollTop0/navGap0. New replies follow from the first streamed response until manual reading.
Browser QA and all exact-source/controller checks are recorded in docs/validation/2026-10-26-premium-popovers.md.
