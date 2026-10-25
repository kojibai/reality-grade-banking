# Documentation Operating Manual Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task. Steps use checkbox syntax.

**Goal:** Deliver a source-grounded operating manual for use, building and conformance.
**Architecture:** Standalone dependency-free static docs with grouped content modules, a semantic block renderer, local search and one authored source mirrored by the Bank build.
**Tech Stack:** Node ESM, HTML, CSS, existing Vitest/TypeScript; no new dependency.
**Spec:** docs/superpowers/specs/2026-10-25-docs-operating-manual-design.md

## Global constraints
- Preserve all seventeen URLs, source hierarchy, canonical docs.bankeiz.com, zero banking runtime and existing payment/account behavior.
- No extra source admission, financial operation, private data read or production mutation.
- Preserve concurrent files and generated Vault reader outputs.
- Document implemented capability exactly; qualify the specific runtime/device/external boundary only.

## Review focus
- Examples must use installed exact APIs, never invented method names.
- Table/code/diagrams must fit narrow mobile without widening the document.
- All body text, steps and table values must be searchable without network requests.
- Every new article/source/related/anchor must resolve in standalone and /docs mirror.
- An offline/financial/agent claim cannot turn an observation or proposal into authority.

### Task 1: Source and content
- [x] Gather exact money, assets and developer evidence in parallel, read-only.
- [x] Expand all existing articles and add task-oriented depth pages in docs-app/articles.
- [x] Preserve pinned implementation links, exact terminology, useful steps and recovery.

### Task 2: Reading and build
- [x] Add tests for semantic rich blocks, content search, all legacy URLs and local build links.
- [x] Implement static steps, tables, notes, code, diagrams, grouped index and reading paths; retain simple shared shell.
- [x] Add machine-readable content and source/revision metadata with no runtime fetch.
- [x] Validate all local links, anchors, source refs and structured metadata at build time.

### Task 3: Verification and commit
- [x] Run affected tests, standalone and mirror builds; validate executable examples against installed packages.
- [x] Inspect actual desktop/mobile docs, search, contents and anchor navigation in CUA.
- [x] Obtain one fresh scoped review, resolve findings, and re-run affected checks.
- [x] Commit owned files only. User deploys docs-app; no push or production deployment.


## Implementation and qualification record
- Delivered37 articles in nine groups with four reading paths; all17 published article URLs preserved. Added Trust you can inspect in response to the user's institutional confidence/ownership framing.
- One canonical content source, semantic steps/tables/lifecycle figures, escaped code, full-text local search, per-article Markdown, llms-full.txt and explanatory articles.json. No dependency or banking runtime added.
- Eighty-three unique source-file links resolve at pinned6c5d582. Exact SDK and MCP downloadable examples ran with zero network/DB calls; MCP writesPerformed0.
- Initial four manual contracts failed RED for missing depth/rich rendering/search/authority coverage; final four docs suites pass15 tests. Selector correction targeted the TypeScript example after the HTML snippet, and copy removed an ambiguous unlimited-compute phrase while retaining exact service limits.
- Isolated full suite:505 files,3,159 tests passed. Initial sandbox loopback refusal was environmental; the authorized local-server run passed. Full production build/typecheck, source archive, licensing, offline resources,138 social cards and existing public metadata/import gates passed.
- CUA checked all37 articles at1280px,390px and320px. No document overflow or header obstruction. Full-text search opened the merchant chapter; phone anchors settled18px below the header; no relevant console warnings/errors. Visual inspection corrected the phone header grid placement and confirmed it at320px/390px.
- Fresh read-only scoped review found no actionable issues, including subject-generation, merchant correlation/idempotency, received/credited Note and independent-assessment boundaries.
- Evidence: /private/tmp/bankeiz-docs-manual-qa/. Validation copy: /private/tmp/bankeiz-docs-manual-validation-5mbw0eab. No live financial operation, push or deployment performed.
- Ruling: preserve the shared working tree and qualify an exact owned-file overlay in an archived temporary checkout with a real local dependency copy. Other agents' files/generated Vault reader outputs stay untouched.
