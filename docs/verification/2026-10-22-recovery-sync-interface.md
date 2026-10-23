# Recovery and additive synchronization qualification

Date: October 22, 2026. Pinned SDK/MCP/AI Skills: 129.0.0.

## Decision

The existing original-outcome recovery path qualifies as read-only recovery. It
does not qualify as ingestion of a transaction already committed at the edge.
No existing published Wallet/Market acceptance operation for that recovery was
identified in the installed public contracts. Local Send/Buy/Sell activation
therefore remains blocked under the requirement to retain the existing global
interface and financial results. The working connected paths remain unchanged.

This is a contract-mechanics qualification using actual installed SDK code and
Bank adapters over synthetic transport. It is not a live acceptance test,
production capability attestation or proof that every possible provider lacks
such a contract. No credentials, real sources, publication, funding, payment,
trade or custody change are used. No upstream source is copied or modified.

## Exact candidate contracts

| Candidate | Actual input and result | Qualification |
| --- | --- | --- |
| `execution.resolveByIdempotencyKey` | Application/domain/operation kind/semantic idempotency key. Sends an authenticated outcome GET, then admits the signed response and complete recovery if one is returned. | Read-only recovery passes. It has no input carrying a local committed recovery and cannot publish one. Unavailable or unauthenticated results remain unknown; they never trigger another financial execution. |
| `execution.exportCommittedRecovery` | An SDK-custodied committed execution outcome. Returns the original portable recovery locally. | Export only. A generated `committed` label fails custody validation. Export performs no network acceptance or synchronization. |
| `value.edge.createRecovery` and edge confirmation/receive | Exact verified transition set plus actual SDK-issued committed transitions; confirmation/receive reopens the original for the specified application and participant. | Local packaging and verification. The public edge contract's `publishForAdditiveGlobalSync` is a host-composition placeholder, not an implemented SDK ingestion method. |
| `sources.publishSealedSourceV124` | Closed input: application ID, authority-session handle and one sealed source artifact. Its documented source kinds are subject, replay segment and checkpoint. | Publication of those admitted sources is supported. An extra recovery argument is rejected; raw recovery JSON is not a sealed source. Publishing a valid replay artifact is not, by itself, evidence of adoption into the existing Wallet balance, Market holdings and transaction Ledger. That equivalence has not been supplied or qualified. |
| `execution.stagePrepared` / `execution.execute` | Stage an exact plan; execute its held handle/session and candidate transition set. Committed recovery is returned as output. | Execution contract, not an established committed-recovery ingestion contract. Reusing it after a local commit without demonstrating the same accepted heads and zero second economic execution would not satisfy this migration. It remains unavailable as a presumed sync fallback. |
| Current connected Send/Market POSTs | User-approved transfer/trade parameters and original nonce; return or recover the connected original. | They execute financial actions. They accept no documented portable committed recovery binding into the same existing result family. They are not substituted for additive ingestion. |

Public source references: installed SDK `docs/v125-edge-value-transfers.md`,
`docs/registered-native-runtime.md`, `dist/index.d.ts`, `dist/v124Execution.js`,
`dist/v124Sources.{js,d.ts}`. Bank paths:
`src/receiz/{bank-execution-recovery,bank-execution,native-execution-paths,wallet-send,market-trade}.ts`.
The pinned package implementations remain unmodified.

## Automated checks

Run:

```sh
npm test -- --maxWorkers=4 tests/recovery-sync-contract.test.ts tests/local-financial-readiness.test.ts tests/bank-execution.test.ts tests/native-payment.test.ts tests/market-trade.test.ts tests/wallet-send.test.ts
```

The recovery tests use the actual SDK client inside the actual Bank recovery
controller. Both a 503 lookup and an unsigned `committed` response cause exactly
one GET to the retained idempotency coordinate, no body, no staging/execution,
no new checkpoint and no unknown-to-success rewrite. No consent means no
connection. Publication rejects incompatible recovery arguments before transport.
Export refuses a reconstructed committed label. These are negative/transport
mechanics checks, not a successful financial synchronization specimen.

## Required acceptance contract before activation

An existing documented SDK operation or qualified provider adapter must accept
the exact committed portable recovery and prove all of the following:

1. Independently reopen the original under the unchanged pinned trust roots,
   application, operation plan and full participant set. A summary or nonce
   alone is insufficient.
2. Bind the same semantic idempotency identity, attempt, exact plan digest,
   predecessor/successor heads and financial source identity. Retry must admit
   the identical result once; conflicting material cannot replace it.
3. Admit the locally committed result without another debit, credit, issuance,
   ownership exchange, fee calculation, price execution or fresh user approval.
4. Expose the same accepted financial result through the existing Wallet,
   Market holdings, private/public transaction Ledger and recovery reads.
   Projection records must identify their original proof; a publication receipt
   alone does not establish that equivalence.
5. Deliver the recipient's matching original automatically. The recipient
   verifies and retains it before inline publication; a notification or queued
   transport is not admission.
6. Preserve exact retry/recovery semantics through response loss, duplicate or
   reordered delivery, restart, conflicting heads and old pending attempts.

This document does not invent an endpoint or SDK operation name. A confirmed
existing operation meeting these obligations can be wired through a narrow Bank
adapter. If it does not exist, adding the acceptance bridge requires a separately
reviewed integration contract beyond the currently unchanged interface.

## Resume condition

Supply the existing SDK operation/provider contract and a positive specimen
showing the same committed recovery admitted into the existing account/Market
result family without execution. Then qualify spending-source/custody handoff,
recipient append authority, funded atomic share exchange and the durable local
store from the approved execution plan. No positive local execution or receiving
claim is issued before those gates pass.
