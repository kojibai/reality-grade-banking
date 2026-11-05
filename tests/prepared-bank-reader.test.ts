// @vitest-environment happy-dom
import {expect,it,vi,afterEach} from 'vitest';
import {gzipSync,strToU8} from 'fflate';
import {createPreparedBankCatalogReader,PREPARED_BANK_CATALOG_PATH} from '../src/receiz/prepared-bank-catalog';
import {publicMarketDocumentSeedScript,type PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import history from '../public/receiz-public-share-chart-history.json';
import capitalization from '../public/receiz-public-capitalization.json';
afterEach(()=>vi.restoreAllMocks());
const digest=async(value:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',strToU8(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
async function packet(title:string,generation='b'.repeat(64)){
 const catalog=parsePublicMarket({ok:true,transport:{generatedAt:'2026-11-04T20:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:title},publicOriginals:[{id:'synthetic-prepared-original',receizId:'synthetic-prepared-original',title,valueUsd:250,profileOriginal:{hasPbiSignature:true}}]}}),cap=parseMarketCapSource(capitalization);
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',generation,path:'bank',catalog,visibleCount:1,asOfPulse:Math.max(history.summary.serverPulse,cap.serverPulse),format:{locale:'en-US',timeZone:'UTC'},history:history as PublicMarketDocumentSeed['history'],capitalization:cap};
 const raw=strToU8(JSON.stringify(catalog)),gzipB64u=Buffer.from(gzipSync(raw)).toString('base64url'),body='<!doctype html><html><body>'+publicMarketDocumentSeedScript(seed,{gzipB64u,bytes:raw.length})+'</body></html>';
 const headers={'content-type':'text/html; charset=utf-8','x-receiz-public-material-revision':generation,'x-receiz-public-render-build':'c'.repeat(64),'x-receiz-public-html-sha256':await digest(body),'x-receiz-public-html-state':'current','x-receiz-public-state-coordinate':'d'.repeat(64)};
 return{body,headers,response:(method='GET')=>new Response(method==='HEAD'?null:body,{headers})};
}
it('reads only the saved data channel once and reuses the whole accepted snapshot on a matching HEAD',async()=>{
 const p=await packet('New B'),fetcher=vi.fn(async(_path:string,init?:RequestInit)=>p.response(init?.method)),reader=createPreparedBankCatalogReader(fetcher);
 expect(reader.getSnapshot().value).toBeNull();const first=await reader.read();expect(first?.seed.catalog.items[0].title).toBe('New B');expect(first?.history).toBeDefined();expect(first?.capitalization).toBeDefined();
 expect(fetcher).toHaveBeenCalledExactlyOnceWith(PREPARED_BANK_CATALOG_PATH,expect.objectContaining({credentials:'omit',redirect:'error',cache:'no-store',method:'GET'}));
 const parse=vi.spyOn(JSON,'parse'),hash=vi.spyOn(crypto.subtle,'digest');expect(await reader.read()).toBe(first);expect(fetcher.mock.calls[1][1]?.method).toBe('HEAD');expect(parse).not.toHaveBeenCalled();expect(hash).not.toHaveBeenCalled();
});
it('adopts a newly qualified renderer receipt without rereading identical inert data bytes',async()=>{
 const p=await packet('Held compatible data');let build=p.headers['x-receiz-public-render-build'];
 const fetcher=vi.fn(async(_path:string,init:RequestInit)=>new Response(init.method==='HEAD'?null:p.body,{headers:{...p.headers,'x-receiz-public-render-build':build}})),reader=createPreparedBankCatalogReader(fetcher),first=(await reader.read())!;
 build='e'.repeat(64);const parse=vi.spyOn(JSON,'parse'),hash=vi.spyOn(crypto.subtle,'digest'),next=(await reader.read())!;
 expect(next.receipt.build).toBe(build);expect(next).not.toBe(first);expect(next.seed).toBe(first.seed);expect(next.capitalization).toBe(first.capitalization);expect(next.history).toBe(first.history);
 expect(fetcher.mock.calls.map(([,init])=>init.method)).toEqual(['GET','HEAD']);expect(parse).not.toHaveBeenCalled();expect(hash).not.toHaveBeenCalled();
});
it('adopts current renderer C data without executing its HTML or borrowing client code',async()=>{
 const p=await packet('Compatible current renderer C'),reader=createPreparedBankCatalogReader(async()=>p.response());
 const result=await reader.read();expect(result?.receipt.build).toBe('c'.repeat(64));expect(result?.seed.catalog.items[0].canTrade).toBe(false);expect(document.getElementById('public-market-seed')).toBeNull();
});
it('accepts the same v1 seed when a current data renderer changes inert attribute order',async()=>{
 const p=await packet('Current C'),body=p.body.replace('<script id="public-market-seed" type="application/json">',"<script type='application/json' id='public-market-seed'>"),reader=createPreparedBankCatalogReader(async()=>new Response(body,{headers:{...p.headers,'x-receiz-public-html-sha256':await digest(body)}}));
 expect((await reader.read())?.seed.catalog.items[0].title).toBe('Current C');
});
it('keeps a retained Source receipt explicit while reusing the same confirmed body',async()=>{
 const p=await packet('Retained B'),head=new Response(null,{headers:{...p.headers,'x-receiz-public-html-state':'retained','x-receiz-public-pending-state-coordinate':'e'.repeat(64)}}),responses=[p.response(),head],reader=createPreparedBankCatalogReader(async()=>responses.shift()!);
 const first=await reader.read(),parse=vi.spyOn(JSON,'parse'),next=await reader.read();expect(next?.receipt.state).toBe('retained');expect(next?.seed).toBe(first?.seed);expect(next?.history).toBe(first?.history);expect(parse).not.toHaveBeenCalled();
});
it('publishes each changed catalog, capitalization and prepared history in one generation',async()=>{
 const a=await packet('A','a'.repeat(64)),b=await packet('B'),responses=[a.response(),b.response('HEAD'),b.response()],reader=createPreparedBankCatalogReader(async()=>responses.shift()!);
 const seen:Array<{phase:string;title?:string;generation?:string;hasHistory:boolean}>=[];reader.subscribe(()=>{const s=reader.getSnapshot();seen.push({phase:s.phase,title:s.value?.seed.catalog.items[0].title,generation:s.value?.seed.generation,hasHistory:!!s.value?.history});});
 await reader.read();await reader.read();expect(seen.filter(s=>s.phase==='ready').map(s=>[s.title,s.generation,s.hasHistory])).toEqual([['A','a'.repeat(64),true],['B','b'.repeat(64),true]]);
});
it('accepts a fully qualified GET when another Source transition finishes after the HEAD hint',async()=>{
 const a=await packet('A','a'.repeat(64)),b=await packet('B'),c=await packet('C','e'.repeat(64)),responses=[a.response(),b.response('HEAD'),c.response()],reader=createPreparedBankCatalogReader(async()=>responses.shift()!);
 await reader.read();expect((await reader.read())?.seed.catalog.items[0].title).toBe('C');expect(reader.getSnapshot().phase).toBe('ready');
});
it('releases the legacy fallback on 503/invalid bytes and never certifies an invalid seed or false current receipt',async()=>{
 const p=await packet('B');for(const response of [new Response(null,{status:503}),new Response(p.body+' ',{headers:p.headers}),new Response(p.body,{headers:{...p.headers,'x-receiz-public-html-state':'retained'}}),new Response(p.body,{headers:{...p.headers,'x-receiz-public-material-revision':'e'.repeat(64)}})]){
  const reader=createPreparedBankCatalogReader(async()=>response);expect(await reader.read()).toBeNull();expect(reader.getSnapshot().phase).toBe('fallback');
 }
});
it('does not let an aborted old response overwrite a newer accepted generation',async()=>{
 const a=await packet('A','a'.repeat(64)),b=await packet('B');let finish!:(response:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})).mockResolvedValueOnce(b.response()),reader=createPreparedBankCatalogReader(fetcher);
 const old=reader.read(),next=reader.read({restart:true});await next;finish(a.response());await old;expect(reader.getSnapshot().value?.seed.catalog.items[0].title).toBe('B');
});
it('refuses oversized and malformed UTF-8 data without releasing it into a display snapshot',async()=>{
 const p=await packet('B');for(const response of [new Response(p.body,{headers:{...p.headers,'content-length':String(32*1024*1024+1)}}),new Response(new Uint8Array([0xc3,0x28]),{headers:p.headers})]){
  const reader=createPreparedBankCatalogReader(async()=>response);expect(await reader.read()).toBeNull();expect(reader.getSnapshot()).toMatchObject({phase:'fallback',value:null});
 }
});
it('can retry after even a synchronous read transport failure',async()=>{
 const p=await packet('Retry B');let available=false;const reader=createPreparedBankCatalogReader(()=>{if(!available)throw Error('OFFLINE');return Promise.resolve(p.response());});
 expect(await reader.read()).toBeNull();available=true;expect((await reader.read())?.seed.catalog.items[0].title).toBe('Retry B');
});
it('keeps nested accepted data immutable when the same body is reused without parsing or hashing',async()=>{
 const p=await packet('Immutable B'),reader=createPreparedBankCatalogReader(async(_path,init)=>p.response(init.method)),first=(await reader.read())!;
 expect(()=>{first.seed.catalog.items[0].title='Changed by a consumer';}).toThrow(TypeError);
 expect(()=>{first.capitalization.valueRows[0].marketUsdValue=1;}).toThrow(TypeError);
 expect(()=>{first.history.summary.serverPulse=1;}).toThrow(TypeError);
 expect(()=>{first.receipt.bodySha256='f'.repeat(64);}).toThrow(TypeError);
 expect(()=>{reader.getSnapshot().phase='fallback';}).toThrow(TypeError);
 const parse=vi.spyOn(JSON,'parse'),hash=vi.spyOn(crypto.subtle,'digest');
 expect(await reader.read()).toBe(first);expect(first.seed.catalog.items[0].title).toBe('Immutable B');expect(parse).not.toHaveBeenCalled();expect(hash).not.toHaveBeenCalled();
});
it('releases pending work and cancels a stalled body when the complete read deadline expires',async()=>{
 const p=await packet('B'),deadline=new AbortController(),cancel=vi.fn(()=>new Promise<void>(()=>{}));
 vi.spyOn(AbortSignal,'timeout').mockReturnValue(deadline.signal);
 const stream=new ReadableStream<Uint8Array>({pull(){return new Promise<void>(()=>{});},cancel}),reader=createPreparedBankCatalogReader(async()=>new Response(stream,{headers:p.headers}));
 const pending=reader.read();await vi.waitFor(()=>expect(stream.locked).toBe(true));deadline.abort(new DOMException('Timed out','TimeoutError'));
 expect(await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve('STILL_PENDING'),100))])).toBeNull();
 expect(reader.getSnapshot()).toMatchObject({phase:'fallback',value:null});expect(cancel).toHaveBeenCalledOnce();expect(stream.locked).toBe(false);
});
it('releases the deadline even when a transport ignores its abort signal',async()=>{
 const deadline=new AbortController();vi.spyOn(AbortSignal,'timeout').mockReturnValue(deadline.signal);
 const reader=createPreparedBankCatalogReader(()=>new Promise<Response>(()=>{})),pending=reader.read();deadline.abort(new DOMException('Timed out','TimeoutError'));
 expect(await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve('STILL_PENDING'),100))])).toBeNull();expect(reader.getSnapshot().phase).toBe('fallback');
});
