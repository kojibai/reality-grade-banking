import { canonicalizeReceizConstitution as canonical } from "../../../../packages/receiz-sdk/src/constitution";
import { digestReceizAuthority } from "../../../../packages/receiz-sdk/src/authorityEncoding";
import { createReceizArtifactAdmissionEngine } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../../packages/receiz-sdk/src/artifactVerification";
import { verifyReceizArtifact } from "../../../../packages/receiz-sdk/src/index";
import { parseReceizPortableAssetDocument, serializeReceizPortableAssetDocument, attachReceizPortableProofHistory, deriveReceizPortableOwnershipContinuity } from "../../../../packages/receiz-sdk/src/portableAsset";
import { createReceizProofHistoryNode, issueReceizVerifiedArtifactTransitionHistory, verifyReceizProofHistory } from "../../../../packages/receiz-sdk/src/proofHistory";
import { verifyReceizOfflineNoteWebAuthnConsumptionReceipt, type ReceizOfflineNoteWebAuthnConsumptionReceiptV1 } from "../../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import type { ReceizConstitutionJson } from "../../../../packages/receiz-sdk/src/constitution";
import { readBankFundedNoteHead, readBankFundedNoteSource, verifyBankFundedNoteSource, type BankVerifiedFundedNote } from "./fundedNote";
import { encodeBankFundedSource, decodeBankFundedSource } from "./sourceCodec";
import { receizBase64UrlEncode, receizBase64UrlDecode } from "../../../../packages/receiz-sdk/src/identity";
import { receizeDocumentBytesClient } from "../../documentSeal/receizeDocumentBytesClient";
import type { KairosNotePwaCustodyAdapter } from "../kairosNotePwaCustodyAdapter";
export type BankNoteRedemptionIntent = Readonly<{
    schema: "receiz.bank.note-redemption.v1" | "receiz.bank.note-redemption.v2";
    rail?: "settlement";
    noteId: string;
    noteArtifactSha256: string;
    receiverUserId: string;
    receiverKeyId: string;
    amountPhiMicro: string;
    amountUsdCents: string;
    acceptedAtKai: string;
    nonce: string;
}>;
type Options = Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    sealDocument?: typeof receizeDocumentBytesClient;
}>;
const verified = new WeakMap<object, {
    intent: BankNoteRedemptionIntent;
    note: BankVerifiedFundedNote;
    receipt: ReceizOfflineNoteWebAuthnConsumptionReceiptV1;
    bytes: Uint8Array;
}>();
async function intentDigests(intent: BankNoteRedemptionIntent) {
    const settlement = intent?.schema === "receiz.bank.note-redemption.v2";
    if (!intent || (!settlement && intent.schema !== "receiz.bank.note-redemption.v1") || (settlement && intent.rail !== "settlement") || Object.keys(intent).sort().join("|") !== (settlement ? "acceptedAtKai|amountPhiMicro|amountUsdCents|nonce|noteArtifactSha256|noteId|rail|receiverKeyId|receiverUserId|schema" : "acceptedAtKai|amountPhiMicro|amountUsdCents|nonce|noteArtifactSha256|noteId|receiverKeyId|receiverUserId|schema") || !/^([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i.test(intent.receiverUserId) || !/^([a-f0-9]{64})$/.test(intent.receiverKeyId) || !/^(0|[1-9][0-9]*)$/.test(intent.acceptedAtKai) || !intent.nonce?.trim())
        throw Error("BANK_NOTE_REDEMPTION_INVALID");
    return { destination: await digestReceizAuthority("identity", settlement ? "receiz.bank.settlement-destination.v1" : "receiz.bank.reserve-destination.v1", { userId: intent.receiverUserId, keyId: intent.receiverKeyId }), digest: await digestReceizAuthority("transition", intent.schema, intent) };
}
async function admit(bytes: Uint8Array, options: Options) {
    const v = options.roots ? await verifyReceizArtifactWithCanonicalRoots(bytes, options.roots) : await verifyReceizArtifact(bytes);
    const a = await createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: options.roots })(v, { profile: "portable-state" });
    if (a.verdict === "profile-denied" || "code" in a || a.profile !== "portable-state" || !a.proofHistory)
        throw Error("BANK_NOTE_TERMINAL_PROOF_REQUIRED");
    return a;
}
/** Consume the held native note exactly once, then seal its terminal history.
 * The intent is retained by the caller BEFORE this function; retrying the exact
 * intent reuses the adapter's retained receipt after irreversible consumption. */
export async function prepareBankNoteRedemption(note: BankVerifiedFundedNote, intent: BankNoteRedemptionIntent, custody: Pick<KairosNotePwaCustodyAdapter, "consumeExactHead">, options: Options = {}) {
    const head = readBankFundedNoteHead(note), packet = head.packet;
    if (packet.custodyMode !== "qualified-anonymous")
        throw Error("BANK_NOTE_QUALIFIED_CUSTODY_REQUIRED");
    const { destination, digest } = await intentDigests(intent);
    if ((intent.rail ?? "reserve") !== note.rail || !note.allocationId || intent.noteId !== note.noteId || intent.noteArtifactSha256 !== note.noteArtifactSha256 || intent.amountPhiMicro !== note.amountPhiMicro || intent.amountUsdCents !== note.amountUsdCents || BigInt(intent.acceptedAtKai) <= BigInt(packet.acceptedAtKai))
        throw Error("BANK_NOTE_REDEMPTION_INVALID");
    const receipt = await custody.consumeExactHead({ qualificationDigest: packet.currentCustody.qualificationDigest, currentCustodyCommitmentDigest: packet.currentCustody.receivingCustodyCommitmentDigest, noteId: note.noteId, predecessorArtifactSha256: head.artifactSha256, receiverCustodyCommitmentDigest: destination, wholeValuePhiMicro: note.amountPhiMicro, acceptedAtKai: intent.acceptedAtKai, successorBasisDigest: digest });
    await verifyReceizOfflineNoteWebAuthnConsumptionReceipt(receipt);
    const admission = await admit(head.artifactBytes, options), document = await parseReceizPortableAssetDocument(admission.recoveredState), history = await verifyReceizProofHistory(admission.proofHistory!);
    const node = await createReceizProofHistoryNode({ artifactId: history.artifactId, registryDigest: history.registryDigest, parentDigests: [history.headDigests[0]!], kaiPulse: intent.acceptedAtKai, receipt: structuredClone(receipt) as unknown as ReceizConstitutionJson, event: { type: "lifecycle.terminal", terminal: "settled" }, namespaceData: { settlement: { schema: intent.schema, redemptionDigest: digest, receiverUserId: intent.receiverUserId, receiverKeyId: intent.receiverKeyId } } });
    const next = await issueReceizVerifiedArtifactTransitionHistory({ predecessor: history, appendNode: node, artifactDigest: head.artifactSha256, verifierContextDigest: history.verification.verificationDigest });
    const terminal = await attachReceizPortableProofHistory(await parseReceizPortableAssetDocument({ ...document, settlement: { ...document.settlement, state: note.rail === "settlement" ? "bank_redeemed_settlement" : "bank_redeemed_reserve", bankRedemption: { intent, receipt, fundingArtifactSha256: note.fundingArtifactSha256 } } }), next);
    const result = await (options.sealDocument ?? receizeDocumentBytesClient)({ fileBytes: serializeReceizPortableAssetDocument(terminal), filename: `redeemed-note-${note.noteId}.receiz.json`, mime: "application/json", options: { nativeRecordSeal: { ownerReceizId: document.ownership.ownerReceizId, recordId: (admission.openedArtifact.verification.bundle!.nativeRecordSeal as {
                    recordId: string;
                }).recordId, ownershipContinuity: await deriveReceizPortableOwnershipContinuity(terminal) } } });
    const sourceBytes = new TextEncoder().encode(JSON.stringify({ schema: "receiz.bank.note-redemption-source.v1", terminalArtifactBytes: receizBase64UrlEncode(result.artifactBytes), fundedSource: encodeBankFundedSource(readBankFundedNoteSource(note)) }));
    return verifyBankNoteRedemption(sourceBytes, options);
}
export async function verifyBankNoteRedemption(bytesInput: Uint8Array, options: Options = {}) {
    const bytes = bytesInput.slice(), transport = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as {
        schema: string;
        terminalArtifactBytes: string;
        fundedSource: unknown;
    };
    if (transport.schema !== "receiz.bank.note-redemption-source.v1" || Object.keys(transport).sort().join("|") !== "fundedSource|schema|terminalArtifactBytes" || typeof transport.terminalArtifactBytes !== "string")
        throw Error("BANK_NOTE_TERMINAL_PROOF_REQUIRED");
    const admission = await admit(receizBase64UrlDecode(transport.terminalArtifactBytes), options), document = await parseReceizPortableAssetDocument(admission.recoveredState);
    const body = document.settlement.bankRedemption as unknown as {
        intent: BankNoteRedemptionIntent;
        receipt: ReceizOfflineNoteWebAuthnConsumptionReceiptV1;
        fundingArtifactSha256: string;
    };
    if (document.assetType !== "wallet_note" || !["bank_redeemed_reserve","bank_redeemed_settlement"].includes(String(document.settlement.state)) || !body || Object.keys(body).sort().join("|") !== "fundingArtifactSha256|intent|receipt")
        throw Error("BANK_NOTE_TERMINAL_PROOF_REQUIRED");
    const intent = body.intent, { destination, digest } = await intentDigests(intent), note = await verifyBankFundedNoteSource(decodeBankFundedSource(transport.fundedSource), options), head = readBankFundedNoteHead(note), packet = head.packet;
    const receipt = await verifyReceizOfflineNoteWebAuthnConsumptionReceipt(body.receipt);
    if ((intent.rail ?? "reserve") !== note.rail || document.settlement.state !== `bank_redeemed_${note.rail}` || body.fundingArtifactSha256 !== note.fundingArtifactSha256 || packet.custodyMode !== "qualified-anonymous" || !note.allocationId || intent.noteId !== note.noteId || intent.noteArtifactSha256 !== head.artifactSha256 || intent.amountPhiMicro !== note.amountPhiMicro || intent.amountUsdCents !== note.amountUsdCents || BigInt(intent.acceptedAtKai) <= BigInt(packet.acceptedAtKai)
        || receipt.predecessorArtifactSha256 !== head.artifactSha256 || receipt.noteId !== note.noteId || receipt.wholeValuePhiMicro !== note.amountPhiMicro || receipt.currentCustodyCommitmentDigest !== packet.currentCustody.receivingCustodyCommitmentDigest || receipt.activationReceipt.qualificationDigest !== packet.currentCustody.qualificationDigest || receipt.custodyPublicKeyRawB64u !== packet.currentCustody.custodyPublicKeyRawB64u || receipt.receiverCustodyCommitmentDigest !== destination || receipt.successorBasisDigest !== digest || receipt.acceptedAtKai !== intent.acceptedAtKai || document.payload.sha256 !== packet.proofArtifactId || document.ownership.ownerReceizId !== packet.currentHolderReceizId)
        throw Error("BANK_NOTE_REDEMPTION_BINDING_MISMATCH");
    const history = await verifyReceizProofHistory(admission.proofHistory!), current = history.nodes.find(n => n.nodeDigest === history.headDigests[0]);
    if (history.headDigests.length !== 1 || !current || current.event.type !== "lifecycle.terminal" || current.event.terminal !== "settled" || current.parentDigests.length !== 1 || current.parentDigests[0] !== head.history.headDigests[0] || current.kaiPulse !== intent.acceptedAtKai || canonical(current.receipt) !== canonical(receipt) || head.history.nodes.some(n => !history.nodes.some(v => v.nodeDigest === n.nodeDigest)))
        throw Error("BANK_NOTE_TERMINAL_HISTORY_REQUIRED");
    const result = Object.freeze({ rail: note.rail, noteId: note.noteId, allocationId: note.allocationId, redemptionDigest: digest, artifactSha256: admission.artifactSha256, receiverUserId: intent.receiverUserId, receiverKeyId: intent.receiverKeyId, amountPhiMicro: note.amountPhiMicro, amountUsdCents: note.amountUsdCents, consumptionReceiptDigest: receipt.receiptDigest });
    verified.set(result, { intent: structuredClone(intent), note, receipt, bytes });
    return result;
}
export type BankVerifiedNoteRedemption = Awaited<ReturnType<typeof verifyBankNoteRedemption>>;
export function readBankNoteRedemption(value: BankVerifiedNoteRedemption) { const held = verified.get(value); if (!held)
    throw Error("BANK_NOTE_TERMINAL_CUSTODY_REQUIRED"); return { intent: structuredClone(held.intent), note: held.note, receipt: structuredClone(held.receipt), bytes: held.bytes.slice() }; }
