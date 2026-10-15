import type { ReceizArtifactAppendPlan, ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import { readReceizLifecycleAdditionsV125, readReceizLifecyclePayloadV125, planReceizSealedLifecycleV125,
  retainReceizLifecyclePlanV125, readReceizLifecyclePlanCustodyV125, applyReceizSealedLifecycleV125,
  type ReceizSealedLifecycleContextV125, type ReceizSealedLifecycleExecutionV125 } from "./v125SealedLifecycle.js";
import { encodeReceizAuthority } from "./authorityEncoding.js";
import {
  RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA,
  receizBase64UrlEncode,
  verifyReceizIdentityPublicKeyProjectionSignature,
  type ReceizIdentityLoginProof,
} from "./identity.js";
import {
  buildReceizCompositeBoundedTree,
  type ReceizCompositeMerkleSibling,
} from "./compositeProofKernel.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { freeze } from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import {
  verifyReceizAttestationActorAuthorizationV125,
  verifyReceizAttestationIssuanceEvidenceV125,
  verifyAndOpenReceizAttestationArtifactV125,
  type ReceizAttestationActorAuthorizationV125,
  type ReceizAttestationApplicationStateV125,
  type ReceizAttestationApplicationV125,
  type ReceizAttestationAuthorityV125,
  type ReceizAttestationEventV125,
  type ReceizAttestationIssuanceEvidenceV125,
} from "./v125Attestation.js";
import {
  parseReceizAttestationDomainV125,
  parseReceizClaimSetV125,
  type ReceizAttestationActorActionV125,
  type ReceizAttestationDisclosureV125,
  type ReceizAttestationDomainV125,
  type ReceizClaimSetV125,
} from "./v125AttestationSchemas.js";
import {
  openVerifiedReceizV125ArtifactPayload,
  openVerifiedReceizV125ArtifactPayloadBytes,
  readReceizV125BindingAdmission,
  type ReceizV125EnclosingArtifactBinding,
  type ReceizV125EnclosingArtifactVerifierOptions,
} from "./v125ArtifactBinding.js";
import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";

export type ReceizCredentialIssuanceCoreV125 = Readonly<{
  attestation: ReceizAttestationIssuanceEvidenceV125;
  proofObjectId: string;
  predecessorCredentialId: string | null;
  custodyHead: string;
}>;

export type ReceizCredentialPredecessorLifecycleAdmissionV125 = Readonly<{
  issuance: ReceizCredentialIssuanceInputV125;
  credential: ReceizCredentialV125;
  events: readonly ReceizCredentialLifecycleEventV125[];
}>;

export type ReceizCredentialIssuanceInputV125 = ReceizCredentialIssuanceCoreV125 & Readonly<{
  predecessorLifecycle: ReceizCredentialPredecessorLifecycleAdmissionV125 | null;
}>;

export type ReceizCredentialClaimLeafV125 = Readonly<{
  name: string;
  disclosure: ReceizAttestationDisclosureV125;
  valueCommitment: string;
  evidenceIds: readonly string[];
  leafDigest: string;
  witness: readonly ReceizCompositeMerkleSibling[];
}>;

export type ReceizCredentialClaimTreeV125 = Readonly<{
  schema: "receiz.credential.claim-tree.v125";
  domainId: string;
  credentialType: string;
  subjectId: string;
  root: string;
  leaves: readonly ReceizCredentialClaimLeafV125[];
}>;

export type ReceizOpenedCredentialArtifactV125 = ReceizV125EnclosingArtifactBinding & Readonly<{
  schema: "receiz.opened-credential-artifact.v125";
  issuance: ReceizCredentialIssuanceInputV125;
  acceptedHead: string;
  history: ReceizCredentialHistoryV125;
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizCredentialLifecycleEventKindV125 =
  | "renewed" | "suspended" | "revoked" | "replaced" | "expired";

export type ReceizCredentialV125 = Readonly<{
  schema: "receiz.credential.v125";
  credentialId: string;
  proofObjectId: string;
  domainId: string;
  credentialType: string;
  subjectId: string;
  holderReceizId: string;
  issuerReceizId: string;
  holderRole: string;
  issuerRole: string;
  holderAuthorizedKai: string;
  issuerAuthorizedKai: string;
  registryDigest: string;
  domainDigest: string;
  claimRoot: string;
  claimSetDigest: string;
  claimSetHead: string;
  applicationId: string;
  applicationDigest: string;
  applicationHead: string;
  evidenceBundleDigest: string;
  evidenceHead: string;
  evaluationDigest: string | null;
  reviewDigest: string | null;
  approvalDigests: readonly string[];
  approverReceizIds: readonly string[];
  issuanceDigest: string;
  decisionHead: string;
  issuedKai: string;
  validFromKai: string;
  expiresAtKai: string | null;
  predecessorCredentialId: string | null;
  predecessorLifecycleHead: string | null;
  predecessorLifecycleKai: string | null;
  predecessorLifecycleIntentDigest: string | null;
  successorCredentialId: null;
  holderAuthorization: ReceizAttestationActorAuthorizationV125;
  issuerAuthorization: ReceizAttestationActorAuthorizationV125;
  custody: Readonly<{ holderReceizId: string; custodyHead: string }>;
  provenance: Readonly<{
    applicationId: string;
    applicationDigest: string;
    applicationHead: string;
    attestationHistoryRoot: string;
  }>;
  acceptedHead: string;
  historyRoot: string;
  authority: Readonly<{
    strongerTruth: "sealed-receiz-proof-object";
    currentnessProjectionIsAuthority: false;
  }>;
}>;

export type ReceizCredentialLifecycleEventV125 = Readonly<{
  schema: "receiz.credential.lifecycle-event.v125";
  kind: ReceizCredentialLifecycleEventKindV125;
  credentialId: string;
  domainId: string;
  credentialType: string;
  actorReceizId: string;
  actorRole: string;
  actorAuthorization: ReceizAttestationActorAuthorizationV125;
  actorProof: ReceizIdentityLoginProof;
  expectedPriorHead: string;
  eventKai: string;
  idempotencyKey: string;
  successorIntentDigest: string | null;
  successorProofObjectId: string | null;
  successorIssuanceCore: ReceizCredentialIssuanceCoreV125 | null;
  eventDigest: string;
}>;

export type ReceizCredentialLifecycleEventInputV125 = Readonly<{
  kind: ReceizCredentialLifecycleEventKindV125;
  credentialId: string;
  domainId: string;
  credentialType: string;
  actorReceizId: string;
  actorRole: string;
  actorAuthorization: ReceizAttestationActorAuthorizationV125;
  actorProof: ReceizIdentityLoginProof;
  expectedPriorHead: string;
  eventKai: string;
  idempotencyKey: string;
  successor: ReceizCredentialIssuanceCoreV125 | null;
}>;

export type ReceizCredentialStatusV125 = "issued" | "suspended" | "revoked" | "replaced" | "expired";

export type ReceizCredentialHistoryV125 = Readonly<{
  schema: "receiz.credential.history.v125";
  domain: ReceizAttestationDomainV125;
  credential: ReceizCredentialV125;
  credentialId: string;
  status: ReceizCredentialStatusV125;
  acceptedHead: string;
  historyRoot: string;
  latestKai: string;
  successorIntentDigest: string | null;
  events: readonly ReceizCredentialLifecycleEventV125[];
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizCredentialLifecycleEventPlanV125 = Readonly<{
  schema: "receiz.credential.lifecycle-plan.v125";
  transitionPlan?: ReceizArtifactAppendPlan;
  event: ReceizCredentialLifecycleEventV125;
  planIdentity: string;
  confirmationDigest: string;
  confirmationRequired: true;
  writesPerformed: 0;
  authority: Readonly<{ planIsAdmission: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizCredentialLifecycleEventApplyV125 = Readonly<{
  schema: "receiz.credential.lifecycle-apply.v125";
  state: ReceizCredentialHistoryV125;
  history: readonly ReceizCredentialLifecycleEventV125[];
  append: ReceizCredentialLifecycleEventV125;
  sourceArtifact: ReceizPortableSealedArtifactV124;
  committedTransition: ReceizCommittedArtifactTransition;
  writesPerformed: 0 | 1;
  authority: Readonly<{ applyIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizCredentialCurrentnessStatusV125 =
  | "current" | "expired" | "suspended" | "revoked" | "replaced" | "head-behind" | "invalid";

export type ReceizCredentialCurrentnessV125 = Readonly<{
  schema: "receiz.credential.currentness.v125";
  status: ReceizCredentialCurrentnessStatusV125;
  credentialId: string;
  presentedHead: string;
  acceptedHead: string;
  credentialValid: boolean;
}>;

export class ReceizCredentialZeroWriteErrorV125 extends TypeError {
  readonly writesPerformed = 0 as const;
  constructor(readonly code: string) {
    super(code);
    this.name = "ReceizCredentialZeroWriteErrorV125";
  }
}

type CredentialLifecycleAuthorshipBasisV125 = Readonly<{
  kind: ReceizCredentialLifecycleEventKindV125;
  credentialId: string;
  domainId: string;
  credentialType: string;
  actorReceizId: string;
  actorRole: string;
  actorAuthorization: ReceizAttestationActorAuthorizationV125;
  expectedPriorHead: string;
  eventKai: string;
  idempotencyKey: string;
  successor: ReceizCredentialIssuanceCoreV125 | null;
}>;

function credentialLifecycleAuthorshipChallengeB64u(
  input: CredentialLifecycleAuthorshipBasisV125,
): string {
  return receizBase64UrlEncode(encodeReceizAuthority(
    "event",
    "receiz.credential.lifecycle-event-authorship.v125",
    input,
  ));
}

export function createReceizCredentialLifecycleEventActorChallengeV125(
  input: Omit<ReceizCredentialLifecycleEventInputV125, "actorProof">,
): string {
  return credentialLifecycleAuthorshipChallengeB64u(input);
}

async function verifyLifecycleActorProof(
  value: unknown,
  authorization: ReceizAttestationActorAuthorizationV125,
  challengeB64Url: string,
): Promise<ReceizIdentityLoginProof> {
  const code = "V125_CREDENTIAL_EVENT_ACTOR_PROOF_INVALID";
  const record = closedRecord(value, [
    "schema", "keyId", "alg", "challengeB64Url", "signatureB64Url",
  ], code);
  if (record.schema !== RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA
    || record.keyId !== authorization.actorKeyId
    || record.alg !== authorization.actorKeyAlg
    || record.challengeB64Url !== challengeB64Url
    || typeof record.signatureB64Url !== "string"
    || !await verifyReceizIdentityPublicKeyProjectionSignature({
      keyId: authorization.actorKeyId,
      alg: authorization.actorKeyAlg,
      publicKeyRawB64u: authorization.actorPublicKeyRawB64u,
      challengeB64Url,
      signatureB64Url: record.signatureB64Url,
    })) fail(code);
  return freeze({
    schema: RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA,
    keyId: authorization.actorKeyId,
    alg: authorization.actorKeyAlg,
    challengeB64Url,
    signatureB64Url: record.signatureB64Url,
  });
}

const HEX64 = /^[0-9a-f]{64}$/;
const KAI = /^(0|[1-9][0-9]*)$/;
const NAME = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const RECEIZ_ID = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;
const KINDS: readonly ReceizCredentialLifecycleEventKindV125[] = [
  "renewed", "suspended", "revoked", "replaced", "expired",
];
const MAX_HISTORY = 100_000;

function fail(code: string): never { throw new ReceizCredentialZeroWriteErrorV125(code); }

async function zeroWriteBoundary<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof ReceizCredentialZeroWriteErrorV125) throw error;
    const code = error instanceof Error && error.message ? error.message : "V125_CREDENTIAL_VALIDATION_FAILED";
    throw new ReceizCredentialZeroWriteErrorV125(code);
  }
}

function closedRecord(value: unknown, keys: readonly string[], code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.length !== keys.length || actual.some((key) => typeof key !== "string" || !keys.includes(key))) fail(code);
  const output = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code);
    Object.defineProperty(output, key, { value: descriptor.value, enumerable: true, writable: true, configurable: true });
  }
  return output;
}

function exactArray(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const length = descriptors.length;
  const count = length && "value" in length ? length.value : undefined;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0
    || Reflect.ownKeys(descriptors).length !== count + 1) fail(code);
  const output: unknown[] = [];
  for (let index = 0; index < count; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code);
    output.push(descriptor.value);
  }
  return output;
}

function text(value: unknown, code: string, maximum = 512): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum
    || value.trim() !== value || value.normalize("NFC") !== value) fail(code);
  return value;
}
function name(value: unknown, code: string): string {
  const parsed = text(value, code, 256);
  if (!NAME.test(parsed)) fail(code);
  return parsed;
}
function digest(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code);
  return value;
}
function nullableDigest(value: unknown, code: string): string | null {
  return value === null ? null : digest(value, code);
}
function kai(value: unknown, code: string): string {
  if (typeof value !== "string" || !KAI.test(value)) fail(code);
  return value;
}
function receizId(value: unknown, code: string): string {
  if (typeof value !== "string" || !RECEIZ_ID.test(value)) fail(code);
  return value;
}

async function authorityDigest(domain: Parameters<typeof encodeReceizAuthority>[0], schema: string, value: unknown) {
  const bytes = encodeReceizAuthority(domain, schema, value);
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameDigestable(left: unknown, right: unknown): Promise<boolean> {
  return Promise.all([
    authorityDigest("state", "receiz.credential.exact-comparison.v125", left),
    authorityDigest("state", "receiz.credential.exact-comparison.v125", right),
  ]).then(([a, b]) => a === b);
}

async function verifyAuthorization(
  value: unknown,
  coordinate: Readonly<{
    actorReceizId: string;
    actorRole: string;
    requiredAction: ReceizAttestationActorActionV125;
    eventKai: string;
    domain: ReceizAttestationDomainV125;
    credentialType: string;
  }>,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationActorAuthorizationV125> {
  return verifyReceizAttestationActorAuthorizationV125({
    authorization: value as ReceizAttestationActorAuthorizationV125,
    actorReceizId: coordinate.actorReceizId,
    actorRole: coordinate.actorRole,
    kind: coordinate.requiredAction,
    eventKai: coordinate.eventKai,
    domain: coordinate.domain,
    credentialType: coordinate.credentialType,
  }, authority);
}

async function claimTreeFromClaimSet(claimSet: ReceizClaimSetV125): Promise<ReceizCredentialClaimTreeV125> {
  const claims = [...claimSet.claims].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
  if (claims.length === 0 || new Set(claims.map((claim) => claim.name)).size !== claims.length) {
    fail("V125_CREDENTIAL_CLAIM_TREE_INVALID");
  }
  const leafBases = claims.map((claim) => freeze({
    domainId: claimSet.domainId,
    credentialType: claimSet.credentialType,
    subjectId: claimSet.subjectId,
    name: claim.name,
    disclosure: claim.disclosure,
    valueCommitment: claim.commitment,
    evidenceIds: freeze([...claim.evidenceIds].sort()),
  }));
  const leafDigests = await Promise.all(leafBases.map((basis) =>
    authorityDigest("artifact", "receiz.credential.claim-leaf.v125", basis)));
  const tree = buildReceizCompositeBoundedTree(leafDigests);
  return freeze({
    schema: "receiz.credential.claim-tree.v125" as const,
    domainId: claimSet.domainId,
    credentialType: claimSet.credentialType,
    subjectId: claimSet.subjectId,
    root: tree.root,
    leaves: freeze(leafBases.map((basis, index) => freeze({
      name: basis.name,
      disclosure: basis.disclosure,
      valueCommitment: basis.valueCommitment,
      evidenceIds: basis.evidenceIds,
      leafDigest: leafDigests[index]!,
      witness: freeze(tree.witnesses[index]!.map((sibling) => freeze({ ...sibling }))),
    }))),
  });
}

export async function createReceizCredentialClaimTreeV125(input: Readonly<{
  domain: ReceizAttestationDomainV125;
  claimSet: ReceizClaimSetV125;
}>): Promise<ReceizCredentialClaimTreeV125> {
  return zeroWriteBoundary(async () => {
    const record = closedRecord(input, ["domain", "claimSet"], "V125_CREDENTIAL_CLAIM_TREE_INPUT_INVALID");
    const domain = parseReceizAttestationDomainV125(record.domain);
    const claimSet = await parseReceizClaimSetV125(record.claimSet, domain);
    return claimTreeFromClaimSet(claimSet);
  });
}

function issuedEvent(state: ReceizAttestationApplicationStateV125): ReceizAttestationEventV125 {
  const event = state.history[state.history.length - 1];
  if (!event || event.kind !== "issued" || event.payload.schema !== "receiz.attestation.issuance.v125") {
    fail("V125_CREDENTIAL_ATTESTATION_NOT_ISSUED");
  }
  return event;
}

function submittedEvent(state: ReceizAttestationApplicationStateV125): ReceizAttestationEventV125 {
  const event = state.history.find((candidate) => candidate.kind === "submitted");
  if (!event) fail("V125_CREDENTIAL_SUBMISSION_MISSING");
  return event;
}

async function attestationHistoryRoot(genesis: ReceizAttestationApplicationV125, events: readonly ReceizAttestationEventV125[]) {
  return authorityDigest("history", "receiz.attestation.accepted-history-root.v125", {
    applicationDigest: genesis.applicationDigest,
    eventDigests: events.map((event) => event.eventDigest),
  });
}

const CREDENTIAL_KEYS = [
  "schema", "credentialId", "proofObjectId", "domainId", "credentialType", "subjectId", "holderReceizId",
  "issuerReceizId", "holderRole", "issuerRole", "holderAuthorizedKai", "issuerAuthorizedKai",
  "registryDigest", "domainDigest", "claimRoot", "claimSetDigest", "claimSetHead",
  "applicationId", "applicationDigest", "applicationHead", "evidenceBundleDigest", "evidenceHead",
  "evaluationDigest", "reviewDigest", "approvalDigests", "approverReceizIds", "issuanceDigest", "decisionHead",
  "issuedKai", "validFromKai", "expiresAtKai", "predecessorCredentialId", "predecessorLifecycleHead",
  "predecessorLifecycleKai", "predecessorLifecycleIntentDigest", "successorCredentialId",
  "holderAuthorization", "issuerAuthorization", "custody", "provenance", "acceptedHead", "historyRoot", "authority",
] as const;

type CredentialIdentityBasis = Omit<ReceizCredentialV125, "credentialId" | "acceptedHead" | "historyRoot">;

async function sealCredentialBasis(basis: CredentialIdentityBasis): Promise<ReceizCredentialV125> {
  const credentialId = await authorityDigest("identity", "receiz.credential.identity.v125", basis);
  const acceptedHead = await authorityDigest("history", "receiz.credential.genesis-head.v125", { credentialId });
  const historyRoot = await authorityDigest("history", "receiz.credential.history-root.v125", {
    credentialId, eventDigests: [],
  });
  return freeze({ ...basis, credentialId, acceptedHead, historyRoot });
}

async function successorIntentDigest(core: ReceizCredentialIssuanceCoreV125): Promise<string> {
  return authorityDigest("plan", "receiz.credential.successor-intent.v125", core);
}

async function admitPredecessorLifecycle(
  value: unknown,
  core: ReceizCredentialIssuanceCoreV125,
  issuedKai: string,
  authority: ReceizAttestationAuthorityV125,
): Promise<Readonly<{
  head: string | null;
  kai: string | null;
  intentDigest: string | null;
}>> {
  if (core.predecessorCredentialId === null) {
    if (value !== null) fail("V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_FORBIDDEN");
    return freeze({ head: null, kai: null, intentDigest: null });
  }
  if (value === null) fail("V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_REQUIRED");
  const record = closedRecord(value, ["issuance", "credential", "events"],
    "V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_INVALID");
  const predecessor = await verifyHistory({
    issuance: record.issuance,
    credential: record.credential,
    events: record.events,
  }, authority);
  if (predecessor.credentialId !== core.predecessorCredentialId) {
    fail("V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_MISMATCH");
  }
  const intentDigest = await successorIntentDigest(core);
  const acceptedEvent = predecessor.events.find((event) =>
    (event.kind === "renewed" || event.kind === "replaced")
    && event.successorIntentDigest === intentDigest
    && event.successorProofObjectId === core.proofObjectId
    && event.successorIssuanceCore !== null);
  if (!acceptedEvent || !await sameDigestable(acceptedEvent.successorIssuanceCore, core)
    || BigInt(issuedKai) < BigInt(acceptedEvent.eventKai)) {
    fail("V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_MISMATCH");
  }
  return freeze({
    head: acceptedEvent.eventDigest,
    kai: acceptedEvent.eventKai,
    intentDigest,
  });
}

async function createCredential(input: unknown, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialV125> {
  const record = closedRecord(input, [
    "attestation", "proofObjectId", "predecessorCredentialId", "custodyHead", "predecessorLifecycle",
  ], "V125_CREDENTIAL_INPUT_INVALID");
  const admission = await verifyReceizAttestationIssuanceEvidenceV125(
    record.attestation as ReceizAttestationIssuanceEvidenceV125,
    authority,
  );
  const { domain, genesis, state } = admission;
  const issue = issuedEvent(state);
  const submission = submittedEvent(state);
  const domainId = state.domainId;
  const credentialType = state.credentialType;
  const subjectId = state.subjectId;
  const holderReceizId = state.applicantReceizId;
  const issuerReceizId = issue.actorReceizId;
  const applicationHead = state.acceptedHead;
  if (holderReceizId !== submission.actorReceizId) {
    fail("V125_CREDENTIAL_HOLDER_MISMATCH");
  }
  if (applicationHead !== state.acceptedHead || applicationHead !== issue.eventDigest) {
    fail("V125_CREDENTIAL_APPLICATION_HEAD_MISMATCH");
  }
  const issuedKai = issue.eventKai;
  const validFromKai = state.claimSet.validFromKai;
  const expiresAtKai = state.claimSet.expiresAtKai;
  if (issuedKai !== issue.eventKai || BigInt(validFromKai) < BigInt(issuedKai)
    || (expiresAtKai !== null && BigInt(expiresAtKai) < BigInt(validFromKai))) fail("V125_CREDENTIAL_KAI_INVALID");
  const holderAuthorization = await verifyAuthorization(submission.actorAuthorization, {
    actorReceizId: holderReceizId, actorRole: submission.actorRole, requiredAction: "submitted",
    eventKai: submission.eventKai, domain, credentialType,
  }, authority);
  const issuerAuthorization = await verifyAuthorization(issue.actorAuthorization, {
    actorReceizId: issuerReceizId, actorRole: issue.actorRole, requiredAction: "issued",
    eventKai: issuedKai, domain, credentialType,
  }, authority);
  const evaluation = [...state.history].reverse().find((event) => event.kind === "evaluation_complete");
  const review = [...state.history].reverse().find((event) => event.kind === "review_complete");
  const approvals = state.history.filter((event) => event.kind === "approval_recorded")
    .map((event) => ({
      approverReceizId: event.actorReceizId,
      approvalDigest: (event.payload as { approvalDigest: string }).approvalDigest,
    }))
    .sort((left, right) => left.approverReceizId < right.approverReceizId ? -1
      : left.approverReceizId > right.approverReceizId ? 1 : 0);
  if (approvals.length > 64
    || new Set(approvals.map((approval) => approval.approverReceizId)).size !== approvals.length
    || new Set(approvals.map((approval) => approval.approvalDigest)).size !== approvals.length) {
    fail("V125_CREDENTIAL_APPROVALS_INVALID");
  }
  const claimTree = await claimTreeFromClaimSet(state.claimSet);
  const issuanceDigest = (issue.payload as { issuanceDigest: string }).issuanceDigest;
  const predecessorCredentialId = nullableDigest(
    record.predecessorCredentialId,
    "V125_CREDENTIAL_PREDECESSOR_INVALID",
  );
  const proofObjectId = text(record.proofObjectId, "V125_CREDENTIAL_PROOF_OBJECT_INVALID");
  const custodyHead = digest(record.custodyHead, "V125_CREDENTIAL_CUSTODY_INVALID");
  const core = freeze({
    attestation: freeze({ domain, genesis: admission.genesis, events: admission.events }),
    proofObjectId,
    predecessorCredentialId,
    custodyHead,
  });
  const predecessorLifecycle = await admitPredecessorLifecycle(
    record.predecessorLifecycle,
    core,
    issuedKai,
    authority,
  );
  const basis = freeze({
    schema: "receiz.credential.v125" as const,
    proofObjectId,
    domainId, credentialType, subjectId, holderReceizId, issuerReceizId,
    holderRole: submission.actorRole,
    issuerRole: issue.actorRole,
    holderAuthorizedKai: submission.eventKai,
    issuerAuthorizedKai: issue.eventKai,
    registryDigest: state.registryDigest,
    domainDigest: state.domainDigest,
    claimRoot: claimTree.root,
    claimSetDigest: state.claimSetDigest,
    claimSetHead: state.claimSetHead,
    applicationId: state.applicationId,
    applicationDigest: genesis.applicationDigest,
    applicationHead,
    evidenceBundleDigest: state.evidenceBundleDigest,
    evidenceHead: state.evidenceBundleHead,
    evaluationDigest: evaluation?.payload.schema === "receiz.attestation.evaluation.v125"
      ? evaluation.payload.evaluationDigest : null,
    reviewDigest: review?.payload.schema === "receiz.attestation.review.v125" ? review.payload.reviewDigest : null,
    approvalDigests: freeze(approvals.map((approval) => approval.approvalDigest)),
    approverReceizIds: freeze(approvals.map((approval) => approval.approverReceizId)),
    issuanceDigest,
    decisionHead: issue.eventDigest,
    issuedKai, validFromKai, expiresAtKai,
    predecessorCredentialId,
    predecessorLifecycleHead: predecessorLifecycle.head,
    predecessorLifecycleKai: predecessorLifecycle.kai,
    predecessorLifecycleIntentDigest: predecessorLifecycle.intentDigest,
    successorCredentialId: null,
    holderAuthorization,
    issuerAuthorization,
    custody: freeze({ holderReceizId, custodyHead }),
    provenance: freeze({
      applicationId: state.applicationId,
      applicationDigest: genesis.applicationDigest,
      applicationHead,
      attestationHistoryRoot: await attestationHistoryRoot(genesis, state.history),
    }),
    authority: freeze({
      strongerTruth: "sealed-receiz-proof-object" as const,
      currentnessProjectionIsAuthority: false as const,
    }),
  });
  return sealCredentialBasis(basis);
}

export async function createReceizCredentialV125(
  input: ReceizCredentialIssuanceInputV125,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizCredentialV125> { return zeroWriteBoundary(() => createCredential(input, authority)); }

async function parseCredential(
  value: unknown,
  domainValue: unknown,
  attestationAuthority: ReceizAttestationAuthorityV125,
): Promise<ReceizCredentialV125> {
  const record = closedRecord(value, CREDENTIAL_KEYS, "V125_CREDENTIAL_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.credential.v125") fail("V125_CREDENTIAL_SCHEMA_INVALID");
  const domain = parseReceizAttestationDomainV125(domainValue);
  const credentialId = digest(record.credentialId, "V125_CREDENTIAL_ID_INVALID");
  const domainId = name(record.domainId, "V125_CREDENTIAL_DOMAIN_INVALID");
  const credentialType = name(record.credentialType, "V125_CREDENTIAL_TYPE_INVALID");
  const issuedKai = kai(record.issuedKai, "V125_CREDENTIAL_KAI_INVALID");
  const validFromKai = kai(record.validFromKai, "V125_CREDENTIAL_KAI_INVALID");
  const expiresAtKai = record.expiresAtKai === null ? null : kai(record.expiresAtKai, "V125_CREDENTIAL_KAI_INVALID");
  const predecessorCredentialId = nullableDigest(record.predecessorCredentialId, "V125_CREDENTIAL_PREDECESSOR_INVALID");
  const predecessorLifecycleHead = nullableDigest(
    record.predecessorLifecycleHead,
    "V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_INVALID",
  );
  const predecessorLifecycleKai = record.predecessorLifecycleKai === null
    ? null
    : kai(record.predecessorLifecycleKai, "V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_INVALID");
  const predecessorLifecycleIntentDigest = nullableDigest(
    record.predecessorLifecycleIntentDigest,
    "V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_INVALID",
  );
  if (domainId !== domain.domainId || !domain.credentialTypes.includes(credentialType)
    || record.registryDigest !== domain.registryDigest || BigInt(validFromKai) < BigInt(issuedKai)
    || (expiresAtKai !== null && BigInt(expiresAtKai) < BigInt(validFromKai))) fail("V125_CREDENTIAL_DOMAIN_MISMATCH");
  if ((predecessorCredentialId === null) !== (predecessorLifecycleHead === null)
    || (predecessorCredentialId === null) !== (predecessorLifecycleKai === null)
    || (predecessorCredentialId === null) !== (predecessorLifecycleIntentDigest === null)
    || (predecessorLifecycleKai !== null && BigInt(issuedKai) < BigInt(predecessorLifecycleKai))) {
    fail("V125_CREDENTIAL_PREDECESSOR_LIFECYCLE_INVALID");
  }
  const holderReceizId = receizId(record.holderReceizId, "V125_CREDENTIAL_HOLDER_INVALID");
  const issuerReceizId = receizId(record.issuerReceizId, "V125_CREDENTIAL_ISSUER_INVALID");
  const holderRole = name(record.holderRole, "V125_CREDENTIAL_HOLDER_ROLE_INVALID");
  const issuerRole = name(record.issuerRole, "V125_CREDENTIAL_ISSUER_ROLE_INVALID");
  const holderAuthorizedKai = kai(record.holderAuthorizedKai, "V125_CREDENTIAL_HOLDER_AUTHORIZATION_KAI_INVALID");
  const issuerAuthorizedKai = kai(record.issuerAuthorizedKai, "V125_CREDENTIAL_ISSUER_AUTHORIZATION_KAI_INVALID");
  if (issuerAuthorizedKai !== issuedKai || BigInt(holderAuthorizedKai) > BigInt(issuerAuthorizedKai)) {
    fail("V125_CREDENTIAL_AUTHORIZATION_KAI_MISMATCH");
  }
  const holderAuthorization = await verifyAuthorization(record.holderAuthorization, {
    actorReceizId: holderReceizId, actorRole: holderRole, requiredAction: "submitted",
    eventKai: holderAuthorizedKai, domain, credentialType,
  }, attestationAuthority);
  const issuerAuthorization = await verifyAuthorization(record.issuerAuthorization, {
    actorReceizId: issuerReceizId, actorRole: issuerRole, requiredAction: "issued",
    eventKai: issuerAuthorizedKai, domain, credentialType,
  }, attestationAuthority);
  const approvalDigests = freeze(exactArray(record.approvalDigests, "V125_CREDENTIAL_APPROVALS_INVALID")
    .map((entry) => digest(entry, "V125_CREDENTIAL_APPROVALS_INVALID")));
  const approverReceizIds = freeze(exactArray(record.approverReceizIds, "V125_CREDENTIAL_APPROVERS_INVALID")
    .map((entry) => receizId(entry, "V125_CREDENTIAL_APPROVERS_INVALID")));
  if (approvalDigests.length !== approverReceizIds.length || approvalDigests.length > 64
    || new Set(approvalDigests).size !== approvalDigests.length
    || new Set(approverReceizIds).size !== approverReceizIds.length) fail("V125_CREDENTIAL_APPROVALS_INVALID");
  for (let index = 1; index < approverReceizIds.length; index += 1) {
    if (approverReceizIds[index - 1]! >= approverReceizIds[index]!) fail("V125_CREDENTIAL_APPROVALS_INVALID");
  }
  const custodyRecord = closedRecord(record.custody, ["holderReceizId", "custodyHead"], "V125_CREDENTIAL_CUSTODY_INVALID");
  if (custodyRecord.holderReceizId !== holderReceizId) fail("V125_CREDENTIAL_CUSTODY_INVALID");
  const provenanceRecord = closedRecord(record.provenance,
    ["applicationId", "applicationDigest", "applicationHead", "attestationHistoryRoot"], "V125_CREDENTIAL_PROVENANCE_INVALID");
  const authority = closedRecord(record.authority,
    ["strongerTruth", "currentnessProjectionIsAuthority"], "V125_CREDENTIAL_AUTHORITY_INVALID");
  if (authority.strongerTruth !== "sealed-receiz-proof-object" || authority.currentnessProjectionIsAuthority !== false) {
    fail("V125_CREDENTIAL_AUTHORITY_INVALID");
  }
  const basis = freeze({
    schema: "receiz.credential.v125" as const,
    proofObjectId: text(record.proofObjectId, "V125_CREDENTIAL_PROOF_OBJECT_INVALID"),
    domainId, credentialType,
    subjectId: text(record.subjectId, "V125_CREDENTIAL_SUBJECT_INVALID"), holderReceizId, issuerReceizId,
    holderRole, issuerRole, holderAuthorizedKai, issuerAuthorizedKai,
    registryDigest: digest(record.registryDigest, "V125_CREDENTIAL_REGISTRY_INVALID"),
    domainDigest: digest(record.domainDigest, "V125_CREDENTIAL_DOMAIN_DIGEST_INVALID"),
    claimRoot: digest(record.claimRoot, "V125_CREDENTIAL_CLAIM_ROOT_INVALID"),
    claimSetDigest: digest(record.claimSetDigest, "V125_CREDENTIAL_CLAIM_SET_INVALID"),
    claimSetHead: digest(record.claimSetHead, "V125_CREDENTIAL_CLAIM_SET_HEAD_INVALID"),
    applicationId: text(record.applicationId, "V125_CREDENTIAL_APPLICATION_INVALID", 256),
    applicationDigest: digest(record.applicationDigest, "V125_CREDENTIAL_APPLICATION_INVALID"),
    applicationHead: digest(record.applicationHead, "V125_CREDENTIAL_APPLICATION_HEAD_INVALID"),
    evidenceBundleDigest: digest(record.evidenceBundleDigest, "V125_CREDENTIAL_EVIDENCE_INVALID"),
    evidenceHead: digest(record.evidenceHead, "V125_CREDENTIAL_EVIDENCE_INVALID"),
    evaluationDigest: nullableDigest(record.evaluationDigest, "V125_CREDENTIAL_EVALUATION_INVALID"),
    reviewDigest: nullableDigest(record.reviewDigest, "V125_CREDENTIAL_REVIEW_INVALID"),
    approvalDigests, approverReceizIds,
    issuanceDigest: digest(record.issuanceDigest, "V125_CREDENTIAL_ISSUANCE_INVALID"),
    decisionHead: digest(record.decisionHead, "V125_CREDENTIAL_DECISION_INVALID"),
    issuedKai, validFromKai, expiresAtKai,
    predecessorCredentialId,
    predecessorLifecycleHead,
    predecessorLifecycleKai,
    predecessorLifecycleIntentDigest,
    successorCredentialId: record.successorCredentialId === null ? null : fail("V125_CREDENTIAL_SUCCESSOR_IMMUTABLE"),
    holderAuthorization,
    issuerAuthorization,
    custody: freeze({ holderReceizId, custodyHead: digest(custodyRecord.custodyHead, "V125_CREDENTIAL_CUSTODY_INVALID") }),
    provenance: freeze({
      applicationId: text(provenanceRecord.applicationId, "V125_CREDENTIAL_PROVENANCE_INVALID", 256),
      applicationDigest: digest(provenanceRecord.applicationDigest, "V125_CREDENTIAL_PROVENANCE_INVALID"),
      applicationHead: digest(provenanceRecord.applicationHead, "V125_CREDENTIAL_PROVENANCE_INVALID"),
      attestationHistoryRoot: digest(provenanceRecord.attestationHistoryRoot, "V125_CREDENTIAL_PROVENANCE_INVALID"),
    }),
    authority: freeze({ strongerTruth: "sealed-receiz-proof-object" as const, currentnessProjectionIsAuthority: false as const }),
  });
  if (basis.applicationHead !== basis.decisionHead
    || basis.provenance.applicationId !== basis.applicationId
    || basis.provenance.applicationDigest !== basis.applicationDigest
    || basis.provenance.applicationHead !== basis.applicationHead) fail("V125_CREDENTIAL_BINDING_MISMATCH");
  const exactDomainDigest = await authorityDigest("registry", domain.schema, domain);
  if (basis.domainDigest !== exactDomainDigest) fail("V125_CREDENTIAL_DOMAIN_MISMATCH");
  const sealed = await sealCredentialBasis(basis);
  if (sealed.credentialId !== credentialId
    || sealed.acceptedHead !== digest(record.acceptedHead, "V125_CREDENTIAL_HEAD_INVALID")
    || sealed.historyRoot !== digest(record.historyRoot, "V125_CREDENTIAL_HISTORY_ROOT_INVALID")) {
    fail("V125_CREDENTIAL_IDENTITY_MISMATCH");
  }
  return sealed;
}

async function verifyCredentialProjection(
  value: unknown,
  issuanceValue: unknown,
  authority: ReceizAttestationAuthorityV125,
): Promise<Readonly<{
  credential: ReceizCredentialV125;
  issuance: ReceizCredentialIssuanceInputV125;
  domain: ReceizAttestationDomainV125;
}>> {
  const issuanceRecord = closedRecord(issuanceValue, [
    "attestation", "proofObjectId", "predecessorCredentialId", "custodyHead", "predecessorLifecycle",
  ], "V125_CREDENTIAL_ISSUANCE_INPUT_INVALID");
  const admission = await verifyReceizAttestationIssuanceEvidenceV125(
    issuanceRecord.attestation as ReceizAttestationIssuanceEvidenceV125,
    authority,
  );
  const issuance = freeze({
    attestation: freeze({
      domain: admission.domain,
      genesis: admission.genesis,
      events: admission.events,
    }),
    proofObjectId: text(issuanceRecord.proofObjectId, "V125_CREDENTIAL_PROOF_OBJECT_INVALID"),
    predecessorCredentialId: nullableDigest(
      issuanceRecord.predecessorCredentialId,
      "V125_CREDENTIAL_PREDECESSOR_INVALID",
    ),
    custodyHead: digest(issuanceRecord.custodyHead, "V125_CREDENTIAL_CUSTODY_INVALID"),
    predecessorLifecycle: issuanceRecord.predecessorLifecycle as ReceizCredentialPredecessorLifecycleAdmissionV125 | null,
  });
  const expected = await createCredential(issuance, authority);
  const parsed = await parseCredential(value, admission.domain, authority);
  if (!await sameDigestable(parsed, expected)) fail("V125_CREDENTIAL_ISSUANCE_PROJECTION_MISMATCH");
  return freeze({ credential: expected, issuance, domain: admission.domain });
}

function parseKind(value: unknown): ReceizCredentialLifecycleEventKindV125 {
  if (typeof value !== "string" || !KINDS.includes(value as ReceizCredentialLifecycleEventKindV125)) {
    fail("V125_CREDENTIAL_LIFECYCLE_KIND_INVALID");
  }
  return value as ReceizCredentialLifecycleEventKindV125;
}

function lifecycleAllowed(domain: ReceizAttestationDomainV125, kind: ReceizCredentialLifecycleEventKindV125): boolean {
  switch (kind) {
    case "renewed": return domain.lifecycle.renewable;
    case "suspended": return domain.lifecycle.suspendable;
    case "revoked": return domain.lifecycle.revocable;
    case "replaced": return domain.lifecycle.replaceable;
    case "expired": return true;
  }
}

async function verifySuccessorIssuanceCore(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  credential: ReceizCredentialV125,
  eventKai: string,
  authority: ReceizAttestationAuthorityV125,
): Promise<Readonly<{
  core: ReceizCredentialIssuanceCoreV125;
  intentDigest: string;
}>> {
  const record = closedRecord(value, [
    "attestation", "proofObjectId", "predecessorCredentialId", "custodyHead",
  ], "V125_CREDENTIAL_SUCCESSOR_INVALID");
  const admission = await verifyReceizAttestationIssuanceEvidenceV125(
    record.attestation as ReceizAttestationIssuanceEvidenceV125,
    authority,
  );
  const issue = issuedEvent(admission.state);
  const submission = submittedEvent(admission.state);
  const proofObjectId = text(record.proofObjectId, "V125_CREDENTIAL_SUCCESSOR_INVALID");
  const predecessorCredentialId = nullableDigest(
    record.predecessorCredentialId,
    "V125_CREDENTIAL_SUCCESSOR_INVALID",
  );
  const core = freeze({
    attestation: freeze({
      domain: admission.domain,
      genesis: admission.genesis,
      events: admission.events,
    }),
    proofObjectId,
    predecessorCredentialId,
    custodyHead: digest(record.custodyHead, "V125_CREDENTIAL_SUCCESSOR_INVALID"),
  });
  if (predecessorCredentialId !== credential.credentialId
    || proofObjectId === credential.proofObjectId
    || admission.domain.domainId !== domain.domainId
    || admission.state.domainId !== credential.domainId
    || admission.state.credentialType !== credential.credentialType
    || admission.state.subjectId !== credential.subjectId
    || admission.state.applicantReceizId !== credential.holderReceizId
    || submission.actorReceizId !== credential.holderReceizId
    || BigInt(issue.eventKai) < BigInt(eventKai)
    || BigInt(admission.state.claimSet.validFromKai) < BigInt(eventKai)) {
    fail("V125_CREDENTIAL_SUCCESSOR_BINDING_MISMATCH");
  }
  return freeze({ core, intentDigest: await successorIntentDigest(core) });
}

async function createEvent(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  credential: ReceizCredentialV125,
  authority: ReceizAttestationAuthorityV125,
) {
  const record = closedRecord(value, [
    "kind", "credentialId", "domainId", "credentialType", "actorReceizId", "actorRole", "actorAuthorization",
    "actorProof", "expectedPriorHead", "eventKai", "idempotencyKey", "successor",
  ], "V125_CREDENTIAL_EVENT_INPUT_INVALID");
  const kind = parseKind(record.kind);
  if (!lifecycleAllowed(domain, kind)) fail("V125_CREDENTIAL_LIFECYCLE_FORBIDDEN");
  const credentialId = digest(record.credentialId, "V125_CREDENTIAL_ID_INVALID");
  const domainId = name(record.domainId, "V125_CREDENTIAL_DOMAIN_INVALID");
  const credentialType = name(record.credentialType, "V125_CREDENTIAL_TYPE_INVALID");
  if (credentialId !== credential.credentialId || domainId !== credential.domainId
    || credentialType !== credential.credentialType) fail("V125_CREDENTIAL_EVENT_COORDINATE_MISMATCH");
  const actorReceizId = receizId(record.actorReceizId, "V125_CREDENTIAL_ACTOR_INVALID");
  const actorRole = name(record.actorRole, "V125_CREDENTIAL_ACTOR_ROLE_INVALID");
  const eventKai = kai(record.eventKai, "V125_CREDENTIAL_EVENT_KAI_INVALID");
  const expectedPriorHead = digest(record.expectedPriorHead, "V125_CREDENTIAL_EXPECTED_HEAD_INVALID");
  const requiredAction = kind === "expired" ? "expired" : "issued";
  const role = domain.actorRoles.find((candidate) => candidate.role === actorRole);
  if (!role?.allowedActions.includes(requiredAction)) fail("V125_CREDENTIAL_ACTION_UNAUTHORIZED");
  const actorAuthorization = await verifyAuthorization(record.actorAuthorization, {
    actorReceizId, actorRole, requiredAction, eventKai, domain, credentialType,
  }, authority);
  let successorIntent: string | null = null;
  let successorProofObjectId: string | null = null;
  let successorIssuanceCore: ReceizCredentialIssuanceCoreV125 | null = null;
  if (kind === "renewed" || kind === "replaced") {
    if (record.successor === null) fail("V125_CREDENTIAL_SUCCESSOR_REQUIRED");
    const verifiedSuccessor = await verifySuccessorIssuanceCore(
      record.successor,
      domain,
      credential,
      eventKai,
      authority,
    );
    successorIntent = verifiedSuccessor.intentDigest;
    successorProofObjectId = verifiedSuccessor.core.proofObjectId;
    successorIssuanceCore = verifiedSuccessor.core;
  } else if (record.successor !== null) fail("V125_CREDENTIAL_SUCCESSOR_FORBIDDEN");
  const idempotencyKey = text(record.idempotencyKey, "V125_CREDENTIAL_IDEMPOTENCY_INVALID", 256);
  const actorProof = await verifyLifecycleActorProof(
    record.actorProof,
    actorAuthorization,
    credentialLifecycleAuthorshipChallengeB64u({
      kind,
      credentialId,
      domainId,
      credentialType,
      actorReceizId,
      actorRole,
      actorAuthorization,
      expectedPriorHead,
      eventKai,
      idempotencyKey,
      successor: successorIssuanceCore,
    }),
  );
  const basis = freeze({
    schema: "receiz.credential.lifecycle-event.v125" as const,
    kind, credentialId, domainId, credentialType, actorReceizId, actorRole, actorAuthorization, actorProof,
    expectedPriorHead,
    eventKai,
    idempotencyKey,
    successorIntentDigest: successorIntent,
    successorProofObjectId,
    successorIssuanceCore,
  });
  return freeze({ ...basis, eventDigest: await authorityDigest("event", basis.schema, basis) });
}

async function parseEvent(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  credential: ReceizCredentialV125,
  authority: ReceizAttestationAuthorityV125,
) {
  const record = closedRecord(value, [
    "schema", "kind", "credentialId", "domainId", "credentialType", "actorReceizId", "actorRole",
    "actorAuthorization", "actorProof", "expectedPriorHead", "eventKai", "idempotencyKey", "successorIntentDigest",
    "successorProofObjectId", "successorIssuanceCore", "eventDigest",
  ], "V125_CREDENTIAL_EVENT_INVALID");
  if (record.schema !== "receiz.credential.lifecycle-event.v125") fail("V125_CREDENTIAL_EVENT_INVALID");
  const kind = parseKind(record.kind);
  if (!lifecycleAllowed(domain, kind)) fail("V125_CREDENTIAL_LIFECYCLE_FORBIDDEN");
  const requiredAction = kind === "expired" ? "expired" : "issued";
  const actorReceizId = receizId(record.actorReceizId, "V125_CREDENTIAL_ACTOR_INVALID");
  const actorRole = name(record.actorRole, "V125_CREDENTIAL_ACTOR_ROLE_INVALID");
  const eventKai = kai(record.eventKai, "V125_CREDENTIAL_EVENT_KAI_INVALID");
  const role = domain.actorRoles.find((candidate) => candidate.role === actorRole);
  if (!role?.allowedActions.includes(requiredAction)) fail("V125_CREDENTIAL_ACTION_UNAUTHORIZED");
  let successorIntent: string | null = null;
  let successorProofObjectId: string | null = null;
  let successorIssuanceCore: ReceizCredentialIssuanceCoreV125 | null = null;
  if (record.successorIssuanceCore !== null) {
    const verifiedSuccessor = await verifySuccessorIssuanceCore(
      record.successorIssuanceCore,
      domain,
      credential,
      eventKai,
      authority,
    );
    successorIntent = verifiedSuccessor.intentDigest;
    successorProofObjectId = verifiedSuccessor.core.proofObjectId;
    successorIssuanceCore = verifiedSuccessor.core;
  }
  const actorAuthorization = await verifyAuthorization(record.actorAuthorization, {
    actorReceizId, actorRole, requiredAction, eventKai, domain, credentialType: credential.credentialType,
  }, authority);
  const credentialId = digest(record.credentialId, "V125_CREDENTIAL_ID_INVALID");
  const domainId = name(record.domainId, "V125_CREDENTIAL_DOMAIN_INVALID");
  const credentialType = name(record.credentialType, "V125_CREDENTIAL_TYPE_INVALID");
  const expectedPriorHead = digest(record.expectedPriorHead, "V125_CREDENTIAL_EXPECTED_HEAD_INVALID");
  const idempotencyKey = text(record.idempotencyKey, "V125_CREDENTIAL_IDEMPOTENCY_INVALID", 256);
  const actorProof = await verifyLifecycleActorProof(
    record.actorProof,
    actorAuthorization,
    credentialLifecycleAuthorshipChallengeB64u({
      kind,
      credentialId,
      domainId,
      credentialType,
      actorReceizId,
      actorRole,
      actorAuthorization,
      expectedPriorHead,
      eventKai,
      idempotencyKey,
      successor: successorIssuanceCore,
    }),
  );
  const basis = freeze({
    schema: "receiz.credential.lifecycle-event.v125" as const,
    kind,
    credentialId,
    domainId,
    credentialType,
    actorReceizId, actorRole,
    actorAuthorization,
    actorProof,
    expectedPriorHead,
    eventKai,
    idempotencyKey,
    successorIntentDigest: nullableDigest(record.successorIntentDigest, "V125_CREDENTIAL_SUCCESSOR_INVALID"),
    successorProofObjectId: record.successorProofObjectId === null
      ? null
      : text(record.successorProofObjectId, "V125_CREDENTIAL_SUCCESSOR_INVALID"),
    successorIssuanceCore,
  });
  if (basis.credentialId !== credential.credentialId || basis.domainId !== credential.domainId
    || basis.credentialType !== credential.credentialType) fail("V125_CREDENTIAL_EVENT_COORDINATE_MISMATCH");
  const hasSuccessor = kind === "renewed" || kind === "replaced";
  if (hasSuccessor !== (basis.successorIntentDigest !== null
    && basis.successorProofObjectId !== null
    && basis.successorIssuanceCore !== null)) {
    fail("V125_CREDENTIAL_SUCCESSOR_BINDING_MISMATCH");
  }
  if (hasSuccessor && (basis.successorIntentDigest !== successorIntent
    || basis.successorProofObjectId !== successorProofObjectId)) {
    fail("V125_CREDENTIAL_SUCCESSOR_BINDING_MISMATCH");
  }
  const eventDigest = digest(record.eventDigest, "V125_CREDENTIAL_EVENT_DIGEST_INVALID");
  if (eventDigest !== await authorityDigest("event", basis.schema, basis)) fail("V125_CREDENTIAL_EVENT_DIGEST_MISMATCH");
  return freeze({ ...basis, eventDigest });
}

type Working = {
  status: ReceizCredentialStatusV125;
  acceptedHead: string;
  latestKai: string;
  successorIntentDigest: string | null;
};

function transition(
  domain: ReceizAttestationDomainV125,
  credential: ReceizCredentialV125,
  state: Working,
  event: ReceizCredentialLifecycleEventV125,
): Working {
  if (state.status === "revoked" || state.status === "replaced" || state.status === "expired") {
    fail("V125_CREDENTIAL_TERMINAL_STATE");
  }
  if (event.kind !== "expired" && credential.expiresAtKai !== null
    && BigInt(event.eventKai) >= BigInt(credential.expiresAtKai)) fail("V125_CREDENTIAL_EXPIRED");
  if (!lifecycleAllowed(domain, event.kind)) fail("V125_CREDENTIAL_LIFECYCLE_FORBIDDEN");
  if (event.kind === "expired") {
    if (credential.expiresAtKai === null || BigInt(event.eventKai) < BigInt(credential.expiresAtKai)) {
      fail("V125_CREDENTIAL_NOT_EXPIRED");
    }
    return { status: "expired", acceptedHead: event.eventDigest, latestKai: event.eventKai, successorIntentDigest: null };
  }
  if (event.kind === "suspended") {
    if (state.status === "suspended") fail("V125_CREDENTIAL_ALREADY_SUSPENDED");
    return { status: "suspended", acceptedHead: event.eventDigest, latestKai: event.eventKai, successorIntentDigest: null };
  }
  if (event.kind === "revoked") {
    return { status: "revoked", acceptedHead: event.eventDigest, latestKai: event.eventKai, successorIntentDigest: null };
  }
  return {
    status: "replaced", acceptedHead: event.eventDigest, latestKai: event.eventKai,
    successorIntentDigest: event.successorIntentDigest,
  };
}

async function verifyHistory(
  input: unknown,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizCredentialHistoryV125> {
  const record = closedRecord(input, ["issuance", "credential", "events"], "V125_CREDENTIAL_HISTORY_INPUT_INVALID");
  const verifiedCredential = await verifyCredentialProjection(record.credential, record.issuance, authority);
  const { credential, domain } = verifiedCredential;
  const values = exactArray(record.events, "V125_CREDENTIAL_HISTORY_INVALID");
  if (values.length > MAX_HISTORY) fail("V125_CREDENTIAL_HISTORY_LIMIT");
  let working: Working = {
    status: "issued", acceptedHead: credential.acceptedHead,
    latestKai: credential.issuedKai, successorIntentDigest: null,
  };
  const events: ReceizCredentialLifecycleEventV125[] = [];
  const digests = new Set<string>();
  const keys = new Set<string>();
  for (const value of values) {
    const event = await parseEvent(value, domain, credential, authority);
    if (digests.has(event.eventDigest)) fail("V125_CREDENTIAL_EVENT_REPLAY");
    if (keys.has(event.idempotencyKey)) fail("V125_CREDENTIAL_IDEMPOTENCY_REPLAY");
    if (event.expectedPriorHead !== working.acceptedHead) fail("V125_CREDENTIAL_STALE_HEAD");
    if (BigInt(event.eventKai) < BigInt(working.latestKai)) fail("V125_CREDENTIAL_EVENT_KAI_NONCAUSAL");
    working = transition(domain, credential, working, event);
    events.push(event); digests.add(event.eventDigest); keys.add(event.idempotencyKey);
  }
  const historyRoot = await authorityDigest("history", "receiz.credential.history-root.v125", {
    credentialId: credential.credentialId, eventDigests: events.map((event) => event.eventDigest),
  });
  return freeze({
    schema: "receiz.credential.history.v125" as const,
    domain, credential, credentialId: credential.credentialId,
    status: working.status, acceptedHead: working.acceptedHead, historyRoot,
    latestKai: working.latestKai, successorIntentDigest: working.successorIntentDigest,
    events: freeze(events),
    authority: freeze({ projectionIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
}

export async function verifyReceizCredentialHistoryV125(input: Readonly<{
  issuance: ReceizCredentialIssuanceInputV125;
  credential: ReceizCredentialV125;
  events: readonly ReceizCredentialLifecycleEventV125[];
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialHistoryV125> {
  return zeroWriteBoundary(() => verifyHistory(input, authority));
}

function decodeCanonicalCredentialArtifactPayload(bytes: Uint8Array): unknown {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const canonical = new TextEncoder().encode(canonicalizeReceizV122(decoded));
    if (canonical.byteLength !== bytes.byteLength
      || canonical.some((byte, index) => byte !== bytes[index])) {
      fail("V125_CREDENTIAL_PAYLOAD_NONCANONICAL");
    }
  } catch {
    fail("V125_CREDENTIAL_PAYLOAD_INVALID");
  }
  return decoded;
}

export async function verifyAndOpenReceizCredentialArtifactV125(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizOpenedCredentialArtifactV125> {
  const code = "V125_CREDENTIAL_ENCLOSING_PROOF_INVALID";
  let record: Readonly<Record<string, unknown>>;
  try { record = closedRecord(input, ["artifact", "verifier"], code); }
  catch { throw new TypeError(code); }
  const opened = await openVerifiedReceizV125ArtifactPayload({
    artifact: record.artifact as ReceizPortableSealedArtifactV124,
    verifier: record.verifier as ReceizV125EnclosingArtifactVerifierOptions,
    expectedPayloadMimeType: "application/vnd.receiz.credential+json",
    enclosingProofError: code,
    payloadError: "V125_CREDENTIAL_PAYLOAD_INVALID",
  }, async (bytes, binding) => {
    const payload = closedRecord(decodeCanonicalCredentialArtifactPayload(bytes), [
      "issuance", "credential", "events",
    ], "V125_CREDENTIAL_PAYLOAD_INVALID");
    const history = await verifyReceizCredentialHistoryV125({
      issuance: payload.issuance as ReceizCredentialIssuanceInputV125,
      credential: payload.credential as ReceizCredentialV125,
      events: [...payload.events as readonly ReceizCredentialLifecycleEventV125[],
        ...await readReceizLifecycleAdditionsV125<ReceizCredentialLifecycleEventV125>(binding, "credential", input.verifier)],
    }, authority);
    const admission = readReceizV125BindingAdmission(binding);
    const initialNodes = admission.proofHistory?.nodes.filter((node) => node.receipt !== null
      && typeof node.receipt === "object" && !Array.isArray(node.receipt)
      && node.receipt.schema === "receiz.initial-source.v125") ?? [];
    if (initialNodes.length > 1) fail("V125_CREDENTIAL_INITIAL_SOURCE_INVALID");
    if (initialNodes.length === 1) {
      const initial = initialNodes[0]!;
      const receipt = initial.receipt as { operation?: unknown; sourceBindings?: { issuanceSource?: ReceizPortableSealedArtifactV124;
        issuanceArtifactSha256?: unknown; issuanceProofObjectId?: unknown; acceptedIssuanceHistoryHead?: unknown; acceptedApplicationHead?: unknown } };
      const source = receipt.sourceBindings;
      if (initial.parentDigests.length !== 0 || receipt.operation !== "credential.create" || !source?.issuanceSource) fail("V125_CREDENTIAL_INITIAL_SOURCE_INVALID");
      const issued = await verifyAndOpenReceizAttestationArtifactV125({ artifact: source.issuanceSource, verifier: input.verifier }, authority);
      const sourceBinding = await openVerifiedReceizV125ArtifactPayloadBytes({ artifact: source.issuanceSource, verifier: input.verifier,
        enclosingProofError: "V125_CREDENTIAL_ISSUANCE_SOURCE_INVALID", payloadError: "V125_CREDENTIAL_ISSUANCE_SOURCE_INVALID" });
      const sourceAdmission = readReceizV125BindingAdmission(sourceBinding);
      const issuance = payload.issuance as ReceizCredentialIssuanceInputV125;
      if (issued.state.status !== "issued" || issued.ownerReceizId !== history.credential.holderReceizId
        || issued.artifactSha256 !== source.issuanceArtifactSha256 || issued.proofObjectId !== source.issuanceProofObjectId
        || issued.acceptedHead !== source.acceptedApplicationHead || issuance.proofObjectId !== issued.proofObjectId
        || issuance.custodyHead !== source.acceptedIssuanceHistoryHead || !sourceAdmission.proofHistory
        || sourceAdmission.proofHistory.headDigests.length !== 1
        || sourceAdmission.proofHistory.headDigests[0] !== issuance.custodyHead
        || sourceAdmission.proofHistory.currentOwnerReceizId !== history.credential.holderReceizId
        || canonicalizeReceizV122(issuance.attestation) !== canonicalizeReceizV122({ domain: issued.domain, genesis: issued.genesis, events: issued.state.history })) {
        fail("V125_CREDENTIAL_ISSUANCE_SOURCE_MISMATCH");
      }
      const sourceNode = sourceAdmission.proofHistory.nodes.find((node) => node.nodeDigest === issuance.custodyHead)!;
      const sourceKai = await admitReceizKksV1ProofCoordinate(sourceNode.namespaceData["receiz.kks-v1"]);
      const initialKai = await admitReceizKksV1ProofCoordinate(initial.namespaceData["receiz.kks-v1"], { expectedPreviousKaiSigilProofHead: null });
      if (BigInt(initialKai.kaiUpulse) < BigInt(sourceKai.kaiUpulse) || BigInt(initialKai.kaiUpulse) < BigInt(issued.state.latestKai)) fail("V125_CREDENTIAL_ISSUANCE_KAI_NONCAUSAL");
    }
    if (binding.ownerReceizId !== history.credential.holderReceizId
      || binding.ownerReceizId !== history.credential.custody.holderReceizId
      || binding.provenance.root !== history.credential.proofObjectId) {
      fail("V125_CREDENTIAL_ARTIFACT_BINDING_MISMATCH");
    }
    return { history, issuance: payload.issuance as ReceizCredentialIssuanceInputV125 };
  });
  return freeze({
    schema: "receiz.opened-credential-artifact.v125" as const,
    artifactSha256: opened.artifactSha256,
    artifactPayloadSha256: opened.artifactPayloadSha256,
    proofObjectId: opened.proofObjectId,
    ownerReceizId: opened.ownerReceizId,
    ownership: opened.ownership,
    provenance: opened.provenance,
    acceptedHead: opened.projection.history.acceptedHead,
    history: opened.projection.history,
    issuance: opened.projection.issuance,
    authority: freeze({
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

async function makePlan(event: ReceizCredentialLifecycleEventV125, transitionPlan?: ReceizArtifactAppendPlan): Promise<ReceizCredentialLifecycleEventPlanV125> {
  const planIdentity = await authorityDigest("plan", "receiz.credential.lifecycle-plan.v125", { event, ...(transitionPlan ? { transitionPlanDigest: transitionPlan.planDigest.value } : {}) });
  const confirmationDigest = await authorityDigest("confirmation", "receiz.credential.lifecycle-confirmation.v125", {
    planIdentity, eventDigest: event.eventDigest,
  });
  return freeze({
    schema: "receiz.credential.lifecycle-plan.v125" as const,
    ...(transitionPlan ? { transitionPlan } : {}),
    event, planIdentity, confirmationDigest, confirmationRequired: true as const, writesPerformed: 0 as const,
    authority: freeze({ planIsAdmission: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
}

async function planEvent(input: unknown, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialLifecycleEventPlanV125> {
  const record = closedRecord(input, ["issuance", "credential", "events", "event"], "V125_CREDENTIAL_PLAN_INPUT_INVALID");
  const verifiedCredential = await verifyCredentialProjection(record.credential, record.issuance, authority);
  const { credential, domain } = verifiedCredential;
  const prior = exactArray(record.events, "V125_CREDENTIAL_HISTORY_INVALID") as readonly ReceizCredentialLifecycleEventV125[];
  const state = await verifyHistory({ issuance: verifiedCredential.issuance, credential, events: prior }, authority);
  const event = await createEvent(record.event, domain, credential, authority);
  if (event.expectedPriorHead !== state.acceptedHead) fail("V125_CREDENTIAL_STALE_HEAD");
  if (state.events.some((candidate) => candidate.eventDigest === event.eventDigest)) fail("V125_CREDENTIAL_EVENT_REPLAY");
  if (state.events.some((candidate) => candidate.idempotencyKey === event.idempotencyKey)) {
    fail("V125_CREDENTIAL_IDEMPOTENCY_REPLAY");
  }
  if (BigInt(event.eventKai) < BigInt(state.latestKai)) fail("V125_CREDENTIAL_EVENT_KAI_NONCAUSAL");
  transition(domain, credential, {
    status: state.status, acceptedHead: state.acceptedHead,
    latestKai: state.latestKai, successorIntentDigest: state.successorIntentDigest,
  }, event);
  return makePlan(event);
}

export async function planReceizCredentialLifecycleEventV125(input: Readonly<{
  sealedSource?: ReceizSealedLifecycleContextV125;
  issuance: ReceizCredentialIssuanceInputV125;
  credential: ReceizCredentialV125;
  events: readonly ReceizCredentialLifecycleEventV125[];
  event: ReceizCredentialLifecycleEventInputV125;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialLifecycleEventPlanV125> {
  return zeroWriteBoundary(async () => {
    closedRecord(input, ["issuance", "credential", "events", "event", ...(Object.prototype.hasOwnProperty.call(input, "sealedSource") ? ["sealedSource"] : [])], "V125_CREDENTIAL_PLAN_INPUT_INVALID");
    const { sealedSource, ...draft } = input;
    if (!sealedSource) return planEvent(draft, authority);
    const context = structuredClone(sealedSource);
    const { opened } = await readReceizLifecyclePayloadV125(context);
    const source = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(opened.payloadBytes));
    const projected = await verifyAndOpenReceizCredentialArtifactV125({ artifact: context.sourceArtifact, verifier: context.verifier }, authority);
    source.events = projected.history.events;
    if (canonicalizeReceizV122(source) !== canonicalizeReceizV122({ issuance: input.issuance, credential: input.credential, events: input.events })) fail("V125_CREDENTIAL_SOURCE_INPUT_MISMATCH");
    const pure = await planEvent(draft, authority);
    const transitionPlan = await planReceizSealedLifecycleV125(context, "credential", pure.event);
    const plan = await makePlan(pure.event, transitionPlan);
    retainReceizLifecyclePlanV125(plan, context, transitionPlan);
    return plan;
  });
}

export async function applyReceizCredentialLifecycleEventV125(input: ReceizSealedLifecycleExecutionV125 & Readonly<{
  issuance: ReceizCredentialIssuanceInputV125;
  credential: ReceizCredentialV125;
  events: readonly ReceizCredentialLifecycleEventV125[];
  plan: ReceizCredentialLifecycleEventPlanV125;
  confirmationDigest: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialLifecycleEventApplyV125> {
  return zeroWriteBoundary(async () => {
    const held = readReceizLifecyclePlanCustodyV125(input.plan);
    if (held) closedRecord(input, ["issuance", "credential", "events", "plan", "confirmationDigest", "capability", "sealer", "store"], "V125_CREDENTIAL_APPLY_INPUT_INVALID");
    if (!held || !input.capability || !input.sealer || !input.store) fail("V125_CREDENTIAL_SEALED_TRANSITION_REQUIRED");
    const expected = await makePlan(input.plan.event, held.transitionPlan);
    if (input.plan.planIdentity !== expected.planIdentity || input.confirmationDigest !== expected.confirmationDigest) fail("V125_CREDENTIAL_CONFIRMATION_MISMATCH");
    const { opened } = await readReceizLifecyclePayloadV125(held.context);
    const source = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(opened.payloadBytes));
    const prior = await verifyAndOpenReceizCredentialArtifactV125({ artifact: held.context.sourceArtifact, verifier: held.context.verifier }, authority);
    source.events = prior.history.events;
    if (canonicalizeReceizV122(source) !== canonicalizeReceizV122({ issuance: input.issuance, credential: input.credential, events: input.events })) fail("V125_CREDENTIAL_SOURCE_INPUT_MISMATCH");
    const result = await applyReceizSealedLifecycleV125(input.plan, input, (artifact, verifier) => verifyAndOpenReceizCredentialArtifactV125({ artifact, verifier }, authority));
    const state = result.projection.history;
    return freeze({ schema: "receiz.credential.lifecycle-apply.v125" as const,
      state, history: state.events, append: input.plan.event,
      sourceArtifact: result.sourceArtifact, committedTransition: result.committedTransition, writesPerformed: result.writesPerformed,
      authority: freeze({ applyIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }) });
  });
}

function currentness(
  status: ReceizCredentialCurrentnessStatusV125,
  credentialId: string,
  presentedHead: string,
  acceptedHead: string,
  credentialValid: boolean,
): ReceizCredentialCurrentnessV125 {
  return freeze({
    schema: "receiz.credential.currentness.v125" as const,
    status, credentialId, presentedHead, acceptedHead, credentialValid,
  });
}

export async function resolveReceizCredentialCurrentnessV125(input: Readonly<{
  issuance: ReceizCredentialIssuanceInputV125;
  credential: ReceizCredentialV125;
  verifiedHistory: ReceizCredentialHistoryV125;
  presentedHead: string;
  selectedKai: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizCredentialCurrentnessV125> {
  let credentialId = "invalid";
  let presentedHead = "invalid";
  let acceptedHead = "invalid";
  try {
    const record = closedRecord(input,
      ["issuance", "credential", "verifiedHistory", "presentedHead", "selectedKai"],
      "V125_CREDENTIAL_CURRENTNESS_INPUT_INVALID");
    const projection = closedRecord(record.verifiedHistory, [
      "schema", "domain", "credential", "credentialId", "status", "acceptedHead", "historyRoot", "latestKai",
      "successorIntentDigest", "events", "authority",
    ], "V125_CREDENTIAL_HISTORY_PROJECTION_INVALID");
    const verifiedCredential = await verifyCredentialProjection(record.credential, record.issuance, authority);
    const { credential, domain } = verifiedCredential;
    const projectionDomain = parseReceizAttestationDomainV125(projection.domain);
    const projectionCredential = await verifyCredentialProjection(
      projection.credential,
      verifiedCredential.issuance,
      authority,
    );
    const projectionAuthority = closedRecord(
      projection.authority,
      ["projectionIsProofAuthority", "strongerTruth"],
      "V125_CREDENTIAL_HISTORY_PROJECTION_INVALID",
    );
    credentialId = credential.credentialId;
    presentedHead = digest(record.presentedHead, "V125_CREDENTIAL_PRESENTED_HEAD_INVALID");
    acceptedHead = digest(projection.acceptedHead, "V125_CREDENTIAL_ACCEPTED_HEAD_INVALID");
    const verified = await verifyHistory({
      issuance: verifiedCredential.issuance, credential, events: projection.events,
    }, authority);
    if (projection.schema !== verified.schema
      || digest(projection.credentialId, "V125_CREDENTIAL_ID_INVALID") !== verified.credentialId
      || projection.status !== verified.status
      || acceptedHead !== verified.acceptedHead
      || digest(projection.historyRoot, "V125_CREDENTIAL_HISTORY_ROOT_INVALID") !== verified.historyRoot
      || kai(projection.latestKai, "V125_CREDENTIAL_KAI_INVALID") !== verified.latestKai
      || nullableDigest(projection.successorIntentDigest, "V125_CREDENTIAL_SUCCESSOR_INVALID")
        !== verified.successorIntentDigest
      || projectionAuthority.projectionIsProofAuthority !== false
      || projectionAuthority.strongerTruth !== "sealed-receiz-proof-object"
      || !await sameDigestable(projectionDomain, domain)
      || !await sameDigestable(projectionCredential.credential, credential)) {
      return currentness("invalid", credentialId, presentedHead, acceptedHead, false);
    }
    const selectedKai = kai(record.selectedKai, "V125_CREDENTIAL_SELECTED_KAI_INVALID");
    if (BigInt(selectedKai) < BigInt(credential.validFromKai)) {
      return currentness("invalid", credentialId, presentedHead, verified.acceptedHead, false);
    }
    const eligibleEvents: ReceizCredentialLifecycleEventV125[] = [];
    for (const event of verified.events) {
      if (BigInt(event.eventKai) > BigInt(selectedKai)) break;
      eligibleEvents.push(event);
    }
    const eligible = await verifyHistory({
      issuance: verifiedCredential.issuance,
      credential,
      events: eligibleEvents,
    }, authority);
    acceptedHead = eligible.acceptedHead;
    const acceptedHeads = [credential.acceptedHead, ...eligible.events.map((event) => event.eventDigest)];
    const presentedIndex = acceptedHeads.indexOf(presentedHead);
    const presentedKai = presentedIndex === 0
      ? credential.issuedKai
      : eligible.events[presentedIndex - 1]?.eventKai;
    if (presentedIndex < 0 || presentedKai === undefined
      || BigInt(selectedKai) < BigInt(presentedKai)) {
      return currentness("invalid", credentialId, presentedHead, acceptedHead, false);
    }
    if (presentedHead !== acceptedHead) {
      return currentness("head-behind", credentialId, presentedHead, acceptedHead, true);
    }
    if (eligible.status === "revoked" || eligible.status === "replaced") {
      return currentness(eligible.status, credentialId, presentedHead, acceptedHead, false);
    }
    if (credential.expiresAtKai !== null && BigInt(selectedKai) >= BigInt(credential.expiresAtKai)) {
      return currentness("expired", credentialId, presentedHead, acceptedHead, false);
    }
    if (eligible.status === "expired" || eligible.status === "suspended") {
      return currentness(eligible.status, credentialId, presentedHead, acceptedHead, false);
    }
    return currentness("current", credentialId, presentedHead, acceptedHead, true);
  } catch {
    return currentness("invalid", credentialId, presentedHead, acceptedHead, false);
  }
}
