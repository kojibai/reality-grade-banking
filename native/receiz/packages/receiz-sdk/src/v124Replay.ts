import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { getReceizAuthenticatedRuntimeAdmissionV124 } from "./v124AuthenticatedRuntime.js";
import {
  compareReceizDomainReplaySourceHeadsV124,
  parseReceizDomainReplayNamespaceHeadV124,
  readReceizDomainReplayCheckpointSourceV124,
  readReceizDomainReplaySegmentSourceV124,
  verifyAndReadReceizDomainReplayProofObjectV124,
  type ReceizDomainReplayCheckpointProofCarrierV124,
  type ReceizDomainReplayProofCarrierV124,
  type ReceizDomainReplayProofHeadV124,
  type ReceizDomainReplayProofObjectRestorationV124,
  type ReceizDomainReplayRuntimeSourceAdmissionV124,
  type ReceizDomainReplaySegmentSourceExpectationV124,
  type ReceizReadDomainReplayCheckpointSourceV124,
  type ReceizReadDomainReplaySegmentSourceV124,
} from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { applicationId, closedRecord, digest, domainId, freeze } from "./v124Contracts.js";

export type ReceizNamespaceProjectionV124 = Readonly<{
  name: string;
  exactBytesB64u: string;
  digest: string;
  head: string;
}>;

export type ReceizDomainReplayAdditionV124 = Readonly<{
  appendId: string;
  sequence: number;
  cursor: number;
  exactEventBytesB64u: string;
  eventDigest: string;
  causalParents: readonly string[];
  priorHead: string;
  newHead: string;
  namespaceHead: string;
  namespaceDigest: string;
}>;

export type ReceizDomainReplayExpectationV124 = Readonly<{
  applicationId: string;
  domainId: string;
  afterHead?: string | null;
  expectedRegistryDigest: string;
  expectedReducerDigest: string;
}>;

export type ReceizDomainReplayV124 = Readonly<{
  schema: "receiz.domain.replay.v124";
  status: "authenticated";
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  afterHead: string | null;
  afterCursor: number;
  cursor: number;
  priorHead: string;
  head: string;
  namespace: ReceizNamespaceProjectionV124;
  additions: readonly ReceizDomainReplayAdditionV124[];
  receiptDigest: string;
  authority: Readonly<{
    replayIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizDomainReplayReceiptV124 = Readonly<{
  schema: "receiz.domain.replay-receipt.v124";
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  afterHead: string | null;
  priorHead: string;
  head: string;
  afterCursor: number;
  cursor: number;
  namespace: Readonly<{ name: string; head: string; digest: string }>;
  additionsDigest: string;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  receiptDigest: string;
}>;

export type ReceizCheckpointV124 = Readonly<{
  schema: "receiz.domain.checkpoint.v124";
  status: "authenticated";
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  throughHead: string;
  cursor: number;
  namespace: ReceizNamespaceProjectionV124;
  exactCheckpointBytesB64u: string;
  checkpointDigest: string;
  receiptDigest: string;
  authority: Readonly<{
    checkpointIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizCheckpointReceiptV124 = Readonly<{
  schema: "receiz.domain.checkpoint-receipt.v124";
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  throughHead: string;
  cursor: number;
  namespace: Readonly<{ name: string; head: string; digest: string }>;
  checkpointDigest: string;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  receiptDigest: string;
}>;

export type ReceizCheckpointExpectationV124 = Readonly<{ replay: ReceizDomainReplayV124 }>;
export type ReceizVerifiedDomainReplaySegmentSourceV124 = ReceizReadDomainReplaySegmentSourceV124;
export type ReceizVerifiedDomainReplayCheckpointSourceV124 = ReceizReadDomainReplayCheckpointSourceV124;

export type ReceizDomainReplayProofObjectRestoreInputV124 = Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  applicationId: string;
  domainId: string;
  expectedRegistryDigest: string;
  expectedReducerDigest: string;
  expectedHead: string;
  expectedCursor: number;
  expectedNamespace: Readonly<{ name: string; head: string; digest: string }>;
}>;

type RuntimeAdmissionWithSource = ReturnType<typeof getReceizAuthenticatedRuntimeAdmissionV124> & Readonly<{
  sourceAdmission?: ReceizDomainReplayRuntimeSourceAdmissionV124;
}>;

const verifiedReplays = new WeakSet<object>();
const verifiedReplaySources = new WeakMap<object, ReceizVerifiedDomainReplaySegmentSourceV124>();
const verifiedReplayReceipts = new WeakMap<object, ReceizDomainReplayReceiptV124>();
const verifiedReplayPrevious = new WeakMap<object, ReceizDomainReplayV124 | null>();
const noAdditionExpectations = new WeakMap<object, Readonly<{
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
  afterHead: string;
}>>();
const checkpointSourceAdmissions = new WeakMap<object, ReceizVerifiedDomainReplayCheckpointSourceV124>();
const verifiedCheckpoints = new WeakSet<object>();
const verifiedCheckpointSources = new WeakMap<object, ReceizVerifiedDomainReplayCheckpointSourceV124>();
const verifiedCheckpointReceipts = new WeakMap<object, ReceizCheckpointReceiptV124>();

function fail(code: string): never { throw new TypeError(code); }
function safeCount(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}
function exactCanonical(left: unknown, right: unknown): boolean {
  try { return canonicalizeReceizV122(left) === canonicalizeReceizV122(right); } catch { return false; }
}

function expectation(value: ReceizDomainReplayExpectationV124) {
  const keys = Object.prototype.hasOwnProperty.call(value, "afterHead")
    ? ["applicationId", "domainId", "afterHead", "expectedRegistryDigest", "expectedReducerDigest"]
    : ["applicationId", "domainId", "expectedRegistryDigest", "expectedReducerDigest"];
  const record = closedRecord(value, keys, "V124_REPLAY_EXPECTATION_INVALID");
  return freeze({
    applicationId: applicationId(record.applicationId, "V124_REPLAY_EXPECTATION_INVALID"),
    domainId: domainId(record.domainId, "V124_REPLAY_EXPECTATION_INVALID"),
    afterHead: record.afterHead === undefined ? undefined : record.afterHead === null ? null : digest(record.afterHead, "V124_REPLAY_EXPECTATION_INVALID"),
    registryDigest: digest(record.expectedRegistryDigest, "V124_REPLAY_EXPECTATION_INVALID"),
    reducerDigest: digest(record.expectedReducerDigest, "V124_REPLAY_EXPECTATION_INVALID"),
  });
}

function assertReplayExpectation(replay: ReceizDomainReplayV124, value: ReceizDomainReplayExpectationV124): void {
  const expected = expectation(value);
  const noAddition = noAdditionExpectations.get(replay);
  const afterMatches = replay.afterHead === (expected.afterHead ?? null)
    || (noAddition !== undefined && expected.afterHead === replay.head && noAddition.afterHead === replay.head);
  if (replay.applicationId !== expected.applicationId || replay.domainId !== expected.domainId
    || replay.registryDigest !== expected.registryDigest || replay.reducerDigest !== expected.reducerDigest
    || !afterMatches) fail("V124_REPLAY_EXPECTATION_MISMATCH");
}

function runtimeSourceAdmission(value: unknown): RuntimeAdmissionWithSource {
  let admission: RuntimeAdmissionWithSource;
  try { admission = getReceizAuthenticatedRuntimeAdmissionV124(value) as RuntimeAdmissionWithSource; }
  catch { return fail("V124_REPLAY_TRANSPORT_UNAUTHENTICATED"); }
  if (admission.request.strongerTruth !== "sealed-receiz-proof-object") fail("V124_REPLAY_TRANSPORT_UNAUTHENTICATED");
  if (!admission.sourceAdmission || admission.sourceAdmission.requestDigest !== admission.request.requestDigest) fail("V124_REPLAY_SOURCE_ARTIFACT_REQUIRED");
  return admission;
}

function predecessorMatches(source: ReceizVerifiedDomainReplaySegmentSourceV124, previous: ReceizDomainReplayV124): boolean {
  const previousSource = verifiedReplaySources.get(previous);
  const predecessor = source.carrier.predecessor;
  return previousSource !== undefined && predecessor !== null
    && predecessor.artifactSha256 === previousSource.artifactSha256
    && predecessor.head.headDigest === previousSource.head.headDigest
    && exactCanonical(predecessor.head, previousSource.head)
    && source.replay.afterHead === previous.head && source.replay.afterCursor === previous.cursor;
}

function brandReplaySource(source: ReceizVerifiedDomainReplaySegmentSourceV124, previous: ReceizDomainReplayV124 | null): ReceizDomainReplayV124 {
  const replay = source.replay;
  verifiedReplaySources.set(replay, source);
  verifiedReplayReceipts.set(replay, source.replayReceipt);
  verifiedReplayPrevious.set(replay, previous);
  verifiedReplays.add(replay);
  return replay;
}

/** The signed envelope is transport only; this consumes its prior pinned source admission. */
export async function admitReceizDomainReplayRuntimeWireV124(value: unknown, previous?: ReceizDomainReplayV124): Promise<ReceizDomainReplayV124> {
  if (previous !== undefined && !verifiedReplays.has(previous)) fail("V124_REPLAY_PREVIOUS_UNVERIFIED");
  const admission = runtimeSourceAdmission(value);
  if (admission.request.path !== "/api/sdk/v1/domains/verified-replay"
    && admission.request.path !== "/api/sdk/v1/domains/verified-additions") fail("V124_REPLAY_TRANSPORT_UNAUTHENTICATED");
  const sourceAdmission = admission.sourceAdmission!;
  if (sourceAdmission.kind === "replay-no-additions") {
    if (!previous) fail("V124_REPLAY_PREVIOUS_UNVERIFIED");
    const previousSource = verifiedReplaySources.get(previous);
    if (!previousSource || sourceAdmission.source.artifactSha256 !== previousSource.artifactSha256
      || sourceAdmission.source.head.headDigest !== previousSource.head.headDigest
      || sourceAdmission.replay.head !== previous.head || sourceAdmission.replay.cursor !== previous.cursor) fail("V124_REPLAY_EMPTY_SOURCE_SUBSTITUTION");
    noAdditionExpectations.set(previous, freeze({ applicationId: previous.applicationId, domainId: previous.domainId, registryDigest: previous.registryDigest, reducerDigest: previous.reducerDigest, afterHead: previous.head }));
    return previous;
  }
  if (sourceAdmission.kind !== "replay-segment") fail("V124_REPLAY_SOURCE_ARTIFACT_REQUIRED");
  const source = sourceAdmission.source;
  if (source.replay.afterHead === null) {
    if (previous !== undefined || source.carrier.predecessor !== null) fail("V124_REPLAY_PAGE_LINKAGE_MISMATCH");
  } else if (!previous || !predecessorMatches(source, previous)) fail("V124_REPLAY_PAGE_LINKAGE_MISMATCH");
  return brandReplaySource(source, previous ?? null);
}

export async function validateReceizDomainReplayV124(value: unknown, expected: ReceizDomainReplayExpectationV124): Promise<ReceizDomainReplayV124> {
  if (value === null || typeof value !== "object" || !verifiedReplays.has(value)) fail("V124_REPLAY_AUTHENTICATION_REQUIRED");
  const replay = value as ReceizDomainReplayV124;
  assertReplayExpectation(replay, expected);
  return replay;
}
export const validateReceizReplayV124 = validateReceizDomainReplayV124;

export function isReceizVerifiedDomainReplayV124(value: unknown): value is ReceizDomainReplayV124 {
  return value !== null && typeof value === "object" && verifiedReplays.has(value);
}

export function readReceizVerifiedDomainReplaySourceV124(value: unknown): ReceizVerifiedDomainReplaySegmentSourceV124 {
  if (value === null || typeof value !== "object") fail("V124_REPLAY_PROOF_HELD_REPLAY_REQUIRED");
  const source = verifiedReplaySources.get(value);
  if (!source) fail("V124_REPLAY_PROOF_CUSTODY_MISSING");
  return source;
}

export function readReceizVerifiedDomainReplaySourceArtifactV124(value: unknown): ReceizPortableSealedArtifactV124 {
  return readReceizVerifiedDomainReplaySourceV124(value).artifact;
}

export async function restoreReceizDomainReplaySegmentSourceV124(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  expected: ReceizDomainReplaySegmentSourceExpectationV124;
  predecessorArtifact?: ReceizPortableSealedArtifactV124;
}>): Promise<ReceizVerifiedDomainReplaySegmentSourceV124> {
  const keys = Object.prototype.hasOwnProperty.call(input, "predecessorArtifact")
    ? ["artifact", "expected", "predecessorArtifact"]
    : ["artifact", "expected"];
  const holder = closedRecord(input, keys, "V124_REPLAY_SOURCE_INPUT_INVALID");
  const source = await readReceizDomainReplaySegmentSourceV124({
    artifact: holder.artifact as ReceizPortableSealedArtifactV124,
    ...(Object.prototype.hasOwnProperty.call(holder, "predecessorArtifact")
      ? {
        predecessorArtifact: holder.predecessorArtifact as ReceizPortableSealedArtifactV124,
      }
      : {}),
    expected: holder.expected as ReceizDomainReplaySegmentSourceExpectationV124,
  });
  brandReplaySource(source, null);
  return source;
}

export async function admitReceizCheckpointRuntimeWireV124(value: unknown): Promise<ReceizCheckpointV124> {
  let admission: RuntimeAdmissionWithSource;
  try { admission = runtimeSourceAdmission(value); } catch { return fail("V124_CHECKPOINT_TRANSPORT_UNAUTHENTICATED"); }
  if (admission.request.path !== "/api/sdk/v1/domains/verified-checkpoint") fail("V124_CHECKPOINT_TRANSPORT_UNAUTHENTICATED");
  if (admission.sourceAdmission?.kind !== "checkpoint") fail("V124_CHECKPOINT_SOURCE_ARTIFACT_REQUIRED");
  const source = admission.sourceAdmission.source;
  checkpointSourceAdmissions.set(source.checkpoint, source);
  return source.checkpoint;
}

function brandCheckpointSource(source: ReceizVerifiedDomainReplayCheckpointSourceV124): ReceizCheckpointV124 {
  const checkpoint = source.checkpoint;
  verifiedCheckpoints.add(checkpoint);
  verifiedCheckpointSources.set(checkpoint, source);
  verifiedCheckpointReceipts.set(checkpoint, source.checkpointReceipt);
  return checkpoint;
}

export async function validateReceizCheckpointV124(value: unknown, expected: ReceizCheckpointExpectationV124): Promise<ReceizCheckpointV124> {
  if (value === null || typeof value !== "object") fail("V124_CHECKPOINT_AUTHENTICATION_REQUIRED");
  const holder = closedRecord(expected, ["replay"], "V124_CHECKPOINT_EXPECTATION_INVALID");
  const replay = holder.replay;
  if (replay === null || typeof replay !== "object" || !verifiedReplays.has(replay)) fail("V124_CHECKPOINT_REPLAY_UNVERIFIED");
  if (verifiedCheckpoints.has(value)) return value as ReceizCheckpointV124;
  const source = checkpointSourceAdmissions.get(value);
  const replaySource = verifiedReplaySources.get(replay);
  if (!source || !replaySource) fail("V124_CHECKPOINT_AUTHENTICATION_REQUIRED");
  if (source.carrier.replaySourceArtifactSha256 !== replaySource.artifactSha256
    || source.replayHead.headDigest !== replaySource.head.headDigest || !exactCanonical(source.replayHead, replaySource.head)
    || source.sourceAuthority.sourceAuthorityBindingDigest !== replaySource.sourceAuthority.sourceAuthorityBindingDigest) fail("V124_CHECKPOINT_SOURCE_REPLAY_SUBSTITUTION");
  return brandCheckpointSource(source);
}

export function isReceizVerifiedCheckpointV124(value: unknown): value is ReceizCheckpointV124 {
  return value !== null && typeof value === "object" && verifiedCheckpoints.has(value);
}

export function readReceizVerifiedCheckpointSourceV124(value: unknown): ReceizVerifiedDomainReplayCheckpointSourceV124 {
  if (value === null || typeof value !== "object") fail("V124_REPLAY_PROOF_HELD_CHECKPOINT_REQUIRED");
  const source = verifiedCheckpointSources.get(value);
  if (!source) fail("V124_REPLAY_PROOF_CHECKPOINT_CUSTODY_MISSING");
  return source;
}

export function readReceizVerifiedCheckpointSourceArtifactV124(value: unknown): ReceizPortableSealedArtifactV124 {
  return readReceizVerifiedCheckpointSourceV124(value).artifact;
}

export async function restoreReceizDomainReplayCheckpointSourceV124(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  expectedAudience: string;
  replaySource: ReceizVerifiedDomainReplaySegmentSourceV124;
}>): Promise<ReceizVerifiedDomainReplayCheckpointSourceV124> {
  const source = await readReceizDomainReplayCheckpointSourceV124({
    ...input,
    ...(input.replaySource.predecessorArtifact === null
      ? {}
      : {
        replayPredecessorArtifact: input.replaySource.predecessorArtifact,
      }),
  });
  brandCheckpointSource(source);
  return source;
}

function proofExpectation(input: ReceizDomainReplayProofObjectRestoreInputV124) {
  const record = closedRecord(input, ["artifact", "applicationId", "domainId", "expectedRegistryDigest", "expectedReducerDigest", "expectedHead", "expectedCursor", "expectedNamespace"], "V124_REPLAY_PROOF_EXPECTATION_INVALID");
  return freeze({
    artifact: record.artifact as ReceizPortableSealedArtifactV124,
    applicationId: applicationId(record.applicationId, "V124_REPLAY_PROOF_EXPECTATION_INVALID"),
    domainId: domainId(record.domainId, "V124_REPLAY_PROOF_EXPECTATION_INVALID"),
    registryDigest: digest(record.expectedRegistryDigest, "V124_REPLAY_PROOF_EXPECTATION_INVALID"),
    reducerDigest: digest(record.expectedReducerDigest, "V124_REPLAY_PROOF_EXPECTATION_INVALID"),
    head: digest(record.expectedHead, "V124_REPLAY_PROOF_EXPECTATION_INVALID"),
    cursor: safeCount(record.expectedCursor, "V124_REPLAY_PROOF_EXPECTATION_INVALID"),
    namespace: parseReceizDomainReplayNamespaceHeadV124(record.expectedNamespace, "V124_REPLAY_PROOF_EXPECTATION_INVALID"),
  });
}

/** Restores the constant-width nested exact-source bundle, then installs custody. */
export async function restoreReceizDomainReplayProofCarrierV124(
  input: ReceizDomainReplayProofObjectRestoreInputV124,
  options: Readonly<{ expectedAudience: string }>,
): Promise<Readonly<{
  restoration: ReceizDomainReplayProofObjectRestorationV124;
  replaySource: ReceizVerifiedDomainReplaySegmentSourceV124;
  checkpointSource: ReceizVerifiedDomainReplayCheckpointSourceV124 | null;
}>> {
  const expected = proofExpectation(input);
  const optionRecord = closedRecord(options, ["expectedAudience"], "V124_REPLAY_PROOF_EXPECTATION_INVALID");
  const audience = String(optionRecord.expectedAudience);
  if (audience.length === 0) fail("V124_REPLAY_PROOF_EXPECTATION_INVALID");
  const opened = await verifyAndReadReceizDomainReplayProofObjectV124(expected.artifact);
  const record = closedRecord(opened.carrier, ["schema", "proofObjectId", "applicationId", "domainId", "registryDigest", "reducerDigest", "head", "cursor", "namespace", "predecessorSourceArtifact", "replaySourceArtifact", "checkpointSourceArtifact", "authority"], "V124_REPLAY_PROOF_CARRIER_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.domain-replay-proof-custody.v124") fail("V124_REPLAY_PROOF_CARRIER_SCHEMA_INVALID");
  const carrierAuthority = closedRecord(record.authority, ["custodyIsProofAuthority", "projectionIsProofAuthority", "strongerTruth"], "V124_REPLAY_PROOF_CARRIER_AUTHORITY_INVALID");
  if (carrierAuthority.custodyIsProofAuthority !== false || carrierAuthority.projectionIsProofAuthority !== false
    || carrierAuthority.strongerTruth !== "sealed-receiz-proof-object") fail("V124_REPLAY_PROOF_CARRIER_AUTHORITY_INVALID");
  const replaySource = await readReceizDomainReplaySegmentSourceV124({
    artifact: record.replaySourceArtifact as ReceizPortableSealedArtifactV124,
    ...(record.predecessorSourceArtifact === null
      ? {}
      : {
        predecessorArtifact: record.predecessorSourceArtifact as ReceizPortableSealedArtifactV124,
      }),
    expected: { applicationId: expected.applicationId, audience, domainId: expected.domainId, expectedRegistryDigest: expected.registryDigest, expectedReducerDigest: expected.reducerDigest },
  });
  const namespace = parseReceizDomainReplayNamespaceHeadV124(record.namespace, "V124_REPLAY_PROOF_CARRIER_NAMESPACE_INVALID");
  if (record.proofObjectId !== replaySource.head.proofObjectId || record.applicationId !== expected.applicationId
    || record.domainId !== expected.domainId || record.registryDigest !== expected.registryDigest
    || record.reducerDigest !== expected.reducerDigest || record.head !== expected.head || record.cursor !== expected.cursor
    || replaySource.replay.head !== expected.head || replaySource.replay.cursor !== expected.cursor
    || !exactCanonical(namespace, expected.namespace) || !exactCanonical(namespace, replaySource.head.namespace)) fail("V124_REPLAY_PROOF_EXPECTATION_MISMATCH");
  const checkpointSource = record.checkpointSourceArtifact === null ? null
    : await readReceizDomainReplayCheckpointSourceV124({
      artifact: record.checkpointSourceArtifact as ReceizPortableSealedArtifactV124,
      expectedAudience: audience,
      replaySource,
      ...(replaySource.predecessorArtifact === null
        ? {}
        : { replayPredecessorArtifact: replaySource.predecessorArtifact }),
    });

  const replay = brandReplaySource(replaySource, null);
  const checkpoint = checkpointSource ? brandCheckpointSource(checkpointSource) : null;
  const restoration: ReceizDomainReplayProofObjectRestorationV124 = freeze({
    schema: "receiz.domain-replay-proof-object-restoration.v124" as const,
    status: "restored" as const,
    replay,
    checkpoint,
    sourceArtifactSha256: replaySource.artifactSha256,
    checkpointSourceArtifactSha256: checkpointSource?.artifactSha256 ?? null,
    headDigest: replaySource.head.headDigest,
    sourceAuthority: replaySource.sourceAuthority,
    authority: freeze({ restorationIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
  return freeze({ restoration, replaySource, checkpointSource });
}

export function compareReceizVerifiedDomainReplaySourcesV124(left: ReceizVerifiedDomainReplaySegmentSourceV124, right: ReceizVerifiedDomainReplaySegmentSourceV124): number {
  return compareReceizDomainReplaySourceHeadsV124(left, right);
}

export function readReceizVerifiedDomainReplayHeadV124(value: unknown): ReceizDomainReplayProofHeadV124 {
  return readReceizVerifiedDomainReplaySourceV124(value).head;
}

export function readReceizVerifiedCheckpointCarrierV124(value: unknown): ReceizDomainReplayCheckpointProofCarrierV124 {
  return readReceizVerifiedCheckpointSourceV124(value).carrier;
}

export function createReceizDomainReplayCustodyCarrierV124(input: Readonly<{
  replay: ReceizDomainReplayV124;
  checkpoint?: ReceizCheckpointV124 | null;
}>): ReceizDomainReplayProofCarrierV124 {
  const keys = Object.prototype.hasOwnProperty.call(input, "checkpoint") ? ["replay", "checkpoint"] : ["replay"];
  const record = closedRecord(input, keys, "V124_REPLAY_PROOF_EXPORT_INPUT_INVALID");
  const replaySource = readReceizVerifiedDomainReplaySourceV124(record.replay);
  const checkpointSource = record.checkpoint === undefined || record.checkpoint === null ? null : readReceizVerifiedCheckpointSourceV124(record.checkpoint);
  if (checkpointSource && checkpointSource.carrier.replaySourceArtifactSha256 !== replaySource.artifactSha256) fail("V124_REPLAY_PROOF_CHECKPOINT_SOURCE_MISMATCH");
  return freeze({
    schema: "receiz.domain-replay-proof-custody.v124" as const,
    proofObjectId: replaySource.head.proofObjectId,
    applicationId: replaySource.replay.applicationId,
    domainId: replaySource.replay.domainId,
    registryDigest: replaySource.replay.registryDigest,
    reducerDigest: replaySource.replay.reducerDigest,
    head: replaySource.replay.head,
    cursor: replaySource.replay.cursor,
    namespace: replaySource.head.namespace,
    predecessorSourceArtifact: replaySource.predecessorArtifact,
    replaySourceArtifact: replaySource.artifact,
    checkpointSourceArtifact: checkpointSource?.artifact ?? null,
    authority: freeze({ custodyIsProofAuthority: false as const, projectionIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
}
