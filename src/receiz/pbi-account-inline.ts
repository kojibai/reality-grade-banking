import type {PbiAccountDevice,PbiAccountBindRequest} from './pbi-account-bridge';
type Json=Record<string,any>;
export type PbiAccountHandoff={accountUid:string;sourceMode:'native-history';sourceB64u:string}|{accountUid:string;sourceMode:'legacy-sql';binding?:PbiAccountDevice;credentialId?:string};
export type PbiCredential={credIdB64Url:string;pubKeyPem:string};
const base='/api/bank/native/pbi/';
const encode=(value:ArrayBuffer)=>{let raw='';for(const byte of new Uint8Array(value))raw+=String.fromCharCode(byte);return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const decode=(value:string)=>{if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length%4===1)throw Error('PBI_ACCOUNT_RESPONSE_INVALID');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)).buffer;};
export async function pbiAccountRequest(operation:string,body?:unknown):Promise<Json>{
 // Anonymous challenges retain the visitor's own canonical anti-abuse bucket.
 // All session-bearing operations stay behind the closed HttpOnly transport.
 const anonymous=operation==='begin';
 const response=await fetch(anonymous?'https://receiz.com/api/auth/passkey/related/begin':base+operation,{method:body===undefined?'GET':'POST',headers:body===undefined?{Accept:'application/json'}:{Accept:'application/json','Content-Type':'application/json'},credentials:anonymous?'omit':'same-origin',cache:'no-store',redirect:'error',...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(45000)});
 const result=await response.json();if(!response.ok||result?.ok===false)throw Error(typeof result?.error==='string'?result.error:'PBI_ACCOUNT_UNAVAILABLE');return result;
}
export async function closePbiAccount(){await pbiAccountRequest('close',{}).catch(()=>{});}
function handoff(value:Json,accountUid:string):PbiAccountHandoff{
 if(value.ok!==true||value.accountUid!==accountUid)throw Error('PBI_ACCOUNT_MISMATCH');
 if(value.sourceMode==='native-history'&&typeof value.sourceB64u==='string'&&/^[A-Za-z0-9_-]+$/.test(value.sourceB64u)&&value.sourceB64u.length<=8*1024*1024)return{accountUid,sourceMode:value.sourceMode,sourceB64u:value.sourceB64u};
 if(value.sourceMode==='legacy-sql')return{accountUid,sourceMode:value.sourceMode,...(value.binding?{binding:value.binding}:{}),...(typeof value.credentialId==='string'?{credentialId:value.credentialId}:{})};
 throw Error('PBI_ACCOUNT_SOURCE_REQUIRED');
}
function expectedAccount(value:Json,accountUid?:string){const uid=value.session?.uid;if(typeof uid!=='string'||!uid||uid.length>160||accountUid&&accountUid!==uid)throw Error('PBI_ACCOUNT_MISMATCH');return uid;}
function normalizeError(error:unknown):never{
 if(error instanceof Error&&['NotAllowedError','AbortError'].includes(error.name))throw Error('passkey_cancelled');
 if(error instanceof Error&&error.name==='SecurityError')throw Error('PBI_RELATED_ORIGIN_UNAVAILABLE');
 throw error;
}
/** The canonical passkey protocol, presented by this host. The RP is shared
 * with Receiz; only the browser's system authenticator displays a ceremony. */
async function complete(begin:Json,accountUid?:string,credentialId?:string){
 if(begin.ok!==true||!['authenticate','register'].includes(begin.flow)||begin.rpId!=='receiz.com'||typeof begin.challengeId!=='string')throw Error('PBI_ACCOUNT_RESPONSE_INVALID');
 if(begin.flow==='register'&&accountUid){const raw=accountUid.replaceAll('-','');if(!/^[a-f0-9]{32}$/i.test(raw)||begin.user?.idB64Url!==encode(Uint8Array.from(raw.match(/../g)!,v=>parseInt(v,16)).buffer))throw Error('PBI_ACCOUNT_MISMATCH');}
 let credential:PublicKeyCredential|null;
 try{
  const challenge=decode(begin.challengeB64Url);
  if(begin.flow==='register')credential=await navigator.credentials.create({publicKey:{rp:{id:begin.rpId,name:begin.rpName||'Receiz'},user:{id:decode(begin.user.idB64Url),name:begin.user.name||'Receiz user',displayName:begin.user.displayName||'Receiz user'},challenge,pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{residentKey:'required',userVerification:'required'},attestation:'none',timeout:60000}}) as PublicKeyCredential|null;
  else{
   const ids=credentialId?[credentialId]:begin.allowCredentialIds;
   credential=await navigator.credentials.get({publicKey:{rpId:begin.rpId,challenge,userVerification:'required',timeout:60000,...(Array.isArray(ids)&&ids.length?{allowCredentials:ids.map((id:string)=>({type:'public-key' as const,id:decode(id)}))}:{})}}) as PublicKeyCredential|null;
  }
 }catch(error){normalizeError(error);}
 if(!credential||credential.type!=='public-key')throw Error('passkey_cancelled');
 const rawId=encode(credential.rawId);if(credentialId&&rawId!==credentialId)throw Error('PBI_ACCOUNT_MISMATCH');
 const response=credential.response,common={id:credential.id,rawId,type:'public-key',response:{clientDataJSON:encode(response.clientDataJSON)}};
 const payload=begin.flow==='register'?{attestation:{...common,response:{...common.response,attestationObject:encode((response as AuthenticatorAttestationResponse).attestationObject)}}}:{assertion:{...common,response:{...common.response,authenticatorData:encode((response as AuthenticatorAssertionResponse).authenticatorData),signature:encode((response as AuthenticatorAssertionResponse).signature),userHandle:(response as AuthenticatorAssertionResponse).userHandle?encode((response as AuthenticatorAssertionResponse).userHandle!):null}}};
 const finished=await pbiAccountRequest('finish',{challengeId:begin.challengeId,...payload});return{accountUid:expectedAccount(finished,accountUid),credentialId:rawId};
}
export async function recoverPbiAccountInline(){
 if(!navigator.credentials?.get||!navigator.credentials?.create)throw Error('PBI_BROWSER_UNAVAILABLE');
 const begin=await pbiAccountRequest('begin',{intent:'auto',next:'/account'});
 try{return await complete(begin);}catch(error){
  if(!(error instanceof Error)||!['passkey_cancelled','passkey_not_registered','passkey_not_found'].includes(error.message)||begin.flow!=='authenticate'||begin.allowCredentialIds?.length)throw error;
  return await complete(await pbiAccountRequest('begin',{intent:'register',next:'/account'}));
 }
}
export async function runPbiAccountInline(device:PbiAccountDevice,sign:(accountUid:string)=>Promise<{challengeB64Url:string;signatureB64Url:string}>,recovery:Promise<{accountUid:string;credentialId:string}>=recoverPbiAccountInline()){
 const recovered=await recovery;
 const request:PbiAccountBindRequest={...device,...await sign(recovered.accountUid),next:'/account'};
 const admitted=handoff(await pbiAccountRequest('bind',request),recovered.accountUid);
 if(admitted.sourceMode==='legacy-sql'&&(!admitted.binding||Object.keys(admitted.binding).length!==4||!Object.entries(device).every(([key,value])=>admitted.binding![key as keyof PbiAccountDevice]===value)))throw Error('PBI_ACCOUNT_MISMATCH');
 return{...admitted,request};
}
export async function runPbiAccountInlineConnection(device:PbiAccountDevice,accountUid:string,sign:()=>Promise<{challengeB64Url:string;signatureB64Url:string}>,assertCurrent:()=>void){
 assertCurrent();const switched=await pbiAccountRequest('switch',{...device,targetUid:accountUid,...await sign(),next:'/account'});assertCurrent();expectedAccount(switched,accountUid);
 let completed:Awaited<ReturnType<typeof complete>>;
 try{completed=await complete(await pbiAccountRequest('begin',{intent:'auto',next:'/account'}),accountUid);}
 catch(error){
  if(!(error instanceof Error)||!['passkey_cancelled','passkey_not_registered','passkey_not_found'].includes(error.message))throw error;
  assertCurrent();completed=await complete(await pbiAccountRequest('enroll',{next:'/account'}),accountUid);
 }
 assertCurrent();const source=handoff(await pbiAccountRequest(`credential-source?${new URLSearchParams({accountUid,credentialId:completed.credentialId})}`),accountUid);assertCurrent();
 if(source.sourceMode==='legacy-sql'&&source.credentialId!==completed.credentialId)throw Error('PBI_ACCOUNT_MISMATCH');
 return{...source,credentialId:completed.credentialId};
}
