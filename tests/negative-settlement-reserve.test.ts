import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {currentWalletObservation,advanceCurrentWalletObservation} from '../src/receiz/current-wallet-valuation';
import {readWalletObservation} from '../src/receiz/wallet-observation';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {inspectCurrentWalletAt,projectCompositeWalletAt,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';
import {currentBalanceCaptureKai} from '../src/receiz/current-balance-source';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/negative-settlement-reserve.json',import.meta.url),'utf8'));
const cases=fixture.cases as Array<{depositUsdCents:string;ok:true;wallet:Record<string,any>}>;
const expected=[['0','0','50000'],['20000','0','30000'],['50000','0',undefined],['70000','20000',undefined]] as const;
for(const [index,[reserve,total,gap]] of expected.entries()){
 it(`reads the native $${Number(reserve)/100} funding result against the existing $500 difference without changing money`,()=>{
  const input=structuredClone(cases[index]),before=structuredClone(input),wallet=parseSharedWallet(input,input.wallet.userId);
  expect(wallet).toMatchObject({totalUsdCents:total,reserveUsdCents:reserve,settlementUsdCents:'0',balancePhiMicro:input.wallet.balancePhiMicro});
  expect(input).toEqual(before);
 });
 it(`retains the $${Number(reserve)/100} funded frame and its exact history through private observation restore`,()=>{
  const packet=cases[index],wallet=parseSharedWallet(packet,packet.wallet.userId),current=currentWalletObservation(wallet)!;
  expect(current).not.toBeNull();expect(current.wallet).toEqual(wallet);
  expect(current.history?.at(-1)).toMatchObject({totalUsdCents:total,reserveUsdCents:reserve,settlementUsdCents:'0'});
  expect(current.history?.at(-1)?.availabilityGapUsdCents).toBe(gap);
  const binding={keyId:'local-fixture-key',artifactSha256:'a'.repeat(64)};
  const restored=readWalletObservation(JSON.parse(JSON.stringify({schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,...current})),binding)!;
  expect(restored).not.toBeNull();expect(restored.wallet).toEqual(wallet);expect(restored.history).toEqual(current.history);expect(restored.historyBasis).toEqual(current.historyBasis);
 });
 it(`projects $${Number(reserve)/100} recorded Reserve beneath the unchanged source-value floor`,()=>{
  const packet=cases[index],source=packet.wallet.currentBalanceSource,kai=currentBalanceCaptureKai(source);
  const chart:CompositeWalletSource={schema:'receiz.wallet.chart-source.v129',authority:'authenticated-display-source',userId:source.userId,throughKaiUPulse:kai,
   objects:source.glyphs.map((row:any)=>({id:row.id,seed:row.livePulseSeed,intervals:[{fromKaiUPulse:String(BigInt(row.livePulseSeed.claimPulse)*1000000n),toKaiUPulse:null}]})),
   movements:[{id:'spent-before-valuation-drop',kaiUPulse:kai,direction:'debit',phiMicro:String(-BigInt(source.transactionDeltaPhiMicro)+BigInt(source.accountBalancePhiMicro)),usdCents:String(-BigInt(source.transactionDeltaUsdCents)+BigInt(reserve)),reserveSliceUsdCents:'0',profileSeed:false},
    {id:'funded',kaiUPulse:kai,direction:'credit',phiMicro:source.accountBalancePhiMicro,usdCents:reserve,reserveSliceUsdCents:reserve,profileSeed:false}],lawfulValues:[],
   cashCapture:{accountBalancePhiMicro:source.accountBalancePhiMicro,usdPerPhiMicrocents:source.usdPerPhiMicrocents},transport:{after:null,cursor:null,capturedKaiUPulse:kai}};
  const before=structuredClone(chart),point=projectCompositeWalletAt(chart,kai);
  expect(point).toMatchObject({totalUsdCents:total,reserveUsdCents:reserve,settlementUsdCents:'0',balancePhiMicro:packet.wallet.balancePhiMicro});
  expect(point.availabilityGapUsdCents).toBe(gap);expect(chart).toEqual(before);
 });
}
it('keeps the exact current calculation and later valuation available without another request',()=>{
 const packet=cases[3],wallet=parseSharedWallet(packet,packet.wallet.userId),current=currentWalletObservation(wallet)!;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  const source=wallet.currentBalanceSource!,kai=currentBalanceCaptureKai(source),calculation=inspectCurrentWalletAt(source,kai);
  expect(calculation.point).toMatchObject({totalUsdCents:'20000',reserveUsdCents:'70000',settlementUsdCents:'0'});
  expect(calculation.steps.find(step=>step.label==='Settlement before display floor')?.result).toBe('-50000');
  expect(calculation.steps.find(step=>step.label==='Settlement')?.result).toBe('0');
  const next=advanceCurrentWalletObservation(current,String(BigInt(kai)+1000000n))!;
  expect(next).not.toBeNull();expect(next.wallet.currentBalanceSource).toBe(source);expect(source.ledgerSettledUsdCents).toBe('70000');expect(next.wallet.reservePhiMicro).toBe(wallet.reservePhiMicro);expect(next.history?.slice(0,current.history!.length)).toEqual(current.history);
  expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('still rejects foreign, malformed and inconsistent positive components',()=>{
 const input=cases[3];expect(()=>parseSharedWallet(input,'foreign-owner')).toThrow();
 for(const values of [{settledBalanceUsdCents:'-1'},{ecosystemBalanceUsdCents:'-1'},{settledBalanceUsdCents:'NaN'},{ecosystemBalanceUsdCents:'1'},{settledBalanceUsdCents:'19999',ecosystemBalanceUsdCents:'0'}]){
  const packet=structuredClone(input);Object.assign(packet.wallet.valueStates,values);expect(()=>parseSharedWallet(packet,packet.wallet.userId)).toThrow();
 }
});
