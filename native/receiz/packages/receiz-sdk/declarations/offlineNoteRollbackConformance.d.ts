export declare const RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA: "receiz.offline-note.pwa-rollback-conformance.v1";
export type ReceizOfflineNoteRollbackCredential = Readonly<{
    credentialIdB64u: string;
    custodyPublicKeyRawB64u: string;
    rpId: string;
    origin: string;
}>;
export type ReceizOfflineNoteRollbackAssertion = Readonly<{
    authenticatorDataB64u: string;
    clientDataJSONB64u: string;
    signatureB64u: string;
}>;
export interface ReceizOfflineNoteRollbackAssertionClient {
    assert(input: Readonly<{
        credentialIdB64u: string;
        challengeB64u: string;
    }>): Promise<ReceizOfflineNoteRollbackAssertion>;
}
export type ReceizOfflineNoteRollbackConformanceEvidenceV1 = Readonly<{
    schema: typeof RECEIZ_OFFLINE_NOTE_ROLLBACK_CONFORMANCE_SCHEMA;
    nonceB64u: string;
    firstDigest: string;
    firstAssertionDigest: string;
    secondDigest: string;
    firstAssertion: ReceizOfflineNoteRollbackAssertion;
    secondAssertion: ReceizOfflineNoteRollbackAssertion;
    initialStateSequence: string;
    conformedStateSequence: string;
    conformanceEvidenceDigest: string;
}>;
export declare function runReceizOfflineNoteRollbackConformance(input: Readonly<{
    credential: ReceizOfflineNoteRollbackCredential;
    webAuthn: ReceizOfflineNoteRollbackAssertionClient;
    registrationCounter: string;
}>): Promise<ReceizOfflineNoteRollbackConformanceEvidenceV1>;
export declare function verifyReceizOfflineNoteRollbackConformanceEvidence(input: Readonly<{
    evidence: ReceizOfflineNoteRollbackConformanceEvidenceV1;
    credential: ReceizOfflineNoteRollbackCredential;
    registrationCounter: string;
}>): Promise<ReceizOfflineNoteRollbackConformanceEvidenceV1>;
//# sourceMappingURL=offlineNoteRollbackConformance.d.ts.map