# Account source portability implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` for inline execution under the user's existing instruction to execute and commit on main.

**Goal:** Include retained verified account originals in the existing private proof backup and restore compatible account history after explicit import.

**Architecture:** Extend the existing evidence archive with `account-source`. The existing account verifier admits exact original bytes, the existing local account ledger enforces continuation, and its current observation adoption rules protect newer balances and local Note successors. An archive import remains successful if its independently verified historical evidence cannot replace the current account view.

**Tech Stack:** TypeScript, React, Receiz SDK/MCP/AI Skills 129.0.0, encrypted IndexedDB.

**Spec:** The continuity requirement in `docs/receiz-v129-bankeiz-connection-audit.md`, together with the user's instruction to reuse Receiz, avoid duplicate work and keep offline Notes last.

## Global constraints

- Keep SDK, MCP and AI Skills at `129.0.0`.
- No direct Supabase runtime, new network reads, new financial authority or signing keys in backups.
- Public account export freshness remains enforced separately; private historical custody does not become a fresh public statement.
- Never replace a local Note successor, reset storage, resume pending operations or move funds during import.
- Commit on main; the user pushes.

## Review focus

- Forged account JSON and owner substitution must fail before any archive write.
- Mixed invalid imports must remain zero-write.
- Historical or branched originals must not rewind the current ledger.
- A Note successor or newer wallet arriving during import must win.
- Interrupted projection must leave exact evidence recoverable by reimport, without reporting restored account history.

### Task 1: Connect exact account originals to private proof portability

**Files:** `src/receiz/proof-library.ts`, `account-ledger.ts`, `identity-vault.ts`, `native-identity.ts`; `src/features/account/ProofPortabilityPanel.tsx`; matching proof library, vault, ledger and identity tests.

**Interfaces:** Add optional `readAccount(): Promise<ProofSource[]>` and `restoreAccounts(proofs: readonly VerifiedAccountProof[]): Promise<boolean>` to the proof library. Add `account-source` evidence kind and optional `accountHistory: 'restored' | 'retained'` to import results. Add `localLedger.original(): Promise<VerifiedAccountProof | null>` to read the exact verified source without rebuilding chart history. The restoration callback receives only runtime-owned verifier results, after the full batch is admitted and atomically retained.

- [x] Write failing tests for byte-exact backup/import, actual verifier forgery refusal, no source mutation, encrypted archive reopening and guarded restoration.
- [x] Run those tests and confirm the missing behavior causes failure.
- [x] Implement source collection/admission, encrypted archive kind and existing-ledger restoration. Keep the callback optional and only invoke it for imported account proofs.
- [x] Update private archive copy to explain verified account history and evidence-only fallback without implying Note custody recovery.
- [x] Verify focused tests, complete suite, type checking and production build; perform fresh review.
- [x] Commit the verified change on main and record validation in a verification note.

## Execution ledger

- Base: `be15f6f`; main clean. Existing account originals are encrypted in the local account ledger but omitted from private proof backups.
- Ruling: Proceed inline under the user's explicit “execute” instruction; no additional plan approval is necessary for this bounded connection.
- Ruling: Archive commit precedes optional account-view restoration. If projection cannot be adopted, report evidence retained and preserve the original for retry; never claim funds were restored.
- Review: capacity must apply after digest deduplication while every duplicate still receives structural validation. Red/green regressions at 1,000 members and 64 MiB now pass; follow-up review has no remaining finding.
- Verification: 249 files / 1,475 tests pass, typecheck and production build pass; isolated browser storage 14 checks pass; mobile layout 390/390 px without overflow. The synthetic DOM emitted the documented script-loading warning.
