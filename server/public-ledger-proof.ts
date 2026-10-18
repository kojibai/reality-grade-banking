import type {IncomingMessage,ServerResponse} from 'node:http';
import type {Plugin} from 'vite';
const PATH='/api/bank/ledger-proof',MAX_WRITE=4*1024*1024,MAX_READ=34*1024*1024;
export function resolvePublicLedgerTarget(requestUrl:string):URL|null{
 const url=new URL(requestUrl,'http://localhost');if(url.pathname!==PATH||[...url.searchParams.keys()].some(key=>!['source','discovery','cursor','limit'].includes(key)||url.searchParams.getAll(key).length!==1))return null;
 if(url.search){
  if(url.searchParams.has('source')){if(url.searchParams.size!==1||!/^[a-f0-9]{64}$/.test(url.searchParams.get('source')!))return null;}
  else if(url.searchParams.get('discovery')==='1'){if(url.searchParams.has('cursor')&&!/^(0|[1-9][0-9]{0,6})$/.test(url.searchParams.get('cursor')!))return null;const limit=Number(url.searchParams.get('limit')??50);if(!Number.isInteger(limit)||limit<1||limit>100)return null;}
  else return null;
 }
 return new URL('/api/ledger/proof'+url.search,'https://receiz.com');
}
async function readBounded(body:ReadableStream<Uint8Array>|null,max:number){
 if(!body)throw Error('NO_BYTES');const reader=body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>max)throw Error('CAPACITY');parts.push(chunk.value);}}finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
export async function relayPublicLedger(request:Request):Promise<Response>{
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},target=resolvePublicLedgerTarget(request.url),fail=(status:number)=>Response.json({error:status===413?'PUBLIC_LEDGER_FILE_CAPACITY':'PUBLIC_LEDGER_SOURCE_UNAVAILABLE'},{status,headers});
 if(!target)return fail(400);if(!['GET','POST'].includes(request.method))return fail(405);
 try{
  let body:Uint8Array|undefined;
  if(request.method==='POST'){
   if(target.search||request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('content-type')?.split(';')[0]!=='application/json')return fail(403);
   if(Number(request.headers.get('content-length'))>MAX_WRITE)return fail(413);
   try{body=await readBounded(request.body,MAX_WRITE);}catch{return fail(413);}
  }
  const response=await fetch(target,{method:request.method,credentials:'omit',redirect:'error',headers:request.method==='POST'?{'Content-Type':'application/json',Origin:'https://bankeiz.com'}:{Accept:'application/json, application/vnd.receiz.bundle+json'},body:body?new Uint8Array(body):undefined,signal:AbortSignal.timeout(30_000)});
  if(Number(response.headers.get('content-length'))>MAX_READ)return fail(413);
  return new Response(await readBounded(response.body,MAX_READ),{status:response.status,headers:{...headers,'Content-Type':response.headers.get('content-type')??'application/octet-stream'}});
 }catch{return fail(503);}
}
export async function publicLedgerProofMiddleware(req:IncomingMessage,res:ServerResponse,next:()=>void){
 if(!req.url?.startsWith(PATH)){next();return;}
 const host=req.headers.host??'localhost',scheme=/^(localhost|127\.0\.0\.1)(:|$)/.test(host)?'http':'https';
 let body:Uint8Array|undefined;
 if(req.method==='POST'){
  const parts:Uint8Array[]=[];let size=0;for await(const part of req){const bytes=typeof part==='string'?new TextEncoder().encode(part):part;size+=bytes.length;if(size>MAX_WRITE){res.writeHead(413);res.end();return;}parts.push(bytes);}
  body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length;}
 }
 const response=await relayPublicLedger(new Request(`${scheme}://${host}${req.url}`,{method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter((entry):entry is [string,string]=>typeof entry[1]==='string')),body:body?new Uint8Array(body):undefined}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(new Uint8Array(await response.arrayBuffer()));
}
export function publicLedgerProofPlugin():Plugin{return{name:'bankeiz-public-ledger-proof',configureServer(server){server.middlewares.use((req,res,next)=>{void publicLedgerProofMiddleware(req,res,next);});},configurePreviewServer(server){server.middlewares.use((req,res,next)=>{void publicLedgerProofMiddleware(req,res,next);});}};}
