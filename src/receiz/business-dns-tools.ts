import {setupRecord,type BusinessSetupResult,type BusinessToolName} from './business-setup.js';

/** Tool descriptions are not grants. Connection/owner bindings stay private. */
export const businessDnsTools=Object.freeze([
 {name:'business_dns_instructions',requiresOwnerApproval:false,description:'Explain the exact native domain records for the owner’s provider without asking them to grant access.',parameters:{type:'object',additionalProperties:false,properties:{provider:{type:'string',maxLength:120}},required:[]}},
 {name:'business_dns_configure',requiresOwnerApproval:true,description:'Use the actual securely connected DNS provider if the owner authorizes it; otherwise return manual instructions. Never replace conflicting services silently.',parameters:{type:'object',additionalProperties:false,properties:{mode:{type:'string',enum:['automatic','manual']}},required:['mode']}},
 {name:'business_dns_check',requiresOwnerApproval:true,description:'Check the saved domain through native verification, keeping provider acknowledgement, DNS propagation and confirmed profile delivery distinct.',parameters:{type:'object',additionalProperties:false,properties:{},required:[]}},
] as const);
export type BusinessDnsRecord={type:string;name:string;value:string;purpose:string};
export type BusinessDnsPlan={hostname:string;connectionOptions:BusinessDnsRecord[];verificationRecords:BusinessDnsRecord[]};
export type BusinessDnsProviderResult={status:'applied'|'manual'|'unknown';records:(BusinessDnsRecord&{reference?:string})[];reason?:string};
/** A trusted host supplies the actual scoped provider connection after native
 * owner consent. These fields are not model arguments or permission grants. */
export type BusinessDnsConnection={accountUid:string;provider:string;canWrite:boolean;apply(plan:BusinessDnsPlan):Promise<BusinessDnsProviderResult>};
export type BusinessDnsView={status:'manual'|'waiting'|'live'|'attention'|'unknown'|'domain_changed';hostname:string;connectionOptions:BusinessDnsRecord[];verificationRecords:BusinessDnsRecord[];steps:string[];summary:string;warning:string|null;liveUrl:string|null;provider?:string;providerResult?:BusinessDnsProviderResult};
function invalid():never{throw Error('BUSINESS_DNS_NATIVE_RESULT_INVALID');}
function records(input:unknown,hostname:string,connection:boolean):BusinessDnsRecord[]{
 if(!Array.isArray(input)||input.length>24)invalid();
 return input.map(value=>{
  const row=setupRecord(value);if(!row||!['type','name','value','purpose'].every(key=>typeof row[key]==='string'&&(row[key] as string).length<=2048)||!row.type||!row.name||!row.value)invalid();
  const record=row as BusinessDnsRecord;
  // Native verification may name an ancestor's verification subdomain, but
  // connection records must bind exactly to the saved hostname.
  if(connection&&record.name!==hostname||!/^[_a-z0-9.-]+$/i.test(record.name)||/\s|\//.test(record.name))invalid();
  return{type:record.type,name:record.name,value:record.value,purpose:record.purpose};
 });
}
export function createBusinessDnsTools(input:{accountUid:string;expectedHostname?:string;execute(tool:BusinessToolName,args:Record<string,unknown>):Promise<BusinessSetupResult>;connection(hostname:string):Promise<BusinessDnsConnection|null>;assertOpen():void}){
 const check=()=>input.assertOpen();
 async function read(tool:'business_inspect_domain'|'business_check_domain'):Promise<BusinessDnsView>{
  check();const result=await input.execute(tool,{});check();
  if(result.accountUid!==input.accountUid)throw Error('BUSINESS_DNS_OWNER_MISMATCH');
  if(result.tool!==tool||result.outcome!=='accepted')throw Error('BUSINESS_DNS_NATIVE_RESULT_UNCONFIRMED');
  const domain=setupRecord(result.data?.domain),setup=setupRecord(result.data?.setup);
  if(!domain||typeof domain.hostname!=='string'||!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/.test(domain.hostname)||!setup||!['none','manual','pending_attach','pending_dns','live','error'].includes(String(setup.phase))||typeof setup.verified!=='boolean')invalid();
  const hostname=domain.hostname,connectionOptions=records(setup.recommendedRecords,hostname,true),verificationRecords=records(setup.verificationRecords,hostname,false);
  const warning=typeof setup.warning==='string'&&setup.warning?setup.warning:null;
  const live=setup.phase==='live'&&setup.attached===true&&setup.verified&&setup.misconfigured===false;
  const liveUrl=setup.liveUrl==='https://'+hostname?setup.liveUrl:null;
  return{status:live?(warning?'attention':'live'):'waiting',hostname,connectionOptions,verificationRecords,warning,liveUrl,summary:typeof setup.summary==='string'?setup.summary:'Domain setup needs checking.',steps:[
   'Open the DNS settings for this domain at the provider that manages its nameservers.',
   'Use one connection option below; the A record is an alternative to the CNAME. Keep the exact name and value shown.',
   'Add every ownership verification record separately. Keep unrelated website, email, MX and TXT records intact.',
   'Save the records, then ask me to check the domain. DNS propagation and profile delivery must be confirmed before it is ready.',
   ...(!connectionOptions.length?['The native service has not supplied connection records yet. Ask me to check again; do not invent a target.']:[]),
  ]};
 }
 return Object.freeze({
  async instructions(provider?:string){const view=await read('business_inspect_domain');return{...view,status:'manual' as const,...(provider?{provider:provider.slice(0,120)}:{})};},
  async check(){return read('business_check_domain');},
  async configure(mode:'automatic'|'manual'):Promise<BusinessDnsView>{
   check();if(!['automatic','manual'].includes(mode))throw Error('BUSINESS_DNS_INPUT_INVALID');
   const view=await read('business_inspect_domain');
   if(input.expectedHostname&&view.hostname!==input.expectedHostname)return{...view,status:'domain_changed',summary:'The saved domain changed while approval was open. No records were changed for the pending request.'};
   if(mode==='manual')return{...view,status:'manual'};
   const connection=await input.connection(view.hostname);check();
   if(!connection)return{...view,status:'manual'};
   if(connection.accountUid!==input.accountUid)throw Error('BUSINESS_DNS_OWNER_MISMATCH');
   if(!connection.canWrite||!view.connectionOptions.length)return{...view,status:'manual',provider:connection.provider};
   let result:BusinessDnsProviderResult;
   try{result=await connection.apply({hostname:view.hostname,connectionOptions:structuredClone(view.connectionOptions),verificationRecords:structuredClone(view.verificationRecords)});}
   catch{check();return{...view,status:'unknown',provider:connection.provider,summary:'The provider result is not confirmed. Check the existing records before requesting another change.'};}
   check();
   if(!result||!['applied','manual','unknown'].includes(result.status)||!Array.isArray(result.records))return{...view,status:'unknown',provider:connection.provider};
   if(result.status!=='applied')return{...view,status:result.status,provider:connection.provider,providerResult:result};
   let verified:BusinessDnsView;
   try{verified=await read('business_check_domain');}catch{check();return{...view,status:'unknown',provider:connection.provider,providerResult:result,summary:'The provider acknowledged the DNS change. Native domain verification has not confirmed readiness.'};}
   return{...verified,status:verified.hostname===view.hostname?verified.status:'domain_changed',provider:connection.provider,providerResult:result};
  },
 });
}

export class BusinessDnsConnectionRequired extends Error{constructor(readonly action:{label:string;href:string},readonly hostname?:string){super('BUSINESS_DNS_CONNECTION_REQUIRED');}}
