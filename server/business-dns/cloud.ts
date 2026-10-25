import {createDnsProviderConnection,dnsName,dnsRecordMatches,type DnsConnectionOwner,type DnsExistingRecord} from './engine.js';
import {absoluteDnsName,decodeDnsTxt,dnsArray,dnsIdentifier,dnsJson,dnsObject,dnsResultInvalid,encodeDnsTxt,relativeDnsName,splitDnsTxt,type DnsHttpOwner} from './http.js';
import type {BusinessDnsRecord} from '../../src/receiz/business-dns-tools.js';

function cloudRdata(record:BusinessDnsRecord){return record.type==='TXT'?encodeDnsTxt(record.value):record.type==='CNAME'?dnsName(record.value)+'.':record.value;}
function rrset(raw:unknown,aws=false):DnsExistingRecord[]{
 const row=dnsObject(raw),name=aws?row.Name:row.name,type=aws?row.Type:row.type;
 if(typeof name!=='string'||typeof type!=='string')dnsResultInvalid();
 const reference=name,blocked=aws?['AliasTarget','SetIdentifier','TrafficPolicyInstanceId','HealthCheckId','Failover','Weight','Region','GeoLocation','CidrRoutingConfig','MultiValueAnswer'].some(key=>row[key]!==undefined&&row[key]!==false):row.routingPolicy!==undefined;
 if(blocked)return[{name:dnsName(name),type,value:'',reference,blocked:true}];
 const values=dnsArray(aws?row.ResourceRecords:row.rrdatas);if(!values.length)dnsResultInvalid();
 return values.map(value=>{const text=aws?dnsObject(value).Value:value;if(typeof text!=='string')dnsResultInvalid();return{name:dnsName(name),type,value:type==='TXT'?decodeDnsTxt(text):text,reference};});
}
export function createGoogleCloudDnsConnection(input:DnsHttpOwner&{projectId:string;managedZone:string}){
 if(!/^[a-z0-9][a-z0-9.:-]{0,128}$/.test(input.projectId)||!/^[-a-zA-Z0-9]{1,128}$/.test(input.managedZone))throw Error('BUSINESS_DNS_CONNECTION_INVALID');
 const url='https://dns.googleapis.com/dns/v1/projects/'+encodeURIComponent(input.projectId)+'/managedZones/'+encodeURIComponent(input.managedZone)+'/rrsets';
 return createDnsProviderConnection({...input,driver:{provider:'Google Cloud DNS',recordSets:true,async list(){
  const records:DnsExistingRecord[]=[],seen=new Set<string>();let token:string|undefined;
  for(let page=0;page<100;page++){
   const result=await dnsJson(input,url+'?'+new URLSearchParams({maxResults:'100',...(token?{pageToken:token}:{})}));records.push(...dnsArray(result.rrsets).flatMap(row=>rrset(row)));
   if(result.nextPageToken===undefined||result.nextPageToken==='')return records;
   if(typeof result.nextPageToken!=='string'||result.nextPageToken.length>4096||seen.has(result.nextPageToken))dnsResultInvalid();seen.add(result.nextPageToken);token=result.nextPageToken;
  }return dnsResultInvalid();
 },async create(record){const result=await dnsJson(input,url,'POST',{name:record.name+'.',type:record.type,ttl:300,rrdatas:[cloudRdata(record)]}),accepted=rrset(result);if(accepted.length!==1||!dnsRecordMatches(accepted[0],record))dnsResultInvalid();return{reference:accepted[0].reference};}}});
}
function azureRecords(raw:unknown,zone:string):DnsExistingRecord[]{
 const row=dnsObject(raw),properties=dnsObject(row.properties);if(typeof row.type!=='string'||!row.type.startsWith('Microsoft.Network/dnsZones/'))dnsResultInvalid();
 const type=row.type.slice('Microsoft.Network/dnsZones/'.length),name=absoluteDnsName(row.name,zone,'relative'),reference=dnsIdentifier(row.id);
 if(properties.targetResource!==undefined&&dnsObject(properties.targetResource).id)return[{name,type,value:'',reference,blocked:true}];
 let values:unknown[];
 if(type==='A')values=dnsArray(properties.ARecords).map(value=>dnsObject(value).ipv4Address);
 else if(type==='AAAA')values=dnsArray(properties.AAAARecords).map(value=>dnsObject(value).ipv6Address);
 else if(type==='CNAME')values=[dnsObject(properties.CNAMERecord).cname];
 else if(type==='TXT')values=dnsArray(properties.TXTRecords).map(value=>{const segments=dnsArray(dnsObject(value).value);if(segments.some(part=>typeof part!=='string'))dnsResultInvalid();return segments.join('');});
 else return[{name,type,value:'',reference}];
 if(!values.length||values.some(value=>typeof value!=='string'))dnsResultInvalid();return values.map(value=>({name,type,value:value as string,reference}));
}
export function createAzureDnsConnection(input:DnsHttpOwner&{subscriptionId:string;resourceGroup:string}){
 if(!/^[a-f0-9-]{36}$/i.test(input.subscriptionId)||!/^[-a-zA-Z0-9_.()]{1,90}$/.test(input.resourceGroup))throw Error('BUSINESS_DNS_CONNECTION_INVALID');
 const origin='https://management.azure.com',path='/subscriptions/'+input.subscriptionId+'/resourceGroups/'+encodeURIComponent(input.resourceGroup)+'/providers/Microsoft.Network/dnsZones/'+encodeURIComponent(input.zoneName),base=origin+path;
 return createDnsProviderConnection({...input,driver:{provider:'Azure DNS',recordSets:true,async list(){
  const records:DnsExistingRecord[]=[],seen=new Set<string>();let url=base+'/all?api-version=2018-05-01&$top=100';
  for(let page=0;page<100;page++){
   if(seen.has(url))dnsResultInvalid();seen.add(url);const result=await dnsJson(input,url);records.push(...dnsArray(result.value).flatMap(row=>azureRecords(row,input.zoneName)));
   if(result.nextLink===undefined||result.nextLink===null||result.nextLink==='')return records;
   if(typeof result.nextLink!=='string'||result.nextLink.length>4096)dnsResultInvalid();const next=new URL(result.nextLink);
   if(next.origin!==origin||!next.pathname.startsWith(path+'/')||next.username||next.password||next.hash||next.searchParams.get('api-version')!=='2018-05-01')dnsResultInvalid();url=next.href;
  }return dnsResultInvalid();
 },async create(record){
  const properties={TTL:300,...(record.type==='A'?{ARecords:[{ipv4Address:record.value}]}:record.type==='AAAA'?{AAAARecords:[{ipv6Address:record.value}]}:record.type==='CNAME'?{CNAMERecord:{cname:dnsName(record.value)+'.'}}:{TXTRecords:[{value:splitDnsTxt(record.value)}]})};
  const result=await dnsJson(input,base+'/'+record.type+'/'+encodeURIComponent(relativeDnsName(record.name,input.zoneName)||'@')+'?api-version=2018-05-01','PUT',{properties},{'If-None-Match':'*'}),accepted=azureRecords(result,input.zoneName);
  if(accepted.length!==1||!dnsRecordMatches(accepted[0],record))dnsResultInvalid();return{reference:accepted[0].reference};
 }}});
}
/** The host maps these exact SDK operation ports to client.send(new
 * ListResourceRecordSetsCommand(input)) / ChangeResourceRecordSetsCommand(input).
 * AWS signing, temporary credentials and actual scoped IAM grant stay private. */
export type Route53DnsApi={listResourceRecordSets(input:Record<string,unknown>):Promise<unknown>;changeResourceRecordSets(input:Record<string,unknown>):Promise<unknown>};
export function createRoute53DnsConnection(input:DnsConnectionOwner&{hostedZoneId:string;api:Route53DnsApi}){
 if(!/^(?:\/hostedzone\/)?[A-Z0-9]{1,32}$/.test(input.hostedZoneId))throw Error('BUSINESS_DNS_CONNECTION_INVALID');const hostedZoneId=input.hostedZoneId.replace(/^\/hostedzone\//,'');
 async function call(operation:keyof Route53DnsApi,args:Record<string,unknown>){input.assertOpen();const raw=await input.api[operation](args);input.assertOpen();if(JSON.stringify(raw)?.length>2*1024*1024)dnsResultInvalid();return dnsObject(raw);}
 return createDnsProviderConnection({...input,driver:{provider:'AWS Route 53',recordSets:true,async list(){
  const records:DnsExistingRecord[]=[],seen=new Set<string>();let cursor:Record<string,string>={};
  for(let page=0;page<100;page++){
   const result=await call('listResourceRecordSets',{HostedZoneId:hostedZoneId,MaxItems:100,...cursor});records.push(...dnsArray(result.ResourceRecordSets).flatMap(row=>rrset(row,true)));
   if(result.IsTruncated===false)return records;if(result.IsTruncated!==true||typeof result.NextRecordName!=='string'||typeof result.NextRecordType!=='string'||result.NextRecordIdentifier!==undefined&&typeof result.NextRecordIdentifier!=='string')dnsResultInvalid();
   cursor={StartRecordName:result.NextRecordName,StartRecordType:result.NextRecordType,...(typeof result.NextRecordIdentifier==='string'?{StartRecordIdentifier:result.NextRecordIdentifier}:{})};const key=JSON.stringify(cursor);if(seen.has(key))dnsResultInvalid();seen.add(key);
  }return dnsResultInvalid();
 },async create(record){
  const result=await call('changeResourceRecordSets',{HostedZoneId:hostedZoneId,ChangeBatch:{Changes:[{Action:'CREATE',ResourceRecordSet:{Name:record.name+'.',Type:record.type,TTL:300,ResourceRecords:[{Value:cloudRdata(record)}]}}]}}),info=dnsObject(result.ChangeInfo);
  if(typeof info.Id!=='string'||!info.Id||!['PENDING','INSYNC'].includes(String(info.Status)))dnsResultInvalid();
  // ChangeInfo.Id is an operation reference, not a record identity. Exact
  // native-name readback supplies the record locator before acceptance.
  return{};
 }}});
}
