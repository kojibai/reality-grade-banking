import { buildReceizedDownloadName } from "@/app/lib/documentSeal/fileFormat";
import {
  createReceizArtifactAdmissionEngine, inspectReceizBoundedProfileShowcaseV114,
  readReceizBoundedProfileShowcaseInspectionCarrier,
  admitReceizProfileShowcaseSuccessorWithPredecessorContext,
} from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../../packages/receiz-sdk/src/artifactVerification";
import { receizCurrentPinnedSignatureV4Roots } from "../../../../packages/receiz-sdk/src/verifier/roots";
import { createReceizProfileShowcaseSegmentMechanicsV114 } from "../../../../packages/receiz-sdk/src/compositeProofTransport";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import type { ReceizConstitutionJson, ReceizVerifiedProfileShowcaseAdmission } from "../../../../packages/receiz-sdk/src/index";
import type { ProfileShowcaseArtifactId, ProfileShowcaseCommittedSegment, ProfileShowcaseChildReference } from "./types";
import type { ProfileShowcaseBoundedEdgeVault, ProfileShowcaseCompletePublicSource } from "./boundedEdgeVault";

/** Initial custody of an exact accepted source uses the existing SDK admission
 * and vault. It stages predecessors without changing the selected local head.
 * A source already held by this vault is reused immediately. */
export async function retainAcceptedShowcasePredecessor(input: Readonly<{
  source: ProfileShowcaseCompletePublicSource;
  artifactId: ProfileShowcaseArtifactId;
  vault: ProfileShowcaseBoundedEdgeVault;
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<ReceizVerifiedProfileShowcaseAdmission> {
  const held = await input.vault.reopenHead(input.artifactId, input.source.artifactDigest);
  if (held) {
    try {
      if (await input.vault.exportCompleteSource(input.artifactId, input.source.artifactDigest)) return held;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE") throw error;
      // The admitted head survives. Fill missing source custody beneath it.
    }
  }
  const owner = input.artifactId.replace(/^profile-showcase:/, "");
  const roots = new Map(input.canonicalSignatureV4RootPublicKeys ?? receizCurrentPinnedSignatureV4Roots());
  const engine = createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: roots });
  const sourceFile = (bytes: Uint8Array) => new File([bytes.slice().buffer as ArrayBuffer], "source.receizbundle", { type: "application/vnd.receiz.bundle+json" });
  const children: { reference: ProfileShowcaseChildReference; admittedArtifact: Extract<Awaited<ReturnType<typeof engine>>, { profile: "portable-state" }> }[] = [];
  const admitChildren = async (source: ProfileShowcaseCompletePublicSource) => {
  for (const child of source.children) {
    if (children.some(held => held.reference.childArtifactDigest === child.reference.childArtifactDigest)) continue;
    const filename = `${buildReceizedDownloadName({ filename: `profile-original-${child.reference.stableChildArtifactId}.json`, keepExtension: false })}.receizbundle`;
    const verification = await verifyReceizArtifactWithCanonicalRoots(new File([child.exactSealedArtifactBytes.slice().buffer as ArrayBuffer], filename, { type: "application/vnd.receiz.bundle+json" }), roots);
    const admission = await engine(verification, { profile: "portable-state", ownerConstraint: owner });
    if (admission.profile !== "portable-state" || !("openedArtifact" in admission)
      || admission.artifactSha256 !== child.reference.childArtifactDigest
      || admission.artifactId !== child.reference.stableChildArtifactId
      || admission.payloadSha256 !== child.reference.contentDigest) {
      throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_CHILD_CUSTODY_REQUIRED");
    }
    children.push({ reference: child.reference, admittedArtifact: admission });
  }
  };
  await admitChildren(input.source);
  const history: { artifactDigest: string; artifact: File;
    verification: Awaited<ReturnType<typeof verifyReceizArtifactWithCanonicalRoots>>;
    carrier: ReturnType<typeof readReceizBoundedProfileShowcaseInspectionCarrier> }[] = [];
  for (const entry of [...(input.source.ancestry ?? []), input.source]) {
    const artifact = sourceFile(entry.exactSealedArtifactBytes);
    const verification = await verifyReceizArtifactWithCanonicalRoots(artifact, roots);
    const inspection = await inspectReceizBoundedProfileShowcaseV114({ verification, ownerConstraint: owner, dependencies: { canonicalSignatureV4RootPublicKeys: roots } });
    const carrier = readReceizBoundedProfileShowcaseInspectionCarrier(inspection);
    if (carrier.artifactId !== input.artifactId) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_IDENTITY_MISMATCH");
    history.push({ artifactDigest: entry.artifactDigest, artifact, verification, carrier });
  }
  history.sort((a, b) => Number(a.carrier["profile-showcase"].resultingOperationCount) - Number(b.carrier["profile-showcase"].resultingOperationCount));
  const admissions = new Map<string, ReceizVerifiedProfileShowcaseAdmission>();
  const segments = new Map<string, ProfileShowcaseCommittedSegment>();
  for (const entry of history) {
    const parents = entry.carrier.receizProofHistory.parentRefs;
    // Checkpoint/merge recovery must retain its existing contextual admission.
    // Missing context stays pending; it never permits a replacement genesis.
    if (parents.length > 1) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED");
    const predecessor = parents.length ? admissions.get(parents[0]!.artifactDigest) : null;
    if (parents.length && !predecessor) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_CONTEXT_REQUIRED");
    const admission = predecessor
      ? await admitReceizProfileShowcaseSuccessorWithPredecessorContext({ predecessorAdmission: predecessor,
          candidateArtifact: { artifact: entry.artifact },
          resolveVerifiedHistoricalArtifactDigest: count => {
            // Exact SDK-admitted ancestors of this predecessor only. The
            // selected head may be a different branch or absent during staging.
            let digest: string | undefined = predecessor.artifactSha256;
            while (digest) {
              const ancestor = history.find(candidate => candidate.artifactDigest === digest);
              if (!ancestor || !admissions.has(digest)) return null;
              if (Number(ancestor.carrier["profile-showcase"].resultingOperationCount) === count) return digest;
              digest = ancestor.carrier.receizProofHistory.parentRefs[0]?.artifactDigest;
            }
            return null;
          } })
      : await engine(entry.verification, { profile: "profile-showcase", ownerConstraint: owner });
    if (admission.profile !== "profile-showcase" || !("openedArtifact" in admission) || admission.artifactSha256 !== entry.artifactDigest) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_CUSTODY_REQUIRED");
    const head = entry.carrier["profile-showcase"] as {
      directDelta: readonly ReceizConstitutionJson[]; priorOperationCount: number;
      firstPaintWindow: { children: readonly { reference: ProfileShowcaseChildReference }[] };
      segmentWindow: readonly { segmentId: string }[];
    };
    if (head.directDelta.length) {
      const segment = await createReceizProfileShowcaseSegmentMechanicsV114({ operations: head.directDelta, startOperationCount: Number(head.priorOperationCount) });
      segments.set(segment.commitment.segmentId, { ...segment, commitment: { ...segment.commitment, authority: segment.authority } } as unknown as ProfileShowcaseCommittedSegment);
    }
    const carried = new Set([
      ...head.firstPaintWindow.children.map(child => child.reference.childArtifactDigest),
      ...head.directDelta.filter(operation => operation && typeof operation === "object" && !Array.isArray(operation) && operation.kind === "showcase.append").map(operation => ((operation as Record<string, ReceizConstitutionJson>).child as { childArtifactDigest: string }).childArtifactDigest),
    ]);
    const retainedSegments = head.segmentWindow.map(reference => segments.get(reference.segmentId));
    if (retainedSegments.some(segment => !segment)) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_SEGMENT_CUSTODY_REQUIRED");
    await input.vault.admit({ showcaseAdmission: admission, children: children.filter(child => carried.has(child.reference.childArtifactDigest)), segments: retainedSegments as ProfileShowcaseCommittedSegment[], retainOnly: true, retainHistoryOnly: entry.artifactDigest !== input.source.artifactDigest });
    admissions.set(entry.artifactDigest, admission);
  }
  const admission = admissions.get(input.source.artifactDigest);
  if (!admission) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_CUSTODY_REQUIRED");
  return admission;
}
