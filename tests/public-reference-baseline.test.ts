import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {fixture,type Row} from './fixtures/public-material-parts';
import {prepareSelectedPublicReferenceCatalog} from '../server/public-reference-state';
const rows:Row[]=Array.from({length:50},(_,i)=>({id:`profile:alice:held-${i}`,receizId:`held-${i}`,ownerUserId:'uid',ownerUsername:'alice',title:`Held ${i}`}));
function family(){
 const f=fixture(rows),position=(i:number)=>String(i).padStart(8,'0'),key=(row:Row)=>JSON.stringify([row.ownerUserId,row.receizId]),baseline=f.put({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:rows.length},publicOriginals:rows,publicProfileHeads:[]}}),quotes=f.put({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:f.quotes}}),positionsGeneration=f.put(rows.map((row,i)=>[key(row),position(i)])),root={...f.root,membership:{...f.root.membership,baseline:{generation:baseline,byId:f.root.membership.byId,count:rows.length,positionsGeneration},baselineChanges:{root:null,count:0},headsBaselineChanges:{root:null,count:0}},snapshot:{...f.root.snapshot,baseline:{generation:quotes,membershipById:f.root.membership.byId},baselineChanges:{root:null,count:0}}};
 const material=JSON.stringify(root);return{...f,root,baseline,quotes,material,generation:createHash('sha256').update(material).digest('hex'),key};
}
it('opens a retained complete display family once and reads only the appended row and small changed metadata',async()=>{
 const before=family(),added:Row={...rows[0],id:'profile:alice:new',receizId:'new',title:'New Original'},raw=fixture([added,...rows]),generation=raw.generations[0],position='!new',logical=before.key(added),locator={generation,position,facets:['All','Images']},byId=raw.index([[logical,JSON.stringify(locator)],...rows.map((row,i)=>[before.key(row),JSON.stringify({generation:before.generations[i],position:String(i).padStart(8,'0'),facets:['All','Images']})] as [string,string])]),byOrder=raw.index([[position,generation],...rows.map((_,i)=>[String(i).padStart(8,'0'),before.generations[i]] as [string,string])]);
 const quote=raw.put(raw.quotes[0]),root={...raw.root,membership:{...before.root.membership,metadata:raw.root.membership.metadata,count:rows.length+1,byId:byId.root,byOrder:byOrder.root,baselineChanges:raw.index([[logical,JSON.stringify(locator)]])},snapshot:{...raw.root.snapshot,baseline:before.root.snapshot.baseline,baselineChanges:raw.index([[logical,JSON.stringify(quote)]])}},material=JSON.stringify(root),objects=new Map([...before.objects,...raw.objects]),reads=new Map<string,number>(),readPart=async(id:string)=>{reads.set(id,(reads.get(id)??0)+1);const body=objects.get(id);if(body===undefined)throw Error('Missing part');return body;};
 const initial=await prepareSelectedPublicReferenceCatalog({...before,readPart},false);expect(before.generations.some(id=>reads.has(id))).toBe(false);expect(reads.size).toBeLessThan(10);reads.clear();
 const next=await prepareSelectedPublicReferenceCatalog({material,generation:createHash('sha256').update(material).digest('hex'),readPart},false);expect(next.catalog.items[0].title).toBe('New Original');expect(next.catalog.items).toHaveLength(51);expect(before.generations.some(id=>reads.has(id))).toBe(false);for(let i=0;i<rows.length;i++)expect(next.catalog.items[i+1]).toBe(initial.catalog.items[i]);expect(reads.size).toBeLessThan(15);
});
it('rechecks an already parsed baseline after withdrawal and uses only the remaining current parts',async()=>{
 const before=family(),remaining=fixture(rows.slice(1)),objects=new Map([...before.objects,...remaining.objects]),calls:string[]=[],readPart=async(id:string)=>{calls.push(id);if(withdrawn&&id===before.baseline)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');const body=objects.get(id);if(body===undefined)throw Error('Missing part');return body;};let withdrawn=false;
 await prepareSelectedPublicReferenceCatalog({...before,readPart},false);withdrawn=true;calls.length=0;
 const root={...remaining.root,membership:{...remaining.root.membership,baseline:before.root.membership.baseline,baselineChanges:remaining.index([[before.key(rows[0]),'null']])},snapshot:{...remaining.root.snapshot,baseline:before.root.snapshot.baseline}},material=JSON.stringify(root);
 const result=await prepareSelectedPublicReferenceCatalog({material,generation:createHash('sha256').update(material).digest('hex'),readPart},false);expect(calls).toContain(before.baseline);expect(result.catalog.items).toHaveLength(49);expect(result.catalog.items.some(row=>row.assetId===rows[0].receizId)).toBe(false);
});

it('includes a current empty profile header even when the retained row baseline predates that Account',async()=>{
 const f=family(),uid='new-owner',head=f.put({profile:{userId:uid,username:'new_owner',isPrivate:false,createdAt:'2026-11-09T00:00:00Z'},viewer:{canView:true},stats:{originals:0}}),root={...f.root,membership:{...f.root.membership,headsByOwner:f.index([[uid,head]]).root,headsBaselineChanges:f.index([[uid,JSON.stringify(head)]])}},material=JSON.stringify(root);
 const result=await prepareSelectedPublicReferenceCatalog({material,generation:createHash('sha256').update(material).digest('hex'),readPart:f.readPart},false);
 expect(result.catalog.publicProfileHeads?.map(h=>h.profile.username)).toEqual(['new_owner']);expect(result.catalog.items).toHaveLength(rows.length);expect(f.generations.some(id=>f.reads.has(id))).toBe(false);
});

it('reuses complete retained profile headers and their current overlay without walking the unchanged owner index',async()=>{
 const f=family(),uid='empty-owner',head={profile:{userId:uid,username:'empty_owner',displayName:'Already held',isPrivate:false,createdAt:'2026-11-09T00:00:00Z'},viewer:{canView:true},stats:{originals:0}},headId=f.put(head),heads=f.index([[uid,headId]]);
 const baseline=JSON.parse(f.objects.get(f.baseline)!);baseline.transport.publicProfileHeads=[head];const generation=f.put(baseline);
 const root={...f.root,membership:{...f.root.membership,baseline:{...f.root.membership.baseline,generation},headsByOwner:heads.root}},material=JSON.stringify(root);
 const result=await prepareSelectedPublicReferenceCatalog({material,generation:createHash('sha256').update(material).digest('hex'),readPart:f.readPart},false);
 expect(result.catalog.publicProfileHeads?.map(h=>h.profile.username)).toEqual(['empty_owner']);
 expect(f.reads.has(heads.root!)).toBe(false);expect(f.reads.has(headId)).toBe(false);
});
