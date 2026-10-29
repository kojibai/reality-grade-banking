# Optional Paid Booking Specification

> Completion checkpoint: the approved interaction is implemented in Bank main3114642 and Receiz mainfd7cf17e5. The separate approved paid-booking plan extends the original free-booking phase. Earlier planning holds below are historical; current production activation and final release qualification are tracked in docs/releases/4.0.0-qualification.md.

Status: engineering design for review; no implementation or production changes. This specification accompanies `2026-10-28-paid-booking.md`.

## Product contract

- Optional pricing works through the existing regular manual/public Calendar booking flow without a Twin dependency. Conversation-first booking remains restricted to Business with an enabled Twin and delegates to that same booking service.
- Existing appointments are free by default: `priceUsdCents = "0"`. A host may explicitly save a positive appointment price in existing Calendar settings. No new commerce surface or payment capability is added to the Twin.
- The authoritative native price is an owner-authorized, accepted Calendar Source policy command. Native SQL settings are its projection. On the legacy branch, use the existing authenticated owner settings persistence with an atomic database admission guard. A URL, schedule override, model argument, client-supplied amount, or settings projection cannot replace an accepted native policy.
- A paid guest first receives an accepted guest-specific reservation for the same Calendar event that will be confirmed. The accepted tuple includes host UID, payer UID, guest details, exact slot start/end, policy revision, USD price, fee, total, source operation, and payment nonce. Payment approval includes that exact tuple.
- Reuse existing Wallet Send and hosted Checkout. Use the available qualified Wallet contribution first and fund only the shortfall with the existing card deposit route. When a shortfall is below the existing 50-cent card minimum, disclose the actual card amount and retained remainder before approval. A deposit alone never confirms the appointment.
- The appointment total is the host's saved price; `feeUsdCents = "0"` for this implementation. There is no new platform fee or automatic refund. Existing payment rail costs and card minimum disclosures remain exact.
- Positive prices are exact integer cents from `"1"` through `"10000000"`, matching the existing hosted Checkout amount ceiling. Price zero retains the existing free path. Reject negative, fractional-cent, non-finite, out-of-range, malformed, and externally overridden prices.
- Only the accepted existing Wallet transfer and enclosing chat original, matched to the reservation and nonce, can confirm payment. Funding completion, a fixed-sale digest, a local phase, an index hit, a SQL gate status alone, or an absent transfer read cannot prove payment.
- Pending reservations block overlapping slots but do not expose a meeting invitation, confirmed appointment, confirmation bundle, join permission, or reminder. Paid confirmation preserves the reservation's event ID, guest tuple, original payment, and host Calendar continuity.
- Free booking, paid booking, and Twin conversation booking use the same backend policy admission. Old clients cannot obtain a free appointment from a host whose accepted price is positive.
- Account entry, Identity Seal behavior, first paint, ordinary Wallet Send, ordinary merchant checkout, and ordinary free host-created appointments remain unchanged. Paid guests use the existing Identity and payer approval primitives; email never creates or selects an Identity.

## Accepted terms and phases

The reservation operation ID is a client-generated UUID retained before reservation dispatch and scoped to the authenticated payer. Derive the Calendar event ID deterministically from host and source operation using the existing booking identity convention. Set the paid checkout ID and `clientNonce` to that operation ID; set fixed-sale `saleId` to the event ID. The fixed-sale note carries only the existing opaque digest and nonce, never attendee details or slot information.

`BookingTerms` is immutable after reservation acceptance:

```ts
type BookingTerms = Readonly<{
  reservationId: string; operationId: string; sourceOperationId: string;
  hostUserId: string; guestUserId: string; policyRevision: string;
  startAt: string; endAt: string; attendeeEmail: string;
  guestInputDigest: string; priceUsdCents: string;
  feeUsdCents: "0"; totalUsdCents: string; currency: "usd";
  clientNonce: string; fixedSaleDigest: string; expiresAt: string;
}>;
```

The whole accepted Calendar activity and ancestry admit these terms. Their deterministic digest validates projection only and is not a new proof, issuer, or approval authority. The authoritative reservation reference includes its accepted Source activity/reference on the native branch, or its existing legacy accepted event plus transactional booking record on the legacy branch.

Phases: `reserved` → `payment-dispatching` → `confirmed-paid`, or `reserved/payment-dispatching` → `cancelled-unpaid` after a terminal zero-write fence. An ambiguous dispatch stays `payment-dispatching`; it does not release the slot. A paid host cancellation becomes `cancelled-paid`, retaining the actual original and payment history. A paid reschedule updates the same event under expected-revision and overlap admission, preserves price/payment, and never charges again. Moving an unpaid reservation must close its old gate first and create a new operation/quote; it cannot mutate approved terms. Changing host price affects new reservations only.

A reservation has a 15-minute operational payment lease, recorded in the accepted terms. Chronos expiry permits attempting the cancellation fence; it never proves no payment, never orders source history, and never independently releases a slot. A scheduled bounded reconciler or explicit mutation can close an expired unpaid gate. Public status/availability GETs remain read-only. Accepted expiry policy, not the scheduler credential or database clock, authorizes this exact release attempt.

## Financial cancellation fence

Add a narrowly scoped coordinator table and wrapper RPC beneath the reservation. It carries no funds, price authority, transferable capability, or new consent. It stores the exact accepted tuple/reference, one nonce, terminal closed state, and original transfer coordinates.

Lock order is always native Source file lock (when selected), stable booking-operation transaction advisory lock, booking gate row, then the existing `chat-wallet-send:<nonce>` transaction advisory lock. The send wrapper checks existing actual payment first, verifies the original tuple, then either returns that original, refuses a permanently closed operation, or calls **unchanged** `chat_wallet_send_message` in the same transaction. The cancellation wrapper takes the same locks, retains an already accepted matching payment, or permanently closes the entire booking operation before reporting zero-write release. If registration has not materialized the row, cancellation creates the exact closed tombstone under that same operation lock; delayed registration cannot reopen it. Replayed or delayed requests with any review version for that operation cannot reopen it.

Register the exact gate before exposing an approvable reservation review. A reservation accepted before a registration failure stays preparing and can be repaired only by same-operation mutation; read-only status does not turn it into an approvable quote. Carry booking context in all existing transfer/receipt/original payload copies; an opaque note alone is not booking payment evidence. The ordinary connect, public-note, and session chat transfer HTTP boundaries must recognize registered booking payment coordinates and require this composition even if a client omits the optional booking descriptor. Missing or mismatched context cannot downgrade a booking payment into ordinary unguarded checkout. Unrelated ordinary transfers retain their exact current path.

## Source/SQL recovery boundary

There is no existing atomic transaction spanning the file Source writer and SQL Wallet function. Do not claim one. Existing Source file locks reject re-entry, and ordinary Source append/read cannot run inside a held callback. Extend the existing writer with a dedicated, closed Calendar booking operation method and internal accepted-command append; do not loosen the re-entry guard or expose an arbitrary caller callback as an admission API.

The writer recovers its retained pending append, verifies accepted terms under its lock, accepts `payment-dispatching` before invoking the bounded SQL wrapper, retains the actual financial original as accepted input/evidence, and accepts paid confirmation afterward. A process crash or lost acknowledgement can leave a reservation pending, never unpaid-but-released. Reconciliation reopens the original and appends the missing Calendar phase to the same event. If SQL commits a terminal close before Source cancellation appends, recovery repeats the close and then appends release. Stripe funding, emails, contacts, wallet hydration, and transfer action-ledger followups run after the file lock is released.

Selected native Source failure is an error, never a switch to SQL Calendar. Native Account selection alone does not select native Calendar: implement and test both branches selected by `actionLedgerSourceForServer()`.

## Delivery, cancellation, and existing routes

Every public booking entry, including legacy embed POST, `meeting:false`, and conversation confirmation, enforces the saved/accepted host policy. Every normal cancel/update entry delegates paid appointments to the phase-aware handler, including `mutateCalendarEventForOwner`, manual Calendar, and Twin tools. A lower-level direct legacy update cannot race around the booking lock. Legacy overlap admission uses a shared owner-range transaction lock and checks all blocking appointments, including reservations. Whenever an event can change, take that owner-range lock before operation/gate locks; locking only an exact start time is insufficient.

Only confirmed appointments reach the existing meeting invitation/contact/email rail. Existing meeting email already uses `calendar-meeting:<eventId>:<email>` provider idempotency. Retain a per-event, per-recipient initial-invitation attempt before dispatch and its outcome after acknowledgement. Recovery does not issue a second initial invitation after an ambiguous attempt. This guarantees no duplicate automatic initial send; it does not claim guaranteed email delivery after a provider acknowledgement is lost. Display the accepted appointment and pending delivery separately. A deliberate reschedule uses a distinct accepted event revision and updated ICS sequence, not a duplicate initial invitation. Initial email keeps its existing provider key; an update/cancellation uses that key plus accepted revision and delivery kind. The per-event accepted notification sequence starts at zero and increments for each reschedule/cancellation; ICS UID stays the event ID.

Existing public confirmation packs, meeting invitation grants, join checks, and reminder readers must reject pending/cancelled-unpaid events even if metadata contains a confirmation key. Source phase admission, not a user-controlled `paid` flag, authorizes those projections. Persisted booking/payment details stay in existing private owner/payer history; public fixed-sale notes disclose only their existing opaque coordinates.

## Rollout and exclusions

Install default-zero settings schema, gate/wrapper, Source readers/writers, common route guards, and client support before enabling any positive price. A backend capability/version check must reject owner attempts to enable pricing until both selected Calendar and SQL payment fence are available. Do not fall back to free booking when a migration, guard version, Source, or payment service is unavailable. This is staged feature readiness, not global native adapter activation.

No live migration, credentials, payment, card deposit, production configuration, or identity mutation is part of plan preparation. No native-only checkout provider, general escrow, new issuer/signature/token/registry, generic transaction framework, automatic refund policy, cancellation fee, or new platform markup is in scope.

## Acceptance evidence

Required implementation evidence: pure accepted-command replay; real temporary-Postgres races against the existing unchanged Wallet function; Source worker kill/reopen recovery; strict same-owner encrypted Checkout recovery; native/legacy old-client policy bypass tests; free-path/account-entry freezes; and browser recordings for owner settings, free booking, partial-balance/card-minimum review, unknown/reopen, paid confirmation, and host cancellation. Contradictory visible evidence fails the change even when tests pass.
