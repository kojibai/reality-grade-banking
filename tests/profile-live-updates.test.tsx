// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {createPublicProfileDirectoryReader} from '../server/public-profile-directory';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const uid='00000000-0000-4000-8000-000000000001',revision='a'.repeat(64);
const head=(version:number)=>({profile:{userId:uid,username:'cadence',isPrivate:false,displayName:'Cadence',bio:'Biography '+version,websiteUrl:'https://example.com/'+version,links:[{label:'Work '+version,url:'https://example.com/work/'+version}],updatedAt:`2026-11-15T10:0${version}:00Z`,createdAt:'2026-11-01T10:00:00Z'},viewer:{canView:true},stats:{originals:0}});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear();});
it('updates the held profile from repeated Receiz edit notifications without visiting Discover or reopening its collection',async()=>{
 vi.resetModules();localStorage.clear();
 let version=0,controller!:ReadableStreamDefaultController<Uint8Array>;
 const source=vi.fn<typeof fetch>(async input=>String(input).includes('/public-directory')?Response.json({ok:true,schema:'receiz.public-profile-directory.v1',profiles:[{userId:uid,username:'cadence',updatedAt:head(version).profile.updatedAt}],nextCursor:null}):Response.json({ok:true,head:head(version)}));
 const directory=createPublicProfileDirectoryReader(source),calls:string[]=[];
 vi.stubGlobal('fetch',vi.fn<typeof fetch>(async(input,init)=>{
  const path=String(input);calls.push(path);
  if(path.endsWith('/public-profile-directory/stream'))return new Response(new ReadableStream<Uint8Array>({start(value){controller=value;}}),{headers:{'content-type':'text/event-stream'}});
  if(path.includes('/public-market/membership'))return new Response(null,{status:304});
  if(path.endsWith('/public-profile-directory'))return Response.json(await directory(undefined,JSON.parse(new Headers(init?.headers).get('x-receiz-held-profile-heads')??'[]')));
  return new Response('',{status:503});
 }));
 localStorage.setItem('receiz-bank-public-discovery-v2',JSON.stringify({ok:true,transport:{publicOriginals:[],publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:0,revision},publicProfileHeads:[head(0)]}}));
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),profiles=await import('../src/receiz/public-profile');
 const host=document.createElement('div'),root=createRoot(host);let selected:ReturnType<typeof usePublicMarket>;
 function Profile(){selected=usePublicMarket(false,true,undefined,true);const profile=profiles.selectHeldPublicProfile('cadence',selected.historyCatalog);return <p>{profile?.bio}</p>;}
 try{
  await act(async()=>root.render(<Profile/>));expect(host.textContent).toBe('Biography 0');
  await vi.waitFor(()=>expect(controller).toBeDefined());
  const items=selected!.historyCatalog!.items;
  for(version=1;version<=2;version++){
   const card={...head(version).profile};delete (card as Partial<typeof card>).bio;delete (card as Partial<typeof card>).links;
   await act(async()=>{controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({type:'profile',card})+'\n\n'));});
   await act(async()=>{await vi.waitFor(()=>expect(profiles.selectHeldPublicProfile('cadence',selected!.historyCatalog)?.bio).toBe('Biography '+version));});
   expect(host.textContent).toBe('Biography '+version);
   const profile=profiles.selectHeldPublicProfile('cadence',selected!.historyCatalog)!;
   expect(profile.websiteUrl).toBe('https://example.com/'+version);expect(profile.links[0].label).toBe('Work '+version);expect(selected!.historyCatalog!.items).toBe(items);
  }
  const saved=JSON.parse(localStorage.getItem('receiz-bank-public-discovery-v2')!);
  expect((saved.transport?.publicProfileHeads??saved.catalog?.publicProfileHeads)[0].profile.bio).toBe('Biography 2');
  expect(calls.some(path=>path.includes('/public-profile/cadence')||path.includes('/public-market/sports'))).toBe(false);
 }finally{await act(async()=>root.unmount());}
});
it('keeps the shared stream connected while another subscriber uses the same catalog reader',async()=>{
 vi.resetModules();let aborted=false;vi.stubGlobal('fetch',vi.fn<typeof fetch>(async(input,init)=>{if(String(input).endsWith('/stream')){init?.signal?.addEventListener('abort',()=>{aborted=true;});return new Response(new ReadableStream(),{headers:{'content-type':'text/event-stream'}});}return new Response(null,{status:503});}));
 const {subscribePublicProfileDirectory}=await import('../src/receiz/public-profile-directory'),read=()=>({items:[],complete:true,revision,observedAt:null,sourceCount:0}),first=subscribePublicProfileDirectory(read),second=subscribePublicProfileDirectory(read);
 try{first();expect(aborted).toBe(false);}finally{second();}expect(aborted).toBe(true);
});
it('updates a standalone Feed from the selected public successor before any Market runtime has mounted',async()=>{
 vi.resetModules();localStorage.clear();const {parsePublicMarket}=await import('../src/receiz/public-market'),{publishDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption'),feed=await import('../src/public-feed/feed-source');
 const input=(ids:string[])=>({ok:true,transport:{publicOriginals:ids.map(id=>({id,receizId:id,title:id})),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:ids.join(':')}}}),old=parsePublicMarket(input(['withdrawn','held'])),next=parsePublicMarket(input(['held','new']));
 const marker=document.createElement('script');marker.id='receiz-navigation';Object.assign(marker,{publicMarketDocument:()=>({catalog:old,generation:'a'.repeat(64)})});document.body.append(marker);feed.reusePreparedFeedCatalog(old,'a'.repeat(64));let seen=old;const stop=feed.subscribePreparedFeedCatalog(value=>{seen=value;});
 try{publishDiscoveredPublicCatalog(next);expect(seen.items.map(item=>item.id)).toEqual(['held','new']);expect(feed.readHeldFeedCatalog()!.items.map(item=>item.id)).toEqual(['held','new']);}finally{stop();marker.remove();}
});
it('keeps cold Ledger rows visible while its missing catalog stalls, then projects a streamed Showcase successor',async()=>{
 vi.resetModules();localStorage.clear();document.body.innerHTML='';
 const market=await import('../src/receiz/public-market'),network=await import('../src/receiz/public-network');let version=0,release!:(response:Response)=>void,controller!:ReadableStreamDefaultController<Uint8Array>;
 const input=(count:number)=>({ok:true,transport:{generatedAt:'2026-01-01T00:00:00Z',publicOriginals:Array.from({length:count},(_,i)=>({id:'cold-'+i,receizId:'cold-'+i,title:'Cold '+i,ownerUsername:'cadence',ownerUserId:uid,ownerCreatedAt:head(0).profile.createdAt})),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:count,revision:String(count).repeat(64)}}});
 vi.stubGlobal('fetch',vi.fn<typeof fetch>(async inputUrl=>{
  const path=String(inputUrl);if(path.endsWith('/stream'))return new Response(new ReadableStream<Uint8Array>({start(value){controller=value;}}),{headers:{'content-type':'text/event-stream'}});
  if(path.includes('/public-market/membership'))return version?Response.json(input(2)):new Promise<Response>(done=>{release=done;});
  if(path.includes('/public-profile-directory'))return Response.json({ok:true,schema:'bank.public-profile-directory.v1',profiles:[],publicProfileHeads:[],unavailable:[],nextCursor:null});
  return new Response(null,{status:503});
 }));
 const {usePublicNetwork}=await import('../src/receiz/usePublicNetwork'),records=market.parsePublicMarket(input(1)).items.map(network.publicMarketRecord),snapshot={records,capturedAt:'2026-11-15T12:00:00Z',inspectionVersion:network.PUBLIC_NETWORK_INSPECTION_VERSION,coverage:network.PUBLIC_SOURCES.map(source=>({source,complete:true,observedAt:Date.parse('2026-11-15T12:00:00Z')}))};
 let state!:ReturnType<typeof usePublicNetwork>;const host=document.createElement('div'),root=createRoot(host);function Ledger(){state=usePublicNetwork(true,snapshot);return <p>{state.records.filter(row=>row.source==='proofs').map(row=>row.sourceId).join(',')}</p>;}
 try{
  await act(async()=>root.render(<Ledger/>));expect(host.textContent).toBe('cold-0');expect(release).toBeTypeOf('function');expect(controller).toBeDefined();
  await act(async()=>release(Response.json(input(1))));expect(host.textContent).toBe('cold-0');version=1;
  const {retainedDiscoveredPublicCatalog}=await import('../src/receiz/asset-publication-adoption');
  await act(async()=>{controller.enqueue(new TextEncoder().encode('data: '+JSON.stringify({type:'refresh'})+'\n\n'));await vi.waitFor(()=>expect(retainedDiscoveredPublicCatalog()?.items).toHaveLength(2));});
  expect(host.textContent).toBe('cold-0,cold-1');
 }finally{await act(async()=>root.unmount());}
});
it('carries compatible artwork, share history and prices in the single shared successor used by cold Feed and Ledger',async()=>{
 vi.resetModules();localStorage.clear();document.body.innerHTML='';const market=await import('../src/receiz/public-market'),adoption=await import('../src/receiz/asset-publication-adoption'),feed=await import('../src/public-feed/feed-source');
 const input=(ids:string[])=>({ok:true,transport:{publicOriginals:ids.map(id=>({id,receizId:id,title:id,ownerUsername:'cadence',ownerUserId:uid,ownerCreatedAt:head(0).profile.createdAt,profileOriginal:{media:{kind:'image',originalDownloadSha256Hex:'a'.repeat(64)}}})),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:ids.length,revision:ids.join(':')}}});
 const first=input(['held']),old=market.parsePublicMarket(first);market.rememberPublicMarketResponse(old,first);
 const inventory={schema:'receiz.market.share-inventory.v1',marketItemId:'held',assetId:'held',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14710100000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'9000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity',historyBasis:'observations',history:[{kaiUPulse:'14710000000000',outstandingShareQuantityMicro:'0'},{kaiUPulse:'14710100000000',outstandingShareQuantityMicro:'1000000'}]};
 const quotes={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:'held',visibility:'public',priceUsd:20,quoteUsdPerPhi:2,chart:[{value:10},{value:20}],shareInventory:inventory}]}},rich=market.mergePublicQuotes(old,quotes);rich.items[0]={...rich.items[0],artworkUrl:'https://receiz.com/artwork/held.png'};market.reusePublicMarketResponse(old,rich);adoption.publishDiscoveredPublicCatalog(rich,quotes);feed.reusePreparedFeedCatalog(adoption.retainedDiscoveredPublicCatalog()!,null);
 const serial=input(['held','new']),next=market.parsePublicMarket(serial);market.rememberPublicMarketResponse(next,serial);adoption.publishDiscoveredPublicCatalog(next);
 const selected=adoption.retainedDiscoveredPublicCatalog()!,item=selected.items[0];expect(item.artworkUrl).toBe(rich.items[0].artworkUrl);expect(item.chart).toEqual(rich.items[0].chart);expect(item.priceUsd).toBe(rich.items[0].priceUsd);expect(item.shareInventory?.history).toEqual(rich.items[0].shareInventory?.history);expect(feed.readHeldFeedCatalog()).toBe(selected);
 const saved=JSON.parse(localStorage.getItem('receiz-bank-public-discovery-v2')!);const cold=market.parsePublicMarket(saved,saved.snapshot);expect(cold.items[0].shareInventory?.history).toEqual(item.shareInventory?.history);expect(cold.items[0].artworkUrl).toBe(item.artworkUrl);
});
