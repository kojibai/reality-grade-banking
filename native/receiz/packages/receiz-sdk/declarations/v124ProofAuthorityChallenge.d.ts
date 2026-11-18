import { type ReceizProofAuthorityChallengeUnsignedV123 } from "./v123ProofAuthority.js";
export type CreateReceizProofAuthorityChallengeInput = Readonly<{
    applicationId: string;
    artifactDigest: string;
    scopes: readonly string[];
    consentStatementDigest: string;
    ttlPulses: number;
    nonce?: string;
}>;
export type CreatedReceizProofAuthorityChallenge = Readonly<{
    challenge: ReceizProofAuthorityChallengeUnsignedV123;
    challengeB64Url: string;
}>;
export declare function createReceizProofAuthorityChallenge(input: CreateReceizProofAuthorityChallengeInput): CreatedReceizProofAuthorityChallenge;
//# sourceMappingURL=v124ProofAuthorityChallenge.d.ts.map