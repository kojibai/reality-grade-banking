import { hasReceizCredentialPbiSourceBindingV125 } from "./v125PbiSourceVerifier.js";
import type { ReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { recoverReceizCompositeMerkleRoot, type ReceizCompositeMerkleSibling } from "./compositeProofKernel.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { freeze } from "./v124Contracts.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import {
  createReceizCredentialClaimTreeV125,
  verifyAndOpenReceizCredentialArtifactV125,
  resolveReceizCredentialCurrentnessV125,
  type ReceizOpenedCredentialArtifactV125,
  type ReceizCredentialCurrentnessV125,
} from "./v125Credential.js";
import {
  parseReceizAttestationDomainV125,
  type ReceizAttestationClaimValueV125,
  type ReceizAttestationDisclosureV125,
  type ReceizAttestationDomainV125,
  type ReceizClaimSetV125,
} from "./v125AttestationSchemas.js";
import {
  verifyReceizPbiCeremonyReceiptV125,
  type ReceizPbiAuthorshipVerifierV125,
  type ReceizPbiCeremonyReceiptV125,
  type ReceizPbiCeremonyReplayGuardV125,
} from "./v125PbiCeremony.js";

const HEX64 = /^[0-9a-f]{64}$/u;
const KAI = /^(0|[1-9][0-9]*)$/u;

export type ReceizCredentialPresentationSourceV125 = Readonly<{
  credentialId: string;
  proofObjectId: string;
  domainId: string;
  credentialType: string;
  subjectId: string;
  holderReceizId: string;
  acceptedHead: string;
  claimRoot: string;
  claimSetDigest: string;
  claimSetHead: string;
}>;

export type ReceizCredentialDisclosureV125 = Readonly<{
  name: string;
  disclosure: Exclude<ReceizAttestationDisclosureV125, "private">;
  value: ReceizAttestationClaimValueV125;
  valueCommitment: string;
  evidenceIds: readonly string[];
  leafDigest: string;
  witness: readonly ReceizCompositeMerkleSibling[];
}>;

export type ReceizCredentialPresentationV125 = ReceizCredentialPresentationSourceV125 & Readonly<{
  schema: "receiz.credential.presentation.v125";
  selectedKai: string;
  disclosures: readonly ReceizCredentialDisclosureV125[];
  disclosureDigest: string;
  presentationDigest: string;
  authority: Readonly<{
    presentationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizCredentialPresentationVerificationV125 = Readonly<{
  schema: "receiz.credential.presentation-verification.v125";
  credentialValid: boolean;
  currentness: "current" | "expired" | "suspended" | "revoked" | "replaced" | "head-behind" | "invalid" | "not-proven";
  holderPresence: "verified" | "not-presented" | "invalid" | "expired" | "replayed";
  disclosuresValid: boolean;
  acceptedHead: string;
  failureCodes: readonly string[];
  authority: Readonly<{
    presentationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizCredentialPresentationVerifierV125 = (
  input: Readonly<{ credentialId: string; presentedHead: string; selectedKai: string }>,
) => Promise<ReceizCredentialCurrentnessV125>;

const sourceVerifiers = new WeakMap<ReceizCredentialPresentationVerifierV125, ReceizOpenedCredentialArtifactV125>();

/** Canonical complete-source opening supplies all presentation coordinates and currentness. */
export async function createReceizSourceBoundCredentialPresentationVerifierV125(
  input: Parameters<typeof verifyAndOpenReceizCredentialArtifactV125>[0],
  authority: ReceizAttestationAuthorityV125,
): Promise<ReceizCredentialPresentationVerifierV125> {
  const opened = await verifyAndOpenReceizCredentialArtifactV125(input, authority);
  const verifier: ReceizCredentialPresentationVerifierV125 = async (request) => {
    if (request.credentialId !== opened.history.credential.credentialId) fail("V125_PRESENTATION_CREDENTIAL_BINDING_MISMATCH");
    return resolveReceizCredentialCurrentnessV125({ issuance: opened.issuance, credential: opened.history.credential,
      verifiedHistory: opened.history, presentedHead: request.presentedHead, selectedKai: request.selectedKai }, authority);
  };
  sourceVerifiers.set(verifier, opened);
  return Object.freeze(verifier);
}

export type ReceizCredentialPresentationFileV125 = Readonly<{
  schema: "receiz.credential.presentation-file.v125";
  filename: string;
  mimeType: "application/vnd.receiz.credential-presentation+json";
  exactBytes: readonly number[];
  exactBytesSha256: string;
  presentationDigest: string;
  authority: Readonly<{ transportIsVerification: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizCredentialPresentationQrHandoffV125 = Readonly<{
  schema: "receiz.credential.presentation-qr.v125";
  contentUrl: string;
  payloadBytes: readonly number[];
  payloadDigest: string;
  presentationDigest: string;
  authority: Readonly<{ handoffIsVerification: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizCredentialPresentationNfcHandoffV125 =
  | Readonly<{
    status: "available";
    record: Readonly<{
      schema: "receiz.credential.presentation-nfc.v125";
      recordType: "absolute-url";
      contentUrl: string;
      payloadDigest: string;
      presentationDigest: string;
      authority: Readonly<{ handoffIsVerification: false; strongerTruth: "sealed-receiz-proof-object" }>;
    }>;
  }>
  | Readonly<{
    status: "unavailable";
    code: "V125_PRESENTATION_NFC_UNAVAILABLE" | "V125_PRESENTATION_NFC_PAYLOAD_TOO_LARGE";
    fallback: "qr-or-file";
    authority: Readonly<{ handoffIsVerification: false; strongerTruth: "sealed-receiz-proof-object" }>;
  }>;

function fail(code: string): never {
  throw new TypeError(code);
}

function digest(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code);
  return value;
}

function kai(value: unknown, code: string): string {
  if (typeof value !== "string" || !KAI.test(value)) fail(code);
  return value;
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 512 || value.normalize("NFC") !== value) fail(code);
  return value;
}

function authority() {
  return freeze({
    presentationIsProofAuthority: false as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
  });
}

function transportAuthority() {
  return freeze({ transportIsVerification: false as const, strongerTruth: "sealed-receiz-proof-object" as const });
}

function handoffAuthority() {
  return freeze({ handoffIsVerification: false as const, strongerTruth: "sealed-receiz-proof-object" as const });
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hashed = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
  return [...new Uint8Array(hashed)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function presentationBytes(presentation: ReceizCredentialPresentationV125): Uint8Array {
  return new TextEncoder().encode(canonicalizeReceizV122(presentation));
}

async function parseTransportedPresentation(
  bytes: Uint8Array,
  exactBytesSha256: string,
): Promise<ReceizCredentialPresentationV125> {
  if (bytes.byteLength < 1 || bytes.byteLength > 1_000_000
    || digest(exactBytesSha256, "V125_PRESENTATION_FILE_DIGEST_INVALID") !== await sha256Hex(bytes)) {
    fail("V125_PRESENTATION_FILE_DIGEST_INVALID");
  }
  let candidate: ReceizCredentialPresentationV125;
  try {
    candidate = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as ReceizCredentialPresentationV125;
  } catch {
    fail("V125_PRESENTATION_FILE_INVALID");
  }
  if (candidate.schema !== "receiz.credential.presentation.v125"
    || candidate.authority?.presentationIsProofAuthority !== false
    || candidate.authority?.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V125_PRESENTATION_FILE_INVALID");
  }
  const basis = presentationBasis(candidate);
  if (candidate.presentationDigest !== await digestReceizAuthority("artifact", candidate.schema, basis)
    || canonicalizeReceizV122(candidate) !== new TextDecoder().decode(bytes)) {
    fail("V125_PRESENTATION_FILE_BINDING_INVALID");
  }
  return freeze(structuredClone(candidate));
}

function source(input: ReceizCredentialPresentationSourceV125): ReceizCredentialPresentationSourceV125 {
  return freeze({
    credentialId: digest(input.credentialId, "V125_PRESENTATION_CREDENTIAL_ID_INVALID"),
    proofObjectId: text(input.proofObjectId, "V125_PRESENTATION_PROOF_OBJECT_INVALID"),
    domainId: text(input.domainId, "V125_PRESENTATION_DOMAIN_INVALID"),
    credentialType: text(input.credentialType, "V125_PRESENTATION_CREDENTIAL_TYPE_INVALID"),
    subjectId: text(input.subjectId, "V125_PRESENTATION_SUBJECT_INVALID"),
    holderReceizId: text(input.holderReceizId, "V125_PRESENTATION_HOLDER_INVALID"),
    acceptedHead: digest(input.acceptedHead, "V125_PRESENTATION_HEAD_INVALID"),
    claimRoot: digest(input.claimRoot, "V125_PRESENTATION_CLAIM_ROOT_INVALID"),
    claimSetDigest: digest(input.claimSetDigest, "V125_PRESENTATION_CLAIM_SET_INVALID"),
    claimSetHead: digest(input.claimSetHead, "V125_PRESENTATION_CLAIM_SET_HEAD_INVALID"),
  });
}

async function disclosureDigest(disclosures: readonly ReceizCredentialDisclosureV125[]): Promise<string> {
  return digestReceizAuthority("artifact", "receiz.credential.disclosures.v125", { disclosures });
}

function presentationBasis(input: Omit<ReceizCredentialPresentationV125, "schema" | "presentationDigest" | "authority">) {
  return freeze({
    ...source(input),
    selectedKai: kai(input.selectedKai, "V125_PRESENTATION_KAI_INVALID"),
    disclosures: freeze(input.disclosures.map((entry) => freeze({
      ...entry,
      evidenceIds: freeze([...entry.evidenceIds]),
      witness: freeze(entry.witness.map((sibling) => freeze({ ...sibling }))),
    }))),
    disclosureDigest: digest(input.disclosureDigest, "V125_PRESENTATION_DISCLOSURE_DIGEST_INVALID"),
  });
}

export async function createReceizCredentialPresentationV125(input: Readonly<{
  domain: ReceizAttestationDomainV125;
  claimSet: ReceizClaimSetV125;
  credential: ReceizCredentialPresentationSourceV125;
  disclose: readonly string[];
  selectedKai: string;
}>): Promise<ReceizCredentialPresentationV125> {
  const domain = parseReceizAttestationDomainV125(input.domain);
  const tree = await createReceizCredentialClaimTreeV125({ domain, claimSet: input.claimSet });
  const credential = source(input.credential);
  if (credential.domainId !== tree.domainId || credential.credentialType !== tree.credentialType
    || credential.subjectId !== tree.subjectId || credential.claimRoot !== tree.root
    || credential.claimSetDigest !== input.claimSet.claimSetDigest
    || credential.claimSetHead !== input.claimSet.acceptedHead) {
    fail("V125_PRESENTATION_CREDENTIAL_BINDING_MISMATCH");
  }
  const requested = [...input.disclose].map((name) => text(name, "V125_PRESENTATION_DISCLOSURE_INVALID"));
  if (new Set(requested).size !== requested.length) fail("V125_PRESENTATION_DISCLOSURE_INVALID");
  const publicClaims = input.claimSet.claims.filter((claim) => claim.disclosure === "public").map((claim) => claim.name);
  if (publicClaims.some((name) => !requested.includes(name))) fail("V125_PRESENTATION_PUBLIC_DISCLOSURE_REQUIRED");
  const claims = input.claimSet.claims.filter((claim) => requested.includes(claim.name));
  if (claims.length !== requested.length || claims.some((claim) => claim.disclosure === "private" || claim.value === undefined)) {
    fail("V125_PRESENTATION_DISCLOSURE_FORBIDDEN");
  }
  const disclosures = freeze(claims
    .map((claim) => {
      const leaf = tree.leaves.find((candidate) => candidate.name === claim.name);
      if (!leaf || claim.value === undefined || claim.disclosure === "private") fail("V125_PRESENTATION_DISCLOSURE_INVALID");
      return freeze({
        name: claim.name,
        disclosure: claim.disclosure,
        value: claim.value,
        valueCommitment: leaf.valueCommitment,
        evidenceIds: freeze([...leaf.evidenceIds]),
        leafDigest: leaf.leafDigest,
        witness: freeze(leaf.witness.map((sibling) => freeze({ ...sibling }))),
      });
    })
    .sort((left, right) => left.name.localeCompare(right.name)));
  const basis = presentationBasis({
    ...credential,
    selectedKai: input.selectedKai,
    disclosures,
    disclosureDigest: await disclosureDigest(disclosures),
  });
  return freeze({
    schema: "receiz.credential.presentation.v125" as const,
    ...basis,
    presentationDigest: await digestReceizAuthority("artifact", "receiz.credential.presentation.v125", basis),
    authority: authority(),
  });
}

export async function exportReceizCredentialPresentationFileV125(
  presentation: ReceizCredentialPresentationV125,
): Promise<ReceizCredentialPresentationFileV125> {
  const exactBytes = presentationBytes(presentation);
  await parseTransportedPresentation(exactBytes, await sha256Hex(exactBytes));
  return freeze({
    schema: "receiz.credential.presentation-file.v125" as const,
    filename: `receiz-credential-presentation-${presentation.presentationDigest.slice(0, 16)}.json`,
    mimeType: "application/vnd.receiz.credential-presentation+json" as const,
    exactBytes: freeze([...exactBytes]),
    exactBytesSha256: await sha256Hex(exactBytes),
    presentationDigest: presentation.presentationDigest,
    authority: transportAuthority(),
  });
}

export async function importReceizCredentialPresentationFileV125(
  file: ReceizCredentialPresentationFileV125,
): Promise<ReceizCredentialPresentationV125> {
  if (file.schema !== "receiz.credential.presentation-file.v125"
    || file.mimeType !== "application/vnd.receiz.credential-presentation+json"
    || file.authority?.transportIsVerification !== false
    || file.authority?.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V125_PRESENTATION_FILE_INVALID");
  }
  const presentation = await parseTransportedPresentation(Uint8Array.from(file.exactBytes), file.exactBytesSha256);
  if (presentation.presentationDigest !== file.presentationDigest) fail("V125_PRESENTATION_FILE_BINDING_INVALID");
  return presentation;
}

export async function createReceizCredentialPresentationContentUrlV125(input: Readonly<{
  origin: string;
  presentation: ReceizCredentialPresentationV125;
}>): Promise<string> {
  const file = await exportReceizCredentialPresentationFileV125(input.presentation);
  let url: URL;
  try {
    url = new URL("/verify/credential-presentation", input.origin);
  } catch {
    fail("V125_PRESENTATION_URL_INVALID");
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    fail("V125_PRESENTATION_URL_ORIGIN_INVALID");
  }
  url.hash = new URLSearchParams({
    receizPresentation: receizBase64UrlEncode(Uint8Array.from(file.exactBytes)),
    sha256: file.exactBytesSha256,
  }).toString();
  if (url.toString().length > 65_535) fail("V125_PRESENTATION_URL_TOO_LARGE");
  return url.toString();
}

export async function readReceizCredentialPresentationContentUrlV125(
  value: string,
): Promise<ReceizCredentialPresentationV125> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail("V125_PRESENTATION_URL_INVALID");
  }
  const fields = new URLSearchParams(url.hash.slice(1));
  const encoded = fields.getAll("receizPresentation");
  const hashes = fields.getAll("sha256");
  if (url.pathname !== "/verify/credential-presentation" || encoded.length !== 1 || hashes.length !== 1) {
    fail("V125_PRESENTATION_URL_INVALID");
  }
  let bytes: Uint8Array;
  try {
    bytes = receizBase64UrlDecode(encoded[0]!);
  } catch {
    fail("V125_PRESENTATION_URL_INVALID");
  }
  return parseTransportedPresentation(bytes, hashes[0]!);
}

export async function createReceizCredentialPresentationQrHandoffV125(input: Readonly<{
  contentUrl: string;
  presentationDigest: string;
}>): Promise<ReceizCredentialPresentationQrHandoffV125> {
  const presentation = await readReceizCredentialPresentationContentUrlV125(input.contentUrl);
  if (presentation.presentationDigest !== digest(input.presentationDigest, "V125_PRESENTATION_HANDOFF_BINDING_INVALID")) {
    fail("V125_PRESENTATION_HANDOFF_BINDING_INVALID");
  }
  const payloadBytes = new TextEncoder().encode(input.contentUrl);
  if (payloadBytes.byteLength > 65_535) fail("V125_PRESENTATION_QR_PAYLOAD_TOO_LARGE");
  return freeze({
    schema: "receiz.credential.presentation-qr.v125" as const,
    contentUrl: input.contentUrl,
    payloadBytes: freeze([...payloadBytes]),
    payloadDigest: await sha256Hex(payloadBytes),
    presentationDigest: presentation.presentationDigest,
    authority: handoffAuthority(),
  });
}

export async function createReceizCredentialPresentationNfcHandoffV125(input: Readonly<{
  contentUrl: string;
  presentationDigest: string;
  nfcAvailable: boolean;
  maximumPayloadBytes?: number;
}>): Promise<ReceizCredentialPresentationNfcHandoffV125> {
  if (!input.nfcAvailable) return freeze({
    status: "unavailable" as const,
    code: "V125_PRESENTATION_NFC_UNAVAILABLE" as const,
    fallback: "qr-or-file" as const,
    authority: handoffAuthority(),
  });
  const qr = await createReceizCredentialPresentationQrHandoffV125(input);
  const maximumPayloadBytes = input.maximumPayloadBytes ?? 32_768;
  if (!Number.isSafeInteger(maximumPayloadBytes) || maximumPayloadBytes < 1
    || qr.payloadBytes.length > maximumPayloadBytes) return freeze({
    status: "unavailable" as const,
    code: "V125_PRESENTATION_NFC_PAYLOAD_TOO_LARGE" as const,
    fallback: "qr-or-file" as const,
    authority: handoffAuthority(),
  });
  return freeze({
    status: "available" as const,
    record: freeze({
      schema: "receiz.credential.presentation-nfc.v125" as const,
      recordType: "absolute-url" as const,
      contentUrl: qr.contentUrl,
      payloadDigest: qr.payloadDigest,
      presentationDigest: qr.presentationDigest,
      authority: handoffAuthority(),
    }),
  });
}

async function verifyDisclosures(
  presentation: ReceizCredentialPresentationV125,
  domain: ReceizAttestationDomainV125,
  failures: string[],
): Promise<boolean> {
  try {
    if (presentation.disclosures.length < 1
      || new Set(presentation.disclosures.map((entry) => entry.name)).size !== presentation.disclosures.length) {
      fail("V125_PRESENTATION_DISCLOSURE_INVALID");
    }
    const publicClaims = domain.claimSchemas.filter((claim) => claim.disclosure === "public").map((claim) => claim.name);
    if (publicClaims.some((name) => !presentation.disclosures.some((entry) => entry.name === name))) {
      fail("V125_PRESENTATION_PUBLIC_DISCLOSURE_REQUIRED");
    }
    for (const entry of presentation.disclosures) {
      const declaration = domain.claimSchemas.find((claim) => claim.name === entry.name);
      if (!declaration || declaration.disclosure === "private" || entry.disclosure !== declaration.disclosure) {
        fail("V125_PRESENTATION_DISCLOSURE_FORBIDDEN");
      }
      const expectedCommitment = await digestReceizAuthority("artifact", "receiz.attestation.claim-value.v125", {
        domainId: presentation.domainId,
        credentialType: presentation.credentialType,
        subjectId: presentation.subjectId,
        name: entry.name,
        disclosure: entry.disclosure,
        value: entry.value,
      });
      if (entry.valueCommitment !== expectedCommitment) fail("V125_PRESENTATION_DISCLOSURE_COMMITMENT_INVALID");
      const expectedLeaf = await digestReceizAuthority("artifact", "receiz.credential.claim-leaf.v125", {
        domainId: presentation.domainId,
        credentialType: presentation.credentialType,
        subjectId: presentation.subjectId,
        name: entry.name,
        disclosure: entry.disclosure,
        valueCommitment: entry.valueCommitment,
        evidenceIds: entry.evidenceIds,
      });
      if (entry.leafDigest !== expectedLeaf
        || recoverReceizCompositeMerkleRoot(entry.leafDigest, entry.witness) !== presentation.claimRoot) {
        fail("V125_PRESENTATION_DISCLOSURE_WITNESS_INVALID");
      }
    }
    const expectedDisclosureDigest = await disclosureDigest(presentation.disclosures);
    if (presentation.disclosureDigest !== expectedDisclosureDigest) fail("V125_PRESENTATION_DISCLOSURE_DIGEST_INVALID");
    return true;
  } catch (error) {
    failures.push(error instanceof Error ? error.message : "V125_PRESENTATION_DISCLOSURE_INVALID");
    return false;
  }
}

export async function verifyReceizCredentialPresentationV125(input: Readonly<{
  domain: ReceizAttestationDomainV125;
  presentation: ReceizCredentialPresentationV125;
  selectedKai: string;
  verifyCredential?: ReceizCredentialPresentationVerifierV125;
  holderPresence?: ReceizPbiCeremonyReceiptV125;
  replayGuard?: ReceizPbiCeremonyReplayGuardV125;
  verifyPbiAuthorship?: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizCredentialPresentationVerificationV125> {
  input = Object.freeze({ ...input, domain: freeze(structuredClone(input.domain)),
    presentation: freeze(structuredClone(input.presentation)),
    ...(input.holderPresence ? { holderPresence: freeze(structuredClone(input.holderPresence)) } : {}) });
  const failures: string[] = [];
  const presentation = input.presentation;
  let disclosuresValid = false;
  try {
    const domain = parseReceizAttestationDomainV125(input.domain);
    if (presentation.schema !== "receiz.credential.presentation.v125") fail("V125_PRESENTATION_SCHEMA_INVALID");
    const basis = presentationBasis(presentation);
    if (presentation.domainId !== domain.domainId) fail("V125_PRESENTATION_DOMAIN_MISMATCH");
    const expectedPresentationDigest = await digestReceizAuthority("artifact", presentation.schema, basis);
    if (presentation.presentationDigest !== expectedPresentationDigest) failures.push("V125_PRESENTATION_DIGEST_INVALID");
    if (presentation.selectedKai !== kai(input.selectedKai, "V125_PRESENTATION_KAI_INVALID")) {
      failures.push("V125_PRESENTATION_KAI_MISMATCH");
    }
    disclosuresValid = await verifyDisclosures(presentation, domain, failures);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : "V125_PRESENTATION_INVALID");
  }

  const presentationValid = failures.length === 0;
  let credentialValid = false;
  let currentness: ReceizCredentialPresentationVerificationV125["currentness"] = "not-proven";
  let acceptedHead = presentation.acceptedHead;
  let sourceBound = false;
  let sourceArtifactSha256: string | null = null;
  if (input.verifyCredential) {
    try {
      const opened = sourceVerifiers.get(input.verifyCredential);
      if (!opened) fail("V125_PRESENTATION_SOURCE_VERIFIER_REQUIRED");
      const expected = source(opened.history.credential);
      const presented = source(presentation);
      const knownHeads = [opened.history.credential.acceptedHead, ...opened.history.events.map((event) => event.eventDigest)];
      if (Object.keys(expected).some((key) => key !== "acceptedHead"
        && expected[key as keyof typeof expected] !== presented[key as keyof typeof presented])
        || !knownHeads.includes(presentation.acceptedHead)
        || canonicalizeReceizV122(opened.history.domain) !== canonicalizeReceizV122(parseReceizAttestationDomainV125(input.domain))) {
        fail("V125_PRESENTATION_CREDENTIAL_BINDING_MISMATCH");
      }
      sourceBound = true;
      sourceArtifactSha256 = opened.artifactSha256;
      const result = await input.verifyCredential({
        credentialId: presentation.credentialId,
        presentedHead: presentation.acceptedHead,
        selectedKai: input.selectedKai,
      });
      if (result.credentialId !== presentation.credentialId || result.presentedHead !== presentation.acceptedHead) {
        failures.push("V125_PRESENTATION_CREDENTIAL_BINDING_MISMATCH");
        currentness = "invalid";
      } else {
        currentness = result.status;
        credentialValid = result.credentialValid;
        acceptedHead = result.acceptedHead;
        if (!result.credentialValid) failures.push(`V125_PRESENTATION_CREDENTIAL_${result.status.toUpperCase()}`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "V125_PRESENTATION_CREDENTIAL_INVALID");
      currentness = "invalid";
    }
  }

  let holderPresence: ReceizCredentialPresentationVerificationV125["holderPresence"] = "not-presented";
  if (input.holderPresence) {
    const receipt = input.holderPresence;
    const exactBinding = receipt.proofObjectId === presentation.proofObjectId
      && receipt.acceptedHead === presentation.acceptedHead
      && input.verifyPbiAuthorship !== undefined && sourceArtifactSha256 !== null
      && hasReceizCredentialPbiSourceBindingV125(input.verifyPbiAuthorship, {
        artifactSha256: sourceArtifactSha256, proofObjectId: presentation.proofObjectId, acceptedHead: presentation.acceptedHead,
        ownerReceizId: presentation.holderReceizId, holderReceizId: receipt.holderReceizId,
      })
      && receipt.presentationDigest === presentation.presentationDigest
      && receipt.disclosureDigest === presentation.disclosureDigest;
    if (!sourceBound || !presentationValid || !disclosuresValid || currentness === "invalid" || !exactBinding) {
      holderPresence = "invalid";
      failures.push("V125_PRESENTATION_HOLDER_PRESENCE_BINDING_MISMATCH");
    } else if (!input.verifyPbiAuthorship) {
      holderPresence = "invalid";
      failures.push("V125_PRESENTATION_PBI_VERIFIER_REQUIRED");
    } else {
      const result = await verifyReceizPbiCeremonyReceiptV125({
        receipt,
        selectedKai: input.selectedKai,
        ...(input.replayGuard ? { replayGuard: input.replayGuard } : {}),
        verifyPbiAuthorship: input.verifyPbiAuthorship,
      });
      holderPresence = result.code === "binding-mismatch" ? "invalid" : result.code;
      if (!result.valid) failures.push(`V125_PRESENTATION_HOLDER_PRESENCE_${result.code.toUpperCase()}`);
    }
  }
  return freeze({
    schema: "receiz.credential.presentation-verification.v125" as const,
    credentialValid,
    currentness,
    holderPresence,
    disclosuresValid,
    acceptedHead,
    failureCodes: freeze([...new Set(failures)]),
    authority: authority(),
  });
}
