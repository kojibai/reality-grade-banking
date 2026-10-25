# Business Setup Activation Implementation Plan

> Use executing-plans inline, test-first, one fresh final review.

**Goal:** Finish real native Business setup in the same chat with least-action provider connection and truthful receipts.
**Architecture:** Existing owner Twin proposes fixed tools; private same-ID executor uses existing SDK/native primitives. Actual configured Vercel Connect broker grants external access. Existing shell/payment/entry remain settled.
**Spec:** docs/superpowers/specs/2026-10-25-business-setup-activation-design.md

## Tasks
1. [x] Native owner Business tool/context contract; proposal-only, same owner, no new AI.
2. [x] Private Bank execution and fixed relay mounting; dynamic current username; Original/private File binding.
3. [x] Real provider connection runtime, readiness/configuration and Namecheap coordination/status completion.
4. [x] Existing chat integration with compact receipts, Connect/resume and streaming UX; preserve all prior entry/payment/draft behavior.
5. [x] Fresh review, important fixes RED→GREEN, full checks, visual evidence, explicit-path commits.

## Rulings
- Reuse the already authorized real native Twin and existing AI configuration; no new OpenAI key or alternate agent is created.
- The user's “finish it” supersedes the earlier tools-only timing; coordinate by preserving current messages/calendar/contact implementation instead of replacing the surface.
- Use isolated archive copies and collision manifests to leave all other-agent work untouched.

## Ledger
- Inspect: Vercel MCP connector listing403; installed CLI44 lacks api method; configured same-team project credential successfully lists connectors (200, empty). No secret printed and no connector/customer data changed.

- Task 1 complete: existing native owner runtime composes fixed proposal tools and validated same-owner context; SSE streams actual deltas and accepted final results through the same usage journal. Native 4 tool/stream tests and 32 usage/runtime contracts pass; typecheck/lint pass.
- Task 2 complete: same-ID private executor, lazy canonical private sealing composition, exact selected Original publication, retained per-action receipts, fixed relay mounting and per-request username resolution. No account-entry/payment code changed.
- Task 3 complete for implementable integration: pinned Vercel Connect OAuth-user broker with actual owner/hostname deployment bindings, no shared API-key fallback; native manual instructions when unavailable. Ruling: no connectors exist and no customer grants were supplied, so do not invent them. Namecheap API credentials/IP allowlisting and cross-worker full-zone coordination remain a concrete external activation boundary; the OAuth broker does not activate Namecheap, Porkbun or Route53. See docs/business-setup-activation.md.
- Task 4 complete: existing Messages panel streams, shows real receipts/records/copy controls, retains exact pending hostname across provider return, and continues without replacing identity, payment review or conversation. Mobile/desktop synthetic browser fixture confirms layout; no live account or model mutation claimed.
- Fresh review: fixed selected-Original mismatch, dependent-batch continuation after unknown, stale candidate after failed newer seal, changed-hostname Connect resume, and owner-selected context truncation/budget collision. Regressions were observed RED then GREEN. Unknown outcomes remain retained.
- Verification: full Bank suite 522 files / 3335 tests pass; focused integration116 tests pass. Production build, emitted Node server import check, canonical sealing composition and typecheck pass. Native account-entry freeze37 tests and visual-evidence/primitive-binding/repo-only gates pass. Native production brain, customer connector OAuth completion and actual DNS writes not exercised; no deploy, charge, publication or provider/customer mutation performed.
