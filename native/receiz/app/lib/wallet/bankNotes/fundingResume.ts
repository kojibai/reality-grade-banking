import { signReceizIdentityLoginProof, receizBase64UrlEncode, receizBase64UrlDecode, type ReceizKeyFileV1 } from "../../../../packages/receiz-sdk/src/identity";
import type { KairosOfflineCashFundingAuthorizationV1 } from "../kairosOfflineCashFundingAuthorization";
export type BankFundingResume = Readonly<{
    schema: "receiz.bank.note-funding-resume.v1";
    authorizationDigest: string;
    issuedAtMs: number;
    signatureB64Url: string;
}>;
function challenge(digest: string, at: number) { return receizBase64UrlEncode(new TextEncoder().encode(`receiz.bank.note-funding-resume.v1:${digest}:${at}`)); }
export async function createBankFundingResume(keyFile: ReceizKeyFileV1, passphrase: string, digest: string): Promise<BankFundingResume> { const issuedAtMs = Date.now(); if (!/^[a-f0-9]{64}$/.test(digest))
    throw Error("BANK_NOTE_FUNDING_RESUME_INVALID"); const signed = await signReceizIdentityLoginProof({ keyFile, passphrase, challengeB64Url: challenge(digest, issuedAtMs) }); return { schema: "receiz.bank.note-funding-resume.v1", authorizationDigest: digest, issuedAtMs, signatureB64Url: signed.signatureB64Url }; }
export async function verifyBankFundingResume(input: unknown, auth: Pick<KairosOfflineCashFundingAuthorizationV1, "authorizationDigest" | "identityPublicKeyRawB64u" | "identityAlgorithm">, nowMs = Date.now()) {
    const v = input as BankFundingResume;
    if (!v || Object.keys(v).sort().join("|") !== "authorizationDigest|issuedAtMs|schema|signatureB64Url" || v.schema !== "receiz.bank.note-funding-resume.v1" || v.authorizationDigest !== auth.authorizationDigest || !Number.isSafeInteger(v.issuedAtMs) || v.issuedAtMs > nowMs + 30000 || nowMs - v.issuedAtMs > 300000 || !v.signatureB64Url)
        throw Error("BANK_NOTE_FUNDING_RESUME_INVALID");
    const key = await crypto.subtle.importKey("raw", receizBase64UrlDecode(auth.identityPublicKeyRawB64u).slice().buffer, auth.identityAlgorithm === "P-256" ? { name: "ECDSA", namedCurve: "P-256" } : "Ed25519", false, ["verify"]);
    if (!await crypto.subtle.verify(auth.identityAlgorithm === "P-256" ? { name: "ECDSA", hash: "SHA-256" } : "Ed25519", key, receizBase64UrlDecode(v.signatureB64Url).slice().buffer, receizBase64UrlDecode(challenge(v.authorizationDigest, v.issuedAtMs)).slice().buffer))
        throw Error("BANK_NOTE_FUNDING_RESUME_INVALID");
}
