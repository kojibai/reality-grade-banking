import {ownerTwinAccountAccess} from '../src/receiz/twin-access.js';
import {businessCapabilities,parseBusinessSetupCall,setupRecord,type BusinessSetupCall,type BusinessSetupResult} from '../src/receiz/business-setup.js';
const origin='https://receiz.com';
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const pick=(row:Record<string,unknown>,keys:string[])=>Object.fromEntries(keys.filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]]));
class NativeRefusal extends Error{constructor(code:string,readonly operationStatus?:unknown,readonly newActionRequired?:unknown){super(/^[a-zA-Z0-9_:-]{1,160}$/.test(code)?code:'native_operation_unavailable');}}
export async function readJson(input:Request|Response,limit:number){
 if(!input.body)throw new NativeRefusal('native_result_missing');
 const reader=input.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let raw='',size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit)throw new NativeRefusal('native_result_capacity');raw+=decoder.decode(part.value,{stream:true});}const value=setupRecord(JSON.parse(raw+decoder.decode()));if(!value)throw new NativeRefusal('native_result_invalid');return value;}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function freshCookie(headers:Headers){const matches=headers.getSetCookie().flatMap(value=>{if(/,\s*[^;,\s=]+=/.test(value))return [];const match=/^receiz_session=([A-Za-z0-9_.-]{20,8192})(?:;|$)/.exec(value);return match&&/;\s*HttpOnly(?:;|$)/i.test(value)?['receiz_session='+match[1]]:[];});return matches.length===1?matches[0]:null;}
export function continuationProof(value:unknown){if(typeof value!=='string'||value.length>32*1024)throw new NativeRefusal('invalid_continuation');const proof=setupRecord(JSON.parse(value));if(!proof||typeof proof.keyId!=='string'||typeof proof.signatureB64Url!=='string'||Object.keys(proof).some(key=>!['keyId','alg','publicKeyRawB64u','localUid','username','displayName','deviceName','createdAt','challengeB64Url','signatureB64Url','next'].includes(key)))throw new NativeRefusal('invalid_continuation');return value;}
function agentFrom(data:Record<string,unknown>,uid:string){
 if(data.agent===null)return null;
 const agent=setupRecord(data.agent);if(!agent||agent.ownerUserId!==uid||typeof agent.agentId!=='string'||!agent.agentId)throw new NativeRefusal('business_setup_owner_mismatch');
 if(agent.version!==1||typeof agent.displayName!=='string'||!agent.displayName.trim()||agent.displayName.length>120||typeof agent.systemPersona!=='string'||!agent.systemPersona.trim()||agent.systemPersona.length>2400||typeof agent.memoryScope!=='string'||!['none','session','relationship','venture'].includes(agent.memoryScope)||!Array.isArray(agent.capabilities)||!agent.capabilities.length||agent.capabilities.some(v=>typeof v!=='string'||!businessCapabilities.includes(v as typeof businessCapabilities[number]))||!setupRecord(agent.policy)||typeof agent.permissionsVersion!=='string'||typeof agent.updatedAt!=='string'||!Number.isFinite(Date.parse(agent.updatedAt)))throw new NativeRefusal('native_agent_result_invalid');
 return pick(agent,['version','agentId','ownerUserId','avatarId','displayName','systemPersona','memoryScope','capabilities','permissionsVersion','updatedAt','policy']);
}
function domainFrom(data:Record<string,unknown>){
 if(!Object.hasOwn(data,'domain')||!Object.hasOwn(data,'setup')||data.domain!==null&&!setupRecord(data.domain)||data.setup!==null&&!setupRecord(data.setup))throw new NativeRefusal('native_domain_result_invalid');
 const domain=setupRecord(data.domain),setup=setupRecord(data.setup);
 if(domain&&(typeof domain.hostname!=='string'||!domain.hostname)||setup&&(!['none','manual','pending_attach','pending_dns','live','error'].includes(String(setup.phase))||typeof setup.verified!=='boolean'))throw new NativeRefusal('native_domain_result_invalid');
 return {domain:domain?pick(domain,['hostname','updatedAt']):null,setup};
}
function validCreationUsage(result:Record<string,unknown>,call:BusinessSetupCall){
 const quote=setupRecord(result.quote),usage=setupRecord(result.usage),decimal=(v:unknown)=>typeof v==='string'&&/^\d{1,100}$/.test(v);
 return !!quote&&!!usage&&quote.operationKind==='creator.run.'+call.args.mode&&quote.catalogVersion==='ai-usage.v1'&&decimal(quote.directCostUsdMicros)&&typeof quote.credits==='number'&&Number.isSafeInteger(quote.credits)&&quote.credits>=0&&typeof quote.expiresAt==='string'&&Date.parse(quote.expiresAt)===Date.parse(call.operation!.quoteExpiresAt)&&usage.status==='settled'&&['settledCredits','releasedCredits','grantRemaining','purchasedRemaining'].every(key=>decimal(usage[key]));
}
const definiteRefusals=new Set(['signin_required','business_required','creator_premium_required','owned_twin_premium_required','invalid_payload','invalid_hostname','custom_domain_missing','domain_attach_conflict','usage_insufficient_credits','creator_prompt_required','idempotency_key_required','quote_expiry_required','owned_twin_action_id_required','owned_twin_quote_expiry_required','owned_twin_quote_expiry_invalid','world_agent_display_name_required','world_agent_persona_required','world_agent_capabilities_required','world_agent_configuration_patch_invalid','world_agent_configuration_conflict','world_agent_configuration_owner_mismatch']);
/** Prepared, intentionally UNMOUNTED. Compose the existing Identity Seal
 * continuation and exact native owner operations; never a new authority or
 * broad proxy. Future chat must supply native owner consent and retention. */
export async function relayBusinessSetup(request:Request):Promise<Response>{
 let call:BusinessSetupCall|undefined,accountUid='',writeMayHaveStarted=false,recovery:Pick<BusinessSetupResult,'operationStatus'|'newActionRequired'>={};
 const respond=(outcome:BusinessSetupResult['outcome'],status:number,data?:Record<string,unknown>,error?:string)=>Response.json({accountUid,tool:call?.tool??'business_inspect_agent',outcome,...recovery,...(data?{data}:{}),...(error?{error}:{}),...(call?.operation?{operationId:call.operation.id}:{})},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 const url=new URL(request.url);
 if(request.method!=='POST'||url.search||request.headers.get('origin')!==url.origin||request.headers.has('cookie')||request.headers.has('authorization')||request.headers.get('content-type')?.split(';')[0]!=='application/json')return respond('refused',403,undefined,'business_setup_request_refused');
 try{
  const input=await readJson(request,64*1024);
  if(Object.keys(input).some(key=>!['accountUid','continuation','tool','args','operation'].includes(key))||typeof input.accountUid!=='string'||!uuid.test(input.accountUid))return respond('refused',400,undefined,'business_setup_input_invalid');
  accountUid=input.accountUid;
  try{call=parseBusinessSetupCall({tool:input.tool,args:input.args,...(input.operation!==undefined?{operation:input.operation}:{})});}catch{return respond('refused',400,undefined,'business_setup_input_invalid');}
  const continuation=continuationProof(input.continuation),signal=AbortSignal.any([request.signal,AbortSignal.timeout(120_000)]);
  const base={credentials:'omit' as const,redirect:'error' as const,signal};
  const continued=await fetch(origin+'/api/auth/receiz-id/continue',{...base,method:'POST',headers:{'content-type':'application/json'},body:continuation});
  const admitted=await readJson(continued,4*1024*1024),session=setupRecord(admitted.session);
  if(!continued.ok||admitted.ok!==true||session?.uid!==accountUid||ownerTwinAccountAccess(session)!==true)return respond('refused',403,undefined,'business_setup_access_required');
  const cookie=freshCookie(continued.headers);if(!cookie)return respond('refused',403,undefined,'business_setup_session_unavailable');
  const native=async(path:string,method:'GET'|'POST'|'PATCH'='GET',body?:Record<string,unknown>)=>{
   signal.throwIfAborted();if(method!=='GET')writeMayHaveStarted=true;
   const response=await fetch(origin+path,{...base,method,headers:{accept:'application/json',cookie,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const data=await readJson(response,4*1024*1024);
   if(!response.ok||data.ok!==true)throw new NativeRefusal(typeof data.error==='string'?data.error:'native_operation_unavailable',data.operationStatus,data.newActionRequired);
   return data;
  };
  const args=call.args;
  let data:Record<string,unknown>;
  switch(call.tool){
   case 'business_inspect_agent':data={agent:agentFrom(await native('/api/world/agent'),accountUid)};break;
   case 'business_configure_agent':{
    // Native field patch owns merging/CAS. Never replay a client policy snapshot.
    const result=await native('/api/world/agent','PATCH',{configurationPatch:args,clientOperationId:call.operation!.id,quoteExpiresAt:call.operation!.quoteExpiresAt});
    const agent=agentFrom(result,accountUid);if(!agent)throw new NativeRefusal('native_agent_result_mismatch');data={agent,...pick(result,['starterBenefit'])};break;
   }
   case 'business_inspect_domain':data=domainFrom(await native('/api/account/custom-domain'));break;
   case 'business_connect_domain':{
    data=domainFrom(await native('/api/account/custom-domain','POST',{hostname:args.hostname,action:'save'}));
    if(setupRecord(data.domain)?.hostname!==args.hostname)throw new NativeRefusal('native_domain_result_mismatch');break;
   }
   case 'business_check_domain':{
    const current=domainFrom(await native('/api/account/custom-domain')),hostname=setupRecord(current.domain)?.hostname;
    if(!hostname)throw new NativeRefusal('custom_domain_missing');
    // Native verify acts on the currently saved domain. It is not an exact-host CAS.
    data=domainFrom(await native('/api/account/custom-domain','POST',{hostname,action:'verify'}));break;
   }
   case 'business_inspect_creation':{
    const workspace=await native('/api/creator/workspace');if(workspace.signedIn!==true||!Array.isArray(workspace.outputs)||!Array.isArray(workspace.assets))throw new NativeRefusal('native_creator_workspace_invalid');
    data=pick(workspace,['project','latestRun','outputs','assets']);break;
   }
   case 'business_create_work':{
    const result=await native('/api/developers/creator/run','POST',{...args,requestId:call.operation!.id,quoteExpiresAt:call.operation!.quoteExpiresAt});
    if(result.requestId!==call.operation!.id||typeof result.runId!=='string'||!result.runId||result.mode!==args.mode||typeof result.text!=='string'||(typeof result.source!=='string'||!['upstream','fallback'].includes(result.source))||!validCreationUsage(result,call))throw new NativeRefusal('native_creator_result_mismatch');
    data=pick(result,['runId','mode','text','source','quote','usage']);break;
   }
  }
  signal.throwIfAborted();return respond('accepted',200,data);
 }catch(cause){
  if(cause instanceof NativeRefusal)recovery={...(typeof cause.operationStatus==='string'&&/^[a-z_]{1,80}$/.test(cause.operationStatus)?{operationStatus:cause.operationStatus}:{}),...(typeof cause.newActionRequired==='boolean'?{newActionRequired:cause.newActionRequired}:{})};
  const error=cause instanceof NativeRefusal?cause.message:'native_result_unconfirmed';
  const refused=!writeMayHaveStarted||cause instanceof NativeRefusal&&(cause.operationStatus==='released'||cause.operationStatus===undefined&&definiteRefusals.has(error));
  return respond(refused?'refused':'unknown',503,undefined,error);
 }
}
