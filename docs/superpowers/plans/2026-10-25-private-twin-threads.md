# Private Twin Conversations Implementation Plan

> **For agentic workers:** Execute inline under the parent-approved contract, using TDD and verification before completion. No commits or production writes.

**Goal:** Add separate private owner Twin conversations, explicit switching, and exact authorized historical retrieval.

**Architecture:** Reuse native world_agent_memory_entries owner/scope/visitor_key and existing owner capability. Bank projects held thread state immediately and requests history explicitly. The legacy api:<uid> conversation remains canonical.

**Tech Stack:** Existing Next route, Supabase query client, Agents tools, Bank React/Vite and Vitest.

**Spec:** docs/superpowers/specs/2026-10-25-private-twin-threads-design.md

## Global Constraints

- Only the signed-in owner reads api:<uid> and api:<uid>:<UUID> keys.
- New chat is explicit; background reads never replace a settled conversation.
- No new table, authorization authority, production writes or commits.
- Historical text never becomes current human approval.
- Keep money checkpoint, credit-pause and review-display behavior.

## Review Focus

- A foreign owner/key/cursor must disclose no private messages.
- Legacy current chat must survive creating and switching newer threads.
- A pending financial task must remain in its original thread.
- More history must retain exact message bodies and identities.
- A mobile thread picker must remain legible and avoid horizontal overflow.

## Task 1: Native exact private history

- [ ] Write and run failing same-owner/key/cursor/full-body tests for app/lib/world/ownerTwinConversations.ts.
- [ ] Implement isOwnerTwinThreadKey, readOwnerTwinConversations and readOwnerTwinConversationPage over existing memory.
- [ ] Add authenticated GET conversations route and read_previous_conversations owner tool; preserve existing message metering and scope.
- [ ] Run focused native tests and lint.

## Task 2: Bank adapter and thread state

- [ ] Write failing native adapter/key/list/read tests and local switchback state tests.
- [ ] Add conversations API beneath existing protected native transport and explicit thread keys on asks.
- [ ] Add compact New chat and Past conversations UI while preserving pending financial recovery.
- [ ] Run existing and new MessagesPanel, Twin, financial and retention tests plus TypeScript.

## Task 3: Rendered verification

- [ ] Exercise New chat → ask → Past conversations → previous chat → switchback in desktop and mobile fixtures.
- [ ] Capture screenshots outside the source tree and inspect visible evidence.
- [ ] Report exact remaining deployment and authenticated live-state boundaries.
