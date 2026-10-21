# Standalone asset purchases

The public asset page retains the same account and Market execution primitives
as the application. The user chooses an asset and a dollar budget. A new account
opens in place after existing device-account restoration; its Identity Seal stays
on the device.

## Balance and card paths

An existing funded account uses the normal Market review and approval. When
card funding is chosen, the screen identifies the asset and explains the fixed
dollar budget and variable ownership quantity at the live Market execution price.
**Continue to payment** approves that purchase budget before opening card entry.
Matching, account-bound card credit then continues into the native Market
purchase without asking the user to buy the same asset a second time.

The card credit and the Market trade remain distinct financial results. They
are not an atomic cross-processor transaction. Do not report purchase completion
from a card success screen or deposit alone. Only the native recorded trade can
produce **Purchase complete**. If the purchase cannot finish, retain the exact
trade outcome/recovery reference. Confirmed funds stay in the account according
to the actual recorded operations; the application does not manufacture a
rollback, refund or new trade to make an interrupted screen look complete.

## Exact approval and once-only continuation

The in-memory approval binds the open identity, asset, card session and exact
dollar amount. It is created only from the fresh explicit purchase action, then
activated only after that same checkout's verified credit. The continuation
reopens the native Market quote, checks the asset, side, fixed budget and quoted
settlement bound, and submits its exact held review once. Concurrent UI effects
share the same attempt. The native adapter retains the nonce before submission
and reads uncertain results through the original reference.

The public URL and sessionStorage recovery entry are display/navigation hints.
They cannot mint approval or authorize a trade. Selecting an old checkout or
returning after a page reload therefore restores the funds and purchase context
but requires the ordinary Market approval again. Native account and trade
recovery remain authoritative after the ephemeral UI approval is gone.

## Notes

Purchase funding also offers **Pay with a Note**. It reuses the existing original
Note deposit for Reserve, Settlement and Settlement Reserve Notes. The payer
must own the Note under its actual source and custody rules. Received Notes
reconcile through their existing once-only credit before the Market boundary can
spend their value. Returning from Note deposit preserves the chosen asset and
budget and opens the ordinary trade review; depositing a Note is not itself
approval to purchase an asset.

## Qualification

Tests cover fresh account entry, explicit card-budget approval, credit-pending
refusal, exact-budget automatic continuation, shared attempts, substituted
identity/asset/session/budget rejection, old-checkout refusal, and retained native
recovery. These tests use synthetic processor and Market responses. A live card
payment, device return path and resulting ownership require separately authorized
production qualification for the exact deployed build.
