import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { verifyReceizArtifact } from "./artifactVerification.js";
import { readReceizProofHistoryExactKksCoordinate } from "./proofHistory.js";
import { readReceizTemporalSubjectSourceV125 } from "./v125SubjectSource.js";
export { prepareReceizInitialTemporalSubjectSourceV125, readReceizTemporalSubjectSourceV125 } from "./v125SubjectSource.js";
import { bindReceizCurrentArtifactAppendRegistryAuthority, planReceizExactKksArtifactAppend,
  sealArtifactTransitionCandidate, commitArtifactTransition, type ReceizArtifactAppendPlan,
  type ReceizArtifactTransitionSealer, type ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import type { ReceizVerifiedCapability } from "./capabilityAuthority.js";
import type { ReceizArtifactTransitionCommitUnit, ReceizArtifactTransitionCommitResult, ReceizStagedArtifactTransition, ReceizArtifactTransitionStore } from "./artifactTransitionStore.js";
import type { ReceizConstitutionJson } from "./constitution.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import { transportReceizSealedArtifactV124 } from "./v124PortableAuthority.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { freeze, closedRecord } from "./v124Contracts.js";
import { createReceizSubjectSourceFamilyV125, openReceizSubjectSourceFamilyV125, readReceizSubjectSourceFamilyMemberV125,
  type ReceizSubjectSourceFamilyV125, type ReceizOpenedSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
import { receizBase64UrlDecode } from "./identity.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { sha256ReceizBytes } from "./artifacts.js";
import { readReceizSubjectSourceV124 } from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizSubjectStateV122 } from "./v122Subjects.js";
import {
  verifyReceizPbiCeremonyReceiptV125,
  type ReceizPbiAuthorshipVerifierV125,
  type ReceizPbiCeremonyReceiptV125,
  type ReceizPbiCeremonyReplayGuardV125,
} from "./v125PbiCeremony.js";

const HEX64 = /^[0-9a-f]{64}$/u;
const KAI = /^(0|[1-9][0-9]*)$/u;
const TOKEN = /^[A-Za-z0-9:._-]{1,256}$/u;

export type ReceizSubjectRelationshipStatusV125 = "none" | "requested" | "connected" | "declined" | "revoked" | "blocked";
export type ReceizSubjectRelationshipEventKindV125 =
  | "relationship_requested" | "relationship_accepted" | "relationship_declined"
  | "relationship_revoked" | "subject_blocked" | "subject_unblocked" | "subject_reported"
  | "introduction_requested" | "introduction_accepted" | "introduction_declined" | "introduction_expired";

export type ReceizSubjectRelationshipEventV125 = Readonly<{
  schema: "receiz.subject.relationship-event.v125";
  kind: ReceizSubjectRelationshipEventKindV125;
  subjectA: string;
  subjectB: string;
  actorSubjectId: string;
  actorReceizId: string;
  introducerSubjectId: string | null;
  subjectHeads: Readonly<Record<string, string>>;
  expectedPriorHead: string | null;
  consentDigest: string;
  eventKai: string;
  idempotencyKey: string;
  actorPresence: ReceizPbiCeremonyReceiptV125;
  eventDigest: string;
  authority: Readonly<{ eventIsIdentityAuthority: false; strongerTruth: "sealed-subject-proof" }>;
}>;

export type ReceizSubjectRelationshipEventInputV125 = Omit<
  ReceizSubjectRelationshipEventV125,
  "schema" | "eventDigest" | "authority"
>;

export type ReceizSubjectRelationshipEventPlanV125 = Readonly<{
  schema: "receiz.subject.relationship-plan.v125";
  event: ReceizSubjectRelationshipEventV125;
  planIdentity: string;
  confirmationDigest: string;
  confirmationRequired: true;
  transitionPlan?: ReceizArtifactAppendPlan;
  writesPerformed: 0;
  authority: Readonly<{ planIsAdmission: false; strongerTruth: "sealed-subject-proof" }>;
}>;

export type ReceizSubjectRelationshipEventApplyV125 = Readonly<{
  schema: "receiz.subject.relationship-apply.v125";
  history: readonly ReceizSubjectRelationshipEventV125[];
  projection: ReceizSubjectRelationshipProjectionV125;
  append: ReceizSubjectRelationshipEventV125;
  sourceArtifact: ReceizPortableSealedArtifactV124;
  committedTransition: ReceizCommittedArtifactTransition;
  sourceFamily?: ReceizSubjectSourceFamilyV125;
  writesPerformed: 0 | 1;
  authority: Readonly<{ applyIsIdentityAuthority: false; strongerTruth: "sealed-subject-proof" }>;
}>;

export type ReceizSubjectRelationshipProjectionV125 = Readonly<{
  schema: "receiz.subject.relationship-projection.v125";
  subjectA: string;
  subjectB: string;
  status: ReceizSubjectRelationshipStatusV125;
  acceptedHead: string | null;
  latestKai: string | null;
  reported: boolean;
  authority: Readonly<{ projectionIsIdentityAuthority: false; strongerTruth: "sealed-subject-proof" }>;
}>;

export type ReceizSubjectPresenceVisibilityV125 = "connections" | "introduced" | "event" | "public";

/** A namespace locator beneath the existing enclosing sealed subject proof. */
export type ReceizSubjectNamespaceSourceV125 = Readonly<{
  sourceArtifact: ReceizPortableSealedArtifactV124;
  namespace: string;
  sourceFamily?: ReceizSubjectSourceFamilyV125;
}>;

export type ReceizSubjectPresenceV125 = Readonly<{
  schema: "receiz.subject.presence.v125";
  subjectId: string;
  subjectHead: string;
  visibility: ReceizSubjectPresenceVisibilityV125;
  coarseCell: string | null;
  eventId: string | null;
  issuedKai: string;
  expiresAtKai: string;
  expectedPriorHead: string | null;
  presenceHead: string;
  authority: Readonly<{ presenceIsIdentityAuthority: false; strongerTruth: "sealed-subject-proof" }>;
}>;

export type ReceizSubjectDiscoveryResultV125 = Readonly<{
  schema: "receiz.subject.discovery-result.v125";
  viewerSubjectId: string;
  selectedKai: string;
  query: Readonly<{ coarseCell: string | null; eventId: string | null }>;
  subjects: readonly Readonly<{
    subjectId: string;
    subjectHead: string;
    presenceHead: string;
    relationshipHead: string | null;
  }>[];
  resultDigest: string;
  authority: Readonly<{ discoveryProjectionIsAuthority: false; strongerTruth: "sealed-subject-proof" }>;
}>;

export class ReceizSubjectCoordinationZeroWriteErrorV125 extends TypeError {
  readonly writesPerformed = 0 as const;
  constructor(readonly code: string) {
    super(code);
    this.name = "ReceizSubjectCoordinationZeroWriteErrorV125";
  }
}

function fail(code: string): never {
  throw new ReceizSubjectCoordinationZeroWriteErrorV125(code);
}

function token(value: unknown, code: string): string {
  if (typeof value !== "string" || !TOKEN.test(value) || value.normalize("NFC") !== value) fail(code);
  return value;
}

function digest(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code);
  return value;
}

function kai(value: unknown, code: string): string {
  if (typeof value !== "string" || !KAI.test(value)) fail(code);
  return value;
}

function nullableDigest(value: unknown, code: string): string | null {
  return value === null ? null : digest(value, code);
}

function relationshipAuthority() {
  return freeze({ eventIsIdentityAuthority: false as const, strongerTruth: "sealed-subject-proof" as const });
}

function relationshipProjectionAuthority() {
  return freeze({ projectionIsIdentityAuthority: false as const, strongerTruth: "sealed-subject-proof" as const });
}

function relationshipEventBasis(event: Omit<ReceizSubjectRelationshipEventV125, "schema" | "actorPresence" | "eventDigest" | "authority">) {
  const subjectA = token(event.subjectA, "V125_SUBJECT_RELATIONSHIP_SUBJECT_INVALID");
  const subjectB = token(event.subjectB, "V125_SUBJECT_RELATIONSHIP_SUBJECT_INVALID");
  if (subjectA === subjectB) fail("V125_SUBJECT_RELATIONSHIP_SELF_FORBIDDEN");
  const actorSubjectId = token(event.actorSubjectId, "V125_SUBJECT_RELATIONSHIP_ACTOR_INVALID");
  const introducerSubjectId = event.introducerSubjectId === null
    ? null
    : token(event.introducerSubjectId, "V125_SUBJECT_INTRODUCER_INVALID");
  if (actorSubjectId !== subjectA && actorSubjectId !== subjectB
    && !(event.kind === "introduction_requested" && actorSubjectId === introducerSubjectId)) {
    fail("V125_SUBJECT_RELATIONSHIP_ACTOR_INVALID");
  }
  const expectedSubjectIds = [...new Set([subjectA, subjectB, ...(introducerSubjectId ? [introducerSubjectId] : [])])].sort();
  const keys = Object.keys(event.subjectHeads).sort();
  if (keys.length !== expectedSubjectIds.length || keys.some((key, index) => key !== expectedSubjectIds[index])) {
    fail("V125_SUBJECT_RELATIONSHIP_HEADS_INVALID");
  }
  const subjectHeads = freeze(Object.fromEntries(keys.map((key) => [
    key,
    digest(event.subjectHeads[key], "V125_SUBJECT_RELATIONSHIP_HEADS_INVALID"),
  ])));
  return freeze({
    kind: event.kind,
    subjectA,
    subjectB,
    actorSubjectId,
    actorReceizId: token(event.actorReceizId, "V125_SUBJECT_RELATIONSHIP_ACTOR_INVALID"),
    introducerSubjectId,
    subjectHeads,
    expectedPriorHead: nullableDigest(event.expectedPriorHead, "V125_SUBJECT_RELATIONSHIP_HEAD_INVALID"),
    consentDigest: digest(event.consentDigest, "V125_SUBJECT_RELATIONSHIP_CONSENT_INVALID"),
    eventKai: kai(event.eventKai, "V125_SUBJECT_RELATIONSHIP_KAI_INVALID"),
    idempotencyKey: token(event.idempotencyKey, "V125_SUBJECT_RELATIONSHIP_IDEMPOTENCY_INVALID"),
  });
}

export async function createReceizSubjectRelationshipEventBindingDigestV125(
  input: Omit<ReceizSubjectRelationshipEventInputV125, "actorPresence">,
): Promise<string> {
  return digestReceizAuthority("event", "receiz.subject.relationship-event-authorship.v125", relationshipEventBasis(input));
}

async function createRelationshipEvent(
  input: ReceizSubjectRelationshipEventInputV125,
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125,
  replayGuard?: ReceizPbiCeremonyReplayGuardV125,
): Promise<ReceizSubjectRelationshipEventV125> {
  if (![
    "relationship_requested", "relationship_accepted", "relationship_declined", "relationship_revoked",
    "subject_blocked", "subject_unblocked", "subject_reported", "introduction_requested",
    "introduction_accepted", "introduction_declined", "introduction_expired",
  ].includes(input.kind)) fail("V125_SUBJECT_RELATIONSHIP_EVENT_INVALID");
  const basis = relationshipEventBasis(input);
  const bindingDigest = await digestReceizAuthority("event", "receiz.subject.relationship-event-authorship.v125", basis);
  const actorHead = basis.subjectHeads[basis.actorSubjectId];
  if (!actorHead
    || input.actorPresence.holderReceizId !== basis.actorReceizId
    || input.actorPresence.acceptedHead !== actorHead
    || input.actorPresence.presentationDigest !== bindingDigest
    || input.actorPresence.disclosureDigest !== basis.consentDigest
    || input.actorPresence.consentDigest !== basis.consentDigest) {
    fail("V125_SUBJECT_RELATIONSHIP_AUTHORSHIP_BINDING_INVALID");
  }
  const presence = await verifyReceizPbiCeremonyReceiptV125({
    receipt: input.actorPresence,
    selectedKai: basis.eventKai,
    verifyPbiAuthorship,
    ...(replayGuard ? { replayGuard } : {}),
  });
  if (!presence.valid) fail(`V125_SUBJECT_RELATIONSHIP_AUTHORSHIP_${presence.code.toUpperCase()}`);
  const eventBasis = freeze({
    schema: "receiz.subject.relationship-event.v125" as const,
    ...basis,
    actorPresence: input.actorPresence,
    authority: relationshipAuthority(),
  });
  return freeze({
    ...eventBasis,
    eventDigest: await digestReceizAuthority("event", eventBasis.schema, eventBasis),
  });
}

async function validateRelationshipEvent(
  event: ReceizSubjectRelationshipEventV125,
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125,
): Promise<ReceizSubjectRelationshipEventV125> {
  if (event.schema !== "receiz.subject.relationship-event.v125"
    || event.authority.eventIsIdentityAuthority !== false
    || event.authority.strongerTruth !== "sealed-subject-proof") fail("V125_SUBJECT_RELATIONSHIP_EVENT_INVALID");
  const created = await createRelationshipEvent(event, verifyPbiAuthorship);
  if (digest(event.eventDigest, "V125_SUBJECT_RELATIONSHIP_DIGEST_INVALID") !== created.eventDigest) {
    fail("V125_SUBJECT_RELATIONSHIP_DIGEST_INVALID");
  }
  return created;
}

export async function projectReceizSubjectRelationshipV125(
  events: readonly ReceizSubjectRelationshipEventV125[],
  input: Readonly<{ verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125 }>,
): Promise<ReceizSubjectRelationshipProjectionV125> {
  if (events.length === 0) fail("V125_SUBJECT_RELATIONSHIP_HISTORY_EMPTY");
  let status: ReceizSubjectRelationshipStatusV125 = "none";
  let acceptedHead: string | null = null;
  let latestKai: string | null = null;
  let reported = false;
  let subjectA = "";
  let subjectB = "";
  const digests = new Set<string>();
  const idempotency = new Set<string>();
  const blockingSubjects = new Set<string>();
  for (const event of events) {
    await validateRelationshipEvent(event, input.verifyPbiAuthorship);
    if (!subjectA) { subjectA = event.subjectA; subjectB = event.subjectB; }
    if (event.subjectA !== subjectA || event.subjectB !== subjectB
      || event.expectedPriorHead !== acceptedHead || digests.has(event.eventDigest)
      || idempotency.has(event.idempotencyKey)
      || (latestKai !== null && BigInt(event.eventKai) < BigInt(latestKai))) {
      fail("V125_SUBJECT_RELATIONSHIP_HISTORY_INVALID");
    }
    switch (event.kind) {
      case "relationship_requested":
      case "introduction_requested":
        if (status !== "none" && status !== "declined" && status !== "revoked") fail("V125_SUBJECT_RELATIONSHIP_TRANSITION_INVALID");
        if (event.kind === "relationship_requested" && event.actorSubjectId !== subjectA) fail("V125_SUBJECT_RELATIONSHIP_ACTOR_INVALID");
        if (event.kind === "introduction_requested" && event.introducerSubjectId !== event.actorSubjectId) fail("V125_SUBJECT_INTRODUCTION_CONSENT_INVALID");
        status = "requested";
        break;
      case "relationship_accepted":
      case "introduction_accepted":
        if (status !== "requested" || event.actorSubjectId !== subjectB) fail("V125_SUBJECT_RELATIONSHIP_TRANSITION_INVALID");
        status = "connected";
        break;
      case "relationship_declined":
      case "introduction_declined":
      case "introduction_expired":
        if (status !== "requested") fail("V125_SUBJECT_RELATIONSHIP_TRANSITION_INVALID");
        status = "declined";
        break;
      case "relationship_revoked":
        if (status !== "connected") fail("V125_SUBJECT_RELATIONSHIP_TRANSITION_INVALID");
        status = "revoked";
        break;
      case "subject_blocked":
        if (blockingSubjects.has(event.actorSubjectId)) fail("V125_SUBJECT_RELATIONSHIP_TRANSITION_INVALID");
        blockingSubjects.add(event.actorSubjectId);
        status = "blocked";
        break;
      case "subject_unblocked":
        if (!blockingSubjects.delete(event.actorSubjectId)) fail("V125_SUBJECT_RELATIONSHIP_TRANSITION_INVALID");
        status = blockingSubjects.size > 0 ? "blocked" : "none";
        break;
      case "subject_reported": reported = true; break;
    }
    acceptedHead = event.eventDigest;
    latestKai = event.eventKai;
    digests.add(event.eventDigest);
    idempotency.add(event.idempotencyKey);
  }
  return freeze({
    schema: "receiz.subject.relationship-projection.v125" as const,
    subjectA, subjectB, status, acceptedHead, latestKai, reported,
    authority: relationshipProjectionAuthority(),
  });
}

async function makeRelationshipPlan(
  event: ReceizSubjectRelationshipEventV125,
  transitionPlan?: ReceizArtifactAppendPlan,
  sourceFamily?: ReceizSubjectSourceFamilyV125,
): Promise<ReceizSubjectRelationshipEventPlanV125> {
  const planIdentity = await digestReceizAuthority("plan", "receiz.subject.relationship-plan.v125", {
    ...(sourceFamily ? { sourceFamilyDigest: sourceFamily.familySetDigest } : {}),
    ...(transitionPlan ? { transitionPlanDigest: transitionPlan.planDigest.value } : {}),
    eventDigest: event.eventDigest,
    expectedPriorHead: event.expectedPriorHead,
    idempotencyKey: event.idempotencyKey,
  });
  return freeze({
    schema: "receiz.subject.relationship-plan.v125" as const,
    event,
    planIdentity,
    confirmationDigest: await digestReceizAuthority("confirmation", "receiz.subject.relationship-confirmation.v125", {
      planIdentity,
      eventDigest: event.eventDigest,
    }),
    confirmationRequired: true as const,
    ...(transitionPlan ? { transitionPlan } : {}),
    writesPerformed: 0 as const,
    authority: freeze({ planIsAdmission: false as const, strongerTruth: "sealed-subject-proof" as const }),
  });
}

async function planRelationshipEvent(input: Readonly<{
  history?: readonly ReceizSubjectRelationshipEventV125[];
  event: ReceizSubjectRelationshipEventInputV125;
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
  sealedSource?: ReceizSealedSubjectRelationshipContextV125;
}>): Promise<ReceizSubjectRelationshipEventPlanV125> {
  const context = input.sealedSource ? structuredClone(input.sealedSource) : null;
  const eventInput = structuredClone(input.event);
  const family = context?.sourceFamily ? await openReceizSubjectSourceFamilyV125({ family: context.sourceFamily }) : undefined;
  if (family && !family.family.bindings.some((selection) => selection.subjectArtifactSha256 === context!.sourceArtifact.artifactSha256
    && selection.identityArtifactSha256 === context!.identityArtifact.artifactSha256)) fail("V125_SUBJECT_FAMILY_ACTOR_SELECTION_REQUIRED");
  const verifyPbiAuthorship = family?.verifyPbiAuthorship ?? input.verifyPbiAuthorship;
  const event = await createRelationshipEvent(eventInput, verifyPbiAuthorship);
  const history = context ? await relationshipHistoryForContext(context, event, verifyPbiAuthorship, family) : input.history ?? [];
  const currentHead = history.length ? (await projectReceizSubjectRelationshipV125(history, { verifyPbiAuthorship })).acceptedHead : null;
  if (event.expectedPriorHead !== currentHead || history.some((entry) => entry.idempotencyKey === event.idempotencyKey)) fail("V125_SUBJECT_RELATIONSHIP_STALE_OR_REPLAYED");
  await projectReceizSubjectRelationshipV125([...history, event], { verifyPbiAuthorship });
  if (!context) return makeRelationshipPlan(event);
  const read = await readReceizTemporalSubjectSourceV125(context.sourceArtifact);
  const dependencies = {
    participantArtifactDigests: Object.fromEntries(Object.entries(context.participantSources).map(([id, source]) => [id, source.artifactSha256])),
    identityArtifactDigest: context.identityArtifact.artifactSha256,
  };
  const existingSources = new Set(read.source.provenance.appends.flatMap((entry) => {
    const addition = carriedRelationship(entry);
    return addition?.schema === "receiz.subject.relationship-source-append.v125"
      ? addition.sources.map((source) => source.artifactSha256) : [];
  }));
  const carried: CarriedRelationship | CarriedRelationshipReference = family ? {
    schema: "receiz.subject.relationship-source-reference.v125", event, ...dependencies,
  } : {
    schema: "receiz.subject.relationship-source-append.v125", event, ...dependencies,
    sources: [...Object.entries(context.participantSources)
      .filter(([id, source]) => id !== event.actorSubjectId && !existingSources.has(source.artifactSha256)).map(([, source]) => source),
      ...(!existingSources.has(context.identityArtifact.artifactSha256) ? [context.identityArtifact] : [])],
  };
  await bindReceizCurrentArtifactAppendRegistryAuthority({ admission: read.admission, registry: RECEIZ_CURRENT_CONSTITUTION_REGISTRY });
  const transitionPlan = await planReceizExactKksArtifactAppend({ admission: read.admission, verifiedHistory: read.admission.proofHistory,
    verifiedActorEvidence: await readRelationshipActor(context.identityArtifact, read.source.subjectState, event), commitDomain: context.commitDomain, namespace: { scheme: "receiz-namespace.v1", value: "provenance" },
    event: carried as unknown as ReceizConstitutionJson, expectedHead: { algorithm: "sha-256", binds: "verified-proof-history", value: context.expectedHead },
    idempotencyKey: event.idempotencyKey, kksCoordinate: context.kksCoordinate });
  if (transitionPlan.actor.actorId !== event.actorReceizId || (context.kksCoordinate as { kaiUpulse: string }).kaiUpulse !== event.eventKai) fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
  const plan = await makeRelationshipPlan(event, transitionPlan, family?.family);
  sealedPlanCustody.set(plan, { context, transitionPlan, ...(family ? { family } : {}) });
  return plan;
}

export async function planReceizSubjectRelationshipEventV125(input: Parameters<typeof planRelationshipEvent>[0]): Promise<ReceizSubjectRelationshipEventPlanV125> {
  try { return await planRelationshipEvent(input); }
  catch (error) {
    if (error instanceof ReceizSubjectCoordinationZeroWriteErrorV125) throw error;
    fail(error instanceof Error ? error.message : "V125_SUBJECT_RELATIONSHIP_PLAN_INVALID");
  }
}

export type ReceizSealedSubjectRelationshipContextV125 = Readonly<{
  sourceArtifact: ReceizPortableSealedArtifactV124;
  sourceFamily?: ReceizSubjectSourceFamilyV125;
  participantSources: Readonly<Record<string, ReceizPortableSealedArtifactV124>>;
  identityArtifact: ReceizPortableSealedArtifactV124;
  expectedArtifactDigest: string;
  expectedHead: string;
  commitDomain: Parameters<typeof planReceizExactKksArtifactAppend>[0]["commitDomain"];
  kksCoordinate: unknown;
}>;

type CarriedRelationship = Readonly<{
  schema: "receiz.subject.relationship-source-append.v125";
  event: ReceizSubjectRelationshipEventV125;
  participantArtifactDigests: Readonly<Record<string, string>>;
  identityArtifactDigest: string;
  sources: readonly ReceizPortableSealedArtifactV124[];
}>;
type CarriedRelationshipReference = Omit<CarriedRelationship, "schema" | "sources"> & Readonly<{
  schema: "receiz.subject.relationship-source-reference.v125";
}>;
/** Retention and read-only accepted-source recovery, subordinate to canonical append verification. */
export interface ReceizSubjectRelationshipSourceStoreV125 extends ReceizArtifactTransitionStore {
  retainSubjectSourceFamily(family: ReceizOpenedSubjectSourceFamilyV125, successorArtifactDigest: string): Promise<void>;
  readSubjectSourceFamily(familySetDigest: string): Promise<ReceizOpenedSubjectSourceFamilyV125 | null>;
  findAcceptedSubjectTransition(plan: ReceizArtifactAppendPlan): Promise<Readonly<{
    staged: ReceizStagedArtifactTransition; familySetDigest: string;
  }> | null>;
  recoverAcceptedSubjectTransition(unit: ReceizArtifactTransitionCommitUnit): Promise<ReceizArtifactTransitionCommitResult>;
}
const sealedPlanCustody = new WeakMap<ReceizSubjectRelationshipEventPlanV125, {
  context: ReceizSealedSubjectRelationshipContextV125;
  transitionPlan: ReceizArtifactAppendPlan;
  family?: ReceizOpenedSubjectSourceFamilyV125;
}>();

function carriedRelationship(value: unknown): CarriedRelationship | CarriedRelationshipReference | null {
  if (!value || typeof value !== "object" || !("schema" in value)) return null;
  if (value.schema === "receiz.subject.relationship-source-append.v125") return value as CarriedRelationship;
  if (value.schema !== "receiz.subject.relationship-source-reference.v125") return null;
  const code = "V125_SUBJECT_RELATIONSHIP_REFERENCE_INVALID";
  const record = closedRecord(value, ["schema", "event", "participantArtifactDigests", "identityArtifactDigest"], code);
  digest(record.identityArtifactDigest, code);
  if (!record.participantArtifactDigests || typeof record.participantArtifactDigests !== "object" || Array.isArray(record.participantArtifactDigests)) fail(code);
  for (const sha of Object.values(record.participantArtifactDigests)) digest(sha, code);
  return value as CarriedRelationshipReference;
}

/** Complete enclosing sources admit additions; a detached array never grants access. */
export async function readReceizSubjectRelationshipSourceV125(input: Readonly<{
  sourceArtifact: ReceizPortableSealedArtifactV124;
  subjectA: string;
  subjectB: string;
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
  sourceFamily?: ReceizOpenedSubjectSourceFamilyV125;
}>): Promise<readonly ReceizSubjectRelationshipEventV125[]> {
  const family = input.sourceFamily;
  if (family) readReceizSubjectSourceFamilyMemberV125(family, input.sourceArtifact.artifactSha256);
  const verifyPbiAuthorship = family?.verifyPbiAuthorship ?? input.verifyPbiAuthorship;
  const seen = new Map<string, readonly ReceizSubjectRelationshipEventV125[]>();
  const exactSources = new Map<string, string>();
  const temporalSources = new Map<string, ReturnType<typeof readReceizTemporalSubjectSourceV125>>();
  const active = new Set<string>();
  function exact(artifact: ReceizPortableSealedArtifactV124) {
    const bytes = canonicalizeReceizV122(artifact);
    const prior = exactSources.get(artifact.artifactSha256);
    if (prior !== undefined && prior !== bytes) fail("V125_SUBJECT_SOURCE_DIGEST_COLLISION");
    exactSources.set(artifact.artifactSha256, bytes);
  }
  function temporalSource(artifact: ReceizPortableSealedArtifactV124) {
    exact(artifact);
    let read = temporalSources.get(artifact.artifactSha256);
    if (!read) { read = readReceizTemporalSubjectSourceV125(artifact); temporalSources.set(artifact.artifactSha256, read); }
    return read;
  }
  async function visit(artifact: ReceizPortableSealedArtifactV124): Promise<readonly ReceizSubjectRelationshipEventV125[]> {
    exact(artifact);
    if (active.has(artifact.artifactSha256)) fail("V125_SUBJECT_SOURCE_CYCLE");
    const prior = seen.get(artifact.artifactSha256);
    if (prior) return prior;
    active.add(artifact.artifactSha256);
    const source = await readReceizSubjectSourceV124(artifact);
    const events = new Map<string, ReceizSubjectRelationshipEventV125>();
    if (source.subjectState.opaqueNamespaces.some((entry) => entry.namespace === "relationships")) {
      const embedded = await readSubjectNamespaceValue(source.subjectState, "relationships");
      if (!Array.isArray(embedded)) fail("V125_SUBJECT_SOURCE_NAMESPACE_INVALID");
      // Preserve legacy embedded bytes, but their self-hashes/PBI receipts do
      // not carry the complete actor and participant sources required here.
      if (embedded.length !== 0) fail("V125_SUBJECT_RELATIONSHIP_EMBEDDED_SOURCE_EVIDENCE_REQUIRED");
    }
    const additions = source.provenance.appends.map(carriedRelationship).filter((entry) => entry !== null);
    const available = new Map<string, ReceizPortableSealedArtifactV124>();
    if (family) for (const member of family.family.artifacts) {
      const source = readReceizSubjectSourceFamilyMemberV125(family, member.artifactSha256).artifact;
      exact(source); available.set(source.artifactSha256, source);
    }
    const temporal = additions.length ? await temporalSource(artifact) : null;
    for (const addition of additions) {
      if (addition.schema === "receiz.subject.relationship-source-reference.v125" && !family) fail("V125_SUBJECT_FAMILY_REQUIRED");
      const event = await validateRelationshipEvent(addition.event, verifyPbiAuthorship);
      const node = temporal!.admission.proofHistory!.nodes.find((candidate) => candidate.event.type === "state.append"
        && canonicalizeReceizV122(candidate.event.state) === canonicalizeReceizV122({ namespace: "provenance", event: addition }));
      const binding = node?.namespaceData.provenance as Record<string, unknown> | undefined;
      if (!node || node.parentDigests.length !== 1 || event.actorSubjectId !== source.subjectState.subjectId
        || event.actorPresence.proofObjectId !== source.subjectState.proofObjectId
        || event.subjectHeads[event.actorSubjectId] !== node.parentDigests[0]
        || event.eventKai !== (node.namespaceData["receiz.kks-v1"] as Record<string, unknown>)?.kaiUpulse
        || addition.participantArtifactDigests[event.actorSubjectId] !== binding?.predecessorArtifactDigest) {
        fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
      }
      // Only a provenance addition matched to a canonical temporal node can
      // introduce historical embedded sources. The index never admits an event.
      if (addition.schema === "receiz.subject.relationship-source-append.v125") {
        for (const carried of addition.sources) { exact(carried); available.set(carried.artifactSha256, carried); }
      }
      const identityArtifact = available.get(addition.identityArtifactDigest);
      if (!identityArtifact) fail("V125_SUBJECT_ACTOR_SOURCE_REQUIRED");
      await readRelationshipActor(identityArtifact, source.subjectState, event);
      const receiptActor = (node.receipt as { actor?: { actorId?: string } }).actor;
      if (receiptActor?.actorId !== event.actorReceizId) fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
      if (Object.keys(addition.participantArtifactDigests).sort().join() !== Object.keys(event.subjectHeads).sort().join()) {
        fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
      }
      for (const subjectId of Object.keys(event.subjectHeads)) {
        if (subjectId === event.actorSubjectId && addition.schema === "receiz.subject.relationship-source-append.v125") continue;
        const participant = available.get(addition.participantArtifactDigests[subjectId]!);
        if (!participant) fail("V125_SUBJECT_PARTICIPANT_SOURCE_REQUIRED");
        const read = await temporalSource(participant);
        if (read.source.subjectState.subjectId !== subjectId || read.head !== event.subjectHeads[subjectId]) {
          fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
        }
        if (subjectId !== event.actorSubjectId) for (const carried of await visit(participant)) events.set(carried.eventDigest, carried);
      }
      if (event.subjectA === input.subjectA && event.subjectB === input.subjectB) events.set(event.eventDigest, event);
    }
    // Causal predecessor references order the union. Conflicting descendants fail;
    // neither source order nor a wall-clock chooses a winner.
    const ordered: ReceizSubjectRelationshipEventV125[] = [];
    let head: string | null = null;
    while (events.size) {
      const next = [...events.values()].filter((event) => event.expectedPriorHead === head);
      if (next.length !== 1) fail("V125_SUBJECT_RELATIONSHIP_SOURCE_CONFLICT");
      ordered.push(next[0]!); head = next[0]!.eventDigest; events.delete(head);
    }
    if (ordered.length) await projectReceizSubjectRelationshipV125(ordered, { verifyPbiAuthorship });
    active.delete(artifact.artifactSha256); seen.set(artifact.artifactSha256, freeze(ordered));
    return ordered;
  }
  return visit(input.sourceArtifact);
}

export async function applyReceizSubjectRelationshipEventV125(input: Readonly<{
  history?: readonly ReceizSubjectRelationshipEventV125[];
  plan: ReceizSubjectRelationshipEventPlanV125;
  confirmationDigest: string;
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
  replayGuard: ReceizPbiCeremonyReplayGuardV125;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
}>): Promise<ReceizSubjectRelationshipEventApplyV125> {
  const custody = sealedPlanCustody.get(input.plan);
  if (!custody || !input.capability || !input.sealer || !input.store) fail("V125_SUBJECT_SEALED_TRANSITION_REQUIRED");
  const transitionPlan = custody.transitionPlan;
  const context = custody.context;
  const family = custody.family;
  const verifyPbiAuthorship = family?.verifyPbiAuthorship ?? input.verifyPbiAuthorship;
  const expectedPlan = await makeRelationshipPlan(await validateRelationshipEvent(input.plan.event, verifyPbiAuthorship), custody.transitionPlan, family?.family);
  if (input.plan.planIdentity !== expectedPlan.planIdentity || input.confirmationDigest !== expectedPlan.confirmationDigest) {
    fail("V125_SUBJECT_RELATIONSHIP_CONFIRMATION_INVALID");
  }
  const history = await relationshipHistoryForContext(custody.context, input.plan.event, verifyPbiAuthorship, family);
  await projectReceizSubjectRelationshipV125([...history, input.plan.event], { verifyPbiAuthorship });
  return applySealedSubjectAddition({ ...input, context, family, transitionPlan,
    consume: () => createRelationshipEvent(input.plan.event, verifyPbiAuthorship, input.replayGuard),
    async read(sourceArtifact, opened) {
      const verifier = opened?.verifyPbiAuthorship ?? verifyPbiAuthorship;
      const carriedHistory = await readReceizSubjectRelationshipSourceV125({ sourceArtifact,
        subjectA: input.plan.event.subjectA, subjectB: input.plan.event.subjectB, verifyPbiAuthorship: verifier, ...(opened ? { sourceFamily: opened } : {}) });
      const projection = await projectReceizSubjectRelationshipV125(carriedHistory, { verifyPbiAuthorship: verifier });
      if (projection.acceptedHead !== input.plan.event.eventDigest) fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
      return { history: carriedHistory, projection };
    },
    result(value, sourceArtifact, opened, committedTransition) {
      return freeze({ schema: "receiz.subject.relationship-apply.v125" as const, ...value, append: input.plan.event,
        sourceArtifact, ...(opened ? { sourceFamily: opened.family } : {}), committedTransition,
        writesPerformed: committedTransition.acceptance === "committed" ? 1 as const : 0 as const,
        authority: freeze({ applyIsIdentityAuthority: false as const, strongerTruth: "sealed-subject-proof" as const }) });
    },
  });
}

/** One canonical append/retention/recovery engine for source-carried subject additions. */
async function applySealedSubjectAddition<T, R>(input: Readonly<{
  context: Pick<ReceizSealedSubjectRelationshipContextV125, "sourceArtifact" | "identityArtifact">;
  family: ReceizOpenedSubjectSourceFamilyV125 | undefined;
  transitionPlan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
  consume: () => Promise<unknown>;
  read: (artifact: ReceizPortableSealedArtifactV124, family?: ReceizOpenedSubjectSourceFamilyV125) => Promise<T>;
  result: (value: T, artifact: ReceizPortableSealedArtifactV124, family: ReceizOpenedSubjectSourceFamilyV125 | undefined,
    transition: ReceizCommittedArtifactTransition) => R;
}>): Promise<R> {
  const { context, family, transitionPlan } = input;
  const sourceStore = input.store as ReceizSubjectRelationshipSourceStoreV125;
  if (family && [sourceStore.retainSubjectSourceFamily, sourceStore.readSubjectSourceFamily,
    sourceStore.findAcceptedSubjectTransition, sourceStore.recoverAcceptedSubjectTransition].some((method) => typeof method !== "function")) fail("V125_SUBJECT_FAMILY_RETENTION_REQUIRED");
  async function resultFrom(sourceArtifact: ReceizPortableSealedArtifactV124, opened: ReceizOpenedSubjectSourceFamilyV125 | undefined,
    staged: ReceizStagedArtifactTransition, recovery: boolean): Promise<R> {
    const value = await input.read(sourceArtifact, opened);
    const store = input.store;
    const delegate: ReceizArtifactTransitionStore = {
      commitDomain: store.commitDomain,
      stageCandidate: (value) => store.stageCandidate(value),
      resolveCandidate: (value) => store.resolveCandidate(value),
      async commitTransition(unit) {
        if (recovery) return sourceStore.recoverAcceptedSubjectTransition(unit);
        await input.consume();
        return store.commitTransition(unit);
      },
    };
    const committedTransition = await commitArtifactTransition({ plan: transitionPlan, capability: input.capability, staged, store: delegate });
    if (committedTransition.status !== "committed-artifact-transition") fail(committedTransition.code);
    return input.result(value, sourceArtifact, opened, committedTransition);
  }
  async function successorFamily(sourceArtifact: ReceizPortableSealedArtifactV124) {
    if (!family) fail("V125_SUBJECT_FAMILY_REQUIRED");
    const selections = family.family.bindings.filter((selection) => selection.subjectArtifactSha256 === context.sourceArtifact.artifactSha256
      && selection.identityArtifactSha256 === context.identityArtifact.artifactSha256);
    if (!selections.length) fail("V125_SUBJECT_FAMILY_ACTOR_SELECTION_REQUIRED");
    return openReceizSubjectSourceFamilyV125({ family: await createReceizSubjectSourceFamilyV125({
      artifacts: [...family.family.artifacts, sourceArtifact], bindings: [...family.family.bindings,
        ...selections.map((selection) => ({ ...selection, subjectArtifactSha256: sourceArtifact.artifactSha256 }))],
    }) });
  }
  async function recover(): Promise<R | null> {
    if (!family) return null;
    const accepted = await sourceStore.findAcceptedSubjectTransition(transitionPlan);
    if (!accepted) return null;
    const opened = await sourceStore.readSubjectSourceFamily(accepted.familySetDigest);
    if (!opened) fail("V125_SUBJECT_FAMILY_RETENTION_FAILED");
    const artifact = readReceizSubjectSourceFamilyMemberV125(opened, accepted.staged.reference.artifactDigest.value).artifact;
    const expected = await successorFamily(artifact);
    if (canonicalizeReceizV122(opened.family) !== canonicalizeReceizV122(expected.family)) fail("V125_SUBJECT_FAMILY_RETENTION_FAILED");
    return resultFrom(artifact, opened, accepted.staged, true);
  }
  try {
    const prior = await recover();
    if (prior) return prior;
    const candidate = await sealArtifactTransitionCandidate({ plan: transitionPlan, capability: input.capability, sealer: input.sealer });
    const sourceArtifact = await transportReceizSealedArtifactV124(candidate.artifact);
    const staged = await input.store.stageCandidate(candidate);
    let retained: ReceizOpenedSubjectSourceFamilyV125 | undefined;
    if (family) {
      const successor = await successorFamily(sourceArtifact);
      await sourceStore.retainSubjectSourceFamily(successor, sourceArtifact.artifactSha256);
      retained = await sourceStore.readSubjectSourceFamily(successor.family.familySetDigest) ?? undefined;
      if (!retained || canonicalizeReceizV122(retained.family) !== canonicalizeReceizV122(successor.family)) fail("V125_SUBJECT_FAMILY_RETENTION_FAILED");
      readReceizSubjectSourceFamilyMemberV125(retained, sourceArtifact.artifactSha256);
    }
    try { return await resultFrom(sourceArtifact, retained, staged, false); }
    catch (error) {
      const accepted = await recover();
      if (accepted) return accepted;
      throw error;
    }
  } catch (error) { fail(error instanceof Error ? error.message : "V125_SUBJECT_COMMIT_FAILED"); }
}

async function readRelationshipActor(artifact: ReceizPortableSealedArtifactV124, state: ReceizSubjectStateV122,
  event: Pick<ReceizSubjectRelationshipEventV125, "actorPresence" | "actorReceizId">) {
  const bytes = receizBase64UrlDecode(artifact.exactBytesB64u);
  const verification = await verifyReceizArtifact(new File([new Uint8Array(bytes).buffer], artifact.filename, { type: artifact.mimeType }));
  if (verification.status !== "verified-artifact" || verification.artifactDigest.value !== artifact.artifactSha256
    || verification.payloadDigest.value !== artifact.payloadSha256) fail("V125_SUBJECT_ACTOR_SOURCE_INVALID");
  const proof = event.actorPresence.approval.holderProof;
  const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: "identity",
    ownerConstraint: state.ownerReceizId, actorConstraint: event.actorReceizId, identityProof: proof,
    identityExactChallenge: new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(proof.challengeB64Url)) });
  if (admission.profile !== "identity" || admission.verdict !== "canonical-identity") fail("V125_SUBJECT_ACTOR_SOURCE_INVALID");
  return admission;
}

async function relationshipHistoryForContext(context: ReceizSealedSubjectRelationshipContextV125,
  event: ReceizSubjectRelationshipEventV125, verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125, sourceFamily?: ReceizOpenedSubjectSourceFamilyV125) {
  if (sourceFamily) for (const artifact of [context.sourceArtifact, context.identityArtifact, ...Object.values(context.participantSources)]) {
    if (canonicalizeReceizV122(readReceizSubjectSourceFamilyMemberV125(sourceFamily, artifact.artifactSha256).artifact) !== canonicalizeReceizV122(artifact)) fail("V125_SUBJECT_SOURCE_DIGEST_COLLISION");
  }
  const source = await readReceizTemporalSubjectSourceV125(context.sourceArtifact);
  await readRelationshipActor(context.identityArtifact, source.source.subjectState, event);
  if (source.source.subjectState.subjectId !== event.actorSubjectId
    || source.source.subjectState.proofObjectId !== event.actorPresence.proofObjectId
    || source.head !== event.actorPresence.acceptedHead || source.head !== context.expectedHead
    || source.source.artifactSha256 !== context.expectedArtifactDigest) fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
  if (Object.keys(context.participantSources).sort().join() !== Object.keys(event.subjectHeads).sort().join()) fail("V125_SUBJECT_PARTICIPANT_SOURCE_REQUIRED");
  const events = new Map<string, ReceizSubjectRelationshipEventV125>();
  for (const [id, artifact] of Object.entries(context.participantSources)) {
    const participant = await readReceizTemporalSubjectSourceV125(artifact);
    if (participant.source.subjectState.subjectId !== id || participant.head !== event.subjectHeads[id]
      || (id === event.actorSubjectId && artifact.artifactSha256 !== context.expectedArtifactDigest)) fail("V125_SUBJECT_RELATIONSHIP_SOURCE_BINDING_INVALID");
    const history = await readReceizSubjectRelationshipSourceV125({ sourceArtifact: artifact, subjectA: event.subjectA, subjectB: event.subjectB, verifyPbiAuthorship, ...(sourceFamily ? { sourceFamily } : {}) });
    for (const addition of history) events.set(addition.eventDigest, addition);
  }
  const result: ReceizSubjectRelationshipEventV125[] = [];
  let head: string | null = null;
  while (events.size) {
    const next = [...events.values()].filter((addition) => addition.expectedPriorHead === head);
    if (next.length !== 1) fail("V125_SUBJECT_RELATIONSHIP_SOURCE_CONFLICT");
    result.push(next[0]!); head = next[0]!.eventDigest; events.delete(head);
  }
  return result;
}

function presenceAuthority() {
  return freeze({ presenceIsIdentityAuthority: false as const, strongerTruth: "sealed-subject-proof" as const });
}

function presenceBasis(input: Omit<ReceizSubjectPresenceV125, "schema" | "presenceHead" | "authority">) {
  const visibility = input.visibility;
  if (!["connections", "introduced", "event", "public"].includes(visibility)) fail("V125_SUBJECT_PRESENCE_VISIBILITY_INVALID");
  const coarseCell = input.coarseCell === null ? null : token(input.coarseCell, "V125_SUBJECT_PRESENCE_CELL_INVALID");
  const eventId = input.eventId === null ? null : token(input.eventId, "V125_SUBJECT_PRESENCE_EVENT_INVALID");
  if (coarseCell === null && eventId === null) fail("V125_SUBJECT_PRESENCE_SCOPE_REQUIRED");
  if (visibility === "event" && eventId === null) fail("V125_SUBJECT_PRESENCE_EVENT_REQUIRED");
  const issuedKai = kai(input.issuedKai, "V125_SUBJECT_PRESENCE_KAI_INVALID");
  const expiresAtKai = kai(input.expiresAtKai, "V125_SUBJECT_PRESENCE_KAI_INVALID");
  if (BigInt(expiresAtKai) <= BigInt(issuedKai)) fail("V125_SUBJECT_PRESENCE_EXPIRY_INVALID");
  return freeze({
    subjectId: token(input.subjectId, "V125_SUBJECT_PRESENCE_SUBJECT_INVALID"),
    subjectHead: digest(input.subjectHead, "V125_SUBJECT_PRESENCE_SUBJECT_HEAD_INVALID"),
    visibility,
    coarseCell,
    eventId,
    issuedKai,
    expiresAtKai,
    expectedPriorHead: nullableDigest(input.expectedPriorHead, "V125_SUBJECT_PRESENCE_PRIOR_HEAD_INVALID"),
  });
}

export async function createReceizSubjectPresenceV125(
  input: Omit<ReceizSubjectPresenceV125, "schema" | "presenceHead" | "authority">,
): Promise<ReceizSubjectPresenceV125> {
  const exactKeys = ["subjectId", "subjectHead", "visibility", "coarseCell", "eventId", "issuedKai", "expiresAtKai", "expectedPriorHead"].sort();
  if (Object.keys(input).sort().join("\0") !== exactKeys.join("\0")) fail("V125_SUBJECT_PRESENCE_INPUT_INVALID");
  const basis = presenceBasis(input);
  return freeze({
    schema: "receiz.subject.presence.v125" as const,
    ...basis,
    presenceHead: await digestReceizAuthority("event", "receiz.subject.presence.v125", basis),
    authority: presenceAuthority(),
  });
}

export type ReceizSubjectPresenceEventKindV125 = "presence_opted_in" | "presence_renewed" | "presence_revoked";
export type ReceizSubjectPresenceEventInputV125 = Readonly<{
  kind: ReceizSubjectPresenceEventKindV125;
  subjectId: string;
  subjectHead: string;
  actorReceizId: string;
  presence: ReceizSubjectPresenceV125 | null;
  expectedPriorHead: string | null;
  consentDigest: string;
  eventKai: string;
  idempotencyKey: string;
  actorPresence: ReceizPbiCeremonyReceiptV125;
}>;
export type ReceizSubjectPresenceEventV125 = ReceizSubjectPresenceEventInputV125 & Readonly<{
  schema: "receiz.subject.presence-event.v125";
  eventDigest: string;
  authority: ReturnType<typeof relationshipAuthority>;
}>;
export type ReceizSealedSubjectPresenceContextV125 = Omit<ReceizSealedSubjectRelationshipContextV125, "participantSources" | "sourceFamily"> & Readonly<{
  sourceFamily: ReceizSubjectSourceFamilyV125;
}>;
export type ReceizSubjectPresenceProjectionV125 = Readonly<{
  schema: "receiz.subject.presence-projection.v125";
  subjectId: string;
  sourceHead: string;
  selectedKai: string;
  status: "none" | "current" | "expired" | "not-yet-current" | "revoked";
  presence: ReceizSubjectPresenceV125 | null;
  acceptedHead: string | null;
  history: readonly ReceizSubjectPresenceEventV125[];
  authority: ReturnType<typeof presenceAuthority>;
}>;
export type ReceizSubjectPresenceEventPlanV125 = Readonly<{
  schema: "receiz.subject.presence-plan.v125";
  event: ReceizSubjectPresenceEventV125;
  transitionPlan: ReceizArtifactAppendPlan;
  planIdentity: string;
  confirmationDigest: string;
  confirmationRequired: true;
  writesPerformed: 0;
  authority: Readonly<{ planIsAdmission: false; strongerTruth: "sealed-subject-proof" }>;
}>;
export type ReceizSubjectPresenceEventApplyV125 = Readonly<{
  schema: "receiz.subject.presence-apply.v125";
  append: ReceizSubjectPresenceEventV125;
  projection: ReceizSubjectPresenceProjectionV125;
  sourceArtifact: ReceizPortableSealedArtifactV124;
  sourceFamily: ReceizSubjectSourceFamilyV125;
  committedTransition: ReceizCommittedArtifactTransition;
  writesPerformed: 0 | 1;
  authority: Readonly<{ applyIsIdentityAuthority: false; strongerTruth: "sealed-subject-proof" }>;
}>;
type CarriedPresence = Readonly<{
  schema: "receiz.subject.presence-source-reference.v125";
  event: ReceizSubjectPresenceEventV125;
  predecessorArtifactDigest: string;
  identityArtifactDigest: string;
}>;
const presencePlanCustody = new WeakMap<ReceizSubjectPresenceEventPlanV125, {
  context: ReceizSealedSubjectPresenceContextV125;
  family: ReceizOpenedSubjectSourceFamilyV125;
}>();

async function validatePresenceDeclaration(presence: ReceizSubjectPresenceV125) {
  const record = closedRecord(presence, ["schema", "subjectId", "subjectHead", "visibility", "coarseCell", "eventId", "issuedKai", "expiresAtKai", "expectedPriorHead", "presenceHead", "authority"], "V125_SUBJECT_PRESENCE_INPUT_INVALID");
  const { schema: _schema, presenceHead: _head, authority: _authority, ...input } = presence;
  const expected = await createReceizSubjectPresenceV125(input);
  if (record.schema !== expected.schema || canonicalizeReceizV122(expected) !== canonicalizeReceizV122(presence)) fail("V125_SUBJECT_PRESENCE_INVALID");
  return expected;
}
function presenceEventBasis(input: Omit<ReceizSubjectPresenceEventInputV125, "actorPresence">) {
  closedRecord(input, ["kind", "subjectId", "subjectHead", "actorReceizId", "presence", "expectedPriorHead", "consentDigest", "eventKai", "idempotencyKey"], "V125_SUBJECT_PRESENCE_EVENT_INVALID");
  if (!["presence_opted_in", "presence_renewed", "presence_revoked"].includes(input.kind)) fail("V125_SUBJECT_PRESENCE_EVENT_INVALID");
  if ((input.kind === "presence_revoked") !== (input.presence === null)) fail("V125_SUBJECT_PRESENCE_EVENT_INVALID");
  return freeze({ kind: input.kind, subjectId: token(input.subjectId, "V125_SUBJECT_PRESENCE_SUBJECT_INVALID"),
    subjectHead: digest(input.subjectHead, "V125_SUBJECT_PRESENCE_SUBJECT_HEAD_INVALID"),
    actorReceizId: token(input.actorReceizId, "V125_SUBJECT_PRESENCE_ACTOR_INVALID"), presence: input.presence,
    expectedPriorHead: nullableDigest(input.expectedPriorHead, "V125_SUBJECT_PRESENCE_PRIOR_HEAD_INVALID"),
    consentDigest: digest(input.consentDigest, "V125_SUBJECT_PRESENCE_CONSENT_INVALID"), eventKai: kai(input.eventKai, "V125_SUBJECT_PRESENCE_KAI_INVALID"),
    idempotencyKey: token(input.idempotencyKey, "V125_SUBJECT_PRESENCE_IDEMPOTENCY_INVALID") });
}
export async function createReceizSubjectPresenceEventBindingDigestV125(input: Omit<ReceizSubjectPresenceEventInputV125, "actorPresence">): Promise<string> {
  const basis = presenceEventBasis(structuredClone(input));
  if (basis.presence) await validatePresenceDeclaration(basis.presence);
  return digestReceizAuthority("event", "receiz.subject.presence-binding.v125", basis);
}
async function createPresenceEvent(input: ReceizSubjectPresenceEventInputV125, verifier: ReceizPbiAuthorshipVerifierV125,
  replayGuard?: ReceizPbiCeremonyReplayGuardV125): Promise<ReceizSubjectPresenceEventV125> {
  closedRecord(input, ["kind", "subjectId", "subjectHead", "actorReceizId", "presence", "expectedPriorHead", "consentDigest", "eventKai", "idempotencyKey", "actorPresence"], "V125_SUBJECT_PRESENCE_EVENT_INVALID");
  const { actorPresence, ...unsigned } = input;
  const basis = presenceEventBasis(unsigned);
  if (basis.presence) {
    await validatePresenceDeclaration(basis.presence);
    if (basis.presence.subjectId !== basis.subjectId || basis.presence.subjectHead !== basis.subjectHead
      || basis.presence.expectedPriorHead !== basis.expectedPriorHead || basis.presence.issuedKai !== basis.eventKai) fail("V125_SUBJECT_PRESENCE_SOURCE_BINDING_INVALID");
    if (basis.presence.visibility === "event") fail("V125_SUBJECT_PRESENCE_EVENT_MEMBERSHIP_UNAVAILABLE");
  }
  const binding = await createReceizSubjectPresenceEventBindingDigestV125(basis);
  if (actorPresence.holderReceizId !== basis.actorReceizId || actorPresence.acceptedHead !== basis.subjectHead
    || actorPresence.presentationDigest !== binding || actorPresence.consentDigest !== basis.consentDigest
    || actorPresence.disclosureDigest !== basis.consentDigest) fail("V125_SUBJECT_PRESENCE_CONSENT_INVALID");
  const verified = await verifyReceizPbiCeremonyReceiptV125({ receipt: actorPresence, selectedKai: basis.eventKai,
    verifyPbiAuthorship: verifier, ...(replayGuard ? { replayGuard } : {}) });
  if (!verified.valid) fail(`V125_SUBJECT_PRESENCE_AUTHORSHIP_${verified.code.toUpperCase()}`);
  return freeze({ schema: "receiz.subject.presence-event.v125" as const, ...basis, actorPresence,
    eventDigest: await digestReceizAuthority("event", "receiz.subject.presence-event.v125", { ...basis, actorPresence }),
    authority: relationshipAuthority() });
}
async function validatePresenceEvent(event: ReceizSubjectPresenceEventV125, verifier: ReceizPbiAuthorshipVerifierV125) {
  closedRecord(event, ["schema", "kind", "subjectId", "subjectHead", "actorReceizId", "presence", "expectedPriorHead", "consentDigest", "eventKai", "idempotencyKey", "actorPresence", "eventDigest", "authority"], "V125_SUBJECT_PRESENCE_EVENT_INVALID");
  const { schema: _schema, eventDigest: _digest, authority: _authority, ...input } = event;
  const expected = await createPresenceEvent(input, verifier);
  if (canonicalizeReceizV122(event) !== canonicalizeReceizV122(expected)) fail("V125_SUBJECT_PRESENCE_EVENT_INVALID");
  return expected;
}
function carriedPresence(value: unknown): CarriedPresence | null {
  if (!value || typeof value !== "object" || !("schema" in value) || value.schema !== "receiz.subject.presence-source-reference.v125") return null;
  const record = closedRecord(value, ["schema", "event", "predecessorArtifactDigest", "identityArtifactDigest"], "V125_SUBJECT_PRESENCE_REFERENCE_INVALID");
  digest(record.predecessorArtifactDigest, "V125_SUBJECT_PRESENCE_REFERENCE_INVALID");
  digest(record.identityArtifactDigest, "V125_SUBJECT_PRESENCE_REFERENCE_INVALID");
  return value as CarriedPresence;
}
function reducePresence(initial: ReceizSubjectPresenceV125 | null, history: readonly ReceizSubjectPresenceEventV125[], selectedKai: string) {
  let presence = initial;
  let acceptedHead = initial?.presenceHead ?? null;
  let revoked = false;
  const seen = new Set<string>();
  for (const event of history) {
    if (event.expectedPriorHead !== acceptedHead || seen.has(event.idempotencyKey)) fail("V125_SUBJECT_PRESENCE_STALE_OR_REPLAYED");
    const active = presence !== null && !revoked && BigInt(event.eventKai) >= BigInt(presence.issuedKai) && BigInt(event.eventKai) < BigInt(presence.expiresAtKai);
    if ((event.kind === "presence_opted_in" && active) || (event.kind === "presence_renewed" && !active)
      || (event.kind === "presence_revoked" && (!presence || revoked))) fail("V125_SUBJECT_PRESENCE_TRANSITION_INVALID");
    seen.add(event.idempotencyKey);
    acceptedHead = event.eventDigest;
    revoked = event.kind === "presence_revoked";
    if (event.presence) presence = event.presence;
  }
  // Validation above covers all carried history, including additions after the query.
  presence = initial; acceptedHead = initial?.presenceHead ?? null; revoked = false;
  for (const event of history) {
    if (BigInt(event.eventKai) > BigInt(selectedKai)) continue;
    acceptedHead = event.eventDigest; revoked = event.kind === "presence_revoked";
    if (event.presence) presence = event.presence;
  }
  const status = revoked ? "revoked" as const : presence ? resolveReceizSubjectPresenceCurrentnessV125(presence, selectedKai) : "none" as const;
  if (status === "invalid") fail("V125_SUBJECT_PRESENCE_INVALID");
  return { presence, acceptedHead, status };
}
async function readPresenceHistory(sourceArtifact: ReceizPortableSealedArtifactV124, namespace: string,
  family?: ReceizOpenedSubjectSourceFamilyV125) {
  if (namespace !== "worldPosition") fail("V125_SUBJECT_PRESENCE_NAMESPACE_INVALID");
  const source = await readReceizSubjectSourceV124(sourceArtifact);
  let initial: ReceizSubjectPresenceV125 | null = null;
  if (source.subjectState.opaqueNamespaces.some((entry) => entry.namespace === namespace)) {
    const embedded = await readSubjectNamespaceValue(source.subjectState, namespace);
    if (embedded && typeof embedded === "object" && "schema" in embedded && embedded.schema === "receiz.subject.presence.v125") {
      initial = await validatePresenceDeclaration(embedded as ReceizSubjectPresenceV125);
      if (initial.subjectId !== source.subjectState.subjectId || initial.subjectHead !== source.subjectState.head) fail("V125_SUBJECT_PRESENCE_SOURCE_BINDING_INVALID");
    }
  }
  const additions = source.provenance.appends.map(carriedPresence).filter((entry) => entry !== null);
  if (family && canonicalizeReceizV122(readReceizSubjectSourceFamilyMemberV125(family, sourceArtifact.artifactSha256).artifact) !== canonicalizeReceizV122(sourceArtifact)) fail("V125_SUBJECT_SOURCE_DIGEST_COLLISION");
  if (!additions.length) {
    const temporal = family || source.provenance.appends.some(carriedRelationship) ? await readReceizTemporalSubjectSourceV125(sourceArtifact) : null;
    return { source, initial, history: [] as ReceizSubjectPresenceEventV125[], sourceHead: temporal?.head ?? source.subjectState.head };
  }
  if (!family) fail("V125_SUBJECT_FAMILY_REQUIRED");
  if (canonicalizeReceizV122(readReceizSubjectSourceFamilyMemberV125(family, sourceArtifact.artifactSha256).artifact) !== canonicalizeReceizV122(sourceArtifact)) fail("V125_SUBJECT_SOURCE_DIGEST_COLLISION");
  const temporal = await readReceizTemporalSubjectSourceV125(sourceArtifact);
  const history: ReceizSubjectPresenceEventV125[] = [];
  for (const addition of additions) {
    const event = await validatePresenceEvent(addition.event, family.verifyPbiAuthorship);
    const node = temporal.admission.proofHistory!.nodes.find((candidate) => candidate.event.type === "state.append"
      && canonicalizeReceizV122(candidate.event.state) === canonicalizeReceizV122({ namespace: "provenance", event: addition }));
    if (!node || node.parentDigests.length !== 1 || node.parentDigests[0] !== event.subjectHead
      || (node.namespaceData.provenance as Record<string, unknown>)?.predecessorArtifactDigest !== addition.predecessorArtifactDigest
      || (node.namespaceData["receiz.kks-v1"] as Record<string, unknown>)?.kaiUpulse !== event.eventKai
      || (node.receipt as { actor?: { actorId?: string } }).actor?.actorId !== event.actorReceizId
      || event.subjectId !== source.subjectState.subjectId || event.actorPresence.proofObjectId !== source.subjectState.proofObjectId) fail("V125_SUBJECT_PRESENCE_SOURCE_BINDING_INVALID");
    const predecessor = readReceizSubjectSourceFamilyMemberV125(family, addition.predecessorArtifactDigest).artifact;
    const prior = await readReceizTemporalSubjectSourceV125(predecessor);
    if (prior.head !== event.subjectHead || prior.source.subjectState.subjectId !== event.subjectId) fail("V125_SUBJECT_PRESENCE_SOURCE_BINDING_INVALID");
    const identity = readReceizSubjectSourceFamilyMemberV125(family, addition.identityArtifactDigest).artifact;
    await readRelationshipActor(identity, source.subjectState, event);
    history.push(event);
  }
  return { source, initial, history, sourceHead: temporal.head };
}
/** Authenticate the complete source before projecting the selected deterministic Kai. */
export async function projectReceizSubjectPresenceV125(input: Readonly<{
  sourceArtifact: ReceizPortableSealedArtifactV124;
  sourceFamily?: ReceizSubjectSourceFamilyV125;
  selectedKai: string;
  namespace?: string;
}>): Promise<ReceizSubjectPresenceProjectionV125> {
  const captured = structuredClone(input);
  const family = captured.sourceFamily ? await openReceizSubjectSourceFamilyV125({ family: captured.sourceFamily }) : undefined;
  kai(captured.selectedKai, "V125_SUBJECT_PRESENCE_KAI_INVALID");
  if (family && await hasKnownLaterSubjectSource(captured.sourceArtifact, captured.selectedKai, family)) fail("V125_SUBJECT_PRESENCE_SOURCE_BEHIND");
  return projectPresenceFromOpened(captured.sourceArtifact, captured.selectedKai, captured.namespace ?? "worldPosition", family);
}
async function projectPresenceFromOpened(sourceArtifact: ReceizPortableSealedArtifactV124, selectedKai: string, namespace: string,
  family?: ReceizOpenedSubjectSourceFamilyV125): Promise<ReceizSubjectPresenceProjectionV125> {
  kai(selectedKai, "V125_SUBJECT_PRESENCE_KAI_INVALID");
  const read = await readPresenceHistory(sourceArtifact, namespace, family);
  return freeze({ schema: "receiz.subject.presence-projection.v125" as const, subjectId: read.source.subjectState.subjectId,
    sourceHead: read.sourceHead, selectedKai, ...reducePresence(read.initial, read.history, selectedKai), history: read.history, authority: presenceAuthority() });
}
async function makePresencePlan(event: ReceizSubjectPresenceEventV125, transitionPlan: ReceizArtifactAppendPlan, family: ReceizSubjectSourceFamilyV125): Promise<ReceizSubjectPresenceEventPlanV125> {
  const planIdentity = await digestReceizAuthority("plan", "receiz.subject.presence-plan.v125", {
    eventDigest: event.eventDigest, transitionPlanDigest: transitionPlan.planDigest.value, sourceFamilyDigest: family.familySetDigest });
  return freeze({ schema: "receiz.subject.presence-plan.v125" as const, event, transitionPlan, planIdentity,
    confirmationDigest: await digestReceizAuthority("confirmation", "receiz.subject.presence-confirmation.v125", { planIdentity, eventDigest: event.eventDigest }),
    confirmationRequired: true as const, writesPerformed: 0 as const,
    authority: freeze({ planIsAdmission: false as const, strongerTruth: "sealed-subject-proof" as const }) });
}
export async function planReceizSubjectPresenceEventV125(input: Readonly<{
  event: ReceizSubjectPresenceEventInputV125;
  sealedSource: ReceizSealedSubjectPresenceContextV125;
}>): Promise<ReceizSubjectPresenceEventPlanV125> {
  try {
    const { event: eventInput, sealedSource: context } = structuredClone(input);
    const family = await openReceizSubjectSourceFamilyV125({ family: context.sourceFamily });
    for (const artifact of [context.sourceArtifact, context.identityArtifact]) {
      if (canonicalizeReceizV122(readReceizSubjectSourceFamilyMemberV125(family, artifact.artifactSha256).artifact) !== canonicalizeReceizV122(artifact)) fail("V125_SUBJECT_SOURCE_DIGEST_COLLISION");
    }
    if (!family.family.bindings.some((selection) => selection.subjectArtifactSha256 === context.sourceArtifact.artifactSha256
      && selection.identityArtifactSha256 === context.identityArtifact.artifactSha256)) fail("V125_SUBJECT_FAMILY_ACTOR_SELECTION_REQUIRED");
    const event = await createPresenceEvent(eventInput, family.verifyPbiAuthorship);
    const read = await readReceizTemporalSubjectSourceV125(context.sourceArtifact);
    if (read.source.subjectState.subjectId !== event.subjectId || read.source.subjectState.proofObjectId !== event.actorPresence.proofObjectId
      || context.expectedArtifactDigest !== context.sourceArtifact.artifactSha256 || context.expectedHead !== read.head
      || event.subjectHead !== read.head || (context.kksCoordinate as { kaiUpulse?: string }).kaiUpulse !== event.eventKai) fail("V125_SUBJECT_PRESENCE_SOURCE_BINDING_INVALID");
    const presence = await readPresenceHistory(context.sourceArtifact, "worldPosition", family);
    reducePresence(presence.initial, [...presence.history, event], event.eventKai);
    await bindReceizCurrentArtifactAppendRegistryAuthority({ admission: read.admission, registry: RECEIZ_CURRENT_CONSTITUTION_REGISTRY });
    const carried: CarriedPresence = { schema: "receiz.subject.presence-source-reference.v125", event,
      predecessorArtifactDigest: context.sourceArtifact.artifactSha256, identityArtifactDigest: context.identityArtifact.artifactSha256 };
    const transitionPlan = await planReceizExactKksArtifactAppend({ admission: read.admission, verifiedHistory: read.admission.proofHistory,
      verifiedActorEvidence: await readRelationshipActor(context.identityArtifact, read.source.subjectState, event), commitDomain: context.commitDomain,
      namespace: { scheme: "receiz-namespace.v1", value: "provenance" }, event: carried as unknown as ReceizConstitutionJson,
      expectedHead: { algorithm: "sha-256", binds: "verified-proof-history", value: context.expectedHead },
      idempotencyKey: event.idempotencyKey, kksCoordinate: context.kksCoordinate });
    if (transitionPlan.actor.actorId !== event.actorReceizId) fail("V125_SUBJECT_PRESENCE_ACTOR_INVALID");
    const plan = await makePresencePlan(event, transitionPlan, family.family);
    presencePlanCustody.set(plan, { context, family });
    return plan;
  } catch (error) { fail(error instanceof Error ? error.message : "V125_SUBJECT_PRESENCE_PLAN_INVALID"); }
}
export async function applyReceizSubjectPresenceEventV125(input: Readonly<{
  plan: ReceizSubjectPresenceEventPlanV125;
  confirmationDigest: string;
  replayGuard: ReceizPbiCeremonyReplayGuardV125;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
}>): Promise<ReceizSubjectPresenceEventApplyV125> {
  input = { ...input };
  const custody = presencePlanCustody.get(input.plan);
  if (!custody || !input.capability || !input.sealer || !input.store || !input.replayGuard) fail("V125_SUBJECT_SEALED_TRANSITION_REQUIRED");
  const { context, family } = custody;
  const event = await validatePresenceEvent(input.plan.event, family.verifyPbiAuthorship);
  const expected = await makePresencePlan(event, input.plan.transitionPlan, family.family);
  if (input.confirmationDigest !== expected.confirmationDigest || input.plan.planIdentity !== expected.planIdentity) fail("V125_SUBJECT_PRESENCE_CONFIRMATION_INVALID");
  return applySealedSubjectAddition({ ...input, context, family, transitionPlan: input.plan.transitionPlan,
    consume: () => {
      const { schema: _schema, eventDigest: _digest, authority: _authority, ...material } = event;
      return createPresenceEvent(material, family.verifyPbiAuthorship, input.replayGuard);
    },
    async read(sourceArtifact, opened) {
      const projection = await projectPresenceFromOpened(sourceArtifact, event.eventKai, "worldPosition", opened);
      if (projection.acceptedHead !== event.eventDigest) fail("V125_SUBJECT_PRESENCE_SOURCE_BINDING_INVALID");
      return projection;
    },
    result(projection, sourceArtifact, opened, committedTransition) {
      if (!opened) fail("V125_SUBJECT_FAMILY_RETENTION_REQUIRED");
      return freeze({ schema: "receiz.subject.presence-apply.v125" as const, append: event, projection, sourceArtifact, sourceFamily: opened.family,
        committedTransition, writesPerformed: committedTransition.acceptance === "committed" ? 1 as const : 0 as const,
        authority: freeze({ applyIsIdentityAuthority: false as const, strongerTruth: "sealed-subject-proof" as const }) });
    },
  });
}

async function readSubjectNamespaceValue(state: ReceizSubjectStateV122, namespace: string): Promise<unknown> {
  const entries = state.opaqueNamespaces.filter((entry) => entry.namespace === namespace);
  if (entries.length !== 1) fail("V125_SUBJECT_SOURCE_NAMESPACE_REQUIRED");
  const bytes = receizBase64UrlDecode(entries[0]!.exactBytesB64u);
  if (await sha256ReceizBytes(bytes) !== entries[0]!.digest) fail("V125_SUBJECT_SOURCE_NAMESPACE_INVALID");
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}

async function readVerifiedPresenceSource(
  presence: ReceizSubjectPresenceV125,
  source?: ReceizSubjectNamespaceSourceV125,
): Promise<ReceizSubjectStateV122 | null> {
  try {
    if (!source) return null;
    const captured = structuredClone({ presence, source });
    const family = captured.source.sourceFamily ? await openReceizSubjectSourceFamilyV125({ family: captured.source.sourceFamily }) : undefined;
    const read = await readPresenceHistory(captured.source.sourceArtifact, captured.source.namespace, family);
    const latestKai = read.history.at(-1)?.eventKai ?? captured.presence.issuedKai;
    const projection = reducePresence(read.initial, read.history, latestKai);
    if (projection.status === "revoked" || canonicalizeReceizV122(projection.presence) !== canonicalizeReceizV122(captured.presence)) return null;
    return read.source.subjectState;
  } catch { return null; }
}

/** Verify a declaration against its exact enclosing source. Historical proof remains valid;
 * use source-derived projection at selected Kai to determine current presence. */
export async function verifyReceizSubjectPresenceV125(
  presence: ReceizSubjectPresenceV125,
  source?: ReceizSubjectNamespaceSourceV125,
): Promise<boolean> {
  return await readVerifiedPresenceSource(presence, source) !== null;
}

/** A declaration alone answers expiry only. A source-derived projection also carries revocation/currentness. */
export function resolveReceizSubjectPresenceCurrentnessV125(
  presence: ReceizSubjectPresenceV125 | ReceizSubjectPresenceProjectionV125,
  selectedKai: string,
): "current" | "expired" | "not-yet-current" | "invalid" | "none" | "revoked" {
  try {
    const selected = kai(selectedKai, "V125_SUBJECT_PRESENCE_KAI_INVALID");
    if (presence.schema === "receiz.subject.presence-projection.v125") return presence.selectedKai === selected ? presence.status : "invalid";
    if (BigInt(selected) < BigInt(presence.issuedKai)) return "not-yet-current";
    return BigInt(selected) >= BigInt(presence.expiresAtKai) ? "expired" : "current";
  } catch { return "invalid"; }
}

async function hasKnownLaterSubjectSource(source: ReceizPortableSealedArtifactV124, selectedKai: string,
  family: ReceizOpenedSubjectSourceFamilyV125): Promise<boolean> {
  const current = await readReceizTemporalSubjectSourceV125(source);
  const digests = new Set(family.family.bindings.map((binding) => binding.subjectArtifactSha256).filter((value) => value !== null));
  for (const digest of digests) {
    if (digest === source.artifactSha256) continue;
    const member = readReceizSubjectSourceFamilyMemberV125(family, digest).artifact;
    const read = await readReceizTemporalSubjectSourceV125(member);
    if (read.source.subjectState.subjectId !== current.source.subjectState.subjectId || read.admission.artifactId !== current.admission.artifactId
      || read.head === current.head) continue;
    const nodes = new Map(read.admission.proofHistory!.nodes.map((node) => [node.nodeDigest, node]));
    const ancestors = new Set<string>();
    const pending = [read.head];
    while (pending.length) {
      const head = pending.pop()!;
      if (ancestors.has(head)) continue;
      const node = nodes.get(head);
      if (!node) fail("V125_SUBJECT_PRESENCE_SOURCE_BINDING_INVALID");
      ancestors.add(head); pending.push(...node.parentDigests);
    }
    if (!ancestors.has(current.head)) continue;
    // Inspect exact authenticated nodes after A, not just the transported C's
    // terminal time. C can already carry applicable B without a separate B file.
    const descendants = new Set([current.head]);
    let advanced = true;
    while (advanced) {
      advanced = false;
      for (const node of nodes.values()) {
        if (descendants.has(node.nodeDigest) || !ancestors.has(node.nodeDigest)
          || !node.parentDigests.some((parent) => descendants.has(parent))) continue;
        descendants.add(node.nodeDigest); advanced = true;
        const coordinate = await readReceizProofHistoryExactKksCoordinate(node);
        if (!coordinate) fail("V125_SUBJECT_PRESENCE_KKS_REQUIRED");
        if (BigInt(coordinate.kaiUpulse) <= BigInt(selectedKai)) return true;
      }
    }
  }
  return false;
}

export async function discoverReceizSubjectsV125(input: Readonly<{
  viewerSubjectId: string;
  selectedKai: string;
  query: Readonly<{ coarseCell: string | null; eventId: string | null }>;
  candidates: readonly Readonly<{
    presence: ReceizSubjectPresenceV125;
    source?: ReceizSubjectNamespaceSourceV125;
    relationshipSource?: ReceizSubjectNamespaceSourceV125;
    relationshipHead: string;
    blocked: boolean;
    consented: boolean;
  }>[];
  verifyPbiAuthorship?: ReceizPbiAuthorshipVerifierV125;
  sourceFamily?: ReceizSubjectSourceFamilyV125;
}>): Promise<ReceizSubjectDiscoveryResultV125> {
  const { verifyPbiAuthorship: verifyPbiAuthorshipInput, ...material } = input;
  input = { ...structuredClone(material), ...(verifyPbiAuthorshipInput ? { verifyPbiAuthorship: verifyPbiAuthorshipInput } : {}) };
  let openedFamily: ReceizOpenedSubjectSourceFamilyV125 | undefined;
  let invalidFamily = false;
  if (input.sourceFamily) {
    try { openedFamily = await openReceizSubjectSourceFamilyV125({ family: input.sourceFamily }); }
    catch { invalidFamily = true; }
  }
  const viewerSubjectId = token(input.viewerSubjectId, "V125_SUBJECT_DISCOVERY_VIEWER_INVALID");
  const selectedKai = kai(input.selectedKai, "V125_SUBJECT_DISCOVERY_KAI_INVALID");
  const query = freeze({
    coarseCell: input.query.coarseCell === null ? null : token(input.query.coarseCell, "V125_SUBJECT_DISCOVERY_QUERY_INVALID"),
    eventId: input.query.eventId === null ? null : token(input.query.eventId, "V125_SUBJECT_DISCOVERY_QUERY_INVALID"),
  });
  if (query.coarseCell === null && query.eventId === null) fail("V125_SUBJECT_DISCOVERY_QUERY_INVALID");
  const subjects: Array<{ subjectId: string; subjectHead: string; presenceHead: string; relationshipHead: string | null }> = [];
  for (const candidate of input.candidates) {
    if (invalidFamily || candidate.blocked || !candidate.consented || !candidate.source) continue;
    let family = openedFamily;
    let projected: ReceizSubjectPresenceProjectionV125;
    let subjectState: ReceizSubjectStateV122;
    try {
      if (candidate.source.sourceFamily) {
        const nested = await openReceizSubjectSourceFamilyV125({ family: candidate.source.sourceFamily });
        family = family ? await openReceizSubjectSourceFamilyV125({ family: await createReceizSubjectSourceFamilyV125({
          artifacts: [...family.family.artifacts, ...nested.family.artifacts], bindings: [...family.family.bindings, ...nested.family.bindings],
        }) }) : nested;
      }
      if (family && await hasKnownLaterSubjectSource(candidate.source.sourceArtifact, selectedKai, family)) continue;
      projected = await projectPresenceFromOpened(candidate.source.sourceArtifact, selectedKai, candidate.source.namespace, family);
      subjectState = (await readReceizSubjectSourceV124(candidate.source.sourceArtifact)).subjectState;
    } catch { continue; }
    const presence = projected.presence;
    if (!presence || projected.status !== "current") continue;
    const verifyPbiAuthorship = family?.verifyPbiAuthorship ?? input.verifyPbiAuthorship;
    // Flags can withhold a projection; they can never grant non-public access.
    // Event membership requires its own carried evidence and is not inferred
    // from knowing an event ID or having a relationship with the subject.
    if (presence.visibility === "event") continue;
    let relationshipHead: string | null = null;
    let relationshipGrantsAccess = false;
    try {
      const source = candidate.source!;
      if (candidate.relationshipSource && (candidate.relationshipSource.namespace !== "relationships"
        || candidate.relationshipSource.sourceArtifact.artifactSha256 !== source.sourceArtifact.artifactSha256)) continue;
      if (subjectState.opaqueNamespaces.some((entry) => entry.namespace === "relationships")
        || (await readReceizSubjectSourceV124(source.sourceArtifact)).provenance.appends.some((entry) => carriedRelationship(entry))) {
        if (!verifyPbiAuthorship) continue;
        const events = await readReceizSubjectRelationshipSourceV125({ sourceArtifact: source.sourceArtifact,
          subjectA: presence.subjectId, subjectB: viewerSubjectId, verifyPbiAuthorship, ...(family ? { sourceFamily: family } : {}) });
        const reversed = events.length ? events : await readReceizSubjectRelationshipSourceV125({ sourceArtifact: source.sourceArtifact,
          subjectA: viewerSubjectId, subjectB: presence.subjectId, verifyPbiAuthorship, ...(family ? { sourceFamily: family } : {}) });
        const relationshipEvents = reversed.filter((event) => BigInt(event.eventKai) <= BigInt(selectedKai));
        const relationship = relationshipEvents.length ? await projectReceizSubjectRelationshipV125(relationshipEvents, { verifyPbiAuthorship }) : null;
        if (!relationship && presence.visibility !== "public") continue;
        if (relationship && [relationship.subjectA, relationship.subjectB].includes(viewerSubjectId)
          && [relationship.subjectA, relationship.subjectB].includes(presence.subjectId)) {
          if (relationship.status === "blocked" || (relationship.latestKai !== null
            && BigInt(relationship.latestKai) > BigInt(selectedKai))) continue;
          relationshipHead = relationship.acceptedHead;
          relationshipGrantsAccess = relationship.status === "connected"
            && relationshipHead === candidate.relationshipHead;
          if (presence.visibility === "introduced") {
            const request = [...relationshipEvents].reverse().find((event) =>
              event.kind === "relationship_requested" || event.kind === "introduction_requested");
            relationshipGrantsAccess = relationshipGrantsAccess && request?.kind === "introduction_requested";
          }
        }
      }
    } catch { continue; }
    if (presence.visibility !== "public" && !relationshipGrantsAccess) continue;
    if (query.coarseCell !== null && presence.coarseCell !== query.coarseCell) continue;
    if (query.eventId !== null && presence.eventId !== query.eventId) continue;
    subjects.push({
      subjectId: presence.subjectId,
      subjectHead: projected.sourceHead,
      presenceHead: projected.acceptedHead ?? presence.presenceHead,
      relationshipHead,
    });
  }
  subjects.sort((left, right) => left.subjectId.localeCompare(right.subjectId));
  const basis = freeze({ viewerSubjectId, selectedKai, query, subjects: freeze(subjects.map((entry) => freeze(entry))) });
  return freeze({
    schema: "receiz.subject.discovery-result.v125" as const,
    ...basis,
    resultDigest: await digestReceizAuthority("state", "receiz.subject.discovery-result.v125", basis),
    authority: freeze({ discoveryProjectionIsAuthority: false as const, strongerTruth: "sealed-subject-proof" as const }),
  });
}
