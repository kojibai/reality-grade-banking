import type { ReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import { type ReceizCompositeMerkleSibling } from "./compositeProofKernel.js";
import { verifyAndOpenReceizCredentialArtifactV125, type ReceizCredentialCurrentnessV125 } from "./v125Credential.js";
import { type ReceizAttestationClaimValueV125, type ReceizAttestationDisclosureV125, type ReceizAttestationDomainV125, type ReceizClaimSetV125 } from "./v125AttestationSchemas.js";
import { type ReceizPbiAuthorshipVerifierV125, type ReceizPbiCeremonyReceiptV125, type ReceizPbiCeremonyReplayGuardV125 } from "./v125PbiCeremony.js";
export type ReceizCredentialPresentationSourceV125 = Readonly<{
    credentialId: string;
    proofObjectId: string;
    domainId: string;
    credentialType: string;
    subjectId: string;
    holderReceizId: string;
    acceptedHead: string;
    claimRoot: string;
    claimSetDigest: string;
    claimSetHead: string;
}>;
export type ReceizCredentialDisclosureV125 = Readonly<{
    name: string;
    disclosure: Exclude<ReceizAttestationDisclosureV125, "private">;
    value: ReceizAttestationClaimValueV125;
    valueCommitment: string;
    evidenceIds: readonly string[];
    leafDigest: string;
    witness: readonly ReceizCompositeMerkleSibling[];
}>;
export type ReceizCredentialPresentationV125 = ReceizCredentialPresentationSourceV125 & Readonly<{
    schema: "receiz.credential.presentation.v125";
    selectedKai: string;
    disclosures: readonly ReceizCredentialDisclosureV125[];
    disclosureDigest: string;
    presentationDigest: string;
    authority: Readonly<{
        presentationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialPresentationVerificationV125 = Readonly<{
    schema: "receiz.credential.presentation-verification.v125";
    credentialValid: boolean;
    currentness: "current" | "expired" | "suspended" | "revoked" | "replaced" | "head-behind" | "invalid" | "not-proven";
    holderPresence: "verified" | "not-presented" | "invalid" | "expired" | "replayed";
    disclosuresValid: boolean;
    acceptedHead: string;
    failureCodes: readonly string[];
    authority: Readonly<{
        presentationIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialPresentationVerifierV125 = (input: Readonly<{
    credentialId: string;
    presentedHead: string;
    selectedKai: string;
}>) => Promise<ReceizCredentialCurrentnessV125>;
/** Canonical complete-source opening supplies all presentation coordinates and currentness. */
export declare function createReceizSourceBoundCredentialPresentationVerifierV125(input: Parameters<typeof verifyAndOpenReceizCredentialArtifactV125>[0], authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialPresentationVerifierV125>;
export type ReceizCredentialPresentationFileV125 = Readonly<{
    schema: "receiz.credential.presentation-file.v125";
    filename: string;
    mimeType: "application/vnd.receiz.credential-presentation+json";
    exactBytes: readonly number[];
    exactBytesSha256: string;
    presentationDigest: string;
    authority: Readonly<{
        transportIsVerification: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialPresentationQrHandoffV125 = Readonly<{
    schema: "receiz.credential.presentation-qr.v125";
    contentUrl: string;
    payloadBytes: readonly number[];
    payloadDigest: string;
    presentationDigest: string;
    authority: Readonly<{
        handoffIsVerification: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizCredentialPresentationNfcHandoffV125 = Readonly<{
    status: "available";
    record: Readonly<{
        schema: "receiz.credential.presentation-nfc.v125";
        recordType: "absolute-url";
        contentUrl: string;
        payloadDigest: string;
        presentationDigest: string;
        authority: Readonly<{
            handoffIsVerification: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>;
}> | Readonly<{
    status: "unavailable";
    code: "V125_PRESENTATION_NFC_UNAVAILABLE" | "V125_PRESENTATION_NFC_PAYLOAD_TOO_LARGE";
    fallback: "qr-or-file";
    authority: Readonly<{
        handoffIsVerification: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function createReceizCredentialPresentationV125(input: Readonly<{
    domain: ReceizAttestationDomainV125;
    claimSet: ReceizClaimSetV125;
    credential: ReceizCredentialPresentationSourceV125;
    disclose: readonly string[];
    selectedKai: string;
}>): Promise<ReceizCredentialPresentationV125>;
export declare function exportReceizCredentialPresentationFileV125(presentation: ReceizCredentialPresentationV125): Promise<ReceizCredentialPresentationFileV125>;
export declare function importReceizCredentialPresentationFileV125(file: ReceizCredentialPresentationFileV125): Promise<ReceizCredentialPresentationV125>;
export declare function createReceizCredentialPresentationContentUrlV125(input: Readonly<{
    origin: string;
    presentation: ReceizCredentialPresentationV125;
}>): Promise<string>;
export declare function readReceizCredentialPresentationContentUrlV125(value: string): Promise<ReceizCredentialPresentationV125>;
export declare function createReceizCredentialPresentationQrHandoffV125(input: Readonly<{
    contentUrl: string;
    presentationDigest: string;
}>): Promise<ReceizCredentialPresentationQrHandoffV125>;
export declare function createReceizCredentialPresentationNfcHandoffV125(input: Readonly<{
    contentUrl: string;
    presentationDigest: string;
    nfcAvailable: boolean;
    maximumPayloadBytes?: number;
}>): Promise<ReceizCredentialPresentationNfcHandoffV125>;
export declare function verifyReceizCredentialPresentationV125(input: Readonly<{
    domain: ReceizAttestationDomainV125;
    presentation: ReceizCredentialPresentationV125;
    selectedKai: string;
    verifyCredential?: ReceizCredentialPresentationVerifierV125;
    holderPresence?: ReceizPbiCeremonyReceiptV125;
    replayGuard?: ReceizPbiCeremonyReplayGuardV125;
    verifyPbiAuthorship?: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizCredentialPresentationVerificationV125>;
//# sourceMappingURL=v125CredentialPresentation.d.ts.map