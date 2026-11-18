import { type ReceizValueRailV122 } from "./v122Value.js";
import { type ReceizPublicRecipientLocatorReferenceV124 } from "./v124Recipient.js";
export type ReceizLocatorBoundValueIntentV124 = Readonly<{
    schema: "receiz.locator-bound-value-intent.v124";
    rail: ReceizValueRailV122;
    amountPhiMicro: string;
    usdPerPhiMicrocents: string;
    quotedUsdCents: string;
    priceBasisDigest: string;
    sourceProofObjectId: string;
    sourceValueHead: string;
    recipientLocator: ReceizPublicRecipientLocatorReferenceV124;
    idempotencyKey: string;
    valueIntentDigest: string;
    authority: Readonly<{
        locatorIsTransferAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizLocatorBoundValueIntentInputV124 = Readonly<{
    rail: ReceizValueRailV122;
    amountPhiMicro: string;
    sourceProofObjectId: string;
    sourceValueHead: string;
    recipientLocator: ReceizPublicRecipientLocatorReferenceV124;
    usdPerPhiMicrocents: string;
    priceBasis: unknown;
    idempotencyKey?: string;
}>;
export declare function planReceizLocatorBoundValueIntentV124(input: ReceizLocatorBoundValueIntentInputV124): Promise<ReceizLocatorBoundValueIntentV124>;
export declare function validateReceizLocatorBoundValueIntentV124(value: unknown): Promise<ReceizLocatorBoundValueIntentV124>;
//# sourceMappingURL=v124LocatorBoundValue.d.ts.map