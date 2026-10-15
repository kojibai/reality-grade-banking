import { verifyReceizArtifact, type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import { createReceizSourceBoundPbiAuthorshipVerifierV125, type ReceizPbiSourceBindingV125 } from "./v125PbiSourceVerifier.js";
import type { ReceizPbiAuthorshipVerifierV125 } from "./v125PbiCeremony.js";
import type { LocalPbiVerifyPolicy } from "./pbiLocalVerifier.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { readReceizTemporalSubjectSourceV125 } from "./v125SubjectSource.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { closedRecord, digest, exactBase64Url, freeze, text } from "./v124Contracts.js";

/** Selection only. Owner, holder, proof identity and accepted head are source-derived. */
export type ReceizSubjectSourceFamilyBindingV125 = Readonly<{
  currentArtifactSha256: string;
  identityArtifactSha256: string;
  subjectArtifactSha256: string | null;
}>;
export type ReceizSubjectSourceFamilyV125 = Readonly<{
  schema: "receiz.subject-source-family.v125";
  artifacts: readonly ReceizPortableSealedArtifactV124[];
  bindings: readonly ReceizSubjectSourceFamilyBindingV125[];
  familySetDigest: string;
}>;
export type ReceizOpenedSubjectSourceFamilyV125 = Readonly<{
  family: ReceizSubjectSourceFamilyV125;
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
  authority: Readonly<{ familyIsProofAuthority: false; selectionIsIdentityAdmission: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;
type Member = Readonly<{
  artifact: ReceizPortableSealedArtifactV124;
  verification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>;
}>;
const opened = new WeakMap<ReceizOpenedSubjectSourceFamilyV125, ReadonlyMap<string, Member>>();
function fail(code: string): never { throw new TypeError(`V125_SUBJECT_FAMILY_${code}`); }
const shapeError = "V125_SUBJECT_FAMILY_CLOSED_SHAPE_INVALID";

function snapshotSources(input: Readonly<{ artifacts: readonly ReceizPortableSealedArtifactV124[]; bindings: readonly ReceizSubjectSourceFamilyBindingV125[] }>) {
  if (!Array.isArray(input.artifacts) || !Array.isArray(input.bindings) || !input.artifacts.length || !input.bindings.length) fail("EMPTY");
  const artifacts = new Map<string, ReceizPortableSealedArtifactV124>();
  for (const value of input.artifacts) {
    const record = closedRecord(value, ["schema", "exactBytesB64u", "filename", "mimeType", "artifactSha256", "payloadSha256"], shapeError);
    if (record.schema !== "receiz.sealed-artifact-bytes.v124") fail("SOURCE_SCHEMA_INVALID");
    exactBase64Url(record.exactBytesB64u, "V125_SUBJECT_FAMILY_SOURCE_BYTES_INVALID");
    const artifact = Object.freeze({ schema: "receiz.sealed-artifact-bytes.v124" as const,
      exactBytesB64u: record.exactBytesB64u as string, filename: text(record.filename, shapeError), mimeType: text(record.mimeType, shapeError),
      artifactSha256: digest(record.artifactSha256, shapeError), payloadSha256: digest(record.payloadSha256, shapeError) });
    const prior = artifacts.get(artifact.artifactSha256);
    if (prior && canonicalizeReceizV122(prior) !== canonicalizeReceizV122(artifact)) fail("DUPLICATE_CONFLICT");
    artifacts.set(artifact.artifactSha256, artifact);
  }
  const bindings = new Map<string, ReceizSubjectSourceFamilyBindingV125>();
  for (const value of input.bindings) {
    const record = closedRecord(value, ["currentArtifactSha256", "identityArtifactSha256", "subjectArtifactSha256"], shapeError);
    const binding = Object.freeze({ currentArtifactSha256: digest(record.currentArtifactSha256, shapeError),
      identityArtifactSha256: digest(record.identityArtifactSha256, shapeError),
      subjectArtifactSha256: record.subjectArtifactSha256 === null ? null : digest(record.subjectArtifactSha256, shapeError) });
    bindings.set(canonicalizeReceizV122(binding), binding);
  }
  return freeze({ schema: "receiz.subject-source-family.v125" as const,
    artifacts: [...artifacts.values()].sort((a, b) => a.artifactSha256.localeCompare(b.artifactSha256)),
    bindings: [...bindings].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value) });
}

/** Closed deterministic transport only; this does not admit any source or restore runtime custody. */
export async function createReceizSubjectSourceFamilyV125(input: Readonly<{
  artifacts: readonly ReceizPortableSealedArtifactV124[];
  bindings: readonly ReceizSubjectSourceFamilyBindingV125[];
}>): Promise<ReceizSubjectSourceFamilyV125> {
  closedRecord(input, ["artifacts", "bindings"], shapeError);
  const basis = snapshotSources(input);
  return freeze({ ...basis, familySetDigest: await digestReceizCanonicalV122(basis) });
}

/** Opens every exact member canonically, then reconstructs PBI custody from complete carried sources.
 * Identity selection remains unadmitted until the verifier checks the signed Identity challenge.
 * The family is not a relationship proof: use readReceizSubjectRelationshipSourceV125 with this verifier.
 */
export async function openReceizSubjectSourceFamilyV125(input: Readonly<{
  family: ReceizSubjectSourceFamilyV125;
  policy?: Pick<LocalPbiVerifyPolicy, "rpId" | "originAllowList">;
}>): Promise<ReceizOpenedSubjectSourceFamilyV125> {
  // No caller-owned plain data survives the first await; canonical verification
  // results remain exact runtime-custodied references rather than serialized claims.
  const record = closedRecord(input.family, ["schema", "artifacts", "bindings", "familySetDigest"], shapeError);
  if (record.schema !== "receiz.subject-source-family.v125") fail("SCHEMA_INVALID");
  const expectedDigest = digest(record.familySetDigest, shapeError);
  const basis = snapshotSources(record as unknown as ReceizSubjectSourceFamilyV125);
  const policy = Object.freeze({ rpId: input.policy?.rpId ?? "receiz.com",
    originAllowList: Object.freeze([...(input.policy?.originAllowList ?? ["https://receiz.com", "https://www.receiz.com"])]) });
  const family = freeze({ ...basis, familySetDigest: await digestReceizCanonicalV122(basis) });
  if (family.familySetDigest !== expectedDigest) fail("DIGEST_MISMATCH");
  const members = new Map<string, Member>();
  for (const artifact of family.artifacts) {
    const bytes = exactBase64Url(artifact.exactBytesB64u, shapeError);
    const verification = await verifyReceizArtifact(new File([new Uint8Array(bytes).buffer], artifact.filename, { type: artifact.mimeType }));
    if (verification.status !== "verified-artifact" || verification.artifactDigest.value !== artifact.artifactSha256
      || verification.payloadDigest.value !== artifact.payloadSha256) fail("SOURCE_INVALID");
    members.set(artifact.artifactSha256, Object.freeze({ artifact, verification }));
  }
  function member(sha: string): Member { return members.get(sha) ?? fail("SOURCE_MISSING"); }
  const used = new Set<string>();
  const active = new Set<string>();
  const visited = new Set<string>();
  function predecessors(sha: string): void {
    if (active.has(sha)) fail("CYCLE");
    if (visited.has(sha)) return;
    active.add(sha); used.add(sha);
    const rawHistory = member(sha).verification.verification.bundle.pbiAuthorshipHistory;
    if (rawHistory !== undefined && !Array.isArray(rawHistory)) fail("HISTORY_INVALID");
    for (const append of rawHistory ?? []) {
      const predecessorSha = digest(append.predecessorArtifactSha256, shapeError);
      if (!members.has(predecessorSha)) fail("PREDECESSOR_MISSING");
      predecessors(predecessorSha);
    }
    active.delete(sha); visited.add(sha);
  }
  const bindings: ReceizPbiSourceBindingV125[] = [];
  for (const selection of family.bindings) {
    // Collect the exact history's direct predecessor set independently for each
    // binding; recursive traversal separately rejects absent/cyclic dependencies.
    predecessors(selection.currentArtifactSha256);
    const current = member(selection.currentArtifactSha256);
    const history = current.verification.verification.bundle.pbiAuthorshipHistory;
    if (!Array.isArray(history) || !history.length) fail("PBI_HISTORY_REQUIRED");
    const predecessorArtifacts = history.map((append) => member(append.predecessorArtifactSha256).verification);
    const identity = member(selection.identityArtifactSha256); used.add(selection.identityArtifactSha256);
    let subjectSource: ReceizPortableSealedArtifactV124 | undefined;
    if (selection.subjectArtifactSha256 !== null) {
      subjectSource = member(selection.subjectArtifactSha256).artifact; used.add(selection.subjectArtifactSha256);
      await readReceizTemporalSubjectSourceV125(subjectSource);
    }
    bindings.push({ currentArtifact: current.verification, predecessorArtifacts, identityArtifact: identity.verification,
      ...(subjectSource ? { subjectSource } : {}) });
  }
  // Extra sources must not acquire an inferred role merely because their seal is
  // valid. A closed family carries exactly its selected sources and ancestors.
  if (used.size !== members.size) fail("UNSELECTED_SOURCE");
  const verifyPbiAuthorship = await createReceizSourceBoundPbiAuthorshipVerifierV125({ bindings, policy });
  const result = Object.freeze({ family, verifyPbiAuthorship,
    authority: Object.freeze({ familyIsProofAuthority: false as const, selectionIsIdentityAdmission: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const }) });
  opened.set(result, members);
  return result;
}

/** Exact factory-custodied source lookup; a spread or deserialized family is not opened custody. */
export function readReceizSubjectSourceFamilyMemberV125(family: ReceizOpenedSubjectSourceFamilyV125, artifactSha256: string): Member {
  const members = opened.get(family);
  if (!members) fail("NOT_OPENED");
  return members.get(artifactSha256) ?? fail("SOURCE_MISSING");
}
