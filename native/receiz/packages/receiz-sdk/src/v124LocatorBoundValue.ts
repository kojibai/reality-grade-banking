import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import {
  quoteReceizDisplayUsdV122,
  type ReceizValueRailV122,
} from "./v122Value.js";
import {
  createReceizPublicRecipientLocatorReferenceV124,
  type ReceizPublicRecipientLocatorReferenceV124,
} from "./v124Recipient.js";
import { closedRecord, digest, freeze, text } from "./v124Contracts.js";

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

const POSITIVE = /^[1-9][0-9]*$/;
const NONNEGATIVE = /^(?:0|[1-9][0-9]*)$/;
const AUTHORITY = freeze({
  locatorIsTransferAuthority: false as const,
  strongerTruth: "sealed-receiz-proof-object" as const,
});

function fail(code: string): never { throw new TypeError(code); }

function rail(value: unknown): ReceizValueRailV122 {
  if (value !== "settlement" && value !== "reserve") fail("V124_LOCATOR_VALUE_RAIL_INVALID");
  return value;
}

function positive(value: unknown, code: string): string {
  if (typeof value !== "string" || !POSITIVE.test(value)) fail(code);
  return value;
}

function nonnegative(value: unknown, code: string): string {
  if (typeof value !== "string" || !NONNEGATIVE.test(value)) fail(code);
  return value;
}

function authority(value: unknown): ReceizLocatorBoundValueIntentV124["authority"] {
  const record = closedRecord(value, ["locatorIsTransferAuthority", "strongerTruth"], "V124_LOCATOR_VALUE_AUTHORITY_INVALID");
  if (record.locatorIsTransferAuthority !== false || record.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_LOCATOR_VALUE_AUTHORITY_INVALID");
  }
  return AUTHORITY;
}

export async function planReceizLocatorBoundValueIntentV124(
  input: ReceizLocatorBoundValueIntentInputV124,
): Promise<ReceizLocatorBoundValueIntentV124> {
  const record = closedRecord(input, [
    "rail",
    "amountPhiMicro",
    "sourceProofObjectId",
    "sourceValueHead",
    "recipientLocator",
    "usdPerPhiMicrocents",
    "priceBasis",
    ...(Object.prototype.hasOwnProperty.call(input, "idempotencyKey") ? ["idempotencyKey"] : []),
  ], "V124_LOCATOR_VALUE_INPUT_INVALID");
  const exactRail = rail(record.rail);
  const amountPhiMicro = positive(record.amountPhiMicro, "V124_LOCATOR_VALUE_AMOUNT_INVALID");
  const usdPerPhiMicrocents = positive(record.usdPerPhiMicrocents, "V124_LOCATOR_VALUE_PRICE_INVALID");
  const semanticBasis = freeze({
    schema: "receiz.locator-bound-value-intent.v124" as const,
    rail: exactRail,
    amountPhiMicro,
    usdPerPhiMicrocents,
    quotedUsdCents: quoteReceizDisplayUsdV122(amountPhiMicro, usdPerPhiMicrocents),
    priceBasisDigest: await digestReceizCanonicalV122(record.priceBasis),
    sourceProofObjectId: text(record.sourceProofObjectId, "V124_LOCATOR_VALUE_SOURCE_INVALID"),
    sourceValueHead: digest(record.sourceValueHead, "V124_LOCATOR_VALUE_SOURCE_INVALID"),
    recipientLocator: await createReceizPublicRecipientLocatorReferenceV124(record.recipientLocator),
  });
  const idempotencyKey = record.idempotencyKey === undefined
    ? `receiz:locator-value:${await digestReceizCanonicalV122(semanticBasis)}`
    : text(record.idempotencyKey, "V124_LOCATOR_VALUE_IDEMPOTENCY_INVALID");
  if (idempotencyKey.length > 256) fail("V124_LOCATOR_VALUE_IDEMPOTENCY_INVALID");
  const basis = freeze({ ...semanticBasis, idempotencyKey, authority: AUTHORITY });
  return freeze({ ...basis, valueIntentDigest: await digestReceizCanonicalV122(basis) });
}

export async function validateReceizLocatorBoundValueIntentV124(
  value: unknown,
): Promise<ReceizLocatorBoundValueIntentV124> {
  const record = closedRecord(value, [
    "schema",
    "rail",
    "amountPhiMicro",
    "usdPerPhiMicrocents",
    "quotedUsdCents",
    "priceBasisDigest",
    "sourceProofObjectId",
    "sourceValueHead",
    "recipientLocator",
    "idempotencyKey",
    "valueIntentDigest",
    "authority",
  ], "V124_LOCATOR_VALUE_INTENT_INVALID");
  if (record.schema !== "receiz.locator-bound-value-intent.v124") fail("V124_LOCATOR_VALUE_INTENT_INVALID");
  const amountPhiMicro = positive(record.amountPhiMicro, "V124_LOCATOR_VALUE_AMOUNT_INVALID");
  const usdPerPhiMicrocents = positive(record.usdPerPhiMicrocents, "V124_LOCATOR_VALUE_PRICE_INVALID");
  const quotedUsdCents = nonnegative(record.quotedUsdCents, "V124_LOCATOR_VALUE_PRICE_INVALID");
  if (quotedUsdCents !== quoteReceizDisplayUsdV122(amountPhiMicro, usdPerPhiMicrocents)) {
    fail("V124_LOCATOR_VALUE_PRICE_INVALID");
  }
  const basis = freeze({
    schema: "receiz.locator-bound-value-intent.v124" as const,
    rail: rail(record.rail),
    amountPhiMicro,
    usdPerPhiMicrocents,
    quotedUsdCents,
    priceBasisDigest: digest(record.priceBasisDigest, "V124_LOCATOR_VALUE_PRICE_INVALID"),
    sourceProofObjectId: text(record.sourceProofObjectId, "V124_LOCATOR_VALUE_SOURCE_INVALID"),
    sourceValueHead: digest(record.sourceValueHead, "V124_LOCATOR_VALUE_SOURCE_INVALID"),
    recipientLocator: await createReceizPublicRecipientLocatorReferenceV124(record.recipientLocator),
    idempotencyKey: text(record.idempotencyKey, "V124_LOCATOR_VALUE_IDEMPOTENCY_INVALID"),
    authority: authority(record.authority),
  });
  if (basis.idempotencyKey.length > 256
    || digest(record.valueIntentDigest, "V124_LOCATOR_VALUE_INTENT_DIGEST_INVALID") !== await digestReceizCanonicalV122(basis)) {
    fail("V124_LOCATOR_VALUE_INTENT_DIGEST_INVALID");
  }
  return freeze({ ...basis, valueIntentDigest: record.valueIntentDigest as string });
}
