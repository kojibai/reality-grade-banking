const SAFE_BUCKET_RE = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/i;
const SAFE_STORAGE_OBJECT_PATH_RE = /^[A-Za-z0-9/_\-.]+$/;
const STORAGE_OBJECT_URL_RE = /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/i;
const STORAGE_OBJECT_API_PATH = "/api/storage/object";
const RESPONSE_TEXT_FIELD_KEYS = new Set([
  "body",
  "description",
  "detail",
  "details",
  "message",
  "metadata",
  "note",
  "notes",
  "payload",
  "reply",
  "request",
  "summary",
  "text",
]);

export type ReceizStorageObjectRef = {
  bucket: string;
  path: string;
};

function normalizeBucket(value: string): string | null {
  const bucket = value.trim();
  if (!bucket || !SAFE_BUCKET_RE.test(bucket)) return null;
  return bucket;
}

function normalizePath(value: string): string | null {
  const path = value.trim().replace(/^\/+/, "");
  if (!path || path.length > 2048) return null;
  if (!SAFE_STORAGE_OBJECT_PATH_RE.test(path)) return null;
  if (path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
  return path;
}

function decodeStorageObjectPath(rawPath: string): string | null {
  try {
    const decoded = rawPath
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join("/");
    return normalizePath(decoded);
  } catch {
    return null;
  }
}

function parseSbStorageRef(input: string): ReceizStorageObjectRef | null {
  const raw = input.trim();
  if (!raw.startsWith("sb://")) return null;
  const withoutScheme = raw.slice("sb://".length);
  const slashIndex = withoutScheme.indexOf("/");
  if (slashIndex <= 0) return null;
  const bucket = normalizeBucket(withoutScheme.slice(0, slashIndex));
  const path = normalizePath(withoutScheme.slice(slashIndex + 1));
  return bucket && path ? { bucket, path } : null;
}

export function parseReceizStorageObjectRef(input: string): ReceizStorageObjectRef | null {
  const raw = input.trim();
  if (!raw) return null;

  const sbRef = parseSbStorageRef(raw);
  if (sbRef) return sbRef;

  try {
    const parsed = raw.startsWith("/") ? new URL(raw, "https://receiz.local") : new URL(raw);
    if (parsed.pathname === STORAGE_OBJECT_API_PATH) {
      const bucket = normalizeBucket(parsed.searchParams.get("bucket") ?? "");
      const path = normalizePath(parsed.searchParams.get("path") ?? "");
      return bucket && path ? { bucket, path } : null;
    }
    const match = parsed.pathname.match(STORAGE_OBJECT_URL_RE);
    if (!match) return null;
    const bucket = normalizeBucket(match[1] ?? "");
    const path = decodeStorageObjectPath(match[2] ?? "");
    return bucket && path ? { bucket, path } : null;
  } catch {
    return null;
  }
}

export function buildReceizStorageObjectUrl(ref: ReceizStorageObjectRef): string {
  const params = new URLSearchParams();
  params.set("bucket", ref.bucket);
  params.set("path", ref.path);
  return `/api/storage/object?${params.toString()}`;
}

export function rewriteUserFacingAssetUrl(input: string): string {
  const ref = parseReceizStorageObjectRef(input);
  return ref ? buildReceizStorageObjectUrl(ref) : input;
}

export function rewriteUserFacingAssetUrlsInText(input: string): string {
  if (!input.trim()) return input;

  return input
    .replace(/sb:\/\/[^\s"'<>]+/gi, (match) => rewriteUserFacingAssetUrl(match))
    .replace(/https?:\/\/[^\s"'<>]+/gi, (match) => rewriteUserFacingAssetUrl(match))
    .replace(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^\s"'<>]+/gi, (match) =>
      rewriteUserFacingAssetUrl(match),
    );
}

export function rewriteUserFacingAssetUrlsInValue<T>(value: T, depth = 0): T {
  if (depth > 6) return value;

  if (typeof value === "string") {
    return rewriteUserFacingAssetUrlsInText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => rewriteUserFacingAssetUrlsInValue(entry, depth + 1)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      next[key] = rewriteUserFacingAssetUrlsInValue(entry, depth + 1);
    }
    return next as T;
  }

  return value;
}

function normalizeResponseFieldKey(input: string): string {
  return input.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isResponseAssetFieldKey(input: string): boolean {
  const normalized = normalizeResponseFieldKey(input);
  return normalized.endsWith("url") || normalized.endsWith("src") || normalized.endsWith("uri");
}

function isResponseTextFieldKey(input: string): boolean {
  return RESPONSE_TEXT_FIELD_KEYS.has(normalizeResponseFieldKey(input));
}

export function rewriteUserFacingAssetUrlsInResponseValue<T>(value: T, key?: string, depth = 0): T {
  if (depth > 8) return value;

  if (typeof value === "string") {
    if (!key) return value;
    if (isResponseAssetFieldKey(key)) return rewriteUserFacingAssetUrl(value) as T;
    if (isResponseTextFieldKey(key)) return rewriteUserFacingAssetUrlsInText(value) as T;
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => rewriteUserFacingAssetUrlsInResponseValue(entry, key, depth + 1)) as T;
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      next[entryKey] = rewriteUserFacingAssetUrlsInResponseValue(entryValue, entryKey, depth + 1);
    }
    return next as T;
  }

  return value;
}
