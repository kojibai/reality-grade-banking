import { prepareReceizSubjectSourceProofObjectCandidateV124 } from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
/** Explicit initial issuance only; this never migrates an already sealed history. */
export declare function prepareReceizInitialTemporalSubjectSourceV125(input: Readonly<{
    initialSource: true;
    subject: Parameters<typeof prepareReceizSubjectSourceProofObjectCandidateV124>[0];
    kksCoordinate: unknown;
}>): Promise<Readonly<{
    proofObject: Readonly<{
        payload: Readonly<{
            bytes: Uint8Array<ArrayBufferLike>;
            mimeType: typeof import("./v124ReplayProofObject.js").RECEIZ_V124_PORTABLE_PROOF_OBJECT_MIME;
        }>;
        assetType: "proof_object";
    }>;
    schema: "receiz.subject-source-proof-object-candidate.v124";
    carrier: import("./v124ReplayProofObject.js").ReceizViewerSubjectSourceCarrierV124;
    portableAssetDigest: string;
    authority: Readonly<{
        candidateIsSubjectAuthority: false;
        sealed: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>>;
/** Both the embedded immutable subject and carried history derive from this exact seal. */
export declare function readReceizTemporalSubjectSourceV125(artifact: ReceizPortableSealedArtifactV124): Promise<{
    source: Readonly<{
        schema: "receiz.viewer-subject-source-read.v124";
        status: "verified-source";
        artifact: ReceizPortableSealedArtifactV124;
        artifactSha256: string;
        artifactKaiPulse: number;
        carrier: import("./v124ReplayProofObject.js").ReceizViewerSubjectSourceCarrierV124;
        subjectState: import("./v122Subjects.js").ReceizSubjectStateV122;
        ownership: import("./portableAssetReader.js").ReceizPortableAssetDocument["ownership"];
        provenance: import("./portableAssetReader.js").ReceizPortableAssetDocument["provenance"];
        authority: Readonly<{
            sourceReadIsSubjectAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>;
    admission: import("./artifactAdmissionTypes.js").ReceizVerifiedPortableStateAdmission;
    head: string;
    coordinate: Readonly<{
        schema: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA;
        kksVersion: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_VERSION;
        kaiPulse: string;
        kaiUpulse: string;
        source: import("./v125KaiAuthority.js").ReceizKksV1CoordinateSource;
        kaiSigil: import("./v125KaiAuthority.js").ReceizKaiSigilTemporalProofV1;
        authority: Readonly<{
            temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
            intrinsicProof: "kaisigil-blake3-poseidon-groth16";
            causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse";
            chronosRole: "descriptive-projection-only";
            createdAtAuthority: false;
            networkRequired: false;
        }>;
    }>;
}>;
//# sourceMappingURL=v125SubjectSource.d.ts.map