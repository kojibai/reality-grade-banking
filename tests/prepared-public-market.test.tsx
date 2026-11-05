// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {afterEach,expect,it,vi} from 'vitest';
import {handlePreparedPublicMarket} from '../server/prepared-public-market';
import {renderPublicMarketDocument} from '../server/public-market-document';
import {readPublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import {preparePublicMarketRenderMaterial} from '../server/public-market-preparation';
import {readPreparedPublicMaterial} from '../server/prepared-public-material';
import shippedHistory from '../public/receiz-public-share-chart-history.json';
import {parseMarketHistory} from '../src/receiz/market-projection/history';

const target='imported-synthetic-public-original',signature='d'.repeat(64);
const originals=Array.from({length:52},(_,i)=>({id:i===0?target:'original-'+i,receizId:'original-'+i,title:i===0?'New accepted public Original':'Historical '+i,visibility:'public',valueUsd:10,ownerUsername:'artist',profileOriginal:{hasPbiSignature:i===0,pbiReceiptHash:i===0?signature:null}}));
const input={ok:true,transport:{generatedAt:'2026-11-04T20:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:52,revision:'accepted-public-B'},publicOriginals:originals}};
const preparedState={marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:parseMarketHistory(shippedHistory).summary.serverPulse},history:shippedHistory};
const material=JSON.stringify({membership:input,snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}},...preparedState});
const generation=createHash('sha256').update(material).digest('hex');
const template='<!doctype html><html><head><title>Explore</title><link rel="stylesheet" href="/assets/explore-known.css"></head><body><div id="public-explore-root" data-public-runtime="explore"><p>Older build</p></div><script id="receiz-navigation" type="application/json">{}</script><script type="module" src="/assets/explore-known.js"></script></body></html>';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';});

it('prepares the complete accepted collection with the genuine newest row in readable HTML before JavaScript',async()=>{
 const html=await renderPublicMarketDocument({material,generation,template});
 const body=new DOMParser().parseFromString(html.replace(/<link\b[^>]*>/g,''),'text/html');
 expect(body.querySelectorAll('.asset-row')).toHaveLength(50);
 expect(body.querySelector('.market-rows')?.textContent).toContain('New accepted public Original');
 expect(body.querySelectorAll('.asset-row')[0].textContent).toContain('New accepted public Original');
 expect(html).toContain('/assets/explore-known.css');expect(html).toContain('/assets/explore-known.js');expect(html).not.toContain('Older build');
 const seed=readPublicMarketDocumentSeed(body)!;
 expect(seed.catalog.items).toHaveLength(52);expect(seed.catalog.items[0]?.assetId).toBe('original-0');
 expect(seed.catalog.items[0]?.pbiReceiptHash).toBe(signature);
 expect(seed.catalog.items.every(item=>item.authority==='projection-only'&&item.canTrade===false)).toBe(true);
});

it('cold delivery reads only the already prepared current document, never renders or loads membership',async()=>{
 const prepared=vi.fn(async()=>new Response('<html><body>accepted B '+target+'</body></html>',{headers:{'content-type':'text/html; charset=utf-8','x-receiz-public-material-revision':generation,'x-receiz-public-render-build':'bank-build-B','x-receiz-public-html-sha256':'a'.repeat(64)}})),render=vi.fn();
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/explore/'),{prepared,render,build:'bank-build-B'});
 expect(response.status).toBe(200);expect(await response.text()).toContain(target);expect(prepared).toHaveBeenCalledOnce();expect(render).not.toHaveBeenCalled();
});

it('keeps existing linked public Ledger source queries without opening or preparing that proof during delivery',async()=>{
 const prepared=vi.fn(async()=>new Response('<html>Current saved public Ledger</html>',{headers:{'content-type':'text/html','x-receiz-public-material-revision':generation,'x-receiz-public-render-build':'b'.repeat(64),'x-receiz-public-html-sha256':'a'.repeat(64)}})),render=vi.fn();
 for(const address of ['https://bankeiz.com/ledger/?source=','https://bankeiz.com/api/explore?path=ledger&source=']){
  const response=await handlePreparedPublicMarket(new Request(address+'c'.repeat(64)),{prepared,render,build:'b'.repeat(64)});expect(response.status).toBe(200);expect(await response.text()).toContain('Current saved public Ledger');
 }
 expect(prepared).toHaveBeenCalledTimes(2);expect(prepared).toHaveBeenLastCalledWith('GET','ledger','b'.repeat(64));expect(render).not.toHaveBeenCalled();
 for(const address of ['https://bankeiz.com/ledger/?source=invalid','https://bankeiz.com/ledger/?source='+('c'.repeat(64))+'&source='+('c'.repeat(64)),'https://bankeiz.com/explore/?source='+('c'.repeat(64))])expect((await handlePreparedPublicMarket(new Request(address),{prepared,render,build:'b'.repeat(64)})).status).toBe(404);
 expect(prepared).toHaveBeenCalledTimes(2);
});

it('does not claim old build HTML is current when accepted preparation is unavailable',async()=>{
 const render=vi.fn();const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/explore/'),{prepared:async()=>new Response(null,{status:503}),render});
 expect(response.status).toBe(503);expect(response.headers.get('x-receiz-public-material-revision')).toBeNull();expect(render).not.toHaveBeenCalled();
});

it('render-only publication rejects mismatched exact input bytes and cannot save or promote arbitrary HTML',async()=>{
 const render=vi.fn(),prepared=vi.fn();const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=1',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schema:'bank.public-market.render-input.v1',generation:'f'.repeat(64),material})}),{prepared,render});
 expect(response.status).toBe(400);expect(render).not.toHaveBeenCalled();expect(prepared).not.toHaveBeenCalled();
});

it.each([false,true])('restores the carried parsed catalogue without a second source read when active=%s',async active=>{
 const parsed=new DOMParser().parseFromString((await renderPublicMarketDocument({material,generation,template})).replace(/<link\b[^>]*>/g,''),'text/html');document.body.append(document.importNode(parsed.getElementById('public-market-seed')!,true));
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(()=>{})));localStorage.clear();vi.resetModules();
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket');let count=0;const host=document.createElement('div'),root=createRoot(host);
 function Probe(){const source=usePublicMarket(active,false);count=source.catalog?.items.length??0;return <span>{source.catalog?.items[0]?.title}</span>;}
 try{await act(async()=>root.render(<Probe/>));expect(count).toBe(52);expect(host.textContent).toBe('New accepted public Original');expect(fetch).not.toHaveBeenCalled();}finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});

it('shares one parsed document snapshot between startup and the existing live reader',async()=>{
 const parsed=new DOMParser().parseFromString((await renderPublicMarketDocument({material,generation,template})).replace(/<link\b[^>]*>/g,''),'text/html');
 const one=readPublicMarketDocumentSeed(parsed),two=readPublicMarketDocumentSeed(parsed);expect(two).toBe(one);expect(two?.catalog).toBe(one?.catalog);
});

it('refuses incomplete or private membership instead of publishing a false complete first paint',async()=>{
 const invalid=JSON.stringify({membership:{...input,transport:{...input.transport,publicOriginals:originals.map((row,index)=>index===51?{...row,visibility:'private'}:row)}}});
 await expect(renderPublicMarketDocument({material:invalid,generation:createHash('sha256').update(invalid).digest('hex'),template})).rejects.toThrow('PUBLIC_MARKET_RENDER_COMPLETE_REQUIRED');
});

it('prepares one bounded input from the existing four public operands and preserves complete share history',async()=>{
 const shareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:target,assetId:'original-0',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14955302000000',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'1000000',maxPurchaseShareQuantityMicro:'1000000',availability:'quote-capacity',positionsMicro:'0',certificatesMicro:'0',reservedBuyMicro:'0',history:[{kaiUPulse:'14955302000000',outstandingShareQuantityMicro:'0'}]};
 const quotes={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:target,visibility:'public',priceUsd:10,quoteUsdPerPhi:1,shareInventory,chart:Array.from({length:80},(_,value)=>({value,privateDiagnostic:'excluded'}))},{itemId:'not-in-membership',priceUsd:99}]}};
 const operands={membership:input,quotes,sports:{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[]},capitalization:{ok:true,marketCapProjection:{}}};
 const read=vi.fn(async(kind:keyof typeof operands)=>operands[kind]);
 const result=await preparePublicMarketRenderMaterial({read});const parsed=JSON.parse(result.material);
 expect(read.mock.calls.map(args=>args[0]).sort()).toEqual(['capitalization','membership','quotes','sports']);
 expect(parsed.membership).toEqual(input);expect(parsed.snapshot.data.liveMarkets).toHaveLength(1);expect(parsed.snapshot.data.liveMarkets[0].chart).toEqual(Array.from({length:48},(_,i)=>({value:i+32})));
 expect(parsed.snapshot.data.liveMarkets[0].shareInventory).toEqual(shareInventory);expect(result.generation).toBe(createHash('sha256').update(result.material).digest('hex'));
});

it('renders input material only in the background producer branch and never on a cold visit',async()=>{
 const prepareInput=vi.fn(async()=>({material,generation})),prepared=vi.fn(),render=vi.fn();
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey:'a'.repeat(64)})}),{prepared,render,prepareInput,build:'b'.repeat(64)});
 expect(response.status).toBe(200);expect(await response.json()).toMatchObject({schema:'bank.public-market.render-material.v1',material,generation,build:'b'.repeat(64)});expect(prepareInput).toHaveBeenCalledOnce();expect(prepared).not.toHaveBeenCalled();expect(render).not.toHaveBeenCalled();
});

it('uses only a qualified new membership delta over the retained operands without rereading old sources or dropping shares',async()=>{
 const inventory={schema:'receiz.market.share-inventory.v1',marketItemId:target,assetId:'original-0',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14955302000000',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'1000000',maxPurchaseShareQuantityMicro:'1000000',availability:'quote-capacity',positionsMicro:'0',certificatesMicro:'0',reservedBuyMicro:'0',history:[{kaiUPulse:'14955302000000',outstandingShareQuantityMicro:'0'}]};
 const previousMaterial=JSON.stringify({publicDisplayPolicy:'bank.public-market.curated-display.v2',membership:input,snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:target,visibility:'public',priceUsd:10,shareInventory:inventory,chart:[{value:10}]}]}},sports:{held:'same-sports'},capitalization:{held:'same-cap'},history:{held:'same-history'},ledgerCacheGzipB64u:'same-ledger'});
 const added={id:'new-source-original',receizId:'new-source-original',title:'New accepted public Original',visibility:'public',valueUsd:5};
 const membership={ok:true,transport:{...input.transport,publicMembership:{...input.transport.publicMembership,itemCount:53,revision:'accepted-C'},publicOriginals:[added,...originals]}};
 const read=vi.fn(async()=>{throw Error('Older Source must not be rediscovered.');});
 const result=await preparePublicMarketRenderMaterial({read,previousMaterial,membership,changedQuotes:[{itemId:target,visibility:'public',priceUsd:11}]}),next=JSON.parse(result.material);
 expect(read).not.toHaveBeenCalled();expect(next.membership.transport.publicOriginals).toHaveLength(53);expect(next.snapshot.data.liveMarkets[0].shareInventory).toMatchObject(inventory);
 expect(next.snapshot.data.liveMarkets[0].priceUsd).toBe(11);expect(next.sports).toEqual({held:'same-sports'});expect(next.capitalization).toEqual({held:'same-cap'});expect(next.history).toEqual({held:'same-history'});expect(next.ledgerCacheGzipB64u).toBe('same-ledger');
});

it('reopens only hash-qualified public display material from the fixed Source transport',async()=>{
 const compressed=gzipSync(Buffer.from(material)),fetcher=vi.fn(async()=>new Response(compressed,{headers:{'content-type':'application/gzip'}}));
 expect(await readPreparedPublicMaterial(generation,fetcher as typeof fetch)).toBe(material);
 expect(fetcher).toHaveBeenCalledWith('https://receiz.com/api/market/prepared-material?generation='+generation,expect.objectContaining({credentials:'omit',redirect:'error',cache:'no-store'}));
 await expect(readPreparedPublicMaterial('f'.repeat(64),fetcher as typeof fetch)).rejects.toThrow('PUBLIC_MATERIAL_INTEGRITY');
});

it('keeps SSR HTTP requests below the platform bound by passing an existing material generation',async()=>{
 const readMaterial=vi.fn(async()=>material),render=vi.fn(async()=>'<html>Existing accepted public display</html>');
 const body=JSON.stringify({schema:'bank.public-market.render-input.v1',materialGeneration:generation});
 const response=await handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=1',{method:'POST',headers:{'content-type':'application/json'},body}),{prepared:vi.fn(),render,readMaterial,build:'b'.repeat(64)});
 expect(body.length).toBeLessThan(256);expect(response.status).toBe(200);expect(response.headers.get('content-length')).toBeNull();expect(readMaterial).toHaveBeenCalledExactlyOnceWith(generation);
 expect(render).toHaveBeenCalledWith({generation,material,path:'explore'});expect(await response.text()).toContain('Existing accepted public display');
});

it('reuses verified bytes only after Source rechecks public eligibility and refuses a withdrawn generation',async()=>{
 const value='{"public":"conditional privacy regression"}',key=createHash('sha256').update(value).digest('hex'),compressed=gzipSync(Buffer.from(value));
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(compressed,{headers:{'content-type':'application/gzip'}})).mockResolvedValueOnce(new Response(null,{status:304})).mockResolvedValueOnce(new Response(null,{status:403}));
 vi.stubGlobal('fetch',fetcher);
 expect(await readPreparedPublicMaterial(key)).toBe(value);expect(await readPreparedPublicMaterial(key)).toBe(value);
 expect(fetcher.mock.calls[1][1].headers['if-none-match']).toBe('"'+key+'"');await expect(readPreparedPublicMaterial(key)).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');expect(fetcher).toHaveBeenCalledTimes(3);
});

it('bounds simultaneous material transport before preparation while coalescing an identical generation',async()=>{
 const values=Array.from({length:5},(_,index)=>JSON.stringify({public:'bounded synthetic display '+index})),keys=values.map(value=>createHash('sha256').update(value).digest('hex')),waiting=new Map<string,(value:Response)=>void>();
 const fetcher=vi.fn((url:string)=>new Promise<Response>(resolve=>waiting.set(new URL(url).searchParams.get('generation')!,resolve)));vi.stubGlobal('fetch',fetcher);
 const reads=keys.slice(0,4).map(key=>readPreparedPublicMaterial(key)),joined=readPreparedPublicMaterial(keys[0]);
 await expect(readPreparedPublicMaterial(keys[4])).rejects.toThrow('PUBLIC_MATERIAL_BUSY');expect(fetcher).toHaveBeenCalledTimes(4);
 for(let index=0;index<4;index++)waiting.get(keys[index])!(new Response(gzipSync(Buffer.from(values[index])),{headers:{'content-type':'application/gzip'}}));
 expect(await Promise.all(reads)).toEqual(values.slice(0,4));expect(await joined).toBe(values[0]);
 const last=readPreparedPublicMaterial(keys[4]);waiting.get(keys[4])!(new Response(gzipSync(Buffer.from(values[4])),{headers:{'content-type':'application/gzip'}}));expect(await last).toBe(values[4]);expect(fetcher).toHaveBeenCalledTimes(5);
});

it('keeps market operands exact on a Ledger-only append and updates only the held financial packet',async()=>{
 const prior={publicDisplayPolicy:'bank.public-market.curated-display.v2',membership:input,snapshot:{held:'same-quotes'},sports:{held:'same-sports'},capitalization:{held:'same-cap'},...preparedState,preparedLedger:{schema:'bank.public-ledger.preparation.v1',financialOnly:true,ledgerCacheGzipB64u:'old-financial-packet',heads:{actions:{count:'1',lastSeq:'1'}}}};
 const nextLedger={...prior.preparedLedger,ledgerCacheGzipB64u:'new-financial-packet',heads:{actions:{count:'2',lastSeq:'2'}}},read=vi.fn(async()=>{throw Error('Market inputs must not be read.');}),prepareLedger=vi.fn(async previous=>{expect(previous).toEqual(prior.preparedLedger);return nextLedger;});
 const prepareMarket=vi.fn(async()=>{throw Error('Ledger-only append must not prepare a new chart.');});
 const result=JSON.parse((await preparePublicMarketRenderMaterial({previousMaterial:JSON.stringify(prior),read,prepareLedger,prepareMarket})).material);
 expect(read).not.toHaveBeenCalled();expect(prepareMarket).not.toHaveBeenCalled();expect(prepareLedger).toHaveBeenCalledOnce();expect(result).toEqual({...prior,preparedLedger:nextLedger});
});

it('refreshes current Market operands while extending the already held financial prefix and chart history',async()=>{
 const prior={...preparedState,preparedLedger:{schema:'bank.public-ledger.preparation.v1',financialOnly:true,ledgerCacheGzipB64u:'accepted-financial-prefix',heads:{actions:{count:'51000',lastSeq:'51000'},wallet:{count:'100',lastKaiUpulse:'14900000000000'}}}};
 const operands={membership:input,quotes:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:target,visibility:'public',priceUsd:12}]}},sports:{current:'sports'},capitalization:{current:'capitalization'}};
 const read=vi.fn(async(kind:keyof typeof operands)=>operands[kind]),prepareLedger=vi.fn(async previous=>{expect(previous).toEqual(prior.preparedLedger);return previous;}),prepareMarket=vi.fn(async next=>{expect(next.history).toEqual(prior.history);return{history:next.history,asOfPulse:preparedState.marketPrepared.asOfPulse};});
 const result=JSON.parse((await preparePublicMarketRenderMaterial({previousMaterial:JSON.stringify(prior),refreshMarket:true,read,prepareLedger,prepareMarket})).material);
 expect(read.mock.calls.map(([kind])=>kind).sort()).toEqual(['capitalization','membership','quotes','sports']);expect(prepareLedger).toHaveBeenCalledOnce();expect(prepareMarket).toHaveBeenCalledOnce();expect(result.preparedLedger).toEqual(prior.preparedLedger);expect(result.history).toEqual(prior.history);expect(result.snapshot.data.liveMarkets[0].priceUsd).toBe(12);expect(result.capitalization).toEqual(operands.capitalization);
});

it('accepts only an explicit eligible previous generation for a Market refresh operation',async()=>{
 const prepareInput=vi.fn(async()=>({material,generation})),readMaterial=vi.fn(async()=>material),dependencies={prepared:vi.fn(),render:vi.fn(),prepareInput,readMaterial,build:'b'.repeat(64)};
 const send=(options:Record<string,unknown>)=>handlePreparedPublicMarket(new Request('https://bankeiz.com/api/explore?prepare=input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selectionKey:'a'.repeat(64),...options})}),dependencies);
 expect((await send({previousGeneration:generation,refreshMarket:true})).status).toBe(200);expect(prepareInput).toHaveBeenCalledWith(expect.objectContaining({previousMaterial:material,refreshMarket:true}));
 for(const options of [{refreshMarket:true},{previousGeneration:generation,refreshMarket:false},{previousGeneration:generation,refreshMarket:'true'},{previousGeneration:generation,refreshMarket:true,membership:input},{previousGeneration:generation,refreshMarket:true,changedQuotes:[]}])expect((await send(options)).status).toBe(400);
 expect(prepareInput).toHaveBeenCalledOnce();expect(readMaterial).toHaveBeenCalledOnce();
});

it('prepares chart state once before rendering multiple saved views with the identical held coordinate',async()=>{
 const prepareMarket=vi.fn(async()=>({history:shippedHistory,asOfPulse:preparedState.marketPrepared.asOfPulse}));
 const read=vi.fn(async(kind:string)=>kind==='membership'?input:kind==='quotes'?{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}}:undefined);
 const result=await preparePublicMarketRenderMaterial({read,prepareMarket});
 expect(prepareMarket).toHaveBeenCalledOnce();
 const one=await renderPublicMarketDocument({...result,template}),two=await renderPublicMarketDocument({...result,template,path:'explore/images'});
 for(const html of [one,two])expect(readPublicMarketDocumentSeed(new DOMParser().parseFromString(html,'text/html'))?.asOfPulse).toBe(preparedState.marketPrepared.asOfPulse);
 expect(prepareMarket).toHaveBeenCalledOnce();expect(read).toHaveBeenCalledTimes(4);
 const unprepared=JSON.stringify({membership:input,snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}}});
 await expect(renderPublicMarketDocument({material:unprepared,generation:createHash('sha256').update(unprepared).digest('hex'),template})).rejects.toThrow('PUBLIC_MARKET_RENDER_STATE_REQUIRED');
});
