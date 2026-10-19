import {RECEIZ_VERSION} from '../receiz/client';
import {
  computeIntrinsicUnsigned,
  SIGIL_VALUATION_ALGORITHM,
  SIGIL_VALUATION_POLICY,
  SIGIL_VALUATION_POLICY_CHECKSUM,
  stableStringify,
  type SigilMetadataLite,
} from '@receiz/sdk/valuation';

export const VALUE_POLICY = Object.freeze({ algorithm: SIGIL_VALUATION_ALGORITHM, checksum: SIGIL_VALUATION_POLICY_CHECKSUM });
export const MAX_INPUT_BYTES = 64 * 1024 * 1024;
export const MAX_CASHFLOWS = 64;
export const DEMO_SCENARIO = Object.freeze({ originPulse: '1000000', evaluationPulse: '1017491', seriesSize: '1', quality: 'med' as const });

export type ValueScenario = Readonly<{
  originPulse: string;
  evaluationPulse: string;
  seriesSize: string;
  quality: 'low' | 'med' | 'high';
  cashflows?: readonly Readonly<{ atPulse: string; amountPhi: string }>[];
}>;

export function canonicalInteger(value: string, name: string, positive = false): bigint {
  if (!/^(0|[1-9][0-9]*)$/.test(value) || value.length > 128 || positive && value === '0') throw new Error(`${name}: use a canonical ${positive ? 'positive' : 'nonnegative'} decimal integer.`);
  return BigInt(value);
}

export function wholePulse(value: string, name: string): number {
  const integer = canonicalInteger(value, name);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${name}: outside the calculator’s exact integer range.`);
  return Number(integer);
}

function cashflowAmount(value: string, name: string): number {
  if (value.length > 32 || !/^(0|[1-9][0-9]*)(\.[0-9]{1,6})?$/.test(value)) throw new Error(`${name}: enter a positive Φ amount with up to 6 decimal places.`);
  const [whole, fraction = ''] = value.split('.');
  const micro = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
  if (micro <= 0n || micro > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${name}: outside the calculator’s positive micro-unit range.`);
  return Number(micro) / 1_000_000;
}

/** UI illustration only. Editable metadata never acquires proof authority. */
export function calculateIllustration(scenario: ValueScenario) {
  const origin = wholePulse(scenario.originPulse, 'Origin pulse');
  const evaluation = wholePulse(scenario.evaluationPulse, 'Evaluation pulse');
  const size = wholePulse(scenario.seriesSize, 'Series size');
  if (size < 1) throw new Error('Series size: use an integer of at least 1.');
  if (evaluation < origin) throw new Error('Evaluation pulse must be at or after the origin.');
  if (!['low', 'med', 'high'].includes(scenario.quality)) throw new Error('Quality is unsupported.');
  const metadata: SigilMetadataLite = { pulse: origin, kaiPulse: origin, seriesSize: size, quality: scenario.quality };
  if (scenario.cashflows?.length) {
    if (scenario.cashflows.length > MAX_CASHFLOWS) throw new Error(`Use at most ${MAX_CASHFLOWS} cashflows.`);
    metadata.ip = { expectedCashflowPhi: scenario.cashflows.map((cashflow, index) => {
      const name = `Cashflow ${index + 1}`;
      const atPulse = wholePulse(cashflow.atPulse, `${name} pulse`);
      if (atPulse < origin) throw new Error(`${name} pulse must be at or after the origin.`);
      return { atPulse, amountPhi: cashflowAmount(cashflow.amountPhi, `${name} amount`) };
    }) };
  }
  const computation = computeIntrinsicUnsigned(metadata, evaluation);
  const phiMicro = Math.round(computation.unsigned.valuePhi * 1_000_000);
  if (!Number.isSafeInteger(phiMicro) || phiMicro < 0) throw new Error('Valuation result is outside the SDK micro-unit display range.');
  return { kind: 'illustrative-metadata' as const, metadata, evaluationPulse: evaluation, proofValuePhiMicro: String(phiMicro), ...computation };
}

/** Same source operands and explicit policy at every point. No clock, RNG or state. */
export function sampleIllustration(scenario: ValueScenario, count = 65) {
  const result = calculateIllustration(scenario);
  if (!Number.isInteger(count) || count < 2 || count > 256) throw new Error('Sample count must be between 2 and 256.');
  const origin = BigInt(scenario.originPulse), evaluation = BigInt(scenario.evaluationPulse);
  const span = evaluation - origin;
  const coordinates = Array.from({ length: count }, (_, i) => (origin + span * BigInt(i) / BigInt(count - 1)).toString());
  const samples = coordinates.map(coordinate => {
    const calculation = calculateIllustration({ ...scenario, evaluationPulse: coordinate });
    return { pulse: coordinate, valuePhi: calculation.unsigned.valuePhi, floorPhi: calculation.unsigned.inputs.rarityFloor };
  });
  return { kind: 'recomputed-model-samples' as const, result, samples };
}

export function formatPhiMicro(value: string, digits = 6): string {
  const amount = canonicalInteger(value, 'Phi micro-units');
  const whole = amount / 1_000_000n;
  const fraction = (amount % 1_000_000n).toString().padStart(6, '0');
  return `${whole.toLocaleString('en-US')}${digits ? '.' + fraction.slice(0, digits) : ''}`;
}

export function formatUsdCents(value: string): string {
  const cents = canonicalInteger(value, 'USD cents');
  return `$${(cents / 100n).toLocaleString('en-US')}.${(cents % 100n).toString().padStart(2, '0')}`;
}

export function parseEvaluationCoordinates(selected: string, additional: string): readonly string[] {
  const coordinates = [selected, ...additional.split(/[\s,]+/).filter(Boolean)];
  for (const coordinate of coordinates) wholePulse(coordinate, 'Evaluation Kai µPulse');
  if (coordinates.length > 256) throw new Error('Use at most 256 explicit evaluation coordinates.');
  return [...new Set(coordinates)];
}

export function illustrationRecord(scenario: ValueScenario) {
  const computation = calculateIllustration(scenario);
  return {
    schema: 'bankeiz.valuation-illustration.v1',
    authority: 'illustrative-metadata-only',
    sdkVersion: RECEIZ_VERSION,
    policy: SIGIL_VALUATION_POLICY,
    scenario,
    ...computation,
    writesPerformed: 0,
  };
}

export { stableStringify };
