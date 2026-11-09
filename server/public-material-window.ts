import {createHash} from 'node:crypto';
import {curatePublicProfileHead} from '../src/receiz/public-profile-header.js';
import type {PreparedPublicMaterialReferences,PublicMaterialIndexNode,PublicMaterialWindowCursor,PublicMaterialFacet,PublicMaterialIndex} from '../src/receiz/public-material-references.js';

type JsonObject=Record<string,unknown>;
export type PublicMaterialWindow={complete:false;sourceCount:number;proofCount:number;sportsCount:number;filteredCount:number;membership:{ok:true;transport:JsonObject&{publicMembership:JsonObject;publicOriginals:readonly JsonObject[];publicProfileHeads:readonly unknown[]}};snapshot:{ok:true;data:JsonObject&{liveMarkets:readonly JsonObject[]}};nextCursor:PublicMaterialWindowCursor|null};
type Input={material:string;generation:string;readPart:(generation:string)=>Promise<string>;retainedParts?:Map<string,Promise<unknown>>;recheckPart?:(generation:string)=>Promise<void>};
const projectedRows=new WeakMap<object,Promise<JsonObject>>();
const facets=['All','Music','Images','Videos','Books','Essays','Moments','Collectibles','Documents'] as const;
const digest=/^[a-f0-9]{64}$/,MAX=32*1024*1024;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const object=(value:unknown):JsonObject=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as JsonObject:{};
const reference=(value:unknown)=>value===null||typeof value==='string'&&digest.test(value);
const count=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
function invalid():never{throw Error('PUBLIC_MATERIAL_PART_INVALID');}
function immutable<T>(input:T):T{if(input&&typeof input==='object'&&!Object.isFrozen(input)){for(const value of Object.values(input))immutable(value);Object.freeze(input);}return input;}
function rootValue(material:string,generation:string):PreparedPublicMaterialReferences{
 if(!digest.test(generation)||Buffer.byteLength(material)>MAX||hash(material)!==generation)throw Error('PUBLIC_MATERIAL_ROOT_INTEGRITY');
 let raw:unknown;try{raw=JSON.parse(material);}catch{invalid();}const value=object(raw),membership=object(value.membership),snapshot=object(value.snapshot),prepared=object(value.marketPrepared),history=object(value.history);
 if(value.schema!=='bank.public-market.render-material.refs.v1'||value.publicDisplayPolicy!=='bank.public-market.curated-display.v3'||typeof value.selectionKey!=='string'||!value.selectionKey||value.selectionKey.length>4096||!count(membership.count)||!count(snapshot.count)||!count(value.sportsCount)||!reference(membership.byOwner)||!facets.every(key=>{const entry=object(object(membership.byFacet)[key]);return reference(entry.root)&&count(entry.count)&&(entry.count===0?entry.root===null:!!entry.root);})||!digest.test(String(membership.metadata))||!digest.test(String(snapshot.metadata))||!['byId','byOrder','headsByOwner'].every(key=>reference(membership[key]))||!reference(snapshot.byId)||!reference(value.sports)||!reference(value.capitalization)||!reference(value.preparedLedger)||!digest.test(String(history.header))||prepared.schema!=='bank.public-market.prepared.v1'||!count(prepared.asOfPulse)||Number(prepared.asOfPulse)>1e10||membership.count===0&&(membership.byId!==null||membership.byOrder!==null)||Number(membership.count)>0&&(!membership.byId||!membership.byOrder))invalid();
 return immutable(raw as PreparedPublicMaterialReferences);
}

/** Background display reader only. The supplied port is the existing Source
 * transport after selected-root/descendant eligibility; digest checks below
 * establish byte integrity, never public permission or financial authority.
 * Unrequested Original/history bodies are neither loaded nor reconstructed. */
export function createPublicMaterialWindowReader({material,generation,readPart,retainedParts,recheckPart}:Input){
 const root=rootValue(material,generation),parts=retainedParts??new Map<string,Promise<unknown>>(),windows=new Map<string,Promise<PublicMaterialWindow>>(),usedParts=new Set<string>();
 function load(id:string,selectedText?:string):Promise<unknown>{
  if(!digest.test(id))invalid();usedParts.add(id);const held=parts.get(id);if(held)return held;
  const job=(async()=>{const text=selectedText??await readPart(id);if(Buffer.byteLength(text)>MAX)invalid();if(hash(text)!==id)throw Error('PUBLIC_MATERIAL_PART_INTEGRITY');let value:unknown;try{value=JSON.parse(text);}catch{invalid();}return immutable(value);})();parts.set(id,job);void job.catch(()=>{if(parts.get(id)===job)parts.delete(id);});return job;
 }
 async function node(id:string):Promise<PublicMaterialIndexNode>{
  const value=object(await load(id)),entry=object(value.entry);
  if(Object.keys(value).sort().join(',')!=='count,digestNames,entry,height,left,right'||!reference(value.left)||!reference(value.right)||!count(value.count)||value.count<1||!count(value.height)||value.height<1||value.height>64||value.digestNames!==false||entry.directory!==false||entry.references!==1||typeof entry.name!=='string'||entry.name.length>8192)invalid();
  return value as unknown as PublicMaterialIndexNode;
 }
 function pair(value:PublicMaterialIndexNode):[string,string]{let row:unknown;try{row=JSON.parse(value.entry.name);}catch{invalid();}if(!Array.isArray(row)||row.length!==2||row.some(value=>typeof value!=='string'||!value||value.length>4096))invalid();return row as [string,string];}
 async function get(index:string|null,key:string){let id=index;const seen=new Set<string>();while(id){if(seen.has(id)||seen.size>=64)invalid();seen.add(id);const value=await node(id),[own,result]=pair(value);if(own===key)return result;id=key<own?value.left:value.right;}return null;}
 async function membershipRow(id:string):Promise<JsonObject>{const raw=object(await load(id));let row=raw;
    if(raw.schema==='bank.public-market.curated-row.refs.v1'){const originalGeneration=raw.originalGeneration;if(typeof originalGeneration!=='string'||!digest.test(originalGeneration))invalid();usedParts.add(originalGeneration);let projected=projectedRows.get(raw);if(!projected){projected=(async()=>{const fields=object(raw.fields);if(Object.hasOwn(fields,'profileOriginal'))invalid();const body=await load(originalGeneration);if(body===null||typeof body!=='object'||Array.isArray(body))invalid();const original=object(body),omit=raw.originalOmit;if(omit!==undefined&&(!Array.isArray(omit)||omit.some(key=>typeof key!=='string')||new Set(omit).size!==omit.length))invalid();const base={...original};for(const key of omit??[])delete base[key];const profileOriginal={...base,...object(raw.originalOverlay)};const recipe=object(raw.summaryRecipe);return immutable({...fields,profileOriginal,...(recipe.kind==='normalized-claim'&&typeof original.claim==='string'&&typeof recipe.creatorNote==='string'?{summary:(original.claim.replace(/\s+/g,' ').trim()+recipe.creatorNote).trim()}:{})});})();projectedRows.set(raw,projected);void projected.catch(()=>{if(projectedRows.get(raw)===projected)projectedRows.delete(raw);});}row=await projected;}return row;}

 async function window(options:{limit?:number;cursor?:PublicMaterialWindowCursor;facet?:PublicMaterialFacet;ownerUserId?:string}={}):Promise<PublicMaterialWindow>{
  const limit=options.limit??50,cursor=options.cursor,after=cursor?.after??null,facet=options.facet??'All',owner=options.ownerUserId;
  if(!facets.includes(facet)||owner!==undefined&&(typeof owner!=='string'||!owner||owner.length>256)||owner!==undefined&&facet!=='All')invalid();
  let selection:PublicMaterialIndex=root.membership.byFacet[facet];
  if(owner!==undefined){const id=await get(root.membership.byOwner,owner);if(!id)selection={root:null,count:0};else{if(!digest.test(id))invalid();const value=object(await load(id));if(!reference(value.root)||!count(value.count))invalid();selection=value as unknown as PublicMaterialIndex;}}
  if(!Number.isSafeInteger(limit)||limit<1||limit>512||after!==null&&(typeof after!=='string'||!after||after.length>4096)||cursor&&(cursor.rootGeneration!==generation||cursor.orderRoot!==selection.root))throw Error('PUBLIC_MATERIAL_CURSOR_INVALID');
  const key=JSON.stringify([limit,after,facet,owner]),held=windows.get(key);if(held)return held;
  const job=(async()=>{
   const [rawMetadata,rawSnapshot]=await Promise.all([load(root.membership.metadata),load(root.snapshot.metadata)]),metadata=object(rawMetadata),transport=object(metadata.transport),snapshot=object(rawSnapshot),data=object(snapshot.data);
   if(metadata.ok!==true||snapshot.ok!==true||Array.isArray(transport.publicOriginals)||Array.isArray(transport.publicProfileHeads)||Array.isArray(data.liveMarkets)||data.schema!=='receiz.market.public-snapshot.v1')invalid();
   const expected=object(transport.publicMembership);if(expected.version!==1||expected.source!=='canonical-complete'||expected.scope!=='whole-market-visible-showcase'||expected.isComplete!==true||expected.itemCount!==root.membership.count)invalid();
   if(root.membership.byOrder&&(await node(root.membership.byOrder)).count!==root.membership.count||root.membership.byId&&(await node(root.membership.byId)).count!==root.membership.count||root.snapshot.byId&&(await node(root.snapshot.byId)).count!==root.snapshot.count)invalid();
   const selected:[string,string][]=[],path=new Set<string>();
   async function visit(id:string|null,low:string|null,high:string|null):Promise<void>{
    if(!id||selected.length>=limit+1)return;if(path.has(id)||path.size>=64)invalid();path.add(id);
    const value=await node(id),[key,body]=pair(value);if(low!==null&&key<=low||high!==null&&key>=high)invalid();
    if(after===null||key>after){await visit(value.left,low,key);if(selected.length<limit+1)selected.push([key,body]);}
    if(selected.length<limit+1)await visit(value.right,key,high);path.delete(id);
   }
   if(selection.root&&(await node(selection.root)).count!==selection.count)invalid();
   await visit(selection.root,null,null);const more=selected.length>limit,rows:JsonObject[]=[],quotes:JsonObject[]=[],heads=new Map<string,unknown>(),logical=new Set<string>();
   for(const [position,id]of selected.slice(0,limit)){
    if(!digest.test(id))invalid();const row=await membershipRow(id);
    const uid=row.ownerUserId,asset=row.receizId;
    if(typeof row.id!=='string'||!row.id||typeof uid!=='string'||!uid||typeof asset!=='string'||!asset)invalid();const key=JSON.stringify([uid,asset]);if(logical.has(key))invalid();logical.add(key);
    const indexed=await get(root.membership.byId,key);let locator:JsonObject;try{locator=object(JSON.parse(indexed??'null'));}catch{invalid();}if(locator.generation!==id||locator.position!==position||facet!=='All'&&(!Array.isArray(locator.facets)||!locator.facets.includes(facet))||owner!==undefined&&uid!==owner)invalid();
    const quote=await get(root.snapshot.byId,key);if(quote){const observation=object(await load(quote));if(observation.itemId!==row.id||observation.visibility!=='public')invalid();quotes.push(observation);}
    if(root.membership.headsByOwner&&!heads.has(uid)){const selected=await get(root.membership.headsByOwner,uid);if(!selected)invalid();const head=curatePublicProfileHead(await load(selected));if(!head||head.profile.userId!==uid)invalid();heads.set(uid,head);}
    rows.push(row);
   }
   return immutable({complete:false,sourceCount:root.membership.count+root.sportsCount,proofCount:root.membership.count,sportsCount:root.sportsCount,filteredCount:selection.count,membership:{...metadata,ok:true,transport:{...transport,publicMembership:{...expected,isComplete:false},publicOriginals:rows,publicProfileHeads:[...heads.values()]}},snapshot:{...snapshot,ok:true,data:{...data,liveMarkets:quotes}},nextCursor:more?{rootGeneration:generation,orderRoot:selection.root,after:selected[limit-1][0]}:null} satisfies PublicMaterialWindow);
  })();windows.set(key,job);void job.catch(()=>{if(windows.get(key)===job)windows.delete(key);});return job;
 }
 async function indexEntries(index:PublicMaterialIndex):Promise<readonly [string,string][]>{
  if(!reference(index.root)||!count(index.count)||(index.count===0)!==(index.root===null))invalid();
  const values:[string,string][]=[],seen=new Set<string>();
  async function visit(id:string|null,low:string|null,high:string|null):Promise<void>{if(!id)return;if(seen.has(id))invalid();seen.add(id);const value=await node(id),[key,body]=pair(value);if(low!==null&&key<=low||high!==null&&key>=high)invalid();await visit(value.left,low,key);values.push([key,body]);await visit(value.right,key,high);}
  if(index.root&&(await node(index.root)).count!==index.count)invalid();await visit(index.root,null,null);if(values.length!==index.count)invalid();return immutable(values);
 }
 async function indexValues(index:PublicMaterialIndex):Promise<readonly unknown[]>{return Promise.all((await indexEntries(index)).map(([,id])=>load(id)));}
 async function profileHeads():Promise<readonly unknown[]>{
  const rootId=root.membership.headsByOwner;if(!rootId)return [];
  const selected=await node(rootId),values=await indexEntries({root:rootId,count:selected.count}),heads:unknown[]=[];
  for(const [uid,id]of values){const head=curatePublicProfileHead(await load(id));if(!head||head.profile.userId!==uid)invalid();heads.push(head);}
  return immutable(heads);
 }
 return Object.freeze({root,generation,window,profileHeads,readPart:load,readSelectedPart:async(id:string)=>{if(recheckPart&&parts.has(id)){await recheckPart(id);return load(id);}return load(id,await readPart(id));},membershipRow,indexEntries,indexValues,usesPart:(id:string)=>usedParts.has(id),releaseUnusedParts:(retainedByAnotherReader:(id:string)=>boolean)=>{for(const id of usedParts)if(!retainedByAnotherReader(id))parts.delete(id);}});
}
