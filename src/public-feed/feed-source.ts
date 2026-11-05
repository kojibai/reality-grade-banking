import {fetchPublicMarket,parsePublicMarket,rememberPublicOriginalLocators,type PublicMarketItem,type PublicMarketCatalog} from '../receiz/public-market';
import {appendFeedItems,orderFeedItems,refreshFeedItems} from './feed-items';
import {readPublicMarketDocumentSeed} from '../receiz/public-market-document-seed';
let held:PublicMarketItem[]|null=null,pending:Promise<PublicMarketItem[]>|null=null;
let preparedGeneration:string|null=null,revision=0;
let preparedCatalog:PublicMarketCatalog|null=null;
const preparedListeners=new Set<(catalog:PublicMarketCatalog)=>void>();
function publicDiscoveryDocument(){return preparedCatalog&&preparedGeneration?{catalog:preparedCatalog,generation:preparedGeneration}:null;}
function exposeDiscoveryDocument(){const marker=document.getElementById('receiz-navigation');if(marker)Object.assign(marker,{publicDiscoveryDocument});}
if(typeof document!=='undefined'){exposeDiscoveryDocument();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',exposeDiscoveryDocument,{once:true});}
const preparedEvent=(event:Event)=>{const value=(event as CustomEvent<{root?:Element;path?:unknown}>).detail;if(value?.root instanceof Element&&(value.path==='feed'||value.path==='discover'))readPreparedFeedCatalog(value.root,value.path);};
export function subscribePreparedFeedCatalog(listener:(catalog:PublicMarketCatalog)=>void){
 if(!preparedListeners.size)window.addEventListener('bankeiz:prepared-discovery',preparedEvent);preparedListeners.add(listener);
 if(preparedCatalog)listener(preparedCatalog);
 return()=>{preparedListeners.delete(listener);if(!preparedListeners.size)window.removeEventListener('bankeiz:prepared-discovery',preparedEvent);};
}
/** The complete current document cohort replaces an older shipped expansion.
 * These are presentation bytes, never proof or account admission. */
export function reusePreparedFeedCatalog(catalog:PublicMarketCatalog,generation:string):PublicMarketCatalog{
 if(preparedCatalog===catalog&&preparedGeneration===generation)return preparedCatalog;
 preparedGeneration=generation;preparedCatalog=catalog;revision++;held=orderFeedItems(catalog.items);for(const listener of preparedListeners)listener(catalog);
 return catalog;
}
export function readPreparedFeedCatalog(root:Element,path:'feed'|'discover'){
 const element=root.querySelector('#public-market-seed');if(!element)return null;
 // The saved transport names the identical material generation across these
 // two views. Reuse its already validated catalog rather than parsing it twice.
 if(preparedCatalog&&element.textContent?.startsWith(`{"schema":"bank.public-market.document.v1","generation":"${preparedGeneration}","path":"${path}",`)){element.remove();return preparedCatalog;}
 const seed=readPublicMarketDocumentSeed({getElementById:id=>root.querySelector<HTMLElement>(`[id="${id}"]`)});
 if(!seed||seed.path!==path)throw Error('PUBLIC_DISCOVERY_PREPARED_SEED_INVALID');
 const catalog=reusePreparedFeedCatalog(seed.catalog,seed.generation);
 element.remove();return catalog;
}
/** A complete public cohort may withdraw a row; keep the order of survivors. */
export function completeFeedItems(current:readonly PublicMarketItem[],next:readonly PublicMarketItem[]){
 const ids=new Set(next.map(item=>item.id));return refreshFeedItems(current.filter(item=>item.category==='sports'||ids.has(item.id)),next);
}
async function shippedSource(){
 const response=await fetch('/receiz-public-market.json',{credentials:'omit',cache:'force-cache',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('PUBLIC_FEED_SOURCE_UNAVAILABLE');const input=await response.json(),catalog=parsePublicMarket(input,input.snapshot);rememberPublicOriginalLocators(catalog);return catalog;
}
/** Read the existing shipped public projection once, without any hosted writer,
 * quotes, account or media work. Explicit Refresh uses existing live discovery. */
export function prepareFeedItems(signal?:AbortSignal,refresh=false):Promise<PublicMarketItem[]>{
 signal?.throwIfAborted();if(held&&!refresh)return Promise.resolve(held);
 if(!pending){const started=revision,work=(refresh?fetchPublicMarket(AbortSignal.timeout(12000)):shippedSource()).then(catalog=>{
  if(started!==revision&&held)return held;
  if(preparedGeneration&&!catalog.complete)throw Error('PUBLIC_FEED_COMPLETE_CATALOG_REQUIRED');
  held=held?(preparedGeneration?completeFeedItems(held,catalog.items):appendFeedItems(held,catalog.items)):orderFeedItems(catalog.items);return held;
 });pending=work;void work.finally(()=>{if(pending===work)pending=null;}).catch(()=>{});}
 const work=pending;if(!signal)return work;
 return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(signal.reason);};signal.addEventListener('abort',abort,{once:true});void work.then(value=>{signal.removeEventListener('abort',abort);if(!signal.aborted)resolve(value);},error=>{signal.removeEventListener('abort',abort);if(!signal.aborted)reject(error);});});
}
let collectibles:PublicMarketItem[]|null=null,collectiblesPending:Promise<PublicMarketItem[]>|null=null;
/** Collectible inventory is a different existing source, opened only on intent. */
export function prepareFeedCollectibles():Promise<PublicMarketItem[]>{
 if(collectibles)return Promise.resolve(collectibles);if(collectiblesPending)return collectiblesPending;
 const work=(async()=>{const response=await fetch('/receiz-public-sports.json',{credentials:'omit',cache:'force-cache',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('PUBLIC_COLLECTIBLES_SOURCE_UNAVAILABLE');const input=await response.json(),{mergePublicSports}=await import('../receiz/public-sports');const catalog=mergePublicSports({items:[],complete:true,revision:'feed-collectibles',observedAt:null,sourceCount:0},input);collectibles=orderFeedItems(catalog.items);return collectibles;})();collectiblesPending=work;void work.finally(()=>{if(collectiblesPending===work)collectiblesPending=null;}).catch(()=>{});return work;
}
