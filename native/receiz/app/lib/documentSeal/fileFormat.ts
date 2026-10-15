const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const PDF_SIGNATURE = new Uint8Array([37, 80, 68, 70, 45]); // %PDF-
const JPEG_SIGNATURE = new Uint8Array([255, 216, 255]);
const GIF87A_SIGNATURE = new Uint8Array([71, 73, 70, 56, 55, 97]); // GIF87a
const GIF89A_SIGNATURE = new Uint8Array([71, 73, 70, 56, 57, 97]); // GIF89a
const ZIP_SIGNATURE = new Uint8Array([80, 75, 3, 4]); // PK..

export type ReceizDocumentFormat = "png" | "pdf" | "jpeg" | "heic" | "gif" | "webp" | "zip" | "svg" | "json" | "unknown";

type DetectHints = Readonly<{
  filename?: string;
  mime?: string;
}>;

function startsWithBytes(bytes: Uint8Array, signature: Uint8Array): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  return (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  );
}

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);

function ascii4(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(bytes[offset] ?? 0, bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0, bytes[offset + 3] ?? 0);
}

/** Conservative bounded applicability only. Complete ftyp excluding all existing
 * HEIC brands permits ordinary native ISO trailer execution; it proves no codec
 * or artifact validity. Undecided framing stays with the complete executor. */
export function boundedIsoTrailerApplicability(bytes: Uint8Array): "not-iso" | "ordinary-iso" | "complete-required" {
  if (bytes.length < 8 || ascii4(bytes, 4) !== "ftyp") return "not-iso";
  const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
  if (size < 16 || size > bytes.length || (size - 16) % 4 !== 0) return "complete-required";
  if (HEIC_BRANDS.has(ascii4(bytes, 8))) return "complete-required";
  for (let offset = 16; offset < size; offset += 4) {
    if (HEIC_BRANDS.has(ascii4(bytes, offset))) return "complete-required";
  }
  return "ordinary-iso";
}

function isCompleteHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii4(bytes, 4) !== "ftyp") return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  let sawFtyp = false;
  let sawMeta = false;
  let sawMdat = false;
  let hasHeicBrand = false;

  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return false;
    const size32 = view.getUint32(offset, false);
    const type = ascii4(bytes, offset + 4);
    let headerLength = 8;
    let size = size32;
    if (size32 === 0) return false;
    if (size32 === 1) {
      if (offset + 16 > bytes.length) return false;
      const size64 = view.getBigUint64(offset + 8, false);
      if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) return false;
      size = Number(size64);
      headerLength = 16;
    }
    if (size < headerLength || offset + size > bytes.length) return false;
    if (offset === 0) {
      if (type !== "ftyp" || headerLength !== 8 || size < 16 || (size - 16) % 4 !== 0) return false;
      sawFtyp = true;
      const majorBrand = ascii4(bytes, offset + 8);
      hasHeicBrand = HEIC_BRANDS.has(majorBrand);
      for (let brandOffset = offset + 16; brandOffset < offset + size; brandOffset += 4) {
        if (HEIC_BRANDS.has(ascii4(bytes, brandOffset))) hasHeicBrand = true;
      }
    } else if (type === "ftyp") {
      return false;
    }
    if (type === "meta") sawMeta = true;
    if (type === "mdat") sawMdat = true;
    offset += size;
  }
  return sawFtyp && hasHeicBrand && sawMeta && sawMdat && offset === bytes.length;
}

function extensionFromName(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed) return null;
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const leaf = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  const dot = leaf.lastIndexOf(".");
  if (dot <= 0 || dot === leaf.length - 1) return null;
  return leaf.slice(dot + 1).toLowerCase();
}

function detectFromHints(hints?: DetectHints): ReceizDocumentFormat | null {
  const mime = (hints?.mime ?? "").trim().toLowerCase();
  if (mime === "image/svg+xml") return "svg";
  if (mime === "application/json" || mime.endsWith("+json")) return "json";

  const ext = extensionFromName(hints?.filename ?? "");
  if (ext === "svg") return "svg";
  if (ext === "json") return "json";
  return null;
}

function detectFromTextPrefix(bytes: Uint8Array): ReceizDocumentFormat | null {
  const sample = bytes.slice(0, Math.min(bytes.length, 4096));
  const raw = new TextDecoder().decode(sample);
  const trimmed = raw.replace(/^\uFEFF/, "").trimStart();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("<svg") || lower.startsWith("<?xml") && lower.includes("<svg")) {
    return "svg";
  }
  if (trimmed.length > 0) {
    const first = trimmed[0];
    if (first === "{" || first === "[") return "json";
  }
  return null;
}

export function detectDocumentFormat(bytes: Uint8Array, hints?: DetectHints): ReceizDocumentFormat {
  if (startsWithBytes(bytes, PNG_SIGNATURE)) return "png";
  if (startsWithBytes(bytes, PDF_SIGNATURE)) return "pdf";
  if (startsWithBytes(bytes, JPEG_SIGNATURE)) return "jpeg";
  if (isCompleteHeic(bytes)) return "heic";
  if (startsWithBytes(bytes, GIF87A_SIGNATURE) || startsWithBytes(bytes, GIF89A_SIGNATURE)) return "gif";
  if (isWebp(bytes)) return "webp";
  if (startsWithBytes(bytes, ZIP_SIGNATURE)) return "zip";
  const hinted = detectFromHints(hints);
  if (hinted) return hinted;
  const textHint = detectFromTextPrefix(bytes);
  if (textHint) return textHint;
  return "unknown";
}

export function isTrailerSafeFormat(format: ReceizDocumentFormat): boolean {
  return format === "jpeg" || format === "gif" || format === "webp";
}

export function extensionForFormat(format: ReceizDocumentFormat): string | null {
  if (format === "png") return "png";
  if (format === "pdf") return "pdf";
  if (format === "jpeg") return "jpg";
  if (format === "heic") return "heic";
  if (format === "gif") return "gif";
  if (format === "webp") return "webp";
  if (format === "zip") return "zip";
  if (format === "svg") return "svg";
  if (format === "json") return "json";
  return null;
}

export function extensionFromFilename(filename: string): string | null {
  return extensionFromName(filename);
}

function stripLastExtension(filename: string): { base: string; ext: string | null } {
  const trimmed = filename.trim();
  if (!trimmed) return { base: "document", ext: null };
  const slash = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const name = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) {
    return { base: name || "document", ext: null };
  }
  return { base: name.slice(0, dot), ext: name.slice(dot + 1).toLowerCase() };
}

export function buildReceizedDownloadName(args: {
  filename: string;
  forcedExtension?: string;
  keepExtension?: boolean;
}): string {
  const { base, ext } = stripLastExtension(args.filename);
  const normalizedForced = args.forcedExtension ? args.forcedExtension.replace(/^\./, "").toLowerCase() : null;
  if (normalizedForced) {
    return `${base}.receized.${normalizedForced}`;
  }
  if (args.keepExtension && ext) {
    return `${base}.receized.${ext}`;
  }
  return `${base}.receized`;
}
