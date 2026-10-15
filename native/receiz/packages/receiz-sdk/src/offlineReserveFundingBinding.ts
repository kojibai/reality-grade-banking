import { digestReceizAuthority } from "./authorityEncoding.js";

export const RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_SCHEMA =
  "receiz.offline-reserve.funding-binding.v1" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const UINT_RE = /^(0|[1-9]\d*)$/;
const POSITIVE_UINT_RE = /^[1-9]\d*$/;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type ReceizOfflineReserveFundingBindingV1 = Readonly<{
  schema: typeof RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_SCHEMA;
  fundingProvider: "stripe";
  externalFundingEventId: string;
  checkoutSessionId: string;
  paymentIntentId: string;
  eventStatus: "funded";
  currency: "USD";
  accountUserId: string;
  receizKeyId: string;
  predecessorAccountPortableStateDigest: string;
  qualificationDigest: string;
  installationCommitment: string;
  amountUsdCents: string;
  usdPerPhiMicrocents: string;
  fundedReservePhiMicro: string;
  fundedAtKai: string;
  fundingBindingDigest: string;
}>;

type FundingInput = Omit<ReceizOfflineReserveFundingBindingV1,
  "schema" | "eventStatus" | "currency" | "fundingBindingDigest">;

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function validBasis(value: Omit<ReceizOfflineReserveFundingBindingV1, "fundingBindingDigest">): boolean {
  if (value.schema !== RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_SCHEMA
    || value.fundingProvider !== "stripe" || value.eventStatus !== "funded" || value.currency !== "USD"
    || !ID_RE.test(value.externalFundingEventId) || !ID_RE.test(value.checkoutSessionId)
    || !ID_RE.test(value.paymentIntentId) || !ID_RE.test(value.accountUserId)
    || !SHA256_RE.test(value.receizKeyId) || !SHA256_RE.test(value.predecessorAccountPortableStateDigest)
    || !SHA256_RE.test(value.qualificationDigest) || !SHA256_RE.test(value.installationCommitment)
    || !POSITIVE_UINT_RE.test(value.amountUsdCents) || !POSITIVE_UINT_RE.test(value.usdPerPhiMicrocents)
    || !POSITIVE_UINT_RE.test(value.fundedReservePhiMicro) || !UINT_RE.test(value.fundedAtKai)) return false;
  const projectedUsdCents = (
    BigInt(value.fundedReservePhiMicro) * BigInt(value.usdPerPhiMicrocents) + 500_000_000_000n
  ) / 1_000_000_000_000n;
  const canonicalFundedPhiMicro = (
    BigInt(value.amountUsdCents) * 1_000_000_000_000n
  ) / BigInt(value.usdPerPhiMicrocents);
  return projectedUsdCents === BigInt(value.amountUsdCents)
    && BigInt(value.fundedReservePhiMicro) === canonicalFundedPhiMicro;
}

export async function createReceizOfflineReserveFundingBinding(
  input: FundingInput,
): Promise<ReceizOfflineReserveFundingBindingV1> {
  const basis = Object.freeze({
    schema: RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_SCHEMA,
    fundingProvider: input.fundingProvider,
    externalFundingEventId: input.externalFundingEventId,
    checkoutSessionId: input.checkoutSessionId,
    paymentIntentId: input.paymentIntentId,
    eventStatus: "funded" as const,
    currency: "USD" as const,
    accountUserId: input.accountUserId,
    receizKeyId: input.receizKeyId,
    predecessorAccountPortableStateDigest: input.predecessorAccountPortableStateDigest,
    qualificationDigest: input.qualificationDigest,
    installationCommitment: input.installationCommitment,
    amountUsdCents: input.amountUsdCents,
    usdPerPhiMicrocents: input.usdPerPhiMicrocents,
    fundedReservePhiMicro: input.fundedReservePhiMicro,
    fundedAtKai: input.fundedAtKai,
  });
  if (!validBasis(basis)) throw new TypeError("RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_INVALID");
  return Object.freeze({
    ...basis,
    fundingBindingDigest: await digestReceizAuthority("receipt", basis.schema, basis),
  });
}

export async function verifyReceizOfflineReserveFundingBinding(
  input: unknown,
): Promise<ReceizOfflineReserveFundingBindingV1> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_INVALID");
  }
  const value = input as Record<string, unknown>;
  const keys = ["schema", "fundingProvider", "externalFundingEventId", "checkoutSessionId", "paymentIntentId",
    "eventStatus", "currency", "accountUserId", "receizKeyId", "predecessorAccountPortableStateDigest",
    "qualificationDigest", "installationCommitment", "amountUsdCents", "usdPerPhiMicrocents",
    "fundedReservePhiMicro", "fundedAtKai", "fundingBindingDigest"] as const;
  if (!exactKeys(value, keys)) throw new TypeError("RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_INVALID");
  const binding = value as unknown as ReceizOfflineReserveFundingBindingV1;
  const { fundingBindingDigest, ...basis } = binding;
  if (!SHA256_RE.test(fundingBindingDigest) || !validBasis(basis)
    || await digestReceizAuthority("receipt", basis.schema, basis) !== fundingBindingDigest) {
    throw new TypeError("RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_INVALID");
  }
  return Object.freeze(structuredClone(binding));
}

export function deriveReceizOfflineReserveFundingOwnerId(
  binding: Pick<ReceizOfflineReserveFundingBindingV1, "fundingBindingDigest">,
): string {
  if (!SHA256_RE.test(binding.fundingBindingDigest)) {
    throw new TypeError("RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_INVALID");
  }
  return `fund_${binding.fundingBindingDigest.slice(0, 16)}.receiz.id`;
}
