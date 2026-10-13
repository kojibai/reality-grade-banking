# Live public Market integration

Preserve the approved bank console and Market layout. Replace the Market's sample
assets with the complete public showcase collection used by receiz.com/market.
This is a component of the requested live bank conversion, not a declaration that
the existing account simulator has become a funded bank.

Use the Receiz public-membership GET contract for complete discovery and the
public-snapshot GET contract for public quote/chart projections. Respect explicit
public visibility; never promote private source, public metadata, listing price,
or a successful HTTP response to verified ownership, balance, or a funded offer.
All original verification uses @receiz/sdk 129.0.0 on exact original bytes and
the expected enclosing artifact digest. No invented charts, balances, or prices.

Use only Receiz infrastructure and existing dependencies. Browser calls use a
fixed same-origin proxy to avoid CORS; no arbitrary URL proxy, cookies, bearer
tokens, or client secrets. Proxy only the known public GET paths, bounded sizes,
timeouts, and expected query parameters. Application registration is not required
for these public reads. SDK/MCP/AI Skills remain pinned to 129.0.0.

Membership and prices are projections, never authority. Show source verification
separately. Display local dates first; preserve Kai pulse in proof details.
Refresh while Market is visible, retain last successful data on temporary errors,
show stale status, deduplicate by exact object ID, search the whole collection,
render incrementally for mobile. Discovery is never limited to the first page.

Selected public objects must never reach the demo trade reducer. Opening a public
object uses a separate public source sheet in the same visual container. Buy/sell
requires the bank's later admitted financial execution path and genuine offer;
public discovery alone grants neither. No demo-success action is available for
these items. No auto-verification of 1,000+ large originals on initial load.

The user repeatedly authorized inline implementation and final review and has
now confirmed the precise source and unchanged layout. Continue that method.
