import type { ReceizKeyFile } from "../../../packages/receiz-sdk/src/identity.ts";
import type {
  ReceizOfflineNoteReceivingCustodyCommitmentV1,
} from "../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody.ts";
import type { ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2 } from "../../../packages/receiz-sdk/src/offlineNoteAttestedCustody.ts";
import type {
  ReceizOfflineNoteWebAuthnConsumptionReceiptV1,
} from "../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody.ts";
import {
  verifyReceizOfflineNoteReceivingSeal,
  type ReceizOfflineNoteReceivingSealV2,
} from "../../../packages/receiz-sdk/src/offlineNoteReceivingSeal.ts";
import { reduceReceizWholeNoteCapacity } from "../../../packages/receiz-sdk/src/noteCausalSubtraction.ts";
import {
  createReceizOwnershipHandoffAuthorityReceipt,
  classifyReceizReconciliationDivergence,
} from "../../../packages/receiz-sdk/src/globalReconciliation.ts";
import {
  createReceizProofHistoryNode,
  issueReceizVerifiedArtifactTransitionHistory,
  verifyReceizProofHistory,
  type ReceizVerifiedProofHistory,
} from "../../../packages/receiz-sdk/src/proofHistory.ts";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;

type KairosNotePacketBase = Readonly<{
  kind: "kairos_note_packet_v2";
  noteId: string;
  proofArtifactId?: string;
  noteState: "held_bound";
  wholeValuePhiMicro: string;
  currentHolderReceizId: string;
  predecessorArtifactSha256: string | null;
  acceptedAtKai: string;
  transitionNonce: string;
}> & Readonly<Record<string, unknown>>;

export type KairosNoteIdentityBoundPacket = KairosNotePacketBase & Readonly<{
  custodyMode?: "identity-bound";
  holderIdentityArtifactSha256: string;
  holderDestinationDigest: string;
  holderReceivingSealDigest: string;
  holderInstallationCommitment: string;
  holderIdentityKeyId: string;
}>;

export type KairosNoteQualifiedCustodyPacket = KairosNotePacketBase & Readonly<{
  custodyMode: "qualified-anonymous";
  currentCustody:
    | ReceizOfflineNoteReceivingCustodyCommitmentV1
    | ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2;
  irreversibleConsumptionReceipt: ReceizOfflineNoteWebAuthnConsumptionReceiptV1 | null;
}>;

export type KairosNoteLocalPacket = KairosNoteIdentityBoundPacket | KairosNoteQualifiedCustodyPacket;

export type KairosNoteOpenedCarrier = Readonly<{
  artifactBytes: Uint8Array;
  artifactSha256: string;
  packet: KairosNoteLocalPacket;
  history: ReceizVerifiedProofHistory;
}>;

export type KairosNoteCanonicalCarrier = Readonly<{
  open(artifactBytes: Uint8Array): Promise<KairosNoteOpenedCarrier>;
  reseal(input: Readonly<{
    packet: KairosNoteLocalPacket;
    history: ReceizVerifiedProofHistory;
  }>): Promise<Uint8Array>;
  verifySuccessor(artifactBytes: Uint8Array): Promise<KairosNoteOpenedCarrier>;
}>;

export type KairosNoteAcceptedHead = KairosNoteOpenedCarrier;

export type KairosNoteSettlementOutboxEntry = Readonly<{
  noteId: string;
  predecessorArtifactSha256: string;
  successorArtifactSha256: string;
  acceptedAtKai: string;
  status: "pending";
}>;

export type KairosNoteLocalSettlement = KairosNoteOpenedCarrier;

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice().buffer))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function assertPacket(packet: KairosNoteLocalPacket): void {
  if (packet.kind !== "kairos_note_packet_v2"
    || packet.noteState !== "held_bound"
    || !packet.noteId.trim()
    || !KAI_RE.test(packet.wholeValuePhiMicro)
    || BigInt(packet.wholeValuePhiMicro) <= 0n
    || !packet.currentHolderReceizId.trim()
    || !KAI_RE.test(packet.acceptedAtKai)
    || !packet.transitionNonce.trim()
    || (packet.predecessorArtifactSha256 !== null
      && !DIGEST_RE.test(packet.predecessorArtifactSha256))) {
    throw new Error("KAIROS_NOTE_PACKET_INVALID");
  }
  if (packet.custodyMode === "qualified-anonymous") {
    if ((packet.currentCustody.schema !== "receiz.offline-note.receiving-custody.v1"
        && packet.currentCustody.schema !== "receiz.offline-note.attested-receiving-custody.v2")
      || packet.currentCustody.receivingCustodyCommitmentDigest.length !== 64
      || (packet.predecessorArtifactSha256 === null) !== (packet.irreversibleConsumptionReceipt === null)) {
      throw new Error("KAIROS_NOTE_PACKET_INVALID");
    }
    return;
  }
  if (!DIGEST_RE.test(packet.holderIdentityArtifactSha256)
    || !DIGEST_RE.test(packet.holderDestinationDigest)
    || !DIGEST_RE.test(packet.holderReceivingSealDigest)
    || !DIGEST_RE.test(packet.holderInstallationCommitment)
    || !DIGEST_RE.test(packet.holderIdentityKeyId)) {
    throw new Error("KAIROS_NOTE_PACKET_INVALID");
  }
}

async function assertCanonicalOpened(opened: KairosNoteOpenedCarrier): Promise<void> {
  assertPacket(opened.packet);
  const actualDigest = await sha256Hex(opened.artifactBytes);
  if (opened.artifactSha256 !== actualDigest) throw new Error("KAIROS_NOTE_ARTIFACT_DIGEST_MISMATCH");
  const history = await verifyReceizProofHistory(opened.history);
  if (history.artifactId !== (opened.packet.proofArtifactId ?? opened.packet.noteId)
    || history.headDigests.length !== 1) {
    throw new Error("KAIROS_NOTE_HISTORY_INVALID");
  }
  if (history.currentOwnerReceizId !== null
    && history.currentOwnerReceizId !== opened.packet.currentHolderReceizId) {
    throw new Error("KAIROS_NOTE_HOLDER_HISTORY_MISMATCH");
  }
}

export class InMemoryKairosNoteSettlementStore {
  readonly #accepted = new Map<string, KairosNoteAcceptedHead>();
  readonly #outbox: KairosNoteSettlementOutboxEntry[] = [];

  async admitGenesis(opened: KairosNoteOpenedCarrier): Promise<void> {
    await assertCanonicalOpened(opened);
    if (opened.packet.predecessorArtifactSha256 !== null || this.#accepted.has(opened.packet.noteId)) {
      throw new Error("KAIROS_NOTE_GENESIS_INVALID");
    }
    this.#accepted.set(opened.packet.noteId, opened);
  }

  async admitVerifiedHeldHead(opened: KairosNoteOpenedCarrier): Promise<void> {
    await assertCanonicalOpened(opened);
    if (this.#accepted.has(opened.packet.noteId)) {
      throw new Error("KAIROS_NOTE_ACCEPTED_HEAD_ALREADY_PRESENT");
    }
    this.#accepted.set(opened.packet.noteId, opened);
  }

  readAccepted(noteId: string): KairosNoteAcceptedHead | null {
    return this.#accepted.get(noteId) ?? null;
  }

  readOutbox(): readonly KairosNoteSettlementOutboxEntry[] {
    return [...this.#outbox];
  }

  commitSuccessor(input: Readonly<{
    expectedPredecessorArtifactSha256: string;
    successor: KairosNoteAcceptedHead;
  }>): void {
    const current = this.#accepted.get(input.successor.packet.noteId);
    if (!current || current.artifactSha256 !== input.expectedPredecessorArtifactSha256) {
      throw new Error("KAIROS_NOTE_STALE_PREDECESSOR");
    }
    this.#accepted.set(input.successor.packet.noteId, input.successor);
    this.#outbox.push(Object.freeze({
      noteId: input.successor.packet.noteId,
      predecessorArtifactSha256: input.expectedPredecessorArtifactSha256,
      successorArtifactSha256: input.successor.artifactSha256,
      acceptedAtKai: input.successor.packet.acceptedAtKai,
      status: "pending",
    }));
  }
}

export async function settleKairosNoteLocalTransition(input: Readonly<{
  store: InMemoryKairosNoteSettlementStore;
  carrier: KairosNoteCanonicalCarrier;
  predecessorArtifactBytes: Uint8Array;
  expectedPredecessorArtifactSha256: string;
  claimantKeyFile: ReceizKeyFile;
  claimantIdentityArtifactSha256: string;
  successorReceivingSeal: ReceizOfflineNoteReceivingSealV2;
  acceptedAtKai: string;
  transitionNonce: string;
}>): Promise<KairosNoteLocalSettlement> {
  if (!DIGEST_RE.test(input.expectedPredecessorArtifactSha256)
    || !DIGEST_RE.test(input.claimantIdentityArtifactSha256)
    || !KAI_RE.test(input.acceptedAtKai)
    || !input.transitionNonce.trim()) {
    throw new Error("KAIROS_NOTE_TRANSITION_INVALID");
  }
  const receivingSeal = await verifyReceizOfflineNoteReceivingSeal(input.successorReceivingSeal);
  const destination = receivingSeal.destination;
  const predecessor = await input.carrier.open(input.predecessorArtifactBytes);
  await assertCanonicalOpened(predecessor);
  if (predecessor.artifactSha256 !== input.expectedPredecessorArtifactSha256) {
    throw new Error("KAIROS_NOTE_PREDECESSOR_DIGEST_MISMATCH");
  }
  const accepted = input.store.readAccepted(predecessor.packet.noteId);
  if (!accepted || accepted.artifactSha256 !== predecessor.artifactSha256) {
    throw new Error("KAIROS_NOTE_STALE_PREDECESSOR");
  }
  if (predecessor.packet.currentHolderReceizId !== input.claimantKeyFile.owner.uid
    || predecessor.packet.holderIdentityArtifactSha256 !== input.claimantIdentityArtifactSha256
    || predecessor.packet.holderIdentityKeyId !== input.claimantKeyFile.keyId) {
    throw new Error("KAIROS_NOTE_CLAIMANT_NOT_CURRENT_HOLDER");
  }

  const predecessorHistory = await verifyReceizProofHistory(predecessor.history);
  const predecessorHead = predecessorHistory.headDigests[0];
  if (!predecessorHead) throw new Error("KAIROS_NOTE_HISTORY_INVALID");
  const receipt = await createReceizOwnershipHandoffAuthorityReceipt({
    keyFile: input.claimantKeyFile,
    predecessorDigest: predecessorHead,
    fromOwnerReceizId: predecessor.packet.currentHolderReceizId,
    toOwnerReceizId: destination.recipientReceizId,
    successorIssuerKeyId: destination.recipientIdentityKeyId,
    registryDigest: predecessorHistory.registryDigest,
    authorizedAtKai: input.acceptedAtKai,
  });
  const appendNode = await createReceizProofHistoryNode({
    artifactId: predecessorHistory.artifactId,
    registryDigest: predecessorHistory.registryDigest,
    parentDigests: [predecessorHead],
    kaiPulse: input.acceptedAtKai,
    receipt: structuredClone(receipt) as unknown as import("../../../packages/receiz-sdk/src/constitution.ts").ReceizConstitutionJson,
    event: {
      type: "ownership.transition",
      fromOwnerReceizId: predecessor.packet.currentHolderReceizId,
      toOwnerReceizId: destination.recipientReceizId,
    },
    namespaceData: {
      ownership: {
        fromOwnerReceizId: predecessor.packet.currentHolderReceizId,
        toOwnerReceizId: destination.recipientReceizId,
        predecessorArtifactSha256: predecessor.artifactSha256,
        wholeValuePhiMicro: predecessor.packet.wholeValuePhiMicro,
        transitionNonce: input.transitionNonce,
        destinationDigest: destination.destinationDigest,
        receivingSealDigest: receivingSeal.receivingSealDigest,
        installationCommitment: receivingSeal.installationCommitment,
        holderIdentityArtifactSha256: destination.recipientIdentityArtifactSha256,
        holderIdentityKeyId: destination.recipientIdentityKeyId,
      },
    },
  });
  const history = await issueReceizVerifiedArtifactTransitionHistory({
    predecessor: predecessorHistory,
    appendNode,
    artifactDigest: predecessor.artifactSha256,
    verifierContextDigest: predecessorHistory.verification.verificationDigest,
  });
  const packet: KairosNoteLocalPacket = Object.freeze({
    ...predecessor.packet,
    noteState: "held_bound",
    currentHolderReceizId: destination.recipientReceizId,
    holderIdentityArtifactSha256: destination.recipientIdentityArtifactSha256,
    holderDestinationDigest: destination.destinationDigest,
    holderReceivingSealDigest: receivingSeal.receivingSealDigest,
    holderInstallationCommitment: receivingSeal.installationCommitment,
    holderIdentityKeyId: destination.recipientIdentityKeyId,
    predecessorArtifactSha256: predecessor.artifactSha256,
    acceptedAtKai: input.acceptedAtKai,
    transitionNonce: input.transitionNonce,
  });
  const successorBytes = await input.carrier.reseal({ packet, history });
  const successor = await input.carrier.verifySuccessor(successorBytes);
  await assertCanonicalOpened(successor);
  if (successor.packet.noteId !== predecessor.packet.noteId
    || successor.packet.currentHolderReceizId !== destination.recipientReceizId
    || successor.packet.wholeValuePhiMicro !== predecessor.packet.wholeValuePhiMicro
    || successor.packet.holderIdentityArtifactSha256 !== destination.recipientIdentityArtifactSha256
    || successor.packet.holderDestinationDigest !== destination.destinationDigest
    || successor.packet.holderReceivingSealDigest !== receivingSeal.receivingSealDigest
    || successor.packet.holderInstallationCommitment !== receivingSeal.installationCommitment
    || successor.packet.holderIdentityKeyId !== destination.recipientIdentityKeyId
    || successor.packet.predecessorArtifactSha256 !== predecessor.artifactSha256
    || successor.packet.acceptedAtKai !== input.acceptedAtKai
    || successor.packet.transitionNonce !== input.transitionNonce
    || successor.history.historyDigest !== history.historyDigest) {
    throw new Error("KAIROS_NOTE_SUCCESSOR_VERIFICATION_FAILED");
  }
  input.store.commitSuccessor({
    expectedPredecessorArtifactSha256: predecessor.artifactSha256,
    successor,
  });
  return successor;
}

export async function classifyKairosNoteHeldHead(input: Readonly<{
  store: InMemoryKairosNoteSettlementStore;
  incoming: KairosNoteLocalSettlement;
}>) {
  await assertCanonicalOpened(input.incoming);
  const held = input.store.readAccepted(input.incoming.packet.noteId);
  if (!held) throw new Error("KAIROS_NOTE_ACCEPTED_HEAD_MISSING");
  return classifyReceizReconciliationDivergence({
    localHistory: held.history,
    acceptedHistory: input.incoming.history,
    targetNamespace: "ownership",
  });
}

export type KairosNoteHeadReconciliation =
  | Readonly<{
      status: "same-held-head";
      held: KairosNoteAcceptedHead;
      incoming: KairosNoteLocalSettlement;
    }>
  | Readonly<{
      status: "recognized-continuation" | "held-head-ahead";
      held: KairosNoteAcceptedHead;
      incoming: KairosNoteLocalSettlement;
      commonPredecessor: string;
    }>
  | Readonly<{
      status: "double-spend-fork-preserved";
      code: "SIBLING_BRANCHES" | "TARGET_NAMESPACE_CONFLICT";
      held: KairosNoteAcceptedHead;
      incoming: KairosNoteLocalSettlement;
      commonPredecessor: string;
    }>
  | Readonly<{
      status: "rejected";
      code: "HISTORY_VERIFICATION_FAILED" | "NO_COMMON_PREDECESSOR";
      held: KairosNoteAcceptedHead;
      incoming: KairosNoteLocalSettlement;
    }>;

/**
 * Reconciliation is classification and evidence preservation only. A caller
 * may explicitly settle a recognized continuation after applying its policy;
 * HTTP arrival, Chronos time, and a later Kai value never mutate held truth.
 */
export async function reconcileKairosNoteHeldHead(input: Readonly<{
  store: InMemoryKairosNoteSettlementStore;
  incoming: KairosNoteLocalSettlement;
}>): Promise<KairosNoteHeadReconciliation> {
  await assertCanonicalOpened(input.incoming);
  const held = input.store.readAccepted(input.incoming.packet.noteId);
  if (!held) throw new Error("KAIROS_NOTE_ACCEPTED_HEAD_MISSING");
  const relation = await classifyReceizReconciliationDivergence({
    localHistory: input.incoming.history,
    acceptedHistory: held.history,
    targetNamespace: "ownership",
  });
  if (relation.relation === "same") {
    return Object.freeze({ status: "same-held-head", held, incoming: input.incoming });
  }
  if (relation.relation === "local-descendant") {
    return Object.freeze({
      status: "recognized-continuation",
      held,
      incoming: input.incoming,
      commonPredecessor: relation.commonPredecessor.value,
    });
  }
  if (relation.relation === "accepted-descendant") {
    return Object.freeze({
      status: "held-head-ahead",
      held,
      incoming: input.incoming,
      commonPredecessor: relation.commonPredecessor.value,
    });
  }
  if (relation.relation === "divergent") {
    return Object.freeze({
      status: "double-spend-fork-preserved",
      code: relation.code,
      held,
      incoming: input.incoming,
      commonPredecessor: relation.commonPredecessor.value,
    });
  }
  return Object.freeze({
    status: "rejected",
    code: relation.code,
    held,
    incoming: input.incoming,
  });
}

export type KairosNoteCompetingDescendantReconciliation = Readonly<{
  status: "double-spend-fork-preserved";
  code: "SIBLING_BRANCHES" | "TARGET_NAMESPACE_CONFLICT";
  commonPredecessor: string;
  recognizedContinuation: KairosNoteLocalSettlement;
  doubleSpendEvidence: KairosNoteLocalSettlement;
}>;

export type KairosNoteCompetingBranchReconciliation =
  | Readonly<{
      status: "double-spend-fork-preserved";
      code: "SIBLING_BRANCHES" | "TARGET_NAMESPACE_CONFLICT";
      commonPredecessor: string;
      recognizedBranchKai: string;
      recognizedContinuation: KairosNoteLocalSettlement;
      doubleSpendEvidence: KairosNoteLocalSettlement;
    }>
  | Readonly<{
      status: "equal-kai-disputed";
      code: "NOTE_EQUAL_KAI_HEAD_UNRESOLVED";
      commonPredecessor: string;
      firstSeen: KairosNoteLocalSettlement;
      laterSeen: KairosNoteLocalSettlement;
    }>;

function firstBranchNodeAfter(
  settlement: KairosNoteLocalSettlement,
  commonPredecessor: string,
) {
  const byDigest = new Map(settlement.history.nodes.map((node) => [node.nodeDigest, node]));
  let digest = settlement.history.headDigests[0];
  const visited = new Set<string>();
  while (digest && !visited.has(digest)) {
    visited.add(digest);
    const node = byDigest.get(digest);
    if (!node || node.parentDigests.length !== 1) break;
    if (node.parentDigests[0] === commonPredecessor) return node;
    digest = node.parentDigests[0];
  }
  throw new Error("KAIROS_NOTE_BRANCH_ROOT_INVALID");
}

export async function reconcileKairosNoteCompetingBranches(input: Readonly<{
  firstSeen: KairosNoteLocalSettlement;
  laterSeen: KairosNoteLocalSettlement;
}>): Promise<KairosNoteCompetingBranchReconciliation> {
  await Promise.all([assertCanonicalOpened(input.firstSeen), assertCanonicalOpened(input.laterSeen)]);
  if (input.firstSeen.packet.noteId !== input.laterSeen.packet.noteId
    || input.firstSeen.packet.wholeValuePhiMicro !== input.laterSeen.packet.wholeValuePhiMicro) {
    throw new Error("KAIROS_NOTE_COMPETING_BRANCHES_REQUIRED");
  }
  const relation = await classifyReceizReconciliationDivergence({
    localHistory: input.firstSeen.history,
    acceptedHistory: input.laterSeen.history,
    targetNamespace: "ownership",
  });
  if (relation.relation !== "divergent") throw new Error("KAIROS_NOTE_COMPETING_BRANCHES_REQUIRED");
  const commonPredecessor = relation.commonPredecessor.value;
  const firstRoot = firstBranchNodeAfter(input.firstSeen, commonPredecessor);
  const laterRoot = firstBranchNodeAfter(input.laterSeen, commonPredecessor);
  if (firstRoot.kaiPulse === laterRoot.kaiPulse) {
    return Object.freeze({
      status: "equal-kai-disputed",
      code: "NOTE_EQUAL_KAI_HEAD_UNRESOLVED",
      commonPredecessor,
      firstSeen: input.firstSeen,
      laterSeen: input.laterSeen,
    });
  }
  const recognizedContinuation = BigInt(firstRoot.kaiPulse) < BigInt(laterRoot.kaiPulse)
    ? input.firstSeen
    : input.laterSeen;
  const doubleSpendEvidence = recognizedContinuation === input.firstSeen
    ? input.laterSeen
    : input.firstSeen;
  return Object.freeze({
    status: "double-spend-fork-preserved",
    code: relation.code,
    commonPredecessor,
    recognizedBranchKai: BigInt(firstRoot.kaiPulse) < BigInt(laterRoot.kaiPulse)
      ? firstRoot.kaiPulse
      : laterRoot.kaiPulse,
    recognizedContinuation,
    doubleSpendEvidence,
  });
}

export async function reconcileKairosNoteCompetingDescendants(input: Readonly<{
  firstSeen: KairosNoteLocalSettlement;
  laterSeen: KairosNoteLocalSettlement;
}>): Promise<KairosNoteCompetingDescendantReconciliation> {
  await Promise.all([assertCanonicalOpened(input.firstSeen), assertCanonicalOpened(input.laterSeen)]);
  if (input.firstSeen.packet.noteId !== input.laterSeen.packet.noteId
    || input.firstSeen.packet.predecessorArtifactSha256 === null
    || input.firstSeen.packet.predecessorArtifactSha256
      !== input.laterSeen.packet.predecessorArtifactSha256) {
    throw new Error("KAIROS_NOTE_COMPETING_DESCENDANTS_REQUIRED");
  }
  const relation = await classifyReceizReconciliationDivergence({
    localHistory: input.firstSeen.history,
    acceptedHistory: input.laterSeen.history,
    targetNamespace: "ownership",
  });
  if (relation.relation !== "divergent") {
    throw new Error("KAIROS_NOTE_COMPETING_DESCENDANTS_REQUIRED");
  }
  if (input.firstSeen.packet.wholeValuePhiMicro !== input.laterSeen.packet.wholeValuePhiMicro) {
    throw new Error("KAIROS_NOTE_WHOLE_VALUE_MISMATCH");
  }
  const branch = await reconcileKairosNoteCompetingBranches(input);
  if (branch.status === "equal-kai-disputed") {
    throw new Error(branch.code);
  }
  const projection = await reduceReceizWholeNoteCapacity({
    noteId: input.firstSeen.packet.noteId,
    genesisArtifactSha256: input.firstSeen.packet.predecessorArtifactSha256,
    wholeValuePhiMicro: input.firstSeen.packet.wholeValuePhiMicro,
    transitions: [input.firstSeen, input.laterSeen].map((candidate) => ({
      noteId: candidate.packet.noteId,
      artifactSha256: candidate.artifactSha256,
      predecessorArtifactSha256: candidate.packet.predecessorArtifactSha256!,
      wholeValuePhiMicro: candidate.packet.wholeValuePhiMicro,
      fromOwnerReceizId: candidate.history.nodes.find((node) =>
        node.nodeDigest === candidate.history.headDigests[0])?.event.type === "ownership.transition"
        ? (candidate.history.nodes.find((node) =>
            node.nodeDigest === candidate.history.headDigests[0])!.event as { fromOwnerReceizId: string }).fromOwnerReceizId
        : "",
      toOwnerReceizId: candidate.packet.currentHolderReceizId,
      acceptedAtKai: candidate.packet.acceptedAtKai,
      transitionNonce: candidate.packet.transitionNonce,
      history: candidate.history,
    })),
  });
  const recognizedContinuation = projection.activeHeadArtifactSha256 === input.firstSeen.artifactSha256
    ? input.firstSeen
    : input.laterSeen;
  const doubleSpendEvidence = recognizedContinuation === input.firstSeen
    ? input.laterSeen
    : input.firstSeen;
  return Object.freeze({
    status: "double-spend-fork-preserved",
    code: relation.code,
    commonPredecessor: relation.commonPredecessor.value,
    recognizedContinuation,
    doubleSpendEvidence,
  });
}
