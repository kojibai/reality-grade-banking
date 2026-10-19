import {expect,it,vi} from 'vitest';
import {computeIntrinsicUnsigned,type SigilMetadataLite} from '@receiz/sdk/valuation';
import {quotePhiForUsd,DEFAULT_ISSUANCE_POLICY} from '../src/receiz/canonical-market-issuance';
import {quoteReceizDisplayUsdV122} from '@receiz/sdk';
import {historicalWalletUsdRate} from '../src/receiz/historical-wallet';
import {projectCompositeWalletAt,projectCompositeWalletHistory,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';

const seed={kind:'sigil',claimPulse:10825210,beat:10,stepIndex:5,creatorVerified:true,chakraDay:'Throat',kaiSignature:'owner',userPhiKey:'owner:original'};
const first=String(seed.claimPulse*1e6),end='14710000000000';
function originalValue(pulse:number){const meta:SigilMetadataLite={pulse:seed.claimPulse,kaiPulse:seed.claimPulse,beat:seed.beat,stepIndex:seed.stepIndex,stepsPerBeat:44,quality:'high',creatorVerified:true,creatorRep:0,chakraDay:seed.chakraDay,kaiSignature:seed.kaiSignature,userPhiKey:seed.userPhiKey},value=computeIntrinsicUnsigned(meta,pulse).unsigned.valuePhi,quote=quotePhiForUsd({meta,nowPulse:pulse,usd:100,currentStreakDays:0,lifetimeUsdSoFar:0},DEFAULT_ISSUANCE_POLICY);return {phi:BigInt(Math.round(value*1e6)),usd:BigInt(Math.round(value*quote.usdPerPhi*100))};}
function fixture():CompositeWalletSource{return {schema:'receiz.wallet.chart-source.v129',authority:'authenticated-display-source',userId:'owner',throughKaiUPulse:end,objects:[{id:'original',seed,intervals:[{fromKaiUPulse:first,toKaiUPulse:null}]}],movements:[{id:'seed',kaiUPulse:'11000000000000',direction:'credit',phiMicro:'10000000',usdCents:'1000',reserveSliceUsdCents:'0',profileSeed:true},{id:'funded',kaiUPulse:'12000000000000',direction:'credit',phiMicro:'5000000',usdCents:'500',reserveSliceUsdCents:'500',profileSeed:false},{id:'paid',kaiUPulse:'13000000000000',direction:'debit',phiMicro:'1000000',usdCents:'100',reserveSliceUsdCents:'100',profileSeed:false}],lawfulValues:[]};}
it('uses the existing glyph and wallet composition law for both rails, including funded money and exact recorded payments',()=>{
 const source=fixture(),point=projectCompositeWalletAt(source,end),value=originalValue(Number(BigInt(end)/1000000n));
 expect(point.totalUsdCents).toBe((value.usd+400n).toString());
 expect(point.reserveUsdCents).toBe('400');expect(point.settlementUsdCents).toBe(value.usd.toString());
 expect(point.balancePhiMicro).toBe((value.phi+4000000n).toString());
 expect(point.valuation).toBe('portfolio-model-v129');
});
it('counts each object only in its carried ownership interval and keeps incoming value separate from the originating pulse',()=>{
 const source=fixture();source.objects[0].intervals=[{fromKaiUPulse:'11500000000000',toKaiUPulse:'12500000000000'}];
 expect(projectCompositeWalletAt(source,first).totalUsdCents).toBe('0');
 expect(BigInt(projectCompositeWalletAt(source,'12000000000000').totalUsdCents)).toBeGreaterThan(500n);
 expect(projectCompositeWalletAt(source,'12500000000000').totalUsdCents).toBe('500');
});
it('builds different full-width periods from the first source event without a clock, network or login timestamp',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const history=projectCompositeWalletHistory(fixture());expect(history[0].kaiUPulse).toBe(first);expect(history.at(-1)?.kaiUPulse).toBe(end);
  const starts=['ALL','1D','1W','1M','3M','1Y'].map(period=>{const duration={ALL:Infinity,'1D':1,'1W':7,'1M':31,'3M':93,'1Y':366}[period]!;const start=Date.parse(history.at(-1)!.at)-duration*86400000;return history.find(row=>Date.parse(row.at)>=start)!.kaiUPulse;});expect(new Set(starts).size).toBeGreaterThan(4);expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('includes received lawful value at its actual addition coordinate and caps Reserve with the recorded gross account balance',()=>{
 const source=fixture();source.lawfulValues=[{id:'lawful-credit',kaiUPulse:'14000000000000',deltaPhiMicro:'1000000'}];
 const point=projectCompositeWalletAt(source,end),without=projectCompositeWalletAt({...source,lawfulValues:[]},end);
 expect(BigInt(point.totalUsdCents)-BigInt(without.totalUsdCents)).toBe(BigInt(quoteReceizDisplayUsdV122('1000000',historicalWalletUsdRate(end))));
 source.movements.push({id:'all-cash-paid',kaiUPulse:'14100000000000',direction:'debit',phiMicro:'14000000',usdCents:'0',reserveSliceUsdCents:'0',profileSeed:false});
 expect(projectCompositeWalletAt(source,end).reserveUsdCents).toBe('0');
});
it.each(['duplicate object','overlap','future source','unsafe amount','foreign interval'] as const)('refuses an invalid %s source instead of drawing invented history',kind=>{
 const source=fixture();if(kind==='duplicate object')source.objects.push({...source.objects[0]});if(kind==='overlap')source.objects[0].intervals.push({fromKaiUPulse:'12000000000000',toKaiUPulse:null});if(kind==='future source')source.movements[0].kaiUPulse='99999999999999';if(kind==='unsafe amount')source.movements[0].phiMicro='12.3';if(kind==='foreign interval')source.objects[0].intervals[0].fromKaiUPulse='1';
 expect(()=>projectCompositeWalletHistory(source)).toThrow();
});
