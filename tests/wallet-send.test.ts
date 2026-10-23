import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
import {syntheticWalletRecord} from './fixtures/wallet-send';

const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',conversation='10000000-0000-4000-8000-000000000003',transfer='10000000-0000-4000-8000-000000000004';
function fixture(){
 let state:any=null,record:any=null;const calls:string[]=[],writes=vi.fn(async(next:any,expected:any)=>{expect(state).toEqual(expected);state=structuredClone(next);});
 const request=vi.fn(async(path:string,options:any)=>{calls.push(path);if(path.startsWith('/api/chat/users/search?'))return{ok:true,users:[{kind:'user',userId:recipient,username:'receiver',displayName:'Receiver'}]};
  if(path==='/api/connect/transfers/public-note')return sdkTransfer(options.body);if(path.includes('amountUsd='))return{ok:true,senderUserId:sender,capabilities:{publicTransferNotes:true},quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'250',ecosystemUsdCents:'750',fundingRule:'settled_first_then_phi'}};
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
it('binds an optional public note into approval, the SDK request and the recovered original',async()=>{
 const f=fixture(),api=createWalletSend(f.options),review=await api.prepare({recipient:'receiver',amountUsdCents:'1000',note:'  For   lunch  '});
 expect(review.note).toBe('For lunch');
 f.sdkTransfer.mockImplementation(async(body:any)=>{expect(body.note).toBe('For lunch');expect(body.noteVisibility).toBe('public');f.record=syntheticWalletRecord(body,sender);for(const v of [f.record.source.transfer.metadata,f.record.source.message.wallet_transfer,f.record.source.message.sealed_original.walletTransfer]){v.note=body.note;v.noteVisibility=body.noteVisibility;}return{};});
 expect((await api.execute(review,review.digest)).status).toBe('recorded');expect((await createWalletSend(f.options).status())?.status).toBe('recorded');
 f.state.current.record.source.message.sealed_original.walletTransfer.note='different';await expect(api.resolve(true)).rejects.toThrow(/MISMATCH/);
});
it('rejects a note longer than the Wallet limit before sending or saving a checkpoint',async()=>{const f=fixture();await expect(createWalletSend(f.options).prepare({recipient:'receiver',amountUsdCents:'1000',note:'a'.repeat(281)})).rejects.toThrow();expect(f.sdkTransfer).not.toHaveBeenCalled();expect(f.state).toBeNull();});

it('refuses a public note before submission on an older service',async()=>{const f=fixture(),original=f.request.getMockImplementation()!;f.request.mockImplementation(async(path,options)=>{const raw:any=await original(path,options);if(path.includes('amountUsd='))delete raw.capabilities;return raw;});await expect(createWalletSend(f.options).prepare({recipient:'receiver',amountUsdCents:'1000',note:'public'})).rejects.toThrow('PUBLIC_NOTE_UNAVAILABLE');expect(f.sdkTransfer).not.toHaveBeenCalled();expect(f.state).toBeNull();});
it('cannot submit a public note through the old private-note endpoint during a service rollback',async()=>{const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000',note:'public'}),original=f.request.getMockImplementation()!;f.request.mockImplementation(async(path,options)=>{if(path==='/api/connect/transfers/public-note')throw Object.assign(Error('not found'),{status:404});return original(path,options);});expect(await api.execute(r,r.digest)).toMatchObject({status:'not-sent',reason:'public_note_unavailable'});expect(f.sdkTransfer).not.toHaveBeenCalled();expect((await createWalletSend(f.options).status())?.status).toBe('not-sent');});
it('allows only the exact protected public-note POST route',async()=>{const{permittedNativePath}=await import('../src/receiz/native-transport');expect(permittedNativePath('/api/connect/transfers/public-note','POST')).toBe(true);for(const path of ['/api/connect/transfers/public-note?user=foreign','https://other.test/api/connect/transfers/public-note','/api/connect/transfers/public-note/other'])expect(permittedNativePath(path,'POST')).toBe(false);expect(permittedNativePath('/api/connect/transfers/public-note','GET')).toBe(false);});

it('admits the exact complete POST original without an outcome read',async()=>{
 const f=fixture();f.sdkTransfer.mockImplementation(async body=>{f.record=syntheticWalletRecord(body,sender);return f.record;});
 const api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});f.request.mockClear();
 expect((await api.execute(r,r.digest)).status).toBe('recorded');
 expect(f.request.mock.calls.filter(([path])=>path.includes('clientNonce='))).toHaveLength(0);expect(f.sdkTransfer).toHaveBeenCalledOnce();expect(f.state.current.record).toEqual(f.record);
});
it.each(['source','recipient','amount','nonce','original','receipt','note']as const)('recovers a %s-mismatched POST using exactly one original read',async mutation=>{
 const f=fixture();f.sdkTransfer.mockImplementation(async body=>{f.record=syntheticWalletRecord(body,sender);const bad=structuredClone(f.record);
  if(mutation==='source')delete bad.source;if(mutation==='recipient')bad.transfer.recipientUserId=sender;if(mutation==='amount')bad.transfer.amountUsdCents='999';if(mutation==='nonce')bad.transfer.clientNonce=sender;if(mutation==='original')delete bad.source.message.sealed_original;if(mutation==='receipt')bad.source.message.receiz_receipt.digest='d'.repeat(64);if(mutation==='note')bad.source.message.sealed_original.walletTransfer.note='wrong';return bad;
 });
 const api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000',...(mutation==='note'?{note:'public note'}:{})});f.request.mockClear();
 expect((await api.execute(r,r.digest)).status).toBe('recorded');expect(f.request.mock.calls.filter(([path])=>path.includes('clientNonce='))).toHaveLength(1);expect(f.sdkTransfer).toHaveBeenCalledOnce();expect(f.state.current.record).toEqual(f.record);
});
it('keeps a complete POST unknown when terminal retention fails, without rereading or resubmitting',async()=>{
 const f=fixture();f.sdkTransfer.mockImplementation(async body=>{f.record=syntheticWalletRecord(body,sender);return f.record;});const write=f.writes.getMockImplementation()!;
 f.writes.mockImplementation(async(next,prior)=>{if(next.current.status==='recorded')throw Error('storage unavailable');return write(next,prior);});
 const api=createWalletSend(f.options),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});f.request.mockClear();
 expect((await api.execute(r,r.digest)).status).toBe('unknown');expect(f.state.current.status).toBe('unknown');expect(f.request.mock.calls.filter(([path])=>path.includes('clientNonce='))).toHaveLength(0);expect(f.sdkTransfer).toHaveBeenCalledOnce();
});
it('publishes the admitted Send before completion and leaves optional work outside the result',async()=>{
 const f=fixture();f.sdkTransfer.mockImplementation(async body=>{f.record=syntheticWalletRecord(body,sender);return f.record;});let finish!:()=>void;const paused=new Promise<void>(resolve=>finish=resolve),events:string[]=[];
 const onRecorded=vi.fn(async(response,uid)=>{expect(uid).toBe(sender);expect(response).toEqual(f.record);expect(f.state.current.status).toBe('recorded');events.push('published');});
 const afterRecorded=vi.fn(async()=>{events.push('optional');await paused;throw Error('optional refresh failed');});
 const api=createWalletSend({...f.options,onRecorded,afterRecorded}),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});
 try{expect((await api.execute(r,r.digest)).status).toBe('recorded');expect(events).toContain('published');expect(afterRecorded).toHaveBeenCalledOnce();expect((await api.status())?.status).toBe('recorded');}finally{finish();}
});
it.each(['throw','reject']as const)('optional Send refresh %s cannot change the retained result',async mode=>{
 const f=fixture();f.sdkTransfer.mockImplementation(async body=>{f.record=syntheticWalletRecord(body,sender);return f.record;});const afterRecorded=vi.fn(()=>{if(mode==='throw')throw Error('optional');return Promise.reject(Error('optional'));});
 const api=createWalletSend({...f.options,afterRecorded}),r=await api.prepare({recipient:'receiver',amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('recorded');await Promise.resolve();expect((await api.status())?.status).toBe('recorded');expect(afterRecorded).toHaveBeenCalledOnce();
});
