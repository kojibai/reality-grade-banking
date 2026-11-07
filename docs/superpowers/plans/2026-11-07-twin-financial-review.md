# Twin financial review alignment

**Goal:** A request to recap recent finances completes through the real Twin action transport, existing same-owner Ledger reader, retained results and final reply.

**Scope:** Correct the history query contract in Bankeiz and the Receiz service that supplies its money actions. Keep account entry, identity custody, financial admission and write confirmation unchanged. Preserve existing working-tree edits.

## Task 1: Align read queries

- [x] Add failing tests for nullable optional history filters and a requested page larger than the existing 20-record bound.
- [x] Normalize absent/null filters and bound positive requested page sizes while preserving filters, integer amounts, source coverage and nextOffset.
- [x] Give the service structured history and commitment read tools with the exact client fields, date formats and bounds; keep existing action/result envelopes and other tools.
- [x] Exercise the actual Agents SDK tool invoker, including rejection of unknown/authority fields and invalid queries.

## Task 2: Verify the complete recap and recovery

- [x] Exercise NativeTwin response parsing, MoneyConversation, MoneyWorkspace, MoneyLedgerHistory and durable continuation together; only the remote model/HTTP response is a fixture.
- [x] Cover recent history, a second page, exact large integer amounts, nullable legacy arguments, an interrupted continuation and same-owner recovery.
- [x] Allow a previously refused read query that is valid under the aligned contract to be checked on explicit recovery without repeating a write or duplicating a receipt.
- [x] Run the service and client together using the actual service tool output.
- [x] Run relevant regressions, TypeScript and the Bankeiz suite. Record local verification separately from deployment.

## Review focus

- Unknown keys and owner/approval arguments must remain refused.
- A requested 50-row read must retain the 20-row bound and expose continuation.
- Missing dates must not become guessed dates or a different time window.
- Recovery must preserve original human text, owner, exact receipts and action fingerprints.
- Accepted reads and financial writes must never be automatically replayed.

## Execution record

- Initial 48 focused tests pass; reproductions confirm null filters and a 50-row request fail before Ledger access.
- Implement directly in the current task; no approval handoff or deployment is part of this repair.

- Completed: 63 focused Bankeiz tests, 15 service/integration checks, Bankeiz TypeScript and scoped service TypeScript pass. Actual Agents SDK schemas and service-output-to-client streaming flow verified. Independent patch review found no actionable findings.
- Broad suite: 983 files pass; 7 files fail (17 tests), with 11 skips and two sandbox listener errors. Isolated rerun with listeners permitted passes the certificate and preview tests; 14 Ledger/PWA failures remain across five files outside this repair. No unrelated code or assertions were changed.
- Local source only; no deployment or live model/account request performed.
