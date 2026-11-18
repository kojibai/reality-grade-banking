import type { ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import { type ReceizValueRailV122, type ReceizWorldValueIntentV122 } from "./v122Value.js";
import { type ReceizOperationPlanV124 } from "./v124Contracts.js";
import { type ReceizRegisteredOperationV124 } from "./v124Execution.js";
declare const AUTHORITY: Readonly<{
    planIsTransactionAuthority: false;
    transactionOccursAtEdge: true;
    serverIsTransactionAuthority: false;
    databaseIsTransactionAuthority: false;
    serverRole: "global-sync-only";
    databaseRole: "global-sync-only";
    strongerTruth: "sealed-receiz-proof-object";
}>;
declare const INSPECTION_AUTHORITY: Readonly<{
    inspectionIsTransactionAuthority: false;
    localVerificationRequired: true;
    serverIsTransactionAuthority: false;
    databaseIsTransactionAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
}>;
export type ReceizEdgeValueTransferInputV125 = Readonly<{
    applicationId: string;
    amountPhiMicro: string;
    sourceProofObjectId: string;
    sourceValueHead: string;
    destinationSubjectId: string;
    expectedDestinationHead: string;
    usdPerPhiMicrocents: string;
    priceBasis: unknown;
    idempotencyKey?: string;
    attemptId: string;
}>;
export type ReceizEdgeValueTransferPlanV125 = Readonly<{
    schema: "receiz.edge-value-transfer-plan.v125";
    rail: ReceizValueRailV122;
    intent: ReceizWorldValueIntentV122;
    operation: ReceizRegisteredOperationV124;
    participants: readonly string[];
    expectedParticipantHeads: Readonly<Record<string, string>>;
    sourceParticipantId: string;
    destinationParticipantId: string;
    plan: ReceizOperationPlanV124;
    authority: typeof AUTHORITY;
}>;
export type ReceizEdgeValueTransferPlanInspectionV125 = Readonly<{
    schema: "receiz.edge-value-transfer-plan-inspection.v125";
    rail: ReceizValueRailV122;
    role: "sender" | "receiver";
    participantId: string;
    sourceParticipantId: string;
    destinationParticipantId: string;
    intent: ReceizWorldValueIntentV122;
    plan: ReceizOperationPlanV124;
    authority: typeof INSPECTION_AUTHORITY;
}>;
export type ReceizSettledEdgeValueTransferV125 = Readonly<{
    status: "settled-at-edge";
    rail: ReceizValueRailV122;
    role: "sender" | "receiver";
    participantId: string;
    intent: ReceizWorldValueIntentV122;
    committedTransition: ReceizCommittedArtifactTransition;
    authority: Readonly<{
        projectionIsTransactionAuthority: false;
        transactionOccursAtEdge: true;
        serverIsTransactionAuthority: false;
        databaseIsTransactionAuthority: false;
        globalSyncIsAdditive: true;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function planReceizEdgeSettlementTransferV125(input: ReceizEdgeValueTransferInputV125): Promise<ReceizEdgeValueTransferPlanV125>;
export declare function planReceizEdgeReserveTransferV125(input: ReceizEdgeValueTransferInputV125): Promise<ReceizEdgeValueTransferPlanV125>;
export declare function inspectReceizEdgeValueTransferPlanV125(value: unknown, input: Readonly<{
    participantId: string;
    expectedRail: ReceizValueRailV122;
}>): Promise<ReceizEdgeValueTransferPlanInspectionV125>;
export declare function receiveReceizEdgeSettlementV125(recovery: unknown, input: Readonly<{
    applicationId: string;
    participantId: string;
}>): Promise<ReceizSettledEdgeValueTransferV125>;
export declare function receiveReceizEdgeReserveV125(recovery: unknown, input: Readonly<{
    applicationId: string;
    participantId: string;
}>): Promise<ReceizSettledEdgeValueTransferV125>;
export declare function confirmReceizEdgeSettlementSendV125(recovery: unknown, input: Readonly<{
    applicationId: string;
    participantId: string;
}>): Promise<ReceizSettledEdgeValueTransferV125>;
export declare function confirmReceizEdgeReserveSendV125(recovery: unknown, input: Readonly<{
    applicationId: string;
    participantId: string;
}>): Promise<ReceizSettledEdgeValueTransferV125>;
export {};
//# sourceMappingURL=v125EdgeValue.d.ts.map