import type * as Connect from '@vercel/connect';
import type {BusinessDnsProviderId,ConnectedDnsProvider} from '../business-dns-providers.js';
import {createConnectedDnsProvider} from '../business-dns-providers.js';
import {dnsConnectorServiceMatches,dnsProviderConnection} from './catalog.js';
import {openProviderCredential} from './credentials.js';
import {discoverDnsCoordinates,dnsAncestors} from './discovery.js';
import {createDnsMcpClient} from './mcp-client.js';
import {createNamecheapMcpConnection} from './namecheap-mcp.js';
import {createPorkbunMcpConnection} from './porkbun-mcp.js';
type ConnectSdk=Pick<typeof Connect,'getConnectorMetadata'|'getTokenResponse'|'startAuthorization'>;
/** Stable project connector; actual grant always belongs to the proof-admitted
 * user subject. No app-key fallback, per-customer env rows or custom auth store. */
export function createUserDnsBroker(input:{sdk:ConnectSdk;request?:typeof fetch;vercelToken?:string}){
 const options=()=>input.vercelToken?{vercelToken:input.vercelToken}:{};
 const params=(uid:string,provider:BusinessDnsProviderId)=>{const row=dnsProviderConnection(provider);return{subject:{type:'user' as const,id:uid,issuer:'https://receiz.com'},scopes:row.scopes,...(row.resource?{resources:[row.resource]}:{})};};
 async function metadata(provider:BusinessDnsProviderId){const row=dnsProviderConnection(provider),actual=await input.sdk.getConnectorMetadata(row.uid,options());if(actual.uid!==row.uid||!dnsConnectorServiceMatches(actual.service,row.service)||actual.type!==row.type)throw Error('BUSINESS_DNS_CONNECTOR_MISMATCH');if(row.resource&&actual.vendor?.defaultResource!==row.resource)throw Error('BUSINESS_DNS_CONNECTOR_MISMATCH');if(actual.type==='api-key'&&actual.vendor?.subjectType!=='user')throw Error('BUSINESS_DNS_SHARED_CREDENTIAL_FORBIDDEN');return actual;}
 return Object.freeze({
  async connection(uid:string,hostname:string,provider:BusinessDnsProviderId,assertOpen:()=>void){
   if(!uid)throw Error('BUSINESS_DNS_OWNER_REQUIRED');dnsAncestors(hostname);assertOpen();const row=dnsProviderConnection(provider),actual=await metadata(provider);assertOpen();let grant:Awaited<ReturnType<ConnectSdk['getTokenResponse']>>;
   try{grant=await input.sdk.getTokenResponse(row.uid,params(uid,provider),{...options(),forceRefresh:true});}catch(cause){const code=cause&&typeof cause==='object'&&'code'in cause?String(cause.code):'';if(['no_token','user_authorization_required','authorization_required'].includes(code))return null;throw Error('BUSINESS_DNS_CONNECTION_UNCONFIRMED');}
   assertOpen();if(grant.connector.id!==actual.id||grant.connector.type!==actual.type||typeof grant.token!=='string'||!grant.token||!Number.isFinite(grant.expiresAt)||grant.expiresAt<=Date.now())throw Error('BUSINESS_DNS_GRANT_INVALID');
   if(row.endpoint){
    const client=createDnsMcpClient({endpoint:row.endpoint,token:grant.token,request:input.request,assertOpen});try{
     const tools=await client.tools(),write=provider==='namecheap'?'dns_records_save':'create_dns_record',read=provider==='namecheap'?'dns_records_get':'list_dns_records';
     if(!tools.includes(write)||!tools.includes(read)){await client.close();return null;}
     if(provider==='porkbun'){if(!tools.includes('ping')){await client.close();return null;}const permission=await client.call('ping',{});if(permission.status!=='SUCCESS'||!Array.isArray(permission.scopes)||!permission.scopes.some(scope=>scope==='full'||scope==='dns')){await client.close();return null;}}
     const zone=await discoverDnsCoordinates({provider,hostname,request:input.request??fetch,mcpCall:client.call,assertOpen});if(!zone){await client.close();throw Error('BUSINESS_DNS_ZONE_NOT_FOUND');}
     const common={accountUid:uid,zoneName:zone.zoneName,canWrite:true,assertOpen};const connection=provider==='namecheap'?createNamecheapMcpConnection({...common,call:(name,args)=>client.call(name,args)}):createPorkbunMcpConnection({...common,call:client.call});
     return Object.freeze({...connection,close:()=>client.close()});
    }catch(cause){await client.close();if(cause instanceof Error&&cause.message==='DNS_MCP_RECONNECT_REQUIRED')return null;throw cause;}
   }
   const credentials=await openProviderCredential({provider,credential:grant.token,request:input.request,assertOpen});
   try{
    const coordinates=await discoverDnsCoordinates({provider,hostname,request:credentials.request??input.request??fetch,projectId:credentials.projectId,awsList:credentials.awsList,assertOpen});assertOpen();if(!coordinates){credentials.close?.();throw Error('BUSINESS_DNS_ZONE_NOT_FOUND');}
    const request:typeof fetch=async(url,init)=>{const target=new URL(String(url));if(coordinates.teamId){if(target.origin!=='https://api.vercel.com'||target.searchParams.has('teamId'))throw Error('BUSINESS_DNS_PROVIDER_ORIGIN_INVALID');target.searchParams.set('teamId',coordinates.teamId);}return credentials.request!(target,init);};
    const config={provider,accountUid:uid,...coordinates,canWrite:true,assertOpen,request,...(credentials.awsApi?{api:credentials.awsApi}:{})};
    const connection=createConnectedDnsProvider(config as ConnectedDnsProvider,{accountUid:uid,hostname});if(!connection){credentials.close?.();return null;}return Object.freeze({...connection,close:async()=>credentials.close?.()});
   }catch(cause){credentials.close?.();if(cause instanceof Error&&cause.message==='BUSINESS_DNS_RECONNECT_REQUIRED')return null;throw cause;}
  },
  async authorize(uid:string,hostname:string,provider:BusinessDnsProviderId,callbackUrl:string){
   if(!uid)throw Error('BUSINESS_DNS_OWNER_REQUIRED');dnsAncestors(hostname);await metadata(provider);
   const actual=await input.sdk.startAuthorization(dnsProviderConnection(provider).uid,params(uid,provider),{...options(),callbackUrl,expiresInMs:10*60*1000,prompt:'consent'});
   const url=new URL(actual.url);if(url.protocol!=='https:'||url.username||url.password||url.hash||!['https://vercel.com','https://connect.vercel.com'].includes(url.origin)||[...url.searchParams.keys()].some(key=>/^(?:access_token|api_key|client_secret|password)$/i.test(key)))throw Error('BUSINESS_DNS_AUTHORIZATION_URL_INVALID');return{accountUid:uid,hostname,provider,url:url.href};
  },
 });
}
