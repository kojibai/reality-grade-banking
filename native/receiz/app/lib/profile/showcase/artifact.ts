import {
  admitReceizProfileShowcaseTransitionSuccessor,
  assertReceizArtifactAppendPlanCustody,
  canonicalizeReceizConstitution,
  commitArtifactTransition,
  createReceizArtifactAdmissionEngine,
  isSdkIssuedReceizArtifactAdmission,
  readReceizArtifactAppendPlannedEvent,
  readReceizProfileShowcaseGenesisBody,
  rederiveReceizProfileShowcaseCarrierFromAdmission,
  sealArtifactTransitionCandidate,
  sealReceizProfileShowcaseGenesis,
  verifyReceizArtifact,
  verifyReceizArtifactForReconciliation,
  verifyReceizProofHistory,
  type ReceizArtifactAppendPlan,
  type ReceizArtifactInput,
  type ReceizArtifactTransitionSealer,
  type ReceizSealedArtifact,
  type ReceizVerifiedArtifact,
  type ReceizVerifiedArtifactAdmission,
  type ReceizVerifiedCapability,
  type ReceizVerifiedIdentityArtifactAdmission,
  type ReceizVerifiedProofHistory,
  type ReceizArtifactTransitionStore,
  type ReceizProfileShowcaseGenesisPlan,
} from "../../../../packages/receiz-sdk/src/index";
import {
  assertProfileShowcaseGenesisPayloadV1,
  assertProfileShowcasePayloadV1,
  assertProfileShowcaseSealedPayloadV1,
} from "./canonical";
import {
  createEmptyProfileShowcaseFoldState,
  canonicalProfileShowcaseOperations,
  foldProfileShowcaseOperations,
} from "./operations";
import {
  deriveProfileShowcaseFirstPaintWindow,
  verifyProfileShowcaseFirstPaintWindow,
} from "./firstPaintWindow";
import {
  PROFILE_SHOWCASE_AUTHORITY,
  type ProfileShowcaseArtifactId,
  type ProfileShowcaseOperationV1,
  type ProfileShowcasePayloadV1,
  type ProfileShowcaseFoldState,
} from "./types";

export type ProfileShowcaseSealer = (input: Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  payloadBytes: Uint8Array;
  predecessor: ReceizVerifiedArtifactAdmission | null;
}>) => Promise<ReceizSealedArtifact>;

export type ProfileShowcaseTransitionAuthority = Readonly<{
  verifiedActorEvidence: ReceizVerifiedIdentityArtifactAdmission;
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
}>;

export type ProfileShowcaseGenesisAuthority = Readonly<{
  verifiedActorEvidence: ReceizVerifiedIdentityArtifactAdmission;
  plan: ReceizProfileShowcaseGenesisPlan;
  capability: ReceizVerifiedCapability;
  sealer: ProfileShowcaseSealer;
}>;

export type VerifiedProfileShowcase = Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  artifactDigest: string;
  admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>;
  history: ReceizVerifiedProofHistory;
  reconciliation: ReceizVerifiedArtifact;
  payload: ProfileShowcasePayloadV1;
  foldState: ProfileShowcaseFoldState;
  admittedChildren: readonly ReceizVerifiedArtifactAdmission[];
  acceptedHead: string | null;
  coordination: Readonly<{
    status: "unknown" | "unaccepted" | "committed";
    coordinationStatusIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  authority: typeof PROFILE_SHOWCASE_AUTHORITY;
}>;

const verifiedShowcaseCustody = new WeakSet<object>();

function fail(code: string): never {
  throw new TypeError(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return canonicalizeReceizConstitution(left) === canonicalizeReceizConstitution(right);
}

export function isRuntimeCustodiedVerifiedProfileShowcase(
  value: unknown,
): value is VerifiedProfileShowcase {
  return Boolean(value && typeof value === "object" && verifiedShowcaseCustody.has(value as object));
}

function childVersion(admission: ReceizVerifiedArtifactAdmission): string {
  const state = admission.recoveredState;
  for (const key of ["immutableVersion", "artifactVersion", "version"]) {
    if (typeof state[key] === "string" && state[key].length > 0) return state[key];
  }
  return admission.payloadSha256;
}

async function verifyAdmittedChildren(
  admittedChildren: readonly ReceizVerifiedArtifactAdmission[],
): Promise<readonly ReceizVerifiedArtifactAdmission[]> {
  if (!Array.isArray(admittedChildren)) fail("PROFILE_SHOWCASE_CHILD_NOT_VERIFIED");
  if (admittedChildren.some((candidate) =>
    !isSdkIssuedReceizArtifactAdmission(candidate))) {
    fail("PROFILE_SHOWCASE_CHILD_NOT_VERIFIED");
  }
  return Object.freeze([...admittedChildren]);
}

export async function verifyProfileShowcaseChildClosure(input: Readonly<{
  sealedPredecessor: ProfileShowcasePayloadV1 | null;
  inheritedChildren: readonly ReceizVerifiedArtifactAdmission[];
  admittedChildren: readonly ReceizVerifiedArtifactAdmission[];
  operations: readonly ProfileShowcaseOperationV1[];
  resultingEvidenceRoots: readonly string[];
}>): Promise<readonly ReceizVerifiedArtifactAdmission[]> {
  if (input.sealedPredecessor !== null) {
    assertProfileShowcaseSealedPayloadV1(input.sealedPredecessor);
  }
  const sealedEvidenceRoots = input.sealedPredecessor === null
    ? []
    : [...input.sealedPredecessor.proofHistoryEvidenceRoots];
  if (new Set(sealedEvidenceRoots).size !== sealedEvidenceRoots.length) {
    fail("PROFILE_SHOWCASE_CHILD_EVIDENCE_SET_MISMATCH");
  }
  const inherited = await verifyAdmittedChildren(input.inheritedChildren);
  const supplied = await verifyAdmittedChildren(input.admittedChildren);
  const byIdentity = new Map<string, ReceizVerifiedArtifactAdmission>();
  for (const admission of [...inherited, ...supplied]) {
    const existing = byIdentity.get(admission.artifactId);
    if (existing && (existing.artifactSha256 !== admission.artifactSha256
      || existing.payloadSha256 !== admission.payloadSha256)) {
      fail("PROFILE_SHOWCASE_CHILD_BINDING_MISMATCH");
    }
    if (!existing) byIdentity.set(admission.artifactId, admission);
  }
  const sealedRootSet = new Set(sealedEvidenceRoots);
  type SealedChildReference = Readonly<{
    stableChildArtifactId: string;
    immutableVersion: string;
    childArtifactDigest: string;
    admissionEvidenceRoot: string;
    contentDigest: string;
  }>;
  const childBindingKey = (child: Readonly<{
    stableChildArtifactId: string;
    immutableVersion: string;
  }>) => `${child.stableChildArtifactId}\u0000${child.immutableVersion}`;
  const sealedChildBindings = new Map<string, SealedChildReference>();
  if (input.sealedPredecessor !== null) {
    const retainSealedChild = (child: SealedChildReference) => {
      if (!sealedRootSet.has(child.admissionEvidenceRoot)) {
        fail("PROFILE_SHOWCASE_CHILD_EVIDENCE_SET_MISMATCH");
      }
      const key = childBindingKey(child);
      const existing = sealedChildBindings.get(key);
      if (existing && !canonicalEqual(existing, child)) {
        fail("PROFILE_SHOWCASE_CHILD_BINDING_MISMATCH");
      }
      sealedChildBindings.set(key, child);
    };
    for (const operation of input.sealedPredecessor.directOperations) {
      if (operation.kind === "showcase.append") retainSealedChild(operation.child);
      if (operation.kind === "showcase.merge") {
        for (const child of operation.mergedChildren) retainSealedChild(child);
      }
    }
  }
  const runtimeByBinding = new Map<string, ReceizVerifiedArtifactAdmission>();
  for (const admission of byIdentity.values()) {
    runtimeByBinding.set(
      childBindingKey({
        stableChildArtifactId: admission.artifactId,
        immutableVersion: childVersion(admission),
      }),
      admission,
    );
  }
  const referenced = new Set<string>();
  const assertChild = (child: Readonly<{
    stableChildArtifactId: string;
    immutableVersion: string;
    childArtifactDigest: string;
    admissionEvidenceRoot?: string;
    contentDigest?: string;
  }>) => {
    const key = childBindingKey(child);
    const admission = runtimeByBinding.get(key);
    if (admission) {
      if (child.childArtifactDigest !== admission.artifactSha256
        || (child.contentDigest !== undefined
          && child.contentDigest !== admission.payloadSha256)) {
        fail("PROFILE_SHOWCASE_CHILD_BINDING_MISMATCH");
      }
      referenced.add(key);
      return;
    }
    const sealed = sealedChildBindings.get(key);
    if (!sealed
      || child.childArtifactDigest !== sealed.childArtifactDigest
      || (child.admissionEvidenceRoot !== undefined
        && child.admissionEvidenceRoot !== sealed.admissionEvidenceRoot)
      || (child.contentDigest !== undefined
        && child.contentDigest !== sealed.contentDigest)) {
      fail("PROFILE_SHOWCASE_CHILD_BINDING_MISMATCH");
    }
  };
  for (const operation of input.operations) {
    if (operation.kind === "showcase.append") assertChild(operation.child);
    else if (operation.kind === "showcase.merge") {
      for (const child of operation.mergedChildren) assertChild(child);
    } else {
      assertChild(operation.child);
      if (operation.kind === "showcase.order.supersede"
        && operation.afterChild !== null) assertChild(operation.afterChild);
    }
  }
  const inheritedBindings = new Set(inherited.map((child) => childBindingKey({
    stableChildArtifactId: child.artifactId,
    immutableVersion: childVersion(child),
  })));
  if (supplied.some((child) =>
    !inheritedBindings.has(childBindingKey({
      stableChildArtifactId: child.artifactId,
      immutableVersion: childVersion(child),
    })) && !referenced.has(childBindingKey({
      stableChildArtifactId: child.artifactId,
      immutableVersion: childVersion(child),
    })))) {
    fail("PROFILE_SHOWCASE_UNRELATED_CHILD_ADMISSION");
  }
  const directlySealedEvidenceRoots = input.operations.flatMap((operation) =>
    operation.kind === "showcase.append"
      ? [operation.child.admissionEvidenceRoot]
      : operation.kind === "showcase.merge"
        ? operation.mergedChildren.map((child) => child.admissionEvidenceRoot)
        : []);
  const evidenceRoots = [...new Set([
    ...sealedEvidenceRoots,
    ...directlySealedEvidenceRoots,
  ])].sort();
  const resultingEvidenceRoots = [...input.resultingEvidenceRoots].sort();
  if (new Set(resultingEvidenceRoots).size !== resultingEvidenceRoots.length
    || !canonicalEqual(evidenceRoots, resultingEvidenceRoots)) {
    fail("PROFILE_SHOWCASE_CHILD_EVIDENCE_SET_MISMATCH");
  }
  return Object.freeze([...byIdentity.values()]);
}

async function verifiedShowcaseFromAdmission(
  admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>,
  admittedChildren: readonly ReceizVerifiedArtifactAdmission[] = [],
  foldState: ProfileShowcaseFoldState = createEmptyProfileShowcaseFoldState(),
  coordination: VerifiedProfileShowcase["coordination"] = Object.freeze({
    status: "unknown",
    coordinationStatusIsProofAuthority: false,
    strongerTruth: "sealed-receiz-proof-object",
  }),
  boundedPayloadProjection: ProfileShowcasePayloadV1 | null = null,
  boundedHistoryProjection: ReceizVerifiedProofHistory | null = null,
): Promise<VerifiedProfileShowcase> {
  if (admission.proofHistory === null && admission.proofHistoryHead === null) {
    fail("PROFILE_SHOWCASE_ARTIFACT_NOT_VERIFIED");
  }
  const payload = boundedPayloadProjection ?? (
    await rederiveReceizProfileShowcaseCarrierFromAdmission(admission)
  )["profile-showcase"];
  assertProfileShowcaseSealedPayloadV1(payload);
  if (!await verifyProfileShowcaseFirstPaintWindow(payload.firstPaintWindow, {
    foldState,
    payload,
  })) {
    fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_MISMATCH");
  }
  if (payload.artifactId !== admission.artifactId
    || payload.ownerReceizIdentity !== admission.ownerReceizId) {
    fail("PROFILE_SHOWCASE_IDENTITY_MISMATCH");
  }
  const history = boundedHistoryProjection
    ?? (admission.proofHistory
    ? await verifyReceizProofHistory(admission.proofHistory)
    : fail("PROFILE_SHOWCASE_BOUNDED_HISTORY_PROJECTION_REQUIRED"));
  const reconciliation = await verifyReceizArtifactForReconciliation({
    sealedArtifact: admission.openedArtifact.sealedArtifact.artifact,
    admission,
  });
  const verified = Object.freeze({
    artifactId: admission.artifactId as ProfileShowcaseArtifactId,
    artifactDigest: admission.artifactSha256,
    admission,
    history,
    reconciliation,
    payload,
    foldState: structuredClone(foldState),
    admittedChildren: Object.freeze([...admittedChildren]),
    acceptedHead: coordination.status === "committed" ? history.headDigests[0]! : null,
    coordination,
    authority: PROFILE_SHOWCASE_AUTHORITY,
  });
  verifiedShowcaseCustody.add(verified);
  return verified;
}

export async function openVerifiedProfileShowcase(
  input: ReceizArtifactInput,
): Promise<VerifiedProfileShowcase> {
  try {
    const verification = await verifyReceizArtifact(input);
    const admission = await createReceizArtifactAdmissionEngine()(
      verification,
      { profile: "profile-showcase" },
    );
    if (
      !isSdkIssuedReceizArtifactAdmission(admission)
      || admission.profile !== "profile-showcase"
      || admission.verdict !== "bearer-recovery"
    ) {
      fail("PROFILE_SHOWCASE_ARTIFACT_NOT_VERIFIED");
    }
    return await restoreVerifiedProfileShowcaseFromAdmission({
      admission,
      predecessor: null,
      admittedChildren: [],
    });
  } catch {
    fail("PROFILE_SHOWCASE_ARTIFACT_NOT_VERIFIED");
  }
}

/**
 * Restores runtime custody only after the exact sealed predecessor and child
 * closure have been rederived. Persistence and SDK admission remain carriers
 * beneath the sealed showcase proof object.
 */
export async function restoreVerifiedProfileShowcaseFromAdmission(
  input: Readonly<{
    admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "profile-showcase" }>;
    predecessor: VerifiedProfileShowcase | null;
    admittedChildren: readonly ReceizVerifiedArtifactAdmission[];
  }>,
): Promise<VerifiedProfileShowcase> {
  const admission = input.admission;
  const carrier = await rederiveReceizProfileShowcaseCarrierFromAdmission(admission);
  const payload = carrier["profile-showcase"];
  assertProfileShowcaseSealedPayloadV1(payload);
  const predecessor = input.predecessor;
  let sealedPredecessor: ProfileShowcasePayloadV1 | null = null;
  let inheritedChildren: readonly ReceizVerifiedArtifactAdmission[] = [];
  if (predecessor === null) {
    if (payload.parentArtifactDigests.length > 0 || payload.priorOperationCount !== 0) {
      fail("PROFILE_SHOWCASE_PREDECESSOR_CLOSURE_REQUIRED");
    }
  } else {
    if (!isRuntimeCustodiedVerifiedProfileShowcase(predecessor)
      || predecessor.artifactId !== payload.artifactId
      || !payload.parentArtifactDigests.includes(predecessor.artifactDigest)
      || payload.priorOperationCount < predecessor.payload.resultingOperationCount) {
      fail("PROFILE_SHOWCASE_PREDECESSOR_CLOSURE_REQUIRED");
    }
    sealedPredecessor = predecessor.payload;
    inheritedChildren = predecessor.admittedChildren;
  }
  const children = await verifyProfileShowcaseChildClosure({
    sealedPredecessor,
    inheritedChildren,
    admittedChildren: input.admittedChildren,
    operations: payload.directOperations,
    resultingEvidenceRoots: payload.proofHistoryEvidenceRoots,
  });
  if (children.length !== payload.counts.membershipCount) {
    fail("PROFILE_SHOWCASE_CHILD_CLOSURE_COUNT_MISMATCH");
  }
  const foldState = foldProfileShowcaseOperations({
    prior: predecessor?.foldState ?? createEmptyProfileShowcaseFoldState(),
    operations: payload.directOperations,
  });
  return verifiedShowcaseFromAdmission(admission, children, foldState);
}

function plannedShowcase(plan: ReceizArtifactAppendPlan): ProfileShowcasePayloadV1 {
  const event = readReceizArtifactAppendPlannedEvent(plan);
  if (!record(event)
    || event.schema !== "receiz.profile-showcase.namespace-event.v1"
    || !record(event.resultingShowcase)) fail("PROFILE_SHOWCASE_PLAN_EVENT_MISMATCH");
  assertProfileShowcasePayloadV1(event.resultingShowcase);
  return event.resultingShowcase;
}

export async function createVerifiedProfileShowcaseGenesis(input: Readonly<{
  admittedChildren: readonly ReceizVerifiedArtifactAdmission[];
  operations: readonly ProfileShowcaseOperationV1[];
  authority: ProfileShowcaseGenesisAuthority;
}>): Promise<VerifiedProfileShowcase> {
  const suppliedChildren = await verifyAdmittedChildren(input.admittedChildren);
  if (!input.authority || typeof input.authority !== "object") {
    fail("PROFILE_SHOWCASE_GENESIS_AUTHORITY_REQUIRED");
  }
  const actor = input.authority.verifiedActorEvidence;
  const planned = readReceizProfileShowcaseGenesisBody(input.authority.plan);
  assertProfileShowcaseGenesisPayloadV1(planned, {
    artifactId: input.authority.plan.resource,
    ownerReceizIdentity: input.authority.plan.ownerReceizIdentity,
    profileIdentity: actor.actor.actorId,
    actorEvidenceRoot: actor.actor.evidenceDigest.value,
    genesisKaiUpulse: input.authority.plan.genesisKaiUpulse,
  });
  const operations = canonicalProfileShowcaseOperations(input.operations);
  if (planned.artifactId !== input.authority.plan.resource
    || planned.ownerReceizIdentity !== input.authority.plan.ownerReceizIdentity
    || planned.profileIdentity !== actor.actor.actorId
    || planned.parentArtifactDigests.length !== 0
    || !canonicalEqual(planned.directOperations, operations)
    || operations.some((operation) =>
      operation.parentArtifactDigest !== null
      || operation.authorityEvidenceRoot !== actor.actor.evidenceDigest.value)) {
    fail("PROFILE_SHOWCASE_GENESIS_PLAN_MISMATCH");
  }
  const children = await verifyProfileShowcaseChildClosure({
    sealedPredecessor: null,
    inheritedChildren: [],
    admittedChildren: suppliedChildren,
    operations,
    resultingEvidenceRoots: planned.proofHistoryEvidenceRoots,
  });
  const foldState = foldProfileShowcaseOperations({
    prior: createEmptyProfileShowcaseFoldState(),
    operations,
  });
  const expectedFirstPaintWindow = await deriveProfileShowcaseFirstPaintWindow({
    foldState,
    payload: planned,
  });
  if (!canonicalEqual(planned.firstPaintWindow, expectedFirstPaintWindow)) {
    fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_MISMATCH");
  }
  const sealed = await sealReceizProfileShowcaseGenesis({
    plan: input.authority.plan,
    capability: input.authority.capability,
    sealer: async ({ artifactId, payloadBytes, predecessor }) =>
      input.authority.sealer({
        artifactId,
        payloadBytes,
        predecessor,
      }),
  });
  const verified = await verifiedShowcaseFromAdmission(
    sealed.admission,
    children,
    foldState,
    sealed.coordination,
    planned,
    sealed.history,
  );
  if (verified.artifactDigest !== sealed.artifactDigest.value
    || verified.history.historyDigest !== sealed.history.historyDigest
    || verified.acceptedHead !== null) {
    fail("PROFILE_SHOWCASE_GENESIS_HISTORY_MISMATCH");
  }
  return verified;
}

export async function createVerifiedProfileShowcaseTransition(input: Readonly<{
  predecessor: VerifiedProfileShowcase | null;
  admittedChildren: readonly ReceizVerifiedArtifactAdmission[];
  operations: readonly ProfileShowcaseOperationV1[];
  authority: ProfileShowcaseTransitionAuthority;
}>): Promise<VerifiedProfileShowcase> {
  const suppliedChildren = await verifyAdmittedChildren(input.admittedChildren);
  if (!input.authority || typeof input.authority !== "object") {
    fail("PROFILE_SHOWCASE_TRANSITION_AUTHORITY_REQUIRED");
  }
  const actor = input.authority.verifiedActorEvidence;
  assertReceizArtifactAppendPlanCustody(input.authority.plan);
  const plan = input.authority.plan;
  if (plan.resource !== plan.transition.artifactId
    || !plan.resource.startsWith("profile-showcase:")
    || plan.transition.namespace.value !== "profile-showcase"
    || plan.actor.actorId !== actor.actor.actorId
    || plan.actor.evidenceDigest.value !== actor.actor.evidenceDigest.value) {
    fail("PROFILE_SHOWCASE_PLAN_AUTHORITY_MISMATCH");
  }
  const predecessor = input.predecessor;
  if (predecessor === null) fail("PROFILE_SHOWCASE_PREDECESSOR_REQUIRED");
  if (!verifiedShowcaseCustody.has(predecessor)) {
    fail("PROFILE_SHOWCASE_PREDECESSOR_NOT_VERIFIED");
  }
  const admittedPredecessor = predecessor.admission;
  const sealedCarrier = await rederiveReceizProfileShowcaseCarrierFromAdmission(admittedPredecessor);
  const sealedPredecessor = sealedCarrier["profile-showcase"];
  assertProfileShowcaseSealedPayloadV1(sealedPredecessor);
  if (admittedPredecessor.artifactId !== plan.resource
    || admittedPredecessor.artifactSha256 !== plan.transition.priorArtifactDigest.value
    || sealedCarrier.artifactId !== admittedPredecessor.artifactId
    || sealedCarrier.ownerReceizIdentity !== admittedPredecessor.ownerReceizId) {
    fail("PROFILE_SHOWCASE_PREDECESSOR_NOT_VERIFIED");
  }
  const operations = canonicalProfileShowcaseOperations(input.operations);
  if (operations.some(
    (operation) => operation.authorityEvidenceRoot !== actor.actor.evidenceDigest.value,
  )) fail("PROFILE_SHOWCASE_OPERATION_AUTHORITY_MISMATCH");
  const resultingShowcase = plannedShowcase(plan);
  const children = await verifyProfileShowcaseChildClosure({
    sealedPredecessor,
    inheritedChildren: predecessor.admittedChildren,
    admittedChildren: suppliedChildren,
    operations,
    resultingEvidenceRoots: resultingShowcase.proofHistoryEvidenceRoots,
  });
  if (resultingShowcase.artifactId !== plan.resource
    || !canonicalEqual(resultingShowcase.directOperations, operations)
    || !resultingShowcase.parentArtifactDigests.includes(admittedPredecessor.artifactSha256)) {
    fail("PROFILE_SHOWCASE_PLAN_EVENT_MISMATCH");
  }
  const foldState = foldProfileShowcaseOperations({
    prior: predecessor.foldState,
    operations,
  });
  const expectedFirstPaintWindow = await deriveProfileShowcaseFirstPaintWindow({
    foldState,
    payload: resultingShowcase,
  });
  if (!canonicalEqual(resultingShowcase.firstPaintWindow, expectedFirstPaintWindow)) {
    fail("PROFILE_SHOWCASE_FIRST_PAINT_WINDOW_MISMATCH");
  }

  const candidate = await sealArtifactTransitionCandidate({
    plan,
    capability: input.authority.capability,
    sealer: input.authority.sealer,
  });
  const staged = await input.authority.store.stageCandidate(candidate);
  const committed = await commitArtifactTransition({
    plan,
    capability: input.authority.capability,
    staged,
    store: input.authority.store,
  });
  if (committed.status !== "committed-artifact-transition") {
    fail(`PROFILE_SHOWCASE_TRANSITION_${committed.code}`);
  }
  const admission = await admitReceizProfileShowcaseTransitionSuccessor({
    plan,
    candidateArtifact: committed.artifact,
  });
  const verified = await verifiedShowcaseFromAdmission(
    admission,
    children,
    foldState,
    Object.freeze({
      status: "committed",
      coordinationStatusIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  );
  if (committed.history === null
    || verified.artifactDigest !== committed.artifactDigest.value
    || verified.history.historyDigest !== committed.history.historyDigest
    || verified.history.headDigests[0] !== committed.receipt.acceptedHead.value) {
    fail("PROFILE_SHOWCASE_TRANSITION_HISTORY_MISMATCH");
  }
  return verified;
}
