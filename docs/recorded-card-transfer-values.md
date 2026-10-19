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

Inspection version 2 upgrades the public discovery cache once. Subsequent thin
feeds may retain enrichment only for the same immutable event; changed or
withdrawn complete graph rows cannot be revived by an older cache. The discovery
cache remains a public projection and grants no financial authority.

An already admitted Ledger original outranks this discovery cache. Its exact
action fields can replace conflicting weaker rows through a custody-bound
display writer; ordinary peer reads cannot use that correction path. The writer
checks the original's action hash, predecessor, kind, coordinate and amount,
and stale peer writes cannot overwrite the corrected transfer.
