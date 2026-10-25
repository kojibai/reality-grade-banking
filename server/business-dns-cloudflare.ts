import {isIP} from 'node:net';
import {setupRecord} from '../src/receiz/business-setup.js';
import type {BusinessDnsConnection,BusinessDnsPlan,BusinessDnsProviderResult,BusinessDnsRecord} from '../src/receiz/business-dns-tools.js';

type CloudflareRecord={id:string;type:string;name:string;content:string;proxied?:boolean};
/** The host binds this request function to its actual scoped Cloudflare
 * connection, official API origin, no redirects and no write retries. It never
 * passes bearer tokens through chat/model arguments. No connection is created
 * by this factory and no calls happen before the owner's explicit invocation.
 * Mechanics: developers.cloudflare.com/api/resources/dns/subresources/records/
 */
export function createCloudflareBusinessDnsConnection(input:{accountUid:string;zoneId:string;zoneName:string;canWrite:boolean;request(path:string,init:{method:'GET'|'POST';body?:string}):Promise<Response>;assertOpen():void}):BusinessDnsConnection{
 if(!input.accountUid||!/^[a-f0-9]{32}$/.test(input.zoneId)||!/^([a-z0-9-]+\.)+[a-z0-9-]+$/.test(input.zoneName))throw Error('BUSINESS_DNS_CONNECTION_INVALID');
 const path='/zones/'+input.zoneId+'/dns_records';
 const inZone=(name:string)=>name===input.zoneName||name.endsWith('.'+input.zoneName);
 const same=(actual:CloudflareRecord,wanted:BusinessDnsRecord)=>actual.type===wanted.type&&actual.name===wanted.name&&actual.content===wanted.value&&actual.proxied!==true;
 const manual=(reason:string):BusinessDnsProviderResult=>({status:'manual',records:[],reason});
 async function json(response:Response){
  // Bound external response material; a malformed/lost write stays unknown.
  if(!response.body)throw Error('DNS_PROVIDER_RESULT_UNCONFIRMED');
  const reader=response.body.getReader();let total=0;const chunks:Uint8Array[]=[];
  try{for(;;){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>1024*1024)throw Error('DNS_PROVIDER_RESULT_CAPACITY');chunks.push(part.value);}const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const data=setupRecord(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));if(!response.ok||!data||data.success!==true)throw Error('DNS_PROVIDER_RESULT_UNCONFIRMED');return data;}
  finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 async function list(name:string):Promise<CloudflareRecord[]>{
  input.assertOpen();const data=await json(await input.request(path+'?'+new URLSearchParams({name,per_page:'100',page:'1'}),{method:'GET'}));input.assertOpen();
  const page=setupRecord(data.result_info);
  if(!Array.isArray(data.result)||!page||page.page!==1||page.total_pages!==1&&!(page.total_pages===0&&data.result.length===0)||data.result.length>100||page.count!==data.result.length||page.total_count!==data.result.length||typeof page.per_page!=='number'||!Number.isSafeInteger(page.per_page)||page.per_page<Math.max(1,data.result.length)||page.per_page>100)throw Error('DNS_PROVIDER_LIST_INCOMPLETE');
  return data.result.map(value=>{const record=setupRecord(value);if(!record||typeof record.id!=='string'||!record.id||typeof record.type!=='string'||typeof record.name!=='string'||record.name!==name||typeof record.content!=='string')throw Error('DNS_PROVIDER_LIST_INVALID');return record as CloudflareRecord;});
 }
 function conflict(existing:CloudflareRecord[],wanted:BusinessDnsRecord){
  return existing.some(row=>!same(row,wanted)&&(row.type==='NS'||row.type==='CNAME'||wanted.type==='CNAME'||row.type===wanted.type&&wanted.type!=='TXT'||['A','AAAA'].includes(row.type)&&['A','AAAA'].includes(wanted.type)));
 }
 return Object.freeze({accountUid:input.accountUid,provider:'Cloudflare',canWrite:input.canWrite,
  async apply(plan:BusinessDnsPlan):Promise<BusinessDnsProviderResult>{
   input.assertOpen();if(!input.canWrite)return manual('Provider access is read-only. Use the exact records in DNS settings.');
   if(!inZone(plan.hostname))return manual('The connected DNS zone does not manage this hostname.');
   const supported=plan.connectionOptions.filter(row=>['A','AAAA','CNAME'].includes(row.type));
   const connection=plan.hostname===input.zoneName?supported.find(row=>row.type==='A')??supported.find(row=>row.type==='CNAME'):supported.find(row=>row.type==='CNAME')??supported.find(row=>row.type==='A')??supported[0];
   if(!connection)return manual('This provider adapter does not support the supplied connection record. Use the manual records.');
   const desired=[connection,...plan.verificationRecords].filter((row,index,all)=>all.findIndex(other=>row.type===other.type&&row.name===other.name&&row.value===other.value)===index);
   if(connection.name!==plan.hostname||desired.length>24||desired.some(row=>!inZone(row.name)||!/^[_a-z0-9.-]+$/i.test(row.name)||!['A','AAAA','CNAME','TXT'].includes(row.type)||!row.value||row.value.length>2048||row.type==='A'&&isIP(row.value)!==4||row.type==='AAAA'&&isIP(row.value)!==6||row.type==='CNAME'&&!/^([a-z0-9-]+\.)+[a-z0-9-]+\.?$/i.test(row.value)))return manual('Some native records need a different DNS zone or manual provider support.');
   const accepted:(BusinessDnsRecord&{reference?:string})[]=[];let writeStarted=false;
   try{
    // Inspect every relevant name before the first mutation. This adapter only
    // creates missing records: it never deletes or overwrites existing service.
    const current=new Map<string,CloudflareRecord[]>();
    for(const row of desired){if(!current.has(row.name))current.set(row.name,await list(row.name));if(conflict(current.get(row.name)!,row))return manual('An existing website or DNS record needs an owner decision. Nothing has been replaced.');}
    for(const row of desired){
     input.assertOpen();const existing=await list(row.name);input.assertOpen();
     if(conflict(existing,row))return{status:accepted.length?'unknown':'manual',records:accepted,reason:'DNS changed during setup. Review the current records before another change.'};
     const known=existing.find(record=>same(record,row));if(known){accepted.push({...row,reference:known.id});continue;}
     writeStarted=true;
     const data=await json(await input.request(path,{method:'POST',body:JSON.stringify({type:row.type,name:row.name,content:row.value,ttl:1,...(['A','AAAA','CNAME'].includes(row.type)?{proxied:false}:{})})}));input.assertOpen();
     const created=setupRecord(data.result);if(!created||typeof created.id!=='string'||!created.id||!same(created as CloudflareRecord,row))throw Error('DNS_PROVIDER_WRITE_UNCONFIRMED');
     accepted.push({...row,reference:created.id});
    }
    return{status:'applied',records:accepted};
   }catch{input.assertOpen();return{status:writeStarted?'unknown':'manual',records:accepted,reason:writeStarted?'The provider result is unconfirmed. Read the current records before another change.':'Provider access or the current DNS records could not be confirmed. Use the manual steps.'};}
  },
 });
}
