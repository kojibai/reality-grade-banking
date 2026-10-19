# Recorded card transfer values

The public Ledger preserves the value explicitly recorded at each transfer,
bound to its existing entry hash, collectible ID, claim hash and canonical event
coordinate. Card value and payment consideration remain separate fields.

The October 19 enrichment of the existing public cache restores 41 recorded
card-value snapshots among its 193 Sports Arena transfer actions. The upstream
read contained 194 actions and 42 snapshots; the additional action is outside
this retained capture. A separate read of verified carried ownership proofs
restores exact coordinates and object identifiers for all 59 existing graph
transfer rows. The cache's original capture coordinate is retained; the later
observation date records when those source fields were inspected.

Older upstream transfer actions (152 in that read) have no explicit card-value
snapshot in their public action or matching wallet payload. The carried graph
events likewise supply transfer coordinates and consideration, but no historical
card value. Their payment amount or today's quote cannot establish the object's
value at the past transfer. The interface keeps that value unavailable until a
supported exact historical source is carried. It does not substitute a current
price, pack price or consideration.

## Deterministic values from existing individual models

The Ledger now indexes the individual collectible IDs and claim hashes already
carried by the shared market source, rather than only its market-group IDs.
For an exact matching copy with a bound single-copy history model, the Ledger
reuses Receiz's native historical card-chart calculation at the event pulse.
The label is **Calculated transfer value**, distinct from **Card value at
transfer**, which continues to mean an explicit carried snapshot. The receipt
retains the copy identity, sealed birth, observation, complete model inputs,
evaluation pulse and rounding rule. This is a deterministic projection, not
evidence of an observed quote or realized sale at that past moment.

In the retained capture, 43 additional transfer rows support that replay.
Together with the 41 snapshots, 84 of 258 card-transfer rows can display a
supported value. The other 174 carry neither a matching individual model nor
an explicit event snapshot in the existing inputs; no aggregate group value
is divided or attributed to an arbitrary copy. Earlier and later coordinates
outside the model's supported interval remain unavailable.

No new source request, per-card fetch, account read or original-file request is
added. Copy aliases and model bounds are prepared once per shared source.
Immutable event results are cached by record and reused across pulse ticks,
inspection and receipt construction. The source files and capture are unchanged.

Inspection version 2 upgrades the public discovery cache once. Subsequent thin
feeds may retain enrichment only for the same immutable event; changed or
withdrawn complete graph rows cannot be revived by an older cache. The discovery
cache remains a public projection and grants no financial authority.

An already admitted Ledger original outranks this discovery cache. Its exact
action fields can replace conflicting weaker rows through a custody-bound
display writer; ordinary peer reads cannot use that correction path. The writer
checks the original's action hash, predecessor, kind, coordinate and amount,
and stale peer writes cannot overwrite the corrected transfer.
