# Local Payment and Market Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete eligible Send, Buy and Sell transactions against admitted local proof, show the committed result and receiver balance promptly, and synchronize the identical original through the unchanged global interface.

**Architecture:** First measure and remove redundant work after an already accepted result in the existing adapters. Then qualify actual spending sources, local custody, Market effects and additive synchronization before wiring a source-bound SDK local executor into the existing buttons. Local completion, delivery and global acknowledgment remain separate facts.

**Tech Stack:** Existing React 19/TypeScript/Vite/Vitest application, encrypted device custody, and pinned Receiz SDK/MCP/AI Skills 129.0.0. No new runtime dependency or package-version change.

**Spec:** [Approved local execution design](../specs/2026-10-22-local-payment-execution-design.md).

**Execution:** Preserve the user's chosen method: implement here on main with `superpowers:executing-plans`, followed by one fresh independent final review. Commit locally; the user pushes. Merchant Counter implementation remains paused.

## Global Constraints

- Preserve the existing amounts, ownership, funding order, fees, explicit approvals and resulting value.
- Preserve the existing global synchronization contract and its replay behavior.
- The local committed proof is the completion boundary.
- A read-only position, advisory price, arbitrary document seal or a locally edited balance cannot supply missing spending authority or a funded Market counterparty.
- A browser lock alone does not establish that cross-device boundary.
- Old pending connected attempts keep their original outcome and cancellation paths.
- Do not operate on live funds without explicit approval for the exact payment/trade.
- No Receiz source, service configuration, synchronization protocol, package pin or financial rule change is authorized by this Bank integration design.
- The receiver takes no action; preserve the existing message/payment notification path. No new notification system, manual receiving ceremony, faster polling loop or page reload.
- Do not claim a percentage reduction or literal zero execution time without evidence.

## Review Focus

1. A POST returns a plausible but incomplete/foreign original: recovery still runs, and no success appears without exact original admission and durable retention. Task 2.
2. A retained receipt exists but chart/account work is slow or fails: completion does not wait for optional work, and earlier reads cannot roll balances or holdings back. Tasks 2 and 6.
3. The same identity/source is copied to another tab/device or restored from an older backup: exclusive spending custody and conflicting-head refusal must hold outside a single browser lock. Tasks 3 and 4.
4. A local debit exists without delivery, or a push/message claims payment: the receiver updates only from its admitted successor; no extra receiving action or false credit. Tasks 5 and 6.
5. A local commit is followed by a crash, duplicate synchronization or an old unknown connected attempt: reopen the same result, never execute it again or clear its existing guard. Tasks 4, 5 and 7.

## Deliverables and dependency gate

Tasks 1–2 are an independently useful critical-path improvement, with measured
results. They do not establish network-independent execution. Task 3 must prove
the existing integration supplies all sources and contracts needed by Tasks 4–6.
If it does not, stop those production changes and report the precise missing
contract. Do not fill that gap with fabricated capabilities, new financial rules,
a test-only root, or a queued remote execution relabeled as local success.

The installed `value.edge` API explicitly supports Reserve/Settlement transition
planning and confirmation. A qualified local Market effect contract, exclusive
handoff of current connected holdings, and compatible global acceptance have not
yet been established. The plan deliberately treats them as prerequisites to
prove, not implemented capabilities. If establishing them requires changing the
approved integration boundary, return that concrete change for review.

## File map

| Unit | Files | Responsibility |
| --- | --- | --- |
| Measurement | New `tests/fixtures/execution-timing.ts`, `tests/execution-critical-path.test.ts`; new `scripts/measure-execution-critical-path.mjs` | Reproducible request counts and stage timings without live financial actions |
| Current completion path | Existing `src/receiz/{wallet-send,market-trade,native-identity,market-portfolio}.ts`; new `src/receiz/transaction-completion.ts` only if shared logic is needed | Exact returned-original admission, prompt result publication and optional background work |
| Contract/readiness audit | New `docs/verification/2026-10-22-local-execution-contracts.md`; new `src/receiz/local-financial-readiness.ts` | Actual supported sources, qualified custody, effect verification, delivery and sync compatibility |
| Local commit | New `src/receiz/{local-financial-source,local-financial-state,local-financial-execution,edge-transition-store}.ts`; existing `identity-vault.ts` | Canonical admission, durable SDK commit and recovery/outbox retention |
| Synchronization | New `src/receiz/local-financial-sync.ts`; existing `native-identity.ts`, `bank-execution-recovery.ts` | Thin composition of the existing admitted recovery-delivery interface, without a new financial writer |
| Send/receive | New `src/receiz/local-payment.ts`; existing `wallet-send.ts`, `hosted-checkout.ts`, `native-identity.ts`, `useNativeAccount.ts` | Local payment lifecycle and automatic inline account publication |
| Market | New `src/receiz/local-market.ts`; existing `market-trade.ts`, `market-portfolio.ts`, `native-identity.ts` | Existing review/amount controls over qualified local payment-for-ownership effects |
| Verification | New focused tests and `tests/browser/local-financial-execution.{html,tsx}`; new verification record | Exact outcomes, faults, two account views, production distribution and measured limits |

Do not unilaterally refactor the identity module or edit shipped dependency source.
Add only focused glue. Every public result must derive from admitted originals;
typed interfaces below do not grant financial authority.

### Task 1: Capture the current request path and timing baseline

**Files:** Create the measurement files in the map and `docs/verification/2026-10-22-execution-critical-path.md`; read existing `tests/fixtures/{wallet-send,market-trade,hosted-checkout}.ts`.

**Interfaces:** The test fixture produces stage entries `{stage, durationMs, requests}` for `send | buy | sell`, with separately configured request delay and optional display delay. The runner prints local measurements and explicit `syntheticTransport:true`; it submits no real transaction and loads no production identity.

- [ ] Build fixtures from existing synthetic original producers. Keep ownership/value/source assertions active; provide complete POST originals, incomplete responses, lost responses, and a deferred display callback as distinct cases.
- [ ] Record current counts for review, financial dispatch, recovery read, durable retention, local publication and optional refresh. Separate warm/cold initialization from execution and do not include a card authorization in a cash execution measurement. The measurement script launches the isolated Vitest harness and reads its timing output; it does not import a Vitest-only fixture into a production process.
- [ ] Add baseline assertions as named tests: `complete Send currently performs one outcome GET`, `complete Market POST needs no outcome GET`, and `terminal retention precedes display adoption`. Assert `sendOutcomeGets === 1`, `buyOutcomeGets === 0`, `sellOutcomeGets === 0`, `financialDispatches === 1`, and `retainedBeforeSuccess === true`.
- [ ] Run `npm test -- --maxWorkers=4 tests/execution-critical-path.test.ts tests/wallet-send.test.ts tests/market-trade.test.ts`. Record actual results and measured distributions, not an assumed saving.
- [ ] Preserve the baseline measurements as dated evidence; Task 2 updates the active expectation for the new path rather than leaving a regression test that still requires the removed GET. Record whether the actual normal POST contract supplies a complete original. A synthetic complete response alone cannot establish a production round-trip saving.
- [ ] Commit `test: record send and market execution critical paths`.

### Task 2: Remove redundant waits in the existing adapters

**Files:** Modify `src/receiz/{wallet-send,market-trade,native-identity,market-portfolio}.ts` only where a measured wait is present; update `tests/{wallet-send,market-trade,wallet-send-adoption-race,market-portfolio,execution-critical-path}.test.ts`. Create `transaction-completion.ts` only if it removes actual duplication.

**Interfaces:** Preserve existing `WalletSend`/`MarketTrade` inputs, outcome shapes, nonce identity, checkpoint schema and validation. Use the same private `recorded(raw, checkpoint)` acceptance for complete Send POST originals and outcome reads. Separate immediate accepted-state publication from any optional after-recorded display/network callback; no asynchronous financial verification is reclassified as optional work.

The new complete-original regression retains these assertions:

```ts
expect(outcome.status).toBe('recorded');
expect(originalLookup).not.toHaveBeenCalled();
expect(financialDispatch).toHaveBeenCalledTimes(1);
expect(retained.current.record).toEqual(exactPostOriginal);
```

- [ ] Write a failing complete-Send-POST test with assertions `outcome.status === 'recorded'`, `outcomeGets === 0`, `financialDispatches === 1`, and `retainedRecord === exactPostOriginal`. Run it and observe the existing extra GET.
- [ ] Add mutation cases for absent source, wrong recipient/amount/nonce, missing original, mismatched receipt and public note. Require exactly one original lookup after the POST and never a second financial dispatch. A valid original whose terminal write fails stays recoverable and does not become success.
- [ ] Add deferred optional-work tests for Send/Buy/Sell. Assert completion resolves after exact admission and durable retention while that work remains unresolved; reject/throw inside the optional callback must not alter the terminal result. Assert immediate absolute account/holding publication still occurs before completion where the source supplies it.
- [ ] Run the new tests first. Refactor Send to retain a fully accepted returned original directly, preserving the normal recovery path for all other responses. Keep the acknowledgment's admitted wallet material available to the existing account-adoption code.
- [ ] Remove only proven post-retention waits. Do not blindly make every `onRecorded` callback fire-and-forget: split financial/source admission and immediate publication from optional chart preparation or full refresh. Retain current identity and stale-read guards. Market already skips its normal recovery GET; add no duplicate quote/read there.
- [ ] Test that a delayed older wallet/portfolio response cannot replace a recorded successor, complete sells disappear immediately, and insufficient funds/card delta/Note recovery behave exactly as before. No arithmetic-only synthetic complete cash balance is introduced.
- [ ] Run `npm test -- --maxWorkers=4 tests/execution-critical-path.test.ts tests/wallet-send.test.ts tests/wallet-send-card-funding.test.ts tests/wallet-send-checkout.test.ts tests/hosted-checkout.test.ts tests/market-trade.test.ts tests/market-portfolio.test.ts tests/wallet-send-adoption-race.test.ts`; run typecheck and the measurement runner.
- [ ] Commit `perf: remove redundant waits after verified transaction results`. Report this saving separately from the later local-execution migration.

### Task 3: Qualify existing local financial sources and unchanged sync

**Files:** Create `docs/verification/2026-10-22-local-execution-contracts.md`, `src/receiz/local-financial-readiness.ts`, and `tests/local-financial-readiness.test.ts`; read the published SDK contracts and existing `institution/examples/edge-payments.ts`, `bank-execution.ts`, `native-payment.ts`, `native-asset.ts`, `native-asset-holding.ts` and `bank-operation-qualification.ts`.

**Interfaces:** Produce `inspectLocalFinancialReadiness(input: unknown): Promise<LocalFinancialReadiness>`, where readiness is a closed union: `{ready:false, missing:readonly LocalFinancialRequirement[]}` or an opaque SDK-admitted ready source held by this module. Requirements are `value-source | recipient-authority | share-source | funded-market-authority | exclusive-custody | financial-effects | additive-sync | receiving-delivery`. A declaration of those names cannot produce a ready source.

- [ ] Write refusal tests asserting that ordinary Wallet/portfolio observations, a holding certificate alone, an arbitrary user seal, a public price, a generic verified history, a matching JSON balance and a callback returning `true` all produce `ready:false` and zero execution calls.
- [ ] Inventory exact existing contracts for admitted source delivery, exclusive source custody across devices, recipient capabilities, deterministic price basis, complete Market offer collateral, financial effect validation and global acceptance of committed recoveries. Record actual symbol/path/input/source/result contracts and trust roots, not invented API names.
- [ ] Establish how the existing transport delivers the original to the recipient automatically, including an open app with Messages closed. A push notification is a wakeup hint, not proof or a balance. Preserve its existing behavior and permissions.
- [ ] Verify the current global interface accepts the locally committed recovery as the same transaction, with no second financial execution or change to global read semantics. Ordinary Send/Market execute POSTs do not qualify merely because they accept the same amount.
- [ ] Use read-only inspection and already-held material where available. Label synthetic mechanics separately. Do not introduce real funding/trades, signing roots, custody grants or service changes during qualification.
- [ ] **Gate:** For each missing requirement, record the exact unsupported source/contract and block local production activation. Do not flip `assertBankOperationQualified` or another feature gate. If a required contract is absent, stop Tasks 4–6 and return the actual boundary change for review; Tasks 1–2 remain valid on their own.
- [ ] Create the production readiness/admission module only when an actual supported qualified-source contract exists. A failed prerequisite audit gets a precise verification record, not unused production scaffolding or another permanent `ready:false` gate.
- [ ] Run `npm test -- --maxWorkers=4 tests/local-financial-readiness.test.ts tests/institution-edge-example.test.ts tests/bank-execution.test.ts tests/native-payment.test.ts tests/native-asset.test.ts`; commit `test: qualify local financial execution prerequisites`.

### Task 4: Implement the qualified durable local commit and sync boundary

**Files:** Create `src/receiz/{local-financial-source,local-financial-state,local-financial-execution,edge-transition-store,local-financial-sync}.ts` and their focused test files; modify existing `identity-vault.ts` and `bank-execution-recovery.ts` narrowly. This task requires Task 3 to pass for the affected operation.

**Interfaces:** Import actual plan/set/recovery/store types from the installed SDK. Define `LocalFinancialIntent` as `{kind:'send',recipient:string,amountUsdCents:string,note?:string}` or `{kind:'market',input:MarketTradeInput}`. The admission module alone creates opaque `LocalFinancialPrepared` values, binding that intent, identity/application, exact SDK plan/set, required financial sources and confirmation digest. Produce:

```ts
createLocalFinancialExecution(deps: LocalFinancialDependencies): {
  prepare(intent: LocalFinancialIntent): Promise<LocalFinancialPrepared>;
  commit(review: LocalFinancialPrepared, confirmationDigest: string): Promise<LocalFinancialOutcome>;
  recover(operationId: string): Promise<LocalFinancialOutcome>;
  dispose(): void;
}
```

`LocalFinancialDependencies` contains only the Task 3 qualified source/financial-effect adapters, SDK transition functions, current identity assertion, qualified store and exact existing sync adapter. `LocalFinancialOutcome` is `committed-local | zero-write | unknown`, bound to operation ID; committed results carry the real SDK recovery and its verified financial successors. Sync state is separate and cannot be used to create the outcome. Use retained schema `bank.local-financial-execution.v1` with an identity-bound revision and exact canonical source bytes.

- [ ] Add failing tests for canonical source admission, expected-head conflict, missing participant/capability, altered plan, invalid temporal authority and wrong application. Assert zero financial writes for every refusal. In-memory/testing stores and arbitrary roots must not qualify a production adapter.
- [ ] Implement the existing SDK choreography: verify the exact transition set, prepare its commit requirements, seal/stage using admitted capabilities, commit through the qualified store, package only SDK-custodied committed transitions, and reopen the committed recovery to validate financial effects. Use the exact financial-domain verifier established by Task 3; generic history verification is insufficient.
- [ ] Implement durable source/head/idempotency/receipt retention and a pending-sync record at the supported atomic boundary. Match the SDK's participant atomicity requirements; do not split a financial exchange into independent debit and credit writes. The store must verify exact candidate snapshots under its lock, not accept caller-supplied success flags.
- [ ] Add crash injection before commit, after the durable swap and before acknowledgment, during recovery retention and during sync. Assert each reopen produces the same committed recovery or explicit unknown/no-write, never another execution. Test copied/rolled-back custody, concurrent tabs/devices and identity replacement using the qualified custody contract.
- [ ] Compose the existing sync adapter with exact recovery bytes and idempotency coordinates. On failure retain pending delivery; duplicates adopt once. Never call ordinary connected execution as a replacement sync operation. Do not change the global protocol, authentication, scheduling or replay rules.
- [ ] Add tests with synchronization held indefinitely: `commit` must resolve `committed-local` after durable proof retention, and the same recovery must later synchronize once. A failed durable write must not resolve as committed.
- [ ] Run the new focused tests, existing execution/recovery and private-vault checks, then typecheck; commit `feat: commit qualified financial transitions in local custody` only if real SDK/source qualification passes.

### Task 5: Wire Send and automatic receiver admission

**Files:** Create `src/receiz/local-payment.ts`, `tests/local-payment.test.ts`; modify `src/receiz/{wallet-send,hosted-checkout,native-identity,useNativeAccount}.ts` and corresponding Send/checkout/wake tests. Preserve existing UI fields and notification files.

**Interfaces:** `createLocalPayment` composes Task 4 with `value.edge.planReserve/planSettlement`, exact verified source funding and `confirmReserveSend/confirmSettlementSend` plus matching receive methods. A ready local source returns a distinct verified result family; never label it an existing `wallet-observation` response. Existing connected pending outcomes keep their original controller and recovery family.

- [ ] Add failing tests for Reserve-only, Settlement-only and composite Reserve-first sends, exact USD/Phi handling, public note, repeated approval, insufficient funding and changed terms. Assert the same recipient, amount and funding effects as the existing approved operation.
- [ ] Test with network disabled after preparation: local approval commits, reopens and confirms through the actual pinned SDK. Assert no quote, execute or outcome HTTP call occurs inside that ready local commit. Test-only coordinates prove planning only and do not satisfy this assertion.
- [ ] Route only genuinely admitted local sources into this executor; never infer eligibility from the visible balance or sealed position. Preserve old connected unknown/funding attempts, card sessions, card minimum/delta/surplus rules and exact reapproval. New card funding still requires its existing actual confirmed credit.
- [ ] Deliver the committed original through the unchanged, qualified transport. The recipient device automatically verifies its participant/source and retains the successor before publishing it. Add no receiver button, import ceremony, page reload or new subscription/polling system.
- [ ] Publish admitted absolute account effects through the existing `bankeiz:account-observation` path. A receiver with Messages closed must update its mounted balance from the new held observation without waiting for full wallet/history/chart refresh. Validate identity, source head and replay identity before publication.
- [ ] Add mounted-account tests: incoming admitted successor updates the visible balance while background read is held; duplicate delivery credits once; notification-only input credits nothing; an older in-flight wallet response cannot replace the successor; wrong-account and unmounted recipients are ignored.
- [ ] Run the new local payment tests, `tests/native-account-wake.test.tsx`, existing Send/card/checkout/Note regression tests and typecheck; commit `feat: publish locally committed sends and incoming balances`.

### Task 6: Wire local Market Buy and Sell without changing economics

**Files:** Create `src/receiz/local-market.ts`, `tests/local-market.test.ts`; modify `src/receiz/{market-trade,market-portfolio,native-identity}.ts`, existing Market UI tests and portfolio/adoption tests. No changes to amount presets or global pricing policy.

**Interfaces:** `createLocalMarket` translates existing `MarketTradeInput` into the Task 3 qualified Market financial operation and uses Task 4 commit/recovery. It consumes actual funded offers, authoritative ownership sources, quantities, price/fee terms and exact heads; it returns the committed proof family and verified absolute successors, not an invented connected trade row.

- [ ] Write failing Buy/dollar-Sell/quantity-Sell tests for the exact existing economics. Include 10/25/50/75/All controls, partial fill, complete liquidation, exact integer rounding, fees and lawful large values within actual source limits. An asset image, chart price or holding certificate alone must not produce an executable offer.
- [ ] Verify payment and ownership effects atomically under the actual qualified Market reducer. Test expired/revoked authority, stale or competing fills, missing collateral, supply conservation, duplicate approval and a source changed after review. Every rejected operation has zero partial financial effects.
- [ ] Disable network after qualified preparation; require local Buy and Sell commits, durable reopen and verified payment-plus-share effects without a remote quote/execute/outcome request. If Task 3 cannot supply this actual contract, leave these tests explicitly unqualified and do not wire a simulated local implementation.
- [ ] Preserve old connected pending trade/cancellation recovery and both existing result families. Connect the existing Buy/Take cash controls to qualified local execution without silently switching an already-approved or pending operation to a different source/nonce.
- [ ] Publish absolute accepted holdings, cost basis/realized return and admitted account successors before background sync. Avoid portfolio reads for fields already in the proof; keep stale-result guards and remove fully sold positions inline. Keep complete cash-balance admission independent of share-display arithmetic.
- [ ] Run local Market tests, existing `tests/market-trade*.test.*`, `tests/market-portfolio.test.ts`, Ledger trade-detail and standalone/popover regression tests, then typecheck; commit `feat: execute qualified market exchanges at the user edge`.

### Task 7: Measure both sides, review, verify and commit the complete result

**Files:** Create `tests/browser/local-financial-execution.{html,tsx}`, `docs/verification/2026-10-22-local-payment-execution.md`; update critical-path measurements and `src/content/conformance-baseline.json` from fresh results only.

- [ ] Build isolated sender and receiver browser contexts using actual pinned SDK financial verification and the qualified custody/delivery adapters. Distinguish synthetic ingress, adapter tests, real browsers and actual physical-device qualification. No live funds are moved without exact approval.
- [ ] Measure Send/Buy/Sell approval-to-local-durable-commit and approval-to-visible-completion separately. Measure sender commit-to-delivery and delivery-to-receiver-visible-balance separately. Record request counts and p50/p95 for the same test cases before/after; injected latency is labeled and never reported as production timing.
- [ ] Run each with global sync held, unavailable, resumed and duplicated. Both account screens remain mounted, show the correct accepted successors without reload, and do not regress when an older read completes. A sender-only animation or notification screenshot is not an end-to-end pass.
- [ ] Exercise old pending connected/card attempts, alternate identity, same source across devices, crashes at each durable boundary, duplicate/late delivery and stale Market offers. Verify original recovery remains reachable and the unchanged global interface adopts each exact committed original once.
- [ ] Request one fresh independent whole-change review under the preserved native execution method. Address actionable findings and rerun affected tests before final qualification.
- [ ] Record all actually qualified sources/contracts and genuine remaining blockers. If local Send or Market cannot pass the required financial/custody/sync checks, do not describe the migration as done. Report the independently shipped latency patch and the exact remaining contract separately.
- [ ] Run final verification against an unchanged source snapshot:

```sh
node scripts/conformance-baseline.mjs --snapshot /tmp/bankeiz-local-execution-sources.json
npm test -- --maxWorkers=4 --reporter=default --reporter=json --outputFile=/tmp/bankeiz-local-execution-tests.json
node scripts/conformance-baseline.mjs /tmp/bankeiz-local-execution-tests.json --sources /tmp/bankeiz-local-execution-sources.json
npm run typecheck
npm run release:check
npm run receiver:check
npm run native:check
npm run native:rebuild -- --sdk
node scripts/conformance-reference.mjs
node scripts/conformance-contract.mjs --adapter node scripts/conformance-adapter.mjs
node scripts/conformance-certificate.mjs --check
npm run build
npm run source:verify -- --rebuild
```

- [ ] Check production-built Send/Market surfaces and the two-context harness at phone/desktop widths; no extra initial network calls, notification changes or layout regressions. Preserve the immutable public conformance original and shared footer.
- [ ] Run `git diff --check`, inspect staged scope/private-data exclusions, and commit `feat: complete qualified local transaction execution`. Report exact commit(s), observed end-to-end results and measured savings. Do not push, tag or deploy.

## Definition of done

Send and both Market directions actually commit through admitted local financial
custody, the sender sees completion after durable verification, and the receiver's
open balance updates automatically on admitted delivery. Existing global sync
adopts the same original without another financial execution. Measured timings,
network-independent commit tests, recovery/duplication checks and distribution
verification pass; the reviewed changes are committed on main for the user to
push. A faster connected path alone is useful progress, not this full result.
