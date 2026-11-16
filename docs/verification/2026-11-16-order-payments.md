# Bankeiz order payments qualification — 16 November 2026

## Implemented scope

`@bankeiz/payments` 0.1.0 composes existing fixed-sale checkout, receiving-original
inspection and Receiz 129.5.0. The portable server interface provides checkout,
saved status, bounded receiving checks, fair durable reconciliation, leased
fulfillment and SDK-verified webhook routing. The optional Node 24 SQLite store
commits operational records atomically. The package is locally downloadable,
with types, exact source inputs, source maps, license and a synthetic example.

Receive → Accept payments anywhere contains one quiet **Connect a store or app**
link using the existing link style. Its existing-layout documentation starts
with no-code links/buttons, then adding Bankeiz to an existing checkout and
automatic order fulfillment. Account creation, identity custody and the existing
buyer payment approval flow are unchanged.

## Observed local evidence

- Full repository suite: **1,108 files passed; 7,261 tests passed; 11 skipped**.
  Command: `npm test -- --maxWorkers=2`. Loopback networking was enabled for the
  suite's real local HTTP fixtures. The initial sandboxed run failed two HTTP
  cases with `listen EPERM`; those pass with the required loopback permission.
- Account-entry freeze: **7 files / 63 tests passed**, through the actual pinned
  creation guard and retained phrase-free Identity Record choreography.
- Focused integration tests cover all five existing hosted payment paths:
  Balance, Card, Reserve Note, Settlement Note and composite Note. Each uses the
  existing hosted controller and Wallet composition, with explicit synthetic
  financial transport, before the real merchant inspector and fulfillment.
- Independent packed installation and public TypeScript imports pass. The
  actual tarball is installed in a temporary application. The exact public
  pinned SDK is supplied by symlink to the workspace's locked installation;
  its package dependencies are reused. No Bankeiz repository implementation
  imports resolve from that fixture. This is not a fresh registry SDK install.
- Root and package typechecks pass. The documentation builds 48 chapters.
- Browser qualification passes for checkout creation, unpaid fulfillment refusal,
  received-original confirmation, one delivery, cold SQLite reopen and a later
  second payment retaining one delivery. Receive is checked at 390 and 1100 px;
  documentation is readable at 390 px with JavaScript unavailable.
- The exact saved `/pay/merchant/` path and query open the actual compiled
  checkout. Its no-JavaScript entry remains readable. With JavaScript, APIs
  stalled and only native identity-module entry deferred, the actual receiver,
  $10 amount and payment-method controls paint with zero POST requests. The
  unresolved native-entry fixture prevents enrollment; it does not qualify
  identity creation or change any SDK input guard.
- Source-archive and npm-pack regressions place explicit dummy databases and
  journals in the integration directory and prove they are excluded. Package
  and public-source distribution use explicit source-file allowlists.

The whole **`npm run build` passed (exit 0)**, including the frozen entry guard,
package compilation, root typecheck, static public preparation, offline shell,
license/source checks and final public delivery. The product-preview generator
was rerun for the new Receive link. Source archive and final delivery are refreshed
after this evidence record is saved; no application code changes in that refresh.
The emitted package is 69,864 bytes, with SHA-256
`152f0a7980ebbe227ec9b1b607eb4f70c24b029b96b7b2bb30b080179fa6964d`.
The public and emitted distribution manifests and actual tarball bytes match.

## Independent review and regression fixes

One independent final reviewer identified seven material cases. Their fixes
were verified with failing regressions before the code changes:

1. Per-read three-second deadlines retain successful sibling originals and
   rotate past hanging candidates; the whole check retains caller cancellation
   and a 15-second observation bound. Late reads cannot commit.
2. Reconciliation and fulfillment advance one examined record at a time, with a
   durable upper boundary for each pass. Interrupted runners and increasing
   order IDs do not repeatedly skip the same suffix.
3. Webhook work isolates per-order failures and retains incomplete mappings,
   allowing later valid mappings to finish independently on the same delivery.
4. External delivery waits are bounded by the lease and caller signal. Late
   completion cannot acknowledge an expired/replaced lease. A retry uses the
   original stable attempt key and merchant-order delivery claim.
5. The example and guide share one atomic merchant-order fulfillment claim
   across providers. A modeled other-provider completion followed by a genuine
   synthetic Bankeiz received original produces one entitlement and a review
   record for the additional payment. No second provider or writer is invented.
6. Browser qualification now opens actual compiled checkout rather than merely
   checking the generated URL; the native-entry deferral and API-stall boundaries
   are explicit above.
7. Public source archives and npm packages allowlist distributable files rather
   than recursively including integration runtime custody. Dummy DB/journal
   regressions pass. No real private database was inspected.

The reviewer’s minor evidence qualification (SDK dependency reuse in the packed
fixture) is reflected above. No code issue is deferred as a minor.

## Operational boundaries

The merchant supplies its own authorized Receiz reader and trusted order total.
Customer authorization remains on the merchant's checkout/status endpoints;
credentials and complete originals are excluded from public status. Registered
application IDs and scopes retain their installed contract. The package installs
no browser timer, payment writer, Bankeiz service or second financial ledger.

The job runner must remain enabled for automatic additions. Its latency depends
on order count, schedule and batch budget. External delivery must use one shared
order-level idempotency/fulfillment claim across payment providers. A callback
without that sink contract cannot guarantee one external effect after a lost
response. The example demonstrates an atomic entitlement sink, not physical
shipment or independent product ownership transfer.

Source + proof and existing admission remain authority. Receiving observations,
operational rows, checkout URLs and webhook signatures do not mint a new offline
financial receipt or authorize spending. Production payment-event emission is
unqualified here; reconciliation does not depend on it.

## Initial implementation evidence separated (before release)

- **Local workspace:** implemented and exercised as above, preserving concurrent
  work. Exact final command exits and artifact coordinates accompany delivery.
- **Committed build:** not created by this task. The workspace contains other
  ongoing changes; no blanket staging, reset or custody deletion was performed.
- **GitHub CI:** not triggered or claimed by this task.
- **Live deployment / npm registry:** not published by this task.
- **Live financial acceptance:** no real charge, identity enrollment, Note claim
  or transfer. Live payment, receiving, mobile-return and merchant fulfillment
  qualification must be recorded independently for a deployment.

## Reproduction

```sh
npm run payments:check
npm test -- --maxWorkers=2 tests/order-payments.test.ts tests/order-payments-webhook.test.ts tests/order-payments-source-archive.test.ts tests/order-payments-package.test.ts
npm run test:account-entry-freeze
npm run typecheck
npm run docs:build
npm test -- --maxWorkers=2
npm run build
node scripts/check-order-payments-browser.mjs
```

Browser checks use the repository's Playwright runtime (Browser plugin absent),
isolated synthetic identities/transports and loopback-only servers. Screenshots
are retained outside the repository at the task's temporary preview directory.

## Main release qualification

The release is isolated from concurrent workspace changes and applied to main
`cb42ec836a78612d6e88b31ccd5da37e8db08119` with a clean `npm ci`.
The production build passed, including frozen entry, TypeScript, source inventory,
public delivery and the existing Feed size limit. The complete suite passed
7,338 cases with 11 skipped; its two local-HTTP cases were denied by the sandbox
and both passed when rerun with loopback access. A full unrestricted rerun also
runs during release. The separate account-entry suite passed all 63 cases.

The independently installed tarball and public TypeScript API passed. The
browser check passed synthetic checkout, exact receiving, one fulfillment, cold
reopen and a later second payment without a second delivery. The actual compiled
checkout displayed the saved amount with APIs stalled and native identity entry
deferred, with zero POST requests. The static guide rendered on desktop and
mobile; its new source links use main, where these files are introduced.

Committed GitHub CI and live deployment evidence are recorded separately after
push. No real charge, identity enrollment or production fulfillment is claimed.
