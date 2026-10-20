"use client";

import { admitOwnedProfileAuthority } from "@/app/lib/profile/profileAuthority";
import { buildProfileDeterministicManifest } from "@/app/lib/profile/deterministicFeed";
import type { ProfileCard, ProfileOriginal, ProfileStats, ProfileViewData } from "@/app/lib/profile/types";
import { coerceProfileOriginalLongForm } from "@/app/lib/profile/longForm";
import { parseProfileUsername, usernameFromEmailDefault } from "@/app/lib/profile/username";
import {
  prepareProfileWorkspaceFastEntryHint,
  writeProfileWorkspaceHydrationSeed,
} from "@/app/lib/profile/workspaceHydration";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";
import type { ReceizKeyFile } from "@/app/utils/receizIdentityKey";

import { accountIdentityCreationFromPortableSource } from "./profileIdentityCreationCoordinate";

const PORTABLE_PROFILE_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const VALID_CONTEXT_PRESETS = new Set(["Deposit", "Milestone", "Handoff", "Condition", "Agreement", "Delivery", "Custom"]);
const VALID_PROOF_ATTACHMENT_ROLES = new Set(["source", "appendix", "dataset", "contract", "receipt", "research", "other"]);
type ProfileOriginalMedia = NonNullable<ProfileOriginal["media"]>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const normalized = text(value);
  return normalized ? normalized : null;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = safeNumber(value);
  return parsed === null ? 0 : Math.max(0, Math.trunc(parsed));
}

function safeIso(value: unknown, fallback = PORTABLE_PROFILE_TIMESTAMP): string {
  const raw = text(value);
  const ms = raw ? Date.parse(raw) : Number.NaN;
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : fallback;
}

function durableUrl(value: unknown): string | null {
  const raw = nullableText(value);
  if (!raw) return null;
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return null;
  return raw;
}

function normalizeImageVariants(value: unknown): Record<string, string> | null {
  const record = asRecord(value);
  if (!record) return null;
  const out: Record<string, string> = {};
  for (const [key, url] of Object.entries(record)) {
    const normalizedKey = text(key);
    const normalizedUrl = durableUrl(url);
    if (normalizedKey && normalizedUrl) out[normalizedKey] = normalizedUrl;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function normalizeMaterial(
  value: unknown,
): ProfileOriginalMedia["material"] {
  const material = asRecord(value);
  const authority = asRecord(material?.authority);
  const proofObjectUrl = durableUrl(material?.proofObjectUrl);
  const sealedArtifactSha256Hex = text(material?.sealedArtifactSha256Hex).toLowerCase();
  const payloadSha256Hex = text(material?.payloadSha256Hex).toLowerCase();
  if (
    material?.schema !== "receiz.profile-original.material.v1"
    || !proofObjectUrl
    || !/^[0-9a-f]{64}$/.test(sealedArtifactSha256Hex)
    || !/^[0-9a-f]{64}$/.test(payloadSha256Hex)
    || authority?.urlIsProofAuthority !== false
    || authority?.strongerTruth !== "sealed-receiz-proof-object"
  ) return null;
  return {
    schema: "receiz.profile-original.material.v1",
    proofObjectUrl,
    sealedArtifactSha256Hex,
    payloadSha256Hex,
    authority: {
      urlIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  };
}

function normalizeProofAttachments(value: unknown): ProfileOriginal["attachments"] {
  if (!Array.isArray(value)) return null;
  const attachments = value
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) return null;
      const role = text(record.role);
      const id = text(record.id) || `attachment-${index + 1}`;
      const storage = asRecord(record.storage);
      const storageBucket = text(storage?.bucket);
      const storagePath = text(storage?.path);
      return {
        id,
        role: VALID_PROOF_ATTACHMENT_ROLES.has(role) ? (role as NonNullable<ProfileOriginal["attachments"]>[number]["role"]) : "source",
        name: nullableText(record.name),
        mime: nullableText(record.mime),
        size: safeNumber(record.size),
        sha256Hex: nullableText(record.sha256Hex),
        src: durableUrl(record.src),
        storage: storageBucket && storagePath ? { bucket: storageBucket, path: storagePath } : null,
        downloadName: nullableText(record.downloadName),
        description: nullableText(record.description),
        createdAt: nullableText(record.createdAt),
      };
    })
    .filter((item): item is NonNullable<ProfileOriginal["attachments"]>[number] => Boolean(item));
  return attachments.length > 0 ? attachments : null;
}

function normalizeProfileCard(value: unknown, fallback: ProfileCard | null = null): ProfileCard | null {
  const record = asRecord(value);
  if (!record) return fallback;
  const userId = text(record.userId);
  const username = parseProfileUsername(text(record.username));
  const displayName = text(record.displayName) || username || fallback?.displayName || "";
  if (!userId || !username || !displayName) return fallback;
  return {
    userId,
    username,
    displayName,
    avatarUrl: durableUrl(record.avatarUrl),
    isPrivate: record.isPrivate === true,
  };
}

function normalizeStats(value: unknown, originals: readonly ProfileOriginal[], visibleItemCount: number | null): ProfileStats {
  const stats = asRecord(value);
  const visibleOriginals = originals.filter((original) => original.showOnProfile).length;
  const hiddenOriginals = originals.length - visibleOriginals;
  return {
    followers: nonNegativeInteger(stats?.followers),
    following: nonNegativeInteger(stats?.following),
    originals: Math.max(nonNegativeInteger(stats?.originals), visibleItemCount ?? 0, visibleOriginals),
    signedOriginals: Math.max(
      nonNegativeInteger(stats?.signedOriginals),
      originals.filter((original) => original.hasPbiSignature).length,
    ),
    hiddenOriginals: Math.max(nonNegativeInteger(stats?.hiddenOriginals), hiddenOriginals),
    originalViews: nonNegativeInteger(stats?.originalViews),
    streams: nonNegativeInteger(stats?.streams),
    streamCompletionRatePct: nonNegativeInteger(stats?.streamCompletionRatePct),
    witnessedSeconds: nonNegativeInteger(stats?.witnessedSeconds),
  };
}

function normalizeContextPreset(value: unknown): ProfileOriginal["contextPreset"] {
  const normalized = text(value);
  return VALID_CONTEXT_PRESETS.has(normalized) ? (normalized as ProfileOriginal["contextPreset"]) : null;
}

function normalizeMedia(value: unknown): ProfileOriginal["media"] {
  const media = asRecord(value);
  if (!media) return null;
  const rawKind = text(media.kind);
  const kind: ProfileOriginalMedia["kind"] =
    rawKind === "image" ||
    rawKind === "video" ||
    rawKind === "audio" ||
    rawKind === "pdf" ||
    rawKind === "epub" ||
    rawKind === "file"
      ? rawKind
      : "file";
  return {
    kind,
    src: durableUrl(media.src) ?? "",
    mime: nullableText(media.mime),
    name: nullableText(media.name),
    size: safeNumber(media.size),
    sha256Hex: nullableText(media.sha256Hex),
    originalDownloadSrc: durableUrl(media.originalDownloadSrc),
    originalDownloadName: nullableText(media.originalDownloadName),
    originalDownloadMime: nullableText(media.originalDownloadMime),
    originalDownloadSize: safeNumber(media.originalDownloadSize),
    originalDownloadSha256Hex: nullableText(media.originalDownloadSha256Hex),
    playbackSrc: durableUrl(media.playbackSrc),
    playbackMime: nullableText(media.playbackMime),
    playbackKind: media.playbackKind === "hls" || media.playbackKind === "mp4" ? media.playbackKind : null,
    playbackReadyAt: nullableText(media.playbackReadyAt),
    derivativeDownloadSrc: durableUrl(media.derivativeDownloadSrc),
    derivativeDownloadName: nullableText(media.derivativeDownloadName),
    derivativeDownloadMime: nullableText(media.derivativeDownloadMime),
    derivativeDownloadSize: safeNumber(media.derivativeDownloadSize),
    derivativeDownloadSha256Hex: nullableText(media.derivativeDownloadSha256Hex),
    receiptDownloadSrc: durableUrl(media.receiptDownloadSrc),
    receiptDownloadName: nullableText(media.receiptDownloadName),
    receiptMs: nullableText(media.receiptMs),
    receiptTzMinutesEast: safeNumber(media.receiptTzMinutesEast),
    allowOriginalDownload: media.allowOriginalDownload === true,
    allowDerivativeDownload: media.allowDerivativeDownload === true,
    allowMomentRecordDownload: media.allowMomentRecordDownload === true,
    gateAudioPlayback: media.gateAudioPlayback === true,
    originalDownloadLimit: safeNumber(media.originalDownloadLimit),
    derivativeDownloadLimit: safeNumber(media.derivativeDownloadLimit),
    originalDownloadPriceCents: safeNumber(media.originalDownloadPriceCents),
    derivativeDownloadPriceCents: safeNumber(media.derivativeDownloadPriceCents),
    collectionReleaseAt: nullableText(media.collectionReleaseAt),
    collectionReleasePulse: safeNumber(media.collectionReleasePulse),
    imageVariants: normalizeImageVariants(media.imageVariants),
    videoPosterSrc: durableUrl(media.videoPosterSrc),
    videoPosterMime: nullableText(media.videoPosterMime),
    videoPosterName: nullableText(media.videoPosterName),
    videoPosterImageVariants: normalizeImageVariants(media.videoPosterImageVariants),
    audioCoverSrc: durableUrl(media.audioCoverSrc),
    audioCoverMime: nullableText(media.audioCoverMime),
    audioCoverName: nullableText(media.audioCoverName),
    audioCoverImageVariants: normalizeImageVariants(media.audioCoverImageVariants),
    epubCoverSrc: durableUrl(media.epubCoverSrc),
    epubCoverMime: nullableText(media.epubCoverMime),
    epubCoverName: nullableText(media.epubCoverName),
    epubCoverImageVariants: normalizeImageVariants(media.epubCoverImageVariants),
    epubMetadata: asRecord(media.epubMetadata) as ProfileOriginalMedia["epubMetadata"],
    audioDistribution: asRecord(media.audioDistribution) as ProfileOriginalMedia["audioDistribution"],
    liveMomentCapture: asRecord(media.liveMomentCapture) as ProfileOriginalMedia["liveMomentCapture"],
    objectProof: asRecord(media.objectProof) as ProfileOriginalMedia["objectProof"],
    material: normalizeMaterial(media.material),
  };
}

function normalizeOriginal(value: unknown, ownerCard: ProfileCard, username: string, index: number): ProfileOriginal | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = text(record.id) || text(record.slug) || text(record.code) || `portable-${index}`;
  const slug = text(record.slug) || id;
  const code = text(record.code) || id;
  const createdAt = safeIso(record.createdAt, safeIso(record.ts));
  const verifyPath = text(record.verifyPath) || `/${encodeURIComponent(username)}/verified/${encodeURIComponent(code)}`;
  const proof = asRecord(record.proof);
  return {
    id,
    slug,
    code,
    ownershipKind: text(record.ownershipKind) === "verified" ? "verified" : "creator",
    ownershipRole:
      text(record.ownershipKind) === "creator"
        ? "creator"
        : text(record.ownershipRole) === "verified-possession"
          ? "verified-possession"
          : "current-owner",
    originalCreator: normalizeProfileCard(record.originalCreator, ownerCard),
    contextPreset: normalizeContextPreset(record.contextPreset),
    pulse: nullableText(record.pulse),
    claimHashHex: nullableText(record.claimHashHex),
    recordMediaSha256Hex: nullableText(record.recordMediaSha256Hex),
    recordCardMediaSha256Hex: nullableText(record.recordCardMediaSha256Hex),
    claim: text(record.claim) || "Receiz original",
    longForm: coerceProfileOriginalLongForm(record.longForm),
    attachments: normalizeProofAttachments(record.attachments),
    verifyPath,
    verifyUrl: text(record.verifyUrl) || verifyPath,
    createdAt,
    ts: text(record.ts) || createdAt,
    showOnProfile: record.showOnProfile !== false,
    historical: null,
    hasPbiSignature: record.hasPbiSignature === true,
    pbiReceiptHash: nullableText(record.pbiReceiptHash),
    signedArtifactDownloadUrl: durableUrl(record.signedArtifactDownloadUrl),
    proof: {
      circuit: "Groth16",
      groth16Id: nullableText(proof?.groth16Id),
      poseidon: nullableText(proof?.poseidon),
    },
    marketPreview: null,
    media: normalizeMedia(record.media),
  };
}

function portableOriginals(snapshot: Record<string, unknown>, ownerCard: ProfileCard, username: string): ProfileOriginal[] {
  const manifest = asRecord(snapshot.originalsManifest);
  const manifestOriginals = Array.isArray(manifest?.originals) ? manifest.originals : null;
  const rawOriginals = manifestOriginals ?? (Array.isArray(snapshot.originals) ? snapshot.originals : []);
  return rawOriginals
    .map((original, index) => normalizeOriginal(original, ownerCard, username, index))
    .filter((original): original is ProfileOriginal => Boolean(original));
}

export function buildProfileViewFromReceizKeyPortableState(
  keyFile: ReceizKeyFile,
): { profile: ProfileViewData; viewerEmail: string | null } | null {
  const envelope = keyFile.portableState;
  const snapshot = asRecord(envelope?.snapshot);
  if (!snapshot) return null;

  const account = asRecord(snapshot.account);
  const profileBlock = asRecord(snapshot.profile);
  const userId = text(profileBlock?.userId) || text(account?.userId) || text(keyFile.owner.uid);
  if (!userId) return null;
  const accountCreation = accountIdentityCreationFromPortableSource({ ownerUserId: keyFile.owner.uid, profileUserId: userId, snapshot });

  const viewerEmail = nullableText(account?.email) ?? keyFile.owner.email ?? null;
  const completeProfileView = asRecord(snapshot.profileView);
  const completeProfileCard = asRecord(completeProfileView?.profile);
  const completeOriginalsPage = asRecord(completeProfileView?.originalsPage);
  const completeStats = asRecord(completeProfileView?.stats);
  const completeStatsOriginals = safeNumber(completeStats?.originals);
  if (
    completeProfileView &&
    completeProfileCard &&
    text(completeProfileCard.userId) === userId &&
    userId === keyFile.owner.uid &&
    Array.isArray(completeProfileView.originals) &&
    completeOriginalsPage &&
    typeof completeOriginalsPage.hasMore === "boolean" &&
    completeStatsOriginals !== null
  ) {
    const carried = completeProfileView as unknown as ProfileViewData;
    const carriedPbiReceiptHash =
      nullableText(carried.profile.authorshipPbiReceiptHash)
      ?? keyFile.attestation?.pbiReceiptHash
      ?? null;
    const loadedVisibleOriginals = carried.originals.filter((original) => original.showOnProfile).length;
    const carriedHasMore = carried.originalsPage.hasMore || loadedVisibleOriginals < completeStatsOriginals;
    const profile: ProfileViewData = {
      ...carried,
      profile: {
        ...carried.profile,
        ...(accountCreation ?? {}),
        authorshipVerified: carried.profile.authorshipVerified === true || Boolean(carriedPbiReceiptHash),
        authorshipPbiReceiptHash: carriedPbiReceiptHash,
      },
      viewer: {
        ...carried.viewer,
        isSignedIn: true,
        isOwner: true,
        canEdit: true,
        canView: true,
        connection: "self",
      },
      originalsPage: {
        ...carried.originalsPage,
        hasMore: carriedHasMore,
      },
    };
    return {
      profile: {
        ...profile,
        deterministicManifest: buildProfileDeterministicManifest(profile),
      },
      viewerEmail,
    };
  }

  const username =
    parseProfileUsername(text(profileBlock?.username)) ??
    parseProfileUsername(text(account?.username)) ??
    parseProfileUsername(keyFile.owner.username ?? "") ??
    usernameFromEmailDefault(viewerEmail ?? "", userId);
  if (!username) return null;

  const displayName =
    text(profileBlock?.displayName) ||
    text(account?.displayName) ||
    text(keyFile.owner.displayName) ||
    username;
  const ownerCard: ProfileCard = {
    userId,
    username,
    displayName,
    avatarUrl: durableUrl(profileBlock?.avatarUrl),
    isPrivate: profileBlock?.isPrivate === true,
  };
  const originals = portableOriginals(snapshot, ownerCard, username);
  const manifest = asRecord(snapshot.originalsManifest);
  const visibleItemCount = safeNumber(manifest?.visibleItemCount);
  const exportedItemCount = safeNumber(manifest?.exportedItemCount);
  const stats = normalizeStats(snapshot.stats, originals, visibleItemCount);
  const loadedVisibleOriginals = originals.filter((original) => original.showOnProfile).length;
  const hasMore =
    (exportedItemCount !== null && visibleItemCount !== null && exportedItemCount < visibleItemCount) ||
    loadedVisibleOriginals < stats.originals;
  const createdAt = accountCreation?.createdAt ?? PORTABLE_PROFILE_TIMESTAMP;
  const updatedAt = safeIso(profileBlock?.updatedAt, createdAt);
  const authorshipPbiReceiptHash = nullableText(profileBlock?.authorshipPbiReceiptHash) ?? keyFile.attestation?.pbiReceiptHash ?? null;
  const profile: ProfileViewData = {
    profile: {
      userId,
      username,
      displayName,
      bio: nullableText(profileBlock?.bio),
      location: nullableText(profileBlock?.location),
      websiteUrl: nullableText(profileBlock?.websiteUrl),
      socialXUrl: nullableText(profileBlock?.socialXUrl),
      socialInstagramUrl: nullableText(profileBlock?.socialInstagramUrl),
      socialYoutubeUrl: nullableText(profileBlock?.socialYoutubeUrl),
      socialLinkedinUrl: nullableText(profileBlock?.socialLinkedinUrl),
      socialGithubUrl: nullableText(profileBlock?.socialGithubUrl),
      avatarUrl: durableUrl(profileBlock?.avatarUrl),
      bannerUrl: durableUrl(profileBlock?.bannerUrl),
      isPrivate: profileBlock?.isPrivate === true,
      showSchedulerButton: profileBlock?.showSchedulerButton === true,
      guidedSetupCompletedAt: nullableText(profileBlock?.guidedSetupCompletedAt),
      createdAt,
      creationKaiMicroPulse: accountCreation?.creationKaiMicroPulse ?? null,
      creationKaiSource: accountCreation?.creationKaiSource ?? null,
      updatedAt,
      lastSealedAt: nullableText(profileBlock?.lastSealedAt),
      lastSealedPulse: nullableText(profileBlock?.lastSealedPulse),
      authorshipVerified: profileBlock?.authorshipVerified === true || Boolean(authorshipPbiReceiptHash),
      authorshipPbiReceiptHash,
      creationSigilBalancePhiMicro: nullableText(profileBlock?.creationSigilBalancePhiMicro),
      creationSigilBalanceUsd: nullableText(profileBlock?.creationSigilBalanceUsd),
    },
    viewer: {
      isSignedIn: true,
      isOwner: true,
      canEdit: true,
      canView: true,
      isFollowing: false,
      followsYou: false,
      connection: "self",
    },
    stats,
    feedExperimentAnalytics: null,
    glyphValuationRollup: null,
    followers: [],
    following: [],
    originals,
    originalsPage: {
      pageSize: Math.max(24, originals.length),
      hasMore,
      nextCursor: null,
    },
  };

  return {
    profile: {
      ...profile,
      deterministicManifest: buildProfileDeterministicManifest(profile),
    },
    viewerEmail,
  };
}

export function projectReceizKeyPortableProfileTruth(
  keyFile: ReceizKeyFile,
  options?: { allowSessionSwitch?: boolean },
): { profile: ProfileViewData; viewerEmail: string | null } | null {
  const seed = buildProfileViewFromReceizKeyPortableState(keyFile);
  if (!seed) return null;
  const session = peekSessionBootstrapSnapshot(true);
  if (session?.uid && session.uid !== seed.profile.profile.userId && options?.allowSessionSwitch !== true) return null;

  writeProfileWorkspaceHydrationSeed(seed);
  admitOwnedProfileAuthority(seed);
  prepareProfileWorkspaceFastEntryHint();
  return seed;
}
