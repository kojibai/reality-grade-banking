export type SportsArenaCardListing = {
  status: "active";
  priceUsdCents: string;
  listedAt: string;
  sellerUserId?: string | null;
  sellerUsername?: string | null;
  sellerDisplayName?: string | null;
};

export function formatSportsArenaCardUsdCents(value: string | number | bigint | null | undefined): string {
  try {
    const cents = typeof value === "bigint"
      ? value
      : typeof value === "number"
        ? BigInt(Math.trunc(value))
        : typeof value === "string" && /^\d+$/.test(value.trim())
          ? BigInt(value.trim())
          : 0n;
    const safeCents = cents < 0n ? 0n : cents;
    const dollars = safeCents / 100n;
    const remainder = safeCents % 100n;
    return `$${dollars.toLocaleString("en-US")}.${remainder.toString().padStart(2, "0")}`;
  } catch {
    return "$0.00";
  }
}

export function sportsArenaCardSaleClientNonce(collectibleId: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `sports-card-sale:${collectibleId}:${random}`.slice(0, 160);
}
