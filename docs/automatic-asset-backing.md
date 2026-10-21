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

This funding contract creates a native financial asset and its position proof.
It preserves the existing plain-definition restriction: `linkedProofDigest` must
be null. It does not claim that issuance publishes a media-rich Showcase object.
The existing unbacked authored-original pipeline already uses canonical Showcase
publication and public discovery. Joining media-rich publication to funded units
requires an explicit content/source binding and native asset routing, described
in the separate composer design. Private execution receipts include account
balances and are not public publication material.

## Qualification and delivery

Local qualification covers Reserve-only, exact-Reserve, Settlement-only and mixed
arithmetic; insufficient funds and precision/overflow refusal; exact redemption
after repricing; closed terms and component tampering; canonical receipts and
holdings; history projection; real native Reserve-funded execution, duplicate
submission, interrupted-pending recovery and changed quote/head refusal. These
tests use explicit fixtures and ephemeral roots.

Mixed arithmetic and terms tests use explicit detached inputs. They do not
establish admitted Settlement ingress on a deployed installation. Hosted mixed
funding still requires qualification from that installation's admitted complete
Settlement source. Neither intrinsic asset value nor a browser projection can
replace that source.

Deploy the compatible Receiz contract/runtime before enabling the Bank caller.
The SDK pin remains v129. Bank refuses automatic issuance if its native asset
runtime is absent; it never falls back to two transactions or a silent rail choice.
Local tests are not a live financial, deployment or physical-custody qualification.
