import type { SportsArenaLiveAppendSubjectRole } from "@/app/lib/game/sportsArena";

export const RECEIZ_SPORTS_ARENA_EVENT_MEDIA_SCHEMA = "receiz.sports_arena.event_media_clip.v1";
export const RECEIZ_SPORTS_ARENA_RECORDED_EVENT_VIDEO_SCHEMA = "receiz.sports_arena.event_recorded_video.v1";

export type SportsArenaEventMediaTelemetry = {
  pitchType: string | null;
  pitchCall: string | null;
  pitchSpeedMph: number | null;
  exitVelocityMph: number | null;
  launchAngleDeg: number | null;
  distanceFt: number | null;
  hitTrajectory: string | null;
  hitHardness: string | null;
  hitLocation: string | null;
  pitchCoordinateX: number | null;
  pitchCoordinateY: number | null;
  hitCoordinateX: number | null;
  hitCoordinateY: number | null;
};

export type SportsArenaRecordedEventVideoOffsetBasis = {
  kind: "mlb-play-window" | "ufc-fight-window";
  gameStartTime: string;
  eventStartTime: string;
  eventEndTime: string;
  preRollMs: number;
  postRollMs: number;
};

export type SportsArenaRecordedEventVideo = {
  schema: typeof RECEIZ_SPORTS_ARENA_RECORDED_EVENT_VIDEO_SCHEMA;
  source: "mlb-statsapi-content" | "mlb-statsapi-game-video-offset" | "ufc-event-feed-content";
  sourceUrl: string;
  contentPath: string;
  contentId: string;
  contentHash: string;
  title: string;
  description: string | null;
  duration: string | null;
  durationMs: number | null;
  playbackStartOffsetMs: number | null;
  playbackEndOffsetMs: number | null;
  playbackUrl: string;
  playbackName: string;
  mimeType: "video/mp4" | "application/vnd.apple.mpegurl";
  posterUrl: string | null;
  thumbnailUrl: string | null;
  keywords: string[];
  matchedBy: string[];
  fetchedAt: string;
  offsetBasis: SportsArenaRecordedEventVideoOffsetBasis | null;
  exactMomentBasis: {
    gamePk: string;
    playId: string;
    mediaPlayId: string;
    eventKey: string;
    subjectPersonId: string;
    eventType: string;
    sourceSnapshotHash: string;
  };
};

export type SportsArenaEventMediaClip = {
  schema: typeof RECEIZ_SPORTS_ARENA_EVENT_MEDIA_SCHEMA;
  kind: "deterministic-proof-clip";
  playbackType: "proof-motion";
  mediaId: string;
  mediaHash: string;
  durationMs: number;
  startOffsetMs: number;
  endOffsetMs: number;
  source: "mlb-statsapi" | "fifa-world-cup-26" | "ufc-event-feed";
  sourceUrl: string;
  sourceDate: string;
  sourceSnapshotHash: string;
  gamePk: string;
  playId: string;
  eventKey: string;
  observedAt: string;
  appendHash: string | null;
  proofHash: string | null;
  collectibleId: string;
  claimHash: string;
  cardId: string;
  subjectName: string;
  subjectRole: SportsArenaLiveAppendSubjectRole;
  subjectPersonId: string;
  teamCode: string | null;
  opponentCode: string | null;
  eventType: string;
  eventLabel: string;
  eventDetail: string;
  inning: string | null;
  scoreDelta: number;
  posterLabel: string;
  alt: string;
  emotionalCue: string;
  recordedVideo: SportsArenaRecordedEventVideo | null;
  relatedVideos: SportsArenaRecordedEventVideo[];
  telemetry: SportsArenaEventMediaTelemetry;
};

type HashJson = (value: unknown) => string;

type SportsArenaEventMediaMaterial = Omit<
  SportsArenaEventMediaClip,
  | "playbackType"
  | "mediaId"
  | "mediaHash"
  | "durationMs"
  | "startOffsetMs"
  | "endOffsetMs"
  | "appendHash"
  | "proofHash"
  | "posterLabel"
  | "alt"
  | "emotionalCue"
>;

type SportsArenaRecordedEventVideoMaterial = Omit<SportsArenaRecordedEventVideo, "contentHash">;

type BuildSportsArenaRecordedEventVideoArgs = {
  hashJson: HashJson;
  source?: SportsArenaRecordedEventVideo["source"];
  sourceUrl?: string;
  contentPath?: string;
  contentId?: string;
  title?: string;
  description?: string | null;
  duration?: string | null;
  durationMs?: number | null;
  playbackStartOffsetMs?: number | null;
  playbackEndOffsetMs?: number | null;
  playbackUrl?: string;
  playbackName?: string;
  mimeType?: string;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  keywords?: string[];
  matchedBy?: string[];
  fetchedAt?: string;
  offsetBasis?: SportsArenaRecordedEventVideoOffsetBasis | null;
  exactMomentBasis: {
    gamePk?: string;
    playId?: string;
    mediaPlayId?: string;
    eventKey?: string;
    subjectPersonId?: string;
    eventType?: string;
    sourceSnapshotHash?: string;
  };
};

type BuildSportsArenaEventMediaClipArgs = {
  hashJson: HashJson;
  sourceProof: {
    source?: SportsArenaEventMediaClip["source"];
    sourceUrl?: string;
    sourceDate?: string;
    gamePk?: string;
    playId?: string;
    eventKey?: string;
    observedAt?: string;
    sourceSnapshotHash?: string;
  };
  basis: {
    collectibleId?: string;
    claimHash?: string;
    cardId?: string;
  };
  subject: {
    role?: string;
    personId?: string;
    name?: string;
    teamCode?: string | null;
    opponentCode?: string | null;
  };
  event: {
    type?: string;
    label?: string;
    detail?: string;
    inning?: string | null;
    metrics?: unknown;
  };
  scoring: {
    scoreDelta?: number;
  };
  appendHash?: string | null;
  proofHash?: string | null;
  recordedVideo?: SportsArenaRecordedEventVideo | null;
  relatedVideos?: SportsArenaRecordedEventVideo[];
};

export type SportsArenaRecordedEventMomentBasis = {
  gamePk?: unknown;
  playId?: unknown;
  mediaPlayId?: unknown;
  eventKey?: unknown;
  subjectPersonId?: unknown;
  eventType?: unknown;
  sourceSnapshotHash?: unknown;
};

export type SportsArenaRecordedEventTextMomentBasis = {
  gamePk?: unknown;
  subjectPersonId?: unknown;
  subjectName?: unknown;
  eventType?: unknown;
  eventDetail?: unknown;
};

const HEX64_RE = /^[0-9a-f]{64}$/i;
const MEDIA_ID_RE = /^sem_[0-9a-f]{24}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown): string | null {
  const clean = stringValue(value);
  return clean || null;
}

function httpsUrlValue(value: unknown): string {
  const clean = stringValue(value);
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) return Number(value.trim());
  return null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((entry) => stringValue(entry)).filter(Boolean))).slice(0, 40);
}

function normalizeRole(value: unknown): SportsArenaEventMediaClip["subjectRole"] {
  return value === "pitcher" || value === "fielder" || value === "runner" || value === "player" || value === "goalkeeper" || value === "fighter" ? value : "batter";
}

function normalizeRecordedVideoMime(value: unknown, playbackUrl: string): SportsArenaRecordedEventVideo["mimeType"] {
  const clean = stringValue(value).toLowerCase();
  if (clean === "application/vnd.apple.mpegurl") return "application/vnd.apple.mpegurl";
  if (/\.m3u8(?:$|\?)/i.test(playbackUrl)) return "application/vnd.apple.mpegurl";
  return "video/mp4";
}

function normalizeRecordedVideoSource(value: unknown): SportsArenaRecordedEventVideo["source"] {
  if (value === "ufc-event-feed-content") return "ufc-event-feed-content";
  return value === "mlb-statsapi-game-video-offset" ? "mlb-statsapi-game-video-offset" : "mlb-statsapi-content";
}

function normalizeEventMediaSource(value: unknown): SportsArenaEventMediaClip["source"] {
  if (value === "fifa-world-cup-26") return "fifa-world-cup-26";
  return value === "ufc-event-feed" ? "ufc-event-feed" : "mlb-statsapi";
}

function durationMsFromText(value: unknown): number | null {
  const clean = stringValue(value);
  if (!clean) return null;
  const parts = clean.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  const seconds = parts.length === 3
    ? (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
    : parts.length === 2
      ? (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
      : parts[0] ?? 0;
  return seconds > 0 ? seconds * 1000 : null;
}

function nonNegativeMsValue(value: unknown): number | null {
  const numeric = numberValue(value);
  if (numeric === null || numeric < 0) return null;
  return Math.trunc(numeric);
}

function isoTimeValue(value: unknown): string {
  const clean = stringValue(value);
  const parsed = Date.parse(clean);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function recordedVideoOffsetBasisFromValue(value: unknown): SportsArenaRecordedEventVideoOffsetBasis | null {
  if (!isRecord(value) || (value.kind !== "mlb-play-window" && value.kind !== "ufc-fight-window")) return null;
  const gameStartTime = isoTimeValue(value.gameStartTime);
  const eventStartTime = isoTimeValue(value.eventStartTime);
  const eventEndTime = isoTimeValue(value.eventEndTime);
  const preRollMs = nonNegativeMsValue(value.preRollMs);
  const postRollMs = nonNegativeMsValue(value.postRollMs);
  if (!gameStartTime || !eventStartTime || !eventEndTime || preRollMs === null || postRollMs === null) return null;
  return {
    kind: value.kind,
    gameStartTime,
    eventStartTime,
    eventEndTime,
    preRollMs,
    postRollMs,
  };
}

function titleCaseEvent(value: string): string {
  const clean = value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.replace(/\b\w/g, (char) => char.toUpperCase()) : "MLB event";
}

function normalizeRecordedVideoSearchText(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function recordedVideoSearchTerms(value: string): string[] {
  return Array.from(new Set(normalizeRecordedVideoSearchText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 3 && !["the", "and", "for", "with"].includes(term))));
}

function recordedVideoTermPattern(term: string): RegExp {
  return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i");
}

function recordedVideoEventTerms(eventType: string): string[] {
  const terms = recordedVideoSearchTerms(eventType);
  if (/home_run/i.test(eventType)) return [...terms, "homer", "homers"];
  if (/strikeout|strike_out/i.test(eventType)) return [...terms, "strikeout", "strikeouts", "strikes"];
  if (/double/i.test(eventType)) return [...terms, "double", "doubles"];
  if (/triple/i.test(eventType)) return [...terms, "triple", "triples"];
  if (/single/i.test(eventType)) return [...terms, "single", "singles"];
  return terms;
}

function recordedVideoSemanticEventMatch(eventType: string, haystack: string): boolean {
  if (/home_run/i.test(eventType)) return /\b(?:home[- ]runs?|homers?|hr)\b/i.test(haystack);
  if (/strikeout|strike_out/i.test(eventType)) return /\b(?:strikeouts?|strikes out|fans?|punches out|k's)\b/i.test(haystack);
  if (/double/i.test(eventType)) return /\bdoubles?\b/i.test(haystack);
  if (/triple/i.test(eventType)) return /\btriples?\b/i.test(haystack);
  if (/single/i.test(eventType)) return /\bsingles?\b(?![- ](?:game|season))/i.test(haystack);
  if (/\b(?:walk|intent_walk)\b/i.test(eventType)) return /\b(?:walks?|walked)\b(?![- ]off)|\bbase on balls\b/i.test(haystack);
  if (/hit_by_pitch/i.test(eventType)) return /\b(?:hit by pitch|hbp)\b/i.test(haystack);
  return recordedVideoEventTerms(eventType).some((term) => recordedVideoTermPattern(term).test(haystack));
}

export function sportsArenaVideoTextCarriesStrikeout(text: string): boolean {
  return /\b(?:strikeouts?|strikes out|struck out|out on strikes|called out on strikes|called strike three|swinging strike three|fans?|punches out|k's)\b/i.test(text);
}

export function sportsArenaRecordedVideoContradictsEventType(video: SportsArenaRecordedEventVideo, eventType: string): boolean {
  const cleanEventType = eventType.trim().toLowerCase();
  if (!cleanEventType || /strikeout|strike_out/.test(cleanEventType)) return false;
  return sportsArenaVideoTextCarriesStrikeout(`${video.title} ${video.description ?? ""}`);
}

function sameMomentValue(actual: string, expected: unknown): boolean {
  const clean = stringValue(expected);
  return !clean || actual === clean;
}

function sameOptionalMomentValue(actual: string, expected: unknown): boolean {
  const clean = stringValue(expected);
  return !actual || !clean || actual === clean;
}

function sameMomentHash(actual: string, expected: unknown): boolean {
  const clean = stringValue(expected).toLowerCase();
  return !clean || actual === clean;
}

function hasSubjectEventDetailExactEvidence(markers: Set<string>): boolean {
  const hasSubject = markers.has("player-keyword") || markers.has("player-title");
  return hasSubject && markers.has("event-term") && markers.has("event-detail");
}

function hasExactMomentEvidence(markers: Set<string>): boolean {
  return markers.has("media-play-id") ||
    markers.has("full-game-offset") ||
    markers.has("event-detail-exact") ||
    markers.has("event-title-exact") ||
    hasSubjectEventDetailExactEvidence(markers);
}

function recordedVideoLooksBroadCollection(video: SportsArenaRecordedEventVideo): boolean {
  const text = `${video.title} ${video.description ?? ""}`.toLowerCase();
  return /\b(?:condensed|recap|top plays?|game story|full highlights?|game highlights?)\b/i.test(text);
}

export function sportsArenaRecordedEventVideoTextMatchesMoment(video: SportsArenaRecordedEventVideo, basis: SportsArenaRecordedEventTextMomentBasis): boolean {
  const gamePk = stringValue(basis.gamePk);
  if (gamePk && video.exactMomentBasis.gamePk && video.exactMomentBasis.gamePk !== gamePk) return false;
  if (recordedVideoLooksBroadCollection(video)) return false;

  const eventType = stringValue(basis.eventType);
  const subjectName = stringValue(basis.subjectName);
  const subjectPersonId = stringValue(basis.subjectPersonId);
  const eventDetail = stringValue(basis.eventDetail);
  if (!eventType || !subjectName) return false;

  const keywordText = normalizeRecordedVideoSearchText(video.keywords.join(" "));
  const keywordSet = new Set(video.keywords.map(normalizeRecordedVideoSearchText));
  const titleText = normalizeRecordedVideoSearchText(video.title);
  const bodyText = normalizeRecordedVideoSearchText(`${video.title} ${video.description ?? ""} ${keywordText}`);
  const subjectTerms = recordedVideoSearchTerms(subjectName);
  const eventTerms = new Set(recordedVideoEventTerms(eventType));
  const hasSubjectKeyword = Boolean(subjectPersonId && (keywordSet.has(subjectPersonId) || keywordSet.has(`playerid-${subjectPersonId}`)));
  const hasSubjectText = subjectTerms.length > 0 && subjectTerms.every((term) => recordedVideoTermPattern(term).test(bodyText));
  if (!hasSubjectKeyword && !hasSubjectText) return false;

  const hasEvent = recordedVideoSemanticEventMatch(eventType, bodyText);
  if (!hasEvent) return false;

  const detailTerms = recordedVideoSearchTerms(eventDetail)
    .filter((term) => !subjectTerms.includes(term) && !eventTerms.has(term));
  const exactDetailThreshold = detailTerms.length >= 4 ? 3 : detailTerms.length >= 2 ? 2 : 0;
  const exactDetailMatchCount = detailTerms.filter((term) => recordedVideoTermPattern(term).test(bodyText)).length;
  if (exactDetailThreshold > 0 && exactDetailMatchCount >= exactDetailThreshold) return true;

  const hasTitleSubject = subjectTerms.length > 0 && subjectTerms.every((term) => recordedVideoTermPattern(term).test(titleText));
  const hasTitleEvent = recordedVideoSemanticEventMatch(eventType, titleText);
  return (hasSubjectKeyword || hasTitleSubject) && hasTitleEvent;
}

function uniqueRecordedEventVideos(videos: SportsArenaRecordedEventVideo[]): SportsArenaRecordedEventVideo[] {
  const out: SportsArenaRecordedEventVideo[] = [];
  const seen = new Set<string>();
  for (const video of videos) {
    const key = video.contentHash || video.playbackUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(video);
  }
  return out;
}

function recordedEventVideosFromValue(value: unknown): SportsArenaRecordedEventVideo[] {
  if (!Array.isArray(value)) return [];
  return uniqueRecordedEventVideos(value.map(sportsArenaRecordedEventVideoFromValue).filter((video): video is SportsArenaRecordedEventVideo => Boolean(video)));
}

function appendRelatedVideos(videos: SportsArenaRecordedEventVideo[], video: SportsArenaRecordedEventVideo | null): SportsArenaRecordedEventVideo[] {
  return uniqueRecordedEventVideos(video ? [...videos, video] : videos);
}

export function buildSportsArenaRecordedEventVideo(args: BuildSportsArenaRecordedEventVideoArgs): SportsArenaRecordedEventVideo | null {
  const sourceUrl = httpsUrlValue(args.sourceUrl);
  const playbackUrl = httpsUrlValue(args.playbackUrl);
  if (!sourceUrl || !playbackUrl) return null;
  const source = normalizeRecordedVideoSource(args.source);
  const playbackStartOffsetMs = source === "mlb-statsapi-game-video-offset" ? nonNegativeMsValue(args.playbackStartOffsetMs) : null;
  const playbackEndOffsetMs = source === "mlb-statsapi-game-video-offset" ? nonNegativeMsValue(args.playbackEndOffsetMs) : null;
  const offsetBasis = source === "mlb-statsapi-game-video-offset" ? recordedVideoOffsetBasisFromValue(args.offsetBasis) : null;
  if (
    source === "mlb-statsapi-game-video-offset" &&
    (playbackStartOffsetMs === null || playbackEndOffsetMs === null || playbackEndOffsetMs <= playbackStartOffsetMs || !offsetBasis)
  ) {
    return null;
  }
  const material: SportsArenaRecordedEventVideoMaterial = {
    schema: RECEIZ_SPORTS_ARENA_RECORDED_EVENT_VIDEO_SCHEMA,
    source,
    sourceUrl,
    contentPath: stringValue(args.contentPath),
    contentId: stringValue(args.contentId),
    title: stringValue(args.title) || "Recorded event video",
    description: nullableText(args.description),
    duration: nullableText(args.duration),
    durationMs: numberValue(args.durationMs) ?? durationMsFromText(args.duration),
    playbackStartOffsetMs,
    playbackEndOffsetMs,
    playbackUrl,
    playbackName: stringValue(args.playbackName) || "mp4Avc",
    mimeType: normalizeRecordedVideoMime(args.mimeType, playbackUrl),
    posterUrl: httpsUrlValue(args.posterUrl) || null,
    thumbnailUrl: httpsUrlValue(args.thumbnailUrl) || null,
    keywords: stringList(args.keywords),
    matchedBy: stringList(args.matchedBy),
    fetchedAt: stringValue(args.fetchedAt),
    offsetBasis,
    exactMomentBasis: {
      gamePk: stringValue(args.exactMomentBasis.gamePk),
      playId: stringValue(args.exactMomentBasis.playId),
      mediaPlayId: stringValue(args.exactMomentBasis.mediaPlayId),
      eventKey: stringValue(args.exactMomentBasis.eventKey),
      subjectPersonId: stringValue(args.exactMomentBasis.subjectPersonId),
      eventType: stringValue(args.exactMomentBasis.eventType),
      sourceSnapshotHash: stringValue(args.exactMomentBasis.sourceSnapshotHash).toLowerCase(),
    },
  };
  return {
    ...material,
    contentHash: args.hashJson(material),
  };
}

export function sportsArenaRecordedEventVideoFromValue(value: unknown): SportsArenaRecordedEventVideo | null {
  if (!isRecord(value) || value.schema !== RECEIZ_SPORTS_ARENA_RECORDED_EVENT_VIDEO_SCHEMA) return null;
  const sourceUrl = httpsUrlValue(value.sourceUrl);
  const playbackUrl = httpsUrlValue(value.playbackUrl);
  const contentHash = stringValue(value.contentHash).toLowerCase();
  const basis = isRecord(value.exactMomentBasis) ? value.exactMomentBasis : {};
  if (!sourceUrl || !playbackUrl || !HEX64_RE.test(contentHash)) return null;
  const source = normalizeRecordedVideoSource(value.source);
  const playbackStartOffsetMs = source === "mlb-statsapi-game-video-offset" ? nonNegativeMsValue(value.playbackStartOffsetMs) : null;
  const playbackEndOffsetMs = source === "mlb-statsapi-game-video-offset" ? nonNegativeMsValue(value.playbackEndOffsetMs) : null;
  const offsetBasis = source === "mlb-statsapi-game-video-offset" ? recordedVideoOffsetBasisFromValue(value.offsetBasis) : null;
  if (
    source === "mlb-statsapi-game-video-offset" &&
    (playbackStartOffsetMs === null || playbackEndOffsetMs === null || playbackEndOffsetMs <= playbackStartOffsetMs || !offsetBasis)
  ) {
    return null;
  }
  return {
    schema: RECEIZ_SPORTS_ARENA_RECORDED_EVENT_VIDEO_SCHEMA,
    source,
    sourceUrl,
    contentPath: stringValue(value.contentPath),
    contentId: stringValue(value.contentId),
    contentHash,
    title: stringValue(value.title) || "Recorded event video",
    description: nullableText(value.description),
    duration: nullableText(value.duration),
    durationMs: numberValue(value.durationMs) ?? durationMsFromText(value.duration),
    playbackStartOffsetMs,
    playbackEndOffsetMs,
    playbackUrl,
    playbackName: stringValue(value.playbackName) || "mp4Avc",
    mimeType: normalizeRecordedVideoMime(value.mimeType, playbackUrl),
    posterUrl: httpsUrlValue(value.posterUrl) || null,
    thumbnailUrl: httpsUrlValue(value.thumbnailUrl) || null,
    keywords: stringList(value.keywords),
    matchedBy: stringList(value.matchedBy),
    fetchedAt: stringValue(value.fetchedAt),
    offsetBasis,
    exactMomentBasis: {
      gamePk: stringValue(basis.gamePk),
      playId: stringValue(basis.playId),
      mediaPlayId: stringValue(basis.mediaPlayId),
      eventKey: stringValue(basis.eventKey),
      subjectPersonId: stringValue(basis.subjectPersonId),
      eventType: stringValue(basis.eventType),
      sourceSnapshotHash: stringValue(basis.sourceSnapshotHash).toLowerCase(),
    },
  };
}

export function sportsArenaRecordedEventVideoMatchesMoment(video: SportsArenaRecordedEventVideo, basis: SportsArenaRecordedEventMomentBasis): boolean {
  const markers = new Set(video.matchedBy.map((marker) => marker.trim()).filter(Boolean));
  const videoBasis = video.exactMomentBasis;
  const basisMatches =
    sameMomentValue(videoBasis.gamePk, basis.gamePk) &&
    sameMomentValue(videoBasis.playId, basis.playId) &&
    sameOptionalMomentValue(videoBasis.mediaPlayId, basis.mediaPlayId) &&
    sameMomentValue(videoBasis.eventKey, basis.eventKey) &&
    sameMomentValue(videoBasis.subjectPersonId, basis.subjectPersonId) &&
    sameMomentValue(videoBasis.eventType, basis.eventType) &&
    sameMomentHash(videoBasis.sourceSnapshotHash, basis.sourceSnapshotHash);
  if (!basisMatches) return false;
  if (
    video.source === "mlb-statsapi-game-video-offset" &&
    markers.has("full-game-offset") &&
    markers.has("play-window") &&
    video.playbackStartOffsetMs !== null &&
    video.playbackEndOffsetMs !== null &&
    video.playbackEndOffsetMs > video.playbackStartOffsetMs &&
    video.offsetBasis?.kind === "mlb-play-window"
  ) {
    return true;
  }
  if (!hasExactMomentEvidence(markers)) return false;
  if (markers.has("media-play-id")) return true;
  const hasTextExactEvidence = markers.has("event-detail-exact") ||
    markers.has("event-title-exact") ||
    hasSubjectEventDetailExactEvidence(markers);
  return hasTextExactEvidence && !recordedVideoLooksBroadCollection(video);
}

export function sportsArenaEventMediaClipForMoment(media: SportsArenaEventMediaClip, basis: SportsArenaRecordedEventMomentBasis): SportsArenaEventMediaClip {
  const exactRelatedVideo = media.relatedVideos.find((video) => sportsArenaRecordedEventVideoMatchesMoment(video, basis)) ?? null;
  if (!media.recordedVideo) {
    return {
      ...media,
      recordedVideo: exactRelatedVideo,
      relatedVideos: uniqueRecordedEventVideos(media.relatedVideos),
    };
  }
  if (sportsArenaRecordedEventVideoMatchesMoment(media.recordedVideo, basis)) {
    return {
      ...media,
      relatedVideos: uniqueRecordedEventVideos(media.relatedVideos),
    };
  }
  return {
    ...media,
    recordedVideo: exactRelatedVideo,
    relatedVideos: appendRelatedVideos(media.relatedVideos, media.recordedVideo),
  };
}

function eventTelemetry(value: unknown): SportsArenaEventMediaTelemetry {
  const metrics = isRecord(value) ? value : {};
  return {
    pitchType: nullableText(metrics.pitchType),
    pitchCall: nullableText(metrics.pitchCall),
    pitchSpeedMph: numberValue(metrics.pitchSpeedMph),
    exitVelocityMph: numberValue(metrics.exitVelocityMph),
    launchAngleDeg: numberValue(metrics.launchAngleDeg),
    distanceFt: numberValue(metrics.distanceFt),
    hitTrajectory: nullableText(metrics.hitTrajectory),
    hitHardness: nullableText(metrics.hitHardness),
    hitLocation: nullableText(metrics.hitLocation),
    pitchCoordinateX: numberValue(metrics.pitchCoordinateX),
    pitchCoordinateY: numberValue(metrics.pitchCoordinateY),
    hitCoordinateX: numberValue(metrics.hitCoordinateX),
    hitCoordinateY: numberValue(metrics.hitCoordinateY),
  };
}

function emotionalCue(scoreDelta: number, eventType: string): string {
  if (/home_run/i.test(eventType)) return "The card changed on this swing.";
  if (scoreDelta >= 4) return "The proof turned pressure into memory.";
  if (scoreDelta > 0) return "The moment moved the card forward.";
  if (scoreDelta < 0) return "The card carries the cost of this moment.";
  return "The event is held in the card record.";
}

export function buildSportsArenaEventMediaClip(args: BuildSportsArenaEventMediaClipArgs): SportsArenaEventMediaClip {
  const sourceSnapshotHash = stringValue(args.sourceProof.sourceSnapshotHash);
  const eventType = stringValue(args.event.type) || "mlb_event";
  const eventLabel = stringValue(args.event.label) || titleCaseEvent(eventType);
  const subjectName = stringValue(args.subject.name) || "MLB player";
  const scoreDelta = numberValue(args.scoring.scoreDelta) ?? 0;
  const material: SportsArenaEventMediaMaterial = {
    schema: RECEIZ_SPORTS_ARENA_EVENT_MEDIA_SCHEMA,
    kind: "deterministic-proof-clip",
    source: normalizeEventMediaSource(args.sourceProof.source),
    sourceUrl: stringValue(args.sourceProof.sourceUrl),
    sourceDate: stringValue(args.sourceProof.sourceDate),
    sourceSnapshotHash,
    gamePk: stringValue(args.sourceProof.gamePk),
    playId: stringValue(args.sourceProof.playId),
    eventKey: stringValue(args.sourceProof.eventKey),
    observedAt: stringValue(args.sourceProof.observedAt),
    collectibleId: stringValue(args.basis.collectibleId),
    claimHash: stringValue(args.basis.claimHash),
    cardId: stringValue(args.basis.cardId),
    subjectName,
    subjectRole: normalizeRole(args.subject.role),
    subjectPersonId: stringValue(args.subject.personId),
    teamCode: nullableText(args.subject.teamCode),
    opponentCode: nullableText(args.subject.opponentCode),
    eventType,
    eventLabel,
    eventDetail: stringValue(args.event.detail) || eventLabel,
    inning: nullableText(args.event.inning),
    scoreDelta,
    recordedVideo: args.recordedVideo ?? null,
    relatedVideos: uniqueRecordedEventVideos(args.relatedVideos ?? []),
    telemetry: eventTelemetry(args.event.metrics),
  };
  const mediaHash = args.hashJson(material);
  return {
    ...material,
    playbackType: "proof-motion",
    mediaId: `sem_${mediaHash.slice(0, 24).toLowerCase()}`,
    mediaHash,
    durationMs: 6800,
    startOffsetMs: 0,
    endOffsetMs: 6800,
    appendHash: args.appendHash && HEX64_RE.test(args.appendHash) ? args.appendHash.toLowerCase() : null,
    proofHash: args.proofHash && HEX64_RE.test(args.proofHash) ? args.proofHash.toLowerCase() : null,
    posterLabel: `${subjectName} ${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(1)}`,
    alt: `${eventLabel} proof clip for ${subjectName}`,
    emotionalCue: emotionalCue(scoreDelta, eventType),
  };
}

export function sportsArenaEventMediaClipFromValue(value: unknown): SportsArenaEventMediaClip | null {
  if (!isRecord(value) || value.schema !== RECEIZ_SPORTS_ARENA_EVENT_MEDIA_SCHEMA || value.kind !== "deterministic-proof-clip") return null;
  const mediaHash = stringValue(value.mediaHash).toLowerCase();
  const mediaId = stringValue(value.mediaId).toLowerCase();
  const subjectRole = normalizeRole(value.subjectRole);
  if (!HEX64_RE.test(mediaHash) || !MEDIA_ID_RE.test(mediaId)) return null;
  return {
    schema: RECEIZ_SPORTS_ARENA_EVENT_MEDIA_SCHEMA,
    kind: "deterministic-proof-clip",
    playbackType: value.playbackType === "proof-motion" ? "proof-motion" : "proof-motion",
    mediaId,
    mediaHash,
    durationMs: Math.max(1200, Math.trunc(numberValue(value.durationMs) ?? 6800)),
    startOffsetMs: Math.max(0, Math.trunc(numberValue(value.startOffsetMs) ?? 0)),
    endOffsetMs: Math.max(1200, Math.trunc(numberValue(value.endOffsetMs) ?? 6800)),
    source: normalizeEventMediaSource(value.source),
    sourceUrl: stringValue(value.sourceUrl),
    sourceDate: stringValue(value.sourceDate),
    sourceSnapshotHash: stringValue(value.sourceSnapshotHash).toLowerCase(),
    gamePk: stringValue(value.gamePk),
    playId: stringValue(value.playId),
    eventKey: stringValue(value.eventKey),
    observedAt: stringValue(value.observedAt),
    appendHash: HEX64_RE.test(stringValue(value.appendHash)) ? stringValue(value.appendHash).toLowerCase() : null,
    proofHash: HEX64_RE.test(stringValue(value.proofHash)) ? stringValue(value.proofHash).toLowerCase() : null,
    collectibleId: stringValue(value.collectibleId),
    claimHash: stringValue(value.claimHash).toLowerCase(),
    cardId: stringValue(value.cardId),
    subjectName: stringValue(value.subjectName) || "MLB player",
    subjectRole,
    subjectPersonId: stringValue(value.subjectPersonId),
    teamCode: nullableText(value.teamCode),
    opponentCode: nullableText(value.opponentCode),
    eventType: stringValue(value.eventType) || "mlb_event",
    eventLabel: stringValue(value.eventLabel) || titleCaseEvent(stringValue(value.eventType)),
    eventDetail: stringValue(value.eventDetail),
    inning: nullableText(value.inning),
    scoreDelta: numberValue(value.scoreDelta) ?? 0,
    posterLabel: stringValue(value.posterLabel) || stringValue(value.eventLabel) || "Proof clip",
    alt: stringValue(value.alt) || "Sports event proof clip",
    emotionalCue: stringValue(value.emotionalCue) || "The event is held in the card record.",
    recordedVideo: sportsArenaRecordedEventVideoFromValue(value.recordedVideo),
    relatedVideos: recordedEventVideosFromValue(value.relatedVideos),
    telemetry: eventTelemetry(value.telemetry),
  };
}
