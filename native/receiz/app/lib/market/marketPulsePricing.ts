import type {MarketDeskItem,MarketDeskPulseValueSeed} from './types';
import {DEFAULT_ISSUANCE_POLICY,quotePhiForUsd} from '../../utils/phi-issuance';
import {computeIntrinsicUnsigned,type SigilMetadataLite} from '../../utils/valuation';
const DEFAULT_USD_PER_PHI=1,MARKET_QUOTE_SAMPLE_USD=100;
const MARKET_QUOTE_META={ip:{expectedCashflowPhi:[]}}as unknown as SigilMetadataLite;
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const roundTo=(value:number,digits=2)=>Math.round(value*10**digits)/10**digits;
const asPositiveNumber=(value:number|null|undefined,fallback:number)=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:fallback;
export type MarketPulsePriceBasis=Pick<MarketDeskItem,'id'|'source'|'priceUsd'|'pricePhi'|'intrinsicPhi'|'quoteUsdPerPhi'|'changePct'|'livePulseSeed'|'pricingSourceKey'>;
function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function valuationMetaFromPulseSeed(seed: MarketDeskPulseValueSeed): SigilMetadataLite {
  return {
    pulse: seed.claimPulse,
    kaiPulse: seed.claimPulse,
    beat: seed.beat,
    stepIndex: seed.stepIndex,
    stepsPerBeat: 44,
    quality: "high",
    creatorVerified: seed.creatorVerified,
    creatorRep: 0,
    frequencyHz: seed.frequencyHz,
    chakraDay: seed.chakraDay ?? undefined,
    kaiSignature: seed.kaiSignature ?? undefined,
    userPhiKey: seed.userPhiKey ?? undefined,
  };
}

export function marketPulseWave(seedKey: string, pulse: number): number {
  const basePulse = Math.max(0, Math.trunc(pulse));
  const phaseA = (hashString(`${seedKey}:pulse-a`) % 6283) / 1000;
  const phaseB = (hashString(`${seedKey}:pulse-b`) % 6283) / 1000;
  const phaseC = (hashString(`${seedKey}:pulse-c`) % 6283) / 1000;
  return (
    Math.sin(basePulse * 0.173 + phaseA) * 0.56 +
    Math.cos(basePulse * 0.071 + phaseB) * 0.31 +
    Math.sin(basePulse * 0.287 + phaseC) * 0.13
  );
}

export function marketDeskQuoteUsdPerPhiAtPulse(pulse: number, fallbackUsdPerPhi = DEFAULT_USD_PER_PHI): number {
  const safePulse = Math.max(0, Math.trunc(pulse));
  try {
    const quote = quotePhiForUsd(
      {
        meta: MARKET_QUOTE_META,
        nowPulse: safePulse,
        usd: MARKET_QUOTE_SAMPLE_USD,
        currentStreakDays: 0,
        lifetimeUsdSoFar: 0,
        plannedHoldBeats: 0,
      },
      DEFAULT_ISSUANCE_POLICY,
    );
    return asPositiveNumber(quote.usdPerPhi, asPositiveNumber(fallbackUsdPerPhi, DEFAULT_USD_PER_PHI));
  } catch {
    return asPositiveNumber(fallbackUsdPerPhi, DEFAULT_USD_PER_PHI);
  }
}

/** The existing connected price calculation, without charts, positions, I/O or
 * a clock read. Financial custody and input completeness are separate checks. */
export function marketPulsePriceAtPulse(item:MarketPulsePriceBasis,pulse:number,quoteUsdPerPhi=marketDeskQuoteUsdPerPhiAtPulse(pulse,item.quoteUsdPerPhi)){
  const safePulse = Math.max(0, Math.trunc(pulse));
  const liveQuoteUsdPerPhi = asPositiveNumber(quoteUsdPerPhi, item.quoteUsdPerPhi || DEFAULT_USD_PER_PHI);
  const pricingSourceKey = item.pricingSourceKey ?? item.id;

  let itemQuoteUsdPerPhi = liveQuoteUsdPerPhi;
  let livePricePhi = Math.max(0.000001, roundTo(item.pricePhi, 6));
  let liveIntrinsicPhi = Math.max(0.000001, roundTo(item.intrinsicPhi || item.pricePhi, 6));

  if (item.livePulseSeed?.kind === "sigil") {
    const meta = valuationMetaFromPulseSeed(item.livePulseSeed);
    const valuationPulse = Math.max(item.livePulseSeed.claimPulse, safePulse);
    const { unsigned } = computeIntrinsicUnsigned(meta, valuationPulse);
    livePricePhi = Math.max(0.000001, roundTo(asPositiveNumber(unsigned.valuePhi, item.pricePhi), 6));
    liveIntrinsicPhi = livePricePhi;
    try {
      const quote = quotePhiForUsd(
        {
          meta,
          nowPulse: valuationPulse,
          usd: MARKET_QUOTE_SAMPLE_USD,
          currentStreakDays: 0,
          lifetimeUsdSoFar: 0,
          plannedHoldBeats: 0,
        },
        DEFAULT_ISSUANCE_POLICY,
      );
      itemQuoteUsdPerPhi = asPositiveNumber(quote.usdPerPhi, liveQuoteUsdPerPhi);
    } catch {
      itemQuoteUsdPerPhi = liveQuoteUsdPerPhi;
    }
  } else {
    const basePricePhi = Math.max(0.000001, item.pricePhi || item.priceUsd / Math.max(item.quoteUsdPerPhi, DEFAULT_USD_PER_PHI));
    const baseIntrinsicPhi = Math.max(0.000001, item.intrinsicPhi || basePricePhi * 0.97);
    const moveAmplitude =
      item.source === "assetseal"
        ? clamp(0.008 + Math.abs(item.changePct) / 420, 0.008, 0.028)
        : clamp(0.0045 + Math.abs(item.changePct) / 620, 0.0045, 0.018);
    livePricePhi = Math.max(0.000001, roundTo(basePricePhi * (1 + marketPulseWave(pricingSourceKey, safePulse) * moveAmplitude), 6));
    liveIntrinsicPhi = Math.max(
      0.000001,
      roundTo(baseIntrinsicPhi * (1 + marketPulseWave(`${pricingSourceKey}:pv`, safePulse) * moveAmplitude * 0.55), 6),
    );
  }

  const livePriceUsd = roundTo(livePricePhi * itemQuoteUsdPerPhi, 2);
  const liveChangePct = roundTo(
    item.changePct + ((livePricePhi / Math.max(item.pricePhi || 0.000001, 0.000001) - 1) * 100),
    2,
  );
  return {priceUsd:livePriceUsd,pricePhi:livePricePhi,intrinsicPhi:liveIntrinsicPhi,quoteUsdPerPhi:itemQuoteUsdPerPhi,changePct:liveChangePct};
}

function usdCentsFromNumber(value: number): bigint {
  return BigInt(Math.max(0, Math.round((Number.isFinite(value) ? value : 0) * 100)));
}

export function marketShareTargetBudgetUsdCentsForItem(item: Pick<MarketDeskItem,"liquidityUsd"|"volumeUsd"|"holders"|"priceUsd">): bigint {
  const liquidityUsdCents = usdCentsFromNumber(item.liquidityUsd);
  const volumeUsdCents = usdCentsFromNumber(item.volumeUsd);
  const holderFloorUsdCents = BigInt(Math.max(8_500, Math.min(42_500, item.holders * 35))) * 100n;
  const liquidityBudgetUsdCents = (liquidityUsdCents * 12n) / 10n;
  const volumeBudgetUsdCents = (volumeUsdCents * 18n) / 100n;
  const referenceFloorUsdCents = BigInt(Math.max(12_000, Math.round(item.priceUsd * 180))) * 100n;
  return [holderFloorUsdCents, liquidityBudgetUsdCents, volumeBudgetUsdCents, referenceFloorUsdCents, 1_200_000n].reduce(
    (max, current) => (current > max ? current : max),
    0n,
  );
}
