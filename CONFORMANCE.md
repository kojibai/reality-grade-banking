# Conformance claims

The official reference implementation is **[Bankeiz.com](https://bankeiz.com/)**. The receiving standard is [institution/receiving-standard.md](institution/receiving-standard.md); exact versions, registry bindings, capabilities and evidence requirements are in [receiver-profile.json](institution/receiver-profile.json).

This policy concerns technical assessment and truthful claims. It adds no condition to [GPL](LICENSE) rights to run, modify or redistribute software. Certification or a conformance claim is not required to exercise those rights.

## Scope and evidence

A claim of conformance to this profile must identify the receiver/operator, assessed capability, Settlement or Reserve rail, exact build/source revision, profile/registry versions, operating environment and applicable hardware. Link to independently inspectable evidence covering all applicable requirements, its assessment date and material limits or failures. A self-authored status field is not independent evidence.

A different implementation may demonstrate the same published requirements. Weakening a verifier, dropping ownership/history checks or substituting weaker tests cannot establish conformance to the unchanged profile. The GPL still permits creating and publishing a different implementation or standard; identify the difference rather than attributing it to this reference.

No automatic certification or endorsement program exists here. An accurate independent conformance statement does not require purchase of a project badge. Official names, marks and approval claims follow [TRADEMARKS.md](TRADEMARKS.md).

## Public results and shared terminology

The Conformance Console shows the reference build's actual on-device checks and identifies recorded v129 MCP evidence separately. Its original-proof inspector verifies supported carried sources; it does not establish current spendability, acquire custody or authorize credit. Neither its matrix nor a passing reference run automatically assesses the visitor's institution or certifies Bankeiz.

- **Conformance not demonstrated:** a complete applicable assessment is unavailable.
- **Conforming for the assessed capability:** independently verified evidence demonstrates every applicable requirement within the stated scope.
- **Nonconforming for proof continuity:** a verified assessment demonstrates failure of applicable proof-continuity requirements. Identify the failed capability, rail and evidence. Explain: “This receiving institution does not meet the proof-continuity requirements.” Remediation requires a fresh applicable assessment.

Settlement is **proof-native value**. Reserve is **proof-backed value**. **Proof continuity** is the shared requirement to preserve verification, ownership and history; use that term across both rails.

Use **legacy payment rails** as the short description for existing external payment infrastructure. Age, brand, an unpublished report or an isolated payment failure alone is not evidence of nonconformance. For unassessed continuity, disclose that conformance has not been demonstrated. Revoked consent, unavailable services or insufficient funds can prevent payment independently of conformance.

## Preserve the boundary

Retain complete original sources, independently verified receipts, exact operation/recovery coordinates, refusal/concurrency/recovery tests and applicable live hardware evidence. Disclose missing or expired evidence and changes to the build, profile or environment. Copied reports, a build, deployment, listing, HTTP response or signed-looking artwork are not institution qualification.

Canonical verification and native source admission govern actual operations. A license, policy, badge or maintainer statement cannot create ownership, value, backing or spending authority. This is a project receiving profile, not statutory accreditation or a guarantee of universal acceptance.
