# Counter register implementation

Goal: implement the approved Counter register and unpaid-checkout cancellation, retaining the existing payment experience.

Spec: [Counter register design](../specs/2026-10-30-counter-register-design.md).

Architecture: lazy register UI; pure exact cart/catalog/import domain; identity-bound durable catalog and drafts; existing fixed checkout and exact incoming-original confirmation; qualified shared lifecycle adapter for request closure and stock synchronization. No unsupported historical commerce helpers.

Tech stack: existing React/TypeScript, lucide icons, encrypted identity custody, current Receiz SDK, Vitest and browser regression fixtures. Reuse fflate for bounded on-demand XLSX decoding if needed; no heavy startup dependency.

Global constraints: preserve account entry, payment rules and originals; preserve unrelated dirty files; no live-money testing, pushing or deployment; no additional work when the register is closed. Confirm global lifecycle support before claiming cancellation or multi-terminal stock guarantees.

Review focus: exact cents and quantities, stale-write conflicts, payment/cancel races, private data exposure, stock applied once, untrusted imports, reopen behavior and lazy loading.

## Task 1: Exact domain and import

Create `src/receiz/counter/` modules for catalog records, decimal quantity/money validation, immutable cart sale calculation and import preview/apply. Add behavior tests first in `tests/counter-register.test.ts` and `tests/counter-import.test.ts`. Cover literal cent totals, proportional decimal quantities, rounding, variant/modifier selection, discounts/tax/tip, duplicate SKU/barcodes, blank optional import cells, source mapping and row errors. Imports never delete omitted items.

## Task 2: Durable register controller

Create a controller with `ready`, stable `snapshot`, `subscribe`, catalog edits, stock adjustments, drafts, frozen sale snapshots and idempotent payment fulfillment. Reuse identity encrypted state and immutable archives. Extend the existing merchant Counter controller, not account entry, with a lazy register dependency. Preserve legacy fixed requests and unknown payments. Test reopen, failed writes, identity changes, conflicts, duplicate and late evidence.

## Task 3: Shared request lifecycle

Qualify current SDK shared-state/acceptance support with actual implemented routes. Connect unpaid request closure to customer approval, preserve in-flight outcomes and recorded payments, and use guarded shared stock if available. If a native extension is required, prepare and test its exact contract separately; do not expose pretend cancellation or silently introduce a new payment rail. Test two-role and concurrent outcomes before connecting the action.

## Task 4: Mobile register

Add the tiny icon to `MerchantCounter.tsx`; lazy-load register screens and scoped CSS. Implement Sell, cart, item editor, imports, stock, saved carts, activity and sale detail views using the approved preview's visual structure. Keep the single Back control and current Counter default. Add component tests for persisted edits, search, create checkout, cancelled/paid state, no duplicate submits and return to the unchanged quick Counter.

## Task 5: End-to-end and release

Exercise real components with fixture identities and exact synthetic payment originals, no money. Verify cancellation in the customer view, retained payment and stock, import/export, 320/390px layout and instant reopen. Run focused tests, account-entry freeze, typecheck, full suite and clean committed-scope build; fix failures. Run one fresh whole-change review, address important findings, then commit only this work on main. Leave pushing to the user.

## Task 6: Merchant presentation page (requested after implementation began)

After the Counter function is complete and qualified, create `/merchant/` in Bankeiz's existing public-page system. Use real implemented UI visuals with synthetic business examples, not imagined features. Show product setup, custom categories/details, import, variants, sale/cart, checkout/QR, truthful cancellation, stock and retained receipt/activity flows. Explain benefits in plain merchant language and make the existing Counter entry obvious. Include complete SEO/social metadata and responsive images; avoid adding marketing assets or scripts to the signed-in app's startup. Verify route, links, mobile layout and generated previews in the release build. Do not claim unsupported refunds, hardware/offline capabilities, integrations, zero fees or guaranteed outcomes.
