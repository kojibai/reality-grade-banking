import {BANK_PUBLIC_ORIGIN} from './config';
import {openInvoiceOriginal,type InvoiceSource} from './invoice-source';
import {prepareProofMaterial,publishProofMaterial,readProofMaterial} from './proof-material-sharing';
const complete=new Map<string,InvoiceSource>(),reading=new Map<string,Promise<InvoiceSource>>();
function sourceHead(value:string):string{
 const url=new URL(value);if(url.origin!=='https://receiz.com'||url.username||url.password||url.search||!/^\/v\/[^/?#]+\/[^/?#]+\/[^/?#]+$/.test(url.pathname))throw Error('INVOICE_LINK_INVALID');
 const fields=new URLSearchParams(url.hash.slice(1));if(fields.getAll('material').length!==1||[...fields.keys()].some(key=>key!=='material')||!/^rmc[12]:[a-f0-9]{64}$/.test(fields.get('material')!))throw Error('INVOICE_LINK_INVALID');return url.href;
}
export function invoiceLinkSource(href:string):string{
 const url=new URL(href,BANK_PUBLIC_ORIGIN),fields=new URLSearchParams(url.hash.slice(1));if(!/^\/invoice\/view\/?$/.test(url.pathname)||url.search||fields.getAll('source').length!==1||[...fields.keys()].some(key=>key!=='source'))throw Error('INVOICE_LINK_INVALID');return sourceHead(fields.get('source')!);
}
export function knownInvoiceLink(href:string):InvoiceSource|null{try{return complete.get(invoiceLinkSource(href))??null;}catch{return null;}}
/** Explicit invoice sharing only. The actor already holds the native sealed
 * Original; publishing distributes the same bytes through the installed rail. */
export async function publishInvoiceLink(input:InvoiceSource,options:{fetcher?:typeof fetch;isCurrent():boolean}):Promise<string>{
 const assert=()=>{if(!options.isCurrent())throw Error('INVOICE_CONTEXT_CHANGED');};assert();
 const source=await openInvoiceOriginal(input.original);assert();if(source.artifactSha256!==input.artifactSha256)throw Error('INVOICE_SOURCE_CHANGED');
 const {headUrl,transport}=await prepareProofMaterial(source.original);assert();
 await publishProofMaterial(headUrl,assert,transport,options.fetcher);
 complete.set(headUrl,source);return `${BANK_PUBLIC_ORIGIN}/invoice/view/#${new URLSearchParams({source:headUrl})}`;
}
/** Only genuinely missing source uses remote transport. The same native
 * custody owns cold reopen, with canonical admission of exact bytes locally. */
export async function readInvoiceLink(href:string,options:{fetcher?:typeof fetch}={}):Promise<InvoiceSource>{
 const headUrl=invoiceLinkSource(href),held=complete.get(headUrl);if(held)return held;const existing=reading.get(headUrl);if(existing)return existing;
 const work=(async()=>{
  const material=await readProofMaterial(headUrl,options.fetcher),source=await openInvoiceOriginal(material.original);
  const visible=material.offlineRetained?source:Object.freeze({...source,offlineRetained:false});
  complete.set(headUrl,visible);return visible;
 })();reading.set(headUrl,work);try{return await work;}finally{if(reading.get(headUrl)===work)reading.delete(headUrl);}
}
