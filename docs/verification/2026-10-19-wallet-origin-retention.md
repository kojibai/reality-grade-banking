# Wallet origin retention

The portable account may contain both `wallet.ledgerEntries` and the newer
`wallet.activityEvents` representation of the same entry. The previous mapper
discarded the complete older row when `wallet_ledger:<id>` was present, including
its proof-native credit metadata. It also omitted snake-case Phi amounts, and
the public origin selector dropped numeric seal/claim pulses.

The mapper now retains that already-carried evidence beneath the same exact
Ledger ID. Amount, direction and Kai coordinates must agree wherever both
representations supply them. A contradictory event keeps its own display but
does not inherit the older row's source evidence. Curated projection still
removes arbitrary metadata and private fields. Existing Reserve credits for
Connect payments and original downloads use the same originating-event view
as wallet deposits.

The Inspector and receipt already share `ledgerFundingTrace`; these retained
fields reach both without another request, cryptographic pass, or allocation
engine. Regression tests cover the complete proof → credit display, exact Phi,
numeric coordinates, duplicate event elimination, conflict refusal, and both
existing Reserve ingress names.

## Unfinished historical attribution

This fixes evidence loss. It does **not** complete individual-proof funding
attribution for every ordinary Wallet transfer. The read-only production check
recorded in the v129 connection audit found no `fundingSources`, `fundingBasis`
or `causalLineage` in any of the 88 retained Wallet transfer/message originals.
Their `settled_first_then_phi` rule specifies the rail split, not an allocation
among individual proof objects. The current-object chart source explicitly
does not establish historical ownership membership.

The necessary remaining input is the historical accepted sender source frontier
and its exact predecessor/evidence closure at execution, including any recorded
funding allocation. No exact enclosing source carrying that closure has been
located for these legacy Wallet transfers. Current valuation, coincident amounts,
chronological neighbors and a newly chosen FIFO rule cannot supply those missing
relations. No historical transfer, original proof, financial writer, antirollback
check, custody state or SDK version was changed by this patch.
