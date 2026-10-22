# Follow-up implementation queue

Updated October 22, 2026 for the Reality-grade banking 3.0.0 release preparation.
This queue identifies additional work, without assigning a version or delivery date.

## Implemented foundation

The [3.0.0 release](../releases/3.0.0.md) includes the complete account/profile,
composer/publication, Investments, Ledger, media and communication foundation.
Hosted checkout now supplies Card, Balance and all three Note rails through one
reviewed payment, automatic device identity and exact funding/result recovery.
Receive shares the same page through checkout links, website buttons and QR.
The public conformance workspace exposes the open requirements, independent
adapter tests and original evidence credentials.

## Further merchant acceptance

- Trusted order-fixed amounts, recipient/order binding, expiration and cancellation.
- Once-only server-confirmed fulfillment, supported events/webhooks, refunds and
  reconciliation against original accepted payment outcomes.
- A merchant confirmation screen suited to a phone/tablet counter workflow.
- Native card Tap to Pay or existing POS integration only through supported
  processor, platform and terminal contracts. QR or NFC opening the hosted
  checkout is already available and is not a native card terminal.

The [payment integration guide](../../institution/accept-payments.md) distinguishes
current editable requests from trusted order confirmation. Reuse existing Receiz
contracts; do not introduce another balance, financial writer or identity system.

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

Publish the reviewed v3 source under its exact tag and retain earlier versions.
Follow the [release process](../release-process.md) for matching source,
deployment evidence and capability-specific assessment. Preserve original custody
and unresolved financial references through updates and rollback.
