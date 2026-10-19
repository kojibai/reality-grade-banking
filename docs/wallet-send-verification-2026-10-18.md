# Connected Wallet Send verification

The user selected Wallet's automatic funding: Reserve first, then Settlement.
Bank uses the pinned v129 SDK `connect.transfer` and Receiz's existing atomic
`chat_wallet_send_message` writer. The separate native payment/asset adapters
and their retained recovery records remain available. A connected Wallet
response is retained as an observation, never admitted as a native financial
root, Note custody proof, or edge commit.

## Behavior

- Resolve exact human usernames or Wallet account UUIDs; never fuzzy-match a
  recipient. Receive generates that same routing coordinate.
- Review a fixed USD amount, live quote and estimated funding split. Wallet
  computes its execution quote and split when the user approves Send.
- Encrypt the exact SDK body and nonce before dispatch. Unknown delivery blocks
  a new send; recovery only reads the original nonce. Preserve the complete
  transfer row and carried original message before declaring it recorded.
- Refresh account and private Ledger from the open identity even if the Send
  sheet closes. An older asynchronous chart read cannot replace a newer head.
- Serialize fresh Notes and Send with execution → Notes locks. Check reciprocal
  pending custody and the strict saved local-head guard after waiting. Existing
  Note recovery/cancellation and payment lookup stay reachable; no reset exists.

## Local evidence

Bank unit/integration checks cover response loss, exact nonce reuse for lookup,
retention failure before dispatch, original-source mismatches, stale identities,
Receive-to-review routing, inactive Ledger refresh, delayed chart adoption,
both Note/Send overlap directions, and real AES-GCM custody read failures.
The full production build checks version 129 alignment, the offline shell,
source archive, licensing, and separation from the Conformance entry.

The browser fixture uses the real installed SDK with synthetic fetch responses,
no credentials or connected service. A $10 review showed $2.50 Reserve and
$7.50 Settlement. A deliberately lost response recovered one recorded payment
with one SDK submission; reopening retained the original without resubmission.
Screenshot: `/private/tmp/bankeiz-wallet-send-recovered.png`.

Receiz's temporary PostgreSQL test uses a fresh Unix-socket-only cluster and
no existing database. The baseline reproduced Reserve growing from $2.50 to
$5.00 across two stale allocations. The migration preserves Phi/Reserve totals,
refuses stale slices atomically, recovers concurrent same-nonce calls once,
binds USD/Phi retries across changed quotes, and preserves legacy native nonce
recovery during rollout. Service-only execution privileges are checked.

## Rollout and remaining qualification

The Receiz migration `20261019025326_wallet_send_atomic_funding_guard.sql` is
**unapplied**. Apply and verify it before deploying the Receiz handlers; then
publish Bank. Without it, quote preparation refuses and no SDK payment is
submitted. Production deployment, database migration and real transfers were
not performed. The user will push the local main commits.

The existing registration record permits `receiz:wallet.transfer`; Bank asks
for it only for Send, separately from ordinary account reads. No new application,
financial authority root, Crystal replacement, or native app was introduced.

The iPhone's saved-Notes `OperationError` remains unqualified on the actual
device. Local inventory now opens before signing setup and reports the inner
identity/checkpoint stage without disclosing private payloads. Preserve the
original encrypted checkpoints and device. These local tests do not qualify
Face ID, Safari/PWA credential evidence, hardware counters, or antirollback.
