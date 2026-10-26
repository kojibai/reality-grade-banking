# Offline Market orders — scoped design draft

Date: October 26, 2026.

Status: user-selected flow, updated with the October 26 automatic price-bound
clarification; fresh builder check completed. No execution-type or remainder
selector. This supersedes the earlier proposed Cancel remainder / Keep
remainder open choice. No product behavior is enabled by this document.

## Selected experience

Only a new Buy or Sell deliberately approved while offline uses the following
automatic rule, through the existing review and Confirm controls:

- Buy at the reviewed executable ask price or lower.
- Sell at the reviewed executable bid price or higher.
- Fill only the portion permitted by those price bounds, exact amount/quantity,
  ownership, funding and existing financial rules.
- Keep an unfilled remainder open at the same approved bound until completed
  or cancelled, subject to actual execution authority and validity. An expired
  execution authority pauses eligibility; it does not silently discard the
  user's order.

No order-type picker, price-setting workflow, remainder choice, extra modal or
new confirmation is introduced. The offline review explains the consequence in
one short sentence: it will execute at the approved price or better when
connected, and can be cancelled while open. This disclosure does not claim an
offline fill has already occurred.

The request is durably retained with its original Kai and exact consent. It
remains an order awaiting execution; it is not displayed as a completed trade.
An existing online attempt with an unknown outcome keeps its existing recovery
path. Losing connectivity must not silently turn it into a second order.

When connected and the approved price condition holds, a verified fill records
the actual quantity, amount, funding, ownership and execution Kai. An unfilled request creates no purchased holding,
proceeds, realized return or completed payment. Every actual fill has one
immutable Original and can be adopted only once.

## Investments placement

Add a compact **Open orders** disclosure within the existing Investments
section. Display its count only when this account has an active offline-origin
order or unfilled remainder. It also appears
when that account has no filled holdings yet.

Opening it shows the asset, Buy/Sell direction, requested amount or quantity,
filled amount, unfilled remainder, status, approved limits and Cancel action.
Use the existing restrained row and disclosure styles.

Remove the disclosure when its final order fills or its verified lifecycle
closes. Completed fills remain in the ordinary trade history. Orders remain
recoverable after restart; hiding a panel cannot delete an order or release its
reservation.

Users who never create an offline order see no additional option, tab, category,
empty state, enrollment, subscription or request. Existing online trade screens
and execution behavior remain unchanged.

## Consent, funding and cancellation

Future fills must stay within the exact signed order, remaining amount or
quantity in the user's original unit, approved price bounds, applicable validity, available ownership and
actual funded capacity. A public quote or a queued request supplies no funding.
An open order is not a promise that it will eventually fill.

Use the reviewed side-specific executable price, including the existing spread,
not the chart's reference price. The actual market price continues to calculate
at each fill's Kai. The fixed order bound is the user's protection; it is not a
frozen market valuation. Budget buys, dollar sales and quantity sales retain
their existing units and exact integer rounding. A partial fill cannot consume
more than the remaining approved budget or quantity. Non-executable rounding
residue must be handled under the existing minimum-unit rules, not repeatedly
retried as a second trade.

Funds or shares committed to an open order must be exclusively reserved under
the qualified financial source. They cannot simultaneously fund another trade,
Send, Note or Vault movement. Reservation, release and ownership classification
are financial effects and cannot be implemented only as frontend deductions.
Custody/source expiry must never fabricate a fill or silently discard recovery;
the implementation must qualify renewal or an explicit terminal outcome under
the actual supported source contract. No expiry-setting control is added.

Cancelling affects only the unfilled remainder. A race between a fill and a
cancellation must have one verified outcome, preserve every completed fill and
release only the actually unfilled reservation. While disconnected, a
cancellation of an already published order is Cancel requested until its
verified outcome is retained. It cannot be presented as globally cancelled or
release spend rights based on a button click alone.

Reuse admitted portfolio/financial records and the existing reconnect and
verified-addition delivery paths. No new timer polling, full-history replay on
render or repeated valuation on category clicks. Open-order admission and
execution require a qualified SDK contract; the current committed-financial-
Original executor must not be relabelled as a pending-order queue.

## Alternatives considered

- A permanent orders category and execution choices for every trade would
  change the ordinary online experience. The user excluded this approach.
- An offline remainder selector was the earlier draft; the user superseded it
  with one standard automatic behavior and no extra execution choices.
- Selected: automatically retain offline orders at their reviewed price bound,
  with a conditional Investments disclosure and cancellation.

## Original order Kai and actual execution Kai

Each actual fill uses its own execution Kai and verified pricing inputs, within
the original order's approved price bound. The original request Kai remains
part of the order and every fill references it. Original Kai determines order
priority among admitted, eligible competing open orders, subject to verified
predecessor dependencies and a deterministic tie rule. An older ineligible order
does not block a newer eligible order merely because its price condition is not
met. Eligibility and the exact competition boundary require qualification in
the financial domain, not sorting rows in Investments.

This preserves the actual order and fill histories. It does not claim that a
late order obtained the counterfactual outcome of being online at request Kai.
Completed trades remain immutable. A late incoming order cannot displace an
already completed fill, rewrite its price or invent a historical execution.
Arrival time must not replace the original request Kai in the order's proof.

## Builder-check decisions

The fresh builder review identified three material questions. The following
conservative rules settle them without adding controls to the user flow:

1. **Missing offline price basis:** derive the reviewed bound from an actually
   admitted retained pricing basis at the order's Kai, using the existing
   side-specific calculator. A chart number or an advisory quote alone cannot
   establish order readiness. Without an admissible basis, do not manufacture
   an executable review or silently turn a draft into an accepted order.
2. **User funding versus counterparty capacity:** the user's complete approved
   maximum budget or share quantity must be exclusively reserved before the
   order is accepted. Insufficient own funding keeps the existing refusal or
   explicitly approved connected funding path. It does not authorize future
   deposits to be silently swept into the order. Partial fills and waiting for
   capacity concern actual counterparty capacity within those reserved user
   rights. An exhausted user budget cannot fund an extra fill.
3. **Execution-source expiry:** preserve the order and its exact bound, mark it
   ineligible for fills and retain cancellation/recovery. Resume only through
   an actually qualified renewed or handed-off source, preserving exclusive
   custody of the same remaining reservation and the same owner consent. No
   new money, price change, amount increase or authority inferred from a UI
   status is allowed. The order may therefore remain open without filling;
   neither a guaranteed fill nor automatic renewal is claimed. A real
   post-expiry cancellation/release path is required before activation.

These are planning decisions under the user's selected flow, not evidence that
the current SDK already supplies pending-order reservations, delegated fills
or source renewal. Those financial boundaries must be qualified before wiring
the consumer controls.

## Required regression coverage

Online-only accounts have no new visible controls or requests. Only explicit
offline orders can reach the new family. Test empty holdings with an open
order, partial/complete fills, no additional execution selectors, restart/reconnect,
identity changes, duplicate delivery, fill/cancel races and offline
cancellation. Verify original request Kai and each actual fill Kai separately.
Include Buy/Sell better-price eligibility, failure to reach the bound, exact
remaining budget/quantity, rounding residue, exclusive reservations and
eligible-order priority. No missing acknowledgement may trigger another
financial execution.
