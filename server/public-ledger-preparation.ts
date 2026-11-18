import {readFile} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {mergePublicRecords,parsePublicNetworkPage,type PublicRecord,type PublicSource} from '../src/receiz/public-network.js';
import {parsePublicNetworkCache,type PublicNetworkCache} from '../src/receiz/public-network-cache.js';
import {publicNetworkCacheWire} from '../src/receiz/public-network-cache-wire.js';
import {readSharedPublicSource} from './public-network.js';

import {isPublicLedgerHeads,sameActionHead,sameWalletHead,type PublicLedgerHeads} from './public-ledger-heads.js';
export type {PublicLedgerHeads} from './public-ledger-heads.js';

export type PreparedPublicLedgerDisplay=Readonly<{
 schema:'bank.public-ledger.preparation.v1';financialOnly:true;ledgerCacheGzipB64u:string;heads:PublicLedgerHeads;
 diagnostics:Readonly<{recordCount:number;counts:Record<string,number>;pages:Record<string,number>;added:Record<string,number>;withdrawnGraphRows:number;historicalRowsRemoved:0;capturedAt:string|null}>;
}>;
type Input=Readonly<{previous?:PreparedPublicLedgerDisplay;currentHeads?:PublicLedgerHeads;retainedGzipB64u?:string;readActionArchive?:()=>Promise<string>;read?:(source:PublicSource,cursor?:string)=>Promise<unknown>;now?:()=>string}>;
const MAX_RAW=64*1024*1024,MAX_GZIP=12*1024*1024;
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const digits=(value:unknown)=>typeof value==='string'&&/^(0|[1-9]\d{0,29})$/.test(value)?value:typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?String(value):null;
function actionHead(first:Record<string,unknown>):PublicLedgerHeads['actions']{
 const rollup=object(first.rollup),count=digits(rollup.count);
 const rows=first.actions??first.events??first.rows;
 const empty=count==='0'&&Array.isArray(rows)&&rows.length===0&&first.nextCursor===null;
 const seq=rollup.lastSeq===null&&empty?'0':digits(rollup.lastSeq);
 const top=object(Array.isArray(rows)?rows[0]:null),hash=top.entryHash;
 if(first.schemaAvailable===false||count===null||seq===null||(count==='0'?(!empty||seq!=='0'):(!Array.isArray(rows)||!rows.length&&first.nextCursor===null||seq==='0'))||hash!=null&&(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))||top.seq!==undefined&&digits(top.seq)!==seq)throw Error('PUBLIC_LEDGER_HEAD_REQUIRED');
 return {count,lastSeq:seq,...(typeof hash==='string'?{entryHash:hash}:{})};
}
function walletHead(first:Record<string,unknown>):PublicLedgerHeads['wallet']{
 const rollup=object(first.rollup),count=digits(rollup.totalLedgerEntries??rollup.count),kai=rollup.lastEntryKaiUpulse??rollup.lastKaiUpulse;
 const lastKaiUpulse=digits(kai);
 if(count===null||kai!=null&&lastKaiUpulse===null)throw Error('PUBLIC_LEDGER_HEAD_REQUIRED');
 return {count,lastKaiUpulse};
}
function requireActionExtension(previous:PublicLedgerHeads['actions'],next:PublicLedgerHeads['actions']){
 const seq=BigInt(next.lastSeq)-BigInt(previous.lastSeq),count=BigInt(next.count)-BigInt(previous.count);
 if(seq<0n||count<0n||seq===0n&&(count!==0n||previous.entryHash&&previous.entryHash!==next.entryHash)||seq>0n&&count===0n)throw Error('PUBLIC_LEDGER_HEAD_PENDING');
}
function requireWalletExtension(previous:PublicLedgerHeads['wallet'],next:PublicLedgerHeads['wallet']){
 if(BigInt(next.count)<BigInt(previous.count)||previous.lastKaiUpulse!==null&&(next.lastKaiUpulse===null||BigInt(next.lastKaiUpulse)<BigInt(previous.lastKaiUpulse))||next.count===previous.count&&next.lastKaiUpulse!==previous.lastKaiUpulse)throw Error('PUBLIC_LEDGER_HEAD_PENDING');
}
function unpack(gzipB64u:string):PublicNetworkCache{
 if(!gzipB64u||gzipB64u.length>Math.ceil(MAX_GZIP*4/3)||!/^[A-Za-z0-9_-]+$/.test(gzipB64u))throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');
 const bytes=Buffer.from(gzipB64u,'base64url');if(bytes.toString('base64url')!==gzipB64u||bytes.length>MAX_GZIP)throw Error('PUBLIC_LEDGER_CACHE_INVALID');
 const cache=parsePublicNetworkCache(JSON.parse(gunzipSync(bytes,{maxOutputLength:MAX_RAW}).toString('utf8')));if(cache.records.some(row=>row.origin!==undefined))throw Error('PUBLIC_LEDGER_CACHE_PRIVATE_SOURCE');return cache;
}
export async function readShippedPublicLedgerArchive(){return (await readFile('public/receiz-public-ledger.json.gz.bin')).toString('base64url');}

/** The shipped Action sequence can fill a legacy gap only between a live
 * previous-hash reference and an identical retained Action. Unlinked rows,
 * Wallet events, Graph membership and Showcase are never imported from it. */
async function archivedActionBridge(readArchive:()=>Promise<string>,held:Map<string,PublicRecord>){
 const archive=unpack(await readArchive());
 const byHash=new Map<string,PublicRecord>();
 for(const row of archive.records)if(row.source==='actions'&&/^[a-f0-9]{64}$/.test(row.evidence.entryHash??''))byHash.set(row.evidence.entryHash,row);
 const misses=new Set<string>();
 return (page:PublicRecord[]):PublicRecord[]=>{
  // The display array is ordered by Kai. The SDK Action cursor follows seq.
  let boundary:PublicRecord|undefined,sequence:bigint|undefined;
  for(const row of page){
   const seq=digits(row.details?.seq);
   if(seq!==null&&(sequence===undefined||BigInt(seq)<sequence)){boundary=row;sequence=BigInt(seq);}
  }
  const suffix:PublicRecord[]=[];
  let hash=boundary?.evidence.prevHash;
  while(hash&&sequence!==undefined&&!misses.has(hash)){
   const row=byHash.get(hash),seq=digits(row?.details?.seq);
   if(!row||seq===null||BigInt(seq)>=sequence)break;
   const retained=held.get(row.id);
   if(retained)return retained.evidence.entryHash===hash?[...suffix,retained]:[];
   suffix.push(row);sequence=BigInt(seq);hash=row.evidence.prevHash;
  }
  for(const row of suffix)misses.add(row.evidence.entryHash);
  return [];
 };
}
function bounded(value:unknown,limit=MAX_RAW):void{if(Buffer.byteLength(JSON.stringify(value))>limit)throw Error('PUBLIC_LEDGER_PREPARATION_CAPACITY');}
/** Existing already-public financial display only. The shipped archive has
 * no canonical head counters; leave them unknown instead of inventing them. */
export function prepareHeldPublicLedgerDisplay(encoded:string){
 const retained=unpack(encoded),snapshot={...retained,records:retained.records.filter(row=>row.source!=='proofs'),coverage:retained.coverage.filter(row=>row.source!=='proofs')},wire=Buffer.from(JSON.stringify(publicNetworkCacheWire(snapshot)));
 if(wire.length>MAX_RAW)throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');const bytes=gzipSync(wire,{level:6});if(bytes.length>MAX_GZIP)throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');
 return {schema:'bank.public-ledger.preparation.v1' as const,financialOnly:true as const,ledgerCacheGzipB64u:bytes.toString('base64url')};
}
/** Extend public display history through the existing SDK readers and held-ID
 * anchors. No Source, proof, identity or financial admission occurs here. The
 * saved public prefix survives; only unseen rows are read and merged. */
export async function preparePublicLedgerDisplay(input:Input={}):Promise<PreparedPublicLedgerDisplay>{
 const previous=input.previous?.heads,current=input.currentHeads;
 if(current!==undefined&&!isPublicLedgerHeads(current))throw Error('PUBLIC_LEDGER_HEAD_REQUIRED');
 if(input.previous){
  if(input.previous.schema!=='bank.public-ledger.preparation.v1'||input.previous.financialOnly!==true)throw Error('PUBLIC_LEDGER_PREPARED_REQUIRED');
  if(!isPublicLedgerHeads(previous))throw Error('PUBLIC_LEDGER_HEAD_REQUIRED');
  if(current){requireActionExtension(previous.actions,current.actions);requireWalletExtension(previous.wallet,current.wallet);}
 }
 const sameActions=!!(previous&&current&&sameActionHead(previous.actions,current.actions));
 const sameWallet=!!(previous&&current&&sameWalletHead(previous.wallet,current.wallet));
 const sameGraph=!!(current?.graph&&previous?.graph&&current.graph.count===previous.graph.count&&current.graph.revision===previous.graph.revision);
 if(input.previous&&sameActions&&sameWallet&&(!current?.graph||sameGraph))return input.previous;
 const encoded=input.previous?.ledgerCacheGzipB64u??input.retainedGzipB64u??await readShippedPublicLedgerArchive(),retained=unpack(encoded),base=retained.records.filter(row=>row.source!=='proofs'),read=input.read??((source:PublicSource,cursor?:string)=>readSharedPublicSource(source,cursor,undefined,{fresh:true})),now=input.now??(()=>new Date().toISOString());
 const pages:Record<string,number>={actions:0,wallet:0,graph:0},added:Record<string,number>={actions:0,wallet:0,graph:0};
 let actionsHead=previous?.actions,walletRollup=previous?.wallet;
 async function extend(source:'actions'|'wallet'){
  const prior=base.filter(row=>row.source===source),coverage=retained.coverage.find(item=>item.source===source);
  if(coverage?.complete&&(source==='actions'?sameActions:sameWallet))return prior;
  const known=new Map(prior.map(row=>[row.id,row])),represented=new Set(known.keys()),visited=new Set<string>(),incoming:PublicRecord[]=[];
  let cursor:string|undefined,expected:string|undefined;
  let bridge:Awaited<ReturnType<typeof archivedActionBridge>>|undefined;
  // A concurrent append can advance the feed beyond the captured coordinate.
  // Meet the requested and retained action hashes in the same public sequence.
  const anchors=new Map<string,string>();
  for(const head of [previous?.actions,current?.actions])if(source==='actions'&&head?.entryHash)anchors.set(head.lastSeq,head.entryHash);
  for(let count=0;count<512;count++){
   const raw=await read(source,cursor);bounded(raw);pages[source]++;
   const page=parsePublicNetworkPage(source,raw);
   if(count===0){
    if(source==='actions'){
     actionsHead=actionHead(object(raw));expected=actionsHead.count;
     for(const lower of [previous?.actions,current?.actions])if(lower)requireActionExtension(lower,actionsHead);
     if(actionsHead.entryHash===anchors.get(actionsHead.lastSeq))anchors.delete(actionsHead.lastSeq);
    }else{
     walletRollup=walletHead(object(raw));expected=walletRollup.count;
     for(const lower of [previous?.wallet,current?.wallet])if(lower)requireWalletExtension(lower,walletRollup);
    }
   }
   let rows=page.records;
   if(source==='actions'&&!previous&&input.readActionArchive&&coverage?.complete&&!page.complete&&!rows.some(row=>known.has(row.id))&&rows.some(row=>row.evidence.prevHash)){
    bridge??=await archivedActionBridge(input.readActionArchive,known).catch(()=>()=>[]);
    const suffix=bridge(rows);
    // A chain hit may precede a legacy gap elsewhere. The public action
    // count must still be represented before stopping the SDK cursor.
    if(suffix.length&&BigInt(new Set([...represented,...rows.map(row=>row.id),...suffix.map(row=>row.id)]).size)>=BigInt(expected!))rows=[...rows,...suffix];
   }
   incoming.push(...rows);if(incoming.length>100000)throw Error('PUBLIC_LEDGER_PREPARATION_CAPACITY');
   const reached=rows.some(row=>known.has(row.id));
   for(const row of rows){
    represented.add(row.id);
    const held=known.get(row.id);
    if(source==='actions'&&held?.evidence.entryHash&&row.evidence.entryHash&&held.evidence.entryHash!==row.evidence.entryHash)throw Error('PUBLIC_LEDGER_HEAD_PENDING');
    const seq=digits(row.details?.seq);
    if(seq&&anchors.has(seq)){
     if(row.evidence.entryHash!==anchors.get(seq))throw Error('PUBLIC_LEDGER_HEAD_PENDING');
     anchors.delete(seq);
    }
   }
   // A legacy seed can lack older public families. Once this reader has
   // completed the wallet prefix, its retained ID anchors cover that prefix.
   // The global wallet rollup counts underlying entries, not public rows.
   const covered=source==='wallet'&&previous!==undefined||BigInt(represented.size)>=BigInt(expected!);
   if(page.complete||!anchors.size&&reached&&covered&&coverage?.complete){
    if(anchors.size)throw Error('PUBLIC_LEDGER_HEAD_PENDING');
    const records=mergePublicRecords(incoming,prior);
    added[source]=records.length-prior.length;
    return records;
   }
   if(!page.nextCursor||visited.has(page.nextCursor)||page.nextCursor===cursor)throw Error('PUBLIC_LEDGER_PREPARATION_CURSOR');
   visited.add(page.nextCursor);cursor=page.nextCursor;
  }
  throw Error('PUBLIC_LEDGER_PREPARATION_INCOMPLETE');
 }
 const graphBefore=base.filter(row=>row.source==='graph');
 let withdrawnGraphRows=0;
 async function extendGraph(){
  if(sameGraph&&retained.coverage.some(item=>item.source==='graph'&&item.complete))return graphBefore;
  const raw=await read('graph');bounded(raw);pages.graph++;
  const graph=parsePublicNetworkPage('graph',raw);if(!graph.complete)throw Error('PUBLIC_LEDGER_GRAPH_INCOMPLETE');
  const known=new Set(graphBefore.map(row=>row.id)),visible=new Set(graph.records.map(row=>row.id));
  withdrawnGraphRows=graphBefore.filter(row=>!visible.has(row.id)).length;
  added.graph=graph.records.filter(row=>!known.has(row.id)).length;
  return mergePublicRecords(graphBefore.filter(row=>visible.has(row.id)),graph.records);
 }
 const [actions,wallet,graphRows]=await Promise.all([extend('actions'),extend('wallet'),extendGraph()]);
 if(!actionsHead||!walletRollup)throw Error('PUBLIC_LEDGER_HEAD_REQUIRED');
 const heads:PublicLedgerHeads={actions:actionsHead,wallet:walletRollup,...(current?.graph?{graph:current.graph}:{})};
 const records=mergePublicRecords([], [...actions,...wallet,...graphRows]);if(records.length>100000)throw Error('PUBLIC_LEDGER_PREPARATION_CAPACITY');const capturedAt=now(),snapshot:PublicNetworkCache={records,capturedAt,inspectionVersion:retained.inspectionVersion,coverage:(['actions','wallet','graph'] as const).map(source=>({source,complete:true,observedAt:Date.parse(capturedAt)}))},wire=Buffer.from(JSON.stringify(publicNetworkCacheWire(snapshot)));if(wire.length>MAX_RAW)throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');
 const compressed=gzipSync(wire,{level:6});if(compressed.length>MAX_GZIP)throw Error('PUBLIC_LEDGER_CACHE_CAPACITY');
 return {schema:'bank.public-ledger.preparation.v1',financialOnly:true,ledgerCacheGzipB64u:compressed.toString('base64url'),heads,diagnostics:{recordCount:records.length,counts:Object.fromEntries((['actions','wallet','graph'] as const).map(source=>[source,records.filter(row=>row.source===source).length])),pages,added,withdrawnGraphRows,historicalRowsRemoved:0,capturedAt}};
}
