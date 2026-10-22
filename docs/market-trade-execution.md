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

Dollar sales require that supported Receiz capability. An unavailable operation
remains an explicit refusal; Bankeiz does not substitute another quantity, retry
execution or weaken ownership checks.

## Critical path

- Opening and local controls do not add quote probes, polling or deliberate
  delay. Each normal review requests one live quote.
- The ordinary trade POST already returns the original trade, position and
  Ledger rows. Bankeiz validates those same fields and durably retains them
  before reporting completion. It no longer makes an unconditional second
  GET for an original already returned by the POST.
- Missing, malformed, foreign or lost POST results still use the original
  reference read. An uncertain trade is never submitted again by recovery.

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

The Receiz execution contract retains exact financial units, original trade
identity and the outcome of each attempt. Bankeiz never infers success or
cancellation from an amount, timeout or missing response. If the original has
committed, recovery returns its original result. A confirmed closure prevents
that same nonce from executing later. A closure observation is not an ownership
proof or balance credit.

An unconfirmed attempt also exposes **Cancel unconfirmed trade**. This makes an
explicit authenticated close request for the displayed nonce, never a new
trade. The interface shows either the recovered committed original or a closed
attempt with no money moved, then permits another review. Read-only outcome
checks remain read-only. An unavailable closure or mismatching owner/reference
keeps the original pending; no local flag or absence can bypass this boundary.
Successful trade submissions add no closure request or recovery read.

Qualification: 373 Bank test files / 2,215 tests and the production build.
Mobile (390px) and desktop (1440px) checks use the real Bank UI and SDK with a
synthetic transport, one submission and no page errors. They do not move money.
The initial unrestricted full Bank run hit a five-second Market-history timeout
under concurrency; that unchanged file passed independently and the full suite
passed with four workers.

No account checkpoint is cleared, no uncertain trade is replayed and no funds
are moved by qualification. An existing unknown attempt resolves through the
original result or explicit supported closure before another review.

### Production transport recovery qualification

Bankeiz's restricted native transport admits the exact supported cancellation
POST through the same browser/server policy as other Market operations. Other
methods, owner selectors and destination queries stay refused.

The regression exercises `createMarketTrade` → installed SDK → `nativeFetch` →
`relayNativeAccount` → a synthetic upstream. It reproduces an uncertain original,
closes that same nonce, reopens the retained terminal result and permits a new
review with exactly one trade submission. No real account or funds are used.
