# Next product scope

Updated October 22, 2026 for the Reality-Grade Banking 2.0.0 release preparation.
This is the next design queue, not a statement that these capabilities ship.
The previously discussed future expansion is now considered for **v3**;
version numbering alone does not approve its design or promise a delivery date.

## What the v2 foundation already provides

The [2.0.0 release](../releases/2.0.0.md) includes public profiles and synced
editing, full asset composition and same-source publication, account-wide
investments, inline confirmed positions, trade/Ledger detail, media and sharing
improvements, card-funded Send shortfalls, website payment tools and PWA
notification integration. Existing calling and Note flows remain part of the
product. Their [qualification record](../releases/2.0.0-qualification.md)
identifies local evidence and host/device assessment boundaries.

The original Get paid request has an implemented first layer: Receive, a
shareable account request, website button, existing Receiz checkout/widget,
a no-code guide and a typed merchant confirmation example. The
[integration reference](../../institution/accept-payments.md) distinguishes
current native Note funding from the separate widget's legacy token path.

## Next discussion: one merchant checkout, online and in person

The desired outcome is that a person can pay a specific recipient directly by
card, supported Note or existing account balance, and a merchant can confirm the
same order without asking the customer to understand the banking interface.
The existing Send link remains useful for account-to-account payment requests.
A dedicated checkout is a distinct proposed entry, not a relabeling of that link.

Design these pieces together, then qualify them in separate stages:

1. **Recipient checkout:** a dedicated Bankeiz payment page, clear recipient and
   amount, existing-account balance payment, card and current Note paths,
   first-time customer entry, exact order/session retention and recovery.
2. **Merchant acceptance:** optional order-fixed prices, trusted order reference,
   once-only confirmation/fulfillment, receipts, cancellation/expiry, refunds and
   reconciliation against actually supported host contracts. A success screen
   or a customer's image is not an accepted order result.
3. **Physical checkout:** amount-specific QR from a merchant phone/tablet and
   a matching merchant confirmation screen; optional tap-to-open NFC URL. Plain
   NFC link opening does not make a card terminal. Native card Tap to Pay and
   integration with existing POS hardware require their supported processor,
   platform and terminal contracts.
4. **Integration:** one link or copyable button for no-code use, the same hosted
   checkout for websites, and a documented order/session/event lifecycle for
   custom apps. Inspect the existing Receiz contracts before proposing new
   services. Do not create another balance, financial writer or identity system.

This is a brainstorming brief. The exact guest identity/claim boundary,
merchant account binding, Note receiver authority, supported confirmation
mechanism and deployment requirements must be designed before implementation.
No dedicated merchant checkout or point-of-sale system is added by v2 notes.

## Other retained follow-up work

- **Note QR:** a scannable claim/status locator in the engraving at creation,
  bound to admitted Note sources and recipient authority. No private openings,
  signing material or transferable bearer secret in a public status URL. Public
  claimant disclosure needs its own supported identity/privacy boundary.
- **Send to email:** verified email claim and existing/new Receiz identity using
  supported host primitives, exact original intent and once-only claim/recovery.
  Typing an email or landing on a link alone cannot authorize an existing account.
- **Persistent asset media:** one user-started music/video session across app
  navigation, a compact dismissible player, queue/search and retained native
  media without duplicate players or new polling. Current asset playback persists
  inside its mounted view, not across leaving it. Call lifetime is separate.
- **Display currencies:** a restrained balance preference for supported fiat and
  major crypto equivalents. Use one sourced, timestamped rate observation with
  shared refresh; preserve exact Phi, Reserve backing and receipt denominations.
  Displaying BTC is not BTC custody or executable foreign exchange. Historical
  returns need corresponding historical rates. Inspect an existing reusable
  Receiz source before selecting a rate integration.
- **Legacy-bank withdrawals:** select a real payout operator and supported
  account/settlement contract, then design truthful fees, timing, status,
  cancellation and recovery. No available provider, fee schedule or executable
  withdrawal is established by the existing Wire interface. Preserve supported
  proof/history; do not claim that off-platform payment erases an earlier record.
- **Further market depth:** recent trades or an order book only from genuine
  public trade/open-order sources. Holdings, prices and a valuation do not create
  a public tape, offer or liquidity.

## Release and qualification

Publish the prepared v2 source under its own tag and retain v1. Follow the
[release process](../release-process.md) for exact build/source distribution,
host deployment, device checks and operation-specific evidence. Keep unresolved
financial references and original custody through updates or rollback. A future
v3 claim must identify its actual implemented and assessed scope.
