import {dnsConnectorServiceMatches,type DnsProviderConnection} from './catalog.js';
import {dnsObject} from './http.js';
import {providerJson} from './discovery.js';
/** Admin setup only. Creates project connectors, never customer grants or DNS
 * records. Its authenticated request function is private to the operator CLI. */
export async function provisionDnsConnections(input:{projectId:string;teamId:string;providers:readonly DnsProviderConnection[];request:typeof fetch;publicRequest?:typeof fetch}){
 if(!/^prj_[A-Za-z0-9]+$/.test(input.projectId)||!/^team_[A-Za-z0-9]+$/.test(input.teamId))throw Error('DNS_PROVISION_PROJECT_REQUIRED');
 const results:{provider:string;id:string;uid:string;type:string;attached:true}[]=[];
 const publicRequest=input.publicRequest??fetch;
 for(const row of input.providers){
  const endpoint='https://api.vercel.com/v1/connect/connectors/'+encodeURIComponent(row.uid)+'?teamId='+encodeURIComponent(input.teamId),existing=await input.request(endpoint,{method:'GET',redirect:'error',credentials:'omit'});let actual:Record<string,unknown>;
  if(existing.status===404){
   await existing.body?.cancel();let data:Record<string,unknown>;
   if(row.type==='api-key')data={subjectType:'user',serviceUrls:[row.service],instructions:row.instructions};
   else{
    const discovery=row.provider==='namecheap'?'https://mcp.namecheap.com/.well-known/oauth-authorization-server':row.provider==='porkbun'?'https://porkbun.com/.well-known/oauth-authorization-server':null;if(!discovery)throw Error('DNS_PROVISION_PROVIDER_UNSUPPORTED');
    const metadata=dnsObject(await providerJson(await publicRequest(discovery,{headers:{accept:'application/json','user-agent':'Reality-grade banking domain setup'},redirect:'error',credentials:'omit'})));
    const registration=row.provider==='namecheap'?'https://mcp.namecheap.com/register':'https://porkbun.com/oauth2/register';
    if(metadata.registration_endpoint!==registration||metadata.issuer!==(row.provider==='namecheap'?'https://www.namecheap.com':'https://porkbun.com')||!Array.isArray(metadata.scopes_supported)||row.scopes.some(scope=>!(metadata.scopes_supported as unknown[]).includes(scope)))throw Error('DNS_PROVISION_DISCOVERY_MISMATCH');
    const client=dnsObject(await providerJson(await publicRequest(registration,{method:'POST',credentials:'omit',redirect:'error',headers:{'content-type':'application/json','user-agent':'Reality-grade banking domain setup'},body:JSON.stringify({client_name:'Reality-grade banking DNS',client_uri:'https://bankeiz.com',redirect_uris:['https://connect.vercel.com/callback'],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code'],scope:row.scopes.join(' ')})})));
    if(typeof client.client_id!=='string'||!client.client_id)throw Error('DNS_PROVISION_CLIENT_UNCONFIRMED');
    const fields=['issuer','authorization_endpoint','token_endpoint','registration_endpoint','revocation_endpoint','response_types_supported','grant_types_supported','code_challenge_methods_supported','token_endpoint_auth_methods_supported','scopes_supported','response_modes_supported'];
    data={serverUrl:metadata.issuer,serverConfig:Object.fromEntries(fields.filter(key=>key in metadata).map(key=>[key,metadata[key]])),clientId:client.client_id,clientName:'Reality-grade banking DNS',tokenEndpointAuthMethod:'none',pkceRequired:true,userAuthorization:{enabled:true,scopes:row.scopes},refreshTokens:{enabled:true},clientCredentials:{enabled:false},defaultResource:row.resource};
   }
   const created=await input.request('https://api.vercel.com/v1/connect/connectors?teamId='+encodeURIComponent(input.teamId),{method:'POST',credentials:'omit',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({type:row.type,service:row.service,name:'Reality-grade banking · '+row.label+' DNS',uid:row.uid,projectId:input.projectId,data})});
   if(!created.ok){const failure=dnsObject(await created.json().catch(()=>({}))),error=failure.error&&typeof failure.error==='object'?dnsObject(failure.error):{};throw Error('DNS_PROVISION_CREATE_'+created.status+'_'+(typeof error.code==='string'?error.code:'unconfirmed'));}actual=dnsObject(await created.json());
  }else actual=dnsObject(await providerJson(existing));
  if(typeof actual.id!=='string'||actual.uid!==row.uid||actual.type!==row.type||!dnsConnectorServiceMatches(actual.service,row.service)||row.type==='api-key'&&dnsObject(actual.data).subjectType!=='user'||row.resource!==undefined&&dnsObject(actual.data).defaultResource!==row.resource)throw Error('DNS_CONNECTOR_EXISTING_MISMATCH');
  const attached=await input.request('https://api.vercel.com/v1/connect/connectors/'+encodeURIComponent(actual.id)+'/projects/'+encodeURIComponent(input.projectId)+'?teamId='+encodeURIComponent(input.teamId),{method:'POST',credentials:'omit',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify({environments:['development','preview','production']})});if(!attached.ok){await attached.body?.cancel();throw Error('DNS_PROVISION_ATTACH_'+attached.status);}await attached.body?.cancel();
  results.push({provider:row.provider,id:actual.id,uid:row.uid,type:row.type,attached:true});
 }
 return results;
}
