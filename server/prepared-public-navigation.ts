import {profileNavigationHtml} from './profile-navigation.js';
import {PUBLIC_MARKET_PREPARED_PATHS} from '../src/receiz/prepared-public-page-path.js';

const affected=new Set([...PUBLIC_MARKET_PREPARED_PATHS.map(path=>'/'+path+'/'),'/ledger/','/ledger/proofs/','/analytics/','/feed/']);
/** Other affected pages use their already prepared document through the
 * existing intent loader. Retain their lightweight route metadata, never an older body or
 * duplicate the complete carried catalog in this document's navigation. */
export function alignPreparedPublicNavigation(html:string,path:string,content:string|undefined,preparedRevision?:string,preparedBuild?:string):string{
 const current=path==='bank-entry'||path==='bank'?'/':'/'+path.replace(/^\//,'').replace(/\/$/,'')+'/';
 return profileNavigationHtml(html,[current],pages=>{
  for(const key of Object.keys(pages))if(affected.has(key)&&key!==current){const {preparedRevision:_revision,preparedHtmlSha256:_sha,...page}=pages[key];pages[key]={...page,content:'',...(preparedBuild?{preparedBuild}:{})};}
  if(pages[current]&&current==='/discover/'){const {preparedRevision:_revision,preparedBuild:_build,preparedHtmlSha256:_sha,...page}=pages[current];pages[current]={...page,...(content===undefined?{}:{content})};}
  else if(pages[current]&&current!=='/')pages[current]={...pages[current],...(content===undefined?{}:{content}),...(preparedRevision?{preparedRevision}:{}),...(preparedBuild?{preparedBuild}:{})};
 });
}
