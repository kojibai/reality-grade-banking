import {profileNavigationHtml} from './profile-navigation.js';
import {PUBLIC_MARKET_PREPARED_PATHS} from '../src/receiz/prepared-public-page-path.js';

const affected=new Set([...PUBLIC_MARKET_PREPARED_PATHS.map(path=>'/'+path+'/'),'/ledger/','/ledger/proofs/','/feed/']);
/** Other affected pages use their already prepared document through the
 * existing intent loader. Retain their lightweight route metadata, never an older body or
 * duplicate the complete carried catalog in this document's navigation. */
export function alignPreparedPublicNavigation(html:string,path:string,content:string|undefined,preparedRevision?:string,preparedBuild?:string):string{
 const current=path==='bank-entry'||path==='bank'?'/':'/'+path.replace(/^\//,'').replace(/\/$/,'')+'/',compacted=profileNavigationHtml(html,[current]);
 return compacted.replace(/(<script id="receiz-navigation" type="application\/json">)([\s\S]*?)(<\/script>)/,(_all,start,json,end)=>{
  const navigation=JSON.parse(json),pages=navigation.pages;if(!pages||typeof pages!=='object'||Array.isArray(pages))return start+json+end;
  for(const key of Object.keys(pages))if(affected.has(key)&&key!==current){const {preparedRevision:_revision,preparedHtmlSha256:_sha,...page}=pages[key];pages[key]={...page,content:'',...(preparedBuild?{preparedBuild}:{})};}
  if(pages[current]&&current==='/discover/'){const {preparedRevision:_revision,preparedBuild:_build,preparedHtmlSha256:_sha,...page}=pages[current];pages[current]={...page,...(content===undefined?{}:{content})};}
  else if(pages[current]&&current!=='/')pages[current]={...pages[current],...(content===undefined?{}:{content}),...(preparedRevision?{preparedRevision}:{}),...(preparedBuild?{preparedBuild}:{})};
  return start+JSON.stringify(navigation).replaceAll('<','\\u003c')+end;
 });
}
