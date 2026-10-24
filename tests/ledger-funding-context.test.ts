import {describe,it,expect,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
import {readLedgerFundingContext} from '../src/receiz/ledger-funding-context';
const asset='20000000-0000-4000-8000-000000000001';
const nodes={
 'transfer:tx:current':{ref:{kind:'transfer',id:'tx:current'},amountUsdCents:'27',amountPhiMicro:'100',parents:[{kind:'credit',id:'incoming'}]},
 'credit:incoming':{ref:{kind:'credit',id:'incoming'},amountUsdCents:'100',amountPhiMicro:'400',parents:[{kind:'transfer',id:'tx:parent'}]},
 'transfer:tx:parent':{ref:{kind:'transfer',id:'tx:parent'},amountUsdCents:'100',amountPhiMicro:'400',parents:[{kind:'proof-basis',id:'original'}]},
 'proof-basis:original':{ref:{kind:'proof-basis',id:'original'},objectIds:[asset],parents:[]},
};
const packet=()=>({ok:true,events:[{id:'transfer:current',kind:'chat_transfer',transferId:'tx:current',amountUsdCents:'27',amountPhiMicro:'100',createdAt:'2026-10-23T01:00:00Z',kaiUpulse:'1000000',pulse:'1'}],fundingContexts:{schema:'receiz.wallet.funding-context.v1',nodes:structuredClone(nodes),roots:{'transfer:tx:current':{kind:'transfer',id:'tx:current'}},coverage:{'transfer:tx:current':{status:'complete',missing:[],continuations:[]}}}});
it('binds a Note event to its exact already-carried Note root',()=>{
 const p=packet(),noteId='10000000-0000-4000-8000-000000000001';
 const raw={ok:true,events:[{id:'wallet_ledger:mint',kind:'wallet_ledger_entry',ledgerEntryKind:'note_mint',noteId,amountUsdCents:'27',amountPhiMicro:'100'}],fundingContexts:{...p.fundingContexts,roots:{['note:'+noteId]:{kind:'note',id:noteId}},nodes:{...p.fundingContexts.nodes,['note:'+noteId]:{ref:{kind:'note',id:noteId},parents:[{kind:'transfer',id:'tx:current'}],amountUsdCents:'27',amountPhiMicro:'100'}}}};
 const record=parsePublicNetworkPage('wallet',raw).records[0];
 expect(ledgerFundingTrace(record).steps.map(step=>step.sourceId)).toContain(asset);
 expect(ledgerFundingTrace(record).context?.root).toEqual({kind:'note',id:noteId});
 expect(ledgerFundingTrace(parsePublicNetworkPage('wallet',{...raw,events:[{...raw.events[0],noteId:'unrelated'}]}).records[0]).steps).toEqual([]);
});
it('preserves the permitted Note alias and its funding graph through a shared receipt',async()=>{
 const {receiptLink,readReceiptLink}=await import('../src/receiz/ledger-receipts'),note='note:public-alias';
 const data={ok:true,events:[{id:'public-mint',kind:'note_mint',note_id:note,amountUsdCents:'27',amountPhiMicro:'100'}],fundingContexts:{schema:'receiz.wallet.funding-context.v1',root:{kind:'note',id:note},nodes:{['note:'+note]:{ref:{kind:'note',id:note},parents:[{kind:'proof-basis',id:'origin'}],amountUsdCents:'27',amountPhiMicro:'100'},'proof-basis:origin':{ref:{kind:'proof-basis',id:'origin'},parents:[],objectIds:[asset]}}}};
 const record=parsePublicNetworkPage('wallet',data).records[0],receipt=readReceiptLink(receiptLink(record)!);
 expect(receipt.evidence.noteId).toBe(note);
 expect(ledgerFundingTrace({...record,evidence:receipt.evidence,details:receipt.details??undefined}).steps.map(step=>step.sourceId)).toEqual(ledgerFundingTrace(record).steps.map(step=>step.sourceId));
});
it.each(['note_mint','note_claim'])('shows the existing native %s funding original and every held parent without another read',kind=>{
 const note='note:public-note',event=kind+':public-event',digest='d'.repeat(64),root={kind:kind==='note_mint'?'debit':'credit',id:event};
 // Exact nativeNoteFundingContextPage response shape: selected event -> Note
 // -> allocation proof original, already delivered with the wallet response.
 const data={ok:true,events:[{id:event,kind,noteId:note,amountUsdCents:'200',amountPhiMicro:'1000000',pulse:'100'}],fundingContexts:{schema:'receiz.wallet.funding-context.v1',roots:{[root.kind+':'+event]:root},nodes:{[root.kind+':'+event]:{ref:root,parents:[{kind:'note',id:note}],amountUsdCents:'200',amountPhiMicro:'1000000'},['note:'+note]:{ref:{kind:'note',id:note},parents:[{kind:'proof-basis',id:'allocation:original'}],amountUsdCents:'200',amountPhiMicro:'1000000'},'proof-basis:allocation:original':{ref:{kind:'proof-basis',id:'allocation:original'},parents:[],originalDigest:digest}},coverage:{}}};
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const trace=ledgerFundingTrace(parsePublicNetworkPage('wallet',data).records[0]);
  expect(trace.sources).toMatchObject([{sourceId:'allocation:original',sourceHash:digest}]);
  expect(trace.steps.map(step=>step.sourceId)).toEqual(['allocation:original',note,event]);
  expect(trace.boundary).toBe('source-origins');expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
describe('retained funding context',()=>{
 it('retains only the selected original’s ancestors and reuses its parsed closure',()=>{
  const p=packet();(p.fundingContexts.nodes as Record<string,unknown>)['credit:unrelated']={ref:{kind:'credit',id:'unrelated'},parents:[],source:'wallet_deposit',amountUsdCents:'999'};
  const selected=readLedgerFundingContext(p.fundingContexts,'tx:current')!;
  expect(selected.nodes['credit:unrelated']).toBeUndefined();expect(Object.keys(selected.nodes)).toHaveLength(4);
  expect(readLedgerFundingContext(p.fundingContexts,'tx:current')).toBe(selected);
  expect(readLedgerFundingContext(selected,'tx:current')).toBe(selected);
 });
 it('keeps shared ancestors complete and isolates different roots across serialization',()=>{
  const p=packet(),all=p.fundingContexts.nodes as Record<string,unknown>;
  p.fundingContexts.nodes['transfer:tx:current'].parents.push({kind:'credit',id:'shared'});
  all['credit:shared']={ref:{kind:'credit',id:'shared'},parents:[{kind:'proof-basis',id:'original'}]};
  all['transfer:tx:other']={ref:{kind:'transfer',id:'tx:other'},parents:[{kind:'credit',id:'private-unrelated'}]};
  all['credit:private-unrelated']={ref:{kind:'credit',id:'private-unrelated'},parents:[],source:'wallet_deposit'};
  (p.fundingContexts.roots as Record<string,unknown>)['transfer:tx:other']={kind:'transfer',id:'tx:other'};
  const selected=readLedgerFundingContext(p.fundingContexts,'tx:current')!;
  expect(selected.coverage.status).toBe('complete');expect(Object.keys(selected.nodes)).toHaveLength(5);
  expect(selected.nodes['credit:private-unrelated']).toBeUndefined();expect(selected.nodes['transfer:tx:other']).toBeUndefined();
  const transported=readLedgerFundingContext(JSON.parse(JSON.stringify(selected)),'tx:current')!;
  expect(transported).toEqual(selected);expect(transported.coverage.missing).toEqual([]);
 });
 it('binds to this exact payment and carries the originating proof and absent-page parent without IO',()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  const [record]=parsePublicNetworkPage('wallet',packet()).records;
  expect(record.details?.fundingContext).toBeDefined();const trace=ledgerFundingTrace(record);
  expect(trace.steps.some(s=>s.sourceId===asset)).toBe(true);expect(trace.steps.some(s=>s.label==='Parent payment'&&s.amountUsdCents==='100')).toBe(true);expect(trace.boundary).toBe('source-origins');expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();
 });
 it('does not accept a wrong payment root or trust a complete label when an ancestor is absent',()=>{
  const p=packet();expect(readLedgerFundingContext(p.fundingContexts,'tx:other')).toBeUndefined();
  delete (p.fundingContexts.nodes as Record<string,unknown>)['proof-basis:original'];
  const [record]=parsePublicNetworkPage('wallet',structuredClone(p)).records;expect(ledgerFundingTrace(record).boundary).toBe('origins-not-carried');
 });
 it('never treats a shared ancestor as a cycle or allows a genuine cycle to appear complete',()=>{
  const p=packet();(p.fundingContexts.nodes as Record<string,unknown>)['proof-basis:original']={...nodes['proof-basis:original'],parents:[{kind:'transfer',id:'tx:current'}]};
  const [record]=parsePublicNetworkPage('wallet',p).records;expect(ledgerFundingTrace(record).boundary).not.toBe('source-origins');
 });
});

it('retains richer context across a thinner refresh and through short shared receipts',async()=>{
 const {mergePublicRecords}=await import('../src/receiz/public-network');const {receiptLink,readReceiptLink}=await import('../src/receiz/ledger-receipts');
 const [record]=parsePublicNetworkPage('wallet',packet()).records;const thin={...record,details:undefined};const [retained]=mergePublicRecords([record],[thin]);expect(ledgerFundingTrace(retained).steps.some(s=>s.sourceId===asset)).toBe(true);
 const receipt=readReceiptLink(receiptLink(record)!);expect(receipt.details?.fundingContext).toBeDefined();expect(receipt.contextOmitted).toBe(false);
});
it('projects the exact same source history from an authenticated ledger response and carried account state',async()=>{
 const {parsePrivateHistoryPage}=await import('../src/receiz/private-history');const {projectPersonalHistory}=await import('../src/receiz/personal-history');
 const p=packet(),input={...p,accountUserId:'account',nextCursor:null};const direct=parsePrivateHistoryPage(input,'account').records[0];expect(ledgerFundingTrace(direct).steps.some(s=>s.sourceId===asset)).toBe(true);
 const state={authority:'verified-identity-portable-state',portableStateVerified:true,owner:{uid:'account'},completeAtSealedHead:true,verifiedState:{account:{userId:'account'},wallet:{activityEvents:p.events,fundingContexts:p.fundingContexts}}};const carried=projectPersonalHistory(state as never,'account').records[0];expect(ledgerFundingTrace(carried).steps.map(s=>s.sourceId)).toEqual(ledgerFundingTrace(direct).steps.map(s=>s.sourceId));
});
it('keeps explicit continuation references in compact receipt context instead of a false complete status',async()=>{
 const {compactLedgerFundingContext}=await import('../src/receiz/ledger-funding-context');const context=readLedgerFundingContext(packet().fundingContexts,'tx:current')!;const compact=compactLedgerFundingContext(context,700);expect(compact.coverage.status).toBe('incomplete');expect(compact.coverage.continuations.length).toBeGreaterThan(0);
 expect(readLedgerFundingContext(JSON.parse(JSON.stringify(compact)))?.coverage).toEqual(compact.coverage);
});

it('keeps the admitted graph when complete carried originals also support FIFO attribution',async()=>{
 const {projectPersonalHistory}=await import('../src/receiz/personal-history');
 const p=packet(),deposit={id:'deposit',user_id:'account',direction:'credit',entry_kind:'admin_adjustment',amount_usd_cents:'100',amount_phi_micro:'400',created_at:'2026-10-22T01:00:00Z',kai_upulse:'0',metadata:{source:'wallet_deposit'}},debit={id:'debit',user_id:'account',direction:'debit',entry_kind:'chat_transfer_send',amount_usd_cents:'27',amount_phi_micro:'100',created_at:p.events[0].createdAt,kai_upulse:'1000000',chat_transfer_id:'tx:current',metadata:{}};
 const state={authority:'verified-identity-portable-state',portableStateVerified:true,owner:{uid:'account'},completeAtSealedHead:true,verifiedState:{account:{userId:'account'},wallet:{ledgerEntries:[deposit,debit],ledgerEntryCount:2,activityEvents:p.events,fundingContexts:p.fundingContexts}}};
 const carried=projectPersonalHistory(state as never,'account').records.find(r=>r.evidence.transferId==='tx:current')!;
 expect(carried.details?.fundingAttribution).toBeDefined();expect(carried.details?.fundingContext).toBeDefined();expect(ledgerFundingTrace(carried).steps.some(s=>s.sourceId===asset)).toBe(true);
});
