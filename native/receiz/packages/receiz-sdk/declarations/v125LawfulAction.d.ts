import { type ReceizLawExpression } from "./constitution.js";
import { type ReceizGlobalProofChildReferenceV119 } from "./globalEconomyTransport.js";
import { type ReceizPortableExecutionAuthorityVerifierOptionsV124 } from "./v124PortableAuthority.js";
import { RECEIZ_V125_ACTION_REGISTRY_BINDING_LAW_ID, RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID, deriveReceizLawfulActionPhiMicroV125, serializeReceizLawfulActionV125, validateReceizLawfulActionAdmissionV125, validateReceizLawfulActionExecutionV125, validateReceizLawfulActionLawV125, validateReceizLawfulActionProofV125, validateReceizLawfulActionValueHeadV125, type ReceizLawfulActionAdmissionReceiptV125, type ReceizLawfulActionExecutionV125, type ReceizLawfulActionLawV125, type ReceizLawfulActionProofV125, type ReceizLawfulActionValueHeadV125 } from "./v125LawfulActionSchemas.js";
export type ReceizRegisteredLawfulActionLawV125 = Readonly<{
    schema: "receiz.registered-lawful-action-law-runtime.v125";
    law: ReceizLawfulActionLawV125;
    enclosingLawArtifactDigest: string;
    lawCustodianReceizId: string;
    authority: Readonly<{
        runtimeCustodyRequired: true;
        registrationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
        currentRegistryBound: true;
    }>;
}>;
export type ReceizVerifiedLawfulActionV125 = Readonly<{
    schema: "receiz.verified-lawful-action-runtime.v125";
    proof: ReceizLawfulActionProofV125;
    enclosingArtifactDigest: string;
    enclosingArtifactId: string;
    admissionEvidenceRoot: string;
    currentOwnerReceizId: string;
    genesisOwnerReceizId: string;
    ownershipHistoryDigest: string;
    ownershipAppendCount: number;
    priorOwnershipHistoryDigest: string | null;
    authority: Readonly<{
        runtimeCustodyRequired: true;
        enclosingProofVerifiedFirst: true;
        institutionSubjectToSameProofLaw: true;
        causalCompletionVerified: true;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizLawfulActionAdmissionCandidateV125 = Readonly<{
    proofDigest: string;
    enclosingArtifactId: string;
    membershipId: string;
    currentOwnerReceizId: string;
    priorAdmissionDigest: string | null;
    idempotencyKey: string;
    admissionDigest: string;
}>;
export type ReceizLawfulActionAdmissionStoreResultV125 = Readonly<{
    status: "admitted";
}> | Readonly<{
    status: "duplicate";
    existingAdmissionDigest: string;
}> | Readonly<{
    status: "conflict";
    existingAdmissionDigest: string;
}>;
export type ReceizLawfulActionAdmissionStoreV125 = Readonly<{
    admit(candidate: ReceizLawfulActionAdmissionCandidateV125): Promise<ReceizLawfulActionAdmissionStoreResultV125>;
    advance(candidate: ReceizLawfulActionAdmissionCandidateV125): Promise<ReceizLawfulActionAdmissionStoreResultV125>;
}>;
export type ReceizAdmittedLawfulActionV125 = Readonly<{
    status: "admitted";
    receipt: ReceizLawfulActionAdmissionReceiptV125;
}>;
export type ReceizLawfulActionAdmissionResultV125 = ReceizAdmittedLawfulActionV125 | Readonly<{
    status: "zero-write";
    code: "ACTION_DUPLICATE" | "ACTION_MEMBERSHIP_CONFLICT" | "ACTION_CUSTODY_HEAD_CONFLICT";
    writesPerformed: 0;
    existingAdmissionDigest: string;
}>;
export declare function createReceizLawfulActionLawV125(input: Readonly<{
    lawId: string;
    domain: string;
    actionType: string;
    registryDigest: string;
    registryBindingLawId: typeof RECEIZ_V125_ACTION_REGISTRY_BINDING_LAW_ID;
    actorRule: "verified-receiz-id";
    custodyRule: "canonical-current-owner";
    causalPreconditions: readonly ReceizLawExpression[];
    permittedTransition: ReceizLawExpression;
    completionWitness: "sealed-output-commitment";
    duplicateRule: "one-admission-per-proof-digest";
    conservationRule: "one-spendable-membership-per-enclosing-artifact";
    idempotencyRule: "proof-digest-and-causal-heads";
    verifierBinding: "receiz.artifact-admission.v112";
    causalVerifierBinding: "receiz.portable-execution-authority.v124";
    universalValueLawId: typeof RECEIZ_V125_UNIVERSAL_VALUE_LAW_ID;
}>): Promise<ReceizLawfulActionLawV125>;
export declare function registerReceizLawfulActionLawV125(input: Readonly<{
    law: ReceizLawfulActionLawV125;
    enclosingArtifactAdmission: unknown;
}>): Promise<ReceizRegisteredLawfulActionLawV125>;
export declare function planReceizLawfulActionProofV125(input: Readonly<{
    registeredLaw: ReceizRegisteredLawfulActionLawV125;
    causalCompletionEvidence: unknown;
    causalCompletionVerifierOptions: ReceizPortableExecutionAuthorityVerifierOptionsV124;
}>): Promise<ReceizLawfulActionProofV125>;
export declare function verifyReceizLawfulActionProofV125(input: Readonly<{
    registeredLaw: ReceizRegisteredLawfulActionLawV125;
    proof: ReceizLawfulActionProofV125;
    enclosingArtifactAdmission: unknown;
    causalCompletionVerifierOptions: ReceizPortableExecutionAuthorityVerifierOptionsV124;
}>): Promise<ReceizVerifiedLawfulActionV125>;
export declare function deriveReceizLawfulActionGlobalChildReferenceV125(verifiedAction: ReceizVerifiedLawfulActionV125): ReceizGlobalProofChildReferenceV119;
export declare function createReceizLawfulActionAdmissionStoreV125(): ReceizLawfulActionAdmissionStoreV125;
export declare function admitReceizLawfulActionV125(input: Readonly<{
    verifiedAction: ReceizVerifiedLawfulActionV125;
    store: ReceizLawfulActionAdmissionStoreV125;
}>): Promise<ReceizLawfulActionAdmissionResultV125>;
export declare function advanceReceizLawfulActionCustodyV125(input: Readonly<{
    priorAdmission: ReceizAdmittedLawfulActionV125;
    verifiedAction: ReceizVerifiedLawfulActionV125;
    store: ReceizLawfulActionAdmissionStoreV125;
}>): Promise<ReceizLawfulActionAdmissionResultV125>;
export declare function deriveReceizLawfulActionValueHeadV125(input: Readonly<{
    admission: ReceizAdmittedLawfulActionV125;
    valuationKai: string;
    priorValueHead: ReceizLawfulActionValueHeadV125 | null;
}>): Promise<ReceizLawfulActionValueHeadV125>;
export declare function planReceizLawfulActionSettlementV125(input: Readonly<{
    valueHead: ReceizLawfulActionValueHeadV125;
    amountPhiMicro: string;
    destinationSubjectId: string;
    expectedDestinationHead: string;
    usdPerPhiMicrocents: string;
    priceBasis: unknown;
}>): Promise<ReceizLawfulActionExecutionV125>;
export { deriveReceizLawfulActionPhiMicroV125, serializeReceizLawfulActionV125, validateReceizLawfulActionAdmissionV125, validateReceizLawfulActionExecutionV125, validateReceizLawfulActionLawV125, validateReceizLawfulActionProofV125, validateReceizLawfulActionValueHeadV125, };
export type { ReceizLawfulActionAdmissionReceiptV125, ReceizLawfulActionExecutionV125, ReceizLawfulActionLawV125, ReceizLawfulActionProofV125, ReceizLawfulActionValueHeadV125, };
//# sourceMappingURL=v125LawfulAction.d.ts.map