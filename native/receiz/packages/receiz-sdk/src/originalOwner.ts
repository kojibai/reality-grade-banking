import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { assertRuntimeCustodiedReceizArtifactVerification, readRuntimeCustodiedReceizArtifactCanonicalOpen,
  readRuntimeCustodiedReceizArtifactVerifierRoots, type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import { deriveReceizIdentityKeyIdFromPublicKeyRawB64u, receizBase64UrlDecode, receizBase64UrlEncode,
  type ReceizIdentityKeyAlgorithm } from "./identity.js";

export type ReceizOriginalOwnerKeyV129 = Readonly<{
  schema: "receiz.original-owner-key.v129";
  ownerReceizId: string;
  keyId: string;
  alg: ReceizIdentityKeyAlgorithm;
  publicKeyRawB64u: string;
}>;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const exact = (value: Record<string, unknown>, fields: readonly string[]) => Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
const fail = (): never => { throw new TypeError("V129_ORIGINAL_OWNER_KEY_INVALID"); };

/** Read genesis owner assignment from this actual sealed Original. The public
 * key is carried ownership state, not a signature/possession claim. Neither a
 * detached projection nor a later Subject annotation can issue this binding.
 * Historical arbitrary payloads and ownership-transfer successors are outside
 * this fresh JSON family; native Account/grant admission remains separate. */
export async function readReceizOriginalOwnerKeyV129(input: ReceizArtifactVerificationResult): Promise<ReceizOriginalOwnerKeyV129 | null> {
  assertRuntimeCustodiedReceizArtifactVerification(input);
  const roots = readRuntimeCustodiedReceizArtifactVerifierRoots(input);
  const opened = await readRuntimeCustodiedReceizArtifactCanonicalOpen(input, roots);
  if (!opened || opened.payloadMimeType !== "application/json") return null;
  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(opened.payloadBytes)); }
  catch { return null; }
  if (!record(payload) || payload.schema !== "receiz.ai-subject-source.v129") return null;
  if (!exact(payload, ["schema", "name", "subjectType", "creationId", "visibility", "owner"])
    || typeof payload.name !== "string" || !payload.name.trim() || payload.name.length > 200
    || payload.subjectType !== "agent" || payload.visibility !== "private"
    || typeof payload.creationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(payload.creationId)
    || !record(payload.owner) || !exact(payload.owner, ["schema", "ownerReceizId", "keyId", "alg", "publicKeyRawB64u"])) return fail();
  const owner = payload.owner;
  const seal = input.verification.bundle?.nativeRecordSeal;
  const continuity = record(seal) ? seal.ownershipContinuity : undefined;
  if (owner.schema !== "receiz.original-owner-key.v129" || typeof owner.ownerReceizId !== "string" || !owner.ownerReceizId
    || owner.ownerReceizId.trim() !== owner.ownerReceizId || typeof owner.keyId !== "string" || !/^[a-f0-9]{64}$/.test(owner.keyId)
    || (owner.alg !== "Ed25519" && owner.alg !== "P-256") || typeof owner.publicKeyRawB64u !== "string"
    || input.continuity.carrier !== "native_record_seal" || input.continuity.ownerReceizId !== owner.ownerReceizId
    || (continuity !== undefined && (!record(continuity) || continuity.appendCount !== 0))) return fail();
  try {
    if (receizBase64UrlEncode(receizBase64UrlDecode(owner.publicKeyRawB64u)) !== owner.publicKeyRawB64u
      || await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(owner.publicKeyRawB64u, owner.alg) !== owner.keyId) return fail();
  } catch { return fail(); }
  const document = await createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: roots })(input, { profile: "document" });
  if (document.verdict !== "verified-document" || document.ownerReceizId !== owner.ownerReceizId) return fail();
  return Object.freeze({ schema: owner.schema, ownerReceizId: owner.ownerReceizId, keyId: owner.keyId, alg: owner.alg, publicKeyRawB64u: owner.publicKeyRawB64u });
}
