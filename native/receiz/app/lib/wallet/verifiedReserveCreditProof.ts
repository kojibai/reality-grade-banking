import { sha256Hex } from "../../../packages/receiz-sdk/src/verifier/crypto";
import { jcsCanonicalize } from "@/app/utils/jcs";

export type VerifiedReserveCreditProof = Readonly<{
  id: string;
  kind: "reserve_credit";
  reserveCreditKind: "funded_reserve_deposit" | "payment" | "paid_download";
  createdAt: string;
  kaiUpulse: string;
  pulse: number;
  proofBundle: Readonly<{
    proofCapsule: Readonly<Record<string, unknown>>;
    capsuleHash: string;
    bundleHash: string;
    verifierUrl: string;
    verifier: "local";
    verificationVersion: "wallet-ledger-v1";
    verifiedAtPulse: number;
    proofHints: Readonly<{
      source: "wallet_ledger_v1";
      eventId: string;
      eventKind: "reserve_credit";
      createdAt: string;
    }>;
  }>;
  amountPhiMicro: string;
  amountUsdCents: string;
  balanceAfterPhiMicro: string;
  settlementId: string;
  usdPerPhiMicrocents: string;
  actor: Readonly<{ userId: string; displayName?: string }>;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function uint(value: unknown): string {
  const normalized = String(value ?? "").trim();
  return /^(0|[1-9]\d*)$/.test(normalized) ? normalized : "";
}

function hex64(value: unknown): string {
  const normalized = text(value).toLowerCase();
  return /^[0-9a-f]{64}$/.test(normalized) ? normalized : "";
}

export async function verifyReserveCreditProof(
  value: unknown,
  expectedAccountUserId: string,
): Promise<VerifiedReserveCreditProof> {
  const event = record(value);
  const bundle = record(event?.proofBundle);
  const capsule = record(bundle?.proofCapsule);
  const hints = record(bundle?.proofHints);
  const actor = record(event?.actor);
  const id = text(event?.id);
  const createdAt = text(event?.createdAt);
  const kaiUpulse = uint(event?.kaiUpulse);
  const pulse = Number(event?.pulse);
  const amountPhiMicro = uint(event?.amountPhiMicro);
  const amountUsdCents = uint(event?.amountUsdCents);
  const balanceAfterPhiMicro = uint(event?.balanceAfterPhiMicro);
  const settlementId = text(event?.settlementId);
  const usdPerPhiMicrocents = uint(event?.usdPerPhiMicrocents);
  const actorUserId = text(actor?.userId);
  const capsuleHash = hex64(bundle?.capsuleHash);
  const bundleHash = hex64(bundle?.bundleHash);
  const verifiedAtPulse = Number(bundle?.verifiedAtPulse);
  const reserveCreditKind = text(event?.reserveCreditKind);
  if (event?.kind !== "reserve_credit"
    || !["funded_reserve_deposit", "payment", "paid_download"].includes(reserveCreditKind)
    || !id || !createdAt || !Number.isFinite(Date.parse(createdAt))
    || !kaiUpulse || !Number.isSafeInteger(pulse) || pulse < 0
    || !amountPhiMicro || BigInt(amountPhiMicro) <= 0n
    || !amountUsdCents || BigInt(amountUsdCents) <= 0n
    || !balanceAfterPhiMicro || !settlementId || !usdPerPhiMicrocents
    || BigInt(usdPerPhiMicrocents) <= 0n
    || actorUserId !== expectedAccountUserId.trim()
    || !bundle || !capsule || !hints || !capsuleHash || !bundleHash
    || bundle.verifier !== "local" || bundle.verificationVersion !== "wallet-ledger-v1"
    || !Number.isSafeInteger(verifiedAtPulse) || verifiedAtPulse < 0
    || hints.source !== "wallet_ledger_v1" || hints.eventId !== id
    || hints.eventKind !== "reserve_credit" || hints.createdAt !== createdAt
    || uint(capsule.upulse) !== kaiUpulse || Number(capsule.pulse) !== pulse) {
    throw new Error("OFFLINE_RESERVE_VERIFIED_FUNDING_PROOF_REQUIRED");
  }
  if ((BigInt(amountPhiMicro) * BigInt(usdPerPhiMicrocents) + 500_000_000_000n)
    / 1_000_000_000_000n !== BigInt(amountUsdCents)) {
    throw new Error("OFFLINE_RESERVE_VERIFIED_FUNDING_PROOF_REQUIRED");
  }
  const ledgerRowId = id.startsWith("reserve_credit:") ? id.slice("reserve_credit:".length) : "";
  const expectedKaiSignature = await sha256Hex([
    "reserve_credit",
    ledgerRowId,
    createdAt,
    actorUserId,
    settlementId,
    reserveCreditKind,
    amountPhiMicro,
    amountUsdCents,
  ].join("|"));
  if (!ledgerRowId || text(capsule.kaiSignature).toLowerCase() !== expectedKaiSignature) {
    throw new Error("OFFLINE_RESERVE_VERIFIED_FUNDING_PROOF_REQUIRED");
  }
  if (await sha256Hex(jcsCanonicalize(capsule)) !== capsuleHash) {
    throw new Error("OFFLINE_RESERVE_VERIFIED_FUNDING_PROOF_REQUIRED");
  }
  const baseBundle = {
    proofCapsule: capsule,
    capsuleHash,
    verifierUrl: text(bundle.verifierUrl),
    verifier: "local" as const,
    verificationVersion: "wallet-ledger-v1" as const,
    verifiedAtPulse,
    proofHints: {
      source: "wallet_ledger_v1" as const,
      eventId: id,
      eventKind: "reserve_credit" as const,
      createdAt,
    },
  };
  if (!baseBundle.verifierUrl || await sha256Hex(jcsCanonicalize(baseBundle)) !== bundleHash) {
    throw new Error("OFFLINE_RESERVE_VERIFIED_FUNDING_PROOF_REQUIRED");
  }
  return structuredClone(event) as unknown as VerifiedReserveCreditProof;
}
