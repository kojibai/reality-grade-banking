import { sha256Hex } from "@/app/utils/sha256";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.download = (filename || "download").replace(/[\/\\]+/g, "_");
  a.rel = "noopener";
  a.style.display = "none";
  const stopSyntheticNavigation = (event: MouseEvent) => {
    event.stopPropagation();
  };
  a.addEventListener("click", stopSyntheticNavigation, { capture: true, once: true });
  document.body.appendChild(a);
  try {
    a.click();
  } catch {
    a.dispatchEvent(
      new MouseEvent("click", {
        bubbles: false,
        cancelable: true,
        view: window,
      }),
    );
  }
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 60_000);
}

async function shareBlobAsNativeFile(
  blob: Blob,
  filename: string,
  options: { title?: string; text?: string; fileOnly?: boolean } = {},
): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof File === "undefined") return false;
  const navigatorShare = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (typeof navigatorShare.share !== "function") return false;
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  if (navigatorShare.canShare && !navigatorShare.canShare({ files: [file] })) return false;
  try {
    const payload: ShareData = options.fileOnly
      ? { files: [file] }
      : { files: [file], title: options.title, text: options.text };
    await navigatorShare.share(payload);
    return true;
  } catch {
    return false;
  }
}

function isIosLikeRuntime(): boolean {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = Number(navigator.maxTouchPoints ?? 0);
  return /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
}

function isStandalonePwaRuntime(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayModeStandalone = typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return standalone || displayModeStandalone;
}

function isIphoneRuntime(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone/i.test(navigator.userAgent || "") || navigator.platform === "iPhone";
}

export async function saveBlobAsExactFileInIphonePwa(
  blob: Blob,
  filename: string,
): Promise<boolean | null> {
  if (!isIphoneRuntime() || !isStandalonePwaRuntime()) return null;
  const safeName = (filename || "download").replace(/[\/\\]+/g, "_");
  const nativeMime = /\.(?:heic|heif)$/i.test(safeName)
    ? "image/heic"
    : "application/octet-stream";
  const nativeBlob = blob.type === nativeMime
    ? blob
    : new Blob([blob], { type: nativeMime });
  return shareBlobAsNativeFile(nativeBlob, safeName, { fileOnly: true });
}

function shouldUseInlineImageSaveSurface(blob: Blob): boolean {
  return blob.type.startsWith("image/") && isIosLikeRuntime() && isStandalonePwaRuntime();
}

function presentInlineImageSaveSurface(blob: Blob, filename: string, options: { title?: string; text?: string } = {}): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;
  const imageUrl = URL.createObjectURL(blob);
  const previous = document.querySelector("[data-receiz-image-save-surface='true']");
  previous?.remove();

  const overlay = document.createElement("div");
  overlay.dataset.receizImageSaveSurface = "true";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", options.title || filename || "Receiz image");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "2147483647";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.padding = "max(18px, env(safe-area-inset-top)) 18px max(22px, env(safe-area-inset-bottom))";
  overlay.style.background = "rgba(4, 10, 18, 0.74)";
  overlay.style.backdropFilter = "blur(18px)";
  overlay.style.setProperty("-webkit-backdrop-filter", "blur(18px)");

  const frame = document.createElement("div");
  frame.style.position = "relative";
  frame.style.width = "min(92vw, 520px)";
  frame.style.maxHeight = "88vh";
  frame.style.display = "grid";
  frame.style.gap = "10px";
  frame.style.justifyItems = "center";

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = options.text || filename || "Receiz image";
  image.style.display = "block";
  image.style.width = "100%";
  image.style.maxHeight = "78vh";
  image.style.objectFit = "contain";
  image.style.borderRadius = "18px";
  image.style.boxShadow = "0 24px 80px rgba(0, 0, 0, 0.5)";
  image.style.background = "#fff";
  image.style.setProperty("-webkit-touch-callout", "default");
  image.style.userSelect = "auto";
  image.style.setProperty("-webkit-user-select", "auto");

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Close image");
  close.textContent = "Close";
  close.style.border = "0";
  close.style.borderRadius = "999px";
  close.style.padding = "10px 16px";
  close.style.font = "700 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  close.style.color = "#08111f";
  close.style.background = "#fff";
  close.style.boxShadow = "0 10px 34px rgba(0, 0, 0, 0.24)";

  const cleanup = () => {
    overlay.remove();
    window.setTimeout(() => URL.revokeObjectURL(imageUrl), 500);
  };
  close.addEventListener("click", cleanup);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) cleanup();
  });

  frame.appendChild(image);
  frame.appendChild(close);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);
  return true;
}

export async function saveBlobAsFile(
  blob: Blob,
  filename: string,
  options: { title?: string; text?: string } = {},
): Promise<boolean> {
  const safeName = (filename || "download").replace(/[\/\\]+/g, "_");
  const nativeFileSaved = await shareBlobAsNativeFile(blob, safeName, options);
  if (nativeFileSaved) return true;

  if (shouldUseInlineImageSaveSurface(blob)) {
    return presentInlineImageSaveSurface(blob, safeName, options);
  }

  downloadBlob(blob, safeName);
  return true;
}

type ProfileOriginalStorageRef = {
  bucket: string;
  path: string;
};

type ProfileOriginalUploadResponse = {
  ok?: boolean;
  provider?: "crystal";
  upload?: {
    signedUrl?: string;
    name?: string;
    mime?: string;
    sha256Hex?: string;
    size?: number;
    path?: string;
    stagingObjectName?: string;
    storage?: ProfileOriginalStorageRef | null;
  } | null;
};

function serverAttachmentDownloadHref(storage: ProfileOriginalStorageRef): string | null {
  const bucket = typeof storage.bucket === "string" ? storage.bucket.trim() : "";
  const path = typeof storage.path === "string" ? storage.path.trim() : "";
  if (!bucket || !path) return null;

  const params = new URLSearchParams();
  params.set("bucket", bucket);
  params.set("path", path);
  params.set("download", "1");
  return `/api/profile/originals/storage?${params.toString()}`;
}

class ProfileAttachmentCustodyPendingError extends Error {
  constructor() { super("PROFILE_MEDIA_CUSTODY_PENDING"); }
}

async function stageBlobWithSignedUpload(blob: Blob, filename: string, sha256: string): Promise<string | null> {
  const init = await fetch("/api/profile/originals/upload-signed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename,
      mime: blob.type || "application/octet-stream",
      sha256Hex: sha256,
      size: blob.size,
    }),
    cache: "no-store",
    credentials: "same-origin",
  });
  const json = (await init.json().catch(() => ({}))) as ProfileOriginalUploadResponse;
  const signedUrl = typeof json.upload?.signedUrl === "string" ? json.upload.signedUrl.trim() : "";
  const storage = json.upload?.storage ?? null;
  const href = storage ? serverAttachmentDownloadHref(storage) : null;
  const selectedCrystal = json.provider === "crystal";
  if (!init.ok || !json.ok || !signedUrl || !href) {
    if (selectedCrystal) throw new ProfileAttachmentCustodyPendingError();
    return null;
  }
  try {
    const upload = json.upload;
    if (selectedCrystal && (!upload?.stagingObjectName || upload.sha256Hex !== sha256 || upload.size !== blob.size
      || !upload.path || upload.storage?.path !== upload.path)) throw new ProfileAttachmentCustodyPendingError();
    const uploaded = await fetch(signedUrl, {
      method: "PUT",
      headers: { "content-type": blob.type || "application/octet-stream" },
      body: blob,
      cache: "no-store",
    });
    if (!uploaded.ok) {
      if (selectedCrystal) throw new ProfileAttachmentCustodyPendingError();
      return null;
    }
    if (selectedCrystal) {
      if (!upload) throw new ProfileAttachmentCustodyPendingError();
      const response = await fetch("/api/profile/originals/upload-signed", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "complete", filename: upload.name, mime: upload.mime, sha256Hex: upload.sha256Hex,
          size: upload.size, path: upload.path, stagingObjectName: upload.stagingObjectName }), cache: "no-store", credentials: "same-origin" });
      const completed = (await response.json().catch(() => ({}))) as ProfileOriginalUploadResponse;
      if (!response.ok || !completed.ok || completed.provider !== "crystal" || !completed.upload || completed.upload.path !== upload.path
        || completed.upload.sha256Hex !== sha256 || completed.upload.size !== blob.size || completed.upload.mime !== upload.mime
        || completed.upload.storage?.bucket !== storage?.bucket || completed.upload.storage?.path !== upload.path)
        throw new ProfileAttachmentCustodyPendingError();
    }
    return href;
  } catch (error) {
    if (selectedCrystal) throw new ProfileAttachmentCustodyPendingError();
    throw error;
  }
}

async function stageBlobWithMultipartUpload(blob: Blob, filename: string, sha256: string): Promise<string | null> {
  if (typeof FormData === "undefined") return null;
  const form = new FormData();
  form.set("file", blob, filename);
  form.set("sha256Hex", sha256);
  form.set("mime", blob.type || "application/octet-stream");

  const response = await fetch("/api/profile/originals/upload", {
    method: "POST",
    body: form,
    cache: "no-store",
    credentials: "same-origin",
  });
  const json = (await response.json().catch(() => ({}))) as ProfileOriginalUploadResponse;
  const storage = json.upload?.storage ?? null;
  const href = storage ? serverAttachmentDownloadHref(storage) : null;
  return response.ok && json.ok && href ? href : null;
}

async function stageBlobAsServerAttachment(blob: Blob, filename: string, sha256: string): Promise<string | null> {
  try {
    const href = await stageBlobWithSignedUpload(blob, filename, sha256);
    if (href) return href;
  } catch (error) {
    if (error instanceof ProfileAttachmentCustodyPendingError) throw error;
    // Fall through to the same-origin upload route.
  }

  try {
    return await stageBlobWithMultipartUpload(blob, filename, sha256);
  } catch {
    return null;
  }
}

export async function downloadBlobAsServerAttachment(
  blob: Blob,
  filename: string,
  options: { title?: string; text?: string; sha256Hex?: string } = {},
): Promise<boolean> {
  return saveBlobAsFile(blob, filename, options);
}

export async function stageBlobAsServerDownloadHref(
  blob: Blob,
  filename: string,
  options: { sha256Hex?: string } = {},
): Promise<string | null> {
  const safeName = (filename || "download").replace(/[\/\\]+/g, "_");
  const digest = options.sha256Hex && /^[0-9a-f]{64}$/i.test(options.sha256Hex)
    ? options.sha256Hex.toLowerCase()
    : await sha256Hex(new Uint8Array(await blob.arrayBuffer()));
  return stageBlobAsServerAttachment(blob, safeName, digest);
}

export function downloadBytesAsFile(bytes: Uint8Array, filename: string, mime = "application/octet-stream") {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(new Blob([copy.buffer], { type: mime }), filename);
}

export function parseAttachmentFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/["\\]/g, "_");
    } catch {
      // Ignore malformed UTF-8 encoding.
    }
  }
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
  if (!match?.[1]) return fallback;
  return match[1];
}

export async function requestDeviceDownload(href: string, fallbackName: string): Promise<void> {
  const response = await fetch(href, { cache: "no-store" });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error || `download_failed_${response.status}`);
  }
  const blob = await response.blob();
  const resolvedName = parseAttachmentFilename(response.headers.get("content-disposition"), fallbackName);
  await saveBlobAsFile(blob, resolvedName || fallbackName);
}
