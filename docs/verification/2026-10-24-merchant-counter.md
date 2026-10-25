# Fixed checkout and merchant Counter verification

October 24, 2026. Implemented on main; pushing and deployment remain the user's step.

## Merchant and payer flow

Receive → Counter → enter a fixed USD total → Create checkout. The request is durably retained before its link/button/QR is shown. The payer uses the existing hosted Balance/Card/Note checkout and approves its exact recipient and total. A versioned public note binds the sale digest to the existing payment nonce. Card minimums, shortfall funding, Note surplus, execution, fees and recovery stay unchanged.

The merchant's active Counter automatically discovers relevant incoming payments and reads their exact authenticated originals. Paid requires matching parties, cents, transfer/message/conversation/nonce, public sale reference, and the existing Wallet original/receipt digest relationships. A card credit, redirect, balance change or browser callback cannot mark Paid. Real additional payments remain separately visible. The payer reopening a completed fixed request sees its original receipt rather than another payment form.

## Retention and runtime boundaries

Counter is lazy and starts no receiving reads on ordinary account restoration or Receive. Its single watcher checks only an open, active, visible, connected Counter, coalesces wakeups, backs off at 2/5/15 seconds, and bounds checks to 15 seconds. A check reads at most two Ledger discovery pages and four relevant originals in parallel. Failed originals rotate fairly. Accepted originals are reused and replayed until durable retention succeeds; acknowledgement follows that write. Paid persists through network failure.

The encrypted working set holds 100 recent checkout bodies. Older exact bodies, including originals, move to existing immutable encrypted byte custody; their public request coordinates remain indexed for late payments. Selecting an older record restores and validates its exact content hash and original bindings. Storage failure preserves the previous state. History is paginated in the view. No evidence is deleted and there is no fixed lifetime checkout-count ceiling. The Identity Record restores identity; it does not export this device's entire local Counter history. Payment evidence can be saved independently.

## Verification evidence

The whole Bank test run passes 2,982 cases with zero failures or skipped cases. The source snapshot and sanitized conformance engineering record are regenerated from the frozen, locked-dependency verification checkout. Typecheck and the complete production build pass. Receiz recipient-read/Wallet tests pass 18/18; the account-entry freeze passes 57/57, with zero skipped. Receiz whole-project typecheck passes with an 8 GiB Node heap.

The two-role real-browser harness uses synthetic originals and separate retained stores; it submits no real funds or card charges. Balance, Card, Reserve Note, Settlement Note and composite Note each produce exactly one transfer, automatically confirm Paid on the merchant screen, and reopen Paid on both sides. Card reload/resume, actual browser encrypted Counter retention/CAS conflict, independent displayed-QR decoding, and 320/390/768/1440-pixel overflow checks pass. Unit regressions cover malformed/partial links, changed source bindings, identity switching, suspended surfaces, fair retry, failed durable retention, archived history/late payment and storage corruption.

Reproduction commands: `npm test -- --maxWorkers=4`, `npm run typecheck`, `npm run build`, and the Counter browser harness under `tests/browser/merchant-counter.html`. The browser fixture is a local qualification tool and is excluded from the deployed app.

## Review decisions and limits

- Discovery uses the existing private Ledger instead of chat pagination, which marks messages read and cannot supply the exact transfer relationship. If unavailable, automatic confirmation waits; payment execution is unchanged.
- The fixed marker leads generated query strings, so partial generated queries refuse instead of becoming editable. Removing an entire query is indistinguishable from a legacy ordinary request; ordinary links remain supported. Such a payment cannot confirm the original fixed sale.
- Immutable encrypted archives remove the permanent history cap while bounding the working set. Physical device capacity remains finite; failed retention does not discard evidence.
- The exact recipient-original read deploys in Receiz before Bank Counter. Tests qualify the code contract; no live financial acceptance is claimed before deployment.
- A public fixed link does not reserve an order across different customers. Additional genuine payments require merchant review before repeated fulfillment.
- Catalogs, refunds, tax, staff, remote fulfillment and card-present terminal acceptance remain separate merchant features.
- Counter history is device-retained; identity portability does not manufacture a missing local request list.
- The connected Wallet original observation remains its existing primitive. This change does not claim a new offline financial-root receipt.
- Concurrent Business marketing changes remain outside this commit. Verification uses committed sources plus this exact Counter change.

## Preserved primitives

Identity, Wallet execution, Note custody/credit, card funding, retained financial nonces, receipt originals, proof funding continuity and global synchronization keep their existing authority. The new Receiz operation is a participant-authorized read of an existing original. No migration, balance mutation, payment writer, new scope or financial rule is introduced.
