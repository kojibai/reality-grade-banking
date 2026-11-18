export type ReceizSignatureV4RootPublicKey = Readonly<{
    kid: string;
    alg: "Ed25519";
    publicKeyRawB64u: string;
    status: "active" | "retired";
    activeFromPulse?: string;
    retiredAtPulse?: string;
}>;
export type ReceizSignatureV4CertificateStructure = Readonly<{
    record: Record<string, unknown>;
    version: number;
    certType: string;
    certId: string;
    issuerKid: string;
    alg: string;
    subjectPublicKeyRawB64u: string;
    issuedAtMs: number;
    expiresAtMs: number;
    sig: string;
}>;
export type ReceizSignatureV4Structure = Readonly<{
    record: Record<string, unknown>;
    version: number;
    alg: string;
    cert: ReceizSignatureV4CertificateStructure;
    sig: string;
    payloadHashSha256: string;
    signedAtMs: number;
}>;
export declare function recognizeReceizSignatureV4Structure(value: unknown): ReceizSignatureV4Structure | null;
export declare function verifyReceizSignatureV4(bundle: Record<string, unknown>, roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>): Promise<string | null>;
//# sourceMappingURL=signatureV4.d.ts.map