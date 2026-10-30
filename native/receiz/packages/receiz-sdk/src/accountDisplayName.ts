import {microPulsesSinceGenesisEpochMsV124} from "./v124KaiBridge.generated.js";

/** Display projection of an already admitted original account-creation coordinate.
 * Never samples time, fetches an identity or changes the carried source. */
export function projectReceizAccountDisplayName(input: Readonly<{
  displayName?: string | null;
  creationKaiMicroPulse?: string | number | bigint | null;
  createdAt?: string | null;
  fallback?: string;
}>): string {
  const saved = input.displayName?.trim() ?? "";
  if (saved && saved !== "Receiz ID") return saved;
  const creationMs = input.createdAt ? Date.parse(input.createdAt) : NaN;
  const value = input.creationKaiMicroPulse ?? (Number.isSafeInteger(creationMs) ? microPulsesSinceGenesisEpochMsV124(BigInt(creationMs)) : null);
  const exact = typeof value === "number" ? Number.isSafeInteger(value) && value >= 0 ? String(value) : ""
    : typeof value === "bigint" || typeof value === "string" ? String(value).trim() : "";
  if (/^[0-9]+$/u.test(exact)) return (BigInt(exact) / 1_000_000n).toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  return saved || input.fallback || "Receiz ID";
}
