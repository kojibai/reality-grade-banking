import { type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import type { ReceizPbiAuthorshipVerifierV125 } from "./v125PbiCeremony.js";
import type { LocalPbiVerifyPolicy } from "./pbiLocalVerifier.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
/** Selection only. Owner, holder, proof identity and accepted head are source-derived. */
export type ReceizSubjectSourceFamilyBindingV125 = Readonly<{
    currentArtifactSha256: string;
    identityArtifactSha256: string;
    subjectArtifactSha256: string | null;
}>;
export type ReceizSubjectSourceFamilyV125 = Readonly<{
    schema: "receiz.subject-source-family.v125";
    artifacts: readonly ReceizPortableSealedArtifactV124[];
    bindings: readonly ReceizSubjectSourceFamilyBindingV125[];
    familySetDigest: string;
}>;
export type ReceizOpenedSubjectSourceFamilyV125 = Readonly<{
    family: ReceizSubjectSourceFamilyV125;
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
    authority: Readonly<{
        familyIsProofAuthority: false;
        selectionIsIdentityAdmission: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
type Member = Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    verification: Extract<ReceizArtifactVerificationResult, {
        status: "verified-artifact";
    }>;
}>;
/** Closed deterministic transport only; this does not admit any source or restore runtime custody. */
export declare function createReceizSubjectSourceFamilyV125(input: Readonly<{
    artifacts: readonly ReceizPortableSealedArtifactV124[];
    bindings: readonly ReceizSubjectSourceFamilyBindingV125[];
}>): Promise<ReceizSubjectSourceFamilyV125>;
/** Opens every exact member canonically, then reconstructs PBI custody from complete carried sources.
 * Identity selection remains unadmitted until the verifier checks the signed Identity challenge.
 * The family is not a relationship proof: use readReceizSubjectRelationshipSourceV125 with this verifier.
 */
export declare function openReceizSubjectSourceFamilyV125(input: Readonly<{
    family: ReceizSubjectSourceFamilyV125;
    policy?: Pick<LocalPbiVerifyPolicy, "rpId" | "originAllowList">;
}>): Promise<ReceizOpenedSubjectSourceFamilyV125>;
/** Exact factory-custodied source lookup; a spread or deserialized family is not opened custody. */
export declare function readReceizSubjectSourceFamilyMemberV125(family: ReceizOpenedSubjectSourceFamilyV125, artifactSha256: string): Member;
export {};
//# sourceMappingURL=v125SubjectSourceFamily.d.ts.map