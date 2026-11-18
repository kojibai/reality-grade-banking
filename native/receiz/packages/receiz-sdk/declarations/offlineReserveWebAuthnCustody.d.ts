import { type ReceizOfflineNoteCustodyQualificationV1 } from "./offlineNoteIrreversibleCustody.js";
export declare const RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_SCHEMA: "receiz.offline-reserve.webauthn-consumption.v1";
export type ReceizOfflineReserveWebAuthnConsumptionBasisV1 = Readonly<{
    schema: typeof RECEIZ_OFFLINE_RESERVE_WEBAUTHN_CONSUMPTION_SCHEMA;
    qualificationDigest: string;
    profileId: string;
    profileEvidenceDigest: string;
    custodyPublicKeyRawB64u: string;
    installationCommitment: string;
    predecessorAccountPortableStateDigest: string;
    successorReserveStateContentDigest: string;
    noteArtifactSha256: string;
    amountPhiMicro: string;
    amountUsdCents: string;
    usdPerPhiMicrocents: string;
    reserveBeforePhiMicro: string;
    reserveAfterPhiMicro: string;
    reserveBeforeUsdCents: string;
    reserveAfterUsdCents: string;
    acceptedAtKai: string;
    transitionNonce: string;
    expectedReserveStateCommitment: string;
    nextReserveStateCommitment: string;
    expectedReserveStateSequence: string;
    nextReserveStateSequence: string;
    rpId: string;
    origin: string;
}>;
export type ReceizOfflineReservePreparedWebAuthnConsumptionV1 = Readonly<{
    qualification: ReceizOfflineNoteCustodyQualificationV1;
    basis: ReceizOfflineReserveWebAuthnConsumptionBasisV1;
    receiptDigest: string;
    challengeB64u: string;
}>;
export type ReceizOfflineReserveWebAuthnConsumptionReceiptV1 = ReceizOfflineReserveWebAuthnConsumptionBasisV1 & Readonly<{
    receiptDigest: string;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>;
export declare function prepareReceizOfflineReserveWebAuthnConsumptionChallenge(input: Readonly<{
    qualification: ReceizOfflineNoteCustodyQualificationV1;
    predecessorAccountPortableStateDigest: string;
    successorReserveStateContentDigest: string;
    noteArtifactSha256: string;
    amountPhiMicro: string;
    amountUsdCents: string;
    usdPerPhiMicrocents: string;
    reserveBeforePhiMicro: string;
    reserveAfterPhiMicro: string;
    reserveBeforeUsdCents: string;
    reserveAfterUsdCents: string;
    acceptedAtKai: string;
    transitionNonce: string;
    expectedReserveStateCommitment: string;
    nextReserveStateCommitment: string;
    expectedReserveStateSequence: string;
    nextReserveStateSequence: string;
    rpId: string;
    origin: string;
}>): Promise<ReceizOfflineReservePreparedWebAuthnConsumptionV1>;
export declare function finalizeReceizOfflineReserveWebAuthnConsumptionReceipt(input: Readonly<{
    prepared: ReceizOfflineReservePreparedWebAuthnConsumptionV1;
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>): Promise<ReceizOfflineReserveWebAuthnConsumptionReceiptV1>;
export declare function verifyReceizOfflineReserveWebAuthnConsumptionReceipt(candidate: unknown): Promise<ReceizOfflineReserveWebAuthnConsumptionReceiptV1>;
//# sourceMappingURL=offlineReserveWebAuthnCustody.d.ts.map