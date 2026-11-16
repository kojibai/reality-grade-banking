# Messages proposals implementation plan

> For agentic workers: use executing-plans with independent PDF, appointment and attachment tasks. The user approved implementation on 15 November 2026; continue without another design approval.

**Goal:** Create a branded, reviewed proposal/invoice from a selected conversation; receive, inspect, pay and track its delivery in Messages, with contextual appointment confirmation.

**Architecture:** Reuse the current Messages lifetime, NativeTwin reasoning, native chat messages/attachments, exact FixedSale/HostedCheckout and merchant payment-original inspection. Proposal terms and source message coordinates are immutable application payloads beneath SDK-verified enclosing artifacts. Native message events carry acceptance and delivery statements; do not create another ledger or proof authority.

**Tech stack:** React 19, TypeScript, installed Receiz SDK/MCP/AI skills 129.5.0, existing CSS, lazy PDF-LIB with existing Inter fonts.

**Spec:** User-approved conversation-first walkthrough and current user instructions in this chat; a selected conversation becomes a branded proposal/PDF in one action or natural-language request, with explicit review before sending and financial approval. Person/thread history remains intact. Identity reviews are deferred.

## Global constraints

- Preserve frozen account entry, identity custody, exact installed contracts and all preexisting edits.
- No Google tracking code, new backend storage in Bank, new identity, or permissive SDK verifier.
- All dates, prices, terms and deliverables are reviewed; generated text is interpretation, never acceptance or payment.
- Exact actor/conversation/proposal binding. Never infer payment from prose, a UI flag or delivery statement.
- Reuse exact source originals. Missing evidence is unavailable, not manufactured.
- Keep business operations explicit and unknown requests retained without automatic retries.
- Keep the person, messages and composer familiar; forms/preview/payment stay contextual and mobile friendly.
- No commits, pushes, deployment or unrelated changes are part of this implementation unless subsequently requested.

## Review focus

1. Thread/identity switches during generation, upload, payment or scheduling must not publish into a different context.
2. Forged, revised, replayed or wrong-party proposal/events must not alter accepted terms or trigger payment.
3. Long conversations, Unicode documents and missing commercial facts must retain exact source coordinates and disclose missing fields.
4. Lost responses must not automatically recreate a checkout, send a proposal, duplicate funding or reschedule an appointment.
5. Seller payment evidence, delivered files and recipient acknowledgment remain separately represented.

## Tasks

- [x] **1. Proposal payload and lifecycle.** Create `src/receiz/chat-proposal.ts`; meaningful tests in `tests/chat-proposal.test.ts` first. Strict immutable terms, exact line-item math, source snapshot/digest, conversation/actor binding, bounded wire payload and review invalidation. Existing FixedSale remains payment authority.
- [x] **2. Branded PDF.** Independent task owns `src/receiz/proposal-pdf.ts` and actual PDF.js parsing tests. Paginate all fields, embed existing fonts, preserve supported Unicode and refuse unsupported glyphs. This generates payload only; exact native proof handling follows.
- [x] **3. Native attachment bridge.** Independent task owns `native-chat-paths.ts`, `native-messaging.ts` attachment additions, validation and transport tests. Reuse exact existing Receiz upload, message and member download routes; expose host authorization requirements candidly.
- [x] **4. Proposal reasoning and document binding.** Create `src/receiz/chat-proposal-workspace.ts`; use NativeTwin without mutation tools, selected loaded source context and exact thread. Review then prepare an existing fixed checkout, bind full terms into the PDF, share through native chat. Use SDK admission before extracting/comparing document terms.
- [x] **5. Messages composition.** Create focused components/CSS under `src/features/messages/proposals/`; integrate a discreet Create proposal action, editable review, in-chat proposal card, PDF, acceptance, existing checkout and delivery actions. Preserve mounted thread/source state. Cover stale async completion, mobile interaction and untrusted events in tests.
- [x] **6. Appointments.** Independent task owns message date extraction and contextual confirmation. Real NativeOrganizer writes with source metadata and explicit human confirmation; unknown outcomes suppress replay. Do not overstate cold-reopen idempotency.
- [x] **7. Verify.** Focused tests, account-entry freeze if identity/storage changes, typecheck, generated preview checks and production build; inspect actual compiled browser flow using controlled test data and real components. Financial and private account operations are not run against production. Separate local tests/build from CI/deployment/live transaction evidence.

## Execution ledger

- Baseline: main had existing unrelated dirty files listed by initial status; none reset or staged. Created feature branch `kojib/messages-proposals` preserving the full current working state.
- Ruling: work in the existing checkout on a feature branch, preserving the user's current uncommitted implementation. A clean worktree would omit the relevant current identity/receipt/ownership changes.
- PDF generator dependencies: `pdf-lib@1.17.1`, `@pdf-lib/fontkit@1.1.1`; loaded only for proposal generation. Existing licensed Inter resources reused.
- Delegated independent tasks: proposal PDF, message appointment action, native attachment bridge. Parent owns proposal domain/workspace and Messages integration.
- Host boundary under investigation: native attachment route authorization must support the existing Bank bearer principal; no cookie fallback or widened authority is permitted.


## Approved extensions during implementation

The user expanded the implementation to real work files, private Twin document creation, request-and-sign agreements inside chat, and organic search pages. Public framing is an AI counterpart: an AI version of the person with their history and context, acting on their behalf when chosen. Twin remains the feature name; proposals are one search entrance into relationship continuity.

- Real PDF/DOCX/XLSX/PPTX payload authoring, strict validation and exact embedded terms; optional libraries/fonts are lazy. Office output and PDF layout are independently read in tests.
- Relationship document creation uses the actual conversation; owner-private work uses its actual owner Twin thread, without inventing a native DM. Each file is sealed through the held identity and retained as an exact SDK Original. Display metadata remains a private projection, never authority.
- Agreement requests carry a complete reviewed agreement. Signing records a fixed explicit consent statement in a new SDK owner-signed Original that encloses the complete unchanged agreement and terms. Native Signature V4 owner truth is the signature boundary. No detached identity-key association, biometric PBI ceremony, or universal legal-enforceability claim.
- Exact Original uploads use a verified preserveOriginal branch in Receiz. Bank refuses transformed bytes and unsupported preserve evidence. Both host builds passed; the installed Bank129.5 carrier was accepted unchanged by the actual host128 verifier under explicit test roots.
- Private context rejects identity/custody schemas and the installed SDK private-key field family before disclosure. Business content remains readable. Export metadata retains opaque context digests, not private context titles or raw records.
- Interrupted file creation reopens its exact descriptor-bound record-export Original; recovery never reseals or scans history.
- Four public intent pages: proposals, client communication, AI documents, and signing agreements. Static content, real source-component walkthrough, local sample PDF, related links, visible FAQs, canonical/social metadata and sitemap registry. Existing Business/audience pages connected. No Google tracking scripts. Keyword evidence is qualitative; Search Console measurements and first-page outcomes are not invented.

## Review decisions and evidence boundaries

- General proposal payments use the established general FixedSale/HostedCheckout path. Inventory Counter gates remain unchanged. No global invoice cancellation or cross-payer single-payment guarantee is invented.
- Pending mutations require a confirmed encrypted custody checkpoint before upload/POST; exact native reads reconcile unknown results. Drafts and signature attempts preserve siblings and held history.
- Real SDK source, signer, terms, context-switch, cold-reopen and byte-substitution tests accompany the feature. Actual production principal grants, live providers, payments, device PBI and deployment are separate from local tests/builds.
- Final local verification completed: full suite 7,135 passed / 11 skipped across 1,099 files; 151 focused checks passed after the final lazy viewer split; frozen entry 63 passed; production build exit 0; four compiled mobile pages and six-step walkthrough inspected with APIs stalled. No feature commit, push, CI run or deployment has been performed. See `docs/verification/2026-11-15-messages-relationship-work.md` for exact boundaries.
