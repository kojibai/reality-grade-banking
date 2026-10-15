import { digestReceizAuthority } from "../../../packages/receiz-sdk/src/authorityEncoding";
import type { KairosNoteReceivingCustodyCommitment } from "./kairosNoteArtifact";
import {
  deriveKairosNoteCustodyOwnerId,
  verifyKairosNoteReceivingCustody,
} from "./kairosNoteCustodyVerification";
import { verifyReceizOfflineNoteWebAuthnConsumptionReceipt } from "../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody";
import {
  createReceizProofHistoryNode,
  issueReceizVerifiedArtifactTransitionHistory,
  verifyReceizProofHistory,
} from "../../../packages/receiz-sdk/src/proofHistory";
import type { ReceizConstitutionJson } from "../../../packages/receiz-sdk/src/constitution";
import {
  type InMemoryKairosNoteSettlementStore,
  type KairosNoteCanonicalCarrier,
  type KairosNoteLocalSettlement,
  type KairosNoteQualifiedCustodyPacket,
} from "./kairosNoteLocalTransition";
import type { KairosNotePwaCustodyAdapter } from "./kairosNotePwaCustodyAdapter";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const SUCCESSOR_BASIS_SCHEMA = "receiz.offline-note.qualified-successor-basis.v1" as const;

export async function settleKairosNoteQualifiedCustodyTransition(input: Readonly<{
  store: InMemoryKairosNoteSettlementStore;
  carrier: KairosNoteCanonicalCarrier;
  senderCustody: Pick<KairosNotePwaCustodyAdapter, "consumeExactHead">;
  predecessorArtifactBytes: Uint8Array;
  expectedPredecessorArtifactSha256: string;
  successorCustody: KairosNoteReceivingCustodyCommitment;
  acceptedAtKai: string;
  transitionNonce: string;
  admissionRootPublicKeys?: ReadonlyMap<string, import("../../../packages/receiz-sdk/src/verifier/signatureV4").ReceizSignatureV4RootPublicKey>;
}>): Promise<KairosNoteLocalSettlement> {
  if (!DIGEST_RE.test(input.expectedPredecessorArtifactSha256)
    || !KAI_RE.test(input.acceptedAtKai)
    || !input.transitionNonce.trim()) {
    throw new Error("KAIROS_NOTE_QUALIFIED_TRANSITION_INVALID");
  }
  const nextCustody = await verifyKairosNoteReceivingCustody(input.successorCustody, { roots: input.admissionRootPublicKeys });
  const predecessor = await input.carrier.open(input.predecessorArtifactBytes);
  if (predecessor.packet.custodyMode !== "qualified-anonymous") {
    throw new Error("KAIROS_NOTE_QUALIFIED_CUSTODY_REQUIRED");
  }
  const predecessorPacket = predecessor.packet;
  const currentCustody = await verifyKairosNoteReceivingCustody(
    predecessorPacket.currentCustody,
    { roots: input.admissionRootPublicKeys },
  );
  if (predecessor.artifactSha256 !== input.expectedPredecessorArtifactSha256) {
    throw new Error("KAIROS_NOTE_PREDECESSOR_DIGEST_MISMATCH");
  }
  const accepted = input.store.readAccepted(predecessorPacket.noteId);
  if (!accepted || accepted.artifactSha256 !== predecessor.artifactSha256) {
    throw new Error("KAIROS_NOTE_STALE_PREDECESSOR");
  }
  if (predecessorPacket.currentHolderReceizId !== await deriveKairosNoteCustodyOwnerId(currentCustody, { roots: input.admissionRootPublicKeys })) {
    throw new Error("KAIROS_NOTE_CURRENT_CUSTODY_MISMATCH");
  }
  const predecessorHistory = await verifyReceizProofHistory(predecessor.history);
  const predecessorHead = predecessorHistory.headDigests[0];
  if (!predecessorHead) throw new Error("KAIROS_NOTE_HISTORY_INVALID");
  const successorOwnerReceizId = await deriveKairosNoteCustodyOwnerId(nextCustody, { roots: input.admissionRootPublicKeys });
  const successorBasisDigest = await digestReceizAuthority("transition", SUCCESSOR_BASIS_SCHEMA, {
    noteId: predecessorPacket.noteId,
    predecessorArtifactSha256: predecessor.artifactSha256,
    predecessorHeadDigest: predecessorHead,
    currentCustodyCommitmentDigest: currentCustody.receivingCustodyCommitmentDigest,
    successorCustodyCommitmentDigest: nextCustody.receivingCustodyCommitmentDigest,
    currentOwnerReceizId: predecessorPacket.currentHolderReceizId,
    successorOwnerReceizId,
    wholeValuePhiMicro: predecessorPacket.wholeValuePhiMicro,
    acceptedAtKai: input.acceptedAtKai,
    transitionNonce: input.transitionNonce,
  });
  const consumptionReceipt = await input.senderCustody.consumeExactHead({
    qualificationDigest: currentCustody.qualificationDigest,
    currentCustodyCommitmentDigest: currentCustody.receivingCustodyCommitmentDigest,
    noteId: predecessorPacket.noteId,
    predecessorArtifactSha256: predecessor.artifactSha256,
    receiverCustodyCommitmentDigest: nextCustody.receivingCustodyCommitmentDigest,
    wholeValuePhiMicro: predecessorPacket.wholeValuePhiMicro,
    acceptedAtKai: input.acceptedAtKai,
    successorBasisDigest,
  });
  await verifyReceizOfflineNoteWebAuthnConsumptionReceipt(consumptionReceipt);
  const appendNode = await createReceizProofHistoryNode({
    artifactId: predecessorHistory.artifactId,
    registryDigest: predecessorHistory.registryDigest,
    parentDigests: [predecessorHead],
    kaiPulse: input.acceptedAtKai,
    receipt: structuredClone(consumptionReceipt) as unknown as ReceizConstitutionJson,
    event: {
      type: "ownership.transition",
      fromOwnerReceizId: predecessorPacket.currentHolderReceizId,
      toOwnerReceizId: successorOwnerReceizId,
    },
    namespaceData: {
      ownership: {
        schema: "receiz.offline-note.qualified-ownership-append.v1",
        predecessorArtifactSha256: predecessor.artifactSha256,
        predecessorHeadDigest: predecessorHead,
        currentCustodyCommitmentDigest: currentCustody.receivingCustodyCommitmentDigest,
        successorCustodyCommitmentDigest: nextCustody.receivingCustodyCommitmentDigest,
        consumptionReceiptDigest: consumptionReceipt.receiptDigest,
        wholeValuePhiMicro: predecessorPacket.wholeValuePhiMicro,
        transitionNonce: input.transitionNonce,
      },
    },
  });
  const history = await issueReceizVerifiedArtifactTransitionHistory({
    predecessor: predecessorHistory,
    appendNode,
    artifactDigest: predecessor.artifactSha256,
    verifierContextDigest: predecessorHistory.verification.verificationDigest,
  });
  const packet: KairosNoteQualifiedCustodyPacket = Object.freeze({
    ...predecessorPacket,
    custodyMode: "qualified-anonymous",
    currentHolderReceizId: successorOwnerReceizId,
    currentCustody: nextCustody,
    irreversibleConsumptionReceipt: consumptionReceipt,
    predecessorArtifactSha256: predecessor.artifactSha256,
    acceptedAtKai: input.acceptedAtKai,
    transitionNonce: input.transitionNonce,
  });
  const successorBytes = await input.carrier.reseal({ packet, history });
  const successor = await input.carrier.verifySuccessor(successorBytes);
  if (successor.packet.custodyMode !== "qualified-anonymous"
    || successor.packet.noteId !== predecessorPacket.noteId
    || successor.packet.wholeValuePhiMicro !== predecessorPacket.wholeValuePhiMicro
    || successor.packet.currentHolderReceizId !== successorOwnerReceizId
    || successor.packet.currentCustody.receivingCustodyCommitmentDigest
      !== nextCustody.receivingCustodyCommitmentDigest
    || successor.packet.irreversibleConsumptionReceipt?.receiptDigest !== consumptionReceipt.receiptDigest
    || successor.packet.predecessorArtifactSha256 !== predecessor.artifactSha256
    || successor.history.historyDigest !== history.historyDigest) {
    throw new Error("KAIROS_NOTE_SUCCESSOR_VERIFICATION_FAILED");
  }
  input.store.commitSuccessor({
    expectedPredecessorArtifactSha256: predecessor.artifactSha256,
    successor,
  });
  return successor;
}
