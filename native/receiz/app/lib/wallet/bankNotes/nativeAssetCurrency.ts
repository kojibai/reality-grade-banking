/** A fixed-price primary sale and two-rail pool carried inside the existing native asset Source. */
export type NativeCurrencyPolicy = Readonly<{
  kind: 'fixed-reserve-pool';
  priceUsdCentsPerUnit: string;
  issuerControls?: true;
}>;

export type NativeCurrencyState = Readonly<{
  policy: NativeCurrencyPolicy;
  availableQuantityMicro: string;
  liquidityReserveUsdCents: string;
  liquidityReservePhiMicro: string;
  liquiditySettlementPhiMicro: string;
  issuerAccountId?: string;
  governanceCharterSha256?: string;
  governanceSettingsHead?: string;
  salesPaused?: boolean;
}>;
export type NativeCurrencyChanges = Readonly<{ priceUsdCentsPerUnit?: string; salesPaused?: boolean }>;

export type NativeCurrencyManagement = NativeCurrencyChanges & Readonly<{ governanceCharterSha256?: string; governanceEvidenceSha256?: string }>;

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
  const controlled = !!value && typeof value === 'object' && Object.hasOwn(value, 'issuerControls');
  const policy = record(value, ['kind', 'priceUsdCentsPerUnit', ...(controlled ? ['issuerControls'] : [])]);
  if (policy.kind !== 'fixed-reserve-pool' || controlled && policy.issuerControls !== true) return fail('CURRENCY_INVALID');
  return { kind: policy.kind, priceUsdCentsPerUnit: amount(policy.priceUsdCentsPerUnit, true).toString(),
    ...(controlled ? { issuerControls: true } : {}) };
}

export function inspectNativeCurrencyChanges(value: unknown): NativeCurrencyChanges {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('CURRENCY_INVALID');
  const fields = Object.keys(value);
  if (!fields.length || fields.some(key => key !== 'priceUsdCentsPerUnit' && key !== 'salesPaused')) return fail('CURRENCY_INVALID');
  const changes = value as Record<string, unknown>;
  const price = Object.hasOwn(changes, 'priceUsdCentsPerUnit') ? amount(changes.priceUsdCentsPerUnit, true).toString() : undefined;
  const paused = changes.salesPaused;
  if (Object.hasOwn(changes, 'salesPaused') && typeof paused !== 'boolean') return fail('CURRENCY_INVALID');
  return { ...(price === undefined ? {} : { priceUsdCentsPerUnit: price }),
    ...(typeof paused === 'boolean' ? { salesPaused: paused } : {}) };
}

export function inspectNativeCurrencyManagement(value: unknown): NativeCurrencyManagement {
  if (value && typeof value === 'object' && Object.hasOwn(value, 'governanceCharterSha256')) {
    const { governanceCharterSha256, governanceEvidenceSha256 } = record(value, ['governanceCharterSha256', 'governanceEvidenceSha256']);
    if (typeof governanceCharterSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(governanceCharterSha256)) return fail('CURRENCY_INVALID');
    if (typeof governanceEvidenceSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(governanceEvidenceSha256)) return fail('CURRENCY_INVALID');
    return { governanceCharterSha256, governanceEvidenceSha256 };
  }
  return inspectNativeCurrencyChanges(value);
}

export function nativeCurrencyCost(policy: NativeCurrencyPolicy, quantityMicro: bigint): bigint {
  const cents = amount(policy.priceUsdCentsPerUnit, true) * (quantityMicro / MICRO);
  if (quantityMicro % MICRO !== 0n || cents > MAX) return fail('DENOMINATION_PRECISION');
  return cents;
}

export function inspectNativeCurrency(value: unknown, cap: unknown): NativeCurrencyState {
  const policy = inspectNativeCurrencyPolicy((value as { policy?: unknown } | null)?.policy);
  const data = record(value, ['policy', 'availableQuantityMicro', 'liquidityReserveUsdCents', 'liquidityReservePhiMicro', 'liquiditySettlementPhiMicro',
    ...(policy.issuerControls ? ['issuerAccountId', 'salesPaused'] : []),
    ...(value && typeof value === 'object' && Object.hasOwn(value, 'governanceCharterSha256') ? ['governanceCharterSha256'] : []),
    ...(value && typeof value === 'object' && Object.hasOwn(value, 'governanceSettingsHead') ? ['governanceSettingsHead'] : [])]);
  const { issuerAccountId, salesPaused, governanceCharterSha256, governanceSettingsHead } = data;
  if (Object.hasOwn(data, 'governanceCharterSha256') && (!policy.issuerControls
    || typeof governanceCharterSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(governanceCharterSha256))) return fail('CURRENCY_INVALID');
  if (policy.issuerControls && (typeof issuerAccountId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu.test(issuerAccountId)
    || typeof salesPaused !== 'boolean')) return fail('CURRENCY_INVALID');
  if (Object.hasOwn(data, 'governanceSettingsHead') && (!governanceCharterSha256
    || typeof governanceSettingsHead !== 'string' || !/^[a-f0-9]{64}$/u.test(governanceSettingsHead))) return fail('CURRENCY_INVALID');
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
    liquidityReservePhiMicro: pooledPhi.toString(), liquiditySettlementPhiMicro: settlementPhi.toString(),
    ...(policy.issuerControls ? { issuerAccountId: issuerAccountId as string, salesPaused: salesPaused as boolean } : {}),
    ...(typeof governanceCharterSha256 === 'string' ? { governanceCharterSha256 } : {}),
    ...(typeof governanceSettingsHead === 'string' ? { governanceSettingsHead } : {}) };
}

export function nativeCurrencyFields(asset: unknown): readonly string[] {
  return asset && typeof asset === 'object' && Object.hasOwn(asset, 'currency') ? ['currency'] : [];
}
