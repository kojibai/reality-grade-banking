// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {createPublicProfileDirectoryObserver} from '../src/receiz/public-profile-directory';
import {parsePublicMarket,rememberPublicMarketResponse,type PublicMarketCatalog} from '../src/receiz/public-market';
import {publishDiscoveredPublicCatalog,retainedDiscoveredPublicCatalog} from '../src/receiz/asset-publication-adoption';
import {createHeldPublicMarketInput} from '../src/receiz/public-market-held-catalog';
const uid=(n:number)=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const head=(n:number,name='Person '+n)=>({profile:{userId:uid(n),username:'person_'+n,isPrivate:false,displayName:name,updatedAt:'2026-11-14T10:00:00Z'},viewer:{canView:true},stats:{originals:0}});
const descriptor=(n:number)=>({userId:uid(n),username:'person_'+n,updatedAt:'2026-11-14T10:00:00Z'});
const empty=():PublicMarketCatalog=>({items:[],complete:true,revision:'a'.repeat(64),observedAt:'2026-11-14T10:00:00Z',sourceCount:0});
const page=(heads:unknown[],nextCursor:string|null=null)=>({ok:true,schema:'bank.public-profile-directory.v1',profiles:heads.map(h=>{const p=(h as ReturnType<typeof head>).profile;return{userId:p.userId,username:p.username,updatedAt:p.updatedAt??null};}),publicProfileHeads:heads,unavailable:[],nextCursor});
it('traverses every page, shares subscribers, adds zero-Original accounts and persists the same held catalog',async()=>{
 localStorage.clear();let selected=empty();const initialItems=selected.items;let cycle=0;
 const fetcher=vi.fn<typeof fetch>(async input=>{const after=new URL(String(input),'https://bankeiz.com').searchParams.get('after');return Response.json(!after?page([head(1)],uid(1)):page([head(cycle?3:2)]));});
 const publish=vi.fn((next:PublicMarketCatalog,previous:PublicMarketCatalog|null)=>{publishDiscoveredPublicCatalog(next,undefined,previous);selected=retainedDiscoveredPublicCatalog()!;});
 const observer=createPublicProfileDirectoryObserver({fetch:fetcher,selected:()=>selected,publish}),a=observer.subscribe(),b=observer.subscribe();await observer.refresh();
 expect(fetcher).toHaveBeenCalledTimes(2);expect(publish).toHaveBeenCalledOnce();expect(selected.items).toBe(initialItems);expect(selected.publicProfileHeads?.map(h=>h.profile.userId)).toEqual([uid(1),uid(2)]);
 const saved=JSON.parse(localStorage.getItem('receiz-bank-public-discovery-v2')!);expect(parsePublicMarket(saved).publicProfileHeads).toHaveLength(2);
 cycle++;await observer.refresh();expect(selected.publicProfileHeads).toHaveLength(3);expect(selected.revision).toBe('a'.repeat(64));expect(selected.items).toBe(initialItems);a();b();
});
it('rebases on a newer catalog and cannot overwrite a newer owner header or explicit refusal',async()=>{
 let selected:PublicMarketCatalog={...empty(),publicProfileHeads:[head(1)]},release!:()=>void;const wait=new Promise<void>(done=>release=done);
 const fetcher=vi.fn<typeof fetch>(async()=>{await wait;return Response.json(page([head(1,'Late'),head(2)]));});
 const observer=createPublicProfileDirectoryObserver({fetch:fetcher,selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe();
 selected={...selected,items:[{id:'new-work'}] as PublicMarketCatalog['items'],publicProfileHeads:[head(1,'Newer')]};release();await observer.refresh();
 expect(selected.items[0].id).toBe('new-work');expect(selected.publicProfileHeads!.find(h=>h.profile.userId===uid(1))?.profile.displayName).toBe('Newer');expect(selected.publicProfileHeads!.some(h=>h.profile.userId===uid(2))).toBe(true);stop();
});
it('retains successful pages on interruption and retries additions before the old cursor on the next pass',async()=>{
 let selected=empty(),fail=true;const fetcher=vi.fn<typeof fetch>(async input=>{if(!new URL(String(input),'https://bankeiz.com').search)return Response.json(page(fail?[head(2)]:[head(1),head(2)],uid(2)));if(fail)throw Error('offline');return Response.json(page([head(3)]));});
 const observer=createPublicProfileDirectoryObserver({fetch:fetcher,selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe();await observer.refresh();expect(selected.publicProfileHeads).toHaveLength(1);fail=false;await observer.refresh();expect(selected.publicProfileHeads).toHaveLength(3);stop();
});
it('only accepts exact directory bindings and preserves a verified held PBI on a partial successor',async()=>{
 let selected={...empty(),publicProfileHeads:[{...head(1),profile:{...head(1).profile,authorshipVerified:true,authorshipPbiReceiptHash:'b'.repeat(64),avatarUrl:'https://receiz.com/portrait.png'}}]} as PublicMarketCatalog;
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json({...page([head(1,'Changed'),head(9)]),profiles:[descriptor(1),descriptor(2)]}));
 const observer=createPublicProfileDirectoryObserver({fetch:fetcher,selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe();await observer.refresh();expect(selected.publicProfileHeads).toHaveLength(1);expect(selected.publicProfileHeads![0].profile).toMatchObject({displayName:'Changed',authorshipVerified:true,authorshipPbiReceiptHash:'b'.repeat(64),avatarUrl:'https://receiz.com/portrait.png'});stop();
});
it('does not relabel selected Originals or poison cold retention after a handle change or reassignment',async()=>{
 for(const changed of [{...head(1),profile:{...head(1).profile,username:'renamed_person'}},{...head(2),profile:{...head(2).profile,username:'person_1'}}]){
  let selected=parsePublicMarket({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'a'.repeat(64)},publicOriginals:[{id:'work',receizId:'work',title:'Held work',ownerUsername:'person_1',ownerUserId:uid(1),ownerCreatedAt:'2026-01-10T12:00:00Z'}],publicProfileHeads:[head(1)]}});
  expect(createHeldPublicMarketInput(selected)).not.toBeNull();
  const observer=createPublicProfileDirectoryObserver({fetch:async()=>Response.json(page([changed])),selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe();await observer.refresh();stop();
  expect(selected.publicProfileHeads?.[0].profile).toMatchObject({userId:uid(1),username:'person_1'});expect(createHeldPublicMarketInput(selected)).not.toBeNull();
 }
});
it('keeps the actual Source ETag after directory-only metadata advances, avoiding another complete body download',async()=>{
 vi.resetModules();const market=await import('../src/receiz/public-market'),revision='a'.repeat(64),sourceHeads='b'.repeat(64),etag='"source-family-origin"';let calls=0;
 const request=vi.spyOn(globalThis,'fetch').mockImplementation(async(_input,init)=>{
  if(calls++) {expect(new Headers(init?.headers).get('if-none-match')).toBe(etag);return new Response(null,{status:304});}
  return Response.json({ok:true,transport:{publicOriginals:[],publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:0,revision},publicProfileHeadsRevision:sourceHeads}},{headers:{etag}});
 });
 try{await market.observePublicMarketMembership(revision,'c'.repeat(64));expect(await market.observePublicMarketMembership(revision,'d'.repeat(64))).toBeNull();expect(request).toHaveBeenCalledTimes(2);}finally{request.mockRestore();}
});
it('adopts newly received public profiles immediately from the existing profile data while directory work is pending',async()=>{
 let selected=empty();const fetcher=vi.fn<typeof fetch>(()=>new Promise(()=>{})),observer=createPublicProfileDirectoryObserver({fetch:fetcher,selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe(),items=selected.items;
 await observer.receive([head(1),head(2)]);expect(selected.publicProfileHeads?.map(row=>row.profile.userId)).toEqual([uid(1),uid(2)]);expect(selected.items).toBe(items);expect(fetcher).toHaveBeenCalledOnce();stop();
});
it('lists a directory card without treating it as a complete profile or replacing held full metadata',async()=>{
 const {readPublicProfileHeader}=await import('../src/receiz/public-profile-header'),{buildDiscoveryIndex}=await import('../src/public-discover/discovery-index');
 const card={...head(2),unavailableDecorators:['profile-details']};
 expect(buildDiscoveryIndex([], [card]).people.map(person=>person.username)).toEqual(['person_2']);
 expect(readPublicProfileHeader(card)).toBeNull();
 const full={...head(1),profile:{...head(1).profile,bio:'Existing biography',links:[{label:'Studio',url:'https://studio.example/'}],bannerUrl:'https://receiz.com/banner.png',authorshipVerified:true,authorshipPbiReceiptHash:'b'.repeat(64)}};
 let selected:PublicMarketCatalog={...empty(),publicProfileHeads:[full]};
 const observer=createPublicProfileDirectoryObserver({fetch:()=>new Promise(()=>{}),selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe();
 await observer.receive({...head(1,'Updated card'),unavailableDecorators:['profile-details']});
 expect(readPublicProfileHeader(selected.publicProfileHeads![0])).toMatchObject({displayName:'Updated card',bio:'Existing biography',links:full.profile.links,bannerUrl:full.profile.bannerUrl,authorshipVerified:true,pbiReceiptHash:'b'.repeat(64)});
 stop();
});
it('reuses only the existing public reader projection, excluding private or owner-only profile fields',async()=>{
 const {parsePublicProfile,retainPublicProfile,receivedPublicProfileHead,receivedPublicProfileHeads}=await import('../src/receiz/public-profile'),{profileFixture}=await import('./fixtures/public-profile');
 const input=profileFixture(),profile=parsePublicProfile(input,'alexmorgan');retainPublicProfile(profile);
 const received=receivedPublicProfileHead('alexmorgan');expect(received?.profile).toMatchObject({userId:profile.userId,username:'alexmorgan'});
 expect(receivedPublicProfileHeads()).toContain(received);expect(JSON.stringify(received)).not.toMatch(/private@example|secret|Private draft|Do not duplicate/);
 retainPublicProfile({...profile,username:'owneronlycopy'});expect(receivedPublicProfileHead('owneronlycopy')).toBeNull();
 expect(receivedPublicProfileHead('missing')).toBeNull();
});
it('projects each accepted Showcase successor independently of stalled profile metadata and retains the selected prefix',async()=>{
 let selected=empty(),version=0;
 const membership=vi.fn(async()=>{const input={ok:true,transport:{generatedAt:'2026-01-01T00:00:00Z',publicOriginals:Array.from({length:++version},(_,i)=>({id:'original-'+i,receizId:'original-'+i,title:'Work '+i,ownerUsername:'person_1',ownerUserId:uid(1),ownerCreatedAt:'2026-01-01T00:00:00Z'})),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:version,revision:String(version).repeat(64)}}};const next=parsePublicMarket(input);rememberPublicMarketResponse(next,input);return next;});
 const observer=createPublicProfileDirectoryObserver({fetch:()=>new Promise(()=>{}),membership,selected:()=>selected,publish:(next,previous)=>{publishDiscoveredPublicCatalog(next,undefined,previous);selected=retainedDiscoveredPublicCatalog()!;}}),stop=observer.subscribe();
 try{
  await vi.waitFor(()=>expect(selected.items.map(item=>item.id)).toEqual(['original-0']));
  void observer.refresh(true);await vi.waitFor(()=>expect(selected.items.map(item=>item.id)).toEqual(['original-0','original-1']));
  const saved=JSON.parse(localStorage.getItem('receiz-bank-public-discovery-v2')!);expect(parsePublicMarket(saved).items.map(item=>item.id)).toEqual(['original-0','original-1']);
 }finally{stop();}
});
it('rechecks a notification received during an older directory walk instead of losing that edit',async()=>{
 let selected:PublicMarketCatalog={...empty(),publicProfileHeads:[head(1)]},finish!:(response:Response)=>void,reads=0;
 const fetcher=vi.fn<typeof fetch>(()=>++reads===1?new Promise(resolve=>{finish=resolve;}):Promise.resolve(Response.json(page([{...head(1,'Latest'),profile:{...head(1,'Latest').profile,bio:'Latest biography',updatedAt:'2026-11-15T10:00:00Z'}}]))));
 const observer=createPublicProfileDirectoryObserver({fetch:fetcher,selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe();
 try{const refresh=observer.refresh(true);finish(Response.json(page([])));await refresh;expect(fetcher).toHaveBeenCalledTimes(2);expect(selected.publicProfileHeads?.[0].profile.bio).toBe('Latest biography');}finally{stop();}
});
it('resolves an explicitly received profile edit even when its descriptive directory timestamp is unchanged',async()=>{
 const {createPublicProfileDirectoryReader}=await import('../server/public-profile-directory');let changed=false;
 const descriptor={userId:uid(1),username:'person_1',updatedAt:head(1).profile.updatedAt};
 const read=createPublicProfileDirectoryReader(async input=>String(input).includes('/public-directory')?Response.json({ok:true,schema:'receiz.public-profile-directory.v1',profiles:[descriptor],nextCursor:null}):Response.json({ok:true,head:{...head(1),profile:{...head(1).profile,bio:changed?'Accepted new biography':'Previous biography'}}}));
 let selected:PublicMarketCatalog={...empty(),publicProfileHeads:[{...head(1),profile:{...head(1).profile,bio:'Previous biography'}}]};
 const observer=createPublicProfileDirectoryObserver({fetch:async(_input,init)=>Response.json(await read(undefined,JSON.parse(new Headers(init?.headers).get('x-receiz-held-profile-heads')??'[]'))),selected:()=>selected,publish:next=>{selected=next;}}),stop=observer.subscribe();
 try{await observer.refresh();changed=true;await observer.receive({...head(1),unavailableDecorators:['profile-details']});await observer.refresh(true);expect(selected.publicProfileHeads?.[0].profile.bio).toBe('Accepted new biography');}finally{stop();}
});
