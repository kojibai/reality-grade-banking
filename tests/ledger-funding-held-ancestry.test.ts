import {expect,it,vi} from 'vitest';
import {mergePublicRecords,parsePublicNetworkPage,type PublicRecord} from '../src/receiz/public-network';
import {enrichWalletFundingContext} from '../src/receiz/ledger-wallet-enrichment';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
import {completeLedgerReceipt,readLedgerReceipt,receiptDisplayRecord} from '../src/receiz/ledger-receipts';
const asset='20000000-0000-4000-8000-000000000001';
function records(authority:PublicRecord['authority']='public-source-projection'){
 const values=[
  {root:'selected',parents:[{kind:'credit',id:'parent'}],nodes:{}},
  {root:'earlier',parents:[{kind:'credit',id:'parent'}],nodes:{'credit:parent':{ref:{kind:'credit',id:'parent'},amountUsdCents:'700',parents:[{kind:'proof-basis',id:'origin'}]},'proof-basis:origin':{ref:{kind:'proof-basis',id:'origin'},parents:[],objectIds:[asset]},'credit:unrelated':{ref:{kind:'credit',id:'unrelated'},parents:[],source:'wallet_deposit'}}},
 ];
 return values.map(value=>({...parsePublicNetworkPage('wallet',{ok:true,events:[{id:value.root,kind:'chat_transfer',transferId:'tx:'+value.root,amountUsdCents:'27'}],fundingContexts:{schema:'receiz.wallet.funding-context.v1',root:{kind:'transfer',id:'tx:'+value.root},nodes:{...value.nodes,['transfer:tx:'+value.root]:{ref:{kind:'transfer',id:'tx:'+value.root},amountUsdCents:'27',parents:value.parents}}}}).records[0],authority}));
}
it.each(['public-source-projection','account-source-projection'] as const)('retains every exact held ancestor for %s without IO or unrelated siblings',authority=>{
 const rows=records(authority),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const [selected]=enrichWalletFundingContext(rows,rows),trace=ledgerFundingTrace(selected);
  expect(trace.steps.map(s=>s.sourceId)).toEqual([asset,'parent','tx:selected']);expect(trace.context?.coverage.status).toBe('complete');
  expect(trace.context?.nodes['transfer:tx:earlier']).toBeUndefined();expect(trace.context?.nodes['credit:unrelated']).toBeUndefined();
  const shared=receiptDisplayRecord(readLedgerReceipt(JSON.parse(JSON.stringify(completeLedgerReceipt(selected)))));
  expect(ledgerFundingTrace(shared).steps).toEqual(trace.steps);expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('never fills an anonymous receipt from account-only ancestors, even in a mixed input',()=>{
 const [selected]=records(),[,privateParent]=records('account-source-projection');
 const result=enrichWalletFundingContext([selected,privateParent],[privateParent])[0];
 expect(ledgerFundingTrace(result).context?.coverage.status).toBe('incomplete');expect(ledgerFundingTrace(result).steps.some(s=>s.sourceId===asset)).toBe(false);
});
it('refuses contradictory facts at the exact same ancestor reference',()=>{
 const rows=records(),other=structuredClone(rows[1]);other.id+=':conflict';
 (other.details!.fundingContext as any).nodes['credit:parent'].amountUsdCents='701';
 expect(()=>enrichWalletFundingContext(rows,[other])).toThrow('funding evidence conflicts');
});
it('does not infer a parent from matching amounts or replace an absent original with a complete flag',()=>{
 const rows=records();(rows[0].details!.fundingContext as any).nodes['transfer:tx:selected'].parents=[{kind:'credit',id:'not-parent'}];
 // The reader caches immutable contexts; a fresh wire is required for new input.
 const result=enrichWalletFundingContext(rows.map(row=>structuredClone(row)),rows.map(row=>structuredClone(row)))[0];
 expect(ledgerFundingTrace(result).context?.coverage.status).toBe('incomplete');expect(ledgerFundingTrace(result).steps.some(s=>s.sourceId===asset)).toBe(false);
});
it('preserves the recovered prefix through a thinner refresh, saved receipt and the next exact addition',()=>{
 const rows=records(),[selected]=enrichWalletFundingContext(rows,rows);
 const [retained]=mergePublicRecords([selected],[rows[0]]);
 expect(ledgerFundingTrace(retained).steps).toEqual(ledgerFundingTrace(selected).steps);
 const restored=receiptDisplayRecord(readLedgerReceipt(JSON.parse(JSON.stringify(completeLedgerReceipt(retained)))));
 const next=structuredClone(rows[0]);next.id='wallet:next';next.sourceId='next';next.evidence.transferId='tx:next';
 next.details!.fundingContext={schema:'receiz.wallet.funding-context.v1',root:{kind:'transfer',id:'tx:next'},nodes:{'transfer:tx:next':{ref:{kind:'transfer',id:'tx:next'},amountUsdCents:'27',parents:[{kind:'transfer',id:'tx:selected'}]}},coverage:{status:'incomplete',missing:[{kind:'transfer',id:'tx:selected'}],continuations:[]}} as never;
 const [enriched]=enrichWalletFundingContext([next],[restored]);
 expect(ledgerFundingTrace(enriched).steps.map(s=>s.sourceId)).toEqual([asset,'parent','tx:selected','tx:next']);
 expect(ledgerFundingTrace(enriched).context?.coverage.status).toBe('complete');
});
it('reuses the complete exact legacy cohort already held by the view instead of leaving its source marker empty',()=>{
 const [record]=records(),context=record.details!.fundingContext as any;
 context.nodes['credit:parent']={ref:{kind:'credit',id:'parent'},amountUsdCents:'700',amountPhiMicro:'1000',occurredAt:'2026-05-01T00:00:00Z',source:'profile_rollup_seed',parents:[{kind:'proof-basis',id:'original-credit:parent'}]};
 record.details!.fundingCohorts=[{rule:'receiz-profile-rollup-v1-owned-and-received',basis:'reconstructed-membership',creditSourceId:'parent',computedAt:'2026-04-01T00:00:00Z',amountPhiMicro:'1000',members:[{objectId:asset,title:'Existing original',createdAt:'2026-03-01T00:00:00Z',verifyUrl:'https://receiz.com/v/moment/original',basis:'owned'}]}];
 const [enriched]=enrichWalletFundingContext([structuredClone(record)],[]),trace=ledgerFundingTrace(enriched);
 expect(trace.context?.coverage.status).toBe('complete');expect(trace.steps.map(s=>s.sourceId)).toEqual([asset,'parent','tx:selected']);
 const wrong=structuredClone(record);(wrong.details!.fundingCohorts as any)[0].amountPhiMicro='1001';
 expect(ledgerFundingTrace(enrichWalletFundingContext([wrong],[])[0]).context?.coverage.status).toBe('incomplete');
});
