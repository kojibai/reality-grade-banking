import type { PortableJson } from "./portableAsset.js";
import { jcsCanonicalize, sha256Hex } from "./verifier/crypto.js";

export type ReceizPbiProofObjectAuthorshipAppendV1 = Readonly<{
  schema: "receiz.pbi.proof-object-authorship.v1";
  position: number;
  predecessorArtifactSha256: string;
  predecessorProofHead: string;
  previousAppendHeadSha256: string | null;
  claimHashHex: string;
  slug: string;
  code: string;
  pulse: string;
  receizId: string;
  credentialId: string;
  credentialPublicKeyPem: string;
  pbiReceipt: PortableJson;
  pbiReceiptHash: string;
  signedAt: string;
  kaiUpulse: string;
  actionHashSha256: string;
  appendHeadSha256: string;
}>;

export type ReceizPbiProofObjectAuthorshipAppendV1Input = Readonly<{
  history: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
  predecessorArtifactSha256: string;
  predecessorProofHead: string;
  claimHashHex: string;
  slug: string;
  code: string;
  pulse: string;
  receizId: string;
  credentialId: string;
  credentialPublicKeyPem: string;
  pbiReceipt: PortableJson;
  pbiReceiptHash: string;
  signedAt: string;
  kaiUpulse: string;
}>;

type ReceizPbiProofObjectAuthorshipActionV1 = Omit<
  ReceizPbiProofObjectAuthorshipAppendV1,
  "actionHashSha256" | "appendHeadSha256"
>;

const HEX64_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;
const APPEND_KEYS = new Set([
  "schema",
  "position",
  "predecessorArtifactSha256",
  "predecessorProofHead",
  "previousAppendHeadSha256",
  "claimHashHex",
  "slug",
  "code",
  "pulse",
  "receizId",
  "credentialId",
  "credentialPublicKeyPem",
  "pbiReceipt",
  "pbiReceiptHash",
  "signedAt",
  "kaiUpulse",
  "actionHashSha256",
  "appendHeadSha256",
]);
const PRISTINE_OBJECT_PROTOTYPE_KEYS = new Set([
  "constructor",
  "__defineGetter__",
  "__defineSetter__",
  "hasOwnProperty",
  "__lookupGetter__",
  "__lookupSetter__",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toString",
  "valueOf",
  "__proto__",
  "toLocaleString",
]);

function isPristineObjectPrototype(value: object): boolean {
  if (Object.getPrototypeOf(value) !== null) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === PRISTINE_OBJECT_PROTOTYPE_KEYS.size
    && ownKeys.every((key) => typeof key === "string"
      && PRISTINE_OBJECT_PROTOTYPE_KEYS.has(key)
      && descriptors[key]?.enumerable === false);
}

function hasExactDataProperties(
  value: unknown,
  keys: ReadonlySet<string>,
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (prototype === Object.prototype && !isPristineObjectPrototype(prototype)) return false;
  if ("toJSON" in value) return false;
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.size
    && ownKeys.every((key) => typeof key === "string"
      && keys.has(key)
      && descriptors[key]?.enumerable === true
      && "value" in descriptors[key]!);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPortableJson(
  value: unknown,
  state: { nodes: number; ancestors: Set<object> } = { nodes: 0, ancestors: new Set() },
  depth = 0,
): value is PortableJson {
  state.nodes += 1;
  if (depth > 64 || state.nodes > 100_000) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || state.ancestors.has(value)) return false;

  state.ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Object.keys(value);
      return keys.length === value.length
        && keys.every((key, index) => key === String(index))
        && value.every((entry) => isPortableJson(entry, state, depth + 1));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Reflect.ownKeys(descriptors).every((key) => {
      if (typeof key !== "string") return false;
      const descriptor = descriptors[key]!;
      return descriptor.enumerable
        && "value" in descriptor
        && isPortableJson(descriptor.value, state, depth + 1);
    });
  } finally {
    state.ancestors.delete(value);
  }
}

function isCanonicalChronos(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isAuthorshipAppend(value: unknown): value is ReceizPbiProofObjectAuthorshipAppendV1 {
  if (!hasExactDataProperties(value, APPEND_KEYS)) return false;
  return value.schema === "receiz.pbi.proof-object-authorship.v1"
    && typeof value.position === "number"
    && Number.isSafeInteger(value.position)
    && value.position >= 0
    && typeof value.predecessorArtifactSha256 === "string"
    && HEX64_RE.test(value.predecessorArtifactSha256)
    && typeof value.predecessorProofHead === "string"
    && HEX64_RE.test(value.predecessorProofHead)
    && (value.previousAppendHeadSha256 === null
      || (typeof value.previousAppendHeadSha256 === "string"
        && HEX64_RE.test(value.previousAppendHeadSha256)))
    && typeof value.claimHashHex === "string"
    && HEX64_RE.test(value.claimHashHex)
    && isNonemptyString(value.slug)
    && isNonemptyString(value.code)
    && isNonemptyString(value.pulse)
    && typeof value.receizId === "string"
    && HEX64_RE.test(value.receizId)
    && isNonemptyString(value.credentialId)
    && isNonemptyString(value.credentialPublicKeyPem)
    && isPortableJson(value.pbiReceipt)
    && typeof value.pbiReceiptHash === "string"
    && HEX64_RE.test(value.pbiReceiptHash)
    && isCanonicalChronos(value.signedAt)
    && typeof value.kaiUpulse === "string"
    && KAI_RE.test(value.kaiUpulse)
    && typeof value.actionHashSha256 === "string"
    && HEX64_RE.test(value.actionHashSha256)
    && typeof value.appendHeadSha256 === "string"
    && HEX64_RE.test(value.appendHeadSha256);
}

function actionBody(
  value: ReceizPbiProofObjectAuthorshipAppendV1,
): ReceizPbiProofObjectAuthorshipActionV1 {
  return {
    schema: value.schema,
    position: value.position,
    predecessorArtifactSha256: value.predecessorArtifactSha256,
    predecessorProofHead: value.predecessorProofHead,
    previousAppendHeadSha256: value.previousAppendHeadSha256,
    claimHashHex: value.claimHashHex,
    slug: value.slug,
    code: value.code,
    pulse: value.pulse,
    receizId: value.receizId,
    credentialId: value.credentialId,
    credentialPublicKeyPem: value.credentialPublicKeyPem,
    pbiReceipt: value.pbiReceipt,
    pbiReceiptHash: value.pbiReceiptHash,
    signedAt: value.signedAt,
    kaiUpulse: value.kaiUpulse,
  };
}

async function digestAction(
  value: ReceizPbiProofObjectAuthorshipAppendV1,
): Promise<string> {
  return sha256Hex(jcsCanonicalize(actionBody(value)));
}

async function digestAppendHead(
  actionHashSha256: string,
  previousAppendHeadSha256: string | null,
): Promise<string> {
  return sha256Hex(jcsCanonicalize({ actionHashSha256, previousAppendHeadSha256 }));
}

export async function verifyReceizPbiProofObjectAuthorshipChainV1(
  history: readonly unknown[],
): Promise<boolean> {
  try {
    const appendHeads = new Set<string>();
    const predecessorArtifacts = new Set<string>();
    let previous: ReceizPbiProofObjectAuthorshipAppendV1 | null = null;

    for (const [position, candidate] of history.entries()) {
      if (!isAuthorshipAppend(candidate)) return false;
      const expectedPreviousHead = previous?.appendHeadSha256 ?? null;
      if (candidate.position !== position
        || candidate.previousAppendHeadSha256 !== expectedPreviousHead
        || previous !== null && candidate.predecessorProofHead !== previous.appendHeadSha256
        || previous !== null && candidate.claimHashHex !== previous.claimHashHex
        || previous !== null && candidate.slug !== previous.slug
        || previous !== null && candidate.code !== previous.code
        || previous !== null && candidate.pulse !== previous.pulse
        || previous !== null && BigInt(candidate.kaiUpulse) <= BigInt(previous.kaiUpulse)
        || appendHeads.has(candidate.appendHeadSha256)
        || predecessorArtifacts.has(candidate.predecessorArtifactSha256)) {
        return false;
      }
      const actionHashSha256 = await digestAction(candidate);
      if (actionHashSha256 !== candidate.actionHashSha256
        || await digestAppendHead(actionHashSha256, candidate.previousAppendHeadSha256)
          !== candidate.appendHeadSha256) {
        return false;
      }
      appendHeads.add(candidate.appendHeadSha256);
      predecessorArtifacts.add(candidate.predecessorArtifactSha256);
      previous = candidate;
    }
    return true;
  } catch {
    return false;
  }
}

export async function appendReceizPbiProofObjectAuthorshipV1(
  input: ReceizPbiProofObjectAuthorshipAppendV1Input,
): Promise<ReceizPbiProofObjectAuthorshipAppendV1> {
  if (!await verifyReceizPbiProofObjectAuthorshipChainV1(input.history)) {
    throw new Error("proof_object_authorship_history_invalid");
  }
  const previousAppendHeadSha256 = input.history.at(-1)?.appendHeadSha256 ?? null;
  const action: ReceizPbiProofObjectAuthorshipActionV1 = {
    schema: "receiz.pbi.proof-object-authorship.v1",
    position: input.history.length,
    predecessorArtifactSha256: input.predecessorArtifactSha256,
    predecessorProofHead: input.predecessorProofHead,
    previousAppendHeadSha256,
    claimHashHex: input.claimHashHex,
    slug: input.slug,
    code: input.code,
    pulse: input.pulse,
    receizId: input.receizId,
    credentialId: input.credentialId,
    credentialPublicKeyPem: input.credentialPublicKeyPem,
    pbiReceipt: structuredClone(input.pbiReceipt),
    pbiReceiptHash: input.pbiReceiptHash,
    signedAt: input.signedAt,
    kaiUpulse: input.kaiUpulse,
  };
  const actionHashSha256 = await sha256Hex(jcsCanonicalize(action));
  const appendHeadSha256 = await digestAppendHead(actionHashSha256, previousAppendHeadSha256);
  const append = { ...action, actionHashSha256, appendHeadSha256 };
  if (!await verifyReceizPbiProofObjectAuthorshipChainV1([...input.history, append])) {
    throw new Error("proof_object_authorship_append_invalid");
  }
  return append;
}
