# Counter register

Approved direction: keep the existing quick-amount Counter. A small register icon beside its heading opens the mobile Sell, Items and Activity experience reviewed in the clickable preview. Back returns to the quick Counter without losing work.

## Experience

The register serves retail, food and services without a required business setup. The empty state offers Add an item, Import offerings and Custom amount. Saved offerings have categories, search, favorites, SKU/barcode, price, variants, modifiers and optional decimal stock. Custom sale lines can be saved for reuse while selling. The cart supports quantities, discounts, tax, tip, customer/table, fulfillment and notes. Draft carts survive closing the panel. Imports are previewed before applying, match stable identifiers, retain blank optional fields and report rejected rows. Existing offerings are never deleted by an import.

Items can be edited, archived and restored. Stock adjustments carry a reason. Activity retains requests, actual payment originals, sale lines and stock effects, with filters, totals, export and receipt details. Never present a refund or a delivery change as a movement of money unless an existing accepted payment operation proves it.

Checkout keeps the current fixed payment link, QR, balance/card/Note methods and exact-original confirmation. The register does not set a new price or introduce a new funding rule. Item, tax, discount and tip amounts form an exact frozen sale snapshot before the existing fixed request is exposed. Later item edits cannot change that sale. Apply fulfillment/stock once per sale after a genuine accepted payment; preserve additional genuine payments as attention-required evidence rather than fulfilling twice.

Unpaid requests have Cancel checkout. Closing a request must prevent new Bankeiz checkout approvals against its shared link and preserve a cancellation record. Payments already started can still arrive: keep their exact originals, show the outcome honestly and never erase a paid sale. A merchant-local hidden QR alone is not cancellation. Confirm the supported shared lifecycle primitive before exposing this action. Do not claim that closing a Bankeiz request revokes a separately authorized direct wallet transfer.

## Data and performance

Catalog and draft data are private to the open Receiz ID. Reuse its existing authority and current SDK operations; no extra identity, financial account or login ceremony. Read each retained source once on opening, derive indexed views once per changed source, and perform no new work on ordinary Account/Receive startup. Heavy import parsing and register screens load only on demand. Use immutable sale snapshots and compact current indexes rather than reserializing full payment evidence per cart edit.

Shared stock and checkout acceptance must use a supported owner-bound atomic source. Do not substitute an unguarded public projection, local storage or a fabricated Paid flag. The exact backing contract and any required native work are builder decisions to qualify against actual implemented SDK routes. Legacy SDK commerce helper names with no current route are not usable contracts.

## Approaches

1. Replace quick Counter with the full register: rejected because the approved flow retains instant one-amount checkout.
2. Add an isolated register behind a tiny icon and compose current payment, retained-state and shared-state primitives: selected. It keeps normal Counter light and gives merchants the deeper tools only when requested.
3. Embed a separate external POS: rejected because the experience and continuity must stay within Bankeiz.

## Invariants

- Existing account entry, custody, payment approval, money conservation, idempotency, funding minimums and receipt proof checks remain unchanged.
- Decimal quantities and integer money use exact arithmetic; no floating point sale totals.
- An unavailable source is never silently treated as zero stock, an empty catalog or a failed payment.
- Failed writes leave the last saved cart/catalog intact. Unknown payment outcomes remain unknown until resolved.
- Cancellation and payment races must be qualified; a recorded payment always remains recorded.
- Do not modify older ownership/offline work or other developers' commits.
- Bankeiz documentation describes Bankeiz behavior and its SDK contracts, not implementation details of other repositories.

## Qualification

Test exact cart arithmetic, stable import matching, blank-field preservation, variants and stock identity, saved drafts, identity isolation, stale-write rejection, verified-payment stock effects, duplicate observations, late/additional payments, cancellation races, legacy Counter compatibility and payment recovery. Browser-test the real components at 320px and 390px, including a long catalog, import, cancel, paid and reopen flows. Run account-entry freeze, typecheck, the full test suite and the release build before committing.

## Product-entry expansion requested during implementation

Quick entry still needs only name and price. Optional disclosures cover description and private product images; custom primary and additional categories (including category paths), tags and brand; variants with prices, comparison prices, unit costs, SKUs/barcodes and available/low stock; supplier reference, stock location, bin, reorder quantity and lead time; product tax exemption/rate/inclusion; preparation and service duration; shipping weight and dimensions; ingredients/materials and allergens/care; separate receipt name, customer note and internal notes; and named custom fields. Category creation happens directly in the product editor and is saved with the offering.

Product tax settings are applied in frozen sale lines. Internal notes, costs, supplier information and private media never enter a public checkout-status response. Private image bytes are stored once by fingerprint, cached in protected device custody, and loaded only for rendered products. Catalog and cart updates carry image references rather than image bytes. Unchanged catalog, history and draft collections remain immutable references during cart writes.
