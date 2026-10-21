# Ledger asset trade presentation — 21 October 2026

Asset Purchase and Asset Sale are Transactions in the logged-in and public
Ledger. Rows carry the recorded monetary amount, asset title and exact share
quantity. Expanded details show price per share (or an explicitly labeled
average derived from recorded notional), fees, total paid or sale proceeds and,
when carried, the disposed cost basis and realized gain/loss. Return uses net
sale proceeds minus the cost basis of the shares sold. Missing basis is not zero;
zero basis has a dollar return without an undefined percentage.

Receiz adds bounded display fields to its existing private Wallet and public
action responses from metadata/payload already selected by those reads. No SQL,
query, financial effect, public disclosure of account balances, frontend
component or user flow changed. Bank's public header reuses Explore's BankMark.
The user withdrew the empty Investments styling request; that surface is unchanged.

Verification:

- Bank full suite: 363 files, 2,148 tests passed after the final trade-fact
  conflict correction. The preexisting happy-dom disabled external script/iframe
  fixture diagnostics are not failing tests.
- Bank typecheck and production build passed. The final build includes the
  mobile layout correction to isolate trade values from inherited technical
  definition-list columns.
- Receiz focused ledger and native Note route collection: 35 tests passed;
  scoped ESLint passed on both modified API routes and the new projection/test.
- Browser: actual PublicLedgerApp with synthetic recorded trade inputs at
  390 and 1440 pixels. Transactions filtering, purchase amount/shares/price/fees,
  sale return, expandable details and header checked. No horizontal overflow or
  page runtime errors; value cells remain legible without vertical digit wrapping.
  Browser plugin was unavailable; regular Playwright used the existing local
  runtime/Chrome. No live account was opened and no payment/trade was executed.
- Fresh read-only review identified missing identity-carried Wallet metadata,
  thin-refresh erasure and an inconsistent merged settlement edge. Each was
  reproduced failing, corrected, and covered by the passing regression suite.

Evidence is local code/fixture qualification. It does not attest hosted response
deployment or recompute the upstream financial cost-basis writer. Historical
public action records without cost basis remain explicitly without a realized
return; current market quotes never fill that gap.

### Authored titles and asset navigation

Ledger trade details and summaries prefer the authored name already present in
public asset metadata or the shipped title index, falling back to the recorded
trade label. This display lookup does not change or merge recorded trade facts.
Expanded trade details include a compact View asset link using the recorded
Market item ID. No new endpoint or asset fetch runs for either change.

Regression: the UI test first failed with the caption heading, then passed with
the authored title and encoded standalone-page link. The Ledger trade, title,
and public Market suites passed 33/33; fetch was asserted unused in the UI test.

### Public trade source correction

The authenticated Wallet history already retained disposed shares and cost
basis. Historical public Market actions instead carried the RPC's remaining
position quantity and omitted disposed basis. A read-only production check of
three exact action/trade bindings confirmed the original trade records remain
complete: public quantities `0`, `0`, `6292` corresponded to recorded sold
quantities `43970`, `12786`, `100` micro-shares. The title lookup did not alter
those records.

The public action API now projects the exact recorded trade beneath the same
owner, deterministic nonce, asset and side. Monetary coordinates must agree;
a name, amount or timestamp alone never joins records. Original action hashes
and payloads are unchanged. Returned fields exclude private owner IDs, wallet
balances, arbitrary metadata and deterministic keys. PostgreSQL integer and
JSON cost fields are selected as text to preserve precision. Older actions
without an exact matching source remain explicitly incomplete.

Historical recovery uses one bounded batch in the existing public request,
overlapped with the existing identity read. Complete immutable observations are
retained in a bounded 4,096-entry cache. New actions carry transaction quantity,
execution price, trade ID and recorded disposed cost from the writer's existing
read, so they need no recovery lookup. No new browser request, SQL migration,
financial effect, Receiz frontend change, antirollback change or SDK version
change is part of this fix.

Bank accepts the source-bound correction over the old public position quantity
only under the same action evidence, asset and compatible monetary coordinates.
A later thin response cannot erase it; contradictory exact trade facts remain
errors. Trade receipts do not display a whole-asset valuation chart. Both the
logged-in Public tab and standalone Public Ledger render the same shares,
recorded price/proceeds and realized return; authored titles and View asset
links remain.

Verification reproduced each defect before correction: API route sale details,
writer disposed quantity, cached public correction, and whole-asset chart
selection. The route/writer and existing connected buy/sell/recovery collection
passed 31 tests. Scoped Receiz ESLint passed. Actual Chrome checks passed at
390 and 1440 pixels in both public views, including correction of a retained
old sale, with no horizontal overflow or runtime errors. No live trade, charge,
publication or database write was executed.

Review corrections also cover historical nonces accepted by the writer and
240-character truncated action keys. A truncated locator requires exactly one
matching original; ambiguous matches cannot supply shares or basis. Cache
inspection version 5 runs a background bounded catch-up for uninspected trade
IDs beyond an already-held head. First paint retains history, and a completed
upgrade resumes ordinary head-only polling. The hook regression proves a deep
sale is corrected once and retained after reopening without another crawl.

The full Bank run passed 366 files / 2,158 tests; the final focused Bank
collection passed 28 tests, including the additional delayed-seed restoration
race. Bank TypeScript and production build passed. The final Receiz collection
passed 33 tests with scoped ESLint. Obsolete chart assertions were aligned with the
already approved single total-balance chart, with no additional product change.
