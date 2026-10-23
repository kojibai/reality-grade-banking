# Local financial execution qualification

Date: October 22, 2026. Integration: pinned SDK, MCP and AI Skills 129.0.0.

## Result

The SDK supports source-bound edge Reserve/Settlement transfers. The current
Send and Market buttons do not yet have the admitted execution material and
compatible delivery contract required to replace their connected operations
with that executor. Tasks 4–6 of the approved local execution plan remain
blocked at this integration boundary. The independently verified latency
changes do not represent a completed local financial migration.

This audit inspects published package contracts and Bank adapters only. It
changes no upstream service, dependency, financial rule, qualification gate,
notification permission or live account. No live value is moved.

## Contract inventory

| Requirement | Available contract and evidence | Missing integration prerequisite |
| --- | --- | --- |
| Value source | SDK `value.edge.planReserve/planSettlement`: `applicationId`, `amountPhiMicro`, `sourceProofObjectId`, `sourceValueHead`, destination subject/head and admitted price basis. `verifyTransitionSet`, `prepareCommitSet`, `createRecovery`, sender confirmation and receiver admission consume exact sealed members/commits. See SDK `docs/v125-edge-value-transfers.md`, `dist/v125EdgeValue.d.ts`. | The active Wallet buttons receive authenticated observations from `wallet-send.ts`/`shared-wallet.ts`, not the complete current spendable financial subject and participant capabilities for an edge append. A displayed balance cannot populate this source. |
| Recipient authority | SDK edge input binds `destinationSubjectId` and `expectedDestinationHead`; the receiver reopens its actual committed participant under matching application/role. | Current recipient search resolves a user ID and the conversation operation resolves a conversation ID. Neither returns the receiving financial subject/head and required participant append authority. |
| Share source | `openNativeAssetHolding` verifies canonical sealed holding certificates under the accepted financial signature and holder binding. It explicitly treats them as accepted position evidence. Market originals bind an absolute resulting position. | An accepted position or certificate is not an executable current share source/capability or exclusive ownership handoff. |
| Funded Market authority | `market-trade.ts` validates an authenticated advisory quote and an exact returned trade/position/ledger original. Generic Bank operations have a deliberate `BANK_OPERATION_FINANCIAL_ADAPTER_UNQUALIFIED` refusal. | No qualified local payment-for-shares effect adapter, executable funded offer/counterparty collateral and atomic ownership/value exchange contract is connected here. `previewAssetChange`/`previewCurrencyChange` in `bank-domain.ts` are projections. |
| Exclusive custody | SDK `ReceizArtifactTransitionStore` requires staged verified candidates, exact expected head, capability/command binding and atomic commit. Its synthetic in-memory factory is explicitly testing instrumentation. | Device vault retention and `navigator.locks` protect this browser's checkpoints. They do not establish exclusive cross-device spending custody for existing connected Wallet/share sources or revoke competing spend authority on another copied identity. An authenticated source-preserving handoff is required before local spending. |
| Financial effects | SDK edge `confirmReserveSend/confirmSettlementSend` and matching receive methods reverify the exact plan, rail, role, commit and sealed successor. `native-payment.ts` and `native-asset.ts` independently validate canonical financial packets returned by their existing prepare/execute/recover adapters. | The existing connected Wallet/Market originals are observation families. Generic sealed history, a successful local store callback or arbitrary user seal cannot establish the required debit/credit/share conservation. Dedicated native packet verification does not create a local Market reducer. |
| Additive sync | The SDK documents additive publication of the same committed edge recovery. Generic execution can export/reopen an SDK-custodied recovery. `sources.publishSealedSourceV124` publishes admitted sources under its documented scopes/source requirements. | No current Bank adapter accepts the same locally committed Wallet/Market recovery as the identical existing connected transaction. Current `/api/connect/transfers` and `/api/connect/market/shares/trade` POSTs execute financial actions; they must not be reused as background sync of an already locally executed action. A source-publication API alone does not prove compatible connected Ledger/balance/trade adoption. |
| Automatic receiving | The existing `bankeiz:account-observation` event repaints an admitted held account without a reload or request. Existing payment/message notifications remain intact. | Current account wake reads run at the existing foreground interval; Messages refresh only while mounted. Neither is a source-bound incoming edge-recovery delivery subscription when Messages is closed. A push is a hint, not the proof or receiving credit. Automatic proof ingress/admission must be qualified before claiming immediate receipt. |

## What the published example proves

`institution/examples/edge-payments.ts` composes real SDK planning, set
verification, commit requirements, recovery and sender/receiver confirmation.
Its commit callback deliberately requires the host's actual local stores and
committed transitions. `tests/institution-edge-example.test.ts` qualifies
planning and refusal mechanics; it does not supply real funding, exclusive
custody, a Market counterparty or a deployed synchronization bridge.

`tests/local-financial-readiness.test.ts` exercises the existing production
qualification boundary with observations, position certificates, public prices,
user-seal/history flags, matching balances and truthy verifier callbacks. They
cannot authorize Send/Buy/Sell, connect or write. The actual pinned SDK rejects
reported local-success JSON as an edge recovery without a network call. These
are refusal checks, not a positive financial qualification certificate.

## Required boundary before activation

The next integration must deliver the actual owned financial subjects and
participant capabilities into exclusive source custody, plus executable funded
share exchange authority, then qualify a durable atomic store and the same
recovery's acceptance by the existing global interface. It must also admit
incoming originals automatically through the existing account publication path.
The current global behavior and financial rules must be demonstrated equivalent
before the production buttons switch. This is a concrete contract change to
review, not permission to fabricate missing sources or relax verification.

No unused production `local-financial-readiness` module, test root, always-false
feature scaffold, alternative financial writer or new notification/polling
system is introduced by this audit. Existing connected pending/funding attempts
remain recoverable at their exact original coordinates.
