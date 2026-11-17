# Standalone invoice implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the approved subtle invoice entry and copyable source-backed invoice page.

**Architecture:** Reuse the invoice editor, exact native PDF seal/custody, Receiz material source families, normal message delivery and fixed-sale checkout. Add thin issuer and recipient views. No asset-flow or identity-entry edits.

**Tech Stack:** Existing React/TypeScript/Vite, Receiz SDK/MCP/AI Skills 129.5.0, Vitest and repository Playwright.

**Spec:** docs/superpowers/specs/2026-11-17-standalone-invoice-design.md

## Global Constraints

- User pushes main; preserve concurrent Create asset work.
- Exact sealed invoice PDF is Source; native readers and custody are reused directly.
- No new database, proof mechanism, settlement engine, identity entry or SDK patch.
- Explicit link sharing discloses invoice billing details only; no chat history/key export.
- Preserve exact cents, recipient UID, original ID, private conversation and ambiguity guards.

## Review Focus

- Different active identity or late callbacks cannot publish/send another owner's invoice.
- A forged/plain PDF or changed material source cannot reach payment handoff.
- Cold reopen with network unavailable uses exact retained sources, preserving originals/history.
- Creating/copying must not send an email; sending must preserve the same Original and ambiguous attempt.
- Long/mobile content remains readable and available before account/payment startup.

### Task 1: Exact invoice source and source-family sharing

**Files:** new src/receiz/invoice-source.ts, src/receiz/invoice-sharing.ts; tests/invoice-source.test.ts, tests/invoice-sharing.test.ts.
**Interfaces:** `openInvoiceOriginal(file)` derives existing terms only after canonical admission; `issueInvoiceOriginal(...)` uses native owner custody; `publishInvoiceLink(...)` and `readInvoiceLink(...)` use existing SDK material transport and native held custody.

- [x] Write genuine-seal tests for source binding, plain/tampered refusal, current owner and saved descriptor reopen; observe RED.
- [x] Implement the thin source adapter and exact saved descriptor in existing draft projection; observe GREEN.
- [x] Write round-trip/share tests with controlled transport, offline held/cold reopen and changed source refusal; observe RED.
- [x] Implement existing source-family composition, public distribution and held-first reader; observe GREEN.

### Task 2: Subtle issuer entry and existing editor/delivery

**Files:** new src/features/invoices/InvoiceComposer.tsx and invoice-composer.css; modify LivePayments.tsx, ProposalComposer.tsx, chat-proposal-workspace.ts; tests/invoice-composer-ui.test.tsx and existing proposal/delivery suites.
**Interfaces:** Existing editor accepts an optional invoice-creation review action. Existing workspace `send(original?:File)` validates and preserves an explicitly supplied canonical invoice while retaining its normal send/unknown-result behavior.

- [x] Test Receive entrance, invoice editor, explicit creation without email, held client addressing and independent copy/send/download actions; observe RED.
- [x] Add the lazy Receive action and thin wrapper; reuse recipient, parties and editor components.
- [x] Test sealed send bytes, owner/context refusal and ambiguous-send check with sibling draft fields; observe RED then GREEN.
- [x] Prove saved current invoice reopen and create-another without erasing originals or unrelated work.

### Task 3: Focused recipient page and exact payment handoff

**Files:** new invoice/view.html, src/invoice/{main.tsx,InvoicePage.tsx,InvoiceView.tsx,InvoicePayment.tsx,invoice.css}; modify Vite input and Vercel route only; tests/invoice-page-ui.test.tsx and entry contract tests.
**Interfaces:** Page consumes admitted invoice source; Pay mounts existing HostedCheckout with exact FixedSaleFields, and source downloads preserve original File bytes.

- [x] Test itemization, exact total, long/mobile content, no account operation before Pay, changed-link refusal, immutable original download and exact checkout handoff; observe RED.
- [x] Implement shared real view, static entry, source read and explicit lazy payment; observe GREEN.
- [x] Verify original source remains visible and held across payment and returning to the invoice.

### Task 4: Browser qualification and task-only main commit

**Files:** tests/browser/invoice-flow.*, scripts/check-invoice-browser.mjs; update existing guide/compiled previews only if changed components require it; docs/verification/2026-11-17-invoices.md.

- [x] Run actual issuer and compiled recipient views at mobile/desktop sizes with explicit synthetic transport; no real enrollment, email or charge.
- [x] Prove retained source after cold reopen with API reads unavailable and exact payment handoff, plus tampered-source refusal.
- [x] Run relevant proposal/payment/held-navigation suites, full tests, account-entry freeze, types and production build; inspect outputs.
- [x] Obtain fresh whole-branch review; fix important findings with reproducing tests.
- [x] Review task-only diff, preserve asset changes, commit and fast-forward local main; do not push or deploy.

Qualification detail: see docs/verification/2026-11-17-invoices.md. Local main integration is the final Git operation; no push or deployment is authorized in this task.
