# Bankeiz hosted checkout

Date: October 22, 2026

Status: written design for review; implementation has not started.

## Intended outcome

Anyone can open a recipient's Bankeiz checkout and pay by card, supported Note
or available account balance. There is no signup screen. A new visitor gets a
device-held identity as the page opens; an existing device identity is restored
and reused. Saving the **Identity Record** lets the visitor return on another
device with the same identity. Saving it is optional and never gates payment.

The same checkout serves a shared payment link, a website payment button and an
amount-specific QR code shown at a physical counter. Bankeiz supplies the page
and composes the existing Receiz SDK operations. Receiz remains the authority
for identity admission, Note ownership, payment execution and confirmed credit.

Success means a customer makes one deliberate payment approval, funding and
payment continue within the same flow, the recipient receives the exact approved
amount, and interruptions retain the original attempt rather than repeat it.

## Selected approach

Use a dedicated Bankeiz page over the existing funded Wallet payment path.
Card funding or confirmed Note credit is followed by the exact approved payment
without sending the customer back to Send or requiring another purchase action.
An internal funding step is not reported as payment to the recipient.

Two alternatives were considered:

- Direct named-merchant card checkout reduces card payment to a merchant session,
  but is a different receipt and recovery contract from the current native Note
  and balance payment paths. Combining those as if they were the same operation
  would add another checkout lifecycle to this delivery.
- An external checkout/widget is already available, but its legacy token claim
  is not the current Bankeiz Note ownership interface and does not supply the
  requested unified Bankeiz experience.

The selected approach extends existing Bankeiz adapters and presentation. It
does not create a new balance, payment writer, identity system or Note format.

Keep responsibilities separate: a public route/parser, a device-entry lifecycle,
a retained checkout controller, tender adapters, and a small checkout view.
The controller consumes admitted identities and existing adapter results; it
does not import the account dashboard or rely on a React component staying open.

## Scope

This delivery includes the hosted page, automatic device identity entry,
balance/card/Note payment composition, exact attempt retention, confirmation,
receipts, and Receive tools that produce its link, button and QR code.

A normal payment request may suggest an amount. It is not a signed invoice.
Custom integrations must check their own expected recipient, amount and actual
recorded payment before fulfilling an order. New invoice signing, merchant POS
software, fulfillment services, refunds, subscriptions, tax calculation, new
webhooks and native card-terminal acceptance are separate work. Existing Send
links continue to open Send and are clearly labeled separately from checkout.

## Public entry and visual treatment

- Canonical entry: `/pay/<username>/`, with optional `amount=<decimal USD>`.
  Accept the equivalent path without a trailing slash. Validate and normalize
  the username through the existing Receiz ID rules.
- Keep the checkout a narrow, mobile-first page in Bankeiz's existing light
  treatment: logo, recipient portrait/name/handle, amount, payment methods,
  primary action and a restrained footer. No banking navigation or asset feed
  is needed to complete payment.
- The recipient is fixed by the page. Amount entry uses the existing exact
  cents parser and amount input. A link amount is a prefill that the customer
  can edit before approval; do not label it as an immutable merchant order.
- Offer **Card**, **Note** and **Balance**. Balance is prominent when an admitted
  available balance is known. Card is the default for a fresh zero-balance
  identity. Missing or failed balance data is not treated as zero.
- Show the full amount and recipient at the final payment action. Payment
  approval authorizes only this amount and recipient, plus the displayed funding
  choice. It does not authorize future payments or unrelated scopes.
- Back returns to the previous checkout step. It does not claim to cancel a
  payment already sent or a card payment already completed. Pending attempts
  always retain a visible way to resume or check their original result.

The page reserves portrait dimensions and uses existing public presentation
material immediately when available. Recipient discovery is revalidated through
the existing receiving-account resolution before payment. A changed recipient
requires refreshed presentation and renewed approval; a handle alone never
grants authority.

## Identity on landing

1. Render the payment page immediately and restore existing device custody.
   Recipient presentation and identity restoration run concurrently.
2. Only a successful restore reporting no identity permits automatic creation
   through `createNativeIdentity(true)`. A restore failure never replaces an ID.
   Creation occurs in the browser, not during a server render or link preview.
3. Share a single in-flight entry operation and coordinate across tabs before
   rechecking custody and creating. Strict Mode, reloads and duplicate mounts
   must not create or overwrite multiple identities. If cross-tab exclusivity
   cannot be established, require retry rather than replacing current custody.
4. Retain the admitted identity using the existing private custody mechanism
   before a payment can be submitted. Creation does not authorize payment.
5. Display a quiet explanation: “Your account stays on this device. Save your
   Identity Record to use it elsewhere.” Include the existing account-access
   explanation without opening a signup journey.
6. Offer **Use existing Identity Record** before payment, including locked
   imports. Existing replacement and pending-operation guards remain intact.
   A newly generated identity cannot take ownership of someone else's Note.
7. After confirmed payment, offer **Save Identity Record** and **Open Bankeiz**.
   Export the same supported image artwork and carried identity as the existing
   backup action. Do not imply that this image alone exports private pending
   execution recovery or every device-held Note source.

The checkout identity lifecycle reuses admission and storage while avoiding the
full account dashboard's history preparation, messaging and portfolio reads.
No download, username customization or email is required to pay. A failed or
unavailable local custody store gets a clear retry/import path; it never produces
a false “saved on this device” claim.

## One retained payment intent

Use a small checkout controller with explicit states: editing, preparing,
reviewed, funding, submitting, confirming, paid, not-sent and attention-required.
Its retained intent binds the identity digest, immutable recipient account ID,
displayed recipient, integer cents, selected method and original payment nonce.
Keep private funding/session material in existing encrypted device custody.

The controller is an orchestrator of the existing Wallet send, card and Note
adapters. It does not compute a spendable balance or manufacture a paid result.
Keep financial transitions serial; independent presentation/resource reads can
run concurrently. Revalidate identity and intent after every asynchronous stage.

Persist the exact intent before any financial submission. A known card session
or payment nonce must be retained before navigation and reused after refresh.
Do not make a second session merely because the first create response timed out.
The existing checkout reference is a correlation value, not a newly assumed
idempotency guarantee. An ambiguous create result remains explicit and blocks
another attempt against the same pending operation until its outcome is resolved.

Changes to amount, recipient or method invalidate only an unsubmitted review.
They cannot rewrite a submitted intent. Duplicate clicks and multiple mounted
consumers share the same locked operation. Switching identities stops the old
controller from adopting results into the new account.

## Payment methods

### Card

Use the existing device-scoped card funding adapter and Receiz secure card frame.
Bankeiz never reads card details or installs a second card processor.

For an explicit **Card** choice, clearly display the amount charged to the card;
fund that amount through the existing checkout and automatically continue the
approved recipient payment after confirmed funding. Do not spend an existing
balance first when the customer explicitly selected full card payment.

For **Balance**, use Reserve first and Settlement for the remainder. If the
admitted available balance is insufficient, show its contribution and the exact
card shortfall within the same flow, matching the existing funded Send rules.
Respect current card minimum/maximum amounts. If the minimum exceeds a shortfall,
disclose the amount that stays in the customer's balance before approval.

The final recipient amount remains fixed. Card credit alone does not mean the
recipient was paid. Once funding is confirmed, continue only the approved
recipient/amount using the retained payment attempt. If the subsequent transfer
is pending or refused, distinguish that from funding status and preserve the
credited funds and recovery path.

Reuse the exact iframe-window, origin and session checks in `ReceizCardCheckout`.
A completion message triggers original status verification; it cannot mark a
payment paid. Keep checkout secrets out of URLs that are shared, HTTP queries,
logs, public receipts, analytics and QR codes.

### Notes

One **Note** choice accepts **Reserve**, **Settlement** and **Settlement Reserve**
Notes through `identity.offlineNotes()`. No manual rail selector, legacy token
extraction, changed verifier rules or relabeling is introduced.

- Inspect the exact original bytes under the active identity and retain the
  inspection/source binding. Unsupported, already claimed or incorrectly owned
  Notes receive the existing explicit error without a payment attempt.
- If ownership belongs to an existing identity, offer its import path. Landing
  identity creation never authorizes someone else's Note or changes its receiver.
- Before deposit, show the recipient payment amount, admitted Note value and
  any resulting balance remainder or funding shortfall. Preserve exact Phi and
  both carried backing components; do not reconstruct a split at a later rate.
- Obtain approval for the combined deposit-and-payment intent. Deposit through
  the existing Note adapter, verify its exact source/result and await confirmed
  usable credit. An offline “received” result is not spendable merchant payment.
- Continue the approved payment automatically after confirmed credit. For a
  shortfall, obtain explicit approval for the displayed additional card charge;
  for surplus value, explain that the remainder stays in the customer's balance.
  Additional owned Notes can be admitted one at a time within the same intent.
- A confirmed deposit remains deposited if payment is abandoned. Back does not
  promise to recreate or unclaim the Note. Retain the Note and payment results
  separately so recovery cannot deposit or pay twice.

Every Note variant follows its current custody, receiving and claim rules. A
Note addressed to a different receiver is not a bearer payment instrument merely
because the file was uploaded into checkout.

### Balance

Use the existing Wallet quote, exact review digest, funding rule and transfer
submission. Bind the reviewed immutable recipient ID before approval. Honor
current self-payment refusals and capability failures. Never infer affordability
from a stale or incomplete observation, and never replace the existing runtime
authorization with a client-side check.

## Confirmation and receipt

Show **Paid** only when the existing Wallet result is `recorded` and its original
source matches the retained payer, recipient, amount, conversation and nonce.
The existing recorded-result validator remains authoritative for this adapter;
a client route, amount query, frame message or screenshot is not confirmation.

The receipt shows recipient, amount, method, time and the original payment
reference with copy/save controls. Funding references remain connected in the
private retained record. The recipient's existing account/Ledger is the place
to verify receipt, including when accepting a counter QR payment. Do not add a
merchant “Paid” display based only on the customer's page or a public URL.

Pending results show **Confirming payment** and check the original attempt.
Unavailability preserves recovery without claiming failure, zero writes or
permission to start a duplicate. A definite refusal allows corrected details
and a new review only through existing terminal-result rules. Back remains
available without erasing an attempt that might have moved money.

## Share, button and QR integration

Receive keeps its existing **Send link** and adds a clearly labeled **Checkout
link** for `/pay/<username>/`. The amount input can populate either request.
Show a preview and copy action for a normal HTML anchor that opens the hosted
checkout; scripts, embedded secret material and third-party iframe permission
are unnecessary. Existing external embedded-card tools remain separately named.

The checkout link is also the QR payload. A recipient can enter an amount in
Receive and show or save the QR for another phone. Reuse the existing QR encoder,
share/copy utilities and NFC URL writer where appropriate. The QR carries only
a public receiving coordinate and optional amount, never identity bytes, card
secrets, claim material or proof of payment.

Profile **Pay** can open the hosted checkout while the older addressed Send URL
remains supported. Payment scanners recognize both entries without confusing
link recognition with payment authorization. Opening the link or scanning a QR
never funds or submits a payment.

## Performance and boundaries

- Ship a dedicated checkout entry; do not load Market, profile collections,
  messaging, chart workers or the full account dashboard to paint the page.
- Paint the stable layout first. Run recipient presentation and device entry
  concurrently. Load card and Note runtimes only for their selected path; reuse
  existing module promises, proof resources and admitted device custody.
- Use existing public presentation data when available. Fetch only the selected
  recipient through existing public discovery, coalescing duplicate reads. The
  confirmed handle can label the initial page without waiting for a portrait.
  Never request a Market catalog just to obtain a face, or wait for a profile
  collection before allowing recipient/amount preparation. Keep discovery
  separate from the final immutable receiving-account confirmation.
- No financial actions on mount, previews, amount changes or passive background
  timers. Identity initialization is the only automatic creation on landing.
- Resume/status checks use the exact saved operation and explicit user actions
  or the guarded completion event. Do not add interval polling.
- Keep Receiz UI unchanged. Source and integration documentation here describes
  Bankeiz's SDK composition, contracts and actual qualification evidence.

## Existing integration points

- Identity: `src/receiz/native-identity.ts`, `identity-vault.ts`,
  `identity-image.ts` and the existing Identity Record import/backup controls.
- Payment: `src/receiz/wallet-send.ts`, `card-deposit.ts` and
  `src/features/deposit/ReceizCardCheckout.tsx`. Preserve existing callers'
  behavior while adding the explicit checkout method orchestration.
- Notes: `src/receiz/offline-notes.ts` and the current inspect/deposit/recovery
  adapters used by `src/features/notes/OfflineNotes.tsx`.
- Receiving tools: `src/receiz/payment-request.ts`, `payment-tools.ts`,
  `payment-qr.ts`, `payment-nfc.ts`, `src/features/account/LivePayments.tsx`
  and `PaymentTools.tsx`.
- Public Pay entry: `src/public-explorer/PublicProfilePage.tsx`, Vite entry
  configuration and `vercel.json`, keeping public profile path parsing and
  reserved names consistent with the new `/pay/` namespace.
- Developer guidance: `institution/accept-payments.md` and the existing
  `/learn/get-paid/` guide. Describe request prefills and observed recorded
  payment verification accurately; do not promise a new order API.

## Verification required before shipping

Meaningful automated coverage must include:

1. Fresh landing, existing identity restore, restore error, locked import,
   repeated mounts, two-tab races and unavailable storage; no silent replacement.
2. URL normalization, exact cents, encoded/invalid recipients, duplicate query
   parameters and checkout routing in development, preview and Vercel rewrites.
3. Explicit card payment, balance payment, card-funded shortfall, minimum-charge
   remainder, insufficient limits and the same recipient/amount after funding.
4. Each of the three Note variants, composite backing preservation, ownership
   mismatch, already deposited Note, received-but-unconfirmed credit, surplus,
   multiple Notes, shortfall and independent deposit/payment recovery.
5. Repeated clicks, interrupted session creation, known-session resumption,
   funding succeeded/transfer pending, mismatched results, identity changes and
   forged iframe messages. No duplicate payment or fabricated paid screen.
6. Link/button/QR parity, existing Send compatibility, no secret in exported
   material, and recipient verification independent of the customer's receipt.
7. Mobile and desktop browser presentation, keyboard and screen-reader paths,
   reduced motion, Back behavior and no layout shift at card/Note transitions.

Run relevant tests, type checking, release/reference checks, production build
and distribution verification. Compare the checkout's initial dependency graph
and requests against the scope above. Live card/SCA, real Note custody and actual
credited recipient results require separately observed authorized transactions;
mocked tests must not be described as live payment qualification. Do not charge,
deposit or transfer real value merely to test implementation without approval.
