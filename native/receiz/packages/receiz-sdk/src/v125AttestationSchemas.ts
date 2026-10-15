import { digestReceizAuthority } from "./authorityEncoding.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import { RECEIZ_CURRENT_REGISTRY_DIGEST } from "./releaseIdentity.js";
import { freeze } from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";

export type ReceizAttestationDisclosureV125 = "public" | "selective" | "private";
export type ReceizAttestationValueTypeV125 = "string" | "boolean" | "integer" | "date" | "digest";
export type ReceizAttestationEvaluationOperatorV125 = "minimum-count";
export type ReceizAttestationActorActionV125 =
  | "submitted" | "evidence_requested" | "evidence_submitted"
  | "evaluation_complete" | "review_complete" | "approval_recorded"
  | "issued" | "denied" | "withdrawn" | "expired";

export type ReceizAttestationClaimSchemaV125 = Readonly<{
  name: string;
  schemaId: string;
  schemaVersion: number;
  valueType: ReceizAttestationValueTypeV125;
  disclosure: ReceizAttestationDisclosureV125;
  issuerPolicy: string;
  verifierPolicy: string;
}>;

export type ReceizAttestationEvidenceRequirementV125 = Readonly<{
  evidenceType: string;
  classification: ReceizAttestationDisclosureV125;
  minimumCount: number;
  verifierBinding: string;
  evaluatorPolicy: string;
}>;

export type ReceizAttestationEvaluationRuleV125 = Readonly<{
  ruleId: string;
  evidenceType: string;
  operator: ReceizAttestationEvaluationOperatorV125;
  threshold: number;
  satisfiedOutcomeCode: string;
  unsatisfiedOutcomeCode: string;
}>;

export type ReceizAttestationActorRoleLawV125 = Readonly<{
  role: string;
  allowedActions: readonly ReceizAttestationActorActionV125[];
}>;

export type ReceizAttestationReviewPolicyV125 = Readonly<{
  satisfiedOutcomeCode: string;
  unsatisfiedOutcomeCode: string;
}>;

export type ReceizAttestationDomainV125 = Readonly<{
  schema: "receiz.attestation.domain.v125";
  domainId: string;
  credentialTypes: readonly string[];
  claimSchemas: readonly ReceizAttestationClaimSchemaV125[];
  evidenceRequirements: readonly ReceizAttestationEvidenceRequirementV125[];
  evaluationRules: readonly ReceizAttestationEvaluationRuleV125[];
  outcomeCodes: readonly string[];
  actorRoles: readonly ReceizAttestationActorRoleLawV125[];
  workflow: Readonly<{
    automatedEvaluation: boolean;
    humanReview: boolean;
    minimumApprovers: number;
    applicationWindowKai: string;
    evaluatorImplementationDigest: string | null;
  }>;
  reviewPolicy: ReceizAttestationReviewPolicyV125;
  lifecycle: Readonly<{ renewable: boolean; suspendable: boolean; revocable: boolean; replaceable: boolean }>;
  consent: Readonly<{ required: boolean; binding: "accepted-proof-head" }>;
  visibility: Readonly<{
    publicClaims: "public";
    selectiveClaims: "consent-bound";
    privateClaims: "commitment-only";
    evidence: "reference-only";
  }>;
  constitutionalLawIds: readonly string[];
  registryDigest: string;
  authority: Readonly<{ definitionIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizAttestationClaimValueV125 = string | boolean | number;

export type ReceizAttestationClaimV125 = Readonly<{
  name: string;
  schemaId: string;
  schemaVersion: number;
  disclosure: ReceizAttestationDisclosureV125;
  issuerPolicy: string;
  verifierPolicy: string;
  value?: ReceizAttestationClaimValueV125;
  commitment: string;
  evidenceIds: readonly string[];
}>;

export type ReceizClaimSetV125 = Readonly<{
  schema: "receiz.attestation.claim-set.v125";
  domainId: string;
  credentialType: string;
  subjectId: string;
  registryDigest: string;
  domainDigest: string;
  claims: readonly ReceizAttestationClaimV125[];
  issuedKai: string;
  validFromKai: string;
  expiresAtKai: string | null;
  predecessorHead: string | null;
  acceptedHead: string;
  authority: Readonly<{ claimSetIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
  claimSetDigest: string;
}>;

export type ReceizEvidenceReferenceV125 = Readonly<{
  evidenceId: string;
  evidenceType: string;
  classification: ReceizAttestationDisclosureV125;
  verifierBinding: string;
  evaluatorPolicy: string;
  artifactSha256: ReceizPortableSealedArtifactV124["artifactSha256"];
  proofObjectId: string;
  subjectId: string;
  custodyHead: string;
  contentCommitment: string;
}>;

export type ReceizEvidenceBundleV125 = Readonly<{
  schema: "receiz.attestation.evidence-bundle.v125";
  domainId: string;
  credentialType: string;
  subjectId: string;
  registryDigest: string;
  domainDigest: string;
  evidence: readonly ReceizEvidenceReferenceV125[];
  collectedKai: string;
  predecessorHead: string | null;
  acceptedHead: string;
  authority: Readonly<{ evidenceBundleIsProofAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
  evidenceBundleDigest: string;
}>;

export type ReceizClaimInputV125 = Readonly<{
  name: string;
  disclosure?: ReceizAttestationDisclosureV125;
  value?: ReceizAttestationClaimValueV125;
  commitment?: string;
  evidenceIds: readonly string[];
}>;

export type ReceizClaimSetInputV125 = Readonly<{
  domain: ReceizAttestationDomainV125;
  credentialType: string;
  subjectId: string;
  claims: readonly ReceizClaimInputV125[];
  issuedKai: string;
  validFromKai: string;
  expiresAtKai: string | null;
  predecessorHead: string | null;
  acceptedHead: string;
}>;

export type ReceizEvidenceBundleInputV125 = Readonly<{
  domain: ReceizAttestationDomainV125;
  credentialType: string;
  subjectId: string;
  evidence: readonly ReceizEvidenceReferenceV125[];
  collectedKai: string;
  predecessorHead: string | null;
  acceptedHead: string;
}>;

const HEX64 = /^[0-9a-f]{64}$/;
const KAI = /^(0|[1-9][0-9]*)$/;
const NAME = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const MAX_CREDENTIAL_TYPES = 64;
const MAX_CLAIMS = 256;
const MAX_EVIDENCE = 1024;
const MAX_REFERENCES = 256;
const MAX_DOMAIN_RULES = 256;
const ATTESTATION_ACTIONS: readonly ReceizAttestationActorActionV125[] = [
  "submitted", "evidence_requested", "evidence_submitted", "evaluation_complete", "review_complete",
  "approval_recorded", "issued", "denied", "withdrawn", "expired",
];

function fail(code: string): never {
  throw new TypeError(code);
}

function closedRecord(value: unknown, expectedKeys: readonly string[], code: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
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
  const lengthDescriptor = descriptors["length"];
  if (!lengthDescriptor || !("value" in lengthDescriptor)
    || typeof lengthDescriptor.value !== "number"
    || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
    || Reflect.ownKeys(descriptors).length !== lengthDescriptor.value + 1) fail(code);
  const entries: unknown[] = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code);
  }
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    entries.push(descriptors[String(index)]!.value);
  }
  return entries;
}

function closedOptionalRecord(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) fail(code);
  const names = keys as string[];
  if (required.some((key) => !names.includes(key))
    || names.some((key) => !required.includes(key) && !optional.includes(key))) fail(code);
  const output = Object.create(null) as Record<string, unknown>;
  for (const key of names) {
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

function ownOptional(record: Readonly<Record<string, unknown>>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function canonicalText(value: unknown, code: string, maximum = 256): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum
    || value.trim() !== value || value.normalize("NFC") !== value) fail(code);
  return value;
}

function name(value: unknown, code: string): string {
  const parsed = canonicalText(value, code);
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

function positiveKai(value: unknown, code: string): string {
  const parsed = kai(value, code);
  if (parsed === "0") fail(code);
  return parsed;
}

function boolean(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") fail(code);
  return value;
}

function positiveInteger(value: unknown, maximum: number, code: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > maximum) fail(code);
  return value;
}

function sortedUnique(values: readonly string[], code: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) fail(code);
  }
}

function compareCanonicalText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseStringList(
  value: unknown,
  code: string,
  options: Readonly<{ minimum?: number; maximum: number; sortInput?: boolean }> = { maximum: MAX_REFERENCES },
): readonly string[] {
  const entries = exactArray(value, code);
  const minimum = options.minimum ?? 0;
  if (entries.length < minimum || entries.length > options.maximum) fail(code);
  const parsed = entries.map((entry) => name(entry, code));
  if (new Set(parsed).size !== parsed.length) fail(code);
  if (options.sortInput) parsed.sort(compareCanonicalText);
  else sortedUnique(parsed, code);
  return freeze(parsed);
}

function parseCanonicalTextList(
  value: unknown,
  code: string,
  options: Readonly<{ minimum: number; maximum: number }>,
): readonly string[] {
  const entries = exactArray(value, code);
  if (entries.length < options.minimum || entries.length > options.maximum) fail(code);
  const parsed = entries.map((entry) => canonicalText(entry, code));
  sortedUnique(parsed, code);
  return freeze(parsed);
}

async function domainDigest(domain: ReceizAttestationDomainV125): Promise<string> {
  return digestReceizAuthority("registry", domain.schema, domain);
}

function domainAuthority(value: unknown): ReceizAttestationDomainV125["authority"] {
  const parsed = closedRecord(
    value,
    ["definitionIsProofAuthority", "strongerTruth"],
    "V125_ATTESTATION_DOMAIN_AUTHORITY_INVALID",
  );
  if (parsed.definitionIsProofAuthority !== false || parsed.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V125_ATTESTATION_DOMAIN_AUTHORITY_INVALID");
  }
  return freeze({ definitionIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" });
}

function parseClaimSchema(value: unknown): ReceizAttestationClaimSchemaV125 {
  const parsed = closedRecord(
    value,
    ["name", "schemaId", "schemaVersion", "valueType", "disclosure", "issuerPolicy", "verifierPolicy"],
    "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID",
  );
  const valueTypes: readonly ReceizAttestationValueTypeV125[] = ["string", "boolean", "integer", "date", "digest"];
  const disclosures: readonly ReceizAttestationDisclosureV125[] = ["public", "selective", "private"];
  if (!valueTypes.includes(parsed.valueType as ReceizAttestationValueTypeV125)
    || !disclosures.includes(parsed.disclosure as ReceizAttestationDisclosureV125)) {
    fail("V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID");
  }
  return freeze({
    name: name(parsed.name, "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID"),
    schemaId: name(parsed.schemaId, "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID"),
    schemaVersion: positiveInteger(parsed.schemaVersion, Number.MAX_SAFE_INTEGER, "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID"),
    valueType: parsed.valueType as ReceizAttestationValueTypeV125,
    disclosure: parsed.disclosure as ReceizAttestationDisclosureV125,
    issuerPolicy: name(parsed.issuerPolicy, "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID"),
    verifierPolicy: name(parsed.verifierPolicy, "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID"),
  });
}

function parseEvidenceRequirement(value: unknown): ReceizAttestationEvidenceRequirementV125 {
  const code = "V125_ATTESTATION_DOMAIN_EVIDENCE_REQUIREMENTS_INVALID";
  const parsed = closedRecord(value, [
    "evidenceType", "classification", "minimumCount", "verifierBinding", "evaluatorPolicy",
  ], code);
  const classifications: readonly ReceizAttestationDisclosureV125[] = ["public", "selective", "private"];
  if (!classifications.includes(parsed.classification as ReceizAttestationDisclosureV125)) fail(code);
  return freeze({
    evidenceType: name(parsed.evidenceType, code),
    classification: parsed.classification as ReceizAttestationDisclosureV125,
    minimumCount: positiveInteger(parsed.minimumCount, MAX_EVIDENCE, code),
    verifierBinding: name(parsed.verifierBinding, code),
    evaluatorPolicy: name(parsed.evaluatorPolicy, code),
  });
}

function parseEvaluationRule(
  value: unknown,
  evidenceTypes: ReadonlySet<string>,
  outcomeCodes: ReadonlySet<string>,
): ReceizAttestationEvaluationRuleV125 {
  const code = "V125_ATTESTATION_DOMAIN_EVALUATION_RULES_INVALID";
  const parsed = closedRecord(value, [
    "ruleId", "evidenceType", "operator", "threshold", "satisfiedOutcomeCode", "unsatisfiedOutcomeCode",
  ], code);
  const evidenceType = name(parsed.evidenceType, code);
  const satisfiedOutcomeCode = name(parsed.satisfiedOutcomeCode, code);
  const unsatisfiedOutcomeCode = name(parsed.unsatisfiedOutcomeCode, code);
  if (parsed.operator !== "minimum-count" || !evidenceTypes.has(evidenceType)
    || !outcomeCodes.has(satisfiedOutcomeCode) || !outcomeCodes.has(unsatisfiedOutcomeCode)
    || satisfiedOutcomeCode === unsatisfiedOutcomeCode) fail(code);
  return freeze({
    ruleId: name(parsed.ruleId, code),
    evidenceType,
    operator: "minimum-count",
    threshold: positiveInteger(parsed.threshold, MAX_EVIDENCE, code),
    satisfiedOutcomeCode,
    unsatisfiedOutcomeCode,
  });
}

function parseActorRole(value: unknown): ReceizAttestationActorRoleLawV125 {
  const code = "V125_ATTESTATION_DOMAIN_ACTOR_ROLES_INVALID";
  const parsed = closedRecord(value, ["role", "allowedActions"], code);
  const actions = parseStringList(parsed.allowedActions, code, { minimum: 1, maximum: ATTESTATION_ACTIONS.length });
  if (actions.some((action) => !ATTESTATION_ACTIONS.includes(action as ReceizAttestationActorActionV125))) fail(code);
  return freeze({
    role: name(parsed.role, code),
    allowedActions: actions as readonly ReceizAttestationActorActionV125[],
  });
}

export function parseReceizAttestationDomainV125(value: unknown): ReceizAttestationDomainV125 {
  const parsed = closedRecord(value, [
    "schema", "domainId", "credentialTypes", "claimSchemas", "evidenceRequirements", "evaluationRules",
    "outcomeCodes", "actorRoles", "workflow", "reviewPolicy", "lifecycle", "consent", "visibility",
    "constitutionalLawIds", "registryDigest", "authority",
  ], "V125_ATTESTATION_DOMAIN_CLOSED_SHAPE_INVALID");
  if (parsed.schema !== "receiz.attestation.domain.v125") fail("V125_ATTESTATION_DOMAIN_SCHEMA_INVALID");
  const credentialTypes = parseStringList(parsed.credentialTypes, "V125_ATTESTATION_DOMAIN_CREDENTIAL_TYPES_INVALID", {
    minimum: 1,
    maximum: MAX_CREDENTIAL_TYPES,
  });
  const claimEntries = exactArray(parsed.claimSchemas, "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID");
  if (claimEntries.length < 1 || claimEntries.length > MAX_CLAIMS) fail("V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID");
  const claimSchemas = claimEntries.map(parseClaimSchema);
  sortedUnique(claimSchemas.map((entry) => entry.name), "V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID");
  if (new Set(claimSchemas.map((entry) => `${entry.schemaId}\0${entry.schemaVersion}`)).size !== claimSchemas.length) {
    fail("V125_ATTESTATION_DOMAIN_CLAIM_SCHEMAS_INVALID");
  }
  const evidenceEntries = exactArray(parsed.evidenceRequirements, "V125_ATTESTATION_DOMAIN_EVIDENCE_REQUIREMENTS_INVALID");
  if (evidenceEntries.length < 1 || evidenceEntries.length > MAX_DOMAIN_RULES) {
    fail("V125_ATTESTATION_DOMAIN_EVIDENCE_REQUIREMENTS_INVALID");
  }
  const evidenceRequirements = evidenceEntries.map(parseEvidenceRequirement);
  sortedUnique(evidenceRequirements.map((entry) => entry.evidenceType), "V125_ATTESTATION_DOMAIN_EVIDENCE_REQUIREMENTS_INVALID");
  const outcomeCodes = parseStringList(parsed.outcomeCodes, "V125_ATTESTATION_DOMAIN_OUTCOME_CODES_INVALID", {
    minimum: 2,
    maximum: MAX_DOMAIN_RULES,
  });
  const evaluationEntries = exactArray(parsed.evaluationRules, "V125_ATTESTATION_DOMAIN_EVALUATION_RULES_INVALID");
  if (evaluationEntries.length < 1 || evaluationEntries.length > MAX_DOMAIN_RULES) {
    fail("V125_ATTESTATION_DOMAIN_EVALUATION_RULES_INVALID");
  }
  const evaluationRules = evaluationEntries.map((entry) => parseEvaluationRule(
    entry,
    new Set(evidenceRequirements.map((requirement) => requirement.evidenceType)),
    new Set(outcomeCodes),
  ));
  sortedUnique(evaluationRules.map((entry) => entry.ruleId), "V125_ATTESTATION_DOMAIN_EVALUATION_RULES_INVALID");
  const actorEntries = exactArray(parsed.actorRoles, "V125_ATTESTATION_DOMAIN_ACTOR_ROLES_INVALID");
  if (actorEntries.length < 1 || actorEntries.length > MAX_DOMAIN_RULES) fail("V125_ATTESTATION_DOMAIN_ACTOR_ROLES_INVALID");
  const actorRoles = actorEntries.map(parseActorRole);
  sortedUnique(actorRoles.map((entry) => entry.role), "V125_ATTESTATION_DOMAIN_ACTOR_ROLES_INVALID");
  const workflow = closedRecord(
    parsed.workflow,
    [
      "automatedEvaluation", "humanReview", "minimumApprovers", "applicationWindowKai",
      "evaluatorImplementationDigest",
    ],
    "V125_ATTESTATION_DOMAIN_WORKFLOW_INVALID",
  );
  if (!Number.isSafeInteger(workflow.minimumApprovers)
    || (workflow.minimumApprovers as number) < 0 || (workflow.minimumApprovers as number) > 64) {
    fail("V125_ATTESTATION_DOMAIN_WORKFLOW_INVALID");
  }
  const automatedEvaluation = boolean(workflow.automatedEvaluation, "V125_ATTESTATION_DOMAIN_WORKFLOW_INVALID");
  const humanReview = boolean(workflow.humanReview, "V125_ATTESTATION_DOMAIN_WORKFLOW_INVALID");
  const applicationWindowKai = positiveKai(workflow.applicationWindowKai, "V125_ATTESTATION_DOMAIN_WORKFLOW_INVALID");
  let evaluatorImplementationDigest: string | null;
  if (automatedEvaluation) {
    evaluatorImplementationDigest = digest(
      workflow.evaluatorImplementationDigest,
      "V125_ATTESTATION_DOMAIN_WORKFLOW_INVALID",
    );
  } else {
    if (workflow.evaluatorImplementationDigest !== null) fail("V125_ATTESTATION_DOMAIN_WORKFLOW_INVALID");
    evaluatorImplementationDigest = null;
  }
  const reviewPolicyRecord = closedRecord(
    parsed.reviewPolicy,
    ["satisfiedOutcomeCode", "unsatisfiedOutcomeCode"],
    "V125_ATTESTATION_DOMAIN_REVIEW_POLICY_INVALID",
  );
  const satisfiedReviewOutcomeCode = name(
    reviewPolicyRecord.satisfiedOutcomeCode,
    "V125_ATTESTATION_DOMAIN_REVIEW_POLICY_INVALID",
  );
  const unsatisfiedReviewOutcomeCode = name(
    reviewPolicyRecord.unsatisfiedOutcomeCode,
    "V125_ATTESTATION_DOMAIN_REVIEW_POLICY_INVALID",
  );
  if (satisfiedReviewOutcomeCode === unsatisfiedReviewOutcomeCode
    || !outcomeCodes.includes(satisfiedReviewOutcomeCode)
    || !outcomeCodes.includes(unsatisfiedReviewOutcomeCode)) {
    fail("V125_ATTESTATION_DOMAIN_REVIEW_POLICY_INVALID");
  }
  const requiredActions: ReceizAttestationActorActionV125[] = ["submitted", "issued"];
  if (automatedEvaluation) requiredActions.push("evaluation_complete");
  if (humanReview) requiredActions.push("review_complete");
  if ((workflow.minimumApprovers as number) > 0) requiredActions.push("approval_recorded");
  if (requiredActions.some((action) => !actorRoles.some((entry) => entry.allowedActions.includes(action)))) {
    fail("V125_ATTESTATION_DOMAIN_ACTOR_ROLES_INVALID");
  }
  const lifecycle = closedRecord(
    parsed.lifecycle,
    ["renewable", "suspendable", "revocable", "replaceable"],
    "V125_ATTESTATION_DOMAIN_LIFECYCLE_INVALID",
  );
  const consent = closedRecord(parsed.consent, ["required", "binding"], "V125_ATTESTATION_DOMAIN_CONSENT_INVALID");
  if (consent.binding !== "accepted-proof-head") fail("V125_ATTESTATION_DOMAIN_CONSENT_INVALID");
  const visibility = closedRecord(
    parsed.visibility,
    ["publicClaims", "selectiveClaims", "privateClaims", "evidence"],
    "V125_ATTESTATION_DOMAIN_VISIBILITY_INVALID",
  );
  if (visibility.publicClaims !== "public" || visibility.selectiveClaims !== "consent-bound"
    || visibility.privateClaims !== "commitment-only" || visibility.evidence !== "reference-only") {
    fail("V125_ATTESTATION_DOMAIN_VISIBILITY_INVALID");
  }
  const constitutionalLawIds = parseCanonicalTextList(
    parsed.constitutionalLawIds,
    "V125_ATTESTATION_DOMAIN_CONSTITUTIONAL_LAWS_INVALID",
    { minimum: 1, maximum: MAX_DOMAIN_RULES },
  );
  const currentLaws = new Set(RECEIZ_CURRENT_CONSTITUTION_REGISTRY.laws.map((law) => law.id));
  if (constitutionalLawIds.some((lawId) => !currentLaws.has(lawId))) {
    fail("V125_ATTESTATION_DOMAIN_CONSTITUTIONAL_LAWS_INVALID");
  }
  const registryDigest = digest(parsed.registryDigest, "V125_ATTESTATION_DOMAIN_REGISTRY_INVALID");
  if (registryDigest !== RECEIZ_CURRENT_REGISTRY_DIGEST) fail("V125_ATTESTATION_DOMAIN_REGISTRY_MISMATCH");
  return freeze({
    schema: "receiz.attestation.domain.v125",
    domainId: name(parsed.domainId, "V125_ATTESTATION_DOMAIN_ID_INVALID"),
    credentialTypes,
    claimSchemas: freeze(claimSchemas),
    evidenceRequirements: freeze(evidenceRequirements),
    evaluationRules: freeze(evaluationRules),
    outcomeCodes,
    actorRoles: freeze(actorRoles),
    workflow: freeze({
      automatedEvaluation,
      humanReview,
      minimumApprovers: workflow.minimumApprovers as number,
      applicationWindowKai,
      evaluatorImplementationDigest,
    }),
    reviewPolicy: freeze({
      satisfiedOutcomeCode: satisfiedReviewOutcomeCode,
      unsatisfiedOutcomeCode: unsatisfiedReviewOutcomeCode,
    }),
    lifecycle: freeze({
      renewable: boolean(lifecycle.renewable, "V125_ATTESTATION_DOMAIN_LIFECYCLE_INVALID"),
      suspendable: boolean(lifecycle.suspendable, "V125_ATTESTATION_DOMAIN_LIFECYCLE_INVALID"),
      revocable: boolean(lifecycle.revocable, "V125_ATTESTATION_DOMAIN_LIFECYCLE_INVALID"),
      replaceable: boolean(lifecycle.replaceable, "V125_ATTESTATION_DOMAIN_LIFECYCLE_INVALID"),
    }),
    consent: freeze({
      required: boolean(consent.required, "V125_ATTESTATION_DOMAIN_CONSENT_INVALID"),
      binding: "accepted-proof-head",
    }),
    visibility: freeze({
      publicClaims: "public",
      selectiveClaims: "consent-bound",
      privateClaims: "commitment-only",
      evidence: "reference-only",
    }),
    constitutionalLawIds,
    registryDigest,
    authority: domainAuthority(parsed.authority),
  });
}

function parseDate(value: unknown, code: string): string {
  const parsed = canonicalText(value, code, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parsed);
  if (!match) fail(code);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) fail(code);
  return parsed;
}

function claimValue(value: unknown, declaration: ReceizAttestationClaimSchemaV125): ReceizAttestationClaimValueV125 {
  const code = "V125_ATTESTATION_CLAIM_VALUE_INVALID";
  switch (declaration.valueType) {
    case "string": return canonicalText(value, code, 4096);
    case "boolean": return boolean(value, code);
    case "integer":
      if (typeof value !== "number" || !Number.isSafeInteger(value) || Object.is(value, -0)) fail(code);
      return value;
    case "date": return parseDate(value, code);
    case "digest": return digest(value, code);
  }
}

async function claimCommitment(input: Readonly<{
  domainId: string;
  credentialType: string;
  subjectId: string;
  name: string;
  disclosure: ReceizAttestationDisclosureV125;
  value: ReceizAttestationClaimValueV125;
}>): Promise<string> {
  return digestReceizAuthority("artifact", "receiz.attestation.claim-value.v125", input);
}

async function createClaim(
  value: unknown,
  domain: ReceizAttestationDomainV125,
  coordinate: Readonly<{ credentialType: string; subjectId: string }>,
  sortEvidenceIds: boolean,
): Promise<ReceizAttestationClaimV125> {
  const parsed = closedOptionalRecord(
    value,
    ["name", "evidenceIds"],
    ["schemaId", "schemaVersion", "disclosure", "issuerPolicy", "verifierPolicy", "value", "commitment"],
    "V125_ATTESTATION_CLAIMS_INVALID",
  );
  const claimName = name(parsed.name, "V125_ATTESTATION_CLAIMS_INVALID");
  const declaration = domain.claimSchemas.find((candidate) => candidate.name === claimName);
  if (!declaration) fail("V125_ATTESTATION_CLAIM_UNDECLARED");
  for (const [key, expected] of [
    ["schemaId", declaration.schemaId],
    ["schemaVersion", declaration.schemaVersion],
    ["issuerPolicy", declaration.issuerPolicy],
    ["verifierPolicy", declaration.verifierPolicy],
  ] as const) {
    if (Object.prototype.hasOwnProperty.call(parsed, key) && parsed[key] !== expected) {
      fail("V125_ATTESTATION_CLAIM_POLICY_MISMATCH");
    }
  }
  const hasDisclosure = Object.prototype.hasOwnProperty.call(parsed, "disclosure");
  const disclosure = ownOptional(parsed, "disclosure");
  if (hasDisclosure && disclosure === undefined) fail("V125_ATTESTATION_CLAIMS_INVALID");
  if (disclosure !== undefined && disclosure !== declaration.disclosure) {
    fail("V125_ATTESTATION_CLAIM_DISCLOSURE_MISMATCH");
  }
  const hasValue = Object.prototype.hasOwnProperty.call(parsed, "value");
  const hasCommitment = Object.prototype.hasOwnProperty.call(parsed, "commitment");
  const valueInput = ownOptional(parsed, "value");
  const commitmentInput = ownOptional(parsed, "commitment");
  if ((hasValue && valueInput === undefined) || (hasCommitment && commitmentInput === undefined)) {
    fail("V125_ATTESTATION_CLAIMS_INVALID");
  }
  const evidenceIds = parseStringList(parsed.evidenceIds, "V125_ATTESTATION_CLAIM_EVIDENCE_INVALID", {
    maximum: MAX_REFERENCES,
    sortInput: sortEvidenceIds,
  });
  if (declaration.disclosure === "private") {
    if (hasValue || !hasCommitment) fail("V125_ATTESTATION_PRIVATE_CLAIM_VALUE_FORBIDDEN");
    return freeze({
      name: claimName,
      schemaId: declaration.schemaId,
      schemaVersion: declaration.schemaVersion,
      disclosure: declaration.disclosure,
      issuerPolicy: declaration.issuerPolicy,
      verifierPolicy: declaration.verifierPolicy,
      commitment: digest(commitmentInput, "V125_ATTESTATION_CLAIM_COMMITMENT_INVALID"),
      evidenceIds,
    });
  }
  if (!hasValue && !hasCommitment) fail("V125_ATTESTATION_CLAIM_COMMITMENT_INVALID");
  if (!hasValue) {
    return freeze({
      name: claimName,
      schemaId: declaration.schemaId,
      schemaVersion: declaration.schemaVersion,
      disclosure: declaration.disclosure,
      issuerPolicy: declaration.issuerPolicy,
      verifierPolicy: declaration.verifierPolicy,
      commitment: digest(commitmentInput, "V125_ATTESTATION_CLAIM_COMMITMENT_INVALID"),
      evidenceIds,
    });
  }
  const exactValue = claimValue(valueInput, declaration);
  const expectedCommitment = await claimCommitment({
    domainId: domain.domainId,
    credentialType: coordinate.credentialType,
    subjectId: coordinate.subjectId,
    name: claimName,
    disclosure: declaration.disclosure,
    value: exactValue,
  });
  if (hasCommitment && digest(commitmentInput, "V125_ATTESTATION_CLAIM_COMMITMENT_INVALID") !== expectedCommitment) {
    fail("V125_ATTESTATION_CLAIM_COMMITMENT_MISMATCH");
  }
  return freeze({
    name: claimName,
    schemaId: declaration.schemaId,
    schemaVersion: declaration.schemaVersion,
    disclosure: declaration.disclosure,
    issuerPolicy: declaration.issuerPolicy,
    verifierPolicy: declaration.verifierPolicy,
    value: exactValue,
    commitment: expectedCommitment,
    evidenceIds,
  });
}

function claimSetAuthority(value: unknown): ReceizClaimSetV125["authority"] {
  const parsed = closedRecord(value, ["claimSetIsProofAuthority", "strongerTruth"], "V125_ATTESTATION_CLAIM_SET_AUTHORITY_INVALID");
  if (parsed.claimSetIsProofAuthority !== false || parsed.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V125_ATTESTATION_CLAIM_SET_AUTHORITY_INVALID");
  }
  return freeze({ claimSetIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" });
}

function evidenceBundleAuthority(value: unknown): ReceizEvidenceBundleV125["authority"] {
  const parsed = closedRecord(value, ["evidenceBundleIsProofAuthority", "strongerTruth"], "V125_ATTESTATION_EVIDENCE_BUNDLE_AUTHORITY_INVALID");
  if (parsed.evidenceBundleIsProofAuthority !== false || parsed.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V125_ATTESTATION_EVIDENCE_BUNDLE_AUTHORITY_INVALID");
  }
  return freeze({ evidenceBundleIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" });
}

function domainCoordinate(
  domainValue: unknown,
  credentialTypeValue: unknown,
  subjectIdValue: unknown,
): Readonly<{ domain: ReceizAttestationDomainV125; credentialType: string; subjectId: string }> {
  const domain = parseReceizAttestationDomainV125(domainValue);
  const credentialType = name(credentialTypeValue, "V125_ATTESTATION_CREDENTIAL_TYPE_INVALID");
  if (!domain.credentialTypes.includes(credentialType)) fail("V125_ATTESTATION_CREDENTIAL_TYPE_UNDECLARED");
  return freeze({ domain, credentialType, subjectId: canonicalText(subjectIdValue, "V125_ATTESTATION_SUBJECT_INVALID") });
}

function validateKaiWindow(issuedKai: string, validFromKai: string, expiresAtKai: string | null, code: string): void {
  if (BigInt(validFromKai) < BigInt(issuedKai) || (expiresAtKai !== null && BigInt(expiresAtKai) < BigInt(validFromKai))) fail(code);
}

export async function createReceizClaimSetV125(input: ReceizClaimSetInputV125): Promise<ReceizClaimSetV125> {
  const parsed = closedRecord(input, [
    "domain", "credentialType", "subjectId", "claims", "issuedKai", "validFromKai", "expiresAtKai",
    "predecessorHead", "acceptedHead",
  ], "V125_ATTESTATION_CLAIM_SET_INPUT_INVALID");
  const coordinate = domainCoordinate(parsed.domain, parsed.credentialType, parsed.subjectId);
  const claimInputs = exactArray(parsed.claims, "V125_ATTESTATION_CLAIMS_INVALID");
  if (claimInputs.length < 1 || claimInputs.length > MAX_CLAIMS) fail("V125_ATTESTATION_CLAIMS_INVALID");
  const claims = await Promise.all(claimInputs.map((entry) => createClaim(entry, coordinate.domain, coordinate, true)));
  claims.sort((left, right) => compareCanonicalText(left.name, right.name));
  if (new Set(claims.map((entry) => entry.name)).size !== claims.length) fail("V125_ATTESTATION_CLAIMS_INVALID");
  const issuedKai = kai(parsed.issuedKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  const validFromKai = kai(parsed.validFromKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  const expiresAtKai = parsed.expiresAtKai === null ? null : kai(parsed.expiresAtKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  validateKaiWindow(issuedKai, validFromKai, expiresAtKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  const basis = freeze({
    schema: "receiz.attestation.claim-set.v125" as const,
    domainId: coordinate.domain.domainId,
    credentialType: coordinate.credentialType,
    subjectId: coordinate.subjectId,
    registryDigest: coordinate.domain.registryDigest,
    domainDigest: await domainDigest(coordinate.domain),
    claims: freeze(claims),
    issuedKai,
    validFromKai,
    expiresAtKai,
    predecessorHead: nullableDigest(parsed.predecessorHead, "V125_ATTESTATION_CLAIM_SET_HEAD_INVALID"),
    acceptedHead: digest(parsed.acceptedHead, "V125_ATTESTATION_CLAIM_SET_HEAD_INVALID"),
    authority: freeze({ claimSetIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
  return freeze({ ...basis, claimSetDigest: await digestReceizAuthority("artifact", basis.schema, basis) });
}

async function parseClaim(value: unknown, domain: ReceizAttestationDomainV125, coordinate: Readonly<{ credentialType: string; subjectId: string }>): Promise<ReceizAttestationClaimV125> {
  const parsed = closedOptionalRecord(value, [
    "name", "schemaId", "schemaVersion", "disclosure", "issuerPolicy", "verifierPolicy", "commitment", "evidenceIds",
  ], ["value"], "V125_ATTESTATION_CLAIMS_INVALID");
  const created = await createClaim(parsed, domain, coordinate, false);
  if (parsed.schemaId !== created.schemaId || parsed.schemaVersion !== created.schemaVersion
    || parsed.disclosure !== created.disclosure || parsed.issuerPolicy !== created.issuerPolicy
    || parsed.verifierPolicy !== created.verifierPolicy) fail("V125_ATTESTATION_CLAIM_POLICY_MISMATCH");
  return created;
}

export async function parseReceizClaimSetV125(value: unknown, domainValue: unknown): Promise<ReceizClaimSetV125> {
  const parsed = closedRecord(value, [
    "schema", "domainId", "credentialType", "subjectId", "registryDigest", "domainDigest", "claims",
    "issuedKai", "validFromKai", "expiresAtKai", "predecessorHead", "acceptedHead", "authority", "claimSetDigest",
  ], "V125_ATTESTATION_CLAIM_SET_CLOSED_SHAPE_INVALID");
  if (parsed.schema !== "receiz.attestation.claim-set.v125") fail("V125_ATTESTATION_CLAIM_SET_SCHEMA_INVALID");
  const coordinate = domainCoordinate(domainValue, parsed.credentialType, parsed.subjectId);
  if (parsed.domainId !== coordinate.domain.domainId
    || digest(parsed.registryDigest, "V125_ATTESTATION_CLAIM_SET_REGISTRY_INVALID") !== coordinate.domain.registryDigest
    || digest(parsed.domainDigest, "V125_ATTESTATION_CLAIM_SET_DOMAIN_DIGEST_INVALID") !== await domainDigest(coordinate.domain)) {
    fail("V125_ATTESTATION_CLAIM_SET_DOMAIN_MISMATCH");
  }
  const claimEntries = exactArray(parsed.claims, "V125_ATTESTATION_CLAIMS_INVALID");
  if (claimEntries.length < 1 || claimEntries.length > MAX_CLAIMS) fail("V125_ATTESTATION_CLAIMS_INVALID");
  const claims = await Promise.all(claimEntries.map((entry) => parseClaim(entry, coordinate.domain, coordinate)));
  sortedUnique(claims.map((entry) => entry.name), "V125_ATTESTATION_CLAIMS_NONCANONICAL");
  const issuedKai = kai(parsed.issuedKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  const validFromKai = kai(parsed.validFromKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  const expiresAtKai = parsed.expiresAtKai === null ? null : kai(parsed.expiresAtKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  validateKaiWindow(issuedKai, validFromKai, expiresAtKai, "V125_ATTESTATION_CLAIM_SET_KAI_INVALID");
  const basis = freeze({
    schema: "receiz.attestation.claim-set.v125" as const,
    domainId: coordinate.domain.domainId,
    credentialType: coordinate.credentialType,
    subjectId: coordinate.subjectId,
    registryDigest: coordinate.domain.registryDigest,
    domainDigest: parsed.domainDigest as string,
    claims: freeze(claims),
    issuedKai,
    validFromKai,
    expiresAtKai,
    predecessorHead: nullableDigest(parsed.predecessorHead, "V125_ATTESTATION_CLAIM_SET_HEAD_INVALID"),
    acceptedHead: digest(parsed.acceptedHead, "V125_ATTESTATION_CLAIM_SET_HEAD_INVALID"),
    authority: claimSetAuthority(parsed.authority),
  });
  const claimSetDigest = digest(parsed.claimSetDigest, "V125_ATTESTATION_CLAIM_SET_DIGEST_INVALID");
  if (claimSetDigest !== await digestReceizAuthority("artifact", basis.schema, basis)) fail("V125_ATTESTATION_CLAIM_SET_DIGEST_MISMATCH");
  return freeze({ ...basis, claimSetDigest });
}

function parseEvidenceReference(
  value: unknown,
  expectedSubjectId: string,
  domain: ReceizAttestationDomainV125,
): ReceizEvidenceReferenceV125 {
  const parsed = closedRecord(value, [
    "evidenceId", "evidenceType", "classification", "verifierBinding", "evaluatorPolicy",
    "artifactSha256", "proofObjectId", "subjectId", "custodyHead", "contentCommitment",
  ], "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID");
  const subjectId = canonicalText(parsed.subjectId, "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID");
  if (subjectId !== expectedSubjectId) fail("V125_ATTESTATION_EVIDENCE_SUBJECT_MISMATCH");
  const evidenceType = name(parsed.evidenceType, "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID");
  const requirement = domain.evidenceRequirements.find((candidate) => candidate.evidenceType === evidenceType);
  if (!requirement || parsed.classification !== requirement.classification
    || parsed.verifierBinding !== requirement.verifierBinding
    || parsed.evaluatorPolicy !== requirement.evaluatorPolicy) fail("V125_ATTESTATION_EVIDENCE_POLICY_MISMATCH");
  return freeze({
    evidenceId: name(parsed.evidenceId, "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID"),
    evidenceType,
    classification: requirement.classification,
    verifierBinding: requirement.verifierBinding,
    evaluatorPolicy: requirement.evaluatorPolicy,
    artifactSha256: digest(parsed.artifactSha256, "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID"),
    proofObjectId: canonicalText(parsed.proofObjectId, "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID", 512),
    subjectId,
    custodyHead: digest(parsed.custodyHead, "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID"),
    contentCommitment: digest(parsed.contentCommitment, "V125_ATTESTATION_EVIDENCE_ENTRY_INVALID"),
  });
}

export async function createReceizEvidenceBundleV125(input: ReceizEvidenceBundleInputV125): Promise<ReceizEvidenceBundleV125> {
  const parsed = closedRecord(input, [
    "domain", "credentialType", "subjectId", "evidence", "collectedKai", "predecessorHead", "acceptedHead",
  ], "V125_ATTESTATION_EVIDENCE_BUNDLE_INPUT_INVALID");
  const coordinate = domainCoordinate(parsed.domain, parsed.credentialType, parsed.subjectId);
  const entries = exactArray(parsed.evidence, "V125_ATTESTATION_EVIDENCE_INVALID");
  if (entries.length < 1 || entries.length > MAX_EVIDENCE) fail("V125_ATTESTATION_EVIDENCE_INVALID");
  const evidence = entries.map((entry) => parseEvidenceReference(entry, coordinate.subjectId, coordinate.domain));
  evidence.sort((left, right) => compareCanonicalText(left.evidenceId, right.evidenceId));
  if (new Set(evidence.map((entry) => entry.evidenceId)).size !== evidence.length) fail("V125_ATTESTATION_EVIDENCE_INVALID");
  for (const requirement of coordinate.domain.evidenceRequirements) {
    if (evidence.filter((entry) => entry.evidenceType === requirement.evidenceType).length < requirement.minimumCount) {
      fail("V125_ATTESTATION_EVIDENCE_REQUIREMENTS_UNSATISFIED");
    }
  }
  const basis = freeze({
    schema: "receiz.attestation.evidence-bundle.v125" as const,
    domainId: coordinate.domain.domainId,
    credentialType: coordinate.credentialType,
    subjectId: coordinate.subjectId,
    registryDigest: coordinate.domain.registryDigest,
    domainDigest: await domainDigest(coordinate.domain),
    evidence: freeze(evidence),
    collectedKai: kai(parsed.collectedKai, "V125_ATTESTATION_EVIDENCE_BUNDLE_KAI_INVALID"),
    predecessorHead: nullableDigest(parsed.predecessorHead, "V125_ATTESTATION_EVIDENCE_BUNDLE_HEAD_INVALID"),
    acceptedHead: digest(parsed.acceptedHead, "V125_ATTESTATION_EVIDENCE_BUNDLE_HEAD_INVALID"),
    authority: freeze({ evidenceBundleIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const }),
  });
  return freeze({ ...basis, evidenceBundleDigest: await digestReceizAuthority("artifact", basis.schema, basis) });
}

export async function parseReceizEvidenceBundleV125(value: unknown, domainValue: unknown): Promise<ReceizEvidenceBundleV125> {
  const parsed = closedRecord(value, [
    "schema", "domainId", "credentialType", "subjectId", "registryDigest", "domainDigest", "evidence",
    "collectedKai", "predecessorHead", "acceptedHead", "authority", "evidenceBundleDigest",
  ], "V125_ATTESTATION_EVIDENCE_BUNDLE_CLOSED_SHAPE_INVALID");
  if (parsed.schema !== "receiz.attestation.evidence-bundle.v125") fail("V125_ATTESTATION_EVIDENCE_BUNDLE_SCHEMA_INVALID");
  const coordinate = domainCoordinate(domainValue, parsed.credentialType, parsed.subjectId);
  if (parsed.domainId !== coordinate.domain.domainId
    || digest(parsed.registryDigest, "V125_ATTESTATION_EVIDENCE_BUNDLE_REGISTRY_INVALID") !== coordinate.domain.registryDigest
    || digest(parsed.domainDigest, "V125_ATTESTATION_EVIDENCE_BUNDLE_DOMAIN_DIGEST_INVALID") !== await domainDigest(coordinate.domain)) {
    fail("V125_ATTESTATION_EVIDENCE_BUNDLE_DOMAIN_MISMATCH");
  }
  const entries = exactArray(parsed.evidence, "V125_ATTESTATION_EVIDENCE_INVALID");
  if (entries.length < 1 || entries.length > MAX_EVIDENCE) fail("V125_ATTESTATION_EVIDENCE_INVALID");
  const evidence = entries.map((entry) => parseEvidenceReference(entry, coordinate.subjectId, coordinate.domain));
  sortedUnique(evidence.map((entry) => entry.evidenceId), "V125_ATTESTATION_EVIDENCE_NONCANONICAL");
  for (const requirement of coordinate.domain.evidenceRequirements) {
    if (evidence.filter((entry) => entry.evidenceType === requirement.evidenceType).length < requirement.minimumCount) {
      fail("V125_ATTESTATION_EVIDENCE_REQUIREMENTS_UNSATISFIED");
    }
  }
  const basis = freeze({
    schema: "receiz.attestation.evidence-bundle.v125" as const,
    domainId: coordinate.domain.domainId,
    credentialType: coordinate.credentialType,
    subjectId: coordinate.subjectId,
    registryDigest: coordinate.domain.registryDigest,
    domainDigest: parsed.domainDigest as string,
    evidence: freeze(evidence),
    collectedKai: kai(parsed.collectedKai, "V125_ATTESTATION_EVIDENCE_BUNDLE_KAI_INVALID"),
    predecessorHead: nullableDigest(parsed.predecessorHead, "V125_ATTESTATION_EVIDENCE_BUNDLE_HEAD_INVALID"),
    acceptedHead: digest(parsed.acceptedHead, "V125_ATTESTATION_EVIDENCE_BUNDLE_HEAD_INVALID"),
    authority: evidenceBundleAuthority(parsed.authority),
  });
  const evidenceBundleDigest = digest(parsed.evidenceBundleDigest, "V125_ATTESTATION_EVIDENCE_BUNDLE_DIGEST_INVALID");
  if (evidenceBundleDigest !== await digestReceizAuthority("artifact", basis.schema, basis)) {
    fail("V125_ATTESTATION_EVIDENCE_BUNDLE_DIGEST_MISMATCH");
  }
  return freeze({ ...basis, evidenceBundleDigest });
}
