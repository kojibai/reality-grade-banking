# Bankeiz payments for your store or app

Keep your website and products. Add Bankeiz as a payment option, or use it as
your primary checkout. Customers pay through the existing Card, Balance or Note
experience. Your server confirms the received payment and delivers the order.

For a simple website without an order backend, open **Receive → Accept payments
anywhere** in Bankeiz and copy your existing payment button or link. Use Counter
for a saved fixed-total checkout. The package below connects automated orders.

## Install

```sh
npm install @receiz/sdk@129.5.0 https://bankeiz.com/integrations/bankeiz-payments-0.1.0.tgz
```

This is a downloadable package, not an npm registry publication. Before deploying
the new build, use `npm run payments:build` in the Bankeiz source checkout and
install its `public/integrations/bankeiz-payments-0.1.0.tgz` file locally.

The portable core uses standard JavaScript. The included SQLite adapter/example
requires Node 24 and a persistent local disk. Use the atomic store port with your
existing database for deployments across multiple hosts or ephemeral functions.
The package inherits this repository's GPL-3.0-only license.

## 1. Configure once on your server

```js
import {createReceizClient} from '@receiz/sdk';
import {createBankeizPayments} from '@bankeiz/payments';
import {createSqliteOrderStore} from '@bankeiz/payments/sqlite';

const receiz = createReceizClient({
  applicationId: process.env.RECEIZ_APPLICATION_ID,
  accessToken: await yourExistingTokenStore.getAccessToken(),
  fetchImpl: boundedFetch,
});
const payments = createBankeizPayments({
  merchant: {username: 'yourname', userId: yourStableReceivingAccountId},
  receiz,
  store: createSqliteOrderStore('/persistent/bankeiz-orders.sqlite'),
});
```

Use your existing authorized Receiz client if you already have one. Otherwise
follow the installed SDK's `docs/app-registration-token-lifecycle.md`: register
your own application/callback, use Authorization Code + PKCE, and obtain the
merchant's consent to `receiz:wallet.read`. Preserve the exact client ID. Keep
access/refresh tokens in your server's secret store, refresh through the existing
OIDC lifecycle, and bind the granted account to your configured receiver.
A short-lived non-refreshable proof-authority bearer is not unattended access.

The package needs read access to confirm incoming payments. It does not send
money, sign for your customer, create a card charge or claim a Note. The payer
continues to approve those actions inside existing Bankeiz checkout.

The SDK's current `request` options do not include an abort signal. `check` stops
waiting after 15 seconds (or caller abort) and refuses late writes. Configure
transport cancellation and an 8 MiB response bound too:

```js
async function boundedFetch(input, init = {}) {
  const timeout = AbortSignal.timeout(15000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  const response = await fetch(input, {...init, signal});
  if (!response.body) return response;
  const reader = response.body.getReader();
  let bytes = 0;
  const body = new ReadableStream({
    async pull(controller) {
      try {
        const part = await reader.read();
        if (part.done) { controller.close(); reader.releaseLock(); return; }
        bytes += part.value.byteLength;
        if (bytes > 8 * 1024 * 1024) {
          await reader.cancel();
          throw new Error('Receiving response exceeds capacity');
        }
        controller.enqueue(part.value);
      } catch (error) { controller.error(error); }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
  return new Response(body, {status: response.status, headers: response.headers});
}
```

## 2. Add Bankeiz to your checkout

In your existing authenticated checkout endpoint, read the customer's authorized
order and total from your own application. The browser supplies its order ID;
your server supplies the price and receiving account.

```js
const order = await yourStore.requireCustomerOrder(request, orderId);
const checkout = await payments.checkout({
  orderId: order.id,
  amountUsdCents: order.totalUsdCents, // integer string, e.g. '1995'
});
return Response.json({checkoutUrl: checkout.checkoutUrl});
```

Then attach this to any existing payment-option button:

```js
const response = await fetch('/your-checkout-endpoint', {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: JSON.stringify({orderId}),
});
if (!response.ok) throw new Error('Checkout could not be opened');
const {checkoutUrl} = await response.json();
window.location.assign(checkoutUrl);
```

Or return `checkout.buttonHtml` for a plain HTML link that keeps your store open
in its original tab. Use your existing button styling if preferred. Full hosted
checkout opens in its own browser page; mobile apps use their system browser.
There is no supported full-checkout iframe or arbitrary `returnUrl` parameter.

Concurrent/repeated creation returns the same durable request. Changing the
amount or receiving username for an existing order throws `ORDER_CHANGED`;
use a separately identified order for revised terms. Order IDs are private
merchant references; the public link carries a separate UUID sale reference.
USD amounts follow the existing fixed-sale contract. Card limits, minimum
remainder, shortfalls and Note eligibility remain owned by Bankeiz checkout.

## 3. Confirm and deliver

Invoke these from your existing server job runner; the package starts no timer:

```js
await payments.reconcile({limit: 10});
await payments.fulfill(async job => {
  await yourStore.acceptPaymentAndFulfillOnce({
    orderId: job.orderId,
    provider: 'bankeiz',
    paymentReference: job.payment.transferId,
    attemptIdempotencyKey: job.idempotencyKey,
  });
}, {limit: 10});
```

Your store's `acceptPaymentAndFulfillOnce` must atomically claim delivery using
its own merchant/order ID shared by **all** payment providers. Retain provider
payment attempts separately. If another provider already paid/fulfilled that
order, record the late Bankeiz payment for review and do not grant it again.
The included `example/fulfillment.mjs` demonstrates this with a unique order key.
For remote shipping/delivery, enqueue one shared order-level delivery job and
use that same order-level idempotency key with the external service. The Bankeiz
`job.idempotencyKey` identifies this provider's attempt; it cannot deduplicate
another provider's independently named attempt on its own.

Alternatively, update an entitlement/order in the same transaction as its unique effect key.
An arbitrary external callback cannot guarantee one effect if its response is
lost. Jobs are durably leased; an expired worker cannot acknowledge a newer
lease. Retry uses the same key and first payment, never another financial action.

For a customer's authorized order page, `await payments.get(orderId)` returns a
narrow saved view immediately. `await payments.check(orderId)` explicitly reads
the original receiving result. Opening a held view does not need another check.
The public projection excludes private payment originals and credentials.

`reconcile` fairly revisits retained paid and unpaid orders. Each order check
reads at most two relevant discovery pages and four matching original candidates.
Individual receiving reads stop waiting after three seconds and rotate unresolved
references, so one stalled source cannot discard successful siblings.
Continuation and unavailable references survive restart. Each batch examines at
most `limit` order records; fulfillment similarly examines at most `limit` job
records, including completed or currently leased jobs. Each traversal fences its
current pass and advances only examined records, so interrupted runners and new
insertions cannot repeatedly skip a suffix. A delivery wait is bounded by its
lease or caller cancellation; a late response cannot acknowledge an expired lease.
Schedule enough batches
for your order volume. There is no hidden age cutoff; stopping the runner stops
automatic discovery while retaining saved results and explicit recovery.

Only an exact merchant-owned received original establishes `paid`. Missing,
partial, wrong-account and wrong-total observations remain unresolved. Existing
accepted payments remain visible through later failures. A public fixed link
can receive multiple real payments: each is retained, `additionalPayments`
increases, and the first fulfillment job is not repeated. Review extra payments.

## Optional webhook receiver

```js
const result = await payments.handleWebhook(request, {
  secret: await yourSecretStore.getWebhookSecret(),
  resolveOrders: event => yourStore.findOrdersForKnownNotification(event),
});
return Response.json(result, {status: result.complete ? 200 : 503});
```

Use the SDK's existing endpoint registration. The helper verifies the raw body,
signature and a five-minute timestamp tolerance, with a 256 KiB input bound.
Your trusted routing function maps the actual host's supported event fields to
your own orders. Generic event property bags are not a fixed-sale contract.
Event ID/body associations and unfinished work are durable; redelivery retries
unfinished reads. Every payment still passes the ordinary receiving inspector.
Test events and a `paid` field cannot establish payment. Production fixed-sale
event emission/delivery has not been qualified here: keep reconciliation active.

## Bring your own database

`OrderStore.transaction(work)` must run its synchronous callback in one durable,
serializable transaction and roll back on failure. It receives:

- `get<T>(key): T | null`, returning detached values.
- `put(key, value)`, storing JSON without coercing integer strings.
- `insert(key, value): boolean`, inserting only if the key is absent.
- `lastKey(prefix): string | null`, returning the last matching key to bound a pass.
- `scan<T>(prefix, {after?, limit})`, returning lexically ordered matching keys
  strictly after `after`, bounded by `limit` (1–100), as `{key, value}` rows.

Enforce a unique key index. Store operations include merchant-namespaced orders,
payment associations, fulfillment jobs, webhook work and traversal cursors.
Do not split a transaction around asynchronous network calls. The package does
its receiving reads outside the transaction, merges accepted originals and uses
revisions to avoid rewinding a racing observation. Commit the original and
unique first fulfillment job together. Retain these private operational records;
they do not create financial authority or an additional money ledger.

## Run the example

After installation, run:

```sh
node node_modules/@bankeiz/payments/example/server.mjs
```

Open the printed loopback URL. The example has one fictional $10 order. Create
checkout, record a synthetic payment, check receiving, then fulfill. Restart
with the same `BANKEIZ_EXAMPLE_DATABASE` to reopen it. Example effects use unique
keys, demonstrating retry after a lost response. The example binds only loopback,
uses synthetic transport, marks every screen as synthetic and never opens the
live payment link. It is a qualification/example app, not production checkout.

Use your existing customer authentication for checkout/status endpoints. Protect
job-runner endpoints with your own service authorization. The package operates
under your merchant configuration; it is not a public order API for Bankeiz.
It does not replace your inventory, shipping, tax, customer access or delivery
logic. Platform gateways, native return adapters, refunds, recurring billing,
cash-out and multi-seller splits require their separately supported contracts.

Local qualification: `npm run payments:check`, focused order/payment tests and
`node scripts/check-order-payments-browser.mjs`. Synthetic acceptance is separate
from a deployed, independently authorized payment and fulfillment qualification.
