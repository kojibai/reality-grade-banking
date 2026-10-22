# Automatic asset backing

Backed asset creation accepts one amount. The native financial writer allocates
Reserve first and Settlement for the remainder, using the admitted complete
wallet source. A browser balance, public valuation or cached preview cannot
authorize backing.

## Request and signed approval

The automatic variant of `fund-asset` replaces the user-selected `rail` with
`fundingRule: "reserve-first-then-settlement"`:

```json
{
  "kind": "fund-asset",
  "fundingRule": "reserve-first-then-settlement",
  "amountUsdCents": "10000",
  "definition": {
    "name": "Example units",
    "symbol": "UNIT",
    "units": "1000",
    "description": "Defined asset units.",
    "linkedProofDigest": null
  }
}
```

The existing request envelope adds application, actor and request identifiers.
The validator rejects an ambiguous request containing both selectors, unknown
fields or an unsupported rule. Historical single-rail requests retain their
original closed encoding.

Signed automatic reviews include an ordered `fundingComponents` list. Each
positive component contains `rail`, `amountUsdCents` and `amountPhiMicro` as
canonical decimal strings. There are at most two components, Reserve before
Settlement; duplicate, zero or inconsistent legs are rejected. Their sums must
equal the complete approved debit and the prepared asset's backing. The total
remains prominent in the review; exact components appear under Transaction proof.

## Conservation and redemption

Reserve carries its admitted fixed-dollar claim and original Phi backing.
Settlement uses unencumbered Phi at the existing deterministic quote and
denomination rules. A mixed allocation consumes all available Reserve before
the Settlement remainder. Insufficient combined funds, precision failure or
overflow rejects the complete operation.

Both debit legs, one asset ID and the entire declared supply belong to one native
plan and one accepted statement. Existing account/asset heads, participant locks,
identity consent, financial signature, canonical sealing and durable pending
writer remain authoritative. There is no intermediate issuance or second funding
transaction. Changed heads, authority or quote invalidate an approved plan.

New asset states, receipts, holding certificates and account-proof components
retain `backingComponents`. Mixed active backing uses `backingRail: "composite"`;
single-component automatic backing uses that component's rail. Existing aggregate
backing fields reconcile exactly. Transfers and offers preserve those components.

Whole-supply redemption restores each original component to its rail and clears
the components, aggregate backing and supply. Reserve returns its original claim
and backing; Settlement returns its exact original Phi. Its displayed dollars
follow the redemption quote. Stored issuance dollars are not a new fixed-dollar
Settlement promise. Existing whole-supply ownership and open-offer checks remain.

The public account proof presents a two-leg asset transition as one history event
with both conserved deltas. It does not duplicate the accepted source digest or
invent two independent transactions.

## Recovery and compatibility

Bank retains the exact prepared review and consent before submission. A lost
response leaves the same attempt unknown. Read-only recovery resolves its
original nonce and plan digest; it does not issue another asset. The existing
native pending writer finishes or reopens its original accepted statement.

Historical requests, receipts, position certificates and public account statements
remain readable without inserting fields into their signed bytes. New components
are retained only when present in their verified source. The existing native
file/JSON statement, receipt and certificate storage accepts these variants;
this change needs no SQL schema migration.

## Publication boundary

Backing is optional. **Public original** uses the canonical Showcase publication
path without moving funds. **Create with backing** uses the same rich Bank
composer and adds one native financial asset. Receiz's composer UI and ordinary
posting flow remain unchanged.

Before financial review, the authored source and all referenced resources are
canonically opened, retained and bound to the current owner. The optional
`authoredSource` reference is frozen into the signed fund request and its exact
artifact digest becomes `definition.linkedProofDigest`. The source title,
description, symbol and supply must match the approved financial definition.
Legacy requests without an authored source retain a null linked digest.

After acceptance, the existing native asset issuer signs a closed public snapshot
with the same asset ID, issuance source, current head, definition, supply and
backing components. Its canonical enclosing seal and financial-root signature
are verified before publication. The snapshot excludes account identity, private
position quantity, account balances, key and authorization hashes. It cannot
authorize a financial transition and cannot be opened as a private holding.

The public package carries the exact authored source and public snapshot. Private
execution receipts remain private. Profile and Market discovery carry the same
native asset ID; generic profile-share issuance rejects that binding. Ownership,
offers and whole-supply redemption use the existing native paths. A displayed
valuation never creates liquidity: a sale requires a matching funded offer.

The encrypted creation journal advances through `source-held`, `funding-pending`,
`funded`, `publication-pending` and `published`. Recovery resolves the original
operation nonce before packaging or delivery. A lost response cannot authorize a
second debit or another asset. Cancellation is available before funding starts;
uncertain funding must resolve before another creation can begin.

## Qualification and delivery

Local qualification covers Reserve-only, exact-Reserve, Settlement-only and mixed
arithmetic; insufficient funds and precision/overflow refusal; exact redemption
after repricing; closed terms and component tampering; canonical receipts and
holdings; history projection; real native Reserve-funded execution, duplicate
submission, interrupted-pending recovery and changed quote/head refusal. These
tests use explicit fixtures and ephemeral roots.

Genuine canonical-source tests also cover owner and definition mismatch, altered
or missing blocks, authored native execution and cold recovery, public-snapshot
privacy/tampering, same-head certificate reuse and canonical public-package
opening. Isolated browser checks at 390px and 1440px qualify the Bank form and
pending-delivery retry. They perform no live funding or publication.

Mixed arithmetic and terms tests use explicit detached inputs. They do not
establish admitted Settlement ingress on a deployed installation. Hosted mixed
funding still requires qualification from that installation's admitted complete
Settlement source. Neither intrinsic asset value nor a browser projection can
replace that source.

Deploy the compatible Receiz contract/runtime before enabling the Bank caller.
The SDK pin remains v129. Bank refuses automatic issuance if its native asset
runtime is absent; it never falls back to two transactions or a silent rail choice.
Local tests are not a live financial, deployment or physical-custody qualification.
