import {prepareSelectedPublicReferenceCatalog} from './public-reference-state';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {renderToString} from 'react-dom/server';
import {parsePublicMarket} from '../src/receiz/public-market';
import {mergePublicRecords,publicMarketRecord} from '../src/receiz/public-network';
import {parsePublicNetworkCache,type PublicNetworkCache} from '../src/receiz/public-network-cache';
import {publicLedgerDocumentSeedScript,type PublicLedgerDocumentSeed,type PublicLedgerCompressedSnapshot} from '../src/receiz/public-ledger-document-seed';
import {publicNetworkCacheWire} from '../src/receiz/public-network-cache-wire';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
import {alignPreparedPublicNavigation} from './prepared-public-navigation';
import {PublicFeed} from '../src/public-feed/PublicFeed';
import {Discover} from '../src/public-discover/Discover';
import {feedSequenceItems,orderFeedItems} from '../src/public-feed/feed-items';
import {orderDiscoveryItems} from '../src/public-discover/discovery-index';
import {publicMarketDocumentSeedScript} from '../src/receiz/public-market-document-seed';
type Input={material:string;generation:string;path:string;template:string;renderBuild?:string};
type Prepared={snapshot:PublicNetworkCache;packets:readonly PublicLedgerCompressedSnapshot[]};
const prepared=new Map<string,Promise<Prepared>>(),history=new Map<string,{snapshot:PublicNetworkCache;packet:PublicLedgerCompressedSnapshot}>();
const discoveryCatalogs=new Map<string,{catalog:ReturnType<typeof parsePublicMarket>;asOfPulse:number}>();
async function discoveryCatalog(material:string,generation:string){
 const cached=discoveryCatalogs.get(generation);if(cached)return cached;
 const input=JSON.parse(material);if(input.schema==='bank.public-market.render-material.refs.v1'){const {catalog,asOfPulse}=await prepareSelectedPublicReferenceCatalog({material,generation},false);const value={catalog,asOfPulse};discoveryCatalogs.set(generation,value);return value;}const catalog=parsePublicMarket(input.membership,input.snapshot),asOfPulse=input.marketPrepared?.asOfPulse;
 if(!catalog.complete||catalog.items.length>10000||input.marketPrepared?.schema!=='bank.public-market.prepared.v1'||!Number.isSafeInteger(asOfPulse)||asOfPulse<0||asOfPulse>1e10)throw Error('PUBLIC_DISCOVERY_COMPLETE_CATALOG_REQUIRED');
 const value={catalog,asOfPulse};discoveryCatalogs.set(generation,value);while(discoveryCatalogs.size>2)discoveryCatalogs.delete(discoveryCatalogs.keys().next().value!);return value;
}
function packed(snapshot:PublicNetworkCache):PublicLedgerCompressedSnapshot{const wire=Buffer.from(JSON.stringify(publicNetworkCacheWire(snapshot)));if(wire.length>64*1024*1024)throw Error('PUBLIC_LEDGER_DOCUMENT_CAPACITY');const compressed=gzipSync(wire,{level:6});if(compressed.length>12*1024*1024)throw Error('PUBLIC_LEDGER_DOCUMENT_CAPACITY');return {gzipB64u:compressed.toString('base64url'),bytes:wire.length};}

/** These are already public display records. Neither this projection nor its
 * digest issues proof, custody, funding or a new financial event. */
function publicSnapshot(input:unknown):PublicNetworkCache{
 const value=parsePublicNetworkCache(input);
 if(value.records.some(row=>row.origin!==undefined))throw Error('PUBLIC_LEDGER_CACHE_PRIVATE_SOURCE');
 return {...value,records:value.records.map(row=>({id:row.id,sourceId:row.sourceId,source:row.source,kind:row.kind,title:row.title,detail:row.detail,time:row.time,actor:row.actor,amountUsdCents:row.amountUsdCents,kaiUpulse:row.kaiUpulse,pulse:row.pulse,sourceUrl:row.sourceUrl,sender:typeof row.sender==='string'?row.sender.slice(0,128):null,recipient:typeof row.recipient==='string'?row.recipient.slice(0,128):null,evidence:row.evidence,valueOperands:row.valueOperands,details:row.details,authority:'public-source-projection' as const}))};
}
function retainedLedger(input:Record<string,unknown>):PublicNetworkCache{
 if(input.preparedLedger&&typeof input.preparedLedger==='object'){input=input.preparedLedger as Record<string,unknown>;if(input.schema!=='bank.public-ledger.preparation.v1'||input.financialOnly!==true)throw Error('PUBLIC_LEDGER_PREPARED_HISTORY_REQUIRED');}
 if(input.ledgerCache!==undefined)return publicSnapshot(input.ledgerCache);
 if(typeof input.ledgerCacheGzipB64u!=='string'||input.ledgerCacheGzipB64u.length>Math.ceil(12*1024*1024*4/3)||!/^[A-Za-z0-9_-]+$/.test(input.ledgerCacheGzipB64u))throw Error('PUBLIC_LEDGER_PREPARED_HISTORY_REQUIRED');
 const bytes=Buffer.from(input.ledgerCacheGzipB64u,'base64url');if(bytes.toString('base64url')!==input.ledgerCacheGzipB64u)throw Error('PUBLIC_LEDGER_PREPARED_HISTORY_INVALID');
 return publicSnapshot(JSON.parse(gunzipSync(bytes,{maxOutputLength:64*1024*1024}).toString('utf8')));
}
function retainedFinancialHistory(input:Record<string,unknown>){
 if(input.preparedLedger&&typeof input.preparedLedger==='object'){input=input.preparedLedger as Record<string,unknown>;if(input.schema!=='bank.public-ledger.preparation.v1'||input.financialOnly!==true)throw Error('PUBLIC_LEDGER_PREPARED_HISTORY_REQUIRED');}
 const key=typeof input.ledgerCacheGzipB64u==='string'?input.ledgerCacheGzipB64u:null,cached=key?history.get(key):null;if(cached)return cached;
 const retained=retainedLedger(input),snapshot={...retained,records:retained.records.filter(row=>row.source!=='proofs'),coverage:retained.coverage.filter(row=>row.source!=='proofs')},value={snapshot,packet:packed(snapshot)};
 if(key){history.set(key,value);while(history.size>2)history.delete(history.keys().next().value!);}return value;
}
function prepare(material:string,generation:string):Promise<Prepared>{
 const cached=prepared.get(generation);if(cached)return cached;
 const job=Promise.resolve().then(async()=>{
  const input=JSON.parse(material),references=input.schema==='bank.public-market.render-material.refs.v1'?await prepareSelectedPublicReferenceCatalog({material,generation},false):null,ledger=references?.reader.root.preparedLedger?await references.reader.readPart(references.reader.root.preparedLedger):null,retained=retainedFinancialHistory(ledger?{preparedLedger:ledger}:input),catalog=references?.catalog??parsePublicMarket(input.membership,input.snapshot);if(!catalog.complete)throw Error('PUBLIC_LEDGER_COMPLETE_MEMBERSHIP_REQUIRED');
  const proofs=catalog.items.map(publicMarketRecord),observedAt=Date.parse(catalog.observedAt??''),proofSnapshot:PublicNetworkCache={records:proofs,capturedAt:catalog.observedAt??retained.snapshot.capturedAt,inspectionVersion:retained.snapshot.inspectionVersion,coverage:[{source:'proofs',complete:true,anchorIds:proofs.map(row=>row.id),...(Number.isFinite(observedAt)?{observedAt}:{})}]},capturedAt=[retained.snapshot.capturedAt,proofSnapshot.capturedAt].filter((time):time is string=>time!==null).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]??null,snapshot={...proofSnapshot,capturedAt,records:mergePublicRecords(retained.snapshot.records,proofs),coverage:[...retained.snapshot.coverage,...proofSnapshot.coverage]},packets=[retained.packet,packed(proofSnapshot)];
  if(packets.reduce((total,packet)=>total+packet.bytes,0)>64*1024*1024||packets.reduce((total,packet)=>total+packet.gzipB64u.length,0)>Math.ceil(12*1024*1024*4/3))throw Error('PUBLIC_LEDGER_DOCUMENT_CAPACITY');return {snapshot,packets};
 });prepared.set(generation,job);while(prepared.size>2)prepared.delete(prepared.keys().next().value!);void job.catch(()=>{if(prepared.get(generation)===job)prepared.delete(generation);});return job;
}
// Build output reuses the exact cached display snapshot and compressed packets.
export {prepare as preparePublicLedgerDocumentState};

/** Background-only rendering from the retained public ledger and the current
 * complete public membership. Existing transaction history is retained; only
 * the public proof projection is replaced by its accepted current cohort. */
export async function renderPreparedDependentDocument({material,generation,path,template,renderBuild}:Input):Promise<string>{
 if(!['ledger','ledger/proofs','feed','discover'].includes(path))throw Error('PUBLIC_DEPENDENT_RENDER_PATH_UNSUPPORTED');
 if(Buffer.byteLength(material)>32*1024*1024||!/^[a-f0-9]{64}$/.test(generation)||createHash('sha256').update(material).digest('hex')!==generation)throw Error('PUBLIC_DEPENDENT_RENDER_INPUT_INVALID');
 if(path==='feed'||path==='discover'){
  const {catalog,asOfPulse}=await discoveryCatalog(material,generation);
  const ordered=path==='feed'?orderFeedItems(feedSequenceItems(catalog.items)):orderDiscoveryItems(catalog.items),visibleCount=Math.min(path==='feed'?8:12,ordered.length),seed=ordered.slice(0,visibleCount),format=new Intl.DateTimeFormat().resolvedOptions();
  const content=renderToString(path==='feed'?<PublicFeed seed={seed} active={false} completeCatalog/>:<Discover seed={seed} active={false}/>,{identifierPrefix:path==='feed'?'public-feed-':'public-discover-'});
  const legacySeed=path==='discover'?`<script id="public-discovery-seed" type="application/json">${JSON.stringify(seed).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026')}</script>`:'';
  const script=publicMarketDocumentSeedScript({schema:'bank.public-market.document.v1',generation,path,catalog,visibleCount,asOfPulse,format:{locale:format.locale,timeZone:format.timeZone}});
  // Feed keeps its existing complete cohort reader. Passive Discover retains
  // the producer's full source-bound seed beside the legacy 12-item hydration seed.
  const clean=template.replace(/<script id="public-(?:feed|discovery)-seed" type="application\/json">[\s\S]*?<\/script>/g,'');let replaced=false;
  let html=clean.replace(new RegExp(`(<div id="public-${path}-root"[^>]*>)[\\s\\S]*?(<\\/div>\\s*(?:<noscript>[\\s\\S]*?<\\/noscript>\\s*)?<script id="receiz-navigation")`),(_all,start,end)=>{replaced=true;return start+content+(path==='feed'?script:'')+end;});
  if(!replaced)throw Error('PUBLIC_DISCOVERY_PREPARED_TEMPLATE_INVALID');
  if(path==='discover')html=html.replace('<script id="receiz-navigation"',()=>legacySeed+script+'<script id="receiz-navigation"');
  return alignPreparedPublicNavigation(html,path,content+legacySeed,generation,renderBuild);
 }
 const {snapshot,packets}=await prepare(material,generation);
 const format=new Intl.DateTimeFormat().resolvedOptions(),seed:PublicLedgerDocumentSeed={schema:'bank.public-ledger.document.v1',generation,path:path as PublicLedgerDocumentSeed['path'],locale:format.locale,timeZone:format.timeZone,snapshot};
 const content=renderToString(<div><PublicLedgerApp active={false} initialSnapshot={snapshot} initialHref={'https://bankeiz.com/'+path+'/'} initialFilter={path==='ledger/proofs'?'proofs':'all'} initialFormat={format}/></div>,{identifierPrefix:'public-ledger-'}),script=publicLedgerDocumentSeedScript(seed,packets);
 let replaced=false;
 const clean=template.replace(/<script id="public-ledger-document-seed" type="application\/json">[\s\S]*?<\/script>/g,'');
 const html=clean.replace(/(<div id="public-ledger-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_all,start,end)=>{replaced=true;return start+content+end;});
 if(!replaced)throw Error('PUBLIC_LEDGER_PREPARED_TEMPLATE_INVALID');
 const aligned=alignPreparedPublicNavigation(html,path,content,generation,renderBuild);
 return aligned.replace('<script id="receiz-navigation"',()=>script+'<script id="receiz-navigation"');
}
