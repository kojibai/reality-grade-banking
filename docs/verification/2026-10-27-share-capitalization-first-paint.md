# Share-inclusive Market capitalization

The global headline, every chart interval, tooltips, dollar movement and percentage movement now use one completed share-capitalization publication. The old unit-value subtotal is removed from the visible Market overview. The existing unit-value source and history remain independently available.

Generic assets count current unit value × (remaining buying capacity + outstanding shares), once per canonical asset. Native offers remain a partition of issued supply and are not added again. Collectibles retain their existing per-copy and aggregate accounting. Missing quantity records remain outside the covered total.

Release and later capacity points compose the existing asset-chart tape. No current share quantity is multiplied backward over old prices. Release value and initial capacity are retained before any purchase. The global chart samples subpulse observations only at or after their coordinate, using whole-pulse display precision; underlying records retain their original coordinates. The current head uses the same current deterministic price and quantity as asset capitalization.

## Immediate presentation

`public/receiz-public-share-chart-history.json` carries six prepared intervals and their amount/coverage together. A separate share-history retention key and policy prevent older unit-value publications from replacing them. Period selection is a synchronous lookup. Existing public-source reads, refresh intervals and worker ticks remain unchanged. There are no additional runtime requests or timers. The overview no longer recalculates collection-wide capitalization on the UI thread.

The shipped public asset quotes carry their existing share inventories, including release history. This preparation used the complete, read-only 1,679-row canonical inventory captured at 2026-10-27T02:38:55.624Z, the canonical Receiz generic inventory/release projectors, and its carried PBI signed-state projector. Creator subscription verification is not substituted for PBI state. Quantity capture time is preserved; deterministic valuation is evaluated separately. No database writes were performed. Future source-seeding retains the same fields directly from the existing public quote response.

An older saved catalog can acquire matching share observations from the existing shipped-source read even when live discovery is unavailable. Weaker incomplete quantity coverage cannot replace a completed capitalization publication. When retained history catches up, the existing regular sampling grid fills elapsed daily/weekly intervals; it no longer appends only one distant endpoint.

## Verification

- Reproduced the old daily catch-up failure: two points after an eight-day gap.
- Tested release capacity, later recorded capacity, native supply counted once, exact current totals and summary consistency.
- Tested first paint and all six ranges without a network read or worker execution, and recovery through the existing worker queue.
- Checked actual Market and asset components at 390px and 1280px: matching headline/chart/gain, no overflow, no relevant console errors.
- Preview and screenshots use retained public inputs with financial actions disabled. They are not claims of completed trades.

The unrelated live-source incident was investigated read-only: Receiz public membership returned 503 after its database read timed out; a direct database diagnostic also timed out. The project dashboard subsequently showed Healthy. No production configuration, schema, ownership, payment or account-entry behavior was changed in this correction.
