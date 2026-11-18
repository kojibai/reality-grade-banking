import { type ReceizIdentityPublicBinding } from "./artifactAdmission.js";
import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { type ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import { type ReceizPortableState } from "./identity.js";
import { type ReceizPortableExecutionOutcomeCoordinatesV124, type ReceizPortableExecutionTransitionRecoveryV124, type ReceizPortableExecutionTransitionMemberV124 } from "./v124PortableAuthority.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
/** A reference projection beneath the existing sealed ownership transition and atomic operation. */
export type ReceizProofValueAtomicSaleBindingV129 = Readonly<{
    schema: "proof-value.atomic-sale-binding.v129";
    assetId: string;
    ownershipNodeDigest: string;
    buyerReceizId: string;
    sellerReceizId: string;
    valueIntentDigest: string;
    paymentSourceParticipantId: string;
    paymentDestinationParticipantId: string;
    deliveryParticipantId: string;
}>;
/** The receipt remains subordinate to its enclosing, admitted ownership proof. */
export type ReceizProofValueAcceptedDeliveryBindingV129 = Readonly<{
    schema: "proof-value.accepted-delivery.v129";
    assetId: string;
    buyerReceizId: string;
    sellerReceizId: string;
    valueIntentDigest: string;
    semanticIdempotencyKey: string;
}>;
export type ReceizProofValuePrivateSaleRecoveryV129 = Readonly<{
    schema: "receiz.proof-value-sale-recovery.v129";
    recovery: ReceizPortableExecutionTransitionRecoveryV124;
    /** Exact preimage of outcomeCoordinatesDigest already carried by every sealed execution event. */
    outcomeCoordinates: ReceizPortableExecutionOutcomeCoordinatesV124;
}>;
export type ReceizProofValuePublicSaleRecoveryV129 = Readonly<{
    schema: "receiz.proof-value-public-sale-recovery.v129";
    sourceArtifact: ReceizPortableSealedArtifactV124;
    applicationId: string;
    audience: string;
    domainId: string;
}>;
export type ReceizProofValueSaleRecoveryV129 = ReceizProofValuePrivateSaleRecoveryV129 | ReceizProofValuePublicSaleRecoveryV129;
type PublicMember = Omit<ReceizPortableExecutionTransitionMemberV124, "identityArtifact"> & Readonly<{
    identityBinding: ReceizIdentityPublicBinding;
    issuerKeyState: ReceizProofValuePublicIssuerKeyStateV129;
}>;
export type ReceizProofValuePublicIssuerKeyStateV129 = Readonly<Pick<ReceizPortableState, "schema" | "exportedAt" | "snapshot" | "proof">>;
/** Data to carry as an exact append inside the existing public sealed domain replay source.
 * This value alone is not evidence and never authorizes or completes a sale. */
export type ReceizProofValuePublicSaleEvidenceV129 = Readonly<{
    schema: "proof-value.completed-atomic-sale-public.v129";
    outcomeCoordinates: ReceizPortableExecutionOutcomeCoordinatesV124;
    transitionSet: Omit<ReceizPortableExecutionTransitionRecoveryV124["transitionSet"], "members"> & Readonly<{
        members: readonly PublicMember[];
    }>;
    members: ReceizPortableExecutionTransitionRecoveryV124["members"];
}>;
export type ReceizProofValueOwnershipChangeV129 = Readonly<{
    assetId: string;
    claimHead: string;
    parentHeads: readonly string[];
    previousOwnerReceizId: string;
    currentOwnerReceizId: string;
    kaiUPulse: string | null;
    kaiPulse: string;
    receiptDigest: string;
    paymentAmountPhiMicro: null;
}>;
export type ReceizProofValueTransactionReferenceV129 = Readonly<{
    participantId: string;
    artifactDigest: string;
    acceptedHead: string;
    receiptDigest: string;
}>;
export type ReceizProofValueCompletedSaleV129 = Readonly<{
    saleDigest: string;
    assetId: string;
    deliveryHead: string;
    buyerReceizId: string;
    sellerReceizId: string;
    completionKaiUPulse: string | null;
    completionKaiPulse: string;
    amountPhiMicro: string;
    usdPerPhiMicrocents: string;
    quotedUsdCents: string;
    priceBasisDigest: string;
    valueIntentDigest: string;
    atomicPlanDigest: string;
    paymentReferences: readonly ReceizProofValueTransactionReferenceV129[];
    acceptedDeliveryReference: ReceizProofValueTransactionReferenceV129;
}>;
export type ReceizProofValueIncompleteHistoryV129 = Readonly<{
    code: "proof-history-unavailable" | "sale-join-unavailable" | "sale-proof-unavailable";
    assetId: string | null;
    reference: string | null;
}>;
export type ReceizProofValueTransactionsV129 = Readonly<{
    ownershipChanges: readonly ReceizProofValueOwnershipChangeV129[];
    completedSales: readonly ReceizProofValueCompletedSaleV129[];
    incompleteHistory: readonly ReceizProofValueIncompleteHistoryV129[];
}>;
export type ReceizProofValueCommittedAtomicSaleEvidenceV129 = Readonly<{
    kind: "committed-atomic-sale";
    sourceRecovery: ReceizProofValuePrivateSaleRecoveryV129;
    transitions: readonly Readonly<{
        participantId: string;
        transition: ReceizCommittedArtifactTransition;
    }>[];
    publicRecovery?: ReceizProofValuePublicSaleRecoveryV129;
}>;
/** Object identity is issued only by the pinned-root, read-only recovery verifier. */
export type ReceizProofValueVerifiedSaleRecoveryV129 = Readonly<{
    kind: "verified-sale-recovery";
    recoveryDigest: string;
    authority: Readonly<{
        projectionIsProofAuthority: false;
        committedCustodyIssued: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizProofValueSaleEvidenceV129 = ReceizProofValueCommittedAtomicSaleEvidenceV129 | ReceizProofValueVerifiedSaleRecoveryV129;
/** Reconstructs a read-only projection using the SDK's pinned sealed-source verifier and existing recovery inspector. */
export declare function verifyReceizProofValueSaleRecoveryV129(value: ReceizProofValueSaleRecoveryV129): Promise<ReceizProofValueVerifiedSaleRecoveryV129>;
/** Public digest preimage projected from an existing, exact admitted identity source.
 * It is checked against the actor digest sealed in each committed participant. */
export declare function exportReceizProofValueSalePublicEvidenceV129(evidence: ReceizProofValueCommittedAtomicSaleEvidenceV129): Promise<ReceizProofValuePublicSaleEvidenceV129>;
/** Package-internal: snapshot caller wire coordinates synchronously while
 * preserving genuine SDK transition and read-only recovery object identities. */
export declare function snapshotReceizProofValueSaleEvidenceV129(evidence: ReceizProofValueSaleEvidenceV129): ReceizProofValueSaleEvidenceV129;
export declare function exportReceizProofValueSaleRecoveryV129(evidence: ReceizProofValueSaleEvidenceV129): Promise<ReceizProofValueSaleRecoveryV129>;
/** Local read only: no store, capability issuance, admission membership, wallet, or approval write is performed. */
export declare function readReceizProofValueTransactionsV129(input: Readonly<{
    admission?: ReceizVerifiedArtifactAdmission;
    sales?: readonly ReceizProofValueSaleEvidenceV129[];
}>): Promise<ReceizProofValueTransactionsV129>;
export {};
//# sourceMappingURL=proofValueTransactionsV129.d.ts.map