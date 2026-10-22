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

## Failed and unconfirmed attempts

The exact approved request is encrypted in this device's Market custody before
submission. A missing response or missing lookup alone remains unknown. It is
never discarded or resubmitted by recovery.

Receiz migration `20261022035629_market_trade_exact_arithmetic_and_recovery.sql`
widens intermediate multiplication to exact PostgreSQL numeric arithmetic. Its
integer-quotient follow-up uses `div()` before checking the existing bigint
result; decimal `/` followed by `trunc()` can round a near-integer fraction. This fixes the USD-to-PHI
intermediate overflow reproduced at $100,000 and proportional cost-basis
multiplication on partial sales. Rounding, final units, balance checks, quote
rules, funding splits, trade identity and original records remain unchanged.

On an admitted request failure, the connected route closes its original nonce
under the existing wallet row lock. If the original already committed, it
returns that trade's original rows. Otherwise a service-only immutable closure
prevents late delivery from inserting a trade; the same transaction rolls back
any debit or position changes. The closure is a connected Market observation,
not a native receipt, asset ownership proof or balance credit.

An unconfirmed attempt also exposes **Cancel unconfirmed trade**. This makes an
explicit authenticated close request for the displayed nonce, never a new
trade. The interface shows either the recovered committed original or a closed
attempt with no money moved, then permits another review. Read-only outcome
checks remain read-only. An unavailable closure or mismatching owner/reference
keeps the original pending; no local flag or absence can bypass this boundary.
Successful trade submissions add no closure request or recovery read.

Qualification: 373 Bank test files / 2,215 tests, production build, 18 focused
Receiz endpoint/PostgreSQL tests and scoped lint. Local PostgreSQL checks cover
one cent, the former $92,233.72/$92,233.73 overflow boundary, $100,000, $1 million
and $100 million, plus near-integer cost-basis quotients at bigint magnitude;
full/partial sales, committed-versus-canceled races, rollback
of late debits and service-only permissions. Mobile (390px) and desktop (1440px)
use the real Bank UI and SDK with a synthetic transport, one submission and no
page errors. They do not move money. The initial unrestricted full Bank test
run hit a five-second Market-history timeout under concurrency; that unchanged
file passed independently and the full suite passed with four workers.

Both SQL migrations were applied to Receiz production with explicit approval:
`20261022035629_market_trade_exact_arithmetic_and_recovery.sql` and
`20261022040247_market_trade_integer_quotient_exactness.sql`. Installed-function
inspection confirms `div()` in both writers, with no decimal `trunc()` quotient
remaining; the near-integer edge returns exactly `999999999999999999`.
The closure table has RLS, and anonymous/authenticated roles cannot execute its
service function. The advisor's no-policy notice is intentional for this
service-only table; no public access policy is added.

The application code still requires the Bankeiz and Receiz pushes/deployments.
No account checkpoint has been cleared, no trade has been replayed and no funds
were moved during qualification. Existing unknown attempts can use the new
explicit cancellation control after deployment; read-only absence remains
unknown until a valid original or atomic closure is retained.
