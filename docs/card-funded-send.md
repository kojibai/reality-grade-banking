# Card-funded Send

Send retains one reviewed recipient, dollar amount, optional public note and
original payment reference. When the account can fund that payment, the
existing Wallet transfer path is unchanged.

If Wallet explicitly refuses the original reference with
`wallet_insufficient_funds` and `submission.status: not-submitted`, Bankeiz
reads the existing account observation and opens its embedded card checkout for
the missing dollar amount. For a $10 Send with $3 available, checkout funds $7.
The customer completes checkout in the same Send view. A verified account
credit continues the saved payment automatically, using the same recipient,
amount, conversation, public note and `clientNonce`. A second review or Send
action is unnecessary.

## Financial and recovery boundaries

- Card funding covers the confirmed shortfall within the existing checkout
  limits ($0.50–$100,000). If the missing amount is below the card minimum, the
  interface shows the minimum charge and the exact remainder retained in the
  account. Wallet still determines the actual funding split when the complete
  approved transfer executes. An unavailable or incoherent account observation
  cannot be treated as a zero balance.
- **Back to send** returns to the retained form through the existing local
  funding cancellation. It does not expire a provider session or reverse a
  charge already in progress. The outer close remains available.
- The selected shortfall is saved before checkout creation and remains fixed
  during recovery. Older retained full-amount checkouts keep their original
  amount; they are not replaced with a second shortfall checkout.
- A transport error, an unbound refusal or an unknown transfer outcome cannot
  open another checkout. Recovery reads the original transfer reference;
  it never repeats an uncertain transfer.
- Checkout is retained in the existing device-encrypted card operation store.
  The saved Send reference locates that operation after interruption. A
  checkout whose creation response is unknown remains unresolved; its
  reference is not a provider idempotency guarantee.
- Provider frame messages and return URLs are navigation/status hints. Only
  Receiz's authenticated checkout status, bound to the retained session,
  account and amount, can establish the account credit.
- The Send checkpoint retains confirmed credit before the native card
  operation can be cleared. A general card-return screen cannot discard a
  matching pending Send's checkout. Reopening Send resumes that retained
  approval without another recipient search, quote or checkout creation.
- Before submission, the exact transfer body is retained as unknown. The
  original Wallet receipt, message and transfer fields must agree before
  Bankeiz reports that the payment was sent. Concurrent financial operations
  remain serialized under the existing account and Note execution locks.
- Card credit and recipient transfer are two recoverable financial operations,
  presented as one payment flow. They are not represented as one atomic bank
  transaction. If the transfer cannot complete after the card credit, that
  money remains in the account; cancelling Send does not reverse a card charge.

## Verification

The regression suite covers exact no-submission refusal, shortfall and minimum
checkout amounts, Back, legacy full-amount checkout recovery,
open/settling/unpaid/expired outcomes, interrupted creation, reopening, retained
credit before cleanup, mismatched sessions/amounts, and unknown transfer
recovery without resubmission. Synthetic browser checks exercise the embedded
checkout and automatic continuation on mobile and desktop without charges or
live transfers. Production qualification requires the exact deployed build and
an approved real checkout/transfer; synthetic results do not establish it.

The [shortfall qualification record](verification/2026-10-21-send-card-shortfall.md)
records the later delta-funding and Back checks, including $3 plus $7 for one
$10 Send and a sub-minimum shortfall that leaves the disclosed remainder.
