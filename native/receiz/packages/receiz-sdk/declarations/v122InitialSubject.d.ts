import { type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import type { ReceizSubjectStateV122 } from "./v122Subjects.js";
/** Exact projection extracted from the production v122 subject admission server.
 * This builds subordinate state only; callers must establish enclosing proof and
 * owner admission before using it. It does not issue proof or remote admission.
 */
export declare function projectReceizInitialSubjectStateV122(input: Readonly<{
    proof: Readonly<{
        proofDigest: string;
        proofObjectId: string;
        ownerProofDigest: string;
        immutableProofVersion: string;
        subjectType: string;
    }>;
    ownerReceizId: string;
    idempotencyKey: string;
    registryDigest: string;
    reducerDigest: string;
    kai: number;
}>): Promise<ReceizSubjectStateV122>;
/** Private initial subject issuance beneath the existing document and identity
 * primitives. A cloned admission, owner string, or bare pulse cannot authorize it.
 */
export declare function createReceizInitialSubjectStateV122(input: Readonly<{
    documentVerification: ReceizArtifactVerificationResult;
    ownerIdentityAdmission: unknown;
    kksCoordinate: unknown;
    idempotencyKey: string;
}>): Promise<ReceizSubjectStateV122>;
//# sourceMappingURL=v122InitialSubject.d.ts.map