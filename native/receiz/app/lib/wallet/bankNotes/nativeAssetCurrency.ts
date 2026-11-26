/** A fixed-price primary sale and two-rail pool carried inside the existing native asset Source. */
export type NativeCurrencyPolicy = Readonly<{
  kind: 'fixed-reserve-pool';
  priceUsdCentsPerUnit: string;
}>;

export type NativeCurrencyState = Readonly<{
  policy: NativeCurrencyPolicy;
  availableQuantityMicro: string;
  liquidityReserveUsdCents: string;
  liquidityReservePhiMicro: string;
  liquiditySettlementPhiMicro: string;
}>;

const MICRO = 1_000_000n;
const MAX = 9_223_372_036_854_775_807n;
const fail = (code: string): never => { throw Error(`BANK_NATIVE_ASSET_${code}`); };

function amount(value: unknown, positive = false): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,18})$/u.test(value)) return fail('CURRENCY_INVALID');
  const parsed = BigInt(value);
  if (parsed > MAX || (positive && parsed === 0n)) return fail('CURRENCY_INVALID');
  return parsed;
}

function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== fields.length || !fields.every(field => Object.hasOwn(value, field))) return fail('CURRENCY_INVALID');
  return value as Record<string, unknown>;
}

export function inspectNativeCurrencyPolicy(value: unknown): NativeCurrencyPolicy {
  const policy = record(value, ['kind', 'priceUsdCentsPerUnit']);
  if (policy.kind !== 'fixed-reserve-pool') return fail('CURRENCY_INVALID');
  return { kind: policy.kind, priceUsdCentsPerUnit: amount(policy.priceUsdCentsPerUnit, true).toString() };
}

export function nativeCurrencyCost(policy: NativeCurrencyPolicy, quantityMicro: bigint): bigint {
  const cents = amount(policy.priceUsdCentsPerUnit, true) * (quantityMicro / MICRO);
  if (quantityMicro % MICRO !== 0n || cents > MAX) return fail('DENOMINATION_PRECISION');
  return cents;
}

export function inspectNativeCurrency(value: unknown, cap: unknown): NativeCurrencyState {
  const data = record(value, ['policy', 'availableQuantityMicro', 'liquidityReserveUsdCents', 'liquidityReservePhiMicro', 'liquiditySettlementPhiMicro']);
  const policy = inspectNativeCurrencyPolicy(data.policy);
  const supply = amount(cap, true);
  const available = amount(data.availableQuantityMicro);
  const pooledCents = amount(data.liquidityReserveUsdCents);
  const pooledPhi = amount(data.liquidityReservePhiMicro);
  nativeCurrencyCost(policy, supply);
  const outstanding = supply - available;
  const settlementPhi = amount(data.liquiditySettlementPhiMicro);
  if (available > supply || available % MICRO !== 0n
    || (pooledCents === 0n) !== (pooledPhi === 0n)
    || (pooledPhi < pooledCents ? pooledPhi : pooledCents) + settlementPhi < outstanding / MICRO
    || outstanding === 0n && (pooledPhi !== 0n || settlementPhi !== 0n)) return fail('CURRENCY_INVALID');
  return { policy, availableQuantityMicro: available.toString(), liquidityReserveUsdCents: pooledCents.toString(),
    liquidityReservePhiMicro: pooledPhi.toString(), liquiditySettlementPhiMicro: settlementPhi.toString() };
}

export function nativeCurrencyFields(asset: unknown): readonly string[] {
  return asset && typeof asset === 'object' && Object.hasOwn(asset, 'currency') ? ['currency'] : [];
}
