import { type ReceizArtifactInput } from "./artifactInput.js";
import { type ReceizV122ZeroWriteValidationFailure } from "./v122Canonical.js";
export type ReceizSubjectAdmissionInputV122 = Readonly<{
    proofObject: ReceizArtifactInput;
    ownerReceizId: string;
    idempotencyKey: string;
    expectedAbsent: true;
}>;
export type ReceizSnapshottedSubjectAdmissionInputV122 = Readonly<{
    proofObject: Readonly<{
        exactBytes: Uint8Array;
        filename: string;
        mimeType: string;
    }>;
    ownerReceizId: string;
    idempotencyKey: string;
    expectedAbsent: true;
}>;
export type ReceizSubjectAdmissionReceiptV122 = Readonly<{
    schema: "receiz.subject.admission-receipt.v122";
    subjectId: string;
    proofObjectId: string;
    admittedProofDigest: string;
    immutableProofVersion: string;
    ownerReceizId: string;
    ownerProofDigest: string;
    genesisHead: string;
    registryDigest: string;
    reducerDigest: string;
    kai: number;
    idempotencyIdentityDigest: string;
    authority: Readonly<{
        receiptIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    receiptDigest: string;
}>;
export type ReceizSubjectAdmissionSuccessV122 = Readonly<{
    ok: true;
    subjectId: string;
    head: string;
    proofDigest: string;
    registryDigest: string;
    reducerDigest: string;
    receipt: ReceizSubjectAdmissionReceiptV122;
}>;
export declare const RECEIZ_SUBJECT_ADMISSION_FAILURE_CODES_V122: readonly ["IDEMPOTENCY_CONFLICT", "SUBJECT_PROOF_CONFLICT", "SUBJECT_OWNER_CONFLICT", "INVALID_ENCLOSING_PROOF", "INVALID_OWNER_PROOF", "REGISTRY_INCOMPATIBLE", "REDUCER_INCOMPATIBLE", "EXACT_BYTES_INVALID", "UNAUTHORIZED"];
export type ReceizSubjectAdmissionFailureCodeV122 = (typeof RECEIZ_SUBJECT_ADMISSION_FAILURE_CODES_V122)[number];
export type ReceizSubjectAdmissionFailureV122 = Readonly<{
    ok: false;
    code: ReceizSubjectAdmissionFailureCodeV122;
    writes: 0;
}>;
export type ReceizSubjectAdmissionResultV122 = ReceizSubjectAdmissionSuccessV122 | ReceizSubjectAdmissionFailureV122;
export type ReceizSubjectStateV122 = Readonly<{
    schema: "receiz.subject.state.v122";
    subjectId: string;
    proofObjectId: string;
    admittedProofDigest: string;
    immutableProofVersion: string;
    subjectType: string;
    opaqueNamespaces: readonly Readonly<{
        namespace: string;
        exactBytesB64u: string;
        digest: string;
    }>[];
    genesisHead: string;
    head: string;
    ownerReceizId: string;
    ownershipHead: string;
    ownerProofDigest: string;
    registryDigest: string;
    reducerDigest: string;
    admissionReceipt: ReceizSubjectAdmissionReceiptV122;
    causalParents: readonly string[];
    accessKeyHead: string | null;
    replay: Readonly<{
        appendCursor: string;
        eventCursor: string;
    }>;
    authority: Readonly<{
        stateIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    stateDigest: string;
}>;
export type ReceizSubjectStateVerificationResultV122 = Readonly<{
    ok: true;
    state: ReceizSubjectStateV122;
}> | ReceizV122ZeroWriteValidationFailure<"subject_state_invalid" | "subject_identity_mismatch" | "subject_admission_receipt_mismatch" | "subject_admission_receipt_unauthenticated" | "subject_state_digest_mismatch" | "subject_state_unauthenticated">;
export type ReceizSubjectStateAuthenticatorV122 = Readonly<{
    authenticateAdmissionReceipt: (receipt: ReceizSubjectAdmissionReceiptV122) => boolean | Promise<boolean>;
    authenticateState: (input: Readonly<{
        state: ReceizSubjectStateV122;
        stateDigest: string;
    }>) => boolean | Promise<boolean>;
}>;
export declare function validateReceizSubjectAdmissionInputV122(value: ReceizSubjectAdmissionInputV122): Promise<ReceizSnapshottedSubjectAdmissionInputV122>;
export declare function validateReceizSubjectAdmissionResultV122(value: unknown): Promise<ReceizSubjectAdmissionResultV122>;
export declare function verifyReceizAuthenticatedSubjectStateV122(value: unknown, authenticator: ReceizSubjectStateAuthenticatorV122): Promise<ReceizSubjectStateVerificationResultV122>;
//# sourceMappingURL=v122Subjects.d.ts.map