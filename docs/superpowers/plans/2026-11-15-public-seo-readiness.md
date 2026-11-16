# Public SEO readiness implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the proven reading-sitemap conflict and make public delivery regressions reviewable without adding work to page opening.

**Architecture:** Keep public content, existing application canonicals, held collections, account creation and private/noindex boundaries intact. Change only build-time reading-directory metadata/sitemap selection and add a separately invoked read-only HTTP audit. No runtime prerequisite, extra collection read, or deployment is part of these repairs.

**Tech stack:** Existing Node/Vitest, reading-page builder and HTTP Fetch API.

## Task 1 Reading sitemap consistency

- [ ] Add a regression in `tests/public-reading-pages.test.ts`: the distinct `/read/public/` directory self-canonicalizes; guide mirrors preserve their application canonical; sitemap entries have the same canonical as their own address; all catalog/ledger pages and links still exist.
- [ ] Run the focused test and observe the current mismatch.
- [ ] Update `scripts/public-reading-pages.mjs` to record only self-canonical reading documents for sitemap inclusion, and make the distinct public-reading directory self-canonical. Preserve all generated mirrors, text exports and discovery pagination.
- [ ] Re-run relevant reading/metadata tests and inspect the exact diff.

## Task 2 Public delivery audit

- [ ] Add a standalone audit helper and CLI that stream only public response heads, with bounded concurrency, no cookies/credentials and a timeout. Default to the registered intended-indexable public pages; allow explicitly supplied public paths.
- [ ] Verify real failure classes with a local HTTP server: unintended `X-Robots-Tag: none`, HTTP 404, missing/conflicting canonical, missing title/description, and healthy public delivery. Preserve intentional noindex records by excluding them from the normal indexable queue.
- [ ] Run it against the live registered public pages plus a representative profile. Save dated evidence separately from local tests. Pending feature-page 404s remain deployment evidence; do not publish the owner's branch automatically.
- [ ] Check existing header filtering preserves public HTML without copying upstream robots instructions. Report live/source mismatch without inventing a second runtime adapter or weakening private refusals.

## Review focus

- Canonical selection must not remove generated reading content or break pagination discovery.
- The audit must detect restrictive HTTP headers even if HTML says `index,follow`.
- An audit success means public delivery signals passed, not search-engine indexing or rankings.
- The audit runs separately; it must never execute in application entry, navigation or the service worker.
- A fresh qualified release and live verification are required before claiming the production issues resolved. Large carried payload optimization requires separate lossless design and first-frame/retention qualification; no catalog stripping or freshness gate is authorized as an SEO shortcut.

## Execution record

Task 1 complete: the generated-output regression failed for the original canonical/sitemap mismatch, then six focused reading/metadata files passed with 54 tests. All mirrors, text exports and discovery pagination are retained.

Task 2 complete: standalone bounded HTTP audit and eight real local-server tests passed. Independent review found missing/empty canonical and unquoted-attribute false-success cases; failing regressions reproduced them before repair. A separate image-preview restriction regression also passed after repair. The refreshed live check covered 166 intended-public URLs, with 148 passes and 18 delivery failures documented in the readiness record.

Ruling: preserve the owner's active shared branch and leave these changes uncommitted, because the owner explicitly said they are preparing the branch commit. No deployment, release claim or indexing claim is made.

Ruling: qualify carrier optimization separately rather than remove required held data or alter public entry while measuring SEO. This leaves the observed payload cost unresolved; it preserves the existing immediate-view and retention contracts.

Full repository run: 7,152 passed, 15 failed, 11 skipped and two socket errors. The two cooperative HTTP tests passed separately with local socket access. The other failing files belong to the in-progress document/workspace work and are named in [the readiness record](../../verification/2026-11-15-public-seo-readiness.md). No unrelated implementation was changed to obtain a green run.
