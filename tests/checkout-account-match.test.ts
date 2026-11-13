import {expect,it,vi} from 'vitest';
import * as sdk from '@receiz/sdk';
import {matchesCheckoutAccountEmail} from '../src/receiz/checkout-account-match';
import {relayNativeAccount} from '../server/native-account';
import {permittedNativePath} from '../src/receiz/native-transport';

it('signs only the fixed existing-account match request with the actual SDK key and forwards its exact bytes',async()=>{
 const uid='11111111-1111-4111-8111-111111111111',created=await sdk.createReceizIdentityKeyFile({owner:{uid}}),calls:any[]=[];
 const request:typeof fetch=async(input,init)=>{calls.push({input,init});return Response.json({matched:true});};
 expect(await matchesCheckoutAccountEmail({sdk,keyFile:created.keyFile,phrase:'',accountUid:uid,request},' TARGET@example.org ')).toBe(true);
 expect(calls).toHaveLength(1);const call=calls[0],path='/api/auth/receiz-id/account-match',body=String(call.init.body),headers=new Headers(call.init.headers),envelope=JSON.parse(new TextDecoder().decode(sdk.receizBase64UrlDecode(headers.get('x-receiz-local-action-challenge')!)));
 expect(call.input).toBe('https://receiz.com'+path);expect(call.init.method).toBe('POST');expect(JSON.parse(body)).toEqual({purpose:'bankeiz.paid-booking.identity-match.v1',email:'target@example.org'});
 expect(envelope).toMatchObject({actionKind:'identity.account.match',scope:'bankeiz:paid-booking:identity-match',actor:{uid,receizKeyId:created.keyId},request:{method:'POST',path,bodyHashHex:await sdk.sha256ReceizBytes(new TextEncoder().encode(body)),bodyReplayText:null,replayable:false}});
 expect(await sdk.verifyReceizIdentityPublicKeyProjectionSignature({keyId:created.keyId,alg:created.alg,publicKeyRawB64u:created.publicKeyRawB64u,challengeB64Url:headers.get('x-receiz-local-action-challenge')!,signatureB64Url:headers.get('x-receiz-local-action-signature')!})).toBe(true);
 const upstream=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>Response.json({matched:true}));vi.stubGlobal('fetch',upstream);
 try{const response=await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native'+path,{method:'POST',headers,body}));expect(response.status).toBe(200);expect(upstream).toHaveBeenCalledOnce();expect(upstream.mock.calls[0][0]).toBe('https://receiz.com'+path);const forwarded=upstream.mock.calls[0][1] as RequestInit;expect(forwarded.body).toBe(body);expect(new Headers(forwarded.headers).get('origin')).toBe('https://bankeiz.com');for(const name of headers.keys())expect(new Headers(forwarded.headers).get(name)).toBe(headers.get(name));expect(forwarded.credentials).toBe('omit');}finally{vi.unstubAllGlobals();}
 expect(permittedNativePath(path,'POST')).toBe(true);expect(permittedNativePath(path+'?email=target@example.org','POST')).toBe(false);expect(permittedNativePath(path,'GET')).toBe(false);
});
it.each([Response.json({matched:false}),Response.json({matched:true},{status:503}),Response.json({ok:true}),Response.json({matched:'true'})])('refuses an unavailable or unmatched canonical account without a fallback',async response=>{
 const created=await sdk.createReceizIdentityKeyFile({owner:{uid:'22222222-2222-4222-8222-222222222222'}});
 expect(await matchesCheckoutAccountEmail({sdk,keyFile:created.keyFile,phrase:'',accountUid:created.keyFile.owner.uid,request:async()=>response},'target@example.org')).toBe(false);
});
