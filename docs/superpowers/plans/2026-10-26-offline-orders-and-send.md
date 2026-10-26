# Offline orders and Send implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan inline, task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish local Send and automatic price-bound offline Market orders, with real funded fills, conditional Open orders, recovery and exact synchronization.

**Architecture:** Reuse the existing admitted financial Source, normal Identity and SDK record signer, exact-byte retention, atomic admission store and additive publisher. A signed pending order is a separate family from a committed financial action. Its reservation, each actual fill and cancellation must have actual source-bound financial effects before the app presents them as accepted.

**Tech stack:** Existing Receiz SDK/native browser composition, TypeScript, React, IndexedDB, existing Connect transport and verified-addition lifecycle. No new application runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-26-offline-market-orders-design.md`; existing Send invariants remain in `docs/superpowers/specs/2026-10-22-local-payment-execution-design.md`.

## Global constraints

- Work inline on main in both checkouts. User pushes. No deployment, publishing, real-money testing or production configuration mutation.
- Existing connected trade and card-funding screens/behavior stay unchanged.
- Offline orders have no order-type, execution-price or remainder selector.
- Buy at the reviewed executable ask or lower; Sell at the reviewed executable bid or higher. Retain the approved bound.
- Preserve request Kai and record each actual fill Kai. Never retroactively change completed fills.
- Preserve mixed cash/settlement ecosystem sale classification. A cash-backing shortage alone does not forbid a sale the current reducer permits.
- Keep unfilled remainders open and cancellable. Only active offline-origin orders produce an Open orders disclosure in Investments.
- A signed request, callback success, generic mandate, displayed price or queued network request is not a funded trade or financial authority.
- Actual exclusive reservation and exact financial effect admission precede accepted order/fill presentation. No future deposits are silently swept into an order.
- Bank contains SDK/browser integration and corresponding source only; provider implementation belongs in Receiz.
- Reuse existing synchronization/wake opportunities. No new timer polling, login gate, duplicate verifier or history replay on rendering.
- Preserve unrelated Vault outputs and other-developer files.

## Review focus

- An order created without a complete price/funding source must never become a completed trade.
- Reconnection must not reinterpret an unknown old online attempt as a new offline order.
- A fill racing cancellation must conserve the exact remaining reservation and retain one outcome.
- Multiple offline orders must not reserve the same money or shares; Send/Note/Vault/other-device spending must respect exclusive custody.
- Closed/expired authority must retain recoverable orders and a real cancellation/release path without phantom renewal.

## Task 1: Qualify and implement the signed SDK order-request boundary

**Receiz files:** create `packages/receiz-sdk/src/accountMarketOrder.ts` and `app/lib/wallet/__tests__/accountMarketOrder.test.ts`; use existing Source/Commit/Math modules and existing fixture utilities.

**Interfaces:** `createReceizAccountMarketOrderRequest({source,predecessor?,orderId,action,orderKaiUPulse,signOwner,signRecord})`; `admitReceizAccountMarketOrderRequest(bytes,{source,predecessor?})`; `exportReceizAccountMarketOrderRequest(request)`.

The exact signed request binds the whole admitted Source, genuine predecessor, application/account, original action unit, asset proof, original Kai and calculated side-specific price bound. Its status is a pending request, never a completed or funded trade. Creation/admission grant no reservation or economic effect by themselves.

- [x] Add actual-crypto tests for Buy/Sell bounds, exact export/reopen, original Kai after clock advancement, altered fields/signatures, wrong source/parent, absent dynamic pricing, expired source, insufficient own funding/ownership and zero network/economic writes.
- [x] Observe failure before implementation. Implement only this closed request boundary using existing source and signature primitives.
- [x] Run the financial gate, SDK build, strict types and scoped lint. Commit qualified source/tests together.

## Task 2: Qualify actual order reservation, fills and cancellation in Receiz

**Receiz implementation boundary:** extend the actual financial custody/execution provider and matching SDK financial-domain verifier. Keep archival Source/action schemas unchanged. The provider's actual source family selects the writer; native custody must not fall through into a compatibility provider.

**Interfaces consumed:** Task 1's admitted exact request and its whole Source/parent. **Produced:** SDK-custodied reservation, fill and cancellation Originals that conserve money, cash/settlement classification, shares and cost basis. A public receipt is not spend authority.

- [ ] Write positive source/provider tests for an exclusive user-side reservation. Competing orders, ordinary Send/Note/Vault and another device cannot consume its rights. A no-op callback cannot qualify.
- [ ] Implement the reservation with the provider's actual atomic financial writer/readback. Qualify actual parent retention before issuing child/order custody; no new financial root or generic document wrapper per action.
- [ ] Add a price-bound fill test: one actual fill inside the bound, no fill outside, partial capacity, immutable first result on retry and integer rounding residue. Reuse the canonical financial calculator at actual fill Kai.
- [ ] Add fill/cancel races, partial cancellation, expiry and false/lost acknowledgement tests against the actual provider, not a simulated success flag.
- [ ] Qualify an automatic executor under exactly the signed order authorization. A normal account key must never be uploaded to obtain background execution. If an execution host lacks this actual bounded authority, it cannot be selected.
- [ ] Preserve completed legacy trade behavior; commit only after actual financial preservation and duplicate-execution checks pass.

## Task 3: Connect genuine financial source preparation and incoming additions

**Receiz existing files:** `accountFinancialPreparation.server.ts`, `accountFinancialPreparationInputs.server.ts`, `accountFinancialSourceIssuer.server.ts`, `accountFinancialAdoption.server.ts`, `accountFinancialAdoptionStore.server.ts`, `accountFinancialReceipt.server.ts`; existing authorized Bank transport boundaries.

**Interfaces:** authenticated preparation/recovery uses the real caller/account/application and the existing protected Identity carrier. Only actual qualified Wallet/Market readers supply funding, membership, positions, price operands and recipient bindings. Exact Source/financial Originals, not posted display totals, cross the boundary.

- [ ] Add an actual authorized HTTP preparation test with real source inputs and normal exact owner consent. Wrong actor/application, public observations, incomplete custody and lost acknowledgement cannot issue funding.
- [ ] Implement source delivery and preparation using the existing issuer/provider contract, preserving selected-source refusal and first retained Original recovery.
- [ ] Add incoming credit/fill-return tests: an actual verified addition becomes spendable once, includes original funding continuity and cannot be credited again during global adoption. Notification and public-only receipt inputs confer no spending rights.
- [ ] Wire exact publication and recipient delivery through existing synchronization; no ordinary execute POST may substitute for adopting an already committed Original.
- [ ] Verify source handoff/recovery with independent incoming additions and old pending connected attempts. Commit qualified integration.

## Task 4: Wire local Send and offline Market orders in Bank

**Files:** `src/receiz/{local-financial,local-financial-runtime,native-identity,wallet-send,market-trade}.ts`, matching corresponding native sources and existing receiving/portfolio adapters. Add focused tests alongside `tests/local-financial-integration.test.ts`, `tests/wallet-send.test.ts`, `tests/market-trade.test.ts` and account wake tests.

**Interfaces:** consume only matching SDK-custodied results from Tasks 1–3. Keep pending orders, committed local Send, accepted fills and historical connected observations as distinct result families. Old checkpoints keep their original recovery namespace.

- [ ] Add offline Source → durable Send → exact reconnect → automatic receiver-admission tests with background reads held. No duplicate debit/credit and no screen reload.
- [ ] Add offline order → durable pending retention → reconnect eligibility → partial fills/cancel tests using actual SDK financial verification. No completed purchase or proceeds before a genuine fill.
- [ ] Implement normal existing-signer and IndexedDB composition, existing account locks, exact Original storage and existing reconnect lifecycle. Preparation never holds first paint or online trading open.
- [ ] Update balances/positions inline from admitted absolute state or verified additions; preserve late-response guards, cost basis, notifications, card minimum/delta rules and existing funding recovery.
- [ ] Rebuild only the corresponding changed SDK sources. Preserve Bank's customized native Note entry, source provenance and all historical patch metadata.

## Task 5: Add the conditional Investments disclosure

**Files:** `src/features/assets/{Investments,LiveAssets}.tsx`, `src/features/assets/investments.css`, `src/features/market/LiveMarketTrade.tsx` and `tests/investments.test.tsx` plus offline-order UI tests.

**Interfaces:** one retained account-scoped open-order view from the SDK integration; no independent financial calculator or fetching loop in the component.

- [ ] Add failing rendered tests: an online-only account has unchanged controls and no order requests; active offline orders show Open orders even with zero holdings; closing the last order removes it while completed fills stay in history.
- [ ] Add no-selector offline review copy, a compact count/disclosure and rows for asset, direction, filled/remainder, price bound and Cancel. Reuse existing sheet/row styles.
- [ ] Test actual cancellation states and fill races, identity replacement, retained first paint and absence of duplicated source/valuation work.

## Task 6: Complete actual browser qualification and main commits

- [ ] Exercise actual retained SDK/native storage in sender/receiver browser contexts. Cover offline, restart, multiple orders, reconnect, paused/duplicate/reordered delivery, automatic fills, source expiry and cancellation.
- [ ] Run the full Bank suite with zero unreported failures/skips, strict types, native source/resource reproduction and the expanded actual financial provider gates. Re-run broader checks only for changes or unresolved failures.
- [ ] Record request counts and local durable completion/visible completion separately. Do not present fixture timing or suite duration as production latency savings.
- [ ] Obtain one fresh whole-integration review, fix concrete important findings with RED→GREEN tests, and commit matching main changes. Report production/physical-device qualification separately. User pushes.

## Execution ruling

The user explicitly requested inline main execution and then said to finish the agreed flow end to end after clarifying the design. Preserve that authorization; do not ask again for an execution method or another abstract design choice. New destructive/production side effects still require their own concrete authorization. Tests and component commits do not establish consumer activation.

## October 26 Send timing clarification

The user confirmed: seal and durably retain Send at its original Kai with normal Identity signing, without additional device/PBI/Note custody requirements. The receiver is credited only when that exact Send is accepted during sync. Preserve the original sent Kai and the distinct received/accepted Kai; neither replaces the other. Local sealing does not claim that the other account has already received funds. Reconnect must retain once-only acceptance and cannot create a second Send.
