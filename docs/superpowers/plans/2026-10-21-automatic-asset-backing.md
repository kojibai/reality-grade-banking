# Automatic asset backing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Create one backed asset from an amount, consuming Reserve first and Settlement only for the remainder, with exact backing continuity through redemption.

**Architecture:** Extend the existing closed native asset request and signed records with an automatic funding variant and exact backing components. Resolve the split from the admitted native wallet prefix and commit both movements through the existing single asset statement, nonce, durable writer and recovery path. Historical single-rail records retain their original encoding and replay behavior.

**Tech Stack:** TypeScript, React 19, existing Receiz native financial sources and signatures, Vitest in Bank, Node test runner with tsx in Receiz.

**Spec:** [Approved automatic asset backing design](../specs/2026-10-21-automatic-asset-backing-design.md).

## Global Constraints

- Funding uses Reserve first, then Settlement for the remainder.
- One asset, full supply, one operation; no reduced issuance, second issuance or separate funding transaction.
- Existing antirollback and recovery rules remain unchanged.
- Browser balances or a cached preview cannot authorize the split.
- Historical requests and signed bytes remain readable without rewriting a predecessor.
- No new dependency, network preflight, transaction framework or authority layer.
- Work on main as requested. Commit only this work; the user pushes. No deployment, live transaction or migration is authorized by this plan.
- Keep the existing Receiz agent's dirty files untouched. Read Receiz's `AGENTS.md` and applicable financial/source doctrine before editing that checkout.

## Review Focus

1. A tiny Reserve remainder must not consume all of its original backing for a partial claim; existing denomination refusal must remain (Task 2).
2. Duplicate, reordered, zero, extra-field or mismatched components must fail before consent or signature acceptance (Task 1).
3. A changed quote changes the display value of Settlement, never the exact Phi returned on redemption; Reserve retains its fixed claim (Task 2).
4. Historical receipts and account proofs with no component field must retain their canonical bytes, including after mixed assets enter the same history (Tasks 1 and 3).
5. Concurrent source changes, revoked authority, interrupted commit and response loss must never produce partial backing or a second asset (Tasks 3 and 4).

## Repositories and file boundaries

`BANK` is `/Users/bjklock/Kai-Turah/bank`.
`RECEIZ` is `/Users/bjklock/Kai-Turah/receiz/.worktrees/receiz-bankeiz-assets-main`.
Paths below are relative to the stated repository. There are no cross-checkout runtime imports.

New focused validators live in `BANK/src/receiz/native-asset-backing.ts` and
`RECEIZ/app/lib/wallet/bankNotes/nativeAssetBacking.ts`. Their wire contract and
test vectors must match. They validate data beneath existing financial source
verification; neither file can admit a wallet, grant authority or verify a signature.

### Task 1: Close the automatic request and backing contracts

**Files:**
- Create: `BANK/src/receiz/native-asset-backing.ts`, `RECEIZ/app/lib/wallet/bankNotes/nativeAssetBacking.ts`.
- Modify: `BANK/src/receiz/native-asset-protocol.ts`, `BANK/src/receiz/native-asset-holding-protocol.ts`, `BANK/src/receiz/account-proof-statement.ts`.
- Modify: `RECEIZ/app/lib/wallet/bankNotes/nativeAsset.ts`, `nativeAssetHolding.ts`, `accountProofStatement.ts`.
- Tests: new `BANK/tests/native-asset-backing.test.ts`; existing `RECEIZ/app/lib/wallet/__tests__/bankNativeAssetProtocol.test.ts`.

**Interfaces:**
- Export `NativeAssetFundingComponent = Readonly<{rail:'reserve'|'settlement';amountUsdCents:string;amountPhiMicro:string}>` in each focused validator.
- Export `inspectNativeAssetFundingComponents(input:unknown, totals:Readonly<{amountUsdCents:string;amountPhiMicro:string}>, allowEmpty?:boolean):readonly NativeAssetFundingComponent[]`. Default rejects empty. Empty is valid only with both totals `'0'` and `allowEmpty=true`.
- Export `inspectNativeAssetBacking(input:Readonly<{backingRail:unknown;backingUsdCents:unknown;backingPhiMicro:unknown;status:unknown;backingComponents?:unknown}>):void`.
- Add the automatic `NativeAssetInput` variant `{kind:'fund-asset';fundingRule:'reserve-first-then-settlement';amountUsdCents:string;definition:NativeAssetDefinition}`. Preserve the existing `rail` variant.
- Automatic reviews require `terms.fundingComponents`; all other reviews retain their exact old keys. Component-carrying asset records add `backingComponents`; mixed active backing has `backingRail:'composite'`. An active one-component record has that component's rail. Redeemed records retain their issuance rail and carry `backingComponents:[]` with zero aggregates. Legacy records omit the field and allow only Reserve/Settlement.

- [x] **Step 1: Write failing contract tests.** `automatic_request_is_closed` accepts the exact new variant and rejects `rail` plus `fundingRule`, unknown rule, missing rule/rail and extra fields. `components_are_exact` accepts `[reserve(6000,3000000),settlement(4000,2000000)]` with totals `(10000,5000000)` and rejects reordered/duplicate rails, zero legs, missing/extra keys, leading-zero or negative integers, oversized integers and inconsistent sums. `legacy_encoding_stays_exact` compares the canonical historical request, review, receipt, holding and account-proof bytes before/after inspection.
- [x] **Step 2: Run the new tests before implementation.** Bank: `npm test -- tests/native-asset-backing.test.ts --maxWorkers=2`. Receiz: `TSX_TSCONFIG_PATH=tsconfig.scripts.json node --conditions=react-server --import tsx --test --test-concurrency=1 app/lib/wallet/__tests__/bankNativeAssetProtocol.test.ts`. Expect the new automatic/component cases to fail while historical cases pass.
- [x] **Step 3: Implement the validators and union extensions.** Components use canonical decimal strings within the existing native wallet signed-64-bit arithmetic bound. Validate sums with BigInt. Use property presence to distinguish old and new encodings; never insert absent fields into a historical signed payload. Receipt/holding/account-proof readers call the backing validator after their own closed-key checks. Do not widen unrelated rail types.
- [x] **Step 4: Run both commands again.** Expect all closed-contract and historical cases to pass. Signed plan/component tampering is exercised against the real sources in Task 3.
- [x] **Step 5: Commit only the named contract files/tests in each repository.** Message: `Add closed automatic asset backing contracts`. Do not enable the new UI yet.

### Task 2: Resolve and redeem exact components in one native plan

**Files:**
- Modify: `RECEIZ/app/lib/wallet/bankNotes/nativeAssetEffect.server.ts`.
- Reuse without replacing: `RECEIZ/app/lib/wallet/bankNotes/nativeWalletEconomics.ts`.
- Tests: `RECEIZ/app/lib/wallet/__tests__/bankNativeAssetArithmetic.test.ts`, `bankNativeAsset.test.ts`.

**Interfaces:**
- Extend `NativeAssetCommand` with the same automatic selector as Task 1, using the existing internal definition with `supplyMicro`.
- Extend `NativeAssetState` with the component-carrying backing contract from Task 1.
- Preserve `deriveBankNativeAsset(input):Promise<BankNativeAssetPlan>`, `planBankNativeAsset(input)` and `projectBankNativeAsset(states,plan,allocation)` signatures. The existing plan already contains `movements[]`, `wallets[]` and one `assetAfter`.
- Consume `bankNativeWalletDebit(value,rail,cents,rate)` for single legs and `bankNativeWalletCompositeDebit(value,cents,rate)` for mixed funding. No second plan or intermediate issuance.

- [x] **Step 1: Add failing arithmetic tests.** For wallet `{balancePhiMicro:'10000000',reserveUsdCents:'6000',reserveBackingPhiMicro:'3000000'}` and rate `'2000000000'`, amounts `'4000'`, `'6000'`, `'10000'` yield respectively one Reserve debit of `'2000000'` Phi, one Reserve debit of `'3000000'`, and Reserve/Settlement debits of `'3000000'`/`'2000000'`. Assert one asset, full declared supply, matching component/aggregate sums and exact wallet after-state. Zero Reserve must produce only a Settlement leg; `'20001'` must reject without effects. Pin existing tiny-claim denomination and signed-64-bit overflow refusals.
- [x] **Step 2: Run `TSX_TSCONFIG_PATH=tsconfig.scripts.json node --conditions=react-server --import tsx --test --test-concurrency=1 app/lib/wallet/__tests__/bankNativeAssetArithmetic.test.ts app/lib/wallet/__tests__/bankNativeAsset.test.ts`.** Expect the automatic cases to fail.
- [x] **Step 3: Implement the automatic branch inside `deriveBankNativeAsset`.** Its closed command keys distinguish rail from fundingRule. Select from the admitted actor wallet, build ordered components and one/two existing rail movements, and retain the current nonce-derived asset ID. Apply debit effects once. Single-rail historical branch remains byte-for-byte deterministic. Ownership changes and offer transitions retain components unchanged.
- [x] **Step 4: Add then run redemption tests.** Whole-supply redemption credits each original component to its rail, zeros supply/backing and empties components. Test a changed quote: Reserve returns its original cents/backing; Settlement returns its original Phi and the existing movement projection calculates current display cents. Persisted backing components retain issuance cents until redemption. Keep current whole-supply/open-offer checks. Historical single-rail redemption keeps its existing behavior. Expect the Task 2 command to pass.
- [x] **Step 5: Commit effect and arithmetic tests only.** Message: `Resolve automatic asset backing in one native transition`.

### Task 3: Bind signed review, durable execution and proof projections

**Files:**
- Modify: `RECEIZ/app/lib/wallet/bankNotes/nativeAssetRuntime.server.ts`, `nativeAssetSource.server.ts`, `nativeAssetHolding.server.ts`, `nativeAccountCoverage.server.ts`.
- Qualify existing writer/replay: `RECEIZ/app/lib/ledger/fileActionLedgerHistory.server.ts`, `actionLedgerHistory.server.ts`; change only if a test proves an incompatible assumption.
- Tests: `RECEIZ/app/lib/wallet/__tests__/bankNativeAssetRuntime.test.ts`, `bankNativeAssetRuntimeRecovery.test.ts`, `bankNativeAccountFrontier.test.ts`, `bankNativeAccountArtifactSource.test.ts`.

**Interfaces:**
- Preserve `createBankNativeAssetRuntime(input)` and its `prepare`, `execute`, `recover`, `portfolio` methods.
- Preserve `nativeAssetTermsForPlan(plan,request):NativeAssetTerms`; automatic issuance derives `fundingComponents` from the actor debit movements and checks exact equality to `assetAfter.backingComponents` and request totals.
- Preserve `issueBankNativeAssetHoldings(input)`, `readBankNativeAssetHolding(input)` and `bankNativeAccountSourceProjection(input)`; copy components only when present in the verified native asset state.

- [x] **Step 1: Add failing real-source runtime cases.** Prepare automatic mixed funding, approve its existing identity challenge, execute once, reopen the ledger and canonically verify the operation/receipt/holding/account proof. Assert two debit rows, one activity, one nonce/asset ID, full supply and identical original components in every proof. Retained old receipts must not gain new keys. Replay a history containing both historical and new assets.
- [x] **Step 2: Run `pnpm test:crystal-native-bank-assets-closures` with the bundled Node PATH.** Expect new propagation tests to fail before runtime changes. Record any pre-existing failure separately; do not modify the other agent's files to make this suite pass.
- [x] **Step 3: Implement preparation and signed projections.** Carry `fundingRule` into the internal command; include the exact component list in automatic review terms and new receipts/holdings/account components. Preserve the existing financial signature, canonical seal, plan digest, consent challenge, participant locks and complete-prefix admission. Reject mismatch between the request mode, plan and approved review. Verify existing file/JSON storage accepts these additive variants; document the result without running a production migration.
- [x] **Step 4: Add and run rejection/recovery tests.** Changed wallet/global/auth head, changed rate and revoked key reject the old plan. Duplicate execution returns the same retained result. Inject interruption at the existing pending-writer boundaries and response loss after commit; recover the same nonce and assert no partial legs, duplicate debit, duplicate activity or second asset. Tampering with one plan movement or backing component fails source replay. Run the closures suite and `pnpm test:bank-native-wallet`; expect zero regressions.
- [x] **Step 5: Commit runtime, proof projections and tests only.** Message: `Preserve automatic backing through native asset proofs and recovery`. Include a note that Receiz must be pushed/deployed before Bank enables the new request.

### Task 4: Amount-only Bank creation with exact retained approval

**Files:**
- Modify: `BANK/src/receiz/bank-operations.ts`, `native-asset.ts`, `native-asset-holding.ts`, `deposit-source.ts`.
- Modify: `BANK/src/features/assets/CreateAsset.tsx`, `LiveAssets.tsx`, `BANK/src/features/account/NativeOperation.tsx`, `BANK/src/components/AccountProofDetails.tsx`.
- Tests: `BANK/tests/native-asset.test.ts`, `native-identity-assets.test.ts`, `native-asset-holding.test.ts`, `account-proof-closures.test.ts`, `native-operation-ui.test.tsx`; new `BANK/tests/automatic-asset-backing-ui.test.tsx`.

**Interfaces:**
- Extend `BankOperationInput` with the automatic fund-asset variant from Task 1; `BankOperationTerms` can carry its verified `fundingComponents`.
- Preserve `createBankOperations(input):BankOperations` and `createNativeAssets(input)` behavior, including exact review object binding, confirmation digest, durable unknown checkpoint and read-only recovery.
- Extend `HeldDeposit.nativeAsset` to retain `backingRail:'reserve'|'settlement'|'composite'` and optional `backingComponents`; pass exact verified fields through `openNativeAssetHolding`.
- `CreateAsset` submits `{kind:'fund-asset',fundingRule:'reserve-first-then-settlement',definition,amountUsdCents}`. Remove `rail` state and selector only from backed creation. Preserve existing moment/source restrictions and publication.

- [x] **Step 1: Add failing UI/adapter tests.** Assert amount-only backing controls and exactly one automatic preparation request, with no client balance-allocation/preflight request. Approval shows the total prominently and the exact Reserve/Settlement cents and Phi under Transaction proof. Editing the amount invalidates the review; malformed/missing components never become an approvable review. For ambiguous loss, the original component-bearing request is retained before execute and only recover is called afterward; another family pending still blocks issuance.
- [x] **Step 2: Run `npm test -- tests/automatic-asset-backing-ui.test.tsx tests/native-operation-ui.test.tsx tests/native-asset.test.ts tests/native-identity-assets.test.ts tests/native-asset-holding.test.ts tests/account-proof-closures.test.ts --maxWorkers=2`.** Expect the new cases to fail before product edits.
- [x] **Step 3: Implement UI and adapter changes.** Closed input/term readers accept only the exact mode. Generic execution must not silently choose a rail or attempt two operations if native support is absent; fail without submitting. Carry component fields through verified holdings and account-proof details. Use existing detail-list/transaction-proof styles; no new requests or page-load checks. Copy: `Your account funds this amount automatically.` Show the detailed split only in discoverable proof details.
- [x] **Step 4: Re-run the focused command.** Expect all new and existing cases to pass. Verify local browser fixtures at 390px and 1440px: no rail selector, stable review/edit/approval/recovery, readable split, unchanged Seal a moment flow, no overflow and no extra API calls. Use test identities only; do not create a real asset.
- [x] **Step 5: Commit the Bank adapter and UI batch.** Message: `Create backed assets from one automatic account amount`.

### Task 5: Document and qualify the coordinated delivery

**Files:**
- Create: `BANK/docs/automatic-asset-backing.md`.
- Modify: `BANK/docs/native-assets-and-account-proofs-v129.md`, `BANK/docs/market-trade-execution.md` to link and summarize the exact contract.
- Modify: this plan and the approved spec with actual implementation/qualification status.
- Generated when required by build: `BANK/src/receiz/offline-proof-build.ts`.

**Interfaces:**
- Document the exact wire examples from Tasks 1–4, legacy compatibility, component arithmetic/redemption, source admission and same-operation recovery. Separate verified local behavior from hosted qualification.
- Delivery order: Receiz contract/runtime first, Bank amount-only caller second. No silent fallback to the old rail selector or partially funded issuance.

- [x] **Step 1: Document verified storage compatibility and the new contract.** Confirm the existing native JSON/file statement and writer need no SQL migration before saying so. Keep this change out of SDK version pins, account entry and unrelated Receiz Crystal work.
- [x] **Step 2: Run Bank `npm run typecheck`, `npm test -- --maxWorkers=2`, then `npm run build` with source edits frozen for archive verification.** Expect all suites and source/license/offline/public-page checks to pass. Do not broaden Receiz typechecking into the previously memory-exhausting whole-app command; use the focused closure/wallet suites from Task 3 and the repository's existing scoped checks.
- [x] **Step 3: Review the exact diffs in both repositories against all five Review Focus conditions.** Verify no weaker proof path, added round trip, changed antirollback, partial commit or unrelated agent file appears. Fix findings and repeat only affected checks.
- [x] **Step 4: Commit documentation and generated metadata, report both commit IDs and verification results.** Leave pushing and production qualification to the user. State any hosted check that still needs the coordinated Receiz deployment; do not label local tests as a live financial qualification.

## Plan self-review

The request/terms/state/receipt/holding/account-proof contracts are covered by Tasks 1 and 3; allocation and component-preserving redemption by Task 2; the amount-only experience and exact pending intent by Task 4; storage, documentation and delivery by Task 5. Each Review Focus condition has an explicit test in its owning task. Component names and mode strings are identical across repositories. No task changes the canonical verifier, identity entry, signature roots, antirollback rule or durable writer authority.

**Status:** Approved and implemented locally. Qualification and explicit deviations are recorded in [the local evidence](../../verification/2026-10-21-automatic-asset-backing.md). Mixed hosted Settlement ingress remains a deployment qualification; the new rich composer/publication design is separate.
