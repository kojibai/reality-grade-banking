import type { ReceizSealedArtifact } from "./artifacts.js";
import type {
  ReceizArtifactAppendPlan,
  ReceizArtifactDigest,
  ReceizArtifactTransitionDigest,
  ReceizCommitDomainId,
  ReceizPlanDigest,
} from "./artifactTransition.js";

export type ReceizVerifiedArtifactTransitionCandidate = Readonly<{
  status: "sealed-transition";
  artifact: ReceizSealedArtifact;
  artifactDigest: ReceizArtifactDigest;
  transitionDigest: ReceizArtifactTransitionDigest;
  planDigest: ReceizPlanDigest;
  committed: false;
}>;

export type ReceizArtifactTransitionCandidateCustody = Readonly<{
  plan: ReceizArtifactAppendPlan;
  commitDomain: ReceizCommitDomainId;
  exactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  payloadSha256: string;
  createdAt: number;
}>;

const candidateCustody = new WeakMap<object, ReceizArtifactTransitionCandidateCustody>();

/** Internal custody registration. Task 7 may call this only after canonical verification. */
export function registerReceizArtifactTransitionCandidateCustody(
  candidate: ReceizVerifiedArtifactTransitionCandidate,
  custody: ReceizArtifactTransitionCandidateCustody,
): void {
  candidateCustody.set(candidate, Object.freeze({
    plan: custody.plan,
    commitDomain: structuredClone(custody.commitDomain),
    exactBytes: custody.exactBytes.slice(),
    filename: custody.filename,
    mimeType: custody.mimeType,
    payloadSha256: custody.payloadSha256,
    createdAt: custody.createdAt,
  }));
}

export function readReceizArtifactTransitionCandidateCustody(
  candidate: unknown,
): ReceizArtifactTransitionCandidateCustody | null {
  if (!candidate || typeof candidate !== "object") return null;
  return candidateCustody.get(candidate) ?? null;
}
