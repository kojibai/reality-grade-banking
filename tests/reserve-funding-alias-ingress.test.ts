import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {currentWalletObservation,advanceCurrentWalletObservation} from '../src/receiz/current-wallet-valuation';
import {currentBalanceCaptureKai} from '../src/receiz/current-balance-source';
import {readWalletObservation} from '../src/receiz/wallet-observation';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
function source(){
 const raw=JSON.parse(readFileSync(new URL('./fixtures/current-balance/mixed.json',import.meta.url),'utf8'));
 // The already selected wallet still carries its original exact funded Source;
 // an older calculation packet omits that duplicate optional reference.
 delete raw.wallet.reservePhiMicro;delete raw.wallet.settlementPhiMicro;delete raw.wallet.bankNoteValueProjection;
 raw.wallet.currentBalanceSource.reservePhiMicro=null;raw.wallet.currentBalanceSource.settlementPhiMicro=null;delete raw.wallet.currentBalanceSource.reserveFundingSource;
 return raw;
}
it('projects top-level original funded units into the same selected aggregate frame without a request',()=>{
 const raw=source(),before=JSON.stringify(raw),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  const wallet=parseSharedWallet(raw,raw.wallet.userId);expect(wallet).toMatchObject({reservePhiMicro:'8000000',settlementPhiMicro:'2259540',balancePhiMicro:'10259540'});
  expect(wallet.reserveFundingSource?.movements).toHaveLength(2);expect(JSON.stringify(raw)).toBe(before);
  const kai=BigInt(currentBalanceCaptureKai(wallet.currentBalanceSource!)),view=currentWalletObservation(wallet,null,String(kai+1_000_000n))!;expect(view).not.toBeNull();expect(view.wallet.reservePhiMicro).toBe('8000000');
  const binding={keyId:'held-display-only',artifactSha256:'a'.repeat(64)},packet=JSON.parse(JSON.stringify({...view,schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding})),restored=readWalletObservation(packet,binding)!;
  expect(restored.wallet.reservePhiMicro).toBe('8000000');expect(advanceCurrentWalletObservation(restored,String(kai+2_000_000n))!.wallet.reservePhiMicro).toBe('8000000');expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it.each(['account','cash','rate','recorded','native-conflict'] as const)('does not borrow funded units across a %s mismatch',field=>{
 const raw=source(),fund=raw.wallet.reserveFundingSource;
 if(field==='account')fund.accountId='foreign';
 if(field==='cash')fund.displayCap.accountBalancePhiMicro='8000001';
 if(field==='rate')fund.displayCap.usdPerPhiMicrocents='1';
 if(field==='recorded')raw.wallet.currentBalanceSource.ledgerSettledUsdCents='1901';
 if(field==='native-conflict')raw.wallet.bankNoteValueProjection=null;
 const wallet=parseSharedWallet(raw,raw.wallet.userId);expect(wallet.reservePhiMicro==null).toBe(true);expect(wallet.totalUsdCents).toBe('27529');expect(wallet.reserveUsdCents).toBe('1900');
});
