import {fetchPublicMarket,parsePublicMarket,rememberPublicOriginalLocators,type PublicMarketItem} from '../receiz/public-market';
import {appendFeedItems,orderFeedItems} from './feed-items';
let held:PublicMarketItem[]|null=null,pending:Promise<PublicMarketItem[]>|null=null;
async function shippedSource(){
 const response=await fetch('/receiz-public-market.json',{credentials:'omit',cache:'force-cache',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('PUBLIC_FEED_SOURCE_UNAVAILABLE');const input=await response.json(),catalog=parsePublicMarket(input,input.snapshot);rememberPublicOriginalLocators(catalog);return catalog;
}
/** Read the existing shipped public projection once, without any hosted writer,
 * quotes, account or media work. Explicit Refresh uses existing live discovery. */
export function prepareFeedItems(signal?:AbortSignal,refresh=false):Promise<PublicMarketItem[]>{
 signal?.throwIfAborted();if(held&&!refresh)return Promise.resolve(held);
 if(!pending){const work=(refresh?fetchPublicMarket(AbortSignal.timeout(12000)):shippedSource()).then(catalog=>{held=held?appendFeedItems(held,catalog.items):orderFeedItems(catalog.items);return held;});pending=work;void work.finally(()=>{if(pending===work)pending=null;}).catch(()=>{});}
 const work=pending;if(!signal)return work;
 return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(signal.reason);};signal.addEventListener('abort',abort,{once:true});void work.then(value=>{signal.removeEventListener('abort',abort);if(!signal.aborted)resolve(value);},error=>{signal.removeEventListener('abort',abort);if(!signal.aborted)reject(error);});});
}
let collectibles:PublicMarketItem[]|null=null,collectiblesPending:Promise<PublicMarketItem[]>|null=null;
/** Collectible inventory is a different existing source, opened only on intent. */
export function prepareFeedCollectibles():Promise<PublicMarketItem[]>{
 if(collectibles)return Promise.resolve(collectibles);if(collectiblesPending)return collectiblesPending;
 const work=(async()=>{const response=await fetch('/receiz-public-sports.json',{credentials:'omit',cache:'force-cache',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('PUBLIC_COLLECTIBLES_SOURCE_UNAVAILABLE');const input=await response.json(),{mergePublicSports}=await import('../receiz/public-sports');const catalog=mergePublicSports({items:[],complete:true,revision:'feed-collectibles',observedAt:null,sourceCount:0},input);collectibles=orderFeedItems(catalog.items);return collectibles;})();collectiblesPending=work;void work.finally(()=>{if(collectiblesPending===work)collectiblesPending=null;}).catch(()=>{});return work;
}
