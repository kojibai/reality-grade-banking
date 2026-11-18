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
export declare function quoteReceizDisplayUsdV122(amountPhiMicro: string, usdPerPhiMicrocents: string): string;
export declare function planReceizValueIntentV122(input: Readonly<{
    rail: ReceizValueRailV122;
    amountPhiMicro: string;
    sourceProofObjectId: string;
    sourceValueHead: string;
    destinationSubjectId: string;
    expectedDestinationHead: string;
    usdPerPhiMicrocents: string;
    priceBasis: unknown;
    idempotencyKey?: string;
}>): Promise<ReceizWorldValueIntentV122>;
export declare const planReceizSettlementV122: (input: Omit<Parameters<typeof planReceizValueIntentV122>[0], "rail">) => Promise<Readonly<{
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
}>>;
export declare const planReceizReserveV122: (input: Omit<Parameters<typeof planReceizValueIntentV122>[0], "rail">) => Promise<Readonly<{
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
}>>;
export declare function validateReceizValueIntentV122(value: ReceizWorldValueIntentV122): Promise<boolean>;
export declare function validateReceizDisplayPriceV122(input: Readonly<{
    amountPhiMicro: string;
    usdPerPhiMicrocents: string;
    quotedUsdCents: string;
    priceBasis: unknown;
    priceBasisDigest: string;
}>): Promise<boolean>;
//# sourceMappingURL=v122Value.d.ts.map