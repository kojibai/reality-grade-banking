import {expect,it,vi} from 'vitest';
import {mergePublicRecords,parsePublicNetworkPage} from '../src/receiz/public-network';
import {parsePrivateHistoryPage} from '../src/receiz/private-history';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
const note='note:connected',digest='a'.repeat(64),time='2026-10-24T12:00:00Z';
function wire(enriched=false){
 const attribution={rule:'receiz-card-fifo-cent-intervals',basis:'calculated-attribution',walletDebitId:'debit',amountUsdCents:'27',occurredAt:time,...(enriched?{noteId:note}:{}),parts:[{rail:'reserve',amountUsdCents:'27',sources:[{sourceId:'incoming',amountUsdCents:'27',offsetUsdCents:'0',creditAmountUsdCents:'100',occurredAt:'2026-10-23T12:00:00Z',...(enriched?{source:'bank_connected_note_redeem',noteId:note}:{})}]}]};
 return{ok:true,accountUserId:'owner',nextCursor:null,events:[{id:'wallet_ledger:debit',kind:'note_mint',noteId:note,amountUsdCents:'27',createdAt:time}],fundingContexts:{schema:'receiz.wallet.funding-context.v1',roots:{'debit:debit':{kind:'debit',id:'debit'}},nodes:{
 'debit:debit':{ref:{kind:'debit',id:'debit'},amountUsdCents:'27',parents:[{kind:'credit',id:'incoming'}],attribution,...(enriched?{originalDigest:'d'.repeat(64)}:{})},
 'credit:incoming':{ref:{kind:'credit',id:'incoming'},role:'recorded-funding',amountUsdCents:'100',parents:enriched?[{kind:'note',id:note}]:[{kind:'proof-basis',id:'original-credit:incoming'}],...(enriched?{source:'bank_connected_note_redeem',originalDigest:digest}:{})},
 'proof-basis:original-credit:incoming':{ref:{kind:'proof-basis',id:'original-credit:incoming'},parents:[]},
 ...(enriched?{['note:'+note]:{ref:{kind:'note',id:note},amountUsdCents:'100',parents:[{kind:'proof-basis',id:'funding-original'}]},'proof-basis:funding-original':{ref:{kind:'proof-basis',id:'funding-original'},parents:[],originalDigest:digest}}:{}),
 },coverage:{}}};
}
const publicRead=(v:ReturnType<typeof wire>)=>parsePublicNetworkPage('wallet',v).records;
const privateRead=(v:ReturnType<typeof wire>)=>parsePrivateHistoryPage(v,'owner').records;
for(const [name,read]of [['public',publicRead],['private',privateRead]]as const){
 it(`${name} refresh accepts the original Note links/digests added to a retained incomplete projection without IO`,()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  try{const old=read(wire()),fresh=read(wire(true)),merged=mergePublicRecords(old,fresh),trace=ledgerFundingTrace(merged[0]);
   expect(trace.boundary).toBe('source-origins');expect(trace.steps.some(s=>s.sourceHash===digest)).toBe(true);expect((merged[0].details?.fundingContext as any)?.nodes).toHaveProperty('credit:incoming.source','bank_connected_note_redeem');
   expect(mergePublicRecords(merged,old)[0].details?.fundingContext).toEqual(merged[0].details?.fundingContext);expect(fetch).not.toHaveBeenCalled();
  }finally{vi.unstubAllGlobals();}
 });
}
it('retains existing source facts across reordered JSON and thinner optional fields',()=>{
 const rich=publicRead(wire(true))[0],node=(rich.details!.fundingContext as any).nodes as any,thin=structuredClone(rich),nodes=(thin.details!.fundingContext as any).nodes as any;
 nodes['credit:incoming']=Object.fromEntries(Object.entries(nodes['credit:incoming']).reverse());delete nodes['credit:incoming'].source;
 expect((mergePublicRecords([rich],[thin])[0].details?.fundingContext as any)?.nodes).toEqual(node);
});
it.each(['amount','digest','parent','attribution'])('still rejects conflicting existing %s evidence',field=>{
 const old=publicRead(wire(true)),next=structuredClone(old),nodes=(next[0].details!.fundingContext as any).nodes as any;
 if(field==='amount')nodes['credit:incoming'].amountUsdCents='101';
 if(field==='digest')nodes['credit:incoming'].originalDigest='b'.repeat(64);
 if(field==='parent')nodes['credit:incoming'].parents=[{kind:'note',id:'note:unrelated'}];
 if(field==='attribution'){const a=nodes['debit:debit'].attribution;a.parts[0].sources[0].offsetUsdCents='1';}
 expect(()=>mergePublicRecords(old,next)).toThrow('funding evidence conflicts');
});
it('does not replace a known proof parent or financial source with a claimed Note link',()=>{
 const old=publicRead(wire()),fresh=publicRead(wire(true));
 const nodes=(old[0].details!.fundingContext as any).nodes as any;nodes['proof-basis:original-credit:incoming'].originalDigest='c'.repeat(64);
 expect(()=>mergePublicRecords(old,fresh)).toThrow('funding evidence conflicts');
});
it.each([{source:'stripe_origin'},{amountUsdCents:'100'},{occurredAt:time},{role:'recorded-funding'}])('keeps a populated credit marker as evidence instead of replacing it (%o)',fields=>{
 const old=publicRead(wire()),fresh=publicRead(wire(true));Object.assign(((old[0].details!.fundingContext as any).nodes as any)['proof-basis:original-credit:incoming'],fields);
 expect(()=>mergePublicRecords(old,fresh)).toThrow('funding evidence conflicts');
});

it('accepts the deployed legacy wire that omits the new connected-Note source label',()=>{
 const old=publicRead(wire()),raw=wire(true);delete (raw.fundingContexts.nodes['credit:incoming'] as any).source;
 expect(()=>mergePublicRecords(old,publicRead(raw))).not.toThrow();
});
