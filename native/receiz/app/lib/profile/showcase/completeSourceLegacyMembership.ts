import { ReceizProtocolLimitError } from "@/packages/receiz-sdk/src/verificationLimits";
import {
  canonicalizeReceizConstitution,
  createEmptyReceizProfileShowcasePersistentStateV114,
  digestReceizCompositeCanonical,
  inspectReceizLegacyProfileShowcaseV114,
  reduceReceizProfileShowcasePersistentStateV114,
  type ReceizInspectedLegacyProfileShowcaseV114,
  type ReceizProfileShowcasePersistentStateIOV114,
} from "../../../../packages/receiz-sdk/src/index";
import { readReceizLegacyProfileShowcaseInspectionCustody } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { createReceizProfileShowcaseSegmentMechanicsV114 } from "../../../../packages/receiz-sdk/src/compositeProofTransport";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../../packages/receiz-sdk/src/artifactVerification";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";

/** Keep inspection and its runtime custody in the same SDK module composition. */
export async function reopenProfileShowcaseLegacyMembership(input: Readonly<{
  exactSealedArtifactBytes: Uint8Array;
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}> & Omit<Parameters<typeof replayInspectedProfileShowcaseLegacyMembership>[0], "inspection">) {
  const roots = new Map(input.roots);
  const verification = await verifyReceizArtifactWithCanonicalRoots(
    new Blob([input.exactSealedArtifactBytes.slice().buffer as ArrayBuffer]), roots,
  );
  if (verification.status === "denied") throw new ReceizProtocolLimitError(verification.code, "verification-runtime");
  const inspection = await inspectReceizLegacyProfileShowcaseV114({
    verification,
    ownerConstraint: input.ownerReceizIdentity,
    dependencies: { canonicalSignatureV4RootPublicKeys: roots },
  });
  return replayInspectedProfileShowcaseLegacyMembership({ ...input, inspection });
}

/** Shared replay beneath an inspected legacy predecessor and its sealed successor. */
export async function replayInspectedProfileShowcaseLegacyMembership(input: Readonly<{
  inspection: ReceizInspectedLegacyProfileShowcaseV114;
  artifactId: string;
  ownerReceizIdentity: string;
  parent: Readonly<Record<string, unknown>>;
  head: Readonly<Record<string, unknown>>;
  io: ReceizProfileShowcasePersistentStateIOV114;
}>) {
  const { inspection, parent, head } = input;
  // The SDK custody accessor rejects structurally fabricated inspections.
  const custody = readReceizLegacyProfileShowcaseInspectionCustody(inspection);
  if (inspection.artifactId !== input.artifactId
    || inspection.ownerReceizIdentity !== input.ownerReceizIdentity
    || inspection.artifactSha256 !== parent.artifactDigest
    || inspection.currentStateRoot !== parent.stateRoot
    || inspection.historyHeadDigest !== parent.historyHeadDigest
    || inspection.headKaiUpulse !== parent.headKaiUpulse
    || inspection.resultingOperationCount !== parent.operationCount) {
    throw new TypeError("PROFILE_SHOWCASE_COMPLETE_LEGACY_HISTORY_INVALID");
  }
  const byDigest = new Map(custody.history.nodes.map((node) => [node.nodeDigest, node]));
  const ordered = [];
  let cursor: string | undefined = custody.history.headDigests[0];
  const seen = new Set<string>();
  while (cursor) {
    const node = byDigest.get(cursor);
    if (!node || seen.has(cursor) || node.parentDigests.length > 1) {
      throw new TypeError("PROFILE_SHOWCASE_COMPLETE_LEGACY_HISTORY_INVALID");
    }
    seen.add(cursor);
    ordered.unshift(node);
    cursor = node.parentDigests[0];
  }
  const actorEvidenceRoots = new Set<string>();
  let state = createEmptyReceizProfileShowcasePersistentStateV114("0");
  for (const node of ordered) {
    if (node.event.type !== "profile-showcase.transition" || !Array.isArray(node.event.directOperations)) {
      throw new TypeError("PROFILE_SHOWCASE_COMPLETE_LEGACY_HISTORY_INVALID");
    }
    const operations = node.event.directOperations;
    if (!operations.length) continue;
    const baseCount = state.counts.operationCount;
    const segment = await createReceizProfileShowcaseSegmentMechanicsV114({
      operations, startOperationCount: baseCount,
    });
    for (let index = 0; index < operations.length; index++) {
      const operation = operations[index]!;
      const authorityEvidenceRoot = (operation as Record<string, unknown>).authorityEvidenceRoot;
      if (typeof authorityEvidenceRoot === "string") actorEvidenceRoots.add(authorityEvidenceRoot);
      state = await reduceReceizProfileShowcasePersistentStateV114({
        state, io: input.io, operation: operation as never,
        membershipWitness: segment.membershipWitnesses[index]!,
        expectedPriorCommittedCount: baseCount, expectedDirectDeltaPosition: index,
      });
    }
  }
  if (canonicalizeReceizConstitution(state.counts as never) !== canonicalizeReceizConstitution(head.counts as never)) {
    throw new TypeError("PROFILE_SHOWCASE_COMPLETE_LEGACY_HISTORY_INVALID");
  }
  const synthetic = head.placementRoot === digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.legacy-placement-root.v114", legacyStateRoot: inspection.currentStateRoot,
  }) && head.orderRoot === digestReceizCompositeCanonical({
    kind: "receiz.profile-showcase.legacy-order-root.v114", legacyStateRoot: inspection.currentStateRoot,
  });
  if (!synthetic && (state.placementRoot !== head.placementRoot || state.orderRoot !== head.orderRoot)) {
    throw new TypeError("PROFILE_SHOWCASE_COMPLETE_LEGACY_HISTORY_INVALID");
  }
  return { state, synthetic, actorEvidenceRoots: Object.freeze([...actorEvidenceRoots]) };
}
