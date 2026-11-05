import {readFile} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {mergePublicRecords,parsePublicNetworkPage,type PublicRecord,type PublicSource} from '../src/receiz/public-network.js';
import {parsePublicNetworkCache,type PublicNetworkCache} from '../src/receiz/public-network-cache.js';
import {publicNetworkCacheWire} from '../src/receiz/public-network-cache-wire.js';
import {readSharedPublicSource} from './public-network.js';

export type PublicLedgerHeads=Readonly<{
 actions:Readonly<{count:string;lastSeq:string;entryHash?:string|null}>;
 wallet:Readonly<{count:string;lastKaiUpulse:string|null}>;
 graph?:Readonly<{revision:string;count:string}>;
}>;
export type PreparedPublicLedgerDisplay=Readonly<{
 schema:'bank.public-ledger.preparation.v1';financialOnly:true;ledgerCacheGzipB64u:string;heads:PublicLedgerHeads;
 diagnostics:Readonly<{recordCount:number;counts:Record<string,number>;pages:Record<string,number>;added:Record<string,number>;withdrawnGraphRows:number;historicalRowsRemoved:0;capturedAt:string|null}>;
}>;
type Input=Readonly<{previous?:PreparedPublicLedgerDisplay;currentHeads?:PublicLedgerHeads;retainedGzipB64u?:string;read?:(source:PublicSource,cursor?:string)=>Promise<unknown>;now?:()=>string}>;
const MAX_RAW=64*1024*1024,MAX_GZIP=12*1024*1024;
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const digits=(value:unknown)=>typeof value==='string'&&/^(0|[1-9]\d{0,29})$/.test(value)?value:typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?String(value):null;
function validateHeads(heads:PublicLedgerHeads):void{
 if(!heads||digits(heads.actions?.count)===null||digits(heads.actions?.lastSeq)===null||digits(heads.wallet?.count)===null||heads.wallet.lastKaiUpulse!==null&&digits(heads.wallet.lastKaiUpulse)===null||heads.graph&&(typeof heads.graph.revision!=='string'||!heads.graph.revision||digits(heads.graph.count)===null))throw Error('PUBLIC_LEDGER_HEAD_REQUIRED');
}
function unpack(gzipB64u:string):PublicNetworkCache{
 if(!gzipB64u||gzipB64u.length>Math.ceil(MAX_GZIP*4/3)||!/^[A-Za-z0-9_-]+$/.test(gzipB64u))throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');
 const bytes=Buffer.from(gzipB64u,'base64url');if(bytes.toString('base64url')!==gzipB64u||bytes.length>MAX_GZIP)throw Error('PUBLIC_LEDGER_CACHE_INVALID');
 const cache=parsePublicNetworkCache(JSON.parse(gunzipSync(bytes,{maxOutputLength:MAX_RAW}).toString('utf8')));if(cache.records.some(row=>row.origin!==undefined))throw Error('PUBLIC_LEDGER_CACHE_PRIVATE_SOURCE');return cache;
}
function bounded(value:unknown,limit=MAX_RAW):void{if(Buffer.byteLength(JSON.stringify(value))>limit)throw Error('PUBLIC_LEDGER_PREPARATION_CAPACITY');}
/** Extend public display history through the existing SDK readers and held-ID
 * anchors. No Source, proof, identity or financial admission occurs here. The
 * saved public prefix survives; only unseen rows are read and merged. */
export async function preparePublicLedgerDisplay(input:Input={}):Promise<PreparedPublicLedgerDisplay>{
 if(input.currentHeads)validateHeads(input.currentHeads);
 if(input.previous){
  if(input.previous.schema!=='bank.public-ledger.preparation.v1'||input.previous.financialOnly!==true)throw Error('PUBLIC_LEDGER_PREPARED_REQUIRED');validateHeads(input.previous.heads);
  if(input.currentHeads&&JSON.stringify(input.currentHeads)===JSON.stringify(input.previous.heads))return input.previous;
 }
 const encoded=input.previous?.ledgerCacheGzipB64u??input.retainedGzipB64u??(await readFile('public/receiz-public-ledger.json.gz.bin')).toString('base64url'),retained=unpack(encoded),base=retained.records.filter(row=>row.source!=='proofs'),read=input.read??((source:PublicSource,cursor?:string)=>readSharedPublicSource(source,cursor,undefined,{fresh:true})),now=input.now??(()=>new Date().toISOString());
 const pages:Record<string,number>={actions:0,wallet:0,graph:0},added:Record<string,number>={actions:0,wallet:0,graph:0};
 async function extend(source:'actions'|'wallet'){
  const prior=base.filter(row=>row.source===source),known=new Set(prior.map(row=>row.id)),represented=new Set(known),visited=new Set<string>(),incoming:PublicRecord[]=[];let cursor:string|undefined,first:Record<string,unknown>|undefined,complete=false;
  for(let count=0;count<512;count++){
   const raw=await read(source,cursor);bounded(raw);first??=object(raw);pages[source]++;const page=parsePublicNetworkPage(source,raw);incoming.push(...page.records);if(incoming.length>100000)throw Error('PUBLIC_LEDGER_PREPARATION_CAPACITY');
   const reached=page.records.some(row=>known.has(row.id));for(const row of page.records)represented.add(row.id);
   // A legacy seed's complete flag cannot hide a newly exposed/backfilled
   // source family behind an older held row. Reconcile the public rollup too.
   const rollup=object(first.rollup),expected=digits(source==='wallet'?rollup.totalLedgerEntries??rollup.count:rollup.count),covered=expected!==null&&BigInt(represented.size)>=BigInt(expected);
   if(page.complete||reached&&covered&&retained.coverage.some(item=>item.source===source&&item.complete)){complete=true;break;}
   if(!page.nextCursor||visited.has(page.nextCursor)||page.nextCursor===cursor)throw Error('PUBLIC_LEDGER_PREPARATION_CURSOR');visited.add(page.nextCursor);cursor=page.nextCursor;
  }
  if(!complete||!first)throw Error('PUBLIC_LEDGER_PREPARATION_INCOMPLETE');
  const records=mergePublicRecords(prior,incoming);added[source]=records.length-prior.length;return {records,first};
 }
 const [actions,wallet,graphRaw]=await Promise.all([extend('actions'),extend('wallet'),read('graph')]);bounded(graphRaw);pages.graph=1;const graph=parsePublicNetworkPage('graph',graphRaw);if(!graph.complete)throw Error('PUBLIC_LEDGER_GRAPH_INCOMPLETE');
 const graphBefore=base.filter(row=>row.source==='graph'),knownGraphIds=new Set(graphBefore.map(row=>row.id)),graphIds=new Set(graph.records.map(row=>row.id)),withdrawnGraphRows=graphBefore.filter(row=>!graphIds.has(row.id)).length,graphRows=mergePublicRecords(graphBefore.filter(row=>graphIds.has(row.id)),graph.records);added.graph=graphRows.filter(row=>!knownGraphIds.has(row.id)).length;
 const actionRollup=object(actions.first.rollup),walletRollup=object(wallet.first.rollup),firstAction=object((Array.isArray(actions.first.actions)?actions.first.actions:[])[0]);
 const actionCount=digits(actionRollup.count),lastSeq=digits(actionRollup.lastSeq),walletCount=digits(walletRollup.totalLedgerEntries??walletRollup.count),lastKaiUpulse=digits(walletRollup.lastEntryKaiUpulse??walletRollup.lastKaiUpulse);
 if(actionCount===null||lastSeq===null||walletCount===null)throw Error('PUBLIC_LEDGER_HEAD_REQUIRED');
 // Graph values and sort coordinates are evaluated at the live pulse. Those
 // time-derived bytes are not an accepted append or a new cache generation.
 const heads:PublicLedgerHeads={actions:{count:actionCount,lastSeq,...(typeof firstAction.entryHash==='string'?{entryHash:firstAction.entryHash}:{})},wallet:{count:walletCount,lastKaiUpulse},...(input.currentHeads?.graph?{graph:input.currentHeads.graph}:{})};
 if(input.currentHeads&&(BigInt(actionCount)<BigInt(input.currentHeads.actions.count)||BigInt(lastSeq)<BigInt(input.currentHeads.actions.lastSeq)||BigInt(walletCount)<BigInt(input.currentHeads.wallet.count)||input.currentHeads.wallet.lastKaiUpulse!==null&&(lastKaiUpulse===null||BigInt(lastKaiUpulse)<BigInt(input.currentHeads.wallet.lastKaiUpulse))))throw Error('PUBLIC_LEDGER_HEAD_PENDING');
 const records=mergePublicRecords([], [...actions.records,...wallet.records,...graphRows]);if(records.length>100000)throw Error('PUBLIC_LEDGER_PREPARATION_CAPACITY');const capturedAt=now(),snapshot:PublicNetworkCache={records,capturedAt,inspectionVersion:retained.inspectionVersion,coverage:(['actions','wallet','graph'] as const).map(source=>({source,complete:true,observedAt:Date.parse(capturedAt)}))},wire=Buffer.from(JSON.stringify(publicNetworkCacheWire(snapshot)));if(wire.length>MAX_RAW)throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');
 const compressed=gzipSync(wire,{level:6});if(compressed.length>MAX_GZIP)throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');
 return {schema:'bank.public-ledger.preparation.v1',financialOnly:true,ledgerCacheGzipB64u:compressed.toString('base64url'),heads,diagnostics:{recordCount:records.length,counts:Object.fromEntries((['actions','wallet','graph'] as const).map(source=>[source,records.filter(row=>row.source===source).length])),pages,added,withdrawnGraphRows,historicalRowsRemoved:0,capturedAt}};
}
