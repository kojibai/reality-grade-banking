import {beforeEach,expect,it,vi} from 'vitest';
import {retainPbiIdentity,restorePbiIdentity} from '../src/receiz/pbi-identity-recovery';
import type {OpenIdentity} from '../src/receiz/native-identity';

const ports=vi.hoisted(()=>({request:vi.fn()}));
const keyId='a'.repeat(64);
const accountUid='ec7bc804-86f7-4258-87c8-934ae5d80484';
const ownerReceizId='receiz_original.receiz.id';
const credentialId='AQI';
const signed=vi.fn();
vi.mock('../src/receiz/pbi-account-inline',()=>({pbiAccountRequest:ports.request}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 sha256ReceizBytes:async (bytes:Uint8Array<ArrayBuffer>)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join(''),
 readReceizIdentityArtifact:async()=>({keyId,owner:{uid:ownerReceizId}}),
 signReceizIdentityLoginProof:async(input:unknown)=>{signed(input);return {signatureB64Url:'c2lnbmF0dXJl'};}
})}));
const identity=(bytes:Uint8Array)=>({
 backup:()=>({bytes:bytes.slice(),filename:'original.receiz.png',phrase:'test phrase'}),
 binding:{keyId,identityOwnerReceizId:ownerReceizId},
 dispose:vi.fn(),
}) as unknown as OpenIdentity;
const passkey=()=>({accountUid,credentialId,recoverySecret:new Uint8Array(32).fill(7)});
beforeEach(()=>{
 const values=new Map<string,string>();
 vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),clear:()=>values.clear()});
 ports.request.mockReset();
 signed.mockClear();
});

it('opens the exact saved Original in an empty install and refuses a different PRF result',async()=>{
 const exact=new TextEncoder().encode('the exact sealed record');
 let stored:{manifest:unknown;bytes:string}|undefined;
 ports.request.mockImplementation(async(operation:string,body?:typeof stored)=>{
  if(operation.startsWith('credential?'))return {credential:{credIdB64Url:credentialId,pubKeyPem:'-----BEGIN PUBLIC KEY-----\nAQI=\n-----END PUBLIC KEY-----'}};
  if(body){stored=structuredClone(body);return {ok:true};}
  return stored?{recovery:stored.manifest,bytes:stored.bytes}:{recovery:null};
 });
 await retainPbiIdentity(identity(exact),passkey());
 expect(signed).toHaveBeenCalledOnce();
 expect(JSON.stringify(stored)).not.toContain('test phrase');
 expect(JSON.stringify(stored)).not.toContain('the exact sealed record');
 const prior=ports.request.mock.calls.length;
 await retainPbiIdentity(identity(exact),passkey());
 expect(ports.request).toHaveBeenCalledTimes(prior);
 localStorage.clear();
 const canonical=identity(exact);
 const admit=vi.fn(async()=>canonical);
 const opened=await restorePbiIdentity(passkey(),admit);
 expect(admit).toHaveBeenCalledExactlyOnceWith({bytes:exact,filename:'original.receiz.png',phrase:'test phrase'});
 expect(opened).toBe(canonical);
 admit.mockClear();
 await expect(restorePbiIdentity({...passkey(),recoverySecret:new Uint8Array(32).fill(8)},admit)).rejects.toThrow('VAULT_UNLOCK_FAILED');
 expect(admit).not.toHaveBeenCalled();
});
