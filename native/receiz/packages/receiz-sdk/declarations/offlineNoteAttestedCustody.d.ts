import { type ReceizOfflineNoteCustodyQualificationV1 } from "./offlineNoteIrreversibleCustody.js";
import { type ReceizOfflineNotePlatformAttestationCertificateV1 } from "./offlineNotePlatformAttestation.js";
import { type ReceizOfflineNoteRollbackConformanceEvidenceV1 } from "./offlineNoteRollbackConformance.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
export declare const RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA: "receiz.offline-note.attested-receiving-custody.v2";
export type ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2 = Readonly<{
    schema: typeof RECEIZ_OFFLINE_NOTE_ATTESTED_RECEIVING_CUSTODY_SCHEMA;
    qualificationDigest: string;
    profileId: string;
    profileEvidenceDigest: string;
    adapterKind: "pwa-webauthn";
    custodyPublicKeyAlgorithm: "P-256";
    custodyPublicKeyRawB64u: string;
    installationCommitment: string;
    stateCommitment: string;
    stateSequence: string;
    platformAttestationCertificate: ReceizOfflineNotePlatformAttestationCertificateV1;
    rollbackConformanceEvidence: ReceizOfflineNoteRollbackConformanceEvidenceV1;
    receivingCustodyCommitmentDigest: string;
}>;
export declare function createReceizOfflineNoteAttestedReceivingCustodyCommitment(input: Readonly<{
    qualification: ReceizOfflineNoteCustodyQualificationV1;
    platformAttestationCertificate: ReceizOfflineNotePlatformAttestationCertificateV1;
    rollbackConformanceEvidence: ReceizOfflineNoteRollbackConformanceEvidenceV1;
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2>;
export declare function verifyReceizOfflineNoteAttestedReceivingCustodyCommitment(candidate: unknown, options?: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2>;
export declare function deriveReceizOfflineNoteAttestedCustodyOwnerId(commitmentInput: ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2, options?: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<`c_${string}.receiz.id`>;
//# sourceMappingURL=offlineNoteAttestedCustody.d.ts.map