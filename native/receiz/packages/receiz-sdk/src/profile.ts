export type ReceizProfileUpdateInput = Readonly<{
  username?: string;
  displayName?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  socialXUrl?: string | null;
  socialInstagramUrl?: string | null;
  socialYoutubeUrl?: string | null;
  socialLinkedinUrl?: string | null;
  socialGithubUrl?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  isPrivate?: boolean;
  showSchedulerButton?: boolean;
}>;

export type ReceizProfileUpdateResult = Readonly<{
  schema: "receiz.profile.update.result.v108";
  status: "updated";
  accountUid: string;
  profilePath: string;
  profile: Readonly<Record<string, unknown>>;
}>;

export type ReceizUsernameAvailability = Readonly<{
  normalized: string;
  available: boolean;
  isCurrent: boolean;
  reason: "ok" | "invalid" | "taken";
  suggestions: readonly string[];
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const RECEIZ_CANONICAL_PROFILE_PATH_RE = /^\/[a-z0-9_]{3,24}$/;

export function parseReceizProfileUpdateResult(value: unknown): ReceizProfileUpdateResult {
  if (
    !isRecord(value)
    || value.schema !== "receiz.profile.update.result.v108"
    || value.status !== "updated"
    || typeof value.accountUid !== "string"
    || !value.accountUid.trim()
    || typeof value.profilePath !== "string"
    || !RECEIZ_CANONICAL_PROFILE_PATH_RE.test(value.profilePath)
    || !isRecord(value.profile)
  ) {
    throw new Error("profile_update_result_invalid");
  }
  return Object.freeze({
    schema: "receiz.profile.update.result.v108",
    status: "updated",
    accountUid: value.accountUid,
    profilePath: value.profilePath,
    profile: Object.freeze(structuredClone(value.profile)),
  });
}

export function parseReceizUsernameAvailability(value: unknown): ReceizUsernameAvailability {
  if (
    !isRecord(value)
    || typeof value.normalized !== "string"
    || typeof value.available !== "boolean"
    || typeof value.isCurrent !== "boolean"
    || !["ok", "invalid", "taken"].includes(String(value.reason))
    || !Array.isArray(value.suggestions)
    || value.suggestions.some((suggestion) => typeof suggestion !== "string")
  ) {
    throw new Error("username_availability_result_invalid");
  }
  return Object.freeze({
    normalized: value.normalized,
    available: value.available,
    isCurrent: value.isCurrent,
    reason: value.reason as ReceizUsernameAvailability["reason"],
    suggestions: Object.freeze([...value.suggestions]),
  });
}
