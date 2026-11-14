# Automatic public-profile discovery

> Bankeiz application code only. Receiz backend, SDK, MCP, AI skills, versions and lockfiles are outside scope.

**Goal:** Every accepted public profile, including an email-created profile with no Originals, reaches Discover automatically and survives reopening.

**Law:** `docs/held-state-navigation-invariants.md`, especially Profile header continuity. Opening held content stays immediate; explicit privacy and exact owner bindings remain enforced. Frozen account entry is unchanged.

## Implementation and checks

- [x] Verify the coverage and privacy/UID contract of existing anonymous public profile sources. Keep the existing collection as the input; do not change Receiz or add database access.
- [x] Reproduce a header-only successor with unchanged Originals revision. Compare both membership and header revisions when observing/adopting the existing shared collection, without adding a page-opening request.
- [x] Retain eligible zero-Original headers across genuinely thin legacy responses. A complete selected owner-header index and explicit privacy/owner rebinding must remove obsolete headers. Save the selected successor through the existing public cache.
- [x] Reproduce standalone cold opening against an older shipped family. Restore the already-selected saved response through the existing shared adoption channel before the old page can replace it; do not add network reads or a second storage system.
- [ ] Run the behavioral transition, privacy/rebinding, persistence/cold-reopen and held-navigation tests. Run frozen entry checks for shared-state changes.
- [ ] Qualify the actual compiled anonymous Discover with APIs stalled, then a header addition and cold reopen. Commit only owned application changes on main; report local build, CI and live evidence separately.

## Review focus

Preserve custom artwork and profile signatures, existing item references/history, current names and UID bindings. An older or thinner response cannot erase selected public headers. A complete privacy withdrawal cannot resurrect a retained header. Background failures cannot turn accepted creation or booking into a false failure. No package edits, extra authentication step, proof bypass, database discovery gate or blocking page refresh.

## Remaining input boundary

Bankeiz can display and retain public profile headers delivered by the existing public collection. Profiles absent from that upstream collection remain a delivery gap; this patch does not manufacture their identity data or claim full live coverage. Receiz code and operational storage remain unchanged.
