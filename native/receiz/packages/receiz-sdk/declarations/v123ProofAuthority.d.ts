import { type ReceizIdentityLoginProof } from "./identity.js";
export type ReceizProofAuthorityChallengeUnsignedV123 = Readonly<{
    schema: "receiz.identity.proof-authority-challenge.v123";
    audience: string;
    nonce: string;
    issuedAtKai: number;
    expiresAtKai: number;
    consent: Readonly<{
        approved: boolean;
        statementDigest: string;
    }>;
}>;
export type ReceizProofAuthorityChallengeV123 = ReceizProofAuthorityChallengeUnsignedV123 & Readonly<{
    proof: ReceizIdentityLoginProof;
}>;
export type ReceizProofAuthorityExchangeInputV123 = Readonly<{
    artifact: Blob | ArrayBuffer | Uint8Array | string;
    challenge: ReceizProofAuthorityChallengeV123;
    applicationId: string;
    scopes: readonly string[];
}>;
export type ReceizProofAuthorityV123 = Readonly<{
    schema: "receiz.identity.proof-authority.v123";
    applicationId: string;
    keyId: string;
    artifactDigest: string;
    grantedScopes: readonly string[];
    issuedAtKai: number;
    expiresAtKai: number;
    nonce: string;
    revocationHead: string;
    tokenType: "Bearer";
    expiresIn: number;
    refreshable: false;
    authority: Readonly<{
        grantIsIdentityAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
    authorityDigest: string;
    accessToken: string;
}>;
type RemoteRequest = <T>(path: string, options: Readonly<{
    method: string;
    body: Record<string, unknown>;
}>) => Promise<T>;
export declare function normalizeReceizProofAuthorityScopesV123(scopes: readonly string[]): readonly string[];
export declare function proofAuthorityChallengeBasisV123(input: Readonly<{
    challenge: ReceizProofAuthorityChallengeUnsignedV123;
    applicationId: string;
    artifactDigest: string;
    scopes: readonly string[];
}>): Readonly<{
    schema: "receiz.identity.proof-authority-challenge.v123";
    applicationId: string;
    audience: string;
    artifactDigest: string;
    scopes: readonly string[];
    nonce: string;
    issuedAtKai: number;
    expiresAtKai: number;
    consentStatementDigest: string;
}>;
export declare function validateReceizProofAuthorityV123(value: unknown): Promise<ReceizProofAuthorityV123>;
export declare function createReceizProofAuthorityExchangeV123(request: RemoteRequest): (input: ReceizProofAuthorityExchangeInputV123) => Promise<ReceizProofAuthorityV123>;
export {};
//# sourceMappingURL=v123ProofAuthority.d.ts.map