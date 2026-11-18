export { createReceizSourceBoundPbiAuthorshipVerifierV125, type ReceizPbiSourceBindingV125 } from "./v125PbiSourceVerifier.js";
import { type ReceizIdentityLoginProof, type ReceizKeyFile } from "./identity.js";
import { type ReceizPbiProofObjectAuthorshipAppendV1 } from "./proofObjectAuthorship.js";
export type ReceizPbiCeremonyChallengeV125 = Readonly<{
    schema: "receiz.pbi.ceremony-challenge.v125";
    verifierReceizId: string;
    holderReceizId: string;
    proofObjectId: string;
    acceptedHead: string;
    presentationDigest: string;
    disclosureDigest: string;
    consentDigest: string;
    issuedKai: string;
    expiresAtKai: string;
    nonce: string;
    challengeDigest: string;
}>;
export type ReceizPbiCeremonyApprovalV125 = Readonly<{
    schema: "receiz.pbi.ceremony-approval.v125";
    challengeDigest: string;
    holderReceizId: string;
    pbiAuthorship: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
    receizIdPublicKeyRawB64u: string;
    holderProof: ReceizIdentityLoginProof;
    approvalDigest: string;
}>;
export type ReceizPbiCeremonyReceiptV125 = Readonly<{
    schema: "receiz.pbi.ceremony-receipt.v125";
    verifierReceizId: string;
    holderReceizId: string;
    proofObjectId: string;
    acceptedHead: string;
    presentationDigest: string;
    disclosureDigest: string;
    consentDigest: string;
    issuedKai: string;
    expiresAtKai: string;
    nonce: string;
    challengeDigest: string;
    approval: ReceizPbiCeremonyApprovalV125;
    receiptDigest: string;
    authority: Readonly<{
        receiptIsIdentityAuthority: false;
        strongerTruth: "pbi-authorship-and-receiz-id-proof";
    }>;
}>;
export type ReceizPbiCeremonyVerificationV125 = Readonly<{
    schema: "receiz.pbi.ceremony-verification.v125";
    valid: boolean;
    code: "verified" | "invalid" | "expired" | "replayed" | "binding-mismatch";
    proofObjectId: string;
    acceptedHead: string;
    holderReceizId: string;
    verifierReceizId: string;
    writesPerformed: 0 | 1;
    authority: Readonly<{
        receiptIsIdentityAuthority: false;
        strongerTruth: "pbi-authorship-and-receiz-id-proof";
    }>;
}>;
export type ReceizPbiCeremonyReplayGuardV125 = Readonly<{
    consume(receiptDigest: string): boolean;
    consumedCount(): number;
}>;
export type ReceizPbiAuthorshipVerifierV125 = (input: Readonly<{
    history: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
    holderReceizId: string;
    proofObjectId: string;
    acceptedHead: string;
    holderProof?: ReceizIdentityLoginProof;
    challengeDigest?: string;
}>) => Promise<boolean>;
type ChallengeInput = Omit<ReceizPbiCeremonyChallengeV125, "schema" | "challengeDigest">;
export declare function createReceizPbiCeremonyChallengeV125(input: ChallengeInput): Promise<ReceizPbiCeremonyChallengeV125>;
export declare function approveReceizPbiCeremonyV125(input: Readonly<{
    challenge: ReceizPbiCeremonyChallengeV125;
    pbiAuthorship: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
    keyFile: ReceizKeyFile;
    passphrase?: string;
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizPbiCeremonyApprovalV125>;
export declare function issueReceizPbiCeremonyReceiptV125(input: Readonly<{
    challenge: ReceizPbiCeremonyChallengeV125;
    approval: ReceizPbiCeremonyApprovalV125;
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizPbiCeremonyReceiptV125>;
export declare function createReceizPbiCeremonyReplayGuardV125(): ReceizPbiCeremonyReplayGuardV125;
export declare function verifyReceizPbiCeremonyReceiptV125(input: Readonly<{
    receipt: ReceizPbiCeremonyReceiptV125;
    selectedKai: string;
    replayGuard?: ReceizPbiCeremonyReplayGuardV125;
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizPbiCeremonyVerificationV125>;
//# sourceMappingURL=v125PbiCeremony.d.ts.map