// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
const uid=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const head=(n:number)=>({profile:{userId:uid(n),username:'person_'+n,isPrivate:false,displayName:'Person '+n,updatedAt:'2026-11-14T10:00:00Z'},viewer:{canView:true},stats:{originals:0}});
afterEach(()=>{document.body.replaceChildren();localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('restores cached directory headers beside a complete older carried family when localStorage has no room',async()=>{
 vi.resetModules();const {parsePublicMarket}=await import('../src/receiz/public-market'),{createPreparedBankCatalogReader}=await import('../src/receiz/prepared-bank-catalog'),{retainedDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');
 const current=parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'a'.repeat(64)},publicOriginals:[{id:'work',receizId:'work',title:'Current work',valueUsd:42}],publicProfileHeads:[head(1)]}});
 const marker=document.createElement('div');marker.id='receiz-navigation';Object.assign(marker,{publicMarketCatalog:()=>current});document.body.append(marker);
 const saved={schema:'bank.public-market.held-catalog.v1',catalog:{...current,items:current.items.map(item=>({...item,title:'Older cached work',priceUsd:1})),publicProfileHeads:[head(1),head(2)],publicProfileHeadsRevision:'d'.repeat(64)}};
 const set=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota','QuotaExceededError');}),fetcher=vi.fn(()=>new Promise<Response>(()=>{}));
 const cache={read:vi.fn(async()=>new Response(JSON.stringify(saved),{headers:{'content-type':'application/json','x-bankeiz-profile-directory':'d'.repeat(64)}})),write:vi.fn(),discard:vi.fn()};
 const reader=createPreparedBankCatalogReader(fetcher,undefined,cache);await reader.bootstrap();
 const restored=retainedDiscoveredPublicCatalog();expect(restored?.publicProfileHeads).toHaveLength(2);expect(restored?.items).toBe(current.items);expect(restored?.items[0]).toMatchObject({title:'Current work',priceUsd:42});expect(cache.read).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();expect(set).toHaveBeenCalled();
 set.mockRestore();
},15_000);
it('retains the directory cache marker through an existing transport and localStorage restoration',async()=>{
 let cached:Response|undefined;vi.stubGlobal('caches',{open:async()=>({put:async(_key:unknown,response:Response)=>{cached=response.clone();},match:async()=>cached?.clone(),delete:async()=>true})});vi.resetModules();
 let market=await import('../src/receiz/public-market'),publication=await import('../src/receiz/asset-publication-adoption');
 const input={ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:0,revision:'a'.repeat(64)},publicOriginals:[],publicProfileHeads:[head(1)],publicProfileHeadsRevision:'d'.repeat(64)}};
 const selected=market.parsePublicMarket(input);market.rememberPublicMarketResponse(selected,input);market.prepareHeldPublicMarketResponse(selected);publication.publishDiscoveredPublicCatalog(selected);
 const saved=JSON.parse(localStorage.getItem('receiz-bank-public-discovery-v2')!);expect(saved.bankProfileDirectoryRevision).toBe('d'.repeat(64));
 vi.resetModules();market=await import('../src/receiz/public-market');publication=await import('../src/receiz/asset-publication-adoption');const cold=market.parsePublicMarket(saved);market.rememberPublicMarketResponse(cold,saved);publication.publishDiscoveredPublicCatalog(cold);
 await new Promise(done=>setTimeout(done,0));expect(cached?.headers.get('x-bankeiz-profile-directory')).toBe('d'.repeat(64));
},15_000);
