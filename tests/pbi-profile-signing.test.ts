import {afterEach,expect,it,vi} from 'vitest';
import {signPbiProfile} from '../src/receiz/pbi-profile-signing';
import * as sdk from '@receiz/sdk';
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>import('@receiz/sdk')}));
const uid='11111111-1111-4111-8111-111111111111',device={keyId:'a'.repeat(64),alg:'Ed25519',publicKeyRawB64u:Buffer.from(new Uint8Array(32).fill(1)).toString('base64url'),localUid:'device'};
const b64=(value:ArrayBuffer|Uint8Array)=>Buffer.from(value instanceof Uint8Array?value:new Uint8Array(value)).toString('base64url');
afterEach(()=>vi.unstubAllGlobals());
it.each(['valid','wrong-action','wrong-origin','bad-signature','denied'] as const)('uses the actual SDK local PBI verifier and canonical profile enrollment: %s',async mode=>{
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),spki=await crypto.subtle.exportKey('spki',key.publicKey),pubKeyPem=`-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64')}\n-----END PUBLIC KEY-----`;
 const pubHash=await sdk.sha256ReceizBytes(sdk.receizBase64UrlDecode(device.publicKeyRawB64u));
 const actionHash=await sdk.sha256ReceizBytes(new TextEncoder().encode(['RECEIZ_IDENTITY_KEY_ENROLLMENT_V1',`userUid=${uid}`,`keyId=${device.keyId}`,`publicKeySha256Hex=${pubHash}`,'scope=IDENTITY_KEY_ENROLLMENT'].join('\n'))),challenge=b64(new TextEncoder().encode('synthetic-presence-challenge'));
 const enroll=vi.fn(async()=>Response.json(mode==='denied'?{ok:false,error:'pbi_denied'}:{ok:true,key:{keyId:device.keyId,pbiDecision:'PBI_VERIFIED',pbiReceiptHash:'b'.repeat(64),pbiChallengeId:'challenge-id',attestedAt:'2026-10-25T03:00:00Z'}}));
 vi.stubGlobal('fetch',vi.fn(async(input:string)=>{
  if(input.endsWith('/credential?credentialId=AQI'))return Response.json({credential:{credIdB64Url:'AQI',pubKeyPem}});
  if(input.endsWith('/presence-challenge'))return Response.json({ok:true,challenge:{id:'challenge-id',challengeB64Url:challenge,actionHashHex:mode==='wrong-action'?'c'.repeat(64):actionHash}});
  if(input.endsWith('/presence-enroll'))return enroll();throw Error('unexpected');
 }));
 vi.stubGlobal('navigator',{credentials:{get:async()=>{
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge,origin:mode==='wrong-origin'?'https://wrong.test':'https://bankeiz.com',crossOrigin:false})),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',client)),payload=new Uint8Array(69);payload.set(auth);payload.set(hash,37);
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.privateKey,payload));if(mode==='bad-signature')signature[0]^=1;
  return{type:'public-key',rawId:new Uint8Array([1,2]).buffer,response:{authenticatorData:auth.buffer,clientDataJSON:client.buffer,signature:signature.buffer}};
 }}});
 if(mode==='valid'){expect(await signPbiProfile(device,uid,'AQI',()=>{})).toMatchObject({pbiReceiptHash:'b'.repeat(64)});expect(enroll).toHaveBeenCalledOnce();}
 else{await expect(signPbiProfile(device,uid,'AQI',()=>{})).rejects.toThrow();expect(enroll).toHaveBeenCalledTimes(mode==='denied'?1:0);}
});
