import {packBankNoteBytes,unpackBankNoteBytes} from "./compression";
import { canonicalizeReceizConstitution } from "../../../../packages/receiz-sdk/src/constitution";
import { receizBase64UrlDecode,receizBase64UrlEncode } from "../../../../packages/receiz-sdk/src/identity";
import { sha256ReceizBytes, verifyReceizArtifact } from "../../../../packages/receiz-sdk/src/index";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../../packages/receiz-sdk/src/artifactVerification";
import { createReceizArtifactAdmissionEngine } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { parseReceizPortableAssetDocument, extractReceizPortableAssetPayload } from "../../../../packages/receiz-sdk/src/portableAsset";
import { receizCurrentPinnedSignatureV4Roots } from "../../../../packages/receiz-sdk/src/verifier/roots";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import { BANK_RESERVE_ALLOCATION_SIGN_CONTEXT, type BankAllocationRootSignature } from "./allocation";
import { verifyBankNoteRedemption, readBankNoteRedemption } from "./redemption";
export type BankReserveCreditBasis = Readonly<{
    schema: "receiz.bank.note-reserve-credit.v1" | "receiz.bank.note-settlement-credit.v1";
    noteId: string;
    redemptionDigest: string;
    terminalArtifactSha256: string;
    receiverUserId: string;
    receiverKeyId: string;
    amountPhiMicro: string;
    amountUsdCents: string;
    creditLedgerId: string;
    acceptedAtKai: string;
    privateAccountSnapshotSha256: string;
}>;
export type BankReserveCreditSnapshot = Readonly<{
    schema: "receiz.bank.credit-cash-snapshot.v1" | "receiz.bank.settlement-credit-cash-snapshot.v1";
    noteId: string;
    receiverUserId: string;
    receiverKeyId: string;
    reserveBeforeUsdCents: string;
    reserveAfterUsdCents: string;
    walletBeforePhiMicro: string;
    walletAfterPhiMicro: string;
}>;
const held = new WeakMap<object, {
    basis: BankReserveCreditBasis;
    bytes: Uint8Array;
    privateSnapshot:Uint8Array;terminalSource:Uint8Array;
}>();
export const bankCreditSnapshotBytes = (value: BankReserveCreditSnapshot) => new TextEncoder().encode(canonicalizeReceizConstitution(value));
export function bankCreditSigningBytes(basis: BankReserveCreditBasis) {
    if (!basis || !["receiz.bank.note-reserve-credit.v1","receiz.bank.note-settlement-credit.v1"].includes(basis.schema) || Object.keys(basis).sort().join("|") !== "acceptedAtKai|amountPhiMicro|amountUsdCents|creditLedgerId|noteId|privateAccountSnapshotSha256|receiverKeyId|receiverUserId|redemptionDigest|schema|terminalArtifactSha256" || ![basis.redemptionDigest, basis.terminalArtifactSha256, basis.receiverKeyId, basis.privateAccountSnapshotSha256].every(x => /^[a-f0-9]{64}$/.test(x)) || ![basis.amountPhiMicro, basis.amountUsdCents].every(x => /^[1-9][0-9]*$/.test(x)) || !/^(0|[1-9][0-9]*)$/.test(basis.acceptedAtKai))
        throw Error("BANK_NOTE_CREDIT_INVALID");
    return new TextEncoder().encode(`${BANK_RESERVE_ALLOCATION_SIGN_CONTEXT}\0${canonicalizeReceizConstitution(basis)}`);
}
export async function verifyBankCreditSignature(basis: BankReserveCreditBasis, signature: BankAllocationRootSignature, roots = receizCurrentPinnedSignatureV4Roots()) {
    const bytes = bankCreditSigningBytes(basis), root = roots.get(signature?.kid);
    if (!root || signature.alg !== "Ed25519" || !Number.isSafeInteger(signature.signedAtMs) || signature.signedAtMs <= 0 || (root.activeFromPulse && BigInt(basis.acceptedAtKai) < BigInt(root.activeFromPulse)) || (root.status === "retired" && !root.retiredAtPulse) || (root.retiredAtPulse && BigInt(basis.acceptedAtKai) > BigInt(root.retiredAtPulse)))
        throw Error("BANK_NOTE_CREDIT_ISSUER_REQUIRED");
    const key = await crypto.subtle.importKey("raw", receizBase64UrlDecode(root.publicKeyRawB64u).slice().buffer, "Ed25519", false, ["verify"]);
    if (!await crypto.subtle.verify("Ed25519", key, receizBase64UrlDecode(signature.sig).slice().buffer, bytes.slice().buffer))
        throw Error("BANK_NOTE_CREDIT_ISSUER_REQUIRED");
}
export async function verifyBankReserveCreditArtifact(bytesInput: Uint8Array, privateSnapshot: Uint8Array, options: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    terminalSource: Uint8Array;
}>) {
    privateSnapshot = privateSnapshot.slice();
    const terminalSource = options.terminalSource.slice();
    const bytes = bytesInput.slice(), verification = options.roots ? await verifyReceizArtifactWithCanonicalRoots(bytes, options.roots) : await verifyReceizArtifact(bytes);
    const a = await createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: options.roots })(verification, { profile: "portable-state" });
    if (a.verdict === "profile-denied" || "code" in a || a.profile !== "portable-state")
        throw Error("BANK_NOTE_CREDIT_SOURCE_REQUIRED");
    const document = await parseReceizPortableAssetDocument(a.recoveredState), payload = await extractReceizPortableAssetPayload(document);
    const rail = document.settlement.state === "bank_note_settlement_credit" ? "settlement" as const : "reserve" as const;
    if (document.assetType !== (rail === "settlement" ? "proof_object" : "reserve_funding") || document.settlement.state !== `bank_note_${rail}_credit` || payload.mimeType !== "application/json")
        throw Error("BANK_NOTE_CREDIT_SOURCE_REQUIRED");
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload.bytes));
    if (Object.keys(body).sort().join("|") !== "credit|creditSignature")
        throw Error("BANK_NOTE_CREDIT_SOURCE_REQUIRED");
    const credit = body.credit as BankReserveCreditBasis;
    await verifyBankCreditSignature(credit, body.creditSignature, options.roots);
    const terminal = await verifyBankNoteRedemption(terminalSource, options);
    if (readBankNoteRedemption(terminal).intent.schema === "receiz.bank.note-local-credit.v1") throw Error("BANK_LOCAL_CREDIT_RECONCILIATION_REQUIRED");
    if (terminal.rail !== rail || credit.schema !== `receiz.bank.note-${rail}-credit.v1` || terminal.artifactSha256 !== credit.terminalArtifactSha256 || terminal.redemptionDigest !== credit.redemptionDigest || terminal.noteId !== credit.noteId || terminal.receiverUserId !== credit.receiverUserId || terminal.receiverKeyId !== credit.receiverKeyId || terminal.amountPhiMicro !== credit.amountPhiMicro || terminal.amountUsdCents !== credit.amountUsdCents || document.ownership.ownerReceizId !== `c_${credit.receiverKeyId.slice(0, 22)}.receiz.id` || document.provenance.root !== `receiz.bank.note-credit:${credit.noteId}`)
        throw Error("BANK_NOTE_CREDIT_BINDING_MISMATCH");
    if (await sha256ReceizBytes(privateSnapshot) !== credit.privateAccountSnapshotSha256)
        throw Error("BANK_NOTE_CREDIT_SNAPSHOT_MISMATCH");
    const snapshot = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(privateSnapshot)) as BankReserveCreditSnapshot;
    if (snapshot.schema !== (rail === "settlement" ? "receiz.bank.settlement-credit-cash-snapshot.v1" : "receiz.bank.credit-cash-snapshot.v1") || Object.keys(snapshot).sort().join("|") !== "noteId|receiverKeyId|receiverUserId|reserveAfterUsdCents|reserveBeforeUsdCents|schema|walletAfterPhiMicro|walletBeforePhiMicro" || snapshot.noteId !== credit.noteId || snapshot.receiverKeyId !== credit.receiverKeyId || snapshot.receiverUserId !== credit.receiverUserId || ![snapshot.reserveBeforeUsdCents, snapshot.reserveAfterUsdCents, snapshot.walletBeforePhiMicro, snapshot.walletAfterPhiMicro].every(x => /^(0|[1-9][0-9]*)$/.test(x)) || BigInt(snapshot.reserveAfterUsdCents) - BigInt(snapshot.reserveBeforeUsdCents) !== (rail === "settlement" ? 0n : BigInt(credit.amountUsdCents)) || BigInt(snapshot.walletAfterPhiMicro) - BigInt(snapshot.walletBeforePhiMicro) !== BigInt(credit.amountPhiMicro))
        throw Error("BANK_NOTE_CREDIT_SNAPSHOT_MISMATCH");
    const result = Object.freeze({ rail, credit: Object.freeze(structuredClone(credit)), snapshot: Object.freeze(snapshot), artifactSha256: a.artifactSha256 });
    held.set(result, { basis: credit, bytes,privateSnapshot:privateSnapshot.slice(),terminalSource });
    return result;
}

/** A complete receipt transport. Its authority is its admitted native credit and
 * terminal/funding sources, never these JSON fields or container hashes. */
export async function exportBankNoteDepositReceipt(proof:Awaited<ReturnType<typeof verifyBankReserveCreditArtifact>>):Promise<Uint8Array>{
 const source=held.get(proof);if(!source)throw Error("BANK_NOTE_CREDIT_CUSTODY_REQUIRED");
 return new TextEncoder().encode(JSON.stringify({schema:"receiz.bank.note-deposit-receipt.v1",creditArtifactBytes:receizBase64UrlEncode(source.bytes),terminalSourceBytes:await packBankNoteBytes(source.terminalSource),privateCashSnapshot:receizBase64UrlEncode(source.privateSnapshot)}));
}
export async function openBankNoteDepositReceipt(bytes:Uint8Array,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>= {}){
 if(bytes.length>4*1024*1024)throw Error("BANK_NOTE_TRANSPORT_CAPACITY");const body=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
 if(body?.schema!=="receiz.bank.note-deposit-receipt.v1"||Object.keys(body).sort().join("|")!=="creditArtifactBytes|privateCashSnapshot|schema|terminalSourceBytes"||![body.creditArtifactBytes,body.privateCashSnapshot,body.terminalSourceBytes].every(v=>typeof v==="string"))throw Error("BANK_NOTE_CREDIT_SOURCE_REQUIRED");
 return verifyBankReserveCreditArtifact(receizBase64UrlDecode(body.creditArtifactBytes),receizBase64UrlDecode(body.privateCashSnapshot),{...options,terminalSource:await unpackBankNoteBytes(body.terminalSourceBytes)});
}
