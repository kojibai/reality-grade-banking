import {expect,it,vi} from 'vitest';
import * as composite from '../src/receiz/composite-wallet-history';
import {revalueKnownWallet} from '../src/receiz/local-wallet-valuation';
import {quoteReceizDisplayUsdV122} from '@receiz/sdk';
import {historicalWalletUsdRate} from '../src/receiz/historical-wallet';
import {walletPointTime} from '../src/receiz/wallet-series';
import type {WalletObservation} from '../src/receiz/wallet-observation';
import {readFileSync} from 'node:fs';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
const end='14710000000123';
function source():composite.CompositeWalletSource{return{schema:'receiz.wallet.chart-source.v129',earningMembershipPolicy:'public-pbi-original-v1',authority:'authenticated-display-source',userId:'owner',throughKaiUPulse:end,objects:[{id:'signed-A',seed:{kind:'sigil',claimPulse:10825210,beat:2,stepIndex:3,creatorVerified:true},intervals:[{fromKaiUPulse:'10825210000000',toKaiUPulse:null}]}],movements:[{id:'funded-first-rate',kaiUPulse:'12000000000000',direction:'credit',phiMicro:'1000001',usdCents:'103',reserveSliceUsdCents:'103',profileSeed:false},{id:'funded-second-rate',kaiUPulse:'13000000000000',direction:'credit',phiMicro:'123456',usdCents:'57',reserveSliceUsdCents:'57',profileSeed:false}],lawfulValues:[{id:'one-micro',kaiUPulse:'14000000000000',deltaPhiMicro:'1'}]};}
it('uses the held live chart frame when its older current-source capture no longer matches the displayed pulse',async()=>{
 const {readBalanceCalculation}=await import('../src/receiz/balance-calculation'),{compositeWalletObservation,advanceCompositeWalletObservation}=await import('../src/receiz/composite-wallet-source');
 const envelope=JSON.parse(readFileSync(new URL('./fixtures/current-balance/public.json',import.meta.url),'utf8')),captured=parseSharedWallet(envelope,envelope.wallet.userId);
 const s=source(),laterCapture=BigInt(captured.currentBalanceSource!.computedPulse+10)*1000000n;s.userId=captured.userId;s.throughKaiUPulse=(BigInt(end)>laterCapture?BigInt(end):laterCapture).toString();
 const point=composite.projectCompositeWalletAt(s,s.throughKaiUPulse),wallet={...captured,totalUsdCents:point.totalUsdCents,reserveUsdCents:point.reserveUsdCents,settlementUsdCents:point.settlementUsdCents,balancePhiMicro:point.balancePhiMicro!,reservePhiMicro:null,settlementPhiMicro:null};
 const held=compositeWalletObservation({wallet,observedAt:point.at},s)!;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  const trace=readBalanceCalculation(wallet,held);expect(trace?.kind).toBe('composite');expect(trace?.objects.map(object=>object.id)).toEqual(['signed-A']);expect(trace?.kaiUPulse).toBe(s.throughKaiUPulse);
  const next=advanceCompositeWalletObservation(held,(BigInt(s.throughKaiUPulse)+1000000n).toString())!;
  expect(readBalanceCalculation(next.wallet,next)).toMatchObject({kind:'composite',kaiUPulse:next.historyBasis!.endKaiUPulse,output:next.wallet});
  expect(readBalanceCalculation({...next.wallet,totalUsdCents:'1'},next)).toBeNull();expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it.each(['mixed rates','subcent','zero','one-cent'] as const)('observes the actual composite calculator with bit-identical %s outputs and no IO',mode=>{
 const s=source();if(mode!=='mixed rates')s.objects=[];if(mode==='zero'){s.movements=[];s.lawfulValues=[];}if(mode==='subcent'){s.movements=[];}if(mode==='one-cent'){s.lawfulValues=[];s.movements=[{...s.movements[0],phiMicro:'1',usdCents:'1',reserveSliceUsdCents:'0'}];}
 const before=JSON.stringify(s),plain=composite.projectCompositeWalletAt(s,end),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{expect(composite).toHaveProperty('inspectCompositeWalletAt',expect.any(Function));const observed=composite.inspectCompositeWalletAt(s,end);expect(observed.point).toEqual(plain);expect(observed.kaiUPulse).toBe(end);expect(observed.steps.length).toBeGreaterThan(3);expect(observed.source).toBe(s);expect(JSON.stringify(s)).toBe(before);expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
});
function native(phi:string):WalletObservation{
 const reserve='103',rate=historicalWalletUsdRate('2000000'),settlement=phi==='0'?'0':quoteReceizDisplayUsdV122(phi,rate),total=(103n+BigInt(settlement)).toString(),gross=(100001n+BigInt(phi)).toString();
 const wallet={userId:'owner',totalUsdCents:total,reserveUsdCents:reserve,settlementUsdCents:settlement,balancePhiMicro:gross,reservePhiMicro:'100001',settlementPhiMicro:phi,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'2',kaiUpulse:'2000000'};
 const history=['1000000','2000000'].map(kai=>({userId:'owner',at:walletPointTime(kai),kaiUPulse:kai,totalUsdCents:total,reserveUsdCents:reserve,settlementUsdCents:settlement}));
 return{wallet,observedAt:walletPointTime('2000000'),walletScope:'native-full',history,historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:'1000000',endKaiUPulse:'2000000',balancePhiMicro:gross,settlementPhiMicro:phi,reserveUsdCents:reserve}};
}
it.each(['0','1','123','2000000','2000001'])('observes native %s µΦ without changing wallet/history arithmetic or making IO',phi=>{
 const input=native(phi),before=JSON.stringify(input),plain=revalueKnownWallet(input,'10000000',walletPointTime('10000000'));let trace:unknown;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{const observed=revalueKnownWallet(input,'10000000',walletPointTime('10000000'),value=>{trace=value;});expect(observed).toEqual(plain);expect(trace).toMatchObject({kind:'native',kaiUPulse:'10000000',settlementPhiMicro:phi,output:plain!.wallet});expect(JSON.stringify(input)).toBe(before);expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
});
it('binds inspection to the exact rail units as well as the dollar header and current source frame',async()=>{
 const {readBalanceCalculation}=await import('../src/receiz/balance-calculation');
 const held=revalueKnownWallet(native('2000001'),'10000000',walletPointTime('10000000'))!;
 expect(readBalanceCalculation(held.wallet,held)?.output).toEqual(held.wallet);
 expect(readBalanceCalculation({...held.wallet,reservePhiMicro:'100002',settlementPhiMicro:'2000000'},held)).toBeNull();
 expect(readBalanceCalculation({...held.wallet,userId:'foreign'},held)).toBeNull();
 expect(readBalanceCalculation({...held.wallet,totalUsdCents:(BigInt(held.wallet.totalUsdCents)+1n).toString()},held)).toBeNull();
});
it('matches the actual closed-cohort calculator and refuses a detached or altered source endpoint',async()=>{
 const {readBalanceCalculation}=await import('../src/receiz/balance-calculation'),{compositeWalletObservation}=await import('../src/receiz/composite-wallet-source');
 const s=source(),p=composite.projectCompositeWalletAt(s,end),wallet={userId:'owner',totalUsdCents:p.totalUsdCents,reserveUsdCents:p.reserveUsdCents,settlementUsdCents:p.settlementUsdCents,balancePhiMicro:p.balancePhiMicro!,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null};
 const held=compositeWalletObservation({wallet,observedAt:p.at},s)!;
 const trace=readBalanceCalculation(wallet,held)!;expect(trace.kaiUPulse).toBe(end);expect(trace.output.totalUsdCents).toBe(wallet.totalUsdCents);expect(trace.objects.map(object=>object.id)).toEqual(['signed-A']);expect(trace.inputs).toMatchObject({objects:[{id:'signed-A',seed:s.objects[0].seed,intervals:s.objects[0].intervals}]});
 expect(readBalanceCalculation(wallet,{...held,chartSource:{...s,objects:[]}})).toBeNull();expect(readBalanceCalculation(wallet,null)).toBeNull();
});
it('never borrows a foreign or mismatched evaluation coordinate for a zero balance',async()=>{
 const {readBalanceCalculation}=await import('../src/receiz/balance-calculation');
 const zero={...native('0').wallet,totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0',balancePhiMicro:'0',reservePhiMicro:'0',settlementPhiMicro:'0',kaiUpulse:'2000000'};
 const foreign={...native('0'),wallet:{...zero,userId:'foreign'},historyBasis:{...native('0').historyBasis!,endKaiUPulse:'999000000'}};
 expect(readBalanceCalculation(zero,foreign)?.kaiUPulse).toBe('2000000');
 expect(readBalanceCalculation({...zero,kaiUpulse:null},foreign)?.kaiUPulse).toBeNull();
});
it('reuses co-bound verified native basis units when an older retained wallet omitted display aliases',()=>{
 const old=native('2000001');delete old.wallet.reservePhiMicro;delete old.wallet.settlementPhiMicro;
 const next=revalueKnownWallet(old,'10000000',walletPointTime('10000000'))!;
 expect(next.wallet).toMatchObject({settlementPhiMicro:'2000001',reservePhiMicro:'100001',balancePhiMicro:'2100002'});
});
it('cannot lend old calculation/proof lineage to equal amounts from another source head or ledger coordinate',async()=>{
 const {readBalanceCalculation}=await import('../src/receiz/balance-calculation');
 const held=revalueKnownWallet(native('2000001'),'10000000',walletPointTime('10000000'))!;
 expect(readBalanceCalculation({...held.wallet,kaiUpulse:'2000001'},held)).toBeNull();
 expect(readBalanceCalculation({...held.wallet,balanceSourceSha256:'a'.repeat(64)},held)).toBeNull();
 expect(readBalanceCalculation({...held.wallet,originalProofReferences:{other:{sourceSha256:'b'.repeat(64),pbiReceiptHash:'c'.repeat(64)}}},held)).toBeNull();
});

it('reuses one exact calculation for both balance disclosures and reopening the same held frame',async()=>{
 const {readBalanceCalculation}=await import('../src/receiz/balance-calculation'),{compositeWalletObservation}=await import('../src/receiz/composite-wallet-source');
 const s=source(),point=composite.projectCompositeWalletAt(s,end),wallet={userId:'owner',totalUsdCents:point.totalUsdCents,reserveUsdCents:point.reserveUsdCents,settlementUsdCents:point.settlementUsdCents,balancePhiMicro:point.balancePhiMicro!,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null};
 const held=compositeWalletObservation({wallet,observedAt:point.at},s)!,inspect=vi.spyOn(composite,'inspectCompositeWalletAt');
 try{
  const first=readBalanceCalculation(wallet,held);expect(first).not.toBeNull();
  for(let i=0;i<5;i++)expect(readBalanceCalculation(wallet,held)).toBe(first);
  expect(inspect).toHaveBeenCalledTimes(1);
  expect(readBalanceCalculation(wallet,{...held,chartSource:{...s,objects:[]}})).toBeNull();
 }finally{inspect.mockRestore();}
});
