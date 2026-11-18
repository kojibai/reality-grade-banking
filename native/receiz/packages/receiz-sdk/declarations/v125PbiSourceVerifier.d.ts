import type { ReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import type { ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { type LocalPbiVerifyPolicy } from "./pbiLocalVerifier.js";
import type { ReceizPbiAuthorshipVerifierV125 } from "./v125PbiCeremony.js";
type CredentialBinding = Readonly<{
    artifactSha256: string;
    proofObjectId: string;
    acceptedHead: string;
    ownerReceizId: string;
    holderReceizId: string;
}>;
/** Internal composition only. Identity proof is still admitted by ceremony verification before redemption. */
export declare function hasReceizCredentialPbiSourceBindingV125(verifier: ReceizPbiAuthorshipVerifierV125, expected: CredentialBinding): boolean;
export declare function isReceizSourceBoundPbiVerifierV125(value: ReceizPbiAuthorshipVerifierV125): boolean;
export type ReceizPbiSourceBindingV125 = Readonly<{
    /** Exact source carrying the entire PBI history, never a detached history. */
    currentArtifact: ReceizArtifactVerificationResult;
    predecessorArtifacts: readonly ReceizArtifactVerificationResult[];
    identityArtifact: ReceizArtifactVerificationResult;
    /** Its immutable admittedProofDigest must name this source or an exact verified PBI predecessor. */
    subjectSource?: ReceizPortableSealedArtifactV124;
    /** This exact complete credential must itself carry the verified PBI history. */
    credentialSource?: Readonly<{
        artifact: ReceizPortableSealedArtifactV124;
        verifier: ReceizV125EnclosingArtifactVerifierOptions;
        authority: ReceizAttestationAuthorityV125;
    }>;
}>;
/** Reuses the offline append verifier and canonical Identity admission. No caller verifier is accepted. */
export declare function createReceizSourceBoundPbiAuthorshipVerifierV125(input: Readonly<{
    bindings: readonly ReceizPbiSourceBindingV125[];
    /** Trusted host policy only; source-carried origins never select this policy. */
    policy?: Pick<LocalPbiVerifyPolicy, "rpId" | "originAllowList">;
}>): Promise<ReceizPbiAuthorshipVerifierV125>;
export {};
//# sourceMappingURL=v125PbiSourceVerifier.d.ts.map