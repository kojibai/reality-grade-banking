"use client";

import { buildKaiKlockResponseFromPulse } from "@/app/utils/kai_pulse";
import { nextLiveProofKaiUpulse } from "@/app/lib/kai/liveProofKai";
import { peekActiveIdentityCustodyContext } from "@/app/lib/auth/activeIdentityCustodyContext";
import { peekActiveReceizDeviceIdentityFromRegister, realizeReceizDeviceIdentityRegister } from "@/app/lib/auth/receizDeviceIdentityRegister";
import {
  buildReceizCanonicalIdentity,
  buildReceizProofBundle,
  createReceizNativeOwnershipGenesis,
  computeReceizArtifactSha256Basis,
  encodeReceizProofBundle,
  RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
  type ReceizProofBundle,
} from "@/app/utils/receizProofBundle";
import {
  encodeReceizAnchorBundle,
  RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY,
  type ReceizAnchorBundle,
  type ReceizAnchorClaim,
  type ReceizAnchorFile,
} from "@/app/utils/receizAnchorBundle";
import { isBase64DataUrl } from "@/app/utils/dataUrl";
import { insertPngTextChunks, stripPngTextChunksByKeyword } from "@/app/utils/pngChunks";
import { DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST } from "@/app/lib/documentSeal/proofResourceManifest";
import { maybeSignReceizBundleV4 } from "@/app/lib/security/receizSignatureV4";
import {
  activeReceizSignatureV4SignerFromEnrollment,
  enrollReceizSignatureV4DeviceFromServer,
} from "@/app/lib/security/receizSignatureV4Enrollment";
import { buildProofBearingReceizVPath } from "@/app/lib/documentSeal/proofBearingVLink";
import { generateDocumentSealGroth16ProofClient } from "@/app/lib/documentSeal/realGroth16ProofClient";
import { hmacHex } from "@/app/lib/sign";
import QRCode from "qrcode";

const PROOF_QR_GENERATION_MARGIN = 2;

type ContextPreset = "Deposit" | "Milestone" | "Handoff" | "Condition" | "Agreement" | "Delivery" | "Custom";

type OfflineMintRecord = {
  ownerReceizId?: string;
  ts: string;
  code: string;
  pulse: string;
  ms: string;
  createdAt: number;
  tzMinutesEast?: number;
  anchorId?: string;
  anchoredUrl?: string;
  anchoredAt?: string;
  contextPreset?: ContextPreset;
  claim?: ReceizAnchorClaim;
  file?: ReceizAnchorFile;
};

type OfflineStore = {
  receipts: Record<string, OfflineMintRecord>;
};

type OfflineRuntimeArtifacts = {
  kaiKlok: string;
  zkPoseidonHash: string;
  groth16Proof: string;
  groth16ProofDigest: string;
};

const HEX64_RE = /^[0-9a-f]{64}$/;
const HEX8_RE = /^[0-9a-f]{8}$/;
const STORE_KEY = "receiz.offline.v1";
const OFFLINE_SIGNING_KEY = "receiz-offline-signing-key-v2";
const RECEIZ_GROTH16_NOTICE_CHUNK_KEY = "receiz.groth16";
const EMPTY_ARTIFACT_SHA256_BASIS = "0".repeat(64);
const OFFLINE_GROTH16_NOTICE = {
  scheme: DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.scheme,
  status: DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.status,
  circuitId: DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.circuitId,
  wasmSha256: DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.wasmSha256,
  zkeySha256: DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.zkeySha256,
  vkeySha256: DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST.vkeySha256,
} as const;
const OFFLINE_SIGNATURE_V4_ENROLLMENT_REQUIRED = "offline_signature_v4_enrollment_required";
const offlineRuntimeArtifactsCache = new Map<string, OfflineRuntimeArtifacts>();

function keyFor(ts: string, code: string, pulse: string): string {
  return `${ts}::${code.toUpperCase()}::${pulse}`;
}

function slugFromTs(ts: string): string {
  return ts.replace(/-/g, "").replace(/:/g, "").replace(/ /g, "_");
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function localTsFromOffset(createdAtMs: number, tzMinutesEast: number): { ts24: string; ts12: string } {
  const localMs = createdAtMs + tzMinutesEast * 60_000;
  const d = new Date(localMs);

  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  const HHn = d.getUTCHours();
  const MM = pad2(d.getUTCMinutes());

  const ts24 = `${yyyy}-${mm}-${dd} ${pad2(HHn)}:${MM}`;
  const ampm = HHn >= 12 ? "PM" : "AM";
  let h12 = HHn % 12;
  if (h12 === 0) h12 = 12;
  const ts12 = `${yyyy}-${mm}-${dd} ${h12}:${MM} ${ampm}`;

  return { ts24, ts12 };
}

function ts24ToTs12(ts24: string): string {
  const match = ts24.trim().match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return ts24;
  const [, datePart, hourRaw, minute] = match;
  const hour = Number.parseInt(hourRaw, 10);
  if (!Number.isFinite(hour)) return ts24;
  const ampm = hour >= 12 ? "PM" : "AM";
  let h12 = hour % 12;
  if (h12 === 0) h12 = 12;
  return `${datePart} ${h12}:${minute} ${ampm}`;
}

function nowTsLocal(): string {
  return localTsFromOffset(Date.now(), nowMinutesEast()).ts24;
}

function nowMinutesEast(): number {
  return -new Date().getTimezoneOffset();
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readStore(): OfflineStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { receipts: {} };
    const parsed = JSON.parse(raw) as OfflineStore;
    return parsed && parsed.receipts ? parsed : { receipts: {} };
  } catch {
    return { receipts: {} };
  }
}

function writeStore(next: OfflineStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

function asHex8(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return HEX8_RE.test(normalized) ? normalized : null;
}

function normalizeClaim(raw: unknown): ReceizAnchorClaim | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const text = typeof obj.text === "string" ? obj.text.trim().slice(0, 280) : "";
  const sha = typeof obj.sha256Hex === "string" ? obj.sha256Hex.trim().toLowerCase() : "";
  if (!text || !HEX64_RE.test(sha)) return undefined;
  return { text, sha256Hex: sha };
}

function normalizeFile(raw: unknown): ReceizAnchorFile | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const mime = typeof obj.mime === "string" ? obj.mime.trim() : "";
  const sha = typeof obj.sha256Hex === "string" ? obj.sha256Hex.trim().toLowerCase() : "";
  const size = typeof obj.size === "number" ? obj.size : Number.NaN;
  const dataUrl = typeof obj.dataUrl === "string" ? obj.dataUrl.trim() : "";
  const url = typeof obj.url === "string" ? obj.url.trim() : "";
  const hasValidDataUrl = !dataUrl || isBase64DataUrl(dataUrl);
  const hasValidUrl = !url || /^https?:\/\//i.test(url);
  if (!name || !mime || !Number.isFinite(size) || size < 0 || !HEX64_RE.test(sha) || !hasValidDataUrl || !hasValidUrl) {
    return undefined;
  }
  return { name, mime, size, sha256Hex: sha, ...(dataUrl ? { dataUrl } : {}), ...(url ? { url } : {}) };
}

function buildVerifyPath(ts: string, code: string, pulse: string): string {
  return `/v/${slugFromTs(ts)}/${code}/${pulse}`;
}

function buildAnchoredVerifyPath(ts: string, code: string, pulse: string, anchorId: string, ms: string): string {
  const params = new URLSearchParams();
  params.set("a", anchorId);
  if (ms) params.set("ms", ms);
  return `${buildVerifyPath(ts, code, pulse)}?${params.toString()}`;
}

function buildVerifyUrl(path: string): string {
  if (typeof window === "undefined") return "";
  return new URL(path, window.location.origin).toString();
}

async function buildOfflinekaiKlokFromPulse(pulseRaw: string): Promise<string> {
  const pulseBigInt = /^-?\d+$/.test(pulseRaw.trim()) ? BigInt(pulseRaw.trim()) : 0n;
  const kai = await buildKaiKlockResponseFromPulse(pulseBigInt);
  return kai.compressed_summary;
}

async function buildOfflineDeterministicZkArtifacts(args: {
  payloadVersion: "v2";
  ts: string;
  slug: string;
  code: string;
  pulse: string;
}): Promise<{ zkPoseidonHash: string; groth16Proof: string; groth16ProofDigest: string }> {
  const canonicalIdentity = buildReceizCanonicalIdentity({
    payloadVersion: args.payloadVersion,
    canonicalTs24: args.ts,
    slug: args.slug,
    code: args.code,
    kaiPulseEternal: args.pulse,
  });
  const artifactSha256Basis = await sha256Hex(`receiz-zk-basis|${canonicalIdentity}`);
  return generateDocumentSealGroth16ProofClient({
    signingKey: OFFLINE_SIGNING_KEY,
    canonicalIdentity,
    artifactSha256Basis,
  });
}

function drawReceizSigilWatermark(
  ctx: CanvasRenderingContext2D,
  seedHex: string,
  pulse: string,
  centerX: number,
  top: number,
  size: number
): void {
  const pulseNumber = Number.parseInt(pulse, 10);
  const pulseOffset = Number.isFinite(pulseNumber) ? pulseNumber % 23 : 0;
  const scale = size / 512;
  const centerY = top + size / 2;
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < 24; i += 1) {
    const offset = (i * 2) % seedHex.length;
    const byte = Number.parseInt(seedHex.slice(offset, offset + 2), 16);
    const angle = (Math.PI * 2 * i) / 24;
    const radialBase = 64 + (Number.isFinite(byte) ? byte % 120 : 0);
    const radius = clamp(radialBase + pulseOffset, 48, 192) * scale;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = "rgba(17,17,17,0.34)";
  ctx.lineWidth = Math.max(1, 2.4 * scale);
  ctx.lineCap = "round";

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const mirror = points[(i + 12) % points.length] ?? point;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(mirror.x, mirror.y);
    ctx.stroke();
  }

  if (points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(17,17,17,0.24)";
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.beginPath();
  ctx.arc(centerX, centerY, 72 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitClaimBoxLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number
): { fontSize: number; lineHeight: number; lines: string[]; height: number } {
  let fontSize = 28;
  let maxLines = 4;

  while (fontSize >= 16) {
    const lineHeight = Math.round(fontSize * 1.25);
    ctx.font = `500 ${fontSize}px serif`;
    const lines = wrapClaimLines(ctx, text, maxWidth, maxLines);
    const height = 24 + lines.length * lineHeight;

    if (height <= maxHeight) {
      return { fontSize, lineHeight, lines, height };
    }

    if (fontSize > 20) {
      fontSize -= 2;
      continue;
    }

    if (maxLines > 2) {
      maxLines -= 1;
      continue;
    }

    return { fontSize, lineHeight, lines, height: Math.min(height, maxHeight) };
  }

  const fallbackLineHeight = Math.round(16 * 1.25);
  ctx.font = "500 16px serif";
  const lines = wrapClaimLines(ctx, text, maxWidth, 2);
  return {
    fontSize: 16,
    lineHeight: fallbackLineHeight,
    lines,
    height: Math.min(24 + lines.length * fallbackLineHeight, maxHeight),
  };
}

async function getOfflineRuntimeArtifacts(record: OfflineMintRecord): Promise<OfflineRuntimeArtifacts> {
  const cacheKey = keyFor(record.ts, record.code, record.pulse);
  const cached = offlineRuntimeArtifactsCache.get(cacheKey);
  if (cached) return cached;

  const slug = slugFromTs(record.ts);
  const kaiKlok = await buildOfflinekaiKlokFromPulse(record.pulse);
  const zkArtifacts = await buildOfflineDeterministicZkArtifacts({
    payloadVersion: "v2",
    ts: record.ts,
    slug,
    code: record.code,
    pulse: record.pulse,
  });

  const next: OfflineRuntimeArtifacts = {
    kaiKlok,
    zkPoseidonHash: zkArtifacts.zkPoseidonHash,
    groth16Proof: zkArtifacts.groth16Proof,
    groth16ProofDigest: zkArtifacts.groth16ProofDigest,
  };
  offlineRuntimeArtifactsCache.set(cacheKey, next);
  return next;
}

async function ensureTrustedSignature(bundle: ReceizProofBundle): Promise<ReceizProofBundle> {
  if (bundle.signatureV4) return bundle;

  const unsigned = { ...bundle } as typeof bundle & { signatureV3?: unknown; signatureV4?: unknown };
  delete unsigned.signatureV3;
  delete unsigned.signatureV4;

  let v4Signer = await activeReceizSignatureV4SignerFromEnrollment();
  if (!v4Signer && (typeof navigator === "undefined" || navigator.onLine !== false)) {
    await enrollReceizSignatureV4DeviceFromServer().catch(() => ({ enrolled: false }));
    v4Signer = await activeReceizSignatureV4SignerFromEnrollment();
  }

  if (v4Signer) {
    const fromV4 = await maybeSignReceizBundleV4(unsigned, v4Signer);
    if (fromV4) {
      return { ...bundle, signatureV4: fromV4 };
    }
  }

  throw new Error(OFFLINE_SIGNATURE_V4_ENROLLMENT_REQUIRED);
}

function buildAnchorBundle(record: OfflineMintRecord): ReceizAnchorBundle | null {
  const anchorId = asHex8(record.anchorId);
  if (!anchorId) return null;

  const viewUrl = buildAnchoredVerifyPath(record.ts, record.code, record.pulse, anchorId, record.ms);
  const anchoredAt = record.anchoredAt ?? new Date(record.createdAt).toISOString();

  return {
    version: 1,
    parent: { code: record.code, pulse: record.pulse, viewUrl },
    anchorId,
    anchoredAt,
    ...(record.contextPreset ? { contextPreset: record.contextPreset } : {}),
    ...(record.claim ? { claim: record.claim } : {}),
    ...(record.file ? { file: record.file } : {}),
  };
}

function normalizeClaimTextForDisplay(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, 180);
}

function wrapClaimLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const paragraphs = text.split("\n");
  const out: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ").filter(Boolean);
    if (words.length === 0) {
      if (out.length < maxLines) out.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      const w = ctx.measureText(trial).width;
      if (w <= maxWidth) {
        line = trial;
        continue;
      }

      if (line) {
        out.push(line);
        if (out.length >= maxLines) break;
      }
      line = word;
    }

    if (out.length >= maxLines) break;
    if (line) out.push(line);
    if (out.length >= maxLines) break;
  }

  if (out.length > maxLines) {
    out.length = maxLines;
  }

  if (out.length === maxLines && paragraphs.join(" ").length > out.join(" ").length) {
    const last = out[maxLines - 1] ?? "";
    out[maxLines - 1] = last.endsWith("…") ? last : `${last.slice(0, Math.max(0, last.length - 1))}…`;
  }

  return out;
}

export type OfflineReceizPresentationQrMode = "embedded-anchor" | "external-completed-proof";

export function offlineReceizEmbeddedQrUrl(
  url: string,
  mode: OfflineReceizPresentationQrMode = "embedded-anchor",
): string | null {
  return mode === "embedded-anchor" ? url : null;
}

async function renderOfflineArtifact(
  record: OfflineMintRecord,
  presentationQr: OfflineReceizPresentationQrMode = "embedded-anchor",
): Promise<{
  blob: Blob;
  proofBearingVerifyPath: string;
  proofBundle: ReceizProofBundle;
}> {
  const slug = slugFromTs(record.ts);
  const runtimeArtifacts = await getOfflineRuntimeArtifacts(record);
  const tsDisplay =
    typeof record.tzMinutesEast === "number" && Number.isFinite(record.tzMinutesEast)
      ? localTsFromOffset(record.createdAt, Math.trunc(record.tzMinutesEast)).ts12
      : ts24ToTs12(record.ts);

  const verifyPath = buildVerifyPath(record.ts, record.code, record.pulse);
  const textChunks: Array<{ keyword: string; text: string }> = [
    { keyword: RECEIZ_GROTH16_NOTICE_CHUNK_KEY, text: JSON.stringify(OFFLINE_GROTH16_NOTICE) },
  ];

  const anchorBundle = buildAnchorBundle(record);
  if (anchorBundle) {
    textChunks.push({
      keyword: RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY,
      text: encodeReceizAnchorBundle(anchorBundle),
    });
  }

  const bundleInput = {
    payloadVersion: "v2" as const,
    createdAtMs: record.createdAt,
    ts: record.ts,
    tsDisplay,
    ...(typeof record.tzMinutesEast === "number" ? { tzMinutesEast: Math.trunc(record.tzMinutesEast) } : {}),
    code: record.code,
    slug,
    verifyPath,
    verifyUrl: buildVerifyUrl(verifyPath),
    kaiPulseEternal: record.pulse,
    kaiKlok: runtimeArtifacts.kaiKlok,
    signingKey: OFFLINE_SIGNING_KEY,
    ...(anchorBundle ? { anchorId: anchorBundle.anchorId } : {}),
    zkPoseidonHash: runtimeArtifacts.zkPoseidonHash,
    groth16Proof: runtimeArtifacts.groth16Proof,
    groth16ProofDigest: runtimeArtifacts.groth16ProofDigest,
  };

  const provisionalBundle = await buildReceizProofBundle({
    ...bundleInput,
    artifactSha256Basis: EMPTY_ARTIFACT_SHA256_BASIS,
  });

  const anchorId = asHex8(record.anchorId) ?? undefined;
  const baseBlob = await renderOfflinePng({
    ts: record.ts,
    tsDisplay,
    code: record.code,
    pulse: record.pulse,
    anchorId,
    ms: record.ms,
    kaiKlok: runtimeArtifacts.kaiKlok,
    zkPoseidonHash: runtimeArtifacts.zkPoseidonHash,
    groth16ProofDigest: runtimeArtifacts.groth16ProofDigest,
    sigilClaimSeed: provisionalBundle.sigilClaimSeed,
    claimText: normalizeClaimTextForDisplay(record.claim?.text ?? ""),
    presentationQr,
  });

  const pngBaseBytes = stripPngTextChunksByKeyword(
    new Uint8Array(await baseBlob.arrayBuffer()),
    RECEIZ_PROOF_BUNDLE_CHUNK_KEY
  ).pngBytes;

  const signedProvisionalBundle = await ensureTrustedSignature(provisionalBundle);

  const firstPassBytes = insertPngTextChunks(pngBaseBytes, [
    ...textChunks,
    {
      keyword: RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
      text: encodeReceizProofBundle(signedProvisionalBundle),
    },
  ]);

  const artifactSha256Basis = await computeReceizArtifactSha256Basis(firstPassBytes);
  const unsignedFinalBundle = await buildReceizProofBundle({
    ...bundleInput,
    artifactSha256Basis,
  });
  const ownerReceizId = record.ownerReceizId;
  const finalBundle = await ensureTrustedSignature(ownerReceizId ? {
    ...unsignedFinalBundle,
    nativeRecordSeal: {
      schema: "receiz.native_record_seal.v1",
      ownerReceizId,
      recordId: `native:${artifactSha256Basis}`,
      payload: { filename: `${record.code}.png`, mimeType: "image/png", sha256: artifactSha256Basis },
      ownershipContinuity: await createReceizNativeOwnershipGenesis({
        artifactId: artifactSha256Basis, namespace: `receiz.native-proof:${artifactSha256Basis}`,
        ownerReceizId, headReference: unsignedFinalBundle.receizClaimId,
      }),
    },
  } : unsignedFinalBundle);
  const anchoredVerifyPath = anchorBundle
    ? buildAnchoredVerifyPath(record.ts, record.code, record.pulse, anchorBundle.anchorId, record.ms)
    : verifyPath;
  const proofBearingVerifyPath = buildProofBearingReceizVPath({
    verifyPath: anchoredVerifyPath,
    proofBundle: finalBundle,
  });

  const embeddedBytes = insertPngTextChunks(pngBaseBytes, [
    ...textChunks,
    {
      keyword: RECEIZ_PROOF_BUNDLE_CHUNK_KEY,
      text: encodeReceizProofBundle(finalBundle),
    },
  ]);

  const body = new Uint8Array(new ArrayBuffer(embeddedBytes.byteLength));
  body.set(embeddedBytes);
  const blob = new Blob([body], { type: "image/png" });
  return { blob, proofBearingVerifyPath, proofBundle: finalBundle };
}

async function renderOfflinePng(params: {
  ts: string;
  tsDisplay: string;
  code: string;
  pulse: string;
  anchorId?: string;
  ms?: string;
  kaiKlok: string;
  zkPoseidonHash: string;
  groth16ProofDigest: string;
  sigilClaimSeed: string;
  claimText?: string;
  presentationQr?: OfflineReceizPresentationQrMode;
}): Promise<Blob> {
  const { ts, tsDisplay, code, pulse, anchorId, ms, kaiKlok, zkPoseidonHash, groth16ProofDigest, sigilClaimSeed, claimText, presentationQr } = params;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("canvas_unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const printablePath = anchorId
    ? `receiz.com/v/${slugFromTs(ts)}/${code}/${pulse}?a=${anchorId}${ms ? `&ms=${ms}` : ""}`
    : `receiz.com/v/${slugFromTs(ts)}/${code}/${pulse}`;

  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(330, 130);
  ctx.lineTo(750, 130);
  ctx.stroke();

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "700 64px serif";
  ctx.fillText("RECEIZ", centerX, 225);

  drawRoundedRect(ctx, centerX - 72, 248, 144, 28, 999);
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.stroke();
  ctx.fillStyle = "#444444";
  ctx.font = "500 12px serif";
  ctx.fillText("VERIFIED", centerX, 266);

  const glyphSize = 280;
  const glyphTop = 290;
  drawReceizSigilWatermark(ctx, sigilClaimSeed, pulse, centerX, glyphTop, glyphSize);

  ctx.fillStyle = "#0b0b0c";
  ctx.font = "500 72px serif";
  const headlineY = 640;
  ctx.fillText("This happened.", centerX, headlineY);

  const timestampY = 840;

  if (claimText) {
    const CLAIM_MAX_W = 860;
    const CLAIM_PAD_X = 16;
    const CLAIM_PAD_Y = 12;
    const CLAIM_RADIUS = 18;
    const claimX = centerX - CLAIM_MAX_W / 2;
    const claimY = headlineY + 34;
    const claimTextWidth = CLAIM_MAX_W - CLAIM_PAD_X * 2;
    const maxClaimHeight = Math.max(72, timestampY - 72 - claimY);
    const claimLayout = fitClaimBoxLayout(ctx, claimText, claimTextWidth, maxClaimHeight);
    const claimHeight = claimLayout.height;

    ctx.beginPath();
    ctx.moveTo(claimX + CLAIM_RADIUS, claimY);
    ctx.arcTo(claimX + CLAIM_MAX_W, claimY, claimX + CLAIM_MAX_W, claimY + claimHeight, CLAIM_RADIUS);
    ctx.arcTo(claimX + CLAIM_MAX_W, claimY + claimHeight, claimX, claimY + claimHeight, CLAIM_RADIUS);
    ctx.arcTo(claimX, claimY + claimHeight, claimX, claimY, CLAIM_RADIUS);
    ctx.arcTo(claimX, claimY, claimX + CLAIM_MAX_W, claimY, CLAIM_RADIUS);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#121212";
    ctx.textAlign = "center";
    ctx.font = `500 ${claimLayout.fontSize}px serif`;
    const textStartY = claimY + CLAIM_PAD_Y + claimLayout.fontSize;
    for (let i = 0; i < claimLayout.lines.length; i += 1) {
      ctx.fillText(claimLayout.lines[i] ?? "", centerX, textStartY + i * claimLayout.lineHeight);
    }
  }

  ctx.fillStyle = "#0b0b0c";
  ctx.font = "500 42px serif";
  ctx.fillText(tsDisplay, centerX, timestampY);

  ctx.fillStyle = "#444444";
  ctx.font = "500 22px serif";
  ctx.fillText(`Kairos - ${kaiKlok}`, centerX, timestampY + 44);

  ctx.fillText(`Code ${code} - Pulse ${pulse}`, centerX, timestampY + 78);

  const g16Line = `G16 ${groth16ProofDigest.slice(0, 16).toUpperCase()}`;
  const poseidonLine = `POSEIDON ${zkPoseidonHash.slice(0, 16)}`;

  ctx.font = "500 16px serif";
  ctx.fillStyle = "#505050";
  ctx.fillText(g16Line, centerX, timestampY + 110);
  ctx.fillText(poseidonLine, centerX, timestampY + 140);

  ctx.font = "500 18px serif";
  ctx.fillStyle = "#666666";
  ctx.fillText(printablePath, centerX, timestampY + 186);

  const embeddedQrUrl = anchorId
    ? offlineReceizEmbeddedQrUrl(`https://${printablePath}`, presentationQr)
    : null;
  if (embeddedQrUrl) {
    const qrDataUrl = await QRCode.toDataURL(embeddedQrUrl, {
      errorCorrectionLevel: "M",
      margin: PROOF_QR_GENERATION_MARGIN,
      width: 92,
      color: { dark: "#131313", light: "#FFFFFF" },
    });

    const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("qr_image_load_failed"));
      img.src = qrDataUrl;
    });

    const QR_SIZE = 92;
    const PAD = 9;
    const BOX = QR_SIZE + PAD * 2; // 110
    const boxX = canvas.width - 52 - BOX;
    const boxY = canvas.height - 64 - BOX;

    const boxGradient = ctx.createLinearGradient(boxX, boxY, boxX, boxY + BOX);
    boxGradient.addColorStop(0, "rgba(255,255,255,0.94)");
    boxGradient.addColorStop(1, "rgba(252,252,252,0.92)");
    drawRoundedRect(ctx, boxX, boxY, BOX, BOX, 12);
    ctx.fillStyle = boxGradient;
    ctx.fill();
    drawRoundedRect(ctx, boxX, boxY, BOX, BOX, 12);
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const innerX = boxX + PAD;
    const innerY = boxY + PAD;
    drawRoundedRect(ctx, innerX, innerY, QR_SIZE, QR_SIZE, 8);
    ctx.fillStyle = "rgba(255,255,255,0.98)";
    ctx.fill();
    drawRoundedRect(ctx, innerX, innerY, QR_SIZE, QR_SIZE, 8);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.drawImage(qrImage, innerX, innerY, QR_SIZE, QR_SIZE);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("png_encode_failed"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function mintOfflineReceiz(): Promise<{
  ts: string;
  code: string;
  pulse: string;
  ms: string;
  blob: Blob;
  verifyPath: string;
}> {
  await realizeReceizDeviceIdentityRegister("active");
  const identity = peekActiveReceizDeviceIdentityFromRegister();
  const ownerReceizId = peekActiveIdentityCustodyContext()?.ownerReceizId
    || identity?.keyFile.keyId;
  if (!ownerReceizId) throw new Error("receiz_identity_required");
  const createdAt = Date.now();
  const ts = nowTsLocal();
  const ms = String(createdAt);
  const kaiUpulse = nextLiveProofKaiUpulse();
  const pulse = (BigInt(kaiUpulse) / 1_000_000n).toString();
  const code = (await hmacHex(`receiz|${ts}|${pulse}|v2`, OFFLINE_SIGNING_KEY)).slice(0, 8).toUpperCase();

  const record: OfflineMintRecord = {
    ownerReceizId,
    ts,
    code,
    pulse,
    ms,
    createdAt,
    tzMinutesEast: nowMinutesEast(),
  };
  const artifact = await renderOfflineArtifact(record);

  const store = readStore();
  store.receipts[keyFor(ts, code, pulse)] = record;
  writeStore(store);

  return { ts, code, pulse, ms, blob: artifact.blob, verifyPath: artifact.proofBearingVerifyPath };
}

export async function sealOfflineReceiz(params: {
  ts: string;
  code: string;
  pulse: string;
  ms: string;
  contextPreset?: ContextPreset;
  claim?: unknown;
  file?: unknown;
}): Promise<{ anchorId: string; anchoredUrl: string }> {
  const { ts, code, pulse, ms, contextPreset, claim, file } = params;
  const normalizedClaim = normalizeClaim(claim);
  const normalizedFile = normalizeFile(file);
  if (!normalizedClaim && !normalizedFile) throw new Error("missing_attachment");

  const anchorId = (await sha256Hex(
    `${code}:${pulse}:${normalizedClaim?.sha256Hex ?? ""}:${normalizedFile?.sha256Hex ?? ""}`
  )).slice(0, 8);
  const anchoredUrl = buildAnchoredVerifyPath(ts, code, pulse, anchorId, ms);

  const store = readStore();
  const k = keyFor(ts, code, pulse);
  const existing = store.receipts[k] ?? {
    ts,
    code,
    pulse,
    ms,
    createdAt: Number.isFinite(Number(ms)) ? Math.trunc(Number(ms)) : Date.now(),
    tzMinutesEast: nowMinutesEast(),
  };
  store.receipts[k] = {
    ...existing,
    anchorId,
    anchoredUrl,
    anchoredAt: new Date().toISOString(),
    ...(contextPreset ? { contextPreset } : {}),
    ...(normalizedClaim ? { claim: normalizedClaim } : {}),
    ...(normalizedFile ? { file: normalizedFile } : {}),
  };
  writeStore(store);

  return { anchorId, anchoredUrl };
}

export async function refreshOfflineReceizWithAnchor(params: {
  ts: string;
  code: string;
  pulse: string;
  anchorId: string;
  presentationQr?: OfflineReceizPresentationQrMode;
}): Promise<{ blob: Blob; verifyPath: string; proofBundle: ReceizProofBundle }> {
  const store = readStore();
  const k = keyFor(params.ts, params.code, params.pulse);
  const existing = store.receipts[k];
  const normalizedAnchorId = asHex8(params.anchorId) ?? params.anchorId.trim().toLowerCase().slice(0, 8);

  const next: OfflineMintRecord = {
    ...(existing ?? {
      ts: params.ts,
      code: params.code,
      pulse: params.pulse,
      ms: String(Date.now()),
      createdAt: Date.now(),
      tzMinutesEast: nowMinutesEast(),
    }),
    anchorId: normalizedAnchorId,
  };

  next.anchoredUrl = buildAnchoredVerifyPath(next.ts, next.code, next.pulse, normalizedAnchorId, next.ms);
  next.anchoredAt = next.anchoredAt ?? new Date().toISOString();

  store.receipts[k] = next;
  writeStore(store);

  const artifact = await renderOfflineArtifact(next, params.presentationQr);
  return { blob: artifact.blob, verifyPath: artifact.proofBearingVerifyPath, proofBundle: artifact.proofBundle };
}

export function verifyOfflineReceiz(ts: string, code: string, pulse: string): boolean {
  const store = readStore();
  return Boolean(store.receipts[keyFor(ts, code, pulse)]);
}
