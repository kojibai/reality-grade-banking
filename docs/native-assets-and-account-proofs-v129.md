# Native assets and account proofs — v129

Bankeiz keeps its existing funding, ownership, exchange, review, recovery, asset
and account-proof screens. SDK, MCP and AI Skills stay at 129.0.0. The Receiz
host provides the native domain effects beneath those interfaces; installing a
package alone does not activate a hosted financial writer.

## Accepted asset effects

`/api/connect/bank/assets/{prepare,execute,recover,portfolio}` uses the existing
same-origin transport and current account/key scopes. Preparation does not debit
funds. It returns bounded, exact terms and an encrypted intent. Final approval
signs that exact review. Bankeiz retains it encrypted before submission. A lost
response remains unknown until the original nonce and plan digest are reopened.
Recovery can finish an already accepted prepared source, but never submits a
second transaction.

The shared native writer verifies current account and asset heads, funding,
consent, expiry, quote and original maker authority under its existing locks.
Funding removes actual available rail value and locks its original backing to a
conserved supply. Ownership sends move exact units. A signed ask locks units;
a signed bid locks actual funds. Exact partial fills exchange those quantities
and consideration atomically. Cancellation releases only unfilled collateral.
Whole-supply redemption burns the circulating supply and releases its original
backing once. Reserve keeps its original dollar denomination; Settlement keeps
its fixed Phi. There is no separately charged trade fee in this contract.

An exchange or Market sale requires a real owned/funded signed offer. Public
Market prices cannot become liquidity. Revoked offers cannot block a later
eligible offer. A designated bank buyback and physical release still require
their actual policy, custody/title and authority sources; a bank name or an
attached file does not supply those rights. Linked physical backing is refused
by this native currency path until that separate closure is admitted.

## Holdings and portable receipts

The private portfolio read delivers canonical Record/Seal position certificates
with the existing financial-root signature. They bind account/key, original
issuance, exact asset head and its accepted Kai coordinate, free/locked units,
and asset backing. They attest an accepted position, not physical custody or a
new right to spend. Execution independently reopens the current native state.

Unchanged certificates reuse their exact retained bytes. Zero-quantity
successors remove sent or redeemed positions from the current view. Bankeiz
orders certificates by their accepted source coordinate before issuance time;
a delayed old read cannot replace a newer position. Selection stays on the same
asset when a certificate changes. Current source delivery runs behind the held
view; an unavailable host does not erase local originals. A committed operation
queues a fresh delivery even when a previous refresh is still in flight.

Receipts, unknown intents and imported originals remain in encrypted device
custody. Imported position/receipt metadata must pass both canonical v129
verification and the typed financial signature. Unknown results cannot be
exported as successes or discarded by replacing/removing the identity.

## Full account source qualification

The closed v3 public statement binds authorization, wallet, lawful inventory,
account history and asset history/heads into one source-frontier digest. The
producer and shared disclosure writer independently reopen that frontier.
Publication and live refresh reject a changed source rather than publishing an
older consent against new facts. Existing v2 snapshots remain immutable and can
continue into v3 without rewriting their cash history.

Cash movements reconcile from genesis. Asset positions, offer collateral and
fully reopened lawful value components are separate from spendable cash;
intrinsic quotes do not create Settlement credit. Profile metadata with an
admitted empty artifact membership does not invent asset value. A selected
retained lawful inventory is reopened through its original custody/value chain,
including its actual provenance, before it contributes a disclosed component.

Missing current private-owner archives, nonempty/imported artifact frontiers,
creation entitlements or outstanding offline custody cannot be normalized to
zero. Those accounts require their complete source closures before a full proof
can be issued. An Identity Seal, public showcase projection or activity list
alone is not that closure. This is enforced by the reader and writer, not a
caller-controlled completeness flag.

## Qualification and activation

The local tests exercise the actual native writer, canonical sources, typed
signatures, paired economics, publication CAS, cold replay and API/Crystal
transport with simulated funding/admission and ephemeral roots. Browser checks
exercise real encrypted IndexedDB and refusal mechanics on a separate dummy
origin. These are not live funding or physical-device attestations.

The production Crystal installation must mount the reviewed native Bank port,
provide the same admitted durable account/global sources and qualify protected
custody for every source, journal, receipt, certificate and accepted-head write.
The existing server-only URL/key configuration selects it. No request or public
activation flag grants financial authority, and upstream failure cannot select
another local writer. Push both reviewed main commits, then verify real
same-source account journeys on the deployed qualified installation. No SQL or
SDK/MCP/AI Skills version change is introduced here.
