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
it('reuses loaded public context for only the same exact private transfer, without leaking it into its shareable URL',()=>{
 const {record}=fixture(),privateRecord={...record,sourceId:'transfer:child-transfer',id:'wallet:transfer:child-transfer',authority:'account-source-projection' as const,origin:'private-account' as const,details:undefined,evidence:{transferId:'child-transfer'}};
 const result=enrichWalletFundingContext([privateRecord],[record])[0];expect(ledgerFundingTrace(result).history).toHaveLength(1);expect(readReceiptLink(receiptLink(result)!).details).toBeNull();
 expect(enrichWalletFundingContext([{...privateRecord,evidence:{transferId:'different'}}],[record])[0].details).toBeUndefined();
});
it('preserves carried attribution when an identical public wallet witness refreshes with a thin projection',()=>{
 const {record}=fixture(),thin={...record,details:{}};expect(mergePublicRecords([record],[thin])[0].details?.fundingHistory).toBeDefined();
 const conflicting={...thin,evidence:{...thin.evidence,bundleHash:'c'.repeat(64)}};expect(mergePublicRecords([record],[conflicting])[0].details?.fundingHistory).toBeUndefined();
});
