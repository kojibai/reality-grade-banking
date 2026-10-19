import { quoteReceizDisplayUsdV122 } from '@receiz/sdk';
import { SIGIL_VALUATION_POLICY } from '@receiz/sdk/valuation';
import { historicalWalletUsdRate } from '../receiz/historical-wallet';
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from '../receiz/valuation/phi-issuance.v129';
import { RECEIZ_VERSION } from '../receiz/client';
import { canonicalInteger, VALUE_POLICY } from './model';

/** The existing generic Bank wallet-rate profile, followed by the existing
 * SDK integer display conversion. Explicit inputs only; no clock or network. */
export function calculatePhiUsd(amount: string, kaiUPulse: string) {
  const selected = amount.trim();
  if (selected.length > 120 || !/^(0|[1-9]\d*)(?:\.\d{1,6})?$/.test(selected)) throw Error('Enter a nonnegative Phi amount with up to six decimal places.');
  const [whole, fraction = ''] = selected.split('.');
  const amountPhiMicro = (BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0'))).toString();
  const coordinate = canonicalInteger(kaiUPulse, 'Kai µPulse'), pulse = coordinate / 1_000_000n;
  const rate = historicalWalletUsdRate(kaiUPulse);
  const quoteInputs = { meta: { ip: { expectedCashflowPhi: [] } }, nowPulse: Number(pulse), usd: 100, currentStreakDays: 0, lifetimeUsdSoFar: 0, plannedHoldBeats: 0 };
  const quote = quotePhiForUsd(quoteInputs, DEFAULT_ISSUANCE_POLICY);
  const product = BigInt(amountPhiMicro) * BigInt(rate), numerator = product + 500_000_000_000n;
  return {
    schema: 'bankeiz.phi-usd-calculation.v1' as const, authority: 'deterministic-display-only' as const,
    sdkVersion: RECEIZ_VERSION, amountPhi: selected, amountPhiMicro,
    valuationKaiUPulse: kaiUPulse, valuationKaiPulse: pulse.toString(), usdPerPhiMicrocents: rate,
    usdCents: amountPhiMicro === '0' ? '0' : quoteReceizDisplayUsdV122(amountPhiMicro, rate),
    rateProfile: 'bank-wallet-v129' as const, conversion: { algorithm: 'receiz.display-usd.v122', version: '1' },
    quoteInputs, valuationPolicy: { ...VALUE_POLICY, constants: SIGIL_VALUATION_POLICY }, issuancePolicy: DEFAULT_ISSUANCE_POLICY,
    quote: { phiPerUsd: quote.phiPerUsd, usdPerPhi: quote.usdPerPhi, usdPerPhiFixed8: quote.usdPerPhi.toFixed(8), issuanceMultiplier: quote.issuanceMultiplier, multipliers: quote.multipliers, premium: quote.premium, adoption: quote.adoption, rarityScore: quote.rarityScore },
    trace: { product: product.toString(), halfDenominator: '500000000000', numerator: numerator.toString(), denominator: '1000000000000', remainder: (numerator % 1_000_000_000_000n).toString() },
    writesPerformed: 0,
  };
}
