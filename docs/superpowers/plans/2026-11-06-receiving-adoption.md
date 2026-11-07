# Receiving Adoption Implementation Plan

> **For agentic workers:** Use the approved design and implement the independent
> tasks in parallel, then perform one integration review and complete checks.

**Goal:** Help a holder bring the next willing person or institution into receiving.

**Architecture:** Reuse Send and receiving for payments, and Conformance and the
Registry for institution evidence. Add bounded private invitation drafts and a
static, money-first receiving guide; no new financial operation or discovery gate.

**Tech Stack:** Existing React, TypeScript, static page builder, v129 primitives.

**Spec:** `docs/superpowers/specs/2026-11-06-receiving-adoption-design.md`

## Global constraints

Preserve account-entry and held-state navigation invariants. Keep installed SDK,
MCP and AI Skills versions. Preserve all preexisting WIP. No added entry requests,
private public caches, automatic messages, payment execution or production deploy.

## Review focus

- A changed local identity cannot open another identity's drafts.
- Stale concurrent draft writes fail rather than erase newer work.
- Malformed/shared fragments supply display guidance only, never payment authority.
- Closing or cancelling sharing does not mark delivery or a payment as sent.
- Returning from help preserves recipient UID, payment approval and retained root.

## Tasks

1. **Invitation and private work** — `src/adoption/invitation.ts`, `workspace.ts`,
   two narrow existing-storage wrappers; tests validate schema, privacy, bounded
   work, encryption binding, concurrency and honest statuses.
2. **Public receiving** — static `/receiving/`, local fragment reader, existing
   directory/metadata/navigation integration; test static first paint, scrubbed
   private data, safe DOM, direct and institutional paths without fetch.
3. **Institution preparation** — existing Conformance entry plus capability and
   environment guide, actual kit/check/remediation links and Registry entrances;
   tests preserve missing/failure/PASS scope and existing credential boundaries.
4. **Private entrances and follow-through** — shared React sheet, Send and held
   contact handoffs, actual accepted-receipt next action; tests assert no new
   calls on ordinary entry, local drafts, explicit sharing and payment review.
5. **Integration** — focused tests, account-entry freeze, typecheck, full test suite,
   production build and controlled browser mobile/desktop/offline/keyboard checks.
   Inspect owned diff; report local/committed/deployed separately.

For each behavior: write a focused failing test, implement, run to green. Use real
existing payment guards in regressions. No real invitation, publication or money
movement in verification.
