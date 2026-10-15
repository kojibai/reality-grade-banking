# Proposed reference implementation license — not effective

**Draft for legal review. This file grants no new license or patent rights.** The repository owner requested free use of an unchanged reference implementation with a narrow branding exception. No standard open-source license implements that restriction. Until definitive terms are approved and published, do not describe this repository as open source or assume a new grant from its public visibility. Existing third-party and Receiz package licenses remain in force.

## Intended grant

Subject to definitive terms, the owner intends to permit anyone, including institutions and commercial operators, to inspect, study, reproduce, run and deploy the covered reference implementation without a code license fee. Distribution would preserve the licensed reference source and notices. Operators could replace their permitted branding and identify their own service without implying that Receiz operates, endorses or certifies it.

## Intended branding exception

Permitted customization would be limited to the documented `branding/identity.json` fields; replacement operator-owned logos, icons and share artwork; and purely visual theme values expressly listed in the branding guide. Display changes must not obscure the value rail, denomination, issuer/receiver identity, verification status, required consent, continuity boundary or material capability limitations.

Changing canonical verifiers, trust roots, registry bindings, laws, valuation, admission, signing/custody rules, predecessor checks, limits, atomic execution, once-only accounting, recovery or assessment requirements would not be permitted under the proposed reference grant. Integration configuration and adapters need separately defined permissions: this draft does not grant arbitrary source changes disguised as branding. Actual origin/client/custody authorization is independently required.

## Conformance and identity

Operators would not be permitted to describe a modified reference as the unchanged official reference. Neither use of the code nor a passing local checker establishes institution conformance. Any claim must identify the exact capability, build, environment and independently verified evidence under the published receiving requirements. Accurate attribution and nominative references must remain possible; no permission to impersonate Receiz or use official conformance marks is proposed.

## Ownership and dependencies

The owner's copyright would remain with the owner. The proposed grant covers only rights the identified legal licensor actually holds. It cannot remove MIT permissions already granted for published Receiz packages or impose additional restrictions on separately licensed dependencies. Third-party notices, font licenses and any existing rights must be retained. Independent implementations require separate analysis; this draft does not claim exclusive ownership of every interoperable implementation or every concept described here.

## Decisions for counsel before release

**Known compatibility issue:** the existing dependency tree and native verifier include GPL-3.0 components, including `snarkjs` and `ffjavascript`. A no-modifications restriction cannot override their grants or obligations. Distribution of the combined work needs a specific compatibility and corresponding-source review; simply excluding dependency directories from the proposed terms does not resolve that question. See [third-party inventory](THIRD_PARTY_NOTICES.md). No public redistribution readiness is claimed by this proposal.

1. Identify the legal copyright holder and the complete covered-file schedule; audit prior contributions and existing licenses.
2. Define the exact modification/branding/integration exceptions, redistribution rights and enforceable acceptance mechanism. Institutions need a usable route to configure their identity and host without altering protected rules.
3. Decide the patent permission required to implement and run the reference, including any retained inventions. Do not promise patent clearance or assume copyright terms alone protect all inventions.
4. Set trademark/mark use, attribution, breach cure/termination, warranty and liability terms and governing law. Review compatibility with every bundled dependency and source map.
5. Publish a definitive license only after review and owner approval. This proposal must not be substituted for that license.

This structure is **source-available**, with controlled modifications. It is not an OSI open-source license. The distinction and patent scope were checked against the [Open Source Definition](https://opensource.org/osd), [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.html) and [Mozilla's MPL explanation](https://www.mozilla.org/en-US/MPL/2.0/FAQ/); those licenses are not adopted by this draft.
