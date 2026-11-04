import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {currentWalletObservation,advanceCurrentWalletObservation} from '../src/receiz/current-wallet-valuation';
import {currentBalanceCaptureKai} from '../src/receiz/current-balance-source';
import {readWalletObservation} from '../src/receiz/wallet-observation';
import {BANK_APPLICATION_ID} from '../src/receiz/config';

function heldExactWallet(){
 const envelope=JSON.parse(readFileSync(new URL('./fixtures/current-balance/mixed.json',import.meta.url),'utf8'));
 const wallet=parseSharedWallet(envelope,envelope.wallet.userId),source=wallet.currentBalanceSource!;
 // Exact units are held by the wallet; its older calculation packet lacks
 // those optional display aliases. No amount or valuation operand changes.
 const olderSource={...source,reservePhiMicro:null,settlementPhiMicro:null,reserveFundingSource:undefined};
 return {wallet,source,olderSource,kai:currentBalanceCaptureKai(source)};
}
it('uses already held exact Reserve units when a same-frame current calculation omits the aliases',()=>{
 const {wallet,olderSource,kai}=heldExactWallet(),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  const current=currentWalletObservation({...wallet,currentBalanceSource:olderSource},null,kai);
  expect(current).not.toBeNull();expect(current!.wallet).toMatchObject({reservePhiMicro:'8000000',settlementPhiMicro:'2259540',balancePhiMicro:'10259540'});
  expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('keeps already held Reserve backing through valuation, serialization, reopen and another valuation',()=>{
 const {wallet,olderSource,kai}=heldExactWallet(),opened=currentWalletObservation(wallet)!;
 const retained={...opened,wallet:{...opened.wallet,currentBalanceSource:olderSource}},fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  const next=advanceCurrentWalletObservation(retained,String(BigInt(kai)+1_000_000n));expect(next).not.toBeNull();expect(next!.wallet.reservePhiMicro).toBe('8000000');expect(BigInt(next!.wallet.settlementPhiMicro!)+8000000n).toBe(BigInt(next!.wallet.balancePhiMicro));
  const binding={keyId:'held-display-only',artifactSha256:'a'.repeat(64)},packet=JSON.parse(JSON.stringify({...next,schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding})),restored=readWalletObservation(packet,binding)!;
  expect(restored).not.toBeNull();expect(restored.wallet.reservePhiMicro).toBe('8000000');
  const again=advanceCurrentWalletObservation(restored,String(BigInt(kai)+2_000_000n));expect(again).not.toBeNull();expect(again!.wallet.reservePhiMicro).toBe('8000000');expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('keeps unavailable units unavailable and refuses conflicts with the carried exact split',()=>{
 const {wallet,olderSource,kai}=heldExactWallet(),missing={...wallet,reservePhiMicro:null,settlementPhiMicro:null,reserveFundingSource:undefined,currentBalanceSource:olderSource};
 const unknown=currentWalletObservation(missing)!;expect(unknown).not.toBeNull();
 expect(advanceCurrentWalletObservation(unknown,String(BigInt(kai)+1_000_000n))!.wallet).toMatchObject({reservePhiMicro:null,settlementPhiMicro:null});
 const wrong={...wallet,reservePhiMicro:'7000000',settlementPhiMicro:'3259540'};
 expect(currentWalletObservation(wrong)).toBeNull();
 const opened=currentWalletObservation(wallet)!;
 expect(advanceCurrentWalletObservation({...opened,wallet:wrong},String(BigInt(kai)+1_000_000n))).toBeNull();
 expect(currentWalletObservation({...missing,reservePhiMicro:'8000000',settlementPhiMicro:'1'})).toBeNull();
 expect(advanceCurrentWalletObservation({...opened,wallet:{...missing,reservePhiMicro:'8000000',settlementPhiMicro:'1'}},String(BigInt(kai)+1_000_000n))).toBeNull();
});
