import {readVaultCredential,readVaultHeader,type VaultCredential,type VaultHeader,type VaultOwner} from './encryption';
import {vaultBase64,vaultBytes,vaultCanonical} from './encoding';

export type VaultAssertion={credentialId:string;authenticatorData:string;clientDataJSON:string;signature:string};
type PrfInput=AuthenticationExtensionsClientInputs&{prf?:{eval?:{first:ArrayBuffer}}};
type PrfOutput={prf?:{enabled?:boolean;results?:{first?:ArrayBuffer}}};
const text=new TextEncoder();
const equal=(a:Uint8Array,b:Uint8Array)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const fail=():never=>{throw Error('VAULT_PRESENCE_INVALID');};
function signatureRaw(der:Uint8Array):Uint8Array<ArrayBuffer>{
 if(der.length<8||der.length>72||der[0]!==48||der[1]!==der.length-2)fail();
 let offset=2;
 const integer=()=>{
  if(der[offset++]!==2)fail();const count=der[offset++];
  if(!count||count>33||offset+count>der.length||der[offset]&128||count>1&&der[offset]===0&&!(der[offset+1]&128))fail();
  let value=der.slice(offset,offset+count);offset+=count;if(value.length===33){if(value[0]!==0)fail();value=value.slice(1);}
  const padded=new Uint8Array(32);padded.set(value,32-value.length);return padded;
 };
 const r=integer(),s=integer();if(offset!==der.length)fail();const out=new Uint8Array(64);out.set(r);out.set(s,32);return out;
}
/** A recoverable passkey proves device verification; it does not qualify
 * non-rollbackable financial custody or establish ownership of a value source. */
export async function verifyVaultAssertion(descriptor:VaultCredential,challenge:string,assertion:VaultAssertion):Promise<void>{
 const c=readVaultCredential(descriptor);
 if(assertion.credentialId!==c.id)fail();
 vaultBytes(challenge,1024);
 const auth=vaultBytes(assertion.authenticatorData,4096),client=vaultBytes(assertion.clientDataJSON,8192),signature=vaultBytes(assertion.signature,72);
 if(auth.length<37||!equal(auth.slice(0,32),new Uint8Array(await crypto.subtle.digest('SHA-256',text.encode(c.rpId))))||(auth[32]&5)!==5||(auth[32]&16)&&!(auth[32]&8))fail();
 const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(client)) as Record<string,unknown>;
 if(!data||data.type!=='webauthn.get'||data.origin!==c.origin||data.challenge!==challenge||data.crossOrigin===true||data.topOrigin!==undefined&&data.topOrigin!==c.origin)fail();
 const signed=new Uint8Array(auth.length+32);signed.set(auth);signed.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),auth.length);
 const key=await crypto.subtle.importKey('spki',vaultBytes(c.publicKeySpki,512),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signatureRaw(signature),signed))fail();
}
function available(signal:AbortSignal){
 signal.throwIfAborted();
 if(typeof isSecureContext==='undefined'||!isSecureContext||typeof navigator==='undefined'||!navigator.credentials)throw Error('VAULT_DEVICE_UNAVAILABLE');
 if(typeof window!=='undefined'&&window.self!==window.top)throw Error('VAULT_TOP_LEVEL_REQUIRED');
}
export async function registerVaultCredential(owner:VaultOwner,signal:AbortSignal):Promise<VaultCredential>{
 available(signal);
 const origin=location.origin,rpId=location.hostname,challenge=crypto.getRandomValues(new Uint8Array(32));
 const created=await navigator.credentials.create({signal,publicKey:{challenge:challenge.buffer,rp:{id:rpId,name:'Vault'},user:{id:crypto.getRandomValues(new Uint8Array(32)).buffer,name:owner.receizId,displayName:owner.receizId},pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{residentKey:'required',userVerification:'required'},attestation:'none',timeout:60000,extensions:{prf:{}} as PrfInput}}) as PublicKeyCredential|null;
 signal.throwIfAborted();if(!created||created.type!=='public-key')throw Error('VAULT_PRESENCE_CANCELLED');
 if((created.getClientExtensionResults() as PrfOutput).prf?.enabled!==true)throw Error('VAULT_PRF_UNAVAILABLE');
 const response=created.response as AuthenticatorAttestationResponse,client=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(response.clientDataJSON)) as Record<string,unknown>;
 if(client.type!=='webauthn.create'||client.challenge!==vaultBase64(challenge)||client.origin!==origin||client.crossOrigin===true||created.id!==vaultBase64(new Uint8Array(created.rawId)))fail();
 if(response.getPublicKeyAlgorithm()!==-7)throw Error('VAULT_DEVICE_UNAVAILABLE');
 const spki=response.getPublicKey();if(!spki)throw Error('VAULT_DEVICE_UNAVAILABLE');
 await crypto.subtle.importKey('spki',spki,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);signal.throwIfAborted();
 // Readiness requires a subsequent real assertion and successful encrypted
 // save/reopen rehearsal. Registration alone never moves value or marks ready.
 return readVaultCredential({id:created.id,publicKeySpki:vaultBase64(new Uint8Array(spki)),rpId,origin});
}
export async function requestVaultPresence(input:VaultHeader,action:unknown,signal:AbortSignal):Promise<{secret:Uint8Array<ArrayBuffer>;assertion:VaultAssertion;challenge:string;actionDigest:string}>{
 available(signal);const header=readVaultHeader(input),c=header.credential;
 if(location.origin!==c.origin||location.hostname!==c.rpId&&!location.hostname.endsWith('.'+c.rpId))throw Error('VAULT_ORIGIN_MISMATCH');
 const exact=vaultCanonical({schema:'bank.vault.presence-action.v1',vaultId:header.id,owner:header.owner,purpose:header.purpose,action});
 if(text.encode(exact).length>8192)throw Error('VAULT_ACTION_CAPACITY');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',text.encode(exact))),actionDigest=[...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
 const bound=new Uint8Array(64);bound.set(digest);bound.set(crypto.getRandomValues(new Uint8Array(32)),32);const challenge=vaultBase64(bound);
 signal.throwIfAborted();
 const credential=await navigator.credentials.get({signal,publicKey:{rpId:c.rpId,challenge:bound.buffer,allowCredentials:[{id:vaultBytes(c.id,1024).buffer,type:'public-key'}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:vaultBytes(header.prfSalt,32).buffer}}} as PrfInput}}) as PublicKeyCredential|null;
 signal.throwIfAborted();if(!credential)throw Error('VAULT_PRESENCE_CANCELLED');
 if(credential.type!=='public-key'||credential.id!==c.id||vaultBase64(new Uint8Array(credential.rawId))!==c.id)fail();
 const response=credential.response as AuthenticatorAssertionResponse;
 const assertion={credentialId:credential.id,authenticatorData:vaultBase64(new Uint8Array(response.authenticatorData)),clientDataJSON:vaultBase64(new Uint8Array(response.clientDataJSON)),signature:vaultBase64(new Uint8Array(response.signature))};
 await verifyVaultAssertion(c,challenge,assertion);signal.throwIfAborted();
 const result=(credential.getClientExtensionResults() as PrfOutput).prf?.results?.first;
 if(!(result instanceof ArrayBuffer)||result.byteLength!==32)throw Error('VAULT_PRF_UNAVAILABLE');
 return{secret:new Uint8Array(result.slice(0)),assertion,challenge,actionDigest};
}
