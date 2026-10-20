import { jcsCanonicalize } from "@/app/utils/jcs";

export type VaultByteSource = Uint8Array | ArrayBuffer | ArrayBufferView;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function toUint8ArrayCopy(input: VaultByteSource): Uint8Array {
  const view =
    input instanceof Uint8Array
      ? input
      : input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : ArrayBuffer.isView(input)
          ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
          : new Uint8Array(input as ArrayBuffer);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

export function toArrayBufferStrict(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBinaryString(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    out += String.fromCharCode.apply(null, Array.from(slice));
  }
  return out;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  const base64 =
    typeof btoa === "function"
      ? btoa(bytesToBinaryString(bytes))
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  if (typeof atob === "function") {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

export function utf8Bytes(input: string): Uint8Array {
  return textEncoder.encode(input);
}

export function utf8Text(input: Uint8Array): string {
  return textDecoder.decode(input);
}

export async function sha256Hex(input: string | VaultByteSource): Promise<string> {
  const bytes = typeof input === "string" ? utf8Bytes(input) : toUint8ArrayCopy(input);
  const digest = await crypto.subtle.digest("SHA-256", toArrayBufferStrict(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function canonicalJson(value: unknown): string {
  return jcsCanonicalize(value);
}

export async function canonicalSha256Hex(value: unknown): Promise<string> {
  return sha256Hex(canonicalJson(value));
}

export function normalizeVaultPath(path: string, fallback = "untitled"): string {
  const safe = String(path || fallback)
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return safe || fallback;
}

export function dedupeVaultPath(path: string, used: Set<string>): string {
  const normalized = normalizeVaultPath(path);
  if (!used.has(normalized)) {
    used.add(normalized);
    return normalized;
  }

  const lastSlash = normalized.lastIndexOf("/");
  const folder = lastSlash >= 0 ? `${normalized.slice(0, lastSlash)}/` : "";
  const file = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const dot = file.lastIndexOf(".");
  const base = dot > 0 ? file.slice(0, dot) : file;
  const ext = dot > 0 ? file.slice(dot) : "";

  let index = 2;
  let candidate = `${folder}${base} (${index})${ext}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${folder}${base} (${index})${ext}`;
  }
  used.add(candidate);
  return candidate;
}

export function safeZipSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "segment";
}

export function formatVaultBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}
