import { type ReceizDomainReplayRuntimeSourceAdmissionV124 } from "./v124ReplayProofObject.js";
export type ReceizRuntimeStrongerTruthV124 = "receiz-identity-artifact" | "sealed-receiz-proof-object";
export type ReceizAuthenticatedRuntimeRequestInputV124 = Readonly<{
    method: "POST";
    path: string;
    applicationId: string;
    audience: string;
    strongerTruth: ReceizRuntimeStrongerTruthV124;
    body: unknown;
}>;
export type ReceizAuthenticatedRuntimeRequestV124 = Readonly<{
    schema: "receiz.authenticated-runtime-request.v124";
    method: "POST";
    path: string;
    applicationId: string;
    audience: string;
    strongerTruth: ReceizRuntimeStrongerTruthV124;
    body: unknown;
    requestDigest: string;
}>;
export type ReceizAuthenticatedRuntimeReceiptV124 = Readonly<{
    schema: "receiz.authenticated-runtime-receipt.v124";
    method: "POST";
    path: string;
    requestDigest: string;
    wireDigest: string;
    applicationId: string;
    audience: string;
    issuedAtKaiUPulse: number;
    expiresAtKaiUPulse: number;
    revocationHead: string;
    revokedAtKaiUPulse: null;
    authority: Readonly<{
        receiptIsProofAuthority: false;
        receiptIsIdentityAuthority: false;
        strongerTruth: ReceizRuntimeStrongerTruthV124;
    }>;
    receiptDigest: string;
}>;
type RuntimeAdmission = Readonly<{
    request: ReceizAuthenticatedRuntimeRequestV124;
    receipt: ReceizAuthenticatedRuntimeReceiptV124;
    sourceAdmission: ReceizDomainReplayRuntimeSourceAdmissionV124 | null;
}>;
export declare function createReceizAuthenticatedRuntimeRequestV124(input: ReceizAuthenticatedRuntimeRequestInputV124): Promise<ReceizAuthenticatedRuntimeRequestV124>;
export declare function admitReceizAuthenticatedRuntimeWireV124(input: Readonly<{
    request: ReceizAuthenticatedRuntimeRequestV124;
    wire: unknown;
    receipt: unknown;
}>): Promise<unknown>;
export declare function admitReceizSignedAuthenticatedRuntimeEnvelopeV124(input: Readonly<{
    request: ReceizAuthenticatedRuntimeRequestV124;
    envelope: unknown;
}>): Promise<Readonly<{
    wire: unknown;
    receipt: ReceizAuthenticatedRuntimeReceiptV124;
}>>;
export declare function getReceizAuthenticatedRuntimeAdmissionV124(value: unknown): RuntimeAdmission;
export declare function isReceizAuthenticatedRuntimeWireV124(value: unknown): boolean;
export {};
//# sourceMappingURL=v124AuthenticatedRuntime.d.ts.map