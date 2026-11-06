import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import * as readerModule from '../server/public-material-window';
import {fixture,type Row} from './fixtures/public-material-parts';

const rows=Array.from({length:3},(_,i)=>({id:`profile:alice:original-${i}`,receizId:`original-${i}`,ownerUserId:'owner-uid',title:`Original ${i}`,profileOriginal:{longForm:{text:`Complete content ${i}`}}}));

it('opens the first accepted window with its full data and honest total without reading older rows or financial history',async()=>{
 const f=fixture(rows),reader=readerModule.createPublicMaterialWindowReader(f),window=await reader.window({limit:2});
 expect(window.membership.transport.publicOriginals).toEqual(rows.slice(0,2));expect(window.snapshot.data.liveMarkets).toEqual(f.quotes.slice(0,2));
 expect(window.membership.transport.publicMembership).toMatchObject({isComplete:false,itemCount:3});expect(window.sourceCount).toBe(3);expect(window.complete).toBe(false);expect(window.nextCursor).toMatchObject({rootGeneration:f.generation,after:'00000001'});
 expect(f.reads.has(f.generations[2])).toBe(false);expect(f.reads.has(f.neverRead)).toBe(false);
 const again=await reader.window({limit:2});expect(again).toBe(window);expect([...f.reads.values()].every(count=>count===1)).toBe(true);
});

it('binds continuation to the same selected root and retains the previous window when a requested part is corrupt',async()=>{
 const f=fixture(rows),reader=readerModule.createPublicMaterialWindowReader(f),first=await reader.window({limit:2});
 await expect(reader.window({limit:2,cursor:{...first.nextCursor!,rootGeneration:'0'.repeat(64)}})).rejects.toThrow('PUBLIC_MATERIAL_CURSOR_INVALID');
 f.objects.set(f.generations[2],'{"altered":true}');await expect(reader.window({limit:2,cursor:first.nextCursor!})).rejects.toThrow('PUBLIC_MATERIAL_PART_INTEGRITY');
 expect(await reader.window({limit:2})).toBe(first);
});

it.runIf(!!process.env.BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE&&!!process.env.BANKEIZ_PUBLIC_QUOTES_FIXTURE)('carries the exact bjklock Original and existing share observation without a profile or history request',async()=>{
 const input=JSON.parse(readFileSync(process.env.BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE!,'utf8')),quotes=JSON.parse(readFileSync(process.env.BANKEIZ_PUBLIC_QUOTES_FIXTURE!,'utf8'));
 const target=input.transport.publicOriginals.find((row:Row)=>row.receizId==='imported-b69c12eaabfb7e5e2a3875c936a728f2670c007d7ad191471388da23c78e73d4') as Row;expect(target).toBeTruthy();
 const sourceQuote=quotes.data.liveMarkets.find((row:{itemId:string})=>row.itemId===target.id);expect(sourceQuote.shareInventory).toBeTruthy();
 const f=fixture([target,...input.transport.publicOriginals.filter((row:Row)=>row.ownerUserId===target.ownerUserId&&row.id!==target.id).slice(0,2)],new Map([[target.id,sourceQuote]]));
 const view=await readerModule.createPublicMaterialWindowReader(f).window({limit:1});
 expect(view.membership.transport.publicOriginals[0]).toEqual(target);expect(view.snapshot.data.liveMarkets[0]).toEqual(sourceQuote);expect(f.reads.has(f.neverRead)).toBe(false);
});

it('traverses the selected facet without opening unrelated older row bodies',async()=>{
 const f=fixture(rows),reader=readerModule.createPublicMaterialWindowReader(f),images=await reader.window({facet:'Images',limit:1}),essays=await reader.window({facet:'Essays'});
 expect(images.filteredCount).toBe(3);expect(images.membership.transport.publicOriginals).toEqual([rows[0]]);expect(essays.filteredCount).toBe(0);expect(essays.membership.transport.publicOriginals).toEqual([]);expect(f.reads.has(f.generations[1])).toBe(false);
});

it('reuses the exact Original byte part behind a small curated row descriptor',async()=>{
 const original={...rows[0].profileOriginal,claimHashHex:'c'.repeat(64)},rawOriginal={...original,id:'must-not-reappear',claim:'  exact   source claim  ',privateField:'must-not-reappear'},f=fixture([{...rows[0],profileOriginal:original,summary:'exact source claim Created by artist.'}]);
 const raw=JSON.stringify(rawOriginal),originalGeneration=createHash('sha256').update(raw).digest('hex');f.objects.set(originalGeneration,raw);
 const first=JSON.parse(f.objects.get(f.generations[0])!),{profileOriginal,...fields}=first;
 const descriptor={schema:'bank.public-market.curated-row.refs.v1',fields,originalGeneration,originalOmit:['id','claim','privateField'],summaryRecipe:{kind:'normalized-claim',creatorNote:' Created by artist.'}},text=JSON.stringify(descriptor),newGeneration=createHash('sha256').update(text).digest('hex');
 f.objects.set(newGeneration,text);
 // Rebind this deterministic one-leaf test tree to the real descriptor hash.
 const put=(value:unknown)=>{const body=JSON.stringify(value),gen=createHash('sha256').update(body).digest('hex');f.objects.set(gen,body);return gen;};
 const node=(key:string,value:string)=>put({entry:{name:JSON.stringify([key,value]),directory:false,references:1},left:null,right:null,height:1,count:1,digestNames:false});
 const byOrder=node('00000000',newGeneration),byId=node(JSON.stringify([rows[0].ownerUserId,rows[0].receizId]),JSON.stringify({generation:newGeneration,position:'00000000',facets:['All','Images']}));
 const root={...f.root,membership:{...f.root.membership,byOrder,byId,byFacet:{...f.root.membership.byFacet,All:{root:byOrder,count:1},Images:{root:byOrder,count:1}}}},material=JSON.stringify(root),generation=createHash('sha256').update(material).digest('hex');
 const reader=readerModule.createPublicMaterialWindowReader({...f,material,generation}),view=await reader.window();expect(view.membership.transport.publicOriginals).toEqual([first]);expect(f.reads.get(originalGeneration)).toBe(1);expect(f.reads.has(f.generations[0])).toBe(false);
});
