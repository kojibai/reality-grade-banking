# Current Bankeiz function boundaries

This file describes the current implementation. Earlier dated verification reports record historical observations and are not current completion claims.

| Function | Bankeiz implementation | Remaining production evidence |
| --- | --- | --- |
| Exchange, payment, ownership transfer, fractional sale, buy-back, physical redemption | Forms and bounded client choreography implemented; production preparation/execution explicitly refused until financial effects are qualified | Qualified Receiz native adapter, admitted effect verifier and real same-source/atomic-effects evidence; [exact contract](bank-prepared-operation-contract.md) |
| Funded asset creation | Separate funded mode and same gated transaction executor; definition-only sealing remains available | Actual backing commitment, supply issuance, effect verification and resulting source delivery through the native adapter |
| Original proof deposit, private backup/import and recovery import | Existing local original-source verification and custody retained | Live host additions are separate; a backup does not restore hardware note custody |
| Reserve and Settlement Notes | Existing create/deposit interfaces and v129 native runtime integration | Crystal native wallet funding/redemption writer and deployment/real-device qualification; original Reserve denomination and exact locked Settlement Phi remain distinct |
| Shareable account proof and `/verify/` | Original-source reader, exact PNG/QR, immutable snapshot/latest selector and explicit live-sharing controls | Qualified public writer, native source/distribution/consent endpoints and reviewed writer pin; [exact contract](crystal-public-account-proof-contract.md) |
| Card deposits | Existing embedded checkout, exact attempt/session recovery and status checks; concise consent with expandable details | Provider settlement and actual accepted Reserve credit; checkout success alone is insufficient |
| Wire deposits | UI retains the wire option and refuses to invent routing details | Actual account-bound receiving instructions and operator banking configuration; these are not supplied by the SDK package |
| Physical custody receipts | Native v129 receipt planning/verification composition exists | Admitted operator policy/authority, actual receipt and inspection, lawful custody/title terms and a qualified receiving workflow |
| Programmable rules | Older demonstration draft only; no live activation or automatic spending is claimed | Explicit source-bound mandate, limits, eligible-growth definition, revocation and qualified execution; this is a separate financial feature |

The native preparation adapter is **additional to the Crystal wallet writer**. Neither an installed v129 package, a runtime readiness report, compilation, a passed browser test nor a signed summary establishes deployed financial conformance. Bankeiz refuses absent/unverified sources rather than treating a Market price or cached balance as executable funds.

`assertBankOperationQualified` currently refuses all new financial preparation and execution before account access or transport. Generic v129 transition verification can establish provenance without proving the reviewed financial effects. No host status, environment flag or request echo enables this gate. Activating these flows requires the actual admitted effect contract and verifier integration, followed by independent positive and refusal evidence.

No SDK/MCP/AI Skills version change or SQL migration is needed for the Bankeiz interfaces. No real financial transaction or public disclosure of customer data was performed by these local checks. Keep pending native integrations with the owning Receiz task and independently verify actual deployed results before claiming every function live.
