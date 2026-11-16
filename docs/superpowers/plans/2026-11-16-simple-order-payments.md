# Simple Bankeiz order payments implementation plan

> **For agentic workers:** Use superpowers:executing-plans task by task. Execution is authorized by the user's design approval and instruction to build and test the complete flow.

**Goal:** Ship an installable merchant package using existing fixed checkout, receiving originals and durable fulfillment, surfaced discreetly inside Receive.
**Architecture:** Bundle existing Bankeiz fixed-sale and receiving readers into an ESM package with the SDK external. Add serializable receiving continuation, an atomic merchant-store port and Node SQLite adapter. Show one existing-style guide link within Receive's payment-tools disclosure.
**Tech stack:** TypeScript, Receiz 129.5.0, Node 24 SQLite, esbuild, Vitest, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-16-simple-order-payments-design.md` (approved 16 November 2026).

## Global constraints

- Preserve frozen identity/account entry, held-first public display, existing checkout and exact original inspection.
- Pin coordinated Receiz packages to 129.5.0. No new payment writer, backend service, financial ledger, npm publication or live charge.
- Preserve current workspace changes; implement in place with task-owned files and focused edits. No reset or blanket staging.
- User steering: subtle/tasteful existing style, surfaced within Receive → Accept payments anywhere.

## Review focus

- Restarts cannot lose older unavailable original references while the discovery cursor advances.
- Independent instances cannot bind the same external order to different sale requests or enqueue multiple first-payment jobs.
- A failed storage write must not acknowledge an original; received paid evidence survives a later network failure.
- Expired workers cannot acknowledge a successor lease; external fulfillment uses the same idempotency key after interruption.
- Validly signed test/duplicate notifications never establish payment and incomplete webhook work remains retryable.

## Task 1: Durable receiving continuation

**Files:** `src/receiz/merchant-receive.ts`, `tests/merchant-receive.test.ts`.
**Interface:** Optional restored checkpoint in `createMerchantReceive`; `checkpoint()` exports serializable discovery/pending coordinates only. Existing calls retain behavior.
- [x] Add failing restart/pagination, pending-candidate fairness and invalid-checkpoint tests; run the focused file RED.
- [x] Implement checkpoint validation/restore/export without changing original inspection or existing financial paths.
- [x] Run the complete merchant/fixed-checkout tests GREEN and record evidence.

## Task 2: Package, atomic storage and fulfillment

**Files:** `integrations/payments/src/{types,index,sqlite,webhook}.ts`, package/build configuration; `tests/order-payments.test.ts` and `tests/order-payments-webhook.test.ts`.
**Interfaces:** `createBankeizPayments({merchant,receiz,store})` exposes `checkout`, `get`, `check`, `reconcile`, `fulfill` and `handleWebhook`. `createSqliteOrderStore(path)` implements namespaced durable transactional storage. Public status excludes originals; private store record retains exact sources. Store methods are explicitly documented in public types.
- [x] Write failing behavior tests: concurrent preparation, changed amount refusal, genuine receiving, wrong/partial source, two payments/one job, restart and reconciliation fairness.
- [x] Implement trusted-input validation and use existing fixed codec/inspector plus restored receiving continuation.
- [x] Implement SQLite insert-if-absent, revision/CAS observation commits, unique payment/job indexes, durable round robin and webhook-work records.
- [x] Add failing lease/crash, stale acknowledgment, rollback and cold reopen tests; implement stable fulfillment keys and retries.
- [x] Add failing raw-body signature/timestamp/size, duplicate and failed-work retry tests; verify with actual installed SDK and recheck payment beneath notifications.
- [x] Run new integration and existing receiving suites GREEN; compile public types.

## Task 3: Installable artifact, example and quiet guide entrance

**Files:** `integrations/payments/{README.md,LICENSE,build.mjs,example/*}`, `scripts/check-order-payments.mjs`, `docs-app/articles/developers.mjs`, `institution/accept-payments.md`, `src/features/account/PaymentTools.tsx`, related tests.
**Interfaces:** Local npm tarball at `public/integrations/bankeiz-payments-0.1.0.tgz`; package exports portable core and optional `/sqlite` entry. Synthetic store uses the real package and SDK reader with controlled transport; only loopback demo receives a simulated-payment action.
- [x] Test packed install and type import in an independent fixture; build exact package with source maps/license and SDK external.
- [x] Provide runnable persisted synthetic merchant example and trusted-order route examples; implement authenticated merchant integration guide.
- [x] Add one existing-style “Connect a store or app” link in payment-tools disclosure. Add guide article in existing documentation layout, with installation/download and server/store responsibilities.
- [x] Exercise the actual browser flow (checkout opens existing route; no source means pending; confirmed original yields one fulfillment; duplicate/restart preserve state) with no live identity or funds.

## Task 4: Verification and final review

**Files:** `docs/verification/2026-11-16-order-payments.md`.
- [x] Run focused payment/Counter suites, account-entry freeze, root/package typechecks, independent packed check, docs build and browser flow.
- [x] Run full test suite and production build. Record existing unrelated failures separately; preserve all concurrent changes.
- [x] Request one fresh final code review under executing-plans; resolve material findings with failing regression tests and rerun affected checks.
- [x] Record local artifact/source/tests, commit/CI and deployment as distinct evidence. Do not claim live financial qualification.

## Execution ledger

- Ruling: implement in the current user workspace with focused edits, as allowed by the approved design, to preserve its installed 129.5.0 contracts and concurrent work. Cost if wrong: integration qualification must distinguish uncommitted workspace from a release build.
- Ruling: execute directly in this chat following explicit build approval; no additional plan-approval round. Final independent review remains required.

- Task 1 complete: 28 receiving/fixed-sale/Counter tests passed, including checkpoint restart RED→GREEN.
- Task 2 complete: hosted five-method order→merchant→fulfillment tests, webhook/lease/recovery and cross-provider sink regressions passed.
- Task 3 complete: independent packed install/types and browser Receive/guide/order flow passed; existing checkout retained.
- Final review: seven Important findings fixed in one regression-tested pass. Distribution privacy extended to npm pack as well as public source archives.
- Full suite: 1108 files, 7261 passed, 11 skipped; account-entry freeze 63/63. Whole production build passed exit 0. Task 4 complete; final source/delivery refresh carries this evidence record.
- Ruling: live settlement, production event delivery, registry publication and deployment remain unqualified/excluded as approved; local success must not imply them. Cost if wrong: merchants could rely on capabilities not demonstrated on their deployment.
