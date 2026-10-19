import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
import {syntheticWalletRecord} from './fixtures/wallet-send';

const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',conversation='10000000-0000-4000-8000-000000000003',transfer='10000000-0000-4000-8000-000000000004';
function fixture(){
 let state:any=null,record:any=null;const calls:string[]=[],writes=vi.fn(async(next:any,expected:any)=>{expect(state).toEqual(expected);state=structuredClone(next);});
 const request=vi.fn(async(path:string,options:any)=>{calls.push(path);if(path.startsWith('/api/chat/users/search?'))return{ok:true,users:[{kind:'user',userId:recipient,username:'receiver',displayName:'Receiver'}]};
  if(path.includes('amountUsd='))return{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'250',ecosystemUsdCents:'750',fundingRule:'settled_first_then_phi'}};
  if(path==='/api/chat/conversations'){expect(options.body.participantUserIds).toEqual([recipient]);return{ok:true,conversation:{id:conversation}};}
  return record??{ok:true,found:false};});
 const sdkTransfer=vi.fn(async(body:any):Promise<unknown>=>{expect(state.current.body).toEqual(body);const values={senderUserId:sender,recipientUserId:recipient,amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000'};
  const receipt={digest:'a'.repeat(64),payloadDigest:'b'.repeat(64),originDigest:'c'.repeat(64)};
  record={ok:true,found:true,transfer:{id:transfer,messageId:transfer,clientNonce:body.clientNonce,conversationId:conversation,...values},source:{transfer:{id:transfer,message_id:transfer,client_nonce:body.clientNonce,conversation_id:conversation,sender_user_id:sender,recipient_user_id:recipient,amount_usd_cents:'1000',amount_phi_micro:'10000000',usd_per_phi_microcents:'100000000',metadata:values},message:{id:transfer,conversation_id:conversation,sender_user_id:sender,body:'synthetic',wallet_transfer:values,receiz_receipt:receipt,sealed_original:{primitive:'receiz.chat.message.original.v1',messageId:transfer,conversationId:conversation,senderUserId:sender,body:'synthetic',walletTransfer:values,receiptDigest:receipt.digest,payloadDigest:receipt.payloadDigest,originDigest:receipt.originDigest}}}};throw Error('response lost');});
 const options={ownerReceizId:'sender.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async<T,>(f:()=>Promise<T>)=>f(),store:{read:async()=>state,write:writes},connect:async()=>({accountUid:sender,client:{request,connect:{transfer:sdkTransfer}}})};
 return{options,request,sdkTransfer,writes,calls,get state(){return state;},get record(){return record;},set record(value:any){record=value;}};
}
it('uses the SDK transfer with the exact retained nonce and resolves response loss by GET only',async()=>{
 const f=fixture(),api=createWalletSend(f.options),review=await api.prepare({recipient:'@Receiver',amountUsdCents:'1000'});
 expect(f.state).toBeNull();expect(f.sdkTransfer).not.toHaveBeenCalled();expect(review.quote.settledUsdCents).toBe('250');
 await expect(api.execute(review,'different')).rejects.toThrow();
 const result=await api.execute(review,review.digest);expect(result.status).toBe('recorded');expect(f.sdkTransfer).toHaveBeenCalledTimes(1);
 const body=f.state.current.body;expect(body).toMatchObject({unit:'usd',amountUsd:'10.00',recipientUserId:recipient,conversationId:conversation});expect(body).not.toHaveProperty('rail');
 const restored=createWalletSend(f.options);expect((await restored.status())?.status).toBe('recorded');expect((await restored.resolve(true))?.status).toBe('recorded');expect(f.sdkTransfer).toHaveBeenCalledTimes(1);
 expect(new TextDecoder().decode((await restored.exportRecord()).bytes)).toContain('wallet-observation');
});
it('keeps a missing lookup unknown and never repeats the payment',async()=>{
 const f=fixture();f.sdkTransfer.mockImplementation(async()=>{throw Error('lost');});const api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});
 expect((await api.execute(r,r.digest)).status).toBe('unknown');expect((await api.resolve(true))?.status).toBe('unknown');expect(f.sdkTransfer).toHaveBeenCalledTimes(1);
 await expect(api.prepare({recipient:'receiver',amountUsdCents:'1000'})).rejects.toThrow('PENDING');await expect(api.exportRecord()).rejects.toThrow();
});
it('cannot dispatch when retaining the request fails',async()=>{
 const f=fixture();f.writes.mockRejectedValue(Error('storage failed'));const api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});
 await expect(api.execute(r,r.digest)).rejects.toThrow('storage failed');expect(f.sdkTransfer).not.toHaveBeenCalled();
});
it('never selects a fuzzy username or AI result',async()=>{
 const f=fixture();f.request.mockImplementation(async()=>({ok:true,users:[{kind:'user',userId:recipient,username:'receiver2'},{kind:'ai',userId:recipient,username:'receiver'}]}));
 await expect(createWalletSend(f.options).prepare({recipient:'receiver',amountUsdCents:'1000'})).rejects.toThrow('RECIPIENT');expect(f.sdkTransfer).not.toHaveBeenCalled();
});
it('rejects another recipient’s outcome for the retained nonce',async()=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});f.sdkTransfer.mockImplementation(async()=>{f.record={ok:true,found:true,transfer:{id:transfer,clientNonce:f.state.current.body.clientNonce,conversationId:conversation,senderUserId:sender,recipientUserId:sender,amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000'}};return{};});
 expect((await api.execute(r,r.digest)).status).toBe('unknown');expect(f.state.current.status).toBe('unknown');
});
it.each(['missing','foreign-message','foreign-transfer','foreign-carried-party'])('does not mark %s originals recorded from a matching summary',async kind=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});
 f.sdkTransfer.mockImplementation(async(body:any)=>{f.record=syntheticWalletRecord(body,sender);if(kind==='missing')f.record.source={};if(kind==='foreign-message')f.record.source.message.id=sender;if(kind==='foreign-transfer')f.record.source.transfer.client_nonce='foreign';if(kind==='foreign-carried-party')f.record.source.message.sealed_original.walletTransfer.recipientUserId=sender;return{};});
 expect((await api.execute(r,r.digest)).status).toBe('unknown');expect(f.state.current.status).toBe('unknown');
});
it('notifies the identity after saving the complete outcome even when a form no longer exists',async()=>{
 const f=fixture(),onRecorded=vi.fn(async()=>{expect(f.state.current.status).toBe('recorded');}),api=createWalletSend({...f.options,onRecorded}),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});
 expect((await api.execute(r,r.digest)).status).toBe('recorded');expect(onRecorded).toHaveBeenCalledExactlyOnceWith(undefined,sender);
});
