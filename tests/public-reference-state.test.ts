import {expect,it,vi} from 'vitest';
import * as publicMarket from '../src/receiz/public-market';
import {fixture} from './fixtures/public-material-parts';
import {prepareSelectedPublicReferenceCatalog} from '../server/public-reference-state';
import {createHash} from 'node:crypto';
const rows=Array.from({length:3},(_,i)=>({id:`profile:alice:original-${i}`,receizId:`original-${i}`,ownerUserId:'owner-uid',ownerUsername:'alice',title:`Original ${i}`,profileOriginal:{hasLongForm:true,longForm:{text:'Existing public text'}}}));
it('prepares the exact complete current catalog in the background without opening financial or chart history',async()=>{
 const f=fixture(rows),state=await prepareSelectedPublicReferenceCatalog({...f},false);expect(state.catalog.complete).toBe(true);expect(state.catalog.items.map(item=>item.id)).toEqual(rows.map(row=>row.id));expect(f.reads.has(f.neverRead)).toBe(false);
 const again=await prepareSelectedPublicReferenceCatalog({...f},false);expect(again.catalog.items[0]).toBe(state.catalog.items[0]);expect([...f.reads.values()].every(n=>n===1)).toBe(true);
});
it('carries a changed profile count without preparing every unchanged Original again',async()=>{
 const f=fixture(rows),head=(count:number)=>f.put({profile:{userId:'owner-uid',username:'alice',displayName:'Alice',isPrivate:false,createdAt:'2026-01-01T00:00:00Z'},viewer:{canView:true},stats:{originals:count}}),input=(count:number)=>{const root={...f.root,membership:{...f.root.membership,headsByOwner:f.index([['owner-uid',head(count)]]).root}},material=JSON.stringify(root);return{material,generation:createHash('sha256').update(material).digest('hex'),readPart:f.readPart};};
 const before=await prepareSelectedPublicReferenceCatalog(input(3),false),after=await prepareSelectedPublicReferenceCatalog(input(4),false);for(let i=0;i<rows.length;i++)expect(after.catalog.items[i]).toBe(before.catalog.items[i]);expect(after.catalog.publicProfileHeads?.[0]?.stats.originals).toBe(4);
});
it('reuses every older parsed row after a new root appends one Original',async()=>{
 const before=fixture(rows),after=fixture([{...rows[0],id:'profile:alice:new',receizId:'new',title:'New Original'},...rows]),objects=new Map([...before.objects,...after.objects]),reads=new Map<string,number>(),readPart=async(id:string)=>{reads.set(id,(reads.get(id)??0)+1);const value=objects.get(id);if(value===undefined)throw Error('Missing part');return value;};
 const initial=await prepareSelectedPublicReferenceCatalog({...before,readPart},false);reads.clear();const next=await prepareSelectedPublicReferenceCatalog({...after,readPart},false);expect(next.catalog.items.length).toBe(4);for(let i=0;i<rows.length;i++){expect(next.catalog.items[i+1]).toBe(initial.catalog.items[i]);expect(reads.has(before.generations[i])).toBe(false);}expect(reads.has(before.neverRead)).toBe(false);
});
it('retains the current cohort across append even when its immutable parts exceed the old cache entry budget',async()=>{
 const existing=Array.from({length:1500},(_,i)=>({...rows[0],id:`profile:alice:held-${i}`,receizId:`held-${i}`,title:`Held ${i}`})),before=fixture(existing),after=fixture([{...rows[0],id:'profile:alice:new',receizId:'new',title:'New Original'},...existing]);
 const objects=new Map([...before.objects,...after.objects]),reads=new Map<string,number>(),readPart=async(id:string)=>{reads.set(id,(reads.get(id)??0)+1);const value=objects.get(id);if(value===undefined)throw Error('Missing part');return value;};
 const initial=await prepareSelectedPublicReferenceCatalog({...before,readPart},false);reads.clear();const next=await prepareSelectedPublicReferenceCatalog({...after,readPart},false);
 expect(before.generations.filter(id=>reads.has(id))).toEqual([]);for(let i=0;i<existing.length;i++)expect(next.catalog.items[i+1]).toBe(initial.catalog.items[i]);
});

it('carries a changed accepted owner name and portrait without reparsing held Original bodies',async()=>{
 const f=fixture(rows),input=(displayName:string,avatarUrl:string)=>{const head=f.put({profile:{userId:'owner-uid',username:'alice',displayName,avatarUrl,isPrivate:false,createdAt:'2026-01-01T00:00:00Z'},viewer:{canView:true},stats:{originals:3}}),root={...f.root,membership:{...f.root.membership,headsByOwner:f.index([['owner-uid',head]]).root}},material=JSON.stringify(root);return{material,generation:createHash('sha256').update(material).digest('hex'),readPart:f.readPart};};
 const spy=vi.spyOn(publicMarket,'parsePublicMarket');try{const before=await prepareSelectedPublicReferenceCatalog(input('Alice','https://receiz.com/old.png'),false);spy.mockClear();const after=await prepareSelectedPublicReferenceCatalog(input('Alice Updated','https://receiz.com/new.png'),false);
 expect(spy.mock.calls.filter(([input])=>((input as {transport?:{publicOriginals?:unknown[]}}).transport?.publicOriginals?.length??0)>0)).toHaveLength(0);for(let i=0;i<rows.length;i++){expect(after.catalog.items[i].ownerDisplayName).toBe('Alice Updated');expect(after.catalog.items[i].ownerAvatarUrl).toBe('https://receiz.com/new.png');expect(after.catalog.items[i].carriedText).toBe(before.catalog.items[i].carriedText);}}finally{spy.mockRestore();}
});

it('keeps an Original body pinned by newer readers when the reader that first projected it retires',async()=>{
 const text='Retained complete content 🪷 '.repeat(1000),sha256Hex=createHash('sha256').update(text).digest('hex');
 const row={id:'profile:cache_owner:pinned-original',receizId:'pinned-original',ownerUserId:'cache-owner',ownerUsername:'cache_owner',title:'Pinned Original',profileOriginal:{hasLongForm:true,longForm:{text,sha256Hex}}},f=fixture([row]),original=f.put(row.profileOriginal),reads=new Map<string,number>(),readPart=async(id:string)=>{reads.set(id,(reads.get(id)??0)+1);return f.readPart(id);};
 const version=(n:number)=>{const {profileOriginal:_original,...fields}=row,body=f.put({schema:'bank.public-market.curated-row.refs.v1',fields:{...fields,...(n===5?{title:'Changed display wrapper'}:{})},originalGeneration:original}),order=f.index([['00000000',body]]),ids=f.index([[JSON.stringify([row.ownerUserId,row.receizId]),JSON.stringify({generation:body,position:'00000000',facets:['All','Images']})]]),root={...f.root,selectionKey:'cache-pin-selection-'+n,membership:{...f.root.membership,byOrder:order.root,byId:ids.root,byFacet:{...f.root.membership.byFacet,All:order,Images:order}},marketPrepared:{...f.root.marketPrepared,asOfPulse:n+100}},material=JSON.stringify(root);return{material,generation:createHash('sha256').update(material).digest('hex'),readPart};};
 for(let n=1;n<=4;n++)await prepareSelectedPublicReferenceCatalog(version(n),false);expect(reads.get(original)).toBe(1);const next=await prepareSelectedPublicReferenceCatalog(version(5),false);expect(next.catalog.items[0].title).toBe('Changed display wrapper');expect(next.catalog.items[0].carriedText).toEqual({title:null,text,sha256Hex});expect(reads.get(original)).toBe(1);
});

it('retains an admitted zero-Original profile in the full family without a profile lookup',async()=>{
 const f=fixture(rows),head=f.put({profile:{userId:'new-owner',username:'new_owner',displayName:'New owner',isPrivate:false,createdAt:'2026-11-09T00:00:00Z'},viewer:{canView:true},stats:{originals:0}}),root={...f.root,membership:{...f.root.membership,headsByOwner:f.index([['new-owner',head],['owner-uid',f.put({profile:{userId:'owner-uid',username:'alice',isPrivate:false},viewer:{canView:true},stats:{originals:rows.length}})]]).root}},material=JSON.stringify(root);
 const {catalog}=await prepareSelectedPublicReferenceCatalog({material,generation:createHash('sha256').update(material).digest('hex'),readPart:f.readPart});
 expect(catalog.publicProfileHeads?.find(h=>h.profile.userId==='new-owner')?.profile.username).toBe('new_owner');
 const {selectHeldPublicProfile}=await import('../src/receiz/public-profile'),profile=selectHeldPublicProfile('new_owner',catalog);expect(profile?.stats.originals).toBe(0);expect(profile?.items).toEqual([]);
});
