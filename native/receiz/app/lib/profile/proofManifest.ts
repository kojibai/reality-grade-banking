import type { ProfileOriginal } from "@/app/lib/profile/types";
import { rewriteUserFacingAssetUrl } from "@/app/lib/userFacingAssetUrl";

export type ProofManifestRow = {
  key: string;
  label: string;
  value: string;
  valueLines?: readonly string[];
  href?: string;
  downloadName?: string;
};

type ProofManifestRowInput = Omit<ProofManifestRow, "key"> & {
  key?: string;
};

export type ReceizProofManifestData = {
  code?: unknown;
  pulse?: unknown;
  verifyPath?: unknown;
  circuit?: unknown;
  groth16Id?: unknown;
  poseidon?: unknown;
  claimHashHex?: unknown;
  mediaHashHex?: unknown;
  pbiReceiptHash?: unknown;
};

function normalizeMediaHashHex(value: string | null | undefined): string | null {
  const candidate = (value ?? "").trim();
  return /^[0-9a-f]{64}$/i.test(candidate) ? candidate.toUpperCase() : null;
}

function normalizeProofManifestKeyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function attachProofManifestRowKeys(rows: readonly ProofManifestRowInput[]): ProofManifestRow[] {
  const usedKeys = new Map<string, number>();

  return rows.map((row, index) => {
    const preferredKey = row.key?.trim() || normalizeProofManifestKeyPart(row.label) || `proof-row-${index + 1}`;
    const seenCount = usedKeys.get(preferredKey) ?? 0;
    usedKeys.set(preferredKey, seenCount + 1);
    const key = seenCount === 0 ? preferredKey : `${preferredKey}:${seenCount}`;
    return { ...row, key };
  });
}

function normalizeProofManifestText(value: unknown, maxChars = 240): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxChars);
}

function parseProofManifestCoordinateFromPath(value: unknown): { code: string | null; pulse: string | null } {
  const raw = normalizeProofManifestText(value, 1000);
  if (!raw) return { code: null, pulse: null };

  const path = (() => {
    if (!/^https?:\/\//i.test(raw)) return raw;
    try {
      return new URL(raw).pathname;
    } catch {
      return raw;
    }
  })();
  const parts = path.split("?")[0]?.split("/").filter(Boolean) ?? [];
  const vIndex = parts.findIndex((part) => part === "v");
  if (vIndex >= 0) {
    const code = normalizeProofManifestText(parts[vIndex + 2], 80);
    const pulse = normalizeProofManifestText(parts[vIndex + 3], 80);
    return { code, pulse };
  }

  const verifiedIndex = parts.findIndex((part) => part === "verified");
  if (verifiedIndex >= 0) {
    return {
      code: normalizeProofManifestText(parts[verifiedIndex + 1], 80),
      pulse: normalizeProofManifestText(parts[verifiedIndex + 2], 80),
    };
  }

  return { code: null, pulse: null };
}

function normalizeProofHashHex(value: unknown): string | null {
  const normalized = normalizeProofManifestText(value, 160);
  if (!normalized) return null;
  return /^[0-9a-f]{64}$/i.test(normalized) ? normalized.toUpperCase() : normalized;
}

export function buildProofManifestRowsFromReceizProofData(data: ReceizProofManifestData): ProofManifestRow[] {
  const verifyPath = normalizeProofManifestText(data.verifyPath, 1000);
  const parsedCoordinate = parseProofManifestCoordinateFromPath(verifyPath);
  const code = normalizeProofManifestText(data.code, 80) ?? parsedCoordinate.code;
  const pulse = normalizeProofManifestText(data.pulse, 80) ?? parsedCoordinate.pulse;
  if (!pulse && !code && !verifyPath) return [];

  const rows: ProofManifestRowInput[] = [];
  if (code || pulse) rows.push({ label: "Coordinate", value: `${code ?? "pending"}/${pulse ?? "pending"}` });
  if (pulse) rows.push({ label: "Pulse", value: pulse });
  if (verifyPath) rows.push({ label: "Verify Path", value: verifyPath });

  const circuit = normalizeProofManifestText(data.circuit, 80);
  if (circuit) rows.push({ label: "Circuit", value: circuit });

  const groth16Id = normalizeProofHashHex(data.groth16Id);
  if (groth16Id) rows.push({ label: "Groth16", value: groth16Id });

  const poseidon = normalizeProofManifestText(data.poseidon, 160);
  if (poseidon) rows.push({ label: "Poseidon", value: poseidon });

  const claimHashHex = normalizeProofHashHex(data.claimHashHex);
  if (claimHashHex) rows.push({ label: "Claim SHA-256", value: claimHashHex });

  const mediaHashHex = normalizeProofHashHex(data.mediaHashHex);
  if (mediaHashHex) rows.push({ label: "Media SHA-256", value: mediaHashHex });

  const pbiReceiptHash = normalizeProofHashHex(data.pbiReceiptHash);
  if (pbiReceiptHash) rows.push({ label: "PBI Signature", value: pbiReceiptHash });

  rows.push(
    {
      label: "Offline Verifier",
      value: "/offline-verifier.html",
      href: "/offline-verifier.html",
      downloadName: "offline-verifier.html",
    },
    {
      label: "Verification Key",
      value: "/zk/verification_key.json",
      href: "/zk/verification_key.json",
      downloadName: "verification_key.json",
    },
  );

  return attachProofManifestRowKeys(rows);
}

export function applyDerivedMediaHashToProofManifestRows(
  rows: readonly ProofManifestRowInput[],
  derivedMediaHashHex?: string | null
): ProofManifestRow[] {
  const normalizedHash = normalizeMediaHashHex(derivedMediaHashHex);
  if (!normalizedHash) return attachProofManifestRowKeys(rows);

  let replaced = false;
  let hasPopulatedMediaHash = false;
  const nextRows = rows.map((row) => {
    if (row.label !== "Media SHA-256") return row;
    if (row.value !== "Unavailable") {
      hasPopulatedMediaHash = true;
      return row;
    }
    replaced = true;
    return { ...row, value: normalizedHash };
  });

  if (replaced) return attachProofManifestRowKeys(nextRows);
  if (hasPopulatedMediaHash) return attachProofManifestRowKeys(nextRows);

  const insertAt = nextRows.findIndex((row) => row.label === "Claim SHA-256");
  if (insertAt >= 0) {
    return attachProofManifestRowKeys([
      ...nextRows.slice(0, insertAt + 1),
      { label: "Media SHA-256", value: normalizedHash },
      ...nextRows.slice(insertAt + 1),
    ]);
  }

  return attachProofManifestRowKeys([...nextRows, { label: "Media SHA-256", value: normalizedHash }]);
}

export function buildProofManifestRows(
  original: ProfileOriginal,
  derivedMediaHashHex?: string | null,
  verifiedCardBasisSha256Hex?: string | null,
): ProofManifestRow[] {
  const coordinate = `${original.code}/${original.pulse || "pending"}`;
  const mediaHashHex = original.media?.sha256Hex
    ?? original.media?.originalDownloadSha256Hex
    ?? (original.media === null ? (original.recordCardMediaSha256Hex ?? verifiedCardBasisSha256Hex) : null)
    ?? original.recordMediaSha256Hex
    ?? derivedMediaHashHex
    ?? null;
  const mediaHash = mediaHashHex ? mediaHashHex.toUpperCase() : "Unavailable";
  const grothProofId = original.proof?.groth16Id?.trim() || "Unavailable";
  const poseidonHash = original.proof?.poseidon?.trim() || "Unavailable";
  const pbiSignatureHash = original.pbiReceiptHash?.trim().toUpperCase() || "Unavailable";
  const attachmentRows: ProofManifestRowInput[] = (original.attachments ?? []).flatMap((attachment, index) => {
    const labelPrefix = `Attachment ${index + 1}`;
    return [
      {
        label: labelPrefix,
        value: attachment.name || attachment.id || "Proof attachment",
        ...(attachment.src ? { href: rewriteUserFacingAssetUrl(attachment.src) } : {}),
        ...(attachment.downloadName || attachment.name ? { downloadName: attachment.downloadName ?? attachment.name ?? undefined } : {}),
      },
      {
        label: `${labelPrefix} SHA-256`,
        value: attachment.sha256Hex ? attachment.sha256Hex.toUpperCase() : "Unavailable",
      },
    ];
  });

  return applyDerivedMediaHashToProofManifestRows([
    { label: "Coordinate", value: coordinate },
    { label: "Pulse", value: original.pulse || "pending" },
    { label: "Verify Path", value: original.verifyPath },
    { label: "Circuit", value: original.proof?.circuit || "Groth16" },
    { label: "Groth16", value: grothProofId },
    { label: "Poseidon", value: poseidonHash },
    { label: "Claim SHA-256", value: original.claimHashHex ? original.claimHashHex.toUpperCase() : "Unavailable" },
    {
      label: "Media SHA-256",
      value: mediaHashHex ? mediaHash : "Unavailable",
    },
    ...attachmentRows,
    { label: "PBI Signature", value: pbiSignatureHash === "Unavailable" ? "Not attached" : pbiSignatureHash },
    {
      label: "Offline Verifier",
      value: "/offline-verifier.html",
      href: "/offline-verifier.html",
      downloadName: "offline-verifier.html",
    },
    {
      label: "Verification Key",
      value: "/zk/verification_key.json",
      href: "/zk/verification_key.json",
      downloadName: "verification_key.json",
    },
  ], derivedMediaHashHex);
}
