import {preparePublicMarketSeedText,publicMarketDocumentHistory,type PublicMarketDocumentSeed} from './public-market-document-seed';
import {parseMarketCapSource,type MarketCapSource} from './market-projection/source';
import {SHARE_MARKET_HISTORY_POLICY,type MarketHistorySnapshot} from './market-projection/history';

export const PREPARED_BANK_CATALOG_PATH='/api/explore?path=bank';
const MAX=32*1024*1024,HEX=/^[a-f0-9]{64}$/;
export type PreparedBankReceipt={generation:string;build:string;bodySha256:string;state:'current'|'retained';coordinate:string;pendingCoordinate?:string};
export type PreparedBankCatalog={seed:PublicMarketDocumentSeed;capitalization:MarketCapSource;history:MarketHistorySnapshot;receipt:PreparedBankReceipt};
export type PreparedBankCatalogState={phase:'idle'|'pending'|'ready'|'fallback';value:PreparedBankCatalog|null;error:string|null};
type Fetcher=(path:string,init:RequestInit)=>Promise<Response>;
function receipt(response:Response):PreparedBankReceipt{
 const generation=response.headers.get('x-receiz-public-material-revision')??'',build=response.headers.get('x-receiz-public-render-build')??'',bodySha256=response.headers.get('x-receiz-public-html-sha256')??'',state=response.headers.get('x-receiz-public-html-state'),coordinate=response.headers.get('x-receiz-public-state-coordinate')??'',pending=response.headers.get('x-receiz-public-pending-state-coordinate');
 if(!response.ok||![generation,build,bodySha256,coordinate].every(value=>HEX.test(value))||state!=='current'&&state!=='retained'||state==='retained'&&(!pending||!HEX.test(pending)||pending===coordinate)||state==='current'&&pending!==null){void response.body?.cancel().catch(()=>{});throw Error('PREPARED_PUBLIC_CATALOG_UNAVAILABLE');}
 return{generation,build,bodySha256,state,coordinate,...(pending?{pendingCoordinate:pending}:{})};
}
// This channel carries inert v1 data. A newly qualified renderer can confirm
// the exact same bytes; its new receipt still replaces the previous receipt.
const sameBody=(a:PreparedBankReceipt,b:PreparedBankReceipt)=>a.generation===b.generation&&a.bodySha256===b.bodySha256;
const sameReceipt=(a:PreparedBankReceipt,b:PreparedBankReceipt)=>sameBody(a,b)&&a.build===b.build&&a.state===b.state&&a.coordinate===b.coordinate&&a.pendingCoordinate===b.pendingCoordinate;
/** Freeze each parsed public generation once. A matching HEAD can then safely
 * reuse these exact objects without parsing, hashing or walking them again. */
function immutable<T>(value:T):T{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))immutable(child);Object.freeze(value);}return value;
}
function untilAborted<T>(operation:Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();return new Promise<T>((resolve,reject)=>{
  const abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});
  operation.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
 });
}
async function body(response:Response,signal:AbortSignal){
 if(!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX||!response.body)throw Error('PREPARED_PUBLIC_CATALOG_INVALID');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[],decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;
 const cancel=()=>{void reader.cancel(signal.reason).catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{for(;;){signal.throwIfAborted();const next=await untilAborted(reader.read(),signal);signal.throwIfAborted();if(next.done)break;size+=next.value.length;if(size>MAX)throw Error('PREPARED_PUBLIC_CATALOG_CAPACITY');chunks.push(next.value);text+=decoder.decode(next.value,{stream:true});}text+=decoder.decode();}finally{signal.removeEventListener('abort',cancel);void reader.cancel().catch(()=>{});reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');return{text,sha256};
}
/** One public display generation, never a financial Source. Read-only API
 * bytes are decoded in the background; account entry never awaits this work. */
export function createPreparedBankCatalogReader(fetcher:Fetcher=(path,init)=>fetch(path,init)){
 let state:PreparedBankCatalogState=immutable({phase:'idle',value:null,error:null}),held:PreparedBankCatalog|null=null,flight:Promise<PreparedBankCatalog|null>|undefined,controller:AbortController|undefined,epoch=0;
 const listeners=new Set<()=>void>();
 const publish=(next:PreparedBankCatalogState)=>{if(next.phase===state.phase&&next.value===state.value&&next.error===state.error)return;state=immutable(next);for(const listener of listeners)listener();};
 function read(options:{restart?:boolean}={}):Promise<PreparedBankCatalog|null>{
  if(flight&&!options.restart)return flight;
  controller?.abort();const selected=new AbortController(),ticket=++epoch;controller=selected;
  const signal=AbortSignal.any([selected.signal,AbortSignal.timeout(15000)]),selectedRead=()=>ticket===epoch&&!selected.signal.aborted,current=()=>{if(!selectedRead())return false;signal.throwIfAborted();return true;};
  if(!held)publish({phase:'pending',value:null,error:null});
  const request=(method:'GET'|'HEAD')=>untilAborted(fetcher(PREPARED_BANK_CATALOG_PATH,{method,credentials:'omit',redirect:'error',cache:'no-store',signal,headers:{accept:'text/html'}}).then(response=>{if(signal.aborted){void response.body?.cancel().catch(()=>{});signal.throwIfAborted();}return response;}),signal);
  const job=(async()=>{try{
   let head:PreparedBankReceipt|undefined;
   if(held){const response=await request('HEAD');head=receipt(response);void response.body?.cancel().catch(()=>{});if(!current())return null;
    if(sameBody(head,held.receipt)){held=sameReceipt(head,held.receipt)?held:immutable({...held,receipt:head});publish({phase:'ready',value:held,error:null});return held;}
    publish({phase:'pending',value:held,error:null});
   }
   const response=await request('GET'),accepted=receipt(response);
   // HEAD is an invalidation hint. A newer transition may finish before GET;
   // that GET must qualify its own complete receipt and bytes below.
   const document=await body(response,signal);if(!current())return null;
   if(document.sha256!==accepted.bodySha256)throw Error('PREPARED_PUBLIC_CATALOG_DIGEST_MISMATCH');
   const scripts=[...document.text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(match=>/(?:^|\s)id\s*=\s*(?:"public-market-seed"|'public-market-seed')(?=\s|$)/i.test(match[1])&&/(?:^|\s)type\s*=\s*(?:"application\/json"|'application\/json')(?=\s|$)/i.test(match[1]));
   if(scripts.length!==1)throw Error('PREPARED_PUBLIC_CATALOG_INVALID');
   // Consume only the existing inert JSON script. No DOMParser, HTML adoption,
   // executable code, arbitrary URL or account request enters this data path.
   const seed=await preparePublicMarketSeedText(scripts[0][2]);if(!current())return null;
   if(!seed||seed.path!=='bank'||seed.generation!==accepted.generation||!seed.capitalization)throw Error('PREPARED_PUBLIC_CATALOG_INVALID');
   const history=publicMarketDocumentHistory(seed),capitalization=parseMarketCapSource({ok:true,marketCapProjection:seed.capitalization});
   if(!history||history.historyPolicy!==SHARE_MARKET_HISTORY_POLICY||seed.asOfPulse<history.summary.serverPulse)throw Error('PREPARED_PUBLIC_CATALOG_INVALID');
   held=immutable({seed,capitalization,history,receipt:accepted});publish({phase:'ready',value:held,error:null});return held;
  }catch{if(selectedRead())publish({phase:'fallback',value:held,error:'Prepared public collection unavailable.'});return null;}
  })();flight=job;void job.finally(()=>{if(flight===job){flight=undefined;controller=undefined;}}).catch(()=>{});return job;
 }
 return{getSnapshot:()=>state,subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},read};
}
const reader=createPreparedBankCatalogReader();
export const readPreparedBankCatalog=reader.read;
export const preparedBankCatalogState=reader.getSnapshot;
export const subscribePreparedBankCatalog=reader.subscribe;
export function preparedBankCatalogEnabled(){if(typeof document==='undefined'||typeof location==='undefined'||location.pathname!=='/')return false;const carried=document.getElementById('public-market-seed');return !carried||!!carried.closest('[data-public-runtime][hidden]');}
