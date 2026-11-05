import {afterEach,expect,it,vi} from 'vitest';
import {createReceizIdentityKeyFile,receizBase64UrlEncode,signReceizIdentityLoginProof,verifyReceizIdentityLoginProof} from '@receiz/sdk';
import {runPbiAccountInline} from '../src/receiz/pbi-account-inline';
afterEach(()=>vi.unstubAllGlobals());
it('binds the verified email account with actual installed SDK key possession through the unchanged recovered-account adapter',async()=>{
 const uid='10000000-0000-4000-8000-000000000002',passphrase='synthetic-private-test-secret';
 const {keyFile}=await createReceizIdentityKeyFile({owner:{uid:'synthetic-local-device'},passphrase});
 const device={keyId:keyFile.keyId,alg:keyFile.alg,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u,localUid:keyFile.owner.uid};
 const send=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  expect(input).toBe('/api/bank/native/pbi/bind');expect(init?.credentials).toBe('same-origin');
  const body=JSON.parse(String(init?.body)),challenge=new TextDecoder().decode(Uint8Array.from(atob(body.challengeB64Url.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));
  expect(challenge).toContain(`sessionUid=${uid}`);expect(challenge).toContain(`keyId=${keyFile.keyId}`);expect(challenge).toContain(`localUid=${keyFile.owner.uid}`);
  expect(await verifyReceizIdentityLoginProof({keyFile,challengeB64Url:body.challengeB64Url,signatureB64Url:body.signatureB64Url})).toBe(true);
  expect(await verifyReceizIdentityLoginProof({keyFile,challengeB64Url:receizBase64UrlEncode(new TextEncoder().encode(challenge.replace(uid,'10000000-0000-4000-8000-000000000003'))),signatureB64Url:body.signatureB64Url})).toBe(false);
  return Response.json({ok:true,accountUid:uid,sourceMode:'legacy-sql',binding:device});
 });vi.stubGlobal('fetch',send);
 const result=await runPbiAccountInline(device,async accountUid=>{
  const challengeB64Url=receizBase64UrlEncode(new TextEncoder().encode(['RECEIZ_DEVICE_BIND_V1',`keyId=${keyFile.keyId}`,`localUid=${keyFile.owner.uid}`,`sessionUid=${accountUid}`,`issuedAtMs=${Date.now()}`,'nonce=synthetic-exact-device-bind-nonce'].join('\n')));
  const proof=await signReceizIdentityLoginProof({keyFile,passphrase,challengeB64Url});return{challengeB64Url,signatureB64Url:proof.signatureB64Url};
 },Promise.resolve({accountUid:uid}));
 expect(result.accountUid).toBe(uid);expect(send).toHaveBeenCalledOnce();expect(result.request).toMatchObject(device);
});
