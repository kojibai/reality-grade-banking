# Public proof-economy value history

The shipped inventory carries 5,366 verified public card claims covering 5,364
collectible IDs across 2,577 sport/card/rarity groups. Each claim carries its own
opening date, canonical birth value and available public owner name. Claims and
distinct collectible IDs are different counts. All claims enter at their own
seal: 1,819 distinct whole-pulse coordinates, including shared pack openings.

The native public first-paint proof is
`app/lib/game/sportsEconomyFirstPaintProof.v1.json` in Receiz. Its carried date is
2026-06-23T20:01:03.454Z. SHA-256 of `JSON.stringify(proof.payload)` independently
matches `85120bb4173456c0f19bcc98189f76b220fe682f52b53d6ef0283f905b11a2db`.
This identifies public display inputs; it grants no transaction or custody authority.

That capture reports $426,947,017.33 across 1,962 groups: 1,197 single-priced-copy
observations, 745 group totals and 20 groups without a supplied current price.
Single-copy records bind the exact collectible ID and claim hash. Group totals
remain aggregate, counted once; they are never divided into invented per-copy
prices. Snapshot counts and amounts must agree with the carried row observations.
Later evaluation coordinates remain distinct from opening dates.

## Native historical projection

The one chart retains the full live market value. It does not replace that total
with the approximately $131 million sum of opening values. Each object enters at
its own seal; the endpoint uses the unchanged current market calculation.

For supported single-copy records, the history calculation follows Receiz's
`SportsCardPremiumValueChart.tsx`: `sportsCardPulseProgress`, the two-point fallback
of `interpolatedSportsCardValue`, `sportsCardHistoricalBaseUsdValue`, and
`sportsCardHistoricalLivePulseChartPoint`. The value basis progresses between the
opening and the supplied pricing coordinate. Market pressure and score pressure
progress with it. The existing `sportsArenaLiveValueMotionAtPulse` arithmetic
then supplies the seed-specific pulse motion and four-decimal rounding. Opening,
recorded capture and live endpoint values are preserved at their exact coordinates.

These are deterministic projections from available operands, not a claim that
every intermediate price was historically recorded. Full performance trails are
not supplied by the retained public capture; its historical fallback uses the
opening and pricing basis. Missing individual models and aggregate records retain
known opening values until their supplied observations. No individual quote is
inferred from a group total. A conflicting or unbound observation cannot supply
historical operands. Every worker input is validated afresh.

The port is checked against outputs independently executed from the actual
Receiz `sportsCardHistoricalLivePulseChartPoint` and
`sportsArenaLiveValueMotionAtPulse` source functions. The live market evaluator's
existing independent v129 parity checks remain unchanged.

For example, J. Misiorowski opens on 2026-05-10T23:46:38.259Z with a birth value of
$87,171,058; its first whole presentation pulse is 12,057,380. The June 23 capture
records $355,860,612.49. Its supported native curve grows between these coordinates.
May 10 remains the largest daily opening contribution in the complete chart.
The former October 14 evaluation pulse, 14,647,306, contains no card openings.
Its reported $437,773,300.9889 remains provenance metadata, never a new issuance.

## Exact boundaries and retention

Policy `native-card-history-and-every-seal-v6` invalidates older display caches,
including the temporary opening-total-only and custom interpolation experiments.
Every seal and admitted source boundary survives interval retention and rendering;
regular samples remain bounded. The old top-32 selection, 96-point event loss and
second renderer sampling could move an opening into a later visible step. Those
losses are removed. One SVG path renders the complete temporal sequence.

The 615 discovery groups absent from the original price catalog contain 698 claim
records without supplied individual current quotes. Their exact births remain
available. Unavailable current quotes are not represented as individual zero-dollar
valuations. Current totals retain the original pricing coverage and native formula.

The ready-to-render six-interval history is generated from existing local files.
Compact transport shares identical pulse/value pairs across intervals and derives
UTC labels with the unchanged native bridge. The chart summary carries an unpriced
copy count; full identities, seals and operands remain in the existing inventory.
There is no new source request or cold-page history calculation. Completed historical
points are retained during pulse advancement. Changed-source retention indexes prior
points once, rather than repeatedly flattening and sorting all intervals per point.
