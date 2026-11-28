import { bankNativeWalletInteger } from '../../../../packages/receiz-sdk/src/nativeWalletEconomics.js';

export type NativeCurrencyPlacementDuration = Readonly<{
  pulsesPerUnit: string;
  live?: Readonly<{
    referenceImpressions: string;
    minimumPulsesPerUnit: string;
    maximumPulsesPerUnit: string;
  }>;
}>;

export type NativeCurrencyServicePricingTerms = Readonly<{
  pricingBasis?: 'paid-bookings';
  automaticIssuance?: true;
  placementDuration?: NativeCurrencyPlacementDuration;
  unitsPerPlacement: string;
  viewsPerPlacement: string;
  capacityBasisPoints: string;
  bookingWindowDays: string;
  benchmarkUsdCentsPerThousandImpressions: string;
  windowLengthKai: string;
  maximumAgeKai: string;
  venues: readonly Readonly<{ id: string; observerReceizId: string; dailyEligibleViewsLimit: string }>[];
}>;

const fail = (): never => { throw Error('BANK_NATIVE_CURRENCY_SERVICE_TERMS_INVALID'); };

function exact(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== fields.length || !fields.every(field => Object.hasOwn(value, field))) return fail();
  return value as Record<string, unknown>;
}

function positive(value: unknown): string {
  if (typeof value !== 'string' || value.length > 19) return fail();
  try { return bankNativeWalletInteger(value, true).toString(); } catch { return fail(); }
}

function inspectPlacementDuration(input: unknown): NativeCurrencyPlacementDuration {
  const dynamic = !!input && typeof input === 'object' && Object.hasOwn(input, 'live');
  const value = exact(input, ['pulsesPerUnit', ...(dynamic ? ['live'] : [])]);
  const pulsesPerUnit = positive(value.pulsesPerUnit);
  if (!dynamic) return Object.freeze({ pulsesPerUnit });
  const terms = exact(value.live, ['referenceImpressions', 'minimumPulsesPerUnit', 'maximumPulsesPerUnit']);
  const referenceImpressions = positive(terms.referenceImpressions);
  const minimumPulsesPerUnit = positive(terms.minimumPulsesPerUnit);
  const maximumPulsesPerUnit = positive(terms.maximumPulsesPerUnit);
  if (BigInt(minimumPulsesPerUnit) > BigInt(pulsesPerUnit) || BigInt(pulsesPerUnit) > BigInt(maximumPulsesPerUnit)) {
    return fail();
  }
  return Object.freeze({ pulsesPerUnit, live: Object.freeze({ referenceImpressions, minimumPulsesPerUnit, maximumPulsesPerUnit }) });
}

export function inspectNativeCurrencyServicePricingTerms(input: unknown): NativeCurrencyServicePricingTerms {
  const hasPricingBasis = !!input && typeof input === 'object' && Object.hasOwn(input, 'pricingBasis');
  const hasDuration = !!input && typeof input === 'object' && Object.hasOwn(input, 'placementDuration');
  const automaticIssuance = !!input && typeof input === 'object' && Object.hasOwn(input, 'automaticIssuance');
  const value = exact(input, [
    'unitsPerPlacement', 'viewsPerPlacement', 'capacityBasisPoints', 'bookingWindowDays',
    'benchmarkUsdCentsPerThousandImpressions', 'windowLengthKai', 'maximumAgeKai', 'venues', ...(automaticIssuance ? ['automaticIssuance'] : []),
    ...(hasDuration ? ['placementDuration'] : []), ...(hasPricingBasis ? ['pricingBasis'] : []),
  ]);
  if (automaticIssuance && value.automaticIssuance !== true) return fail();
  const duration = hasDuration ? inspectPlacementDuration(value.placementDuration) : undefined;
  if (hasPricingBasis && (value.pricingBasis !== 'paid-bookings' || !automaticIssuance || !duration || duration.live)) return fail();
  if (!Array.isArray(value.venues) || !value.venues.length || value.venues.length > 32) return fail();
  const venues = value.venues.map(entry => {
    const venue = exact(entry, ['id', 'observerReceizId', 'dailyEligibleViewsLimit']);
    if (typeof venue.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/u.test(venue.id)
      || typeof venue.observerReceizId !== 'string' || !venue.observerReceizId || venue.observerReceizId.length > 256
      || /\s/u.test(venue.observerReceizId)) return fail();
    return Object.freeze({ id: venue.id, observerReceizId: venue.observerReceizId, dailyEligibleViewsLimit: positive(venue.dailyEligibleViewsLimit) });
  });
  if (venues.some((venue, index) => index > 0 && venue.id <= venues[index - 1].id)) return fail();

  const capacityBasisPoints = positive(value.capacityBasisPoints);
  const bookingWindowDays = positive(value.bookingWindowDays);
  const windowLengthKai = positive(value.windowLengthKai);
  const maximumAgeKai = positive(value.maximumAgeKai);
  if (BigInt(capacityBasisPoints) > 10_000n || BigInt(bookingWindowDays) > 365n
    || BigInt(windowLengthKai) > 31n * 17_492n || BigInt(maximumAgeKai) > 31n * 17_492n) return fail();
  return Object.freeze({
    ...(automaticIssuance ? { automaticIssuance: true as const } : {}),
    ...(duration ? { placementDuration: duration } : {}),
    ...(hasPricingBasis ? { pricingBasis: 'paid-bookings' as const } : {}),
    unitsPerPlacement: positive(value.unitsPerPlacement), viewsPerPlacement: positive(value.viewsPerPlacement),
    capacityBasisPoints, bookingWindowDays, benchmarkUsdCentsPerThousandImpressions: positive(value.benchmarkUsdCentsPerThousandImpressions),
    windowLengthKai, maximumAgeKai, venues: Object.freeze(venues),
  });
}
