# Send: card shortfall and return to editing

## User-visible behavior

An approved Send uses the current account balance. If Wallet explicitly refuses
the exact request before submission because funds are insufficient, Bankeiz
opens the existing embedded checkout for the missing USD amount. For example,
a $10 Send with $3 available asks for $7 by card. Once that credit is confirmed,
the original $10 Send continues automatically with its original recipient,
conversation, note and nonce.

The single **Back to send** action appears above checkout. It uses the existing
local funding cancellation and returns directly to the retained recipient and
amount. The outer close action remains available. Back does not claim to expire
a processor session or reverse a card payment already in progress.

The current card minimum is $0.50. When the shortfall is smaller, checkout shows
the minimum charge and the exact remainder that will stay in the account. The
recipient still receives the approved Send amount.

## Implementation boundaries

- Bankeiz only; no Receiz backend, frontend, schema or verifier changes.
- Fully funded sends have no added request or checkout work.
- Only an explicit `not-submitted` refusal matching the saved nonce allows the
  funding path. An unknown transfer result continues through its original
  read-only outcome recovery.
- The shortfall uses the existing authenticated `/api/connect/wallet/me` read,
  with the same owner and coherent Reserve/Settlement total required. Explicitly
  unavailable or incomplete profile projections stay unresolved. A genuine
  account-only response with no profile entitlement remains eligible. It never
  treats the requested quote as an available balance or assumes zero on error.
- The refusal is saved before reading the balance; the exact shortfall is saved
  before creating checkout. Once chosen, it is not recalculated on reopening.
- A card creation interruption retains the existing reference. Confirmed credit
  is retained before the checkout may be cleared or the original send resumed.
  Native checkout retention matches the card amount, which may differ from the
  full send amount.
- Earlier full-amount pending checkouts remain resumable at their saved amount.
  No second checkout is created to replace them.
- If the account changes while checkout is open, a later refusal does not start
  another card payment. Existing execution guards and unknown-result recovery
  remain in force.

## Verification

- Reproduced failures before implementation: full-amount charging instead of
  shortfall; missing shortfall-stage recovery; clearing the funded card before
  the larger Send retained credit; full-amount checkout heading.
- Complete Bank test suite: 366 files, 2,181 tests passed.
- TypeScript check and complete production build passed.
- Real Chrome, 390px and 1440px: Back preserves the form without sending; $3 plus
  a $7 card credit completes one $10 Send; $9.75 plus the $0.50 minimum completes
  one $10 Send and leaves $0.25. Each scenario performs one balance read, one
  checkout creation, and no duplicate transfer after terminal recovery. No
  page errors or horizontal overflow.
- Browser checkout and account services were isolated synthetic fixtures;
  no live card payment, account mutation or money movement was performed.
