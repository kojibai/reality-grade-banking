# Reference governance

The repository is maintained at `kojibai/reality-grade-banking`; the reference application is Receiz Bank. Maintainers control this repository's releases and proposed reference license. Canonical Receiz laws, registry and SDK admission remain the source of protocol requirements; repository prose, a maintainer decision or an institution policy cannot exempt an operation from those laws.

Branding identifies the operator. It does not change the protocol or award conformance. Conformance claims must name the assessed receiver, capability, rail, build and environment and link to applicable independently verified evidence. A local checker is not a certification service. There is no automatic or official institution certification program established by this repository.

Protocol-affecting changes require a documented proposal, exact source/registry compatibility analysis, mutation/concurrency/recovery evidence and independent review. Coordinate SDK, MCP and AI Skills changes only when their contract actually changes; a frontend or host correction does not by itself require a new package version. Preserve old source verification and exact recovery where the published compatibility contract requires them.

Releases distinguish implemented presentation, implemented integration, local verification and live qualification. Maintainers must not mark a financial capability live merely because it builds or a deployment succeeds. The [release process](docs/release-process.md) records these boundaries.
