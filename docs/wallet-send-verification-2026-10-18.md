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
- Automatically cancel an unissued legacy Note attempt before Send review and
  ID removal, under execution → Notes locks, using the unchanged v129 runtime.
  Preparing cancels locally without enrolling, signing or connecting. Funding
  clears only after the existing signed host cancellation is confirmed; issuing,
  prepared custody, unreadable state and unconfirmed funding stay retained.
  The original guarded ID removal still runs after cleanup.
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
no credentials or connected service. A $10 synthetic quote used $2.50 Reserve and $7.50 Settlement. The current
review shows “Composite balance” for that split and only the used account for
a single-source quote; available account balances stay out of the entry form. A deliberately lost response recovered one recorded payment
with one SDK submission; reopening retained the original without resubmission.
Screenshot: `/private/tmp/bankeiz-wallet-send-recovered.png`.

Receiz's temporary PostgreSQL test uses a fresh Unix-socket-only cluster and
no existing database. The baseline reproduced Reserve growing from $2.50 to
$5.00 across two stale allocations. The migration preserves Phi/Reserve totals,
refuses stale slices atomically, recovers concurrent same-nonce calls once,
binds USD/Phi retries across changed quotes, and preserves legacy native nonce
recovery during rollout. Service-only execution privileges are checked.

## Rollout and remaining qualification

The Receiz migration `20261019025326_wallet_send_atomic_funding_guard.sql` was
**applied with explicit user approval on 2026-10-19**, after the iPhone Safari
Send screenshot reported HTTP 503. Read-only production catalog checks first
confirmed the original writer existed, the required guard was absent, and the
installed function body exactly matched the tested baseline. A fresh isolated
PostgreSQL run passed all five funding, nonce, live-rate and privilege checks.

Production now reports `wallet-send-atomic-v1`; the stale-funding and
nonce-conflict checks are present. Execute privilege is service-only, with a
fixed `pg_catalog, public` search path. No transfer was executed by the agent. The user then cancelled their unissued
Note through the existing UI and confirmed a real payment was sent successfully.
The Supabase migration tool recorded version `20261019042410` under the same
`wallet_send_atomic_funding_guard` name. This corresponds to the existing local
`20261019025326` source; future migration-history reconciliation must account
for the tool-generated version rather than assuming the local file is still
unapplied. The user will push the local main commits.

Before automatic Note cleanup was added, the Bank regression suite passed
1,159 tests across 207 files with four workers;
the unrestricted first run hit the existing five-second verifier-asset test
limit under parallel load. Build, offline integrity and Vercel checks passed.
The login-header change separately passed all 28 entrance checks. Input
styles keep editable controls at 16px or larger, preserving larger amount
fields and manual zoom. Physical iPhone focus zoom still needs confirmation
after the user deploys these changes.

The existing registration record permits `receiz:wallet.transfer`; Bank asks
for it only for Send, separately from ordinary account reads. No new application,
financial authority root, Crystal replacement, or native app was introduced.

The iPhone's saved-Notes `OperationError` remains unqualified on the actual
device. Local inventory now opens before signing setup and reports the inner
identity/checkpoint stage without disclosing private payloads. Preserve the
original encrypted checkpoints and device. These local tests do not qualify
Face ID, Safari/PWA credential evidence, hardware counters, or antirollback.

## Automatic cancellation checks

The added composition checks exercise failed preparing-state cleanup before
Wallet review, serialized cleanup for removal, funded issuance retention,
canonical cancellation refusal, unreadable state retention, and hook ordering.
The shipped `/native/offline-notes.v129.mjs` also passed the isolated browser
fixture `tests/browser/note-cancellation.html`: preparing cleared locally while
unrelated state was unchanged; funding without its exact original and issuing
were preserved byte-for-byte. No enrollment, signature, financial request or
new source occurred. This is cancellation evidence, not iPhone custody
qualification. The user-reported Safari credential remains unqualified.
