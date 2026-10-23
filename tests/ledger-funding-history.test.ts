import {expect,it,vi} from 'vitest';
import {calculateWalletFundingAttributions} from '../src/receiz/ledger-wallet-fifo';
import {linkWalletFundingHistory,readWalletFundingHistory} from '../src/receiz/ledger-funding-history';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
import {enrichWalletFundingContext} from '../src/receiz/ledger-wallet-enrichment';
import {parsePublicNetworkPage,mergePublicRecords} from '../src/receiz/public-network';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
const entry=(id:string,user:string,direction:'credit'|'debit',day:number,amount:string,metadata:Record<string,unknown>={},transfer?:string)=>({id,user_id:user,direction,entry_kind:direction==='credit'?'market_sell':'chat_transfer_send',amount_usd_cents:amount,amount_phi_micro:amount,created_at:`2026-05-0${day}T00:00:00Z`,kai_upulse:String(day*1000000),metadata,...(transfer?{chat_transfer_id:transfer}:{})});
function fixture(){
 const parent=calculateWalletFundingAttributions([entry('source-proof','one','credit',1,'100',{source:'market_trade',marketItemId:'profile:one:proof'}),entry('parent-debit','one','debit',2,'100',{},'parent-transfer')],'one',true).get('parent-debit')!;
 const child=calculateWalletFundingAttributions([entry('incoming','two','credit',3,'100',{},'parent-transfer'),entry('child-debit','two','debit',4,'50',{},'child-transfer')],'two',true).get('child-debit')!;
 const history=linkWalletFundingHistory(child,new Map([['parent-transfer',parent]]),new Map())!;
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'transfer:public-child',kind:'chat_transfer',transferId:'tx:public-child',createdAt:'2026-05-04T00:00:00Z',kaiUpulse:'4000000',amountUsdCents:'50',proofBundle:{bundleHash:'a'.repeat(64),capsuleHash:'b'.repeat(64)},fundingAttribution:child,fundingHistory:history,fundingTransferId:'tx:public-child'}]}).records[0];
 return {parent,child,history,record};
}
it('follows exact incoming-transfer references to the prior proof-object funding basis in both inspection and a receipt',()=>{
 const {record,history}=fixture(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{expect(history).toHaveLength(1);const trace=ledgerFundingTrace(record);expect(trace.steps.map(s=>s.sourceId)).toEqual(['profile:one:proof','source-proof','parent-debit','incoming','child-debit']);
 expect(trace.steps.find(s=>s.sourceId==='parent-debit')).toMatchObject({label:'Parent transaction',amountUsdCents:'100'});
 const receipt=readReceiptLink(receiptLink(record)!);expect(ledgerFundingTrace({...record,details:receipt.details??undefined})).toEqual(trace);expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('rejects disconnected, circular and unit-conflicting parent records',()=>{
 const {parent,child,history}=fixture();expect(readWalletFundingHistory([{...history[0],viaSourceId:'unrelated'}],child)).toBeUndefined();
 expect(readWalletFundingHistory([{...history[0],parent:{...parent,walletDebitId:child.walletDebitId}}],child)).toBeUndefined();
 expect(readWalletFundingHistory([{...history[0],parent:{...parent,amountPhiMicro:'99'}}],child)).toBeUndefined();
});
it('keeps parent ancestry when the selected child has different native funding component amounts',()=>{
 const {record}=fixture();
 const trace=ledgerFundingTrace({...record,valueOperands:{settledUsdCents:'0',phiUsdCents:'50'}});
 expect(trace.steps.map(step=>step.sourceId)).toEqual(['profile:one:proof','source-proof','parent-debit','incoming','child-debit']);
 expect(trace.steps.find(step=>step.sourceId==='parent-debit')?.amountUsdCents).toBe('100');
});
it('reuses loaded public context for only the same exact private transfer and carries its selected history in the receipt',()=>{
 const {record}=fixture(),privateRecord={...record,sourceId:'transfer:child-transfer',id:'wallet:transfer:child-transfer',authority:'account-source-projection' as const,origin:'private-account' as const,details:undefined,evidence:{transferId:'child-transfer'}};
 const result=enrichWalletFundingContext([privateRecord],[record])[0];expect(ledgerFundingTrace(result).history).toHaveLength(1);expect(readReceiptLink(receiptLink(result)!).details?.fundingHistory).toEqual(result.details?.fundingHistory);
 expect(enrichWalletFundingContext([{...privateRecord,evidence:{transferId:'different'}}],[record])[0].details).toBeUndefined();
});
it('preserves carried attribution when an identical public wallet witness refreshes with a thin projection',()=>{
 const {record}=fixture(),thin={...record,details:{}};expect(mergePublicRecords([record],[thin])[0].details?.fundingHistory).toBeDefined();
 const conflicting={...thin,evidence:{...thin.evidence,bundleHash:'c'.repeat(64)}};expect(mergePublicRecords([record],[conflicting])[0].details?.fundingHistory).toBeUndefined();
});
it('automatically connects a new send to already loaded parent funding without a seeded history or another read',()=>{
 const {record,parent,child}=fixture();
 const fresh={...record,details:{fundingAttribution:child as any,fundingTransferId:record.evidence.transferId}};
 const prior=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'parent',kind:'chat_transfer',transferId:'parent-transfer',createdAt:parent.occurredAt,kaiUpulse:parent.kaiUpulse,amountUsdCents:parent.amountUsdCents,fundingAttribution:parent,fundingTransferId:'parent-transfer'}]}).records[0];
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const result=enrichWalletFundingContext([fresh,prior],[fresh,prior])[0];
  expect(ledgerFundingTrace(result).steps.some(step=>step.sourceId==='profile:one:proof')).toBe(true);
  expect(ledgerFundingTrace(result).history).toHaveLength(1);expect(fetch).not.toHaveBeenCalled();expect(fresh.details).not.toHaveProperty('fundingHistory');
 }finally{vi.unstubAllGlobals();}
});
it('never fills public ancestry from private records or guesses a missing new-send attribution',()=>{
 const {record,parent}=fixture(),fresh={...record,details:{fundingAttribution:record.details!.fundingAttribution,fundingTransferId:record.evidence.transferId}};
 const privateParent={...record,id:'private',sourceId:parent.walletDebitId,authority:'account-source-projection' as const,time:parent.occurredAt,kaiUpulse:parent.kaiUpulse!,amountUsdCents:parent.amountUsdCents,evidence:{transferId:parent.transferId!},details:{fundingAttribution:parent as any,fundingTransferId:parent.transferId!}};
 expect(enrichWalletFundingContext([fresh],[privateParent])[0].details).not.toHaveProperty('fundingHistory');
 const thin={...record,details:undefined};expect(enrichWalletFundingContext([thin],[record])[0]).toBe(thin);
});
it('retains directly bound proof cohorts from an identical root even when the private row already carries attribution',()=>{
 const attribution=calculateWalletFundingAttributions([entry('profile-credit','one','credit',2,'100',{source:'profile_rollup_seed'}),entry('debit','one','debit',3,'50',{},'transfer')],'one',true).get('debit')!;
 const cohort={rule:'receiz-profile-rollup-v1-owned-and-received',basis:'reconstructed-membership',creditSourceId:'profile-credit',computedAt:'2026-05-01T00:00:00Z',amountPhiMicro:'100',members:[{objectId:'original',title:'Original',createdAt:'2026-04-01T00:00:00Z',verifyUrl:'https://receiz.com/v/moment/original',basis:'owned'}]};
 const publicRow=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'public-root',kind:'chat_transfer',transferId:'transfer',createdAt:attribution.occurredAt,amountUsdCents:'50',fundingAttribution:attribution,fundingTransferId:'transfer',fundingCohorts:[cohort]}]}).records[0];
 const privateRow={...publicRow,id:'private-root',authority:'account-source-projection' as const,details:{fundingAttribution:attribution as any,fundingTransferId:'transfer'}};
 expect(enrichWalletFundingContext([privateRow],[publicRow])[0].details?.fundingCohorts).toEqual([cohort]);
});
