"use client";

import { qrDataURL } from "@/app/lib/qr";
import {
  base64UrlDecode,
  base64UrlEncode,
  canonicalSha256Hex,
  sha256Hex,
  toArrayBufferStrict,
} from "@/app/lib/vault/crypto";
import { buildMerkleTree, fibonacciBacklinkIndexes, fibonacciDistancesUpTo } from "@/app/lib/vault/graph";
import { momentFromPulse } from "@/app/utils/kai_pulse";
import { nextLiveProofKaiUpulse } from "@/app/lib/kai/liveProofKai";
import { insertPngTextChunks, readPngTextChunks, type PngTextChunk } from "@/app/utils/pngChunks";

const CARD_W = 1200;
const CARD_H = 1680;
const SPORTS_ARENA_VAULT_CARD_SCHEMA = "receiz.sports_arena.vault_card.v1";
const SPORTS_ARENA_VAULT_CARD_LEAF_SCHEMA = "receiz.sports_arena.vault_card.leaf.v1";
const SPORTS_ARENA_VAULT_CARD_MIME = "image/png";
const SPORTS_ARENA_VAULT_CARD_MANIFEST_KEY = "receiz.sports_arena.vault_card_manifest";
const SPORTS_ARENA_VAULT_CARD_ARCHIVE_SHA_KEY = "receiz.sports_arena.vault_card_archive_sha256";
const SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_COUNT_KEY = "receiz.sports_arena.vault_card_archive_count";
const SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_PREFIX = "receiz.sports_arena.vault_card_archive.";
const SPORTS_ARENA_VAULT_CARD_ARCHIVE_ENCODING = "base64url.raw-chunks";
const SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_TEXT_SIZE = 240_000;
const HEX64_RE = /^[0-9a-f]{64}$/i;

export type SportsArenaVaultCardManifestMedia = Readonly<{
  deterministicAssetId: string;
  imageUrl: string;
  sourceUrl: string;
  alt: string;
  dominantColor: string;
  source: "mlb" | "fifa" | "ufc";
  sourceId: string;
}>;

export type SportsArenaVaultCardScoreSummary = Readonly<{
  currentScore: number;
  historyCount: number;
  latestAppendLabel: string | null;
  latestAppendAt: string | null;
}>;

export type SportsArenaVaultCardManifestCard = Readonly<{
  collectibleId: string;
  claimHash: string;
  sport: "baseball" | "soccer" | "fight";
  athlete: string;
  teamCode: string;
  position: string;
  rarity: string;
  rating?: number;
  projectedScore?: number;
  baseTier?: string;
  baseCard?: {
    sealedCardId: string;
    basisHash: string;
    issueLine: string;
    athleteId: string;
    sport: "baseball" | "soccer" | "fight";
  };
  proof?: {
    source: string;
    basisHash: string;
    rule: string;
    statBasis?: string[];
  };
  media?: SportsArenaVaultCardManifestMedia | null;
  scoreSummary?: SportsArenaVaultCardScoreSummary | null;
  claimPath: string;
  ownershipPath: string | null;
  careerPath: string | null;
}>;

export type SportsArenaVaultCardManifest = Readonly<{
  schema: typeof SPORTS_ARENA_VAULT_CARD_SCHEMA;
  createdAtMs: number;
  vaultCardId: string;
  cardCount: number;
  ownerLabel: string | null;
  archive: {
    filename: string;
    mime: string;
    size: number;
    sha256Hex: string;
    encoding: typeof SPORTS_ARENA_VAULT_CARD_ARCHIVE_ENCODING;
    chunkCount: number;
    chunkTextSize: number;
  };
  integrity: {
    merkleRootSha256: string;
    archiveSha256Hex: string;
    leafCount: number;
    fibonacciDistances: number[];
    fibonacciLog: Array<{ distance: number; leafIndex: number }>;
  };
  kai: {
    pulse: number;
    beat: number;
    stepIndex: number;
    chakraDay: string;
    weekday: string;
    label: string;
    uri: string;
  };
  cards: SportsArenaVaultCardManifestCard[];
  restoreRule: string;
  offlineVerifyRule: string;
}>;

export type BuildSportsArenaVaultCardDownloadArgs = {
  archiveBytes: Uint8Array;
  archiveFilename: string;
  archiveMime: string;
  cardCount: number;
  cards: SportsArenaVaultCardManifestCard[];
  createdAtMs: number;
  ownerLabel?: string | null;
  publicVaultUrl?: string | null;
  vaultCardId?: string | null;
};

export type SportsArenaVaultCardDownload = {
  bytes: Uint8Array;
  filename: string;
  mime: typeof SPORTS_ARENA_VAULT_CARD_MIME;
  manifest: SportsArenaVaultCardManifest;
};

export type ExtractedSportsArenaVaultCardArchive = {
  bytes: Uint8Array;
  manifest: SportsArenaVaultCardManifest;
};

function safeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) return Number(value);
  return null;
}

function cleanManifestScoreSummary(value: SportsArenaVaultCardManifestCard["scoreSummary"]): SportsArenaVaultCardScoreSummary | null {
  if (!value) return null;
  const currentScore = safeNumber(value.currentScore);
  const historyCount = safeNumber(value.historyCount);
  if (currentScore === null || historyCount === null) return null;
  return {
    currentScore: Number(currentScore.toFixed(2)),
    historyCount: Math.max(0, Math.trunc(historyCount)),
    latestAppendLabel: safeText(value.latestAppendLabel) || null,
    latestAppendAt: safeText(value.latestAppendAt) || null,
  };
}

function cleanManifestMedia(value: SportsArenaVaultCardManifestCard["media"]): SportsArenaVaultCardManifestMedia | null {
  const imageUrl = safeText(value?.imageUrl);
  if (!value || !imageUrl) return null;
  const source = value.source === "fifa" || value.source === "ufc" ? value.source : "mlb";
  return {
    deterministicAssetId: safeText(value.deterministicAssetId, `${source}:${safeText(value.sourceId, "player")}`),
    imageUrl,
    sourceUrl: safeText(value.sourceUrl, imageUrl),
    alt: safeText(value.alt, "Sports card image"),
    dominantColor: safeText(value.dominantColor, "#123C69"),
    source,
    sourceId: safeText(value.sourceId, "player"),
  };
}

function cleanVaultCardId(value: unknown): string | null {
  return typeof value === "string" && HEX64_RE.test(value.trim()) ? value.trim().toLowerCase() : null;
}

function shortHash(value: string, head = 10, tail = 8): string {
  const clean = String(value || "");
  if (clean.length <= head + tail + 2) return clean;
  return `${clean.slice(0, head)}...${clean.slice(-tail)}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    weight: number | string;
    size: number;
    family?: string;
    minSize?: number;
    color?: string;
    align?: CanvasTextAlign;
  },
): void {
  const family = options.family ?? "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  const minSize = options.minSize ?? Math.max(12, Math.floor(options.size * 0.66));
  let size = options.size;
  ctx.textAlign = options.align ?? "left";
  if (options.color) ctx.fillStyle = options.color;
  while (size > minSize) {
    ctx.font = `${options.weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  ctx.font = `${options.weight} ${size}px ${family}`;
  ctx.fillText(text, x, y, maxWidth);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("sports_vault_card_image_load_failed"));
    image.src = src;
  });
}

function splitArchiveText(bytes: Uint8Array): string[] {
  const encoded = base64UrlEncode(bytes);
  const chunks: string[] = [];
  for (let index = 0; index < encoded.length; index += SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_TEXT_SIZE) {
    chunks.push(encoded.slice(index, index + SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_TEXT_SIZE));
  }
  return chunks.length > 0 ? chunks : [""];
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, "#04110d");
  bg.addColorStop(0.46, "#0b1712");
  bg.addColorStop(1, "#17160f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = "#2df2d0";
  ctx.lineWidth = 2;
  for (let y = 180; y < CARD_H; y += 102) {
    ctx.beginPath();
    ctx.moveTo(86, y);
    ctx.lineTo(CARD_W - 86, y + 32);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#f6d875";
  ctx.lineWidth = 4;
  roundRect(ctx, 64, 64, CARD_W - 128, CARD_H - 128, 42);
  ctx.stroke();
  roundRect(ctx, 94, 94, CARD_W - 188, CARD_H - 188, 30);
  ctx.stroke();
  ctx.restore();
}

function sportsVaultHeaderSportLabel(manifest: SportsArenaVaultCardManifest): string {
  const sports = new Set(manifest.cards.map((card) => card.sport));
  if (sports.size !== 1) return "Sports";
  if (sports.has("soccer")) return "World Cup";
  if (sports.has("fight")) return "UFC";
  return "MLB";
}

function sportsVaultRouteSport(manifest: SportsArenaVaultCardManifest): SportsArenaVaultCardManifestCard["sport"] | null {
  const sports = new Set(manifest.cards.map((card) => card.sport));
  if (sports.size !== 1) return null;
  const [sport] = Array.from(sports);
  return sport === "soccer" || sport === "fight" ? sport : "baseball";
}

function drawHeader(ctx: CanvasRenderingContext2D, manifest: SportsArenaVaultCardManifest, logo: HTMLImageElement | null): void {
  ctx.save();
  if (logo) {
    roundRect(ctx, 96, 108, 86, 86, 18);
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fill();
    ctx.drawImage(logo, 112, 124, 54, 54);
  }
  ctx.fillStyle = "#effce9";
  ctx.font = "900 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Receiz Sports", 206, 142);
  ctx.fillStyle = "rgba(239, 252, 233, 0.7)";
  fitCanvasText(ctx, `Sealed ${sportsVaultHeaderSportLabel(manifest)} Vault Card`, 206, 177, 620, {
    weight: 800,
    size: 20,
    minSize: 16,
    color: "rgba(239, 252, 233, 0.7)",
  });
  ctx.textAlign = "right";
  ctx.fillStyle = "#9bff36";
  ctx.font = "950 34px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(`${manifest.cardCount}`, CARD_W - 98, 144);
  ctx.fillStyle = "rgba(239, 252, 233, 0.68)";
  ctx.font = "850 17px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(manifest.cardCount === 1 ? "CARD" : "CARDS", CARD_W - 98, 176);
  ctx.restore();
}

function drawVaultCore(ctx: CanvasRenderingContext2D, manifest: SportsArenaVaultCardManifest): void {
  ctx.save();
  roundRect(ctx, 96, 256, CARD_W - 192, 472, 30);
  const panel = ctx.createLinearGradient(96, 256, CARD_W - 96, 728);
  panel.addColorStop(0, "rgba(7, 25, 18, 0.94)");
  panel.addColorStop(1, "rgba(12, 17, 14, 0.88)");
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.strokeStyle = "rgba(45, 242, 208, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f6f1dd";
  ctx.font = "1000 66px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Sports Vault", 142, 366);
  ctx.fillStyle = "rgba(246, 241, 221, 0.74)";
  ctx.font = "850 24px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Image restores the verified card collection it carries.", 146, 418);

  const tiles = [
    ["Owner", manifest.ownerLabel ?? "Local vault"],
    ["Kai", manifest.kai.label],
    ["Archive", shortHash(manifest.archive.sha256Hex, 12, 10)],
  ] as const;
  for (let index = 0; index < tiles.length; index += 1) {
    const x = 144 + index * 292;
    roundRect(ctx, x, 504, 250, 118, 18);
    ctx.fillStyle = "rgba(255, 255, 255, 0.065)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.stroke();
    ctx.fillStyle = "rgba(246, 241, 221, 0.62)";
    ctx.font = "900 17px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(tiles[index][0].toUpperCase(), x + 24, 548);
    fitCanvasText(ctx, tiles[index][1], x + 24, 588, 202, {
      weight: 950,
      size: 24,
      minSize: 15,
      color: "#effce9",
    });
  }
  ctx.restore();
}

function drawCardList(ctx: CanvasRenderingContext2D, manifest: SportsArenaVaultCardManifest): void {
  ctx.save();
  ctx.fillStyle = "#f6f1dd";
  ctx.font = "950 30px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Collection Index", 104, 820);
  ctx.fillStyle = "rgba(246, 241, 221, 0.58)";
  ctx.font = "800 18px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Top verified claims carried in this image.", 104, 852);

  const previewCards = manifest.cards.slice(0, 8);
  for (let index = 0; index < previewCards.length; index += 1) {
    const card = previewCards[index];
    const y = 900 + index * 62;
    roundRect(ctx, 104, y, CARD_W - 208, 46, 12);
    ctx.fillStyle = index % 2 === 0 ? "rgba(255, 255, 255, 0.052)" : "rgba(255, 255, 255, 0.034)";
    ctx.fill();
    ctx.fillStyle = "#effce9";
    fitCanvasText(ctx, card.athlete, 128, y + 31, 400, { weight: 900, size: 21, minSize: 14 });
    ctx.fillStyle = "rgba(246, 241, 221, 0.74)";
    ctx.font = "850 18px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${card.teamCode} ${card.position}`, 744, y + 30);
    ctx.fillStyle = "#9bff36";
    ctx.fillText(card.rarity, CARD_W - 130, y + 30);
    ctx.textAlign = "left";
  }

  if (manifest.cardCount > previewCards.length) {
    ctx.fillStyle = "rgba(246, 241, 221, 0.68)";
    ctx.font = "850 18px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`+ ${manifest.cardCount - previewCards.length} more verified cards in the vault image`, 128, 900 + previewCards.length * 62 + 36);
  }
  ctx.restore();
}

async function drawFooter(ctx: CanvasRenderingContext2D, manifest: SportsArenaVaultCardManifest, verifyUrl: string): Promise<void> {
  ctx.save();
  roundRect(ctx, 104, CARD_H - 344, CARD_W - 208, 220, 26);
  ctx.fillStyle = "rgba(3, 9, 8, 0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(246, 216, 117, 0.3)";
  ctx.stroke();

  ctx.fillStyle = "#f6d875";
  ctx.font = "950 24px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Offline restore", 144, CARD_H - 282);
  ctx.fillStyle = "rgba(246, 241, 221, 0.72)";
  ctx.font = "800 18px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Import this image from Photos or Files. Claims verify locally, then account sync mirrors additions.", 144, CARD_H - 244);
  ctx.fillStyle = "rgba(246, 241, 221, 0.62)";
  ctx.fillText(`Merkle ${shortHash(manifest.integrity.merkleRootSha256)} - ${manifest.archive.size.toLocaleString()} bytes`, 144, CARD_H - 204);

  const qrImage = await loadImage(await qrDataURL(verifyUrl || manifest.kai.uri, { size: 146, margin: 1 })).catch(() => null);
  if (qrImage) {
    roundRect(ctx, CARD_W - 286, CARD_H - 300, 166, 166, 18);
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.fill();
    ctx.drawImage(qrImage, CARD_W - 276, CARD_H - 290, 146, 146);
  }
  ctx.restore();
}

async function buildSportsArenaVaultCardManifest(
  args: BuildSportsArenaVaultCardDownloadArgs,
  archiveSha256Hex: string,
  archiveChunkCount: number,
  kaiUpulse = nextLiveProofKaiUpulse(),
): Promise<SportsArenaVaultCardManifest> {
  const createdAtMs = Number.isFinite(args.createdAtMs) ? Math.trunc(args.createdAtMs) : Date.now();
  const kai = momentFromPulse(BigInt(kaiUpulse) / 1_000_000n);
  const cards: SportsArenaVaultCardManifestCard[] = args.cards.map((card) => ({
    collectibleId: safeText(card.collectibleId, "unknown"),
    claimHash: safeText(card.claimHash, "unknown"),
    sport: card.sport === "soccer" || card.sport === "fight" ? card.sport : "baseball",
    athlete: safeText(card.athlete, "Athlete"),
    teamCode: safeText(card.teamCode, "MLB"),
    position: safeText(card.position, "Card"),
    rarity: safeText(card.rarity, "Base"),
    rating: safeNumber(card.rating) ?? undefined,
    projectedScore: safeNumber(card.projectedScore) ?? undefined,
    baseTier: safeText(card.baseTier) || undefined,
    baseCard: card.baseCard ? {
      sealedCardId: safeText(card.baseCard.sealedCardId),
      basisHash: safeText(card.baseCard.basisHash),
      issueLine: safeText(card.baseCard.issueLine),
      athleteId: safeText(card.baseCard.athleteId),
      sport: card.baseCard.sport === "soccer" || card.baseCard.sport === "fight" ? card.baseCard.sport : "baseball",
    } : undefined,
    proof: card.proof ? {
      source: safeText(card.proof.source),
      basisHash: safeText(card.proof.basisHash),
      rule: safeText(card.proof.rule),
      statBasis: Array.isArray(card.proof.statBasis)
        ? card.proof.statBasis.filter((row): row is string => typeof row === "string" && Boolean(row.trim()))
        : [],
    } : undefined,
    media: cleanManifestMedia(card.media),
    scoreSummary: cleanManifestScoreSummary(card.scoreSummary),
    claimPath: safeText(card.claimPath, "sports-vault/cards/card/claim.json"),
    ownershipPath: card.ownershipPath ? safeText(card.ownershipPath) || null : null,
    careerPath: card.careerPath ? safeText(card.careerPath) || null : null,
  }));
  const leaves: string[] = [];
  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    leaves.push(await canonicalSha256Hex({
      schema: SPORTS_ARENA_VAULT_CARD_LEAF_SCHEMA,
      index,
      collectibleId: card.collectibleId,
      claimHash: card.claimHash,
      athlete: card.athlete,
      teamCode: card.teamCode,
      position: card.position,
      rarity: card.rarity,
      rating: card.rating,
      projectedScore: card.projectedScore,
      baseTier: card.baseTier,
      baseCard: card.baseCard,
      proof: card.proof,
      media: card.media,
      scoreSummary: card.scoreSummary,
      claimPath: card.claimPath,
      ownershipPath: card.ownershipPath,
      careerPath: card.careerPath,
    }));
  }
  const merkle = await buildMerkleTree(leaves);
  const lastLeafIndex = Math.max(0, leaves.length - 1);
  const fibonacciDistances = fibonacciDistancesUpTo(lastLeafIndex);
  const fibonacciLog = fibonacciBacklinkIndexes(lastLeafIndex);
  const computedVaultCardId = await canonicalSha256Hex({
    schema: SPORTS_ARENA_VAULT_CARD_SCHEMA,
    createdAtMs,
    archiveSha256Hex,
    merkleRootSha256: merkle.rootSha256,
    cardCount: args.cardCount,
    kaiPulse: kai.pulse,
    fibonacciDistances,
  });
  const vaultCardId = cleanVaultCardId(args.vaultCardId) ?? computedVaultCardId;
  return {
    schema: SPORTS_ARENA_VAULT_CARD_SCHEMA,
    createdAtMs,
    vaultCardId,
    cardCount: Math.max(0, Math.trunc(args.cardCount)),
    ownerLabel: args.ownerLabel?.trim() || null,
    archive: {
      filename: args.archiveFilename || "sports-vault.zip",
      mime: args.archiveMime || "application/zip",
      size: args.archiveBytes.byteLength,
      sha256Hex: archiveSha256Hex,
      encoding: SPORTS_ARENA_VAULT_CARD_ARCHIVE_ENCODING,
      chunkCount: archiveChunkCount,
      chunkTextSize: SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_TEXT_SIZE,
    },
    integrity: {
      merkleRootSha256: merkle.rootSha256,
      archiveSha256Hex,
      leafCount: leaves.length,
      fibonacciDistances,
      fibonacciLog,
    },
    kai: {
      pulse: kai.pulse,
      beat: kai.beat,
      stepIndex: kai.stepIndex,
      chakraDay: kai.chakraDay,
      weekday: kai.weekday,
      label: `☤KAI:${Math.max(0, Math.trunc(kai.pulse))}`,
      uri: `kai://sports-vault/${kai.pulse}/${kai.beat}/${kai.stepIndex}/${vaultCardId.slice(0, 16)}`,
    },
    cards,
    restoreRule:
      "Import unwraps this image, verifies each Sports Arena card claim and history file, restores the local vault immediately, then syncs verified additions in background.",
    offlineVerifyRule:
      "The PNG itself is receized. Offline verify validates the image bytes; the embedded archive hash, Merkle root, Fibonacci log, and Kai pulse bind the sports vault payload carried inside.",
  };
}

export async function buildSportsArenaVaultCardManifestOnly(
  args: BuildSportsArenaVaultCardDownloadArgs,
): Promise<SportsArenaVaultCardManifest> {
  const archiveBytes = new Uint8Array(args.archiveBytes.byteLength);
  archiveBytes.set(args.archiveBytes);
  const archiveSha256Hex = await sha256Hex(archiveBytes);
  const archiveChunks = splitArchiveText(archiveBytes);
  return buildSportsArenaVaultCardManifest(args, archiveSha256Hex, archiveChunks.length);
}

async function renderSportsArenaVaultCardPng(manifest: SportsArenaVaultCardManifest, verifyUrl: string): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sports_vault_card_canvas_unavailable");
  const logo = await loadImage("/logo.svg").catch(() => null);
  drawBackground(ctx);
  drawHeader(ctx, manifest, logo);
  drawVaultCore(ctx, manifest);
  drawCardList(ctx, manifest);
  await drawFooter(ctx, manifest, verifyUrl);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, SPORTS_ARENA_VAULT_CARD_MIME));
  if (!blob) throw new Error("sports_vault_card_canvas_encode_failed");
  return new Uint8Array(await blob.arrayBuffer());
}

function sportsVaultExplorerUrl(manifest: SportsArenaVaultCardManifest, fallbackUrl: string, publicVaultUrl?: string | null): string {
  if (publicVaultUrl?.trim()) return publicVaultUrl.trim();
  if (typeof window === "undefined" || !window.location?.origin) return fallbackUrl || manifest.kai.uri;
  const routeSport = sportsVaultRouteSport(manifest);
  if (!routeSport) return fallbackUrl || manifest.kai.uri;
  return new URL(`/game/sports/${routeSport}/vault/${manifest.vaultCardId}`, window.location.origin).toString();
}

function vaultCardFileDate(createdAtMs: number): string {
  return new Date(createdAtMs).toISOString().slice(0, 10);
}

export async function buildSportsArenaVaultCardDownload(args: BuildSportsArenaVaultCardDownloadArgs): Promise<SportsArenaVaultCardDownload> {
  const { planReceizDocumentBytesClientSeal, receizeDocumentBytesClient } = await import(
    "@/app/lib/documentSeal/receizeDocumentBytesClient"
  );
  const createdAtMs = Number.isFinite(args.createdAtMs) ? Math.trunc(args.createdAtMs) : Date.now();
  const archiveBytes = new Uint8Array(args.archiveBytes.byteLength);
  archiveBytes.set(args.archiveBytes);
  const archiveSha256Hex = await sha256Hex(archiveBytes);
  const archiveChunks = splitArchiveText(archiveBytes);
  const kaiUpulse = nextLiveProofKaiUpulse();
  const manifest = await buildSportsArenaVaultCardManifest(args, archiveSha256Hex, archiveChunks.length, kaiUpulse);
  const plannedSeal = await planReceizDocumentBytesClientSeal({ now: createdAtMs, kaiUpulse });
  const basePng = await renderSportsArenaVaultCardPng(manifest, sportsVaultExplorerUrl(manifest, plannedSeal.verifyUrl, args.publicVaultUrl));
  const enriched = insertPngTextChunks(basePng, [
    { keyword: SPORTS_ARENA_VAULT_CARD_MANIFEST_KEY, text: JSON.stringify(manifest) },
    { keyword: SPORTS_ARENA_VAULT_CARD_ARCHIVE_SHA_KEY, text: archiveSha256Hex },
    { keyword: SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_COUNT_KEY, text: String(archiveChunks.length) },
    ...archiveChunks.map((text, index): PngTextChunk => ({
      keyword: `${SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_PREFIX}${index}`,
      text,
    })),
  ]);
  const sealed = await receizeDocumentBytesClient({
    fileBytes: enriched,
    filename: `sports-vault-card-${vaultCardFileDate(createdAtMs)}.png`,
    mime: SPORTS_ARENA_VAULT_CARD_MIME,
    now: createdAtMs,
    kaiUpulse,
    options: { claimSha256Hex: manifest.integrity.merkleRootSha256, requirePng: true },
  });
  if (sealed.kind !== "png") throw new Error("sports_vault_card_png_receiz_required");
  return {
    bytes: sealed.artifactBytes,
    filename: sealed.downloadName,
    mime: SPORTS_ARENA_VAULT_CARD_MIME,
    manifest,
  };
}

function readFirstChunk(chunks: PngTextChunk[], keyword: string): string | null {
  for (const chunk of chunks) {
    if (chunk.keyword === keyword) return chunk.text;
  }
  return null;
}

function isSportsArenaVaultCardManifest(value: unknown): value is SportsArenaVaultCardManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<SportsArenaVaultCardManifest>;
  return manifest.schema === SPORTS_ARENA_VAULT_CARD_SCHEMA &&
    typeof manifest.archive?.sha256Hex === "string" &&
    manifest.archive.encoding === SPORTS_ARENA_VAULT_CARD_ARCHIVE_ENCODING &&
    typeof manifest.integrity?.merkleRootSha256 === "string" &&
    Array.isArray(manifest.cards);
}

export async function extractSportsArenaVaultCardArchiveBytes(pngBytes: Uint8Array): Promise<ExtractedSportsArenaVaultCardArchive> {
  const chunks = readPngTextChunks(pngBytes);
  const manifestText = readFirstChunk(chunks, SPORTS_ARENA_VAULT_CARD_MANIFEST_KEY);
  const archiveSha256Hex = readFirstChunk(chunks, SPORTS_ARENA_VAULT_CARD_ARCHIVE_SHA_KEY);
  const chunkCountText = readFirstChunk(chunks, SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_COUNT_KEY);
  if (!manifestText || !archiveSha256Hex || !chunkCountText) {
    throw new Error("sports_vault_card_archive_missing");
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestText) as unknown;
  } catch {
    throw new Error("sports_vault_card_manifest_invalid");
  }
  if (!isSportsArenaVaultCardManifest(manifest)) throw new Error("sports_vault_card_manifest_rejected");

  const chunkCount = Number(chunkCountText);
  if (!Number.isInteger(chunkCount) || chunkCount <= 0 || chunkCount > 100_000) {
    throw new Error("sports_vault_card_archive_count_invalid");
  }
  const parts = new Array<string | null>(chunkCount).fill(null);
  for (const chunk of chunks) {
    if (!chunk.keyword.startsWith(SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_PREFIX)) continue;
    const index = Number(chunk.keyword.slice(SPORTS_ARENA_VAULT_CARD_ARCHIVE_CHUNK_PREFIX.length));
    if (!Number.isInteger(index) || index < 0 || index >= chunkCount) continue;
    parts[index] = chunk.text;
  }
  if (parts.some((part) => typeof part !== "string")) {
    throw new Error("sports_vault_card_archive_chunk_missing");
  }
  const archiveBytes = base64UrlDecode(parts.join(""));
  const actualSha256Hex = await sha256Hex(toArrayBufferStrict(archiveBytes));
  if (actualSha256Hex !== archiveSha256Hex || actualSha256Hex !== manifest.archive.sha256Hex) {
    throw new Error("sports_vault_card_archive_hash_mismatch");
  }
  return { bytes: archiveBytes, manifest };
}
