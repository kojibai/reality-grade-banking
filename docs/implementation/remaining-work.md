# Follow-up implementation queue

Reviewed for Bankeiz 9.0.0 on November 26, 2026. The
[current capability map](../current-function-boundaries.md) describes what is
implemented. The [qualification record](../releases/9.0.0-qualification.md)
tracks evidence for the exact release.

## Payment acceptance

The hosted checkout accepts Card, Balance, and supported Notes through one
review. Receive provides payment links, website buttons, and in-person QR.
Counter creates fixed-total checkouts and shows the recorded payment. The
portable order package binds an operator’s order, amount and receiving account,
confirms the original receipt, and supports atomic fulfillment recovery in the
operator’s application. See [Accept payments](../../institution/accept-payments.md)
and the [portable package](../../integrations/payments/README.md).

Further work covers platform-specific merchant adapters, provider-supported refunds
and related reconciliation, and native Tap to Pay or card-present POS integrations
using the processor’s actual device and terminal contracts. The operator retains
responsibility for their fulfillment system and its production qualification.

## Other follow-up work

- **Note claim/status locator.** Add a scannable locator to the Note engraving
  with an appropriate public disclosure policy. The existing **Send Note nearby**
  and **Receive nearby** QR flow hands a supported funded Note to its next holder.
- **Persistent asset playback.** Extend retained playback to other asset audio or
  video players across navigation. Feed music already retains its session and
  compact player across supported in-app navigation.
- **Balance display preferences.** Add supported fiat and major crypto reference
  displays that use sourced, timestamped rates. Preserve exact Phi, Reserve
  backing, and original receipt denominations. Issued currency holdings already
  show their units and dollar value when a market quote is available.
- **Legacy-bank withdrawals.** Integrate a supported payout operator and document
  its account binding, fees, timing, status, cancellation and exact recovery.
- **Further market depth.** Extend tapes or order books where genuine trade or
  open-order sources exist. The issued currency market already displays its
  carried trades, current prices, and applicable liquidity.

[Send to email](../releases/5.0.0.md#receive-by-email-and-send-a-note-directly)
is available through the recorded payment invitation. The existing recipient
and exact Wallet result govern access and credit.
