import {gzipSync,gunzipSync} from 'node:zlib';
import {expect,it,vi} from 'vitest';
import {preparePublicLedgerDisplay,type PublicLedgerHeads} from '../server/public-ledger-preparation';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
const record=(source:string,id:string)=>({id:source+':'+id,sourceId:id,source,kind:'recorded',title:id,detail:'Existing public evidence',time:null,actor:null,pulse:'100',kaiUpulse:null,amountUsdCents:null,sourceUrl:null,evidence:{},authority:'public-source-projection'});
const retained={schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[record('actions','action-old'),record('wallet','wallet-old'),record('graph','graph-old'),record('proofs','proof-old')],capturedAt:'2026-11-03T12:00:00Z',inspectionVersion:4,coverage:['actions','wallet','graph','proofs'].map(source=>({source,complete:true}))};
const encoded=()=>gzipSync(JSON.stringify(retained)).toString('base64url');
const heads:PublicLedgerHeads={actions:{count:'2',lastSeq:'2'},wallet:{count:'2',lastKaiUpulse:'200000000'},graph:{count:'1',revision:'graph-current'}};
function reader(){return vi.fn(async(source:string,cursor?:string)=>{
 if(source==='actions')return cursor?{ok:true,source,actions:[{id:'action-old',kind:'recorded',summary:'action-old',pulse:'100'}],nextCursor:'unneeded-older',rollup:{count:2,lastSeq:2}}:{ok:true,source,actions:[{id:'action-new',kind:'recorded',summary:'action-new',pulse:'200'}],nextCursor:'next-actions',rollup:{count:2,lastSeq:2}};
 if(source==='wallet')return {ok:true,source,events:[{id:'wallet-new',kind:'recorded',summary:'wallet-new',pulse:'200'},{id:'wallet-old',kind:'recorded',summary:'wallet-old',pulse:'100'}],nextCursor:'unneeded-wallet-history',rollup:{totalLedgerEntries:'2',lastEntryKaiUpulse:'200000000'}};
 return {ok:true,source,ledgerRows:[{id:'graph-old',kind:'recorded',summary:'graph-old',pulse:'100'}],nextCursor:null};
 });}
it('reads only new public pages through a held anchor, retains history, and excludes proof membership from the financial cache',async()=>{
 const read=reader(),result=await preparePublicLedgerDisplay({retainedGzipB64u:encoded(),currentHeads:heads,read,now:()=> '2026-11-04T12:00:00Z'}),cache=parsePublicNetworkCache(JSON.parse(gunzipSync(Buffer.from(result.ledgerCacheGzipB64u,'base64url')).toString()));
 expect(read.mock.calls).toEqual(expect.arrayContaining([['actions',undefined],['actions','next-actions'],['wallet',undefined],['graph']]));expect(read).toHaveBeenCalledTimes(4);expect(cache.records.map(row=>row.id).sort()).toEqual(['actions:action-new','actions:action-old','graph:graph-old','wallet:wallet-new','wallet:wallet-old']);expect(result.diagnostics.historicalRowsRemoved).toBe(0);expect(result.diagnostics.added).toEqual({actions:1,wallet:1,graph:0});expect(cache.inspectionVersion).toBe(4);
 const noRead=vi.fn(async()=>{throw Error('ALREADY_HELD');});expect(await preparePublicLedgerDisplay({previous:result,currentHeads:result.heads,read:noRead})).toBe(result);expect(noRead).not.toHaveBeenCalled();
});
it('refuses an incomplete, repeated or cached older public head instead of declaring saved HTML current',async()=>{
 const read=reader();await expect(preparePublicLedgerDisplay({retainedGzipB64u:encoded(),currentHeads:{...heads,actions:{count:'3',lastSeq:'3'}},read})).rejects.toThrow('PUBLIC_LEDGER_HEAD_PENDING');
 await expect(preparePublicLedgerDisplay({retainedGzipB64u:encoded(),read:async source=>source==='graph'?{ok:true,source,ledgerRows:[],nextCursor:null}:({ok:true,source,...source==='actions'?{actions:[]}:{events:[]},nextCursor:'repeated',rollup:{count:2,lastSeq:2,totalLedgerEntries:'2'}})})).rejects.toThrow('PUBLIC_LEDGER_PREPARATION_CURSOR');
});
it('honors a complete current graph withdrawal without changing immutable action/wallet history',async()=>{
 const normal=reader(),result=await preparePublicLedgerDisplay({retainedGzipB64u:encoded(),read:(source,cursor)=>source==='graph'?Promise.resolve({ok:true,source,ledgerRows:[],nextCursor:null}):normal(source,cursor)}),cache=parsePublicNetworkCache(JSON.parse(gunzipSync(Buffer.from(result.ledgerCacheGzipB64u,'base64url')).toString()));expect(cache.records.some(row=>row.source==='graph')).toBe(false);expect(cache.records.some(row=>row.id==='wallet:wallet-old')).toBe(true);expect(result.diagnostics.withdrawnGraphRows).toBe(1);
});
it('does not let a legacy complete flag hide missing public rows behind a held wallet anchor',async()=>{
 const normal=reader(),read=vi.fn(async(source:'actions'|'wallet'|'graph'|'proofs',cursor?:string)=>source==='wallet'?(cursor?{ok:true,source,events:[{id:'backfilled',kind:'recorded',summary:'backfilled',pulse:'50'}],nextCursor:null,rollup:{totalLedgerEntries:'3',lastEntryKaiUpulse:'200000000'}}:{ok:true,source,events:[{id:'wallet-new',kind:'recorded',summary:'wallet-new',pulse:'200'},{id:'wallet-old',kind:'recorded',summary:'wallet-old',pulse:'100'}],nextCursor:'wallet-older-family',rollup:{totalLedgerEntries:'3',lastEntryKaiUpulse:'200000000'}}):normal(source,cursor));
 const result=await preparePublicLedgerDisplay({retainedGzipB64u:encoded(),read});expect(result.diagnostics.counts.wallet).toBe(3);expect(result.diagnostics.pages.wallet).toBe(2);expect(read.mock.calls).toContainEqual(['wallet','wallet-older-family']);
});
it('uses fresh fixed public SDK transports for background preparation and keeps the captured-head lower bound',async()=>{
 const normal=reader(),request=vi.fn<typeof fetch>(async input=>{
  const url=new URL(String(input)),source=url.pathname==='/api/wallet/ledger/public'?'wallet':url.pathname==='/api/ledger/actions/public'?'actions':'graph';
  return Response.json(await normal(source,url.searchParams.get('cursor')??undefined));
 });vi.stubGlobal('fetch',request);
 try{
  const result=await preparePublicLedgerDisplay({retainedGzipB64u:encoded(),currentHeads:heads});expect(result.diagnostics.counts.wallet).toBe(2);expect(request).toHaveBeenCalledTimes(4);
  for(const [,init] of request.mock.calls){expect(init).toMatchObject({cache:'no-store',credentials:'omit',redirect:'error'});expect(new Headers(init?.headers).get('cache-control')).toBe('no-cache');}
  await expect(preparePublicLedgerDisplay({retainedGzipB64u:encoded(),currentHeads:{...heads,wallet:{count:'3',lastKaiUpulse:'300000000'}}})).rejects.toThrow('PUBLIC_LEDGER_HEAD_PENDING');
 }finally{vi.unstubAllGlobals();}
});
