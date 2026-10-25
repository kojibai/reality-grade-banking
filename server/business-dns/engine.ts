import {isIP} from 'node:net';
import type {BusinessDnsConnection,BusinessDnsPlan,BusinessDnsProviderResult,BusinessDnsRecord} from '../../src/receiz/business-dns-tools.js';

export type DnsExistingRecord={type:string;name:string;value:string;reference?:string;blocked?:boolean};
export type DnsConnectionOwner={accountUid:string;zoneName:string;canWrite:boolean;assertOpen():void};
export type DnsProviderDriver={provider:string;recordSets?:boolean;list():Promise<DnsExistingRecord[]>;create(record:BusinessDnsRecord):Promise<{reference?:string}>};
export function dnsName(value:string){return value.toLowerCase().replace(/\.$/,'');}
export function inDnsZone(name:string,zone:string){return name===zone||name.endsWith('.'+zone);}
export function dnsRecordMatches(actual:DnsExistingRecord,wanted:BusinessDnsRecord){return !actual.blocked&&actual.type===wanted.type&&dnsName(actual.name)===dnsName(wanted.name)&&(wanted.type==='CNAME'?dnsName(actual.value)===dnsName(wanted.value):actual.value===wanted.value);}
const domain=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
function validRecord(row:BusinessDnsRecord,zone:string){
 return row&&['A','AAAA','CNAME','TXT'].includes(row.type)&&typeof row.name==='string'&&row.name.length<=253&&/^[_a-z0-9.-]+$/.test(row.name)&&!row.name.includes('..')&&inDnsZone(row.name,zone)&&typeof row.value==='string'&&!!row.value&&row.value.length<=2048&&typeof row.purpose==='string'&&row.purpose.length<=2048&&(row.type!=='A'||isIP(row.value)===4)&&(row.type!=='AAAA'||isIP(row.value)===6)&&(row.type!=='CNAME'||domain.test(dnsName(row.value)))&&!/[\x00-\x1f\x7f]/.test(row.value);
}
export function createDnsProviderConnection(input:DnsConnectionOwner&{driver:DnsProviderDriver}):BusinessDnsConnection{
 if(!input.accountUid||!domain.test(input.zoneName)||input.zoneName.length>253)throw Error('BUSINESS_DNS_CONNECTION_INVALID');
 const manual=(reason:string):BusinessDnsProviderResult=>({status:'manual',records:[],reason});
 const conflict=(existing:DnsExistingRecord[],wanted:BusinessDnsRecord)=>existing.some(row=>{
  const name=dnsName(row.name);
  if(row.type==='NS'&&name!==input.zoneName&&inDnsZone(wanted.name,name))return true;
  if(name!==wanted.name||dnsRecordMatches(row,wanted))return false;
  if(row.type==='TXT'&&wanted.type==='TXT'&&existing.some(record=>dnsRecordMatches(record,wanted)))return false;
  return row.blocked||row.type==='NS'&&wanted.name!==input.zoneName||row.type==='CNAME'||wanted.type==='CNAME'||['ALIAS','ANAME','URL','URL301','FRAME'].includes(row.type)||['A','AAAA'].includes(row.type)&&['A','AAAA'].includes(wanted.type)||row.type===wanted.type&&(wanted.type!=='TXT'||input.driver.recordSets);
 });
 async function read(){
  input.assertOpen();const records=await input.driver.list();input.assertOpen();
  if(!Array.isArray(records)||records.length>10000||records.some(row=>!row||typeof row.type!=='string'||!row.type||typeof row.name!=='string'||!inDnsZone(dnsName(row.name),input.zoneName)||typeof row.value!=='string'||row.reference!==undefined&&(typeof row.reference!=='string'||row.reference.length>2048)))throw Error('DNS_PROVIDER_RECORDS_INVALID');
  return records;
 }
 return Object.freeze({accountUid:input.accountUid,provider:input.driver.provider,canWrite:input.canWrite,
  async apply(plan:BusinessDnsPlan):Promise<BusinessDnsProviderResult>{
   input.assertOpen();if(!input.canWrite)return manual('Provider access is read-only. Use the exact native records in DNS settings.');
   let selected:BusinessDnsPlan;
   try{selected=structuredClone(plan);}catch{return manual('The native DNS plan could not be read.');}
   if(!selected||typeof selected.hostname!=='string'||!domain.test(selected.hostname)||!inDnsZone(selected.hostname,input.zoneName)||!Array.isArray(selected.connectionOptions)||!selected.connectionOptions.length||selected.connectionOptions.length>24||!Array.isArray(selected.verificationRecords)||selected.verificationRecords.length>24||[...selected.connectionOptions,...selected.verificationRecords].some(row=>!validRecord(row,input.zoneName))||selected.connectionOptions.some(row=>row.name!==selected.hostname||!['A','AAAA','CNAME'].includes(row.type)))return manual('The supplied records need another DNS zone or unsupported manual setup.');
   const accepted:(BusinessDnsRecord&{reference?:string})[]=[];let writeStarted=false;
   try{
    const existing=await read();
    const options=[...selected.connectionOptions].sort((a,b)=>Number(existing.some(row=>dnsRecordMatches(row,b)))-Number(existing.some(row=>dnsRecordMatches(row,a)))||Number(a.type!==(selected.hostname===input.zoneName?'A':'CNAME'))-Number(b.type!==(selected.hostname===input.zoneName?'A':'CNAME')));
    const connection=options.find(option=>!(selected.hostname===input.zoneName&&option.type==='CNAME')&&!conflict([...existing,...selected.verificationRecords],option)&&selected.verificationRecords.every(row=>!conflict([...existing,option,...selected.verificationRecords.filter(other=>other!==row)],row)));
    if(!connection)return manual('An existing website, email, delegation or record set needs an owner decision before DNS can change.');
    const desired=[connection,...selected.verificationRecords].filter((row,index,all)=>all.findIndex(other=>dnsRecordMatches(other,row))===index);
    for(const row of desired){
     const current=await read();if(conflict(current,row))return{status:writeStarted?'unknown':'manual',records:accepted,reason:'DNS changed during setup. Review the current records before requesting another change.'};
     const known=current.find(record=>dnsRecordMatches(record,row));if(known){accepted.push({...row,...(known.reference?{reference:known.reference}:{})});continue;}
     input.assertOpen();writeStarted=true;const created=await input.driver.create(row);input.assertOpen();
     if(!created||created.reference!==undefined&&(typeof created.reference!=='string'||!created.reference||created.reference.length>2048))throw Error('DNS_PROVIDER_WRITE_UNCONFIRMED');
     const after=await read(),found=after.find(record=>dnsRecordMatches(record,row));
     if(!found||conflict(after,row)||created.reference&&found.reference&&created.reference!==found.reference)throw Error('DNS_PROVIDER_WRITE_UNCONFIRMED');
     const reference=found.reference??created.reference;accepted.push({...row,...(reference?{reference}:{})});
    }
    return{status:'applied',records:accepted};
   }catch{input.assertOpen();return{status:writeStarted?'unknown':'manual',records:accepted,reason:writeStarted?'A provider write may have happened. Read the current records before requesting another change.':'Provider access or complete DNS records could not be confirmed. Use the exact native manual steps.'};}
  },
 });
}
