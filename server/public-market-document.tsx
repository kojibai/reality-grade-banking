import {alignPreparedPublicNavigation} from './prepared-public-navigation';
import {PublicDocumentCapabilitiesContext,PublicDocumentFormatContext} from '../src/core/public-document-format';
import {createHash} from 'node:crypto';
import {renderToString} from 'react-dom/server';
import {PublicExplorer} from '../src/public-explorer/PublicExplorer';
import {parsePublicMarket} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
import {publicMarketDocumentSeedScript,type PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {packMarketHistory} from '../src/receiz/market-projection/history-wire';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {PUBLIC_MARKET_PREPARED_PATHS} from '../src/receiz/prepared-public-page-path';

export const publicMarketPreparedPaths=PUBLIC_MARKET_PREPARED_PATHS;
export type PublicMarketRenderInput={material:string;generation:string;template:string;path?:string};
const prepared=new Map<string,Promise<{catalog:ReturnType<typeof parsePublicMarket>;history:ReturnType<typeof parseMarketHistory>;asOfPulse:number;capitalization:ReturnType<typeof parseMarketCapSource>|null}>>();
async function prepare(material:string,generation:string){
 const held=prepared.get(generation);if(held)return held;
 const job=(async()=>{
  const input=JSON.parse(material),base=parsePublicMarket(input.membership,input.snapshot),catalog=input.sports?mergePublicSports(base,input.sports):base;
  if(!base.complete||catalog.items.length>10000)throw Error('PUBLIC_MARKET_RENDER_COMPLETE_REQUIRED');
  const state=input.marketPrepared;
  if(state?.schema!=='bank.public-market.prepared.v1'||!Number.isSafeInteger(state.asOfPulse)||state.asOfPulse<0||state.asOfPulse>1e10)throw Error('PUBLIC_MARKET_RENDER_STATE_REQUIRED');
  const history=parseMarketHistory(input.history);
  if(state.asOfPulse<history.summary.serverPulse)throw Error('PUBLIC_MARKET_RENDER_STATE_REQUIRED');
  const capitalization=input.capitalization?parseMarketCapSource(input.capitalization):null;
  return {catalog,history,capitalization,asOfPulse:state.asOfPulse};
 })();
 prepared.set(generation,job);while(prepared.size>2)prepared.delete(prepared.keys().next().value!);
 void job.catch(()=>{if(prepared.get(generation)===job)prepared.delete(generation);});return job;
}
/** Called by accepted-publication preparation, never by the cold visitor. The
 * existing public projector selects display fields; arbitrary input fields do
 * not enter the saved seed. The exact source-input hash is a cache coordinate. */
export async function renderPublicMarketDocument({material,generation,template,path='explore'}:PublicMarketRenderInput):Promise<string>{
 if(Buffer.byteLength(material)>32*1024*1024||!/^[a-f0-9]{64}$/.test(generation)||createHash('sha256').update(material).digest('hex')!==generation)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 if(!(publicMarketPreparedPaths as readonly string[]).includes(path))throw Error('PUBLIC_MARKET_RENDER_PATH_INVALID');
 const {catalog,history,asOfPulse,capitalization}=await prepare(material,generation);
 const format=new Intl.DateTimeFormat().resolvedOptions();
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',generation,path,catalog,visibleCount:Math.min(50,catalog.items.length),asOfPulse,format:{locale:format.locale,timeZone:format.timeZone},history:packMarketHistory(history),...(capitalization?{capitalization}:{})};
 const source={catalog,historyCatalog:catalog,pulse:asOfPulse,quoteStatus:'stale' as const,sportsStatus:catalog.items.some(item=>item.category==='sports')?'retained' as const:'missing' as const,status:'stale' as const,error:null,refresh:async()=>{}};
 const content=renderToString(<PublicDocumentCapabilitiesContext.Provider value={{intersectionObserver:false}}><PublicDocumentFormatContext.Provider value={seed.format}><PublicExplorer active={false} initialPath={'/'+path+'/'} initialSource={source} initialVisibleCount={seed.visibleCount} initialAsOfPulse={asOfPulse} initialHistory={history}/></PublicDocumentFormatContext.Provider></PublicDocumentCapabilitiesContext.Provider>,{identifierPrefix:'public-explore-'});
 let replaced=false;
 const html=template.replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_all,start,end)=>{replaced=true;return start+content+end;});
 if(!replaced)throw Error('PUBLIC_MARKET_RENDER_TEMPLATE_INVALID');
 const aligned=alignPreparedPublicNavigation(html,path,content);
 return aligned.replace('<script id="receiz-navigation"',()=>publicMarketDocumentSeedScript(seed)+'<script id="receiz-navigation"');
}
