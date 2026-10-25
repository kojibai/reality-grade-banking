import {sign} from 'node:crypto';
import type {BusinessDnsProviderId} from '../business-dns-providers.js';
import {dnsObject} from './http.js';
import {providerJson} from './discovery.js';
import type {Route53DnsApi} from './cloud.js';
const origin:Partial<Record<BusinessDnsProviderId,string>>={cloudflare:'https://api.cloudflare.com',godaddy:'https://api.godaddy.com',vercel:'https://api.vercel.com',digitalocean:'https://api.digitalocean.com',dnsimple:'https://api.dnsimple.com','google-cloud-dns':'https://dns.googleapis.com','azure-dns':'https://management.azure.com'};
function invalid():never{throw Error('BUSINESS_DNS_CONNECTION_CREDENTIAL_INVALID');}
function jsonCredential(raw:string,keys:string[]){let row:Record<string,unknown>;try{row=dnsObject(JSON.parse(raw));}catch{return invalid();}if(Object.keys(row).some(key=>!keys.includes(key)))invalid();return row;}
const string=(value:unknown,max=64000):value is string=>typeof value==='string'&&!!value&&value.length<=max;
export type PrivateDnsCredential={request?:typeof fetch;projectId?:string;awsList?:(marker?:string)=>Promise<unknown>;awsApi?:Route53DnsApi;close?:()=>void};
/** Provider authentication mechanics only. Caller already admits the Receiz ID
 * and obtains THIS user's broker grant. No credentials are persisted here. */
export async function openProviderCredential(input:{provider:BusinessDnsProviderId;credential:string;request?:typeof fetch;assertOpen():void}):Promise<PrivateDnsCredential>{
 input.assertOpen();if(!string(input.credential))invalid();let token=input.credential,projectId:string|undefined;
 const request=input.request??fetch;
 if(input.provider==='route53'){
  const row=jsonCredential(token,['accessKeyId','secretAccessKey','sessionToken']);if(!string(row.accessKeyId,128)||!string(row.secretAccessKey,512)||row.sessionToken!==undefined&&!string(row.sessionToken,16000))invalid();
  const sdk=await import('@aws-sdk/client-route-53');input.assertOpen();const client=new sdk.Route53Client({region:'us-east-1',endpoint:'https://route53.amazonaws.com',maxAttempts:1,requestHandler:{connectionTimeout:5000,requestTimeout:25000},credentials:{accessKeyId:row.accessKeyId,secretAccessKey:row.secretAccessKey,...(typeof row.sessionToken==='string'?{sessionToken:row.sessionToken}:{})}});
  const send=async(command:InstanceType<typeof sdk.ListHostedZonesCommand>|InstanceType<typeof sdk.ListResourceRecordSetsCommand>|InstanceType<typeof sdk.ChangeResourceRecordSetsCommand>)=>{input.assertOpen();try{const result=await client.send(command as InstanceType<typeof sdk.ListHostedZonesCommand>);input.assertOpen();return result;}catch(cause){input.assertOpen();if(cause instanceof Error&&['ExpiredToken','ExpiredTokenException','InvalidClientTokenId','UnrecognizedClientException'].includes(cause.name))throw Error('BUSINESS_DNS_RECONNECT_REQUIRED');throw Error('BUSINESS_DNS_AWS_RESULT_UNCONFIRMED');}};
  return{awsList:marker=>send(new sdk.ListHostedZonesCommand({MaxItems:100,...(marker?{Marker:marker}:{})})),awsApi:{listResourceRecordSets:args=>send(new sdk.ListResourceRecordSetsCommand(args as unknown as import('@aws-sdk/client-route-53').ListResourceRecordSetsCommandInput)),changeResourceRecordSets:args=>send(new sdk.ChangeResourceRecordSetsCommand(args as unknown as import('@aws-sdk/client-route-53').ChangeResourceRecordSetsCommandInput))},close:()=>client.destroy()};
 }
 if(input.provider==='google-cloud-dns'){
  // Standard service-account fields are accepted but token_uri is never used:
  // the assertion goes only to Google's fixed token endpoint.
  const row=jsonCredential(token,['type','project_id','private_key_id','private_key','client_email','client_id','auth_uri','token_uri','auth_provider_x509_cert_url','client_x509_cert_url','universe_domain']);
  if(row.type!=='service_account'||!string(row.project_id,128)||!/^[-a-z0-9:.]+$/.test(row.project_id)||!string(row.private_key,32000)||!string(row.client_email,320)||!/^[-a-zA-Z0-9_.]+@[-a-zA-Z0-9_.]+\.gserviceaccount\.com$/.test(row.client_email))invalid();projectId=row.project_id;
  const now=Math.floor(Date.now()/1000),encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url'),claims=encode({alg:'RS256',typ:'JWT'})+'.'+encode({iss:row.client_email,scope:'https://www.googleapis.com/auth/ndev.clouddns.readwrite',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});let signature:string;try{signature=sign('RSA-SHA256',Buffer.from(claims),row.private_key).toString('base64url');}catch{return invalid();}
  const result=dnsObject(await providerJson(await request('https://oauth2.googleapis.com/token',{method:'POST',credentials:'omit',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:claims+'.'+signature})})));input.assertOpen();if(!string(result.access_token,32000))invalid();token=result.access_token;
 }
 if(input.provider==='azure-dns'){
  const row=jsonCredential(token,['tenantId','clientId','clientSecret']);if(!string(row.tenantId,36)||!string(row.clientId,36)||!string(row.clientSecret,4096)||! /^[a-f0-9-]{36}$/i.test(row.tenantId)||! /^[a-f0-9-]{36}$/i.test(row.clientId))invalid();
  const result=dnsObject(await providerJson(await request('https://login.microsoftonline.com/'+row.tenantId+'/oauth2/v2.0/token',{method:'POST',credentials:'omit',redirect:'error',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:row.clientId,client_secret:row.clientSecret,scope:'https://management.azure.com/.default'})})));input.assertOpen();if(!string(result.access_token,32000))invalid();token=result.access_token;
 }
 const expected=origin[input.provider];if(!expected||/[\r\n]/.test(token))invalid();
 return{...(projectId?{projectId}:{}),request:async(url,init)=>{
  input.assertOpen();const target=new URL(String(url));if(target.origin!==expected||target.username||target.password||target.hash)throw Error('BUSINESS_DNS_PROVIDER_ORIGIN_INVALID');const headers=new Headers(init?.headers);headers.set('Authorization','Bearer '+token);
  const response=await request(target,{...init,headers,credentials:'omit',redirect:'error',signal:AbortSignal.any([...(init?.signal?[init.signal]:[]),AbortSignal.timeout(25000)])});input.assertOpen();return response;
 }};
}
