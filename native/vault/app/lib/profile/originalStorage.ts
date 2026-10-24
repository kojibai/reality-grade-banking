export const PROFILE_ORIGINALS_PUBLIC_BUCKET = "receiz-profile-originals";
export const PROFILE_ORIGINALS_PRIVATE_BUCKET = "receiz-profile-originals-private";

export const PROFILE_ORIGINALS_ALLOWED_BUCKETS = [
  PROFILE_ORIGINALS_PUBLIC_BUCKET,
  PROFILE_ORIGINALS_PRIVATE_BUCKET,
] as const;

export type ProfileOriginalStorageBucket = (typeof PROFILE_ORIGINALS_ALLOWED_BUCKETS)[number];

export type ProfileOriginalStorageRef = {
  bucket: ProfileOriginalStorageBucket;
  path: string;
};

export type ProfileOriginalStorageVariantMap = Record<string, ProfileOriginalStorageRef>;

export type ProfileOriginalMediaSlot =
  | "preview"
  | "playback"
  | "documentOriginal"
  | "imageVariant"
  | "videoPoster"
  | "videoPosterVariant"
  | "audioCover"
  | "audioCoverVariant"
  | "epubCover"
  | "epubCoverVariant";

const SAFE_STORAGE_OBJECT_PATH_RE = /^[A-Za-z0-9/_\-.]+$/;
const HEX64_RE = /^[0-9a-f]{64}$/i;
const OWNER_STORAGE_PATHNAME = "/api/profile/originals/storage";

export function parseProfileOriginalStorageBucket(value: unknown): ProfileOriginalStorageBucket | null {
  const bucket = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!bucket) return null;
  if (bucket === PROFILE_ORIGINALS_PUBLIC_BUCKET) return PROFILE_ORIGINALS_PUBLIC_BUCKET;
  if (bucket === PROFILE_ORIGINALS_PRIVATE_BUCKET) return PROFILE_ORIGINALS_PRIVATE_BUCKET;
  return null;
}

export function normalizeProfileOriginalStoragePath(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const normalized = raw.replace(/^\/+/, "");
  if (!normalized || normalized.length > 1024) return null;
  if (!SAFE_STORAGE_OBJECT_PATH_RE.test(normalized)) return null;
  if (normalized.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
  return normalized;
}

export function coerceProfileOriginalStorageRef(value: unknown): ProfileOriginalStorageRef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const bucket = parseProfileOriginalStorageBucket(row.bucket);
  const path = normalizeProfileOriginalStoragePath(row.path);
  if (!bucket || !path) return null;
  return { bucket, path };
}

export function coerceProfileOriginalStorageVariantMap(value: unknown): ProfileOriginalStorageVariantMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 16) return null;

  const out: ProfileOriginalStorageVariantMap = {};
  for (const [rawWidth, rawRef] of entries) {
    const width = Number.parseInt(rawWidth, 10);
    if (!Number.isFinite(width) || !Number.isSafeInteger(width) || width < 64 || width > 4096) {
      return null;
    }
    const ref = coerceProfileOriginalStorageRef(rawRef);
    if (!ref) return null;
    out[String(width)] = ref;
  }

  return Object.keys(out).length > 0 ? out : null;
}

function parseUrlLike(value: string): URL | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    return raw.startsWith("/") ? new URL(raw, "https://receiz.local") : new URL(raw);
  } catch {
    return null;
  }
}

export function parseProfileOriginalOwnerStorageUrl(value: string): ProfileOriginalStorageRef | null {
  const parsed = parseUrlLike(value);
  if (!parsed || parsed.pathname !== OWNER_STORAGE_PATHNAME) return null;

  const bucket = parseProfileOriginalStorageBucket(parsed.searchParams.get("bucket"));
  const path = normalizeProfileOriginalStoragePath(parsed.searchParams.get("path"));
  if (!bucket || !path) return null;
  return { bucket, path };
}

export function coerceProfileOriginalStorageRefFromAny(value: unknown): ProfileOriginalStorageRef | null {
  if (typeof value === "string") {
    return parseProfileOriginalOwnerStorageUrl(value) ?? parseLegacyProfileOriginalPublicUrl(value);
  }
  return coerceProfileOriginalStorageRef(value);
}

export function coerceProfileOriginalStorageVariantMapFromAny(value: unknown): ProfileOriginalStorageVariantMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0 || entries.length > 16) return null;

  const out: ProfileOriginalStorageVariantMap = {};
  for (const [rawWidth, rawValue] of entries) {
    const width = Number.parseInt(rawWidth, 10);
    if (!Number.isFinite(width) || !Number.isSafeInteger(width) || width < 64 || width > 4096) {
      return null;
    }
    const ref = coerceProfileOriginalStorageRefFromAny(rawValue);
    if (!ref) return null;
    out[String(width)] = ref;
  }

  return Object.keys(out).length > 0 ? out : null;
}

export function buildProfileOriginalOwnerStorageUrl(
  ref: ProfileOriginalStorageRef,
  options?: {
    download?: boolean;
  },
): string {
  const params = new URLSearchParams();
  params.set("bucket", ref.bucket);
  params.set("path", ref.path);
  if (options?.download) params.set("download", "1");
  return `/api/profile/originals/storage?${params.toString()}`;
}

export function buildProfileOriginalMediaUrl(args: {
  receizId: string;
  slot: ProfileOriginalMediaSlot;
  width?: number | null;
}): string {
  const params = new URLSearchParams();
  params.set("receizId", args.receizId);
  params.set("slot", args.slot);
  if (typeof args.width === "number" && Number.isFinite(args.width)) {
    params.set("width", String(Math.trunc(args.width)));
  }
  return `/api/profile/originals/media?${params.toString()}`;
}

export function profileOriginalStoragePathOwnedByUser(path: string, userId: string): boolean {
  const normalizedPath = normalizeProfileOriginalStoragePath(path);
  const normalizedUserId = typeof userId === "string" ? userId.trim().toLowerCase() : "";
  if (!normalizedPath || !normalizedUserId) return false;

  return (
    normalizedPath.startsWith(`originals/${normalizedUserId}/`) ||
    normalizedPath.startsWith(`sealed/${normalizedUserId}/`) ||
    normalizedPath.startsWith(`playback/${normalizedUserId}/`) ||
    normalizedPath.startsWith(`variants/${normalizedUserId}/`)
  );
}

function parsePublicStorageHostCandidates(): Set<string> {
  const hosts = new Set<string>();
  const environment: Readonly<Record<string, string | undefined>> =
    typeof process !== "undefined" && process?.env ? process.env : {};
  const candidates = [environment.SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_URL];
  for (const candidate of candidates) {
    const raw = (candidate || "").trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      hosts.add(parsed.host.toLowerCase());
      if (parsed.host.includes(".supabase.")) {
        hosts.add(parsed.host.replace(".supabase.", ".storage.supabase.").toLowerCase());
      }
    } catch {
      // Ignore malformed env configuration.
    }
  }
  return hosts;
}

const PUBLIC_STORAGE_HOSTS = parsePublicStorageHostCandidates();
const PUBLIC_STORAGE_PATH_RE = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;

function publicStorageBaseUrl(): string | null {
  const environment: Readonly<Record<string, string | undefined>> =
    typeof process !== "undefined" && process?.env ? process.env : {};
  const candidates = [environment.NEXT_PUBLIC_SUPABASE_URL, environment.SUPABASE_URL];
  for (const candidate of candidates) {
    const raw = (candidate || "").trim();
    if (!raw) continue;
    try {
      const parsed = new URL(raw);
      return parsed.origin.replace(/\/+$/, "");
    } catch {
      // Ignore malformed env configuration.
    }
  }
  return null;
}

function encodeStorageObjectPath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

const PUBLIC_STORAGE_BASE_URL = publicStorageBaseUrl();

export function buildProfileOriginalPublicObjectUrl(ref: ProfileOriginalStorageRef): string | null {
  if (ref.bucket !== PROFILE_ORIGINALS_PUBLIC_BUCKET) return null;
  const normalizedPath = normalizeProfileOriginalStoragePath(ref.path);
  if (!normalizedPath || !PUBLIC_STORAGE_BASE_URL) return null;
  return `${PUBLIC_STORAGE_BASE_URL}/storage/v1/object/public/${ref.bucket}/${encodeStorageObjectPath(normalizedPath)}`;
}

export function parseLegacyProfileOriginalPublicUrl(value: string): ProfileOriginalStorageRef | null {
  const raw = value.trim();
  if (!raw) return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  if (!PUBLIC_STORAGE_HOSTS.has(parsed.host.toLowerCase())) return null;
  const match = parsed.pathname.match(PUBLIC_STORAGE_PATH_RE);
  if (!match) return null;

  const bucket = parseProfileOriginalStorageBucket(match[1] ?? "");
  if (!bucket) return null;

  try {
    const path = normalizeProfileOriginalStoragePath(decodeURIComponent(match[2] ?? ""));
    if (!path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

export function isHex64(value: string | null | undefined): boolean {
  return HEX64_RE.test((value ?? "").trim());
}
