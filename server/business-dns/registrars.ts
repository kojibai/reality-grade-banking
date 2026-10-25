import {createDnsProviderConnection,dnsName,dnsRecordMatches,type DnsExistingRecord} from './engine.js';
import {absoluteDnsName,dnsArray,dnsIdentifier,dnsJson,dnsObject,dnsResultInvalid,nextDnsUrl,providerRecord,relativeDnsName,type DnsHttpOwner} from './http.js';

// Public official API references and scopes are recorded in the design/handoff.
// Authenticated transports inject actual scoped credentials privately; all URLs
// below are fixed to a provider and the trusted connected zone.
export function createGoDaddyDnsConnection(input:DnsHttpOwner){
 const path='/v3/domains/zones/'+encodeURIComponent(input.zoneName)+'/dns-records',url='https://api.godaddy.com'+path;
 return createDnsProviderConnection({...input,driver:{provider:'GoDaddy',async list(){
  const records:DnsExistingRecord[]=[];let expected:number|undefined;
  for(let page=1;page<=100;page++){
   const data=await dnsJson(input,url+'?'+new URLSearchParams({page:String(page),pageSize:'100',totalRequired:'true'})),items=dnsArray(data.items);
   if(items.length>100)dnsResultInvalid();
   if(items.length===0&&page===1&&data.totalItems===undefined&&data.totalPages===undefined){if(data.links!==undefined&&dnsArray(data.links).some(value=>dnsObject(value).rel==='next'))dnsResultInvalid();return[];}
   if(!Number.isSafeInteger(data.totalItems)||Number(data.totalItems)<0||!Number.isSafeInteger(data.totalPages)||Number(data.totalPages)<1||Number(data.totalPages)>100||expected!==undefined&&expected!==data.totalItems)dnsResultInvalid();expected=Number(data.totalItems);
   if(data.links!==undefined){
    const next=dnsArray(data.links).filter(value=>dnsObject(value).rel==='next');if(next.length>1||page===data.totalPages&&next.length||page<Number(data.totalPages)&&!next.length)dnsResultInvalid();
    if(next.length){const target=nextDnsUrl(dnsObject(next[0]).href,'https://api.godaddy.com',path);if(target.searchParams.get('page')!==String(page+1))dnsResultInvalid();}
   }
   records.push(...items.map(row=>providerRecord(row,input.zoneName,{value:'data',id:'recordId',names:'relative'})));
   if(page===data.totalPages){if(records.length!==expected)dnsResultInvalid();return records;}
   if(items.length===0)dnsResultInvalid();
  }return dnsResultInvalid();
 },async create(record){const result=await dnsJson(input,url,'POST',{type:record.type,name:relativeDnsName(record.name,input.zoneName)||'@',data:record.type==='CNAME'?dnsName(record.value)+'.':record.value,ttl:600},{'Idempotency-Key':crypto.randomUUID()}),accepted=providerRecord(result,input.zoneName,{value:'data',id:'recordId',names:'relative'});if(!dnsRecordMatches(accepted,record))dnsResultInvalid();return{reference:accepted.reference};}}});
}
export function createVercelDnsConnection(input:DnsHttpOwner){
 const path='/v5/domains/'+encodeURIComponent(input.zoneName)+'/records';
 return createDnsProviderConnection({...input,driver:{provider:'Vercel',async list(){
  const records:DnsExistingRecord[]=[],seen=new Set<number>();let until:number|undefined;
  for(let page=0;page<100;page++){
   const data=await dnsJson(input,'https://api.vercel.com'+path+'?'+new URLSearchParams({limit:'100',...(until!==undefined?{until:String(until)}:{})})),items=dnsArray(data.records);
   records.push(...items.map(row=>providerRecord(row,input.zoneName,{value:'value',id:'id',names:'relative'})));
   if(data.pagination===undefined){if(items.length>=100)dnsResultInvalid();return records;}
   const pagination=dnsObject(data.pagination);if(pagination.count!==items.length||items.length>100)dnsResultInvalid();if(pagination.next===null)return records;
   if(typeof pagination.next!=='number'||!Number.isSafeInteger(pagination.next)||pagination.next<0||seen.has(pagination.next)||until!==undefined&&pagination.next>=until)dnsResultInvalid();seen.add(pagination.next);until=pagination.next;
  }return dnsResultInvalid();
 },async create(record){const result=await dnsJson(input,'https://api.vercel.com/v2/domains/'+encodeURIComponent(input.zoneName)+'/records','POST',{type:record.type,name:relativeDnsName(record.name,input.zoneName),value:record.value,ttl:60});if(result.uid!==undefined)return{reference:dnsIdentifier(result.uid)};if(typeof result.updated!=='number'||!Number.isFinite(result.updated))dnsResultInvalid();return{};}}});
}
export function createDigitalOceanDnsConnection(input:DnsHttpOwner){
 const path='/v2/domains/'+encodeURIComponent(input.zoneName)+'/records',origin='https://api.digitalocean.com';
 return createDnsProviderConnection({...input,driver:{provider:'DigitalOcean',async list(){
  const records:DnsExistingRecord[]=[],seen=new Set<string>();let url=origin+path+'?per_page=200&page=1',expected:number|undefined;
  for(let page=0;page<100;page++){
   if(seen.has(url))dnsResultInvalid();seen.add(url);const data=await dnsJson(input,url),items=dnsArray(data.domain_records),total=dnsObject(data.meta).total;
   if(!Number.isSafeInteger(total)||Number(total)<0||expected!==undefined&&expected!==total)dnsResultInvalid();expected=Number(total);records.push(...items.map(row=>providerRecord(row,input.zoneName,{value:'data',id:'id',names:'relative'})));
   const links=dnsObject(data.links),pages=links.pages===undefined?{}:dnsObject(links.pages);
   if(pages.next===undefined||pages.next===null){if(records.length!==expected)dnsResultInvalid();return records;}
   url=nextDnsUrl(pages.next,origin,path).href;
  }return dnsResultInvalid();
 },async create(record){const result=await dnsJson(input,origin+path,'POST',{type:record.type,name:relativeDnsName(record.name,input.zoneName)||'@',data:record.value,ttl:1800}),accepted=providerRecord(result.domain_record,input.zoneName,{value:'data',id:'id',names:'relative'});if(!dnsRecordMatches(accepted,record))dnsResultInvalid();return{reference:accepted.reference};}}});
}
export function createDnsimpleDnsConnection(input:DnsHttpOwner&{providerAccountId:string}){
 if(!/^\d{1,30}$/.test(input.providerAccountId))throw Error('BUSINESS_DNS_CONNECTION_INVALID');
 const url='https://api.dnsimple.com/v2/'+input.providerAccountId+'/zones/'+encodeURIComponent(input.zoneName)+'/records';
 return createDnsProviderConnection({...input,driver:{provider:'DNSimple',async list(){
  const records:DnsExistingRecord[]=[];let expected:number|undefined;
  for(let page=1;page<=100;page++){
   const data=await dnsJson(input,url+'?page='+page+'&per_page=100'),items=dnsArray(data.data),p=dnsObject(data.pagination);
   if(p.current_page!==page||!Number.isSafeInteger(p.total_pages)||Number(p.total_pages)<1||Number(p.total_pages)>100||!Number.isSafeInteger(p.total_entries)||Number(p.total_entries)<0||expected!==undefined&&expected!==p.total_entries||!Number.isSafeInteger(p.per_page)||Number(p.per_page)<items.length)dnsResultInvalid();expected=Number(p.total_entries);
   records.push(...items.map(row=>providerRecord(row,input.zoneName,{value:'content',id:'id',names:'relative'})));
   if(page===p.total_pages){if(records.length!==expected)dnsResultInvalid();return records;}
   if(!items.length)dnsResultInvalid();
  }return dnsResultInvalid();
 },async create(record){const result=await dnsJson(input,url,'POST',{type:record.type,name:relativeDnsName(record.name,input.zoneName),content:record.value,ttl:600,integrated_zones:['dnsimple']}),accepted=providerRecord(result.data,input.zoneName,{value:'content',id:'id',names:'relative'});if(!dnsRecordMatches(accepted,record))dnsResultInvalid();return{reference:accepted.reference};}}});
}
export function createPorkbunDnsConnection(input:DnsHttpOwner){
 const base='https://api.porkbun.com/api/json/v3/dns/';
 return createDnsProviderConnection({...input,driver:{provider:'Porkbun',async list(){
  const result=await dnsJson(input,base+'retrieve/'+encodeURIComponent(input.zoneName));if(result.status!=='SUCCESS'||result.cloudflare==='enabled')dnsResultInvalid();
  return dnsArray(result.records).map(row=>{const record=providerRecord(row,input.zoneName,{value:'content',id:'id',names:'absolute'});if(absoluteDnsName(dnsObject(row).name,input.zoneName,'absolute')!==record.name)dnsResultInvalid();return record;});
 },async create(record){const result=await dnsJson(input,base+'create/'+encodeURIComponent(input.zoneName),'POST',{type:record.type,name:relativeDnsName(record.name,input.zoneName),content:record.value,ttl:600});if(result.status!=='SUCCESS')dnsResultInvalid();return{reference:dnsIdentifier(result.id)};}}});
}
