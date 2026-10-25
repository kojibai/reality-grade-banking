# Merchant receiving qualification

Source inspection, October24,2026. No real payment, charge, account enrollment or production mutation was used.

## Existing integration

`GET /api/connect/transfers?clientNonce=...` requires the authenticated `receiz:wallet.read` principal. Receiz `app/api/connect/transfers/route.ts`, `readRecordedWalletTransfer`, restricts its transfer query to `sender_user_id = principal.userId`. It returns the transfer row, original message row, receipt and sealed original; Bank `wallet-send.ts` requires the exact nonce, IDs, parties, integer amounts, public note and matching original/receipt digests.

A recipient cannot obtain that complete response through this resolver. A missing result under the recipient principal means no sender-owned match, not nonpayment.

The existing authenticated chat routes authorize conversation membership and include message receipt, `sealedOriginal` and `walletTransfer`. Those are useful discovery materials. They do not supply the separate transfer row/client-nonce relation required by the approved Counter acceptance contract. Some original wallet-transfer payloads initially carry a null transferId. An available chat original or public Ledger row therefore cannot be substituted for the required complete payment response.

## Required narrow extension

Extend the existing transfer resolver with an exact `transferId` plus `clientNonce` lookup for an authenticated recipient, retaining the same complete response and original-source checks. Restrict it to the recorded sender or recorded recipient; never accept a caller-supplied account ID. Require both coordinates to prevent ambiguity when different senders choose the same nonce. Existing sender-only nonce lookups and POST/payment dispatch remain unchanged.

Bank's transport must permit only the new exact pair of bounded query values. Counter discovery supplies candidate references; only the recipient-authorized complete original may mark Paid. All changed, absent, foreign-party or mismatched sources must remain unresolved/refused.

## Gate

The approved design excludes sibling-service authorization changes. Automatic Paid confirmation and making a fixed Counter sale payable remain disabled until this recipient-read extension is approved, implemented and tested. Independent fixed-request codec work may proceed. No synthetic success is a claim of deployed receiving qualification.

## Approved and implemented extension

The user explicitly approved this recipient-original read on October 24,2026. The existing Wallet GET now accepts the exact `clientNonce` and `transferId` pair. Its bearer principal must be the recorded sender or recipient; the original message remains bound to the actual sender and conversation. Existing nonce-only sender recovery retains its original filter and response. No payment writer, scope, account-entry path, balance, migration or financial rule is changed.

Primitive affected: incoming payment original and its receiving observation. Source: the existing complete Wallet transfer/message/original/receipt response. Risk: unauthorized disclosure if participant filtering is wrong; covered with sender, recipient, stranger, colliding nonce, wrong coordinate, malformed selector and missing-original behavior tests. No stronger source is replaced, and no first-paint path is added. External convention: none. Exact remaining boundary: production deployment is the user's step; no real payment was used for qualification.

Discovery uses the existing authenticated private Ledger response. Only `chat_transfer` events addressed to the current account and carrying the exact versioned sale note become candidates. Candidate transfer IDs and nonces select the bounded original read; the selected original must match those coordinates and the retained sale. Head checks and progressive older discovery use at most two pages per foreground check. Originals are fetched only for relevant candidates, accepted sources are reused, and unresolved older sources rotate through a bounded four-original batch. Counter does not trigger account preparation, valuation, proof rebuilding, chat read markers or notification changes.
