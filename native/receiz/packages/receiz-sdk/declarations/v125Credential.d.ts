import type { ReceizArtifactAppendPlan, ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import { type ReceizSealedLifecycleContextV125, type ReceizSealedLifecycleExecutionV125 } from "./v125SealedLifecycle.js";
import { type ReceizIdentityLoginProof } from "./identity.js";
import { type ReceizCompositeMerkleSibling } from "./compositeProofKernel.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { type ReceizAttestationActorAuthorizationV125, type ReceizAttestationAuthorityV125, type ReceizAttestationIssuanceEvidenceV125 } from "./v125Attestation.js";
import { type ReceizAttestationDisclosureV125, type ReceizAttestationDomainV125, type ReceizClaimSetV125 } from "./v125AttestationSchemas.js";
import { type ReceizV125EnclosingArtifactBinding, type ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
export type ReceizCredentialIssuanceCoreV125 = Readonly<{
    attestation: ReceizAttestationIssuanceEvidenceV125;
    proofObjectId: string;
    predecessorCredentialId: string | null;
    custodyHead: string;
}>;
export type ReceizCredentialPredecessorLifecycleAdmissionV125 = Readonly<{
    issuance: ReceizCredentialIssuanceInputV125;
    credential: ReceizCredentialV125;
    events: readonly ReceizCredentialLifecycleEventV125[];
}>;
export type ReceizCredentialIssuanceInputV125 = ReceizCredentialIssuanceCoreV125 & Readonly<{
    predecessorLifecycle: ReceizCredentialPredecessorLifecycleAdmissionV125 | null;
}>;
export type ReceizCredentialClaimLeafV125 = Readonly<{
    name: string;
    disclosure: ReceizAttestationDisclosureV125;
    valueCommitment: string;
    evidenceIds: readonly string[];
    leafDigest: string;
    witness: readonly ReceizCompositeMerkleSibling[];
}>;
export type ReceizCredentialClaimTreeV125 = Readonly<{
    schema: "receiz.credential.claim-tree.v125";
    domainId: string;
    credentialType: string;
    subjectId: string;
    root: string;
    leaves: readonly ReceizCredentialClaimLeafV125[];
}>;
export type ReceizOpenedCredentialArtifactV125 = ReceizV125EnclosingArtifactBinding & Readonly<{
    schema: "receiz.opened-credential-artifact.v125";
    issuance: ReceizCredentialIssuanceInputV125;
    acceptedHead: string;
    history: ReceizCredentialHistoryV125;
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialLifecycleEventKindV125 = "renewed" | "suspended" | "revoked" | "replaced" | "expired";
export type ReceizCredentialV125 = Readonly<{
    schema: "receiz.credential.v125";
    credentialId: string;
    proofObjectId: string;
    domainId: string;
    credentialType: string;
    subjectId: string;
    holderReceizId: string;
    issuerReceizId: string;
    holderRole: string;
    issuerRole: string;
    holderAuthorizedKai: string;
    issuerAuthorizedKai: string;
    registryDigest: string;
    domainDigest: string;
    claimRoot: string;
    claimSetDigest: string;
    claimSetHead: string;
    applicationId: string;
    applicationDigest: string;
    applicationHead: string;
    evidenceBundleDigest: string;
    evidenceHead: string;
    evaluationDigest: string | null;
    reviewDigest: string | null;
    approvalDigests: readonly string[];
    approverReceizIds: readonly string[];
    issuanceDigest: string;
    decisionHead: string;
    issuedKai: string;
    validFromKai: string;
    expiresAtKai: string | null;
    predecessorCredentialId: string | null;
    predecessorLifecycleHead: string | null;
    predecessorLifecycleKai: string | null;
    predecessorLifecycleIntentDigest: string | null;
    successorCredentialId: null;
    holderAuthorization: ReceizAttestationActorAuthorizationV125;
    issuerAuthorization: ReceizAttestationActorAuthorizationV125;
    custody: Readonly<{
        holderReceizId: string;
        custodyHead: string;
    }>;
    provenance: Readonly<{
        applicationId: string;
        applicationDigest: string;
        applicationHead: string;
        attestationHistoryRoot: string;
    }>;
    acceptedHead: string;
    historyRoot: string;
    authority: Readonly<{
        strongerTruth: "sealed-receiz-proof-object";
        currentnessProjectionIsAuthority: false;
    }>;
}>;
export type ReceizCredentialLifecycleEventV125 = Readonly<{
    schema: "receiz.credential.lifecycle-event.v125";
    kind: ReceizCredentialLifecycleEventKindV125;
    credentialId: string;
    domainId: string;
    credentialType: string;
    actorReceizId: string;
    actorRole: string;
    actorAuthorization: ReceizAttestationActorAuthorizationV125;
    actorProof: ReceizIdentityLoginProof;
    expectedPriorHead: string;
    eventKai: string;
    idempotencyKey: string;
    successorIntentDigest: string | null;
    successorProofObjectId: string | null;
    successorIssuanceCore: ReceizCredentialIssuanceCoreV125 | null;
    eventDigest: string;
}>;
export type ReceizCredentialLifecycleEventInputV125 = Readonly<{
    kind: ReceizCredentialLifecycleEventKindV125;
    credentialId: string;
    domainId: string;
    credentialType: string;
    actorReceizId: string;
    actorRole: string;
    actorAuthorization: ReceizAttestationActorAuthorizationV125;
    actorProof: ReceizIdentityLoginProof;
    expectedPriorHead: string;
    eventKai: string;
    idempotencyKey: string;
    successor: ReceizCredentialIssuanceCoreV125 | null;
}>;
export type ReceizCredentialStatusV125 = "issued" | "suspended" | "revoked" | "replaced" | "expired";
export type ReceizCredentialHistoryV125 = Readonly<{
    schema: "receiz.credential.history.v125";
    domain: ReceizAttestationDomainV125;
    credential: ReceizCredentialV125;
    credentialId: string;
    status: ReceizCredentialStatusV125;
    acceptedHead: string;
    historyRoot: string;
    latestKai: string;
    successorIntentDigest: string | null;
    events: readonly ReceizCredentialLifecycleEventV125[];
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialLifecycleEventPlanV125 = Readonly<{
    schema: "receiz.credential.lifecycle-plan.v125";
    transitionPlan?: ReceizArtifactAppendPlan;
    event: ReceizCredentialLifecycleEventV125;
    planIdentity: string;
    confirmationDigest: string;
    confirmationRequired: true;
    writesPerformed: 0;
    authority: Readonly<{
        planIsAdmission: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialLifecycleEventApplyV125 = Readonly<{
    schema: "receiz.credential.lifecycle-apply.v125";
    state: ReceizCredentialHistoryV125;
    history: readonly ReceizCredentialLifecycleEventV125[];
    append: ReceizCredentialLifecycleEventV125;
    sourceArtifact: ReceizPortableSealedArtifactV124;
    committedTransition: ReceizCommittedArtifactTransition;
    writesPerformed: 0 | 1;
    authority: Readonly<{
        applyIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialCurrentnessStatusV125 = "current" | "expired" | "suspended" | "revoked" | "replaced" | "head-behind" | "invalid";
export type ReceizCredentialCurrentnessV125 = Readonly<{
    schema: "receiz.credential.currentness.v125";
    status: ReceizCredentialCurrentnessStatusV125;
    credentialId: string;
    presentedHead: string;
    acceptedHead: string;
    credentialValid: boolean;
}>;
export declare class ReceizCredentialZeroWriteErrorV125 extends TypeError {
    readonly code: string;
    readonly writesPerformed: 0;
    constructor(code: string);
}
export declare function createReceizCredentialLifecycleEventActorChallengeV125(input: Omit<ReceizCredentialLifecycleEventInputV125, "actorProof">): string;
export declare function createReceizCredentialClaimTreeV125(input: Readonly<{
    domain: ReceizAttestationDomainV125;
    claimSet: ReceizClaimSetV125;
}>): Promise<ReceizCredentialClaimTreeV125>;
export declare function createReceizCredentialV125(input: ReceizCredentialIssuanceInputV125, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialV125>;
export declare function verifyReceizCredentialHistoryV125(input: Readonly<{
    issuance: ReceizCredentialIssuanceInputV125;
    credential: ReceizCredentialV125;
    events: readonly ReceizCredentialLifecycleEventV125[];
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialHistoryV125>;
export declare function verifyAndOpenReceizCredentialArtifactV125(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizOpenedCredentialArtifactV125>;
export declare function planReceizCredentialLifecycleEventV125(input: Readonly<{
    sealedSource?: ReceizSealedLifecycleContextV125;
    issuance: ReceizCredentialIssuanceInputV125;
    credential: ReceizCredentialV125;
    events: readonly ReceizCredentialLifecycleEventV125[];
    event: ReceizCredentialLifecycleEventInputV125;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialLifecycleEventPlanV125>;
export declare function applyReceizCredentialLifecycleEventV125(input: ReceizSealedLifecycleExecutionV125 & Readonly<{
    issuance: ReceizCredentialIssuanceInputV125;
    credential: ReceizCredentialV125;
    events: readonly ReceizCredentialLifecycleEventV125[];
    plan: ReceizCredentialLifecycleEventPlanV125;
    confirmationDigest: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialLifecycleEventApplyV125>;
export declare function resolveReceizCredentialCurrentnessV125(input: Readonly<{
    issuance: ReceizCredentialIssuanceInputV125;
    credential: ReceizCredentialV125;
    verifiedHistory: ReceizCredentialHistoryV125;
    presentedHead: string;
    selectedKai: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialCurrentnessV125>;
//# sourceMappingURL=v125Credential.d.ts.map