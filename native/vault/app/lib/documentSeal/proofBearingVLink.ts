import { deflateSync, inflateSync } from "fflate";

import type { ReceizProofBundle } from "@/app/utils/receizProofBundle";
import { coerceReceizProofBundle } from "@/app/utils/receizProofBundle";
import {
  deriveReceizSignatureV4DeviceCertId,
  deriveReceizSignatureV4PayloadHashSha256ForBundle,
  type ReceizBundleSignatureV4,
  type ReceizSignatureV4DeviceCert,
} from "@/app/lib/security/receizSignatureV4";
import { anchoredReceizVerifyPathFromBundle } from "@/app/lib/documentSeal/verifyLink";
import { buildKaiKlockResponseFromPulseSync } from "@/app/utils/kai_pulse";
import { base64UrlDecode, base64UrlEncode } from "@/app/utils/sha256";

const COMPACT_RECEIZ_V_LINK_PREFIX = "rpb1:" as const;
const COMPACT_RECEIZ_V_LINK_V2_PREFIX = "rpb2:" as const;
const LEGACY_BINARY_COMPACT_RECEIZ_V_LINK_VERSION = 2;
const BINARY_COMPACT_RECEIZ_V_LINK_VERSION_WITH_FULL_SIGNATURE = 3;
const BINARY_COMPACT_RECEIZ_V_LINK_VERSION = 4;
const MAX_COMPACT_RECEIZ_V_LINK_CHARS = 6_000;
const MAX_COMPACT_RECEIZ_V_LINK_BYTES = 32 * 1024;
const MAX_COMPACT_RECEIZ_V_LINK_JSON_BYTES = 96 * 1024;
const RECEIZ_PUBLIC_ORIGIN = "https://receiz.com";
const DEFAULT_RECEIZ_SIGNATURE_V4_ISSUER_KID = "receiz.v4.prod.2026-03-02";

const FLAG_PAYLOAD_VERSION_V1 = 1 << 0;
const FLAG_TS_STORED = 1 << 1;
const FLAG_TS_DISPLAY_DERIVED = 1 << 2;
const FLAG_TS_DISPLAY_STORED = 1 << 3;
const FLAG_VERIFY_URL_BASE = 1 << 4;
const FLAG_VERIFY_URL_ANCHORED = 1 << 5;
const FLAG_VERIFY_URL_STORED = 1 << 6;
const FLAG_KAI_KLOK_STORED = 1 << 7;
const FLAG_TZ_MINUTES_PRESENT = 1 << 8;
const FLAG_SIGNER_KEY_ID_PRESENT = 1 << 9;
const FLAG_ANCHOR_ID_PRESENT = 1 << 10;
const FLAG_ZK_POSEIDON_HASH_PRESENT = 1 << 11;
const FLAG_GROTH16_DIGEST_PRESENT = 1 << 12;
const FLAG_ARTIFACT_BASIS_PRESENT = 1 << 13;
const FLAG_WIREPROOF_PRESENT = 1 << 14;
const FLAG_WIREPROOF_PATH_STORED = 1 << 15;
const FLAG_SIGNATURE_V4_PRESENT = 1 << 16;
const FLAG_SIGNATURE_V4_ISSUER_KID_STORED = 1 << 17;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type CompactReceizVLinkRoute = Readonly<{
  slug: string;
  code: string;
  pulse: string;
}>;

type ReceizSignatureV4Kernel = Readonly<{
  signedAtMs: number;
  sig: string;
  cert: Omit<ReceizSignatureV4DeviceCert, "certId">;
}>;

type BinaryCompactDecodeParts = Readonly<{
  candidate: Record<string, unknown>;
  signatureV4Kernel?: ReceizSignatureV4Kernel;
}>;

export function proofBundleForReceizVLink(bundle: ReceizProofBundle): ReceizProofBundle {
  const slim: Record<string, unknown> = { ...bundle };
  delete slim.groth16Proof;
  delete slim.signatureV3;
  return slim as ReceizProofBundle;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function finiteInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function routeVerifyPath(route: CompactReceizVLinkRoute): string {
  return `/v/${route.slug}/${route.code.trim().toUpperCase()}/${route.pulse.trim()}`;
}

function routeFromBundle(bundle: ReceizProofBundle): CompactReceizVLinkRoute {
  return {
    slug: bundle.slug,
    code: bundle.code,
    pulse: bundle.kaiPulseEternal,
  };
}

function tsFromSlug(slug: string): string | null {
  const match = slug.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function ts24ToTs12(ts24: string): string | null {
  const match = ts24.trim().match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, datePart, hourRaw, minute] = match;
  const hour = Number.parseInt(hourRaw, 10);
  if (!Number.isFinite(hour)) return null;
  const ampm = hour >= 12 ? "PM" : "AM";
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${datePart} ${h12}:${minute} ${ampm}`;
}

function kaiKlokFromPulse(pulse: string): string | null {
  try {
    return buildKaiKlockResponseFromPulseSync(BigInt(pulse.trim())).compressed_summary;
  } catch {
    return null;
  }
}

function hexToBytes(hex: string, expectedBytes: number): Uint8Array | null {
  const normalized = hex.trim().toLowerCase();
  if (!new RegExp(`^[0-9a-f]{${expectedBytes * 2}}$`).test(normalized)) return null;
  const out = new Uint8Array(expectedBytes);
  for (let i = 0; i < expectedBytes; i += 1) {
    out[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

function b64uToFixedBytes(value: string, expectedBytes: number): Uint8Array | null {
  try {
    const bytes = base64UrlDecode(value);
    return bytes.byteLength === expectedBytes ? bytes : null;
  } catch {
    return null;
  }
}

function fixedBytesToB64u(bytes: Uint8Array): string {
  return base64UrlEncode(bytes);
}

function canWriteU48(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffffffff;
}

class ByteWriter {
  private readonly chunks: number[] = [];

  writeU8(value: number): void {
    this.chunks.push(value & 0xff);
  }

  writeU16(value: number): void {
    this.chunks.push((value >>> 8) & 0xff, value & 0xff);
  }

  writeI16(value: number): void {
    const wrapped = value < 0 ? 0x10000 + value : value;
    this.writeU16(wrapped);
  }

  writeU32(value: number): void {
    this.chunks.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
  }

  writeU48(value: number): void {
    let remaining = value;
    const bytes = new Uint8Array(6);
    for (let i = 5; i >= 0; i -= 1) {
      bytes[i] = remaining & 0xff;
      remaining = Math.floor(remaining / 256);
    }
    this.writeBytes(bytes);
  }

  writeVarUint(value: number): void {
    let remaining = value >>> 0;
    while (remaining >= 0x80) {
      this.writeU8((remaining & 0x7f) | 0x80);
      remaining >>>= 7;
    }
    this.writeU8(remaining);
  }

  writeBytes(bytes: Uint8Array): void {
    for (const byte of bytes) this.chunks.push(byte);
  }

  writeText(value: string): void {
    const bytes = textEncoder.encode(value);
    this.writeVarUint(bytes.byteLength);
    this.writeBytes(bytes);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.chunks);
  }
}

class ByteReader {
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readU8(): number | null {
    if (this.offset + 1 > this.bytes.byteLength) return null;
    const value = this.bytes[this.offset];
    this.offset += 1;
    return value;
  }

  readU16(): number | null {
    const bytes = this.readBytes(2);
    if (!bytes) return null;
    return (bytes[0] << 8) | bytes[1];
  }

  readI16(): number | null {
    const value = this.readU16();
    if (value === null) return null;
    return value & 0x8000 ? value - 0x10000 : value;
  }

  readU32(): number | null {
    const bytes = this.readBytes(4);
    if (!bytes) return null;
    return ((bytes[0] * 0x1000000) + ((bytes[1] << 16) | (bytes[2] << 8) | bytes[3])) >>> 0;
  }

  readU48(): number | null {
    const bytes = this.readBytes(6);
    if (!bytes) return null;
    let value = 0;
    for (const byte of bytes) value = value * 256 + byte;
    return value;
  }

  readVarUint(): number | null {
    let result = 0;
    let shift = 0;
    for (let i = 0; i < 5; i += 1) {
      const byte = this.readU8();
      if (byte === null) return null;
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result >>> 0;
      shift += 7;
    }
    return null;
  }

  readBytes(length: number): Uint8Array | null {
    if (length < 0 || this.offset + length > this.bytes.byteLength) return null;
    const out = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return out;
  }

  readText(): string | null {
    const length = this.readVarUint();
    if (length === null) return null;
    const bytes = this.readBytes(length);
    if (!bytes) return null;
    try {
      return textDecoder.decode(bytes);
    } catch {
      return null;
    }
  }

  isDone(): boolean {
    return this.offset === this.bytes.byteLength;
  }
}

function compactSignatureV4(signature: ReceizBundleSignatureV4 | undefined): unknown {
  if (!signature) return null;
  return [
    signature.signedAtMs,
    signature.payloadHashSha256,
    signature.sig,
    [
      signature.cert.certId,
      signature.cert.issuerKid,
      signature.cert.subjectPublicKeyRawB64u,
      signature.cert.issuedAtMs,
      signature.cert.expiresAtMs,
      signature.cert.sig,
    ],
  ];
}

function expandSignatureV4(value: unknown): ReceizBundleSignatureV4 | undefined {
  if (!Array.isArray(value)) return undefined;
  const [signedAtMsRaw, payloadHashSha256, sig, certRaw] = value;
  if (!Array.isArray(certRaw)) return undefined;
  const [certId, issuerKid, subjectPublicKeyRawB64u, issuedAtMsRaw, expiresAtMsRaw, certSig] = certRaw;
  const signedAtMs = finiteInteger(signedAtMsRaw);
  const issuedAtMs = finiteInteger(issuedAtMsRaw);
  const expiresAtMs = finiteInteger(expiresAtMsRaw);
  const payloadHashSha256Text = nonEmptyString(payloadHashSha256);
  const sigText = nonEmptyString(sig);
  const certIdText = nonEmptyString(certId);
  const issuerKidText = nonEmptyString(issuerKid);
  const subjectPublicKeyRawB64uText = nonEmptyString(subjectPublicKeyRawB64u);
  const certSigText = nonEmptyString(certSig);
  if (
    signedAtMs === null ||
    issuedAtMs === null ||
    expiresAtMs === null ||
    !payloadHashSha256Text ||
    !sigText ||
    !certIdText ||
    !issuerKidText ||
    !subjectPublicKeyRawB64uText ||
    !certSigText
  ) {
    return undefined;
  }

  return {
    version: 1,
    alg: "Ed25519",
    cert: {
      version: 1,
      certType: "receiz.device.v1",
      certId: certIdText,
      issuerKid: issuerKidText,
      alg: "Ed25519",
      subjectPublicKeyRawB64u: subjectPublicKeyRawB64uText,
      issuedAtMs,
      expiresAtMs,
      sig: certSigText,
    },
    sig: sigText,
    payloadHashSha256: payloadHashSha256Text,
    signedAtMs,
  };
}

function compactWireproof(bundle: ReceizProofBundle): unknown {
  if (!bundle.wireproof) return null;
  return [bundle.wireproof.anchorId, bundle.wireproof.claimHashSha256, bundle.wireproof.verifierPath];
}

function expandWireproof(value: unknown): ReceizProofBundle["wireproof"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const [anchorId, claimHashSha256, verifierPath] = value;
  const anchorIdText = nonEmptyString(anchorId);
  const claimHashSha256Text = nonEmptyString(claimHashSha256);
  const verifierPathText = nonEmptyString(verifierPath);
  if (!anchorIdText || !claimHashSha256Text || !verifierPathText) return undefined;
  return {
    schema: "wireproof.v1",
    anchorId: anchorIdText,
    claimHashSha256: claimHashSha256Text,
    verifierPath: verifierPathText,
  };
}

function compactProofBundleFields(bundle: ReceizProofBundle): unknown[] {
  const slim = proofBundleForReceizVLink(bundle);
  const compact = [
    slim.nativeRecordSeal ? "rpb2" : "rpb1",
    slim.payloadVersion,
    slim.createdAtMs,
    slim.ts,
    slim.tsDisplay ?? "",
    typeof slim.tzMinutesEast === "number" ? slim.tzMinutesEast : null,
    slim.verifyUrl,
    slim.kaiKlok,
    slim.signerKeyId ?? "",
    slim.anchorId ?? "",
    slim.receizClaimId,
    slim.sigilClaimSeed,
    slim.zkPoseidonHash ?? "",
    slim.groth16ProofDigest ?? "",
    slim.artifactSha256Basis ?? "",
    compactWireproof(slim),
    compactSignatureV4(slim.signatureV4),
    slim.artifactBasis?.normalization ?? "",
  ];
  if (slim.nativeCapture || slim.nativeCaptureSource || slim.nativeCaptureClaim) {
    compact.push(slim.nativeCapture ?? null, slim.nativeCaptureSource ?? null, slim.nativeCaptureClaim ?? null);
  }
  if (slim.pbiAuthorshipHistory) {
    while (compact.length < 21) compact.push(null);
    compact.push(slim.pbiAuthorshipHistory);
  }
  if (slim.nativeRecordSeal) {
    while (compact.length < 22) compact.push(null);
    compact.push(slim.nativeRecordSeal);
  }
  return compact;
}

function expandCompactProofBundleFields(value: unknown, route: CompactReceizVLinkRoute): ReceizProofBundle | null {
  if (!Array.isArray(value)) return null;
  const [
    marker,
    payloadVersion,
    createdAtMsRaw,
    ts,
    tsDisplay,
    tzMinutesEastRaw,
    verifyUrl,
    kaiKlok,
    signerKeyId,
    anchorId,
    receizClaimId,
    sigilClaimSeed,
    zkPoseidonHash,
    groth16ProofDigest,
    artifactSha256Basis,
    wireproofRaw,
    signatureV4Raw,
    artifactBasisNormalization,
    nativeCaptureRaw,
    nativeCaptureSourceRaw,
    nativeCaptureClaimRaw,
    pbiAuthorshipHistoryRaw,
    nativeRecordSealRaw,
  ] = value;
  const createdAtMs = finiteInteger(createdAtMsRaw);
  if (
    (marker !== "rpb1" && marker !== "rpb2") ||
    (payloadVersion !== "v2" && payloadVersion !== "v1") ||
    createdAtMs === null ||
    !nonEmptyString(ts) ||
    !nonEmptyString(verifyUrl) ||
    !nonEmptyString(kaiKlok) ||
    !nonEmptyString(receizClaimId) ||
    !nonEmptyString(sigilClaimSeed)
  ) {
    return null;
  }
  if ((marker === "rpb2") !== Boolean(nativeRecordSealRaw)) return null;

  const normalizedCode = route.code.trim().toUpperCase();
  const normalizedPulse = route.pulse.trim();
  const signerKeyIdText = nonEmptyString(signerKeyId);
  const anchorIdText = nonEmptyString(anchorId);
  const zkPoseidonHashText = nonEmptyString(zkPoseidonHash);
  const groth16ProofDigestText = nonEmptyString(groth16ProofDigest);
  const artifactSha256BasisText = nonEmptyString(artifactSha256Basis);
  const artifactBasis =
    artifactBasisNormalization === "jpeg-adobe-xmp-app1-v1"
    || artifactBasisNormalization === "jpeg-ios-photos-carrier-v2"
    || artifactBasisNormalization === "jpeg-ios-photos-carrier-v3"
    || artifactBasisNormalization === "jpeg-ios-photos-carrier-v4"
    || artifactBasisNormalization === "jpeg-ios-photos-carrier-v5"
    || artifactBasisNormalization === "jpeg-ios-photos-carrier-v6"
      ? {
          algorithm: "sha256" as const,
          normalization: artifactBasisNormalization,
        }
      : undefined;
  if (nonEmptyString(artifactBasisNormalization) && !artifactBasis) return null;
  const wireproof = expandWireproof(wireproofRaw);
  const signatureV4 = expandSignatureV4(signatureV4Raw);
  const candidate = {
    kind: "receiz.proof_bundle",
    payloadVersion,
    createdAtMs,
    ts,
    ...(nonEmptyString(tsDisplay) ? { tsDisplay } : {}),
    ...(typeof tzMinutesEastRaw === "number" && Number.isFinite(tzMinutesEastRaw)
      ? { tzMinutesEast: Math.trunc(tzMinutesEastRaw) }
      : {}),
    code: normalizedCode,
    slug: route.slug,
    verifyPath: `/v/${route.slug}/${normalizedCode}/${normalizedPulse}`,
    verifyUrl,
    kaiPulseEternal: normalizedPulse,
    kaiKlok,
    ...(signerKeyIdText ? { signerKeyId: signerKeyIdText } : {}),
    ...(anchorIdText ? { anchorId: anchorIdText } : {}),
    receizClaimId,
    sigilClaimSeed,
    ...(zkPoseidonHashText ? { zkPoseidonHash: zkPoseidonHashText } : {}),
    ...(groth16ProofDigestText ? { groth16ProofDigest: groth16ProofDigestText } : {}),
    ...(artifactSha256BasisText ? { artifactSha256Basis: artifactSha256BasisText } : {}),
    ...(artifactBasis ? { artifactBasis } : {}),
    ...(wireproof ? { wireproof } : {}),
    ...(signatureV4 ? { signatureV4 } : {}),
    ...(nativeCaptureRaw ? { nativeCapture: nativeCaptureRaw } : {}),
    ...(nativeCaptureSourceRaw ? { nativeCaptureSource: nativeCaptureSourceRaw } : {}),
    ...(nativeCaptureClaimRaw ? { nativeCaptureClaim: nativeCaptureClaimRaw } : {}),
    ...(pbiAuthorshipHistoryRaw ? { pbiAuthorshipHistory: pbiAuthorshipHistoryRaw } : {}),
    ...(nativeRecordSealRaw ? { nativeRecordSeal: nativeRecordSealRaw } : {}),
  };

  return coerceReceizProofBundle(candidate);
}

function writeHex(writer: ByteWriter, value: string, expectedBytes: number): boolean {
  const bytes = hexToBytes(value, expectedBytes);
  if (!bytes) return false;
  writer.writeBytes(bytes);
  return true;
}

function writeB64uBytes(writer: ByteWriter, value: string, expectedBytes: number): boolean {
  const bytes = b64uToFixedBytes(value, expectedBytes);
  if (!bytes) return false;
  writer.writeBytes(bytes);
  return true;
}

function readHex(reader: ByteReader, expectedBytes: number): string | null {
  const bytes = reader.readBytes(expectedBytes);
  return bytes ? bytesToHex(bytes) : null;
}

function readB64u(reader: ByteReader, expectedBytes: number): string | null {
  const bytes = reader.readBytes(expectedBytes);
  return bytes ? fixedBytesToB64u(bytes) : null;
}

function binaryVerifyUrlMode(bundle: ReceizProofBundle, route: CompactReceizVLinkRoute): number {
  const basePath = routeVerifyPath(route);
  const baseUrl = `${RECEIZ_PUBLIC_ORIGIN}${basePath}`;
  if (bundle.verifyUrl === baseUrl) return FLAG_VERIFY_URL_BASE;
  if (
    bundle.anchorId &&
    bundle.verifyUrl === `${baseUrl}?a=${bundle.anchorId}&ms=${bundle.createdAtMs}`
  ) {
    return FLAG_VERIFY_URL_ANCHORED;
  }
  return FLAG_VERIFY_URL_STORED;
}

function buildBinaryCompactReceizProofToken(bundle: ReceizProofBundle): string | null {
  const slim = proofBundleForReceizVLink(bundle);
  if (slim.artifactBasis || slim.nativeCapture || slim.nativeCaptureSource || slim.nativeCaptureClaim || slim.pbiAuthorshipHistory || slim.nativeRecordSeal) return null;
  const route = routeFromBundle(slim);
  const routeTs = tsFromSlug(route.slug);
  const derivedTsDisplay = ts24ToTs12(slim.ts);
  const derivedKaiKlok = kaiKlokFromPulse(route.pulse);
  const createdAtMs = finiteInteger(slim.createdAtMs);
  const signature = slim.signatureV4;

  if (!canWriteU48(createdAtMs)) return null;
  if (!hexToBytes(slim.receizClaimId, 16)) return null;
  if (!hexToBytes(slim.sigilClaimSeed, 32)) return null;

  let flags = 0;
  if (slim.payloadVersion === "v1") flags |= FLAG_PAYLOAD_VERSION_V1;
  if (slim.ts !== routeTs) flags |= FLAG_TS_STORED;
  if (typeof slim.tsDisplay === "string" && slim.tsDisplay.length > 0) {
    flags |= slim.tsDisplay === derivedTsDisplay ? FLAG_TS_DISPLAY_DERIVED : FLAG_TS_DISPLAY_STORED;
  }
  if (typeof slim.tzMinutesEast === "number" && Number.isFinite(slim.tzMinutesEast)) {
    const tz = Math.trunc(slim.tzMinutesEast);
    if (tz < -32768 || tz > 32767) return null;
    flags |= FLAG_TZ_MINUTES_PRESENT;
  }
  flags |= binaryVerifyUrlMode(slim, route);
  if (slim.kaiKlok !== derivedKaiKlok) flags |= FLAG_KAI_KLOK_STORED;
  if (slim.signerKeyId) {
    if (!hexToBytes(slim.signerKeyId, 6)) return null;
    flags |= FLAG_SIGNER_KEY_ID_PRESENT;
  }
  if (slim.anchorId) {
    if (!hexToBytes(slim.anchorId, 4)) return null;
    flags |= FLAG_ANCHOR_ID_PRESENT;
  }
  if (slim.zkPoseidonHash) {
    if (!hexToBytes(slim.zkPoseidonHash, 32)) return null;
    flags |= FLAG_ZK_POSEIDON_HASH_PRESENT;
  }
  if (slim.groth16ProofDigest) {
    if (!hexToBytes(slim.groth16ProofDigest, 32)) return null;
    flags |= FLAG_GROTH16_DIGEST_PRESENT;
  }
  if (slim.artifactSha256Basis) {
    if (!hexToBytes(slim.artifactSha256Basis, 32)) return null;
    flags |= FLAG_ARTIFACT_BASIS_PRESENT;
  }
  if (slim.wireproof) {
    if (!hexToBytes(slim.wireproof.anchorId, 4) || !hexToBytes(slim.wireproof.claimHashSha256, 32)) return null;
    flags |= FLAG_WIREPROOF_PRESENT;
    if (slim.wireproof.verifierPath !== `${routeVerifyPath(route)}?a=${slim.wireproof.anchorId}&ms=${slim.createdAtMs}`) {
      flags |= FLAG_WIREPROOF_PATH_STORED;
    }
  }
  if (signature) {
    if (
      signature.version !== 1 ||
      signature.alg !== "Ed25519" ||
      signature.cert.version !== 1 ||
      signature.cert.certType !== "receiz.device.v1" ||
      signature.cert.alg !== "Ed25519" ||
      !canWriteU48(finiteInteger(signature.signedAtMs)) ||
      !canWriteU48(finiteInteger(signature.cert.issuedAtMs)) ||
      !canWriteU48(finiteInteger(signature.cert.expiresAtMs)) ||
      !hexToBytes(signature.payloadHashSha256, 32) ||
      !b64uToFixedBytes(signature.sig, 64) ||
      !hexToBytes(signature.cert.certId, 16) ||
      !b64uToFixedBytes(signature.cert.subjectPublicKeyRawB64u, 32) ||
      !b64uToFixedBytes(signature.cert.sig, 64)
    ) {
      return null;
    }
    flags |= FLAG_SIGNATURE_V4_PRESENT;
    if (signature.cert.issuerKid !== DEFAULT_RECEIZ_SIGNATURE_V4_ISSUER_KID) {
      flags |= FLAG_SIGNATURE_V4_ISSUER_KID_STORED;
    }
  }

  const writer = new ByteWriter();
  writer.writeU8(BINARY_COMPACT_RECEIZ_V_LINK_VERSION);
  writer.writeVarUint(flags);
  writer.writeU48(createdAtMs);
  if (flags & FLAG_TS_STORED) writer.writeText(slim.ts);
  if (flags & FLAG_TS_DISPLAY_STORED) writer.writeText(slim.tsDisplay ?? "");
  if (flags & FLAG_TZ_MINUTES_PRESENT) writer.writeI16(Math.trunc(slim.tzMinutesEast ?? 0));
  if (flags & FLAG_VERIFY_URL_STORED) writer.writeText(slim.verifyUrl);
  if (flags & FLAG_KAI_KLOK_STORED) writer.writeText(slim.kaiKlok);
  if ((flags & FLAG_SIGNER_KEY_ID_PRESENT) && !writeHex(writer, slim.signerKeyId ?? "", 6)) return null;
  if ((flags & FLAG_ANCHOR_ID_PRESENT) && !writeHex(writer, slim.anchorId ?? "", 4)) return null;
  if (!writeHex(writer, slim.receizClaimId, 16)) return null;
  if (!writeHex(writer, slim.sigilClaimSeed, 32)) return null;
  if ((flags & FLAG_ZK_POSEIDON_HASH_PRESENT) && !writeHex(writer, slim.zkPoseidonHash ?? "", 32)) return null;
  if ((flags & FLAG_GROTH16_DIGEST_PRESENT) && !writeHex(writer, slim.groth16ProofDigest ?? "", 32)) return null;
  if ((flags & FLAG_ARTIFACT_BASIS_PRESENT) && !writeHex(writer, slim.artifactSha256Basis ?? "", 32)) return null;
  if (slim.wireproof) {
    if (!writeHex(writer, slim.wireproof.anchorId, 4)) return null;
    if (!writeHex(writer, slim.wireproof.claimHashSha256, 32)) return null;
    if (flags & FLAG_WIREPROOF_PATH_STORED) writer.writeText(slim.wireproof.verifierPath);
  }
  if (signature) {
    writer.writeU48(Math.trunc(signature.signedAtMs));
    if (!writeB64uBytes(writer, signature.sig, 64)) return null;
    if (flags & FLAG_SIGNATURE_V4_ISSUER_KID_STORED) writer.writeText(signature.cert.issuerKid);
    if (!writeB64uBytes(writer, signature.cert.subjectPublicKeyRawB64u, 32)) return null;
    writer.writeU48(Math.trunc(signature.cert.issuedAtMs));
    writer.writeU48(Math.trunc(signature.cert.expiresAtMs));
    if (!writeB64uBytes(writer, signature.cert.sig, 64)) return null;
  }

  const bytes = writer.toUint8Array();
  if (bytes.byteLength > MAX_COMPACT_RECEIZ_V_LINK_BYTES) return null;
  return base64UrlEncode(bytes);
}

function decodeBinaryCompactReceizProofTokenParts(
  token: string,
  route: CompactReceizVLinkRoute,
): BinaryCompactDecodeParts | null {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlDecode(token);
  } catch {
    return null;
  }
  if (bytes.byteLength > MAX_COMPACT_RECEIZ_V_LINK_BYTES) return null;
  const reader = new ByteReader(bytes);
  const version = reader.readU8();
  if (
    version !== LEGACY_BINARY_COMPACT_RECEIZ_V_LINK_VERSION &&
    version !== BINARY_COMPACT_RECEIZ_V_LINK_VERSION_WITH_FULL_SIGNATURE &&
    version !== BINARY_COMPACT_RECEIZ_V_LINK_VERSION
  ) {
    return null;
  }
  const flags = version === LEGACY_BINARY_COMPACT_RECEIZ_V_LINK_VERSION ? reader.readU32() : reader.readVarUint();
  const createdAtMs = reader.readU48();
  if (flags === null || createdAtMs === null) return null;

  const normalizedCode = route.code.trim().toUpperCase();
  const normalizedPulse = route.pulse.trim();
  const basePath = routeVerifyPath({ ...route, code: normalizedCode, pulse: normalizedPulse });
  const routeTs = tsFromSlug(route.slug);
  const ts = flags & FLAG_TS_STORED ? reader.readText() : routeTs;
  if (!ts) return null;
  const tsDisplay = flags & FLAG_TS_DISPLAY_STORED
    ? reader.readText()
    : flags & FLAG_TS_DISPLAY_DERIVED
      ? ts24ToTs12(ts)
      : null;
  if ((flags & (FLAG_TS_DISPLAY_STORED | FLAG_TS_DISPLAY_DERIVED)) && !tsDisplay) return null;
  const tzMinutesEast = flags & FLAG_TZ_MINUTES_PRESENT ? reader.readI16() : null;
  if ((flags & FLAG_TZ_MINUTES_PRESENT) && tzMinutesEast === null) return null;

  const verifyUrlMode = flags & (FLAG_VERIFY_URL_BASE | FLAG_VERIFY_URL_ANCHORED | FLAG_VERIFY_URL_STORED);
  const storedVerifyUrl = verifyUrlMode === FLAG_VERIFY_URL_STORED ? reader.readText() : null;
  if (verifyUrlMode === FLAG_VERIFY_URL_STORED && !storedVerifyUrl) return null;
  const storedKaiKlok = flags & FLAG_KAI_KLOK_STORED ? reader.readText() : null;
  if ((flags & FLAG_KAI_KLOK_STORED) && !storedKaiKlok) return null;

  const signerKeyId = flags & FLAG_SIGNER_KEY_ID_PRESENT ? readHex(reader, 6) : null;
  const anchorId = flags & FLAG_ANCHOR_ID_PRESENT ? readHex(reader, 4) : null;
  const receizClaimId = readHex(reader, 16);
  const sigilClaimSeed = readHex(reader, 32);
  const zkPoseidonHash = flags & FLAG_ZK_POSEIDON_HASH_PRESENT ? readHex(reader, 32) : null;
  const groth16ProofDigest = flags & FLAG_GROTH16_DIGEST_PRESENT ? readHex(reader, 32) : null;
  const artifactSha256Basis = flags & FLAG_ARTIFACT_BASIS_PRESENT ? readHex(reader, 32) : null;
  if (
    ((flags & FLAG_SIGNER_KEY_ID_PRESENT) && !signerKeyId) ||
    ((flags & FLAG_ANCHOR_ID_PRESENT) && !anchorId) ||
    !receizClaimId ||
    !sigilClaimSeed ||
    ((flags & FLAG_ZK_POSEIDON_HASH_PRESENT) && !zkPoseidonHash) ||
    ((flags & FLAG_GROTH16_DIGEST_PRESENT) && !groth16ProofDigest) ||
    ((flags & FLAG_ARTIFACT_BASIS_PRESENT) && !artifactSha256Basis)
  ) {
    return null;
  }

  let verifyUrl: string | null = null;
  if (verifyUrlMode === FLAG_VERIFY_URL_BASE) {
    verifyUrl = `${RECEIZ_PUBLIC_ORIGIN}${basePath}`;
  } else if (verifyUrlMode === FLAG_VERIFY_URL_ANCHORED) {
    if (!anchorId) return null;
    verifyUrl = `${RECEIZ_PUBLIC_ORIGIN}${basePath}?a=${anchorId}&ms=${createdAtMs}`;
  } else if (verifyUrlMode === FLAG_VERIFY_URL_STORED) {
    verifyUrl = storedVerifyUrl;
  } else {
    return null;
  }
  if (!verifyUrl) return null;

  const kaiKlok = storedKaiKlok ?? kaiKlokFromPulse(normalizedPulse);
  if (!kaiKlok) return null;

  let wireproof: ReceizProofBundle["wireproof"] | undefined;
  if (flags & FLAG_WIREPROOF_PRESENT) {
    const wireproofAnchorId = readHex(reader, 4);
    const wireproofClaimHashSha256 = readHex(reader, 32);
    const verifierPath = flags & FLAG_WIREPROOF_PATH_STORED
      ? reader.readText()
      : wireproofAnchorId
        ? `${basePath}?a=${wireproofAnchorId}&ms=${createdAtMs}`
        : null;
    if (!wireproofAnchorId || !wireproofClaimHashSha256 || !verifierPath) return null;
    wireproof = {
      schema: "wireproof.v1",
      anchorId: wireproofAnchorId,
      claimHashSha256: wireproofClaimHashSha256,
      verifierPath,
    };
  }

  let signatureV4: ReceizBundleSignatureV4 | undefined;
  let signatureV4Kernel: ReceizSignatureV4Kernel | undefined;
  if (flags & FLAG_SIGNATURE_V4_PRESENT) {
    const signedAtMs = reader.readU48();
    const payloadHashSha256 =
      version === BINARY_COMPACT_RECEIZ_V_LINK_VERSION ? null : readHex(reader, 32);
    const sig = readB64u(reader, 64);
    const certId = version === BINARY_COMPACT_RECEIZ_V_LINK_VERSION ? null : readHex(reader, 16);
    const issuerKid =
      version === LEGACY_BINARY_COMPACT_RECEIZ_V_LINK_VERSION || (flags & FLAG_SIGNATURE_V4_ISSUER_KID_STORED)
        ? reader.readText()
        : DEFAULT_RECEIZ_SIGNATURE_V4_ISSUER_KID;
    const subjectPublicKeyRawB64u = readB64u(reader, 32);
    const issuedAtMs = reader.readU48();
    const expiresAtMs = reader.readU48();
    const certSig = readB64u(reader, 64);
    if (
      signedAtMs === null ||
      !sig ||
      !issuerKid ||
      !subjectPublicKeyRawB64u ||
      issuedAtMs === null ||
      expiresAtMs === null ||
      !certSig
    ) {
      return null;
    }
    if (version === BINARY_COMPACT_RECEIZ_V_LINK_VERSION) {
      signatureV4Kernel = {
        signedAtMs,
        sig,
        cert: {
          version: 1,
          certType: "receiz.device.v1",
          issuerKid,
          alg: "Ed25519",
          subjectPublicKeyRawB64u,
          issuedAtMs,
          expiresAtMs,
          sig: certSig,
        },
      };
    } else {
      if (!payloadHashSha256 || !certId) return null;
      signatureV4 = {
        version: 1,
        alg: "Ed25519",
        cert: {
          version: 1,
          certType: "receiz.device.v1",
          certId,
          issuerKid,
          alg: "Ed25519",
          subjectPublicKeyRawB64u,
          issuedAtMs,
          expiresAtMs,
          sig: certSig,
        },
        sig,
        payloadHashSha256,
        signedAtMs,
      };
    }
  }

  if (!reader.isDone()) return null;

  const candidate = {
    kind: "receiz.proof_bundle",
    payloadVersion: flags & FLAG_PAYLOAD_VERSION_V1 ? "v1" : "v2",
    createdAtMs,
    ts,
    ...(tsDisplay ? { tsDisplay } : {}),
    ...(tzMinutesEast !== null ? { tzMinutesEast } : {}),
    code: normalizedCode,
    slug: route.slug,
    verifyPath: basePath,
    verifyUrl,
    kaiPulseEternal: normalizedPulse,
    kaiKlok,
    ...(signerKeyId ? { signerKeyId } : {}),
    ...(anchorId ? { anchorId } : {}),
    receizClaimId,
    sigilClaimSeed,
    ...(zkPoseidonHash ? { zkPoseidonHash } : {}),
    ...(groth16ProofDigest ? { groth16ProofDigest } : {}),
    ...(artifactSha256Basis ? { artifactSha256Basis } : {}),
    ...(wireproof ? { wireproof } : {}),
    ...(signatureV4 ? { signatureV4 } : {}),
  };

  return { candidate, ...(signatureV4Kernel ? { signatureV4Kernel } : {}) };
}

export function buildCompactReceizProofToken(bundle: ReceizProofBundle): string {
  const binary = buildBinaryCompactReceizProofToken(bundle);
  const raw = textEncoder.encode(JSON.stringify(compactProofBundleFields(bundle)));
  if (raw.byteLength > MAX_COMPACT_RECEIZ_V_LINK_JSON_BYTES) {
    throw new Error("Compact Receiz proof token too large.");
  }
  const compressed = deflateSync(raw, { level: 9 });
  if (compressed.byteLength > MAX_COMPACT_RECEIZ_V_LINK_BYTES) {
    throw new Error("Compact Receiz proof token too large.");
  }
  const legacy = `${bundle.nativeRecordSeal ? COMPACT_RECEIZ_V_LINK_V2_PREFIX : COMPACT_RECEIZ_V_LINK_PREFIX}${base64UrlEncode(compressed)}`;
  return binary && binary.length < legacy.length ? binary : legacy;
}

async function expandReceizSignatureV4Kernel(
  candidate: Record<string, unknown>,
  kernel: ReceizSignatureV4Kernel,
): Promise<ReceizProofBundle | null> {
  const unsigned = coerceReceizProofBundle(candidate);
  if (!unsigned) return null;
  const certId = await deriveReceizSignatureV4DeviceCertId(kernel.cert);
  const payloadHashSha256 = await deriveReceizSignatureV4PayloadHashSha256ForBundle(unsigned);
  return coerceReceizProofBundle({
    ...candidate,
    signatureV4: {
      version: 1,
      alg: "Ed25519",
      cert: {
        ...kernel.cert,
        certId,
      },
      sig: kernel.sig,
      payloadHashSha256,
      signedAtMs: kernel.signedAtMs,
    },
  });
}

function decodeBinaryCompactReceizProofToken(token: string, route: CompactReceizVLinkRoute): ReceizProofBundle | null {
  const decoded = decodeBinaryCompactReceizProofTokenParts(token, route);
  if (!decoded || decoded.signatureV4Kernel) return null;
  return coerceReceizProofBundle(decoded.candidate);
}

async function decodeBinaryCompactReceizProofTokenAsync(
  token: string,
  route: CompactReceizVLinkRoute,
): Promise<ReceizProofBundle | null> {
  const decoded = decodeBinaryCompactReceizProofTokenParts(token, route);
  if (!decoded) return null;
  if (decoded.signatureV4Kernel) {
    return expandReceizSignatureV4Kernel(decoded.candidate, decoded.signatureV4Kernel);
  }
  return coerceReceizProofBundle(decoded.candidate);
}

export function decodeCompactReceizProofToken(
  token: string,
  route: CompactReceizVLinkRoute,
): ReceizProofBundle | null {
  if (!token || token.length > MAX_COMPACT_RECEIZ_V_LINK_CHARS) return null;
  if (!token.startsWith(COMPACT_RECEIZ_V_LINK_PREFIX) && !token.startsWith(COMPACT_RECEIZ_V_LINK_V2_PREFIX)) {
    return decodeBinaryCompactReceizProofToken(token, route);
  }
  const prefix = token.startsWith(COMPACT_RECEIZ_V_LINK_V2_PREFIX)
    ? COMPACT_RECEIZ_V_LINK_V2_PREFIX
    : COMPACT_RECEIZ_V_LINK_PREFIX;
  const encoded = token.slice(prefix.length);
  if (!encoded) return null;
  let compressed: Uint8Array;
  try {
    compressed = base64UrlDecode(encoded);
  } catch {
    return null;
  }
  if (compressed.byteLength > MAX_COMPACT_RECEIZ_V_LINK_BYTES) return null;
  let inflated: Uint8Array;
  try {
    inflated = inflateSync(compressed);
  } catch {
    return null;
  }
  if (inflated.byteLength > MAX_COMPACT_RECEIZ_V_LINK_JSON_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(inflated));
  } catch {
    return null;
  }
  return expandCompactProofBundleFields(parsed, route);
}

export async function decodeCompactReceizProofTokenAsync(
  token: string,
  route: CompactReceizVLinkRoute,
): Promise<ReceizProofBundle | null> {
  if (!token || token.length > MAX_COMPACT_RECEIZ_V_LINK_CHARS) return null;
  if (!token.startsWith(COMPACT_RECEIZ_V_LINK_PREFIX) && !token.startsWith(COMPACT_RECEIZ_V_LINK_V2_PREFIX)) {
    return decodeBinaryCompactReceizProofTokenAsync(token, route);
  }
  return decodeCompactReceizProofToken(token, route);
}

export function buildProofBearingReceizVPath(args: {
  verifyPath: string;
  proofBundle: ReceizProofBundle;
}): string {
  const token = buildCompactReceizProofToken(args.proofBundle);
  const url = new URL(args.verifyPath, "https://receiz.local");
  url.searchParams.delete("p");
  url.searchParams.delete("a");
  url.searchParams.delete("ms");
  url.searchParams.set("c", token);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function buildProofBearingReceizVPathFromBundle(bundle: ReceizProofBundle): string {
  return buildProofBearingReceizVPath({
    verifyPath: anchoredReceizVerifyPathFromBundle(bundle) || bundle.verifyPath,
    proofBundle: bundle,
  });
}
