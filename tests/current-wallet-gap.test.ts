import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {parseSharedWallet} from '../src/receiz/shared-wallet';
import {currentWalletObservation,advanceCurrentWalletObservation} from '../src/receiz/current-wallet-valuation';
import {projectCurrentWalletAt,projectCurrentWalletExtension} from '../src/receiz/composite-wallet-history';
import {currentBalanceCaptureKai} from '../src/receiz/current-balance-source';
import {hasSettledAccountView} from '../src/receiz/account-view';
import {readWalletObservation,createWalletQuoteHold} from '../src/receiz/wallet-observation';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {selectBalanceChartPoints} from '../src/receiz/wallet-series';
function fixture(name='public'){const raw=JSON.parse(readFileSync(new URL(`./fixtures/current-balance/${name}.json`,import.meta.url),'utf8')),wallet=parseSharedWallet(raw,raw.wallet.userId);return currentWalletObservation(wallet)!;}
it.each(['public','private','mixed'])('fills an overnight pause from the held %s source, preserving all earlier samples with no network read',name=>{
 const held=fixture(name),before=structuredClone(held),end=(BigInt(held.historyBasis!.endKaiUPulse)+6_500_000_000n).toString(),fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{const next=advanceCurrentWalletObservation(held,end)!;
  expect(next).not.toBeNull();const added=next.history!.filter(point=>BigInt(point.kaiUPulse!)>BigInt(held.historyBasis!.endKaiUPulse));
  expect(added.length).toBeGreaterThanOrEqual(96);expect(added.length).toBeLessThanOrEqual(97);
  expect(next.history!.slice(0,held.history!.length)).toEqual(held.history);expect(held).toEqual(before);
  for(const point of added)expect(point).toMatchObject(projectCurrentWalletAt(held.wallet.currentBalanceSource!,point.kaiUPulse!));
  expect(next.history!.at(-1)?.kaiUPulse).toBe(end);expect(hasSettledAccountView(next)).toBe(true);
  expect(selectBalanceChartPoints(next.history!,next.wallet,next.observedAt,'1D').length).toBeGreaterThan(90);
  expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('does only one endpoint calculation on an ordinary whole-pulse advance',()=>{
 const held=fixture(),end=(BigInt(currentBalanceCaptureKai(held.wallet.currentBalanceSource!))+1_000_000n).toString(),next=advanceCurrentWalletObservation(held,end)!;
 expect(next.history).toHaveLength(held.history!.length+1);expect(next.history!.slice(0,-1)).toEqual(held.history);
});

it('fills the interval after a durable display restore without another account read',()=>{
 const held=fixture(),binding={keyId:'a'.repeat(64),artifactSha256:'b'.repeat(64)},stored=JSON.parse(JSON.stringify({schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,...held})),restored=readWalletObservation(stored,binding)!;
 expect(restored).not.toBeNull();const end=(BigInt(restored.historyBasis!.endKaiUPulse)+6_500_000_000n).toString(),next=advanceCurrentWalletObservation(restored,end)!;
 expect(next.history!.length-restored.history!.length).toBe(96);expect(next.history!.slice(0,restored.history!.length)).toEqual(restored.history);
});
it('keeps catch-up bounded even after a month away and does not replace the earlier curve',()=>{
 const held=fixture(),end=(BigInt(held.historyBasis!.endKaiUPulse)+500_000_000_000n).toString(),next=advanceCurrentWalletObservation(held,end)!;
 expect(next.history).toHaveLength(held.history!.length+96);expect(next.history!.slice(0,held.history!.length)).toEqual(held.history);
});
it('cannot project earlier ownership from a current capture or reverse the interval',()=>{
 const source=fixture().wallet.currentBalanceSource!,at=currentBalanceCaptureKai(source);
 expect(()=>projectCurrentWalletExtension(source,(BigInt(at)-1n).toString(),at)).toThrow('CURRENT_BALANCE_PAST_UNAVAILABLE');
 expect(()=>projectCurrentWalletExtension(source,at,(BigInt(at)-1n).toString())).toThrow('CURRENT_BALANCE_PAST_UNAVAILABLE');
 expect(projectCurrentWalletExtension(source,at,at)).toEqual([]);
 const end=(BigInt(at)+1n).toString();expect(projectCurrentWalletExtension(source,at,end).map(p=>p.kaiUPulse)).toEqual([end]);
});
it.each(['local-note','quote-hold','changed-balance','context-only'] as const)('does not resume a protected or superseded %s frame',kind=>{
 const held=fixture();if(kind==='local-note')held.source='local-note-head';if(kind==='quote-hold')held.quoteHold=createWalletQuoteHold(held.wallet);if(kind==='changed-balance')held.wallet={...held.wallet,totalUsdCents:'1'};if(kind==='context-only')held.wallet={...held.wallet,currentBalanceSource:{...held.wallet.currentBalanceSource!,historicalContextOnly:true}};
 const before=structuredClone(held),end=(BigInt(held.historyBasis!.endKaiUPulse)+6_500_000_000n).toString();
 expect(advanceCurrentWalletObservation(held,end)).toBeNull();expect(held).toEqual(before);
});
