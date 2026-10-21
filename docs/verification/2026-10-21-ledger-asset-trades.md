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
