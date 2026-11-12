const MIME_RE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

const MIME_BY_EXTENSION: Record<string, string> = {
  aac: "audio/aac",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  amr: "audio/amr",
  avif: "image/avif",
  avi: "video/x-msvideo",
  bin: "application/octet-stream",
  caf: "audio/x-caf",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  html: "text/html",
  flac: "audio/flac",
  flv: "video/x-flv",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  epub: "application/epub+zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  json: "application/json",
  m4a: "audio/mp4",
  m4b: "audio/mp4",
  mka: "audio/x-matroska",
  mpga: "audio/mpeg",
  mp2: "audio/mpeg",
  m4v: "video/mp4",
  m2ts: "video/mp2t",
  mid: "audio/midi",
  midi: "audio/midi",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  mts: "video/mp2t",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  ogv: "video/ogg",
  opus: "audio/opus",
  pdf: "application/pdf",
  png: "image/png",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  ts: "video/mp2t",
  txt: "text/plain",
  wav: "audio/wav",
  wave: "audio/wav",
  weba: "audio/webm",
  webm: "video/webm",
  webp: "image/webp",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  yaml: "text/yaml",
  yml: "text/yaml",
  au: "audio/basic",
  snd: "audio/basic",
  wma: "audio/x-ms-wma",
  wmv: "video/x-ms-wmv",
  zip: "application/zip",
  "3ga": "audio/3gpp",
  "3gp": "video/3gpp",
  "3gpp": "video/3gpp",
} as const;

const MIME_ALIASES: Record<string, string> = {
  "audio/3gp": "audio/3gpp",
  "audio/mp3": "audio/mpeg",
  "audio/mp4a-latm": "audio/mp4",
  "audio/vnd.wave": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/x-aac": "audio/aac",
  "audio/x-aiff": "audio/aiff",
  "audio/x-m4a": "audio/mp4",
  "audio/x-mp3": "audio/mpeg",
  "audio/x-ms-wma": "audio/x-ms-wma",
  "audio/x-wav": "audio/wav",
  "application/x-epub+zip": "application/epub+zip",
  "application/x-rtf": "application/rtf",
  "video/3gp": "video/3gpp",
  "video/x-m4v": "video/mp4",
};

const EXTENSION_BY_MIME: Record<string, string> = Object.entries(MIME_BY_EXTENSION).reduce<Record<string, string>>(
  (out, [ext, mime]) => {
    if (!out[mime]) out[mime] = ext;
    return out;
  },
  {}
);

export function extensionFromFilename(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed) return null;
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const leaf = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  const dot = leaf.lastIndexOf(".");
  if (dot <= 0 || dot === leaf.length - 1) return null;
  return leaf.slice(dot + 1).trim().toLowerCase() || null;
}

export function normalizeMimeType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!value) return null;
  if (!MIME_RE.test(value)) return null;
  return MIME_ALIASES[value] ?? value;
}

export function mimeFromFilename(filename: string): string | null {
  const ext = extensionFromFilename(filename);
  if (!ext) return null;
  return MIME_BY_EXTENSION[ext] ?? null;
}

export function extensionFromMimeType(raw: string | null | undefined): string | null {
  const mime = normalizeMimeType(raw);
  if (!mime) return null;
  return EXTENSION_BY_MIME[mime] ?? null;
}

export function resolveMimeType(args: {
  mime?: string | null;
  filename?: string | null;
  fallback?: string;
}): string {
  const fallback = normalizeMimeType(args.fallback) ?? "application/octet-stream";
  const normalized = normalizeMimeType(args.mime);
  const fromName = args.filename ? mimeFromFilename(args.filename) : null;

  if (normalized && normalized !== "application/octet-stream") return normalized;
  if (fromName) return fromName;
  if (normalized) return normalized;
  return fallback;
}
