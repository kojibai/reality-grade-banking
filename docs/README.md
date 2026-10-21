# Reality-Grade Banking documentation

Reality-Grade Banking is the open architecture and receiving standard published
by this repository. Bankeiz is its live branded reference implementation, built
on Receiz. These materials connect the implementation to its original sources,
operating contracts, independent receiving tools and release evidence.

## Start with the task

| Task | Start here |
| --- | --- |
| Understand the product and open implementation | [Project README](../README.md) |
| Use an account, payment, Note or asset | [Public guides](https://bankeiz.com/learn/guides/) |
| Understand the present implementation | [Current capabilities and boundaries](current-function-boundaries.md) |
| Build an independent receiver | [Receiving kit](../institution/README.md) · [receiving standard](../institution/receiving-standard.md) |
| Inspect the exact formats | [Schema reference](public-sdk-schemas.md) · [published originals](https://bankeiz.com/schemas/) |
| Verify or operate a release | [Release index](releases/README.md) · [release process](release-process.md) |
| Reproduce the supplied source | [Source distribution](../SOURCE.md) · [native source](../native/README.md) |

## Identity, account and value

- [Native assets and account proofs](native-assets-and-account-proofs-v129.md)
- [Private artifact and Note source closures](private-artifact-and-note-source-closures-v129.md)
- [Historical account valuation](historical-account-valuation-v129.md)
- [Payment composition](native-payment-api.md)
- [Prepared-operation contract](bank-prepared-operation-contract.md)
- [Execution and exact recovery](bank-execution-recovery-contract.md)

## Notes and continuity

- [Connected Note contract](connected-notes-v129.md)
- [Note continuity standard](note-continuity-standard.md)
- [Account-destination Note deposit](note-account-deposit-v129.md)
- [Settlement Note contract](settlement-note-contract.md)
- [Offline Note qualification and retained handoff](offline-notes-release.md)
- [Installed production migrations](verification/2026-10-20-production-note-migrations.md)

## Public sources and history

- [Public profiles, editing and named links](PUBLIC_PROFILES.md)
- [Public asset publication](public-asset-publication-v129.md)
- [Public Ledger source contract](public-ledger-source-contract.md)
- [Ledger inspection](public-ledger-inspection.md)
- [Ledger release and disclosure](public-ledger-release.md)
- [Deliberately shared account proof](crystal-public-account-proof-contract.md)

## Integration and assessment

- [Receiz v129 connection audit](receiz-v129-bankeiz-connection-audit.md)
- [Media and messaging contracts](receiz-v129-media-and-messaging-contracts.md)
- [Institution qualification](../institution/qualification.md)
- [Machine-readable receiving profile](../institution/receiver-profile.json)
- [Conformance claims](../CONFORMANCE.md)
- [Security and operator responsibilities](../SECURITY.md)
- [Origin and registration contract](bankeiz-origin-activation.md)

## Product and release evidence

- [Reality-Grade Banking 1.0.0 full notes](releases/1.0.0.md)
- [1.0.0 qualification record](releases/1.0.0-qualification.md)
- [Changelog](../CHANGELOG.md)
- [Dated verification records](verification/)
- [Audience guide design](design/audience-guides.md)
- [Follow-up implementation queue](implementation/remaining-work.md)

The current capability map and versioned release record identify present
behavior. Dated verification documents retain the source, commands and scope
actually assessed at that time. A prior local pass does not establish a later
deployment, a financial result or universal device qualification.

## Stewardship and distribution

[Contributing](../CONTRIBUTING.md) · [Governance](../GOVERNANCE.md) ·
[License](../LICENSE) · [Licensing guide](../LICENSING.md) ·
[Third-party notices](../THIRD_PARTY_NOTICES.md) · [Trademarks](../TRADEMARKS.md)
