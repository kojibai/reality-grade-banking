# Local payment and Market execution

Date: October 22, 2026

Status: direction approved; written design awaiting review. No execution changes
or performance improvements have been implemented or measured yet.

## Requested outcome

Send, Buy and Sell complete against verified user-held proof, then synchronize
the committed result globally. The user does not wait for global synchronization
to see a transaction that has already committed locally. Preserve the existing
amounts, ownership, funding order, fees, explicit approvals and resulting value.
Preserve the existing global synchronization contract and its replay behavior.

This takes priority over the merchant Counter. Keep its approved design and
unfinished implementation plan intact, but do not implement merchant features
while this execution boundary is being resolved.

## What the current code actually does

The current Send adapter prepares a connected Wallet quote, submits through the
connected transfer operation, then performs an unconditional original-outcome
GET. It verifies and retains that original before reporting success. It also
awaits its `onRecorded` display-adoption callback.

The current Market adapter obtains a connected advisory quote and submits to the
connected trade operation. It can already admit a complete returned original
without a recovery GET. It retains the accepted original and awaits its
`onRecorded` callback, which may initialize portfolio presentation and refresh.

These are connected observations. Their encrypted local checkpoints and sealed
account presentations do not mean the buttons already performed a local native
financial commit. Current guards deliberately prevent a locally advanced Note
account head from being spent again through a stale connected account path.

The installed SDK provides `value.edge.planSettlement`, `planReserve`, transition
set verification, local artifact-transition commit and edge send/receive
confirmation. Its published contract explicitly separates edge transaction
authority from additive synchronization. The Bank buttons above do not currently
call that execution path. General Bank/native payment adapters also currently
delegate preparation/execution to connected operations.

An eligible local transition must have the actual admitted financial sources,
participant authority and a conforming durable store. A read-only position,
advisory price, arbitrary document seal or a locally edited balance cannot supply
missing spending authority or a funded Market counterparty.

## Selected architecture

Use the installed SDK's source-bound transitions and qualified local custody.
Prepare and retain exact available execution material before presenting an action
as locally ready. At final approval, verify the held inputs, perform the exact
authorized transition atomically, retain its committed recovery and publish the
result to the UI. Existing global synchronization consumes the committed original
after that boundary.

Do not queue an ordinary connected execute request and call it a completed local
payment. Do not suppress a pending outcome or show a generated seal as completed
financial effects. The local committed proof is the completion boundary.

The same architecture must cover Send and both Market directions. An independent
first step removes redundant work after an already verified result in the current
adapters. That first step improves existing latency but does not establish
network-independent execution by itself.

## Sources, authority and readiness

Build an explicit readiness inventory for the active identity:

- exact admitted current value sources and their spendable heads;
- original Reserve backing and fixed-dollar denomination;
- original Settlement units and the admitted price basis;
- recipient identity, receiving source/head and the authority needed for its
  exact transition;
- current owned shares, issuance/supply and locked/free quantities;
- executable seller/buyer offers or other existing qualified Market authority,
  with actual locked shares/funds and exact expiry/price terms;
- the complete participant capabilities required by the SDK operation plan;
- a conforming protected local store, durable recovery and cross-tab exclusion.

Use existing preparation/read opportunities and coalesce overlapping work.
Preparation does not debit funds or authorize a transaction. Public display
material must never silently become an executable offer. Changing an amount or
source invalidates the corresponding prepared review; a changed financial term
still requires the existing exact user approval.

Do not introduce a new price, liquidity policy, financial root, issuer, capability
grant or custody claim merely to make a transaction locally ready. Existing
connected balances and positions require an authenticated source-preserving
handoff into exclusive local custody before local spending. That handoff must
prevent concurrent spending through the old connected path or another copied
device record. A browser lock alone does not establish that cross-device boundary.

Document concrete unavailable inputs and stop before claiming support for them.
Package symbols and synthetic fixtures do not establish deployed source admission.

## Local Send

Keep the exact reviewed recipient, dollar amount, public note, Reserve-first then
Settlement funding, and existing shortfall rules. Use the SDK's exact integer
arithmetic and admitted rate/denomination rules. Do not add a new small monetary
cap; respect the actual source, capability and transport bounds.

Construct and verify the complete participating transition set. Commit only
against the exact admitted predecessor heads, capabilities, current temporal
conditions and durable local store. Retain the committed successor and recovery
before displaying completion. Recovery reopens this exact attempt and never
submits it again under another nonce.

The sender's committed debit, proof delivery and recipient's verified receipt are
distinct facts. A recipient confirms from the actual committed recovery and its
matching receiving transition. A sender animation or queued delivery does not
prove the recipient has received the proof. Preserve that distinction in status
and receipts without adding an unnecessary confirmation step for the user.

New card funding continues through the existing provider and confirmed credit
rules. A local seal cannot establish that a card was charged. Once funding is
actually admitted, the already-approved payment can continue through its eligible
local execution path. Keep original pending card sessions recoverable.

## Local Market Buy and Sell

Keep dollar-budget buys, dollar/share sells, holding percentages, fees, exact
price/rounding behavior and the current approval rules. The accepted result must
conserve both value and ownership under the same financial operation.

A buy commits the buyer's payment and delivery of actual authorized shares. A
sell commits ownership delivery and payment from an actual funded counterparty.
Require the executable offer/capability and collateral sources; a public chart
price does not authorize an exchange or create liquidity.

Verify and commit the complete participant set using the existing qualified
financial domain. No one-sided ownership credit, unbacked proceeds or partial
success may appear. Replay, stale offer/head, expired authority and competing
fills must produce the SDK's supported no-write/refusal or exact committed
recovery result. Missing authority remains an explicit inability to execute.

The installed public edge-value API directly covers Reserve/Settlement transfers.
Do not assume it also supplies a qualified local Market financial reducer. The
implementation must identify and exercise the actual source-bound Market effect
contract before connecting the production Buy/Sell buttons to a local writer.
The Bank's existing `previewAssetChange` is a projection, not that contract.

## Durable completion and unchanged global synchronization

Retain the exact local operation, original nonce, committed predecessors and
successors, receipt and recoverable synchronization item at the commit boundary.
Crash recovery must distinguish uncommitted, committed-awaiting-sync and synced
states without a second financial execution. Validate identity and source scope
on every reopen. A storage failure cannot be reported as durable completion.

Reuse the current additive synchronization interface, its exact recovery format,
idempotency coordinate, authentication and retry policy. Do not change the
receiver's global read contract, public Ledger semantics or accepted financial
end result. Duplicate delivery must adopt the same result once. An unavailable
sync service retains the local committed original and queued delivery; it cannot
roll back that commit or manufacture a different result.

First establish which existing interface accepts these committed financial
originals. Current connected Send/Market execute POSTs are not assumed to be
append-only synchronization endpoints. If the existing sync contract cannot
accept an equivalent locally committed result, this is a compatibility blocker
to the requested unchanged-sync delivery. Report it rather than sending a second
financial execution or silently changing the global contract.

Old pending connected attempts keep their original outcome and cancellation
paths. A local migration cannot abandon them, reinterpret them as no-write,
replay them locally or clear their account guards. Historical receipts and
Identity Records remain readable.

## Immediate removal of redundant waits

For the existing connected path, a complete Send POST original may use the same
strict source validator and durable retention as the current outcome GET. Only a
missing, incomplete, foreign or mismatching original needs the recovery read.
Never skip original validation or checkpoint persistence.

Separate immediate adoption of accepted transaction effects from background
chart preparation, portfolio refresh and account synchronization. Neither a
display callback nor a failed refresh should hold an already retained result
open. Keep stale-response protection and identity checks. Preserve absolute
returned positions and admitted account values; do not calculate a new complete
cash balance by simply subtracting a displayed trade amount.

Regression checks must prove the same terminal outcomes, exact source retention,
required recovery behavior and existing caller-visible updates. This step must
not be described as completing the local execution migration.

## Timing and verification

Report actual baseline and changed request counts and timings for Send, Buy and
Sell separately. Distinguish real local verification/durable-write time from
injected network latency and actual deployed network measurements. Do not claim
a percentage reduction or literal zero execution time without evidence.

The decisive local-readiness test disables network before approval and requires
the actual financial operation to commit, reopen and verify from durable local
custody with all exact value/share effects. Follow with a failed sync, reload,
duplicate delivery and resumed existing sync, verifying the identical result.

Also test two tabs/devices or copied/rolled-back sources, conflicting heads and
offer fills, expired/revoked authority, changed rate, partial fills, complete
liquidation, Note-origin value, card shortfalls, identity replacement, crashes at
each commit/retention boundary and old pending connected attempts. Unavailable
sources and unqualified stores must refuse rather than pass through fixtures.

Use real pinned SDK verification for proof/effect acceptance; synthetic funding
and test-only roots remain labeled as such. Do not operate on live funds without
explicit approval for the exact payment/trade. Preserve all existing financial
verification gates and do not enable them with a flag as a substitute for tests.

Complete the fresh independent code review, full appropriate test suite, source-
bound engineering evidence, production build and source archive checks. Commit
the reviewed implementation on main for the user to push. No Receiz source,
service configuration, synchronization protocol, package pin or financial rule
change is authorized by this Bank integration design.

## Completion criteria

Both Send and Market execute through verified, admitted local financial custody;
the user sees the committed outcome before global synchronization; the unchanged
global interface adopts the same original exactly once; and measured timings plus
network-disabled qualification demonstrate those facts. Removing an extra read,
moving a spinner or queuing an existing remote execute call does not by itself
satisfy the requested outcome.
