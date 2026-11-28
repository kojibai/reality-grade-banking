import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {ledgerAssetTrade} from '../src/receiz/ledger-asset-trade';
import {mergePublicRecords} from '../src/receiz/public-network';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {publicNetworkCacheWire} from '../src/receiz/public-network-cache-wire';

const financial=['actions','wallet','graph'] as const;
const documentLimit=32*1024*1024, rawLimit=64*1024*1024, seedLimit=8*1024*1024;
const digest=/^[a-f0-9]{64}$/;

async function readDocument(response:Response) {
  const headers=response.headers;
  const revision=headers.get('x-receiz-public-material-revision');
  const state=headers.get('x-receiz-public-html-state'),coordinate=headers.get('x-receiz-public-state-coordinate');
  const pending=headers.get('x-receiz-public-pending-state-coordinate');
  const accepted=state==='current'&&pending===null||state==='retained'&&digest.test(pending??'')&&pending!==coordinate;
  if(!response.ok||!accepted||!/^text\/html(?:;|$)/i.test(headers.get('content-type')??'')
    ||!['x-receiz-public-material-revision','x-receiz-public-render-build','x-receiz-public-state-coordinate','x-receiz-public-html-sha256']
      .every(name=>digest.test(headers.get(name)??''))
    ||!response.body
    ||Number(headers.get('content-length'))>documentLimit) {
    await response.body?.cancel().catch(()=>{});
    throw Error('PUBLIC_LEDGER_SEED_DOCUMENT_UNAVAILABLE');
  }
  const reader=response.body.getReader(),hash=createHash('sha256'),decoder=new TextDecoder('utf-8',{fatal:true});
  let size=0, html='';
  try{
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>documentLimit)throw Error('PUBLIC_LEDGER_SEED_CAPACITY');
      hash.update(value);
      html+=decoder.decode(value,{stream:true});
    }
    html+=decoder.decode();
  }finally{
    await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
  if(hash.digest('hex')!==headers.get('x-receiz-public-html-sha256'))throw Error('PUBLIC_LEDGER_SEED_DOCUMENT_INVALID');
  const markers=html.matchAll(/<script id="public-ledger-document-seed" type="application\/json">([^<]+)<\/script>/g);
  const [selected,extra]=markers;
  if(!selected||extra)throw Error('PUBLIC_LEDGER_SEED_DOCUMENT_INVALID');
  const seed=JSON.parse(selected[1]),packet=seed.snapshotGzip?.[0];
  if(seed.schema!=='bank.public-ledger.document.v1'||seed.path!=='observatory'||seed.generation!==revision
    ||seed.snapshotGzip?.length!==2||!packet||!Number.isSafeInteger(packet.bytes)||packet.bytes<1||packet.bytes>rawLimit
    ||typeof packet.gzipB64u!=='string'||packet.gzipB64u.length>Math.ceil(12*1024*1024*4/3)) {
    throw Error('PUBLIC_LEDGER_SEED_DOCUMENT_INVALID');
  }
  const bytes=Buffer.from(packet.gzipB64u,'base64url');
  if(bytes.toString('base64url')!==packet.gzipB64u)throw Error('PUBLIC_LEDGER_SEED_DOCUMENT_INVALID');
  const raw=gunzipSync(bytes,{maxOutputLength:rawLimit});
  if(raw.length!==packet.bytes)throw Error('PUBLIC_LEDGER_SEED_DOCUMENT_INVALID');
  return parsePublicNetworkCache(JSON.parse(raw.toString('utf8')));
}

/** Advance the bundled public display from already prepared financial history.
 * Loading a page and building from the held archive have no freshness dependency. */
export async function refreshPublicLedgerSeed(response:Response,previousBytes:Uint8Array) {
  const incoming=await readDocument(response);
  const held=parsePublicNetworkCache(JSON.parse(gunzipSync(previousBytes,{maxOutputLength:rawLimit}).toString('utf8')));
  if(!incoming.capturedAt||incoming.records.some(row=>row.source==='proofs'||row.origin!==undefined)
    ||!financial.every(source=>incoming.coverage.some(row=>row.source===source&&row.complete&&row.observedAt!==undefined))) {
    throw Error('PUBLIC_LEDGER_SEED_INCOMPLETE');
  }
  if(held.capturedAt&&Date.parse(incoming.capturedAt)<=Date.parse(held.capturedAt))return null;
  for(const source of financial){
    const next=incoming.coverage.find(row=>row.source===source)!;
    const before=held.coverage.find(row=>row.source===source);
    if((next.observedAt??0)<(before?.observedAt??0))throw Error('PUBLIC_LEDGER_SEED_HISTORY_CONFLICT');
  }
  const incomingById=new Map(incoming.records.map(row=>[row.id,row]));
  const heldIds=new Set(held.records.map(row=>row.id));
  let withdrawnGraphRows=0;
  const retain=held.records.filter(row=>{
    if(row.source==='proofs')return true;
    const next=incomingById.get(row.id);
    if(!next){
      if(row.source!=='graph')throw Error('PUBLIC_LEDGER_SEED_HISTORY_CONFLICT');
      withdrawnGraphRows++;
      return false;
    }
    if(next.kind!==row.kind||['entryHash','prevHash','artifactDigest','proofHead'].some(key=>
      row.evidence[key]&&next.evidence[key]&&row.evidence[key]!==next.evidence[key])) {
      throw Error('PUBLIC_LEDGER_SEED_HISTORY_CONFLICT');
    }
    return true;
  });
  const added=incoming.records.filter(row=>!heldIds.has(row.id)).length;
  if(!added&&!withdrawnGraphRows)return null;
  const records=mergePublicRecords(retain,incoming.records);
  for(const row of records){
    if(row.source!=='actions'||!['market.share.buy','market.share.sell'].includes(row.kind))continue;
    const trade=ledgerAssetTrade(row);
    if(!trade?.tradeId||trade.priceUsdCents===undefined||trade.shareQuantityMicro===undefined||trade.notionalUsdCents===undefined) {
      throw Error('PUBLIC_LEDGER_SEED_TRADE_DETAIL_REQUIRED');
    }
  }
  const coverage=[...incoming.coverage,...held.coverage.filter(row=>row.source==='proofs')];
  const inspectionVersion=Math.max(held.inspectionVersion??0,incoming.inspectionVersion??0);
  const raw=JSON.stringify(publicNetworkCacheWire({...incoming,records,coverage,inspectionVersion}));
  if(Buffer.byteLength(raw)>rawLimit)throw Error('PUBLIC_LEDGER_SEED_CAPACITY');
  const bytes=gzipSync(raw,{level:9});
  if(bytes.length>seedLimit)throw Error('PUBLIC_LEDGER_SEED_CAPACITY');
  return {bytes,capturedAt:incoming.capturedAt,added,withdrawnGraphRows};
}
