# Accept payments

One receiving account. A shareable link, a website button and the existing
Receiz checkout. Bankeiz supplies the customer experience; Receiz retains
identity, custody, payment execution and confirmed credit.

Start with [Receive in Bankeiz](https://bankeiz.com/#account/receive) or the
[public setup guide](https://bankeiz.com/learn/get-paid/).

## Choose the smallest integration

| Where you get paid | What to use | What happens |
| --- | --- | --- |
| Messages, invoices, email signatures, profiles | Copy your Bankeiz payment link from Receive | Opens an addressed account payment with an optional amount |
| A website that accepts a URL | Attach the link to its own button | The same Bankeiz payment flow |
| A custom HTML block | Copy Payment button in Receive | A styled link with the confirmed username and optional amount |
| A site that permits custom scripts | Copy Embedded checkout in Receive | Existing Receiz card checkout within the site; the customer enters the amount |
| A custom application or order system | Pinned SDK checkout plus server-side result confirmation | Retains the exact session and checks recipient, amount and confirmed credit before fulfillment |

Bankeiz payment links offer the existing balance, card-funding and **Pay with a
Note** options. Reserve, Settlement and Settlement Reserve Notes all use that
same option. The payer deposits a valid Note they own; confirmed credit then
funds the ordinary account payment. Exact source continuity remains available
through the Note deposit and the subsequent payment. Deposit is not a second
payment to the merchant.

The separate Receiz widget currently accepts cards and legacy Wallet Note
tokens. Its token upload is **not** the native Bankeiz Note admission interface.
Use the Bankeiz payment button for current Notes; do not extract a token, strip
the carrier, relabel a Note or call a legacy claim method to bypass custody.

## No code

1. Open **Receive** under the account that should receive payment.
2. Share its payment link, optionally with an amount.
3. For a website, open **Accept payments anywhere** and copy the button or
   existing checkout code. Paste into the website's HTML/custom-code block.
4. Test the installed link as a customer and check the destination before a
   separately approved payment. Opening or previewing code never pays an order.

Link-only tools need only the URL. A button needs an HTML block. The checkout
widget needs scripts to be allowed by the site and its Content Security Policy;
a platform that strips scripts cannot run it. Use a normal payment link there.
No secret, private Identity Seal, access token or signing key belongs in a page.

These are the existing transports, shown with a placeholder username:

```html
<a href="https://bankeiz.com/?to=yourname&amp;amount=12.30"
   target="_blank" rel="noopener noreferrer">Pay @yourname</a>
```

```html
<div class="receiz-pay-embed" data-username="yourname"></div>
<script src="https://receiz.com/receiz-pay-embed.js" async></script>
```

The widget takes `data-username`. It has no supported fixed-price attribute.
The optional Bankeiz request amount is not automatically passed to it. Use the
SDK for an order whose amount must come from your trusted application. A
customer-editable link or public HTML is not an authoritative invoice amount.
Receiz's merchant checkout requires a public profile.

## Custom card checkout

Install the coordinated SDK version used by this repository:

```sh
npm install @receiz/sdk@129.0.0
```

The [type-checked example](examples/merchant-checkout.ts) uses the actual v129
`payments.embeddedCheckout()` method and existing session-status route. It does
not create a Bankeiz processor, balance or financial ledger.

```ts
import { createReceizClient } from '@receiz/sdk';
import {
  prepareMerchantCardCheckout,
  readMerchantCardCheckout,
} from './merchant-checkout';

const receiz = createReceizClient({ baseUrl: 'https://receiz.com' });

// Supply these from your server's order and merchant configuration.
const pending = await prepareMerchantCardCheckout(receiz, {
  referenceId: order.id,
  merchantUsername: merchant.username,
  merchantUserId: merchant.userId,
  amountUsdCents: order.amountUsdCents,
});
// Persist pending against the order before returning its iframe URL.
// Render pending.frameUrl in an iframe allowing payment, and keep its secret
// out of logs, analytics, public links and browser success parameters.

// On return/completion, read the retained server record, not a browser copy.
const result = await readMerchantCardCheckout(receiz, pending);
if (result.status === 'paid') {
  // Atomically mark this exact order fulfilled once in your order system.
  // A repeated read must not ship or grant access a second time.
}
```

The existing host currently accepts USD card amounts from $0.50 to $100,000.
The example enforces those current bounds using integer cents. Settlement Note
presentation can change with its deterministic rate; do not treat its printed
creation amount as a new fixed-dollar payment authorization.

Keep price, reference and merchant identity in trusted order configuration.
The host resolves the selected profile source when checkout starts, and the
original session fixes its recipient. The example checks the resulting credit
against the intended stable merchant user ID as well as the username and exact
amount. It rejects substituted sessions, missing credit and mismatched amounts.

## Completion, retries and recovery

- A created session is **pending**. A success URL, iframe message, client-side
  state or paid-looking screen never independently fulfills an order.
- Use `GET /api/payments/embed/checkout/session` with the retained session ID
  and merchant to inspect the original outcome. The existing Receiz host checks
  processor state and reconciles paid account credit. The example requires the
  expected `connect_payment_checkout` credit, receiver and amount.
- Keep these trusted host observations distinct from a self-contained
  cryptographic receipt. Preserve the original receipt/proof when your use case
  requires independent offline verification.
- Serialize session creation per order. `referenceId` is a correlation value,
  **not a documented idempotency key**. A lost creation response is an uncertain
  attempt; do not automatically create more sessions or assume no charge.
- Retain the session on close/reload. Read it on explicit recovery, return or
  completion. No recurring status polling or duplicate creation is required by
  this integration. Persist fulfillment once using your own order transaction.
- Browser completion messages require exact source-window and origin checks;
  even a correctly received message is only a signal to read the trusted result.
  Reuse the existing Receiz checkout host rather than rebuilding card entry.

## Notes and account payments

The Bankeiz payment button opens the existing account payment route. Its
**Payment options** adds card funding or deposits a current Note without
changing the merchant or requested amount. No Note rail selector is needed.
The ordinary payment is separately reviewed and explicitly approved.

The native v129 Note reader verifies the original, its rail, current addressed
destination, exact funded units and composition. The existing received-Note
queue retains it durably. Before payment preparation/execution, the native
account boundary reconciles incoming Notes through their original claims and
once-only credit. Offline receipt is retained evidence, not confirmed spending
authority. A failed or uncertain deposit must resolve before the amount is used.

For direct Note intake into an institution, follow [Notes](notes.md), the
[account-destination contract](../docs/note-account-deposit-v129.md) and
[qualification](qualification.md). Merchant automation needs the actual receiver
authority; an arbitrary upload cannot authorize a claim for another account.
For custom account transfers, use [the value-edge lifecycle](digital-payments.md)
and the registered application's exact authority, sources and consent. Do not
turn a public username or client ID into permission to transfer funds.

## Deeper capabilities

| Capability | Existing Receiz surface | Integration requirement |
| --- | --- | --- |
| Shareable account requests | Bankeiz `?to=` with optional `amount` | Discovery only; payer reviews and signs |
| Card checkout | `payments.embeddedCheckout` | Public merchant, supported amount, retained original session |
| Confirm card credit | Existing embed checkout session-status route | Match the trusted order, receiver, exact amount and credit |
| Current Notes, all three rails | Native Note reader, receiving, deposit and credit | Original source, receiver authority, once-only reconciliation |
| Digital Reserve / Settlement | `value.edge` and existing Wallet transfer composition | Exact admitted sources, qualified execution and explicit consent |
| Refunds, subscriptions, tax, shipping, discounts, inventory, fulfillment, payouts | Coordinated SDK `commerce` surfaces | Their own admitted contracts, registered scopes, configured host and qualification; not granted by a checkout snippet |
| Agent integration | Coordinated MCP and AI Skills | Actual installed tool schemas, enabled profile, source custody and confirmation boundaries |

Inspect the original [schemas and SDK reference](https://bankeiz.com/schemas/),
[registered native runtime](../node_modules/@receiz/sdk/docs/registered-native-runtime.md)
and installed capability coverage before selecting an operation. Marketplace
nonfinancial tools do not acquire financial authority merely because the full
SDK documents an operation. Nothing in a snippet grants a new payment method,
country, currency, custody qualification, refund rule or automatic agent mandate.

## Qualification before live use

Local tests exercise the real SDK transport with synthetic responses, copied
installation code, all three Note UI routes, recipient/amount preservation and
refusal of mismatched or unpaid outcomes. They do not constitute a live card
charge or merchant fulfillment qualification.

For your deployment, record the exact build and verify public profile resolution,
new/existing customer entry, a separately authorized payment, confirmed receiving
credit, original receipt, closure/reopen, duplicate completion, uncertain outcome
and once-only fulfillment. Check the actual website's script/framing policy and
mobile return behavior. Production evidence is specific to that integration.
