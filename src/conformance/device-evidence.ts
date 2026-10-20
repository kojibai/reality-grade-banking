import {readNoteRegistrationEvidence,type NoteRegistrationEvidence} from '../receiz/note-registration-evidence';
import {bankNoteRpId} from '../receiz/config';
import {loadReceiz} from '../receiz/client';

type Stage='availability'|'registration'|'verifier'|'assertion';
type Extensions=AuthenticationExtensionsClientInputs & {prf?:{eval?:{first:ArrayBuffer}};largeBlob?:{support?:'preferred';read?:boolean}};
type PublicExtensions={prfEnabled:boolean|null;prfOutputProvided:boolean;largeBlobSupported:boolean|null;largeBlobReturned:boolean};
type AssertionObservation=Omit<NoteRegistrationEvidence,'format'> & {extensions:PublicExtensions};
export interface DeviceCustodyEvidence {
 schema:'bankeiz.device-custody-inspection.v1';authority:'diagnostics-only';receizVersion:'129.0.0';
 secureContext:boolean;webAuthnAvailable:boolean;
 realm:{origin:string;rpId:string};context:'standalone'|'browser';
 platformAuthenticatorAdvertised:boolean|null;
 advertisedExtensions:{prf:boolean|null;largeBlob:boolean|null};
 registration:(NoteRegistrationEvidence & {attachment:'platform';extensions:PublicExtensions})|null;
 assertions:AssertionObservation[];
 rollbackConformance:{status:'not-run'|'passed'|'refused';code?:'OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED'};
 attestationVerification:'not-assessed';custodyQualified:false;financialActionsPerformed:0;
 failure?:{stage:Stage;name:string};
}
const bytes=(value:BufferSource)=>new Uint8Array(value instanceof ArrayBuffer?value:value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength));
const encoded=(value:BufferSource)=>{
 const source=bytes(value);if(source.length>128*1024)throw new DOMException('Device response exceeds diagnostic limit','DataError');
 let binary='';for(let offset=0;offset<source.length;offset+=16384)binary+=String.fromCharCode(...source.subarray(offset,offset+16384));
 return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const decoded=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)).buffer;
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const optionalBoolean=(value:unknown)=>typeof value==='boolean'?value:null;
function extensionObservation(value:unknown):PublicExtensions {
 const root=object(value),prf=object(root.prf),blob=object(root.largeBlob),results=object(prf.results);
 return{prfEnabled:optionalBoolean(prf.enabled),prfOutputProvided:results.first instanceof ArrayBuffer&&results.first.byteLength===32,largeBlobSupported:optionalBoolean(blob.supported),largeBlobReturned:blob.blob instanceof ArrayBuffer};
}
function authenticatorObservation(value:ArrayBuffer):Omit<NoteRegistrationEvidence,'format'>{
 const data=new Uint8Array(value);if(data.length<37)throw new DOMException('Malformed device response','DataError');
 return{counter:String(new DataView(value).getUint32(33)),userVerified:Boolean(data[32]&4),backupEligible:Boolean(data[32]&8),backedUp:Boolean(data[32]&16)};
}
function requireClientBinding(value:ArrayBuffer,type:'webauthn.create'|'webauthn.get',challenge:string,origin:string){
 const row=object(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(value)));
 if(row.type!==type||row.challenge!==challenge||row.origin!==origin||row.crossOrigin===true)throw new DOMException('Unexpected device response','DataError');
}
const errorName=(cause:unknown)=>{
 const name=object(cause).name;
 return typeof name==='string'&&['AbortError','NotAllowedError','NotSupportedError','SecurityError','InvalidStateError','DataError','OperationError'].includes(name)?name:'Error';
};
async function passive<T>(read:()=>Promise<T>,signal:AbortSignal):Promise<T|null>{
 return new Promise(resolve=>{
  let settled=false;
  const finish=(value:T|null)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);resolve(value);};
  const cancel=()=>finish(null),timer=setTimeout(cancel,2000);
  if(signal.aborted){cancel();return;}
  signal.addEventListener('abort',cancel,{once:true});
  Promise.resolve().then(read).then(finish,()=>finish(null));
 });
}
/** Metadata-only safety guard. Some authenticators share a counter between
 * credentials; never add test assertions alongside retained qualified slots.
 * This reads their count, never keys or Note sources, and creates no database. */
export async function deviceCustodyProbeReadiness(signal:AbortSignal):Promise<'ready'|'existing-custody'|'unavailable'>{
 try{
  if(typeof indexedDB==='undefined'||typeof indexedDB.databases!=='function')return'unavailable';
  const databases=await passive(()=>indexedDB.databases(),signal);
  if(!databases)return'unavailable';
  const name='receiz-offline-note-qualified-custody-v1';
  if(!databases.some(database=>database.name===name))return'ready';
  const count=await passive(()=>new Promise<number>((resolve,reject)=>{
   const request=indexedDB.open(name);
   // If deletion raced the metadata read, abort creation and refuse the probe.
   request.onupgradeneeded=()=>request.transaction?.abort();
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result;
    if(signal.aborted||!db.objectStoreNames.contains('custody-slots')){db.close();reject(Error('CUSTODY_PROBE_UNAVAILABLE'));return;}
    const transaction=db.transaction('custody-slots','readonly'),read=transaction.objectStore('custody-slots').count();
    read.onsuccess=()=>{db.close();resolve(read.result);};
    read.onerror=()=>{db.close();reject(read.error);};
    transaction.onabort=()=>{db.close();reject(transaction.error);};
   };
  }),signal);
  return count===null?'unavailable':count===0?'ready':'existing-custody';
 }catch{return'unavailable';}
}
/** Explicit nonfinancial diagnostic only. A fresh test passkey is the sole
 * assertion target. No identity, Note slot, storage journal or host is opened.
 * Even a successful SDK counter test is never custody qualification. */
export async function inspectDeviceCustodyEvidence(input:{signal:AbortSignal;onProgress?:(stage:Stage)=>void}):Promise<DeviceCustodyEvidence>{
 const origin=location.origin,rpId=bankNoteRpId(origin)??location.hostname;
 const standalone=typeof matchMedia==='function'&&matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
 const report:DeviceCustodyEvidence={schema:'bankeiz.device-custody-inspection.v1',authority:'diagnostics-only',receizVersion:'129.0.0',secureContext:isSecureContext,webAuthnAvailable:typeof PublicKeyCredential!=='undefined'&&Boolean(navigator.credentials),realm:{origin,rpId},context:standalone?'standalone':'browser',platformAuthenticatorAdvertised:null,advertisedExtensions:{prf:null,largeBlob:null},registration:null,assertions:[],rollbackConformance:{status:'not-run'},attestationVerification:'not-assessed',custodyQualified:false,financialActionsPerformed:0};
 let stage:Stage='availability';
 try{
  input.signal.throwIfAborted();
  if(!report.secureContext||!report.webAuthnAvailable)throw new DOMException('WebAuthn unavailable','NotSupportedError');
  const challenge=crypto.getRandomValues(new Uint8Array(32)),prfSalt=crypto.getRandomValues(new Uint8Array(32));
  stage='registration';input.onProgress?.(stage);
  // Start the modal directly from the user's click, before any awaited import
  // or passive capability read can discard its browser user activation.
  const registered=await navigator.credentials.create({signal:input.signal,publicKey:{challenge:challenge.buffer,rp:{id:rpId,name:'Bankeiz device evidence'},user:{id:crypto.getRandomValues(new Uint8Array(32)).buffer,name:`bankeiz-device-evidence-test-${crypto.randomUUID()}`,displayName:'Bankeiz device evidence test'},pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'required',userVerification:'required'},attestation:'direct',timeout:60000,extensions:{prf:{},largeBlob:{support:'preferred'}} as Extensions}}) as PublicKeyCredential|null;
  input.signal.throwIfAborted();
  if(!registered||registered.type!=='public-key'||registered.authenticatorAttachment!=='platform')throw new DOMException('Platform credential required','DataError');
  const registration=registered.response as AuthenticatorAttestationResponse;
  requireClientBinding(registration.clientDataJSON,'webauthn.create',encoded(challenge),origin);
  const diagnostic=readNoteRegistrationEvidence({response:{attestationObject:encoded(registration.attestationObject)}});
  if(!diagnostic)throw new DOMException('Malformed registration','DataError');
  report.registration={...diagnostic,attachment:'platform',extensions:extensionObservation(registered.getClientExtensionResults())};
  const spki=registration.getPublicKey();
  if(!spki||registration.getPublicKeyAlgorithm()!==-7)throw new DOMException('P-256 key required','NotSupportedError');
  const publicKey=await crypto.subtle.importKey('spki',spki,{name:'ECDSA',namedCurve:'P-256'},true,[]);
  const custodyPublicKeyRawB64u=encoded(await crypto.subtle.exportKey('raw',publicKey));
  const credentialId=bytes(registered.rawId),credentialIdB64u=encoded(credentialId);
  stage='verifier';input.onProgress?.(stage);
  const sdk=await loadReceiz();input.signal.throwIfAborted();
  stage='assertion';input.onProgress?.(stage);
  try{
   await sdk.runReceizOfflineNoteRollbackConformance({registrationCounter:diagnostic.counter,credential:{credentialIdB64u,custodyPublicKeyRawB64u,rpId,origin},webAuthn:{assert:async request=>{
    try{
    input.signal.throwIfAborted();
    if(request.credentialIdB64u!==credentialIdB64u)throw new DOMException('Fresh test credential required','DataError');
    const assertion=await navigator.credentials.get({signal:input.signal,publicKey:{challenge:decoded(request.challengeB64u),rpId,allowCredentials:[{id:credentialId.slice().buffer,type:'public-key',transports:['internal']}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:prfSalt.buffer}},largeBlob:{read:true}} as Extensions}}) as PublicKeyCredential|null;
    input.signal.throwIfAborted();
    if(!assertion||assertion.type!=='public-key'||assertion.id!==registered.id||encoded(assertion.rawId)!==credentialIdB64u||assertion.authenticatorAttachment!=='platform')throw new DOMException('Fresh test credential required','DataError');
    const response=assertion.response as AuthenticatorAssertionResponse;
    requireClientBinding(response.clientDataJSON,'webauthn.get',request.challengeB64u,origin);
    report.assertions.push({...authenticatorObservation(response.authenticatorData),extensions:extensionObservation(assertion.getClientExtensionResults())});
    return{authenticatorDataB64u:encoded(response.authenticatorData),clientDataJSONB64u:encoded(response.clientDataJSON),signatureB64u:encoded(response.signature)};
    }catch(cause){report.failure={stage:'assertion',name:errorName(cause)};throw cause;}
   }}});
   report.rollbackConformance={status:'passed'};
  }catch(cause){
   report.rollbackConformance={status:'refused',code:'OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED'};
   if(input.signal.aborted)throw new DOMException('Cancelled','AbortError');
   // The SDK intentionally returns one bounded failure for crypto, counter and
   // platform rejection. Do not reinterpret a refusal as hardware qualification.
   void cause;
  }
  const capabilities=PublicKeyCredential as typeof PublicKeyCredential&{getClientCapabilities?:()=>Promise<Record<string,boolean>>};
  const [platform,advertised]=await Promise.all([
   typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable==='function'?passive(()=>PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),input.signal):null,
   capabilities.getClientCapabilities?passive(()=>capabilities.getClientCapabilities!(),input.signal):null,
  ]);
  report.platformAuthenticatorAdvertised=platform;
  const values=object(advertised);report.advertisedExtensions={prf:optionalBoolean(values['extension:prf']),largeBlob:optionalBoolean(values['extension:largeBlob'])};
  input.signal.throwIfAborted();
 }catch(cause){report.failure={stage,name:errorName(cause)};}
 return report;
}
