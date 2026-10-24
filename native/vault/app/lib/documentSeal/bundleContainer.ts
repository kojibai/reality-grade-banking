import { jcsCanonicalize } from "@/app/utils/jcs";
import { base64UrlDecode } from "@/app/utils/sha256";
import { receizBase64UrlEncode } from "../../../packages/receiz-sdk/src/identity";
import { coerceReceizProofBundle, type ReceizProofBundle } from "@/app/utils/receizProofBundle";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type ReceizBundleManifest = Readonly<{
  filename: string;
  mime: string;
  basisSha256: string;
  createdAt: number;
  version: 1;
}>;

export type ReceizBundleEnvelope = Readonly<{
  kind: "receiz.bundle.v1";
  manifest: ReceizBundleManifest;
  originalBase64: string;
  proofbundle: ReceizProofBundle;
}>;

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function asHex64(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : null;
}

function coerceManifest(value: unknown): ReceizBundleManifest | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const filename = asNonEmptyString(obj.filename);
  const mime = asNonEmptyString(obj.mime);
  const basisSha256 = asHex64(obj.basisSha256);
  const createdAt = asInt(obj.createdAt);
  const version = obj.version === 1 ? 1 : null;
  if (!filename || !mime || !basisSha256 || createdAt === null || version !== 1) return null;
  return { filename, mime, basisSha256, createdAt, version };
}

export function encodeReceizBundleEnvelope(args: {
  manifest: ReceizBundleManifest;
  originalBytes: Uint8Array;
  proofbundle: ReceizProofBundle;
}): Uint8Array {
  const envelope: ReceizBundleEnvelope = {
    kind: "receiz.bundle.v1",
    manifest: args.manifest,
    originalBase64: receizBase64UrlEncode(args.originalBytes),
    proofbundle: args.proofbundle,
  };
  return textEncoder.encode(jcsCanonicalize(envelope));
}

export type ParsedReceizBundleEnvelope = Readonly<{
  envelope: ReceizBundleEnvelope;
  originalBytes: Uint8Array;
}>;

export function decodeReceizBundleEnvelope(bytes: Uint8Array): ParsedReceizBundleEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.kind !== "receiz.bundle.v1") return null;
  const manifest = coerceManifest(obj.manifest);
  if (!manifest) return null;
  if (typeof obj.originalBase64 !== "string") return null;
  const proofbundle = coerceReceizProofBundle(obj.proofbundle);
  if (!proofbundle) return null;

  let originalBytes: Uint8Array;
  try {
    originalBytes = base64UrlDecode(obj.originalBase64);
  } catch {
    return null;
  }

  const envelope: ReceizBundleEnvelope = {
    kind: "receiz.bundle.v1",
    manifest,
    originalBase64: obj.originalBase64,
    proofbundle,
  };
  return { envelope, originalBytes };
}

