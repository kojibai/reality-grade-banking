import {createPorkbunDnsConnection} from './registrars.js';
import type {DnsConnectionOwner} from './engine.js';
import {dnsObject,dnsResultInvalid} from './http.js';
/** Reuse the qualified record engine; map only two fixed DNS operations to the
 * official non-purchase MCP. No arbitrary HTTP, purchases or nameserver tools. */
export function createPorkbunMcpConnection(input:DnsConnectionOwner&{call(name:string,args:Record<string,unknown>):Promise<unknown>}){
 let warning:string|undefined;
 const native=createPorkbunDnsConnection({...input,request:async(url,init)=>{
  const parsed=new URL(url),base='/api/json/v3/dns/';if(parsed.origin!=='https://api.porkbun.com'||parsed.search)dnsResultInvalid();let result:unknown;
  if(parsed.pathname===base+'retrieve/'+encodeURIComponent(input.zoneName))result=await input.call('list_dns_records',{domain:input.zoneName});
  else if(parsed.pathname===base+'create/'+encodeURIComponent(input.zoneName)&&init.method==='POST'){const args=dnsObject(JSON.parse(init.body??'{}'));result=await input.call('create_dns_record',{domain:input.zoneName,type:args.type,name:args.name,content:args.content,ttl:args.ttl});}
  else return dnsResultInvalid();const row=dnsObject(result);if(typeof row.warnings==='string')warning=row.warnings.slice(0,1000);return Response.json(row);
 }});
 return Object.freeze({...native,async apply(plan:Parameters<typeof native.apply>[0]){const result=await native.apply(plan);return warning?{...result,reason:warning}:result;}});
}
