import {createDnsProviderConnection,type DnsConnectionOwner,type DnsExistingRecord} from './engine.js';
import {absoluteDnsName,dnsArray,dnsObject,dnsResultInvalid,relativeDnsName} from './http.js';
/** Official OAuth MCP performs incremental DNS saves; the legacy XML full-zone
 * setHosts path is deliberately not used. Never force, delete, buy or change NS. */
export function createNamecheapMcpConnection(input:DnsConnectionOwner&{call(name:'dns_records_get'|'dns_records_save',args:Record<string,unknown>):Promise<unknown>}){
 const field:Record<string,string>={A:'address',AAAA:'address',CNAME:'cname',ALIAS:'aliasName',NS:'nameserver',PTR:'pointer',TXT:'value',MX:'exchange'};
 return createDnsProviderConnection({...input,driver:{provider:'Namecheap',async list(){
  const records:DnsExistingRecord[]=[],seen=new Set<string>();
  for(let skip=0;skip<10000;skip+=500){
   input.assertOpen();const page=dnsObject(await input.call('dns_records_get',{domainName:input.zoneName,take:500,skip}));input.assertOpen();
   if(!Number.isSafeInteger(page.total)||Number(page.total)<0||Number(page.total)>10000)dnsResultInvalid();const items=dnsArray(page.items),omitted=page.omittedRecords===undefined?[]:dnsArray(page.omittedRecords),fingerprint=JSON.stringify({items,omitted});if(seen.has(fingerprint))dnsResultInvalid();seen.add(fingerprint);
   for(const raw of items){const row=dnsObject(raw);if(typeof row.type!=='string')dnsResultInvalid();const name=absoluteDnsName(row.name,input.zoneName,'relative'),value=row[field[row.type]];records.push({name,type:row.type,value:typeof value==='string'?value:'',...(typeof value!=='string'||row.group==='product'||row.group==='personalNs'?{blocked:true}:{})});}
   for(const raw of omitted){const row=dnsObject(raw);if(typeof row.type!=='string')dnsResultInvalid();records.push({name:absoluteDnsName(row.name,input.zoneName,'relative'),type:row.type,value:'',blocked:true});}
   if(skip+500>=Number(page.total))return records;if(!items.length&&!omitted.length)dnsResultInvalid();
  }return dnsResultInvalid();
 },async create(record){
  const name=relativeDnsName(record.name,input.zoneName)||'@',key=field[record.type];if(!key)dnsResultInvalid();const result=dnsObject(await input.call('dns_records_save',{domainName:input.zoneName,records:[{type:record.type,name,[key]:record.value,ttl:300}]}));
  if(result.saved!==1||result.failed!==undefined&&dnsArray(result.failed).length)dnsResultInvalid();return{};
 }}});
}
