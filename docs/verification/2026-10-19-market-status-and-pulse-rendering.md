# Market status and pulse rendering — 19 October 2026

The top-level title is **Global Market Cap**. Counts read **assets in circulation**
and **assets listed**. The information panel defines the global proof economy,
temporal continuity, deterministic valuation, original-proof authority and source
accounting. Technical coverage remains available under the methodology details.

The previous “valued” count was actually `marketAssetsPriced + cardsInCirculation`.
The reported 8,522 and 4,256 reconcile as 1,679 public originals plus 6,843 copies
in circulation, versus those originals plus 2,577 grouped explorer entries. The
labels now describe their actual measures; no pricing total or chart law changed.

The source status reads **Live valuation**, with independent source-coverage
status. It no longer presents a separate “card inventory” market. A read-only
production request on this date took 13.8 seconds and returned HTTP 200 with
`fallback: true` and `sports_economy_live_timeout_fallback`. The native route has
a 12-second deadline. Its fallback reported 6,843 objects in circulation and
3,217 priced objects; 1,525 grouped rows did not have full individual pricing
coverage. This accounts for the partial flag. Changing its presentation does
not resolve that upstream assembly timeout or silently declare full coverage.

The period-caption flicker came from appending “retained chart” while each local
worker update was briefly busy. The caption is now stable. The worker keeps the
last complete amount and all periods together until its next complete result.
Its processing flag is a ref-backed inspection value rather than a second React
publication. A red/green check reproduced two renders per pulse before the fix
and one afterward.

The history worker receives stable source catalog operands, separately from the
list's pulse-repriced catalog. A locally advancing list price no longer creates
an unrelated catalog-change history request. The deterministic pricing and
historical projection functions are unchanged, including every sealed entry.

Rendered tests verify stable captions, stable history inputs, live list pricing,
honest source coverage and institutional methodology text. PWA worker recovery
and complete-history tests remain part of the release suite. The browser URL
policy refused acquisition of the local Market fixture in this continuation;
no new visual or physical-iPhone qualification is claimed from those tests.
