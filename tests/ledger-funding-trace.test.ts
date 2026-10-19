import {expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {ledgerFundingTrace,readLedgerCausalLineage} from '../src/receiz/ledger-funding-trace';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
const claim='a'.repeat(64),head='b'.repeat(64);
const steps=[
 {id:head+':work',kind:'post_work_proof',label:'Post work proof',detail:'Original sealed work',sourceId:'credit-one',contentHash:'c'.repeat(64),occurredAt:'2026-05-01T00:00:00Z',kaiPulse:'100'},
 {id:head+':value',kind:'glyph_economy_value',label:'Glyph economy value',detail:'Native allocated spend slice',sourceId:'credit-one',amountUsdCents:'300',amountPhiMicro:'1000000',occurredAt:'2026-05-01T00:00:00Z',kaiPulse:'100'},
 {id:head+':reserve',kind:'reserve_funding',label:'Reserve funding',detail:'Native allocated Reserve slice',sourceId:'credit-two',amountUsdCents:'200',occurredAt:'2026-05-02T00:00:00Z',kaiPulse:'110'},
 {id:head+':purchase',kind:'pack_purchase',label:'Pack purchase',detail:'Purchase',sourceId:'pack-one',amountUsdCents:'500',occurredAt:'2026-05-03T00:00:00Z',kaiPulse:'120'},
 {id:head+':transfer',kind:'transfer',label:'Ownership transfer',detail:'No settlement debit',sourceId:'transfer-one',amountUsdCents:'0',occurredAt:'2026-05-04T00:00:00Z',kaiPulse:'130'},
 {id:head+':later',kind:'transfer',label:'Later transfer',detail:'Future event',sourceId:'later-transfer',amountUsdCents:'0',occurredAt:'2026-05-05T00:00:00Z',kaiPulse:'140'},
];
const wire={id:'transaction',kind:'sports_card_transfer',collectibleId:'rsc_1234567890abcdef',claimHash:claim,transferId:'transfer-one',pulse:130,createdAt:'2026-05-04T00:00:00Z',causalLineage:{empty:false,proofHash:head,sourceSchema:'receiz.sports_arena.card_causal_ownership_proof.v1',fundingSource:'mixed',acquisitionKind:'transfer',steps}};
const row=()=>parsePublicNetworkPage('wallet',{ok:true,events:[wire]}).records[0];
it('retains native causal steps and multiple allocated funding sources through the receipt without a request',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try {const r=row(),trace=ledgerFundingTrace(r);expect(trace.steps.map(s=>s.kind)).toEqual(steps.slice(0,5).map(s=>s.kind));expect(trace.sources.map(s=>s.sourceId)).toEqual(['credit-one','credit-two']);expect(trace.sources.map(s=>s.amountUsdCents)).toEqual(['300','200']);expect(trace.steps[0].contentHash).toBe('c'.repeat(64));expect(trace.boundary).toBe('source-origins');expect(ledgerFundingTrace({...r,details:readReceiptLink(receiptLink(r)!).details!})).toEqual(trace);expect(fetch).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('does not turn the immediately preceding entry or a shared actor into a funding source',()=>{
 const r=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'send',kind:'chat_transfer',pulse:200,amountUsdCents:'500',prevHash:head,valueReceipt:{settledUsdCents:'200',phiUsdCents:'300',fundingSource:'mixed',fundingRule:'settled_first_then_phi'}}]}).records[0];
 const trace=ledgerFundingTrace(r);expect(trace.sources).toEqual([]);expect(trace.components).toEqual([{rail:'reserve',amountUsdCents:'200'},{rail:'settlement',amountUsdCents:'300'}]);expect(trace.boundary).toBe('origins-not-carried');expect(trace.steps).toEqual([]);
});
it('rejects cross-copy and conflicting source chronology instead of presenting an invented chain',()=>{
 expect(readLedgerCausalLineage({...wire,causalLineage:{...wire.causalLineage,steps:[{...steps[0],collectibleId:'rsc_ffffffffffffffff',claimHash:claim}]}})).toBeUndefined();
 const r=row();r.kaiUpulse='129999999';expect(ledgerFundingTrace(r).boundary).toBe('coordinate-conflict');
});
it('never copies private funding context into a shareable account receipt',()=>{
 const r={...row(),authority:'account-source-projection' as const,origin:'private-account' as const};const receipt=readReceiptLink(receiptLink(r)!);expect(receipt.details).toBeNull();expect(receipt.valueOperands).toEqual({});
});
it('does not reuse a parsed causal chain under a different original identity',()=>{
 const lineage={...wire.causalLineage};expect(readLedgerCausalLineage({...wire,causalLineage:lineage})).toBeDefined();expect(readLedgerCausalLineage({...wire,claimHash:'f'.repeat(64),causalLineage:lineage})).toBeUndefined();
});
it('shows originating native proof credit evidence without inventing a transfer allocation',()=>{
 const r=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'claim',kind:'claim',pulse:120,amountUsdCents:'2500',amountPhiMicro:'500000',metadata:{source:'sigil_upload_claim',direction:'credit',contentHash:'d'.repeat(64),claimPulse:'120',sigilPulse:'100',clientSecret:'DO-NOT-CARRY'}}]}).records[0];
 const trace=ledgerFundingTrace(r);expect(trace.sources).toMatchObject([{kind:'glyph_economy_value',contentHash:'d'.repeat(64),claimPulse:'120',kaiPulse:'120'}]);expect(trace.steps.map(s=>s.kaiPulse)).toEqual(['100','120']);expect(JSON.stringify(r)).not.toContain('DO-NOT-CARRY');
});
it('extracts the full native causal proof appends with their allocation rule and predecessor hashes',()=>{
 const first='d'.repeat(64),second='e'.repeat(64);
 const raw={collectibleId:wire.collectibleId,claimHash:claim,causalOwnershipProofs:[{schema:wire.causalLineage.sourceSchema,hash:first,collectibleId:wire.collectibleId,claimHash:claim,fundingSource:'mixed',acquisitionKind:'pack_purchase',anchors:{previousCausalProofHash:null},cardAllocation:{rule:'pack_slot_fifo_remainder_v1'},steps:steps.slice(0,4).map(s=>({...s,id:s.id.split(':')[1]}))},{schema:wire.causalLineage.sourceSchema,hash:second,collectibleId:wire.collectibleId,claimHash:claim,fundingSource:'transfer',acquisitionKind:'transfer',anchors:{previousCausalProofHash:first},cardAllocation:{rule:'non_monetary_transfer_v1'},steps:[{...steps[4],id:'transfer'}]}]};
 const lineage=readLedgerCausalLineage(raw)!;expect(lineage.steps).toHaveLength(5);expect(lineage.steps[4]).toMatchObject({previousCausalProofHash:first,allocationRule:'non_monetary_transfer_v1'});expect(lineage.proofHash).toBe(second);
 const r=row();r.details={causalLineage:lineage as never};expect(ledgerFundingTrace(r).sources).toHaveLength(2);
 const disconnected={...raw,causalOwnershipProofs:[{...raw.causalOwnershipProofs[0],hash:'f'.repeat(64)},...raw.causalOwnershipProofs]};expect(readLedgerCausalLineage(disconnected)).toBeUndefined();
});
