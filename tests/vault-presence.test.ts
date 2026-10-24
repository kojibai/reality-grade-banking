import {afterEach,expect,it,vi} from 'vitest';
import {vaultBase64,vaultBytes} from '../src/receiz/vault/encoding';
import {createVaultHeader} from '../src/receiz/vault/encryption';
import {requestVaultPresence,verifyVaultAssertion,registerVaultCredential} from '../src/receiz/vault/presence';

afterEach(()=>vi.unstubAllGlobals());
const encoder=new TextEncoder(),origin='https://bankeiz.com',rpId='bankeiz.com';
async function fixture(){
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const credential={id:vaultBase64(encoder.encode('fixture-credential')),publicKeySpki:vaultBase64(new Uint8Array(await crypto.subtle.exportKey('spki',keys.publicKey))),origin,rpId};
 const challenge=vaultBase64(crypto.getRandomValues(new Uint8Array(32)));
 async function sign(value=challenge,flags=0x1d,actualOrigin=origin){
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(rpId))));auth[32]=flags;
  const client=encoder.encode(JSON.stringify({type:'webauthn.get',challenge:value,origin:actualOrigin,crossOrigin:false})),data=new Uint8Array(auth.length+32);data.set(auth);data.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),auth.length);
  const raw=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,data));
  const integer=(v:Uint8Array)=>{let offset=0;while(offset<v.length-1&&v[offset]===0)offset++;const part=v.slice(offset),out=new Uint8Array(part.length+(part[0]&128?1:0));out.set(part,out.length-part.length);return out;};
  const r=integer(raw.slice(0,32)),s=integer(raw.slice(32)),der=new Uint8Array(6+r.length+s.length);der.set([48,der.length-2,2,r.length]);der.set(r,4);der.set([2,s.length],4+r.length);der.set(s,6+r.length);
  return{credentialId:credential.id,authenticatorData:vaultBase64(auth),clientDataJSON:vaultBase64(client),signature:vaultBase64(der)};
 }
 return{credential,challenge,sign};
}
function globals(get:(request:any)=>Promise<any>){vi.stubGlobal('isSecureContext',true);vi.stubGlobal('location',{origin,hostname:rpId});vi.stubGlobal('navigator',{credentials:{get}});}
it('verifies a genuine PBI assertion from a recoverable passkey without pretending its counter is irreversible custody',async()=>{
 const f=await fixture();await expect(verifyVaultAssertion(f.credential,f.challenge,await f.sign())).resolves.toBeUndefined();
});
it.each([0,1,4,0x19])('refuses an assertion without both user presence and verification (%s)',async flags=>{
 const f=await fixture();await expect(verifyVaultAssertion(f.credential,f.challenge,await f.sign(f.challenge,flags))).rejects.toThrow();
});
it('refuses changed challenge, origin, credential and signature even when the carrier says it was verified',async()=>{
 const f=await fixture(),a=await f.sign();
 await expect(verifyVaultAssertion(f.credential,'Zm9yZ2VkLWNoYWxsZW5nZQ',a)).rejects.toThrow();
 await expect(verifyVaultAssertion(f.credential,f.challenge,await f.sign(f.challenge,0x1d,'https://evil.example'))).rejects.toThrow();
 await expect(verifyVaultAssertion({...f.credential,id:'b3RoZXI'},f.challenge,a)).rejects.toThrow();
 const signature=vaultBytes(a.signature,100);signature[signature.length-1]^=1;
 await expect(verifyVaultAssertion(f.credential,f.challenge,{...a,signature:vaultBase64(signature)})).rejects.toThrow();
});
it('obtains a PRF secret only after verifying the exact credential, challenge, signature and device flags',async()=>{
 const f=await fixture(),h=createVaultHeader({purpose:'vault-private',owner:{keyId:'fixture',receizId:'fixture.receiz.id'},credential:f.credential,id:crypto.randomUUID()});
 globals(async options=>{const a=await f.sign(vaultBase64(new Uint8Array(options.publicKey.challenge)));return{id:f.credential.id,rawId:vaultBytes(f.credential.id,100).buffer,type:'public-key',response:{authenticatorData:vaultBytes(a.authenticatorData,100).buffer,clientDataJSON:vaultBytes(a.clientDataJSON,2000).buffer,signature:vaultBytes(a.signature,100).buffer},getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(9).buffer}}})};});
 const result=await requestVaultPresence(h,{kind:'unlock'},new AbortController().signal);
 expect([...result.secret]).toEqual(new Array(32).fill(9));expect(result.assertion.credentialId).toBe(f.credential.id);
});
it('does not release a PRF result from a credential with a bad signature',async()=>{
 const f=await fixture(),h=createVaultHeader({purpose:'vault-private',owner:{keyId:'fixture',receizId:'fixture.receiz.id'},credential:f.credential,id:crypto.randomUUID()});
 globals(async options=>{const a=await f.sign(vaultBase64(new Uint8Array(options.publicKey.challenge)));return{id:f.credential.id,rawId:vaultBytes(f.credential.id,100).buffer,type:'public-key',response:{authenticatorData:vaultBytes(a.authenticatorData,100).buffer,clientDataJSON:vaultBytes(a.clientDataJSON,2000).buffer,signature:new Uint8Array(64).buffer},getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).buffer}}})};});
 await expect(requestVaultPresence(h,{kind:'send'},new AbortController().signal)).rejects.toThrow();
});
it('refuses a different relying-party page before opening a device prompt',async()=>{
 const f=await fixture(),h=createVaultHeader({purpose:'vault-private',owner:{keyId:'fixture',receizId:'fixture.receiz.id'},credential:f.credential,id:crypto.randomUUID()});
 globals(async()=>{throw Error('prompt should never run');});vi.stubGlobal('location',{origin:'https://evil.example',hostname:'evil.example'});
 await expect(requestVaultPresence(h,{kind:'unlock'},new AbortController().signal)).rejects.toThrow('VAULT_ORIGIN_MISMATCH');
});
it('refuses a browser that cannot provide encryption-capable passkeys before producing recovery custody',async()=>{
 vi.stubGlobal('isSecureContext',true);vi.stubGlobal('location',{origin,hostname:rpId});
 vi.stubGlobal('navigator',{credentials:{create:async()=>({id:'Zml4dHVyZQ',type:'public-key',rawId:encoder.encode('fixture').buffer,getClientExtensionResults:()=>({prf:{enabled:false}})})}});
 await expect(registerVaultCredential({keyId:'fixture',receizId:'fixture.receiz.id'},new AbortController().signal)).rejects.toThrow('VAULT_PRF_UNAVAILABLE');
});
