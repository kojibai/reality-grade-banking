import { verifyBankCashAccountRebase, type BankCashAccountRebaseReceipt } from "./cashAccountRebase";
import { isBankLocalAccountCreditSource, verifyBankLocalAccountCreditSource, readBankLocalAccountCredit } from "./localAccountCredit";
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
    schema: "receiz.bank.funded-note-source.v1" | "receiz.bank.funded-note-source.v2";
    accountRebases?: readonly BankCashAccountRebaseReceipt[];
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
    cashSuccessor: Readonly<{qualification: Awaited<ReturnType<typeof createReceizOfflineNoteCustodyQualification>>; amountPhiMicro: string; amountUsdCents: string; accountHead: string; acceptedAtKai: string}>;
    issuance: Readonly<{ receipt: ReceizOfflineReserveWebAuthnConsumptionReceiptV1; packet: KairosNoteOpenedCarrier["packet"]; account: { userId: string; keyId: string } | null }>;
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
export function readBankFundedNoteIssuance(value: BankVerifiedFundedNote) {
    const held = custody.get(value);
    if (!held) throw Error("BANK_NOTE_SOURCE_CUSTODY_REQUIRED");
    return structuredClone(held.issuance);
}
export function readBankFundedNoteCashSuccessor(value: BankVerifiedFundedNote) {
    const held = custody.get(value);
    if (!held) throw Error("BANK_NOTE_SOURCE_CUSTODY_REQUIRED");
    return structuredClone(held.cashSuccessor);
}
export async function verifyBankFundedNoteSource(input: BankFundedNoteSource, options: Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
    localCreditDepth?: number;
}> = {}): Promise<BankVerifiedFundedNote> {
    if (!input || !["receiz.bank.funded-note-source.v1","receiz.bank.funded-note-source.v2"].includes(input.schema)
        || input.schema === "receiz.bank.funded-note-source.v1" && input.accountRebases !== undefined
        || input.schema === "receiz.bank.funded-note-source.v2" && (!Array.isArray(input.accountRebases) || input.accountRebases.length > 128)
        || !(input.fundingArtifactBytes instanceof Uint8Array)
        || !Array.isArray(input.reserveConsumptions) || !input.reserveConsumptions.length
        || !Array.isArray(input.noteArtifacts) || !input.noteArtifacts.length
        || input.noteArtifacts.some(bytes => !(bytes instanceof Uint8Array)))
        fail();
    // Snapshot caller-owned arrays before asynchronous verification; later mutation
    // cannot exchange a verified source for another transported object.
    const source = structuredClone(input);
    const receiving = await verifyKairosNoteReceivingCustody(source.fundingCustody, { roots: options.roots });
    requireKairosNoteAttestedReceivingCustody(receiving);
    let qualification: Awaited<ReturnType<typeof createReceizOfflineNoteCustodyQualification>>;
    let balancePhi: string, balanceUsd: string, accountHead: string | null, kai: bigint;
    let allocationId: string | null, fundingArtifactSha256: string, fundingRail: BankNoteRail, rate: string;
    let fundingAccount: { userId: string; keyId: string } | null = null;
    if (isBankLocalAccountCreditSource(source.fundingArtifactBytes)) {
        const credit = await verifyBankLocalAccountCreditSource(source.fundingArtifactBytes, options);
        const terminal = readBankLocalAccountCredit(credit), origin = readBankFundedNoteHead(terminal.note);
        if (origin.packet.custodyMode !== "qualified-anonymous"
            || receiving.receivingCustodyCommitmentDigest !== origin.packet.currentCustody.receivingCustodyCommitmentDigest
            || receiving.custodyPublicKeyRawB64u !== terminal.receipt.custodyPublicKeyRawB64u) fail();
        qualification = credit.qualification;
        fundingAccount = { userId: credit.receiverUserId, keyId: credit.receiverKeyId };
        balancePhi = credit.amountPhiMicro; balanceUsd = credit.amountUsdCents;
        accountHead = credit.successorAccountPortableStateDigest;
        kai = BigInt(credit.acceptedAtKai); allocationId = credit.creditId;
        fundingArtifactSha256 = credit.artifactSha256; fundingRail = credit.rail; rate = credit.usdPerPhiMicrocents;
    } else {
        const verification = options.roots ? await verifyReceizArtifactWithCanonicalRoots(source.fundingArtifactBytes, options.roots) : await verifyReceizArtifact(source.fundingArtifactBytes);
        const admission = await createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: options.roots })(verification, { profile: "portable-state" });
        if ("code" in admission || admission.verdict === "profile-denied" || admission.profile !== "portable-state") throw Error("BANK_NOTE_COMPLETE_FUNDING_SOURCE_REQUIRED");
        const fundingDocument = await parseReceizPortableAssetDocument(admission.recoveredState);
        const evidence = ["bank_allocated_reserve", "bank_allocated_settlement"].includes(String(fundingDocument.settlement.state))
            ? await verifyBankNoteAllocation(source.fundingArtifactBytes, options) : await verifyKairosOfflineReserveFundingArtifactAdmission(admission);
        const funding = evidence.funding;
        if ("accountUserId" in funding && "receizKeyId" in funding) fundingAccount = { userId: funding.accountUserId, keyId: funding.receizKeyId };
        allocationId = "allocationId" in funding ? funding.allocationId : null;
        if (receiving.qualificationDigest !== funding.qualificationDigest || receiving.installationCommitment !== funding.installationCommitment) fail();
        qualification = await createReceizOfflineNoteCustodyQualification({ profileId: receiving.profileId, profileEvidenceDigest: receiving.profileEvidenceDigest, adapterKind: receiving.adapterKind, custodyPublicKeyRawB64u: receiving.custodyPublicKeyRawB64u, stateCommitment: receiving.stateCommitment, stateSequence: receiving.stateSequence });
        balancePhi = bankAllocatedPhi(funding); balanceUsd = funding.amountUsdCents;
        accountHead = allocationId !== null && "predecessorAccountPortableStateDigest" in funding ? funding.predecessorAccountPortableStateDigest : null;
        kai = BigInt(funding.fundedAtKai); fundingArtifactSha256 = evidence.artifactSha256; fundingRail = bankAllocationRail(funding); rate = funding.usdPerPhiMicrocents;
    }
    let finalReceipt: ReceizOfflineReserveWebAuthnConsumptionReceiptV1 | null = null, rebaseIndex = 0;
    const rebases = source.accountRebases ?? [];
    for (const candidate of source.reserveConsumptions) {
        const receipt = await verifyReceizOfflineReserveWebAuthnConsumptionReceipt(candidate);
        while (receipt.qualificationDigest !== qualification.qualificationDigest && rebaseIndex < rebases.length) {
            const step = rebases[rebaseIndex++]!;
            if (accountHead === null || BigInt(step.acceptedAtKai) < kai) fail();
            qualification = await verifyBankCashAccountRebase(step,{qualification,fundingArtifactSha256,rpId:receiving.platformAttestationCertificate.rpId,origin:receiving.platformAttestationCertificate.origin,
                accountHead:accountHead!,reservePhiMicro:balancePhi,reserveUsdCents:balanceUsd});
            accountHead=step.successorAccountPortableStateDigest; kai=BigInt(step.acceptedAtKai);
        }
        if (receipt.qualificationDigest !== qualification.qualificationDigest
            || receipt.installationCommitment !== receiving.installationCommitment
            || receipt.custodyPublicKeyRawB64u !== receiving.custodyPublicKeyRawB64u
            || receipt.origin !== receiving.platformAttestationCertificate.origin
            || receipt.rpId !== receiving.platformAttestationCertificate.rpId
            || receipt.reserveBeforePhiMicro !== balancePhi || receipt.reserveBeforeUsdCents !== balanceUsd
            || receipt.usdPerPhiMicrocents !== rate
            || accountHead !== null && receipt.predecessorAccountPortableStateDigest !== accountHead
            || BigInt(receipt.acceptedAtKai) < kai)
            fail();
        balancePhi = receipt.reserveAfterPhiMicro;
        balanceUsd = receipt.reserveAfterUsdCents;
        accountHead = receipt.successorReserveStateContentDigest;
        kai = BigInt(receipt.acceptedAtKai);
        qualification = await createReceizOfflineNoteCustodyQualification({ profileId: qualification.profileId, profileEvidenceDigest: qualification.profileEvidenceDigest, adapterKind: qualification.adapterKind, custodyPublicKeyRawB64u: qualification.custodyPublicKeyRawB64u, stateCommitment: receipt.nextReserveStateCommitment, stateSequence: receipt.nextReserveStateSequence });
        finalReceipt = receipt;
    }
    if (rebaseIndex !== rebases.length) fail();
    const carrier = createKairosNotePortableCarrier({ canonicalSignatureV4RootPublicKeys: options.roots });
    let previous: KairosNoteOpenedCarrier | null = null, genesis: KairosNoteOpenedCarrier | null = null;
    for (const bytes of source.noteArtifacts) {
        const opened = await carrier.open(bytes), packet = opened.packet;
        if (packet.custodyMode !== "qualified-anonymous")
            fail();
        const nextCustody = await verifyKairosNoteReceivingCustody(packet.currentCustody, { roots: options.roots });
        requireKairosNoteAttestedReceivingCustody(nextCustody);
        if (!previous) {
            genesis = opened;
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
    const result = Object.freeze({ rail: fundingRail, noteId: note.packet.noteId, noteArtifactSha256: note.artifactSha256, fundingArtifactSha256, allocationId, amountPhiMicro: finalReceipt!.amountPhiMicro, amountUsdCents: finalReceipt!.amountUsdCents, usdPerPhiMicrocents: finalReceipt!.usdPerPhiMicrocents });
    custody.set(result, Object.freeze({ source, note, cashSuccessor: {qualification,amountPhiMicro:balancePhi,amountUsdCents:balanceUsd,accountHead:accountHead!,acceptedAtKai:String(kai)}, issuance: { receipt: finalReceipt!, packet: genesis!.packet, account: fundingAccount } }));
    return result;
}
