import {expect,it} from 'vitest';
import {publicSigilQuoteAtPulse,publicSportsCapitalizationUsdAtPulse} from '../src/receiz/market-projection/project';
import type {SigilQuoteCalculation,SportsQuoteCalculation} from '../src/receiz/market-projection/calculation';
import type {MarketValueRow} from '../src/receiz/market-projection/source';
import {inspectMarketSigil} from '../src/receiz/market-projection/inspect-calculation';
import {marketPulseTime} from '../src/receiz/market-projection/coordinates';
it('captures the existing sigil intrinsic value, frequency, quote and exact cent branch in the same evaluation',()=>{
 const seed={kind:'sigil',claimPulse:14900000,beat:2,stepIndex:3,creatorVerified:true,frequencyHz:444};let trace:SigilQuoteCalculation|undefined;
 const quote=publicSigilQuoteAtPulse(seed,15000000,value=>{trace=value;});
 expect(quote).toEqual(publicSigilQuoteAtPulse(seed,15000000));expect(trace).toMatchObject({kind:'sigil',pulse:15000000,metadata:{frequencyHz:444},roundedPhi:quote.pricePhi,usdPerPhi:quote.quoteUsdPerPhi,usdCents:String(Math.round(quote.priceUsd*100))});
 expect(trace!.roundedPhi).toBe(Math.max(.000001,Math.round(trace!.intrinsicPhi*1000000)/1000000));
 const inspected=inspectMarketSigil(trace!);expect(inspected.calculation.length).toBeGreaterThan(8);expect(inspected.quote.usdPerPhi).toBe(trace!.usdPerPhi);expect(inspected.issuanceSource).toContain('function quotePhiForUsd');
 expect(()=>inspectMarketSigil({...trace!,usdCents:'1'})).toThrow('MARKET_CALCULATION_FRAME_MISMATCH');
});
it('keeps each collectible copy and its rounding branch in the same ordered aggregate',()=>{
 const sealedAt=new Date(marketPulseTime(14900000)).toISOString(),row:MarketValueRow={id:'copies',source:'sports-economy-card',baseUsdValue:10,birthUsdValue:8,marketUsdValue:11,proofTotalValueUsd:43,scoreDelta:3,seed:'a'.repeat(64),sealedCopies:[{collectibleId:'rsc_0000000000000001',claimHash:'a'.repeat(64),sealedAt,birthUsdValue:8,proofValueUsd:10,currentValueUsd:20,valueHistory:[{at:sealedAt,usdValue:8,basis:'sealed-birth'},{at:new Date(marketPulseTime(14990000)).toISOString(),pulse:14990000,usdValue:20,basis:'source-observation'}]},{collectibleId:'rsc_0000000000000002',claimHash:'b'.repeat(64),sealedAt,birthUsdValue:9,proofValueUsd:10,currentValueUsd:22,valuationPulse:14950000,valuation:{baseUsdValue:10,birthUsdValue:9,marketUsdValue:11,scoreDelta:3,seed:'b'.repeat(64)}},{collectibleId:'rsc_0000000000000003',claimHash:'c'.repeat(64),sealedAt:new Date(marketPulseTime(15000001)).toISOString(),birthUsdValue:4,proofValueUsd:4,currentValueUsd:4}]};
 let trace:SportsQuoteCalculation|undefined;const result=publicSportsCapitalizationUsdAtPulse(row,15000000,.01,value=>{trace=value;});
 expect(result).toBe(publicSportsCapitalizationUsdAtPulse(row,15000000,.01));expect(trace!.copies?.map(value=>value.branch)).toEqual(['recorded-value','projected-model','before-seal']);expect(trace!.copies![0].valueUsd).toBe(20);expect(trace!.copies![1].unit).toBeDefined();expect(trace!.copies![2].valueUsd).toBe(0);
 expect(result).toBe(Number(trace!.copies!.reduce((sum,value)=>sum+value.valueUsd,0).toFixed(4)));
});
it('captures aggregate collectible arithmetic without treating an aggregate quote as a uniform per-copy value',()=>{
 const row:MarketValueRow={id:'a',source:'sports-economy-card',baseUsdValue:10,birthUsdValue:8,marketUsdValue:11,proofTotalValueUsd:43,scoreDelta:3,seed:'a'.repeat(64)};let trace:SportsQuoteCalculation|undefined;
 const usd=publicSportsCapitalizationUsdAtPulse(row,15000000,.01,value=>{trace=value;});
 expect(usd).toBe(publicSportsCapitalizationUsdAtPulse(row,15000000,.01));expect(trace).toMatchObject({kind:'collectible',pulse:15000000,quoteMove:.01,proofTotalValueUsd:43,baseUsdValue:10,roundedUsd:usd,unit:{base:10,birth:8,market:11,score:3}});
 expect(trace!.unroundedUsd).toBe(43*trace!.unit!.value/10);
});
