# Market purchases and sales

Market, Investments, Showcase and standalone asset pages use the same
connected Receiz Market trade path. The asset or investment chart stays open
underneath its trade sheet. Closing the trade returns to that same object;
selling a complete holding does not discard the open chart.

Public Explore popovers expose the same Buy ownership / Take cash actions through
the existing public trade host. The object and browsing position remain open
underneath the payment sheet. Sale percentages appear only for owned shares.
Backed issuance uses the separate [automatic native asset contract](automatic-asset-backing.md).

## Account balance and card payment

A standalone buyer with an account balance opens the ordinary Market purchase
flow. The balance already admitted by the application selects this initial
view; it does not authorize a debit. The live Market quote and original writer
continue to check actual available funds.

A known zero balance opens the existing amount-to-card flow. If an account
balance is unavailable, Bankeiz opens Market review rather than treating the
missing balance as zero. An explicit `wallet_insufficient_balance` quote
refusal can offer the existing card flow with the entered amount retained.
An unavailable quote, transport failure or unknown trade outcome cannot imply
that a card payment is required. A retained checkout keeps its original
recovery path regardless of the current displayed balance.

Card-funded purchases continue automatically after the exact account-bound
credit is confirmed under the existing in-memory purchase approval. A public
URL or a saved purchase locator is not that approval. Sales use account
holdings and never open a card checkout.

## Dollar amounts and ownership units

Buy fixes a dollar budget. Take cash defaults to a dollar amount to sell, with
ownership units available as an explicit alternative. A dollar sale uses
Receiz's existing live-bid calculation capped by the owner's actual shares.
The requested dollar amount, owner, asset and original reference remain bound
to the retained review and transaction record. A quantity sale retains the
exact reviewed number of units. Final proceeds and quantities use the original
Market writer's execution rules.

Purchase forms offer $100, $250, $500 and $1,000 shortcuts. Sales offer 10%,
25%, 50%, 75% and All when the open account already carries a holding for the
exact Market item. These controls only fill the existing amount field; they
make no portfolio or quote request and never submit a trade. A percentage
selects ownership units with integer microshare arithmetic, rounding down
fractional microshares. All selects the complete exact holding. Custom dollar
and ownership quantities remain available, and every trade keeps its existing
review and explicit approval. Purchases and sales start from the asset rather
than a separate Exchange picker.

Connected dollar sales require the matching Receiz adapter update. An older
host explicitly refuses that unsupported request; Bankeiz does not silently
substitute another quantity, retry execution or weaken ownership checks.

## Critical path

- Opening and local controls do not add quote probes, polling or deliberate
  delay. Each normal review requests one live quote.
- The ordinary trade POST already returns the original trade, position and
  Ledger rows. Bankeiz validates those same fields and durably retains them
  before reporting completion. It no longer makes an unconditional second
  GET for an original already returned by the POST.
- Missing, malformed, foreign or lost POST results still use the original
  reference read. An uncertain trade is never submitted again by recovery.
- On Receiz, independent exact-position and quote reads run concurrently.
  After finding a trade, its independent position and Ledger reads also run
  concurrently. Legacy asset-ID fallback during trade context loading skips
  optional engagement metrics, as the primary lookup already does.

These changes shorten the request path without caching an executable quote,
streaming unconfirmed success, changing price calculations or bypassing
durable retention and account execution locks. Network and service response
time still determine financial confirmation time.

## Verification boundary

Regression checks cover one quote per review, no recovery GET for a fully
validated successful POST, exact-original fallback on failed admission,
retention before completion, dollar and quantity sales, retained popovers,
complete liquidation, balance/card selection and paid-checkout recovery.
Browser checks use synthetic accounts and intercept financial requests;
they do not move money. Live financial qualification is recorded separately.

## Immediate investment presentation

Account's Your assets summary uses the same loaded portfolio and public pricing
as Assets. It shows the three most recent purchases that remain held, with
owned shares, current holding value and unrealized percentage return against
the remaining cost basis. A recent sale does not rank as a new purchase.
Public Showcase follows the investments and is the default when no holdings
remain. Summary rendering adds no account or Market request.

After the original is validated and durably retained, its absolute resulting
position updates the shared private portfolio before the trade returns to the
interface. Assets, open investment sheets and standalone asset holdings use
that same presentation. A complete sale removes the held quantity; retained
trade history remains available. The inline update makes no portfolio request
and precedes the existing background account synchronization.

The merge binds the account, item and position, deduplicates recorded trades,
preserves sub-millisecond trade ordering and rejects a stale in-flight portfolio
read. If no whole-account portfolio has been opened yet, the confirmed holding
is presented as a partial update until the existing full read completes.

This uses the returned absolute investment position. It does not manufacture a
complete cash balance from a trade amount or raw Phi Ledger balance. Complete
Reserve/Settlement balances and proof continuity retain their existing
authenticated account-source and antirollback checks.
