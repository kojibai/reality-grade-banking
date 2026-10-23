# Fixed Checkout and Merchant Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a merchant create a fixed checkout, share its link/button/QR, and automatically confirm the exact received payment on a polished Counter screen.

**Architecture:** Extend the existing hosted checkout with a canonical fixed-sale request and its payment reference. A lazy merchant controller retains expected sales and admits matching received originals through the existing authenticated integration. Keep the receiving watcher separate from payment execution and all ordinary page-load paths.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, existing Bankeiz custody and QR helpers, pinned Receiz SDK/MCP/AI Skills 129.0.0. No new runtime dependency.

**Spec:** [Approved merchant Counter design](../specs/2026-10-22-merchant-counter-design.md).

**Execution:** Preserve the user's selected method: implement in this session on main using `superpowers:executing-plans`, followed by one fresh independent final review. Commit locally; the user pushes. This plan requires review before product implementation.

## Global Constraints

- No new funding, ownership, admission or financial execution rules are introduced.
- Existing editable payment links and Send links retain their current behavior.
- Automatic device identity, optional Identity Record saving, Card, Balance and all currently supported Note types remain the existing checkout experience.
- No new Receiz endpoint, sibling-repository change or weaker acceptance rule is part of this design.
- The URL contains public request coordinates only. It contains no private Identity Record, access token, card session secret or spending grant.
- Reuse the existing QR encoder and verify generated URLs fit its 230-byte capacity at every accepted bound.
- No link, scan, page load or merchant action approves the customer's payment.
- Do not add any polling to ordinary account, Market, asset or checkout load.
- Fixtures demonstrate adapter behavior, not deployment qualification.
- A real payment or card charge requires separate explicit approval for that exact operation; automated tests use synthetic sources.
- Preserve package version 3.0.0, pinned dependency versions, original conformance artifacts, current financial scopes and shared footer. Do not issue a new certificate or claim live financial qualification from engineering tests.

## Review Focus

1. A fixed URL is changed, truncated or scanned inside Send: it must never silently become an editable payment or confirm the merchant's original sale. Task 2 owns these cases.
2. A card return or an older pending checkout belongs to another sale: restore the original intent without replacement, duplicate payment or mismatched confirmation. Task 3 owns these cases.
3. An authentic original for another recipient, amount or reference is supplied: decline admission even when a customer-side screen says Paid. Task 4 owns these cases.
4. Two counter tabs race, or an old sale receives payment after Next sale: retain both requests and actual receipts without losing the older payment. Task 5 owns these cases.
5. The page goes offline/hidden, identity changes, or a result arrives after disposal: stop checks, discard stale UI updates and keep the retained sale recoverable. Tasks 5 and 6 own these cases.

## File and interface map

| Unit | Files | Responsibility |
| --- | --- | --- |
| Contract qualification | New `docs/verification/2026-10-22-merchant-receiving-contract.md` | Record the actual recipient-authorized discovery/original-read contract and its qualification evidence; no fabricated live pass |
| Fixed request | New `src/receiz/fixed-checkout.ts`; existing `checkout-request.ts`, `payment-request.ts` | Exact request digest, compact URL, strict parser and opaque payment reference |
| Payer integration | Existing `checkout-state.ts`, `hosted-checkout.ts`, `src/checkout/{HostedCheckout,CheckoutReceipt}.tsx`, `src/checkout/entry.ts` | Bind fixed sale through approval, funding, recovery and receipt |
| Original admission | New `src/receiz/wallet-transfer-original.ts`, `merchant-receive.ts`; existing `wallet-send.ts` | Shared strict source checks and merchant-only read adapter |
| Merchant state | New `src/receiz/merchant-counter-state.ts`, `merchant-counter.ts`; existing `identity-vault.ts`, `native-identity.ts` | Identity-bound retained requests, admitted originals and guarded transitions |
| Watcher | New `src/receiz/merchant-counter-watch.ts` | One visible, bounded, coalesced receiving loop |
| Merchant UI | New `src/features/account/{MerchantCounter.tsx,merchant-counter.css}`; existing `LivePayments.tsx`, `PaymentScanner.tsx` | Counter entry, QR, status, sharing and accessibility |
| Distribution | Existing `src/receiz/payment-tools.ts`, `src/features/account/PaymentTools.tsx`, `institution/accept-payments.md`; new typed `institution/examples/fixed-checkout.ts` | Fixed-link/button generation and integration instructions |

Keep identity glue narrow. Do not restructure the large existing identity module or import the dashboard into checkout. All paths below are relative to the repository root.

### Task 1: Qualify the receiving contract before enabling merchant confirmation

**Files:** Read `src/receiz/{wallet-send,native-messaging,native-chat-paths,native-transport,private-history,config}.ts`, installed SDK public documentation and `institution/accept-payments.md`. Create the qualification record listed above.

**Interfaces:** Consumes the existing authenticated `GET /api/connect/transfers?clientNonce=<nonce>` original resolver, private account history and conversation reads. Produces an exact contract table: authenticated principal/scopes, permitted discovery route, candidate field paths, recipient-authorized original route, source shape and absence/error meanings.

- [ ] Inspect the published integration and existing original acceptance code. Confirm whether a merchant principal can resolve an incoming transfer's original by the nonce; sender-side access is not evidence of recipient access.
- [ ] Use already-held incoming transaction material and read-only, identity-bound requests where available. Preserve sensitive bodies locally; record only sanitized shape/status evidence. Do not enroll another identity, issue Notes, transfer funds or charge a card for qualification.
- [ ] Record the exact discovery fields that carry the public payment note and the bounded original read. Require the complete original/payment/receipt source accepted by Task 4, not just a Ledger row or availability flag. Existing candidate projections are discovery only.
- [ ] Document current public-note capability and what is proved from source inspection, authenticated observations or synthetic tests separately. An exported SDK method name is not deployment evidence.
- [ ] **Gate:** If recipient-authorized original retrieval is unavailable or cannot be established, report the exact missing contract before enabling Counter or making a fixed sale payable. Do not invent an endpoint, relax admission, edit Receiz or publish simulated Paid behavior. Independent request-codec work may proceed, but the end-to-end feature cannot be declared ready.
- [ ] Commit the sanitized contract record: `docs: qualify merchant receiving integration`.

### Task 2: Add the exact fixed-sale codec and QR distribution

**Files:** Create `src/receiz/fixed-checkout.ts`, `tests/fixed-checkout.test.ts`; modify `src/receiz/{checkout-request,payment-request,payment-tools}.ts` and the corresponding existing request/tools tests.

**Interfaces:** Produce:

```ts
interface FixedSaleFields {
  schema: 'bank.fixed-checkout.v1'; saleId: string;
  recipientUserId: string; username: string;
  currency: 'usd'; amountUsdCents: string;
}
interface FixedSale extends FixedSaleFields { digest: string }
createFixedSale(fields: FixedSaleFields): Promise<FixedSale>
readFixedSale(value: unknown): Promise<FixedSale>
buildFixedSaleUrl(sale: FixedSale): string
fixedSalePaymentNote(sale: FixedSale, clientNonce: string): string
parseFixedSalePaymentNote(note: unknown): {saleDigest: string; clientNonce: string} | null
```

Extend `CheckoutRequest` with optional `fixedSale: FixedSaleFields`, leaving ordinary requests unchanged. The parser remains synchronous; admission computes/validates the digest. Use `/pay/<username>/?amount=12.30&sale=<UUID>&recipient=<UUID>&fixed=1`. Require all fixed parameters together. Compute the canonical digest with the installed SDK's existing canonical digest helper. Define the payment note exactly as `bank.sale.v1:<64-lowercase-hex-sale-digest>:<UUID-clientNonce>`; it remains within the existing 280-character note bound.

- [ ] Write failing tests for a round trip, exact cents, digest changes after altering any field, wrong UUID/currency/username, zero/overflow, partial/duplicate fixed parameters and unchanged ordinary links. Assert the longest emitted accepted URL fits 230 UTF-8 bytes.
- [ ] Add a QR round-trip assertion using the existing independent decoder against the generated matrix; no QR runtime package is added. Check the existing full-matrix vectors still pass.
- [ ] Run `npm test -- --maxWorkers=4 tests/fixed-checkout.test.ts tests/checkout-request.test.ts tests/payment-tools.test.ts tests/payment-qr.test.ts`; confirm the new cases fail for absent behavior first.
- [ ] Implement the codec and parser. Accept normalized positive amounts with at most 18 whole USD digits and two fraction digits, compatible with the existing request parser and 20-digit cents bound; do not apply the card charge maximum to a fully funded Balance/Note payment.
- [ ] Preserve fixed checkout as a distinct scan result using an optional `checkoutUrl` on `PaymentRequest`. Its recipient/amount are presentation only; fixed requests must open that validated canonical URL. Ordinary scans retain their current Send behavior. Reject malformed fixed URLs instead of reducing them to editable requests.
- [ ] Extend payment-tool generation to consume a validated fixed URL and escape it in the button HTML; preserve all ordinary link/widget outputs.
- [ ] Run the focused tests and `npm run typecheck`; commit `feat: add fixed checkout requests and QR links`.

### Task 3: Carry the fixed sale through the existing payment lifecycle

**Files:** Modify `src/receiz/{checkout-state,hosted-checkout}.ts`, `src/checkout/{HostedCheckout,CheckoutReceipt}.tsx`, `src/checkout/entry.ts`; create `tests/fixed-hosted-checkout.test.ts`; extend `tests/{checkout-state,hosted-checkout-ui,checkout-routing}.test.*` and `tests/fixtures/hosted-checkout.ts`.

**Interfaces:** Extend `CheckoutApproval` and `CheckoutReceipt` with optional `fixedSale: FixedSale`. Extend `HostedCheckoutController.prepare` with optional `fixedSale: FixedSaleFields`. Keep all existing arguments and ordinary checkpoint digests byte-compatible when the field is absent. The full fixed request participates in the approval digest when present.

- [ ] Write failing controller tests for fixed Card, fully funded Balance and Reserve/Settlement/Settlement Reserve Notes, including Balance/card shortfall, minimum-charge remainder and Note surplus. Assert the exact request and computed payment note survive every funding and reprepare path.
- [ ] Add refusal tests for recipient resolution differing from the fixed stable user ID, changed amount/digest, absent `publicTransferNotes`, changed funding contribution, an unrelated pending payment, and an earlier card return after a newer sale is opened. Assert no financial dispatch occurs in these refusals.
- [ ] Run `npm test -- --maxWorkers=4 tests/fixed-hosted-checkout.test.ts tests/checkout-state.test.ts tests/hosted-checkout.test.ts tests/checkout-routing.test.ts` and verify new failures.
- [ ] Validate fixed fields before review and bind the resolved recipient ID to the request. Pass the exact payment note to `WalletSend.prepare` both initially and in `continuePayment`; compare it with the retained review before execution. Keep the existing nonce, funding and outcome-resolution rules.
- [ ] Validate fixed sale on retained-state reads, approval-history revisions and receipt matching. Old records without a fixed sale remain readable; do not recompute or silently migrate their historic digests.
- [ ] Make fixed amount read-only in the form, review and Back view. On a card return, restore the fixed request from the exact retained checkout/session before displaying or continuing it; do not trust additional return-query sale parameters. A receipt for that fixed sale has no “pay again” action that creates another attempt for the same sale.
- [ ] Add UI assertions for the locked amount, funding contributions, original pending recovery, and concise sale-reference disclosure. Re-run the affected checkout, wallet funding and Note tests plus typecheck.
- [ ] Commit `feat: preserve fixed sale through checkout and recovery`.

### Task 4: Admit matching received originals without changing Send acceptance

**Files:** Create `src/receiz/{wallet-transfer-original,merchant-receive}.ts`, `tests/{wallet-transfer-original,merchant-receive}.test.ts`; modify `src/receiz/wallet-send.ts`. Reuse/extend `tests/fixtures/wallet-send.ts` for synthetic sources only.

**Interfaces:** Produce `readWalletTransferOriginal(raw: unknown): WalletTransferOriginal` with transfer/message/conversation IDs, nonce, both parties, exact integer values, public note, receipt digests and original source. Produce:

```ts
inspectMerchantPayment(raw: unknown, sale: FixedSale,
  accountUid: string): MerchantPaymentEvidence
interface MerchantPaymentEvidence {
  transferId: string; clientNonce: string; senderUserId: string;
  recipientUserId: string; amountUsdCents: string;
  conversationId: string; messageId: string;
  recordedAt: string | null; source: unknown;
}
interface MerchantReceive {
  check(sales: readonly FixedSale[], signal: AbortSignal):
    Promise<readonly {saleId: string; evidence: MerchantPaymentEvidence}[]>;
}
```

The receiver consumes only the exact discovery/read contract qualified in Task 1. It parses the sale digest and nonce from candidate notes, reads the authenticated original, recomputes the expected full note from the retained sale and original nonce, and rejects conflicting fields. Candidate payloads never become accepted evidence by themselves.

- [ ] Write failing tests for a complete matching source and mutations of every required ID, party, cents, Phi/price value, note visibility/reference/nonce, receipt digest and original body. Require `ok:true`, `found:true` and the complete source relationships currently required by Wallet Send.
- [ ] Test unauthenticated/foreign-account sources, unrelated credits, partial/overpayments, lookalike notes, forged browser completion and a projection with `sealedOriginalAvailable:true` but no original. None may return accepted evidence. Unavailable source retrieval is an unresolved read, never proof of nonpayment.
- [ ] Run the new files with existing `tests/wallet-send.test.ts` and verify new failures.
- [ ] Extract the common strict original checks from `wallet-send.ts`; keep its expected sender/recipient/nonce/conversation/amount/note comparisons intact. Do not widen the accepted source shapes during extraction.
- [ ] Implement the incoming adapter with the current identity, existing protected read scopes and bounded/cancelable requests. Coalesce identical original lookups within a check. Do not scrape public history, read arbitrary accounts or add a new proxy route.
- [ ] Run `npm test -- --maxWorkers=4 tests/wallet-transfer-original.test.ts tests/merchant-receive.test.ts tests/wallet-send.test.ts tests/wallet-send-card-funding.test.ts tests/wallet-send-checkout.test.ts tests/fixed-hosted-checkout.test.ts` and typecheck.
- [ ] Commit `feat: verify merchant payment originals against fixed sales`.

### Task 5: Retain merchant sales and implement the foreground watcher

**Files:** Create `src/receiz/{merchant-counter-state,merchant-counter,merchant-counter-watch}.ts`, `tests/{merchant-counter-state,merchant-counter,merchant-counter-watch}.test.ts`; modify `src/receiz/{identity-vault,native-identity}.ts`.

**Interfaces:** `MerchantSale` holds a validated `FixedSale`, private identity digest, creation time for display only, and distinct admitted receipts. `MerchantCounterState` uses schema `bank.merchant-counter.v1`, identity digest, revision, active sale ID and retained sale list. Produce:

```ts
readMerchantCounterState(raw: unknown, identityDigest: string,
  accountUid: string): Promise<MerchantCounterState | null>
createMerchantCounter(deps: MerchantCounterDependencies): MerchantCounterController
// controller: ready, snapshot(), subscribe(listener), create(amountUsdCents),
// select(saleId), check(signal), dispose()
watchMerchantCounter(input: {
  check(signal: AbortSignal): Promise<'changed' | 'unchanged'>;
  onError(): void; isVisible(): boolean; isOnline(): boolean;
}): {wake(): void; dispose(): void}
```

Dependencies supply the admitted merchant ID/username, existing digest, receiver, encrypted compare-and-swap store, current-identity assertion and named cross-tab lock. Add lazy `OpenIdentity.merchantCounter()`; its disposal stops both controller and watcher. Use the existing `loadNoteState`/`saveNoteState` wrappers under scope `merchant-counter`. No financial checkpoint is replaced.

- [ ] Write failing tests for create-once retention before QR, reopen, invalid request digest, foreign identity/account, concurrent expected-revision writes, repeated evidence, a genuine second transfer, and a late payment to a previous sale after selecting Next sale. Accepted sources are revalidated when reopened.
- [ ] Add fake-timer watcher tests for one in-flight read, initial foreground check, unchanged backoff at 2/5/15 seconds, network-error backoff, hidden/offline pause, one coalesced wake on return, timeout and disposal. Use a 15-second request deadline; no timed-out request may adopt a late result.
- [ ] Run the new tests to establish failure, then implement state admission and controller transitions. UI phase is `waiting | checking | paid | attention-required`; an accepted Paid receipt remains Paid through later network failure. Keep explicit additional-payment evidence alongside Paid rather than replacing its first receipt.
- [ ] Wire the lazy identity service with narrow read grants and current-principal checks. It must not call full `prepareAccountView` or portfolio reads. Start no checks merely by restoring the bank identity or opening Receive.
- [ ] Add focused identity/vault tests confirming lock/revision behavior, ciphertext retention and no key/session secret in public links. Missing custody, corrupt state or unsupported originals must fail safely. Identity Record export is not described as exporting all local merchant-sale history.
- [ ] Reuse existing account/message notifications as wakeups where already available. Add no messaging subscription or permission expansion solely to run Counter. Poll only while Counter is open and visible; after Paid, stop fast polling and check retained sales on existing updates/manual refresh/next active-sale checks.
- [ ] Run the new state/controller/watcher tests, existing identity/vault tests and typecheck; commit `feat: retain counter sales and observe received payments`.

### Task 6: Build the Counter screen and preserve fixed requests when scanning

**Files:** Create `src/features/account/{MerchantCounter.tsx,merchant-counter.css}`, `tests/merchant-counter-ui.test.tsx`, `tests/browser/{merchant-counter.html,merchant-counter.tsx}`; modify `src/features/account/{LivePayments,PaymentScanner,PaymentTools}.tsx` and extend relevant scanner/tools tests.

**Interfaces:** `MerchantCounter({identity,onBack}: {identity:OpenIdentity;onBack():void})` lazily opens the Task 5 controller. Existing Receive gains a **Counter** action. `PaymentScanner` consumes the Task 2 validated `checkoutUrl`; a fixed scan navigates to that exact checkout, while ordinary scans still call `onRequest`.

- [ ] Write failing UI tests for entry, positive total, retained QR, Waiting, matching Paid, manual checking after network failure, additional payment, Next sale and return to an older unresolved sale. Assert navigation does not cancel submitted money or discard merchant evidence.
- [ ] Add scanner tests for pasted links, QR image and camera results containing a fixed request; all must preserve its binding and stop camera tracks before navigation. Malformed links remain on the scanner with an error.
- [ ] Run the UI/scanner tests to establish failure. Implement the focused light Counter screen using existing tokens, logo, avatar, amount and button patterns; isolate its CSS and lazy-load the view from Receive.
- [ ] Show the merchant identity, large total, reserved-size QR, status and quiet copy/share/button controls. Show **Paid**, the exact total and **Next sale** after admission. Put receipt/source details inside a disclosure. Give unresolved or additional payments specific, readable attention copy.
- [ ] Build a two-role synthetic browser harness with distinct merchant/customer stores and no live financial/enrollment operations. Cover Card, Balance and all three Note rails, card return, lost response/reload, forged callback, mismatched amount, prior sale and duplicate receipt delivery.
- [ ] Inspect the rendered screens at 320, 390, 768 and 1440 px; independently decode the displayed QR; exercise keyboard focus, screen-reader status semantics, reduced motion, hidden/offline resume, identity change and unmount. Record screenshots and exact outcomes in the verification record without declaring synthetic success a live payment.
- [ ] Re-run affected checkout/Receive/scanner/tools tests and typecheck; commit `feat: add merchant counter with automatic payment confirmation`.

### Task 7: Document, review and qualify the complete change

**Files:** Update `institution/accept-payments.md`, create `institution/examples/fixed-checkout.ts` and `tests/fixed-checkout-example.test.ts`, update the existing get-paid guide source in `src/content/guides.tsx`, and create `docs/verification/2026-10-22-merchant-counter.md`. Refresh `src/content/conformance-baseline.json` only from a fresh full test run.

- [ ] Add a typed example that accepts a validated fixed sale and produces the same checkout URL/button as Counter. Test its exact URL, safe HTML escaping and unchanged payment-request identity/amount. No custom card session, webhook, SDK endpoint or browser Paid callback is invented.
- [ ] Document Counter setup, one-time sale links/buttons/QRs, existing payment methods, saved identity continuity, merchant-original confirmation, recovery and genuine additional payments. Explain that normal amount-prefill links stay editable and that Counter is a hosted phone checkout rather than a card-present terminal.
- [ ] Request one fresh independent whole-change review using the approved native execution method. Supply the approved spec/plan, actual patch and verification evidence; address actionable findings and rerun affected tests before final qualification.
- [ ] Capture source hashes, run the complete suite, then generate its engineering record:

```sh
node scripts/conformance-baseline.mjs --snapshot /tmp/bankeiz-counter-sources.json
npm test -- --maxWorkers=4 --reporter=default --reporter=json --outputFile=/tmp/bankeiz-counter-tests.json
node scripts/conformance-baseline.mjs /tmp/bankeiz-counter-tests.json --sources /tmp/bankeiz-counter-sources.json
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

- [ ] Recheck the production-built customer entry and Counter harness. Verify fixed QR routing, exact return recovery, viewport behavior and teardown; confirm new receiving code is outside ordinary initial page loading and makes no background calls there.
- [ ] Record test/browser/build results and the Task 1 contract qualification separately. If live receiving capability is unresolved, explicitly mark the feature incomplete; do not convert fixtures into a deployed claim.
- [ ] Run `git diff --check`, inspect the staged scope for unrelated changes/private data, and commit `feat: complete fixed checkout and merchant counter integration`. Report the commit(s), confirmed behavior, verification and any real remaining qualification limit. Do not push, tag or deploy.

## Completion criteria

The merchant can create and resume a fixed sale, share one link as URL/button/QR,
and see a matching payment automatically confirmed from the merchant's actual
received original. All existing funding and recovery behavior remains intact.
The receiving contract is qualified, meaningful tests and production distribution
checks pass, and the reviewed implementation is committed on main for the user to
push. A design, partial checkout UI, synthetic Paid screen or unqualified source
lookup does not satisfy completion.
