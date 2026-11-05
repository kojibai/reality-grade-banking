# Held-state reuse alignment implementation plan

> For agentic workers: use the established isolated implementation/review workflow. Each task needs a failing behavioral regression, a minimal correction and passing relevant checks.

**Goal:** Remove the duplicate reads and repeated preparation confirmed at commit 8aad47a while preserving accepted-state, financial and frozen account-entry invariants.

**Architecture:** Reuse existing accepted objects, source revisions, bounded reader caches and refresh owners. Persist the existing qualified public Bank data response at acceptance and restore it as historical display independently of account entry. Never manufacture Source currentness or borrow a receipt from another family.

**Tech stack:** Installed Receiz SDK/MCP/AI skills, React, TypeScript, existing browser storage and public readers.

**Spec:** docs/held-state-navigation-invariants.md and output/redundant-read-audit-20261105/report.md.

## Constraints and review focus

- Discover page/entry/index and static opening remain as restored in a609edac. No new server freshness prerequisite.
- Frozen account creation, identity custody, ownership, conflict, consumption, transaction and new-input verification remain intact.
- Preserve the 49 unrelated working files. Changes to overlapping files must be composed against their exact preimages and reviewed; do not stage unrelated Ownership/PWA work.
- Historical public display never supplies a current Source verdict. Preserve complete catalog/chart families and newer accepted RAM state during delayed restore.
- Account automatic wakes reuse existing healthy refresh deadlines; explicit refresh, actual mutations, missing inputs, failures and expiry keep their current reads.
- Keep public and private media/cache lifetimes separate, and reject changed bytes/digests and incompatible source revisions.
- Cache failure, quota, corrupt/truncated data and older async writes must not drop a settled view or block entry.

## Tasks

1. **Public state and background reads** — src/public-feed/feed-source.ts, src/receiz/usePublicMarket.ts and existing publication handoff call sites. Reproduce selected A/accepted B and duplicate Discover expansion/wakes. Share accepted public membership without stamping A's receipt onto B; reuse held complete inputs for background expansion; retain original Discover opening and update invalidation behavior.
2. **Account and Assets** — useLedgerValueSource, useNativeAccount, usePrivateHistory, native-identity/native-asset-holding and held-source projection lifetimes. Reproduce extra capitalization/head reads and repeated native source opens. Use existing selected source, refresh deadlines and already-admitted exact source view; preserve real new-input and execution checks. Review pending held-source-view work before changing overlapping code.
3. **Media and receipts** — ProofMedia/proof-media, carried text callers, receipt-snapshot and held asset detail presentation. Reproduce omitted text, inspected-byte reread, completed receipt loss and media remount work. Reuse bounded exact results, preserve independent verification labels and private boundaries. Coordinate LiveAssets edits with task2.
4. **Cold-restart persistence** — prepared-bank-catalog and existing public response/body readers. Persist the exact already-qualified public data response once at acceptance through browser cache storage. On a later process, reuse its existing byte/build/schema checks once and expose only historical carried state before any Source request. Keep updates ordered, cache writes nonblocking and corrupt/missing storage on the existing fallback path.
5. **Composition and qualification** — independently review frozen task artifacts, compose only owned changes in a clean 8aad47a candidate, run full project tests, account-entry freeze, strict type/build checks and compiled responsive reopen/navigation checks. Preserve evidence and report local, committed, deployed and live-verified states separately. Commit reviewed changes on main; user pushes.
