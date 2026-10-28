import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {currentWalletObservation,advanceCurrentWalletObservation} from '../src/receiz/current-wallet-valuation';
import {inspectCurrentWalletAt,projectCurrentWalletAt} from '../src/receiz/composite-wallet-history';
import {readBalanceCalculation} from '../src/receiz/balance-calculation';
import {currentBalanceCaptureKai} from '../src/receiz/current-balance-source';
import {keepsWalletCashComposition} from '../src/receiz/wallet-cash-basis';
// Serialized by Receiz's actual composer → Bank-scoped own PBI → accepted
// source → native loadWalletSummaryForUser production tests. Not a mock quote.
for(const name of ['public','private','mixed'])it(`replays actual ${name} native shared summary, preserves its history and appends only a future exact display frame`,()=>{
 const envelope=JSON.parse(readFileSync(new URL(`./fixtures/current-balance/${name}.json`,import.meta.url),'utf8'));
 const wallet=parseSharedWallet(envelope,envelope.wallet.userId),source=wallet.currentBalanceSource!,kai=currentBalanceCaptureKai(source);
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{expect(source).toBeDefined();expect(source.glyphs).toHaveLength(1);expect(source.glyphs[0].livePulseSeed.creatorVerified).toBe(false);
  const captured=inspectCurrentWalletAt(source,kai);expect(captured.point).toMatchObject({balancePhiMicro:wallet.balancePhiMicro,totalUsdCents:wallet.totalUsdCents,reserveUsdCents:wallet.reserveUsdCents,settlementUsdCents:wallet.settlementUsdCents});
  expect(captured.artifactBasePhiMicro).toBe(source.artifactBasePhiMicro);expect(captured.artifactBaseUsdCents).toBe(source.artifactBaseUsdCents);expect(captured.objects[0].proof).toEqual(source.originalProofReferences?.[source.glyphs[0].id]);
  const view=currentWalletObservation(wallet)!;expect(view).not.toBeNull();expect(readBalanceCalculation(view.wallet,view)?.kind).toBe('current');
  const nextKai=(BigInt(kai)+1_000_000n).toString(),next=advanceCurrentWalletObservation(view,nextKai)!;expect(next).not.toBeNull();expect(next.history?.[0]).toEqual(view.history?.[0]);expect(next.history).toHaveLength(2);expect(next.wallet).toMatchObject({totalUsdCents:projectCurrentWalletAt(source,nextKai).totalUsdCents,balancePhiMicro:projectCurrentWalletAt(source,nextKai).balancePhiMicro});expect(readBalanceCalculation(next.wallet,next)?.kaiUPulse).toBe(nextKai);
  const adopted=currentWalletObservation(wallet,view,nextKai)!;expect(adopted.wallet).toEqual(next.wallet);expect(adopted.history?.[0]).toEqual(view.history?.[0]);
  expect(()=>projectCurrentWalletAt(source,(BigInt(kai)-1n).toString())).toThrow('CURRENT_BALANCE_PAST_UNAVAILABLE');
  const broken={...wallet,currentBalanceSource:{...source,artifactBaseUsdCents:(BigInt(source.artifactBaseUsdCents)+1n).toString()}};expect(currentWalletObservation(broken,view)).toBeNull();expect(view.wallet).toEqual(wallet);expect(advanceCurrentWalletObservation({...view,wallet:{...view.wallet,totalUsdCents:'1'}},nextKai)).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('uses the carried wallet quote even when its sample follows the glyph capture pulse',()=>{
 const envelope=JSON.parse(readFileSync(new URL('./fixtures/current-balance/mixed.json',import.meta.url),'utf8')),wallet=parseSharedWallet(envelope,envelope.wallet.userId),source=wallet.currentBalanceSource!,kai=currentBalanceCaptureKai(source);
 // A separately sampled wallet quote is an actual independent operand; the
 // Original quote remains at computedPulse. Reserve is below either cap here.
 const carried={...source,usdPerPhiMicrocents:(BigInt(source.usdPerPhiMicrocents)+100000n).toString()},actual=inspectCurrentWalletAt(carried,kai);
 expect(actual.point.totalUsdCents).toBe(wallet.totalUsdCents);expect(actual.point.reserveUsdCents).toBe(wallet.reserveUsdCents);expect(actual.steps.find(step=>step.label==='Reserve')!.operands.usdPerPhiMicrocents).toBe(carried.usdPerPhiMicrocents);expect(actual.objects[0].pulse).toBe(source.computedPulse);
});
it('cannot replace an accepted cash composition with a changed or missing later current packet',()=>{
 const envelope=JSON.parse(readFileSync(new URL('./fixtures/current-balance/public.json',import.meta.url),'utf8')),wallet=parseSharedWallet(envelope,envelope.wallet.userId),raw=wallet.currentBalanceSource!,kai=currentBalanceCaptureKai(raw);
 const cashBasis={schema:'receiz.wallet.cash-plus-originals.v1' as const,phiOffsetMicro:'0',usdOffsetCents:'0',fromKaiUPulse:kai},source={...raw,cashBasis,cashBasisAccepted:true},opened=currentWalletObservation({...wallet,currentBalanceSource:source})!;
 expect(opened).not.toBeNull();const later={...source,computedAt:new Date(Date.parse(source.computedAt)+1000).toISOString()},nextKai=(BigInt(kai)+1000000n).toString();
 expect(currentWalletObservation({...wallet,currentBalanceSource:later},opened,nextKai)).not.toBeNull();
 expect(currentWalletObservation({...wallet,currentBalanceSource:{...later,cashBasis:{...cashBasis,phiOffsetMicro:'1'}}},opened,nextKai)).toBeNull();
 expect(currentWalletObservation({...wallet,currentBalanceSource:{...later,cashBasis:undefined,cashBasisAccepted:undefined}},opened,nextKai)).toBeNull();
 const chartHeld={...opened,chartSource:{cashBasis,cashBasisAccepted:true}} as typeof opened;
 expect(currentWalletObservation({...wallet,currentBalanceSource:later},chartHeld,nextKai)).not.toBeNull();
 expect(currentWalletObservation({...wallet,currentBalanceSource:{...later,cashBasis:undefined,cashBasisAccepted:undefined}},chartHeld,nextKai)).toBeNull();
 expect(keepsWalletCashComposition([source],{cashBasis:{...cashBasis,usdOffsetCents:'1'},cashBasisAccepted:true})).toBe(false);
 expect(keepsWalletCashComposition([{cashBasis,cashBasisAccepted:false}],undefined)).toBe(true);
 expect(keepsWalletCashComposition([{cashBasis,cashBasisAccepted:true}],undefined)).toBe(false);
});
