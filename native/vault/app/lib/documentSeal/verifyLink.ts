import type { ReceizProofBundle } from "@/app/utils/receizProofBundle";

type SealMetaLike = Readonly<{
  verifyPath?: string | null;
  anchor?: {
    anchorId?: string | null;
    anchoredAt?: string | null;
    anchoredVerifyPath?: string | null;
  } | null;
  proofBundle?: Pick<ReceizProofBundle, "verifyPath" | "anchorId" | "createdAtMs"> | null;
}>;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedAnchorId(value: unknown): string {
  const normalized = asTrimmedString(value).toLowerCase();
  return /^[0-9a-f]{8}$/.test(normalized) ? normalized : "";
}

function normalizedMs(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  const normalized = asTrimmedString(value);
  return /^\d+$/.test(normalized) ? normalized : "";
}

function pathHasAnchorParams(path: string): boolean {
  try {
    const params = new URL(path, "https://receiz.local").searchParams;
    return !!params.get("a") && !!params.get("ms");
  } catch {
    return false;
  }
}

export function buildAnchoredReceizVerifyPath(args: {
  verifyPath?: string | null;
  anchorId?: string | null;
  createdAtMs?: number | string | null;
}): string {
  const verifyPath = asTrimmedString(args.verifyPath);
  if (!verifyPath) return "";
  if (pathHasAnchorParams(verifyPath)) return verifyPath;

  const anchorId = normalizedAnchorId(args.anchorId);
  const ms = normalizedMs(args.createdAtMs);
  if (!anchorId || !ms) return verifyPath;

  try {
    const url = new URL(verifyPath, "https://receiz.local");
    url.searchParams.set("a", anchorId);
    url.searchParams.set("ms", ms);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return verifyPath;
  }
}

export function anchoredReceizVerifyPathFromBundle(
  bundle: Pick<ReceizProofBundle, "verifyPath" | "anchorId" | "createdAtMs"> | null | undefined,
): string {
  if (!bundle) return "";
  return buildAnchoredReceizVerifyPath({
    verifyPath: bundle.verifyPath,
    anchorId: bundle.anchorId,
    createdAtMs: bundle.createdAtMs,
  });
}

export function anchoredReceizVerifyPathFromSealMeta(meta: SealMetaLike): string {
  const anchored = asTrimmedString(meta.anchor?.anchoredVerifyPath);
  if (anchored) return anchored;

  const fromBundle = anchoredReceizVerifyPathFromBundle(meta.proofBundle);
  if (fromBundle) return fromBundle;

  return asTrimmedString(meta.verifyPath);
}
