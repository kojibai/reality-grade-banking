import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
export declare const RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA: "receiz.offline-note.platform-attestation-certificate.v1";
declare const TRUSTED_FORMATS: readonly ["apple", "android-key", "packed", "tpm", "fido-u2f"];
export type ReceizOfflineNotePlatformAttestationFormat = (typeof TRUSTED_FORMATS)[number];
export type ReceizOfflineNotePlatformAttestationCertificateV1 = Readonly<{
    schema: typeof RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_SCHEMA;
    attestationFormat: ReceizOfflineNotePlatformAttestationFormat;
    aaguid: string;
    rpId: string;
    origin: string;
    credentialIdB64u: string;
    custodyPublicKeyAlgorithm: "P-256";
    custodyPublicKeyRawB64u: string;
    attestationObjectSha256: string;
    registrationCounter: string;
    credentialDeviceType: "singleDevice";
    credentialBackedUp: false;
    userVerified: true;
    issuedAtKai: string;
    issuerKid: string;
    certificateDigest: string;
    signatureB64u: string;
}>;
export declare function createReceizOfflineNotePlatformAttestationCertificate(input: Readonly<{
    attestationFormat: ReceizOfflineNotePlatformAttestationFormat;
    aaguid: string;
    rpId: string;
    origin: string;
    credentialIdB64u: string;
    custodyPublicKeyRawB64u: string;
    attestationObjectSha256: string;
    registrationCounter: string;
    credentialDeviceType: "singleDevice";
    credentialBackedUp: false;
    userVerified: true;
    issuedAtKai: string;
    issuerKid: string;
    sign(bytes: Uint8Array): Promise<ArrayBuffer | Uint8Array>;
}>): Promise<ReceizOfflineNotePlatformAttestationCertificateV1>;
export declare function verifyReceizOfflineNotePlatformAttestationCertificate(candidate: unknown, options: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    expectedRpId: string;
    expectedOrigin: string;
    expectedCustodyPublicKeyRawB64u: string;
}>): Promise<ReceizOfflineNotePlatformAttestationCertificateV1>;
export {};
//# sourceMappingURL=offlineNotePlatformAttestation.d.ts.map