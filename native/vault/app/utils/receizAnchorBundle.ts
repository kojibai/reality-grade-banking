import { isBase64DataUrl } from "@/app/utils/dataUrl";
import {
  coerceProfileOriginalStorageRef,
  coerceProfileOriginalStorageRefFromAny,
  coerceProfileOriginalStorageVariantMap,
  coerceProfileOriginalStorageVariantMapFromAny,
} from "@/app/lib/profile/originalStorage";
import {
  coerceProfileOriginalLongForm,
} from "@/app/lib/profile/longForm";
import type { ProfileOriginalLongForm } from "@/app/lib/profile/types";
import { coerceReceizProofBundle, type ReceizProofBundle } from "@/app/utils/receizProofBundle";

export const RECEIZ_ANCHOR_BUNDLE_CHUNK_KEY = "receiz_anchor_bundle";

export type ReceizAnchorClaim = {
  text: string;
  sha256Hex: string;
  longForm?: ProfileOriginalLongForm;
  proofAttachments?: ReceizAnchorProofAttachment[];
  sealedRecordProofBundle?: ReceizProofBundle;
  kind?: string;
  v?: number;
  asset_type?: "art" | "diamond" | "collectible" | "luxury";
  asset_id?: string;
  title?: string;
  creator_or_maker?: string;
  issuer_role?: "collector" | "gallery" | "vault" | "insurer" | "appraiser";
  custody_status?: "minted" | "in_custody" | "transferred" | "claimed";
  custody_chain?: Array<{ at: string; by: string; role: string; note?: string }>;
  attachments?: Array<{ name: string; path?: string; mime: string; size: number; dataUrl: string }>;
};

export type ReceizAnchorProofAttachmentRole =
  | "source"
  | "appendix"
  | "dataset"
  | "contract"
  | "receipt"
  | "research"
  | "other";

export type ReceizAnchorProofAttachment = {
  id: string;
  role: ReceizAnchorProofAttachmentRole;
  name: string;
  mime: string;
  size: number;
  sha256Hex: string;
  url?: string;
  storageBucket?: string;
  storagePath?: string;
  downloadName?: string;
  description?: string;
  createdAt: string;
};

export type ReceizAnchorSignalRunSubjectArt = {
  schema: "receiz.signal_run.card.generated_art.v1";
  collectibleId: string;
  claimHash: string;
  renderId: string;
  subjectName: string;
  subjectKind: "character" | "utility" | "relic" | "field";
  provider: string;
  model: string;
  mime: "image/png";
  sha256Hex: string;
  promptHash: string;
  imageDataUrl: string;
  createdAtMs: number;
};

export type ReceizAnchorFile = {
  name: string;
  size: number;
  mime: string;
  sha256Hex: string;
  dataUrl?: string;
  url?: string;
  storageBucket?: string;
  storagePath?: string;
  allowOriginalDownload?: boolean;
  allowDerivativeDownload?: boolean;
  allowMomentRecordDownload?: boolean;
  gateAudioPlayback?: boolean;
  originalDownloadLimit?: number;
  derivativeDownloadLimit?: number;
  originalDownloadPriceCents?: number;
  derivativeDownloadPriceCents?: number;
  receizMs?: string;
  receizTzMinutesEast?: number;
  sealedName?: string;
  sealedSize?: number;
  sealedMime?: string;
  sealedSha256Hex?: string;
  sealedUrl?: string;
  sealedStorageBucket?: string;
  sealedStoragePath?: string;
  sealedVerifyPath?: string;
  sealedCode?: string;
  sealedPulse?: string;
  sealedTs?: string;
  sealedKind?: string;
  sealedProofBundle?: ReceizProofBundle;
  sealedRecordProofBundle?: ReceizProofBundle;
  sealedSubjectArt?: ReceizAnchorSignalRunSubjectArt;
  sealedArenaAppends?: unknown[];
  materialProofUrl?: string;
  materialPayloadSha256Hex?: string;
  playbackUrl?: string;
  playbackStorageBucket?: string;
  playbackStoragePath?: string;
  playbackMime?: string;
  playbackKind?: "hls" | "mp4";
  playbackReadyAt?: string;
  videoPosterDataUrl?: string;
  videoPosterUrl?: string;
  videoPosterStorageBucket?: string;
  videoPosterStoragePath?: string;
  videoPosterName?: string;
  videoPosterMime?: string;
  videoPosterSize?: number;
  videoPosterSha256Hex?: string;
  imageVariants?: Record<string, string>;
  imageVariantStorage?: Record<string, { bucket: string; path: string }>;
  audioCoverDataUrl?: string;
  audioCoverUrl?: string;
  audioCoverStorageBucket?: string;
  audioCoverStoragePath?: string;
  audioCoverName?: string;
  audioCoverMime?: string;
  audioCoverSize?: number;
  audioCoverSha256Hex?: string;
  audioCoverImageVariants?: Record<string, string>;
  audioCoverImageVariantStorage?: Record<string, { bucket: string; path: string }>;
  epubCoverDataUrl?: string;
  epubCoverUrl?: string;
  epubCoverStorageBucket?: string;
  epubCoverStoragePath?: string;
  epubCoverName?: string;
  epubCoverMime?: string;
  epubCoverSize?: number;
  epubCoverSha256Hex?: string;
  epubCoverImageVariants?: Record<string, string>;
  epubCoverImageVariantStorage?: Record<string, { bucket: string; path: string }>;
  videoPosterImageVariants?: Record<string, string>;
  videoPosterImageVariantStorage?: Record<string, { bucket: string; path: string }>;
  epubTitle?: string;
  epubSubtitle?: string;
  epubPrimaryAuthor?: string;
  epubContributors?: string;
  epubPublisher?: string;
  epubImprint?: string;
  epubGenre?: string;
  epubLanguage?: string;
  epubIsbn?: string;
  epubEdition?: string;
  epubSeries?: string;
  audioReleaseTitle?: string;
  audioPrimaryArtist?: string;
  audioReleaseType?: "single" | "ep" | "album" | "mixtape" | "live";
  audioGenre?: string;
  audioSubgenre?: string;
  audioExplicit?: boolean;
  audioIsrc?: string;
  audioWriters?: string;
  audioProducer?: string;
  audioLabel?: string;
  audioReleaseDate?: string;
  audioTerritories?: string;
  proofAttachments?: ReceizAnchorProofAttachment[];
};

export type ReceizAnchorBundle = {
  version: 1;
  parent: {
    code: string;
    pulse: string;
    viewUrl: string;
  };
  anchorId: string;
  anchoredAt: string;
  contextPreset?: "Deposit" | "Milestone" | "Handoff" | "Condition" | "Agreement" | "Delivery" | "Custom";
  claim?: ReceizAnchorClaim;
  file?: ReceizAnchorFile;
};

const CONTEXT_PRESETS = new Set(["Deposit", "Milestone", "Handoff", "Condition", "Agreement", "Delivery", "Custom"]);
const MAX_DOWNLOAD_LIMIT = 1_000_000;
const MAX_DOWNLOAD_PRICE_CENTS = 1_000_000;
const AUDIO_RELEASE_TYPES = new Set(["single", "ep", "album", "mixtape", "live"]);
const PROOF_ATTACHMENT_ROLES = new Set(["source", "appendix", "dataset", "contract", "receipt", "research", "other"]);
const SIGNAL_RUN_SUBJECT_ART_MAX_DATA_URL_CHARS = 6 * 1024 * 1024;

function isHex64(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function isHttpUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isSafeRelativeUrl(value: string): boolean {
  const raw = value.trim();
  return raw.startsWith("/") && !raw.startsWith("//");
}

function isAllowedMediaUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  if (coerceProfileOriginalStorageRefFromAny(raw)) return true;
  if (isHttpUrl(raw) || isSafeRelativeUrl(raw)) return true;
  return false;
}

export function coerceReceizAnchorSignalRunSubjectArt(value: unknown): ReceizAnchorSignalRunSubjectArt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const art = value as Partial<ReceizAnchorSignalRunSubjectArt>;
  const imageDataUrl = typeof art.imageDataUrl === "string" ? art.imageDataUrl.trim() : "";
  if (
    art.schema !== "receiz.signal_run.card.generated_art.v1" ||
    typeof art.collectibleId !== "string" ||
    !art.collectibleId.trim() ||
    typeof art.claimHash !== "string" ||
    !isHex64(art.claimHash.trim().toLowerCase()) ||
    typeof art.renderId !== "string" ||
    !art.renderId.trim() ||
    typeof art.subjectName !== "string" ||
    !art.subjectName.trim() ||
    (art.subjectKind !== "character" && art.subjectKind !== "utility" && art.subjectKind !== "relic" && art.subjectKind !== "field") ||
    typeof art.provider !== "string" ||
    !art.provider.trim() ||
    typeof art.model !== "string" ||
    !art.model.trim() ||
    art.mime !== "image/png" ||
    typeof art.sha256Hex !== "string" ||
    !isHex64(art.sha256Hex.trim().toLowerCase()) ||
    typeof art.promptHash !== "string" ||
    !isHex64(art.promptHash.trim().toLowerCase()) ||
    imageDataUrl.length > SIGNAL_RUN_SUBJECT_ART_MAX_DATA_URL_CHARS ||
    !imageDataUrl.toLowerCase().startsWith("data:image/png;") ||
    !isBase64DataUrl(imageDataUrl) ||
    typeof art.createdAtMs !== "number" ||
    !Number.isFinite(art.createdAtMs) ||
    art.createdAtMs < 1
  ) {
    return null;
  }

  return {
    schema: "receiz.signal_run.card.generated_art.v1",
    collectibleId: art.collectibleId.trim(),
    claimHash: art.claimHash.trim().toLowerCase(),
    renderId: art.renderId.trim(),
    subjectName: art.subjectName.trim(),
    subjectKind: art.subjectKind,
    provider: art.provider.trim(),
    model: art.model.trim(),
    mime: "image/png",
    sha256Hex: art.sha256Hex.trim().toLowerCase(),
    promptHash: art.promptHash.trim().toLowerCase(),
    imageDataUrl,
    createdAtMs: art.createdAtMs,
  };
}

function validReceizAnchorProofAttachments(value: unknown): boolean {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > 200) return false;

  for (const raw of value) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const attachment = raw as Record<string, unknown>;
    const id = typeof attachment.id === "string" ? attachment.id.trim() : "";
    const role = typeof attachment.role === "string" ? attachment.role.trim() : "";
    const name = typeof attachment.name === "string" ? attachment.name.trim() : "";
    const mime = typeof attachment.mime === "string" ? attachment.mime.trim() : "";
    const sha256Hex = typeof attachment.sha256Hex === "string" ? attachment.sha256Hex.trim().toLowerCase() : "";
    const size = typeof attachment.size === "number" ? attachment.size : Number.NaN;
    const url = typeof attachment.url === "string" ? attachment.url.trim() : "";
    const storageBucket = attachment.storageBucket;
    const storagePath = attachment.storagePath;
    const hasStorageRef = storageBucket !== undefined || storagePath !== undefined;
    const storageRef = coerceProfileOriginalStorageRef({ bucket: storageBucket, path: storagePath });
    const createdAt = typeof attachment.createdAt === "string" ? attachment.createdAt.trim() : "";
    const downloadName = typeof attachment.downloadName === "string" ? attachment.downloadName.trim() : "";
    const description = typeof attachment.description === "string" ? attachment.description.trim() : "";

    if (
      !id ||
      id.length > 120 ||
      !PROOF_ATTACHMENT_ROLES.has(role) ||
      !name ||
      name.length > 160 ||
      !mime ||
      mime.length > 120 ||
      !Number.isFinite(size) ||
      size < 0 ||
      !isHex64(sha256Hex) ||
      (!url && !storageRef) ||
      (url && !isAllowedMediaUrl(url)) ||
      (hasStorageRef && !storageRef) ||
      !createdAt ||
      !Number.isFinite(Date.parse(createdAt)) ||
      downloadName.length > 160 ||
      description.length > 140
    ) {
      return false;
    }
  }

  return true;
}

export function coerceReceizAnchorBundle(value: unknown): ReceizAnchorBundle | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ReceizAnchorBundle>;
  if (v.version !== 1 || !v.parent || typeof v.parent !== "object") return null;
  if (typeof v.parent.code !== "string" || typeof v.parent.pulse !== "string" || typeof v.parent.viewUrl !== "string") {
    return null;
  }
  if (typeof v.anchorId !== "string" || !/^[0-9a-f]{8}$/.test(v.anchorId)) return null;
  if (typeof v.anchoredAt !== "string") return null;
  if (v.contextPreset !== undefined && (typeof v.contextPreset !== "string" || !CONTEXT_PRESETS.has(v.contextPreset))) return null;

  if (v.claim) {
    if (typeof v.claim.text !== "string" || typeof v.claim.sha256Hex !== "string" || !isHex64(v.claim.sha256Hex)) {
      return null;
    }
    const sealedRecordProofBundleRaw = (v.claim as { sealedRecordProofBundle?: unknown }).sealedRecordProofBundle;
    const sealedRecordProofBundle =
      sealedRecordProofBundleRaw === undefined ? undefined : coerceReceizProofBundle(sealedRecordProofBundleRaw);
    if (sealedRecordProofBundleRaw !== undefined && !sealedRecordProofBundle) {
      return null;
    }
    const longForm = coerceProfileOriginalLongForm((v.claim as { longForm?: unknown }).longForm);
    if ((v.claim as { longForm?: unknown }).longForm !== undefined && !longForm) {
      return null;
    }
    if (!validReceizAnchorProofAttachments((v.claim as { proofAttachments?: unknown }).proofAttachments)) {
      return null;
    }
    if (Array.isArray(v.claim.attachments)) {
      for (const att of v.claim.attachments) {
        if (!att || typeof att !== "object") return null;
        const attachment = att as { name?: unknown; path?: unknown; mime?: unknown; size?: unknown; dataUrl?: unknown };
        if (typeof attachment.name !== "string" || typeof attachment.mime !== "string") return null;
        if (attachment.path !== undefined && typeof attachment.path !== "string") return null;
        if (typeof attachment.size !== "number" || !Number.isFinite(attachment.size)) return null;
        if (typeof attachment.dataUrl !== "string" || !isBase64DataUrl(attachment.dataUrl)) return null;
      }
    }
  }

  if (v.file) {
    const dataUrl = (v.file as { dataUrl?: unknown }).dataUrl;
    const url = (v.file as { url?: unknown }).url;
    const storageRef = coerceProfileOriginalStorageRef({
      bucket: (v.file as { storageBucket?: unknown }).storageBucket,
      path: (v.file as { storagePath?: unknown }).storagePath,
    });
    const allowOriginalDownload = (v.file as { allowOriginalDownload?: unknown }).allowOriginalDownload;
    const allowDerivativeDownload = (v.file as { allowDerivativeDownload?: unknown }).allowDerivativeDownload;
    const allowMomentRecordDownload = (v.file as { allowMomentRecordDownload?: unknown }).allowMomentRecordDownload;
    const allowCopyDownload = (v.file as { allowCopyDownload?: unknown }).allowCopyDownload;
    const gateAudioPlayback = (v.file as { gateAudioPlayback?: unknown }).gateAudioPlayback;
    const originalDownloadLimit = (v.file as { originalDownloadLimit?: unknown }).originalDownloadLimit;
    const derivativeDownloadLimit = (v.file as { derivativeDownloadLimit?: unknown }).derivativeDownloadLimit;
    const originalDownloadPriceCents = (v.file as { originalDownloadPriceCents?: unknown }).originalDownloadPriceCents;
    const derivativeDownloadPriceCents =
      (v.file as { derivativeDownloadPriceCents?: unknown }).derivativeDownloadPriceCents;
    const receizMs = (v.file as { receizMs?: unknown }).receizMs;
    const receizTzMinutesEast = (v.file as { receizTzMinutesEast?: unknown }).receizTzMinutesEast;
    const sealedName = (v.file as { sealedName?: unknown }).sealedName;
    const sealedSize = (v.file as { sealedSize?: unknown }).sealedSize;
    const sealedMime = (v.file as { sealedMime?: unknown }).sealedMime;
    const sealedSha256Hex = (v.file as { sealedSha256Hex?: unknown }).sealedSha256Hex;
    const sealedUrl = (v.file as { sealedUrl?: unknown }).sealedUrl;
    const sealedStorageRef = coerceProfileOriginalStorageRef({
      bucket: (v.file as { sealedStorageBucket?: unknown }).sealedStorageBucket,
      path: (v.file as { sealedStoragePath?: unknown }).sealedStoragePath,
    });
    const sealedVerifyPath = (v.file as { sealedVerifyPath?: unknown }).sealedVerifyPath;
    const sealedCode = (v.file as { sealedCode?: unknown }).sealedCode;
    const sealedPulse = (v.file as { sealedPulse?: unknown }).sealedPulse;
    const sealedTs = (v.file as { sealedTs?: unknown }).sealedTs;
    const sealedKind = (v.file as { sealedKind?: unknown }).sealedKind;
    const materialProofUrl = (v.file as { materialProofUrl?: unknown }).materialProofUrl;
    const materialPayloadSha256Hex = (v.file as { materialPayloadSha256Hex?: unknown }).materialPayloadSha256Hex;
    const sealedProofBundleRaw = (v.file as { sealedProofBundle?: unknown }).sealedProofBundle;
    const sealedProofBundle =
      sealedProofBundleRaw === undefined ? undefined : coerceReceizProofBundle(sealedProofBundleRaw);
    const sealedRecordProofBundleRaw = (v.file as { sealedRecordProofBundle?: unknown }).sealedRecordProofBundle;
    const sealedRecordProofBundle =
      sealedRecordProofBundleRaw === undefined ? undefined : coerceReceizProofBundle(sealedRecordProofBundleRaw);
    const sealedSubjectArtRaw = (v.file as { sealedSubjectArt?: unknown }).sealedSubjectArt;
    const sealedSubjectArt =
      sealedSubjectArtRaw === undefined ? undefined : coerceReceizAnchorSignalRunSubjectArt(sealedSubjectArtRaw);
    const playbackUrl = (v.file as { playbackUrl?: unknown }).playbackUrl;
    const playbackStorageRef = coerceProfileOriginalStorageRef({
      bucket: (v.file as { playbackStorageBucket?: unknown }).playbackStorageBucket,
      path: (v.file as { playbackStoragePath?: unknown }).playbackStoragePath,
    });
    const playbackMime = (v.file as { playbackMime?: unknown }).playbackMime;
    const playbackKind = (v.file as { playbackKind?: unknown }).playbackKind;
    const playbackReadyAt = (v.file as { playbackReadyAt?: unknown }).playbackReadyAt;
    const audioCoverDataUrl = (v.file as { audioCoverDataUrl?: unknown }).audioCoverDataUrl;
    const audioCoverUrl = (v.file as { audioCoverUrl?: unknown }).audioCoverUrl;
    const audioCoverStorageRef = coerceProfileOriginalStorageRef({
      bucket: (v.file as { audioCoverStorageBucket?: unknown }).audioCoverStorageBucket,
      path: (v.file as { audioCoverStoragePath?: unknown }).audioCoverStoragePath,
    });
    const audioCoverName = (v.file as { audioCoverName?: unknown }).audioCoverName;
    const audioCoverMime = (v.file as { audioCoverMime?: unknown }).audioCoverMime;
    const audioCoverSize = (v.file as { audioCoverSize?: unknown }).audioCoverSize;
    const audioCoverSha256Hex = (v.file as { audioCoverSha256Hex?: unknown }).audioCoverSha256Hex;
    const audioCoverImageVariantStorage = (v.file as { audioCoverImageVariantStorage?: unknown }).audioCoverImageVariantStorage;
    const epubCoverDataUrl = (v.file as { epubCoverDataUrl?: unknown }).epubCoverDataUrl;
    const epubCoverUrl = (v.file as { epubCoverUrl?: unknown }).epubCoverUrl;
    const epubCoverStorageRef = coerceProfileOriginalStorageRef({
      bucket: (v.file as { epubCoverStorageBucket?: unknown }).epubCoverStorageBucket,
      path: (v.file as { epubCoverStoragePath?: unknown }).epubCoverStoragePath,
    });
    const epubCoverName = (v.file as { epubCoverName?: unknown }).epubCoverName;
    const epubCoverMime = (v.file as { epubCoverMime?: unknown }).epubCoverMime;
    const epubCoverSize = (v.file as { epubCoverSize?: unknown }).epubCoverSize;
    const epubCoverSha256Hex = (v.file as { epubCoverSha256Hex?: unknown }).epubCoverSha256Hex;
    const epubCoverImageVariantStorage = (v.file as { epubCoverImageVariantStorage?: unknown }).epubCoverImageVariantStorage;
    const imageVariantStorage = (v.file as { imageVariantStorage?: unknown }).imageVariantStorage;
    const videoPosterUrl = (v.file as { videoPosterUrl?: unknown }).videoPosterUrl;
    const videoPosterStorageRef = coerceProfileOriginalStorageRef({
      bucket: (v.file as { videoPosterStorageBucket?: unknown }).videoPosterStorageBucket,
      path: (v.file as { videoPosterStoragePath?: unknown }).videoPosterStoragePath,
    });
    const videoPosterImageVariants = (v.file as { videoPosterImageVariants?: unknown }).videoPosterImageVariants;
    const videoPosterImageVariantStorage = (v.file as { videoPosterImageVariantStorage?: unknown }).videoPosterImageVariantStorage;
    const epubTitle = (v.file as { epubTitle?: unknown }).epubTitle;
    const epubSubtitle = (v.file as { epubSubtitle?: unknown }).epubSubtitle;
    const epubPrimaryAuthor = (v.file as { epubPrimaryAuthor?: unknown }).epubPrimaryAuthor;
    const epubContributors = (v.file as { epubContributors?: unknown }).epubContributors;
    const epubPublisher = (v.file as { epubPublisher?: unknown }).epubPublisher;
    const epubImprint = (v.file as { epubImprint?: unknown }).epubImprint;
    const epubGenre = (v.file as { epubGenre?: unknown }).epubGenre;
    const epubLanguage = (v.file as { epubLanguage?: unknown }).epubLanguage;
    const epubIsbn = (v.file as { epubIsbn?: unknown }).epubIsbn;
    const epubEdition = (v.file as { epubEdition?: unknown }).epubEdition;
    const epubSeries = (v.file as { epubSeries?: unknown }).epubSeries;
    const audioReleaseTitle = (v.file as { audioReleaseTitle?: unknown }).audioReleaseTitle;
    const audioPrimaryArtist = (v.file as { audioPrimaryArtist?: unknown }).audioPrimaryArtist;
    const audioReleaseType = (v.file as { audioReleaseType?: unknown }).audioReleaseType;
    const audioGenre = (v.file as { audioGenre?: unknown }).audioGenre;
    const audioSubgenre = (v.file as { audioSubgenre?: unknown }).audioSubgenre;
    const audioExplicit = (v.file as { audioExplicit?: unknown }).audioExplicit;
    const audioIsrc = (v.file as { audioIsrc?: unknown }).audioIsrc;
    const audioWriters = (v.file as { audioWriters?: unknown }).audioWriters;
    const audioProducer = (v.file as { audioProducer?: unknown }).audioProducer;
    const audioLabel = (v.file as { audioLabel?: unknown }).audioLabel;
    const audioReleaseDate = (v.file as { audioReleaseDate?: unknown }).audioReleaseDate;
    const audioTerritories = (v.file as { audioTerritories?: unknown }).audioTerritories;
    const proofAttachments = (v.file as { proofAttachments?: unknown }).proofAttachments;
    const validDataUrl = dataUrl === undefined || (typeof dataUrl === "string" && isBase64DataUrl(dataUrl));
    const validUrl = url === undefined || (typeof url === "string" && isAllowedMediaUrl(url));
    const validStorageRef =
      (v.file as { storageBucket?: unknown }).storageBucket === undefined &&
      (v.file as { storagePath?: unknown }).storagePath === undefined
        ? true
        : storageRef !== null;
    const validAllowOriginalDownload = allowOriginalDownload === undefined || typeof allowOriginalDownload === "boolean";
    const validAllowDerivativeDownload =
      allowDerivativeDownload === undefined || typeof allowDerivativeDownload === "boolean";
    const validAllowMomentRecordDownload =
      allowMomentRecordDownload === undefined || typeof allowMomentRecordDownload === "boolean";
    const validAllowCopyDownload = allowCopyDownload === undefined || typeof allowCopyDownload === "boolean";
    const validGateAudioPlayback = gateAudioPlayback === undefined || typeof gateAudioPlayback === "boolean";
    const validOriginalDownloadLimit =
      originalDownloadLimit === undefined ||
      (typeof originalDownloadLimit === "number" &&
        Number.isFinite(originalDownloadLimit) &&
        Number.isInteger(originalDownloadLimit) &&
        originalDownloadLimit >= 1 &&
        originalDownloadLimit <= MAX_DOWNLOAD_LIMIT);
    const validDerivativeDownloadLimit =
      derivativeDownloadLimit === undefined ||
      (typeof derivativeDownloadLimit === "number" &&
        Number.isFinite(derivativeDownloadLimit) &&
        Number.isInteger(derivativeDownloadLimit) &&
        derivativeDownloadLimit >= 1 &&
        derivativeDownloadLimit <= MAX_DOWNLOAD_LIMIT);
    const validOriginalDownloadPriceCents =
      originalDownloadPriceCents === undefined ||
      (typeof originalDownloadPriceCents === "number" &&
        Number.isFinite(originalDownloadPriceCents) &&
        Number.isInteger(originalDownloadPriceCents) &&
        originalDownloadPriceCents >= 1 &&
        originalDownloadPriceCents <= MAX_DOWNLOAD_PRICE_CENTS);
    const validDerivativeDownloadPriceCents =
      derivativeDownloadPriceCents === undefined ||
      (typeof derivativeDownloadPriceCents === "number" &&
        Number.isFinite(derivativeDownloadPriceCents) &&
        Number.isInteger(derivativeDownloadPriceCents) &&
        derivativeDownloadPriceCents >= 1 &&
        derivativeDownloadPriceCents <= MAX_DOWNLOAD_PRICE_CENTS);
    const validReceizMs = receizMs === undefined || (typeof receizMs === "string" && /^\d{1,20}$/.test(receizMs));
    const validReceizTzMinutesEast =
      receizTzMinutesEast === undefined ||
      (typeof receizTzMinutesEast === "number" &&
        Number.isFinite(receizTzMinutesEast) &&
        receizTzMinutesEast >= -840 &&
        receizTzMinutesEast <= 840);
    const validSealedName = sealedName === undefined || typeof sealedName === "string";
    const validSealedSize = sealedSize === undefined || (typeof sealedSize === "number" && Number.isFinite(sealedSize) && sealedSize >= 0);
    const validSealedMime = sealedMime === undefined || typeof sealedMime === "string";
    const validSealedSha256Hex = sealedSha256Hex === undefined || (typeof sealedSha256Hex === "string" && isHex64(sealedSha256Hex));
    const validSealedUrl = sealedUrl === undefined || (typeof sealedUrl === "string" && isAllowedMediaUrl(sealedUrl));
    const validSealedStorageRef =
      (v.file as { sealedStorageBucket?: unknown }).sealedStorageBucket === undefined &&
      (v.file as { sealedStoragePath?: unknown }).sealedStoragePath === undefined
        ? true
        : sealedStorageRef !== null;
    const validSealedVerifyPath = sealedVerifyPath === undefined || typeof sealedVerifyPath === "string";
    const validSealedCode = sealedCode === undefined || typeof sealedCode === "string";
    const validSealedPulse = sealedPulse === undefined || typeof sealedPulse === "string";
    const validSealedTs = sealedTs === undefined || typeof sealedTs === "string";
    const validSealedKind = sealedKind === undefined || typeof sealedKind === "string";
    const validMaterialProofUrl = materialProofUrl === undefined || (typeof materialProofUrl === "string" && isAllowedMediaUrl(materialProofUrl));
    const validMaterialPayloadSha256Hex = materialPayloadSha256Hex === undefined || (typeof materialPayloadSha256Hex === "string" && isHex64(materialPayloadSha256Hex));
    const validSealedProofBundle = sealedProofBundleRaw === undefined || !!sealedProofBundle;
    const validSealedRecordProofBundle = sealedRecordProofBundleRaw === undefined || !!sealedRecordProofBundle;
    const validSealedSubjectArt = sealedSubjectArtRaw === undefined || !!sealedSubjectArt;
    const validPlaybackUrl = playbackUrl === undefined || (typeof playbackUrl === "string" && isAllowedMediaUrl(playbackUrl));
    const validPlaybackStorageRef =
      (v.file as { playbackStorageBucket?: unknown }).playbackStorageBucket === undefined &&
      (v.file as { playbackStoragePath?: unknown }).playbackStoragePath === undefined
        ? true
        : playbackStorageRef !== null;
    const validPlaybackMime = playbackMime === undefined || typeof playbackMime === "string";
    const validPlaybackKind = playbackKind === undefined || playbackKind === "hls" || playbackKind === "mp4";
    const validPlaybackReadyAt = playbackReadyAt === undefined || typeof playbackReadyAt === "string";
    const validAudioCoverDataUrl =
      audioCoverDataUrl === undefined || (typeof audioCoverDataUrl === "string" && isBase64DataUrl(audioCoverDataUrl));
    const validAudioCoverUrl = audioCoverUrl === undefined || (typeof audioCoverUrl === "string" && isAllowedMediaUrl(audioCoverUrl));
    const validAudioCoverStorageRef =
      (v.file as { audioCoverStorageBucket?: unknown }).audioCoverStorageBucket === undefined &&
      (v.file as { audioCoverStoragePath?: unknown }).audioCoverStoragePath === undefined
        ? true
        : audioCoverStorageRef !== null;
    const validAudioCoverName = audioCoverName === undefined || typeof audioCoverName === "string";
    const validAudioCoverMime = audioCoverMime === undefined || typeof audioCoverMime === "string";
    const validAudioCoverSize =
      audioCoverSize === undefined ||
      (typeof audioCoverSize === "number" && Number.isFinite(audioCoverSize) && audioCoverSize >= 0);
    const validAudioCoverSha256Hex =
      audioCoverSha256Hex === undefined || (typeof audioCoverSha256Hex === "string" && isHex64(audioCoverSha256Hex));
    const validAudioCoverImageVariantStorage =
      audioCoverImageVariantStorage === undefined || coerceProfileOriginalStorageVariantMap(audioCoverImageVariantStorage) !== null;
    const validEpubCoverDataUrl =
      epubCoverDataUrl === undefined || (typeof epubCoverDataUrl === "string" && isBase64DataUrl(epubCoverDataUrl));
    const validEpubCoverUrl = epubCoverUrl === undefined || (typeof epubCoverUrl === "string" && isAllowedMediaUrl(epubCoverUrl));
    const validEpubCoverStorageRef =
      (v.file as { epubCoverStorageBucket?: unknown }).epubCoverStorageBucket === undefined &&
      (v.file as { epubCoverStoragePath?: unknown }).epubCoverStoragePath === undefined
        ? true
        : epubCoverStorageRef !== null;
    const validEpubCoverName = epubCoverName === undefined || typeof epubCoverName === "string";
    const validEpubCoverMime = epubCoverMime === undefined || typeof epubCoverMime === "string";
    const validEpubCoverSize =
      epubCoverSize === undefined ||
      (typeof epubCoverSize === "number" && Number.isFinite(epubCoverSize) && epubCoverSize >= 0);
    const validEpubCoverSha256Hex =
      epubCoverSha256Hex === undefined || (typeof epubCoverSha256Hex === "string" && isHex64(epubCoverSha256Hex));
    const validEpubCoverImageVariantStorage =
      epubCoverImageVariantStorage === undefined || coerceProfileOriginalStorageVariantMap(epubCoverImageVariantStorage) !== null;
    const validImageVariantStorage =
      imageVariantStorage === undefined || coerceProfileOriginalStorageVariantMapFromAny(imageVariantStorage) !== null;
    const validVideoPosterUrl =
      videoPosterUrl === undefined || (typeof videoPosterUrl === "string" && isAllowedMediaUrl(videoPosterUrl));
    const validVideoPosterStorageRef =
      (v.file as { videoPosterStorageBucket?: unknown }).videoPosterStorageBucket === undefined &&
      (v.file as { videoPosterStoragePath?: unknown }).videoPosterStoragePath === undefined
        ? true
        : videoPosterStorageRef !== null;
    const validVideoPosterImageVariants =
      videoPosterImageVariants === undefined ||
      (typeof videoPosterImageVariants === "object" &&
        !Array.isArray(videoPosterImageVariants) &&
        Object.values(videoPosterImageVariants as Record<string, unknown>).every(
          (candidate) => typeof candidate === "string" && isAllowedMediaUrl(candidate),
        ));
    const validVideoPosterImageVariantStorage =
      videoPosterImageVariantStorage === undefined ||
      coerceProfileOriginalStorageVariantMapFromAny(videoPosterImageVariantStorage) !== null;
    const validEpubTitle = epubTitle === undefined || typeof epubTitle === "string";
    const validEpubSubtitle = epubSubtitle === undefined || typeof epubSubtitle === "string";
    const validEpubPrimaryAuthor = epubPrimaryAuthor === undefined || typeof epubPrimaryAuthor === "string";
    const validEpubContributors = epubContributors === undefined || typeof epubContributors === "string";
    const validEpubPublisher = epubPublisher === undefined || typeof epubPublisher === "string";
    const validEpubImprint = epubImprint === undefined || typeof epubImprint === "string";
    const validEpubGenre = epubGenre === undefined || typeof epubGenre === "string";
    const validEpubLanguage = epubLanguage === undefined || typeof epubLanguage === "string";
    const validEpubIsbn = epubIsbn === undefined || typeof epubIsbn === "string";
    const validEpubEdition = epubEdition === undefined || typeof epubEdition === "string";
    const validEpubSeries = epubSeries === undefined || typeof epubSeries === "string";
    const validAudioReleaseTitle = audioReleaseTitle === undefined || typeof audioReleaseTitle === "string";
    const validAudioPrimaryArtist = audioPrimaryArtist === undefined || typeof audioPrimaryArtist === "string";
    const validAudioReleaseType =
      audioReleaseType === undefined ||
      (typeof audioReleaseType === "string" && AUDIO_RELEASE_TYPES.has(audioReleaseType));
    const validAudioGenre = audioGenre === undefined || typeof audioGenre === "string";
    const validAudioSubgenre = audioSubgenre === undefined || typeof audioSubgenre === "string";
    const validAudioExplicit = audioExplicit === undefined || typeof audioExplicit === "boolean";
    const validAudioIsrc = audioIsrc === undefined || typeof audioIsrc === "string";
    const validAudioWriters = audioWriters === undefined || typeof audioWriters === "string";
    const validAudioProducer = audioProducer === undefined || typeof audioProducer === "string";
    const validAudioLabel = audioLabel === undefined || typeof audioLabel === "string";
    const validAudioReleaseDate =
      audioReleaseDate === undefined || (typeof audioReleaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(audioReleaseDate));
    const validAudioTerritories = audioTerritories === undefined || typeof audioTerritories === "string";
    const validProofAttachments = validReceizAnchorProofAttachments(proofAttachments);
    if (
      typeof v.file.name !== "string" ||
      typeof v.file.mime !== "string" ||
      typeof v.file.size !== "number" ||
      !Number.isFinite(v.file.size) ||
      typeof v.file.sha256Hex !== "string" ||
      !isHex64(v.file.sha256Hex) ||
      (dataUrl === undefined &&
        url === undefined &&
        storageRef === null &&
        sealedUrl === undefined &&
        sealedStorageRef === null &&
        sealedProofBundle === undefined &&
        sealedRecordProofBundle === undefined &&
        materialProofUrl === undefined) ||
      !validDataUrl ||
      !validUrl ||
      !validStorageRef ||
      !validAllowOriginalDownload ||
      !validAllowDerivativeDownload ||
      !validAllowMomentRecordDownload ||
      !validAllowCopyDownload ||
      !validGateAudioPlayback ||
      !validOriginalDownloadLimit ||
      !validDerivativeDownloadLimit ||
      !validOriginalDownloadPriceCents ||
      !validDerivativeDownloadPriceCents ||
      !validReceizMs ||
      !validReceizTzMinutesEast ||
      !validSealedName ||
      !validSealedSize ||
      !validSealedMime ||
      !validSealedSha256Hex ||
      !validSealedUrl ||
      !validSealedStorageRef ||
      !validSealedVerifyPath ||
      !validSealedCode ||
      !validSealedPulse ||
      !validSealedTs ||
      !validSealedKind ||
      !validMaterialProofUrl ||
      !validMaterialPayloadSha256Hex ||
      !validSealedProofBundle ||
      !validSealedRecordProofBundle ||
      !validSealedSubjectArt ||
      !validPlaybackUrl ||
      !validPlaybackStorageRef ||
      !validPlaybackMime ||
      !validPlaybackKind ||
      !validPlaybackReadyAt ||
      !validAudioCoverDataUrl ||
      !validAudioCoverUrl ||
      !validAudioCoverStorageRef ||
      !validAudioCoverName ||
      !validAudioCoverMime ||
      !validAudioCoverSize ||
      !validAudioCoverSha256Hex ||
      !validAudioCoverImageVariantStorage ||
      !validEpubCoverDataUrl ||
      !validEpubCoverUrl ||
      !validEpubCoverStorageRef ||
      !validEpubCoverName ||
      !validEpubCoverMime ||
      !validEpubCoverSize ||
      !validEpubCoverSha256Hex ||
      !validEpubCoverImageVariantStorage ||
      !validImageVariantStorage ||
      !validVideoPosterUrl ||
      !validVideoPosterStorageRef ||
      !validVideoPosterImageVariants ||
      !validVideoPosterImageVariantStorage ||
      !validEpubTitle ||
      !validEpubSubtitle ||
      !validEpubPrimaryAuthor ||
      !validEpubContributors ||
      !validEpubPublisher ||
      !validEpubImprint ||
      !validEpubGenre ||
      !validEpubLanguage ||
      !validEpubIsbn ||
      !validEpubEdition ||
      !validEpubSeries ||
      !validAudioReleaseTitle ||
      !validAudioPrimaryArtist ||
      !validAudioReleaseType ||
      !validAudioGenre ||
      !validAudioSubgenre ||
      !validAudioExplicit ||
      !validAudioIsrc ||
      !validAudioWriters ||
      !validAudioProducer ||
      !validAudioLabel ||
      !validAudioReleaseDate ||
      !validAudioTerritories ||
      !validProofAttachments
    ) {
      return null;
    }
  }

  return {
    version: 1,
    parent: { code: v.parent.code, pulse: v.parent.pulse, viewUrl: v.parent.viewUrl },
    anchorId: v.anchorId,
    anchoredAt: v.anchoredAt,
    ...(v.contextPreset ? { contextPreset: v.contextPreset } : {}),
    ...(v.claim ? { claim: v.claim } : {}),
    ...(v.file ? { file: v.file } : {}),
  };
}

export function encodeReceizAnchorBundle(bundle: ReceizAnchorBundle): string {
  return JSON.stringify(bundle);
}

export function decodeReceizAnchorBundle(raw: string): ReceizAnchorBundle | null {
  try {
    return coerceReceizAnchorBundle(JSON.parse(raw));
  } catch {
    return null;
  }
}
