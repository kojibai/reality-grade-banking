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
import { verifyReceizSubjectArtifactV1 } from "./livingSubjectRuntime.js";
import {
  decodeReceizSubjectNamespaceBytes,
  type ReceizSubjectArtifactV1,
} from "./livingSubjects.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { freeze } from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import {
  openVerifiedReceizV125ArtifactPayload,
  type ReceizV125EnclosingArtifactBinding,
  type ReceizV125EnclosingArtifactVerifierOptions,
} from "./v125ArtifactBinding.js";
import {
  verifyReceizAttestationEvidenceBundleAuthorityV125,
  verifyReceizAttestationRoleGrantAuthorityV125,
  type ReceizAttestationAuthorityV125,
  type ReceizAttestationRoleGrantV125,
} from "./v125AttestationAuthority.js";
import {
  parseReceizAttestationDomainV125,
  parseReceizClaimSetV125,
  parseReceizEvidenceBundleV125,
  type ReceizAttestationActorActionV125,
  type ReceizAttestationDomainV125,
  type ReceizClaimSetV125,
  type ReceizEvidenceBundleV125,
} from "./v125AttestationSchemas.js";

export type {
  ReceizV125EnclosingArtifactBinding,
  ReceizV125EnclosingArtifactVerifierOptions,
} from "./v125ArtifactBinding.js";
export {
  createReceizAttestationAuthorityV125,
  signReceizAttestationRoleGrantV125,
} from "./v125AttestationAuthority.js";
export type {
  ReceizAttestationAuthorityOptionsV125,
  ReceizAttestationAuthorityV125,
  ReceizAttestationDomainAuthorityProofV125,
  ReceizAttestationEvidenceArtifactV125,
  ReceizAttestationEvidenceReferenceV125,
  ReceizAttestationRoleGrantV125,
} from "./v125AttestationAuthority.js";

export type ReceizAttestationStatusV125 =
  | "draft" | "submitted" | "evidence_requested" | "evaluation_complete"
  | "review_complete" | "approval_pending" | "approval_complete"
  | "issued" | "denied" | "withdrawn" | "expired";

export type ReceizAttestationEventKindV125 = ReceizAttestationActorActionV125;

export type ReceizAttestationEvaluationRuleOutcomeV125 = Readonly<{
  ruleId: string;
  evidenceCount: number;
  satisfied: boolean;
  outcomeCode: string;
}>;

export type ReceizAttestationActorAuthorizationV125 = Readonly<{
  schema: "receiz.attestation.actor-authorization.v125";
  subjectArtifact: ReceizSubjectArtifactV1;
  proofObjectId: string;
  subjectArtifactDigest: string;
  acceptedSubjectHead: string;
  grantDigest: string;
  actorKeyId: string;
  actorKeyAlg: "Ed25519" | "P-256";
  actorPublicKeyRawB64u: string;
}>;

export type ReceizAttestationActorAuthorizationCoordinateV125 = Readonly<{
  actorReceizId: string;
  actorRole: string;
  kind: ReceizAttestationEventKindV125;
  eventKai: string;
  domain: ReceizAttestationDomainV125;
  credentialType: string;
}>;

export type ReceizAttestationIssuanceEvidenceV125 = Readonly<{
  domain: ReceizAttestationDomainV125;
  genesis: ReceizAttestationApplicationV125;
  events: readonly ReceizAttestationEventV125[];
}>;

export type ReceizAttestationIssuanceAdmissionV125 = Readonly<{
  schema: "receiz.attestation.issuance-admission.v125";
  domain: ReceizAttestationDomainV125;
  genesis: ReceizAttestationApplicationV125;
  events: readonly ReceizAttestationEventV125[];
  state: ReceizAttestationApplicationStateV125;
  authority: Readonly<{
    admissionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizOpenedAttestationArtifactV125 = ReceizV125EnclosingArtifactBinding & Readonly<{
  schema: "receiz.opened-attestation-artifact.v125";
  acceptedHead: string;
  state: ReceizAttestationApplicationStateV125;
  domain: ReceizAttestationDomainV125;
  genesis: ReceizAttestationApplicationV125;
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizAttestationEvidenceRequestV125 = Readonly<{
  evidenceType: string;
  requestDigest: string;
}>;

export type ReceizAttestationEventPayloadV125 =
  | Readonly<{
    schema: "receiz.attestation.submitted.v125";
    claimSetDigest: string;
    evidenceBundleDigest: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.evidence-request.v125";
    evidenceType: string;
    requestDigest: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.evidence-submission.v125";
    requestDigest: string;
    evidenceBundle: ReceizEvidenceBundleV125;
  }>
  | Readonly<{
    schema: "receiz.attestation.evaluation.v125";
    evidenceBundleDigest: string;
    evidenceBundleHead: string;
    evaluatorImplementationDigest: string;
    ruleOutcomes: readonly ReceizAttestationEvaluationRuleOutcomeV125[];
    evaluationDigest: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.review.v125";
    reviewDigest: string;
    outcomeCode: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.approval.v125";
    approvalDigest: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.issuance.v125";
    issuanceDigest: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.denial.v125";
    decisionDigest: string;
    outcomeCode: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.withdrawal.v125";
    reasonDigest: string;
  }>
  | Readonly<{
    schema: "receiz.attestation.expiry.v125";
    expiryDigest: string;
  }>;

export type ReceizAttestationApplicationV125 = Readonly<{
  schema: "receiz.attestation.application.v125";
  status: "draft";
  applicationId: string;
  domainId: string;
  credentialType: string;
  subjectId: string;
  applicantReceizId: string;
  registryDigest: string;
  domainDigest: string;
  claimSet: ReceizClaimSetV125;
  claimSetDigest: string;
  claimSetHead: string;
  evidenceBundle: ReceizEvidenceBundleV125;
  evidenceBundleDigest: string;
  evidenceBundleHead: string;
  createdKai: string;
  expiresAtKai: string;
  authority: Readonly<{
    applicationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  applicationDigest: string;
  acceptedHead: string;
}>;

export type ReceizAttestationEventV125 = Readonly<{
  schema: "receiz.attestation.event.v125";
  kind: ReceizAttestationEventKindV125;
  applicationId: string;
  domainId: string;
  credentialType: string;
  actorReceizId: string;
  actorRole: string;
  actorAuthorization: ReceizAttestationActorAuthorizationV125;
  actorProof: ReceizIdentityLoginProof;
  expectedPriorHead: string;
  eventKai: string;
  idempotencyKey: string;
  payload: ReceizAttestationEventPayloadV125;
  payloadDigest: string;
  eventDigest: string;
}>;

export type ReceizAttestationEventInputV125 = Readonly<Omit<
  ReceizAttestationEventV125,
  "schema" | "payloadDigest" | "eventDigest"
>>;

export type ReceizAttestationApplicationStateV125 = Readonly<{
  schema: "receiz.attestation.application-state.v125";
  applicationId: string;
  domainId: string;
  credentialType: string;
  subjectId: string;
  applicantReceizId: string;
  registryDigest: string;
  domainDigest: string;
  claimSet: ReceizClaimSetV125;
  claimSetDigest: string;
  claimSetHead: string;
  evidenceBundle: ReceizEvidenceBundleV125;
  evidenceBundleDigest: string;
  evidenceBundleHead: string;
  createdKai: string;
  expiresAtKai: string;
  latestKai: string;
  status: ReceizAttestationStatusV125;
  acceptedHead: string;
  approverIds: readonly string[];
  evaluationSatisfied: boolean;
  reviewSatisfied: boolean;
  outstandingEvidenceRequest: ReceizAttestationEvidenceRequestV125 | null;
  history: readonly ReceizAttestationEventV125[];
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizAttestationEventPlanV125 = Readonly<{
  schema: "receiz.attestation.event-plan.v125";
  transitionPlan?: ReceizArtifactAppendPlan;
  event: ReceizAttestationEventV125;
  planIdentity: string;
  confirmationDigest: string;
  confirmationRequired: true;
  writesPerformed: 0;
  authority: Readonly<{
    planIsAdmission: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizAttestationEventApplyV125 = Readonly<{
  schema: "receiz.attestation.event-apply.v125";
  state: ReceizAttestationApplicationStateV125;
  history: readonly ReceizAttestationEventV125[];
  append: ReceizAttestationEventV125;
  sourceArtifact: ReceizPortableSealedArtifactV124;
  committedTransition: ReceizCommittedArtifactTransition;
  writesPerformed: 0 | 1;
  authority: Readonly<{
    applyIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export class ReceizAttestationZeroWriteErrorV125 extends TypeError {
  readonly writesPerformed = 0 as const;
  constructor(readonly code: string) {
    super(code);
    this.name = "ReceizAttestationZeroWriteErrorV125";
  }
}

const HEX64 = /^[0-9a-f]{64}$/;
const KAI = /^(0|[1-9][0-9]*)$/;
const NAME = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const RECEIZ_ID = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;
const EVENT_KINDS: readonly ReceizAttestationEventKindV125[] = [
  "submitted", "evidence_requested", "evidence_submitted", "evaluation_complete", "review_complete",
  "approval_recorded", "issued", "denied", "withdrawn", "expired",
];
const TERMINAL_STATUSES: ReadonlySet<ReceizAttestationStatusV125> = new Set([
  "issued", "denied", "withdrawn", "expired",
]);
const MAX_HISTORY = 100_000;

function fail(code: string): never {
  throw new ReceizAttestationZeroWriteErrorV125(code);
}

async function zeroWriteBoundary<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ReceizAttestationZeroWriteErrorV125) throw error;
    const code = error instanceof Error && error.message.length > 0
      ? error.message
      : "V125_ATTESTATION_VALIDATION_FAILED";
    throw new ReceizAttestationZeroWriteErrorV125(code);
  }
}

function closedRecord(value: unknown, expectedKeys: readonly string[], code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== expectedKeys.length || keys.some((key) => typeof key !== "string")
    || keys.some((key) => !expectedKeys.includes(key as string))) fail(code);
  const output = Object.create(null) as Record<string, unknown>;
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code);
    Object.defineProperty(output, key, {
      value: descriptor.value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return output;
}

function exactArray(value: unknown, code: string): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const length = descriptors.length;
  const arrayLength = length && "value" in length ? length.value : undefined;
  if (typeof arrayLength !== "number" || !Number.isSafeInteger(arrayLength) || arrayLength < 0
    || Reflect.ownKeys(descriptors).length !== arrayLength + 1) fail(code);
  const result: unknown[] = [];
  for (let index = 0; index < arrayLength; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code);
    result.push(descriptor.value);
  }
  return result;
}

function canonicalText(value: unknown, code: string, maximum = 512): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum
    || value.trim() !== value || value.normalize("NFC") !== value) fail(code);
  return value;
}

function canonicalName(value: unknown, code: string): string {
  const parsed = canonicalText(value, code, 256);
  if (!NAME.test(parsed)) fail(code);
  return parsed;
}

function digest(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code);
  return value;
}

function kai(value: unknown, code: string): string {
  if (typeof value !== "string" || !KAI.test(value)) fail(code);
  return value;
}

function receizId(value: unknown, code: string): string {
  if (typeof value !== "string" || !RECEIZ_ID.test(value)) fail(code);
  return value;
}

function boolean(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") fail(code);
  return value;
}

function nonnegativeInteger(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) fail(code);
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function authorityDigest(
  domain: Parameters<typeof encodeReceizAuthority>[0],
  schema: string,
  value: unknown,
): Promise<string> {
  const bytes = encodeReceizAuthority(domain, schema, value);
  const result = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function eventAuthorshipChallengeB64u(input: Readonly<{
  kind: ReceizAttestationEventKindV125;
  applicationId: string;
  domainId: string;
  credentialType: string;
  actorReceizId: string;
  actorRole: string;
  actorAuthorization: ReceizAttestationActorAuthorizationV125;
  expectedPriorHead: string;
  eventKai: string;
  idempotencyKey: string;
  payload: ReceizAttestationEventPayloadV125;
  payloadDigest: string;
}>): string {
  return receizBase64UrlEncode(encodeReceizAuthority(
    "event",
    "receiz.attestation.event-authorship.v125",
    input,
  ));
}

export async function createReceizAttestationEventActorChallengeV125(
  input: Omit<ReceizAttestationEventInputV125, "actorProof">,
): Promise<string> {
  const payloadDigest = await authorityDigest("artifact", input.payload.schema, input.payload);
  return eventAuthorshipChallengeB64u({ ...input, payloadDigest });
}

async function verifyActorEventProof(
  value: unknown,
  authorization: ReceizAttestationActorAuthorizationV125,
  challengeB64Url: string,
): Promise<ReceizIdentityLoginProof> {
  const code = "V125_ATTESTATION_EVENT_ACTOR_PROOF_INVALID";
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

async function attestationDomainDigest(domain: ReceizAttestationDomainV125): Promise<string> {
  return authorityDigest("registry", domain.schema, domain);
}

function parseAuthority(
  value: unknown,
  flag: "applicationIsProofAuthority" | "projectionIsProofAuthority" | "planIsAdmission" | "applyIsProofAuthority",
  code: string,
): Readonly<Record<string, false | "sealed-receiz-proof-object">> {
  const record = closedRecord(value, [flag, "strongerTruth"], code);
  if (record[flag] !== false || record.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({ [flag]: false, strongerTruth: "sealed-receiz-proof-object" as const });
}

function parseRuleOutcome(value: unknown): ReceizAttestationEvaluationRuleOutcomeV125 {
  const code = "V125_ATTESTATION_EVALUATION_RESULT_INVALID";
  const record = closedRecord(value, ["ruleId", "evidenceCount", "satisfied", "outcomeCode"], code);
  return freeze({
    ruleId: canonicalName(record.ruleId, code),
    evidenceCount: nonnegativeInteger(record.evidenceCount, code),
    satisfied: boolean(record.satisfied, code),
    outcomeCode: canonicalName(record.outcomeCode, code),
  });
}

async function parsePayload(
  kind: ReceizAttestationEventKindV125,
  value: unknown,
  domain: ReceizAttestationDomainV125,
): Promise<ReceizAttestationEventPayloadV125> {
  const code = "V125_ATTESTATION_EVENT_PAYLOAD_INVALID";
  switch (kind) {
    case "submitted": {
      const record = closedRecord(value, ["schema", "claimSetDigest", "evidenceBundleDigest"], code);
      if (record.schema !== "receiz.attestation.submitted.v125") fail(code);
      return freeze({
        schema: "receiz.attestation.submitted.v125" as const,
        claimSetDigest: digest(record.claimSetDigest, code),
        evidenceBundleDigest: digest(record.evidenceBundleDigest, code),
      });
    }
    case "evidence_requested": {
      const record = closedRecord(value, ["schema", "evidenceType", "requestDigest"], code);
      if (record.schema !== "receiz.attestation.evidence-request.v125") fail(code);
      const evidenceType = canonicalName(record.evidenceType, code);
      if (!domain.evidenceRequirements.some((requirement) => requirement.evidenceType === evidenceType)) {
        fail("V125_ATTESTATION_EVIDENCE_TYPE_UNDECLARED");
      }
      return freeze({
        schema: "receiz.attestation.evidence-request.v125" as const,
        evidenceType,
        requestDigest: digest(record.requestDigest, code),
      });
    }
    case "evidence_submitted": {
      const record = closedRecord(value, ["schema", "requestDigest", "evidenceBundle"], code);
      if (record.schema !== "receiz.attestation.evidence-submission.v125") fail(code);
      return freeze({
        schema: "receiz.attestation.evidence-submission.v125" as const,
        requestDigest: digest(record.requestDigest, code),
        evidenceBundle: await parseReceizEvidenceBundleV125(record.evidenceBundle, domain),
      });
    }
    case "evaluation_complete": {
      const record = closedRecord(value, [
        "schema", "evidenceBundleDigest", "evidenceBundleHead", "evaluatorImplementationDigest",
        "ruleOutcomes", "evaluationDigest",
      ], code);
      if (record.schema !== "receiz.attestation.evaluation.v125") fail(code);
      const outcomes = exactArray(record.ruleOutcomes, code).map(parseRuleOutcome);
      for (let index = 1; index < outcomes.length; index += 1) {
        if (outcomes[index - 1]!.ruleId >= outcomes[index]!.ruleId) fail(code);
      }
      return freeze({
        schema: "receiz.attestation.evaluation.v125" as const,
        evidenceBundleDigest: digest(record.evidenceBundleDigest, code),
        evidenceBundleHead: digest(record.evidenceBundleHead, code),
        evaluatorImplementationDigest: digest(record.evaluatorImplementationDigest, code),
        ruleOutcomes: freeze(outcomes),
        evaluationDigest: digest(record.evaluationDigest, code),
      });
    }
    case "review_complete": {
      const record = closedRecord(value, ["schema", "reviewDigest", "outcomeCode"], code);
      if (record.schema !== "receiz.attestation.review.v125") fail(code);
      const outcomeCode = canonicalName(record.outcomeCode, code);
      if (!domain.outcomeCodes.includes(outcomeCode)) fail("V125_ATTESTATION_OUTCOME_UNDECLARED");
      return freeze({
        schema: "receiz.attestation.review.v125" as const,
        reviewDigest: digest(record.reviewDigest, code),
        outcomeCode,
      });
    }
    case "approval_recorded": {
      const record = closedRecord(value, ["schema", "approvalDigest"], code);
      if (record.schema !== "receiz.attestation.approval.v125") fail(code);
      return freeze({ schema: "receiz.attestation.approval.v125" as const, approvalDigest: digest(record.approvalDigest, code) });
    }
    case "issued": {
      const record = closedRecord(value, ["schema", "issuanceDigest"], code);
      if (record.schema !== "receiz.attestation.issuance.v125") fail(code);
      return freeze({ schema: "receiz.attestation.issuance.v125" as const, issuanceDigest: digest(record.issuanceDigest, code) });
    }
    case "denied": {
      const record = closedRecord(value, ["schema", "decisionDigest", "outcomeCode"], code);
      if (record.schema !== "receiz.attestation.denial.v125") fail(code);
      const outcomeCode = canonicalName(record.outcomeCode, code);
      if (!domain.outcomeCodes.includes(outcomeCode)) fail("V125_ATTESTATION_OUTCOME_UNDECLARED");
      return freeze({
        schema: "receiz.attestation.denial.v125" as const,
        decisionDigest: digest(record.decisionDigest, code),
        outcomeCode,
      });
    }
    case "withdrawn": {
      const record = closedRecord(value, ["schema", "reasonDigest"], code);
      if (record.schema !== "receiz.attestation.withdrawal.v125") fail(code);
      return freeze({ schema: "receiz.attestation.withdrawal.v125" as const, reasonDigest: digest(record.reasonDigest, code) });
    }
    case "expired": {
      const record = closedRecord(value, ["schema", "expiryDigest"], code);
      if (record.schema !== "receiz.attestation.expiry.v125") fail(code);
      return freeze({ schema: "receiz.attestation.expiry.v125" as const, expiryDigest: digest(record.expiryDigest, code) });
    }
  }
}

function parseEventKind(value: unknown): ReceizAttestationEventKindV125 {
  if (typeof value !== "string" || !EVENT_KINDS.includes(value as ReceizAttestationEventKindV125)) {
    fail("V125_ATTESTATION_EVENT_KIND_INVALID");
  }
  return value as ReceizAttestationEventKindV125;
}

async function parseRoleGrant(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  authority: ReceizAttestationAuthorityV125,
  useAtKai: string,
): Promise<ReceizAttestationRoleGrantV125> {
  const grant = await verifyReceizAttestationRoleGrantAuthorityV125(value, domain, authority, useAtKai);
  if (grant.allowedActions.some((action) => !EVENT_KINDS.includes(action))) {
    fail("V125_ATTESTATION_ROLE_GRANT_INVALID");
  }
  return grant;
}

async function parseActorAuthorization(
  value: unknown,
  coordinate: ReceizAttestationActorAuthorizationCoordinateV125,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationActorAuthorizationV125> {
  const registeredRole = coordinate.domain.actorRoles.find((candidate) => candidate.role === coordinate.actorRole);
  if (!registeredRole) fail("V125_ATTESTATION_ACTOR_ROLE_UNDECLARED");
  if (!registeredRole.allowedActions.includes(coordinate.kind)) fail("V125_ATTESTATION_ACTION_UNAUTHORIZED");
  const record = closedRecord(value, [
    "schema", "subjectArtifact", "proofObjectId", "subjectArtifactDigest", "acceptedSubjectHead", "grantDigest",
    "actorKeyId", "actorKeyAlg", "actorPublicKeyRawB64u",
  ], "V125_ATTESTATION_ACTOR_AUTHORIZATION_CLOSED_SHAPE_INVALID");

  // The enclosing subject artifact is always verified before namespace bytes are decoded or role grants are parsed.
  if (!verifyReceizSubjectArtifactV1(record.subjectArtifact as ReceizSubjectArtifactV1)) {
    fail("V125_ATTESTATION_ACTOR_SUBJECT_ARTIFACT_INVALID");
  }
  closedRecord(record.subjectArtifact, [
    "schema", "subject", "exactBytesB64u", "artifactDigest", "registryDigest", "reducerDigest", "authority",
  ], "V125_ATTESTATION_ACTOR_SUBJECT_ARTIFACT_CLOSED_SHAPE_INVALID");
  const artifactRecord = record.subjectArtifact as unknown as Readonly<Record<string, unknown>>;
  closedRecord(artifactRecord.subject, [
    "schema", "subjectId", "proofObjectId", "subjectType", "ownerReceizId", "identityDigest", "genesisDigest",
    "createdAtKai", "head", "ownershipHead", "currentOwnerReceizId", "namespaces",
  ], "V125_ATTESTATION_ACTOR_SUBJECT_CLOSED_SHAPE_INVALID");
  const artifactAuthority = closedRecord(artifactRecord.authority, [
    "artifactIsProofAuthority", "modelOutputIsAuthority", "indexIsAuthority",
  ], "V125_ATTESTATION_ACTOR_SUBJECT_ARTIFACT_AUTHORITY_INVALID");
  if (artifactAuthority.artifactIsProofAuthority !== true
    || artifactAuthority.modelOutputIsAuthority !== false
    || artifactAuthority.indexIsAuthority !== false) {
    fail("V125_ATTESTATION_ACTOR_SUBJECT_ARTIFACT_AUTHORITY_INVALID");
  }
  const artifact = structuredClone(record.subjectArtifact as ReceizSubjectArtifactV1);
  if (record.schema !== "receiz.attestation.actor-authorization.v125") {
    fail("V125_ATTESTATION_ACTOR_AUTHORIZATION_SCHEMA_INVALID");
  }
  const proofObjectId = canonicalText(record.proofObjectId, "V125_ATTESTATION_ACTOR_PROOF_OBJECT_INVALID");
  const subjectArtifactDigest = digest(record.subjectArtifactDigest, "V125_ATTESTATION_ACTOR_ARTIFACT_DIGEST_INVALID");
  const acceptedSubjectHead = digest(record.acceptedSubjectHead, "V125_ATTESTATION_ACTOR_SUBJECT_HEAD_INVALID");
  const grantDigest = digest(record.grantDigest, "V125_ATTESTATION_ROLE_GRANT_DIGEST_INVALID");
  const actorKeyId = digest(record.actorKeyId, "V125_ATTESTATION_ACTOR_KEY_INVALID");
  const actorKeyAlg = record.actorKeyAlg === "Ed25519" || record.actorKeyAlg === "P-256"
    ? record.actorKeyAlg
    : fail("V125_ATTESTATION_ACTOR_KEY_INVALID");
  const actorPublicKeyRawB64u = canonicalText(
    record.actorPublicKeyRawB64u,
    "V125_ATTESTATION_ACTOR_KEY_INVALID",
    256,
  );
  if (proofObjectId !== artifact.subject.proofObjectId) fail("V125_ATTESTATION_ACTOR_PROOF_OBJECT_MISMATCH");
  if (subjectArtifactDigest !== artifact.artifactDigest) fail("V125_ATTESTATION_ACTOR_ARTIFACT_DIGEST_MISMATCH");
  if (acceptedSubjectHead !== artifact.subject.head) fail("V125_ATTESTATION_ACTOR_SUBJECT_HEAD_MISMATCH");
  if (artifact.subject.currentOwnerReceizId !== coordinate.actorReceizId) {
    fail("V125_ATTESTATION_ACTOR_OWNER_MISMATCH");
  }
  if (artifact.registryDigest !== coordinate.domain.registryDigest) {
    fail("V125_ATTESTATION_ACTOR_SUBJECT_REGISTRY_MISMATCH");
  }

  let namespaceValue: unknown;
  try {
    namespaceValue = decodeReceizSubjectNamespaceBytes(artifact.subject.namespaces.applicationNamespaces!);
  } catch {
    fail("V125_ATTESTATION_ROLE_GRANT_NAMESPACE_INVALID");
  }
  const namespace = closedRecord(
    namespaceValue,
    ["schema", "grants"],
    "V125_ATTESTATION_ROLE_GRANT_NAMESPACE_INVALID",
  );
  if (namespace.schema !== "receiz.attestation.role-grants.v125") {
    fail("V125_ATTESTATION_ROLE_GRANT_NAMESPACE_INVALID");
  }
  const grantValues = exactArray(namespace.grants, "V125_ATTESTATION_ROLE_GRANT_NAMESPACE_INVALID");
  if (grantValues.length < 1 || grantValues.length > 256) fail("V125_ATTESTATION_ROLE_GRANT_NAMESPACE_INVALID");
  const grants: ReceizAttestationRoleGrantV125[] = [];
  for (const grantValue of grantValues) {
    grants.push(await parseRoleGrant(grantValue, coordinate.domain, authority, coordinate.eventKai));
  }
  for (let index = 1; index < grants.length; index += 1) {
    if (grants[index - 1]!.grantDigest >= grants[index]!.grantDigest) {
      fail("V125_ATTESTATION_ROLE_GRANT_NAMESPACE_INVALID");
    }
  }
  const grant = grants.find((candidate) => candidate.grantDigest === grantDigest);
  if (!grant) fail("V125_ATTESTATION_ROLE_GRANT_NOT_FOUND");
  if (grant.actorReceizId !== coordinate.actorReceizId) fail("V125_ATTESTATION_ROLE_GRANT_ACTOR_MISMATCH");
  if (grant.domainId !== coordinate.domain.domainId) fail("V125_ATTESTATION_ROLE_GRANT_DOMAIN_MISMATCH");
  if (grant.credentialType !== coordinate.credentialType) fail("V125_ATTESTATION_ROLE_GRANT_CREDENTIAL_MISMATCH");
  if (grant.role !== coordinate.actorRole) fail("V125_ATTESTATION_ROLE_GRANT_NOT_FOUND");
  if (grant.actorKeyId !== actorKeyId || grant.actorKeyAlg !== actorKeyAlg
    || grant.actorPublicKeyRawB64u !== actorPublicKeyRawB64u) {
    fail("V125_ATTESTATION_ACTOR_KEY_MISMATCH");
  }
  if (!grant.allowedActions.includes(coordinate.kind)) fail("V125_ATTESTATION_ACTION_UNAUTHORIZED");
  if (BigInt(coordinate.eventKai) < BigInt(grant.validFromKai)) fail("V125_ATTESTATION_ROLE_GRANT_NOT_YET_VALID");
  if (BigInt(coordinate.eventKai) >= BigInt(grant.expiresAtKai)) fail("V125_ATTESTATION_ROLE_GRANT_EXPIRED");
  return freeze({
    schema: "receiz.attestation.actor-authorization.v125" as const,
    subjectArtifact: freeze(artifact),
    proofObjectId,
    subjectArtifactDigest,
    acceptedSubjectHead,
    grantDigest,
    actorKeyId,
    actorKeyAlg,
    actorPublicKeyRawB64u,
  });
}

export async function verifyReceizAttestationActorAuthorizationV125(input: Readonly<{
  authorization: ReceizAttestationActorAuthorizationV125;
  actorReceizId: string;
  actorRole: string;
  kind: ReceizAttestationEventKindV125;
  eventKai: string;
  domain: ReceizAttestationDomainV125;
  credentialType: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationActorAuthorizationV125> {
  return zeroWriteBoundary(async () => {
    const record = closedRecord(input, [
      "authorization", "actorReceizId", "actorRole", "kind", "eventKai", "domain", "credentialType",
    ], "V125_ATTESTATION_ACTOR_AUTHORIZATION_INPUT_INVALID");
    const domain = parseReceizAttestationDomainV125(record.domain);
    const credentialType = canonicalName(record.credentialType, "V125_ATTESTATION_CREDENTIAL_TYPE_INVALID");
    if (!domain.credentialTypes.includes(credentialType)) fail("V125_ATTESTATION_CREDENTIAL_TYPE_UNDECLARED");
    return parseActorAuthorization(record.authorization, {
      actorReceizId: receizId(record.actorReceizId, "V125_ATTESTATION_ACTOR_INVALID"),
      actorRole: canonicalName(record.actorRole, "V125_ATTESTATION_ACTOR_ROLE_INVALID"),
      kind: parseEventKind(record.kind),
      eventKai: kai(record.eventKai, "V125_ATTESTATION_EVENT_KAI_INVALID"),
      domain,
      credentialType,
    }, authority);
  });
}

async function createEvent(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationEventV125> {
  const record = closedRecord(value, [
    "kind", "applicationId", "domainId", "credentialType", "actorReceizId", "actorRole", "actorAuthorization",
    "actorProof", "expectedPriorHead", "eventKai", "idempotencyKey", "payload",
  ], "V125_ATTESTATION_EVENT_INPUT_CLOSED_SHAPE_INVALID");
  const kind = parseEventKind(record.kind);
  const applicationId = canonicalText(record.applicationId, "V125_ATTESTATION_APPLICATION_ID_INVALID", 256);
  const domainId = canonicalName(record.domainId, "V125_ATTESTATION_DOMAIN_ID_INVALID");
  const credentialType = canonicalName(record.credentialType, "V125_ATTESTATION_CREDENTIAL_TYPE_INVALID");
  const actorReceizId = receizId(record.actorReceizId, "V125_ATTESTATION_ACTOR_INVALID");
  const actorRole = canonicalName(record.actorRole, "V125_ATTESTATION_ACTOR_ROLE_INVALID");
  const eventKai = kai(record.eventKai, "V125_ATTESTATION_EVENT_KAI_INVALID");
  const actorAuthorization = await parseActorAuthorization(record.actorAuthorization, {
    actorReceizId,
    actorRole,
    kind,
    eventKai,
    domain,
    credentialType,
  }, authority);
  const payload = await parsePayload(kind, record.payload, domain);
  const payloadDigest = await authorityDigest("artifact", payload.schema, payload);
  const unsignedBasis = freeze({
    kind,
    applicationId,
    domainId,
    credentialType,
    actorReceizId,
    actorRole,
    actorAuthorization,
    expectedPriorHead: digest(record.expectedPriorHead, "V125_ATTESTATION_EXPECTED_HEAD_INVALID"),
    eventKai,
    idempotencyKey: canonicalText(record.idempotencyKey, "V125_ATTESTATION_IDEMPOTENCY_INVALID", 256),
    payload,
    payloadDigest,
  });
  const actorProof = await verifyActorEventProof(
    record.actorProof,
    actorAuthorization,
    eventAuthorshipChallengeB64u(unsignedBasis),
  );
  const basis = freeze({
    schema: "receiz.attestation.event.v125" as const,
    ...unsignedBasis,
    actorProof,
  });
  return freeze({ ...basis, eventDigest: await authorityDigest("event", basis.schema, basis) });
}

async function parseEvent(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationEventV125> {
  const record = closedRecord(value, [
    "schema", "kind", "applicationId", "domainId", "credentialType", "actorReceizId", "actorRole", "actorAuthorization",
    "actorProof", "expectedPriorHead", "eventKai", "idempotencyKey", "payload", "payloadDigest", "eventDigest",
  ], "V125_ATTESTATION_EVENT_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.attestation.event.v125") fail("V125_ATTESTATION_EVENT_SCHEMA_INVALID");
  const created = await createEvent({
    kind: record.kind,
    applicationId: record.applicationId,
    domainId: record.domainId,
    credentialType: record.credentialType,
    actorReceizId: record.actorReceizId,
    actorRole: record.actorRole,
    actorAuthorization: record.actorAuthorization,
    actorProof: record.actorProof,
    expectedPriorHead: record.expectedPriorHead,
    eventKai: record.eventKai,
    idempotencyKey: record.idempotencyKey,
    payload: record.payload,
  }, domain, authority);
  if (digest(record.payloadDigest, "V125_ATTESTATION_PAYLOAD_DIGEST_INVALID") !== created.payloadDigest) {
    fail("V125_ATTESTATION_PAYLOAD_DIGEST_MISMATCH");
  }
  if (digest(record.eventDigest, "V125_ATTESTATION_EVENT_DIGEST_INVALID") !== created.eventDigest) {
    fail("V125_ATTESTATION_EVENT_DIGEST_MISMATCH");
  }
  return created;
}

async function parseApplication(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationApplicationV125> {
  const record = closedRecord(value, [
    "schema", "status", "applicationId", "domainId", "credentialType", "subjectId", "applicantReceizId",
    "registryDigest", "domainDigest", "claimSet", "claimSetDigest", "claimSetHead", "evidenceBundle",
    "evidenceBundleDigest", "evidenceBundleHead", "createdKai", "expiresAtKai", "authority",
    "applicationDigest", "acceptedHead",
  ], "V125_ATTESTATION_APPLICATION_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.attestation.application.v125" || record.status !== "draft") {
    fail("V125_ATTESTATION_APPLICATION_SCHEMA_INVALID");
  }
  const applicationId = canonicalText(record.applicationId, "V125_ATTESTATION_APPLICATION_ID_INVALID", 256);
  const domainId = canonicalName(record.domainId, "V125_ATTESTATION_DOMAIN_ID_INVALID");
  const credentialType = canonicalName(record.credentialType, "V125_ATTESTATION_CREDENTIAL_TYPE_INVALID");
  const subjectId = canonicalText(record.subjectId, "V125_ATTESTATION_SUBJECT_INVALID");
  const registryDigest = digest(record.registryDigest, "V125_ATTESTATION_REGISTRY_DIGEST_INVALID");
  const exactDomainDigest = await attestationDomainDigest(domain);
  if (domainId !== domain.domainId || registryDigest !== domain.registryDigest
    || record.domainDigest !== exactDomainDigest || !domain.credentialTypes.includes(credentialType)) {
    fail("V125_ATTESTATION_APPLICATION_DOMAIN_MISMATCH");
  }
  const claimSet = await parseReceizClaimSetV125(record.claimSet, domain);
  const evidenceBundle = await parseReceizEvidenceBundleV125(record.evidenceBundle, domain);
  validateApplicationMaterials(claimSet, evidenceBundle, { domain, credentialType, subjectId });
  const createdKai = kai(record.createdKai, "V125_ATTESTATION_APPLICATION_KAI_INVALID");
  validateApplicationMaterialKai(claimSet, evidenceBundle, createdKai);
  await verifyReceizAttestationEvidenceBundleAuthorityV125(domain, evidenceBundle, authority);
  const applicationAuthority = parseAuthority(
    record.authority,
    "applicationIsProofAuthority",
    "V125_ATTESTATION_APPLICATION_AUTHORITY_INVALID",
  ) as ReceizAttestationApplicationV125["authority"];
  const expectedExpiry = (BigInt(createdKai) + BigInt(domain.workflow.applicationWindowKai)).toString();
  const basis = freeze({
    schema: "receiz.attestation.application.v125" as const,
    status: "draft" as const,
    applicationId,
    domainId,
    credentialType,
    subjectId,
    applicantReceizId: receizId(record.applicantReceizId, "V125_ATTESTATION_APPLICANT_INVALID"),
    registryDigest,
    domainDigest: exactDomainDigest,
    claimSet,
    claimSetDigest: claimSet.claimSetDigest,
    claimSetHead: claimSet.acceptedHead,
    evidenceBundle,
    evidenceBundleDigest: evidenceBundle.evidenceBundleDigest,
    evidenceBundleHead: evidenceBundle.acceptedHead,
    createdKai,
    expiresAtKai: expectedExpiry,
    authority: applicationAuthority,
  });
  if (record.claimSetDigest !== basis.claimSetDigest || record.claimSetHead !== basis.claimSetHead
    || record.evidenceBundleDigest !== basis.evidenceBundleDigest || record.evidenceBundleHead !== basis.evidenceBundleHead
    || record.expiresAtKai !== basis.expiresAtKai) {
    fail("V125_ATTESTATION_APPLICATION_SOURCE_BINDING_MISMATCH");
  }
  const applicationDigest = await authorityDigest("artifact", basis.schema, basis);
  if (digest(record.applicationDigest, "V125_ATTESTATION_APPLICATION_DIGEST_INVALID") !== applicationDigest) {
    fail("V125_ATTESTATION_APPLICATION_DIGEST_MISMATCH");
  }
  const acceptedHead = await authorityDigest("history", "receiz.attestation.application-genesis-head.v125", {
    applicationDigest,
  });
  if (digest(record.acceptedHead, "V125_ATTESTATION_APPLICATION_HEAD_INVALID") !== acceptedHead) {
    fail("V125_ATTESTATION_APPLICATION_HEAD_MISMATCH");
  }
  return freeze({ ...basis, applicationDigest, acceptedHead });
}

function validateApplicationMaterials(
  claimSet: ReceizClaimSetV125,
  evidenceBundle: ReceizEvidenceBundleV125,
  coordinate: Readonly<{ domain: ReceizAttestationDomainV125; credentialType: string; subjectId: string }>,
): void {
  for (const projection of [claimSet, evidenceBundle]) {
    if (projection.domainId !== coordinate.domain.domainId
      || projection.credentialType !== coordinate.credentialType
      || projection.subjectId !== coordinate.subjectId
      || projection.registryDigest !== coordinate.domain.registryDigest) {
      fail("V125_ATTESTATION_SOURCE_COORDINATE_MISMATCH");
    }
  }
  if (claimSet.domainDigest !== evidenceBundle.domainDigest) fail("V125_ATTESTATION_SOURCE_DOMAIN_DIGEST_MISMATCH");
  if (claimSet.acceptedHead !== evidenceBundle.acceptedHead) fail("V125_ATTESTATION_SOURCE_HEAD_MISMATCH");
  const evidenceIds = new Set(evidenceBundle.evidence.map((entry) => entry.evidenceId));
  if (claimSet.claims.some((claim) => claim.evidenceIds.some((evidenceId) => !evidenceIds.has(evidenceId)))) {
    fail("V125_ATTESTATION_CLAIM_EVIDENCE_BINDING_MISMATCH");
  }
}

function validateApplicationMaterialKai(
  claimSet: ReceizClaimSetV125,
  evidenceBundle: ReceizEvidenceBundleV125,
  createdKai: string,
): void {
  if (BigInt(claimSet.issuedKai) > BigInt(createdKai)
    || BigInt(evidenceBundle.collectedKai) > BigInt(createdKai)) {
    fail("V125_ATTESTATION_SOURCE_KAI_NONCAUSAL");
  }
}

async function createApplication(
  input: unknown,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationApplicationV125> {
  const record = closedRecord(input, [
    "domain", "applicationId", "credentialType", "subjectId", "applicantReceizId",
    "claimSet", "evidenceBundle", "createdKai",
  ], "V125_ATTESTATION_APPLICATION_INPUT_INVALID");
  const domain = parseReceizAttestationDomainV125(record.domain);
  const credentialType = canonicalName(record.credentialType, "V125_ATTESTATION_CREDENTIAL_TYPE_INVALID");
  if (!domain.credentialTypes.includes(credentialType)) fail("V125_ATTESTATION_CREDENTIAL_TYPE_UNDECLARED");
  const subjectId = canonicalText(record.subjectId, "V125_ATTESTATION_SUBJECT_INVALID");
  const claimSet = await parseReceizClaimSetV125(record.claimSet, domain);
  const evidenceBundle = await parseReceizEvidenceBundleV125(record.evidenceBundle, domain);
  validateApplicationMaterials(claimSet, evidenceBundle, { domain, credentialType, subjectId });
  const createdKai = kai(record.createdKai, "V125_ATTESTATION_APPLICATION_KAI_INVALID");
  validateApplicationMaterialKai(claimSet, evidenceBundle, createdKai);
  await verifyReceizAttestationEvidenceBundleAuthorityV125(domain, evidenceBundle, authority);
  const basis = freeze({
    schema: "receiz.attestation.application.v125" as const,
    status: "draft" as const,
    applicationId: canonicalText(record.applicationId, "V125_ATTESTATION_APPLICATION_ID_INVALID", 256),
    domainId: domain.domainId,
    credentialType,
    subjectId,
    applicantReceizId: receizId(record.applicantReceizId, "V125_ATTESTATION_APPLICANT_INVALID"),
    registryDigest: domain.registryDigest,
    domainDigest: await attestationDomainDigest(domain),
    claimSet,
    claimSetDigest: claimSet.claimSetDigest,
    claimSetHead: claimSet.acceptedHead,
    evidenceBundle,
    evidenceBundleDigest: evidenceBundle.evidenceBundleDigest,
    evidenceBundleHead: evidenceBundle.acceptedHead,
    createdKai,
    expiresAtKai: (BigInt(createdKai) + BigInt(domain.workflow.applicationWindowKai)).toString(),
    authority: freeze({
      applicationIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  const applicationDigest = await authorityDigest("artifact", basis.schema, basis);
  const acceptedHead = await authorityDigest("history", "receiz.attestation.application-genesis-head.v125", {
    applicationDigest,
  });
  return freeze({ ...basis, applicationDigest, acceptedHead });
}

export async function createReceizAttestationApplicationV125(input: Readonly<{
  domain: ReceizAttestationDomainV125;
  applicationId: string;
  credentialType: string;
  subjectId: string;
  applicantReceizId: string;
  claimSet: ReceizClaimSetV125;
  evidenceBundle: ReceizEvidenceBundleV125;
  createdKai: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationApplicationV125> {
  return zeroWriteBoundary(() => createApplication(input, authority));
}

type WorkingState = {
  status: ReceizAttestationStatusV125;
  acceptedHead: string;
  latestKai: string;
  approverIds: string[];
  approvalDigests: string[];
  evidenceBundle: ReceizEvidenceBundleV125;
  evaluationSatisfied: boolean;
  reviewSatisfied: boolean;
  outstandingEvidenceRequest: ReceizAttestationEvidenceRequestV125 | null;
};

function authorize(
  domain: ReceizAttestationDomainV125,
  application: ReceizAttestationApplicationV125,
  event: ReceizAttestationEventV125,
): void {
  const role = domain.actorRoles.find((candidate) => candidate.role === event.actorRole);
  if (!role) fail("V125_ATTESTATION_ACTOR_ROLE_UNDECLARED");
  if (!role.allowedActions.includes(event.kind)) fail("V125_ATTESTATION_ACTION_UNAUTHORIZED");
  if ((event.kind === "submitted" || event.kind === "evidence_submitted" || event.kind === "withdrawn")
    && event.actorReceizId !== application.applicantReceizId) {
    fail("V125_ATTESTATION_APPLICANT_UNAUTHORIZED");
  }
}

function requirePreApprovalStages(
  domain: ReceizAttestationDomainV125,
  state: WorkingState,
  allowApprovalProgress: boolean,
): void {
  const approvalProgress = allowApprovalProgress
    && (state.status === "approval_pending" || state.status === "approval_complete");
  if (domain.workflow.automatedEvaluation && !state.evaluationSatisfied) {
    fail("V125_ATTESTATION_EVALUATION_REQUIRED");
  }
  if (domain.workflow.humanReview && !state.reviewSatisfied) fail("V125_ATTESTATION_REVIEW_REQUIRED");
  if (!domain.workflow.automatedEvaluation && !domain.workflow.humanReview
    && state.status !== "submitted" && !approvalProgress) {
    fail("V125_ATTESTATION_SUBMISSION_REQUIRED");
  }
}

async function expectedEvaluation(
  domain: ReceizAttestationDomainV125,
  application: ReceizAttestationApplicationV125,
  evidenceBundle: ReceizEvidenceBundleV125,
): Promise<Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.evaluation.v125" }>> {
  const ruleOutcomes = domain.evaluationRules.map((rule) => {
    const evidenceCount = evidenceBundle.evidence.filter((entry) => entry.evidenceType === rule.evidenceType).length;
    const satisfied = evidenceCount >= rule.threshold;
    return freeze({
      ruleId: rule.ruleId,
      evidenceCount,
      satisfied,
      outcomeCode: satisfied ? rule.satisfiedOutcomeCode : rule.unsatisfiedOutcomeCode,
    });
  });
  const basis = freeze({
    schema: "receiz.attestation.evaluation-result.v125" as const,
    applicationId: application.applicationId,
    domainId: application.domainId,
    credentialType: application.credentialType,
    subjectId: application.subjectId,
    registryDigest: application.registryDigest,
    domainDigest: application.domainDigest,
    evidenceBundleDigest: evidenceBundle.evidenceBundleDigest,
    evidenceBundleHead: evidenceBundle.acceptedHead,
    evaluatorImplementationDigest: domain.workflow.evaluatorImplementationDigest!,
    ruleOutcomes: freeze(ruleOutcomes),
  });
  return freeze({
    schema: "receiz.attestation.evaluation.v125" as const,
    evidenceBundleDigest: evidenceBundle.evidenceBundleDigest,
    evidenceBundleHead: evidenceBundle.acceptedHead,
    evaluatorImplementationDigest: basis.evaluatorImplementationDigest,
    ruleOutcomes: basis.ruleOutcomes,
    evaluationDigest: await authorityDigest("artifact", basis.schema, basis),
  });
}

function evaluationMatches(
  actual: Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.evaluation.v125" }>,
  expected: Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.evaluation.v125" }>,
): boolean {
  return actual.evidenceBundleDigest === expected.evidenceBundleDigest
    && actual.evidenceBundleHead === expected.evidenceBundleHead
    && actual.evaluatorImplementationDigest === expected.evaluatorImplementationDigest
    && actual.evaluationDigest === expected.evaluationDigest
    && actual.ruleOutcomes.length === expected.ruleOutcomes.length
    && actual.ruleOutcomes.every((entry, index) => {
      const counterpart = expected.ruleOutcomes[index];
      return counterpart !== undefined && entry.ruleId === counterpart.ruleId
        && entry.evidenceCount === counterpart.evidenceCount && entry.satisfied === counterpart.satisfied
        && entry.outcomeCode === counterpart.outcomeCode;
    });
}

function evidenceSatisfiesEveryRule(
  domain: ReceizAttestationDomainV125,
  evidenceBundle: ReceizEvidenceBundleV125,
): boolean {
  return domain.evaluationRules.every((rule) => evidenceBundle.evidence
    .filter((entry) => entry.evidenceType === rule.evidenceType).length >= rule.threshold);
}

function sameEvidenceReference(
  left: ReceizEvidenceBundleV125["evidence"][number],
  right: ReceizEvidenceBundleV125["evidence"][number],
): boolean {
  return left.evidenceId === right.evidenceId
    && left.evidenceType === right.evidenceType
    && left.classification === right.classification
    && left.verifierBinding === right.verifierBinding
    && left.evaluatorPolicy === right.evaluatorPolicy
    && left.artifactSha256 === right.artifactSha256
    && left.proofObjectId === right.proofObjectId
    && left.subjectId === right.subjectId
    && left.custodyHead === right.custodyHead
    && left.contentCommitment === right.contentCommitment;
}

async function transition(
  domain: ReceizAttestationDomainV125,
  application: ReceizAttestationApplicationV125,
  state: WorkingState,
  event: ReceizAttestationEventV125,
  authority: ReceizAttestationAuthorityV125,
): Promise<WorkingState> {
  if (TERMINAL_STATUSES.has(state.status)) fail("V125_ATTESTATION_TERMINAL_STATE");
  if (event.kind !== "expired" && BigInt(event.eventKai) >= BigInt(application.expiresAtKai)) {
    fail("V125_ATTESTATION_APPLICATION_EXPIRED");
  }
  authorize(domain, application, event);
  const next: WorkingState = {
    ...state,
    approverIds: [...state.approverIds],
    approvalDigests: [...state.approvalDigests],
    latestKai: event.eventKai,
    acceptedHead: event.eventDigest,
  };
  switch (event.kind) {
    case "submitted": {
      if (state.status !== "draft") fail("V125_ATTESTATION_SUBMISSION_REQUIRED");
      const payload = event.payload as Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.submitted.v125" }>;
      if (payload.claimSetDigest !== application.claimSetDigest
        || payload.evidenceBundleDigest !== application.evidenceBundleDigest) {
        fail("V125_ATTESTATION_SUBMISSION_BINDING_MISMATCH");
      }
      next.status = "submitted";
      return next;
    }
    case "evidence_requested": {
      if (state.status !== "submitted" && state.status !== "evaluation_complete" && state.status !== "review_complete") {
        fail("V125_ATTESTATION_EVIDENCE_REQUEST_INVALID_STATE");
      }
      const payload = event.payload as Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.evidence-request.v125" }>;
      next.status = "evidence_requested";
      next.outstandingEvidenceRequest = { evidenceType: payload.evidenceType, requestDigest: payload.requestDigest };
      return next;
    }
    case "evidence_submitted": {
      if (state.status !== "evidence_requested" || state.outstandingEvidenceRequest === null) {
        fail("V125_ATTESTATION_EVIDENCE_SUBMISSION_NOT_REQUESTED");
      }
      const payload = event.payload as Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.evidence-submission.v125" }>;
      if (payload.requestDigest !== state.outstandingEvidenceRequest.requestDigest) {
        fail("V125_ATTESTATION_EVIDENCE_REQUEST_MISMATCH");
      }
      const bundle = payload.evidenceBundle;
      await verifyReceizAttestationEvidenceBundleAuthorityV125(domain, bundle, authority);
      if (bundle.domainId !== application.domainId || bundle.credentialType !== application.credentialType
        || bundle.subjectId !== application.subjectId || bundle.registryDigest !== application.registryDigest
        || bundle.domainDigest !== application.domainDigest) {
        fail("V125_ATTESTATION_EVIDENCE_SOURCE_MISMATCH");
      }
      if (BigInt(bundle.collectedKai) < BigInt(state.evidenceBundle.collectedKai)
        || BigInt(bundle.collectedKai) > BigInt(event.eventKai)) {
        fail("V125_ATTESTATION_EVIDENCE_KAI_NONCAUSAL");
      }
      if (bundle.predecessorHead !== state.evidenceBundle.acceptedHead
        || bundle.acceptedHead === state.evidenceBundle.acceptedHead
        || bundle.evidenceBundleDigest === state.evidenceBundle.evidenceBundleDigest) {
        fail("V125_ATTESTATION_EVIDENCE_HEAD_MISMATCH");
      }
      if (state.evidenceBundle.evidence.some((prior) => {
        const successor = bundle.evidence.find((entry) => entry.evidenceId === prior.evidenceId);
        return successor === undefined || !sameEvidenceReference(prior, successor);
      })) {
        fail("V125_ATTESTATION_EVIDENCE_NOT_APPEND_ONLY");
      }
      const priorIds = new Set(state.evidenceBundle.evidence.map((entry) => entry.evidenceId));
      if (!bundle.evidence.some((entry) => entry.evidenceType === state.outstandingEvidenceRequest!.evidenceType
        && !priorIds.has(entry.evidenceId))) {
        fail("V125_ATTESTATION_EVIDENCE_REQUEST_UNANSWERED");
      }
      next.status = "submitted";
      next.approverIds = [];
      next.approvalDigests = [];
      next.evidenceBundle = bundle;
      next.evaluationSatisfied = false;
      next.reviewSatisfied = false;
      next.outstandingEvidenceRequest = null;
      return next;
    }
    case "evaluation_complete": {
      if (!domain.workflow.automatedEvaluation) fail("V125_ATTESTATION_EVALUATION_NOT_REQUIRED");
      if (state.status !== "submitted") fail("V125_ATTESTATION_SUBMISSION_REQUIRED");
      const payload = event.payload as Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.evaluation.v125" }>;
      if (payload.evaluatorImplementationDigest !== domain.workflow.evaluatorImplementationDigest) {
        fail("V125_ATTESTATION_EVALUATOR_IMPLEMENTATION_MISMATCH");
      }
      const expected = await expectedEvaluation(domain, application, state.evidenceBundle);
      if (!evaluationMatches(payload, expected)) fail("V125_ATTESTATION_EVALUATION_RESULT_MISMATCH");
      next.evaluationSatisfied = expected.ruleOutcomes.every((outcome) => outcome.satisfied);
      next.status = next.evaluationSatisfied ? "evaluation_complete" : "denied";
      return next;
    }
    case "review_complete": {
      if (!domain.workflow.humanReview) fail("V125_ATTESTATION_REVIEW_NOT_REQUIRED");
      if (domain.workflow.automatedEvaluation && (!state.evaluationSatisfied || state.status !== "evaluation_complete")) {
        fail("V125_ATTESTATION_EVALUATION_REQUIRED");
      }
      if (!domain.workflow.automatedEvaluation && state.status !== "submitted") {
        fail("V125_ATTESTATION_SUBMISSION_REQUIRED");
      }
      const payload = event.payload as Extract<ReceizAttestationEventPayloadV125, { schema: "receiz.attestation.review.v125" }>;
      if (payload.outcomeCode !== domain.reviewPolicy.satisfiedOutcomeCode
        && payload.outcomeCode !== domain.reviewPolicy.unsatisfiedOutcomeCode) {
        fail("V125_ATTESTATION_REVIEW_OUTCOME_INVALID");
      }
      next.reviewSatisfied = payload.outcomeCode === domain.reviewPolicy.satisfiedOutcomeCode;
      if (next.reviewSatisfied && !evidenceSatisfiesEveryRule(domain, state.evidenceBundle)) {
        fail("V125_ATTESTATION_EVALUATION_RULES_UNSATISFIED");
      }
      next.status = next.reviewSatisfied ? "review_complete" : "denied";
      return next;
    }
    case "approval_recorded": {
      if (domain.workflow.minimumApprovers === 0) fail("V125_ATTESTATION_APPROVAL_NOT_REQUIRED");
      if (!evidenceSatisfiesEveryRule(domain, state.evidenceBundle)) {
        fail("V125_ATTESTATION_EVALUATION_RULES_UNSATISFIED");
      }
      requirePreApprovalStages(domain, state, true);
      if (state.status === "approval_complete" || next.approverIds.length >= domain.workflow.minimumApprovers) {
        fail("V125_ATTESTATION_APPROVAL_QUORUM_COMPLETE");
      }
      if (next.approverIds.includes(event.actorReceizId)) fail("V125_ATTESTATION_APPROVER_DUPLICATE");
      const approvalDigest = (event.payload as Extract<
        ReceizAttestationEventPayloadV125,
        { schema: "receiz.attestation.approval.v125" }
      >).approvalDigest;
      if (next.approvalDigests.includes(approvalDigest)) fail("V125_ATTESTATION_APPROVAL_DIGEST_DUPLICATE");
      next.approverIds.push(event.actorReceizId);
      next.approvalDigests.push(approvalDigest);
      next.approverIds.sort(compareText);
      next.status = next.approverIds.length === domain.workflow.minimumApprovers
        ? "approval_complete"
        : "approval_pending";
      return next;
    }
    case "issued":
      if (!evidenceSatisfiesEveryRule(domain, state.evidenceBundle)) {
        fail("V125_ATTESTATION_EVALUATION_RULES_UNSATISFIED");
      }
      requirePreApprovalStages(domain, state, true);
      if (state.approverIds.length !== domain.workflow.minimumApprovers
        || (domain.workflow.minimumApprovers > 0 && state.status !== "approval_complete")) {
        fail("V125_ATTESTATION_APPROVAL_QUORUM_REQUIRED");
      }
      next.status = "issued";
      return next;
    case "denied":
      if (state.status === "draft") fail("V125_ATTESTATION_SUBMISSION_REQUIRED");
      next.status = "denied";
      return next;
    case "withdrawn":
      next.status = "withdrawn";
      return next;
    case "expired":
      if (BigInt(event.eventKai) < BigInt(application.expiresAtKai)) {
        fail("V125_ATTESTATION_APPLICATION_NOT_EXPIRED");
      }
      next.status = "expired";
      return next;
  }
}

function eventCoordinatesMatch(
  application: ReceizAttestationApplicationV125,
  event: ReceizAttestationEventV125,
): boolean {
  return event.applicationId === application.applicationId
    && event.domainId === application.domainId
    && event.credentialType === application.credentialType;
}

async function verifiedHistoryInput(
  value: unknown,
  authority: ReceizAttestationAuthorityV125,
): Promise<Readonly<{
  domain: ReceizAttestationDomainV125;
  application: ReceizAttestationApplicationV125;
  events: readonly unknown[];
}>> {
  const record = closedRecord(value, ["domain", "genesis", "events"], "V125_ATTESTATION_HISTORY_INPUT_INVALID");
  const domain = parseReceizAttestationDomainV125(record.domain);
  const application = await parseApplication(record.genesis, domain, authority);
  const events = exactArray(record.events, "V125_ATTESTATION_HISTORY_INVALID");
  if (events.length > MAX_HISTORY) fail("V125_ATTESTATION_HISTORY_LIMIT");
  return { domain, application, events };
}

async function verifyHistory(
  input: unknown,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationApplicationStateV125> {
  const verified = await verifiedHistoryInput(input, authority);
  let working: WorkingState = {
    status: "draft",
    acceptedHead: verified.application.acceptedHead,
    latestKai: verified.application.createdKai,
    approverIds: [],
    approvalDigests: [],
    evidenceBundle: verified.application.evidenceBundle,
    evaluationSatisfied: false,
    reviewSatisfied: false,
    outstandingEvidenceRequest: null,
  };
  const history: ReceizAttestationEventV125[] = [];
  const eventDigests = new Set<string>();
  const idempotencyKeys = new Set<string>();
  for (const value of verified.events) {
    const event = await parseEvent(value, verified.domain, authority);
    if (eventDigests.has(event.eventDigest)) fail("V125_ATTESTATION_EVENT_REPLAY");
    if (idempotencyKeys.has(event.idempotencyKey)) fail("V125_ATTESTATION_IDEMPOTENCY_REPLAY");
    if (!eventCoordinatesMatch(verified.application, event)) fail("V125_ATTESTATION_EVENT_COORDINATE_MISMATCH");
    if (event.expectedPriorHead !== working.acceptedHead) fail("V125_ATTESTATION_STALE_HEAD");
    if (BigInt(event.eventKai) < BigInt(working.latestKai)) fail("V125_ATTESTATION_EVENT_KAI_NONCAUSAL");
    working = await transition(verified.domain, verified.application, working, event, authority);
    eventDigests.add(event.eventDigest);
    idempotencyKeys.add(event.idempotencyKey);
    history.push(event);
  }
  return freeze({
    schema: "receiz.attestation.application-state.v125" as const,
    applicationId: verified.application.applicationId,
    domainId: verified.application.domainId,
    credentialType: verified.application.credentialType,
    subjectId: verified.application.subjectId,
    applicantReceizId: verified.application.applicantReceizId,
    registryDigest: verified.application.registryDigest,
    domainDigest: verified.application.domainDigest,
    claimSet: verified.application.claimSet,
    claimSetDigest: verified.application.claimSetDigest,
    claimSetHead: verified.application.claimSetHead,
    evidenceBundle: working.evidenceBundle,
    evidenceBundleDigest: working.evidenceBundle.evidenceBundleDigest,
    evidenceBundleHead: working.evidenceBundle.acceptedHead,
    createdKai: verified.application.createdKai,
    expiresAtKai: verified.application.expiresAtKai,
    latestKai: working.latestKai,
    status: working.status,
    acceptedHead: working.acceptedHead,
    approverIds: [...working.approverIds],
    evaluationSatisfied: working.evaluationSatisfied,
    reviewSatisfied: working.reviewSatisfied,
    outstandingEvidenceRequest: working.outstandingEvidenceRequest,
    history: [...history],
    authority: {
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    },
  });
}

export async function verifyReceizAttestationHistoryV125(input: Readonly<{
  domain: ReceizAttestationDomainV125;
  genesis: ReceizAttestationApplicationV125;
  events: readonly ReceizAttestationEventV125[];
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationApplicationStateV125> {
  return zeroWriteBoundary(() => verifyHistory(input, authority));
}

export async function verifyReceizAttestationIssuanceEvidenceV125(
  input: ReceizAttestationIssuanceEvidenceV125,
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizAttestationIssuanceAdmissionV125> {
  return zeroWriteBoundary(async () => {
    const record = closedRecord(input, ["domain", "genesis", "events"], "V125_ATTESTATION_ISSUANCE_EVIDENCE_INVALID");
    const verified = await verifiedHistoryInput(record, authority);
    const state = await verifyHistory(record, authority);
    const issue = state.history.at(-1);
    if (state.status !== "issued" || !issue || issue.kind !== "issued"
      || issue.payload.schema !== "receiz.attestation.issuance.v125"
      || issue.eventDigest !== state.acceptedHead) {
      fail("V125_ATTESTATION_ISSUANCE_NOT_ACCEPTED");
    }
    return freeze({
      schema: "receiz.attestation.issuance-admission.v125" as const,
      domain: verified.domain,
      genesis: verified.application,
      events: state.history,
      state,
      authority: freeze({
        admissionIsProofAuthority: false as const,
        strongerTruth: "sealed-receiz-proof-object" as const,
      }),
    });
  });
}

function decodeCanonicalAttestationArtifactPayload(bytes: Uint8Array): unknown {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const canonical = new TextEncoder().encode(canonicalizeReceizV122(decoded));
    if (canonical.byteLength !== bytes.byteLength
      || canonical.some((byte, index) => byte !== bytes[index])) {
      fail("V125_ATTESTATION_PAYLOAD_NONCANONICAL");
    }
  } catch {
    fail("V125_ATTESTATION_PAYLOAD_INVALID");
  }
  return decoded;
}

export async function verifyAndOpenReceizAttestationArtifactV125(input: Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizOpenedAttestationArtifactV125> {
  const code = "V125_ATTESTATION_ENCLOSING_PROOF_INVALID";
  let record: Readonly<Record<string, unknown>>;
  try { record = closedRecord(input, ["artifact", "verifier"], code); }
  catch { throw new TypeError(code); }
  const opened = await openVerifiedReceizV125ArtifactPayload({
    artifact: record.artifact as ReceizPortableSealedArtifactV124,
    verifier: record.verifier as ReceizV125EnclosingArtifactVerifierOptions,
    expectedPayloadMimeType: "application/vnd.receiz.attestation+json",
    enclosingProofError: code,
    payloadError: "V125_ATTESTATION_PAYLOAD_INVALID",
  }, async (bytes, binding) => {
    const payload = decodeCanonicalAttestationArtifactPayload(bytes) as { domain: ReceizAttestationDomainV125; genesis: ReceizAttestationApplicationV125; events: readonly ReceizAttestationEventV125[] };
    const additions = await readReceizLifecycleAdditionsV125<ReceizAttestationEventV125>(binding, "attestation", input.verifier);
    const state = await verifyReceizAttestationHistoryV125({ ...payload, events: [...payload.events, ...additions] }, authority);
    if (binding.ownerReceizId !== state.applicantReceizId
      || binding.provenance.root !== state.applicationId) {
      fail("V125_ATTESTATION_ARTIFACT_BINDING_MISMATCH");
    }
    return { state, domain: payload.domain, genesis: payload.genesis };
  });
  return freeze({
    schema: "receiz.opened-attestation-artifact.v125" as const,
    artifactSha256: opened.artifactSha256,
    artifactPayloadSha256: opened.artifactPayloadSha256,
    proofObjectId: opened.proofObjectId,
    ownerReceizId: opened.ownerReceizId,
    ownership: opened.ownership,
    provenance: opened.provenance,
    acceptedHead: opened.projection.state.acceptedHead,
    state: opened.projection.state,
    domain: opened.projection.domain,
    genesis: opened.projection.genesis,
    authority: freeze({
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

export async function projectReceizAttestationApplicationV125(input: Readonly<{
  domain: ReceizAttestationDomainV125;
  genesis: ReceizAttestationApplicationV125;
  events: readonly ReceizAttestationEventV125[];
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationApplicationStateV125> {
  return zeroWriteBoundary(() => verifyHistory(input, authority));
}

async function planDigests(event: ReceizAttestationEventV125, transitionPlan?: ReceizArtifactAppendPlan): Promise<Readonly<{
  planIdentity: string;
  confirmationDigest: string;
}>> {
  const planIdentity = await authorityDigest("plan", "receiz.attestation.event-plan.v125", { event, ...(transitionPlan ? { transitionPlanDigest: transitionPlan.planDigest.value } : {}) });
  const confirmationDigest = await authorityDigest("confirmation", "receiz.attestation.event-confirmation.v125", {
    planIdentity,
    eventDigest: event.eventDigest,
  });
  return freeze({ planIdentity, confirmationDigest });
}

async function makePlan(event: ReceizAttestationEventV125, transitionPlan?: ReceizArtifactAppendPlan): Promise<ReceizAttestationEventPlanV125> {
  const digests = await planDigests(event, transitionPlan);
  return freeze({
    schema: "receiz.attestation.event-plan.v125" as const,
    ...(transitionPlan ? { transitionPlan } : {}),
    event,
    planIdentity: digests.planIdentity,
    confirmationDigest: digests.confirmationDigest,
    confirmationRequired: true as const,
    writesPerformed: 0 as const,
    authority: freeze({
      planIsAdmission: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

async function planEvent(input: unknown, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationEventPlanV125> {
  const record = closedRecord(input, ["domain", "genesis", "events", "event"], "V125_ATTESTATION_PLAN_INPUT_INVALID");
  const domain = parseReceizAttestationDomainV125(record.domain);
  const application = await parseApplication(record.genesis, domain, authority);
  const state = await verifyHistory({ domain, genesis: application, events: record.events }, authority);
  const event = await createEvent(record.event, domain, authority);
  if (!eventCoordinatesMatch(application, event)) fail("V125_ATTESTATION_EVENT_COORDINATE_MISMATCH");
  if (event.expectedPriorHead !== state.acceptedHead) fail("V125_ATTESTATION_STALE_HEAD");
  if (state.history.some((prior) => prior.eventDigest === event.eventDigest)) fail("V125_ATTESTATION_EVENT_REPLAY");
  if (state.history.some((prior) => prior.idempotencyKey === event.idempotencyKey)) {
    fail("V125_ATTESTATION_IDEMPOTENCY_REPLAY");
  }
  if (BigInt(event.eventKai) < BigInt(state.latestKai)) fail("V125_ATTESTATION_EVENT_KAI_NONCAUSAL");
  const working: WorkingState = {
    status: state.status,
    acceptedHead: state.acceptedHead,
    latestKai: state.latestKai,
    approverIds: [...state.approverIds],
    approvalDigests: state.approverIds.map((approverReceizId) => {
      const prior = [...state.history].reverse().find((candidate) =>
        candidate.kind === "approval_recorded" && candidate.actorReceizId === approverReceizId);
      if (!prior || prior.payload.schema !== "receiz.attestation.approval.v125") {
        fail("V125_ATTESTATION_APPROVAL_HISTORY_INVALID");
      }
      return prior.payload.approvalDigest;
    }),
    evidenceBundle: state.evidenceBundle,
    evaluationSatisfied: state.evaluationSatisfied,
    reviewSatisfied: state.reviewSatisfied,
    outstandingEvidenceRequest: state.outstandingEvidenceRequest,
  };
  await transition(domain, application, working, event, authority);
  return makePlan(event);
}

export async function planReceizAttestationEventV125(input: Readonly<{
  sealedSource?: ReceizSealedLifecycleContextV125;
  domain: ReceizAttestationDomainV125;
  genesis: ReceizAttestationApplicationV125;
  events: readonly ReceizAttestationEventV125[];
  event: ReceizAttestationEventInputV125;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationEventPlanV125> {
  return zeroWriteBoundary(async () => {
    closedRecord(input, ["domain", "genesis", "events", "event", ...(Object.prototype.hasOwnProperty.call(input, "sealedSource") ? ["sealedSource"] : [])], "V125_ATTESTATION_PLAN_INPUT_INVALID");
    const { sealedSource, ...draft } = input;
    if (!sealedSource) return planEvent(draft, authority);
    const context = structuredClone(sealedSource);
    const { opened } = await readReceizLifecyclePayloadV125(context);
    const source = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(opened.payloadBytes));
    const projected = await verifyAndOpenReceizAttestationArtifactV125({ artifact: context.sourceArtifact, verifier: context.verifier }, authority);
    source.events = projected.state.history;
    if (canonicalizeReceizV122(source) !== canonicalizeReceizV122({ domain: input.domain, genesis: input.genesis, events: input.events })) fail("V125_ATTESTATION_SOURCE_INPUT_MISMATCH");
    const pure = await planEvent(draft, authority);
    const transitionPlan = await planReceizSealedLifecycleV125(context, "attestation", pure.event);
    const plan = await makePlan(pure.event, transitionPlan);
    retainReceizLifecyclePlanV125(plan, context, transitionPlan);
    return plan;
  });
}

export async function applyReceizAttestationEventV125(input: ReceizSealedLifecycleExecutionV125 & Readonly<{
  domain: ReceizAttestationDomainV125;
  genesis: ReceizAttestationApplicationV125;
  events: readonly ReceizAttestationEventV125[];
  plan: ReceizAttestationEventPlanV125;
  confirmationDigest: string;
}>, authority: ReceizAttestationAuthorityV125): Promise<ReceizAttestationEventApplyV125> {
  return zeroWriteBoundary(async () => {
    const held = readReceizLifecyclePlanCustodyV125(input.plan);
    if (held) closedRecord(input, ["domain", "genesis", "events", "plan", "confirmationDigest", "capability", "sealer", "store"], "V125_ATTESTATION_APPLY_INPUT_INVALID");
    if (!held || !input.capability || !input.sealer || !input.store) fail("V125_ATTESTATION_SEALED_TRANSITION_REQUIRED");
    const expected = await makePlan(input.plan.event, held.transitionPlan);
    if (input.plan.planIdentity !== expected.planIdentity || input.confirmationDigest !== expected.confirmationDigest) fail("V125_ATTESTATION_CONFIRMATION_MISMATCH");
    const { opened } = await readReceizLifecyclePayloadV125(held.context);
    const source = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(opened.payloadBytes));
    const prior = await verifyAndOpenReceizAttestationArtifactV125({ artifact: held.context.sourceArtifact, verifier: held.context.verifier }, authority);
    source.events = prior.state.history;
    if (canonicalizeReceizV122(source) !== canonicalizeReceizV122({ domain: input.domain, genesis: input.genesis, events: input.events })) fail("V125_ATTESTATION_SOURCE_INPUT_MISMATCH");
    const result = await applyReceizSealedLifecycleV125(input.plan, input, (artifact, verifier) => verifyAndOpenReceizAttestationArtifactV125({ artifact, verifier }, authority));
    const state = result.projection.state;
    return freeze({ schema: "receiz.attestation.event-apply.v125" as const,
      state, history: state.history, append: input.plan.event,
      sourceArtifact: result.sourceArtifact, committedTransition: result.committedTransition, writesPerformed: result.writesPerformed,
      authority: freeze({ applyIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }) });
  });
}
