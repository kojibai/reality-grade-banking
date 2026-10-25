import {createConnectedDnsProvider,type BusinessDnsProviderId,type ConnectedDnsProvider} from './business-dns-providers.js';
import {inDnsZone} from './business-dns/engine.js';
import type * as Connect from '@vercel/connect';
type ConnectSdk=Pick<typeof Connect,'getConnectorMetadata'|'getTokenResponse'|'startAuthorization'>;
/** Deployment-owned coordinates beneath the actual per-user OAuth grant.
 * Never accepted from a model, URL, callback or customer request. */
export type BusinessDnsBinding={accountUid:string;hostname:string;provider:BusinessDnsProviderId;zoneName:string;connectorId:string;service:string;scopes:string[];authorizationOrigins:string[];zoneId?:string;providerAccountId?:string;projectId?:string;managedZone?:string;subscriptionId?:string;resourceGroup?:string};
const origins:Partial<Record<BusinessDnsProviderId,string>>={cloudflare:'https://api.cloudflare.com',godaddy:'https://api.godaddy.com',vercel:'https://api.vercel.com',digitalocean:'https://api.digitalocean.com',dnsimple:'https://api.dnsimple.com','google-cloud-dns':'https://dns.googleapis.com','azure-dns':'https://management.azure.com'};
export function readBusinessDnsBindings(value:string|undefined):BusinessDnsBinding[]{
 if(!value)return[];if(value.length>128*1024)throw Error('BUSINESS_DNS_HOST_CONFIGURATION_INVALID');const rows:unknown=JSON.parse(value);if(!Array.isArray(rows)||rows.length>200)throw Error('BUSINESS_DNS_HOST_CONFIGURATION_INVALID');
 const keys=['accountUid','hostname','provider','zoneName','connectorId','service','scopes','authorizationOrigins','zoneId','providerAccountId','projectId','managedZone','subscriptionId','resourceGroup'];
 for(const row of rows){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).some(key=>!keys.includes(key))||!['accountUid','hostname','zoneName','connectorId','service'].every(key=>typeof row[key]==='string'&&row[key].length>0&&row[key].length<=253)||!origins[row.provider as BusinessDnsProviderId]||!inDnsZone(row.hostname,row.zoneName)||!Array.isArray(row.scopes)||!row.scopes.length||row.scopes.some((scope:unknown)=>typeof scope!=='string'||scope==='*'||scope.length>160)||!Array.isArray(row.authorizationOrigins)||!row.authorizationOrigins.length||row.authorizationOrigins.some((origin:unknown)=>typeof origin!=='string'||!['https://vercel.com','https://connect.vercel.com'].includes(origin)))throw Error('BUSINESS_DNS_HOST_CONFIGURATION_INVALID');}
 const coordinates=rows.map(row=>[row.accountUid,row.hostname,row.provider].join(':'));if(new Set(coordinates).size!==coordinates.length)throw Error('BUSINESS_DNS_HOST_CONFIGURATION_INVALID');return rows as BusinessDnsBinding[];
}
export function createBusinessDnsBroker(input:{bindings:readonly BusinessDnsBinding[];sdk:ConnectSdk;request?:typeof fetch;vercelToken?:string}){
 const find=(uid:string,hostname:string,provider:BusinessDnsProviderId)=>input.bindings.find(row=>row.accountUid===uid&&row.hostname===hostname&&row.provider===provider);
 const options=()=>input.vercelToken?{vercelToken:input.vercelToken}:{};
 const params=(row:BusinessDnsBinding)=>({subject:{type:'user' as const,id:row.accountUid,issuer:'https://receiz.com'},scopes:row.scopes});
 async function metadata(row:BusinessDnsBinding){const result=await input.sdk.getConnectorMetadata(row.connectorId,options());if(result.type!=='oauth')throw Error('BUSINESS_DNS_SHARED_CREDENTIAL_FORBIDDEN');if(result.id!==row.connectorId&&result.uid!==row.connectorId||result.service!==row.service)throw Error('BUSINESS_DNS_CONNECTOR_MISMATCH');return result;}
 return Object.freeze({
  async connection(uid:string,hostname:string,provider:BusinessDnsProviderId,assertOpen:()=>void){
   const row=find(uid,hostname,provider);if(!row||!origins[row.provider])return null;assertOpen();const actual=await metadata(row);assertOpen();
   let grant:Awaited<ReturnType<ConnectSdk['getTokenResponse']>>;
   try{grant=await input.sdk.getTokenResponse(row.connectorId,params(row),{...options(),forceRefresh:true});}catch(cause){const code=cause&&typeof cause==='object'&&'code'in cause?cause.code:undefined;if(['no_token','user_authorization_required','authorization_required'].includes(String(code)))return null;throw cause;}
   assertOpen();if(grant.connector.type!=='oauth'||grant.connector.id!==actual.id||typeof grant.token!=='string'||!grant.token||grant.expiresAt<=Date.now())throw Error('BUSINESS_DNS_GRANT_INVALID');
   const request:typeof fetch=async(url,init)=>{assertOpen();const target=new URL(String(url));if(target.origin!==origins[row.provider]||target.username||target.password||target.hash)throw Error('BUSINESS_DNS_PROVIDER_ORIGIN_INVALID');const headers=new Headers(init?.headers);headers.set('Authorization','Bearer '+grant.token);return(input.request??fetch)(target,{...init,headers,credentials:'omit',redirect:'error'});};
   const coordinates={...row,accountUid:uid,zoneName:row.zoneName,canWrite:true,request,assertOpen};
   return createConnectedDnsProvider(coordinates as ConnectedDnsProvider,{accountUid:uid,hostname});
  },
  async authorize(uid:string,hostname:string,provider:BusinessDnsProviderId,callbackUrl:string){
   const row=find(uid,hostname,provider);if(!row)return null;await metadata(row);
   const actual=await input.sdk.startAuthorization(row.connectorId,params(row),{...options(),callbackUrl,expiresInMs:10*60*1000});
   const url=new URL(actual.url);if(url.protocol!=='https:'||url.username||url.password||url.hash||!row.authorizationOrigins.includes(url.origin)||[...url.searchParams.keys()].some(key=>/^(?:access_token|api_key|client_secret|password)$/i.test(key)))throw Error('BUSINESS_DNS_AUTHORIZATION_URL_INVALID');
   return{accountUid:uid,hostname,provider,url:url.href};
  },
 });
}
