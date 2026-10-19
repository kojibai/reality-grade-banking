# Public proof object explorer

`/explore/` and `/explorer/` open the same public entry without restoring an
Identity Seal or reading account custody. The explorer reuses the Market's
whole collection, retained live pricing, bounded rows, search, capitalization,
object detail, media reader and proof links. Direct object links use
`#object/<encoded-public-item-id>`. Financial actions stay in the account flow.

The public entry uses the same bank mark, Kai Klok, colors and spacing as the
account. It is discoverable from the entrance and public guide footer. The
existing offline installation retains its entry and all dependencies; both
aliases map to that entry offline. No private API or identity storage is cached.

Market and owned-showcase rows now share one renderer for value, directional
change, owner and seal time. Supported live values and changes are evaluated
together from existing inputs. Change compares the live value with the retained
source quote, identified in the row's tooltip; it is not a fabricated trade return.
The calculation adds no request or second historical valuation pass.

For cards with an exact copy-bound individual history model, object details use
the same native historical projection as the capitalization chart and Ledger.
The birth starts at its exact seal, all six periods open from held operands,
and later pulse updates retain their earlier samples. The shipped inventory
contains 1,197 such supported listings. Aggregate pricing alone does not create
an individual historical chart.

Owned cards inside shared editions are projected individually from their carried
owner and seal metadata. The representative's price is used only for its matching
claim. Other owned copies stay visible without borrowing that price. Unsupported
individual values remain unavailable. This is public discovery, not transferable
ownership admission. Open showcase details resolve their current item on every
update, avoiding a stale price while the list advances; private source reads do
not repeat on price updates.

Verification: all 1,340 tests passed with four workers; the production build,
compiled API checks and complete offline-shell checks passed. Browser checks
covered search, a proof detail and a real card detail with owner, seal time and
six chart periods. The card detail produced no console errors or warnings.
The final production shell contains 166 public resources (51.3 MiB), including
the shared certificate timing guard; private storage and API routes stay excluded.
