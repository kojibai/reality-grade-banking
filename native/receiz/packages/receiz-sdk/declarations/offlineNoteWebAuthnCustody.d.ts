import { type ReceizOfflineNoteCustodyQualificationV1 } from "./offlineNoteIrreversibleCustody.js";
export declare const RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_SCHEMA: "receiz.offline-note.webauthn-consumption.v1";
export declare const RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_SCHEMA: "receiz.offline-note.webauthn-activation.v1";
type WebAuthnConsumptionBasis = Readonly<{
    schema: typeof RECEIZ_OFFLINE_NOTE_WEBAUTHN_CONSUMPTION_SCHEMA;
    qualificationDigest: string;
    profileId: string;
    profileEvidenceDigest: string;
    adapterKind: "pwa-webauthn";
    custodyPublicKeyAlgorithm: "P-256";
    custodyPublicKeyRawB64u: string;
    installationCommitment: string;
    noteId: string;
    predecessorArtifactSha256: string;
    currentCustodyCommitmentDigest: string;
    expectedStateCommitment: string;
    consumedStateCommitment: string;
    expectedStateSequence: string;
    consumedStateSequence: string;
    receiverCustodyCommitmentDigest: string;
    wholeValuePhiMicro: string;
    acceptedAtKai: string;
    successorBasisDigest: string;
    rpId: string;
    origin: string;
    activationReceipt: ReceizOfflineNoteWebAuthnActivationReceiptV1;
}>;
export type ReceizOfflineNotePreparedWebAuthnConsumptionV1 = Readonly<{
    qualification: ReceizOfflineNoteCustodyQualificationV1;
    basis: WebAuthnConsumptionBasis;
    receiptDigest: string;
    challengeB64u: string;
}>;
export type ReceizOfflineNoteWebAuthnConsumptionReceiptV1 = WebAuthnConsumptionBasis & Readonly<{
    receiptDigest: string;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>;
type WebAuthnActivationBasis = Readonly<{
    schema: typeof RECEIZ_OFFLINE_NOTE_WEBAUTHN_ACTIVATION_SCHEMA;
    qualificationDigest: string;
    profileId: string;
    profileEvidenceDigest: string;
    adapterKind: "pwa-webauthn";
    custodyPublicKeyAlgorithm: "P-256";
    custodyPublicKeyRawB64u: string;
    installationCommitment: string;
    noteId: string;
    verifiedSuccessorArtifactSha256: string;
    receivingCustodyCommitmentDigest: string;
    expectedStateCommitment: string;
    activeStateCommitment: string;
    expectedStateSequence: string;
    activeStateSequence: string;
    wholeValuePhiMicro: string;
    acceptedAtKai: string;
    rpId: string;
    origin: string;
}>;
export type ReceizOfflineNotePreparedWebAuthnActivationV1 = Readonly<{
    qualification: ReceizOfflineNoteCustodyQualificationV1;
    basis: WebAuthnActivationBasis;
    receiptDigest: string;
    challengeB64u: string;
}>;
export type ReceizOfflineNoteWebAuthnActivationReceiptV1 = WebAuthnActivationBasis & Readonly<{
    receiptDigest: string;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>;
export type ReceizVerifiedOfflineNoteWebAuthnAssertion = Readonly<{
    signCount: number;
    flags: number;
}>;
export declare function verifyReceizOfflineNoteWebAuthnAssertion(input: Readonly<{
    custodyPublicKeyRawB64u: string;
    rpId: string;
    origin: string;
    challengeB64u: string;
    expectedSignCount: string;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>): Promise<ReceizVerifiedOfflineNoteWebAuthnAssertion>;
export declare function prepareReceizOfflineNoteWebAuthnActivationChallenge(input: Readonly<{
    qualification: ReceizOfflineNoteCustodyQualificationV1;
    noteId: string;
    verifiedSuccessorArtifactSha256: string;
    receivingCustodyCommitmentDigest: string;
    expectedStateCommitment: string;
    activeStateCommitment: string;
    expectedStateSequence: string;
    activeStateSequence: string;
    wholeValuePhiMicro: string;
    acceptedAtKai: string;
    rpId: string;
    origin: string;
}>): Promise<ReceizOfflineNotePreparedWebAuthnActivationV1>;
export declare function finalizeReceizOfflineNoteWebAuthnActivationReceipt(input: Readonly<{
    prepared: ReceizOfflineNotePreparedWebAuthnActivationV1;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>): Promise<ReceizOfflineNoteWebAuthnActivationReceiptV1>;
export declare function verifyReceizOfflineNoteWebAuthnActivationReceipt(candidate: unknown): Promise<ReceizOfflineNoteWebAuthnActivationReceiptV1>;
export declare function prepareReceizOfflineNoteWebAuthnConsumptionChallenge(input: Readonly<{
    qualification: ReceizOfflineNoteCustodyQualificationV1;
    activationReceipt: ReceizOfflineNoteWebAuthnActivationReceiptV1;
    noteId: string;
    predecessorArtifactSha256: string;
    currentCustodyCommitmentDigest: string;
    expectedStateCommitment: string;
    consumedStateCommitment: string;
    expectedStateSequence: string;
    consumedStateSequence: string;
    receiverCustodyCommitmentDigest: string;
    wholeValuePhiMicro: string;
    acceptedAtKai: string;
    successorBasisDigest: string;
    rpId: string;
    origin: string;
}>): Promise<ReceizOfflineNotePreparedWebAuthnConsumptionV1>;
export declare function finalizeReceizOfflineNoteWebAuthnConsumptionReceipt(input: Readonly<{
    prepared: ReceizOfflineNotePreparedWebAuthnConsumptionV1;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>): Promise<ReceizOfflineNoteWebAuthnConsumptionReceiptV1>;
export declare function verifyReceizOfflineNoteWebAuthnConsumptionReceipt(candidate: unknown): Promise<ReceizOfflineNoteWebAuthnConsumptionReceiptV1>;
export {};
//# sourceMappingURL=offlineNoteWebAuthnCustody.d.ts.map