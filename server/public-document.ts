import type {IncomingMessage,ServerResponse} from 'node:http';
import {Readable} from 'node:stream';
import type {ReadableStream as NodeReadableStream} from 'node:stream/web';
import {safePublicDocumentUrl} from '../src/receiz/public-document.js';
/** Streams one public PDF with native byte ranges. No buffering, source
 * cache, credentials, account writes or automatic paid unlocks. */
export async function handlePublicDocument(request:Request):Promise<Response>{
 const u=new URL(request.url),q=u.searchParams,headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 const target=[...q.keys()].length===2&&q.getAll('source').length===1&&q.getAll('asset').length===1?safePublicDocumentUrl(q.get('source'),q.get('asset')??''):null,range=request.headers.get('range');
 if(u.pathname!=='/api/bank/public-document'||!target||range&&(!/^bytes=(?:\d{1,12}-\d{0,12}|-\d{1,12})$/.test(range)))return new Response(null,{status:400,headers});
 try{
  const upstream=await fetch(target,{method:request.method,credentials:'omit',redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(90_000)]),headers:{accept:'application/pdf','accept-encoding':'identity',...(range?{range}:{})}});
  if(!upstream.ok){await upstream.body?.cancel();return new Response(null,{status:[402,403,404,409,416].includes(upstream.status)?upstream.status:503,headers});}
  if(upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/pdf'||Number(upstream.headers.get('content-length'))>128*1024*1024){await upstream.body?.cancel();return new Response(null,{status:415,headers});}
  const output=new Headers({...headers,'Content-Type':'application/pdf','Content-Disposition':'inline','X-Frame-Options':'SAMEORIGIN'});
  for(const key of ['accept-ranges','content-range','content-length']){const value=upstream.headers.get(key);if(value&&!upstream.headers.has('content-encoding'))output.set(key,value);}
  let length=0;const body=upstream.body?.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){length+=chunk.length;if(length>128*1024*1024){controller.error(Error('Document exceeds supported size.'));return;}controller.enqueue(chunk);}}));
  return new Response(request.method==='HEAD'?null:body,{status:upstream.status,headers:output});
 }catch{return new Response(null,{status:503,headers});}
}
export async function publicDocumentMiddleware(req:IncomingMessage,res:ServerResponse,next:()=>void){
 if(req.url?.split('?')[0]!=='/api/bank/public-document'){next();return;}
 const controller=new AbortController();res.once('close',()=>controller.abort());const result=await handlePublicDocument(new Request(new URL(req.url,'http://localhost'),{method:req.method,headers:new Headers(Object.entries(req.headers).flatMap(([key,value])=>typeof value==='string'?[[key,value] as [string,string]]:[])),signal:controller.signal}));
 res.writeHead(result.status,Object.fromEntries(result.headers));if(!result.body){res.end();return;}const stream=Readable.fromWeb(result.body as unknown as NodeReadableStream<Uint8Array>);stream.on('error',()=>res.destroy());res.once('close',()=>stream.destroy());stream.pipe(res);
}
