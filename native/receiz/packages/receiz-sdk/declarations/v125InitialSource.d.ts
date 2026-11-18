import { type ReceizVerifiedCapability, type ReceizCapabilityContext } from "./capabilityAuthority.js";
import type { ReceizCommitDomainId, ReceizPlanDigest } from "./artifactTransition.js";
import { createReceizAttestationApplicationV125 } from "./v125Attestation.js";
import { type ReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import { type ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { type ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizSealedArtifact } from "./artifacts.js";
import type { ReceizAdmissionUnitOfWork } from "./admissionStore.js";
export type ReceizInitialSourcePlanV125 = Readonly<{
    schema: "receiz.initial-source-plan.v125";
    kind: "attestation" | "credential";
    resource: string;
    ownerReceizId: string;
    actorId: string;
    commitDomain: ReceizCommitDomainId;
    operation: "attestation.create" | "credential.create";
    planDigest: ReceizPlanDigest;
    confirmationDigest: string;
    idempotencyDigest: string;
    proposedGenesisHead: string;
    payloadSha256: string;
    kaiUpulse: string;
    writesPerformed: 0;
    authority: Readonly<{
        planIsProofAuthority: false;
        genesisIsAccepted: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
type Common = Readonly<{
    authority: ReceizAttestationAuthorityV125;
    verifiedActorEvidence: unknown;
    expectedDomainArtifactDigest: string;
    expectedDomainHead: string;
    kksCoordinate: unknown;
    commitDomain: ReceizCommitDomainId;
    idempotencyKey: string;
}>;
export declare function planReceizInitialAttestationSourceV125(input: Common & Readonly<{
    application: Omit<Parameters<typeof createReceizAttestationApplicationV125>[0], "domain" | "createdKai">;
}>): Promise<ReceizInitialSourcePlanV125>;
export declare function planReceizInitialCredentialSourceV125(input: Common & Readonly<{
    issuanceSource: ReceizPortableSealedArtifactV124;
    expectedIssuanceArtifactDigest: string;
    expectedIssuanceHead: string;
    verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>): Promise<ReceizInitialSourcePlanV125>;
export declare function receizInitialSourceCapabilityContextV125(plan: ReceizInitialSourcePlanV125): ReceizCapabilityContext;
export type ReceizInitialSourceSealerV125 = (input: Readonly<{
    payloadBytes: Uint8Array;
    ownerReceizId: string;
    proposedGenesisHead: string;
    kaiUpulse: string;
    predecessor: null;
}>) => Promise<ReceizSealedArtifact>;
export type ReceizInitialSourceCommitV125 = Readonly<{
    plan: ReceizInitialSourcePlanV125;
    sourceArtifact: ReceizPortableSealedArtifactV124;
}>;
export type ReceizInitialSourceStoreV125 = Readonly<{
    commitDomain: ReceizCommitDomainId;
    findInitialSource(plan: ReceizInitialSourcePlanV125): Promise<ReceizPortableSealedArtifactV124 | null>;
    commitInitialSource(unit: ReceizInitialSourceCommitV125): Promise<Readonly<{
        acceptance: "committed" | "idempotent";
        sourceArtifact: ReceizPortableSealedArtifactV124;
    }>>;
}>;
export declare function readReceizInitialSourcePlanStorageV125(plan: ReceizInitialSourcePlanV125): {
    commandDigest: string;
    idempotencyKey: string;
    aggregateId: string;
};
/** Internal store choreography: exact retained bytes are canonically reopened, never trusted by digest alone. */
export declare function verifyReceizInitialSourceCommitV125(unit: ReceizInitialSourceCommitV125, artifact: ReceizPortableSealedArtifactV124, commitDomain: ReceizCommitDomainId): Promise<ReceizAdmissionUnitOfWork>;
export declare function applyReceizInitialSourceV125(input: Readonly<{
    plan: ReceizInitialSourcePlanV125;
    confirmationDigest: string;
    capability: ReceizVerifiedCapability;
    sealer: ReceizInitialSourceSealerV125;
    store: ReceizInitialSourceStoreV125;
    verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>): Promise<{
    sourceArtifact: Readonly<{
        schema: "receiz.sealed-artifact-bytes.v124";
        exactBytesB64u: string;
        filename: string;
        mimeType: string;
        artifactSha256: string;
        payloadSha256: string;
    }>;
    projection: import("./v125Attestation.js").ReceizOpenedAttestationArtifactV125 | import("./v125Credential.js").ReceizOpenedCredentialArtifactV125;
    writesPerformed: 0 | 1;
}>;
export {};
//# sourceMappingURL=v125InitialSource.d.ts.map