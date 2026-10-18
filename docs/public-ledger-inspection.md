# Public Ledger inspection and replay

The Ledger presents public activity, transactions, transfers and proof objects.
Opening a row exposes the selected source fields without another request.
The same inspector is used by account history and the shareable receipt reader.

## Readable first, inspectable throughout

- Record type, source identifier and carried event coordinate.
- Supported event value, consideration and a separate current asset calculation.
- Public participants and supplied ownership references.
- Entry/predecessor hashes, artifact digests and carried proof capsule fields.
- Exact Phi micro-units, USD cents and conversion-rate operands where supplied.
- Related loaded records joined by exact object, transfer or chain references.
- Source description, version fields, original source and original-file links.
- An expandable v129 calculation context, policy and selected-record JSON.
- Copy/download controls for the inspection record and compact receipt controls.

Missing amounts and missing precision remain absent. A common actor, matching
timestamp or equal amount is not used to manufacture a related transaction.
Loaded chain references are navigable observations, not a new chain verifier.

## Calculation boundaries

`ledgerValueForRecord` preserves an event's supported card snapshot separately
from its payment consideration. A current quote cannot replace that historical
snapshot. When the public valuation source identifies a unique sigil seed,
the existing v129 intrinsic function and retained issuance policy reproduce
the value at the selected whole pulse. The inspector carries the projection
digest/time, exact model seed, evaluation pulse, quote inputs and policy.

The retained account artifact dollar display uses
`Math.round(valuePhi × usdPerPhi × 100)`. The distinct v122 integer conversion
uses Phi micro-units and USD microcents per Phi with denominator `10^12` to
produce cents. Its numerator is shown as an exact integer before rounding.
Neither rule is substituted for the other.

The value explainer captures `receizKaiNow()` at the Calculate action, before
asynchronous verification begins. It displays **Present value at pulse** for
that captured evaluation. The original sealed coordinate is unchanged.
Historical slider samples and imported replay coordinates stay explicit.
There is no timer that changes an already calculated result behind the reader.

A reproducible protocol calculation, an asking price, an executed sale and an
available account balance are different facts. The public display does not
admit ownership, credit an account, consume a Note or establish conformance.
Those operations retain their original source and authority checks.

## Public and private boundaries

`readLedgerDetails` explicitly selects supported public fields. It does not copy
arbitrary payloads, conversation identifiers, note tokens, signing keys,
credentials or account recovery material. The public cache reparses those fields
when reopening. Identity-carried and authenticated account rows retain account
origin; their extra context and valuation operands do not enter public receipt
URLs automatically.

Receipts remain backward-compatible with `bankeiz.ledger-receipt.v1`. Added
inspection context is optional. If a link exceeds its existing byte capacity,
the core receipt survives and reports omitted context. Shareable display JSON
is not an independently verified proof; use the original proof for verification.

## Retained source and performance

The public seed contains 45,663 selected records, including 1,678 proof values
and public owners. It is rebuilt from retained public-only inputs. Repeated
public identity context is stored once in `detailContexts`; per-record
`detailsRef` values are bounds-checked and restored before presentation. Null
wire fields reopen as absent observations. This preserves detail within the
existing 32 MiB decoded seed limit and makes inspection available offline.

Older complete caches are enriched once from the versioned public seed. Their
newer values win; a different artifact/head/entry hash refuses the join. Objects
absent from an already complete cached graph or showcase are not revived.
Retained context carries its source observation time rather than a fabricated
event coordinate.

Only visible rows are rendered. The related-record index is built when the
record set changes; related receipt calculation/rendering starts when its
disclosure opens, with progressive access to the entire matching set. The
existing shared value source and local presentation clock remain in use.

## Global publication and synchronization

An upload first opens through the existing canonical v129 verifier. Publishing
requires review and consent bound to that exact source digest. The client sends
the same original to the shared native publication endpoint, then reopens the
publicly served bytes and verifies their digest before confirming publication.
Local inspection and recovery alone never publish anything.

The public discovery index is append-only and cursor-based. The reader requests
additions beyond its last consumed cursor and can read the latest window without
rescanning the entire index. Open tabs receive a digest-only notification;
other devices check the shared index on visibility, reconnect and the existing
refresh cadence. A changed source is canonically reopened and checked against
retained continuity before local custody advances. Initial discovery refreshes an already published source, and failed source reads remain pending for retry even if the discovery count is unchanged. Concurrent additions beyond the consumed cursor are read on the next pass. After a successful synchronization, unchanged discovery counts do not trigger another complete-source verification. Notifications are hints,
never admission authority, and dispatch no financial operation.

The native publication/source service must be deployed and reachable for a
global write to be confirmed. An unavailable service retains the current view,
originals and local inspection controls; it is not reported as a successful
publication.

Relevant tests: `ledger-inspection`, `ledger-inspector-view`, `ledger-economy`,
`ledger-receipts`, `ledger-receipt-view`, `public-network-cache`,
`value-explainer` and `value-explainer-ui`. Source, native resources, licenses,
offline shell and the separate Conformance build retain their release checks.

The linked [SDK schema reference](public-sdk-schemas.md) distributes the exact installed SDK definitions and coordinated MCP/AI Skills workflows. Its generated version, files and links follow the checked package release rather than an independently maintained Bank schema.
