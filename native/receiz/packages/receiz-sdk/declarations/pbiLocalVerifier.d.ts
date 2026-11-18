export type LocalPbiAssertion = {
    authenticatorDataB64Url: string;
    clientDataJSONB64Url: string;
    signatureB64Url: string;
    credIdB64Url: string;
    pubKeyPem: string;
};
export type LocalPbiVerifyPolicy = {
    rpId?: string;
    originAllowList?: readonly string[];
    requireUP?: boolean;
    requireUV?: boolean;
};
export type LocalPbiReceiptV1 = {
    ver: "pbi-receipt-1.0";
    challengeId: string;
    challenge: string;
    actionHash: string;
    aud: string;
    purpose: string;
    authorSig: {
        alg: "webauthn-es256";
        credId: string;
        authenticatorData: string;
        clientDataJSON: string;
        signature: string;
    };
};
export type LocalPbiVerifyResult = {
    ok: true;
    decision: "PBI_VERIFIED";
    rpIdHashB64Url: string;
    clientDataHashB64Url: string;
    flagsHex: string;
    signCount: number;
} | {
    ok: false;
    decision: "FAILED";
    code: "invalid_encoding" | "invalid_structure" | "origin_not_allowed" | "rpId_not_allowed" | "webauthn_type_mismatch" | "challenge_mismatch" | "flags_policy_violation" | "signature_invalid";
    reason: string;
};
export declare function buildLocalPbiReceipt(args: {
    challengeId: string;
    challengeB64Url: string;
    actionHashHex: string;
    aud?: string;
    purpose: string;
    assertion: LocalPbiAssertion;
}): LocalPbiReceiptV1;
export declare function computeLocalPbiReceiptHash(receipt: LocalPbiReceiptV1): Promise<string>;
export declare function verifyLocalPbiAssertion(args: {
    challengeB64Url: string;
    assertion: LocalPbiAssertion;
    policy?: LocalPbiVerifyPolicy;
}): Promise<LocalPbiVerifyResult>;
//# sourceMappingURL=pbiLocalVerifier.d.ts.map