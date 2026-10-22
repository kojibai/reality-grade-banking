# Reality-Grade Banking releases

Versioned repository releases describe the open implementation, receiving
materials, Bankeiz reference application and evidence for the published scope.
The reference application's product version is separate from the Receiz SDK,
MCP and AI Skills versions it uses.

| Version | State | Receiz | Release record |
| --- | --- | --- | --- |
| 2.0.0 | Prepared for operator publication; tag not yet created | 129.0.0 | [Full release notes](2.0.0.md) · [qualification record](2.0.0-qualification.md) |
| 1.0.0 | [Published October 20, 2026](https://github.com/kojibai/reality-grade-banking/releases/tag/v1.0.0) · `2231301` | 129.0.0 | [Full release notes](1.0.0.md) · [qualification record](1.0.0-qualification.md) |

The live application remains available at [Bankeiz.com](https://bankeiz.com/).
Publication records identify the actual tag and source. Capability-specific
assessment remains documented separately.

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
