import {expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createPublicMarketOperandPreparer} from '../server/public-market-operands';
import {handlePreparedPublicMarket} from '../server/prepared-public-market';
it('reads each missing public bootstrap family once and never joins financial history to membership',async()=>{
 const read=vi.fn(async(kind:string)=>({kind})),ledger=vi.fn(async()=>({schema:'bank.public-ledger.preparation.v1',financialOnly:true})),prepare=createPublicMarketOperandPreparer({read,prepareLedger:ledger});
 const a=await prepare({selectionKey:'a'.repeat(64),projectOperand:'membership'}),again=await prepare({selectionKey:'a'.repeat(64),projectOperand:'membership'});
 expect(a).toBe(again);expect(a.body).toEqual({kind:'membership'});expect(read.mock.calls).toEqual([['membership','a'.repeat(64)]]);expect(ledger).not.toHaveBeenCalled();
 const financial=await prepare({selectionKey:'a'.repeat(64),projectOperand:'preparedLedger'});expect(financial.body).toMatchObject({financialOnly:true});expect(read).toHaveBeenCalledOnce();expect(ledger).toHaveBeenCalledOnce();
});
it('uses the exact previously selected component generations for history across fresh workers without another family capture',async()=>{
 const read=vi.fn(async()=>{throw Error('A second capture is forbidden');}),operands={membership:'a'.repeat(64),quotes:'b'.repeat(64),sports:'c'.repeat(64),capitalization:'d'.repeat(64)},selected={membership:{member:'exact'},quotes:{quote:'exact'},sports:{cards:'exact'},capitalization:{cap:'exact'}},prepare=createPublicMarketOperandPreparer({read,parseHistory:value=>value,prepareMarket:async input=>{expect(input).toEqual({membership:selected.membership,snapshot:selected.quotes,sports:selected.sports,capitalization:selected.capitalization});return{history:{unchangedCapture:true},asOfPulse:12345};}});
 const result=await prepare({selectionKey:'e'.repeat(64),projectOperand:'history',operands},selected);expect(result.operands).toEqual(operands);expect(result.body).toEqual({unchangedCapture:true});expect(read).not.toHaveBeenCalled();
});
it('reuses the same bootstrap operands when the existing history calculator needs them',async()=>{
 const read=vi.fn(async(kind:string)=>({kind})),prepareMarket=vi.fn(async(input:Record<string,unknown>)=>{expect(Object.keys(input).sort()).toEqual(['capitalization','membership','snapshot','sports']);return {history:{retained:true},asOfPulse:12345};}),prepare=createPublicMarketOperandPreparer({read,completeSports:async value=>value,prepareMarket,parseHistory:value=>value});
 await prepare({selectionKey:'a'.repeat(64),projectOperand:'membership'});const result=await prepare({selectionKey:'a'.repeat(64),projectOperand:'history'});expect(read.mock.calls.map(([kind])=>kind).sort()).toEqual(['capitalization','membership','quotes','sports']);expect(prepareMarket).toHaveBeenCalledOnce();expect(result.body).toEqual({retained:true});expect(result.asOfPulse).toBe(12345);
});
it('returns one requested bootstrap operand through the existing endpoint without creating a flattened material',async()=>{
 const prepareOperand=vi.fn(async()=>({schema:'bank.public-market.operand.v1' as const,selectionKey:'a'.repeat(64),operand:'membership' as const,body:{ok:true}})),untouched=vi.fn(async()=>{throw Error('not requested');});
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey:'a'.repeat(64),projectOperand:'membership'})}),{build:'fixture',prepared:untouched,render:untouched,readMaterial:untouched,prepareInput:untouched,prepareOperand});
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({schema:'bank.public-market.operand.v1',operand:'membership',body:{ok:true},build:'fixture'});expect(untouched).not.toHaveBeenCalled();
});
it('prepares only numerical checkpoint inputs from exact selected bootstrap generations, without financial history or another capture',async()=>{
 const membership={ok:true,transport:{generatedAt:'2026-11-02T10:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'fixture'},publicOriginals:[{id:'profile:alice:original',receizId:'original',ownerUserId:'owner',ownerCreatedAt:'2026-10-20T10:00:00Z',ownerUsername:'alice',title:'Do not retain this title',profileOriginal:{}}]}},selected={membership,quotes:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}},sports:{},capitalization:{}},read=vi.fn(async()=>{throw Error('No second capture');}),history=vi.fn(async()=>{throw Error('No financial history reconstruction');}),prepare=createPublicMarketOperandPreparer({read,prepareMarket:history}),operands={membership:'a'.repeat(64),quotes:'b'.repeat(64),sports:'c'.repeat(64),capitalization:'d'.repeat(64)};
 const result=await prepare({selectionKey:'e'.repeat(64),projectOperand:'pricing',operands},selected);
 expect(result.body).toMatchObject({schema:'bank.public-market.pricing-input.v1',entries:[{logicalKey:JSON.stringify(['owner','original']),pricingCheckpoint:{schema:'bank.public-market.pricing-checkpoint.v1',item:{assetId:'original'}}}]});expect(JSON.stringify(result.body)).not.toContain('Do not retain this title');expect(result.operands).toEqual(operands);expect(read).not.toHaveBeenCalled();expect(history).not.toHaveBeenCalled();
});

const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const postOperand=(input:unknown)=>new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
it('extends the selected financial packet via the compiled operand and rechecks its root on a warm retry and late withdrawal',async()=>{
 const actionHash='8'.repeat(64),financialHeads={actions:{count:'1',lastSeq:'1',entryHash:actionHash},wallet:{count:'700',lastKaiUpulse:'200'}};
 const held={id:'wallet:old',sourceId:'old',source:'wallet',kind:'transfer',title:'Carried payment',detail:'Original description',amountUsdCents:'400',time:null,actor:null,pulse:'1',kaiUpulse:null,sourceUrl:null,evidence:{},authority:'public-source-projection'};
 const wire={schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[held],capturedAt:null,coverage:['wallet','actions','graph'].map(source=>({source,complete:true}))};
 const legacy=JSON.stringify({schema:'bank.public-ledger.preparation.v1',financialOnly:true,ledgerCacheGzipB64u:gzipSync(JSON.stringify(wire)).toString('base64url')});
 const root=JSON.stringify({schema:'bank.public-market.render-material.refs.v1',publicDisplayPolicy:'bank.public-market.curated-display.v3',preparedLedger:digest(legacy),membership:{metadata:'must-never-open'}});
 const selected=digest(root),parts=new Map([[selected,root],[digest(legacy),legacy]]);
 const financial:string[]=[],material:string[]=[],rechecks:string[]=[];let withdrawn=false,withdrawOnGraph=false;
 vi.stubGlobal('fetch',vi.fn<typeof fetch>(async(input,init)=>{
  const url=new URL(String(input));
  if(url.pathname==='/api/market/prepared-material'){
   const id=url.searchParams.get('generation')!;
   expect(url.searchParams.get('root')).toBe(selected);expect(url.searchParams.get('role')).toBe('root');
   if(new Headers(init?.headers).has('if-none-match')){rechecks.push(id);return new Response(null,{status:withdrawn?503:304});}
   material.push(id);const part=parts.get(id);if(!part||withdrawn)return new Response(null,{status:503});
   return new Response(gzipSync(part),{headers:{'content-type':'application/gzip'}});
  }
  financial.push(url.pathname);
  if(url.pathname==='/api/ledger/actions/public')return Response.json({ok:true,actions:[{id:'a1',seq:1,entryHash:actionHash}],nextCursor:null,rollup:{count:1,lastSeq:1}});
  if(url.pathname==='/api/wallet/ledger/public')return Response.json({ok:true,events:[{id:'new',pulse:'200'}],nextCursor:null,rollup:{totalLedgerEntries:'700',lastEntryKaiUpulse:'200'}});
  if(url.pathname==='/api/proof-graph/ledger'){withdrawn=withdrawOnGraph;return Response.json({ok:true,ledgerRows:[],nextCursor:null});}
  throw Error('Unrelated family read');
 }));
 try{
  const request={selectionKey:'4'.repeat(64),previousLedgerRoot:selected,projectOperand:'preparedLedger',currentLedgerHeads:financialHeads};
  const first=await handlePreparedPublicMarket(postOperand(request));expect(first.status).toBe(200);
  const result=await first.json();expect(result).toMatchObject({schema:'bank.public-market.operand.v1',selectionKey:request.selectionKey,operand:'preparedLedger',body:{heads:financialHeads}});expect(result.build).toMatch(/^[a-f0-9]{64}$/);
  const cache=JSON.parse(gunzipSync(Buffer.from(result.body.ledgerCacheGzipB64u,'base64url')).toString());expect(cache.records.map((row:{id:string})=>row.id).sort()).toEqual(['actions:a1','wallet:new','wallet:old']);
  const retries=await handlePreparedPublicMarket(postOperand({...request,selectionKey:'5'.repeat(64)}));
  expect(retries.status).toBe(200);expect(material).toEqual([selected,digest(legacy)]);expect(rechecks).toEqual([selected,selected]);
  expect(financial.sort()).toEqual(['/api/ledger/actions/public','/api/proof-graph/ledger','/api/wallet/ledger/public']);
  withdrawn=true;expect((await handlePreparedPublicMarket(postOperand(request))).status).toBe(503);
  withdrawn=false;withdrawOnGraph=true;
  expect((await handlePreparedPublicMarket(postOperand({...request,currentLedgerHeads:{...financialHeads,graph:{count:'0',revision:'changed'}}}))).status).toBe(503);
  expect(rechecks).toEqual([selected,selected,selected,selected]);
 }finally{vi.unstubAllGlobals();}
});

it('rejects invalid financial coordinates and mixed operands before loading the selected root',async()=>{
 const noop=vi.fn(async()=>{throw Error('Unexpected work');}),deps={build:'fixture',prepared:noop,render:noop,prepareOperand:noop};
 const heads={actions:{count:'2',lastSeq:'3',entryHash:'6'.repeat(64)},wallet:{count:'100',lastKaiUpulse:'10'}},request={selectionKey:'3'.repeat(64),projectOperand:'preparedLedger',previousLedgerRoot:'4'.repeat(64),currentLedgerHeads:heads};
 for(const change of [
  {previousLedgerRoot:undefined},{currentLedgerHeads:undefined},{previousLedgerRoot:[request.previousLedgerRoot]},
  {projectOperand:'pricing'},{operands:{}},{currentLedgerHeads:{...heads,extra:'ignored'}},
  {currentLedgerHeads:{...heads,actions:{...heads.actions,entryHash:'broken'}}},
  {currentLedgerHeads:{...heads,wallet:{...heads.wallet,count:-1}}},{currentLedgerHeads:{...heads,wallet:{count:'100'}}}
 ])expect((await handlePreparedPublicMarket(postOperand({...request,...change}),deps)).status).toBe(400);
 expect(noop).not.toHaveBeenCalled();
});
