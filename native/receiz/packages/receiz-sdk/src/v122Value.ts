import { digestReceizCanonicalV122 } from "./v122Canonical.js";

export type ReceizValueRailV122 = "settlement" | "reserve";
export type ReceizWorldValueIntentV122 = Readonly<{
  schema: "receiz.world.value-intent.v122";
  rail: ReceizValueRailV122;
  amountPhiMicro: string;
  usdPerPhiMicrocents: string;
  quotedUsdCents: string;
  priceBasisDigest: string;
  sourceProofObjectId: string;
  sourceValueHead: string;
  destinationSubjectId: string;
  expectedDestinationHead: string;
  /** Added for v123 live execution. Historical v122 intents remain verifiable without it. */
  idempotencyKey?: string;
  valueIntentDigest: string;
}>;

const positive = (value: string) => /^[1-9][0-9]*$/.test(value);

export function quoteReceizDisplayUsdV122(amountPhiMicro: string, usdPerPhiMicrocents: string): string {
  if (!positive(amountPhiMicro) || !positive(usdPerPhiMicrocents)) throw new TypeError("V122_PHI_DISPLAY_QUOTE_INVALID");
  const denominator = 1_000_000_000_000n;
  return ((BigInt(amountPhiMicro) * BigInt(usdPerPhiMicrocents) + denominator / 2n) / denominator).toString();
}

export async function planReceizValueIntentV122(input: Readonly<{
  rail: ReceizValueRailV122;
  amountPhiMicro: string;
  sourceProofObjectId: string;
  sourceValueHead: string;
  destinationSubjectId: string;
  expectedDestinationHead: string;
  usdPerPhiMicrocents: string;
  priceBasis: unknown;
  idempotencyKey?: string;
}>): Promise<ReceizWorldValueIntentV122> {
  if (input.rail !== "settlement" && input.rail !== "reserve") throw new TypeError("V122_VALUE_RAIL_INVALID");
  if (!positive(input.amountPhiMicro)) throw new TypeError("V122_PHI_AMOUNT_INVALID");
  const semanticBasis = {
    schema: "receiz.world.value-intent.v122" as const,
    rail: input.rail,
    amountPhiMicro: input.amountPhiMicro,
    usdPerPhiMicrocents: input.usdPerPhiMicrocents,
    quotedUsdCents: quoteReceizDisplayUsdV122(input.amountPhiMicro, input.usdPerPhiMicrocents),
    priceBasisDigest: await digestReceizCanonicalV122(input.priceBasis),
    sourceProofObjectId: input.sourceProofObjectId,
    sourceValueHead: input.sourceValueHead,
    destinationSubjectId: input.destinationSubjectId,
    expectedDestinationHead: input.expectedDestinationHead,
  };
  const idempotencyKey = input.idempotencyKey?.trim() || `receiz:value:${await digestReceizCanonicalV122(semanticBasis)}`;
  if (idempotencyKey.length < 1 || idempotencyKey.length > 256) throw new TypeError("V122_VALUE_IDEMPOTENCY_KEY_INVALID");
  const basis = { ...semanticBasis, idempotencyKey };
  return Object.freeze({ ...basis, valueIntentDigest: await digestReceizCanonicalV122(basis) });
}

export const planReceizSettlementV122 = (input: Omit<Parameters<typeof planReceizValueIntentV122>[0], "rail">) => planReceizValueIntentV122({ ...input, rail: "settlement" });
export const planReceizReserveV122 = (input: Omit<Parameters<typeof planReceizValueIntentV122>[0], "rail">) => planReceizValueIntentV122({ ...input, rail: "reserve" });

export async function validateReceizValueIntentV122(value: ReceizWorldValueIntentV122): Promise<boolean> {
  if (value.rail !== "settlement" && value.rail !== "reserve") return false;
  if (!positive(value.amountPhiMicro) || (value.idempotencyKey !== undefined && (typeof value.idempotencyKey !== "string" || !value.idempotencyKey || value.idempotencyKey.length > 256))
    || value.quotedUsdCents !== quoteReceizDisplayUsdV122(value.amountPhiMicro, value.usdPerPhiMicrocents)) return false;
  const { valueIntentDigest, ...basis } = value;
  return await digestReceizCanonicalV122(basis) === valueIntentDigest;
}

export async function validateReceizDisplayPriceV122(input: Readonly<{
  amountPhiMicro: string;
  usdPerPhiMicrocents: string;
  quotedUsdCents: string;
  priceBasis: unknown;
  priceBasisDigest: string;
}>): Promise<boolean> {
  if (!positive(input.amountPhiMicro) || !positive(input.usdPerPhiMicrocents)) return false;
  return input.quotedUsdCents === quoteReceizDisplayUsdV122(input.amountPhiMicro, input.usdPerPhiMicrocents)
    && input.priceBasisDigest === await digestReceizCanonicalV122(input.priceBasis);
}
