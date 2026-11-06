import {curatePublicProfileHead} from '../src/receiz/public-profile-header.js';
import type {createPublicMaterialWindowReader} from './public-material-window.js';
type Reader=ReturnType<typeof createPublicMaterialWindowReader>;
type Row=Record<string,unknown>;
const hex=/^[a-f0-9]{64}$/;
const object=(value:unknown):Row=>value&&typeof value==='object'&&!Array.isArray(value)?value as Row:{};
function invalid():never{throw Error('PUBLIC_MATERIAL_BASELINE_INVALID');}
function logical(row:Row){if(typeof row.id!=='string'||!row.id||typeof row.ownerUserId!=='string'||!row.ownerUserId||typeof row.receizId!=='string'||!row.receizId)invalid();return JSON.stringify([row.ownerUserId,row.receizId]);}
function json(value:string):unknown{try{return JSON.parse(value);}catch{invalid();}}
/** Reuse the already retained complete public display representation. Source
 * selects its baseline role again for every candidate, even if parsed locally.
 * The baseline is transport only; the exact current overlays establish which
 * rows, observations and owner headers enter this selected display. */
export async function readPublicReferenceBaseline(reader:Reader):Promise<{rows:Row[];quotes:Row[];heads:Map<string,unknown>}|null>{
 const {membership,snapshot}=reader.root,baseline=membership.baseline as (NonNullable<typeof membership.baseline>&{positionsGeneration?:string})|undefined;
 if(!baseline||!snapshot.baseline||!baseline.positionsGeneration)return null;
 let original:Row,observations:Row;
 try{original=object(await reader.readSelectedPart(baseline.generation));observations=object(await reader.readSelectedPart(snapshot.baseline.generation));}catch(error){if(error instanceof Error&&error.message==='PUBLIC_MATERIAL_UNAVAILABLE')return null;throw error;}
 const transport=object(original.transport),meta=object(transport.publicMembership),data=object(observations.data),positions=await reader.readPart(baseline.positionsGeneration);
 if(original.ok!==true||observations.ok!==true||meta.version!==1||meta.source!=='canonical-complete'||meta.scope!=='whole-market-visible-showcase'||meta.isComplete!==true||meta.itemCount!==baseline.count||!Array.isArray(transport.publicOriginals)||transport.publicOriginals.length!==baseline.count||!Array.isArray(positions)||positions.length!==baseline.count||data.schema!=='receiz.market.public-snapshot.v1'||!Array.isArray(data.liveMarkets))invalid();
 const ordered=new Map<string,{row:Row;position:string}>(),byId=new Map<string,string>(),order=new Map<string,string>();
 for(const entry of positions){if(!Array.isArray(entry)||entry.length!==2||entry.some(value=>typeof value!=='string'||!value)||order.has(entry[0]))invalid();order.set(entry[0],entry[1]);}
 for(const value of transport.publicOriginals){const row=object(value),key=logical(row),position=order.get(key);if(!position||ordered.has(key)||byId.has(String(row.id)))invalid();ordered.set(key,{row,position});byId.set(String(row.id),key);}
 const quotes=new Map<string,Row>(),heads=new Map<string,unknown>();
 for(const value of data.liveMarkets){const quote=object(value),key=byId.get(String(quote.itemId));if(key){if(quote.visibility!=='public'||quotes.has(key))invalid();quotes.set(key,quote);}}
 if(transport.publicProfileHeads!==undefined&&!Array.isArray(transport.publicProfileHeads))invalid();for(const raw of transport.publicProfileHeads??[]){const head=curatePublicProfileHead(raw);if(!head||heads.has(String(head.profile.userId)))invalid();heads.set(String(head.profile.userId),raw);}
 if(membership.baselineChanges)for(const [key,encoded]of await reader.indexEntries(membership.baselineChanges)){const locator=json(encoded);if(locator===null){ordered.delete(key);quotes.delete(key);continue;}const value=object(locator);if(typeof value.generation!=='string'||!hex.test(value.generation)||typeof value.position!=='string'||!value.position)invalid();const row=await reader.membershipRow(value.generation);if(logical(row)!==key)invalid();ordered.set(key,{row,position:value.position});}
 if(snapshot.baselineChanges)for(const [key,encoded]of await reader.indexEntries(snapshot.baselineChanges)){const generation=json(encoded);if(generation===null){quotes.delete(key);continue;}if(typeof generation!=='string'||!hex.test(generation))invalid();const quote=object(await reader.readPart(generation)),row=ordered.get(key)?.row;if(!row||quote.itemId!==row.id||quote.visibility!=='public')invalid();quotes.set(key,quote);}
 if(membership.headsBaselineChanges)for(const [uid,encoded]of await reader.indexEntries(membership.headsBaselineChanges)){const generation=json(encoded);if(generation===null){heads.delete(uid);continue;}if(typeof generation!=='string'||!hex.test(generation))invalid();const raw=await reader.readPart(generation),head=curatePublicProfileHead(raw);if(!head||head.profile.userId!==uid)invalid();heads.set(uid,raw);}
 const current=[...ordered.values()].sort((a,b)=>a.position<b.position?-1:a.position>b.position?1:0),seen=new Set<string>();if(current.length!==membership.count||quotes.size!==snapshot.count)invalid();for(const {position}of current){if(seen.has(position))invalid();seen.add(position);}
 const uids=new Set(current.map(({row})=>String(row.ownerUserId)));return{rows:current.map(({row})=>row),quotes:[...quotes.values()],heads:new Map([...heads].filter(([uid])=>uids.has(uid)))};
}
