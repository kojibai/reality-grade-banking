import { createReceizArtifactAdmissionEngine } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../../packages/receiz-sdk/src/artifactVerification";
import { verifyReceizArtifact } from "../../../../packages/receiz-sdk/src/index";
import { canonicalizeReceizConstitution } from "../../../../packages/receiz-sdk/src/constitution";
import { receizCurrentPinnedSignatureV4Roots } from "../../../../packages/receiz-sdk/src/verifier/roots";
import { receizBase64UrlDecode } from "../../../../packages/receiz-sdk/src/identity";
import { parseReceizPortableAssetDocument, extractReceizPortableAssetPayload } from "../../../../packages/receiz-sdk/src/portableAsset";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
export const BANK_RESERVE_ALLOCATION_SCHEMA = "receiz.bank.reserve-allocation.v1" as const;
export const BANK_RESERVE_ALLOCATION_SIGN_CONTEXT = "receiz.bank.offline-reserve.v129";
export type BankReserveAllocationBasis = Readonly<{
    schema: typeof BANK_RESERVE_ALLOCATION_SCHEMA;
    allocationId: string;
    accountUserId: string;
    receizKeyId: string;
    predecessorAccountPortableStateDigest: string;
    qualificationDigest: string;
    installationCommitment: string;
    receivingCustodyCommitmentDigest: string;
    fundedReservePhiMicro: string;
    amountUsdCents: string;
    usdPerPhiMicrocents: string;
    fundedAtKai: string;
    debitLedgerId: string;
    privateAccountSnapshotSha256: string;
}>;
export type BankAllocationRootSignature = Readonly<{
    kid: string;
    alg: "Ed25519";
    sig: string;
    signedAtMs: number;
}>;
export type BankReserveAllocationEvidence = Readonly<{
    artifactSha256: string;
    artifactBytes: Uint8Array;
    funding: BankReserveAllocationBasis;
}>;
const held = new WeakMap<BankReserveAllocationEvidence, Uint8Array>();
const SHA = /^[a-f0-9]{64}$/, UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i, UINT = /^(0|[1-9][0-9]*)$/;
function fail(): never { throw Error("BANK_ALLOCATION_SOURCE_REQUIRED"); }
export function allocationOwnerId(basis: BankReserveAllocationBasis): string { return `c_${basis.allocationId.slice(0, 22)}.receiz.id`; }
export function allocationSigningBytes(basis: BankReserveAllocationBasis): Uint8Array {
    if (!basis || Object.keys(basis).sort().join("|") !== ["schema", "allocationId", "accountUserId", "receizKeyId", "predecessorAccountPortableStateDigest", "qualificationDigest", "installationCommitment", "receivingCustodyCommitmentDigest", "fundedReservePhiMicro", "amountUsdCents", "usdPerPhiMicrocents", "fundedAtKai", "debitLedgerId", "privateAccountSnapshotSha256"].sort().join("|")
        || basis.schema !== BANK_RESERVE_ALLOCATION_SCHEMA || !UUID.test(basis.accountUserId) || !UUID.test(basis.debitLedgerId)
        || ![basis.allocationId, basis.receizKeyId, basis.predecessorAccountPortableStateDigest, basis.qualificationDigest, basis.installationCommitment, basis.receivingCustodyCommitmentDigest, basis.privateAccountSnapshotSha256].every(value => typeof value === "string" && SHA.test(value))
        || ![basis.fundedReservePhiMicro, basis.amountUsdCents, basis.usdPerPhiMicrocents].every(value => typeof value === "string" && /^[1-9][0-9]*$/.test(value))
        || typeof basis.fundedAtKai !== "string" || !UINT.test(basis.fundedAtKai)
        || (BigInt(basis.fundedReservePhiMicro) * BigInt(basis.usdPerPhiMicrocents) + 500000000000n) / 1000000000000n !== BigInt(basis.amountUsdCents))
        fail();
    return new TextEncoder().encode(`${BANK_RESERVE_ALLOCATION_SIGN_CONTEXT}\0${canonicalizeReceizConstitution(basis)}`);
}
export async function verifyAllocationFundingSignature(basis: BankReserveAllocationBasis, signature: BankAllocationRootSignature, roots = receizCurrentPinnedSignatureV4Roots()): Promise<void> {
    try {
        const bytes = allocationSigningBytes(basis), root = roots.get(signature.kid);
        if (!root || signature.alg !== "Ed25519" || !Number.isSafeInteger(signature.signedAtMs) || signature.signedAtMs <= 0
            || (root.activeFromPulse && BigInt(basis.fundedAtKai) < BigInt(root.activeFromPulse))
            || (root.status === "retired" && !root.retiredAtPulse) || (root.retiredAtPulse && BigInt(basis.fundedAtKai) > BigInt(root.retiredAtPulse)))
            throw Error();
        const key = await crypto.subtle.importKey("raw", receizBase64UrlDecode(root.publicKeyRawB64u).slice().buffer, "Ed25519", false, ["verify"]);
        if (!await crypto.subtle.verify("Ed25519", key, receizBase64UrlDecode(signature.sig).slice().buffer, bytes.slice().buffer))
            throw Error();
    }
    catch {
        throw Error("BANK_ALLOCATION_ISSUER_REQUIRED");
    }
}
export function isBankReserveAllocationEvidence(value: unknown): value is BankReserveAllocationEvidence { return Boolean(value && typeof value === "object" && held.has(value as BankReserveAllocationEvidence)); }
export async function verifyBankReserveAllocationArtifact(bytesInput: Uint8Array, options: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}> = {}): Promise<BankReserveAllocationEvidence> {
    const bytes = bytesInput.slice(), verification = options.roots ? await verifyReceizArtifactWithCanonicalRoots(bytes, options.roots) : await verifyReceizArtifact(bytes);
    const admission = await createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: options.roots })(verification, { profile: "portable-state" });
    if (admission.verdict === "profile-denied" || "code" in admission || admission.profile !== "portable-state")
        fail();
    const document = await parseReceizPortableAssetDocument(admission.recoveredState), payload = await extractReceizPortableAssetPayload(document);
    if (document.assetType !== "reserve_funding" || document.settlement.state !== "bank_allocated_reserve" || payload.mimeType !== "application/json")
        fail();
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload.bytes));
    }
    catch {
        fail();
    }
    if (!body! || typeof body !== "object" || Array.isArray(body) || Object.keys(body).sort().join("|") !== "funding|fundingSignature")
        fail();
    const funding = body.funding as BankReserveAllocationBasis;
    allocationSigningBytes(funding);
    await verifyAllocationFundingSignature(funding, body.fundingSignature as BankAllocationRootSignature, options.roots);
    if (document.ownership.ownerReceizId !== allocationOwnerId(funding) || document.provenance.root !== `receiz.bank.reserve-allocation:${funding.allocationId}` || document.ownership.proofRef !== "genesis")
        fail();
    const result = Object.freeze({ artifactSha256: admission.artifactSha256, get artifactBytes() { return bytes.slice(); }, funding: Object.freeze(structuredClone(funding)) });
    held.set(result, bytes);
    return result;
}
