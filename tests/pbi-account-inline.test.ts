import {afterEach,expect,it,vi} from 'vitest';
import {runPbiAccountInline,runPbiAccountInlineConnection} from '../src/receiz/pbi-account-inline';
const uid='11111111-1111-4111-8111-111111111111';
const device={keyId:'key',alg:'Ed25519',publicKeyRawB64u:'pub',localUid:'device'};
const credential={id:'credential',type:'public-key',rawId:new Uint8Array([1,2]).buffer,response:{clientDataJSON:new Uint8Array([1]).buffer,authenticatorData:new Uint8Array([2]).buffer,signature:new Uint8Array([3]).buffer,attestationObject:new Uint8Array([4]).buffer,userHandle:null}};
function setup(mode='existing'){
 const get=vi.fn(async(_options:CredentialRequestOptions)=>{if(mode==='new'||mode==='cancel')throw new DOMException('cancel','NotAllowedError');return credential;}),create=vi.fn(async()=>{if(mode==='cancel')throw new DOMException('cancel','NotAllowedError');return credential;});
 vi.stubGlobal('navigator',{credentials:{get,create}});vi.stubGlobal('window',{open:()=>{throw Error('MUST_STAY_ON_PAGE');}});
 const fetch=vi.fn(async(input:string,init?:RequestInit)=>{
  const operation=input==='https://receiz.com/api/auth/passkey/related/begin'?'begin':input.split('/pbi/')[1],body=init?.body?JSON.parse(String(init.body)):{};
  if(operation==='begin'||operation==='enroll')return Response.json({ok:true,flow:body.intent==='register'||operation==='enroll'?'register':'authenticate',challengeId:'challenge',challengeB64Url:'Y2hhbGxlbmdl',rpId:mode==='realm'?'wrong.test':'receiz.com',rpName:'Receiz',user:{idB64Url:Buffer.from(uid.replaceAll('-',''),'hex').toString('base64url'),name:'Account',displayName:'Account'}});
  if(operation==='finish'||operation==='switch')return Response.json({ok:true,session:{uid:mode==='wrong-account'?'other':uid}});
  if(operation==='credential')return Response.json({credential:mode==='other-device'?{credIdB64Url:'YW5vdGhlcg',pubKeyPem:'other'}:null});
  if(operation==='bind')return Response.json({ok:true,accountUid:uid,sourceMode:'legacy-sql',binding:device});
  if(operation?.startsWith('credential-source?'))return Response.json({ok:true,accountUid:uid,credentialId:'AQI',sourceMode:'legacy-sql'});
  throw Error('UNEXPECTED_'+operation);
 });vi.stubGlobal('fetch',fetch);return{get,create,fetch};
}
afterEach(()=>vi.unstubAllGlobals());
it.each(['existing','new'])('runs %s account ceremony on this screen with the canonical RP',async mode=>{
 const f=setup(mode),sign=vi.fn(async()=>({challengeB64Url:'signed',signatureB64Url:'proof'}));
 const result=await runPbiAccountInline(device,sign);expect(result.accountUid).toBe(uid);expect(sign).toHaveBeenCalledExactlyOnceWith(uid);expect(f.get.mock.calls[0][0].publicKey!.rpId).toBe('receiz.com');expect(f.create).toHaveBeenCalledTimes(mode==='new'?1:0);expect(f.fetch.mock.calls.filter(([url])=>url.endsWith('/finish'))).toHaveLength(1);
});
it.each(['cancel','realm'])('leaves retained identity untouched after %s without binding',async mode=>{
 const f=setup(mode);await expect(runPbiAccountInline(device,async()=>({challengeB64Url:'signed',signatureB64Url:'proof'}))).rejects.toThrow();expect(f.fetch.mock.calls.some(([url])=>url.endsWith('/bind'))).toBe(false);if(mode==='realm')expect(f.get).not.toHaveBeenCalled();
});
it('connects only the open account and rejects a changed account before enrollment',async()=>{
 const f=setup('wrong-account');await expect(runPbiAccountInlineConnection(device,uid,async()=>({challengeB64Url:'signed',signatureB64Url:'proof'}),()=>{})).rejects.toThrow('PBI_ACCOUNT_MISMATCH');expect(f.create).not.toHaveBeenCalled();
});
it('creates anonymous challenges directly at the canonical host so visitors retain their own rate-limit buckets',async()=>{
 const fetch=vi.fn(async(_input:string,_init?:RequestInit)=>Response.json({ok:true}));vi.stubGlobal('fetch',fetch);
 const {pbiAccountRequest}=await import('../src/receiz/pbi-account-inline');await pbiAccountRequest('begin',{intent:'auto'});
 expect(fetch.mock.calls[0][0]).toBe('https://receiz.com/api/auth/passkey/related/begin');expect(fetch.mock.calls[0][1]?.credentials).toBe('omit');
});
it('allows an owned older passkey when another device last used a different account credential',async()=>{
 const f=setup('other-device');await runPbiAccountInlineConnection(device,uid,async()=>({challengeB64Url:'signed',signatureB64Url:'proof'}),()=>{});
 expect(f.get.mock.calls[0][0].publicKey?.allowCredentials).toBeUndefined();expect(f.fetch.mock.calls.filter(([url])=>url.endsWith('/enroll'))).toHaveLength(0);
});
it('enrolls only the open account when no existing passkey is available',async()=>{
 const f=setup('new');const result=await runPbiAccountInlineConnection(device,uid,async()=>({challengeB64Url:'signed',signatureB64Url:'proof'}),()=>{});
 expect(result.accountUid).toBe(uid);expect(f.create).toHaveBeenCalledOnce();expect(f.fetch.mock.calls.filter(([url])=>url.endsWith('/enroll'))).toHaveLength(1);expect(f.fetch.mock.calls.some(([,init])=>String(init?.body).includes('"intent":"register"'))).toBe(false);
});
