# Simple Bankeiz order payments

Date: 16 November 2026
Status: Approved by the user on 16 November 2026. Implementation and qualification are recorded separately in `docs/verification/2026-11-16-order-payments.md`.

## Intent and selected approach

Make the existing Bankeiz checkout easy to add to a merchant's own store or app.
The merchant supplies an order from its trusted application, gets a payment URL,
and records the matching received payment once. The customer uses the existing
Bankeiz Card, Balance or Note flow and keeps its ordinary receipt and identity.

The user approved building the simple order integration recommended in the
preceding discussion, using existing payment and proof contracts. The design
below makes its first deliverable concrete. Details labeled implementation
choices are the author's proposals, not additional user requirements.

## Approaches

1. **Reusable integration around fixed-sale checkout (selected).** Compose the
   current fixed-sale codec, hosted checkout and recipient-owned original read.
   This supports all existing hosted payment methods and does not create a card
   session when an order is prepared. It needs an authenticated merchant reader
   and a durable order adapter for reliable completion.
2. **Package only the existing embedded-card example.** This has a smaller API
   surface but excludes the full Balance/Note checkout and retains uncertain
   card-session creation because `referenceId` is not an idempotency key.
3. **Build a new central Bankeiz orders service and platform plugins first.**
   This introduces service custody, deployment and onboarding before proving
   the reusable integration. It also risks duplicating existing Receiz payment
   authority. Store-specific plugins can later consume the selected integration.

## Existing contracts and evidence

- Coordinated installed packages: `@receiz/sdk`, `@receiz/mcp-server` and
  `@receiz/ai-skills` **129.5.0**. Do not upgrade them for this work.
- `src/receiz/fixed-checkout.ts`: `bank.fixed-checkout.v1`, exact canonical
  digest, UUID sale and receiving account, USD integer cents, existing public
  URL and `bank.sale.v1:<digest>:<clientNonce>` payment note.
- `src/receiz/merchant-receive.ts`: bounded discovery and exact receiving
  inspection through `inspectMerchantPayment`.
- `src/receiz/wallet-transfer-original.ts`: complete authenticated Wallet
  transfer/message/original/receipt relationship checks. This is the existing
  connected receiving observation, not a new offline financial-root receipt.
- Existing Receiz `GET /api/connect/transfers?saleDigest=...` is authenticated
  with `receiz:wallet.read`; the principal fixes the account. Discovery returns
  only candidate coordinates. The exact `transferId` + `clientNonce` lookup
  returns the participant-authorized complete original for inspection.
- The SDK provides webhook signature and envelope verification and endpoint
  management. Source inspection found registration and test-event machinery,
  but did not establish production emission/delivery for fixed-sale payments.
  An event name or successful test delivery is not evidence of automatic
  payment notifications.
- Existing focused tests passed 58 cases in eight files during the prior audit.
  This is historical local evidence, not a test of the new integration or a
  live payment qualification.

## Deliverables

Implementation choice: create a framework-neutral TypeScript/ESM package in
`integrations/payments/`, with compiled JavaScript, public types, README,
license and a reproducible local npm tarball. Use `@bankeiz/payments` as the
proposed package name; do not imply npm namespace ownership or publication.
The tarball must install and run in an independent fixture application.

The package composes the existing source modules through a reproducible build;
it must not fork the fixed-sale encoding, payment-note scheme or original
inspector. Do not distribute private identity, credentials, account history or
repository-only imports. Keep the SDK external and pinned to 129.5.0.

Provide:

- `createBankeizPayments({ merchant, receiz, store })` for trusted server code.
- `checkout({ orderId, amountUsdCents })` to atomically create or reopen a saved
  payment request and return its existing Bankeiz URL and escaped button HTML.
- `check(orderId, { signal? })` to reconcile a bounded portion of that order's
  receiving evidence and durably retain accepted payment originals.
- A bounded `reconcile` entry for a merchant's existing job runner. Its
  durable cursor continues across restart; it does not scan the global Ledger.
- A webhook receiver helper using the installed SDK verifier. A verified
  notification can schedule a check; it cannot mark an order paid. The host
  application supplies explicit event-to-order routing, since the generic
  webhook envelope does not establish a fixed-sale payload contract.
- An optional Node SQLite reference store, separate from the portable core,
  and a documented atomic-store interface for the merchant's existing database.
  The reference app runs on the current Node 24 runtime and persists across
  process restarts. No database, server or HTTP route is added to Bankeiz itself.
- A runnable synthetic store example covering checkout creation, a pay button,
  order status, reconciliation and durable fulfillment-job processing. Mark
  its synthetic payment mode explicitly; never present it as a real receipt.
- A public integration guide linked from the existing merchant guide, with
  installation, merchant access, store adapter, recovery and deployment steps.

## Merchant experience and trust

The merchant configures its immutable Receiz receiving account ID, public
username and an existing authorized Receiz client on its own server. Reuse the
SDK's documented Connect Authorization Code + PKCE flow for registered apps,
with `receiz:wallet.read` for these recipient-owned reads. Preserve the exact
registered client ID and bind the consenting subject to the configured merchant.
Use the existing server-side token exchange/refresh/revoke contract; an expired
non-refreshable proof-authority bearer must not be presented as unattended access.
Document both an already-authorized-client setup and the existing Connect setup.
The public username/application ID is not account access. Configuration must not
request an Identity Record, signing key or access token in chat or browser HTML.

The merchant's checkout endpoint authenticates its customer/order using its own
application, reads the total from trusted order data, and invokes `checkout`.
The browser supplies an order locator only; it cannot set the receiver or price.
The endpoint returns only public payment request fields, never the private store
record or complete original. The merchant's public status route similarly
returns a narrow projection under its own customer authorization.

Opening checkout uses normal document navigation in its own browser page, as
required by the existing Bankeiz entry. This version does not add an iframe
version of full Bankeiz checkout or invent a `returnUrl` query parameter. The
store may keep its order page open in the original tab and check status when
the customer returns. Mobile apps use the system browser and their existing
navigation; native deep-link returns are a later adapter.

## Saved order and concurrency

Scope every record to the configured immutable merchant ID and exact external
`orderId`. Prepare one UUID sale and its existing canonical digest, then save it
atomically before exposing its URL. Concurrent creation must return the winning
saved request. A retry with changed cents, currency or receiver must refuse;
it cannot silently replace an order that may already have a payment in flight.
An order that needs a new price uses a separately identified merchant order.

Use USD positive integer-cent strings within the existing fixed-sale bounds.
Do not impose embedded-card limits on Balance payments or promise that card
funding is available for every amount. The existing checkout owns card minimums,
shortfall review, Note eligibility, surplus and payment approval.

Retain the saved request, revision, bounded discovery continuation, accepted
complete payment sources and fulfillment-job coordinates. These are merchant
operational records; Receiz Originals remain payment evidence. Never create a
second financial ledger, balance or new payment signature.

The store interface must atomically support insert-if-absent and revision-checked
observation commits. A commit retains a new original, enforces unique payment
identity, records the first matched payment and enqueues a unique fulfillment job
in the same transaction. Do not expose a casual `onPaid` callback with an
exactly-once promise. The SQLite adapter enforces the same constraints through
actual unique indexes and transactions.

## Confirmation, duplicates and fulfillment

Only the existing inspector can accept the exact original under the saved sale.
Require its recipient, cents, sale digest/note, transfer, nonce, sender, message,
conversation and carried receipt relationships. A card funding result, webhook,
balance change, payer JSON, browser callback or return URL is not confirmation.
Unavailable and malformed responses remain unresolved; they are not nonpayment.

A matched payment produces a retained `paid` observation and one fulfillment
job. Separate genuine payments to the same fixed link remain separately retained
and flagged as additional payments, without another automatic fulfillment.
A public fixed link is not an inventory reservation or globally single-use URL.

Fulfillment jobs are leased and retried durably. Every delivery uses a stable
merchant/order fulfillment key. An external shipper/download/entitlement system
must honor that key, or be updated in the same transaction as the merchant's
order. A process crash between external delivery and acknowledgment cannot be
made exactly-once by an in-memory callback. Document and test this boundary.

Already accepted evidence remains available when later reads fail. Cold reopen
restores the same sale, paid result, additional payments and pending job. Store
failure must preserve the previous record and must not acknowledge a new source.

## Bounded reconciliation and webhook behavior

Reuse the existing recipient-owned sale-discovery and exact original readers.
Each order check reads at most two discovery pages and four relevant originals,
then saves its continuation. Rotate unresolved candidates so an unavailable
earlier payment cannot starve later ones. Retain enough head/anchor/cursor state
to discover a new accepted payment after earlier history was complete.

`reconcile` accepts an explicit bounded batch size and abort signal. Its durable
round-robin queue revisits all retained orders, including paid/fulfilled orders,
so a later second payment can be discovered without depending on webhooks.
Each invocation advances fairly; an unresolved order cannot monopolize a batch.
There is no hidden age cutoff or lifetime order-count ceiling. Monitoring latency
depends on retained order count, batch size and the merchant's runner schedule;
disabling that runner stops automatic discovery, not retention or manual checks.
This scheduling policy is an implementation choice made after builder review.

It is invoked by the merchant's server job runner, explicit status recovery, or
a supported notification. The package installs no browser timer, global loop,
background daemon or new Bankeiz infrastructure. Pending reads use the merchant's
existing grant; revoked/expired access is a visible configuration error while
retained paid evidence remains intact.

Webhook processing verifies the raw body, timestamp and signature through the
SDK before parsing/routing. Store event IDs durably with their scheduled work;
redelivery must retry incomplete work and cannot create another fulfillment job.
Test events never confirm payment. Bound body size before SDK parsing, and keep
secrets server-side. Document real production event delivery as unqualified until
its actual emission and matching source are demonstrated. No Receiz backend
storage or event-emission implementation belongs in this Bankeiz change.

## Frozen boundaries and exclusions

- Preserve exact frozen account creation and all existing identities/custody.
- Preserve held-first display and navigation. Package loading, storage and
  receiving checks add no prerequisite to existing Bankeiz public pages.
- Preserve the installed SDK, MCP and AI Skills source/authority rules.
- No direct financial execution by this integration; payer approval stays in
  existing checkout. No automatic Note claim or privileged merchant writer.
- No refunds, subscriptions, external cash-out, marketplace splits, tax service,
  shipping service, inventory reservation or proof-of-product ownership claim.
- No Shopify/WooCommerce plugin, new public Bankeiz order API, npm publication,
  deployment or live financial charge in this first implementation.
- Preserve concurrent changes already present in the workspace. Isolate the
  implementation or stage only exact task-owned changes; never reset the branch.

## Acceptance and evidence

1. Install the actual packed artifact into an independent Node application;
   execute its documented public API without Bankeiz source-path dependencies.
2. Prove concurrent checkout creation, changed-order refusal, restart with the
   same URL, exact request parsing and compatibility with existing fixed-sale
   fixtures. No payment or identity operation occurs during request creation.
3. Use the real SDK transport against synthetic sources to test correct receiving,
   wrong account/amount/sale, missing original, duplicate notifications, multiple
   payers, late originals, pagination beyond one page, and a second accepted
   payment discovered by the scheduled runner after payment and fulfillment are
   complete and the process restarts. Do not substitute a permissive SDK validator.
4. Exercise actual SQLite transactions from independent service instances,
   persistence failure, cold reopen, race-to-mark-paid and unique job insertion.
5. Test a worker crash after external delivery with an idempotent fulfillment
   sink, repeated delivery, expired lease and resume without duplicate effect.
6. Test SDK webhook signatures, altered/expired/oversized bodies, test-event
   routing, duplicate delivery, failed work retry and canonical payment recheck.
7. Prove the example browser flow with synthetic transports and APIs unavailable:
   existing held Bankeiz entry remains visible, checkout opens the existing route,
   and the merchant order cannot claim Paid without its accepted original.
8. Run relevant complete payment/Counter tests, typecheck, package checks and
   `npm run test:account-entry-freeze` for any shared-module extraction. Run the
   production build before release, with account-entry freeze intact.
9. Report local source/tests, packed artifact, committed build, GitHub CI and
   live deployment separately. A real independently authorized payment, actual
   merchant original, cold recovery and fulfillment qualification remain distinct
   from synthetic acceptance; do not claim them from a local pass.

## Builder discretion

Choose focused internal module names, the precise atomic-store interface,
SQLite schema and package build commands during planning. Keep the public API
small and make evidence/store types explicit. Resolve implementation mechanics
from existing patterns without expanding payment authority or changing checkout.
