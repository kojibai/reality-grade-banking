# Accept payments

One receiving account. A hosted checkout for links, website buttons and in-person
QR codes. Bankeiz supplies the customer experience using Receiz identity,
Notes, payment execution and confirmed credit.

Start with [Receive in Bankeiz](https://bankeiz.com/#account/receive) or the
[public setup guide](https://bankeiz.com/learn/get-paid/).

## Choose the smallest integration

| Where you get paid | What to use | What happens |
| --- | --- | --- |
| Messages, invoices, email signatures, profiles | Choose **Checkout link** in Receive | A dedicated page to pay you by card, Balance or Note, with an optional amount |
| A website that accepts a URL | Attach the checkout link to its own button | The same hosted payment, without a script |
| A custom HTML block | Copy **Payment button** in Receive | A styled link to the hosted checkout |
| A counter, table or printed sign | Display the checkout QR from Receive | Scanning opens the same payment page on the customer's phone |
| Someone already using Bankeiz | Choose **Send link** in Receive | Opens the existing addressed Send flow |
| A site that permits custom scripts | Copy **Embedded checkout** in Receive | The separate existing Receiz card widget; the customer enters the amount |
| A custom application or order system | Pinned SDK checkout plus trusted result confirmation | Retains the exact session and checks recipient, amount and confirmed credit before fulfillment |

The hosted checkout is `https://bankeiz.com/pay/yourname/`. An optional
`?amount=12.30` prefills the requested amount. Opening it restores the customer's
existing device identity, or creates one on an empty supported device. There is
no signup step. Saving the **Identity Record** is optional and lets them reopen
that account on another device. A saved identity that cannot be restored produces
an import/retry screen rather than a replacement account.

Customers choose Card, Balance or Note, review the recipient and exact amount,
and approve. Balance uses the ordinary payment rules; an observed shortfall is
shown with its card contribution. Notes may be Reserve, Settlement or Settlement
Reserve. Their original ownership and receiving rules apply; confirmed credit
funds the approved payment automatically. A changed shortfall requires another
review. Surplus Note value and any card minimum remainder stay in the customer's
account. No amount change or link preview submits a payment.

The separate Receiz widget currently accepts cards and legacy Wallet Note
tokens. Its token upload is **not** the native Bankeiz Note admission interface.
Use the Bankeiz payment button for current Notes; do not extract a token, strip
the carrier, relabel a Note or call a legacy claim method to bypass custody.

## No code

### Fixed totals and Counter

Open **Receive → Counter**, enter the sale total and choose **Create checkout**.
The saved checkout supplies one fixed link, website button and QR. Customers
review that recipient and total, then pay using the existing Balance, Card or
Note flow. Any card minimum remainder or Note surplus stays in their account.

Keep Counter open and connected. It shows **Paid** after the merchant's actual
incoming original matches the saved recipient, exact cents and checkout
reference. It retains that complete original with the sale. Payment funding,
a customer's screen and a return URL alone cannot confirm the sale. Automatic
checks pause when Counter is hidden or offline; the saved request and any
accepted payment remain available. **Check payment** resumes a receiving read.

**Next sale** keeps earlier requests and their evidence. Reopening the same
identity on that device restores saved checkouts. An Identity Record restores
the identity; it does not export every private checkout stored on a device.
Use **Save payment evidence** for a completed sale's complete retained record.

A public fixed link is not an exclusive order reservation. Two different
customers can pay it; Counter keeps both actual payments and calls out the
additional payment. Review those records before fulfilling again. A merchant
starting another checkout does not cancel a customer's submitted payment.

The [typed fixed-checkout example](examples/fixed-checkout.ts) validates the
saved request and generates the same URL and safe button HTML. Its public fields
carry no account access, signing key or payment approval. The exact sale reference
is recorded in the existing public payment note. A changed link becomes a
different request and cannot mark the original merchant sale Paid.

### Editable receiving links

1. Open **Receive** under the account that should receive payment.
2. Choose Checkout link, optionally enter an amount, and share the link or QR.
3. For a website, open **Accept payments anywhere** and copy the button or
   existing checkout code. Paste into the website's HTML/custom-code block.
4. Test the installed link as a customer and check the destination before a
   separately approved payment. Opening or previewing code never pays an order.

Link-only tools need only the URL. A button needs an HTML block. The checkout
widget needs scripts to be allowed by the site and its Content Security Policy;
a platform that strips scripts cannot run it. Use a normal payment link there.
No secret, private Identity Record, access token or signing key belongs in a page.

These public installation examples use a placeholder username:

```html
<a href="https://bankeiz.com/pay/yourname/?amount=12.30"
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

## At the counter and in your order system

Show the checkout QR from Receive, with or without an amount. An NFC tag can
carry the same public URL on supported devices. It opens a phone payment page;
it is not a card terminal or card-present acceptance API.

Confirm incoming payment in the merchant's own account/Ledger before handing
over goods. A customer's receipt screenshot is not merchant confirmation.
Public amounts are editable requests, not immutable invoices or order authority.
Match the recorded recipient, exact amount and payment reference to your order,
and fulfill that order once. The hosted link does not add an order webhook,
invoice API or automated fulfillment contract. Use the typed SDK integration
below when your application needs a trusted order-bound card session.

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

The Bankeiz button opens hosted checkout. The payer chooses a Note and approves
its deposit and the recipient payment together. A received Note remains pending
until its exact credit is confirmed; receipt is never treated as spending
permission. A completion signal checks the retained original and continues the
approved payment. **Back** preserves pending credit and payment recovery; it does
not claim to cancel an already submitted operation. An unresolved payment offers
**Check payment status** without creating another payment.

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
| Hosted payment requests | Bankeiz `/pay/<username>/` with optional `amount` | Editable public request; payer approves recipient and amount |
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
