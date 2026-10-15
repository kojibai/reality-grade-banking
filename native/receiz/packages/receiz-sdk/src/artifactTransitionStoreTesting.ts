import type { ReceizSealedArtifact } from "./artifacts.js";
import { sha256ReceizBytes } from "./artifacts.js";
import {
  registerReceizArtifactTransitionCandidateCustody,
  type ReceizVerifiedArtifactTransitionCandidate,
} from "./artifactTransitionCandidateCustody.js";
import {
  assertReceizArtifactAppendPlanCustody,
  type ReceizArtifactAppendPlan,
  type ReceizArtifactDigest,
  type ReceizCapabilityDigest,
  type ReceizDigest,
} from "./artifactTransition.js";
import {
  type ReceizArtifactTransitionCommitCommandBasis,
  type ReceizArtifactTransitionCommitUnit,
  type ReceizStagedArtifactTransition,
} from "./artifactTransitionStore.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { isReceizVerifiedCapability, type ReceizVerifiedCapability } from "./capabilityAuthority.js";
import { registerReceizTestingArtifactTransitionCommitUnit } from "./artifactTransitionCommitCustody.js";

function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function digest<Binding extends string>(binds: Binding, value: string): ReceizDigest<Binding> {
  return freeze({ algorithm: "sha-256", binds, value });
}

/** Synthetic candidate fixture. This module is exported only by `@receiz/sdk/testing`. */
export async function createReceizVerifiedArtifactTransitionCandidateFixture(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  exactBytes: Uint8Array;
  claimedArtifactDigest?: ReceizArtifactDigest;
  createdAt?: number;
  filename?: string;
  mimeType?: string;
  payloadSha256?: string;
}>): Promise<ReceizVerifiedArtifactTransitionCandidate> {
  assertReceizArtifactAppendPlanCustody(input.plan);
  const actual = await sha256ReceizBytes(input.exactBytes);
  const artifact = {
    kind: "receiz.native-record-seal",
    artifact: new Blob([input.exactBytes.slice()], { type: input.mimeType ?? "application/receiz" }),
    filename: input.filename ?? "testing.receiz",
    mimeType: input.mimeType ?? "application/receiz",
    artifactSha256: actual,
    payloadSha256: input.payloadSha256 ?? actual,
    continuity: {},
    verification: {},
  } as unknown as ReceizSealedArtifact;
  const candidate = freeze({
    status: "sealed-transition" as const,
    artifact,
    artifactDigest: structuredClone(input.claimedArtifactDigest ?? digest("exact-artifact-bytes", actual)),
    transitionDigest: structuredClone(input.plan.transitionDigest),
    planDigest: structuredClone(input.plan.planDigest),
    committed: false as const,
  });
  registerReceizArtifactTransitionCandidateCustody(candidate, {
    plan: input.plan,
    commitDomain: input.plan.commitDomain,
    exactBytes: input.exactBytes,
    filename: artifact.filename,
    mimeType: artifact.mimeType,
    payloadSha256: artifact.payloadSha256,
    createdAt: input.createdAt ?? Date.now(),
  });
  return candidate;
}

/** Synthetic command fixture. This module is exported only by `@receiz/sdk/testing`. */
export async function createReceizArtifactTransitionCommitUnitFixture(input: Readonly<{
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  staged: ReceizStagedArtifactTransition;
}>): Promise<ReceizArtifactTransitionCommitUnit> {
  assertReceizArtifactAppendPlanCustody(input.plan);
  if (!isReceizVerifiedCapability(input.capability)) throw new TypeError("CAPABILITY_NOT_VERIFIED");
  const capabilityDigest: ReceizCapabilityDigest = digest("verified-capability", input.capability.digest);
  const basis: ReceizArtifactTransitionCommitCommandBasis = {
    planDigest: structuredClone(input.plan.planDigest),
    capabilityDigest,
    transitionDigest: structuredClone(input.plan.transitionDigest),
    candidateArtifactDigest: structuredClone(input.staged.reference.artifactDigest),
    stagedCandidateReference: structuredClone(input.staged.reference),
    commitDomain: structuredClone(input.plan.commitDomain),
  };
  const unit = freeze({
    commitDomain: structuredClone(input.plan.commitDomain),
    plan: input.plan,
    capability: input.capability,
    command: freeze({
      ...basis,
      commandDigest: digest(
        "artifact-transition-command",
        await digestReceizAuthority("command", "receiz.artifact-transition-command.v112", basis),
      ),
    }),
    expectedHead: structuredClone(input.plan.transition.expectedHead),
  });
  registerReceizTestingArtifactTransitionCommitUnit(unit);
  return unit;
}
