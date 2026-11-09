import {prepareSelectedPublicReferenceState} from './public-reference-state';
import {packPublicCatalogArtwork} from '../src/receiz/public-catalog-artwork-wire';
import {alignPreparedPublicNavigation} from './prepared-public-navigation';
import {PublicDocumentCapabilitiesContext,PublicDocumentFormatContext} from '../src/core/public-document-format';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {renderToString} from 'react-dom/server';
import {PublicExplorer} from '../src/public-explorer/PublicExplorer';
import {parsePublicMarket} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
import {publicMarketDocumentSeedScript,type PublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {packMarketHistory} from '../src/receiz/market-projection/history-wire';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {PUBLIC_MARKET_PREPARED_PATHS} from '../src/receiz/prepared-public-page-path';
import {profilePagePath,profilePageUsername,selectHeldPublicProfile} from '../src/receiz/public-profile';
import {profilePreviewHtml} from './profile-preview';

export const publicMarketPreparedPaths=PUBLIC_MARKET_PREPARED_PATHS;
export type PublicMarketRenderInput={material:string;generation:string;template:string;path?:string;renderBuild?:string};
export type PublicMarketSelectedState={catalog:PublicMarketDocumentSeed['catalog'];history:ReturnType<typeof parseMarketHistory>;asOfPulse:number;capitalization?:PublicMarketDocumentSeed['capitalization']|null;generation:string;path?:string;compressCatalog?:boolean;profileUsername?:string};
const prepared=new Map<string,Promise<{catalog:ReturnType<typeof parsePublicMarket>;history:ReturnType<typeof parseMarketHistory>;asOfPulse:number;capitalization:ReturnType<typeof parseMarketCapSource>|null}>>();
const compressedCatalogs=new WeakMap<PublicMarketDocumentSeed['catalog'],{packet:{gzipB64u:string;bytes:number};large:boolean}>();
export function compressedCatalog(catalog:PublicMarketDocumentSeed['catalog']){
 const held=compressedCatalogs.get(catalog);if(held)return held;
 const packed=packPublicCatalogArtwork(catalog),bytes=Buffer.from(JSON.stringify(packed));
 // Packing can make repeated portraits small; the uncompressed alternative
 // still repeats them. Select the format using that held input size as well.
 const repeated=packed.items.reduce((size,row,index)=>size+(row!==catalog.items[index]?Buffer.byteLength(catalog.items[index]!.ownerAvatarUrl!):0),0);
 const value={packet:{gzipB64u:gzipSync(bytes,{level:6}).toString('base64url'),bytes:bytes.length},large:bytes.length+repeated>1024*1024};
 compressedCatalogs.set(catalog,value);return value;
}
async function prepare(material:string,generation:string){
 const held=prepared.get(generation);if(held)return held;
 const job=(async()=>{
  const input=JSON.parse(material);if(input.schema==='bank.public-market.render-material.refs.v1'){const {catalog,history,capitalization,asOfPulse}=await prepareSelectedPublicReferenceState({material,generation});return{catalog,history,capitalization,asOfPulse};}const base=parsePublicMarket(input.membership,input.snapshot),catalog=input.sports?mergePublicSports(base,input.sports):base;
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
/** Project an already selected complete public family through the existing
 * Explorer. Build fallback and accepted-publication preparation share this
 * display-only renderer; it performs no reads or navigation selection. */
function selectedPublicMarketPresentation({catalog,history,asOfPulse,generation,path='explore',profileUsername}:PublicMarketSelectedState){
 if(!/^[a-f0-9]{64}$/.test(generation))throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 if(!(publicMarketPreparedPaths as readonly string[]).includes(path))throw Error('PUBLIC_MARKET_RENDER_PATH_INVALID');
 if(!catalog.complete||catalog.items.length>10000)throw Error('PUBLIC_MARKET_RENDER_COMPLETE_REQUIRED');
 if(profileUsername&&(profilePageUsername(profilePagePath(profileUsername))!==profileUsername||!selectHeldPublicProfile(profileUsername,catalog)))throw Error('PUBLIC_PROFILE_RENDER_COMPLETE_REQUIRED');
 if(!Number.isSafeInteger(asOfPulse)||asOfPulse<history.summary.serverPulse||asOfPulse<0||asOfPulse>1e10)throw Error('PUBLIC_MARKET_RENDER_STATE_REQUIRED');
 const format=new Intl.DateTimeFormat().resolvedOptions();
 const documentFormat={locale:format.locale,timeZone:format.timeZone},visibleCount=Math.min(50,catalog.items.length);
 const source={catalog,historyCatalog:catalog,pulse:asOfPulse,quoteStatus:'stale' as const,sportsStatus:catalog.items.some(item=>item.category==='sports')?'retained' as const:'missing' as const,status:'stale' as const,error:null,refresh:async()=>{}};
 const content=renderToString(<PublicDocumentCapabilitiesContext.Provider value={{intersectionObserver:false}}><PublicDocumentFormatContext.Provider value={documentFormat}><PublicExplorer active={false} initialPath={profileUsername?profilePagePath(profileUsername):'/'+path+'/'} initialSource={source} initialVisibleCount={visibleCount} initialAsOfPulse={asOfPulse} initialHistory={history}/></PublicDocumentFormatContext.Provider></PublicDocumentCapabilitiesContext.Provider>,{identifierPrefix:'public-explore-'});
 return {content,format:documentFormat,visibleCount};
}
/** Profile fragments reuse the identical presentation without serializing the
 * complete family/history into a seed that their caller would discard. */
export function renderSelectedPublicMarketContent(input:PublicMarketSelectedState){return selectedPublicMarketPresentation(input).content;}
export function renderSelectedPublicMarketState(input:PublicMarketSelectedState){
 const {catalog,history,asOfPulse,capitalization,generation,path='explore',compressCatalog=false}=input;
 const {content,format,visibleCount}=selectedPublicMarketPresentation(input);
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',generation,path,catalog,visibleCount,asOfPulse,format,history:packMarketHistory(history),...(capitalization?{capitalization}:{})};
 return {content,seed,seedScript:publicMarketDocumentSeedScript(seed,compressCatalog?compressedCatalog(catalog).packet:undefined)};
}
/** Called by accepted-publication preparation, never by the cold visitor. The
 * existing public projector selects display fields; arbitrary input fields do
 * not enter the saved seed. The exact source-input hash is a cache coordinate. */
export async function renderPublicMarketDocument({material,generation,template,path='explore',renderBuild}:PublicMarketRenderInput):Promise<string>{
 if(Buffer.byteLength(material)>32*1024*1024||!/^[a-f0-9]{64}$/.test(generation)||createHash('sha256').update(material).digest('hex')!==generation)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 if(!(publicMarketPreparedPaths as readonly string[]).includes(path))throw Error('PUBLIC_MARKET_RENDER_PATH_INVALID');
 // Use the same supported compressed seed as the complete build document.
 // Large accepted families must fit delivery without losing their held rows.
 const state=await prepare(material,generation),{content,seedScript}=renderSelectedPublicMarketState({...state,generation,path,compressCatalog:compressedCatalog(state.catalog).large});
 let replaced=false;
 const withoutSeed=template.replace(/<script id="public-market-seed" type="application\/json">[\s\S]*?<\/script>\s*/g,'');
 const html=withoutSeed.replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_all,start,end)=>{replaced=true;return start+content+end;});
 if(!replaced)throw Error('PUBLIC_MARKET_RENDER_TEMPLATE_INVALID');
 const aligned=alignPreparedPublicNavigation(html,path,content,generation,renderBuild);
 return aligned.replace('<script id="receiz-navigation"',()=>seedScript+'<script id="receiz-navigation"');
}

/** Publication prepares the exact owner document from the selected complete
 * family. A browser GET only streams these saved bytes. */
export async function renderPreparedProfileDocument({material,generation,template,path,renderBuild}:PublicMarketRenderInput):Promise<string>{
 if(!path||!/^profile\/[a-z0-9_]{3,24}$/.test(path)||Buffer.byteLength(material)>32*1024*1024||!/^[a-f0-9]{64}$/.test(generation)||createHash('sha256').update(material).digest('hex')!==generation)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 const state=await prepare(material,generation),{catalog}=state,username=path.slice('profile/'.length),profile=selectHeldPublicProfile(username,catalog);
 const items=catalog.items.filter(item=>item.category==='proof'&&item.ownerUsername===username);
 if(!profile||profile.nextCursor||profile.stats.originals!==items.length||profile.items.length!==items.length||profile.items.some(item=>!items.some(row=>row.id===item.id)))throw Error('PUBLIC_PROFILE_RENDER_COMPLETE_REQUIRED');
 // New owners use the same real view, carried family and hydration boundary
 // as compiled profiles. A profile-only SSR replica cannot replace that family.
 const {content,seedScript}=renderSelectedPublicMarketState({...state,generation,path:'explore',profileUsername:username,compressCatalog:compressedCatalog(catalog).large});
 const selectedTemplate=template.replace(/<script id="public-market-seed" type="application\/json">[\s\S]*?<\/script>\s*/g,'').replace('<script id="receiz-navigation"',()=>seedScript+'<script id="receiz-navigation"');
 const html=profilePreviewHtml(selectedTemplate,username,profile,undefined,content,true);
 return alignPreparedPublicNavigation(html,path,undefined,generation,renderBuild);
}

/** Data-only public catalog for the existing background reader. This never
 * replaces the account entry document or carries its navigation/runtime. */
export async function renderPreparedBankDocument({material,generation,path}:PublicMarketRenderInput):Promise<string>{
 if(path!=='bank'||Buffer.byteLength(material)>32*1024*1024||!/^[a-f0-9]{64}$/.test(generation)||createHash('sha256').update(material).digest('hex')!==generation)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 const {catalog,history,asOfPulse,capitalization}=await prepare(material,generation),format=new Intl.DateTimeFormat().resolvedOptions();
 const seed:PublicMarketDocumentSeed={schema:'bank.public-market.document.v1',generation,path,catalog,visibleCount:Math.min(50,catalog.items.length),asOfPulse,format:{locale:format.locale,timeZone:format.timeZone},history:packMarketHistory(history),...(capitalization?{capitalization}:{})};
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Public Market state</title></head><body>'+publicMarketDocumentSeedScript(seed,compressedCatalog(catalog).packet)+'</body></html>';
}

/** Separate saved entry representation. The account template is unchanged;
 * only the same public display seed and a data-document identity hint travel
 * with it. Neither the hint nor this HTML admits private/financial authority. */
export async function renderPreparedBankEntryDocument(input:PublicMarketRenderInput):Promise<string>{
 if(input.path!=='bank-entry'||!input.renderBuild||!/^[a-f0-9]{64}$/.test(input.renderBuild)||!/<div id="root"[ >]/.test(input.template)||input.template.split('</body>').length!==2||/id="bank-public-market-(?:seed|hint)"/.test(input.template))throw Error('PUBLIC_BANK_ENTRY_TEMPLATE_INVALID');
 const data=await renderPreparedBankDocument({...input,path:'bank'}),script=data.match(/<script id="public-market-seed" type="application\/json">[\s\S]*?<\/script>/)?.[0];
 if(!script)throw Error('PUBLIC_BANK_ENTRY_SEED_REQUIRED');
 const hint={generation:input.generation,build:input.renderBuild,bodySha256:createHash('sha256').update(data).digest('hex')};
 const aligned=alignPreparedPublicNavigation(input.template,'bank-entry',undefined,input.generation,input.renderBuild);
 const html=aligned.replace('</body>',()=>script.replace('id="public-market-seed"','id="bank-public-market-seed"')+'<script id="bank-public-market-hint" type="application/json">'+JSON.stringify(hint)+'</script></body>');
 if(Buffer.byteLength(html)>32*1024*1024)throw Error('PUBLIC_BANK_ENTRY_CAPACITY');return html;
}
