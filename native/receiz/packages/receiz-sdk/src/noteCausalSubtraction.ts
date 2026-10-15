import {
  verifyReceizProofHistory,
  type ReceizProofHistoryNode,
  type ReceizVerifiedProofHistory,
} from "./proofHistory.js";

const SHA256_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;

export type ReceizWholeNoteTransitionCandidate = Readonly<{
  noteId: string;
  artifactSha256: string;
  predecessorArtifactSha256: string;
  wholeValuePhiMicro: string;
  fromOwnerReceizId: string;
  toOwnerReceizId: string;
  acceptedAtKai: string;
  transitionNonce: string;
  history: ReceizVerifiedProofHistory;
}>;

export type ReceizWholeNoteZeroCapacityEvidence = Readonly<{
  artifactSha256: string;
  predecessorArtifactSha256: string;
  code: "SIBLING_OVERAGE_EVIDENCE";
  admittedValuePhiMicro: "0";
}>;

export type ReceizWholeNoteInvalidEvidence = Readonly<{
  artifactSha256: string;
  code:
    | "TRANSITION_SHAPE_INVALID"
    | "TRANSITION_HISTORY_BINDING_INVALID"
    | "DUPLICATE_ARTIFACT_CONFLICT"
    | "PREDECESSOR_NOT_ADMITTED";
}>;

export type ReceizWholeNoteCapacityProjection = Readonly<{
  noteId: string;
  wholeValuePhiMicro: string;
  activeHeadArtifactSha256: string;
  admittedLineageArtifactSha256: readonly string[];
  zeroCapacityEvidence: readonly ReceizWholeNoteZeroCapacityEvidence[];
  invalidEvidence: readonly ReceizWholeNoteInvalidEvidence[];
  totalAdmittedValuePhiMicro: string;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function transitionComparator(
  left: ReceizWholeNoteTransitionCandidate,
  right: ReceizWholeNoteTransitionCandidate,
): number {
  const kaiOrder = BigInt(left.acceptedAtKai) < BigInt(right.acceptedAtKai)
    ? -1
    : BigInt(left.acceptedAtKai) > BigInt(right.acceptedAtKai) ? 1 : 0;
  if (kaiOrder !== 0) return kaiOrder;
  const nonceOrder = left.transitionNonce.localeCompare(right.transitionNonce);
  return nonceOrder !== 0 ? nonceOrder : left.artifactSha256.localeCompare(right.artifactSha256);
}

function headNode(history: ReceizVerifiedProofHistory): ReceizProofHistoryNode | null {
  if (history.headDigests.length !== 1) return null;
  return history.nodes.find((node) => node.nodeDigest === history.headDigests[0]) ?? null;
}

async function verifyCandidate(input: Readonly<{
  noteId: string;
  wholeValuePhiMicro: string;
  candidate: ReceizWholeNoteTransitionCandidate;
}>): Promise<"ok" | ReceizWholeNoteInvalidEvidence["code"]> {
  const candidate = input.candidate;
  if (!candidate.noteId
    || !SHA256_RE.test(candidate.artifactSha256)
    || !SHA256_RE.test(candidate.predecessorArtifactSha256)
    || !INTEGER_RE.test(candidate.wholeValuePhiMicro)
    || BigInt(candidate.wholeValuePhiMicro) <= 0n
    || !KAI_RE.test(candidate.acceptedAtKai)
    || !candidate.transitionNonce
    || !candidate.fromOwnerReceizId.trim()
    || !candidate.toOwnerReceizId.trim()) {
    return "TRANSITION_SHAPE_INVALID";
  }
  try {
    const history = await verifyReceizProofHistory(candidate.history);
    const head = headNode(history);
    const ownership = asRecord(head?.namespaceData.ownership);
    if (candidate.noteId !== input.noteId
      || candidate.wholeValuePhiMicro !== input.wholeValuePhiMicro
      || history.artifactId !== input.noteId
      || history.currentOwnerReceizId !== candidate.toOwnerReceizId
      || !head
      || head.kaiPulse !== candidate.acceptedAtKai
      || head.event.type !== "ownership.transition"
      || head.event.fromOwnerReceizId !== candidate.fromOwnerReceizId
      || head.event.toOwnerReceizId !== candidate.toOwnerReceizId
      || ownership?.predecessorArtifactSha256 !== candidate.predecessorArtifactSha256
      || ownership.wholeValuePhiMicro !== candidate.wholeValuePhiMicro
      || ownership.transitionNonce !== candidate.transitionNonce) {
      return "TRANSITION_HISTORY_BINDING_INVALID";
    }
    return "ok";
  } catch {
    return "TRANSITION_HISTORY_BINDING_INVALID";
  }
}

function canonicalCandidate(candidate: ReceizWholeNoteTransitionCandidate): string {
  return JSON.stringify({
    noteId: candidate.noteId,
    artifactSha256: candidate.artifactSha256,
    predecessorArtifactSha256: candidate.predecessorArtifactSha256,
    wholeValuePhiMicro: candidate.wholeValuePhiMicro,
    fromOwnerReceizId: candidate.fromOwnerReceizId,
    toOwnerReceizId: candidate.toOwnerReceizId,
    acceptedAtKai: candidate.acceptedAtKai,
    transitionNonce: candidate.transitionNonce,
    historyDigest: candidate.history.historyDigest,
  });
}

export async function reduceReceizWholeNoteCapacity(input: Readonly<{
  noteId: string;
  genesisArtifactSha256: string;
  wholeValuePhiMicro: string;
  transitions: readonly ReceizWholeNoteTransitionCandidate[];
}>): Promise<ReceizWholeNoteCapacityProjection> {
  if (!input.noteId.trim()
    || !SHA256_RE.test(input.genesisArtifactSha256)
    || !INTEGER_RE.test(input.wholeValuePhiMicro)
    || BigInt(input.wholeValuePhiMicro) <= 0n) {
    throw new TypeError("RECEIZ_WHOLE_NOTE_CAPACITY_INPUT_INVALID");
  }

  const invalidEvidence: ReceizWholeNoteInvalidEvidence[] = [];
  const byArtifact = new Map<string, ReceizWholeNoteTransitionCandidate>();
  const conflictedArtifacts = new Set<string>();
  for (const candidate of [...input.transitions].sort((left, right) =>
    left.artifactSha256.localeCompare(right.artifactSha256))) {
    if (conflictedArtifacts.has(candidate.artifactSha256)) continue;
    const existing = byArtifact.get(candidate.artifactSha256);
    if (existing) {
      if (canonicalCandidate(existing) !== canonicalCandidate(candidate)) {
        invalidEvidence.push({
          artifactSha256: candidate.artifactSha256,
          code: "DUPLICATE_ARTIFACT_CONFLICT",
        });
        byArtifact.delete(candidate.artifactSha256);
        conflictedArtifacts.add(candidate.artifactSha256);
      }
      continue;
    }
    byArtifact.set(candidate.artifactSha256, candidate);
  }

  const verified: ReceizWholeNoteTransitionCandidate[] = [];
  for (const candidate of [...byArtifact.values()].sort((left, right) =>
    left.artifactSha256.localeCompare(right.artifactSha256))) {
    const verdict = await verifyCandidate({
      noteId: input.noteId,
      wholeValuePhiMicro: input.wholeValuePhiMicro,
      candidate,
    });
    if (verdict === "ok") verified.push(candidate);
    else invalidEvidence.push({ artifactSha256: candidate.artifactSha256, code: verdict });
  }

  const children = new Map<string, ReceizWholeNoteTransitionCandidate[]>();
  for (const candidate of verified) {
    const list = children.get(candidate.predecessorArtifactSha256) ?? [];
    list.push(candidate);
    children.set(candidate.predecessorArtifactSha256, list);
  }
  for (const list of children.values()) list.sort(transitionComparator);

  const admittedLineageArtifactSha256 = [input.genesisArtifactSha256];
  const admitted = new Set(admittedLineageArtifactSha256);
  const zeroCapacityEvidence: ReceizWholeNoteZeroCapacityEvidence[] = [];
  const classified = new Set<string>();

  const markDisplacedSubtree = (candidate: ReceizWholeNoteTransitionCandidate): void => {
    if (classified.has(candidate.artifactSha256)) return;
    classified.add(candidate.artifactSha256);
    zeroCapacityEvidence.push({
      artifactSha256: candidate.artifactSha256,
      predecessorArtifactSha256: candidate.predecessorArtifactSha256,
      code: "SIBLING_OVERAGE_EVIDENCE",
      admittedValuePhiMicro: "0",
    });
    for (const child of children.get(candidate.artifactSha256) ?? []) markDisplacedSubtree(child);
  };

  let head = input.genesisArtifactSha256;
  while (true) {
    const siblings = children.get(head) ?? [];
    if (siblings.length === 0) break;
    const winner = siblings[0]!;
    classified.add(winner.artifactSha256);
    admitted.add(winner.artifactSha256);
    admittedLineageArtifactSha256.push(winner.artifactSha256);
    for (const sibling of siblings.slice(1)) markDisplacedSubtree(sibling);
    head = winner.artifactSha256;
  }

  for (const candidate of verified) {
    if (!classified.has(candidate.artifactSha256) && !admitted.has(candidate.artifactSha256)) {
      invalidEvidence.push({
        artifactSha256: candidate.artifactSha256,
        code: "PREDECESSOR_NOT_ADMITTED",
      });
    }
  }

  return Object.freeze({
    noteId: input.noteId,
    wholeValuePhiMicro: input.wholeValuePhiMicro,
    activeHeadArtifactSha256: head,
    admittedLineageArtifactSha256: Object.freeze(admittedLineageArtifactSha256),
    zeroCapacityEvidence: Object.freeze(zeroCapacityEvidence),
    invalidEvidence: Object.freeze(invalidEvidence.sort((left, right) =>
      left.artifactSha256.localeCompare(right.artifactSha256))),
    totalAdmittedValuePhiMicro: input.wholeValuePhiMicro,
  });
}
