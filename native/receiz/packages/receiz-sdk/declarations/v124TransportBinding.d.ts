export declare const RECEIZ_V124_TRANSPORT_BINDING_SCHEMA: "receiz.v124.transport-binding.v1";
export declare const RECEIZ_V124_TRANSPORT_SIGNATURE_SCHEMA: "receiz.transport-signature.v124";
export declare const RECEIZ_V124_SIGNED_TRANSPORT_ENVELOPE_SCHEMA: "receiz.signed-transport-envelope.v124";
export declare const RECEIZ_V124_TRANSPORT_TTL_UPULSES = 5000000;
export declare const RECEIZ_V124_TRANSPORT_MAX_TTL_UPULSES = 10000000;
export type ReceizTransportBindingKindV124 = "runtime" | "execution";
export type ReceizTransportBindingDomainV124 = "receiz.v124.runtime-response" | "receiz.v124.execution-response";
export type ReceizTransportStrongerTruthV124 = "receiz-identity-artifact" | "sealed-receiz-proof-object";
export type ReceizTransportBindingAuthorityV124 = Readonly<{
    bindingIsProofAuthority: false;
    bindingIsIdentityAuthority: false;
    bindingIsExecutionAuthority: false;
    bindingIsHeadAuthority: false;
    strongerTruth: ReceizTransportStrongerTruthV124;
}>;
export type ReceizTransportBindingV124 = Readonly<{
    schema: typeof RECEIZ_V124_TRANSPORT_BINDING_SCHEMA;
    domain: ReceizTransportBindingDomainV124;
    issuerRootKid: string;
    method: "GET" | "POST";
    path: string;
    requestDigest: string;
    wireDigest: string;
    receiptDigest: string;
    applicationId: string;
    audience: string;
    issuedAtKaiPulse: number;
    issuedAtKaiUPulse: number;
    expiresAtKaiUPulse: number;
    revocationHead: string;
    authority: ReceizTransportBindingAuthorityV124;
}>;
export type ReceizTransportSignatureV124 = Readonly<{
    schema: typeof RECEIZ_V124_TRANSPORT_SIGNATURE_SCHEMA;
    kid: string;
    alg: "Ed25519";
    sig: string;
}>;
export type ReceizSignedTransportEnvelopeV124<TWire = unknown, TReceipt = unknown> = Readonly<{
    schema: typeof RECEIZ_V124_SIGNED_TRANSPORT_ENVELOPE_SCHEMA;
    wire: TWire;
    receipt: TReceipt;
    transportBinding: ReceizTransportBindingV124;
    transportSignature: ReceizTransportSignatureV124;
}>;
export type ReceizTransportBindingInputV124 = Readonly<{
    kind: ReceizTransportBindingKindV124;
    method: "GET" | "POST";
    path: string;
    requestDigest: string;
    wireDigest: string;
    receiptDigest: string;
    applicationId: string;
    audience: string;
    issuerRootKid: string;
    issuedAtKaiPulse: number;
    issuedAtKaiUPulse: number;
    expiresAtKaiUPulse: number;
    revocationHead: string;
    strongerTruth: ReceizTransportStrongerTruthV124;
}>;
export type ReceizTransportBindingExpectationV124 = Readonly<{
    kind: ReceizTransportBindingKindV124;
    method: "GET" | "POST";
    path: string;
    requestDigest: string;
    wireDigest: string;
    receiptDigest: string;
    applicationId: string;
    audience: string;
    revocationHead: string | null;
    revocationHeadAuthority: "authenticated-runtime-receipt" | "transport-coordinate-only";
    strongerTruth: ReceizTransportStrongerTruthV124;
}>;
export type ReceizExecutionTransportRequestInputV124 = Readonly<{
    method: "GET" | "POST";
    path: string;
    applicationId: string;
    audience: string;
    body: unknown;
}>;
export declare function createReceizTransportBindingV124(input: ReceizTransportBindingInputV124): ReceizTransportBindingV124;
export declare function canonicalizeReceizTransportBindingV124(value: unknown): string;
export declare function readReceizSignedTransportEnvelopeV124(value: unknown): ReceizSignedTransportEnvelopeV124;
export declare function digestReceizExecutionTransportRequestV124(input: ReceizExecutionTransportRequestInputV124): Promise<string>;
export declare function verifyReceizTransportBindingV124(candidate: unknown, signature: unknown, expected: ReceizTransportBindingExpectationV124): Promise<ReceizTransportBindingV124>;
//# sourceMappingURL=v124TransportBinding.d.ts.map