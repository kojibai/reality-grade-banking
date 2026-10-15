# Receiving standard

Profile: `receiz.bank.receiver-profile.v1`, version 1.0.0. This document specifies this reference's receiving requirements. It does not amend the canonical Receiz registry, replace its verifier, or establish a statutory banking standard.

**Verify the value. Verify ownership. Inspect history. Preserve continuity.** Conformance applies to a named receiver implementation, capability, rail, build and operating environment. Assessment must identify each of these; a result for one route does not cover every transaction or institution system.

## Required invariants

The words MUST and MUST NOT describe requirements of this receiving profile.

| Requirement | Required behavior and evidence |
| --- | --- |
| Exact enclosing source | MUST verify the original complete artifact before deriving value, ownership or authority. Reject missing parents, altered bytes, unsupported schemas, limits violations and incomplete history. |
| Pinned trust | MUST use the declared canonical roots, registry, ruleset and operation matrix. Diagnostic custom-root verification MUST NOT issue production authority. |
| Explicit rail | MUST preserve Settlement or Reserve in the exact plan, sources, custody transitions, terminal receipt and projection. A display title cannot select or convert the rail. |
| Lawful value | MUST derive spendable value and current ownership from admitted source state. Display prices, public listings, funding claims, database rows and successful HTTP responses MUST NOT manufacture value or backing. |
| Bound receiver | MUST bind the application audience, receiving identity, exact subject/account and current head. A username, login or application registration alone is insufficient. |
| Qualified custody | MUST retain the native capability and required device attestations. Copying a PNG or JSON handle MUST NOT acquire spend authority. |
| Verified time | MUST preserve KaiSigil-bound KKS proof coordinates and causal ordering. Bare pulse numbers, local dates or wall-clock timestamps MUST NOT supply temporal authority. Local time is a descriptive presentation. |
| Exclusive allocation | MUST prevent the same value being simultaneously available online, in another note, or under another spendable membership. Backing must remain tied to its admitted allocation. |
| Atomic transfer | MUST commit every required participant transition or none under exact predecessor checks. Partial payment and consumption-without-credit outcomes MUST NOT be shown as success. |
| Exact recovery | MUST durably retain the original intent and canonical recovery. An ambiguous outcome MUST be resolved before retry or replacement. No fresh operation may duplicate a possibly committed transfer. |
| Once-only credit | MUST consume and credit the exact source once. Repeated or concurrent deposits MUST resolve to the same committed outcome or a verified refusal without another credit. |
| Independent receipt | MUST independently reverify complete terminal/committed proof and exact source/destination heads. A UI receipt or report boolean is subordinate evidence. |
| Preservation | MUST retain exact sources, unknown namespaces, history and recovery coordinates through storage, import, export and synchronization. Reencoding an image may destroy its carried proof. |
| Protected custody | MUST keep private identity material, attestation responses, bearer tokens and exact execution handles outside public caches, logs and model context. Reopening in another process requires canonical reverification. |
| Usable local state | SHOULD paint the latest verified local projection immediately, with freshness accurately represented. Cache retention MUST NOT create spend authority or silently assert a successful refresh. |
| Scoped qualification | MUST qualify the exact receiver with real admitted sources and supported hardware before claiming live financial readiness. Synthetic tests and inspection alone do not qualify an institution. |

## Status and evidence

- **Conformance not demonstrated**: no complete, applicable assessment is available. Unknown is not a proven failure.
- **Conforming for the assessed capability**: applicable independent evidence demonstrates every required invariant for the stated build, rail and environment. The assessment must be inspectable and its scope explicit.
- **Nonconforming for the assessed capability**: a verified assessment identifies a failed requirement. Remediation and a fresh applicable assessment are required before claiming conformance again.

No runtime in this repository awards a conformance badge from a caller-supplied JSON claim. The local checker's report always says `institutionConformance: "not-assessed"`.

An integration defect, insufficient funds, revoked consent, unavailable service or rejected recipient may prevent a payment independently of the receiver's conformance. A failed payment alone does not establish a conformance failure. A result for one receiving endpoint cannot establish that all of an institution's transactions are unbacked.

## Continuity outside the environment

When a destination does not carry proof-native continuity, say **“Proof continuity not established for the receiving balance.”** The original transfer receipt can remain verified. This describes the evidence boundary without claiming conventional funds are fictitious or unbacked. Sealing records evidence; it cannot substitute for verified ownership, admitted value or funded backing.

An available external payment review should identify the exact route, preserved evidence, destination continuity status, denomination, fees and irreversible effects before consent. Do not label an unassessed destination conforming or nonconforming for marketing effect.
