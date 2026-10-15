const PBI_RP_ID = "receiz.com";
const pbiAllowedOrigins = () => ["https://receiz.com", "https://www.receiz.com"];
import { jcsCanonicalize } from "./verifier/crypto.js";
import { base64UrlDecode, base64UrlEncode, sha256Hex } from "./verifier/crypto.js";
async function sha256Bytes(input: string | Uint8Array): Promise<Uint8Array> {
  const bytes = new Uint8Array(typeof input === "string" ? new TextEncoder().encode(input) : input);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.buffer));
}

export type LocalPbiAssertion = {
  authenticatorDataB64Url: string;
  clientDataJSONB64Url: string;
  signatureB64Url: string;
  credIdB64Url: string;
  pubKeyPem: string;
};

export type LocalPbiVerifyPolicy = {
  rpId?: string;
  originAllowList?: readonly string[];
  requireUP?: boolean;
  requireUV?: boolean;
};

export type LocalPbiReceiptV1 = {
  ver: "pbi-receipt-1.0";
  challengeId: string;
  challenge: string;
  actionHash: string;
  aud: string;
  purpose: string;
  authorSig: {
    alg: "webauthn-es256";
    credId: string;
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
  };
};

export type LocalPbiVerifyResult =
  | {
      ok: true;
      decision: "PBI_VERIFIED";
      rpIdHashB64Url: string;
      clientDataHashB64Url: string;
      flagsHex: string;
      signCount: number;
    }
  | {
      ok: false;
      decision: "FAILED";
      code:
        | "invalid_encoding"
        | "invalid_structure"
        | "origin_not_allowed"
        | "rpId_not_allowed"
        | "webauthn_type_mismatch"
        | "challenge_mismatch"
        | "flags_policy_violation"
        | "signature_invalid";
      reason: string;
    };

type ParsedClientData = {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
};

function fail(result: Exclude<LocalPbiVerifyResult, { ok: true }>): LocalPbiVerifyResult {
  return result;
}

function normalizeBase64Url(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !/^[A-Za-z0-9_-]+$/.test(trimmed) || trimmed.length % 4 === 1) return null;
  return trimmed;
}

function normalizeHex64(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : null;
}

function normalizeNonEmpty(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

function parseClientDataJSON(value: string): ParsedClientData | null {
  try {
    const bytes = base64UrlDecode(value);
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (
      typeof record.type !== "string" ||
      typeof record.challenge !== "string" ||
      typeof record.origin !== "string"
    ) {
      return null;
    }
    if (record.crossOrigin !== undefined && typeof record.crossOrigin !== "boolean") return null;
    return {
      type: record.type,
      challenge: record.challenge,
      origin: record.origin,
      ...(typeof record.crossOrigin === "boolean" ? { crossOrigin: record.crossOrigin } : {}),
    };
  } catch {
    return null;
  }
}

function derToRawSignature(signature: Uint8Array, size: number): Uint8Array | null {
  if (signature.length < 8 || signature[0] !== 0x30) return null;
  const totalLength = signature[1];
  if (typeof totalLength !== "number" || totalLength + 2 !== signature.length) return null;
  let offset = 2;
  if (signature[offset] !== 0x02) return null;
  const rLen = signature[offset + 1];
  if (typeof rLen !== "number") return null;
  offset += 2;
  const r = signature.slice(offset, offset + rLen);
  offset += rLen;
  if (signature[offset] !== 0x02) return null;
  const sLen = signature[offset + 1];
  if (typeof sLen !== "number") return null;
  offset += 2;
  const s = signature.slice(offset, offset + sLen);

  const rTrim = r[0] === 0x00 ? r.slice(1) : r;
  const sTrim = s[0] === 0x00 ? s.slice(1) : s;
  if (rTrim.length > size || sTrim.length > size) return null;

  const raw = new Uint8Array(size * 2);
  raw.set(rTrim, size - rTrim.length);
  raw.set(sTrim, size * 2 - sTrim.length);
  return raw;
}

function pemToSpkiBytes(pem: string): Uint8Array | null {
  const body = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body) return null;
  try {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function importP256PublicKeyFromPem(pubKeyPem: string): Promise<CryptoKey | null> {
  const spki = pemToSpkiBytes(pubKeyPem);
  if (!spki) return null;
  try {
    return await crypto.subtle.importKey(
      "spki",
      bytesToArrayBuffer(spki),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    return null;
  }
}

async function verifyEs256WebAuthnSignature(args: {
  pubKeyPem: string;
  authenticatorData: Uint8Array;
  clientDataJSON: Uint8Array;
  signature: Uint8Array;
}): Promise<boolean> {
  const pubKey = await importP256PublicKeyFromPem(args.pubKeyPem);
  if (!pubKey) return false;

  const clientDataHash = await sha256Bytes(args.clientDataJSON);
  const signedPayload = concatBytes(args.authenticatorData, clientDataHash);
  const derOk = await crypto.subtle
    .verify(
      { name: "ECDSA", hash: "SHA-256" },
      pubKey,
      bytesToArrayBuffer(args.signature),
      bytesToArrayBuffer(signedPayload),
    )
    .catch(() => false);
  if (derOk) return true;

  const rawSignature = derToRawSignature(args.signature, 32);
  if (!rawSignature) return false;
  return crypto.subtle
    .verify(
      { name: "ECDSA", hash: "SHA-256" },
      pubKey,
      bytesToArrayBuffer(rawSignature),
      bytesToArrayBuffer(signedPayload),
    )
    .catch(() => false);
}

export function buildLocalPbiReceipt(args: {
  challengeId: string;
  challengeB64Url: string;
  actionHashHex: string;
  aud?: string;
  purpose: string;
  assertion: LocalPbiAssertion;
}): LocalPbiReceiptV1 {
  const challengeId = normalizeNonEmpty(args.challengeId);
  const challenge = normalizeBase64Url(args.challengeB64Url);
  const actionHash = normalizeHex64(args.actionHashHex);
  const aud = normalizeNonEmpty(args.aud ?? "") ?? "receiz";
  const purpose = normalizeNonEmpty(args.purpose);
  const credId = normalizeBase64Url(args.assertion.credIdB64Url);
  const authenticatorData = normalizeBase64Url(args.assertion.authenticatorDataB64Url);
  const clientDataJSON = normalizeBase64Url(args.assertion.clientDataJSONB64Url);
  const signature = normalizeBase64Url(args.assertion.signatureB64Url);
  if (!challengeId || !challenge || !actionHash || !purpose || !credId || !authenticatorData || !clientDataJSON || !signature) {
    throw new Error("pbi_local_receipt_invalid");
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

export async function computeLocalPbiReceiptHash(receipt: LocalPbiReceiptV1): Promise<string> {
  return sha256Hex(jcsCanonicalize(receipt));
}

export async function verifyLocalPbiAssertion(args: {
  challengeB64Url: string;
  assertion: LocalPbiAssertion;
  policy?: LocalPbiVerifyPolicy;
}): Promise<LocalPbiVerifyResult> {
  const challengeB64Url = normalizeBase64Url(args.challengeB64Url);
  const authenticatorDataB64Url = normalizeBase64Url(args.assertion.authenticatorDataB64Url);
  const clientDataJSONB64Url = normalizeBase64Url(args.assertion.clientDataJSONB64Url);
  const signatureB64Url = normalizeBase64Url(args.assertion.signatureB64Url);
  const credIdB64Url = normalizeBase64Url(args.assertion.credIdB64Url);
  const pubKeyPem = args.assertion.pubKeyPem.trim();
  if (!challengeB64Url || !authenticatorDataB64Url || !clientDataJSONB64Url || !signatureB64Url || !credIdB64Url) {
    return fail({ ok: false, decision: "FAILED", code: "invalid_encoding", reason: "base64url_invalid" });
  }
  if (!pubKeyPem.includes("BEGIN PUBLIC KEY")) {
    return fail({ ok: false, decision: "FAILED", code: "invalid_structure", reason: "public_key_invalid" });
  }

  const clientData = parseClientDataJSON(clientDataJSONB64Url);
  if (!clientData) {
    return fail({ ok: false, decision: "FAILED", code: "invalid_structure", reason: "client_data_invalid" });
  }
  if (clientData.type !== "webauthn.get") {
    return fail({ ok: false, decision: "FAILED", code: "webauthn_type_mismatch", reason: "type_mismatch" });
  }
  if (clientData.challenge !== challengeB64Url) {
    return fail({ ok: false, decision: "FAILED", code: "challenge_mismatch", reason: "challenge_mismatch" });
  }
  const originAllowList = args.policy?.originAllowList ?? pbiAllowedOrigins();
  if (!originAllowList.includes(clientData.origin) || clientData.crossOrigin === true) {
    return fail({ ok: false, decision: "FAILED", code: "origin_not_allowed", reason: "origin_not_allowed" });
  }

  const authenticatorData = base64UrlDecode(authenticatorDataB64Url);
  if (authenticatorData.byteLength < 37) {
    return fail({ ok: false, decision: "FAILED", code: "invalid_structure", reason: "authenticator_data_invalid" });
  }
  const rpIdHash = authenticatorData.slice(0, 32);
  const expectedRpIdHash = await sha256Bytes(args.policy?.rpId ?? PBI_RP_ID);
  if (!bytesEqual(rpIdHash, expectedRpIdHash)) {
    return fail({ ok: false, decision: "FAILED", code: "rpId_not_allowed", reason: "rp_id_mismatch" });
  }

  const flags = authenticatorData[32] ?? 0;
  const requireUP = args.policy?.requireUP ?? true;
  const requireUV = args.policy?.requireUV ?? true;
  const hasUP = (flags & 0x01) === 0x01;
  const hasUV = (flags & 0x04) === 0x04;
  if ((requireUP && !hasUP) || (requireUV && !hasUV)) {
    return fail({ ok: false, decision: "FAILED", code: "flags_policy_violation", reason: "missing_up_uv" });
  }

  const clientDataJSON = base64UrlDecode(clientDataJSONB64Url);
  const signature = base64UrlDecode(signatureB64Url);
  const signatureOk = await verifyEs256WebAuthnSignature({
    pubKeyPem,
    authenticatorData,
    clientDataJSON,
    signature,
  });
  if (!signatureOk) {
    return fail({ ok: false, decision: "FAILED", code: "signature_invalid", reason: "signature_invalid" });
  }

  const signCount =
    ((authenticatorData[33] ?? 0) << 24) |
    ((authenticatorData[34] ?? 0) << 16) |
    ((authenticatorData[35] ?? 0) << 8) |
    (authenticatorData[36] ?? 0);
  const clientDataHash = await sha256Bytes(clientDataJSON);
  return {
    ok: true,
    decision: "PBI_VERIFIED",
    rpIdHashB64Url: base64UrlEncode(rpIdHash),
    clientDataHashB64Url: base64UrlEncode(clientDataHash),
    flagsHex: flags.toString(16).padStart(2, "0"),
    signCount: signCount >>> 0,
  };
}
