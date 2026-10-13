# Shared Receiz Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the demo public Ledger with Mind's shared public Receiz activity sources, preserving the user's separate personal history boundary.

**Architecture:** A fixed public-source proxy composes native SDK public wallet/action reads and the same graph source used by Mind. Typed projection readers and independent paged source cursors feed the existing Ledger interface. A dated real public capture provides first paint; actual personal history is read only after native identity opens.

**Tech Stack:** Existing React/TypeScript/Vite, Node built-ins, Receiz SDK/MCP/AI Skills 129.0.0, Vitest.

**Spec:** docs/superpowers/specs/2026-10-13-shared-receiz-ledger.md

## Global Constraints

- SDK/MCP/AI Skills stay at 129.0.0.
- No external dependency or provider.
- Existing demo events must never appear as public or personal live history.
- Public projection is not enclosing artifact verification or causal financial authority.
- My history is only that user's admitted personal history, including their real bank actions.
- The bank is another interface to the existing Receiz account.

## Review Focus

- One source fails while others succeed: retain/update the available sources and show partial coverage.
- A cursor repeats or a response has the wrong shape: stop that source with an explicit unavailable boundary.
- A refresh overlaps historical paging: do not erase old records or regress the cursor.
- Public text contains private identity fields or unsafe links: render only native public aliases and known public paths.
- Viewer changes or signs out: personal activity never falls back to global or demo history.

### Task 1: Shared source transport and projection

**Files:** server/public-network.ts; src/receiz/public-network.ts; scripts/seed-public-ledger.mjs; public/receiz-public-ledger.json; vite.config.ts; tests/public-network.test.ts; tests/public-network-proxy.test.ts.

**Interfaces:** Produces `readPublicNetworkPage(source: PublicSource, cursor?: string, signal?: AbortSignal): Promise<PublicNetworkPage>`, `parsePublicNetworkPage(source, input)`, `mergePublicRecords(known, incoming)`, `publicNetworkPlugin(): Plugin`. Sources are wallet/actions/graph/proofs. Rows carry source-prefixed IDs, native alias, nullable exact USD cents/Kai coordinates, descriptive local-time input and report-only source evidence. SDK `wallet.publicLedger` and `wallet.actionLedger` perform the public reads.

- [x] Add failing parser/proxy tests covering actual actions wire, exact amounts, source-ID dedupe, unsafe link/private actor rejection, invalid schemas/cursor loops and fixed public GET-only allowlists.
- [x] Run `npm test -- public-network`; expected missing module failure.
- [x] Implement exact source parser, bounded fixed proxy and dated public-capture transformer. Preserve source IDs and public aliases; no generic URL proxy or private cookies/tokens.
- [x] Run parser/proxy tests and inspect seed counts; expected pass and source-only public seed.
- [x] Commit `feat: connect shared Receiz public activity sources`.

### Task 2: Public and personal Ledger presentation

**Files:** src/receiz/usePublicNetwork.ts; src/features/ledger/Ledger.tsx; src/App.tsx; tests/public-network-hook.test.tsx; tests/live-ledger.test.tsx; docs/shared-ledger-verification.md; README.md.

**Interfaces:** Consumes Task 1's pages. Independent source status/cursors and append-only display merge. `Ledger({active})` reads only while visible; Public defaults on, My history never reads demo state. Infinite rows and historical paging load automatically with a 600px viewport margin.

- [x] Write mounted and hook failure tests: source independence, cursor-repeat boundary, head refresh versus paging, public/personal separation and automatic rows.
- [x] Run `npm test -- live-ledger public-network-hook`; expected failure against old Ledger.
- [x] Implement source hook and unchanged Ledger rows/tabs, safe report-only detail expansion, local dates/Kai and actual public aliases. Personal pane explicitly awaits an opened Receiz identity rather than fabricating records.
- [x] Run `npm test`, `npm run typecheck`, `npm run build`; expected pass.
- [x] Verify actual browser Public feed, source details, infinite scrolling and My history isolation; get one fresh final review and fix important findings with RED→GREEN evidence.
- [x] Commit implementation and evidence, keeping full native account/financial qualification explicitly unfinished.
