import {readFile} from 'node:fs/promises';
import {handlePreparedPublicMarket} from './prepared-public-market.js';
import {preparedPublicPagePath} from '../src/receiz/prepared-public-page-path.js';

const templates=new Map<string,Promise<Uint8Array>>();
function entry(path:string){
 const file=path==='bank'?'dist/index.html':'dist/'+path+'/index.html';
 let pending=templates.get(file);if(!pending){pending=readFile(file).then(bytes=>new Uint8Array(bytes));templates.set(file,pending);void pending.catch(()=>{if(templates.get(file)===pending)templates.delete(file);});}return pending;
}
function stream(bytes:Uint8Array){let offset=0;return new ReadableStream<Uint8Array>({pull(controller){if(offset===bytes.length){controller.close();return;}const end=Math.min(offset+32768,bytes.length);controller.enqueue(bytes.subarray(offset,end));offset=end;}});}
/** Canonical entry delivery. Query/cookie/private account data never enters
 * public preparation. An unavailable projection preserves the existing exact
 * opening document without labelling that historical fallback as current. */
export async function handlePreparedPublicDocument(request:Request,provided?:{prepared?(request:Request):Promise<Response>;entry?(path:string):Promise<Uint8Array>}):Promise<Response>{
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 const url=new URL(request.url),path=preparedPublicPagePath(url.searchParams.get('path'));
 if(!path||url.searchParams.getAll('path').length!==1)return new Response(null,{status:404});
 const selected=new URL('/api/explore',url.origin);selected.searchParams.set('path',path);
 if(path.startsWith('ledger')&&url.searchParams.getAll('source').length===1&&/^[a-f0-9]{64}$/.test(url.searchParams.get('source')!))selected.searchParams.set('source',url.searchParams.get('source')!);
 let response:Response|undefined;
 try{response=await(provided?.prepared??handlePreparedPublicMarket)(new Request(selected,{method:request.method,signal:request.signal,headers:{accept:'text/html'}}));if(request.signal.aborted){await response.body?.cancel().catch(()=>{});throw request.signal.reason;}if(response.ok)return response;}
 catch(error){if(request.signal.aborted)throw error;}
 await response?.body?.cancel().catch(()=>{});if(request.signal.aborted)throw request.signal.reason;
 let bytes:Uint8Array;try{bytes=await(provided?.entry??entry)(path);}catch(error){if(request.signal.aborted)throw error;return new Response('This public view is temporarily unavailable. Please try again.',{status:503,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});}if(request.signal.aborted)throw request.signal.reason;
 return new Response(request.method==='HEAD'?null:stream(bytes),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-transform','x-content-type-options':'nosniff','x-receiz-public-html-state':'historical'}});
}
