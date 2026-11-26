import { bankNativeWalletValue, type BankNativeWalletAmounts } from '../../../../packages/receiz-sdk/src/nativeWalletEconomics.js';

export const nativeCurrencyPresets = ['currency', 'service-credit', 'coupon', 'rewards'] as const;
export type NativeCurrencyPreset = typeof nativeCurrencyPresets[number];
export function isNativeCurrencyPreset(value: unknown): value is NativeCurrencyPreset {
  return nativeCurrencyPresets.some(preset => preset === value);
}

export type NativeCurrencySalesWindow = Readonly<{ opensAtKaiUPulse?: string; closesAtKaiUPulse?: string }>;

/** The native asset Source retains launch terms and the two Wallet rails. */
export type NativeCurrencyPolicy = Readonly<{
  issuerControls?: true;
  preset?: NativeCurrencyPreset;
  salesWindow?: NativeCurrencySalesWindow;
} & ({
  kind: 'fixed-reserve-pool';
  priceUsdCentsPerUnit: string;
  quantityIncrementMicro?: '1000';
} | {
  kind: 'constant-product-pool';
  creatorQuantityMicro: string;
  seedUsdCents: string;
})>;

export type NativeCurrencyState = Readonly<{
  policy: NativeCurrencyPolicy;
  availableQuantityMicro: string;
  liquidityReserveUsdCents: string;
  liquidityReservePhiMicro: string;
  liquiditySettlementPhiMicro: string;
  poolValuationUsdPerPhiMicrocents?: string;
  issuerAccountId?: string;
  governanceCharterSha256?: string;
  governanceSettingsHead?: string;
  salesPaused?: boolean;
  adaptiveSupply?: true;
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

export function inspectNativeCurrencySalesWindow(value: unknown): NativeCurrencySalesWindow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('CURRENCY_INVALID');
  const fields = Object.keys(value);
  if (!fields.length || fields.some(field => field !== 'opensAtKaiUPulse' && field !== 'closesAtKaiUPulse')) return fail('CURRENCY_INVALID');
  const window = value as Record<string, unknown>;
  const opens = Object.hasOwn(window, 'opensAtKaiUPulse') ? amount(window.opensAtKaiUPulse, true) : undefined;
  const closes = Object.hasOwn(window, 'closesAtKaiUPulse') ? amount(window.closesAtKaiUPulse, true) : undefined;
  const maximumKai = BigInt(Number.MAX_SAFE_INTEGER);
  if ((opens ?? 0n) > maximumKai || (closes ?? 0n) > maximumKai
    || opens !== undefined && closes !== undefined && opens >= closes) return fail('CURRENCY_INVALID');
  return { ...(opens === undefined ? {} : { opensAtKaiUPulse: opens.toString() }),
    ...(closes === undefined ? {} : { closesAtKaiUPulse: closes.toString() }) };
}

/** Open is inclusive. Close is exclusive. The writer supplies the accepted transition coordinate. */
export function assertNativeCurrencySaleOpen(currency: NativeCurrencyState, atKaiUPulse: bigint): void {
  if (currency.salesPaused) fail('CURRENCY_SALES_PAUSED');
  const window = currency.policy.salesWindow;
  if (window?.opensAtKaiUPulse && atKaiUPulse < BigInt(window.opensAtKaiUPulse)) fail('CURRENCY_SALES_NOT_OPEN');
  if (window?.closesAtKaiUPulse && atKaiUPulse >= BigInt(window.closesAtKaiUPulse)) fail('CURRENCY_SALES_CLOSED');
}

export function inspectNativeCurrencyPolicy(value: unknown): NativeCurrencyPolicy {
  const input = value as Record<string, unknown> | null;
  const controlled = !!input && Object.hasOwn(input, 'issuerControls');
  const presetSpecified = !!input && Object.hasOwn(input, 'preset');
  const scheduled = !!input && Object.hasOwn(input, 'salesWindow');
  const fractional = !!input && Object.hasOwn(input, 'quantityIncrementMicro');
  const pool = input?.kind === 'constant-product-pool';
  const policy = record(value, ['kind', ...(pool ? ['creatorQuantityMicro', 'seedUsdCents'] : ['priceUsdCentsPerUnit']),
    ...(controlled ? ['issuerControls'] : []), ...(presetSpecified ? ['preset'] : []), ...(scheduled ? ['salesWindow'] : []),
    ...(fractional ? ['quantityIncrementMicro'] : [])]);
  if (controlled && policy.issuerControls !== true || presetSpecified && !isNativeCurrencyPreset(policy.preset)) return fail('CURRENCY_INVALID');
  if (fractional && (policy.kind !== 'fixed-reserve-pool' || policy.preset !== 'service-credit'
    || policy.quantityIncrementMicro !== '1000')) return fail('CURRENCY_INVALID');
  const extras = {
    ...(controlled ? { issuerControls: true as const } : {}),
    ...(isNativeCurrencyPreset(policy.preset) ? { preset: policy.preset } : {}),
    ...(scheduled ? { salesWindow: inspectNativeCurrencySalesWindow(policy.salesWindow) } : {}),
  };
  if (policy.kind === 'constant-product-pool') return {
    ...extras, kind: policy.kind, creatorQuantityMicro: amount(policy.creatorQuantityMicro).toString(),
    seedUsdCents: amount(policy.seedUsdCents, true).toString(),
  };
  if (policy.kind !== 'fixed-reserve-pool') return fail('CURRENCY_INVALID');
  return { ...extras, kind: policy.kind, priceUsdCentsPerUnit: amount(policy.priceUsdCentsPerUnit, true).toString(),
    ...(fractional ? { quantityIncrementMicro: '1000' as const } : {}) };
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

export function nativeCurrencyQuantityIncrement(policy?: NativeCurrencyPolicy): bigint {
  return policy?.kind === 'fixed-reserve-pool' && policy.quantityIncrementMicro === '1000' ? 1_000n : MICRO;
}

export function assertNativeCurrencyQuantity(quantityMicro: bigint, policy?: NativeCurrencyPolicy): void {
  if (quantityMicro <= 0n || quantityMicro > MAX || quantityMicro % nativeCurrencyQuantityIncrement(policy) !== 0n) fail('DENOMINATION_PRECISION');
}

export function nativeCurrencyCost(policy: Extract<NativeCurrencyPolicy, {kind: 'fixed-reserve-pool'}>, quantityMicro: bigint): bigint {
  assertNativeCurrencyQuantity(quantityMicro, policy);
  // The Wallet charges an exact whole-cent amount for the order.
  const cents = (amount(policy.priceUsdCentsPerUnit, true) * quantityMicro + MICRO - 1n) / MICRO;
  if (cents > MAX) return fail('DENOMINATION_PRECISION');
  return cents;
}

export function nativeCurrencyLaunch(policy: NativeCurrencyPolicy, supplyMicro: string) {
  const supply = amount(supplyMicro, true);
  assertNativeCurrencyQuantity(supply, policy);
  if (policy.kind === 'fixed-reserve-pool') {
    nativeCurrencyCost(policy, supply);
    return { creatorQuantityMicro: '0', marketQuantityMicro: supplyMicro, seedUsdCents: '0' };
  }
  const retained = amount(policy.creatorQuantityMicro);
  if (supply - retained < 2n * MICRO || retained % MICRO !== 0n) return fail('CURRENCY_ALLOCATION');
  return { creatorQuantityMicro: policy.creatorQuantityMicro, marketQuantityMicro: (supply - retained).toString(), seedUsdCents: policy.seedUsdCents };
}

export function nativeCurrencyPoolWallet(currency: Pick<NativeCurrencyState, 'liquidityReserveUsdCents' | 'liquidityReservePhiMicro' | 'liquiditySettlementPhiMicro'>): BankNativeWalletAmounts {
  return {
    balancePhiMicro: (BigInt(currency.liquidityReservePhiMicro) + BigInt(currency.liquiditySettlementPhiMicro)).toString(),
    reserveUsdCents: currency.liquidityReserveUsdCents,
    reserveBackingPhiMicro: currency.liquidityReservePhiMicro,
  };
}

export function nativeCurrencyPoolValue(wallet: BankNativeWalletAmounts, rate: string): bigint {
  return amount(bankNativeWalletValue(wallet, rate).totalUsdCents, true);
}

export function nativeCurrencyPrice(currency: NativeCurrencyState): string {
  if (currency.policy.kind === 'fixed-reserve-pool') return currency.policy.priceUsdCentsPerUnit;
  const available = amount(currency.availableQuantityMicro, true);
  const value = nativeCurrencyPoolValue(nativeCurrencyPoolWallet(currency), currency.poolValuationUsdPerPhiMicrocents!);
  const price = value * MICRO / available;
  return (price > 0n ? price : 1n).toString();
}

export function inspectNativeCurrency(value: unknown, cap: unknown): NativeCurrencyState {
  const policy = inspectNativeCurrencyPolicy((value as { policy?: unknown } | null)?.policy);
  const data = record(value, ['policy', 'availableQuantityMicro', 'liquidityReserveUsdCents', 'liquidityReservePhiMicro', 'liquiditySettlementPhiMicro',
    ...(policy.issuerControls ? ['issuerAccountId', 'salesPaused'] : []),
    ...(policy.kind === 'constant-product-pool' ? ['poolValuationUsdPerPhiMicrocents'] : []),
    ...(value && typeof value === 'object' && Object.hasOwn(value, 'governanceCharterSha256') ? ['governanceCharterSha256'] : []),
    ...(value && typeof value === 'object' && Object.hasOwn(value, 'governanceSettingsHead') ? ['governanceSettingsHead'] : []),
    ...(value && typeof value === 'object' && Object.hasOwn(value, 'adaptiveSupply') ? ['adaptiveSupply'] : [])]);
  const { issuerAccountId, salesPaused, governanceCharterSha256, governanceSettingsHead } = data;
  if (Object.hasOwn(data, 'governanceCharterSha256') && (!policy.issuerControls
    || typeof governanceCharterSha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(governanceCharterSha256))) return fail('CURRENCY_INVALID');
  if (policy.issuerControls && (typeof issuerAccountId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu.test(issuerAccountId)
    || typeof salesPaused !== 'boolean')) return fail('CURRENCY_INVALID');
  if (Object.hasOwn(data, 'governanceSettingsHead') && (!governanceCharterSha256
    || typeof governanceSettingsHead !== 'string' || !/^[a-f0-9]{64}$/u.test(governanceSettingsHead))) return fail('CURRENCY_INVALID');
  if (Object.hasOwn(data, 'adaptiveSupply') && (data.adaptiveSupply !== true || !governanceCharterSha256
    || policy.kind !== 'fixed-reserve-pool')) return fail('CURRENCY_INVALID');
  const supply = amount(cap);
  const available = amount(data.availableQuantityMicro);
  const pooledCents = amount(data.liquidityReserveUsdCents);
  const pooledPhi = amount(data.liquidityReservePhiMicro);
  if (supply > 0n || data.adaptiveSupply !== true) nativeCurrencyLaunch(policy, supply.toString());
  const outstanding = supply - available;
  const settlementPhi = amount(data.liquiditySettlementPhiMicro);
  const increment = nativeCurrencyQuantityIncrement(policy);
  if (available > supply || available % increment !== 0n || (pooledCents === 0n) !== (pooledPhi === 0n)) return fail('CURRENCY_INVALID');
  const reserves = {
    liquidityReserveUsdCents: pooledCents.toString(),
    liquidityReservePhiMicro: pooledPhi.toString(),
    liquiditySettlementPhiMicro: settlementPhi.toString(),
  };
  if (policy.kind === 'constant-product-pool') {
    if (available === 0n) return fail('CURRENCY_INVALID');
    nativeCurrencyPoolValue(nativeCurrencyPoolWallet(reserves), amount(data.poolValuationUsdPerPhiMicrocents, true).toString());
  } else {
    const minimumBacking = increment === MICRO ? outstanding / MICRO : (outstanding + MICRO - 1n) / MICRO;
    if ((pooledPhi < pooledCents ? pooledPhi : pooledCents) + settlementPhi < minimumBacking
      || outstanding === 0n && (pooledPhi !== 0n || settlementPhi !== 0n)) return fail('CURRENCY_INVALID');
  }
  return { policy, availableQuantityMicro: available.toString(), ...reserves,
    ...(data.adaptiveSupply===true?{adaptiveSupply:true as const}:{}),
    ...(policy.kind === 'constant-product-pool' ? { poolValuationUsdPerPhiMicrocents: data.poolValuationUsdPerPhiMicrocents as string } : {}),
    ...(policy.issuerControls ? { issuerAccountId: issuerAccountId as string, salesPaused: salesPaused as boolean } : {}),
    ...(typeof governanceCharterSha256 === 'string' ? { governanceCharterSha256 } : {}),
    ...(typeof governanceSettingsHead === 'string' ? { governanceSettingsHead } : {}) };
}

export function matchesNativeCurrencySupply(currency: unknown, supply: string, initialSupply: string) {
  return supply===initialSupply
    || (currency as NativeCurrencyState|null)?.adaptiveSupply===true && BigInt(supply)>=0n;
}

export function nativeCurrencyFields(asset: unknown): readonly string[] {
  return asset && typeof asset === 'object' && Object.hasOwn(asset, 'currency') ? ['currency'] : [];
}
