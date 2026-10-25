import {relayBusinessSetup} from './business-setup.js';
import {createBusinessDnsTools} from '../src/receiz/business-dns-tools.js';
import {businessDnsProviderCatalog,type BusinessDnsProviderId} from './business-dns-providers.js';
import {createUserDnsBroker} from './business-dns/user-broker.js';
import {createBusinessDnsBroker,readBusinessDnsBindings} from './business-dns-connect.js';
const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
/** Callback is a delivery hint only. The retained owner operation re-admits
 * Receiz ID and rechecks the actual provider grant before any DNS write. */
export function dnsConnectionReturn(request:Request){
 const url=new URL(request.url);return new Response(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Return to your conversation</title><body><p>Return to your conversation to continue.</p><script>if(window.opener){window.opener.postMessage({type:'bankeiz:dns-connected'},${JSON.stringify(url.origin)});window.close();}</script></body></html>`,{headers:{...headers,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; frame-ancestors 'none'","referrer-policy":"no-referrer"}});
}
export async function relayBusinessDns(request:Request):Promise<Response>{
 const url=new URL(request.url);const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
 if(request.method!=='POST'||url.search||request.headers.get('origin')!==url.origin||request.headers.has('cookie')||request.headers.has('authorization')||request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'BUSINESS_DNS_REQUEST_REFUSED'},403);
 try{
  const reader=request.body?.getReader();if(!reader)return json({error:'BUSINESS_DNS_INPUT_INVALID'},400);let length=0,body='';const decode=new TextDecoder('utf-8',{fatal:true});try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>64*1024)throw Error('BUSINESS_DNS_INPUT_INVALID');body+=decode.decode(part.value,{stream:true});}body+=decode.decode();}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const input=JSON.parse(body);if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['accountUid','continuation','provider','hostname','action'].includes(key))||!['connect','apply'].includes(input.action)||typeof input.hostname!=='string'||!businessDnsProviderCatalog.some(row=>row.id===input.provider))return json({error:'BUSINESS_DNS_INPUT_INVALID'},400);
  const response=await relayBusinessSetup(new Request(url.origin+'/api/bank/business/setup',{method:'POST',headers:{'content-type':'application/json','origin':url.origin},signal:request.signal,body:JSON.stringify({accountUid:input.accountUid,continuation:input.continuation,tool:'business_inspect_domain',args:{}})})),admitted=await response.json();
  if(admitted.outcome!=='accepted'||admitted.accountUid!==input.accountUid)return json({error:'BUSINESS_DNS_OWNER_REQUIRED'},403);
  const tools=createBusinessDnsTools({accountUid:admitted.accountUid,assertOpen:()=>request.signal.throwIfAborted(),connection:async()=>null,execute:async()=>admitted}),view=await tools.instructions();
  if(view.hostname!==input.hostname)return json({error:'BUSINESS_DNS_HOSTNAME_CHANGED'},409);
  const config=readBusinessDnsBindings(process.env.BANKEIZ_DNS_BINDINGS_JSON),sdk=await import('@vercel/connect'),provider=input.provider as BusinessDnsProviderId,broker=config.some(row=>row.accountUid===admitted.accountUid&&row.hostname===view.hostname&&row.provider===provider)?createBusinessDnsBroker({bindings:config,sdk,vercelToken:process.env.VERCEL==='1'?undefined:process.env.VERCEL_TOKEN}):createUserDnsBroker({sdk,vercelToken:process.env.VERCEL==='1'?undefined:process.env.VERCEL_TOKEN});
  let connection:Awaited<ReturnType<typeof broker.connection>>;
  try{connection=await broker.connection(admitted.accountUid,view.hostname,provider,()=>request.signal.throwIfAborted());}
  catch(cause){
   const code=cause instanceof Error?cause.message:'';
   if(['BUSINESS_DNS_ZONE_NOT_FOUND','BUSINESS_DNS_ZONE_AMBIGUOUS'].includes(code)){const reason=code==='BUSINESS_DNS_ZONE_AMBIGUOUS'?'More than one DNS zone matches this domain. Connect a credential scoped to the account and zone you want to use.':'This domain is not in the connected DNS account, or its DNS is managed elsewhere. Connect the account that manages its DNS.';return json({accountUid:admitted.accountUid,hostname:view.hostname,status:'manual',reason,result:{status:'manual',records:[],reason}});}
   if(['BUSINESS_DNS_CONNECTION_CREDENTIAL_INVALID','BUSINESS_DNS_RECONNECT_REQUIRED','DNS_MCP_RECONNECT_REQUIRED'].includes(code))connection=null;else throw cause;
  }
  try{ request.signal.throwIfAborted();
  if(input.action==='connect'){
   if(connection?.canWrite)return json({accountUid:admitted.accountUid,hostname:view.hostname,status:'ready'});
   const authorization=await broker.authorize(admitted.accountUid,view.hostname,provider,url.origin+'/api/bank/business/dns-return');
   return json({accountUid:admitted.accountUid,hostname:view.hostname,...(authorization?{status:'connect',action:{label:'Connect '+businessDnsProviderCatalog.find(row=>row.id===provider)!.label,href:authorization.url}}:{status:'manual'})});
  }
  if(!connection?.canWrite)return json({accountUid:admitted.accountUid,hostname:view.hostname,result:{status:'manual',records:[],reason:'Provider access is not connected. Use the exact native instructions.'}});
  const result=await connection.apply({hostname:view.hostname,connectionOptions:view.connectionOptions,verificationRecords:view.verificationRecords});return json({accountUid:admitted.accountUid,hostname:view.hostname,result});
  }finally{const close=(connection as {close?:()=>Promise<void>}|null)?.close;if(close)await close();}
 }catch{return json({error:'BUSINESS_DNS_RESULT_UNCONFIRMED'},503);}
}
