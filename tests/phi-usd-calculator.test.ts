import {expect,it,vi} from 'vitest';
import {calculatePhiUsd} from '../src/value-explainer/phi-usd';
import {publicSigilQuoteAtPulse} from '../src/receiz/market-projection/project';
import type {MarketPulseSeed} from '../src/receiz/market-projection/source';
const seed:MarketPulseSeed={kind:'sigil',claimPulse:1000000,beat:12,stepIndex:3,creatorVerified:true};
const meta={pulse:seed.claimPulse,kaiPulse:seed.claimPulse,beat:seed.beat,stepIndex:seed.stepIndex,stepsPerBeat:44,quality:'high' as const,creatorVerified:seed.creatorVerified,creatorRep:0};
// Captured independently from Receiz 718468537 app/utils/phi-issuance.ts with
// its own app/utils/valuation.ts, not calculated using Bank's shared helper.
it.each([
 [1000000,51.602209916,6371,53.832569404,6646],
 [14692714,366.181122704,45208,382.058677336,47168],
 [14710100,418.008299137,51606,435.903069106,53815],
 [14710101,418.053908888,51612,435.950197049,53821],
])('matches the independent Receiz host quote and cents at pulse %s',(pulse,illustrativeRate,illustrativeCents,marketRate,marketCents)=>{
 const coordinate=String(BigInt(pulse)*1000000n),illustration=calculatePhiUsd('1.234567',coordinate,{pulse:1000000,kaiPulse:1000000,seriesSize:1,quality:'med'}),market=calculatePhiUsd('1.234567',coordinate,meta);
 expect(illustration.quote.usdPerPhi).toBe(illustrativeRate);expect(illustration.usdCents).toBe(String(illustrativeCents));expect(market.quote.usdPerPhi).toBe(marketRate);expect(market.usdCents).toBe(String(marketCents));
});
it.each([1000000,14692714,14710100,14710101])('matches the exact Market proof-object quote and displayed USD cents at pulse %s',pulse=>{
 const market=publicSigilQuoteAtPulse(seed,pulse),result=calculatePhiUsd(String(market.pricePhi),(BigInt(pulse)*1000000n).toString(),meta);
 expect(result.quote.usdPerPhi).toBe(market.quoteUsdPerPhi);expect(result.usdCents).toBe(String(Math.round(market.priceUsd*100)));expect(result.conversion.algorithm).toBe('receiz.market-proof-usd.v129');
 expect(result.quoteInputs.meta).toEqual(meta);expect(result.trace.rounding).toBe('Math.round(Phi × USDPerPhi × 100)');expect(result.writesPerformed).toBe(0);
});
it('uses the object metadata instead of the generic wallet rate, and the amount cannot change its exchange rate',()=>{
 const first=calculatePhiUsd('1','14692714000000',meta),more=calculatePhiUsd('200','14692714000000',meta),other=calculatePhiUsd('1','14692714000000',{...meta,quality:'low'});
 expect(more.quote.usdPerPhi).toBe(first.quote.usdPerPhi);expect(other.quote.usdPerPhi).not.toBe(first.quote.usdPerPhi);
});
it('is independent of call order, clock and network, and exports the full exact calculation',()=>{
 vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('CLOCK_FORBIDDEN');});
 try{const first=calculatePhiUsd('1.234567','14692714000000',meta);calculatePhiUsd('2','14710100000000',meta);expect(calculatePhiUsd('1.234567','14692714000000',meta)).toEqual(first);expect(JSON.parse(JSON.stringify(first))).toEqual(first);}finally{vi.unstubAllGlobals();vi.restoreAllMocks();}
});
it.each(['0','0.000001','1.234567'])('uses Market binary64 rounding for %s Φ without an eight-decimal rate substitution',amount=>{const result=calculatePhiUsd(amount,'14692714000000',meta);expect(result.usdCents).toBe(String(Math.round(Number(amount)*result.quote.usdPerPhi*100)));});
it.each(['-1','1e3','1,000','01','1.0000001','','Infinity','9'.repeat(121),'9007199254740993'])('rejects ambiguous or unsupported Market arithmetic for %s',amount=>{expect(()=>calculatePhiUsd(amount,'14692714000000',meta)).toThrow();});
it.each(['-1','01','1.1','9007199254740992000000','','1000000'])('rejects invalid or pre-origin coordinates %s',coordinate=>{expect(()=>calculatePhiUsd('1',coordinate,meta)).toThrow();});
it('uses the whole pulse across each micro-pulse interval',()=>{expect(calculatePhiUsd('1','14692714000001',meta).quote.usdPerPhi).toBe(calculatePhiUsd('1','14692714999999',meta).quote.usdPerPhi);expect(calculatePhiUsd('1','14692715000000',meta).valuationKaiPulse).toBe('14692715');});
