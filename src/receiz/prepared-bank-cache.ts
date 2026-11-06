/** Local retention of the exact public Bank data response. This cache is not
 * an identity store, artifact admission, or a Source-currentness verdict. */
export interface PreparedBankCache {
 read():Promise<Response|null>;
 write(response:Response,onSelected?:()=>void):Promise<void>;
 discard(response:Response):Promise<void>;
}
export const PREPARED_BANK_CATALOG_PATH='/api/explore?path=bank';
const CACHE='bankeiz-held-public-catalog-v1';
/** Reuse browser CacheStorage without adding an HTTP interception or account
 * entry dependency. Every write is the already-checked public response. */
export function browserPreparedBankCache(path:string):PreparedBankCache|undefined{
 if(typeof caches==='undefined'||typeof location==='undefined')return;
 const key=new URL(path,location.origin).href;
 let opened:Promise<Cache>|undefined,writes:Promise<void>=Promise.resolve(),revision=0;
 const reads=new WeakMap<Response,number>();
 const cache=()=>opened??=caches.open(CACHE).catch(error=>{opened=undefined;throw error;});
 const enqueue=(operation:()=>Promise<void>)=>{const next=writes.catch(()=>{}).then(operation);writes=next;return next;};
 return {
  async read(){await writes.catch(()=>{});const at=revision,value=await(await cache()).match(key);if(value)reads.set(value,at);return value??null;},
  write(response,onSelected){const exact=response.clone(),at=++revision;return enqueue(async()=>{await(await cache()).put(key,exact);if(at===revision)onSelected?.();});},
  discard(response){const at=reads.get(response);return enqueue(async()=>{if(at===revision)await(await cache()).delete(key);});},
 };
}

// Both accepted response forms replace one exact atomic CacheStorage entry.
export const preparedPublicCatalogCache=browserPreparedBankCache(PREPARED_BANK_CATALOG_PATH);
