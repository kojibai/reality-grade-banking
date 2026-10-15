// app/lib/wallet/kairosNoteArtifact.ts

import { sha256 } from "@noble/hashes/sha2.js";
import QRCode from "qrcode";
import { insertPngTextChunks } from "@/app/utils/pngChunks";
import {
  formatPhiFromMicroClient as formatPhiFromMicro,
  formatUsdFromCentsClient as formatUsdFromCents,
} from "@/app/lib/wallet/amountFormatting.client";
import { buildKaiSigilWatermarkDataUri, deriveKaiSigilSnapshotFromPulse } from "@/app/lib/wallet/kaiSigilWatermark";
import { buildCanonicalWalletNoteStatusLink as buildWalletNoteStatusLink } from "@/app/lib/wallet/noteClaimStatusLink.client";
import { momentFromPulse } from "@/app/utils/kai_pulse";
import type { ReceizOfflineNoteReceivingSealV2 } from "../../../packages/receiz-sdk/src/offlineNoteReceivingSeal";
import type { ReceizOfflineNoteReceivingCustodyCommitmentV1 } from "../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import type { ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2 } from "../../../packages/receiz-sdk/src/offlineNoteAttestedCustody";

export type KairosNoteReceivingCustodyCommitment =
  | ReceizOfflineNoteReceivingCustodyCommitmentV1
  | ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2;

type Point = { x: number; y: number };
type PixelAnchor = "start" | "middle" | "end";

const NOTE_EXPORT_WIDTH = 2400;
const NOTE_EXPORT_HEIGHT = 1440;
const CLAIM_QR_CHAMBER_PAD = 14;
const CLAIM_QR_LABEL_BOTTOM_OFFSET = 18;
const PHI_RATIO = 1.618033988749895;
const PHI_INV = 1 / PHI_RATIO;
const PHI_INV2 = PHI_INV * PHI_INV;

const PIXEL_GLYPH_ROWS = 7;
const PIXEL_GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01111", "10000", "10000", "10000", "01111"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01111"],
  f: ["00110", "01001", "01000", "11100", "01000", "01000", "01000"],
  g: ["00000", "00000", "01111", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "11110", "10000", "10000"],
  q: ["00000", "00000", "01111", "10001", "01111", "00001", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01001", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10001", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["000", "000", "000", "000", "000", "000", "000"],
  ".": ["0", "0", "0", "0", "0", "1", "1"],
  ",": ["00", "00", "00", "00", "00", "01", "10"],
  ":": ["0", "1", "1", "0", "1", "1", "0"],
  ";": ["00", "01", "01", "00", "01", "10", "00"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "\\": ["10000", "01000", "00100", "00010", "00001", "00000", "00000"],
  "+": ["000", "010", "010", "111", "010", "010", "000"],
  "=": ["000", "111", "000", "111", "000", "000", "000"],
  "'": ["1", "1", "0", "0", "0", "0", "0"],
  '"': ["101", "101", "000", "000", "000", "000", "000"],
  "!": ["1", "1", "1", "1", "1", "0", "1"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "(": ["001", "010", "100", "100", "100", "010", "001"],
  ")": ["100", "010", "001", "001", "001", "010", "100"],
  "[": ["111", "100", "100", "100", "100", "100", "111"],
  "]": ["111", "001", "001", "001", "001", "001", "111"],
  "#": ["01010", "11111", "01010", "01010", "11111", "01010", "00000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00100", "01000", "10110", "00110", "00000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "*": ["000", "101", "010", "111", "010", "101", "000"],
  "@": ["01110", "10001", "10111", "10101", "10111", "10000", "01110"],
  "|": ["1", "1", "1", "1", "1", "1", "1"],
  "<": ["001", "010", "100", "010", "001", "000", "000"],
  ">": ["100", "010", "001", "010", "100", "000", "000"],
  Φ: ["01110", "10001", "10001", "11111", "00100", "00100", "00100"],
  φ: ["01110", "10001", "10001", "11111", "00100", "00100", "00100"],
  "☤": ["01110", "10101", "00100", "11111", "00100", "10101", "01110"],
};
function buildLayeredPixelText(args: {
  text: string;
  x: number;
  y: number;
  pixel: number;
  fill: string;
  anchor?: PixelAnchor;
  opacity?: number;
  letterGap?: number;
  lineGap?: number;
  baseline?: boolean;
  filter?: string;
  shadowFill?: string;
  shadowOpacity?: number;
  shadowDx?: number;
  shadowDy?: number;
  highlightFill?: string;
  highlightOpacity?: number;
  highlightDx?: number;
  highlightDy?: number;
}): string {
  const shadowDx = args.shadowDx ?? 0;
  const shadowDy = args.shadowDy ?? 0;
  const highlightDx = args.highlightDx ?? 0;
  const highlightDy = args.highlightDy ?? 0;

  return `
    <g aria-label="Layered pixel text">
      ${
        args.shadowFill
          ? buildPixelText({
              text: args.text,
              x: args.x + shadowDx,
              y: args.y + shadowDy,
              pixel: args.pixel,
              fill: args.shadowFill,
              anchor: args.anchor,
              opacity: args.shadowOpacity,
              letterGap: args.letterGap,
              lineGap: args.lineGap,
              baseline: args.baseline,
            })
          : ""
      }
      ${
        args.highlightFill
          ? buildPixelText({
              text: args.text,
              x: args.x + highlightDx,
              y: args.y + highlightDy,
              pixel: args.pixel,
              fill: args.highlightFill,
              anchor: args.anchor,
              opacity: args.highlightOpacity,
              letterGap: args.letterGap,
              lineGap: args.lineGap,
              baseline: args.baseline,
            })
          : ""
      }
      ${buildPixelText({
        text: args.text,
        x: args.x,
        y: args.y,
        pixel: args.pixel,
        fill: args.fill,
        anchor: args.anchor,
        opacity: args.opacity,
        letterGap: args.letterGap,
        lineGap: args.lineGap,
        baseline: args.baseline,
        filter: args.filter,
      })}
    </g>
  `
    .replace(/\n\s+/g, "")
    .trim();
}

export type KairosWalletMinterSigil = {
  pulse: number;
  beat: number;
  stepIndex: number;
  chakraDay: string;
  createdAt: string;
  kaiSignature?: string;
  pbiReceiptHash?: string;
};

export type KairosWalletNoteVerification = {
  ts: string;
  code: string;
  pulse: string;
  verifyPath: string;
  verifyUrl: string;
  signerKeyId: string;
};

export type KairosWalletNoteClaimStatus = {
  proof: string;
  path: string;
  url: string;
};

export type KairosWalletNotePacket = {
  kind: "kairos_note_packet_v2";
  noteId: string;
  proofArtifactId?: string;
  noteToken: string;
  amountPhiMicro: string;
  amountUsdCents: string;
  usdPerPhiMicrocents: string;
  amountPhi: string;
  amountUsd: string;
  mintedAt: string;
  mintedKaiUpulse: string;
  memo?: string;
  source: "receiz_wallet_settlement_account";
  noteState: "available_to_claim" | "held_bound";
  custodyMode?: "identity-bound" | "qualified-anonymous";
  wholeValuePhiMicro?: string;
  currentHolderReceizId?: string;
  holderIdentityArtifactSha256?: string;
  holderDestinationDigest?: string;
  holderReceivingSealDigest?: string;
  holderInstallationCommitment?: string;
  holderIdentityKeyId?: string;
  currentCustody?: KairosNoteReceivingCustodyCommitment;
  irreversibleConsumptionReceipt?: null;
  predecessorArtifactSha256?: string | null;
  acceptedAtKai?: string;
  transitionNonce?: string;
  provenance: "wallet_settlement_account";
  claimMode?: "bearer" | "recipient_locked";
  lineage: {
    noteId: string;
    mintedByUserId?: string;
    mintedByUsername?: string;
    mintClientNonce?: string;
    claimRecipientUserId?: string;
    minterSigil?: KairosWalletMinterSigil;
  };
  claimStatus?: KairosWalletNoteClaimStatus;
  verification?: KairosWalletNoteVerification;
};

export type KairosWalletNoteArtifact = {
  filename: string;
  mime: string;
  base64: string;
  verification: KairosWalletNoteVerification;
};

export type BuildKairosWalletNoteArgs = {
  noteId: string;
  noteToken: string;
  amountPhiMicro: bigint;
  amountUsdCents: bigint;
  usdPerPhiMicrocents: bigint;
  mintedAt: string;
  mintedKaiUpulse: string;
  memo?: string | null;
  mintedByUserId?: string | null;
  mintedByUsername?: string | null;
  claimRecipientUserId?: string | null;
  mintClientNonce?: string | null;
  minterSigil?: {
    pulse: number;
    beat: number;
    stepIndex: number;
    chakraDay: string;
    createdAt: string;
    kaiSignature?: string | null;
    pbiReceiptHash?: string | null;
  } | null;
  receivingSeal?: ReceizOfflineNoteReceivingSealV2 | null;
  receivingCustody?: KairosNoteReceivingCustodyCommitment | null;
  acceptedAtKai?: string | null;
  transitionNonce?: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toCdata(value: string): string {
  return value.replace(/]]>/g, "]]]]><![CDATA[>");
}

function safeMemo(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  const compact = value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return compact.slice(0, 280);
}

function safeLabel(value: string | null | undefined, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const compact = value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return compact ? compact.slice(0, 160) : fallback;
}

function toDisplaySafeAscii(value: string, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const replaced = value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .normalize("NFKD");

  const ascii = replaced
    .replace(/[^\x20-\x7E\u2624\u03A6\u03C6]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return ascii || fallback;
}

function glyphPatternForChar(char: string): string[] {
  return PIXEL_GLYPHS[char] ?? PIXEL_GLYPHS[char.toUpperCase()] ?? PIXEL_GLYPHS["?"];
}

function pixelLineWidth(text: string, pixel: number, letterGap = 1): number {
  if (!text.length) return 0;
  let width = 0;
  for (let i = 0; i < text.length; i += 1) {
    const pattern = glyphPatternForChar(text[i] ?? " ");
    const cols = pattern[0]?.length ?? 0;
    width += cols * pixel;
    if (i < text.length - 1) width += letterGap * pixel;
  }
  return width;
}

function pixelPathForText(args: {
  text: string;
  x: number;
  y: number;
  pixel: number;
  anchor?: PixelAnchor;
  letterGap?: number;
  lineGap?: number;
  baseline?: boolean;
  preserveCase?: boolean;
}): string {
  const normalized = toDisplaySafeAscii(args.text, "");
  const displayText = args.preserveCase ? normalized : normalized.toUpperCase();
  const lines = displayText.split("\n");
  const pixel = Math.max(0.6, args.pixel);
  const letterGap = args.letterGap ?? 1;
  const lineGap = args.lineGap ?? 2;
  const baseline = args.baseline ?? true;
  const commands: string[] = [];

  lines.forEach((line, lineIndex) => {
    const lineWidth = pixelLineWidth(line, pixel, letterGap);
    const anchor = args.anchor ?? "start";
    const startX =
      anchor === "middle" ? args.x - lineWidth / 2 : anchor === "end" ? args.x - lineWidth : args.x;
    const topY =
      (baseline ? args.y - PIXEL_GLYPH_ROWS * pixel : args.y) +
      lineIndex * (PIXEL_GLYPH_ROWS * pixel + lineGap * pixel);

    let cursorX = startX;
    for (const ch of line) {
      const pattern = glyphPatternForChar(ch);
      const rows = pattern.length;
      const cols = pattern[0]?.length ?? 0;

      for (let row = 0; row < rows; row += 1) {
        const glyphLine = pattern[row] ?? "";
        for (let col = 0; col < cols; col += 1) {
          if (glyphLine[col] !== "1") continue;
          const px = (cursorX + col * pixel).toFixed(2);
          const py = (topY + row * pixel).toFixed(2);
          const w = pixel.toFixed(2);
          commands.push(`M${px} ${py}h${w}v${w}h-${w}z`);
        }
      }

      cursorX += cols * pixel + letterGap * pixel;
    }
  });

  return commands.join(" ");
}

function buildPixelText(args: {
  text: string;
  x: number;
  y: number;
  pixel: number;
  fill: string;
  anchor?: PixelAnchor;
  opacity?: number;
  letterGap?: number;
  lineGap?: number;
  baseline?: boolean;
  preserveCase?: boolean;
  transform?: string;
  filter?: string;
}): string {
  const d = pixelPathForText({
    text: args.text,
    x: args.x,
    y: args.y,
    pixel: args.pixel,
    anchor: args.anchor,
    letterGap: args.letterGap,
    lineGap: args.lineGap,
    baseline: args.baseline,
    preserveCase: args.preserveCase,
  });
  if (!d) return "";

  const opacity = typeof args.opacity === "number" ? ` fill-opacity="${args.opacity.toFixed(3)}"` : "";
  const transform = args.transform ? ` transform="${escapeXml(args.transform)}"` : "";
  const filter = args.filter ? ` filter="${escapeXml(args.filter)}"` : "";

  return `<path d="${d}" fill="${escapeXml(args.fill)}"${opacity}${transform}${filter}/>`;
}

function splitTokenToPixelChunks(token: string, maxWidth: number, pixel: number, letterGap = 1): string[] {
  if (!token) return [];
  if (pixelLineWidth(token, pixel, letterGap) <= maxWidth) return [token];

  const chunks: string[] = [];
  let current = "";
  for (const ch of token) {
    const candidate = `${current}${ch}`;
    if (!current || pixelLineWidth(candidate, pixel, letterGap) <= maxWidth) {
      current = candidate;
      continue;
    }
    chunks.push(current);
    current = ch;
  }
  if (current) chunks.push(current);
  return chunks;
}

function wrapPixelTextToWidth(text: string, maxWidth: number, pixel: number, letterGap = 1): string[] {
  const normalized = toDisplaySafeAscii(text, "").toUpperCase();
  if (!normalized) return [];

  const words = normalized.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      if (pixelLineWidth(word, pixel, letterGap) <= maxWidth) {
        current = word;
        continue;
      }
      const chunks = splitTokenToPixelChunks(word, maxWidth, pixel, letterGap);
      if (!chunks.length) continue;
      lines.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1] ?? "";
      continue;
    }

    const candidate = `${current} ${word}`;
    if (pixelLineWidth(candidate, pixel, letterGap) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    if (pixelLineWidth(word, pixel, letterGap) <= maxWidth) {
      current = word;
      continue;
    }
    const chunks = splitTokenToPixelChunks(word, maxWidth, pixel, letterGap);
    if (!chunks.length) {
      current = "";
      continue;
    }
    lines.push(...chunks.slice(0, -1));
    current = chunks[chunks.length - 1] ?? "";
  }

  if (current) lines.push(current);
  return lines;
}

function fitPixelOneLine(text: string, maxWidth: number, startPixel: number, minPixel: number, letterGap = 1): number {
  const normalized = toDisplaySafeAscii(text, "").toUpperCase();
  if (!normalized) return startPixel;

  const widthAtUnit = pixelLineWidth(normalized, 1, letterGap);
  if (widthAtUnit <= 0) return startPixel;

  const fitPixel = maxWidth / widthAtUnit;
  const hardFloor = Math.max(0.08, Math.min(startPixel, minPixel) * 0.2);
  return Math.max(hardFloor, Math.min(startPixel, fitPixel));
}

function fitPixelLines(
  text: string,
  maxWidth: number,
  startPixel: number,
  minPixel: number,
  maxLines: number,
  letterGap = 1,
): { pixel: number; lines: string[] } {
  let pixel = Math.max(minPixel, startPixel);
  let lines = wrapPixelTextToWidth(text, maxWidth, pixel, letterGap);
  let guard = 0;
  const hardFloor = Math.max(0.08, Math.min(startPixel, minPixel) * 0.2);

  while (pixel > hardFloor && lines.length > maxLines && guard < 640) {
    pixel = Math.max(hardFloor, pixel - 0.05);
    lines = wrapPixelTextToWidth(text, maxWidth, pixel, letterGap);
    guard += 1;
  }

  return {
    pixel,
    lines,
  };
}

function splitIdForDisplay(value: string): string {
  const normalized = toDisplaySafeAscii(value, "").toUpperCase();
  if (!normalized) return "";
  return normalized;
}

function formatNoteCodeForDisplay(value: string): string {
  return toDisplaySafeAscii(value, "");
}

function hashHex(value: string): string {
  return Array.from(sha256(new TextEncoder().encode(value)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hashByte(hex: string, index: number): number {
  const start = (index * 2) % Math.max(2, hex.length);
  const slice = hex.slice(start, start + 2).padEnd(2, "0");
  const parsed = Number.parseInt(slice, 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

function polar(cx: number, cy: number, radius: number, angleRadians: number): Point {
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians),
  };
}

function compactUsdForSeal(amountUsd: string): string {
  const ascii = toDisplaySafeAscii(amountUsd, "0.00");
  const withoutTrailingZeroes = ascii.endsWith(".00") ? ascii.slice(0, -3) : ascii;
  return withoutTrailingZeroes || "0";
}

function deriveAmountBadgeParts(amountUsdCents: string): { whole: string; fraction: string } {
  try {
    const cents = BigInt(String(amountUsdCents ?? "").trim() || "0");
    const absolute = cents < 0n ? -cents : cents;
    return {
      whole: `${cents < 0n ? "-" : ""}${(absolute / 100n).toString()}`,
      fraction: (absolute % 100n).toString().padStart(2, "0"),
    };
  } catch {
    return { whole: "0", fraction: "00" };
  }
}

function numberUnderThousandToWords(value: number): string {
  const underTwenty = [
    "ZERO",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ] as const;

  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ] as const;

  if (value < 20) return underTwenty[value] ?? "ZERO";

  if (value < 100) {
    const ten = Math.floor(value / 10);
    const rest = value % 10;
    return rest === 0 ? tens[ten] ?? "ZERO" : `${tens[ten] ?? "ZERO"}-${underTwenty[rest] ?? "ZERO"}`;
  }

  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return rest === 0
    ? `${underTwenty[hundred] ?? "ZERO"} HUNDRED`
    : `${underTwenty[hundred] ?? "ZERO"} HUNDRED ${numberUnderThousandToWords(rest)}`;
}

function bigintToWords(value: bigint): string {
  if (value === 0n) return "ZERO";

  const scales = [
    "",
    "THOUSAND",
    "MILLION",
    "BILLION",
    "TRILLION",
    "QUADRILLION",
    "QUINTILLION",
  ] as const;

  let working = value;
  let scaleIndex = 0;
  const parts: string[] = [];

  while (working > 0n) {
    const chunk = Number(working % 1000n);
    if (chunk > 0) {
      const chunkWords = numberUnderThousandToWords(chunk);
      const scale = scales[scaleIndex] ?? "";
      parts.unshift(scale ? `${chunkWords} ${scale}` : chunkWords);
    }
    working /= 1000n;
    scaleIndex += 1;
  }

  return parts.join(" ").trim();
}

function formatUsdCentsWords(amountUsdCents: string): string {
  try {
    const cents = BigInt(amountUsdCents);
    const dollars = cents / 100n;
    const centsPart = Number(cents % 100n);
    const dollarsWords = bigintToWords(dollars);
    const dollarUnit = dollars === 1n ? "DOLLAR" : "DOLLARS";
    return `${dollarsWords} ${dollarUnit} AND ${centsPart.toString().padStart(2, "0")}/100`;
  } catch {
    return "VALUE RECORDED IN NUMERIC FORM";
  }
}

function normalizeMinterSigil(
  value: BuildKairosWalletNoteArgs["minterSigil"],
): KairosWalletMinterSigil | null {
  if (!value || typeof value !== "object") return null;

  const pulse = Number.isFinite(value.pulse) ? Math.max(0, Math.trunc(value.pulse)) : 0;
  const beat = Number.isFinite(value.beat) ? Math.max(0, Math.trunc(value.beat)) : 0;
  const stepIndex = Number.isFinite(value.stepIndex) ? Math.max(0, Math.trunc(value.stepIndex)) : 0;
  const chakraDay = safeLabel(value.chakraDay, "N/A");
  const createdAt = safeLabel(value.createdAt, "");
  const kaiSignature = safeLabel(value.kaiSignature ?? "", "");
  const pbiReceiptHashRaw = safeLabel(value.pbiReceiptHash ?? "", "");
  const pbiReceiptHash = /^[0-9a-f]{64}$/i.test(pbiReceiptHashRaw) ? pbiReceiptHashRaw.toLowerCase() : "";

  if (!createdAt && pulse <= 0 && beat <= 0 && stepIndex <= 0) return null;

  return {
    pulse,
    beat,
    stepIndex,
    chakraDay,
    createdAt,
    ...(kaiSignature ? { kaiSignature } : {}),
    ...(pbiReceiptHash ? { pbiReceiptHash } : {}),
  };
}

function formatMintedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().replace("T", " ").replace("Z", " UTC");
}

function buildPacketBase(args: BuildKairosWalletNoteArgs): KairosWalletNotePacket {
  if (!/^\d+$/u.test(args.mintedKaiUpulse)) throw new TypeError("KAIROS_NOTE_KKS_COORDINATE_REQUIRED");
  const memo = safeMemo(args.memo);
  const mintedByUserId = typeof args.mintedByUserId === "string" ? args.mintedByUserId.trim() : "";
  const mintedByUsername = safeLabel(args.mintedByUsername, "");
  const claimRecipientUserIdRaw = typeof args.claimRecipientUserId === "string" ? args.claimRecipientUserId.trim() : "";
  const claimRecipientUserId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claimRecipientUserIdRaw)
      ? claimRecipientUserIdRaw.toLowerCase()
      : "";
  const mintClientNonce = typeof args.mintClientNonce === "string" ? args.mintClientNonce.trim() : "";
  const minterSigil = normalizeMinterSigil(args.minterSigil);
  const claimStatus = buildWalletNoteStatusLink(args.noteId, args.noteToken);
  const receivingSeal = args.receivingSeal ?? null;
  const receivingCustody = args.receivingCustody ?? null;
  const acceptedAtKai = typeof args.acceptedAtKai === "string" ? args.acceptedAtKai.trim() : "";
  const transitionNonce = typeof args.transitionNonce === "string" ? args.transitionNonce.trim() : "";
  if (receivingSeal && receivingCustody) throw new TypeError("KAIROS_NOTE_CUSTODY_MODE_CONFLICT");
  const heldBound = Boolean((receivingSeal || receivingCustody)
    && /^(0|[1-9][0-9]*)$/.test(acceptedAtKai)
    && transitionNonce);
  if (!heldBound) throw new TypeError("KAIROS_NOTE_QUALIFIED_OR_IDENTITY_CUSTODY_REQUIRED");

  const packet: KairosWalletNotePacket = {
    kind: "kairos_note_packet_v2",
    noteId: args.noteId,
    noteToken: args.noteToken,
    amountPhiMicro: args.amountPhiMicro.toString(),
    amountUsdCents: args.amountUsdCents.toString(),
    usdPerPhiMicrocents: args.usdPerPhiMicrocents.toString(),
    amountPhi: formatPhiFromMicro(args.amountPhiMicro),
    amountUsd: formatUsdFromCents(args.amountUsdCents),
    mintedAt: args.mintedAt,
    mintedKaiUpulse: BigInt(args.mintedKaiUpulse).toString(),
    source: "receiz_wallet_settlement_account",
    noteState: heldBound ? "held_bound" : "available_to_claim",
    provenance: "wallet_settlement_account",
    claimMode: claimRecipientUserId ? "recipient_locked" : "bearer",
    lineage: {
      noteId: args.noteId,
      ...(mintedByUserId ? { mintedByUserId } : {}),
      ...(mintedByUsername ? { mintedByUsername } : {}),
      ...(claimRecipientUserId ? { claimRecipientUserId } : {}),
      ...(mintClientNonce ? { mintClientNonce } : {}),
      ...(minterSigil ? { minterSigil } : {}),
    },
    claimStatus,
    ...(heldBound && receivingSeal
      ? {
          custodyMode: "identity-bound" as const,
          wholeValuePhiMicro: args.amountPhiMicro.toString(),
          currentHolderReceizId: receivingSeal.destination.recipientReceizId,
          holderIdentityArtifactSha256: receivingSeal.destination.recipientIdentityArtifactSha256,
          holderDestinationDigest: receivingSeal.destination.destinationDigest,
          holderReceivingSealDigest: receivingSeal.receivingSealDigest,
          holderInstallationCommitment: receivingSeal.installationCommitment,
          holderIdentityKeyId: receivingSeal.destination.recipientIdentityKeyId,
          predecessorArtifactSha256: null,
          acceptedAtKai,
          transitionNonce,
        }
      : heldBound && receivingCustody
        ? {
            custodyMode: "qualified-anonymous" as const,
            wholeValuePhiMicro: args.amountPhiMicro.toString(),
            currentHolderReceizId: `c_${receivingCustody.receivingCustodyCommitmentDigest.slice(0, 22)}.receiz.id`,
            currentCustody: receivingCustody,
            irreversibleConsumptionReceipt: null,
            holderInstallationCommitment: receivingCustody.installationCommitment,
            predecessorArtifactSha256: null,
            acceptedAtKai,
            transitionNonce,
          }
        : {}),
  };

  if (memo) packet.memo = memo;
  return packet;
}

function buildGuillochePath(
  seedHex: string,
  cx: number,
  cy: number,
  radius: number,
  petals: number,
  wobble: number,
  phase = 0,
): string {
  const points = 360;
  let path = "";

  for (let i = 0; i <= points; i += 1) {
    const t = (i / points) * Math.PI * 2;
    const ring =
      radius +
      Math.sin(t * petals + phase) * wobble +
      Math.sin(t * ((petals % 7) + 3) + phase * 0.61) * wobble * 0.34 +
      Math.sin(t * (2 + (hashByte(seedHex, petals) % 5)) + phase * 1.13) * wobble * 0.14;

    const twist = phase * 0.08 + (hashByte(seedHex, petals + 12) / 255) * 0.6;
    const x = cx + ring * Math.cos(t + twist);
    const y = cy + ring * Math.sin(t - twist * 0.72);

    path += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }

  return `${path}Z`;
}

function buildWaveBand(seedHex: string, x: number, y: number, width: number, amplitude: number, cycles: number): string {
  const steps = 120;
  let path = "";

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = x + width * t;
    const py =
      y +
      Math.sin(t * Math.PI * cycles + hashByte(seedHex, 31) * 0.03) * amplitude +
      Math.sin(t * Math.PI * (cycles * 1.7) + hashByte(seedHex, 47) * 0.02) * amplitude * 0.35;

    path += `${i === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)} `;
  }

  return path.trim();
}

function buildQrModulesPath(args: {
  matrix: boolean[];
  count: number;
  x: number;
  y: number;
  moduleSize: number;
  quietModules: number;
}): string {
  const commands: string[] = [];
  const unit = args.moduleSize.toFixed(3);
  for (let row = 0; row < args.count; row += 1) {
    for (let col = 0; col < args.count; col += 1) {
      if (!args.matrix[row * args.count + col]) continue;
      const px = args.x + (col + args.quietModules) * args.moduleSize;
      const py = args.y + (row + args.quietModules) * args.moduleSize;
      commands.push(`M${px.toFixed(3)} ${py.toFixed(3)}h${unit}v${unit}h-${unit}z`);
    }
  }
  return commands.join(" ");
}

function buildClaimStatusQrBlock(args: {
  qrUrl: string;
  x: number;
  y: number;
  size: number;
  serialCode: string;
}): string {
  const qr = QRCode.create(args.qrUrl, { errorCorrectionLevel: "Q" });
  const matrix = Array.from(qr.modules.data, (value) => value === 1);
  const moduleCount = qr.modules.size;
  const quietModules = 4;
  const moduleSize = args.size / (moduleCount + quietModules * 2);
  const modulePath = buildQrModulesPath({
    matrix,
    count: moduleCount,
    x: args.x,
    y: args.y,
    moduleSize,
    quietModules,
  });

  const chamberPad = CLAIM_QR_CHAMBER_PAD;
  const chamberX = args.x - chamberPad;
  const chamberY = args.y - chamberPad;
  const chamberSize = args.size + chamberPad * 2;
  const anchorHash = hashHex(args.qrUrl).slice(0, 10).toUpperCase();
  const labelBottom = `ID ${anchorHash.slice(0, 6)} ${args.serialCode.slice(-4)}`;

  return `
  <g aria-label="Scan to monitor live claim status">
    <rect x="${chamberX.toFixed(2)}" y="${chamberY.toFixed(2)}" width="${chamberSize.toFixed(2)}" height="${chamberSize.toFixed(2)}" rx="14" fill="#edf6ff" fill-opacity="0.78" stroke="#4f748e" stroke-opacity="0.60" stroke-width="1.0"/>
    <rect x="${(args.x - 4).toFixed(2)}" y="${(args.y - 4).toFixed(2)}" width="${(args.size + 8).toFixed(2)}" height="${(args.size + 8).toFixed(2)}" rx="8" fill="#ffffff" fill-opacity="0.98" stroke="#0f3354" stroke-opacity="0.22" stroke-width="0.8"/>
    <path d="${modulePath}" fill="#05182b" shape-rendering="crispEdges"/>
    <rect x="${(args.x - 4).toFixed(2)}" y="${(args.y - 4).toFixed(2)}" width="${(args.size + 8).toFixed(2)}" height="${(args.size + 8).toFixed(2)}" rx="8" fill="none" stroke="#0f2f4a" stroke-opacity="0.46" stroke-width="1.0"/>
    <line x1="${(chamberX + 8).toFixed(2)}" y1="${(chamberY + chamberSize + 6).toFixed(2)}" x2="${(chamberX + chamberSize - 8).toFixed(2)}" y2="${(chamberY + chamberSize + 6).toFixed(2)}" stroke="#5a7e95" stroke-opacity="0.38"/>
    ${buildPixelText({
      text: "SCAN FOR CLAIM STATUS",
      x: chamberX + chamberSize / 2,
      y: chamberY - 4,
      anchor: "middle",
      pixel: 8.8 / PIXEL_GLYPH_ROWS,
      fill: "#163853",
      letterGap: 0.78,
    })}
    ${buildPixelText({
      text: labelBottom,
      x: chamberX + chamberSize / 2,
      y: chamberY + chamberSize + CLAIM_QR_LABEL_BOTTOM_OFFSET,
      anchor: "middle",
      pixel: 7.8 / PIXEL_GLYPH_ROWS,
      fill: "#3f6683",
      letterGap: 0.72,
    })}
  </g>
  `.trim();
}

function buildReceizMonogramPath(cx: number, cy: number, scale: number): string {
  const stemLeft = cx - 0.34 * scale;
  const stemTop = cy - 0.62 * scale;
  const stemBottom = cy + 0.62 * scale;
  const stemInner = cx - 0.08 * scale;

  return `
    M ${stemLeft.toFixed(2)} ${stemTop.toFixed(2)}
    L ${stemLeft.toFixed(2)} ${stemBottom.toFixed(2)}
    L ${stemInner.toFixed(2)} ${stemBottom.toFixed(2)}
    L ${stemInner.toFixed(2)} ${(cy + 0.14 * scale).toFixed(2)}
    C ${(cx + 0.18 * scale).toFixed(2)} ${(cy + 0.14 * scale).toFixed(2)} ${(cx + 0.34 * scale).toFixed(2)} ${(cy - 0.05 * scale).toFixed(2)} ${(cx + 0.34 * scale).toFixed(2)} ${(cy - 0.28 * scale).toFixed(2)}
    C ${(cx + 0.34 * scale).toFixed(2)} ${(cy - 0.53 * scale).toFixed(2)} ${(cx + 0.18 * scale).toFixed(2)} ${stemTop.toFixed(2)} ${(cx - 0.06 * scale).toFixed(2)} ${stemTop.toFixed(2)}
    Z
    M ${stemInner.toFixed(2)} ${(cy - 0.38 * scale).toFixed(2)}
    C ${(cx + 0.08 * scale).toFixed(2)} ${(cy - 0.38 * scale).toFixed(2)} ${(cx + 0.14 * scale).toFixed(2)} ${(cy - 0.32 * scale).toFixed(2)} ${(cx + 0.14 * scale).toFixed(2)} ${(cy - 0.23 * scale).toFixed(2)}
    C ${(cx + 0.14 * scale).toFixed(2)} ${(cy - 0.10 * scale).toFixed(2)} ${(cx + 0.04 * scale).toFixed(2)} ${(cy - 0.04 * scale).toFixed(2)} ${stemInner.toFixed(2)} ${(cy - 0.04 * scale).toFixed(2)}
    Z
    M ${(cx - 0.02 * scale).toFixed(2)} ${(cy + 0.02 * scale).toFixed(2)}
    L ${(cx + 0.34 * scale).toFixed(2)} ${stemBottom.toFixed(2)}
    L ${(cx + 0.11 * scale).toFixed(2)} ${stemBottom.toFixed(2)}
    L ${(cx - 0.16 * scale).toFixed(2)} ${(cy + 0.16 * scale).toFixed(2)}
    Z
  `
    .replace(/\s+/g, " ")
    .trim();
}

function buildCornerRosette(seed: string, cx: number, cy: number, radius: number, label: string): string {
  const seedHex = hashHex(seed);
  const outer = buildGuillochePath(seedHex, cx, cy, radius, 10 + (hashByte(seedHex, 0) % 4), 5.6, 0.5);
  const middle = buildGuillochePath(seedHex, cx, cy, radius * 0.78, 8 + (hashByte(seedHex, 2) % 4), 3.8, 1.2);
  const inner = buildGuillochePath(seedHex, cx, cy, radius * 0.56, 6 + (hashByte(seedHex, 4) % 3), 2.2, 2.0);
  const labelAscii = toDisplaySafeAscii(label, "0");
  const labelPixel = fitPixelOneLine(labelAscii, radius * 0.62, (radius * 0.32) / PIXEL_GLYPH_ROWS, 0.3, 0.8);

  return `
  <g aria-label="Corner denomination lock">
    <path d="${outer}" fill="#f3ecd9" fill-opacity="0.95" stroke="#2e5168" stroke-opacity="0.80" stroke-width="1.25"/>
    <path d="${middle}" fill="none" stroke="#86b6cc" stroke-opacity="0.56" stroke-width="1.18"/>
    <path d="${inner}" fill="none" stroke="#173852" stroke-opacity="0.54" stroke-width="1.04"/>
    <circle cx="${cx}" cy="${cy}" r="${(radius * 0.31).toFixed(2)}" fill="none" stroke="#28506a" stroke-opacity="0.36" stroke-dasharray="2.8 2.2"/>
    <circle cx="${cx}" cy="${cy}" r="${(radius * 0.24).toFixed(2)}" fill="#f8fcff" fill-opacity="0.82" stroke="#5f8297" stroke-opacity="0.38" stroke-width="0.65"/>
    <circle cx="${cx}" cy="${cy}" r="${(radius * 0.12).toFixed(2)}" fill="#17324c" fill-opacity="0.12"/>
    ${buildPixelText({
      text: labelAscii,
      x: cx,
      y: cy + radius * 0.06,
      anchor: "middle",
      pixel: labelPixel,
      fill: "#102e46",
      letterGap: 0.8,
    })}
  </g>
  `.trim();
}

function buildTreasuryRosette(seed: string, cx: number, cy: number, radius: number, label: string): string {
  const seedHex = hashHex(seed);
  const layers = [
    buildGuillochePath(seedHex, cx, cy, radius, 16 + (hashByte(seedHex, 0) % 4), 15 + (hashByte(seedHex, 1) % 5), 0.2),
    buildGuillochePath(seedHex, cx, cy, radius * 0.88, 13 + (hashByte(seedHex, 2) % 5), 11 + (hashByte(seedHex, 3) % 4), 1.1),
    buildGuillochePath(seedHex, cx, cy, radius * 0.71, 10 + (hashByte(seedHex, 4) % 4), 8 + (hashByte(seedHex, 5) % 4), 1.8),
    buildGuillochePath(seedHex, cx, cy, radius * 0.53, 7 + (hashByte(seedHex, 6) % 4), 5 + (hashByte(seedHex, 7) % 3), 2.7),
  ];

  const labelAscii = toDisplaySafeAscii(label, "");
  const labelPixel = fitPixelOneLine(labelAscii, radius * 0.62, (radius * 0.2) / PIXEL_GLYPH_ROWS, 0.22, 0.8);
  const ringText = labelAscii ? `REGISTERED SEAL ${labelAscii} ` : "REGISTERED SEAL ";
  const ringPixel = fitPixelOneLine(ringText, radius * 1.24, (radius * 0.07) / PIXEL_GLYPH_ROWS, 0.22, 0.6);
  const serialArcA = buildWaveBand(seedHex, cx - radius * 0.62, cy - radius * 0.07, radius * 1.24, radius * 0.06, 3.8);
  const serialArcB = buildWaveBand(seedHex, cx - radius * 0.62, cy + radius * 0.11, radius * 1.24, radius * 0.05, 3.6);

  return `
  <g aria-label="Treasury denomination medallion">
    <path d="${layers[0]}" fill="#f7f2e1" fill-opacity="0.58" stroke="#36556f" stroke-opacity="0.50" stroke-width="1.2"/>
    <path d="${layers[1]}" fill="none" stroke="#a4d9ee" stroke-opacity="0.48" stroke-width="2.1"/>
    <path d="${layers[2]}" fill="none" stroke="#294766" stroke-opacity="0.36" stroke-width="1.2"/>
    <path d="${layers[3]}" fill="#0f2742" fill-opacity="0.08" stroke="#6f92a8" stroke-opacity="0.46" stroke-width="0.9"/>
    <circle cx="${cx}" cy="${cy}" r="${(radius * 0.29).toFixed(2)}" fill="#f7fcff" fill-opacity="0.76" stroke="#7899ad" stroke-opacity="0.46" stroke-width="0.9"/>
    <path d="${serialArcA}" fill="none" stroke="#b7e8f7" stroke-opacity="0.50" stroke-width="1.2"/>
    <path d="${serialArcB}" fill="none" stroke="#315372" stroke-opacity="0.34" stroke-width="1.0"/>
    ${
      labelAscii
        ? buildPixelText({
            text: labelAscii,
            x: cx,
            y: cy + radius * 0.08,
            anchor: "middle",
            pixel: labelPixel,
            fill: "#17324c",
            letterGap: 0.8,
          })
        : ""
    }
    ${buildPixelText({
      text: ringText,
      x: cx,
      y: cy + radius * 0.88,
      anchor: "middle",
      pixel: ringPixel,
      fill: "#335574",
      opacity: 0.58,
      letterGap: 0.6,
    })}
  </g>
  `.trim();
}

function buildKaiSigilBadge(args: {
  cx: number;
  cy: number;
  size: number;
  dataUri: string;
  label?: string;
  showLabel?: boolean;
  showFrame?: boolean;
  opacity?: number;
}): string {
  const labelText = toDisplaySafeAscii(safeLabel(args.label ?? "", ""), "");
  const showLabel = args.showLabel !== false && labelText.length > 0;
  const showFrame = args.showFrame !== false;
  const half = args.size / 2;
  const x = args.cx - half;
  const y = args.cy - half;
  const labelPixel = showLabel
    ? fitPixelOneLine(labelText, args.size * 0.92, 9.4 / PIXEL_GLYPH_ROWS, 4.8 / PIXEL_GLYPH_ROWS, 0.8)
    : 0;
  const imageOpacity = args.opacity ?? (showFrame ? 0.94 : 0.88);

  return `
  <g aria-label="${escapeXml(showLabel ? labelText : "Seal glyph badge")}">
    ${
      showFrame
        ? `<circle cx="${args.cx}" cy="${args.cy}" r="${(half + 9).toFixed(2)}" fill="#0f2a3a" fill-opacity="0.90" stroke="#83a8bd" stroke-opacity="0.54" stroke-width="1.0"/>
    <circle cx="${args.cx}" cy="${args.cy}" r="${(half + 3).toFixed(2)}" fill="#15374d" fill-opacity="0.34" stroke="#c8deea" stroke-opacity="0.28" stroke-width="0.8"/>`
        : ""
    }
    <image href="${args.dataUri}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${args.size.toFixed(2)}" height="${args.size.toFixed(2)}" opacity="${imageOpacity.toFixed(3)}" preserveAspectRatio="xMidYMid meet"/>
    ${
      showLabel
        ? buildPixelText({
            text: labelText,
            x: args.cx,
            y: args.cy + half + 16,
            anchor: "middle",
            pixel: labelPixel,
            fill: "#e4f4fb",
            opacity: 0.78,
            letterGap: 0.8,
          })
        : ""
    }
  </g>
  `.trim();
}

function buildAuthoritySeal(
  seed: string,
  cx: number,
  cy: number,
  coreLabel: string,
  topLabel: string,
  bottomLabel: string,
  scale = 1,
): string {
  const seedHex = hashHex(seed);
  const outer = buildGuillochePath(seedHex, cx, cy, 68 * scale, 15 + (hashByte(seedHex, 0) % 4), 8 * scale, 0.3);
  const middle = buildGuillochePath(seedHex, cx, cy, 54 * scale, 11 + (hashByte(seedHex, 1) % 4), 5 * scale, 1.2);
  const inner = buildGuillochePath(seedHex, cx, cy, 33 * scale, 8 + (hashByte(seedHex, 2) % 4), 3 * scale, 2.2);

  const rays: string[] = [];
  const rayCount = 18 + (hashByte(seedHex, 3) % 7);
  for (let i = 0; i < rayCount; i += 1) {
    const angle = (Math.PI * 2 * i) / rayCount + (hashByte(seedHex, 4) / 255) * 0.4;
    const a = polar(cx, cy, 14 * scale, angle);
    const b = polar(cx, cy, 43 * scale, angle);
    rays.push(
      `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="#c8ead4" stroke-opacity="0.34" stroke-width="${(0.9 * scale).toFixed(2)}"/>`,
    );
  }

  const topText = toDisplaySafeAscii(topLabel, "");
  const bottomText = toDisplaySafeAscii(bottomLabel, "");
  const coreText = toDisplaySafeAscii(coreLabel, "");
  const topPixel = fitPixelOneLine(topText, 116 * scale, (9.2 * scale) / PIXEL_GLYPH_ROWS, 0.18, 0.8);
  const bottomPixel = fitPixelOneLine(bottomText, 120 * scale, (8.8 * scale) / PIXEL_GLYPH_ROWS, 0.18, 0.8);
  const corePixel = fitPixelOneLine(coreText, 34 * scale, (22 * scale) / PIXEL_GLYPH_ROWS, 0.24, 0.7);

  return `
  <g aria-label="Issuing authority seal">
    <path d="${outer}" fill="#12311f" fill-opacity="0.96" stroke="#9fd18a" stroke-opacity="0.60" stroke-width="${(1.15 * scale).toFixed(2)}"/>
    <path d="${middle}" fill="none" stroke="#dff4d6" stroke-opacity="0.42" stroke-width="${(1.05 * scale).toFixed(2)}"/>
    <path d="${inner}" fill="none" stroke="#b5e6a7" stroke-opacity="0.36" stroke-width="${(0.95 * scale).toFixed(2)}"/>
    ${rays.join("\n")}
    <circle cx="${cx}" cy="${cy}" r="${(20 * scale).toFixed(2)}" fill="#effce8" fill-opacity="0.92"/>
    <circle cx="${cx}" cy="${cy}" r="${(9.5 * scale).toFixed(2)}" fill="#2c6631" fill-opacity="0.96"/>
    ${buildPixelText({
      text: topText,
      x: cx,
      y: cy - 57 * scale,
      anchor: "middle",
      pixel: topPixel,
      fill: "#e7f8df",
      letterGap: 0.8,
    })}
    ${buildPixelText({
      text: bottomText,
      x: cx,
      y: cy + 60 * scale,
      anchor: "middle",
      pixel: bottomPixel,
      fill: "#e7f8df",
      letterGap: 0.8,
    })}
    ${buildPixelText({
      text: coreText,
      x: cx,
      y: cy + 6 * scale,
      anchor: "middle",
      pixel: corePixel,
      fill: "#173d21",
      letterGap: 0.7,
    })}
  </g>
  `.trim();
}

function buildSerialNumberBlock(
  x: number,
  y: number,
  text: string,
  align: "start" | "end",
): string {
  const anchor = align === "end" ? "end" : "start";
  return `
  <g aria-label="Serial number">
    ${buildPixelText({
      text,
      x,
      y,
      anchor,
      pixel: 18.2 / PIXEL_GLYPH_ROWS,
      fill: "#8b2731",
      letterGap: 0.9,
    })}
    ${buildPixelText({
      text: "REGISTERED SEAL",
      x,
      y: y + 18,
      anchor,
      pixel: 8.9 / PIXEL_GLYPH_ROWS,
      fill: "#cbb7b0",
      opacity: 0.32,
      letterGap: 0.8,
    })}
  </g>
  `.trim();
}

function buildSovereignPortraitField(
  seed: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  faceLabel: string,
  lowerLabel: string,
): string {
  const seedHex = hashHex(seed);
  const clipId = `sovereignPortraitClip-${hashHex(seed).slice(0, 12)}`;
  const monogramPath = buildReceizMonogramPath(cx, cy + 1, 76);

  const outerA = buildGuillochePath(seedHex, cx, cy, rx * 0.94, 14 + (hashByte(seedHex, 0) % 4), 10, 0.4);
  const outerB = buildGuillochePath(seedHex, cx, cy, rx * 0.79, 10 + (hashByte(seedHex, 1) % 4), 6.5, 1.3);
  const outerC = buildGuillochePath(seedHex, cx, cy, rx * 0.63, 8 + (hashByte(seedHex, 2) % 3), 4.2, 2.1);

  const intaglioLines: string[] = [];
  const latentBars: string[] = [];
  const totalLines = 30;

  for (let i = 0; i < totalLines; i += 1) {
    const lineY = cy - ry + 10 + i * ((ry * 2 - 20) / (totalLines - 1));
    const amp = 2.6 + (hashByte(seedHex, i + 10) % 5) * 0.32;
    const cycles = 3.2 + (hashByte(seedHex, i + 40) % 4) * 0.32;
    const band = buildWaveBand(seedHex, cx - rx + 12, lineY, rx * 2 - 24, amp, cycles);
    const opacity = (0.06 + (i % 6) * 0.01).toFixed(3);
    intaglioLines.push(
      `<path d="${band}" fill="none" stroke="#274760" stroke-opacity="${opacity}" stroke-width="1.0"/>`,
    );
  }

  const barCount = 10;
  for (let i = 0; i < barCount; i += 1) {
    const barX = cx - rx + 20 + i * ((rx * 2 - 40) / (barCount - 1));
    const barWidth = 8 + (hashByte(seedHex, 70 + i) % 5);
    latentBars.push(
      `<rect x="${barX.toFixed(2)}" y="${(cy - ry + 16).toFixed(2)}" width="${barWidth}" height="${(ry * 2 - 32).toFixed(2)}" fill="#f9fdff" fill-opacity="0.040"/>`,
    );
  }

  return `
  <g aria-label="Sovereign portrait watermark field">
    <defs>
      <clipPath id="${clipId}">
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
      </clipPath>
    </defs>

    <ellipse cx="${cx}" cy="${cy}" rx="${(rx + 8).toFixed(2)}" ry="${(ry + 8).toFixed(2)}" fill="#88bfd6" fill-opacity="0.04"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#f9fdff" fill-opacity="0.14" stroke="#6f95a9" stroke-opacity="0.28" stroke-width="0.9"/>
    <path d="${outerA}" fill="none" stroke="#3b637e" stroke-opacity="0.16" stroke-width="0.95"/>
    <path d="${outerB}" fill="none" stroke="#b6e5f8" stroke-opacity="0.11" stroke-width="1.55"/>
    <path d="${outerC}" fill="none" stroke="#1e3a54" stroke-opacity="0.13" stroke-width="0.9"/>

    <g clip-path="url(#${clipId})">
      <rect x="${(cx - rx).toFixed(2)}" y="${(cy - ry).toFixed(2)}" width="${(rx * 2).toFixed(2)}" height="${(ry * 2).toFixed(2)}" fill="#f8fcff" fill-opacity="0.06"/>
      ${latentBars.join("\n")}
      ${intaglioLines.join("\n")}

      <path d="${monogramPath}" fill="#ffffff" fill-opacity="0.10" transform="translate(-1.2 -1.4)"/>
      <path d="${monogramPath}" fill="#17334d" fill-opacity="0.12" transform="translate(1.0 0.9)"/>
      <path d="${monogramPath}" fill="#234766" fill-opacity="0.16" fill-rule="evenodd"/>
      <path d="${monogramPath}" fill="none" stroke="#f7fdff" stroke-opacity="0.22" stroke-width="0.9"/>

      <path d="M ${(cx - 58).toFixed(2)} ${(cy - 108).toFixed(2)} L ${cx.toFixed(2)} ${(cy - 132).toFixed(2)} L ${(cx + 58).toFixed(2)} ${(cy - 108).toFixed(2)}" fill="none" stroke="#7ca4bc" stroke-opacity="0.14" stroke-width="2.6"/>
      <path d="M ${(cx - 72).toFixed(2)} ${(cy + 102).toFixed(2)} C ${(cx - 28).toFixed(2)} ${(cy + 120).toFixed(2)} ${(cx + 28).toFixed(2)} ${(cy + 120).toFixed(2)} ${(cx + 72).toFixed(2)} ${(cy + 102).toFixed(2)}" fill="none" stroke="#7ca4bc" stroke-opacity="0.12" stroke-width="2"/>
    </g>

    ${buildPixelText({
      text: faceLabel,
      x: cx,
      y: cy - ry + 18,
      anchor: "middle",
      pixel: 9.8 / PIXEL_GLYPH_ROWS,
      fill: "#2b4d6e",
      opacity: 0.18,
      letterGap: 0.8,
    })}
    ${buildPixelText({
      text: lowerLabel,
      x: cx,
      y: cy + ry - 12,
      anchor: "middle",
      pixel: 9.4 / PIXEL_GLYPH_ROWS,
      fill: "#2b4d6e",
      opacity: 0.18,
      letterGap: 0.8,
    })}
  </g>
  `.trim();
}

export function buildKairosWalletNoteSvg(packet: KairosWalletNotePacket): string {
  const memo = packet.memo || "Redeemable note sealed against verified account balance.";
  const memoDisplay = toDisplaySafeAscii(
    memo,
    "Redeemable note sealed against verified account value.",
  );
  const memoFit = fitPixelLines(memoDisplay, 464, 12.1 / PIXEL_GLYPH_ROWS, 6.2 / PIXEL_GLYPH_ROWS, 2, 0.8);
  const memoPixel = memoFit.pixel;
  const memoLineA = memoFit.lines[0] || "NOTE";
  const memoLineB = memoFit.lines[1] || "";

  const usdDisplay = toDisplaySafeAscii(packet.amountUsd, "0.00");
  const usdCentsDisplay = toDisplaySafeAscii(packet.amountUsdCents, "0");
  const usdCompact = compactUsdForSeal(usdDisplay);
  const amountBadgeParts = deriveAmountBadgeParts(packet.amountUsdCents);
  const claimStatusUrl = packet.claimStatus?.url || buildWalletNoteStatusLink(packet.noteId, packet.noteToken).url;
  const sealedAtDisplay = toDisplaySafeAscii(formatMintedAt(packet.mintedAt), packet.mintedAt);
  const noteIdDisplay = toDisplaySafeAscii(packet.noteId, packet.noteId);
  const claimCodeDisplay = formatNoteCodeForDisplay(packet.noteToken);
  const rateDisplay = toDisplaySafeAscii(packet.usdPerPhiMicrocents, "0");

  const amountWords = formatUsdCentsWords(packet.amountUsdCents);
  const amountWordsFit = fitPixelLines(amountWords, 468, 11.6 / PIXEL_GLYPH_ROWS, 6.0 / PIXEL_GLYPH_ROWS, 2, 0.85);
  const amountWordsPixel = amountWordsFit.pixel;
  const amountWordLineA = amountWordsFit.lines[0] || "VALUE RECORDED";
  const amountWordLineB = amountWordsFit.lines[1] || "";

  const serialSeed = `${packet.noteId}|${packet.noteToken}|${packet.mintedAt}`;
  const serialHex = hashHex(serialSeed).toUpperCase();
  const packetDigest = hashHex(JSON.stringify(packet)).toUpperCase();
  const valuationDigest = hashHex(
    `${packet.amountUsdCents}|${packet.amountPhiMicro}|${packet.usdPerPhiMicrocents}|${packet.noteId}`,
  ).toUpperCase();

  const serialCode = `${serialHex.slice(0, 6)}-${serialHex.slice(6, 12)}-${serialHex.slice(12, 18)}`;
  const issueCode = `${serialHex.slice(18, 22)}${serialHex.slice(40, 44)}`;
  const districtCode = `${serialHex.slice(22, 24)}`;
  const classCode = `${serialHex.slice(24, 25)}${serialHex.slice(25, 26)}-${serialHex.slice(26, 28)}`;
  const oracleCode = `${valuationDigest.slice(0, 4)}-${valuationDigest.slice(4, 8)}-${valuationDigest.slice(8, 12)}`;
  const registryDigestShort = `${packetDigest.slice(0, 8)}-${packetDigest.slice(8, 16)}-${packetDigest.slice(16, 24)}`;
  const valuationDigestShort = `${valuationDigest.slice(0, 8)}-${valuationDigest.slice(8, 16)}`;
  const seriesCode = (() => {
    const date = new Date(packet.mintedAt);
    if (Number.isNaN(date.getTime())) return `K-${issueCode}`;
    const year = String(date.getUTCFullYear()).slice(-2);
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `K-${year}${month}-${issueCode}`;
  })();

  const minterSigil = packet.lineage.minterSigil ?? null;
  const mintedByUsername = safeLabel(packet.lineage.mintedByUsername ?? "", "");
  const sealedMoment = (() => {
    try {
      return momentFromPulse(BigInt(packet.mintedKaiUpulse) / 1_000_000n);
    } catch {
      return null;
    }
  })();
  const sealedPulse = toDisplaySafeAscii(String(sealedMoment?.pulse ?? "N/A"), "N/A");
  const sealerCreationPulse = typeof minterSigil?.pulse === "number" && Number.isFinite(minterSigil.pulse)
    ? Math.max(0, Math.trunc(minterSigil.pulse))
    : null;
  const sealerPulse = typeof sealerCreationPulse === "number" && Number.isFinite(sealerCreationPulse)
    ? toDisplaySafeAscii(String(Math.trunc(sealerCreationPulse)), "N/A")
    : "N/A";
  const sealerUsername = (() => {
    const raw = safeLabel(mintedByUsername || packet.lineage.mintedByUserId || "", "");
    if (!raw) return "@UNKNOWN";
    const withAt = raw.startsWith("@") ? raw : `@${raw}`;
    return toDisplaySafeAscii(withAt, "@UNKNOWN");
  })();
  const sealedPulseNumber = Number.parseInt(sealedPulse, 10);
  const sealedSigilSnapshot = deriveKaiSigilSnapshotFromPulse({
    pulse: Number.isFinite(sealedPulseNumber) ? sealedPulseNumber : 0,
    beat: sealedMoment?.beat ?? null,
    stepIndex: sealedMoment?.stepIndex ?? null,
    chakraDay: sealedMoment?.chakraDay ?? minterSigil?.chakraDay ?? "Root",
    kaiSignature: packet.noteId,
  });
  const accountSigilSnapshot = deriveKaiSigilSnapshotFromPulse({
    pulse: sealerCreationPulse ?? minterSigil?.pulse ?? 0,
    beat: minterSigil?.beat ?? null,
    stepIndex: minterSigil?.stepIndex ?? null,
    chakraDay: minterSigil?.chakraDay ?? "Root",
    kaiSignature: minterSigil?.kaiSignature ?? (mintedByUsername || packet.lineage.mintedByUserId || packet.noteId),
  });
  const sealedSigilDataUri = buildKaiSigilWatermarkDataUri({
    snapshot: sealedSigilSnapshot,
    label: "SEAL MOMENT",
    palette: "money_dark",
    showFooter: false,
    transparentBackground: true,
  });
  const accountSigilDataUri = buildKaiSigilWatermarkDataUri({
    snapshot: accountSigilSnapshot,
    label: "ACCOUNT CREATION",
    palette: "money_dark",
    showFooter: false,
    transparentBackground: true,
  });

  const leftFieldX = 102;
  const leftFieldY = 188;
  const leftFieldWidth = 530;
  const leftFieldHeight = 350;
  const leftWordBoxX = 108;
  const leftWordBoxY = 392;
  const leftWordBoxWidth = 494;
  const leftWordBoxHeight = 60;
  const leftFieldPhiCenterX = leftFieldX + leftFieldWidth * ((PHI_INV + PHI_INV2) / 2);
  const leftFieldPhiCenterY = leftFieldY + leftFieldHeight * PHI_INV - 24;

  const rightPanelX = 646;
  const rightPanelY = 258;
  const rightPanelWidth = 462;
  const rightPanelHeight = 298;
  const rightPanelInnerX = rightPanelX + 34;
  const rightPanelPhiSplitX = rightPanelX + rightPanelWidth * PHI_INV;
  const rightPanelPhiMinorX = rightPanelX + rightPanelWidth * PHI_INV2;

  const attestationBandX = 646;
  const attestationBandY = 556;
  const attestationBandWidth = 462;
  const attestationBandHeight = 68;
  const attestationSplitX = attestationBandX + attestationBandWidth * PHI_INV;
  const authoritySealX = attestationSplitX - 22;
  const authoritySealY = attestationBandY + attestationBandHeight / 2;
  const attestationTextX = attestationSplitX + 18;

  const sigilLaneY = rightPanelY + rightPanelHeight - 12;
  const sigilLaneX = rightPanelPhiSplitX + 10;
  const sigilLaneWidth = 126;
  const sealMomentBadge = buildKaiSigilBadge({
    cx: sigilLaneX + sigilLaneWidth * PHI_INV2,
    cy: sigilLaneY,
    size: 24,
    dataUri: sealedSigilDataUri,
    label: "SEAL",
    showLabel: false,
    showFrame: false,
    opacity: 0.40,
  });
  const accountMomentBadge = buildKaiSigilBadge({
    cx: sigilLaneX + sigilLaneWidth * PHI_INV,
    cy: sigilLaneY,
    size: 22,
    dataUri: accountSigilDataUri,
    label: "OWNER",
    showLabel: false,
    showFrame: false,
    opacity: 0.36,
  });

  const cornerA = buildCornerRosette(`${serialSeed}|corner-a`, 86, 86, 44, usdCompact);
  const cornerB = buildCornerRosette(`${serialSeed}|corner-b`, 1114, 86, 44, usdCompact);
  const cornerC = buildCornerRosette(`${serialSeed}|corner-c`, 86, 634, 44, usdCompact);
  const cornerD = buildCornerRosette(`${serialSeed}|corner-d`, 1114, 634, 44, usdCompact);

  const centerRosette = buildTreasuryRosette(
    `${serialSeed}|medallion`,
    leftFieldPhiCenterX,
    leftFieldPhiCenterY,
    154,
    usdCompact,
  );
  const portraitField = buildSovereignPortraitField(
    `${serialSeed}|portrait`,
    rightPanelPhiSplitX + 21,
    rightPanelY + rightPanelHeight * PHI_INV2 + 34,
    96,
    132,
    `REGISTERED VALUE ${usdCompact}`,
    `SERIAL ${serialCode}`,
  );

  const authoritySeal = buildAuthoritySeal(
    `${serialSeed}|authority`,
    authoritySealX,
    authoritySealY,
    usdCompact,
    `SEAL ${seriesCode}`,
    `DIST ${districtCode} CLASS ${classCode}`,
    0.42,
  );

  const leftFieldA = buildGuillochePath(serialHex, leftFieldPhiCenterX, leftFieldPhiCenterY, 270, 17, 18, 0.4);
  const leftFieldB = buildGuillochePath(serialHex, leftFieldPhiCenterX, leftFieldPhiCenterY, 228, 12, 12, 1.22);
  const leftFieldC = buildGuillochePath(serialHex, leftFieldPhiCenterX, leftFieldPhiCenterY, 190, 8, 7, 2.05);

  const stripWaveA = buildWaveBand(serialHex, 870, 128, 50, 18, 5.4);
  const stripWaveB = buildWaveBand(serialHex, 870, 574, 50, 18, 5.8);

  const rightFieldWaveA = buildWaveBand(serialHex, 670, 292, 390, 3.4, 5.6);
  const rightFieldWaveB = buildWaveBand(serialHex, 670, 350, 390, 2.8, 4.8);
  const rightFieldWaveC = buildWaveBand(serialHex, 670, 508, 390, 2.4, 5.2);
  const denomWaveA = buildWaveBand(serialHex, 122, 288, 462, 1.9, 4.2);
  const denomWaveB = buildWaveBand(serialHex, 122, 318, 462, 1.5, 4.7);
  const denomWaveC = buildWaveBand(serialHex, 122, 346, 462, 1.3, 5.1);
  const controlLockA = buildCornerRosette(`${serialSeed}|control-a`, 834, 236, 18, amountBadgeParts.whole);
  const controlLockB = buildCornerRosette(`${serialSeed}|control-b`, 834, 542, 18, amountBadgeParts.fraction);
  const registerCode = serialHex.slice(0, 6);

  const rightInfoMaxWidth = 248;
  const claimQrX = 938;
  const claimQrY = 68;
  const claimQrSize = 116;
  const claimQrChamberBottom = claimQrY - CLAIM_QR_CHAMBER_PAD + (claimQrSize + CLAIM_QR_CHAMBER_PAD * 2);
  const claimQrLabelBaseline = claimQrChamberBottom + CLAIM_QR_LABEL_BOTTOM_OFFSET;
  const authorityLaneY = claimQrLabelBaseline + Math.round(55 * PHI_INV);
  const authorityHeaderX = rightPanelPhiMinorX - 90;
  const authorityHeaderWidth = 364;
  const authorityHeaderRight = authorityHeaderX + authorityHeaderWidth - 8;
  const topSeriesLine = `SERIES ${seriesCode}`;
  const topSeriesPixel = fitPixelOneLine(topSeriesLine, 226, 12 / PIXEL_GLYPH_ROWS, 6.2 / PIXEL_GLYPH_ROWS, 0.8);
  const topDistrictLine = `DISTRICT ${districtCode} CLASS ${classCode}`;
  const topDistrictPixel = fitPixelOneLine(topDistrictLine, 226, 11.2 / PIXEL_GLYPH_ROWS, 6.0 / PIXEL_GLYPH_ROWS, 0.8);
  const authorityControlLine = `CONTROL ${serialHex.slice(28, 34)} ${serialHex.slice(34, 40)}`;
  const authorityControlPixel = fitPixelOneLine(
    authorityControlLine,
    226,
    9.8 / PIXEL_GLYPH_ROWS,
    5.4 / PIXEL_GLYPH_ROWS,
    0.8,
  );

  const noteIdForPanel = splitIdForDisplay(noteIdDisplay);
  const noteIdFit = fitPixelLines(noteIdForPanel, rightInfoMaxWidth, 12.8 / PIXEL_GLYPH_ROWS, 6.0 / PIXEL_GLYPH_ROWS, 2, 0.8);
  const noteIdPanelPixel = noteIdFit.pixel;
  const noteIdPanelLineA = noteIdFit.lines[0] || "NOTE";
  const noteIdPanelLineB = noteIdFit.lines[1] || "";

  const panelAmountText = `USD ${usdDisplay}`;
  const panelAmountPixel = fitPixelOneLine(panelAmountText, rightInfoMaxWidth, 12.6 / PIXEL_GLYPH_ROWS, 6.0 / PIXEL_GLYPH_ROWS, 0.8);
  const sealedPanel = sealedAtDisplay;
  const sealedPixel = fitPixelOneLine(sealedPanel, rightInfoMaxWidth, 11.6 / PIXEL_GLYPH_ROWS, 5.8 / PIXEL_GLYPH_ROWS, 0.8);
  const claimCodeFieldY = 462;
  const claimCodeFieldHeight = 42;
  const claimCodeMaxWidth = rightInfoMaxWidth - 20;
  const claimCodeFit = fitPixelLines(
    claimCodeDisplay,
    claimCodeMaxWidth,
    10.4 / PIXEL_GLYPH_ROWS,
    6.0 / PIXEL_GLYPH_ROWS,
    2,
    0.64,
  );
  const claimCodePanel = claimCodeFit.lines.join("\n");
  const claimCodePanelY = claimCodeFit.lines.length > 1 ? 476 : 482;
  const claimHelpPanel = "";
  const claimHelpPixel = fitPixelOneLine(claimHelpPanel, rightInfoMaxWidth, 8.8 / PIXEL_GLYPH_ROWS, 4.4 / PIXEL_GLYPH_ROWS, 0.8);

  const bandLineA = `VALUATION DIGEST ${valuationDigestShort}`;
  const bandLineAPixel = fitPixelOneLine(bandLineA, 222, 10.9 / PIXEL_GLYPH_ROWS, 5.0 / PIXEL_GLYPH_ROWS, 0.8);
  const bandLineB = `REDEMPTION RATE ${rateDisplay} ORACLE CODE ${oracleCode}`;
  const bandLineBPixel = fitPixelOneLine(bandLineB, 222, 10.8 / PIXEL_GLYPH_ROWS, 5.0 / PIXEL_GLYPH_ROWS, 0.8);
  const bandLineC = `REGISTRY DIGEST ${registryDigestShort}`;
  const bandLineCPixel = fitPixelOneLine(bandLineC, 222, 10.7 / PIXEL_GLYPH_ROWS, 5.0 / PIXEL_GLYPH_ROWS, 0.8);
  const minterSigLine = `SEALED BY ${sealerUsername}`;
  const minterSigPixel = fitPixelOneLine(minterSigLine, 160, 10.8 / PIXEL_GLYPH_ROWS, 4.6 / PIXEL_GLYPH_ROWS, 0.8);
  const minterPulseLine = `☤KAI ${sealerPulse} - ${sealedPulse}`;
  const minterPulsePixel = fitPixelOneLine(minterPulseLine, 160, 10.4 / PIXEL_GLYPH_ROWS, 4.6 / PIXEL_GLYPH_ROWS, 0.8);

  const footerBandText = `REGISTERED PRIVATE SETTLEMENT SEAL FACE ${usdDisplay} RATE ${rateDisplay} SERIAL ${serialCode}`;
  const footerBandPixel = fitPixelOneLine(footerBandText, 860, 9.8 / PIXEL_GLYPH_ROWS, 4.6 / PIXEL_GLYPH_ROWS, 0.8);
  const titleText = "SETTLEMENT NOTE";
  const titlePixel = fitPixelOneLine(titleText, 650, 46 / PIXEL_GLYPH_ROWS, 26 / PIXEL_GLYPH_ROWS, 0.8);

  const subtitleText = "REDEEMABLE INSTRUMENT OF VERIFIED ACCOUNT VALUE";
  const subtitlePixel = fitPixelOneLine(subtitleText, 650, 15 / PIXEL_GLYPH_ROWS, 10 / PIXEL_GLYPH_ROWS, 0.8);

  const watermarkPixel = fitPixelOneLine(usdCompact, 400, 110 / PIXEL_GLYPH_ROWS, 72 / PIXEL_GLYPH_ROWS, 0.8);

  const faceValueLabelText = "FACE VALUE";
  const faceValueLabelPixel = fitPixelOneLine(
    faceValueLabelText,
    210,
    18 / PIXEL_GLYPH_ROWS,
    13 / PIXEL_GLYPH_ROWS,
    0.9,
  );

  const faceAmountText = `$${usdDisplay}`;
  const faceAmountPixel = fitPixelOneLine(
    faceAmountText,
    470,
    84 / PIXEL_GLYPH_ROWS,
    52 / PIXEL_GLYPH_ROWS,
    0.8,
  );

  const noteSerialText = `NOTE ${serialCode}`;
  const noteSerialPixel = fitPixelOneLine(
    noteSerialText,
    470,
    16 / PIXEL_GLYPH_ROWS,
    11 / PIXEL_GLYPH_ROWS,
    0.8,
  );
  const noteSerialY = leftWordBoxY + leftWordBoxHeight + 14;

  const backingLabelText = "SETTLEMENT RATE";
  const backingLabelPixel = fitPixelOneLine(
    backingLabelText,
    280,
    18 / PIXEL_GLYPH_ROWS,
    13 / PIXEL_GLYPH_ROWS,
    0.9,
  );
  const settlementRateText = `RATE ${rateDisplay}`;
  const settlementRatePixel = fitPixelOneLine(
    settlementRateText,
    470,
    34 / PIXEL_GLYPH_ROWS,
    19 / PIXEL_GLYPH_ROWS,
    0.8,
  );
  const microPerimeterBase = `SEAL ${issueCode} SERIAL ${serialCode} CONTROL ${registerCode} `;
  const microPerimeterText = toDisplaySafeAscii(microPerimeterBase.repeat(4).trim(), microPerimeterBase.trim());
  const microPerimeterPixel = 6.8 / PIXEL_GLYPH_ROWS;

  const upperSerial = buildSerialNumberBlock(116, 208, serialCode, "start");
  const lowerSerial = buildSerialNumberBlock(1086, 624, serialCode, "end");
  const claimStatusQr = buildClaimStatusQrBlock({
    qrUrl: claimStatusUrl,
    x: claimQrX,
    y: claimQrY,
    size: claimQrSize,
    serialCode,
  });

  const payloadRaw = JSON.stringify(packet);
  const payloadCdata = toCdata(payloadRaw);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${NOTE_EXPORT_WIDTH}" height="${NOTE_EXPORT_HEIGHT}" viewBox="0 0 1200 720" role="img" aria-label="Kairos note" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#040b13"/>
      <stop offset="44%" stop-color="#091727"/>
      <stop offset="100%" stop-color="#040a12"/>
    </linearGradient>

    <radialGradient id="paper" cx="38%" cy="34%" r="94%">
      <stop offset="0%" stop-color="#d9cfb4"/>
      <stop offset="54%" stop-color="#b89f74"/>
      <stop offset="100%" stop-color="#836548"/>
    </radialGradient>

    <linearGradient id="inkDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10233c"/>
      <stop offset="100%" stop-color="#081525"/>
    </linearGradient>

    <linearGradient id="inkGreen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#173223"/>
      <stop offset="100%" stop-color="#10261b"/>
    </linearGradient>

    <linearGradient id="goldInk" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7f6124"/>
      <stop offset="50%" stop-color="#5c4518"/>
      <stop offset="100%" stop-color="#977531"/>
    </linearGradient>

    <linearGradient id="securityStrip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9fb8c4" stop-opacity="0.62"/>
      <stop offset="22%" stop-color="#5d7d92" stop-opacity="0.54"/>
      <stop offset="52%" stop-color="#3c5f77" stop-opacity="0.44"/>
      <stop offset="100%" stop-color="#17334a" stop-opacity="0.86"/>
    </linearGradient>

    <radialGradient id="foil" cx="50%" cy="50%" r="66%">
      <stop offset="0%" stop-color="#eef4f8" stop-opacity="0.86"/>
      <stop offset="40%" stop-color="#87a9bc" stop-opacity="0.46"/>
      <stop offset="100%" stop-color="#234663" stop-opacity="0.18"/>
    </radialGradient>

    <radialGradient id="paperShade" cx="50%" cy="40%" r="74%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.00"/>
      <stop offset="65%" stop-color="#b8a98c" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="#7f735f" stop-opacity="0.15"/>
    </radialGradient>

    <pattern id="microText" width="380" height="22" patternUnits="userSpaceOnUse">
      <path d="M0 7 H380 M0 11 H380 M0 15 H380 M0 19 H380" stroke="#5f7a85" stroke-opacity="0.10" stroke-width="0.7"/>
      <path d="M0 3 H380" stroke="#5f7a85" stroke-opacity="0.08" stroke-width="0.5"/>
    </pattern>

    <pattern id="fiberNoise" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M3 8 L16 1 M18 25 L38 11 M12 49 L28 35 M35 48 L53 34" stroke="#8ca5ae" stroke-opacity="0.12" stroke-width="1"/>
      <path d="M1 39 L10 31 M26 18 L44 5 M35 34 L54 22" stroke="#dde9ec" stroke-opacity="0.10" stroke-width="1"/>
      <path d="M9 14 L21 10 M22 45 L36 37" stroke="#b6c8ce" stroke-opacity="0.08" stroke-width="1"/>
    </pattern>

    <pattern id="paperSpeckle" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="5" cy="8" r="0.9" fill="#4c5b66" fill-opacity="0.10"/>
      <circle cx="18" cy="6" r="0.8" fill="#8a9aa5" fill-opacity="0.11"/>
      <circle cx="10" cy="18" r="0.7" fill="#5e6f7d" fill-opacity="0.08"/>
      <circle cx="24" cy="17" r="0.6" fill="#b7c3ca" fill-opacity="0.10"/>
      <circle cx="16" cy="24" r="0.65" fill="#6d7c86" fill-opacity="0.08"/>
    </pattern>

    <pattern id="tiltLines" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(34)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#102741" stroke-opacity="0.09" stroke-width="1"/>
    </pattern>

    <linearGradient id="denomShield" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f5fbff" stop-opacity="0.58"/>
      <stop offset="52%" stop-color="#dae7f1" stop-opacity="0.40"/>
      <stop offset="100%" stop-color="#f7f1df" stop-opacity="0.36"/>
    </linearGradient>

    <pattern id="intaglioMesh" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(26)">
      <line x1="0" y1="0" x2="0" y2="14" stroke="#1b3e5d" stroke-opacity="0.08" stroke-width="0.8"/>
      <line x1="7" y1="0" x2="7" y2="14" stroke="#6a8ca4" stroke-opacity="0.06" stroke-width="0.6"/>
    </pattern>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="b"/>
      <feMerge>
        <feMergeNode in="b"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="emboss" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dx="0" dy="1"/>
      <feGaussianBlur stdDeviation="0.82" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.2" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="highlight"/>
      <feComposite operator="over" in="highlight" in2="SourceGraphic"/>
    </filter>

    <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feOffset dx="0" dy="2"/>
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.02 0 0 0 0 0.09 0 0 0 0 0.2 0 0 0 0.42 0"/>
      <feComposite in="SourceGraphic"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="1200" height="720" fill="url(#bg)"/>
  <rect x="14" y="14" width="1172" height="692" rx="30" fill="#071423" stroke="#5f8297" stroke-opacity="0.42" stroke-width="1.15"/>
  <rect x="30" y="30" width="1140" height="660" rx="24" fill="url(#paper)" stroke="#f9fcff" stroke-opacity="0.34" stroke-width="1.05"/>
  <rect x="30" y="30" width="1140" height="660" rx="24" fill="url(#microText)"/>
  <rect x="30" y="30" width="1140" height="660" rx="24" fill="url(#fiberNoise)"/>
  <rect x="30" y="30" width="1140" height="660" rx="24" fill="url(#paperSpeckle)" opacity="0.42"/>
  <rect x="30" y="30" width="1140" height="660" rx="24" fill="url(#paperShade)"/>
  <rect x="48" y="48" width="1104" height="624" rx="18" fill="none" stroke="#4a6987" stroke-opacity="0.48" stroke-width="1.12"/>
  <rect x="64" y="64" width="1072" height="592" rx="14" fill="none" stroke="#d6e1e8" stroke-opacity="0.58" stroke-width="0.8"/>
  <rect x="82" y="82" width="1036" height="556" rx="10" fill="none" stroke="#284463" stroke-opacity="0.24" stroke-width="0.8"/>
  ${buildPixelText({
    text: microPerimeterText,
    x: 92,
    y: 76,
    pixel: microPerimeterPixel,
    fill: "#355774",
    opacity: 0.34,
    letterGap: 0.72,
  })}
  ${buildPixelText({
    text: microPerimeterText,
    x: 1108,
    y: 645,
    anchor: "end",
    pixel: microPerimeterPixel,
    fill: "#355774",
    opacity: 0.28,
    letterGap: 0.72,
  })}

  ${cornerA}
  ${cornerB}
  ${cornerC}
  ${cornerD}

  <rect x="856" y="96" width="78" height="528" rx="10" fill="url(#securityStrip)" stroke="#6a93ad" stroke-opacity="0.62" stroke-width="1.0"/>
  <rect x="882" y="96" width="22" height="528" fill="#f0f7fb" fill-opacity="0.19"/>
  <path d="${stripWaveA}" fill="none" stroke="#f2f7fb" stroke-opacity="0.34" stroke-width="1.02"/>
  <path d="${stripWaveB}" fill="none" stroke="#f2f7fb" stroke-opacity="0.34" stroke-width="1.02"/>
  ${controlLockA}
  ${controlLockB}
  <rect x="864" y="118" width="60" height="98" rx="8" fill="url(#foil)" stroke="#6b95af" stroke-opacity="0.58"/>
  <rect x="864" y="506" width="60" height="98" rx="8" fill="url(#foil)" stroke="#6b95af" stroke-opacity="0.58"/>
  ${buildPixelText({
    text: "REGISTERED SEAL",
    x: 895,
    y: 360,
    anchor: "middle",
    pixel: 13.8 / PIXEL_GLYPH_ROWS,
    fill: "#164168",
    opacity: 0.62,
    letterGap: 0.9,
    transform: "rotate(-90 895 360)",
  })}
  ${claimStatusQr}

  <g aria-label="Registration marks">
    <path d="M104 162 h10 M109 157 v10 M1084 162 h10 M1089 157 v10 M104 658 h10 M109 653 v10 M1084 658 h10 M1089 653 v10" stroke="#365b78" stroke-opacity="0.36" stroke-width="0.9"/>
    <circle cx="636" cy="410" r="16.4" fill="none" stroke="#355a78" stroke-opacity="0.30" stroke-width="0.9"/>
    <circle cx="636" cy="410" r="9.4" fill="none" stroke="#6f9bb5" stroke-opacity="0.36" stroke-width="0.8" stroke-dasharray="2.4 1.8"/>
    <line x1="620" y1="410" x2="652" y2="410" stroke="#264864" stroke-opacity="0.32" stroke-width="0.8"/>
    <line x1="636" y1="394" x2="636" y2="426" stroke="#264864" stroke-opacity="0.32" stroke-width="0.8"/>
    <path d="M620 410 L636 394 L636 426 Z" fill="#f6f0e2" fill-opacity="0.38" stroke="#355a78" stroke-opacity="0.24" stroke-width="0.75"/>
    <path d="M652 410 L636 394 L636 426 Z" fill="#1f4665" fill-opacity="0.14" stroke="#355a78" stroke-opacity="0.28" stroke-width="0.75"/>
    ${buildPixelText({
      text: registerCode,
      x: 636,
      y: 432,
      anchor: "middle",
      pixel: 7.1 / PIXEL_GLYPH_ROWS,
      fill: "#446783",
      opacity: 0.44,
      letterGap: 0.7,
    })}
  </g>

  ${buildLayeredPixelText({
    text: titleText,
    x: 112,
    y: 126,
    pixel: titlePixel,
    fill: "#7f6124",
    letterGap: 0.8,
    baseline: true,
    filter: "url(#emboss)",
    shadowFill: "#5b4315",
    shadowOpacity: 0.30,
    shadowDx: 1.4,
    shadowDy: 1.8,
    highlightFill: "#fff5d1",
    highlightOpacity: 0.18,
    highlightDx: 0,
    highlightDy: -1.0,
  })}
  ${buildPixelText({
    text: subtitleText,
    x: 112,
    y: 154,
    pixel: subtitlePixel,
    fill: "#284d6f",
    letterGap: 0.8,
    baseline: true,
  })}
  <rect x="${authorityHeaderX.toFixed(2)}" y="${(authorityLaneY - 32).toFixed(2)}" width="${authorityHeaderWidth.toFixed(2)}" height="66" rx="10" fill="#eff5fb" fill-opacity="0.56" stroke="#4f6d86" stroke-opacity="0.40"/>
  <line x1="${(authorityHeaderX + 12).toFixed(2)}" y1="${(authorityLaneY - 6).toFixed(2)}" x2="${(authorityHeaderRight - 4).toFixed(2)}" y2="${(authorityLaneY - 6).toFixed(2)}" stroke="#5f7e94" stroke-opacity="0.26"/>
  ${buildPixelText({
    text: topSeriesLine,
    x: authorityHeaderRight,
    y: authorityLaneY,
    anchor: "end",
    pixel: topSeriesPixel,
    fill: "#2b4d6e",
    letterGap: 0.8,
  })}
  ${buildPixelText({
    text: topDistrictLine,
    x: authorityHeaderRight,
    y: authorityLaneY + 24,
    anchor: "end",
    pixel: topDistrictPixel,
    fill: "#476a84",
    letterGap: 0.8,
  })}
  ${buildPixelText({
    text: authorityControlLine,
    x: authorityHeaderRight,
    y: authorityLaneY + 42,
    anchor: "end",
    pixel: authorityControlPixel,
    fill: "#4c6c83",
    letterGap: 0.78,
  })}
  <line x1="112" y1="170" x2="1088" y2="170" stroke="#466789" stroke-opacity="0.58" stroke-width="1.0"/>
  <line x1="112" y1="176" x2="1088" y2="176" stroke="#c1d1db" stroke-opacity="0.34" stroke-width="0.8"/>

  ${upperSerial}
  ${lowerSerial}

  <rect x="${leftFieldX}" y="${leftFieldY}" width="${leftFieldWidth}" height="${leftFieldHeight}" rx="26" fill="#ffffff" fill-opacity="0.28" stroke="#58748b" stroke-opacity="0.26" stroke-width="0.9"/>
  <rect x="${leftFieldX}" y="${leftFieldY}" width="${leftFieldWidth}" height="${leftFieldHeight}" rx="26" fill="url(#tiltLines)" opacity="0.72"/>
  <rect x="${leftFieldX}" y="${leftFieldY}" width="${leftFieldWidth}" height="${leftFieldHeight}" rx="26" fill="url(#intaglioMesh)" opacity="0.20"/>
  <rect x="${(leftFieldX + 16).toFixed(2)}" y="${(leftFieldY + 74).toFixed(2)}" width="${(leftFieldWidth - 32).toFixed(2)}" height="98" rx="13" fill="url(#denomShield)" opacity="0.56"/>
  <path d="${leftFieldA}" fill="none" stroke="#35576f" stroke-opacity="0.32" stroke-width="1.2"/>
  <path d="${leftFieldB}" fill="none" stroke="#8ab6c9" stroke-opacity="0.14" stroke-width="1.9" filter="url(#glow)"/>
  <path d="${leftFieldC}" fill="none" stroke="#183551" stroke-opacity="0.24" stroke-width="1.05"/>
  <path d="${denomWaveA}" fill="none" stroke="#1f4767" stroke-opacity="0.18" stroke-width="0.9"/>
  <path d="${denomWaveB}" fill="none" stroke="#7fb4ce" stroke-opacity="0.16" stroke-width="1.0"/>
  <path d="${denomWaveC}" fill="none" stroke="#2a5272" stroke-opacity="0.16" stroke-width="0.9"/>
  <image href="${sealedSigilDataUri}" x="196" y="206" width="324" height="324" opacity="0.12" preserveAspectRatio="xMidYMid meet"/>
  <image href="${accountSigilDataUri}" x="716" y="340" width="272" height="272" opacity="0.09" preserveAspectRatio="xMidYMid meet"/>
  ${buildPixelText({
    text: usdCompact,
    x: leftFieldPhiCenterX,
    y: 454,
    anchor: "middle",
    pixel: watermarkPixel,
    fill: "#153149",
    opacity: 0.045,
    letterGap: 0.8,
  })}
  ${centerRosette}

  ${buildPixelText({
    text: faceValueLabelText,
    x: 112,
    y: 248,
    pixel: faceValueLabelPixel,
    fill: "#2b4c6c",
    letterGap: 0.9,
  })}
  ${buildLayeredPixelText({
    text: faceAmountText,
    x: 112,
    y: 352,
    pixel: faceAmountPixel,
    fill: "#132744",
    letterGap: 0.8,
    baseline: true,
    filter: "url(#emboss)",
    shadowFill: "#0b1c2d",
    shadowOpacity: 0.26,
    shadowDx: 1.8,
    shadowDy: 2.2,
    highlightFill: "#ffffff",
    highlightOpacity: 0.15,
    highlightDx: 0,
    highlightDy: -1.2,
  })}
  ${buildPixelText({
    text: noteSerialText,
    x: 112,
    y: noteSerialY,
    pixel: noteSerialPixel,
    fill: "#2f5170",
    letterGap: 0.8,
  })}


  <rect x="${leftWordBoxX}" y="${leftWordBoxY}" width="${leftWordBoxWidth}" height="${leftWordBoxHeight}" rx="10" fill="#f2ead5" fill-opacity="0.64" stroke="#8c9cab" stroke-opacity="0.30"/>
  ${buildPixelText({
    text: amountWordLineA,
    x: 126,
    y: 417,
    pixel: amountWordsPixel,
    fill: "#244565",
    letterGap: 0.85,
  })}
  ${
    amountWordLineB
      ? buildPixelText({
          text: amountWordLineB,
          x: 126,
          y: 417 + amountWordsPixel * 8.4,
          pixel: amountWordsPixel,
          fill: "#355b78",
          letterGap: 0.85,
        })
      : ""
  }

  ${buildPixelText({
    text: backingLabelText,
    x: 112,
    y: 486,
    pixel: backingLabelPixel,
    fill: "#2b4c6c",
    letterGap: 0.9,
  })}
  ${buildLayeredPixelText({
    text: settlementRateText,
    x: 112,
    y: 542,
    pixel: settlementRatePixel,
    fill: "#173652",
    letterGap: 0.8,
    baseline: true,
    shadowFill: "#102a42",
    shadowOpacity: 0.22,
    shadowDx: 1.2,
    shadowDy: 1.6,
    highlightFill: "#ffffff",
    highlightOpacity: 0.10,
    highlightDx: 0,
    highlightDy: -0.8,
  })}
  ${buildPixelText({
    text: `FACE CENTS ${usdCentsDisplay} RATE ${rateDisplay}`,
    x: 112,
    y: 568,
    pixel: 12.4 / PIXEL_GLYPH_ROWS,
    fill: "#355b7b",
    letterGap: 0.8,
  })}

  <g aria-label="Unified authority composition">
    <rect x="${rightPanelX}" y="${rightPanelY}" width="${rightPanelWidth}" height="${rightPanelHeight}" rx="20" fill="#f9fdff" fill-opacity="0.10" stroke="#6f8fa4" stroke-opacity="0.50" stroke-width="1.0"/>
    <rect x="${(rightPanelX + 16).toFixed(2)}" y="${(rightPanelY + 16).toFixed(2)}" width="${(rightPanelWidth - 32).toFixed(2)}" height="${(rightPanelHeight - 32).toFixed(2)}" rx="12" fill="none" stroke="#89a7b8" stroke-opacity="0.52"/>
    <rect x="${(rightPanelX + 16).toFixed(2)}" y="${(rightPanelY + 16).toFixed(2)}" width="${(rightPanelWidth - 32).toFixed(2)}" height="${(rightPanelHeight - 32).toFixed(2)}" rx="12" fill="url(#tiltLines)" opacity="0.22"/>
    <rect x="${(rightPanelX + 16).toFixed(2)}" y="${(rightPanelY + 16).toFixed(2)}" width="${(rightPanelWidth - 32).toFixed(2)}" height="${(rightPanelHeight - 32).toFixed(2)}" rx="12" fill="url(#intaglioMesh)" opacity="0.12"/>
    <path d="${rightFieldWaveA}" fill="none" stroke="#2b4c68" stroke-opacity="0.10" stroke-width="0.9"/>
    <path d="${rightFieldWaveB}" fill="none" stroke="#7dbfdb" stroke-opacity="0.10" stroke-width="1.1"/>
    <path d="${rightFieldWaveC}" fill="none" stroke="#2b4c68" stroke-opacity="0.10" stroke-width="0.9"/>

    <line x1="${rightPanelInnerX}" y1="338" x2="${rightPanelInnerX + 140}" y2="338" stroke="#6d8ea6" stroke-opacity="0.28"/>
    <line x1="${rightPanelInnerX}" y1="390" x2="${rightPanelInnerX + 140}" y2="390" stroke="#6d8ea6" stroke-opacity="0.28"/>
    <line x1="${rightPanelInnerX}" y1="442" x2="${rightPanelInnerX + 140}" y2="442" stroke="#6d8ea6" stroke-opacity="0.28"/>

    ${portraitField}

    ${buildPixelText({
      text: "NOTE ID",
      x: rightPanelInnerX,
      y: 300,
      pixel: 14 / PIXEL_GLYPH_ROWS,
      fill: "#2a4d6f",
      letterGap: 0.9,
    })}
    ${buildPixelText({
      text: noteIdPanelLineA,
      x: rightPanelInnerX,
      y: 324,
      pixel: noteIdPanelPixel,
      fill: "#102a46",
      letterGap: 0.8,
    })}
    ${
      noteIdPanelLineB
        ? buildPixelText({
            text: noteIdPanelLineB,
            x: rightPanelInnerX,
            y: 324 + noteIdPanelPixel * 8.4,
            pixel: noteIdPanelPixel,
            fill: "#102a46",
            letterGap: 0.8,
          })
        : ""
    }

    ${buildPixelText({
      text: "FACE AMOUNT",
      x: rightPanelInnerX,
      y: 352,
      pixel: 14 / PIXEL_GLYPH_ROWS,
      fill: "#2a4d6f",
      letterGap: 0.9,
    })}
    ${buildPixelText({
      text: panelAmountText,
      x: rightPanelInnerX,
      y: 375,
      pixel: panelAmountPixel,
      fill: "#102a46",
      letterGap: 0.8,
    })}

    ${buildPixelText({
      text: "SEALED",
      x: rightPanelInnerX,
      y: 404,
      pixel: 14 / PIXEL_GLYPH_ROWS,
      fill: "#2a4d6f",
      letterGap: 0.9,
    })}
    ${buildPixelText({
      text: sealedPanel,
      x: rightPanelInnerX,
      y: 426,
      pixel: sealedPixel,
      fill: "#102a46",
      letterGap: 0.8,
    })}

    ${buildPixelText({
      text: "NOTE CODE",
      x: rightPanelInnerX,
      y: 454,
      pixel: 14 / PIXEL_GLYPH_ROWS,
      fill: "#2a4d6f",
      letterGap: 0.9,
    })}
    <rect x="${rightPanelInnerX}" y="${claimCodeFieldY}" width="${rightInfoMaxWidth}" height="${claimCodeFieldHeight}" rx="8" fill="#f8fcff" fill-opacity="0.82" stroke="#6d8ea6" stroke-opacity="0.42"/>
    ${buildPixelText({
      text: claimCodePanel,
      x: rightPanelInnerX + 10,
      y: claimCodePanelY,
      pixel: claimCodeFit.pixel,
      fill: "#102a46",
      letterGap: 0.64,
      lineGap: 2.2,
      preserveCase: true,
    })}
    ${buildPixelText({
      text: claimHelpPanel,
      x: rightPanelInnerX,
      y: 520,
      pixel: claimHelpPixel,
      fill: "#3f627d",
      letterGap: 0.8,
    })}
  </g>

  <g aria-label="Seal sigil pair">
    <line x1="${(sigilLaneX - 20).toFixed(2)}" y1="${(sigilLaneY + 8).toFixed(2)}" x2="${(sigilLaneX + sigilLaneWidth + 20).toFixed(2)}" y2="${(sigilLaneY + 8).toFixed(2)}" stroke="#7aa0b7" stroke-opacity="0.24" stroke-width="0.8"/>
    <path d="M ${(sigilLaneX - 10).toFixed(2)} ${(sigilLaneY + 8).toFixed(2)} h6 M ${(sigilLaneX - 7).toFixed(2)} ${(sigilLaneY + 5).toFixed(2)} v6 M ${(sigilLaneX + sigilLaneWidth + 10).toFixed(2)} ${(sigilLaneY + 8).toFixed(2)} h6 M ${(sigilLaneX + sigilLaneWidth + 13).toFixed(2)} ${(sigilLaneY + 5).toFixed(2)} v6" stroke="#6d8ea5" stroke-opacity="0.24" stroke-width="0.8"/>
    ${sealMomentBadge}
    ${accountMomentBadge}
  </g>

  <g aria-label="Integrated seal attestation band">
    <rect x="${attestationBandX}" y="${attestationBandY}" width="${attestationBandWidth}" height="${attestationBandHeight}" rx="12" fill="url(#inkGreen)" stroke="#8cc47c" stroke-opacity="0.34"/>
    <line x1="${attestationSplitX.toFixed(2)}" y1="${(attestationBandY + 10).toFixed(2)}" x2="${attestationSplitX.toFixed(2)}" y2="${(attestationBandY + attestationBandHeight - 10).toFixed(2)}" stroke="#8cc47c" stroke-opacity="0.18"/>
    ${buildPixelText({
      text: bandLineA,
      x: attestationBandX + 18,
      y: 578,
      pixel: bandLineAPixel,
      fill: "#d8f5cf",
      letterGap: 0.8,
    })}
    ${buildPixelText({
      text: bandLineB,
      x: attestationBandX + 18,
      y: 596,
      pixel: bandLineBPixel,
      fill: "#d8f5cf",
      letterGap: 0.8,
    })}
    ${buildPixelText({
      text: bandLineC,
      x: attestationBandX + 18,
      y: 614,
      pixel: bandLineCPixel,
      fill: "#d8f5cf",
      letterGap: 0.8,
    })}

    ${authoritySeal}
    ${buildPixelText({
      text: "TREASURY SEAL",
      x: attestationTextX,
      y: 576,
      pixel: 11.8 / PIXEL_GLYPH_ROWS,
      fill: "#e5f8df",
      letterGap: 0.8,
    })}
    ${buildPixelText({
      text: minterSigLine,
      x: attestationTextX,
      y: 593,
      pixel: minterSigPixel,
      fill: "#d3f1ca",
      letterGap: 0.8,
    })}
    ${buildPixelText({
      text: minterPulseLine,
      x: attestationTextX,
      y: 610,
      pixel: minterPulsePixel,
      fill: "#d3f1ca",
      letterGap: 0.8,
    })}
  </g>

  <rect x="108" y="588" width="494" height="34" rx="7" fill="#e7dcc2" fill-opacity="0.68" stroke="#8b9baa" stroke-opacity="0.24"/>
  ${buildPixelText({
    text: memoLineA,
    x: 124,
    y: 609,
    pixel: memoPixel,
    fill: "#284766",
    letterGap: 0.8,
  })}
  ${
    memoLineB
      ? buildPixelText({
          text: memoLineB,
          x: 124,
          y: 609 + memoPixel * 8.4,
          pixel: memoPixel,
          fill: "#3d5f7b",
          letterGap: 0.8,
        })
      : ""
  }

  <line x1="112" y1="652" x2="1088" y2="652" stroke="#48698b" stroke-opacity="0.58"/>
  ${buildPixelText({
    text: footerBandText,
    x: 112,
    y: 676,
    pixel: footerBandPixel,
    fill: "#244668",
    letterGap: 0.8,
  })}
  ${buildPixelText({
    text: `SEAL ${issueCode}`,
    x: 1088,
    y: 676,
    anchor: "end",
    pixel: 11 / PIXEL_GLYPH_ROWS,
    fill: "#244668",
    letterGap: 0.8,
  })}

  <metadata id="phi_note_send"><![CDATA[${payloadCdata}]]></metadata>
  <metadata id="kairos_note_packet_v2"><![CDATA[${payloadCdata}]]></metadata>
</svg>
`.trim();
}

export function embedKairosWalletNotePacketInPng(
  pngBytes: Uint8Array,
  packet: KairosWalletNotePacket,
): Uint8Array {
  const payloadRaw = JSON.stringify(packet);
  return insertPngTextChunks(pngBytes, [
    { keyword: "phi_note_send", text: payloadRaw },
    { keyword: "kairos_note_packet_v2", text: payloadRaw },
  ]);
}

export function buildKairosWalletNotePacket(args: BuildKairosWalletNoteArgs): KairosWalletNotePacket {
  return buildPacketBase(args);
}
