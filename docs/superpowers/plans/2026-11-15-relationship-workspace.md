# Relationship Workspace Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, TDD, and one fresh final review. Preserve all current uncommitted work; no commits, pushes or deployment are authorized by this task.

**Goal:** Open a private, context-bound Twin workspace from a relationship and create/review/share work into its exact main conversation.

**Architecture:** Reuse MessagesSession's native owner Twin view and current tool execution, keyed by the existing owner/conversation coordinate. Project Work/Context from held native messages and private output descriptors; retain mutations only through existing encrypted conversation custody. Exact SDK Originals remain proof authority.

**Tech Stack:** Existing React/TypeScript, Receiz SDK/MCP/AI skills 129.5.0, native messaging and document workspace.

**Spec:** `docs/superpowers/specs/2026-11-15-relationship-workspace-design.md` (records the user-approved design).

## Global Constraints

- Work in the existing feature checkout on `kojib/messages-proposals`; preserve all prior dirty work.
- Frozen account creation and existing identities unchanged. No new database/history engine or backend writes in Bank.
- Private Twin reasoning stays private; sharing and financial/signature actions remain explicit.
- Respect selected owner/conversation on every asynchronous completion.
- No new public loading gate, CSS budget exception, Google tracking or deployment.

## Review Focus

- Switching relationship, owner, tab or hidden view during reads/asks/uploads must not leak or publish into a different relationship.
- No claimed paid/signed state from envelope text or AI. Only source readers establish authority.
- Lost upload/send responses retain exact attempts; checking never automatically sends again.
- Custody fields and unrelated account records never enter relationship context implicitly.
- Back/forward workspace visits keep both drafts/history; prior private Twin and other conversation source bytes remain intact.

### Task 1: Source context and work projection

Files: `src/receiz/relationship-workspace.ts`, `tests/relationship-workspace.test.ts`.
Interfaces: `relationshipTwinKey(ownerUid, conversationId)`, `relationshipContext(page, ownerUid, question): BusinessContextRecord[]`, `relationshipWork(page, ownerUid): RelationshipWorkItem[]`.
- [x] Write/run failing tests for exact IDs, mismatched pages, contextual excerpts, older-message relevance, secret refusal, source-only work labels and payment/signature separation.
- [x] Implement bounded projections over the current native conversation, with no new persistence or proof admission.
- [x] Run focused tests and record results.

### Task 2: Exact Original sharing

Files: `src/receiz/workspace-file-share.ts`, `tests/workspace-file-share.test.ts`, `src/features/messages/WorkspaceFileCard.tsx`, owner document viewer integration.
Interface: `createWorkspaceFileShare({identity,api,conversationId,sourceThreadKey,isCurrent})` returning subscribe/snapshot/prepare/send/check; `readWorkspaceFile(message)` locates the exact native attachment and caption.
- [x] Write/run failing tests with actual SDK originals: same owner and source, confirmed checkpoint before upload/POST, response substitution, context switching, sibling retention and cold unknown recovery.
- [x] Implement explicit preview then same-object preserveOriginal upload/send; exact native reconciliation only. Add a real canonical receiving file reader with separate payload/Original downloads.
- [x] Run focused tests and record results.

### Task 3: Workspace UI and existing Twin integration

Files: `MessagesPanel.tsx`, `OwnerDocuments.tsx`, `documents/OwnerDocumentViewer.tsx`, `RelationshipMessage.tsx`, `WorkspaceHeader.tsx`, `RelationshipWorkspacePanel.tsx`, lazy workspace CSS, focused UI tests.
- [x] Write/run failing Messages tests: one icon, owner/conversation Twin key, private-context boundaries, full existing tools, prepared reply review/send, source jump, Work/Context tabs, correct shared document scope, draft preservation and owner/context switch suppression.
- [x] Implement through existing Twin renderer/history and existing proposal/document authoring callbacks. Main-thread send uses existing outgoing state. Preserve current general Twin view and source screens.
- [x] Run related tests, account-entry freeze if shared custody changed, and TypeScript.

### Task 4: Verify and review

- [x] Fresh scoped review against this spec and the five review-focus cases; fix important findings with regression checks.
- [x] Regenerate/check affected source previews; production compilation and all unchanged public/Feed guards passed. Final packaging completed after ENOSPC retries; full CLI and resumed copy evidence remain separate.
- [x] Real browser mobile review with controlled data; capture screenshot and report boundaries separately from CI/live deployment.
- [x] Update evidence and plan. No commit, push or deployment.

### Accepted expansion: manual documents and free access

- [x] Manual document editor, seven starting structures, direct tables and real four-format rendering.
- [x] Exact held contact/profile prefilling with editable party names and details; preserve complete details in reviewed terms and every generated format.
- [x] Keep Work useful without paid Twin; retain per-relationship intent and use the existing Business access surface only when requested.
- [x] Red/green regression checks for general/relationship Twin isolation, free-to-paid hydration, draft preservation, source guards, superseded share intents and cold exact-output recovery.
- [x] Make the issuer the prominent document brand in every generated format and verify actual rendered/readable output (8 expected failures, then41 real-reader tests passed).
