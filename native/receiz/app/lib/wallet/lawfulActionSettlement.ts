import type { SupabaseClient } from "@supabase/supabase-js";

type WalletLawfulActionRpcError = {
  code?: string | null;
  message?: string | null;
};

export type WalletDisplayedTotalsInput = {
  artifactBasePhiMicro: bigint;
  artifactBaseUsdCents: bigint;
  lawfulActionPhiMicro: bigint;
  lawfulActionUsdCents: bigint;
  transactionDeltaPhiMicro: bigint;
  transactionDeltaUsdCents: bigint;
};

function nonNegative(value: bigint): bigint {
  return value > 0n ? value : 0n;
}

function parseNonNegativeBigint(value: unknown): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return nonNegative(BigInt(value));
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  return null;
}

function isMissingLawfulActionProjection(error: WalletLawfulActionRpcError): boolean {
  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST202"
    || error.code === "42883"
    || message.includes("could not find the function")
    || message.includes("function") && message.includes("does not exist")
  );
}

export function composeWalletDisplayedTotals(input: WalletDisplayedTotalsInput): {
  balancePhiMicro: bigint;
  balanceUsdCents: bigint;
} {
  return {
    balancePhiMicro: nonNegative(
      input.artifactBasePhiMicro
        + input.lawfulActionPhiMicro
        + input.transactionDeltaPhiMicro,
    ),
    balanceUsdCents: nonNegative(
      input.artifactBaseUsdCents
        + input.lawfulActionUsdCents
        + input.transactionDeltaUsdCents,
    ),
  };
}

export async function loadWalletLawfulActionSettlementPhiMicro(
  sb: SupabaseClient,
  userId: string,
): Promise<bigint | null> {
  const result = await sb.rpc("wallet_lawful_action_settlement_phi_micro_v125", {
    p_user_id: userId,
  });
  if (result.error) {
    if (isMissingLawfulActionProjection(result.error)) return null;
    throw new Error(result.error.message || "wallet_lawful_action_settlement_read_failed");
  }
  return parseNonNegativeBigint(result.data);
}
