import { verifyBankNoteAllocation, bankAllocationRail, bankAllocatedPhi, type BankNoteRail } from "./allocationEvidence";
import { parseReceizPortableAssetDocument } from "../../../../packages/receiz-sdk/src/portableAsset";
import { createReceizArtifactAdmissionEngine } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../../packages/receiz-sdk/src/artifactVerification";
import { verifyReceizArtifact } from "../../../../packages/receiz-sdk/src/index";
import { createReceizOfflineNoteCustodyQualification } from "../../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import { verifyReceizOfflineReserveWebAuthnConsumptionReceipt, type ReceizOfflineReserveWebAuthnConsumptionReceiptV1 } from "../../../../packages/receiz-sdk/src/offlineReserveWebAuthnCustody";
import { digestReceizAuthority } from "../../../../packages/receiz-sdk/src/authorityEncoding";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import { verifyKairosOfflineReserveFundingArtifactAdmission } from "../kairosReserveFundingBinding";
import { createKairosNotePortableCarrier } from "../kairosNotePortableCarrier";
import { verifyKairosNoteReceivingCustody, requireKairosNoteAttestedReceivingCustody } from "../kairosNoteCustodyVerification";
import type { ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2 } from "../../../../packages/receiz-sdk/src/offlineNoteAttestedCustody";
import type { KairosNoteOpenedCarrier, KairosNoteQualifiedCustodyPacket } from "../kairosNoteLocalTransition";
/** Transport of complete sources, never an authority-bearing JSON assertion.
 * Each artifact and custody receipt is independently reverified on admission. */
export type BankFundedNoteSource = Readonly<{
    schema: "receiz.bank.funded-note-source.v1";
    fundingArtifactBytes: Uint8Array;
    fundingCustody: ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2;
    reserveConsumptions: readonly ReceizOfflineReserveWebAuthnConsumptionReceiptV1[];
    noteArtifacts: readonly Uint8Array[];
}>;
export type BankVerifiedFundedNote = Readonly<{
    rail: BankNoteRail;
    noteId: string;
    noteArtifactSha256: string;
    fundingArtifactSha256: string;
    amountPhiMicro: string;
    amountUsdCents: string;
    usdPerPhiMicrocents: string;
    allocationId: string | null;
}>;
const custody = new WeakMap<BankVerifiedFundedNote, Readonly<{
    source: BankFundedNoteSource;
    note: KairosNoteOpenedCarrier;
}>>();
const fail = (): never => { throw new Error("BANK_NOTE_COMPLETE_FUNDING_SOURCE_REQUIRED"); };
export function readBankFundedNoteSource(value: BankVerifiedFundedNote): BankFundedNoteSource {
    const held = custody.get(value);
    if (!held)
        throw new Error("BANK_NOTE_SOURCE_CUSTODY_REQUIRED");
    return structuredClone(held.source);
}
export function readBankFundedNoteHead(value: BankVerifiedFundedNote): KairosNoteOpenedCarrier {
    const held = custody.get(value);
    if (!held)
        throw new Error("BANK_NOTE_SOURCE_CUSTODY_REQUIRED");
    return structuredClone(held.note);
}
export async function verifyBankFundedNoteSource(input: BankFundedNoteSource, options: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}> = {}): Promise<BankVerifiedFundedNote> {
    if (!input || input.schema !== "receiz.bank.funded-note-source.v1"
        || !(input.fundingArtifactBytes instanceof Uint8Array)
        || !Array.isArray(input.reserveConsumptions) || !input.reserveConsumptions.length
        || !Array.isArray(input.noteArtifacts) || !input.noteArtifacts.length
        || input.noteArtifacts.some(bytes => !(bytes instanceof Uint8Array)))
        fail();
    // Snapshot caller-owned arrays before asynchronous verification; later mutation
    // cannot exchange a verified source for another transported object.
    const source = structuredClone(input);
    const verification = options.roots ? await verifyReceizArtifactWithCanonicalRoots(source.fundingArtifactBytes, options.roots) : await verifyReceizArtifact(source.fundingArtifactBytes);
    const admission = await createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: options.roots })(verification, { profile: "portable-state" });
    if ("code" in admission || admission.verdict === "profile-denied" || admission.profile !== "portable-state")
        throw new Error("BANK_NOTE_COMPLETE_FUNDING_SOURCE_REQUIRED");
    const fundingDocument = await parseReceizPortableAssetDocument(admission.recoveredState);
    const evidence = ["bank_allocated_reserve", "bank_allocated_settlement"].includes(String(fundingDocument.settlement.state))
        ? await verifyBankNoteAllocation(source.fundingArtifactBytes, options)
        : await verifyKairosOfflineReserveFundingArtifactAdmission(admission);
    const allocationId = "allocationId" in evidence.funding ? evidence.funding.allocationId : null;
    const receiving = await verifyKairosNoteReceivingCustody(source.fundingCustody, { roots: options.roots });
    requireKairosNoteAttestedReceivingCustody(receiving);
    const funding = evidence.funding;
    if (receiving.qualificationDigest !== funding.qualificationDigest || receiving.installationCommitment !== funding.installationCommitment)
        fail();
    let qualification = await createReceizOfflineNoteCustodyQualification({ profileId: receiving.profileId, profileEvidenceDigest: receiving.profileEvidenceDigest, adapterKind: receiving.adapterKind, custodyPublicKeyRawB64u: receiving.custodyPublicKeyRawB64u, stateCommitment: receiving.stateCommitment, stateSequence: receiving.stateSequence });
    let balancePhi = bankAllocatedPhi(funding), balanceUsd = funding.amountUsdCents;
    let accountHead: string | null = null, kai = BigInt(funding.fundedAtKai);
    let finalReceipt: ReceizOfflineReserveWebAuthnConsumptionReceiptV1 | null = null;
    for (const candidate of source.reserveConsumptions) {
        const receipt = await verifyReceizOfflineReserveWebAuthnConsumptionReceipt(candidate);
        if (receipt.qualificationDigest !== qualification.qualificationDigest
            || receipt.installationCommitment !== receiving.installationCommitment
            || receipt.custodyPublicKeyRawB64u !== receiving.custodyPublicKeyRawB64u
            || receipt.origin !== receiving.platformAttestationCertificate.origin
            || receipt.rpId !== receiving.platformAttestationCertificate.rpId
            || receipt.reserveBeforePhiMicro !== balancePhi || receipt.reserveBeforeUsdCents !== balanceUsd
            || receipt.usdPerPhiMicrocents !== funding.usdPerPhiMicrocents
            || accountHead !== null && receipt.predecessorAccountPortableStateDigest !== accountHead
            || allocationId !== null && accountHead === null && receipt.predecessorAccountPortableStateDigest !== funding.predecessorAccountPortableStateDigest
            || BigInt(receipt.acceptedAtKai) < kai)
            fail();
        balancePhi = receipt.reserveAfterPhiMicro;
        balanceUsd = receipt.reserveAfterUsdCents;
        accountHead = receipt.successorReserveStateContentDigest;
        kai = BigInt(receipt.acceptedAtKai);
        qualification = await createReceizOfflineNoteCustodyQualification({ profileId: qualification.profileId, profileEvidenceDigest: qualification.profileEvidenceDigest, adapterKind: qualification.adapterKind, custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u, stateCommitment: receipt.nextReserveStateCommitment, stateSequence: receipt.nextReserveStateSequence });
        finalReceipt = receipt;
    }
    const carrier = createKairosNotePortableCarrier({ canonicalSignatureV4RootPublicKeys: options.roots });
    let previous: KairosNoteOpenedCarrier | null = null;
    for (const bytes of source.noteArtifacts) {
        const opened = await carrier.open(bytes), packet = opened.packet;
        if (packet.custodyMode !== "qualified-anonymous")
            fail();
        const nextCustody = await verifyKairosNoteReceivingCustody(packet.currentCustody, { roots: options.roots });
        requireKairosNoteAttestedReceivingCustody(nextCustody);
        if (!previous) {
            if (packet.predecessorArtifactSha256 !== null || packet.irreversibleConsumptionReceipt !== null
                || opened.artifactSha256 !== finalReceipt!.noteArtifactSha256
                || packet.wholeValuePhiMicro !== finalReceipt!.amountPhiMicro
                || packet.acceptedAtKai !== finalReceipt!.acceptedAtKai)
                fail();
        }
        else {
            const before = previous.packet as KairosNoteQualifiedCustodyPacket;
            if (before.custodyMode !== "qualified-anonymous")
                fail();
            const receipt = packet.irreversibleConsumptionReceipt as import("../../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody").ReceizOfflineNoteWebAuthnConsumptionReceiptV1 | null;
            if (!receipt || packet.noteId !== before.noteId || packet.proofArtifactId !== before.proofArtifactId
                || packet.wholeValuePhiMicro !== before.wholeValuePhiMicro || packet.predecessorArtifactSha256 !== previous.artifactSha256
                || receipt.currentCustodyCommitmentDigest !== before.currentCustody.receivingCustodyCommitmentDigest
                || receipt.custodyPublicKeyRawB64u !== before.currentCustody.custodyPublicKeyRawB64u
                || BigInt(packet.acceptedAtKai) <= BigInt(before.acceptedAtKai))
                fail();
            const predecessorHead = previous.history.headDigests[0];
            const basis = await digestReceizAuthority("transition", "receiz.offline-note.qualified-successor-basis.v1", {
                noteId: before.noteId, predecessorArtifactSha256: previous.artifactSha256, predecessorHeadDigest: predecessorHead,
                currentCustodyCommitmentDigest: before.currentCustody.receivingCustodyCommitmentDigest, successorCustodyCommitmentDigest: nextCustody.receivingCustodyCommitmentDigest,
                currentOwnerReceizId: before.currentHolderReceizId, successorOwnerReceizId: packet.currentHolderReceizId,
                wholeValuePhiMicro: before.wholeValuePhiMicro, acceptedAtKai: packet.acceptedAtKai, transitionNonce: packet.transitionNonce,
            });
            if (!receipt || receipt.successorBasisDigest !== basis)
                fail();
            // The complete enclosing history must retain the exact predecessor nodes.
            const carried = new Set(opened.history.nodes.map(node => node.nodeDigest));
            if (previous.history.nodes.some(node => !carried.has(node.nodeDigest)))
                fail();
        }
        previous = opened;
    }
    const note = previous!;
    const result = Object.freeze({ rail: bankAllocationRail(funding), noteId: note.packet.noteId, noteArtifactSha256: note.artifactSha256, fundingArtifactSha256: evidence.artifactSha256, allocationId, amountPhiMicro: finalReceipt!.amountPhiMicro, amountUsdCents: finalReceipt!.amountUsdCents, usdPerPhiMicrocents: finalReceipt!.usdPerPhiMicrocents });
    custody.set(result, Object.freeze({ source, note }));
    return result;
}
