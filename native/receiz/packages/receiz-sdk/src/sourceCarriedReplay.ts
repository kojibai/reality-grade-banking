import { digestReceizCompositeCanonical } from "./compositeProofKernel.js";
import type { ReceizDomainReplayAdditionV124 } from "./v124Replay.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import {
  inspectReceizDomainReplaySegmentSourceCoordinateV124,
  readReceizDomainReplaySegmentSourceV124,
  type ReceizDomainReplaySegmentSourceCoordinateV124,
  type ReceizDomainReplaySegmentSourceExpectationV124,
  type ReceizReadDomainReplaySegmentSourceV124,
} from "./v124ReplayProofObject.js";

export type ReceizSourceCarriedReplayFamilyV124 = Readonly<{
  schema: "receiz.source-carried-replay-family.v124";
  proofObjectId: string;
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  familySetDigest: string;
  sources: readonly ReceizReadDomainReplaySegmentSourceV124[];
  headArtifactSha256s: readonly string[];
  authority: Readonly<{
    familyIsProofAuthority: false;
    setDigestIsProofAuthority: false;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizSourceCarriedReplayFamilyDifferenceV124 = Readonly<{
  missingFromLocal: readonly ReceizPortableSealedArtifactV124[];
  missingFromRemote: readonly ReceizPortableSealedArtifactV124[];
}>;

export type ReceizSourceCarriedReplayBranchV124 = Readonly<{
  headArtifactSha256: string;
  sourceArtifactSha256s: readonly string[];
  additions: readonly ReceizDomainReplayAdditionV124[];
}>;

type InspectedSource = Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  coordinate: ReceizDomainReplaySegmentSourceCoordinateV124;
}>;

const openedFamilies = new WeakSet<object>();

function fail(code: string): never {
  throw new TypeError(code);
}

function exactArtifactFingerprint(artifact: ReceizPortableSealedArtifactV124): string {
  return digestReceizCompositeCanonical({
    kind: "receiz.source-carried-exact-artifact-fingerprint.v124",
    artifact,
  });
}

function assertSameFamily(
  expected: ReceizDomainReplaySegmentSourceCoordinateV124,
  candidate: ReceizDomainReplaySegmentSourceCoordinateV124,
): void {
  if (
    candidate.proofObjectId !== expected.proofObjectId
    || candidate.applicationId !== expected.applicationId
    || candidate.domainId !== expected.domainId
    || candidate.registryDigest !== expected.registryDigest
    || candidate.reducerDigest !== expected.reducerDigest
  ) {
    fail("RECEIZ_SOURCE_FAMILY_IDENTITY_MISMATCH");
  }
}

function assertOpenedFamily(
  value: ReceizSourceCarriedReplayFamilyV124,
): ReceizSourceCarriedReplayFamilyV124 {
  if (value === null || typeof value !== "object" || !openedFamilies.has(value)) {
    fail("RECEIZ_SOURCE_FAMILY_NOT_OPENED");
  }
  return value;
}

function assertCompatibleFamilies(
  expected: ReceizSourceCarriedReplayFamilyV124,
  candidate: ReceizSourceCarriedReplayFamilyV124,
): void {
  if (
    candidate.proofObjectId !== expected.proofObjectId
    || candidate.applicationId !== expected.applicationId
    || candidate.domainId !== expected.domainId
    || candidate.registryDigest !== expected.registryDigest
    || candidate.reducerDigest !== expected.reducerDigest
  ) {
    fail("RECEIZ_SOURCE_FAMILY_IDENTITY_MISMATCH");
  }
}

function orderByPredecessor(
  inspected: readonly InspectedSource[],
): readonly InspectedSource[] {
  const byDigest = new Map(
    inspected.map((item) => [item.coordinate.artifactSha256, item]),
  );
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const item of inspected) {
    const digest = item.coordinate.artifactSha256;
    const predecessor = item.coordinate.predecessorArtifactSha256;
    if (predecessor === null) {
      indegree.set(digest, 0);
      continue;
    }
    if (predecessor === digest) fail("RECEIZ_SOURCE_FAMILY_CYCLE");
    if (!byDigest.has(predecessor)) {
      fail("RECEIZ_SOURCE_FAMILY_PREDECESSOR_MISSING");
    }
    indegree.set(digest, 1);
    children.set(predecessor, [...(children.get(predecessor) ?? []), digest]);
  }
  const eligible = inspected
    .filter((item) => indegree.get(item.coordinate.artifactSha256) === 0)
    .sort((left, right) => left.coordinate.artifactSha256.localeCompare(
      right.coordinate.artifactSha256,
    ));
  const ordered: InspectedSource[] = [];
  while (eligible.length > 0) {
    const next = eligible.shift()!;
    ordered.push(next);
    const childDigests = [...(children.get(next.coordinate.artifactSha256) ?? [])]
      .sort((left, right) => left.localeCompare(right));
    for (const childDigest of childDigests) {
      const remaining = (indegree.get(childDigest) ?? 0) - 1;
      indegree.set(childDigest, remaining);
      if (remaining === 0) {
        eligible.push(byDigest.get(childDigest)!);
        eligible.sort((left, right) => left.coordinate.artifactSha256.localeCompare(
          right.coordinate.artifactSha256,
        ));
      }
    }
  }
  if (ordered.length !== inspected.length) fail("RECEIZ_SOURCE_FAMILY_CYCLE");
  return Object.freeze(ordered);
}

export async function openReceizSourceCarriedReplayFamilyV124(input: Readonly<{
  artifacts: readonly ReceizPortableSealedArtifactV124[];
  expected: ReceizDomainReplaySegmentSourceExpectationV124;
}>): Promise<ReceizSourceCarriedReplayFamilyV124> {
  if (!input || typeof input !== "object" || !Array.isArray(input.artifacts)) {
    fail("RECEIZ_SOURCE_FAMILY_INPUT_INVALID");
  }
  if (input.artifacts.length === 0) fail("RECEIZ_SOURCE_FAMILY_EMPTY");

  const uniqueArtifacts = new Map<string, Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    fingerprint: string;
  }>>();
  for (const artifact of input.artifacts) {
    const artifactDigest = artifact?.artifactSha256;
    if (typeof artifactDigest !== "string") fail("RECEIZ_SOURCE_FAMILY_INPUT_INVALID");
    const fingerprint = exactArtifactFingerprint(artifact);
    const prior = uniqueArtifacts.get(artifactDigest);
    if (prior !== undefined) {
      if (prior.fingerprint !== fingerprint) {
        fail("RECEIZ_SOURCE_FAMILY_DUPLICATE_CONFLICT");
      }
      continue;
    }
    uniqueArtifacts.set(artifactDigest, Object.freeze({ artifact, fingerprint }));
  }

  const inspected = await Promise.all(
    [...uniqueArtifacts.values()].map(async ({ artifact }) => Object.freeze({
      artifact,
      coordinate: await inspectReceizDomainReplaySegmentSourceCoordinateV124(
        artifact,
      ),
    })),
  );
  const identity = inspected[0]!.coordinate;
  for (const item of inspected) assertSameFamily(identity, item.coordinate);
  const ordered = orderByPredecessor(inspected);
  const artifactByDigest = new Map(
    ordered.map((item) => [item.coordinate.artifactSha256, item.artifact]),
  );
  const sources: ReceizReadDomainReplaySegmentSourceV124[] = [];
  for (const item of ordered) {
    const predecessorDigest = item.coordinate.predecessorArtifactSha256;
    const predecessorArtifact = predecessorDigest === null
      ? undefined
      : artifactByDigest.get(predecessorDigest);
    sources.push(await readReceizDomainReplaySegmentSourceV124({
      artifact: item.artifact,
      ...(predecessorArtifact === undefined ? {} : { predecessorArtifact }),
      expected: input.expected,
    }));
  }
  const predecessorDigests = new Set(
    ordered.flatMap((item) => item.coordinate.predecessorArtifactSha256 === null
      ? []
      : [item.coordinate.predecessorArtifactSha256]),
  );
  const headArtifactSha256s = Object.freeze(
    ordered
      .map((item) => item.coordinate.artifactSha256)
      .filter((digest) => !predecessorDigests.has(digest))
      .sort((left, right) => left.localeCompare(right)),
  );
  const familySetDigest = digestReceizCompositeCanonical({
    kind: "receiz.source-carried-replay-family-set.v124",
    proofObjectId: identity.proofObjectId,
    applicationId: identity.applicationId,
    domainId: identity.domainId,
    registryDigest: identity.registryDigest,
    reducerDigest: identity.reducerDigest,
    sources: ordered.map(({ coordinate }) => ({
      artifactSha256: coordinate.artifactSha256,
      predecessorArtifactSha256: coordinate.predecessorArtifactSha256,
      head: coordinate.head,
      headDigest: coordinate.headDigest,
    })),
    headArtifactSha256s,
  });
  const family = Object.freeze({
    schema: "receiz.source-carried-replay-family.v124" as const,
    proofObjectId: identity.proofObjectId,
    applicationId: identity.applicationId,
    domainId: identity.domainId,
    registryDigest: identity.registryDigest,
    reducerDigest: identity.reducerDigest,
    familySetDigest,
    sources: Object.freeze(sources),
    headArtifactSha256s,
    authority: Object.freeze({
      familyIsProofAuthority: false as const,
      setDigestIsProofAuthority: false as const,
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  openedFamilies.add(family);
  return family;
}

export function diffReceizSourceCarriedReplayFamiliesV124(input: Readonly<{
  local: ReceizSourceCarriedReplayFamilyV124;
  remote: ReceizSourceCarriedReplayFamilyV124;
}>): ReceizSourceCarriedReplayFamilyDifferenceV124 {
  if (!input || typeof input !== "object") fail("RECEIZ_SOURCE_FAMILY_INPUT_INVALID");
  const local = assertOpenedFamily(input.local);
  const remote = assertOpenedFamily(input.remote);
  assertCompatibleFamilies(local, remote);
  const localDigests = new Set(local.sources.map((source) => source.artifactSha256));
  const remoteDigests = new Set(remote.sources.map((source) => source.artifactSha256));
  return Object.freeze({
    missingFromLocal: Object.freeze(remote.sources
      .filter((source) => !localDigests.has(source.artifactSha256))
      .map((source) => source.artifact)),
    missingFromRemote: Object.freeze(local.sources
      .filter((source) => !remoteDigests.has(source.artifactSha256))
      .map((source) => source.artifact)),
  });
}

export async function mergeReceizSourceCarriedReplayFamiliesV124(input: Readonly<{
  families: readonly ReceizSourceCarriedReplayFamilyV124[];
  expected: ReceizDomainReplaySegmentSourceExpectationV124;
}>): Promise<ReceizSourceCarriedReplayFamilyV124> {
  if (!input || typeof input !== "object" || !Array.isArray(input.families)) {
    fail("RECEIZ_SOURCE_FAMILY_INPUT_INVALID");
  }
  if (input.families.length === 0) fail("RECEIZ_SOURCE_FAMILY_EMPTY");
  const families = input.families.map(assertOpenedFamily);
  const identity = families[0]!;
  for (const family of families) assertCompatibleFamilies(identity, family);
  return openReceizSourceCarriedReplayFamilyV124({
    artifacts: families.flatMap((family) => family.sources.map((source) => source.artifact)),
    expected: input.expected,
  });
}

export function projectReceizSourceCarriedReplayBranchesV124(
  value: ReceizSourceCarriedReplayFamilyV124,
): readonly ReceizSourceCarriedReplayBranchV124[] {
  const family = assertOpenedFamily(value);
  const sourceByDigest = new Map(
    family.sources.map((source) => [source.artifactSha256, source]),
  );
  return Object.freeze(family.headArtifactSha256s.map((headArtifactSha256) => {
    const chain: ReceizReadDomainReplaySegmentSourceV124[] = [];
    const seen = new Set<string>();
    let digest: string | null = headArtifactSha256;
    while (digest !== null) {
      if (seen.has(digest)) fail("RECEIZ_SOURCE_FAMILY_CYCLE");
      seen.add(digest);
      const source = sourceByDigest.get(digest);
      if (source === undefined) fail("RECEIZ_SOURCE_FAMILY_PREDECESSOR_MISSING");
      chain.push(source);
      digest = source.carrier.predecessor?.artifactSha256 ?? null;
    }
    chain.reverse();
    return Object.freeze({
      headArtifactSha256,
      sourceArtifactSha256s: Object.freeze(chain.map((source) => source.artifactSha256)),
      additions: Object.freeze(chain.flatMap((source) => source.replay.additions)),
    });
  }));
}
