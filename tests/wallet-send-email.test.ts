import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
import {syntheticWalletRecord} from './fixtures/wallet-send';
const sender='10000000-0000-4000-8000-000000000001',receiver='10000000-0000-4000-8000-000000000002',conversation='10000000-0000-4000-8000-000000000003';
function fixture(){
 let state:any=null,record:any=null;const quote={amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'1000',ecosystemUsdCents:'0',fundingRule:'settled_first_then_phi'};
 const request=vi.fn(async(path:string,options?:any)=>{
  if(path.startsWith('/api/connect/transfers?amountUsd='))return{ok:true,senderUserId:sender,capabilities:{publicTransferNotes:true},quote};
  if(path==='/api/chat/conversations')return{ok:true,conversation:{id:conversation},recipient:{email:options.body.participantEmails[0],userId:receiver}};
  if(path.startsWith('/api/connect/transfers?clientNonce='))return record??{ok:true,found:false};
  throw Error('UNEXPECTED_REQUEST:'+path);
 });
 const transfer=vi.fn(async(body:any)=>{record=syntheticWalletRecord(body,sender);return record;});
 const options={ownerReceizId:'synthetic_sender.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async<T>(work:()=>Promise<T>)=>work(),store:{read:async()=>state,write:vi.fn(async(next:any)=>{state=next;})},connect:async()=>({accountUid:sender,client:{request,connect:{transfer}}})};
 return{api:createWalletSend(options),options,request,transfer,get state(){return state;},get record(){return record;},set record(value:any){record=value;}};
}
it('reviews an email without creating its receiving account, conversation or payment before approval',async()=>{
 const f=fixture(),review=await f.api.prepare({recipient:' Supplier@Example.Test ',amountUsdCents:'1000'});
 expect(review).toMatchObject({recipientEmail:'supplier@example.test',recipientLabel:'supplier@example.test'});expect(review).not.toHaveProperty('recipientUserId');
 expect(f.request.mock.calls.map(([path])=>path)).toEqual(['/api/connect/transfers?amountUsd=10.00']);expect(f.transfer).not.toHaveBeenCalled();expect(f.options.store.write).not.toHaveBeenCalled();
});
it('resolves the approved email through the existing direct-conversation route then submits the same actual recipient and nonce',async()=>{
 const f=fixture(),review=await f.api.prepare({recipient:'supplier@example.test',amountUsdCents:'1000'});
 expect(await f.api.execute(review,review.digest)).toMatchObject({status:'recorded'});
 expect(f.request.mock.calls.find(([path])=>path==='/api/chat/conversations')?.[1]?.body).toEqual({kind:'dm',participantUserIds:[],participantEmails:['supplier@example.test'],aiAgentIds:[],defaultAiId:null,title:null});
 expect(f.transfer).toHaveBeenCalledOnce();expect(f.transfer.mock.calls[0][0]).toEqual({conversationId:conversation,recipientUserId:receiver,unit:'usd',amountUsd:'10.00',clientNonce:review.clientNonce});
 expect(f.state.current.review).toEqual(review);expect(f.state.current.recipientResolution).toEqual({email:'supplier@example.test',userId:receiver,conversationId:conversation});
 expect((await createWalletSend(f.options).status())?.status).toBe('recorded');expect((await createWalletSend(f.options).retainedResult(review.clientNonce))?.receipt?.recipientUserId).toBe(receiver);
});
it.each(['email','self','missing']as const)('refuses a %s recipient resolution before saving or submitting a financial request',async mutation=>{
 const f=fixture(),original=f.request.getMockImplementation()!;
 f.request.mockImplementation(async(path,options)=>{const value:any=await original(path,options);if(path==='/api/chat/conversations'){if(mutation==='email')value.recipient.email='other@example.test';if(mutation==='self')value.recipient.userId=sender;if(mutation==='missing')delete value.recipient;}return value;});
 const review=await f.api.prepare({recipient:'supplier@example.test',amountUsdCents:'1000'});await expect(f.api.execute(review,review.digest)).rejects.toThrow();expect(f.transfer).not.toHaveBeenCalled();expect(f.state).toBeNull();
});
it('reopens an unknown email payment by its original reference without resolving the email or submitting again',async()=>{
 const f=fixture();f.transfer.mockImplementation(async body=>{f.record=syntheticWalletRecord(body,sender);throw Error('RESPONSE_LOST');});
 const original=f.request.getMockImplementation()!;let unavailable=true;
 f.request.mockImplementation(async(path,options)=>{if(unavailable&&path.startsWith('/api/connect/transfers?clientNonce='))throw Error('TEMPORARY_READ_FAILURE');return original(path,options);});
 const review=await f.api.prepare({recipient:'supplier@example.test',amountUsdCents:'1000'});expect(await f.api.execute(review,review.digest)).toMatchObject({status:'unknown'});unavailable=false;f.request.mockClear();
 expect(await createWalletSend(f.options).resolve(true)).toMatchObject({status:'recorded'});expect(f.transfer).toHaveBeenCalledOnce();expect(f.request.mock.calls.every(([path])=>path.startsWith('/api/connect/transfers?clientNonce='))).toBe(true);
});
it('refuses changed saved email resolution before any financial recovery read',async()=>{
 const f=fixture(),review=await f.api.prepare({recipient:'supplier@example.test',amountUsdCents:'1000'});await f.api.execute(review,review.digest);f.state.current.recipientResolution.email='other@example.test';f.request.mockClear();
 await expect(createWalletSend(f.options).status()).rejects.toThrow('CHECKPOINT');expect(f.request).not.toHaveBeenCalled();expect(f.transfer).toHaveBeenCalledOnce();
});
it('retains the exact resolved email receiver through existing card funding and resumes without resolving or quoting again',async()=>{
 const f=fixture(),begin=vi.fn(async()=>({sessionId:'cs_test_synthetic_email_funding',clientSecret:'synthetic-only',amountUsdCents:'1000'})),check=vi.fn(async(_checkout:unknown,beforeCredit:()=>Promise<void>)=>{await beforeCredit();return{status:'credited' as const};}),options={...f.options,funding:{begin,check}},api=createWalletSend(options);
 const review=await api.prepare({recipient:'supplier@example.test',amountUsdCents:'1000'},{fundingPreference:'card'});expect(await api.execute(review,review.digest)).toMatchObject({status:'funding'});expect(f.transfer).not.toHaveBeenCalled();expect(f.state.current.recipientResolution).toEqual({email:'supplier@example.test',userId:receiver,conversationId:conversation});f.request.mockClear();
 expect(await createWalletSend(options).resumeFunding()).toMatchObject({status:'recorded'});expect(begin).toHaveBeenCalledExactlyOnceWith('10.00',review.clientNonce);expect(f.transfer).toHaveBeenCalledOnce();expect(f.transfer.mock.calls[0][0]).toMatchObject({recipientUserId:receiver,clientNonce:review.clientNonce});expect(f.request.mock.calls.every(([path])=>path.startsWith('/api/connect/transfers?clientNonce='))).toBe(true);
});
it.each(['one@example.test,other@example.test','bad@','bad\n@example.test'])('rejects invalid email input %s without requesting any quote or creating anything',async recipient=>{
 const f=fixture();await expect(f.api.prepare({recipient,amountUsdCents:'1000'})).rejects.toThrow();expect(f.request).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
