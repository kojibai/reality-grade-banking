# Balance chart resume continuity

## Cause

The current-operand path introduced by `64edd45` appended only its newest
valuation after a suspended tab or restored device frame. The complete
composite-source path already sampled the elapsed interval. The shared chart
therefore joined the old and new current-only points with one smooth SVG
segment, with no intermediate values available to its tooltip.

## Correction

`advanceCurrentWalletObservation` retains its existing single-endpoint path for
ordinary whole-pulse updates. When more than two pulses elapsed, it fills only
that new interval with at most 96 exact calculator samples. The current model
is compiled once for the batch. Earlier source samples, captured amounts,
financial coordinates and held custody remain unchanged.

`projectCurrentWalletExtension` uses the same enclosing current-source checks
and exact `point` arithmetic as `projectCurrentWalletAt`. Its lower bound is the
held capture; it cannot infer ownership or value before that capture. Historical
context-only sources, local Note heads, quote holds and a changed financial
frame remain protected. This changes display sampling only. No new network
request, timer, database dependency, background recorder or financial authority
is added. Current-source samples do not substitute for a missing complete
historical ownership source.

## Evidence

- Before correction, the nine-hour regression produced one new point instead
  of the required 96. An ordinary one-pulse update already passed.
- Eleven new tests cover public/private/mixed source parity at every added
  coordinate, durable display restoration, bounded month-long catch-up,
  unchanged history, ordinary updates, protected frames and past-coordinate
  refusal. Scoped valuation, account-entry and execution-boundary tests passed
  (108 tests).
- Full locked suite: 4,357 tests in 693 files passed.
- Actual chart at 390 and 1280 pixels: two endpoint observations before the
  correction; 97 calculated points and 96 SVG curve segments after it. Interior
  tooltips inspected the intervening time. No horizontal overflow, page errors
  or API requests occurred.
- Local browser catch-up measurements for 96 points: 1 Original 1.2 ms,
  250 Originals 90.8 ms, 500 Originals 163.2 ms. These synthetic source benchmarks
  measure one-time catch-up, not ongoing tick cost or a physical iPhone. The
  ordinary tick path remains endpoint-only.

Browser evidence is retained outside the source tree at
`/private/tmp/bankeiz-balance-gap-visuals/`.
