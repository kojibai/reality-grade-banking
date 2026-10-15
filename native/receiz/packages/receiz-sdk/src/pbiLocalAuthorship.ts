import {
  buildLocalPbiReceipt,
  computeLocalPbiReceiptHash,
  verifyLocalPbiAssertion,
  type LocalPbiAssertion,
  type LocalPbiReceiptV1,
  type LocalPbiVerifyResult,
} from "./pbiLocalVerifier.js";
import { jcsCanonicalize, base64UrlDecode, base64UrlEncode, sha256Hex } from "./verifier/crypto.js";
type StoredCredential = { credIdB64Url: string; pubKeyPem: string };

const LOCAL_PBI_AUTHORSHIP_PROOF_SCHEMA = "receiz.pbi.authorship.local-proof.v1";
const LOCAL_PBI_AUTHORSHIP_CHALLENGE_SCHEMA = "receiz.pbi.authorship.local-challenge.v1";
const SLUG_RE = /^\d{8}_\d{4}$/;
const CODE_RE = /^[A-Z0-9]{8}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const KAI_UPULSE_RE = /^(0|[1-9][0-9]*)$/;
const PROOF_OBJECT_SCOPE_KEYS = new Set([
  "predecessorArtifactSha256",
  "predecessorProofHead",
  "receizId",
  "authorshipPosition",
  "kaiUpulse",
]);

export type LocalPbiProofObjectScopeV115 = Readonly<{
  predecessorArtifactSha256: string;
  predecessorProofHead: string;
  receizId: string;
  authorshipPosition: number;
  kaiUpulse: string;
}>;

export type LocalPbiAuthorshipInput = {
  slug: string;
  code: string;
  pulse: string;
  claimHashHex: string;
  proofObjectScope?: LocalPbiProofObjectScopeV115;
};

type LocalPbiAuthorshipChallengeV1 = {
  schema: typeof LOCAL_PBI_AUTHORSHIP_CHALLENGE_SCHEMA;
  actionHashHex: string;
  purpose: "ACTION_COMMIT";
  nonceB64Url: string;
  createdAt: string;
};

export type LocalPbiAuthorshipProofV1 = {
  schema: typeof LOCAL_PBI_AUTHORSHIP_PROOF_SCHEMA;
  input: LocalPbiAuthorshipInput;
  actionHashHex: string;
  challengeId: string;
  challengeB64Url: string;
  assertion: LocalPbiAssertion;
  receipt: LocalPbiReceiptV1;
  pbiReceiptHash: string;
  verifiedAt: string;
};

export type LocalPbiAuthorshipDependencies = {
  now?: () => number;
  nonceB64Url?: () => string;
  performAssertion?: (args: {
    challengeB64Url: string;
    credIdB64Url: string;
    pubKeyPem: string;
  }) => Promise<LocalPbiAssertion>;
  verifyAssertion?: typeof verifyLocalPbiAssertion;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLocalPbiProofObjectScopeV115(
  value: unknown,
): LocalPbiProofObjectScopeV115 | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== PROOF_OBJECT_SCOPE_KEYS.size
    || !ownKeys.every((key) =>
      typeof key === "string"
      && PROOF_OBJECT_SCOPE_KEYS.has(key)
      && descriptors[key]?.enumerable === true
      && "value" in descriptors[key]!)
  ) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const predecessorArtifactSha256 = normalizeText(record.predecessorArtifactSha256).toLowerCase();
  const predecessorProofHead = normalizeText(record.predecessorProofHead).toLowerCase();
  const receizId = normalizeText(record.receizId).toLowerCase();
  const authorshipPosition = record.authorshipPosition;
  const kaiUpulse = normalizeText(record.kaiUpulse);
  if (
    !HEX64_RE.test(predecessorArtifactSha256)
    || !HEX64_RE.test(predecessorProofHead)
    || !HEX64_RE.test(receizId)
    || typeof authorshipPosition !== "number"
    || !Number.isSafeInteger(authorshipPosition)
    || authorshipPosition < 0
    || !KAI_UPULSE_RE.test(kaiUpulse)
  ) {
    return null;
  }
  return {
    predecessorArtifactSha256,
    predecessorProofHead,
    receizId,
    authorshipPosition,
    kaiUpulse,
  };
}

export function normalizeLocalPbiAuthorshipInput(value: unknown): LocalPbiAuthorshipInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalPbiAuthorshipInput>;
  const slug = normalizeText(record.slug);
  const code = normalizeText(record.code).toUpperCase();
  const pulse = normalizeText(record.pulse);
  const claimHashHex = normalizeText(record.claimHashHex).toLowerCase();
  const proofObjectScope = record.proofObjectScope === undefined
    ? undefined
    : normalizeLocalPbiProofObjectScopeV115(record.proofObjectScope);
  if (!SLUG_RE.test(slug) || !CODE_RE.test(code) || !pulse || !HEX64_RE.test(claimHashHex)) return null;
  if (record.proofObjectScope !== undefined && !proofObjectScope) return null;
  return {
    slug,
    code,
    pulse,
    claimHashHex,
    ...(proofObjectScope ? { proofObjectScope } : {}),
  };
}

function normalizeAssertion(value: unknown): LocalPbiAssertion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalPbiAssertion>;
  const authenticatorDataB64Url = normalizeText(record.authenticatorDataB64Url);
  const clientDataJSONB64Url = normalizeText(record.clientDataJSONB64Url);
  const signatureB64Url = normalizeText(record.signatureB64Url);
  const credIdB64Url = normalizeText(record.credIdB64Url);
  const pubKeyPem = normalizeText(record.pubKeyPem);
  if (
    !BASE64URL_RE.test(authenticatorDataB64Url) ||
    !BASE64URL_RE.test(clientDataJSONB64Url) ||
    !BASE64URL_RE.test(signatureB64Url) ||
    !BASE64URL_RE.test(credIdB64Url) ||
    !pubKeyPem.includes("BEGIN PUBLIC KEY")
  ) {
    return null;
  }
  return {
    authenticatorDataB64Url,
    clientDataJSONB64Url,
    signatureB64Url,
    credIdB64Url,
    pubKeyPem,
  };
}

function normalizeReceipt(value: unknown): LocalPbiReceiptV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalPbiReceiptV1>;
  const authorSig = record.authorSig;
  if (!authorSig || typeof authorSig !== "object") return null;
  const challengeId = normalizeText(record.challengeId);
  const challenge = normalizeText(record.challenge);
  const actionHash = normalizeText(record.actionHash).toLowerCase();
  const aud = normalizeText(record.aud);
  const purpose = normalizeText(record.purpose);
  const credId = normalizeText(authorSig.credId);
  const authenticatorData = normalizeText(authorSig.authenticatorData);
  const clientDataJSON = normalizeText(authorSig.clientDataJSON);
  const signature = normalizeText(authorSig.signature);
  if (
    record.ver !== "pbi-receipt-1.0" ||
    !challengeId ||
    !BASE64URL_RE.test(challenge) ||
    !HEX64_RE.test(actionHash) ||
    !aud ||
    !purpose ||
    authorSig.alg !== "webauthn-es256" ||
    !BASE64URL_RE.test(credId) ||
    !BASE64URL_RE.test(authenticatorData) ||
    !BASE64URL_RE.test(clientDataJSON) ||
    !BASE64URL_RE.test(signature)
  ) {
    return null;
  }
  return {
    ver: "pbi-receipt-1.0",
    challengeId,
    challenge,
    actionHash,
    aud,
    purpose,
    authorSig: {
      alg: "webauthn-es256",
      credId,
      authenticatorData,
      clientDataJSON,
      signature,
    },
  };
}

export function canonicalLocalPbiAuthorshipAction(inputValue: LocalPbiAuthorshipInput): string {
  const input = normalizeLocalPbiAuthorshipInput(inputValue);
  if (!input) throw new Error("local_pbi_authorship_input_invalid");
  if (input.proofObjectScope) {
    return [
      "RECEIZ_PBI_PROOF_OBJECT_AUTHORSHIP_V115",
      `slug=${input.slug}`,
      `code=${input.code}`,
      `pulse=${input.pulse}`,
      `claimHashHex=${input.claimHashHex}`,
      `predecessorArtifactSha256=${input.proofObjectScope.predecessorArtifactSha256}`,
      `predecessorProofHead=${input.proofObjectScope.predecessorProofHead}`,
      `receizId=${input.proofObjectScope.receizId}`,
      `authorshipPosition=${input.proofObjectScope.authorshipPosition}`,
      `kaiUpulse=${input.proofObjectScope.kaiUpulse}`,
      "scope=PROOF_OBJECT_AUTHORSHIP_APPEND",
    ].join("\n");
  }
  return [
    "RECEIZ_PBI_AUTHORSHIP_V1",
    `slug=${input.slug}`,
    `code=${input.code}`,
    `pulse=${input.pulse}`,
    `claimHashHex=${input.claimHashHex}`,
    "scope=AUTHORSHIP_ATTACH",
  ].join("\n");
}

export async function computeLocalPbiAuthorshipActionHash(input: LocalPbiAuthorshipInput): Promise<string> {
  return sha256Hex(canonicalLocalPbiAuthorshipAction(input));
}

function randomNonceB64Url(): string {
  const nonce = new Uint8Array(24);
  crypto.getRandomValues(nonce);
  return base64UrlEncode(nonce);
}

function encodeChallenge(challenge: LocalPbiAuthorshipChallengeV1): string {
  return base64UrlEncode(new TextEncoder().encode(jcsCanonicalize(challenge)));
}

function decodeChallenge(challengeB64Url: string): LocalPbiAuthorshipChallengeV1 | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(challengeB64Url))) as Partial<LocalPbiAuthorshipChallengeV1>;
    const actionHashHex = normalizeText(parsed.actionHashHex).toLowerCase();
    const nonceB64Url = normalizeText(parsed.nonceB64Url);
    const createdAt = normalizeText(parsed.createdAt);
    if (
      parsed.schema !== LOCAL_PBI_AUTHORSHIP_CHALLENGE_SCHEMA ||
      parsed.purpose !== "ACTION_COMMIT" ||
      !HEX64_RE.test(actionHashHex) ||
      !BASE64URL_RE.test(nonceB64Url) ||
      !createdAt
    ) {
      return null;
    }
    return {
      schema: LOCAL_PBI_AUTHORSHIP_CHALLENGE_SCHEMA,
      actionHashHex,
      purpose: "ACTION_COMMIT",
      nonceB64Url,
      createdAt,
    };
  } catch {
    return null;
  }
}

export function normalizeLocalPbiAuthorshipProof(value: unknown): LocalPbiAuthorshipProofV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalPbiAuthorshipProofV1>;
  const input = normalizeLocalPbiAuthorshipInput(record.input);
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const challengeId = normalizeText(record.challengeId);
  const challengeB64Url = normalizeText(record.challengeB64Url);
  const assertion = normalizeAssertion(record.assertion);
  const receipt = normalizeReceipt(record.receipt);
  const pbiReceiptHash = normalizeText(record.pbiReceiptHash).toLowerCase();
  const verifiedAt = normalizeText(record.verifiedAt);
  if (
    record.schema !== LOCAL_PBI_AUTHORSHIP_PROOF_SCHEMA ||
    !input ||
    !HEX64_RE.test(actionHashHex) ||
    !challengeId ||
    !BASE64URL_RE.test(challengeB64Url) ||
    !assertion ||
    !receipt ||
    !HEX64_RE.test(pbiReceiptHash) ||
    !verifiedAt
  ) {
    return null;
  }
  return {
    schema: LOCAL_PBI_AUTHORSHIP_PROOF_SCHEMA,
    input,
    actionHashHex,
    challengeId,
    challengeB64Url,
    assertion,
    receipt,
    pbiReceiptHash,
    verifiedAt,
  };
}

export async function createLocalPbiAuthorshipProof(args: {
  input: LocalPbiAuthorshipInput;
  credential: StoredCredential;
  dependencies?: LocalPbiAuthorshipDependencies;
}): Promise<LocalPbiAuthorshipProofV1> {
  const input = normalizeLocalPbiAuthorshipInput(args.input);
  const credIdB64Url = normalizeText(args.credential.credIdB64Url);
  const pubKeyPem = normalizeText(args.credential.pubKeyPem);
  if (!input || !BASE64URL_RE.test(credIdB64Url) || !pubKeyPem.includes("BEGIN PUBLIC KEY")) {
    throw new Error("local_pbi_authorship_credential_invalid");
  }

  const actionHashHex = await computeLocalPbiAuthorshipActionHash(input);
  const now = args.dependencies?.now?.() ?? Date.now();
  const nonceB64Url = args.dependencies?.nonceB64Url?.() ?? randomNonceB64Url();
  if (!BASE64URL_RE.test(nonceB64Url)) throw new Error("local_pbi_authorship_nonce_invalid");
  const challenge: LocalPbiAuthorshipChallengeV1 = {
    schema: LOCAL_PBI_AUTHORSHIP_CHALLENGE_SCHEMA,
    actionHashHex,
    purpose: "ACTION_COMMIT",
    nonceB64Url,
    createdAt: new Date(now).toISOString(),
  };
  const challengeB64Url = encodeChallenge(challenge);
  const challengeId = `local-pbi-authorship:${actionHashHex}:${nonceB64Url}`;
  const performAssertion = args.dependencies?.performAssertion;
  if (!performAssertion) throw new Error("local_pbi_authorship_host_assertion_required");
  const assertion = await performAssertion({ challengeB64Url, credIdB64Url, pubKeyPem });
  if (assertion.credIdB64Url !== credIdB64Url || assertion.pubKeyPem.trim() !== pubKeyPem) {
    throw new Error("local_pbi_authorship_credential_mismatch");
  }
  const verifyAssertion = args.dependencies?.verifyAssertion ?? verifyLocalPbiAssertion;
  const verified = await verifyAssertion({ challengeB64Url, assertion });
  if (!verified.ok || verified.decision !== "PBI_VERIFIED") {
    throw new Error(`local_pbi_authorship_denied:${verified.reason}`);
  }
  const receipt = buildLocalPbiReceipt({
    challengeId,
    challengeB64Url,
    actionHashHex,
    aud: "receiz",
    purpose: "ACTION_COMMIT",
    assertion,
  });
  const pbiReceiptHash = await computeLocalPbiReceiptHash(receipt);
  return {
    schema: LOCAL_PBI_AUTHORSHIP_PROOF_SCHEMA,
    input,
    actionHashHex,
    challengeId,
    challengeB64Url,
    assertion,
    receipt,
    pbiReceiptHash,
    verifiedAt: new Date(now).toISOString(),
  };
}

export async function verifyLocalPbiAuthorshipProof(
  proofValue: LocalPbiAuthorshipProofV1,
  verifyAssertion: (args: {
    challengeB64Url: string;
    assertion: LocalPbiAssertion;
  }) => Promise<LocalPbiVerifyResult> = verifyLocalPbiAssertion,
): Promise<boolean> {
  const proof = normalizeLocalPbiAuthorshipProof(proofValue);
  if (!proof) return false;
  const actionHashHex = await computeLocalPbiAuthorshipActionHash(proof.input);
  if (actionHashHex !== proof.actionHashHex) return false;
  const challenge = decodeChallenge(proof.challengeB64Url);
  if (!challenge || challenge.actionHashHex !== actionHashHex) return false;
  if (proof.challengeId !== `local-pbi-authorship:${actionHashHex}:${challenge.nonceB64Url}`) return false;
  const verified = await verifyAssertion({
    challengeB64Url: proof.challengeB64Url,
    assertion: proof.assertion,
  });
  if (!verified.ok || verified.decision !== "PBI_VERIFIED") return false;
  const expectedReceipt = buildLocalPbiReceipt({
    challengeId: proof.challengeId,
    challengeB64Url: proof.challengeB64Url,
    actionHashHex,
    aud: "receiz",
    purpose: "ACTION_COMMIT",
    assertion: proof.assertion,
  });
  if (jcsCanonicalize(expectedReceipt) !== jcsCanonicalize(proof.receipt)) return false;
  return (await computeLocalPbiReceiptHash(expectedReceipt)) === proof.pbiReceiptHash;
}
