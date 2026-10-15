import { isSdkAdmittedReceizCapabilityIssuerKey } from "./artifactAdmission.js";
import type { ReceizCapabilityIssuerResolver } from "./artifactAdmissionTypes.js";
import { encodeReceizAuthority } from "./authorityEncoding.js";
import {
  decryptReceizIdentityPrivateSigningKey,
  deriveReceizIdentityKeyIdFromPublicKeyRawB64u,
  receizBase64UrlDecode,
  receizBase64UrlEncode,
  type ReceizKeyFile,
} from "./identity.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { freeze } from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import {
  openVerifiedReceizV125ArtifactPayloadBytes,
  type ReceizV125EnclosingArtifactVerifierOptions,
} from "./v125ArtifactBinding.js";
import {
  parseReceizAttestationDomainV125,
  type ReceizAttestationActorActionV125,
  type ReceizAttestationDomainV125,
  type ReceizEvidenceBundleV125,
} from "./v125AttestationSchemas.js";

export type ReceizAttestationRoleGrantV125 = Readonly<{
  schema: "receiz.attestation.role-grant.v125";
  grantorReceizId: string;
  grantorKeyId: string;
  actorReceizId: string;
  actorKeyId: string;
  actorKeyAlg: "Ed25519" | "P-256";
  actorPublicKeyRawB64u: string;
  domainId: string;
  domainDigest: string;
  credentialType: string;
  role: string;
  allowedActions: readonly ReceizAttestationActorActionV125[];
  validFromKai: string;
  expiresAtKai: string;
  alg: "Ed25519" | "P-256";
  signatureB64u: string;
  grantDigest: string;
}>;

export type ReceizAttestationEvidenceReferenceV125 = ReceizEvidenceBundleV125["evidence"][number];

export type ReceizAttestationEvidenceArtifactV125 = Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
}>;

export type ReceizAttestationDomainAuthorityProofV125 = Readonly<{
  schema: "receiz.attestation.domain-authority.v125";
  domainAuthorityReceizId: string;
  domain: ReceizAttestationDomainV125;
  domainDigest: string;
  acceptedDomainHead: string;
  grantors: readonly Readonly<{
    grantorReceizId: string;
    grantorKeyId: string;
  }>[];
  evidenceAuthorities: readonly Readonly<{
    evidenceType: string;
    verifierBinding: "receiz.artifact-admission.v112";
    evaluatorPolicy: string;
    ownerReceizIds: readonly string[];
  }>[];
  revokedRoleGrants: readonly Readonly<{
    grantDigest: string;
    effectiveKai: string;
    previousAuthorityHead: string;
    revocationHead: string;
  }>[];
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizAttestationAuthorityV125 = Readonly<{
  schema: "receiz.attestation.authority-context.v125";
  domainId: string;
  domainDigest: string;
  domainAuthorityArtifactSha256: string;
  domainAuthorityProofObjectId: string;
  acceptedDomainHead: string;
  authorityIsProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
}>;

export type ReceizAttestationAuthorityOptionsV125 = Readonly<{
  domainAuthorityArtifact: ReceizPortableSealedArtifactV124;
  resolveAdmittedGrantor: ReceizCapabilityIssuerResolver;
  resolveEvidenceArtifact(
    reference: ReceizAttestationEvidenceReferenceV125,
  ): ReceizAttestationEvidenceArtifactV125 | null | Promise<ReceizAttestationEvidenceArtifactV125 | null>;
}>;

type HeldAuthority = Readonly<{
  proof: ReceizAttestationDomainAuthorityProofV125;
  verifier: ReceizV125EnclosingArtifactVerifierOptions;
  resolveAdmittedGrantor: ReceizCapabilityIssuerResolver;
  authorizedGrantorsByKeyId: ReadonlyMap<string, string>;
  evidenceAuthoritiesByCoordinate: ReadonlyMap<string, ReadonlySet<string>>;
  revokedRoleGrantsByDigest: ReadonlyMap<string, Readonly<{
    effectiveKai: string;
    previousAuthorityHead: string;
    revocationHead: string;
  }>>;
  resolveEvidenceArtifact: ReceizAttestationAuthorityOptionsV125["resolveEvidenceArtifact"];
}>;

const heldAuthorities = new WeakMap<object, HeldAuthority>();
const HEX64 = /^[0-9a-f]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const KAI = /^(0|[1-9][0-9]*)$/;
const NAME = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const RECEIZ_ID = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;

function fail(code: string): never { throw new TypeError(code); }

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
    if (!descriptor?.enumerable || !("value" in descriptor)) fail(code);
    output[key] = descriptor.value;
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

function receizId(value: unknown, code: string): string {
  if (typeof value !== "string" || !RECEIZ_ID.test(value)) fail(code);
  return value;
}

function kai(value: unknown, code: string): string {
  if (typeof value !== "string" || !KAI.test(value)) fail(code);
  return value;
}

function exactActions(value: unknown, code: string): readonly ReceizAttestationActorActionV125[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < 1 || value.length > 10) {
    fail(code);
  }
  const actions = value.map((entry) => name(entry, code) as ReceizAttestationActorActionV125);
  if (new Set(actions).size !== actions.length) fail(code);
  for (let index = 1; index < actions.length; index += 1) if (actions[index - 1]! >= actions[index]!) fail(code);
  return freeze(actions);
}

function exactArray(value: unknown, code: string, maximum: number): readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor?.enumerable || !("value" in descriptor)) fail(code);
  }
  return value;
}

async function authorityDigest(domain: Parameters<typeof encodeReceizAuthority>[0], schema: string, value: unknown) {
  const bytes = encodeReceizAuthority(domain, schema, value);
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(result)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function domainDigest(domain: ReceizAttestationDomainV125): Promise<string> {
  return authorityDigest("registry", domain.schema, domain);
}

async function domainAuthorityGenesisHead(exactDomainDigest: string): Promise<string> {
  return authorityDigest(
    "history",
    "receiz.attestation.domain-authority-head.v125",
    { domainDigest: exactDomainDigest },
  );
}

async function roleGrantRevocationHead(input: Readonly<{
  domainDigest: string;
  grantDigest: string;
  effectiveKai: string;
  previousAuthorityHead: string;
}>): Promise<string> {
  return authorityDigest(
    "history",
    "receiz.attestation.role-grant-revocation.v125",
    input,
  );
}

function strictArrayBuffer(bytes: Uint8Array): ArrayBuffer { return bytes.slice().buffer; }

function grantSigningBytes(basis: Omit<ReceizAttestationRoleGrantV125, "signatureB64u" | "grantDigest">): Uint8Array {
  return encodeReceizAuthority("capability", "receiz.attestation.role-grant-signature.v125", basis);
}

function authority(value: unknown): HeldAuthority {
  if (!value || typeof value !== "object") fail("V125_ATTESTATION_AUTHORITY_REQUIRED");
  const held = heldAuthorities.get(value);
  if (!held) fail("V125_ATTESTATION_AUTHORITY_REQUIRED");
  return held;
}

/** Internal projection of the already verified complete domain source. */
export function readReceizHeldAttestationDomainV125(value: ReceizAttestationAuthorityV125) {
  return authority(value).proof.domain;
}

function decodeCanonicalDomainAuthorityProof(bytes: Uint8Array): unknown {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const canonical = new TextEncoder().encode(canonicalizeReceizV122(decoded));
    if (canonical.byteLength !== bytes.byteLength
      || canonical.some((byte, index) => byte !== bytes[index])) {
      fail("V125_ATTESTATION_DOMAIN_AUTHORITY_PAYLOAD_NONCANONICAL");
    }
  } catch {
    fail("V125_ATTESTATION_DOMAIN_AUTHORITY_PAYLOAD_INVALID");
  }
  return decoded;
}

function evidenceAuthorityCoordinate(input: Readonly<{
  evidenceType: string;
  verifierBinding: string;
  evaluatorPolicy: string;
}>): string {
  return `${input.evidenceType}\u0000${input.verifierBinding}\u0000${input.evaluatorPolicy}`;
}

async function parseDomainAuthorityProof(value: unknown): Promise<ReceizAttestationDomainAuthorityProofV125> {
  const code = "V125_ATTESTATION_DOMAIN_AUTHORITY_PAYLOAD_INVALID";
  const record = closedRecord(value, [
    "schema", "domainAuthorityReceizId", "domain", "domainDigest", "acceptedDomainHead", "grantors",
    "evidenceAuthorities", "revokedRoleGrants", "authority",
  ], code);
  if (record.schema !== "receiz.attestation.domain-authority.v125") fail(code);
  const domain = parseReceizAttestationDomainV125(record.domain);
  const exactDomainDigest = await domainDigest(domain);
  if (digest(record.domainDigest, code) !== exactDomainDigest) fail("V125_ATTESTATION_DOMAIN_AUTHORITY_MISMATCH");
  const grantors = exactArray(record.grantors, code, 64).map((value) => {
    const grantor = closedRecord(value, ["grantorReceizId", "grantorKeyId"], code);
    return freeze({
      grantorReceizId: receizId(grantor.grantorReceizId, code),
      grantorKeyId: digest(grantor.grantorKeyId, code),
    });
  });
  if (grantors.length < 1 || new Set(grantors.map((grantor) => grantor.grantorKeyId)).size !== grantors.length) fail(code);
  for (let index = 1; index < grantors.length; index += 1) {
    if (`${grantors[index - 1]!.grantorReceizId}:${grantors[index - 1]!.grantorKeyId}`
      >= `${grantors[index]!.grantorReceizId}:${grantors[index]!.grantorKeyId}`) fail(code);
  }
  const evidenceAuthorities = exactArray(record.evidenceAuthorities, code, 256).map((value) => {
    const evidence = closedRecord(value, [
      "evidenceType", "verifierBinding", "evaluatorPolicy", "ownerReceizIds",
    ], code);
    const verifierBinding = name(evidence.verifierBinding, code);
    if (verifierBinding !== "receiz.artifact-admission.v112") {
      fail("V125_ATTESTATION_EVIDENCE_BINDING_UNSUPPORTED");
    }
    const ownerReceizIds = exactArray(evidence.ownerReceizIds, code, 64)
      .map((owner) => receizId(owner, code));
    if (ownerReceizIds.length < 1 || new Set(ownerReceizIds).size !== ownerReceizIds.length) fail(code);
    for (let index = 1; index < ownerReceizIds.length; index += 1) {
      if (ownerReceizIds[index - 1]! >= ownerReceizIds[index]!) fail(code);
    }
    return freeze({
      evidenceType: name(evidence.evidenceType, code),
      verifierBinding: "receiz.artifact-admission.v112" as const,
      evaluatorPolicy: name(evidence.evaluatorPolicy, code),
      ownerReceizIds: freeze(ownerReceizIds),
    });
  });
  const evidenceCoordinates = evidenceAuthorities.map(evidenceAuthorityCoordinate);
  if (new Set(evidenceCoordinates).size !== evidenceCoordinates.length) fail(code);
  for (let index = 1; index < evidenceCoordinates.length; index += 1) {
    if (evidenceCoordinates[index - 1]! >= evidenceCoordinates[index]!) fail(code);
  }
  const revokedRoleGrants = exactArray(record.revokedRoleGrants, code, 4096).map((value) => {
    const revocation = closedRecord(value, [
      "grantDigest", "effectiveKai", "previousAuthorityHead", "revocationHead",
    ], code);
    return freeze({
      grantDigest: digest(revocation.grantDigest, code),
      effectiveKai: kai(revocation.effectiveKai, code),
      previousAuthorityHead: digest(revocation.previousAuthorityHead, code),
      revocationHead: digest(revocation.revocationHead, code),
    });
  });
  if (new Set(revokedRoleGrants.map((entry) => entry.grantDigest)).size !== revokedRoleGrants.length) fail(code);
  let authorityHead = await domainAuthorityGenesisHead(exactDomainDigest);
  let priorEffectiveKai: string | null = null;
  for (const revocation of revokedRoleGrants) {
    if (revocation.previousAuthorityHead !== authorityHead
      || (priorEffectiveKai !== null && BigInt(revocation.effectiveKai) <= BigInt(priorEffectiveKai))
      || revocation.revocationHead !== await roleGrantRevocationHead({
        domainDigest: exactDomainDigest,
        grantDigest: revocation.grantDigest,
        effectiveKai: revocation.effectiveKai,
        previousAuthorityHead: revocation.previousAuthorityHead,
      })) fail("V125_ATTESTATION_ROLE_GRANT_REVOCATION_HISTORY_INVALID");
    authorityHead = revocation.revocationHead;
    priorEffectiveKai = revocation.effectiveKai;
  }
  if (digest(record.acceptedDomainHead, code) !== authorityHead) {
    fail("V125_ATTESTATION_DOMAIN_AUTHORITY_HEAD_MISMATCH");
  }
  const authorityRecord = closedRecord(record.authority, [
    "projectionIsProofAuthority", "strongerTruth",
  ], code);
  if (authorityRecord.projectionIsProofAuthority !== false
    || authorityRecord.strongerTruth !== "sealed-receiz-proof-object") fail(code);
  return freeze({
    schema: "receiz.attestation.domain-authority.v125" as const,
    domainAuthorityReceizId: receizId(record.domainAuthorityReceizId, code),
    domain,
    domainDigest: exactDomainDigest,
    acceptedDomainHead: authorityHead,
    grantors: freeze(grantors),
    evidenceAuthorities: freeze(evidenceAuthorities),
    revokedRoleGrants: freeze(revokedRoleGrants),
    authority: freeze({
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

async function createAuthority(
  options: ReceizAttestationAuthorityOptionsV125,
  verifier: ReceizV125EnclosingArtifactVerifierOptions,
): Promise<ReceizAttestationAuthorityV125> {
  if (!options || typeof options !== "object"
    || typeof options.resolveAdmittedGrantor !== "function"
    || typeof options.resolveEvidenceArtifact !== "function"
    || !options.domainAuthorityArtifact) {
    fail("V125_ATTESTATION_AUTHORITY_OPTIONS_INVALID");
  }
  const opened = await openVerifiedReceizV125ArtifactPayloadBytes({
    artifact: options.domainAuthorityArtifact,
    verifier,
    enclosingProofError: "V125_ATTESTATION_DOMAIN_AUTHORITY_PROOF_INVALID",
    payloadError: "V125_ATTESTATION_DOMAIN_AUTHORITY_PAYLOAD_INVALID",
  });
  if (opened.payloadMimeType !== "application/vnd.receiz.attestation-domain-authority+json") {
    fail("V125_ATTESTATION_DOMAIN_AUTHORITY_PAYLOAD_INVALID");
  }
  const proof = await parseDomainAuthorityProof(decodeCanonicalDomainAuthorityProof(opened.payloadBytes));
  if (opened.ownerReceizId !== proof.domainAuthorityReceizId
    || opened.provenance.root !== proof.domain.domainId
    || opened.ownership.proofRef !== proof.acceptedDomainHead) {
    fail("V125_ATTESTATION_DOMAIN_AUTHORITY_BINDING_MISMATCH");
  }
  const grantors = new Map(proof.grantors.map((grantor) => [grantor.grantorKeyId, grantor.grantorReceizId]));
  const evidenceAuthorities = new Map(proof.evidenceAuthorities.map((evidence) => [
    evidenceAuthorityCoordinate(evidence),
    new Set(evidence.ownerReceizIds),
  ]));
  const context = freeze({
    schema: "receiz.attestation.authority-context.v125" as const,
    domainId: proof.domain.domainId,
    domainDigest: proof.domainDigest,
    domainAuthorityArtifactSha256: opened.artifactSha256,
    domainAuthorityProofObjectId: opened.proofObjectId,
    acceptedDomainHead: proof.acceptedDomainHead,
    authorityIsProofAuthority: false as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
  });
  heldAuthorities.set(context, freeze({
    proof,
    verifier,
    resolveAdmittedGrantor: options.resolveAdmittedGrantor,
    authorizedGrantorsByKeyId: grantors,
    evidenceAuthoritiesByCoordinate: evidenceAuthorities,
    revokedRoleGrantsByDigest: new Map(proof.revokedRoleGrants.map((revocation) => [
      revocation.grantDigest,
      freeze({
        effectiveKai: revocation.effectiveKai,
        previousAuthorityHead: revocation.previousAuthorityHead,
        revocationHead: revocation.revocationHead,
      }),
    ])),
    resolveEvidenceArtifact: options.resolveEvidenceArtifact,
  }));
  return context;
}

export async function createReceizAttestationAuthorityV125(
  options: ReceizAttestationAuthorityOptionsV125,
): Promise<ReceizAttestationAuthorityV125> {
  return createAuthority(options, freeze({}));
}

/** @internal Canonical-root injection exists only for the source test harness and is not exported at package root. */
export async function createReceizAttestationAuthorityWithCanonicalRootsForTestV125(
  options: ReceizAttestationAuthorityOptionsV125,
  verifier: ReceizV125EnclosingArtifactVerifierOptions,
): Promise<ReceizAttestationAuthorityV125> {
  return createAuthority(options, verifier);
}

export async function signReceizAttestationRoleGrantV125(input: Readonly<{
  keyFile: ReceizKeyFile;
  passphrase?: string;
  domain: ReceizAttestationDomainV125;
  actorReceizId: string;
  actorKey: Readonly<{
    keyId: string;
    alg: "Ed25519" | "P-256";
    publicKeyRawB64u: string;
  }>;
  credentialType: string;
  role: string;
  allowedActions: readonly ReceizAttestationActorActionV125[];
  validFromKai: string;
  expiresAtKai: string;
}>): Promise<ReceizAttestationRoleGrantV125> {
  const domain = parseReceizAttestationDomainV125(input.domain);
  const validFromKai = kai(input.validFromKai, "V125_ATTESTATION_ROLE_GRANT_INVALID");
  const expiresAtKai = kai(input.expiresAtKai, "V125_ATTESTATION_ROLE_GRANT_INVALID");
  if (BigInt(expiresAtKai) <= BigInt(validFromKai)) fail("V125_ATTESTATION_ROLE_GRANT_INVALID");
  const grantorReceizId = receizId(input.keyFile.owner.uid, "V125_ATTESTATION_ROLE_GRANT_GRANTOR_INVALID");
  const derivedKeyId = await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(
    input.keyFile.crypto.publicKeyRawB64u,
    input.keyFile.alg,
  );
  if (derivedKeyId !== input.keyFile.keyId) fail("V125_ATTESTATION_ROLE_GRANT_GRANTOR_KEY_MISMATCH");
  const alg: "Ed25519" | "P-256" = input.keyFile.alg === "Ed25519" || input.keyFile.alg === "P-256"
    ? input.keyFile.alg
    : fail("V125_ATTESTATION_ROLE_GRANT_GRANTOR_KEY_MISMATCH");
  const actorKeyId = digest(input.actorKey.keyId, "V125_ATTESTATION_ROLE_GRANT_ACTOR_KEY_INVALID");
  const actorKeyAlg = input.actorKey.alg === "Ed25519" || input.actorKey.alg === "P-256"
    ? input.actorKey.alg
    : fail("V125_ATTESTATION_ROLE_GRANT_ACTOR_KEY_INVALID");
  const actorPublicKeyRawB64u = text(
    input.actorKey.publicKeyRawB64u,
    "V125_ATTESTATION_ROLE_GRANT_ACTOR_KEY_INVALID",
    256,
  );
  if (await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(actorPublicKeyRawB64u, actorKeyAlg) !== actorKeyId) {
    fail("V125_ATTESTATION_ROLE_GRANT_ACTOR_KEY_INVALID");
  }
  const basis: Omit<ReceizAttestationRoleGrantV125, "signatureB64u" | "grantDigest"> = freeze({
    schema: "receiz.attestation.role-grant.v125" as const,
    grantorReceizId,
    grantorKeyId: input.keyFile.keyId,
    actorReceizId: receizId(input.actorReceizId, "V125_ATTESTATION_ROLE_GRANT_ACTOR_INVALID"),
    actorKeyId,
    actorKeyAlg,
    actorPublicKeyRawB64u,
    domainId: domain.domainId,
    domainDigest: await domainDigest(domain),
    credentialType: name(input.credentialType, "V125_ATTESTATION_ROLE_GRANT_CREDENTIAL_INVALID"),
    role: name(input.role, "V125_ATTESTATION_ROLE_GRANT_ROLE_INVALID"),
    allowedActions: exactActions([...input.allowedActions].sort(), "V125_ATTESTATION_ROLE_GRANT_ACTIONS_INVALID"),
    validFromKai,
    expiresAtKai,
    alg,
  });
  const privateKey = await decryptReceizIdentityPrivateSigningKey({
    keyFile: input.keyFile,
    passphrase: input.passphrase,
  });
  const signature = new Uint8Array(await crypto.subtle.sign(
    basis.alg === "Ed25519" ? "Ed25519" : { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    strictArrayBuffer(grantSigningBytes(basis)),
  ));
  if (signature.byteLength !== 64) fail("V125_ATTESTATION_ROLE_GRANT_SIGNATURE_INVALID");
  return freeze({
    ...basis,
    signatureB64u: receizBase64UrlEncode(signature),
    grantDigest: await authorityDigest("capability", basis.schema, basis),
  });
}

export async function verifyReceizAttestationRoleGrantAuthorityV125(
  value: unknown,
  domainValue: ReceizAttestationDomainV125,
  context: ReceizAttestationAuthorityV125,
  useAtKai?: string,
): Promise<ReceizAttestationRoleGrantV125> {
  const code = "V125_ATTESTATION_ROLE_GRANT_INVALID";
  if (value && typeof value === "object" && !Array.isArray(value)
    && (value as { schema?: unknown }).schema === "receiz.attestation.role-grant.v125"
    && !Object.prototype.hasOwnProperty.call(value, "grantorKeyId")) {
    fail("V125_ATTESTATION_ROLE_GRANT_AUTHORITY_REQUIRED");
  }
  const record = closedRecord(value, [
    "schema", "grantorReceizId", "grantorKeyId", "actorReceizId", "domainId", "domainDigest",
    "actorKeyId", "actorKeyAlg", "actorPublicKeyRawB64u", "credentialType", "role", "allowedActions", "validFromKai", "expiresAtKai", "alg",
    "signatureB64u", "grantDigest",
  ], code);
  if (record.schema !== "receiz.attestation.role-grant.v125") fail(code);
  const domain = parseReceizAttestationDomainV125(domainValue);
  const basis: Omit<ReceizAttestationRoleGrantV125, "signatureB64u" | "grantDigest"> = freeze({
    schema: "receiz.attestation.role-grant.v125" as const,
    grantorReceizId: receizId(record.grantorReceizId, code),
    grantorKeyId: digest(record.grantorKeyId, code),
    actorReceizId: receizId(record.actorReceizId, code),
    actorKeyId: digest(record.actorKeyId, code),
    actorKeyAlg: record.actorKeyAlg === "Ed25519" || record.actorKeyAlg === "P-256"
      ? record.actorKeyAlg
      : fail(code),
    actorPublicKeyRawB64u: text(record.actorPublicKeyRawB64u, code, 256),
    domainId: name(record.domainId, code),
    domainDigest: digest(record.domainDigest, code),
    credentialType: name(record.credentialType, code),
    role: name(record.role, code),
    allowedActions: exactActions(record.allowedActions, code),
    validFromKai: kai(record.validFromKai, code),
    expiresAtKai: kai(record.expiresAtKai, code),
    alg: record.alg === "Ed25519" || record.alg === "P-256" ? record.alg : fail(code),
  });
  if (await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(
    basis.actorPublicKeyRawB64u,
    basis.actorKeyAlg,
  ) !== basis.actorKeyId) fail("V125_ATTESTATION_ROLE_GRANT_ACTOR_KEY_INVALID");
  if (BigInt(basis.expiresAtKai) <= BigInt(basis.validFromKai)) fail(code);
  const exactDomainDigest = await domainDigest(domain);
  if (basis.domainId !== domain.domainId || basis.domainDigest !== exactDomainDigest) {
    fail("V125_ATTESTATION_ROLE_GRANT_DOMAIN_MISMATCH");
  }
  const grantDigest = digest(record.grantDigest, code);
  if (grantDigest !== await authorityDigest("capability", basis.schema, basis)) {
    fail("V125_ATTESTATION_ROLE_GRANT_DIGEST_MISMATCH");
  }
  const signatureB64u = text(record.signatureB64u, code, 256);
  if (!BASE64URL.test(signatureB64u)) fail(code);
  const held = authority(context);
  const revocation = held.revokedRoleGrantsByDigest.get(grantDigest);
  if (revocation && (useAtKai === undefined
    || BigInt(kai(useAtKai, code)) >= BigInt(revocation.effectiveKai))) {
    fail("V125_ATTESTATION_ROLE_GRANT_REVOKED");
  }
  if (context.domainId !== domain.domainId || context.domainDigest !== exactDomainDigest
    || held.proof.domainDigest !== exactDomainDigest
    || held.authorizedGrantorsByKeyId.get(basis.grantorKeyId) !== basis.grantorReceizId) {
    fail("V125_ATTESTATION_ROLE_GRANT_AUTHORITY_REQUIRED");
  }
  const issuer = await held.resolveAdmittedGrantor(basis.grantorKeyId);
  if (!issuer || !isSdkAdmittedReceizCapabilityIssuerKey(issuer)
    || issuer.revoked || issuer.keyId !== basis.grantorKeyId || issuer.actorId !== basis.grantorReceizId
    || issuer.alg !== basis.alg || issuer.registryDigest.value !== domain.registryDigest) {
    fail("V125_ATTESTATION_ROLE_GRANT_AUTHORITY_REQUIRED");
  }
  let verified = false;
  try {
    const publicKey = await crypto.subtle.importKey(
      "raw",
      strictArrayBuffer(receizBase64UrlDecode(issuer.publicKeyRawB64u)),
      basis.alg === "Ed25519" ? { name: "Ed25519" } : { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    verified = await crypto.subtle.verify(
      basis.alg === "Ed25519" ? "Ed25519" : { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      strictArrayBuffer(receizBase64UrlDecode(signatureB64u)),
      strictArrayBuffer(grantSigningBytes(basis)),
    );
  } catch { verified = false; }
  if (!verified) fail("V125_ATTESTATION_ROLE_GRANT_SIGNATURE_INVALID");
  return freeze({ ...basis, signatureB64u, grantDigest });
}

export async function verifyReceizAttestationEvidenceBundleAuthorityV125(
  domainValue: ReceizAttestationDomainV125,
  bundle: ReceizEvidenceBundleV125,
  context: ReceizAttestationAuthorityV125,
): Promise<void> {
  const domain = parseReceizAttestationDomainV125(domainValue);
  const held = authority(context);
  const exactDomainDigest = await domainDigest(domain);
  if (context.domainId !== domain.domainId || context.domainDigest !== exactDomainDigest
    || held.proof.domainDigest !== exactDomainDigest) {
    fail("V125_ATTESTATION_DOMAIN_AUTHORITY_MISMATCH");
  }
  for (const reference of bundle.evidence) {
    const resolved = await held.resolveEvidenceArtifact(reference);
    if (!resolved) fail("V125_ATTESTATION_EVIDENCE_PROOF_REQUIRED");
    let opened: Awaited<ReturnType<typeof openVerifiedReceizV125ArtifactPayloadBytes>>;
    try {
      opened = await openVerifiedReceizV125ArtifactPayloadBytes({
        artifact: resolved.artifact,
        verifier: held.verifier,
        enclosingProofError: "V125_ATTESTATION_EVIDENCE_PROOF_INVALID",
        payloadError: "V125_ATTESTATION_EVIDENCE_PAYLOAD_INVALID",
      });
    } catch (error) {
      fail(error instanceof Error ? error.message : "V125_ATTESTATION_EVIDENCE_PROOF_INVALID");
    }
    if (opened.artifactSha256 !== reference.artifactSha256
      || opened.proofObjectId !== reference.proofObjectId
      || opened.provenance.root !== reference.subjectId
      || opened.ownership.proofRef !== reference.custodyHead
      || opened.proofObjectId !== reference.contentCommitment) {
      fail("V125_ATTESTATION_EVIDENCE_BINDING_MISMATCH");
    }
    const authorizedOwners = held.evidenceAuthoritiesByCoordinate.get(evidenceAuthorityCoordinate(reference));
    if (!authorizedOwners?.has(opened.ownerReceizId)) {
      fail("V125_ATTESTATION_EVIDENCE_AUTHORITY_REQUIRED");
    }
  }
}
