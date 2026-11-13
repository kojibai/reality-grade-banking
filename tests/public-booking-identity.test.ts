import {expect,it,vi} from 'vitest';
import * as sdk from '@receiz/sdk';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {createPublicBookingIdentity} from '../src/receiz/public-booking-identity';
import {handlePublicBookingConversation} from '../server/public-booking-conversation';

it('keeps first Send independent of a stalled held-identity restore',async()=>{
 const restore=vi.fn(()=>new Promise<OpenIdentity|null>(()=>{})),identity=createPublicBookingIdentity({restore});
 identity.warm();
 expect(identity.sign('/api/bank/booking/alice/conversation','{}')).toBeNull();
 expect(restore).toHaveBeenCalledOnce();identity.dispose();
});

it('carries the exact signed request through the existing relay without another browser request',async()=>{
 const rawBody=' { "message":"Tuesday?", "clientOperationId":"exact-operation", "quoteExpiresAt":"2026-11-13T22:00:00.000Z", "clientUserMessageId":"exact-user-message", "clientAssistantMessageId":"exact-assistant-message", "replyToOperationId":null, "locale":"en-US", "timezone":"UTC" } ';
 const headers=new Headers({'origin':'https://bankeiz.com','cookie':'receiz_world_visitor=guest_exact_visitor','content-type':'application/json','x-receiz-local-action-id':'a'.repeat(64),'x-receiz-local-action-key-id':'b'.repeat(64),'x-receiz-local-action-public-key':'public','x-receiz-local-action-challenge':'challenge','x-receiz-local-action-signature':'signature'});
 const calls:any[]=[];await handlePublicBookingConversation(new Request('https://bankeiz.com/api/bank/booking/alice/conversation?slotMinutes=30',{method:'POST',headers,body:rawBody}),{fetch:async(url,init)=>{calls.push({url,init,body:JSON.parse(String(init?.body))});return Response.json({ok:true,world:{username:'alice'},assistantMessage:{id:'exact-assistant-message'},reply:{message:'Tuesday works.'}});}});
 expect(calls).toHaveLength(1);expect(calls[0].url).toBe('https://receiz.com/api/world/profile/alice/stream');expect(calls[0].body.bookingIdentity).toMatchObject({path:'/api/bank/booking/alice/conversation?slotMinutes=30',bodyText:rawBody,headers:{'x-receiz-local-action-signature':'signature'}});expect(calls[0].body.visitorKey).toBe('guest_exact_visitor');
});

it('signs the exact booking body using the existing SDK key without any account request',async()=>{
 const uid='11111111-1111-4111-8111-111111111111',created=await sdk.createReceizIdentityKeyFile({owner:{uid,displayName:'Alex Rivera'}});
 const dispose=vi.fn(),identity=createPublicBookingIdentity({restore:async()=>({binding:{keyId:created.keyId,identityOwnerReceizId:uid,publicKeyRawB64u:created.publicKeyRawB64u},backup:()=>({bytes:new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(created.keyFile)),phrase:'',filename:'test.receizkey'}),knownProfile:()=>({userId:uid,displayName:'Alex Rivera'}),knownWallet:()=>null,localHistory:{portableStateVerified:false},dispose} as unknown as OpenIdentity)});
 await identity.warm();const body='{"message":"Tuesday?","clientOperationId":"exact-operation"}',headers=await identity.sign('/api/bank/booking/alice/conversation?slotMinutes=30',body)!;
 expect(headers).not.toBeNull();
 const envelope=JSON.parse(new TextDecoder().decode(sdk.receizBase64UrlDecode(headers!['x-receiz-local-action-challenge'])));
 expect(envelope.actor).toMatchObject({uid,displayName:'Alex Rivera',receizKeyId:created.keyId});
 expect(envelope.request).toMatchObject({method:'POST',path:'/api/bank/booking/alice/conversation?slotMinutes=30',bodyHashHex:await sdk.sha256ReceizBytes(new TextEncoder().encode(body)),bodyReplayText:null,replayable:false});
 expect(await sdk.verifyReceizIdentityPublicKeyProjectionSignature({keyId:created.keyId,alg:created.alg,publicKeyRawB64u:created.publicKeyRawB64u,challengeB64Url:headers!['x-receiz-local-action-challenge'],signatureB64Url:headers!['x-receiz-local-action-signature']})).toBe(true);
 expect(JSON.stringify(headers)).not.toContain('privateKey');expect(identity.sign('/api/connect/transfers',body)).toBeNull();identity.dispose();expect(dispose).toHaveBeenCalledOnce();expect(identity.sign('/api/bank/booking/alice/conversation',body)).toBeNull();
});
