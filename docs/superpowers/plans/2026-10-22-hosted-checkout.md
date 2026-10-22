# Hosted Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver one polished Bankeiz checkout for card, balance and all three supported Note types, with automatic device identity and shared link/button/QR entry.

**Architecture:** A dedicated React entry owns a lightweight device-identity lifecycle and a retained checkout controller. The controller composes existing Wallet send, card funding and Note adapters; it never supplies a separate balance or payment writer. Existing Send behavior and Receiz UI remain unchanged.

**Tech Stack:** TypeScript, React 19, Vite 7, Vitest 5, existing private device custody and Web Locks, pinned Receiz SDK/MCP/AI Skills 129.0.0, existing QR encoder and secure Receiz card frame. No new product dependency is planned.

**Spec:** [Approved hosted checkout design](../specs/2026-10-22-hosted-checkout-design.md), approved October 22, 2026. Read the spec and this plan before implementation.

## Global Constraints

- Canonical entry: `/pay/<username>/`, with optional `amount=<decimal USD>`.
- Accept the equivalent path without a trailing slash.
- There is no signup screen; saving the **Identity Record** is optional and never gates payment.
- Only a successful restore reporting no identity permits automatic creation through `createNativeIdentity(true)`.
- A restore failure never replaces an ID.
- One **Note** choice accepts **Reserve**, **Settlement** and **Settlement Reserve** Notes through `identity.offlineNotes()`.
- Card minimum/maximum remain $0.50–$100,000; funding above the shortfall is disclosed before approval.
- Do not spend an existing balance first when the customer explicitly selected full card payment.
- Reserve is used first and Settlement covers the remainder for balance payment.
- Opening the link or scanning a QR never funds or submits a payment.
- Show **Paid** only when the existing Wallet result is `recorded` and its original source matches the retained payer, recipient, amount, conversation and nonce.
- A Note received offline is not confirmed usable merchant credit.
- Resume/status checks use the exact saved operation and explicit user actions or the guarded completion event. Do not add interval polling.
- Keep Receiz UI unchanged. Describe Bankeiz's SDK composition and actual evidence in its documentation.
- No Market catalog, full account dashboard, messaging or chart runtime is needed to paint checkout.
- No live charges, Note deposits or transfers during automated or browser qualification without separate authorization.

## Review Focus

1. Two tabs or a checkout/account race must reuse the first admitted identity, never overwrite it; Task 2 tests this at entry and persistence boundaries.
2. A renamed/reassigned handle or an old async result must not change who receives an approved payment; Tasks 3 and 6 test immutable recipient/account bindings.
3. Refresh immediately after Note deposit or card credit must continue once, without another deposit, charge or transfer; Tasks 4–6 test each crash boundary.
4. Card minimums and changing Settlement value must not turn an estimate into undisclosed funding or surplus; Tasks 3, 5 and 7 test exact observed amounts and renewed approval when needed.
5. SCA/top-level return, multiple payment tabs and a paid old session must resolve the matching checkout without consuming a different attempt; Tasks 3, 6 and 9 test return and history lookup.

## File Map and Shared Interfaces

Paths below are relative to the repository root. Existing large modules receive
small adapter hooks; new checkout logic stays in focused files.

| Unit | Files | Responsibility |
| --- | --- | --- |
| Public request | `src/receiz/checkout-request.ts` | Username, amount, URL and HTML link contract |
| Device entry | `src/receiz/device-identity-entry.ts`, `src/checkout/checkout-identity.ts` | Shared exclusive identity entry and checkout lifetime |
| Existing payment adapter | `src/receiz/wallet-send.ts` | Explicit full-card funding, stable caller nonce, validated retained result |
| Private checkout custody | `src/receiz/checkout-state.ts`, `src/receiz/identity-vault.ts` | Validated encrypted intent and source references |
| Note tender | `src/receiz/checkout-notes.ts` | Exact source inspection, deposit and original-result reconciliation |
| Orchestration | `src/receiz/hosted-checkout.ts` | State machine, exact approval and once-only continuation |
| Public experience | `pay/index.html`, `src/checkout/{main.tsx,HostedCheckout.tsx,checkout.css,CheckoutIdentity.tsx,CheckoutNotes.tsx,CheckoutReceipt.tsx}` | Dedicated responsive checkout and subviews |
| Routing | `server/checkout-preview-plugin.ts`, `vite.config.ts`, `vercel.json` | Same `/pay/<username>/` entry in dev, preview and production |
| Acceptance tools | `src/features/account/{LivePayments.tsx,PaymentTools.tsx}`, `src/receiz/payment-tools.ts` | Separate Send/Checkout links, buttons, QR and NFC |

Types defined in `checkout-state.ts` are the shared contract:

```ts
type CheckoutMethod = 'card' | 'balance' | 'note';
type CheckoutPhase = 'editing' | 'preparing' | 'reviewed' | 'funding'
  | 'submitting' | 'confirming' | 'paid' | 'not-sent' | 'attention-required';
type CheckoutRecipient = Readonly<{userId: string; username: string;
  displayName: string; avatarUrl: string | null}>;
type CheckoutApproval = Readonly<{checkoutId: string; identityDigest: string;
  accountUid: string; recipient: CheckoutRecipient; amountUsdCents: string;
  method: CheckoutMethod; clientNonce: string; cardAmountUsdCents: string;
  balanceContributionUsdCents: string; noteSourceDigests: readonly string[];
  digest: string}>;
```

`CheckoutSnapshot` exposes `phase`, `approval: CheckoutApproval | null`,
`walletOutcome: WalletSendOutcome | null`, `notes: readonly CheckoutNoteEntry[]`,
`receipt: CheckoutReceipt | null`, and `error: string | null`. A persisted
`HostedCheckoutState` has schema `bank.hosted-checkouts.v1`, identity binding,
revision, current snapshot and bounded terminal history. `CheckoutNoteEntry`
binds source SHA-256, Note ID, rail, inspection, deposit status and exact private
source reference. `CheckoutReceipt` contains checkout ID, transfer ID, nonce,
payer/recipient IDs, recipient display, integer cents, method and source-carried
`recordedAt: string | null`; omit an unavailable timestamp rather than invent it.

Financial continuation uses the original `clientNonce`. Before the first
transfer, a fresh Wallet review may be prepared with that nonce after funding;
it must still match the approved payer, recipient ID, USD amount and funding
choice. Only an existing validated recorded result produces a receipt. A
checkout journal is retained consent/recovery, not a new payment authority.

## Task 1: Public Checkout Request Contract

**Files:** Create `src/receiz/checkout-request.ts`, `tests/checkout-request.test.ts`; modify `src/receiz/payment-request.ts`, `src/receiz/public-profile.ts`, `tests/payment-request.test.ts`, `tests/public-profile.test.ts`.

**Interfaces:** Produce `buildCheckoutRequest(coordinate: string, dollars?: string): string` and `parseCheckoutRequest(input: string, origin?: string): {username: string; amount?: string} | null`. Malformed checkout URLs throw; unrelated paths return null. Also produce `buildCheckoutReturn({username, checkoutId}, origin: string): string` and `parseCheckoutReturn(input: string, origin: string): {username: string; checkoutId: string; sessionId: string} | null`. Return URLs use only `checkoutReturn=1`, `checkout_id=<UUID>` and `session_id=<original session>`; the builder uses the existing `{CHECKOUT_SESSION_ID}` substitution. Extend existing `parsePaymentRequest` to recognize an approved checkout origin/path and return its existing `{recipient, amount}` shape for scanners. Keep `buildPaymentRequest` unchanged.

- [ ] **Step 1: Write request tests.** Assert `buildCheckoutRequest('@merchant', '12.3') === 'https://bankeiz.com/pay/merchant/?amount=12.30'`; round-trip `/pay/merchant` and `/pay/merchant/`; reject zero/negative/exponent amounts, duplicate `amount`, credentials, encoded slashes, foreign origins and unknown semantic parameters. Test current root Send links and Receiz IDs unchanged, and `/pay/` no longer interpreted as a username profile. If existing asset-share tracking parameters are reused, accept only that exact inert allowlist and exclude it from the normalized result.

  Representative test: `it('normalizes the shared checkout URL', ...)` asserts `expect(buildCheckoutRequest('@merchant', '12.3')).toBe('https://bankeiz.com/pay/merchant/?amount=12.30')`. Return tests reject duplicate/malformed IDs, arbitrary redirect URLs and foreign origins independently of the payment-request parser.
- [ ] **Step 2: Run** `npm test -- tests/checkout-request.test.ts tests/payment-request.test.ts tests/public-profile.test.ts --maxWorkers=4`; expect missing-contract assertions to fail.
- [ ] **Step 3: Implement** the two signatures with the existing username rules and exact decimal normalization. Reserve `pay` in profile path parsing, keeping the real username available at `/u/pay/`. Permit local origins only through the explicit parser `origin` argument; generated public links always use `BANK_PUBLIC_ORIGIN`.
- [ ] **Step 4: Repeat Step 2**; all tests pass with the old Send URL behavior preserved.
- [ ] **Step 5: Commit** only this contract and its tests as `feat: define hosted checkout payment requests`.

## Task 2: Exclusive Device Identity Entry Without Dashboard Preparation

**Files:** Create `src/receiz/device-identity-entry.ts`, `src/checkout/checkout-identity.ts`, `tests/device-identity-entry.test.ts`, `tests/checkout-identity.test.ts`; modify `src/receiz/native-identity.ts`, `src/receiz/identity-vault.ts` and related native identity tests.

**Interfaces:** Produce `withDeviceIdentityEntry<T>(work: () => Promise<T>): Promise<T>` using Web Lock `receiz-bank-device-identity-entry`; and `createCheckoutIdentitySession(deps): {open(): Promise<OpenIdentity>; import(file: File, phrase: string): Promise<OpenIdentity>; close(): void}`. Inject restore/create/import functions for tests. Use existing `OpenIdentity` without `useNativeAccount` or `prepareAccountView`.

- [ ] **Step 1: Write entry tests.** Concurrent `open()` calls create once; two sessions/tabs recheck custody under the same lock; an existing identity restores without creation; restore/storage errors never call create. Import waits for initialization and invalidates old UI work. Test unmount/remount while opening, missing Web Locks, rejected storage writes, and a simultaneous account-page creator. Assert no wallet/history/portfolio/messaging reads or payments on landing. Test a freshly created image still imports with the existing canonical identity tests.

  Representative test: `it('reuses one identity for simultaneous landing consumers', ...)` calls `await Promise.all([session.open(), session.open()])` and asserts `expect(create).toHaveBeenCalledTimes(1)` and `expect(prepareAccountView).not.toHaveBeenCalled()`.
- [ ] **Step 2: Run** `npm test -- tests/device-identity-entry.test.ts tests/checkout-identity.test.ts tests/native-identity-creation-image.test.ts tests/native-identity-local-entry.test.ts --maxWorkers=4`; expect new entry behavior to fail first.
- [ ] **Step 3: Implement** one shared entry lock at native create/import/forget entry boundaries. Move current bodies into private unlocked helpers to avoid nested acquisition. Creation rechecks successfully restored custody before creating; it never treats unreadable custody as absence. Add an `onlyIfEmpty` persistence option for fresh creation and enforce it inside the existing identity transaction, so a competing writer cannot be overwritten. Restore the winner on an explicit occupied result, and dispose unused instances. The checkout session shares in-flight initialization, waits for pending consumers before disposal and marks itself closed before adopting a late result. Existing account callers retain their signatures.
- [ ] **Step 4: Repeat Step 2**, then run `npm test -- tests/native-account-hook.test.tsx tests/identity-profile.test.tsx --maxWorkers=4`; all pass.
- [ ] **Step 5: Commit** as `feat: reuse device identity safely on checkout landing`.

## Task 3: Existing Wallet Adapter Supports Exact Checkout Funding

**Files:** Modify `src/receiz/wallet-send.ts`, `src/receiz/card-deposit.ts`, `src/receiz/native-identity.ts`, `src/receiz/identity-vault.ts`; create `tests/wallet-send-checkout.test.ts`; extend `tests/wallet-send-card-funding.test.ts` and `tests/native-identity-wallet-entry.test.ts`.

**Interfaces:** Extend `WalletSend.prepare(value, options?: {clientNonce?: string; fundingPreference?: 'card'; checkoutContext?: {checkoutId: string; username: string}})`. Store explicit card preference and checkout context in the review digest; their absence retains current Send behavior. Produce `retainedResult(clientNonce: string): Promise<{outcome: WalletSendOutcome; receipt: WalletSendReceipt | null} | null>` validated through the existing recorded-source validator for current or historical attempts. `WalletSendReceipt` carries transfer/nonce/payer/recipient IDs, integer cents and source timestamp if present. Extend internal funding reason as a discriminated explicit-card approval or the existing insufficient-funds refusal; never fabricate a refusal for card selection. The injected funding `begin(amount, referenceId, checkoutContext?)` passes only this validated context to the existing private card-funding function and Task 1's return builder.

- [ ] **Step 1: Write adapter tests.** With an existing $30 balance, explicit Card for $10 opens exactly $10 card funding before any transfer. Balance-first still sends directly when funded and charges only its actual shortfall after the existing zero-write refusal. Retain/reuse the supplied nonce; reject reused nonces with changed intent. Test $0.25 shortfall/$0.50 charge/$0.25 remainder, bounds at $0.50 and $100,000, and rejection beyond them. A changed identity/receiver, bad review digest, ambiguous card creation or forged paid status cannot execute. Reading an older retained result returns its original validated amount/recipient without another network submission.

  Representative test: `it('charges the selected full card amount before transfer', ...)` prepares $10 with `fundingPreference: 'card'` against $30 available and asserts `expect(begin).toHaveBeenCalledExactlyOnceWith('10.00', review.clientNonce)` and `expect(transfer).not.toHaveBeenCalled()` before confirmed credit. Omit the optional third funding argument when no checkout context exists. Supplied nonces must be valid UUIDs and cannot collide with a current/history attempt, including one with the same amount but a different recipient.
- [ ] **Step 2: Run** `npm test -- tests/wallet-send-checkout.test.ts tests/wallet-send-card-funding.test.ts tests/wallet-send.test.ts --maxWorkers=4`; new explicit-card and retained-result tests fail first.
- [ ] **Step 3: Implement** additive review/funding fields with strict backward reading of existing `bank.wallet-sends.v1` records. Card preference creates the ordinary retained body/conversation and funding stage before opening the existing card session; `resumeFunding()` uses the current retain-credit-before-send ordering. Balance-first defaults stay unchanged. Validate all new fields in `hasPendingWalletSend`, custody removal checks and serialization. Extend the internal card return context with an allowlisted checkout ID so SCA returns can select `/pay/<username>/` using retained state; default deposit/Send returns remain the existing URLs. Never take a return destination or amount as payment evidence.
- [ ] **Step 4: Repeat Step 2**, then run `npm test -- tests/wallet-send-ui.test.tsx tests/wallet-send-adoption-race.test.ts tests/native-identity-wallet-entry.test.ts tests/card-deposit.test.ts --maxWorkers=4`; all pass.
- [ ] **Step 5: Commit** as `feat: support exact card funding for hosted payments`.

## Task 4: Retained Checkout State and Custody Guards

**Files:** Create `src/receiz/checkout-state.ts`, `tests/checkout-state.test.ts`; modify `src/receiz/identity-vault.ts`, `src/receiz/native-identity.ts`; extend relevant identity custody tests.

**Interfaces:** Define the shared types above and `readHostedCheckoutState(value: unknown, identityDigest: string): Promise<HostedCheckoutState | null>`, `hasPendingHostedCheckout(state: HostedCheckoutState): boolean`. Use the SDK canonical digest to validate retained approvals asynchronously. Produce `loadHostedCheckoutState(binding): Promise<unknown>` and `saveHostedCheckoutState(binding, next, previous): Promise<void>` over the existing encrypted operation family `hosted-checkouts`. Use existing revision/CAS writes. Define `CheckoutStateStore` as `{read(): Promise<unknown>; write(next: HostedCheckoutState, expected: unknown): Promise<void>}`; add no import of the not-yet-created controller in this task.

- [ ] **Step 1: Write custody tests.** Round-trip three methods and all phases; reject foreign identities, changed approved recipient/amount/method, invalid review digests, missing source references and duplicate nonces. Reject stale writes without replacing the newer record. A pending approved checkout prevents identity removal/import; an unapproved edit does not. A terminal checkout cannot hide another pending funding/session reference. Enforce 1,000 terminal history entries and the existing 32 MiB private-state limit without pruning unresolved entries.

  Representative test: `it('rejects a stale checkout write without losing the current attempt', ...)` writes revision 2, attempts revision 3 using revision 1 as the expected value, and asserts rejection plus `expect(await store.read()).toEqual(revision2)`.
- [ ] **Step 2: Run** `npm test -- tests/checkout-state.test.ts tests/identity-protection.test.ts --maxWorkers=4`; new custody tests fail first.
- [ ] **Step 3: Implement** the schema parser, encrypted wrappers and the `noteRemovalGuard` branch for this family. Keep source bytes in existing digest-addressed private byte custody and store only exact references in the journal. Add an atomic identity-generation check to each write. Validate receipt fields against retained Wallet data on adoption; a `paid` string alone is not sufficient. Do not expose private state through public APIs or add global authorization exceptions for checkout.
- [ ] **Step 4: Repeat Step 2** and the existing identity removal/pending-operation tests found by `rg -n 'forgetDeviceIdentity|noteRemovalGuard|Remove ID' tests`; all pass.
- [ ] **Step 5: Commit** as `feat: retain hosted checkout intent in device custody`.

## Task 5: Note Tender Adapter and Confirmed Credit Recovery

**Files:** Create `src/receiz/checkout-notes.ts`, `tests/checkout-notes.test.ts`; modify `src/receiz/offline-notes.ts`, `src/receiz/native-identity.ts`; extend `tests/payment-note-checkout.test.tsx` only where its shared adapters change.

**Interfaces:** Produce `createCheckoutNotes({identity, storeSource, restoreSource, assertCurrent})` with `inspect(file: File): Promise<CheckoutNoteEntry>`, `deposit(entry: CheckoutNoteEntry): Promise<CheckoutNoteEntry>`, `check(entry: CheckoutNoteEntry): Promise<CheckoutNoteEntry>`. Source functions are `storeSource(bytes: Uint8Array): Promise<string>` and `restoreSource(digest: string): Promise<Uint8Array>`; `assertCurrent(): void` rejects identity replacement. Entries use `inspected`, `depositing`, `received`, `confirmed` or `attention-required` deposit status. Expose `BankOfflineNotes.reconcileReceivedNotes?(): Promise<BankNoteDepositResult[]>` by awaiting the existing received-Note reconciliation and returning its exact queue results; do not implement another claim path.

- [ ] **Step 1: Write Note tests.** Parameterize `reserve`, `settlement`, `composite`; assert identical source bytes, Note ID, exact Phi, rail and both funding components throughout inspection/deposit/check. Refuse another identity's Note and already deposited Notes. Test `received` remains unspendable, later reconciliation becomes confirmed without another deposit, and a crash after submission recovers from existing received-Note custody. Test multiple Notes admitted serially, a failed second Note preserving the first deposit, and a value-at-creation amount never substituted for current admitted wallet affordability. Surplus remains in the customer's balance; a shortfall asks for a displayed card approval.

  Representative test: `it.each(['reserve', 'settlement', 'composite'])('waits for confirmed %s credit', ...)` sets the deposit result to `received`, asserts the entry is still pending, returns its matching confirmed result from reconciliation and asserts `expect(deposit).toHaveBeenCalledTimes(1)` after repeated checks. A legacy adapter's successful result with omitted `status` is accepted only through its existing validated deposit contract; an explicit `received` result is never upgraded locally.
- [ ] **Step 2: Run** `npm test -- tests/checkout-notes.test.ts tests/payment-note-checkout.test.tsx --maxWorkers=4`; new adapter assertions fail first.
- [ ] **Step 3: Implement** the wrapper over `identity.offlineNotes()` and exact private source storage, keeping the existing 32 MiB input limit and error mapping. Persist an entry as depositing before calling deposit. On resumption, consult original received-Note/credit records first; never call deposit again merely because the UI missed a result. Connect explicit Check to the existing reconciliation function, with its existing execution → Notes lock order. After confirmed credit, read/adopt the existing wallet observation once; do not sum inspection denominations into a synthetic balance. Preserve the current verifier, custody and receiving rules.
- [ ] **Step 4: Repeat Step 2**, then run `npm test -- tests/connected-note-runtime.test.ts tests/note-received-deposits.test.ts --maxWorkers=4` after confirming those paths with `rg --files tests`; all selected tests pass.
- [ ] **Step 5: Commit** as `feat: compose all supported Notes into hosted checkout`.

## Task 6: Checkout Controller and Once-Only Continuation

**Files:** Create `src/receiz/hosted-checkout.ts`, `tests/hosted-checkout.test.ts`; modify `src/receiz/native-identity.ts` to bind the lazy factory and existing private storage.

**Interfaces:** Produce `createHostedCheckout(deps): HostedCheckoutController` and lazy `OpenIdentity.hostedCheckout(): Promise<HostedCheckoutController>`. The controller exposes `snapshot()`, `subscribe(listener)`, `prepare({recipient: string, amountUsdCents: string, method: CheckoutMethod}): Promise<CheckoutApproval>`, `inspectNote(file)`, `approve(digest: string): Promise<void>`, `approveShortfall(digest: string): Promise<void>`, `check(): Promise<void>`, `back(): Promise<void>`, and `dispose(): void`. Note inspection uses Task 5; snapshot carries its exact Note entries. Inject Wallet send, funding, custody, source storage and identity-current assertions for deterministic tests. Shared module/controller promises prevent duplicate creation for one identity. Generate one UUID for `checkoutId` and the future `clientNonce`; they are equal and retained before any Note deposit or card creation.

- [ ] **Step 1: Write controller tests.** Each method ends in Paid only through a matching recorded Wallet original. Test all states and crash points: approval saved before Note deposit; deposited Note before checkout journal update; card credit before journal update; transfer submitted before response; validated result before receipt save. After reopening, the original nonce/session/deposit is reused or checked, never submitted twice. Test double-clicks, simultaneous controller instances, a renamed merchant resolving to a different UID, old callbacks after identity switch, shortfall changes before approval, unreadable history and an unrelated pending Send. Back leaves submitted/funded attempts recoverable and cannot manufacture cancellation.

  Note approval binds every source digest in its inspected batch. Replacing a source or adding another Note invalidates unsubmitted tender approval; already confirmed deposits remain retained. Multiple preselected Notes deposit serially under one batch approval. Adding another Note later requires approval for that new source, without repeating earlier deposits or changing the approved recipient/payment amount. No new funding source can inherit another source's approval.

  Representative test: `it('recovers a submitted transfer without submitting it again', ...)` makes the first submission response unavailable, reopens from retained custody, supplies the original recorded result to `check()` and asserts `expect(transfer).toHaveBeenCalledTimes(1)` and `expect(controller.snapshot().phase).toBe('paid')`.
- [ ] **Step 2: Run** `npm test -- tests/hosted-checkout.test.ts tests/wallet-send-checkout.test.ts tests/checkout-notes.test.ts --maxWorkers=4`; controller tests fail first.
- [ ] **Step 3: Implement** transitions with one controller lock `receiz-bank-checkout:<identityDigest>` and revision-checked writes. Never hold the existing account execution lock while calling an adapter that acquires it. Persist combined consent before deposit/funding, create/read the original Wallet result before resubmission, and pass the retained nonce into fresh post-funding Wallet review. Compare payer/recipient UID, cents and funding preference with the approved intent before executing its fresh review. An inconsistent original produces attention-required. Await exact Note credit before continuing. A new card shortfall needs its own displayed digest approval; it does not reuse a different charge approval. Read historical Wallet results by nonce so a newer unrelated operation cannot replace this receipt.

  Define `HostedCheckoutDependencies` with `identityDigest: string`, `assertCurrent(): void`, `walletSend(): Promise<WalletSend>`, `notes: ReturnType<typeof createCheckoutNotes>`, `readWallet(): Promise<SharedWallet>`, `store: CheckoutStateStore` and `lock<T>(work: () => Promise<T>): Promise<T>`. Bind these existing identity closures in the lazy factory; do not pass an entire React account hook. The controller uses `readWallet` for an observed funding proposal, not payment authorization. Record approved Note source digests and retain earlier approvals whenever adding a tender source or approving a card shortfall.
- [ ] **Step 4: Repeat Step 2** and run `npm run typecheck`; all pass. Inspect every financial call site to verify it is dominated by retained approval and no uncertain result loops into a submit call.
- [ ] **Step 5: Commit** as `feat: orchestrate recoverable hosted payments`.

## Task 7: Dedicated Hosted Page, Returns and Premium Mobile Presentation

**Files:** Create `pay/index.html`, `src/checkout/main.tsx`, `src/checkout/HostedCheckout.tsx`, `src/checkout/CheckoutIdentity.tsx`, `src/checkout/CheckoutNotes.tsx`, `src/checkout/CheckoutReceipt.tsx`, `src/checkout/checkout.css`, `server/checkout-preview-plugin.ts`, `tests/hosted-checkout-ui.test.tsx`, `tests/checkout-routing.test.ts`, `tests/browser/hosted-checkout.html`; modify `vite.config.ts`, `vercel.json` and relevant build checks.

**Interfaces:** `HostedCheckout({request, identitySession})` consumes Tasks 1–2 and binds the active identity's controller. The entry is `src/checkout/main.tsx`; the standalone document uses `data-checkout-root` and does not mount `App`. Dev/preview rewrite `/pay/<username>/` to the dedicated HTML entry; production uses explicit Vercel rewrites before profile routes. Card return resolution uses the retained checkout ID/context from Task 3, not query-supplied payment details.

- [ ] **Step 1: Write UI/routing tests.** Assert recipient/amount paint before identity creation resolves; no identity creation on invalid/missing username routes; no signup or compulsory save action; only the selected tender loads. Include locked import, unsupported device retry, existing balance, three Note types, card minimum disclosure, Back, Check, pending funding and recorded receipt. Test iframe completion origin/window/session mismatches through existing frame tests. A card-success URL alone never renders Paid. Test no-JS readable shell and correct live route on cold load, SCA return, reload and browser Back. Use deferred promises to assert slow portrait discovery never gates amount preparation.

  Representative test: `it('paints the recipient and amount while device entry is pending', ...)` leaves `identitySession.open()` unresolved and asserts `expect(host.textContent).toContain('@merchant')` and `expect(amountInput.value).toBe('12.30')` with no transfer/card/deposit call.
- [ ] **Step 2: Run** `npm test -- tests/hosted-checkout-ui.test.tsx tests/checkout-routing.test.ts tests/card-embed.test.tsx --maxWorkers=4`; new tests fail first.
- [ ] **Step 3: Implement** the light, narrow checkout using BankMark, ProfileAvatar, AmountInput, existing buttons and ReceizCardCheckout. Keep identity/footer information quiet and preserve dimensions at tender transitions. Show exact recipient/amount/funding review before the final Pay action. Card, Note and Balance have separate accessible controls. Use a valid handle as the initial recipient label; optional already-known portrait metadata is presentation only, and final immutable recipient resolution governs approval. Identity Record save reuses existing image bytes/filename. Receipt copy/download excludes card secrets, private source openings and identity material. Route navigation to checkout uses a normal document transition so it cannot leave two private identity owners active in retained public roots; returning to profiles uses existing navigation. A pending checkout resumes, with user-visible Check for unresolved outcomes and no interval polling.

  Parse a valid card return before ordinary request parsing. Inside a payment iframe, render a minimal return document and send only the existing return notification with its session ID to the same-origin parent; do not mount checkout or create an identity there. At top level, reopen the retained checkout and provide Check. Neither an unrecognized return nor a return message supplies payment authority.
- [ ] **Step 4: Repeat Step 2** and run `npm run typecheck`. Inspect the emitted checkout entry and its static imports to ensure no account dashboard, Market/explore catalog, messaging or chart worker is requested before a selected action. Verify no runtime dependency was added for styling or QR generation.
- [ ] **Step 5: Commit** as `feat: add polished hosted checkout pages`.

## Task 8: Receive, Website Buttons, Profile Pay and Counter QR

**Files:** Modify `src/receiz/payment-tools.ts`, `src/features/account/PaymentTools.tsx`, `src/features/account/LivePayments.tsx`, `src/public-explorer/PublicProfilePage.tsx`, `src/features/account/PaymentScanner.tsx`, `institution/accept-payments.md`, `src/content/learning-pages.mjs`; extend `tests/payment-tools.test.ts`, `tests/payment-tools-ui.test.tsx`, `tests/live-payments.test.tsx`, `tests/payment-request.test.ts`, `tests/payment-qr.test.ts` and profile action tests.

**Interfaces:** Extend `buildPaymentTools` with `sendLink` and `hostedCheckoutLink`; keep `accountLink` as a compatible Send alias and keep external checkout/widget fields distinctly named. Make `buttonHtml` open `hostedCheckoutLink`. Receive has explicit Send/Checkout selection; sharing, copy, QR and NFC consume the same selected public URL. Profile Pay opens `buildCheckoutRequest(profile.username)`.

- [ ] **Step 1: Write acceptance tests.** The same `$12.30` checkout URL appears in copied link, website anchor, QR and NFC payload; no source/session secret appears in any. Existing Send links still open addressed Send. Profile Pay points to the dedicated recipient checkout and Message remains unchanged. A scanner recognizes both link formats. A merchant-edited amount changes only the next public request, not a retained payer approval. Test copy/share failure feedback and link-only website support without scripts.

  Representative test: `it('uses one hosted URL for website and counter acceptance', ...)` asserts the generated anchor href, selected QR payload and NFC URL all equal `buildCheckoutRequest('merchant', '12.30')` while `sendLink` remains the existing root request URL.
- [ ] **Step 2: Run** `npm test -- tests/payment-tools.test.ts tests/payment-tools-ui.test.tsx tests/live-payments.test.tsx tests/payment-request.test.ts tests/payment-qr.test.ts --maxWorkers=4`; hosted-link assertions fail first.
- [ ] **Step 3: Implement** a restrained Send link / Checkout link choice in Receive with matching QR and optional amount. Keep the existing embedded Receiz widget distinctly described. Update the get-paid guide and integration reference with the real no-code URL/button flow, guest device identity, all supported Note types and recipient confirmation. Explain that public amounts are editable requests, and developers must independently match the recorded payment to their order. A counter merchant verifies their account/Ledger result; a customer's screen is not their confirmation. Do not advertise a new webhook, immutable invoice or card-terminal API.
- [ ] **Step 4: Repeat Step 2**, plus the affected profile/scanner tests and `npm run receiver:check`; all pass.
- [ ] **Step 5: Commit** as `feat: share hosted payments through links buttons and QR`.

## Task 9: End-to-End Qualification and Release Evidence

**Files:** Create `tests/browser/hosted-checkout.tsx`, `docs/implementation/2026-10-22-hosted-checkout-qualification.md`; extend `scripts/check-public-pages.mjs`, `scripts/check-vercel-build.mjs`, `tests/offline-shell-build.test.ts` as required for the new entry.

**Interfaces:** Browser fixtures inject synthetic adapters into the real checkout component/controller. They never invoke live card creation, Note claim or transfer. The qualification document lists observed results and remaining host/device checks separately. Product/package version remains 2.0.0 until a separate release decision.

- [ ] **Step 1: Add browser/build assertions** for 320, 390, 768 and 1440 px, card/Note/balance states, keyboard focus, reduced motion, dynamic funding status announcements and no horizontal overflow. Verify static checkout assets participate in the existing offline/source distribution checks without caching private responses. Add a served-build request capture proving the initial entry does not fetch a Market catalog, portfolio/history, messaging or a card/Note financial action. Exercise top-level SCA return to the matching retained checkout and a known old session after another checkout has been opened.
- [ ] **Step 2: Run targeted browser and build checks** using the repository's browser-testing workflow. Record fixture behavior, initial request graph and actual emitted checkout resources. A failed action stays on a usable page with Back/Check and the original attempt; fake API success cannot bypass recorded-result validation.
- [ ] **Step 3: Run full verification sequentially:** `npm run release:check`; `npm test -- --maxWorkers=4`; `npm run typecheck`; `npm run receiver:check`; `npm run native:check`; `npm run native:rebuild -- --sdk`; `npm run build`; `npm run source:verify -- --rebuild`; and `npm run vercel:check` when its documented prerequisites are present. Read every exit code. Do not broaden or repeat passing checks without a new change or unresolved failure.
- [ ] **Step 4: Review the complete patch** against the spec and Review Focus. Request an independent final code review using the required review workflow. Fix concrete findings, rerun affected checks, and record the exact fresh evidence. Separately list real card/SCA, physical Note custody and confirmed recipient credit checks that were not performed; never describe synthetic qualification as live settlement.
- [ ] **Step 5: Commit** qualification and any required build-check updates as `test: qualify hosted checkout and acceptance tools`. Report commits, verification and actual remaining limits. Do not push, publish or make real payments as part of this plan.

## Execution Handoff

The tasks form one dependent checkout flow; no separate payment platform or
Receiz frontend work is part of the implementation. Recommended execution:
**Native**, implementing these tasks in this session on `main`, with the final
independent review in Task 9. Review this written plan and confirm the execution
method before product changes begin.
