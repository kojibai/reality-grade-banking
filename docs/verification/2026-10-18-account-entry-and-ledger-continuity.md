# Account entry and Ledger continuity — 18 October 2026

## Changed

Canonical identity admission now opens the account and its retained observation
before an online wallet read. Imported no-phrase identities prepare their
protected, sealed transport carrier only when transport is used. The same key,
owner and public key must still pass canonical re-admission before continuation
or grant exchange. Equivalent concurrent connection attempts share one checked
grant; a different application, consent or scope does not borrow that grant.

Derived transport custody is encrypted under the existing device key and updated
only while the exact original identity remains current. The transaction merges
the current record, preserving account observations and pending operations.
Original Identity Seal backup bytes are unchanged.

Private Ledger pages retain the full original JSON alongside display rows,
including direction, exact amounts, value receipts, source/checkpoint fields and
unknown fields. Refresh and pagination preserve earlier originals. Conditional
writes reopen and merge competing tab updates rather than replacing their pages.
Storage capacity failures preserve the earlier copy and report that retention
failed; they do not silently trim financial fields.

The complete native v2 account proof is retained separately under the same
identity's encrypted device custody. The existing v129 verifier authenticates
identity, pinned native signature, genesis, every history extension and balance
reconciliation before projecting Reserve and Settlement. Exact originals are
reopened locally on entry. Duplicate or older sources cannot add a debit or
credit twice. Concurrent captures serialize, and competing tab writes reload and
verify continuity before retrying. Background capture does not delay activity
rendering. Missing or unsupported source closures never become a zero balance.
A later verified checkpoint may extend an older observation; an older response
cannot rewind newer history or replace a local note successor. Matching amounts
preserve the current read time and chart points, and do not invalidate an
in-flight balance read. Wallet transaction-head coordinates remain distinct from
later proof issuance coordinates, so ordinary valuation reads are not mistaken
for older transaction histories.

Ledger downloads use the admitted source returned by retention, preserving newer
history and the exact original at an unchanged head. A freshly verified original
can be saved when optional browser storage is unavailable. A history conflict
still refuses. Publication succeeds visibly only after the public exact original
is fetched, canonically reopened and matched to the approved digest. Closing a
review during a retention operation cannot reopen it; delayed discovery cannot
remove a just-confirmed original. Transfer bounds apply before full allocation.

## Primitive preserved

The original identity and its verified carried state remain identity authority.
Known local observations paint before transport, without becoming funding or
spending authority. Public/private display activity remains a projection; it is
not substituted for the complete native account source. No replay guard,
canonical verifier, pinned root, financial qualification or custody requirement
was bypassed. SDK, MCP and AI Skills remain at 129.0.0.

## Checks run

- 550 tests in 141 files pass, including failed-first-read recovery, scope and
 application isolation, closed-identity refusal, immediate local entry, protected
 transport sequencing, complete private-page retention, local account restoration,
 competing writes, delayed balance reads, Ledger consent/continuity and bounded
 transfer regressions.
- Full application build, native source inventory, source archive, licensing,
 offline-shell and separate Conformance build checks pass.
- An operator-authorized original identity opened through the actual canonical
 SDK with networking forbidden: 1,181 ms, zero network attempts, verified portable
 state, unchanged original bytes. No live session or financial operation ran.
- Real Chrome/IndexedDB checks preserve the original and observation when derived
 transport is saved. Concurrent removal refuses late transport custody and does
 not recreate the removed identity.
- Real Chrome opens actual synthetic native account proofs, retains their exact
 originals in encrypted IndexedDB, restores a signed Reserve
 transition from 1,000 to 600 cents, refuses altered/foreign sources, and keeps 600 cents after duplicate/older
 inputs. Canonical reopening with the browser offline makes zero external network
 attempts. Temporary test public roots are confined to an isolated test bundle.
- Forced competing encrypted history writes retain both complete pages and all
 original direction, Phi amount and value-receipt fields. The repository's full
 private-vault browser harness also passes custody/removal and concurrency checks.
- Real Chrome at 393 × 852 and 1440 × 1000 keeps the existing layout, has no horizontal
 overflow/runtime errors and preserves the Learn header DOM during navigation.
- A test-only bundle with ephemeral public roots opens actual synthetic native
 Ledger originals, exports/reopens 2400 × 3000 Crystals, confirms fixture-only
 publication by exact-byte readback, preserves same/newer heads, refuses rewind,
 and reopens offline. Fresh verified downloads also work with IndexedDB absent.
 Production roots are unchanged; synthetic UI responses are not live account
 or financial qualification evidence.

## Risk boundary

A device can immediately restore the complete account state it actually holds.
An older identity with no carried wallet state and no retained complete account
source cannot establish its private balance from previously shortened display
rows. Earlier versions omitted direction, Phi amounts and value-receipt fields
from private caches. Those absent fields require one successful source sync;
they cannot be reconstructed from their display labels. New reads preserve the
complete responses and keep the independently verified native account source.
The existing native producer must supply a complete account closure; accounts
whose value also depends on unsupported profile/artifact closures still require
those original sources. Public action history excludes private funding/account
sources. No guessed balance or display-row sum is introduced.

At investigation time the live hosted continuation returned
`proof_replay_guard_unavailable`, not `proof_replayed`. Runtime logs showed an
upstream 522 timeout; an independent connection probe also timed out. The hosted
project reported active. The Ledger bridge deployment does not replace account,
identity or replay custody. This change does not claim that deployment fixed
those separate source-service failures.

## No downgrade

No stronger original, accepted history, identity, balance or custody was replaced
by weaker display rows, server availability or UI state. No SQL, package version,
secret, financial flag or user working branch was changed. The local review found
no remaining important findings. Live account recovery still requires reachable
complete account source custody when that source is absent from the device.
