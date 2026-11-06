# Reality-grade banking releases

Versioned repository releases describe the open implementation, receiving
materials, Bankeiz financial application and evidence for the published scope.
The application's product version is separate from the Receiz SDK,
MCP and AI Skills versions it uses.

| Version | State | Receiz | Release record |
| --- | --- | --- | --- |
| 5.0.0 | Recap ready; local code qualified; deployment/publication pending; package version remains 4.0.0 | 129.0.0 | [Full recap](5.0.0.md) · [qualification record](5.0.0-qualification.md) |
| 4.0.0 | [Versioned source and qualification](4.0.0-qualification.md) | 129.0.0 | [Full release notes](4.0.0.md) · [qualification record](4.0.0-qualification.md) |
| 3.0.0 | [Published October 22, 2026](https://github.com/kojibai/reality-grade-banking/releases/tag/v3.0.0) · `dcfb7ed` | 129.0.0 | [Full release notes](3.0.0.md) · [qualification record](3.0.0-qualification.md) |
| 2.0.0 | Retained source tag `v2.0.0` · `3368876` | 129.0.0 | [Full release notes](2.0.0.md) · [qualification record](2.0.0-qualification.md) |
| 1.0.0 | [Published October 20, 2026](https://github.com/kojibai/reality-grade-banking/releases/tag/v1.0.0) · `2231301` | 129.0.0 | [Full release notes](1.0.0.md) · [qualification record](1.0.0-qualification.md) |

The live application remains available at [Bankeiz.com](https://bankeiz.com/).
Publication records identify the actual tag and source. Capability-specific
assessment remains documented separately.

The v5 documents recap committed changes since v4 and record local qualification and pending deployed
acceptance. Preparing those documents does not bump a package version,
publish a tag or release, deploy the application or relabel earlier evidence.

## Release materials

- `CHANGELOG.md` is the concise project-wide change history.
- `docs/releases/<version>.md` is the full narrative and capability record for
  that release. It identifies compatibility, operation and material boundaries.
- `docs/releases/<version>-qualification.md` records the exact candidate,
  commands, source/build identifiers, deployment and assessed outcomes.
- `docs/verification/` retains dated, capability-specific supporting evidence.
- A published GitHub release uses the matching versioned notes, identifies its
  exact tag/commit and links the matching source and required notices.

Use the [release process](../release-process.md) for verification, authorized
deployment, source distribution, retained-intent compatibility and publication.
Use the [release template](TEMPLATE.md) for subsequent versions. Keep previous
records intact; append dated corrections when evidence changes. A new release
does not relabel an old proof, erase a pending action or reset account custody.
