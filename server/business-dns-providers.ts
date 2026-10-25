import type {BusinessDnsConnection} from '../src/receiz/business-dns-tools.js';
import {createCloudflareBusinessDnsConnection} from './business-dns-cloudflare.js';
import {createDigitalOceanDnsConnection,createDnsimpleDnsConnection,createGoDaddyDnsConnection,createPorkbunDnsConnection,createVercelDnsConnection} from './business-dns/registrars.js';
import {createAzureDnsConnection,createGoogleCloudDnsConnection,createRoute53DnsConnection,type Route53DnsApi} from './business-dns/cloud.js';
import {createNamecheapDnsConnection,type NamecheapDnsApi} from './business-dns/namecheap.js';
import {inDnsZone,type DnsConnectionOwner} from './business-dns/engine.js';
import type {DnsHttpOwner} from './business-dns/http.js';
export const businessDnsProviderCatalog=Object.freeze([
 {id:'cloudflare',label:'Cloudflare'},{id:'godaddy',label:'GoDaddy'},{id:'vercel',label:'Vercel'},{id:'digitalocean',label:'DigitalOcean'},{id:'dnsimple',label:'DNSimple'},{id:'porkbun',label:'Porkbun'},{id:'route53',label:'AWS Route 53'},{id:'google-cloud-dns',label:'Google Cloud DNS'},{id:'azure-dns',label:'Azure DNS'},{id:'namecheap',label:'Namecheap'},
] as const);
export type BusinessDnsProviderId=typeof businessDnsProviderCatalog[number]['id'];
export type ConnectedDnsProvider=(DnsHttpOwner&({provider:'cloudflare';zoneId:string}|{provider:'godaddy'|'vercel'|'digitalocean'|'porkbun'}|{provider:'dnsimple';providerAccountId:string}|{provider:'google-cloud-dns';projectId:string;managedZone:string}|{provider:'azure-dns';subscriptionId:string;resourceGroup:string}))|(DnsConnectionOwner&({provider:'route53';hostedZoneId:string;api:Route53DnsApi}|{provider:'namecheap';sld:string;tld:string;allowFullZoneSave:boolean;api:NamecheapDnsApi}));
/** Only a trusted secure-connection host supplies this private configuration.
 * It is not parsed from chat/tool JSON, and is never returned to a model. */
export function createConnectedDnsProvider(config:ConnectedDnsProvider,owner:{accountUid:string;hostname:string}):BusinessDnsConnection|null{
 config.assertOpen();if(config.accountUid!==owner.accountUid)throw Error('BUSINESS_DNS_OWNER_MISMATCH');if(!inDnsZone(owner.hostname,config.zoneName))return null;
 switch(config.provider){
  case 'cloudflare':return createCloudflareBusinessDnsConnection({...config,request:(path,init)=>config.request('https://api.cloudflare.com/client/v4'+path,{...init,method:init.method,credentials:'omit',redirect:'error'})});
  case 'godaddy':return createGoDaddyDnsConnection(config);
  case 'vercel':return createVercelDnsConnection(config);
  case 'digitalocean':return createDigitalOceanDnsConnection(config);
  case 'dnsimple':return createDnsimpleDnsConnection(config);
  case 'porkbun':return createPorkbunDnsConnection(config);
  case 'google-cloud-dns':return createGoogleCloudDnsConnection(config);
  case 'azure-dns':return createAzureDnsConnection(config);
  case 'route53':return createRoute53DnsConnection(config);
  case 'namecheap':return createNamecheapDnsConnection(config);
  default:return null;
 }
}
export type DnsConnectionAction={status:'connect';provider:BusinessDnsProviderId;action:{label:string;href:string}}|{status:'ready'|'manual';provider:BusinessDnsProviderId};
/** Headless one-action connection handoff for later chat integration. The actual
 * broker/provider owns authorization, callback state, persistence and grants.
 * This module creates no auth session, token, issuer or fake consent endpoint. */
export function createDnsConnectionSetup(input:{accountUid:string;hostname:string;authorizationOrigins:readonly string[];lookup(provider:BusinessDnsProviderId,hostname:string):Promise<ConnectedDnsProvider|null>;authorize(provider:BusinessDnsProviderId,hostname:string):Promise<{accountUid:string;provider:string;hostname:string;url:string}|null>;assertOpen():void}){
 const provider=(id:BusinessDnsProviderId)=>{const found=businessDnsProviderCatalog.find(row=>row.id===id);if(!found)throw Error('BUSINESS_DNS_PROVIDER_INVALID');return found;};
 async function connection(id:BusinessDnsProviderId){input.assertOpen();provider(id);const config=await input.lookup(id,input.hostname);input.assertOpen();if(!config)return null;if(config.provider!==id)throw Error('BUSINESS_DNS_CONNECTION_MISMATCH');return createConnectedDnsProvider(config,{accountUid:input.accountUid,hostname:input.hostname});}
 return Object.freeze({connection,async connect(id:BusinessDnsProviderId):Promise<DnsConnectionAction>{
  input.assertOpen();const selected=provider(id);if((await connection(id))?.canWrite===true)return{status:'ready',provider:id};
  const authorization=await input.authorize(id,input.hostname);input.assertOpen();if(!authorization)return{status:'manual',provider:id};
  if(authorization.accountUid!==input.accountUid||authorization.provider!==id||authorization.hostname!==input.hostname)throw Error('BUSINESS_DNS_CONNECTION_MISMATCH');
  const url=new URL(authorization.url);if(authorization.url.length>8192||[...url.searchParams.keys()].some(key=>/^(?:api[-_]?key|secret(?:api[-_]?key)?|client[-_]?secret|password|cookie|authorization|access[-_]?token|refresh[-_]?token)$/i.test(key))||url.protocol!=='https:'||url.username||url.password||url.hash||!input.authorizationOrigins.includes(url.origin))throw Error('BUSINESS_DNS_AUTHORIZATION_URL_INVALID');
  return{status:'connect',provider:id,action:{label:'Connect '+selected.label,href:url.href}};
 }});
}
