import { bindReceizArtifactTransitionAtomicRequirements } from "./artifactTransitionAtomicRequirements.js";
import { commitArtifactTransition, sealArtifactTransitionCandidate, type ReceizArtifactTransitionSealer } from "./artifactTransition.js";
import type { ReceizArtifactTransitionStore, ReceizStagedArtifactTransition } from "./artifactTransitionStore.js";
import { transportReceizSealedArtifactV124 } from "./v124PortableAuthority.js";
import { createReceizSubjectThreadSourceFamilyV125, openReceizSubjectThreadSourceFamilyV125 } from "./v125SubjectThreadSource.js";
import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { createReceizArtifactAdmissionEngineWithSourceContext, createReceizCapabilityIssuerResolver } from "./artifactAdmission.js";
import { bindReceizCurrentArtifactAppendRegistryAuthority, planReceizExactKksArtifactAppend, receizArtifactAppendCapabilityContext, type ReceizCommitDomainId } from "./artifactTransition.js";
import { createReceizCapabilityVerifierWithSourceContext, type ReceizSignedCapability } from "./capabilityAuthority.js";
import { projectReceizConversationParticipantSourceV125, normalizeReceizConversationAuthorSelectionV125 } from "./conversationActorSource.js";
import { parseReceizConversationEventV2, reduceReceizConversationEventsV2, type ReceizConversationEventV2 } from "./conversationDomain.js";
import { bindReceizConversationV2Registration } from "./conversationRegistration.js";
import { RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY } from "./v125ConversationClosureRegistry.generated.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { closedRecord, digest, freeze, text } from "./v124Contracts.js";
import { verifyReceizPbiCeremonyReceiptV125, type ReceizPbiCeremonyReceiptV125 } from "./v125PbiCeremony.js";
import { readReceizSubjectSourceFamilyMemberV125, type ReceizOpenedSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
import { readReceizTemporalSubjectSourceV125 } from "./v125SubjectSource.js";
import { assertReceizSubjectThreadTemporalMemberV125, readReceizSubjectThreadPlanningContextV125, type ReceizOpenedSubjectThreadSourceFamilyV125, type readReceizSubjectThreadSourceMemberV125 } from "./v125SubjectThreadSource.js";

type Member = ReturnType<typeof readReceizSubjectThreadSourceMemberV125>;
const code = "V125_THREAD_EVENT_SHAPE_INVALID";
const same = (a: unknown, b: unknown) => canonicalizeReceizV122(a) === canonicalizeReceizV122(b);
function fail(reason: string): never { throw new TypeError(`V125_THREAD_EVENT_${reason}`); }

/** Event-specific Identity/PBI and candidate capability admission beneath the exact sealed predecessor. */
async function prepareThreadEvent(input: Readonly<{
  prior: Member; subjects: ReceizOpenedSubjectSourceFamilyV125; carried: unknown;
  kksCoordinate: unknown; commitDomain: ReceizCommitDomainId; priorEvents: readonly ReceizConversationEventV2[];
  tuple: Readonly<{ registryDigest: string; reducerDigest: string; namespace: string }>;
}>) {
  input = Object.freeze({ ...input, carried: freeze(structuredClone(input.carried)), kksCoordinate: freeze(structuredClone(input.kksCoordinate)), commitDomain: freeze(structuredClone(input.commitDomain)),
    priorEvents: freeze(structuredClone(input.priorEvents)), tuple: freeze(structuredClone(input.tuple)) });
  const { prior, subjects } = input;
  assertReceizSubjectThreadTemporalMemberV125(prior);
  const coordinate = await admitReceizKksV1ProofCoordinate(input.kksCoordinate, { expectedPreviousKaiSigilProofHead: prior.coordinate.kaiSigil.proofHead });
  await bindReceizConversationV2Registration(RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY, input.tuple);
  const record = closedRecord(input.carried, ["schema", "event", "author", "subjectArtifactDigests", "consentHeads",
    "predecessorArtifactSha256", "expectedThreadHead", "idempotencyKey", "message", "actorPresence"], code);
  if (record.schema !== "receiz.subject.thread-source-reference.v125") fail("SOURCE_REFERENCE_REQUIRED");
  const carried = freeze(structuredClone(record));
  const event = await parseReceizConversationEventV2(carried.event);
  const priorProjection = await reduceReceizConversationEventsV2(input.priorEvents);
  if (event.conversationId !== priorProjection.conversationId || !same(event.predecessorEventIds, priorProjection.headEventIds)
    || digest(carried.predecessorArtifactSha256, code) !== prior.artifact.artifactSha256
    || digest(carried.expectedThreadHead, code) !== prior.node.nodeDigest) fail("PREDECESSOR_MISMATCH");
  if (String(event.kaiUPulse) !== coordinate.kaiUpulse) fail("KKS_MISMATCH");
  // Other mutations stay closed until their own consent/encrypted-source contracts
  // are implemented. The existing generic rejection is never a blanket bypass.
  if (event.effect.kind !== "close" || carried.message !== null) fail("UNSUPPORTED_EFFECT");
  const derived = await projectReceizConversationParticipantSourceV125({ family: subjects,
    selection: normalizeReceizConversationAuthorSelectionV125(carried.author) });
  if (event.actorReceizId !== derived.actorId) fail("ACTOR_MISMATCH");
  const participantMap = carried.subjectArtifactDigests;
  if (!participantMap || typeof participantMap !== "object" || Array.isArray(participantMap)) fail("PARTICIPANTS_REQUIRED");
  const active = priorProjection.members.filter((member) => member.state === "active");
  if (!same(Object.keys(participantMap).sort(), active.map((member) => member.binding.subjectId).sort())) fail("PARTICIPANT_SET_MISMATCH");
  const readDependencies = [];
  for (const member of active) {
    const artifactSha = digest((participantMap as Record<string, unknown>)[member.binding.subjectId], code);
    const artifact = readReceizSubjectSourceFamilyMemberV125(subjects, artifactSha).artifact;
    const subject = await readReceizTemporalSubjectSourceV125(artifact);
    if (subject.source.subjectState.subjectId !== member.binding.subjectId) fail("PARTICIPANT_SOURCE_MISMATCH");
    const bindings = subjects.family.bindings.filter((binding) => binding.subjectArtifactSha256 === artifactSha);
    if (!bindings.length || bindings.some((binding) => {
      const history = readReceizSubjectSourceFamilyMemberV125(subjects, binding.currentArtifactSha256).verification.verification.bundle.pbiAuthorshipHistory;
      return !Array.isArray(history) || history.at(-1)?.receizId !== member.binding.receizId;
    })) fail("PARTICIPANT_ACTOR_MISMATCH");
    readDependencies.push({ resource: subject.admission.artifactId, expectedHeadDigest: subject.head });
  }
  if (!same(carried.consentHeads, {})) fail("CONSENT_HEADS_INVALID");
  if ((participantMap as Record<string, unknown>)[derived.participant.subjectId] !== derived.subject.source.artifactSha256) fail("ACTOR_SOURCE_MISMATCH");
  const { actorPresence: _presence, ...basis } = carried;
  const binding = await digestReceizAuthority("event", "receiz.subject.thread-event-authorship.v125", basis);
  const presence = carried.actorPresence as ReceizPbiCeremonyReceiptV125;
  if (presence.holderReceizId !== event.actorReceizId || presence.proofObjectId !== derived.subject.source.subjectState.proofObjectId
    || presence.acceptedHead !== derived.subject.head || presence.presentationDigest !== binding
    || presence.disclosureDigest !== binding || presence.consentDigest !== binding
    || presence.verifierReceizId !== "receiz.subject.coordination.v125") fail("PBI_BINDING_MISMATCH");
  const pbi = await verifyReceizPbiCeremonyReceiptV125({ receipt: presence, selectedKai: coordinate.kaiUpulse, verifyPbiAuthorship: subjects.verifyPbiAuthorship });
  if (!pbi.valid) fail("PBI_REQUIRED");
  const engine = await createReceizArtifactAdmissionEngineWithSourceContext(prior.admission);
  const proof = presence.approval.holderProof;
  const identity = await engine(derived.identity.verification, { profile: "identity", ownerConstraint: derived.subject.source.subjectState.ownerReceizId,
    actorConstraint: event.actorReceizId, identityProof: proof, identityExactChallengeB64Url: proof.challengeB64Url });
  if (identity.verdict !== "canonical-identity" || identity.profile !== "identity") fail("IDENTITY_REQUIRED");
  await bindReceizCurrentArtifactAppendRegistryAuthority({ admission: prior.admission, registry: RECEIZ_CURRENT_CONSTITUTION_REGISTRY });
  const plan = await planReceizExactKksArtifactAppend({ admission: prior.admission, verifiedHistory: prior.history, verifiedActorEvidence: identity,
    expectedHead: { algorithm: "sha-256", binds: "verified-proof-history", value: prior.node.nodeDigest },
    commitDomain: input.commitDomain, namespace: { scheme: "receiz-namespace.v1", value: "provenance" },
    event: carried as never, idempotencyKey: text(carried.idempotencyKey, code), kksCoordinate: coordinate });
  const events = freeze([...input.priorEvents, event]);
  return Object.freeze({ event, carried, events, projection: await reduceReceizConversationEventsV2(events), plan, identity, coordinate,
    readDependencies: freeze(readDependencies.sort((a, b) => a.resource.localeCompare(b.resource))), consumedPbiReceiptDigests: freeze([presence.receiptDigest]) });
}

/** Reopening requires the actual enclosing successor plus its exact signed candidate authority. */
export async function admitReceizSubjectThreadEventV125(input: Readonly<{
  prior: Member; source: Member; subjects: ReceizOpenedSubjectSourceFamilyV125; carried: unknown;
  signedCapability: ReceizSignedCapability; priorEvents: readonly ReceizConversationEventV2[];
  tuple: Readonly<{ registryDigest: string; reducerDigest: string; namespace: string }>;
}>) {
  assertReceizSubjectThreadTemporalMemberV125(input.source);
  const signed = freeze(structuredClone(input.signedCapability));
  const prepared = await prepareThreadEvent({ ...input, kksCoordinate: input.source.coordinate, commitDomain: signed.payload.operationConstraints.commitDomain });
  const { plan, identity, coordinate } = prepared;
  if (plan.transition.proposedHistoryHead.value !== input.source.node.nodeDigest || plan.planDigest.value !== signed.payload.operationConstraints.planDigest.value) fail("CANDIDATE_PLAN_MISMATCH");
  const resolveAdmittedIssuer = await createReceizCapabilityIssuerResolver({ identityAdmissions: [identity], revokedIssuerKeyIds: new Set() });
  const verified = await (await createReceizCapabilityVerifierWithSourceContext(input.prior.admission, { resolveAdmittedIssuer,
    currentKai: coordinate.kaiPulse, audience: "receiz:sdk", revokedCapabilityDigests: new Set() }))(signed, receizArtifactAppendCapabilityContext(plan));
  if (!verified.ok) fail("CAPABILITY_REQUIRED");
  return Object.freeze({ ...prepared, capability: verified.capability });
}

const plans = new WeakMap<object, Readonly<{ thread: ReceizOpenedSubjectThreadSourceFamilyV125; prepared: Awaited<ReturnType<typeof prepareThreadEvent>> }>>();
/** Plans only from SDK-opened sealed conversation custody and an event-specific Identity/PBI ceremony. */
export async function planReceizSubjectMessageEventV125(input: Readonly<{
  thread: ReceizOpenedSubjectThreadSourceFamilyV125; carried: unknown; kksCoordinate: unknown; commitDomain: ReceizCommitDomainId;
}>) {
  const context = readReceizSubjectThreadPlanningContextV125(input.thread);
  if (!context.events) fail("UNSUPPORTED_REDUCER");
  const prepared = await prepareThreadEvent({ ...input, prior: context.current, subjects: context.subjects, priorEvents: context.events, tuple: context.tuple });
  const confirmationDigest = await digestReceizAuthority("plan", "receiz.subject.thread-confirmation.v125", { planDigest: prepared.plan.planDigest, familySetDigest: input.thread.family.familySetDigest });
  const plan = Object.freeze({ schema: "receiz.subject.thread-event-plan.v125" as const, planIdentity: prepared.plan.planDigest.value,
    confirmationDigest, confirmationRequired: true as const, transitionPlan: prepared.plan, event: prepared.event, writesPerformed: 0 as const });
  bindReceizArtifactTransitionAtomicRequirements(prepared.plan, prepared);
  plans.set(plan, Object.freeze({ thread: input.thread, prepared }));
  return plan;
}

/** Projection only: neither a detached event list nor a copied family establishes source custody. */
export function projectReceizSubjectThreadV125(thread: ReceizOpenedSubjectThreadSourceFamilyV125) {
  readReceizSubjectThreadPlanningContextV125(thread);
  return thread.projection;
}

export type ReceizSubjectMessageEventPlanV125 = Awaited<ReturnType<typeof planReceizSubjectMessageEventV125>>;
export type ReceizSubjectThreadSourceStoreV125 = ReceizArtifactTransitionStore & Readonly<{
  /** Persist and verify candidate source custody before commit. Returned custody is staged, not accepted. */
  retainThreadSourceFamily(thread: ReceizOpenedSubjectThreadSourceFamilyV125): Promise<ReceizOpenedSubjectThreadSourceFamilyV125>;
  /** Recover only source with exact successful atomic transition commit evidence. */
  readThreadSourceFamily(familySetDigest: string): Promise<ReceizOpenedSubjectThreadSourceFamilyV125 | null>;
}>;
const candidates = new WeakMap<object, Readonly<{ staged: ReceizStagedArtifactTransition; thread: ReceizOpenedSubjectThreadSourceFamilyV125; store: ReceizSubjectThreadSourceStoreV125 }>>();
const active = new WeakMap<object, Promise<unknown>>();

/** Applies the supported close effect. Exact PBI consumption and all participant heads share one atomic append. */
export async function applyReceizSubjectMessageEventV125(input: Readonly<{
  plan: ReceizSubjectMessageEventPlanV125; confirmationDigest: string; signedCapability: ReceizSignedCapability;
  sealer: ReceizArtifactTransitionSealer; store: ReceizSubjectThreadSourceStoreV125;
}>) {
  input = { ...input };
  const custody = plans.get(input.plan); if (!custody) fail("PLAN_CUSTODY_REQUIRED");
  if (input.confirmationDigest !== input.plan.confirmationDigest) fail("CONFIRMATION_INVALID");
  if (input.store.atomicReadDependencies !== true || typeof input.store.retainThreadSourceFamily !== "function"
    || typeof input.store.readThreadSourceFamily !== "function") fail("ATOMIC_SOURCE_RETENTION_REQUIRED");
  if (active.has(input.plan)) fail("APPLY_IN_PROGRESS");
  const operation = (async () => {
    const { thread, prepared } = custody;
    const context = readReceizSubjectThreadPlanningContextV125(thread);
    const signed = freeze(structuredClone(input.signedCapability));
    const resolveAdmittedIssuer = await createReceizCapabilityIssuerResolver({ identityAdmissions: [prepared.identity], revokedIssuerKeyIds: new Set() });
    const verified = await (await createReceizCapabilityVerifierWithSourceContext(context.current.admission, { resolveAdmittedIssuer,
      currentKai: prepared.coordinate.kaiPulse, audience: "receiz:sdk", revokedCapabilityDigests: new Set() }))(signed, receizArtifactAppendCapabilityContext(prepared.plan));
    if (!verified.ok) fail("CAPABILITY_REQUIRED");
    let candidate = candidates.get(input.plan);
    if (candidate && candidate.store !== input.store) fail("STORE_CUSTODY_REQUIRED");
    if (!candidate) {
      const sealed = await sealArtifactTransitionCandidate({ plan: prepared.plan, capability: verified.capability, sealer: input.sealer });
      const artifact = await transportReceizSealedArtifactV124(sealed.artifact);
      const { schema: _schema, familySetDigest: _digest, ...basis } = thread.family;
      const family = await createReceizSubjectThreadSourceFamilyV125({ ...basis,
        temporalArtifacts: [...basis.temporalArtifacts, artifact], currentArtifactSha256: artifact.artifactSha256,
        temporalAuthorizations: [...(basis.temporalAuthorizations ?? []), { sourceArtifactSha256: artifact.artifactSha256, signedCapability: signed }] });
      const next = await openReceizSubjectThreadSourceFamilyV125({ family, expected: context.expected, expectedConversationId: thread.conversationId });
      const staged = await input.store.stageCandidate(sealed);
      const retained = await input.store.retainThreadSourceFamily(next);
      if (!retained || !same(retained.family, family)) fail("SOURCE_RETENTION_FAILED");
      readReceizSubjectThreadPlanningContextV125(retained);
      candidate = Object.freeze({ staged, thread: retained, store: input.store });
      candidates.set(input.plan, candidate);
    }
    const committedTransition = await commitArtifactTransition({ plan: prepared.plan, capability: verified.capability, staged: candidate.staged, store: input.store });
    if (committedTransition.status !== "committed-artifact-transition") fail(committedTransition.code);
    return Object.freeze({ schema: "receiz.subject.thread-event-apply.v125" as const,
      sourceFamily: candidate.thread.family, projection: candidate.thread.projection, committedTransition,
      acceptedHead: candidate.thread.artifactHistoryHead,
      writesPerformed: committedTransition.acceptance === "committed" ? 1 as const : 0 as const,
      authority: Object.freeze({ applyIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }) });
  })();
  active.set(input.plan, operation);
  try { return await operation; } finally { active.delete(input.plan); }
}
