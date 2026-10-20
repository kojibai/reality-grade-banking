import {
  admitReceizEconomyShowcaseTransitionSuccessor,
  assertReceizArtifactAppendPlanCustody,
  commitArtifactTransition,
  isSdkIssuedReceizArtifactAdmission,
  readReceizArtifactAppendPlannedEvent,
  rederiveReceizBoundedProfileShowcaseCarrierFromAdmission,
  rederiveReceizEconomyShowcaseCarrierFromAdmission,
  sealArtifactTransitionCandidate,
  type ReceizConstitutionJson,
  type ReceizVerifiedEconomyShowcaseAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import {
  appendReceizCompositeCommitment,
  createEmptyReceizCompositeMerkleState,
  createReceizCompositeFibonacciState,
  digestReceizCompositeCanonical,
} from "../../proof/composite/commitments";
import type {
  ReceizCompositeCheckpointResolver,
} from "../../proof/composite/types";
import {
  digestEconomyShowcaseCandidate,
} from "./canonical";
import {
  ECONOMY_SHOWCASE_ARTIFACT_ID,
  type EconomyShowcaseAppendOperationV1,
  type EconomyShowcaseCandidate,
  type EconomyShowcaseProfileAdmission,
  type EconomyShowcaseTransitionAuthority,
  type EconomyShowcaseVerifiedProfileAdmissionSource,
  type VerifiedEconomyShowcase,
} from "./types";

const DIGEST_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const profileAdmissionCustody = new WeakSet<object>();
const profileAdmissionSource =
  new WeakMap<object, EconomyShowcaseVerifiedProfileAdmissionSource>();
const economyCandidateCustody = new WeakSet<object>();
const verifiedEconomyShowcaseCustody = new WeakSet<object>();

function fail(code: string): never {
  throw new TypeError(code);
}

function requireEconomyShowcaseAdmission(
  value: unknown,
): ReceizVerifiedEconomyShowcaseAdmission {
  if (
    !isSdkIssuedReceizArtifactAdmission(value)
    || value.profile !== "economy-showcase"
    || value.verdict !== "bearer-recovery"
  ) fail("ECONOMY_SHOWCASE_ARTIFACT_NOT_VERIFIED");
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function candidateDigestBasis(
  value: Omit<EconomyShowcaseCandidate, "candidateDigest">,
): unknown {
  return {
    kind: "receiz.economy-showcase.candidate.v114",
    ...value,
  };
}

function issueCandidate(
  value: Omit<EconomyShowcaseCandidate, "candidateDigest">,
): EconomyShowcaseCandidate {
  const candidate = deepFreeze({
    ...value,
    candidateDigest: digestEconomyShowcaseCandidate(candidateDigestBasis(value)),
  }) as EconomyShowcaseCandidate;
  economyCandidateCustody.add(candidate);
  return candidate;
}

export async function admitVerifiedProfileShowcaseForEconomy(
  input: EconomyShowcaseVerifiedProfileAdmissionSource,
): Promise<EconomyShowcaseProfileAdmission> {
  const admission = input;
  if (
    admission.profile !== "profile-showcase"
    || admission.proofHistoryHead === null
  ) {
    fail("ECONOMY_SHOWCASE_PROFILE_ADMISSION_INVALID");
  }
  const carrier =
    await rederiveReceizBoundedProfileShowcaseCarrierFromAdmission(admission);
  const head = carrier["profile-showcase"];
  if (
    head.artifactId !== admission.artifactId
    || head.artifactId !== `profile-showcase:${carrier.ownerReceizIdentity}`
    || head.ownerReceizIdentity !== admission.ownerReceizId
    || typeof head.headKaiUpulse !== "string"
    || !KAI_RE.test(head.headKaiUpulse)
    || admission.proofHistoryHead.artifactId !== admission.artifactId
  ) {
    fail("ECONOMY_SHOWCASE_PROFILE_ADMISSION_INVALID");
  }
  const projected = deepFreeze({
    profile: "profile-showcase" as const,
    artifactId: admission.artifactId as `profile-showcase:${string}`,
    artifactDigest: admission.artifactSha256,
    immutableVersion: admission.artifactSha256,
    historyHeadDigest: admission.proofHistoryHead.headDigest,
    admissionEvidenceRoot: admission.admissionProof.admissionProofDigest,
    headKaiUpulse: head.headKaiUpulse,
    authority: {
      childIsProofAuthority: true as const,
      admissionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
      custodyStatus: "verified-profile-showcase-admission-runtime" as const,
    },
  });
  profileAdmissionCustody.add(projected);
  profileAdmissionSource.set(projected, admission);
  return projected;
}

export function isRuntimeCustodiedEconomyProfileAdmission(
  value: unknown,
): value is EconomyShowcaseProfileAdmission {
  return Boolean(
    value
    && typeof value === "object"
    && profileAdmissionCustody.has(value as object)
    && profileAdmissionSource.has(value as object),
  );
}

export function createEconomyShowcaseGenesisCandidate(
  input: Readonly<{ genesisKaiUpulse: string }>,
): EconomyShowcaseCandidate {
  if (!KAI_RE.test(input.genesisKaiUpulse)) {
    fail("ECONOMY_SHOWCASE_KAI_INVALID");
  }
  const merkle = createEmptyReceizCompositeMerkleState();
  return issueCandidate({
    schema: "receiz.economy-showcase-head.v114",
    artifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
    headKaiUpulse: input.genesisKaiUpulse,
    parentArtifactDigests: [],
    priorOperationCount: 0,
    resultingOperationCount: 0,
    directProfiles: [],
    directOperations: [],
    currentStateRoot: merkle.root,
    merkle,
    fibonacci: createReceizCompositeFibonacciState({
      operationCount: 0,
      resolveArtifactDigest: () => fail(
        "ECONOMY_SHOWCASE_FIBONACCI_REFERENCE_INVALID",
      ),
    }),
    counts: {
      operationCount: 0,
      profileShowcaseCount: 0,
    },
    versions: {
      kernelVersion: "receiz.composite.kernel.v1",
      verifierVersion: "receiz.economy-showcase.verifier.v114",
    },
    authority: {
      candidateIsProofAuthority: false,
      projectionIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
      admissionStatus: "requires-native-seal-and-economy-admission",
    },
  });
}

function assertProfileAdmission(
  value: EconomyShowcaseProfileAdmission,
): void {
  if (
    !value
    || typeof value !== "object"
    || !profileAdmissionCustody.has(value)
    || value.profile !== "profile-showcase"
    || !/^profile-showcase:[^\u0000-\u001f\u007f]+$/u.test(value.artifactId)
    || !DIGEST_RE.test(value.artifactDigest)
    || value.immutableVersion !== value.artifactDigest
    || !DIGEST_RE.test(value.historyHeadDigest)
    || !DIGEST_RE.test(value.admissionEvidenceRoot)
    || !KAI_RE.test(value.headKaiUpulse)
    || value.authority.childIsProofAuthority !== true
    || value.authority.admissionIsProofAuthority !== false
    || value.authority.strongerTruth !== "sealed-receiz-proof-object"
    || value.authority.custodyStatus
      !== "verified-profile-showcase-admission-runtime"
  ) {
    fail("ECONOMY_SHOWCASE_PROFILE_ADMISSION_INVALID");
  }
}

function compareProfiles(
  left: EconomyShowcaseProfileAdmission,
  right: EconomyShowcaseProfileAdmission,
): number {
  const leftKai = BigInt(left.headKaiUpulse);
  const rightKai = BigInt(right.headKaiUpulse);
  if (leftKai !== rightKai) return leftKai < rightKai ? -1 : 1;
  return left.artifactDigest.localeCompare(right.artifactDigest);
}

export async function appendAdmittedProfileShowcasesToEconomyCandidate(
  input: Readonly<{
    predecessor: EconomyShowcaseCandidate;
    profiles: readonly EconomyShowcaseProfileAdmission[];
    resolveCheckpoint: ReceizCompositeCheckpointResolver;
  }>,
): Promise<EconomyShowcaseCandidate> {
  if (
    !input.predecessor
    || typeof input.predecessor !== "object"
    || !economyCandidateCustody.has(input.predecessor)
    || input.predecessor.artifactId !== ECONOMY_SHOWCASE_ARTIFACT_ID
  ) {
    fail("ECONOMY_SHOWCASE_PREDECESSOR_INVALID");
  }
  if (!Array.isArray(input.profiles) || input.profiles.length === 0
    || input.profiles.length > 1_024) {
    fail("ECONOMY_SHOWCASE_PROFILE_ADMISSION_INVALID");
  }
  for (const profile of input.profiles) assertProfileAdmission(profile);
  const ordered = [...input.profiles].sort(compareProfiles);
  if (new Set(ordered.map((profile) => profile.artifactDigest)).size
    !== ordered.length) {
    fail("ECONOMY_SHOWCASE_PROFILE_ADMISSION_INVALID");
  }
  const parentKai = BigInt(input.predecessor.headKaiUpulse);
  if (ordered.some((profile) => BigInt(profile.headKaiUpulse) < parentKai)) {
    fail("ECONOMY_SHOWCASE_KAI_INVALID");
  }
  const directOperations: EconomyShowcaseAppendOperationV1[] =
    ordered.map((profile, index) => {
      const basis = {
        schema: "receiz.economy-showcase.operation.v1" as const,
        kind: "economy.profile-showcase.append" as const,
        parentArtifactDigest: input.predecessor.candidateDigest,
        priorCommittedCount: input.predecessor.resultingOperationCount,
        directDeltaPosition: index,
        kai: { upulse: profile.headKaiUpulse },
        profileShowcase: profile,
      };
      return deepFreeze({
        ...basis,
        operationDigest: digestReceizCompositeCanonical({
          digestDomain: "receiz.economy-showcase.operation-digest.v114",
          ...basis,
        }),
      });
    });
  const commitment = await appendReceizCompositeCommitment({
    stableArtifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
    prior: {
      merkle: input.predecessor.merkle,
      fibonacci: input.predecessor.fibonacci,
    },
    directChildren: directOperations.map((operation) => ({
      childArtifactDigest: operation.profileShowcase.artifactDigest,
      operationDigest: operation.operationDigest,
      kaiCoordinate: operation.kai,
    })),
    resolveCheckpoint: input.resolveCheckpoint,
  });
  const resultingOperationCount =
    input.predecessor.resultingOperationCount + directOperations.length;
  const headKaiUpulse = ordered.reduce(
    (maximum, profile) =>
      BigInt(profile.headKaiUpulse) > BigInt(maximum)
        ? profile.headKaiUpulse
        : maximum,
    input.predecessor.headKaiUpulse,
  );
  return issueCandidate({
    schema: "receiz.economy-showcase-head.v114",
    artifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
    headKaiUpulse,
    parentArtifactDigests: [input.predecessor.candidateDigest],
    priorOperationCount: input.predecessor.resultingOperationCount,
    resultingOperationCount,
    directProfiles: ordered,
    directOperations,
    currentStateRoot: commitment.merkle.root,
    merkle: commitment.merkle,
    fibonacci: commitment.fibonacci,
    counts: {
      operationCount: resultingOperationCount,
      profileShowcaseCount:
        input.predecessor.counts.profileShowcaseCount + ordered.length,
    },
    versions: {
      kernelVersion: "receiz.composite.kernel.v1",
      verifierVersion: "receiz.economy-showcase.verifier.v114",
    },
    authority: {
      candidateIsProofAuthority: false,
      projectionIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
      admissionStatus: "requires-native-seal-and-economy-admission",
    },
  });
}

export function isRuntimeCustodiedVerifiedEconomyShowcase(
  value: unknown,
): value is VerifiedEconomyShowcase {
  return Boolean(
    value
    && typeof value === "object"
    && verifiedEconomyShowcaseCustody.has(value as object),
  );
}

async function issueVerifiedEconomyShowcase(input: Readonly<{
  admission: ReceizVerifiedEconomyShowcaseAdmission;
  profileShowcases: readonly EconomyShowcaseProfileAdmission[];
  recoveredEconomyHistory?: readonly ReceizVerifiedEconomyShowcaseAdmission[];
  coordination: VerifiedEconomyShowcase["coordination"];
}>): Promise<VerifiedEconomyShowcase> {
  const admission = input.admission;
  if (
    admission.profile !== "economy-showcase"
    || admission.proofHistoryHead === null
  ) fail("ECONOMY_SHOWCASE_ARTIFACT_NOT_VERIFIED");
  for (const profile of input.profileShowcases) {
    if (!isRuntimeCustodiedEconomyProfileAdmission(profile)) {
      fail("ECONOMY_SHOWCASE_PROFILE_NOT_VERIFIED");
    }
    const source = profileAdmissionSource.get(profile);
    const childAdmission = source;
    if (
      !childAdmission
      || childAdmission.profile !== "profile-showcase"
      || childAdmission.artifactId !== profile.artifactId
      || childAdmission.artifactSha256 !== profile.artifactDigest
      || childAdmission.proofHistoryHead?.headDigest
        !== profile.historyHeadDigest
      || childAdmission.admissionProof.admissionProofDigest
        !== profile.admissionEvidenceRoot
    ) fail("ECONOMY_SHOWCASE_PROFILE_NOT_VERIFIED");
  }
  const carrier =
    await rederiveReceizEconomyShowcaseCarrierFromAdmission(admission);
  if (input.recoveredEconomyHistory) {
    const references = new Map<string, Pick<
      EconomyShowcaseProfileAdmission,
      | "artifactId"
      | "artifactDigest"
      | "historyHeadDigest"
      | "admissionEvidenceRoot"
      | "headKaiUpulse"
    >>();
    let expectedArtifactDigest = admission.artifactSha256;
    let expectedResultingCount: number | null = null;
    for (const historical of input.recoveredEconomyHistory) {
      const historicalAdmission = historical;
      if (
        historicalAdmission.profile !== "economy-showcase"
        || historicalAdmission.proofHistoryHead === null
        || historicalAdmission.artifactSha256 !== expectedArtifactDigest
      ) fail("ECONOMY_SHOWCASE_HISTORY_CLOSURE_MISMATCH");
      const historicalCarrier =
        await rederiveReceizEconomyShowcaseCarrierFromAdmission(
          historicalAdmission,
        );
      const historicalHead = historicalCarrier["economy-showcase"];
      if (
        expectedResultingCount !== null
        && historicalHead.resultingOperationCount !== expectedResultingCount
      ) fail("ECONOMY_SHOWCASE_HISTORY_CLOSURE_MISMATCH");
      for (const operation of historicalHead.directOperations) {
        const profile = operation.profileShowcase;
        const current = references.get(profile.artifactId);
        if (
          !current
          || BigInt(profile.headKaiUpulse) > BigInt(current.headKaiUpulse)
          || (
            profile.headKaiUpulse === current.headKaiUpulse
            && profile.artifactDigest.localeCompare(current.artifactDigest) > 0
          )
        ) {
          references.set(profile.artifactId, profile);
        }
      }
      const parents = historicalHead.parentArtifactDigests;
      if (parents.length === 0) {
        if (
          historicalHead.priorOperationCount !== 0
          || historicalHead.resultingOperationCount !== 0
        ) fail("ECONOMY_SHOWCASE_HISTORY_CLOSURE_MISMATCH");
        expectedArtifactDigest = "";
        expectedResultingCount = null;
        continue;
      }
      if (parents.length !== 1 || historicalHead.priorOperationCount < 0) {
        fail("ECONOMY_SHOWCASE_HISTORY_CLOSURE_MISMATCH");
      }
      expectedArtifactDigest = parents[0]!;
      expectedResultingCount = historicalHead.priorOperationCount;
    }
    if (expectedArtifactDigest) {
      fail("ECONOMY_SHOWCASE_HISTORY_CLOSURE_MISMATCH");
    }
    if (
      references.size !== input.profileShowcases.length
      || input.profileShowcases.some((profile) => {
        const reference = references.get(profile.artifactId);
        return !reference
          || reference.artifactDigest !== profile.artifactDigest
          || reference.historyHeadDigest !== profile.historyHeadDigest
          || reference.admissionEvidenceRoot !== profile.admissionEvidenceRoot;
      })
    ) fail("ECONOMY_SHOWCASE_PROFILE_CLOSURE_MISMATCH");
  } else if (
    carrier["economy-showcase"].directOperations.length
      !== input.profileShowcases.length
    || input.profileShowcases.some((profile) =>
      !carrier["economy-showcase"].directOperations.some((operation) =>
        operation.profileShowcase.artifactId === profile.artifactId
        && operation.profileShowcase.artifactDigest === profile.artifactDigest
        && operation.profileShowcase.historyHeadDigest
          === profile.historyHeadDigest
        && operation.profileShowcase.admissionEvidenceRoot
          === profile.admissionEvidenceRoot
      )
    )
  ) fail("ECONOMY_SHOWCASE_PROFILE_CLOSURE_MISMATCH");
  const verified = Object.freeze({
    artifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
    artifactDigest: admission.artifactSha256,
    admission,
    head: carrier["economy-showcase"],
    profileShowcases: Object.freeze([...input.profileShowcases]),
    acceptedHead: input.coordination.status === "committed"
      ? carrier.receizProofHistory.headDigest
      : null,
    coordination: input.coordination,
    authority: Object.freeze({
      economyShowcaseIsProofAuthority: true as const,
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  verifiedEconomyShowcaseCustody.add(verified);
  return verified;
}

export async function restoreVerifiedEconomyShowcaseFromAdmission(
  input: Readonly<{
    admission: unknown;
    profileShowcases: readonly EconomyShowcaseProfileAdmission[];
  }>,
): Promise<VerifiedEconomyShowcase> {
  return issueVerifiedEconomyShowcase({
    admission: requireEconomyShowcaseAdmission(input.admission),
    profileShowcases: input.profileShowcases,
    coordination: Object.freeze({
      status: "unaccepted",
      coordinationStatusIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  });
}

export async function restoreVerifiedEconomyShowcaseFromRecoveredHistory(
  input: Readonly<{
    admission: unknown;
    profileShowcases: readonly EconomyShowcaseProfileAdmission[];
    economyHistory: readonly unknown[];
  }>,
): Promise<VerifiedEconomyShowcase> {
  if (input.economyHistory.length === 0) {
    fail("ECONOMY_SHOWCASE_HISTORY_CLOSURE_MISMATCH");
  }
  return issueVerifiedEconomyShowcase({
    admission: requireEconomyShowcaseAdmission(input.admission),
    profileShowcases: input.profileShowcases,
    recoveredEconomyHistory: input.economyHistory.map(
      requireEconomyShowcaseAdmission,
    ),
    coordination: Object.freeze({
      status: "unaccepted",
      coordinationStatusIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  });
}

export async function appendVerifiedProfileShowcaseToEconomy(input: Readonly<{
  predecessor: VerifiedEconomyShowcase | null;
  profileShowcase: EconomyShowcaseProfileAdmission;
  actorEvidence: EconomyShowcaseTransitionAuthority["verifiedActorEvidence"];
  authority: EconomyShowcaseTransitionAuthority;
}>): Promise<VerifiedEconomyShowcase> {
  if (
    input.predecessor === null
    || !isRuntimeCustodiedVerifiedEconomyShowcase(input.predecessor)
  ) fail("ECONOMY_SHOWCASE_PREDECESSOR_NOT_VERIFIED");
  if (!isRuntimeCustodiedEconomyProfileAdmission(input.profileShowcase)) {
    fail("ECONOMY_SHOWCASE_PROFILE_NOT_VERIFIED");
  }
  const predecessor = input.predecessor;
  const actor = input.actorEvidence;
  if (input.authority.verifiedActorEvidence !== input.actorEvidence) {
    fail("ECONOMY_SHOWCASE_ACTOR_NOT_VERIFIED");
  }
  assertReceizArtifactAppendPlanCustody(input.authority.plan);
  const plan = input.authority.plan;
  if (
    plan.resource !== ECONOMY_SHOWCASE_ARTIFACT_ID
    || plan.transition.artifactId !== ECONOMY_SHOWCASE_ARTIFACT_ID
    || plan.transition.namespace.value !== "economy-showcase"
    || plan.commitDomain.value !== "receiz.com/global/v1"
    || plan.transition.priorArtifactDigest.value
      !== predecessor.artifactDigest
    || plan.actor.actorId !== actor.actor.actorId
    || plan.actor.evidenceDigest.value !== actor.actor.evidenceDigest.value
  ) fail("ECONOMY_SHOWCASE_PLAN_AUTHORITY_MISMATCH");
  const plannedEvent = readReceizArtifactAppendPlannedEvent(plan);
  if (
    !plannedEvent
    || typeof plannedEvent !== "object"
    || Array.isArray(plannedEvent)
    || plannedEvent.schema !== "receiz.economy-showcase.namespace-event.v1"
    || !plannedEvent.resultingEconomyShowcase
    || typeof plannedEvent.resultingEconomyShowcase !== "object"
    || Array.isArray(plannedEvent.resultingEconomyShowcase)
  ) fail("ECONOMY_SHOWCASE_PLAN_EVENT_MISMATCH");
  const head = plannedEvent.resultingEconomyShowcase as Record<
    string,
    ReceizConstitutionJson
  >;
  const directOperations = head.directOperations;
  if (!Array.isArray(directOperations) || directOperations.length !== 1) {
    fail("ECONOMY_SHOWCASE_PLAN_EVENT_MISMATCH");
  }
  const operation = directOperations[0];
  const reference = operation && typeof operation === "object"
    && !Array.isArray(operation)
    && operation.profileShowcase
    && typeof operation.profileShowcase === "object"
    && !Array.isArray(operation.profileShowcase)
      ? operation.profileShowcase
      : null;
  if (
    !reference
    || reference.artifactId !== input.profileShowcase.artifactId
    || reference.artifactDigest !== input.profileShowcase.artifactDigest
    || reference.historyHeadDigest
      !== input.profileShowcase.historyHeadDigest
    || reference.admissionEvidenceRoot
      !== input.profileShowcase.admissionEvidenceRoot
  ) fail("ECONOMY_SHOWCASE_PROFILE_BINDING_MISMATCH");

  const candidate = await sealArtifactTransitionCandidate({
    plan,
    capability: input.authority.capability,
    sealer: input.authority.sealer,
  });
  const admission = await admitReceizEconomyShowcaseTransitionSuccessor({
    plan,
    candidateArtifact: candidate.artifact,
  });
  let status: VerifiedEconomyShowcase["coordination"]["status"] =
    "unaccepted";
  try {
    const staged = await input.authority.store.stageCandidate(candidate);
    const committed = await commitArtifactTransition({
      plan,
      capability: input.authority.capability,
      staged,
      store: input.authority.store,
    });
    status = committed.status === "committed-artifact-transition"
      ? "committed"
      : "diverged";
  } catch {
    status = "unaccepted";
  }
  return issueVerifiedEconomyShowcase({
    admission,
    profileShowcases: [input.profileShowcase],
    coordination: Object.freeze({
      status,
      coordinationStatusIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  });
}
