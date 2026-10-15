import type { ReceizArtifactAppendPlan } from "./artifactTransition.js";
import { admitReceizSubjectThreadEventV125 } from "./v125SubjectMessageSource.js";
import { parseReceizConversationEventV2, reduceReceizConversationEventsV2, type ReceizConversationEventV2, type ReceizConversationProjectionV2 } from "./conversationDomain.js";
import type { ReceizSignedCapability } from "./capabilityAuthority.js";
import { bindReceizConversationAuthorSourceV125 as author, bindReceizConversationSourceEventsV125 as eventsBound, normalizeReceizConversationAuthorSelectionV125 as selection, type ReceizConversationAuthorSourceSelectionV125 } from "./conversationActorSource.js";
export { projectReceizConversationParticipantSourceV125 } from "./conversationActorSource.js";
export type { ReceizConversationAuthorSourceSelectionV125 } from "./conversationActorSource.js";
import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { verifyReceizArtifact } from "./artifactVerification.js";
import { openReceizConversationSourceFamilyV1 } from "./conversationSourceFamily.js";
import { receizBase64UrlDecode } from "./identity.js";
import { reduceReceizNamespace, snapshotReceizNamespaceBodies } from "./namespaceReducer.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import type { ReceizConstitutionJson } from "./constitution.js";
import { parseReceizPortableAssetDocument } from "./portableAsset.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { closedRecord, digest, freeze } from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { parseReceizPortableReplaySourceArtifactV124, prepareReceizDomainReplaySegmentProofObjectCandidateV124,
  type ReceizDomainReplaySegmentProofObjectCandidateInputV124, type ReceizDomainReplaySegmentSourceExpectationV124 } from "./v124ReplayProofObject.js";
import { prepareInitialTemporalProofBytesV125 } from "./v125InitialTemporalSource.js";
import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { createReceizSubjectSourceFamilyV125, openReceizSubjectSourceFamilyV125,
  type ReceizSubjectSourceFamilyV125, type ReceizOpenedSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";

export type ReceizSubjectThreadSourceFamilyV125 = Readonly<{
  schema: "receiz.subject-thread-source-family.v125";
  originalArtifacts: readonly ReceizPortableSealedArtifactV124[];
  temporalArtifacts: readonly ReceizPortableSealedArtifactV124[];
  originalArtifactSha256: string;
  currentArtifactSha256: string;
  subjectFamily: ReceizSubjectSourceFamilyV125;
  authors: readonly Readonly<{ sourceArtifactSha256: string; selection: ReceizConversationAuthorSourceSelectionV125 }>[];
  familySetDigest: string;
  temporalAuthorizations?: readonly Readonly<{ sourceArtifactSha256: string; signedCapability: ReceizSignedCapability }>[];
}>;
const code = "V125_THREAD_SOURCE_SHAPE_INVALID";
function fail(reason: string): never { throw new TypeError(`V125_THREAD_SOURCE_${reason}`); }
function same(a: unknown, b: unknown): boolean { return canonicalizeReceizV122(a) === canonicalizeReceizV122(b); }
function artifacts(values: readonly ReceizPortableSealedArtifactV124[]) {
  if (!Array.isArray(values)) fail("ARTIFACTS_REQUIRED");
  const map = new Map<string, ReceizPortableSealedArtifactV124>();
  for (const value of values) {
    const parsed = parseReceizPortableReplaySourceArtifactV124(value);
    const prior = map.get(parsed.artifactSha256);
    if (prior && !same(prior, parsed)) fail("DUPLICATE_CONFLICT");
    map.set(parsed.artifactSha256, parsed);
  }
  return freeze([...map.values()].sort((a, b) => a.artifactSha256.localeCompare(b.artifactSha256)));
}

/** Initial issuance only. Existing v124 signed source intent is verified unchanged. */
export async function prepareReceizInitialTemporalConversationSourceV125(input: Readonly<{
  initialSource: true; conversation: ReceizDomainReplaySegmentProofObjectCandidateInputV124;
  subjectFamily: ReceizSubjectSourceFamilyV125; author: ReceizConversationAuthorSourceSelectionV125; kksCoordinate: unknown;
}>) {
  closedRecord(input, ["initialSource", "conversation", "subjectFamily", "author", "kksCoordinate"], code);
  const snapshot = structuredClone(input);
  const source = snapshot.conversation;
  if (snapshot.initialSource !== true || source.predecessorArtifact !== null || source.replay.afterHead !== null
    || source.portable.provenance.appends.length || source.portable.ownership.proofRef !== "genesis") fail("GENUINE_INITIAL_REQUIRED");
  const coordinate = await admitReceizKksV1ProofCoordinate(snapshot.kksCoordinate, { expectedPreviousKaiSigilProofHead: null });
  if (String(source.kai.pulse) !== coordinate.kaiPulse || String(source.kai.uPulse) !== coordinate.kaiUpulse) fail("KKS_MISMATCH");
  const candidate = await prepareReceizDomainReplaySegmentProofObjectCandidateV124(source);
  const family = await openReceizSubjectSourceFamilyV125({ family: snapshot.subjectFamily });
  const derived = await author({ family, selection: snapshot.author, evidence: source.authoringEvidence, authority: source.sourceAuthority });
  const events = await eventsBound(source.replay.additions, derived, coordinate.kaiUpulse, source.replay);
  if (events.length !== 1 || events[0]!.effect.kind !== "genesis") fail("SINGLE_ACTOR_GENESIS_REQUIRED");
  const bytes = await prepareInitialTemporalProofBytesV125({ bytes: candidate.proofObject.payload.bytes, kksCoordinate: coordinate,
    receipt: { schema: "receiz.conversation-initial-source.v125", proofObjectId: candidate.carrier.proofObjectId,
      sourceIntentDigest: source.authoringEvidence.consentStatementDigest } });
  return Object.freeze({ ...candidate, portableAssetDigest: await digestReceizCanonicalV122(JSON.parse(new TextDecoder().decode(bytes))),
    proofObject: Object.freeze({ ...candidate.proofObject, payload: Object.freeze({ ...candidate.proofObject.payload, bytes }) }) });
}

type FamilyInput = Omit<ReceizSubjectThreadSourceFamilyV125, "schema" | "familySetDigest">;
function familySnapshot(input: FamilyInput) {
  closedRecord(input, ["originalArtifacts", "temporalArtifacts", "originalArtifactSha256", "currentArtifactSha256", "subjectFamily", "authors", ...(Object.hasOwn(input, "temporalAuthorizations") ? ["temporalAuthorizations"] : [])], code);
  const value = structuredClone(input);
  if (!Array.isArray(value.authors) || !value.authors.length || !value.originalArtifacts.length) fail("AUTHORS_AND_ORIGINALS_REQUIRED");
  const authors = value.authors.map((entry) => {
    closedRecord(entry, ["sourceArtifactSha256", "selection"], code);
    return freeze({ sourceArtifactSha256: digest(entry.sourceArtifactSha256, code), selection: selection(entry.selection) });
  }).sort((a, b) => a.sourceArtifactSha256.localeCompare(b.sourceArtifactSha256));
  if (new Set(authors.map((entry) => entry.sourceArtifactSha256)).size !== authors.length) fail("AUTHOR_DUPLICATE");
  return freeze({ schema: "receiz.subject-thread-source-family.v125" as const,
    originalArtifacts: artifacts(value.originalArtifacts), temporalArtifacts: artifacts(value.temporalArtifacts),
    originalArtifactSha256: digest(value.originalArtifactSha256, code), currentArtifactSha256: digest(value.currentArtifactSha256, code),
    subjectFamily: value.subjectFamily, authors,
    ...(value.temporalAuthorizations === undefined ? {} : { temporalAuthorizations: freeze(value.temporalAuthorizations.map((authorization) => {
      closedRecord(authorization, ["sourceArtifactSha256", "signedCapability"], code);
      return { sourceArtifactSha256: digest(authorization.sourceArtifactSha256, code), signedCapability: authorization.signedCapability };
    }).sort((a, b) => a.sourceArtifactSha256.localeCompare(b.sourceArtifactSha256))) }) });
}
/** Closed portable transport, not admission or runtime custody. */
export async function createReceizSubjectThreadSourceFamilyV125(input: FamilyInput): Promise<ReceizSubjectThreadSourceFamilyV125> {
  const basis = familySnapshot(input);
  const checked = await createReceizSubjectSourceFamilyV125({ artifacts: basis.subjectFamily.artifacts, bindings: basis.subjectFamily.bindings });
  if (!same(checked, basis.subjectFamily)) fail("SUBJECT_FAMILY_INVALID");
  return freeze({ ...basis, familySetDigest: await digestReceizCanonicalV122(basis) });
}

function containsConversationEvent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsConversationEvent);
  const record = value as Record<string, unknown>;
  return typeof record.schema === "string" && /^receiz\.(chat\.|subject\.(?:thread|message))/.test(record.schema)
    || Object.values(record).some(containsConversationEvent);
}

const temporalCustody = new WeakSet<object>();
async function temporal(artifact: ReceizPortableSealedArtifactV124) {
  const bytes = receizBase64UrlDecode(artifact.exactBytesB64u);
  const verification = await verifyReceizArtifact(new File([new Uint8Array(bytes).buffer], artifact.filename, { type: artifact.mimeType }));
  const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: "portable-state" });
  if (admission.verdict !== "bearer-recovery" || admission.profile !== "portable-state" || admission.artifactSha256 !== artifact.artifactSha256
    || admission.payloadSha256 !== artifact.payloadSha256 || !admission.proofHistory || admission.proofHistory.headDigests.length !== 1) fail("TEMPORAL_ADMISSION_REQUIRED");
  const history = admission.proofHistory;
  const node = history.nodes.find((node) => node.nodeDigest === history.headDigests[0])!;
  const coordinate = await admitReceizKksV1ProofCoordinate(node.namespaceData["receiz.kks-v1"]);
  const result = Object.freeze({ artifact, admission, history, node, coordinate,
    document: freeze(await parseReceizPortableAssetDocument(admission.recoveredState)) });
  temporalCustody.add(result);
  return result;
}
type Temporal = Awaited<ReturnType<typeof temporal>>;
/** Internal temporal member custody; copied parsed source state cannot grant event admission. */
export function assertReceizSubjectThreadTemporalMemberV125(member: unknown): asserts member is Temporal {
  if (!member || typeof member !== "object" || !temporalCustody.has(member)) fail("TEMPORAL_CUSTODY_REQUIRED");
}
const custody = new WeakMap<object, Readonly<{ sources: ReadonlyMap<string, Temporal>; subjectFamily: ReceizOpenedSubjectSourceFamilyV125;
  transitionPlans: ReadonlyMap<string, ReceizArtifactAppendPlan>; expected: ReceizDomainReplaySegmentSourceExpectationV124; eventSets: ReadonlyMap<string, readonly ReceizConversationEventV2[]>; tuple: Readonly<{ registryDigest: string; reducerDigest: string; namespace: string }> }>>();

/** Admits exact history descendants; new conversation events require their own actor evidence.
 * A descendant never enters the unchanged v124 replay opener as an original segment.
 */
export async function openReceizSubjectThreadSourceFamilyV125(input: Readonly<{
  family: ReceizSubjectThreadSourceFamilyV125; expected: ReceizDomainReplaySegmentSourceExpectationV124; expectedConversationId: string;
}>) {
  closedRecord(input, ["family", "expected", "expectedConversationId"], code);
  const snap = structuredClone(input);
  const record = closedRecord(snap.family, ["schema", "originalArtifacts", "temporalArtifacts", "originalArtifactSha256", "currentArtifactSha256", "subjectFamily", "authors", "familySetDigest", ...(Object.hasOwn(snap.family, "temporalAuthorizations") ? ["temporalAuthorizations"] : [])], code);
  if (record.schema !== "receiz.subject-thread-source-family.v125") fail("SCHEMA_INVALID");
  const { schema: _schema, familySetDigest, ...basis } = snap.family;
  const family = await createReceizSubjectThreadSourceFamilyV125(basis);
  if (family.familySetDigest !== familySetDigest) fail("FAMILY_DIGEST_MISMATCH");
  const original = await openReceizConversationSourceFamilyV1({ artifacts: family.originalArtifacts,
    expected: snap.expected, expectedConversationId: snap.expectedConversationId, actorSources: { subjectFamily: family.subjectFamily, authors: family.authors } });
  const subjects = await openReceizSubjectSourceFamilyV125({ family: family.subjectFamily });
  if (family.authors.length !== original.replayFamily.sources.length) fail("AUTHOR_SET_MISMATCH");
  for (const source of original.replayFamily.sources) {
    const selected = family.authors.find((entry) => entry.sourceArtifactSha256 === source.artifactSha256);
    if (!selected) fail("AUTHOR_SOURCE_MISSING");
    const derived = await author({ family: subjects, selection: selected.selection, evidence: source.authoringEvidence, authority: source.sourceAuthority });
    await eventsBound(source.replay.additions, derived, undefined, source.replay);
  }
  const rootSource = original.replayFamily.sources.find((source) => source.artifactSha256 === family.originalArtifactSha256);
  if (!rootSource || rootSource.predecessorArtifact !== null) fail("GENESIS_REQUIRED");
  const sources = new Map<string, Temporal>();
  for (const artifact of artifacts([...family.originalArtifacts, ...family.temporalArtifacts])) sources.set(artifact.artifactSha256, await temporal(artifact));
  const root = sources.get(rootSource.artifactSha256)!;
  if (root.history.nodes.length !== 1 || root.node.parentDigests.length || root.document.provenance.appends.length
    || !same(root.node.receipt, { schema: "receiz.conversation-initial-source.v125", proofObjectId: rootSource.carrier.proofObjectId,
      sourceIntentDigest: rootSource.sourceIntent.consentStatementDigest })
    || String(rootSource.head.kai.uPulse) !== root.coordinate.kaiUpulse) fail("GENESIS_TEMPORAL_BINDING_MISMATCH");
  const rootEvents = await eventsBound(rootSource.replay.additions, await author({ family: subjects,
    selection: family.authors.find((entry) => entry.sourceArtifactSha256 === rootSource.artifactSha256)!.selection,
    evidence: rootSource.authoringEvidence, authority: rootSource.sourceAuthority }), root.coordinate.kaiUpulse, rootSource.replay);
  if (rootEvents.length !== 1 || rootEvents[0]!.effect.kind !== "genesis") fail("SINGLE_ACTOR_GENESIS_REQUIRED");
  const rootNamespaces = await snapshotReceizNamespaceBodies(root.admission.verifiedPayload.bytes);
  const originals = new Set(family.originalArtifacts.map((artifact) => artifact.artifactSha256));
  const eventSets = new Map<string, readonly ReceizConversationEventV2[]>();
  const transitionPlans = new Map<string, ReceizArtifactAppendPlan>();
  if (rootEvents[0]?.schema === "receiz.chat.conversation-event.v2") eventSets.set(root.artifact.artifactSha256, await Promise.all(rootEvents.map(parseReceizConversationEventV2)));
  const authorizations = new Map((family.temporalAuthorizations ?? []).map((entry) => [entry.sourceArtifactSha256, entry.signedCapability]));
  if (authorizations.size !== (family.temporalAuthorizations?.length ?? 0)) fail("AUTHORIZATION_DUPLICATE");
  const usedAuthorizations = new Set<string>();
  for (const source of [...sources.values()].sort((a, b) => a.history.nodes.length - b.history.nodes.length)) {
    if (originals.has(source.artifact.artifactSha256)) continue;
    if (source.document.provenance.root !== root.document.provenance.root || source.admission.artifactId !== root.admission.artifactId || source.document.payload.sha256 !== root.document.payload.sha256
      || source.history.nodes.length <= root.history.nodes.length || !same(source.history.nodes[0], root.history.nodes[0])) fail("UNRELATED_DESCENDANT");
    const namespaces = await snapshotReceizNamespaceBodies(source.admission.verifiedPayload.bytes);
    if (namespaces.size !== rootNamespaces.size) fail("IMMUTABLE_NAMESPACES_CHANGED");
    for (const [name, value] of rootNamespaces) if (name !== "provenance" && name !== "receizProofHistory"
      && value.bodyDigest.value !== namespaces.get(name)?.bodyDigest.value) fail("IMMUTABLE_NAMESPACES_CHANGED");
    // Each sealed member validates its own delta against its exact predecessor.
    // Intermediate members are checked independently, never against the final body.
    const node = source.node;
    const binding = node.namespaceData.provenance as Record<string, unknown> | undefined;
    const prior = sources.get(String(binding?.predecessorArtifactDigest));
    if (!prior || node.parentDigests.length !== 1 || node.parentDigests[0] !== prior.node.nodeDigest
      || prior.admission.artifactId !== root.admission.artifactId
      || node.event.type !== "state.append") fail("PREDECESSOR_SOURCE_REQUIRED");
    if (!same(source.history.nodes, [...prior.history.nodes, node])) fail("HISTORY_TRUNCATED");
    const state = node.event.state as Record<string, ReceizConstitutionJson>;
    if (state.namespace !== "provenance" || !source.document.provenance.appends.some((append) => same(append, state.event))) fail("PROVENANCE_NODE_MISMATCH");
    if (containsConversationEvent(state.event)) {
      const authorization = authorizations.get(source.artifact.artifactSha256);
      const priorEvents = eventSets.get(prior.artifact.artifactSha256);
      if (!authorization || !priorEvents) fail("CONVERSATION_APPEND_AUTHOR_EVIDENCE_REQUIRED");
      const accepted = await admitReceizSubjectThreadEventV125({ prior, source, subjects, carried: state.event, signedCapability: authorization, priorEvents,
        tuple: { registryDigest: rootSource.replay.registryDigest, reducerDigest: rootSource.replay.reducerDigest, namespace: rootSource.replay.namespace.name } });
      transitionPlans.set(source.artifact.artifactSha256, accepted.plan);
      eventSets.set(source.artifact.artifactSha256, accepted.events); usedAuthorizations.add(source.artifact.artifactSha256);
    } else {
      const priorEvents = eventSets.get(prior.artifact.artifactSha256);
      if (priorEvents) eventSets.set(source.artifact.artifactSha256, priorEvents);
    }
    const reduction = await reduceReceizNamespace({ payloadBytes: prior.admission.verifiedPayload.bytes,
      namespace: { scheme: "receiz-namespace.v1", value: "provenance" },
      namespaceLawVersion: String(binding?.namespaceLawVersion), namespaceReducerVersion: String(binding?.namespaceReducerVersion), event: state.event! });
    const resultingBody = namespaces.get("provenance")!;
    const eventDigest = { algorithm: "sha-256", binds: "canonical-namespace-event",
      value: await digestReceizAuthority("event", "receiz.namespace-event.v112", state.event!) };
    const receipt = node.receipt as Record<string, unknown>;
    if (binding?.schema !== "receiz.artifact-transition-namespace.v112" || binding.namespace !== "provenance"
      || !same(binding.eventDigest, eventDigest) || !same(binding.proposedNamespaceBodyDigest, reduction.proposedTargetDigest)
      || receipt.schema !== "receiz.artifact-transition-history-receipt.v112"
      || receipt.artifactId !== source.admission.artifactId || receipt.registryDigest !== node.registryDigest
      || receipt.parentDigest !== prior.node.nodeDigest || receipt.kaiPulse !== node.kaiPulse
      || !same(receipt.namespace, reduction.namespace) || receipt.namespaceLawVersion !== reduction.namespaceLawVersion
      || receipt.namespaceReducerVersion !== reduction.namespaceReducerVersion || !same(receipt.eventDigest, eventDigest)
      || !same(receipt.proposedNamespaceBodyDigest, reduction.proposedTargetDigest)
      || !same(resultingBody.bodyDigest, reduction.proposedTargetDigest)
      || resultingBody.bytes.length !== reduction.proposedTargetBytes.length
      || resultingBody.bytes.some((byte, index) => byte !== reduction.proposedTargetBytes[index])) fail("PROVENANCE_REDUCTION_MISMATCH");
    const additions = source.history.nodes.slice(1).map((node) => (node.event as unknown as { state: { event: unknown } }).state.event);
    if (!same(additions, source.document.provenance.appends)) fail("PROVENANCE_HISTORY_MISMATCH");
  }
  if (usedAuthorizations.size !== authorizations.size) fail("UNUSED_AUTHORIZATION");
  const current = sources.get(family.currentArtifactSha256);
  if (!current || current.admission.artifactId !== root.admission.artifactId) fail("CURRENT_SOURCE_MISSING");
  const branch = original.branches.find((branch) => branch.headArtifactSha256 === rootSource.artifactSha256);
  if (!branch || original.branches.length !== 1) fail("BRANCH_SELECTION_REQUIRED");
  const currentEvents = eventSets.get(current.artifact.artifactSha256);
  const projection: ReceizConversationProjectionV2 = currentEvents ? await reduceReceizConversationEventsV2(currentEvents) : branch.projection;
  const result = Object.freeze({ family, conversationId: branch.projection.conversationId, proofObjectId: rootSource.head.proofObjectId,
    artifactId: current.admission.artifactId, currentArtifactSha256: current.artifact.artifactSha256,
    artifactHistoryHead: current.node.nodeDigest, replayHead: rootSource.replay.head,
    conversationEventFrontier: projection.headEventIds, projection,
    authority: Object.freeze({ familyIsProofAuthority: false as const, projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const }) });
  custody.set(result, Object.freeze({ sources, subjectFamily: subjects, eventSets, transitionPlans, expected: freeze(structuredClone(snap.expected)),
    tuple: Object.freeze({ registryDigest: rootSource.replay.registryDigest, reducerDigest: rootSource.replay.reducerDigest, namespace: rootSource.replay.namespace.name }) }));
  return result;
}
export type ReceizOpenedSubjectThreadSourceFamilyV125 = Awaited<ReturnType<typeof openReceizSubjectThreadSourceFamilyV125>>;

/** Returns an exact custodied member; clones and serialized projections are never custody. */
export function readReceizSubjectThreadSourceMemberV125(opened: ReceizOpenedSubjectThreadSourceFamilyV125, artifactSha256: string) {
  const held = custody.get(opened);
  if (!held) fail("NOT_OPENED");
  return held.sources.get(artifactSha256) ?? fail("MEMBER_MISSING");
}

/** Internal mutation context derived only from the opened complete sealed family. */
export function readReceizSubjectThreadPlanningContextV125(thread: ReceizOpenedSubjectThreadSourceFamilyV125) {
  const held = custody.get(thread);
  if (!held) fail("NOT_OPENED");
  return Object.freeze({ current: held.sources.get(thread.currentArtifactSha256)!, subjects: held.subjectFamily,
    transitionPlan: held.transitionPlans.get(thread.currentArtifactSha256),
    events: held.eventSets.get(thread.currentArtifactSha256), tuple: held.tuple, expected: held.expected });
}
