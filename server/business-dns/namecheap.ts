import {createDnsProviderConnection,type DnsConnectionOwner,type DnsExistingRecord} from './engine.js';
import {absoluteDnsName,dnsArray,dnsIdentifier,dnsObject,dnsResultInvalid,relativeDnsName} from './http.js';
export type NamecheapHostRecord={HostId:string;Name:string;Type:string;Address:string;MXPref:string;TTL:string};
/** SDK/XML response projection from the actual provider. The host maps getHosts
 * to namecheap.domains.dns.getHosts and setHosts to the corresponding POST
 * command, checks ApiResponse.Status/Errors and keeps API keys and allowed IP
 * private. Disable SDK write retries. No model-supplied credentials or owner. */
export type NamecheapDnsApi={getHosts(args:Record<string,string>):Promise<unknown>;setHosts(args:Record<string,string>):Promise<unknown>};
type Snapshot={domain:string;emailType:string;hosts:NamecheapHostRecord[]};
// Coordination only: no identity/grant/storage authority. The live secure host
// must also serialize this zone across its deployment instances.
const zoneTails=new Map<string,Promise<void>>();
async function inNamecheapZone<T>(zone:string,work:()=>Promise<T>):Promise<T>{
 const previous=zoneTails.get(zone)??Promise.resolve();let release!:()=>void;
 const tail=new Promise<void>(resolve=>{release=resolve;});zoneTails.set(zone,tail);
 await previous;try{return await work();}finally{release();if(zoneTails.get(zone)===tail)zoneTails.delete(zone);}
}
const writableTypes=['A','AAAA','ALIAS','CAA','CNAME','MX','MXE','NS','TXT','URL','URL301','FRAME'];
const signature=(snapshot:Snapshot)=>JSON.stringify({domain:snapshot.domain,emailType:snapshot.emailType,hosts:snapshot.hosts.map(({HostId:_id,...record})=>Object.fromEntries(Object.entries(record).sort(([a],[b])=>a.localeCompare(b)))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
export function createNamecheapDnsConnection(input:DnsConnectionOwner&{sld:string;tld:string;allowFullZoneSave:boolean;api:NamecheapDnsApi}){
 if(input.sld+'.'+input.tld!==input.zoneName||!/^[-a-zA-Z0-9]{1,70}$/.test(input.sld)||!/^[-a-zA-Z0-9.]{1,10}$/.test(input.tld))throw Error('BUSINESS_DNS_CONNECTION_INVALID');
 const coordinates={SLD:input.sld,TLD:input.tld};let snapshot:Snapshot|null=null;
 async function read():Promise<Snapshot>{
  input.assertOpen();const data=dnsObject(await input.api.getHosts(coordinates));input.assertOpen();
  if(data.Domain!==input.zoneName||data.IsUsingOurDNS!==true&&data.IsUsingOurDNS!=='true'||typeof data.EmailType!=='string'||!['MX','MXE','FWD','OX','NONE','GMAIL'].includes(data.EmailType))dnsResultInvalid();
  const hosts=dnsArray(data.Hosts).map(raw=>{
   const row=dnsObject(raw);if(Object.keys(row).some(key=>!['HostId','Name','Type','Address','MXPref','TTL'].includes(key))||!['Name','Type','Address','MXPref','TTL'].every(key=>typeof row[key]==='string')||!writableTypes.includes(String(row.Type))||typeof row.Name!=='string'||row.Name.length>255||typeof row.Address!=='string'||!row.Address||row.Address.length>8192||!/^\d{1,5}$/.test(String(row.MXPref))||!/^\d{1,5}$/.test(String(row.TTL))||Number(row.TTL)<60||Number(row.TTL)>60000)dnsResultInvalid();
   absoluteDnsName(row.Name,input.zoneName,'relative');return{HostId:dnsIdentifier(row.HostId),Name:row.Name,Type:row.Type,Address:row.Address,MXPref:row.MXPref,TTL:row.TTL} as NamecheapHostRecord;
  });
  return{domain:input.zoneName,emailType:data.EmailType,hosts};
 }
 const connection=createDnsProviderConnection({...input,canWrite:input.canWrite&&input.allowFullZoneSave,driver:{provider:'Namecheap',async list(){
  snapshot=await read();return snapshot.hosts.map((host):DnsExistingRecord=>({name:absoluteDnsName(host.Name,input.zoneName,'relative'),type:host.Type,value:host.Address,reference:host.HostId}));
 },async create(record){
  if(!snapshot)dnsResultInvalid();const before=snapshot,current=await read();if(signature(current)!==signature(before))throw Error('DNS_PROVIDER_SNAPSHOT_CHANGED');
  const next:Snapshot={...current,hosts:[...current.hosts,{HostId:'new',Name:relativeDnsName(record.name,input.zoneName)||'@',Type:record.type,Address:record.value,MXPref:'0',TTL:'1800'}]};
  const args:Record<string,string>={...coordinates,EmailType:current.emailType};next.hosts.forEach((host,index)=>{const n=index+1;args['HostName'+n]=host.Name;args['RecordType'+n]=host.Type;args['Address'+n]=host.Address;args['MXPref'+n]=host.MXPref;args['TTL'+n]=host.TTL;});
  // Namecheap has no conditional-write API. Preserve the complete observed
  // snapshot and require the real full-zone grant; never claim this prevents
  // concurrent edits made independently in the provider dashboard.
  input.assertOpen();const result=dnsObject(await input.api.setHosts(args));input.assertOpen();if(result.Domain!==input.zoneName||result.IsSuccess!==true&&result.IsSuccess!=='true')dnsResultInvalid();
  const confirmed=await read();if(signature(confirmed)!==signature(next))throw Error('DNS_PROVIDER_SNAPSHOT_UNCONFIRMED');snapshot=confirmed;return{};
 }}});
 return Object.freeze({...connection,async apply(plan:Parameters<typeof connection.apply>[0]){
  input.assertOpen();return inNamecheapZone(input.zoneName,async()=>{input.assertOpen();try{return await connection.apply(plan);}finally{snapshot=null;}});
 }});
}
