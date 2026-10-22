# Fixed checkout and merchant Counter

Date: October 22, 2026

Status: proposed design for review. Product implementation has not started.

## Outcome

A merchant opens Receive, chooses **Counter**, enters the sale total and shows a
QR code. The customer scans, pays through the existing hosted checkout, and both
screens confirm the same payment. The merchant does not need to inspect the
customer's phone or search their Ledger before completing an ordinary sale.

The identical checkout URL works in a message, a website button or an in-person
QR. Existing editable payment links and Send links retain their current behavior.
Automatic device identity, optional Identity Record saving, Card, Balance and all
currently supported Note types remain the existing checkout experience.

Success means a fixed customer amount, exact sale matching, automatic merchant
confirmation from received payment evidence, and recovery after interruptions.
No new funding, ownership, admission or financial execution rules are introduced.

## Selected approach and alternatives

Extend the existing hosted checkout with a fixed-sale request and add a focused,
authenticated merchant Counter. A retained merchant request supplies the expected
recipient, amount and reference. The existing payment note carries an opaque sale
reference, using its already-supported public-note contract. The merchant checks
its incoming payment originals against that retained request.

This avoids a second payment lifecycle. A separate card-only checkout would
divide Card from Balance and Notes. A new hosted invoicing service would add
order publication and shared-order admission dependencies beyond the requested
counter experience. Neither is needed to display a fixed amount and match an
actual received payment to this merchant's retained sale.

This delivery covers one-time sale requests and their counter presentation.
Reusable product catalogs, carts, tax, refunds, staff permissions, remote
fulfillment webhooks and card-present terminal acceptance are separate work.

## Merchant experience

1. In Receive, **Counter** opens a focused view under the current identity. No
   enrollment, new merchant account or receiving ID is created for this action.
2. Enter a positive USD sale total. Show the receiving account clearly. Selecting
   **Create checkout** retains a new sale before presenting its QR.
3. The waiting screen shows the merchant identity, large total, centered QR,
   **Waiting for payment**, and quiet Copy link, Share and payment-button tools.
   A customer scans the QR with their ordinary phone camera.
4. Automatically observe the receiving account while the Counter is active.
   **Paid** appears only after an original received payment matches this sale.
5. The paid screen retains the total, a restrained confirmation mark, payment
   reference and optional receipt details. **Next sale** starts a new request
   without overwriting the previous request or its evidence.

Reloading resumes the retained sale and rechecks its outcome. Leaving Counter
does not cancel a submitted payment. Starting a new sale while an old one is
unresolved retains both references and explains that the earlier link can still
receive payment. There is no misleading “cancel payment” action on the merchant
screen. A closed request and a financial cancellation are different operations.

## Visual treatment

Use the existing warm-white, navy and cobalt palette, bank logo and receiving
identity. The amount and QR are the focal points; technical receipt fields stay
inside details. Waiting uses a quiet status indicator. Paid uses restrained
green and a brief transition that respects reduced motion. No confetti or
terminal-like diagnostic language belongs in the main payment view.

The Counter fits a phone and expands comfortably for a tablet or desktop counter.
Support 320 px widths, keyboard operation, visible focus, readable contrast and
polite status announcements. Reserve QR and status dimensions to avoid layout
jumps. Include a manual **Check payment** action when automatic checking is
temporarily unavailable. Network errors never replace an established Paid result.

## Fixed-sale request

A versioned request contains:

- a cryptographically random sale UUID generated once;
- the receiving account's stable user ID and confirmed public Receiz username;
- a positive integer amount in USD cents and explicit USD currency;
- a canonical digest over the request's version, sale ID, recipient and amount.

Generate the digest using the repository's existing canonical-digest helper.
Keep the sale ID distinct from the payer's checkout ID and transfer client nonce.
The latter continue to identify one payer's exact submitted attempt.

Use the existing `/pay/<username>/` route with a strictly parsed fixed-sale
variant carrying the amount, sale ID, recipient ID and version marker. The URL
contains public request coordinates only. It contains no private Identity Record,
access token, card session secret or spending grant. Reuse the existing QR encoder
and verify generated URLs fit its 230-byte capacity at every accepted bound.

The amount is read-only throughout fixed checkout. Require a complete valid fixed
request; partial, duplicate, unknown semantic or malformed parameters fail rather
than downgrade to an editable amount. Existing inert social tracking parameters
retain their current treatment. Scanning within Bankeiz must open the exact fixed
checkout, not reduce it to a recipient and editable Send amount.

The merchant's retained request is the expected sale. A URL is public and is not
called a signed invoice. Editing its amount or recipient produces a different
request digest; a resulting payment cannot mark the original Counter sale Paid.
Revalidate the displayed username against the stable recipient at review. A
renamed or reassigned handle cannot redirect the retained sale to another user.

## Payment integration and exact approval

Bind the complete fixed request and digest into the payer's retained checkout
approval and receipt. Revalidate them before funding, execution and recovery.
The displayed final approval remains **Pay $X**, with recipient and funding
contributions shown as today. No link, scan, page load or merchant action approves
the customer's payment.

Carry a versioned, opaque reference derived from the exact request digest in the
existing Wallet public payment note. Do not include product details, customer
information, session credentials or private request state in that reference.
Explain concisely that the sale reference is recorded with payment. Require the
existing `publicTransferNotes` capability before fixed-sale approval; do not fall
back to a private note or an unreferenced transfer if it is unavailable.

Preserve current Card funding, Balance shortfall, Note custody/credit, minimum
card charge, surplus retention and exact reapproval behavior. Keep the existing
rules for pending and unknown outcomes, a single retained financial nonce, and
once-only dispatch. A card-funded balance is not yet payment to the merchant.

Card return recovery must restore the retained fixed request through its original
checkout ID/session. It cannot substitute an editable route, attach another sale
to a pending payment, or reapprove and send an already-recorded payment. An older
unrelated pending payment remains separately resumable and blocks replacement.

## Merchant confirmation

Use a lazy, read-only receiving service under the merchant's admitted identity.
Discovery may reuse the existing private history or messaging updates. A display
row, balance increase, customer callback, redirect, browser message or screenshot
is never sufficient to mark the sale Paid.

Before accepting a match, reopen the complete authenticated original payment
record and require all of these bindings:

- the authenticated receiving account is the retained merchant;
- the transfer/message IDs and any lookup nonce refer to the same transaction;
- sender, recipient, conversation and exact amount agree across the returned
  original and its accompanying payment/receipt fields;
- the recipient is the retained stable user ID and the received USD cents equal
  the sale total;
- the carried public note exactly equals the retained request's sale reference;
- receipt, payload and origin digests bind the corresponding original, following
  the current Wallet observation acceptance rules;
- the transfer has a recorded outcome, rather than a preview, funding step or
  incomplete payment candidate.

Retain the complete accepted source and its identifiers with the merchant sale.
The Counter reports the existing connected payment outcome; it does not relabel
an HTTP observation as a new offline financial-root receipt or edge commit.

The existing sender-side original resolver is not assumed to authorize recipient
lookups. Qualification must establish an actual supported recipient-authorized
read carrying the full required source. A chat projection or a
`sealedOriginalAvailable` boolean alone does not meet that requirement. No new
Receiz endpoint, sibling-repository change or weaker acceptance rule is part of
this design. If the available contract cannot supply the required original,
automatic Paid confirmation is blocked until a supported integration is identified;
do not ship a simulated confirmation in its place.

## Automatic checks and recovery

One foreground watcher observes active sales for an identity. Coalesce concurrent
checks, use existing account/message updates as wakeups, and fetch originals only
for relevant candidates. Use known-head/delta reads only where the actual contract
supports them. Do not poll the full account preparation, portfolio or valuation
paths. Do not add any polling to ordinary account, Market, asset or checkout load.

When an open Counter needs polling, use a short foreground interval with backoff
after unchanged or failed reads; pause when hidden or offline and resume with one
coalesced check. Bound every request and expose retry without discarding the sale.
No overlapping checks, interval leaks or background retry loops after disposal.
Stop fast polling after terminal confirmation. Actual network confirmation time
remains visible; do not claim a zero-latency financial result.

Retained states distinguish Waiting, Checking, Paid and attention required.
Absence from a page or a timeout cannot prove nonpayment. Storage or identity
failure blocks creation/admission safely and retains recoverable request state.
Cross-tab coordination prevents concurrent edits from replacing an active sale.
Reopening merchant state revalidates its identity binding and accepted sources.

Repeated observations of the same transfer are idempotent. A second genuine
transfer carrying the same sale reference is retained and shown as an additional
payment requiring attention; it never silently replaces the first receipt or
automatically refunds funds. Per-payer payment idempotency does not constitute
global order reservation. The Counter must not promise to prevent two different
customers from paying the same public URL, or claim distributed once-only
fulfillment without a separately supported order system.

## Implementation boundaries and qualification

Keep the units focused: fixed-request codec, retained merchant-sale state,
receiving-original matcher, coalesced watcher, Counter view, and a narrow extension
of the existing checkout controller. Reuse identity, encrypted retention, payment
tools, QR rendering and receipt presentation. Do not expose custody keys to UI.
Keep new views lazy-loaded outside existing page startup paths.

Before enabling automatic confirmation, qualify through the existing published
Receiz integration the public note capability, exact retained reference across
all payment methods, and recipient-authorized original retrieval. Read-only
contract inspection is allowed. A real payment or card charge requires separate
explicit approval for that exact operation; automated tests use synthetic sources.
Fixtures demonstrate adapter behavior, not deployment qualification.

Meaningful acceptance checks cover:

1. Exact cents, request digest, stable recipient binding, URL bounds, independent
   QR decoding, malformed fixed-link refusal and old-link compatibility.
2. Fixed amount across initial entry, review, Back, identity change, Note funding,
   card return and reload; no scan-to-editable-Send downgrade.
3. Card, Balance, all supported Note types, mixed funding and unchanged
   shortfall/minimum/surplus rules; public-reference capability refusal.
4. Matching received originals, all changed/missing bindings rejected, unrelated
   credits ignored, mismatched amounts visible without Paid, and no confirmation
   from a forged customer-side success signal.
5. One financial attempt after duplicate approval/reload, one merchant admission
   per transfer, additional real payments retained, old-sale/late-payment recovery,
   and safe handling of uncertain outcomes or corrupt retained state.
6. Foreground scheduling, hidden/offline pause, request timeout/backoff, no
   overlapping checks, teardown, identity replacement and shared-update reuse.
7. Customer and merchant browser flows with synthetic transport, phone/tablet/
   desktop presentation, keyboard/reduced-motion behavior, production build,
   type checks and the repository's required release/conformance checks.

Document the fixed-link and Counter flow in the existing acceptance guide and
provide a typed website-button example. Describe only qualified behavior. Commit
the finished implementation and verification on main; the user will push.
