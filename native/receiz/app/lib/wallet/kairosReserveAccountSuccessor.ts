import type { ReceizKeyFileV1 } from "../../../packages/receiz-sdk/src/identity";
import { jcsCanonicalize } from "@/app/utils/jcs";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("OFFLINE_RESERVE_ACCOUNT_SUCCESSOR_PRESERVATION_REQUIRED");
  return value as Record<string, unknown>;
}

/** Preservation check beneath verified enclosing account and Reserve proofs. */
export function assertReserveAccountSourcePreserved(predecessor: ReceizKeyFileV1, successor: ReceizKeyFileV1): void {
  if (predecessor.keyId !== successor.keyId || predecessor.alg !== successor.alg
    || predecessor.crypto.publicKeyRawB64u !== successor.crypto.publicKeyRawB64u
    || predecessor.owner.uid !== successor.owner.uid) throw new Error("OFFLINE_RESERVE_ACCOUNT_PREDECESSOR_MISMATCH");
  const before = structuredClone(record(predecessor.portableState?.snapshot));
  const after = structuredClone(record(successor.portableState?.snapshot));
  const beforeWallet = record(before.wallet);
  const afterWallet = record(after.wallet);
  const beforeSummary = record(beforeWallet.routeSummary);
  const afterSummary = record(afterWallet.routeSummary);
  const beforeStates = record(beforeSummary.valueStates);
  const afterStates = record(afterSummary.valueStates);
  const beforeRollup = record(beforeSummary.rollup);
  const afterRollup = record(afterSummary.rollup);

  for (const key of ["balancePhiMicro", "balancePhi", "balanceUsd"]) beforeSummary[key] = afterSummary[key];
  for (const key of ["settledBalanceUsdCents", "settledBalanceUsd"]) beforeStates[key] = afterStates[key];
  for (const key of ["totalCreditPhiMicro", "totalCreditUsdCents", "lastEntryAt", "lastEntryKaiPulse", "lastEntryKaiUpulse"]) beforeRollup[key] = afterRollup[key];
  if (jcsCanonicalize(before) !== jcsCanonicalize(after)) throw new Error("OFFLINE_RESERVE_ACCOUNT_SUCCESSOR_PRESERVATION_REQUIRED");
}
