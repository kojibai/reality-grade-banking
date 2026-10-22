import type { MarketDeskPulseValueSeed } from "@/app/lib/market/types";
import type { ProfileIdentityCreationKaiSource } from "@/app/lib/profile/profileIdentityCreationCoordinate";

import type { ReceizHistoricalRecord } from "@/app/lib/security/receizHistoricalRecords";

import type { ProfileNamedLink } from "./namedLinks";

export type ProfileCard = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
};

export type {ProfileOriginalAudioDistribution,ProfileOriginalEpubMetadata} from "./mediaMetadata";
import type {ProfileOriginalAudioDistribution,ProfileOriginalEpubMetadata} from "./mediaMetadata";

export type ProfileOriginalObjectProofEvidenceRole =
  | "hero"
  | "front"
  | "back"
  | "detail"
  | "serial"
  | "scale"
  | "condition"
  | "receipt"
  | "context";

export type ProfileOriginalObjectProofEvidence = {
  role: ProfileOriginalObjectProofEvidenceRole;
  name: string | null;
  mime: string | null;
  size: number | null;
  sha256Hex: string | null;
  src: string | null;
  storage: { bucket: string; path: string } | null;
  fileLastModifiedMs: number | null;
};

export type ProfileOriginalObjectProof = {
  type: "physical-object";
  title: string | null;
  assetType: string | null;
  maker: string | null;
  model: string | null;
  identifier: string | null;
  condition: string | null;
  dimensions: string | null;
  provenance: string | null;
  custodyStatus: "in-custody" | "stored" | "handoff" | "condition-check" | null;
  notes: string | null;
  completenessScore: number;
  evidence: ProfileOriginalObjectProofEvidence[];
};

export type ProfileOriginalLiveMomentCapture = {
  type: "live-moment";
  input: "camera";
  capturedAtMs: number;
  capturedAtIso: string;
  fileLastModifiedMs: number | null;
  location: {
    lat: number;
    lng: number;
    accuracyM: number | null;
  } | null;
};

export type ProfileOriginalLongForm = {
  title: string | null;
  text: string;
  sha256Hex: string;
  wordCount: number;
};

export type LongFormNarrationVoice = "man" | "woman";

export type ProfileLongFormNarrationSegment = {
  index: number;
  textStart: number;
  textEnd: number;
  startMs: number;
  endMs: number;
};

export type ProfileLongFormNarrationAsset = {
  receizId: string;
  sourceSha256Hex: string;
  voice: LongFormNarrationVoice;
  recipeVersion: "receiz.long-form-narration.v1";
  src: string;
  mime: string;
  audioSha256Hex: string;
  size: number;
  durationMs: number;
  segments: ProfileLongFormNarrationSegment[];
  readyAt: string;
};

export type ProfileLongFormNarrationProjection = {
  man: ProfileLongFormNarrationAsset;
  woman: ProfileLongFormNarrationAsset;
};

export type ProfileOriginalProofAttachmentRole =
  | "source"
  | "appendix"
  | "dataset"
  | "contract"
  | "receipt"
  | "research"
  | "other";

export type ProfileOriginalProofAttachment = {
  id: string;
  role: ProfileOriginalProofAttachmentRole;
  name: string | null;
  mime: string | null;
  size: number | null;
  sha256Hex: string | null;
  src: string | null;
  storage: { bucket: string; path: string } | null;
  downloadName: string | null;
  description: string | null;
  createdAt: string | null;
};

export type ProfileOriginalMaterialCoordinate = Readonly<{
  schema: "receiz.profile-original.material.v1";
  proofObjectUrl: string;
  sealedArtifactSha256Hex: string;
  payloadSha256Hex: string;
  authority: Readonly<{
    urlIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ProfileIdentityArtifactBinding = Readonly<{
  schema: "receiz.profile.identity-artifact-binding.v1";
  kind: "seal" | "record";
  sourceSha256Hex: string;
  sealedArtifactSha256Hex: string;
  proofHead: string;
  authority: Readonly<{
    bindingIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ProfileOriginal = {
  /** Authored title retained beneath the verified original, separate from caption. */
  assetTitle?: string;
  nativeAsset?: Readonly<{id:string;issuanceSourceSha256:string;headSourceSha256:string;publicCertificateSha256:string}>;
  /** Exact imported source beneath owner-authorized Showcase possession. */
  importedSource?: Readonly<{
    reference: import("./showcase/importedSource").ImportedProofSourceReference;
    identity: import("./showcase/importedSource").ImportedProofSourceProjection["identity"];
    ownerReceizId: string | null;
    interpretedArtifactSha256: string;
    normalizedLegacy: boolean;
    payloadSha256: string;
    payloadByteLength: number;
    payloadMimeType: string;
    payloadFilename: string;
    sourceProofHead: string | null;
    sourceArtifactSha256: string;
    sourceIdentity: Readonly<{ artifactId: string; namespace: string; genesisOwnerReceizId: string }> | null;
    pbiAppendHeads: readonly string[];
  }>;
  id: string;
  slug: string;
  code: string;
  ownershipKind: "creator" | "verified";
  ownershipRole?: "creator" | "current-owner" | "verified-possession";
  originalCreator: ProfileCard | null;
  contextPreset: "Deposit" | "Milestone" | "Handoff" | "Condition" | "Agreement" | "Delivery" | "Custom" | null;
  pulse: string | null;
  claimHashHex: string | null;
  /** SHA-256 of the sealed record artifact when the Original has no attached media. */
  recordMediaSha256Hex?: string | null;
  /** Basis of the separately verified signed Moment PNG, appended after its exact card is admitted. */
  recordCardMediaSha256Hex?: string | null;
  claim: string;
  longForm?: ProfileOriginalLongForm | null;
  longFormNarration?: ProfileLongFormNarrationProjection | null;
  attachments?: ProfileOriginalProofAttachment[] | null;
  /** Verified projection of the enclosing sealed identity artifact. Display text and filenames never set this. */
  identityArtifact?: ProfileIdentityArtifactBinding | null;
  verifyPath: string;
  verifyUrl: string;
  createdAt: string;
  ts: string;
  showOnProfile: boolean;
  historical: ReceizHistoricalRecord | null;
  hasPbiSignature: boolean;
  pbiReceiptHash: string | null;
  signedArtifactDownloadUrl: string | null;
  proof: {
    circuit: "Groth16";
    groth16Id: string | null;
    poseidon: string | null;
  };
  marketPreview?: {
    quoteUsdPerPhi: number;
    priceUsd: number;
    pricePhi: number;
    intrinsicPhi: number;
    changePct: number;
    volumeUsd?: number;
    liquidityUsd?: number;
    holders?: number;
    premiumX: number;
    momentX: number;
    livePulseSeed: MarketDeskPulseValueSeed | null;
  } | null;
  media: {
    kind: "image" | "video" | "audio" | "pdf" | "epub" | "file";
    src: string;
    mime: string | null;
    name: string | null;
    size: number | null;
    sha256Hex: string | null;
    originalDownloadSrc: string | null;
    originalDownloadName: string | null;
    originalDownloadMime: string | null;
    originalDownloadSize: number | null;
    originalDownloadSha256Hex: string | null;
    playbackSrc?: string | null;
    playbackMime?: string | null;
    playbackKind?: "hls" | "mp4" | null;
    playbackReadyAt?: string | null;
    derivativeDownloadSrc: string | null;
    derivativeDownloadName: string | null;
    derivativeDownloadMime: string | null;
    derivativeDownloadSize: number | null;
    derivativeDownloadSha256Hex: string | null;
    receiptDownloadSrc: string | null;
    receiptDownloadName: string | null;
    receiptMs: string | null;
    receiptTzMinutesEast: number | null;
    allowOriginalDownload: boolean;
    allowDerivativeDownload: boolean;
    allowMomentRecordDownload: boolean;
    gateAudioPlayback: boolean;
    originalDownloadLimit: number | null;
    derivativeDownloadLimit: number | null;
    originalDownloadPriceCents: number | null;
    derivativeDownloadPriceCents: number | null;
    collectionReleaseAt: string | null;
    collectionReleasePulse: number | null;
    imageVariants: Record<string, string> | null;
    videoPosterSrc: string | null;
    videoPosterMime: string | null;
    videoPosterName: string | null;
    videoPosterImageVariants: Record<string, string> | null;
    audioCoverSrc: string | null;
    audioCoverMime: string | null;
    audioCoverName: string | null;
    audioCoverImageVariants: Record<string, string> | null;
    epubCoverSrc: string | null;
    epubCoverMime: string | null;
    epubCoverName: string | null;
    epubCoverImageVariants: Record<string, string> | null;
    epubMetadata: ProfileOriginalEpubMetadata | null;
    audioDistribution: ProfileOriginalAudioDistribution | null;
    objectProof?: ProfileOriginalObjectProof | null;
    liveMomentCapture?: ProfileOriginalLiveMomentCapture | null;
    material?: ProfileOriginalMaterialCoordinate | null;
  } | null;
};

export type ProfileViewerState = {
  isSignedIn: boolean;
  isOwner: boolean;
  canEdit: boolean;
  canView: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  connection: "self" | "mutual" | "following" | "follower" | "none";
};

export type ProfileStats = {
  followers: number;
  following: number;
  originals: number;
  signedOriginals: number;
  hiddenOriginals: number;
  originalViews: number;
  streams: number;
  streamCompletionRatePct: number;
  witnessedSeconds: number;
};

export type ProfileShowcaseFilterCounts = {
  all: number;
  image: number;
  video: number;
  audio: number;
  book: number;
  document: number;
  moment: number;
  signed: number;
};

export type ProfileShowcaseFilterKey = keyof ProfileShowcaseFilterCounts;

export type ProfileDeterministicManifest = {
  version: 1;
  scope: "visible-showcase";
  username: string;
  stamp: string;
  itemCount: number;
  isComplete: boolean;
  pageSize: number;
  nextCursor: string | null;
  newestOriginalAt: string | null;
};

export type ProfileFeedSortKey = "forYou" | "latest" | "momentum";

export type ProfileFeedMediaKind = "image" | "video" | "audio" | "document" | "moment";

export type ProfileFeedInteractionAction = "open" | "play" | "download" | "singleView" | "resume";

export type ProfileFeedRankingTuning = {
  forYouInteractionWeight: number;
  forYouMediaAffinityWeight: number;
  forYouRecencyWeight: number;
  momentumRecencyWeight: number;
  momentumInteractionWeight: number;
  signedWeight: number;
  creatorWeight: number;
  mediaConversionWeight: number;
  resumeWeight: number;
};

export type ProfileFeedExperimentVariantAnalytics = {
  variantId: string;
  exposureEvents: number;
  outcomeEvents: number;
  retentionEvents: number;
  uniqueExposureSessions: number;
  uniqueOutcomeSessions: number;
  uniqueRetentionSessions: number;
  outcomePerExposure: number | null;
  outcomePerExposureSession: number | null;
  avgSessionDurationSeconds: number | null;
  avgInteractionsPerRetentionSession: number | null;
  avgImpressionsPerRetentionSession: number | null;
  avgFirstInteractionLagSeconds: number | null;
  actionCounts: Record<ProfileFeedInteractionAction, number>;
  sortOutcomeCounts: Record<ProfileFeedSortKey, number>;
  mediaOutcomeCounts: Record<ProfileFeedMediaKind, number>;
  tuningConfidence: number;
  recommendedTuning: ProfileFeedRankingTuning;
  lastEventAt: string | null;
};

export type ProfileFeedExperimentAnalytics = {
  generatedAt: string;
  lookbackDays: number;
  ownerUserId: string | null;
  truncated: boolean;
  totalExposureEvents: number;
  totalOutcomeEvents: number;
  totalRetentionEvents: number;
  uniqueExposureSessions: number;
  uniqueOutcomeSessions: number;
  uniqueRetentionSessions: number;
  outcomePerExposure: number | null;
  avgSessionDurationSeconds: number | null;
  avgInteractionsPerRetentionSession: number | null;
  defaultVariantId: string | null;
  defaultRecommendedTuning: ProfileFeedRankingTuning;
  variants: ProfileFeedExperimentVariantAnalytics[];
};

export type ProfileGlyphValuationOriginalRollup = {
  witnessedSeconds: number;
  witnessedBreaths: number;
  retentionRate: number;
  retentionBoost: number;
  updatedAt: string | null;
};

export type ProfileGlyphValuationRollup = {
  version: 1;
  aggregateFeedPhi: number;
  liveOriginalsCount: number;
  liveSignedOriginalsCount: number;
  computedPulse: number;
  computedAt: string;
  loadedOriginals: Record<string, ProfileGlyphValuationOriginalRollup>;
};

export type ProfileViewData = {
  /** Descriptive categories absent from this projection. This signal confers
   * no proof, membership, privacy or social-event authority. */
  unavailableDecorators?: readonly ("social" | "engagement")[];
  profile: {
    userId: string;
    username: string;
    displayName: string;
    bio: string | null;
    location: string | null;
    websiteUrl: string | null;
    links: readonly ProfileNamedLink[];
    socialXUrl: string | null;
    socialInstagramUrl: string | null;
    socialYoutubeUrl: string | null;
    socialLinkedinUrl: string | null;
    socialGithubUrl: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    isPrivate: boolean;
    showSchedulerButton: boolean;
    guidedSetupCompletedAt?: string | null;
    creationKaiMicroPulse?: string | null;
    creationKaiSource?: ProfileIdentityCreationKaiSource | null;
    createdAt: string;
    updatedAt: string;
    lastSealedAt: string | null;
    lastSealedPulse: string | null;
    authorshipVerified: boolean;
    authorshipPbiReceiptHash?: string | null;
    creationSigilBalancePhiMicro?: string | null;
    creationSigilBalanceUsd?: string | null;
  };
  viewer: ProfileViewerState;
  stats: ProfileStats;
  feedExperimentAnalytics?: ProfileFeedExperimentAnalytics | null;
  glyphValuationRollup?: ProfileGlyphValuationRollup | null;
  followers: ProfileCard[];
  following: ProfileCard[];
  originals: ProfileOriginal[];
  showcaseCounts?: ProfileShowcaseFilterCounts | null;
  deterministicManifest?: ProfileDeterministicManifest | null;
  originalsPage: {
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export type UsernameAvailability = {
  normalized: string;
  available: boolean;
  isCurrent: boolean;
  reason: "ok" | "invalid" | "taken";
  suggestions: string[];
};

export type FollowUpdateResult = {
  username: string;
  isFollowing: boolean;
  followsYou: boolean;
  connection: ProfileViewerState["connection"];
  followers: number;
  following: number;
};

export type ParsedProfilePatch = {
  username?: string;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  website_url?: string | null;
  links?: readonly ProfileNamedLink[];
  social_x_url?: string | null;
  social_instagram_url?: string | null;
  social_youtube_url?: string | null;
  social_linkedin_url?: string | null;
  social_github_url?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  is_private?: boolean;
  show_scheduler_button?: boolean;
};
