import { type ReceizV122ZeroWriteValidationFailure } from "./v122Canonical.js";
import { type ReceizSubjectAdmissionReceiptV122, type ReceizSubjectStateV122 } from "./v122Subjects.js";
export type ReceizExactEdgeSegmentV122 = Readonly<{
    exactBytesB64u: string;
    digest: string;
}>;
export type ReceizSubjectEdgeBundleV122 = Readonly<{
    schema: "receiz.subject.edge_bundle.v122";
    proof: Readonly<ReceizExactEdgeSegmentV122 & {
        filename: string;
        mimeType: string;
        admittedProofDigest: string;
    }>;
    subjectState: ReceizSubjectStateV122;
    appendChain: readonly Readonly<ReceizExactEdgeSegmentV122 & {
        head: string;
        parentHeads: readonly string[];
    }>[];
    ownerEvidence: ReceizExactEdgeSegmentV122;
    registryArtifacts: readonly ReceizExactEdgeSegmentV122[];
    reducerArtifacts: readonly ReceizExactEdgeSegmentV122[];
    mandateHistory: readonly ReceizExactEdgeSegmentV122[];
    privateEnvelopeSegments: readonly ReceizExactEdgeSegmentV122[];
    encryptedAccessKit: ReceizExactEdgeSegmentV122 | null;
    valueProofReferences: readonly Readonly<ReceizExactEdgeSegmentV122 & {
        rail: "settlement" | "reserve";
    }>[];
    manifestDigest: string;
}>;
export type ReceizSubjectEdgeBundleVerifierV122 = Readonly<{
    knownEdgeHead?: string;
    verifyAdmissionReceipt: (receipt: ReceizSubjectAdmissionReceiptV122) => boolean | Promise<boolean>;
    verifyOwnerEvidence: (input: Readonly<{
        evidence: ReceizExactEdgeSegmentV122;
        state: ReceizSubjectStateV122;
    }>) => boolean | Promise<boolean>;
    verifyAppendChain: (input: Readonly<{
        chain: ReceizSubjectEdgeBundleV122["appendChain"];
        state: ReceizSubjectStateV122;
    }>) => boolean | Promise<boolean>;
    verifyRegistryReducerCompatibility: (input: Readonly<{
        registryArtifacts: ReceizSubjectEdgeBundleV122["registryArtifacts"];
        reducerArtifacts: ReceizSubjectEdgeBundleV122["reducerArtifacts"];
        state: ReceizSubjectStateV122;
    }>) => boolean | Promise<boolean>;
}>;
export type ReceizSubjectEdgeBundleFailureCodeV122 = "edge_bundle_invalid" | "edge_bundle_proof_invalid" | "edge_bundle_proof_digest_mismatch" | "edge_bundle_manifest_digest_mismatch" | "edge_bundle_subject_state_invalid" | "edge_bundle_segment_digest_mismatch" | "edge_bundle_owner_evidence_invalid" | "edge_bundle_append_chain_invalid" | "edge_bundle_registry_reducer_incompatible" | "edge_bundle_known_head_not_ancestor";
export type ReceizSubjectEdgeBundleVerificationResultV122 = Readonly<{
    ok: true;
    bundle: ReceizSubjectEdgeBundleV122;
}> | ReceizV122ZeroWriteValidationFailure<ReceizSubjectEdgeBundleFailureCodeV122>;
export declare function verifyReceizSubjectEdgeBundleV122(value: unknown, verifier: ReceizSubjectEdgeBundleVerifierV122): Promise<ReceizSubjectEdgeBundleVerificationResultV122>;
//# sourceMappingURL=v122EdgeBundle.d.ts.map