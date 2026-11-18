import { type ReceizPortableStateSegmentComposite } from "./portableStateSegments.js";
export declare const RECEIZ_KEY_SCHEMA = "receiz.key.v1";
export declare const RECEIZ_KEY_NAME = "Receiz Key";
export declare const RECEIZ_ACCOUNT_STATE_SCHEMA = "receiz.account.state.v3";
export declare const RECEIZ_DEVICE_IDENTITY_SCHEMA = "receiz.device.identity.v1";
export declare const RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA = "receiz.identity.login_proof.v1";
export declare const RECEIZ_IDENTITY_ACCOUNT_PROJECTION_SCHEMA = "receiz.sdk.identity_account_projection.v1";
export declare const RECEIZ_IDENTITY_RECORD_KEY_CHUNK_KEY = "receiz.identity_record.keyfile.v1";
export type ReceizIdentityKeyAlgorithm = "Ed25519" | "P-256";
export type ReceizPortableStateProofMethod = "ed25519.jcs.v1" | "ecdsa-p256-sha256.jcs.v1";
export type ReceizIdentityPublicKeyProjection = Readonly<{
    keyId: string;
    alg: ReceizIdentityKeyAlgorithm;
    publicKeyRawB64u: string;
}>;
export type ReceizIdentityPublicKeyProjectionSignatureInput = Readonly<{
    keyId: string;
    alg: ReceizIdentityKeyAlgorithm;
    publicKeyRawB64u: string;
    challengeB64Url: string;
    signatureB64Url: string;
}>;
export type ReceizKeyOwner = {
    uid: string;
    email: string | null;
    username: string | null;
    displayName: string | null;
};
export type ReceizPortableStateProof = {
    method: ReceizPortableStateProofMethod;
    digestSha256Hex: string;
    signatureB64u: string;
    signedAt: string;
};
export type ReceizPortableState = {
    schema: string;
    exportedAt: string;
    snapshot: unknown;
    segmented?: ReceizPortableStateSegmentComposite | null;
    proof: ReceizPortableStateProof | null;
};
export type ReceizKeyAttestation = {
    pbiDecision: string;
    pbiReceiptHash: string;
    pbiChallengeId: string;
    pbiRequestId: string | null;
    attestedAt: string;
    pbiSignedKaiMicroPulse: string | null;
};
export type ReceizKeyFileV1 = {
    schema: typeof RECEIZ_KEY_SCHEMA;
    name: typeof RECEIZ_KEY_NAME;
    version: 1;
    issuedAt: string;
    keyId: string;
    alg: ReceizIdentityKeyAlgorithm;
    owner: ReceizKeyOwner;
    crypto: {
        publicKeyRawB64u: string;
        privateKeyPkcs8CiphertextB64u: string;
        privateKeyPkcs8B64u?: string | null;
        kdf: {
            name: "PBKDF2-SHA256";
            iterations: number;
            saltB64u: string;
        };
        cipher: {
            name: "AES-GCM-256";
            ivB64u: string;
            aad: string;
        };
    };
    attestation: ReceizKeyAttestation | null;
    portableState: ReceizPortableState | null;
};
export type ReceizKeyFile = ReceizKeyFileV1;
export type ReceizDeviceIdentity = {
    schema: typeof RECEIZ_DEVICE_IDENTITY_SCHEMA;
    createdAt: string;
    updatedAt: string;
    localUid: string;
    username: string;
    displayName: string;
    deviceName: string | null;
    keyFile: ReceizKeyFile;
};
export type ReceizIdIdentityOptions = {
    username?: string | null | undefined;
    displayName?: string | null | undefined;
    deviceName?: string | null | undefined;
    createdAt?: string | undefined;
    passphrase?: string | undefined;
    allowP256Fallback?: boolean | undefined;
    pbkdf2Iterations?: number | undefined;
};
export type ReceizIdentityLoginProof = {
    schema: typeof RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA;
    keyId: string;
    alg: ReceizIdentityKeyAlgorithm;
    challengeB64Url: string;
    signatureB64Url: string;
};
export type ReceizIdentityLoginProofInput = {
    keyFile: ReceizKeyFile;
    passphrase?: string | undefined;
    challengeText?: string | undefined;
    challengeB64Url?: string | undefined;
};
export type ReceizIdContinueRequest = {
    keyId: string;
    alg: ReceizIdentityKeyAlgorithm;
    publicKeyRawB64u: string;
    localUid: string;
    username: string;
    displayName: string;
    deviceName: string | null;
    createdAt: string;
    challengeB64Url: string;
    signatureB64Url: string;
    next?: string;
};
export type ReceizIdContinueOptions = {
    next?: string | undefined;
    nowMs?: number | undefined;
    nonceB64Url?: string | undefined;
    passphrase?: string | undefined;
};
export type ReceizIdentityAccountProjection = {
    schema: typeof RECEIZ_IDENTITY_ACCOUNT_PROJECTION_SCHEMA;
    keyId: string;
    alg: ReceizIdentityKeyAlgorithm;
    owner: ReceizKeyOwner;
    accountStateSchema: string | null;
    portableStateVerified: boolean;
    portableStateStatus: "verified" | "missing" | "invalid";
    authority: "verified-identity-portable-state" | "identity-only" | "rejected-portable-state";
    completeAtSealedHead: boolean;
    networkRequiredForProjection: false;
    continuity: ReceizIdentityLocalContinuityAuthority;
    /** Verified portable account truth. */
    verifiedState: unknown;
    /** Backward-compatible projection alias. Use verifiedState for product truth. */
    snapshot: unknown;
    domains: {
        profile: boolean;
        showcase: boolean;
        actionLedger: boolean;
        calendar: boolean;
        contacts: boolean;
        wallet: boolean;
        market: boolean;
        sports: boolean;
        signalVault: boolean;
        media: boolean;
        preferences: boolean;
        proofHistory: boolean;
    };
};
export declare const RECEIZ_IDENTITY_LOCAL_CONTINUITY_SCHEMA: "receiz.identity.local-continuity-authority.v1";
export type ReceizIdentityLocalContinuityAuthority = Readonly<{
    schema: typeof RECEIZ_IDENTITY_LOCAL_CONTINUITY_SCHEMA;
    admittedProjection: "immediate-complete-sealed-head";
    localTruth: "permanent-append-only";
    synchronization: "verified-descendants-after-sealed-head-only";
    serverRole: "distribution-and-indexing-only";
    networkRequiredForLocalUse: false;
    globalAcknowledgementDeletesLocalTruth: false;
    infrastructureMayBlockVerifiedOwner: false;
}>;
export declare const RECEIZ_IDENTITY_LOCAL_CONTINUITY_AUTHORITY: ReceizIdentityLocalContinuityAuthority;
export declare function receizBase64UrlEncode(bytes: Uint8Array): string;
export declare function receizBase64UrlDecode(value: string): Uint8Array;
export declare function parseReceizIdentityArtifactText(text: string): ReceizKeyFileV1;
export declare function appendReceizIdentityArtifactTrailerToPng(pngBytes: Uint8Array, keyFile: ReceizKeyFile): Uint8Array;
export declare function readReceizIdentityArtifact(input: Blob | ArrayBuffer | Uint8Array | string): Promise<ReceizKeyFileV1>;
export declare function serializeReceizIdentityArtifact(keyFile: ReceizKeyFile): string;
export declare function deriveReceizIdentityKeyIdFromPublicKeyRawB64u(publicKeyRawB64u: string, alg?: ReceizIdentityKeyAlgorithm): Promise<string>;
/**
 * Verifies exact signature bytes using only a clone-safe public identity-key
 * projection. This is a cryptographic predicate, not an issuer, admission, or
 * authority brand.
 */
export declare function verifyReceizIdentityPublicKeyProjectionSignature(value: ReceizIdentityPublicKeyProjectionSignatureInput): Promise<boolean>;
export declare function appendReceizIdentityPortableState(args: {
    keyFile: ReceizKeyFile;
    snapshot: unknown;
    schema?: string | undefined;
    exportedAt?: string | undefined;
    passphrase?: string | undefined;
}): Promise<ReceizKeyFile>;
export declare function createReceizIdentityKeyFile(args: {
    passphrase?: string | undefined;
    owner: {
        uid: string;
        email?: string | null;
        username?: string | null;
        displayName?: string | null;
    };
    portableState?: {
        schema?: string;
        snapshot: unknown;
    } | null;
    issuedAt?: string | undefined;
    pbkdf2Iterations?: number | undefined;
    allowP256Fallback?: boolean | undefined;
}): Promise<{
    keyFile: ReceizKeyFileV1;
    keyId: string;
    publicKeyRawB64u: string;
    alg: ReceizIdentityKeyAlgorithm;
}>;
export declare function createReceizIdIdentity(options?: ReceizIdIdentityOptions): Promise<ReceizDeviceIdentity>;
export declare function decryptReceizIdentityPrivateSigningKey(args: {
    keyFile: ReceizKeyFile;
    passphrase?: string | undefined;
}): Promise<CryptoKey>;
export declare function signReceizIdentityLoginProof(input: ReceizIdentityLoginProofInput): Promise<ReceizIdentityLoginProof>;
export declare function verifyReceizIdentityLoginProof(args: {
    keyFile: ReceizKeyFile;
    challengeB64Url: string;
    signatureB64Url: string;
}): Promise<boolean>;
export declare function verifyReceizIdentityPortableStateProof(keyFileInput: ReceizKeyFile): Promise<"verified" | "missing" | "invalid">;
export declare function buildReceizIdContinueRequest(identity: ReceizDeviceIdentity, options?: ReceizIdContinueOptions): Promise<ReceizIdContinueRequest>;
export declare function projectReceizIdentityAccount(keyFileInput: ReceizKeyFile): Promise<ReceizIdentityAccountProjection>;
//# sourceMappingURL=identity.d.ts.map