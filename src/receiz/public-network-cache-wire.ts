import type {PublicNetworkCache} from './public-network-cache';

/** The existing public Ledger seed format carries repeated public identity
 * context once. Packing changes only display delivery, never its records. */
const contextKeys=new Set(['sourceObservedAt','chakraDay','actionScope','actorUserId','subjectUserId','actorKaiSignature','subjectKaiSignature','actorCreatedAt','subjectCreatedAt','actorPulse','subjectPulse','actorChakraDay','subjectChakraDay','actor','subject','sender','recipient','owner','creator','fromActor','toActor','previousOwner','newOwner','fundingCohorts']);
function fieldsFor(row:PublicNetworkCache['records'][number]){const details=row.details??{};for(const key of ['fundingCohorts','causalLineage'])if(details[key]&&JSON.stringify(details[key]).length>1024)return {[key]:details[key]};return Object.fromEntries(Object.entries(details).filter(([key])=>contextKeys.has(key)));}
export function publicNetworkCacheWire(cache:PublicNetworkCache){
 const selected=cache.records.map(row=>{
  if(row.authority!=='public-source-projection'||row.origin!==undefined)throw Error('PUBLIC_LEDGER_CACHE_PRIVATE_SOURCE');
  return {id:row.id,sourceId:row.sourceId,source:row.source,kind:row.kind,title:row.title,detail:row.detail,time:row.time,actor:row.actor,amountUsdCents:row.amountUsdCents,kaiUpulse:row.kaiUpulse,pulse:row.pulse,sourceUrl:row.sourceUrl,sender:row.sender,recipient:row.recipient,evidence:row.evidence,valueOperands:row.valueOperands,details:row.details,authority:row.authority};
 });
 const contexts=new Map<string,{fields:Record<string,unknown>;count:number;index:number}>();
 for(const row of selected){const fields=fieldsFor(row),key=JSON.stringify(fields),prior=contexts.get(key);if(prior)prior.count++;else contexts.set(key,{fields,count:1,index:-1});}
 const detailContexts:Record<string,unknown>[]=[];for(const context of contexts.values())if(context.count>1&&Object.keys(context.fields).length){context.index=detailContexts.length;detailContexts.push(context.fields);}
 const records=selected.map(row=>{const common=fieldsFor(row),context=contexts.get(JSON.stringify(common)),packed=context&&context.index>=0?{...row,details:Object.fromEntries(Object.entries(row.details??{}).filter(([key])=>!(key in common))),detailsRef:context.index}:row;return Object.fromEntries(Object.entries(packed).filter(([key,value])=>value!==null&&!(key==='valueOperands'&&Object.keys(value??{}).length===0)));});
 return {schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',inspectionVersion:cache.inspectionVersion,capturedAt:cache.capturedAt,records,detailContexts,coverage:cache.coverage};
}
