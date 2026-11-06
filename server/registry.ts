import type {IncomingMessage,ServerResponse} from 'node:http';
import {Readable} from 'node:stream';
import type {ReadableStream as NodeReadableStream} from 'node:stream/web';
import type {Plugin} from 'vite';
import {institutionDirectoryRecords} from '../src/content/institution-scorecard.mjs';
import {REGISTRY_MAX_PROOF_BYTES} from '../src/registry/types.js';
import {registryStore,type RegistryStore} from './registry-store.js';
import {admitRegistryProof,boundedRegistryBytes,RegistryProofError} from './registry-proof.js';
import {registryDocumentResponse} from './registry-document.js';
const PREFIX='/api/bank/registry';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const messages:Record<string,string>={
 REGISTRY_PUBLICATION_UNAVAILABLE:'Public record updates are temporarily unavailable. Your institution’s current record has been preserved.',
 REGISTRY_PROOF_INVALID:'This file is not a verified passing conformance Original. Upload the original PNG certificate with its complete evidence and canonical seal.',
 REGISTRY_INSTITUTION_MISMATCH:'The Original names a different assessed implementation. Upload the passing Original for this institution’s exact registered name.',
 REGISTRY_PASSING_PROOF_REQUIRED:'A complete passing conformance Original is required for this assessed scope.',
 REGISTRY_OFFICIAL_PROOF_REQUIRED:'Publish this same Original at the institution’s listed official proof address, then retry. The Registry checks the address automatically.',
 REGISTRY_OFFICIAL_PROOF_MISMATCH:'The official proof address contains a different file. Publish this exact Original there, then retry.',
 REGISTRY_PROOF_CAPACITY:'Upload an Original PNG no larger than 4 MiB.',
 REGISTRY_PROOF_REQUIRED:'Choose the original passing PNG certificate.',
};
function failure(code:string,status:number){return Response.json({ok:false,code,message:messages[code]??'The Registry could not accept this request. The current record has been preserved.'},{status,headers});}
export function createRegistryHandler(ports:{store?:()=>RegistryStore|null}={}) {
 return async function handle(request:Request):Promise<Response> {
  const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
  if(url.searchParams.get('document')==='1'||['/registry','/registry/index.html','/institutions/scorecard','/institutions/scorecard/index.html'].includes(path)){
   if(!['GET','HEAD'].includes(request.method))return failure('REGISTRY_METHOD_NOT_ALLOWED',405);
   try{return await registryDocumentResponse(request,(ports.store??registryStore)());}catch{return failure('REGISTRY_DOCUMENT_UNAVAILABLE',503);}
  }
  if(path!==PREFIX&&!path.startsWith(PREFIX+'/'))return failure('REGISTRY_NOT_FOUND',404);
  if(!['GET','HEAD','POST'].includes(request.method))return failure('REGISTRY_METHOD_NOT_ALLOWED',405);
  const suffix=path.slice(PREFIX.length),originalMatch=/^\/original\/([a-z0-9-]+)\/([a-f0-9]{64})$/.exec(suffix);
  const institution=suffix&&!originalMatch?institutionDirectoryRecords.find(row=>'/'+row.id===suffix):undefined;
  if(suffix&&!originalMatch&&!institution)return failure('REGISTRY_NOT_FOUND',404);
  if(originalMatch&&!institutionDirectoryRecords.some(row=>row.id===originalMatch[1]))return failure('REGISTRY_NOT_FOUND',404);
  if(request.method==='POST'&&!institution||request.method!=='POST'&&institution)return failure('REGISTRY_METHOD_NOT_ALLOWED',405);
  if(request.method==='POST'){
   if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return failure('REGISTRY_ORIGIN_REFUSED',403);
   if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='image/png')return failure('REGISTRY_MEDIA_TYPE_REFUSED',415);
   if(Number(request.headers.get('content-length'))>REGISTRY_MAX_PROOF_BYTES)return failure('REGISTRY_PROOF_CAPACITY',413);
  }
  try {
   const store=(ports.store??registryStore)();
   if(!store){
    if(!suffix&&request.method!=='POST')return Response.json({schema:'bank.registry.public.v1',publishingAvailable:false,records:[]},{headers});
    return failure('REGISTRY_PUBLICATION_UNAVAILABLE',503);
   }
   if(originalMatch){
    const bytes=await store.original(originalMatch[1],originalMatch[2]);
    if(!bytes)return failure('REGISTRY_NOT_FOUND',404);
    return new Response(request.method==='HEAD'?null:new Uint8Array(bytes),{headers:{...headers,'Content-Type':'image/png','Content-Disposition':`inline; filename="${originalMatch[1]}-conformance-${originalMatch[2].slice(0,12)}.png"`,'Cache-Control':'public, max-age=31536000, immutable'}});
   }
   if(request.method==='HEAD')return new Response(null,{status:200,headers});
   if(!suffix)return Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:await store.list()},{headers});
   const bytes=await boundedRegistryBytes(request.body,request.signal);
   const record=await admitRegistryProof(institution!,bytes);
   const entry=await store.append(record,bytes);
   return Response.json({ok:true,entry},{headers});
  }catch(cause){
   if(cause instanceof RegistryProofError)return failure(cause.code,cause.status);
   return failure('REGISTRY_PUBLICATION_UNAVAILABLE',503);
  }
 };
}
export const handleRegistry=createRegistryHandler();
/** Identical byte-preserving handler locally and in the production function. */
export function registryPlugin():Plugin {
 const install=(server:{middlewares:{use:(handler:(req:IncomingMessage,res:ServerResponse,next:(error?:unknown)=>void)=>void)=>unknown}})=>{
  server.middlewares.use((req,res,next)=>{
   const path=req.url?.split('?')[0]?.replace(/\/$/,'');
   if(path!==PREFIX&&!req.url?.startsWith(PREFIX+'/')&&!['/registry','/registry/index.html','/institutions/scorecard','/institutions/scorecard/index.html'].includes(path??''))return next();
   const abort=new AbortController(),stop=()=>abort.abort();req.once('aborted',stop);
   const host=req.headers.host??'localhost',scheme=/^(localhost|127\.0\.0\.1)(:|$)/.test(host)?'http':'https';
   const body=req.method==='POST'?Readable.toWeb(req) as unknown as ReadableStream<Uint8Array>:undefined;
   const request=new Request(`${scheme}://${host}${req.url}`,{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter((entry):entry is [string,string]=>typeof entry[1]==='string')),body,signal:abort.signal,...body?{duplex:'half'}:{}});
   void handleRegistry(request).then(async response=>{
    res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));
    if(!response.body){res.end();return;}
    const stream=Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>);
    stream.on('error',error=>res.destroy(error));stream.pipe(res);
   }).catch(next).finally(()=>req.off('aborted',stop));
  });
 };
 return {name:'bankeiz-registry-proof-publication',configureServer:install,configurePreviewServer:install};
}
