# Market and transaction continuity

The capitalization worker could leave its caller permanently busy when a source
capture was older than the retained chart. `buildMarketHistory` correctly kept
the newer chart by returning null, but the worker never acknowledged completion.
It now acknowledges the retained result, allowing queued fresh operands to run.
A failing-first regression covers the missed acknowledgement and next job.

The Market list derives supported prices from retained, object-bound display
seeds at the local Kai pulse, independently of collection refresh. Missing inputs
do not acquire invented valuation models. The chart and quote arithmetic retain
the independent v129 goldens; chart sampling uses the existing mechanically
generated unsigned evaluator with the same arithmetic and no trace allocation.
The UI distinguishes a failed collection refresh from live local valuation.
Capitalization is framed as one global proof economy; aggregate rules and chart
intervals are unchanged.

With every public Market API refresh forced to 503, an isolated browser's real
worker advanced capitalization from $447,629,695.84 to $446,972,754.64 and the first
object's price from $2,999.62 to $2,953.47. These are captured observations at
different local pulses. Browser error logs were empty. The fixture uses shipped
public operands with no account or funds.

Public card popovers read the existing exact-claim provenance endpoint for the
latest public owner and original issue time. The bounded relay omits private
IDs and unrelated append bodies. Truncated, mismatched or ambiguous history does
not supply an owner. Multi-copy claims never receive one copy's owner/time as
an edition-wide fact. Explicit historical card-value snapshots in dollars now
populate Ledger alongside the cent format; current prices never backfill past
transfers. Receiz's public action endpoint still omits card snapshot fields;
the private wallet Ledger and carried explicit payloads supply them.

Post-action account and private-Ledger refreshes no longer disappear behind an
older in-flight read. Explicit refreshes queue a fresh read immediately after
the older request; the account skips the obsolete frame. App action completion
starts both refreshes. No optimistic balance arithmetic or financial approval
behavior was added. Unknown payments remain exact retained attempts. Failure
details expose bounded public codes, stage and HTTP status only.

The header uses the PWA's bank geometry in a small ink-colored mark aligned with
the ID control. Its accessible home label and navigation are retained.

Verification: 1,098 tests in 202 files, type checking, full production build,
offline shell, source archive and licensing pass. Focused reviews covered quote
parity, chart queue handling, metadata scope, encrypted state reads and refresh
generations. Production Send and the iPhone's unresolved saved checkpoint are
not qualified by these tests. The actual SDK /wallet Send contract is being
traced separately before changing the payment adapter.
