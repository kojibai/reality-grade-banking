import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
import {syntheticWalletRecord} from './fixtures/wallet-send';
const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',conversation='10000000-0000-4000-8000-000000000003',nonce='10000000-0000-4000-8000-000000000005';
function fixture(){
 let state:any=null,record:unknown=null,credited=false;
 const begin=vi.fn(async()=>({sessionId:'cs_test_original1234',clientSecret:'private-test-only',amountUsdCents:'1000'}));
 const transfer=vi.fn(async(body:any)=>{record=syntheticWalletRecord(body,sender);return record;});
 const request=vi.fn(async(path:string)=>path.includes('amountUsd=')?{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'1000',ecosystemUsdCents:'0',fundingRule:'settled_first_then_phi'}}:path==='/api/chat/conversations'?{ok:true,conversation:{id:conversation}}:record??{ok:true,found:false});
 const options={ownerReceizId:'sender.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async<T,>(f:()=>Promise<T>)=>f(),store:{read:async()=>state,write:async(next:unknown,previous:unknown)=>{expect(state).toEqual(previous);state=structuredClone(next);}},connect:async()=>({accountUid:sender,client:{request,connect:{transfer}}}),funding:{begin,check:async(_checkout:unknown,beforeCredit:()=>Promise<void>)=>{if(credited)await beforeCredit();return{status:credited?'credited' as const:'open' as const};}}};
 return{options,begin,transfer,request,get state(){return state;},credit(){credited=true;}};
}
it('charges the selected full card amount before transfer, retains its nonce and resumes once',async()=>{
 const f=fixture(),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'},{clientNonce:nonce,fundingPreference:'card'});
 expect(review.clientNonce).toBe(nonce);const outcome=await api.execute(review,review.digest);expect(outcome).toMatchObject({status:'funding',cardAmountUsdCents:'1000'});expect(f.transfer).not.toHaveBeenCalled();expect(f.begin).toHaveBeenCalledExactlyOnceWith('10.00',nonce);
 expect(f.state.current.funding.refusal).toBeUndefined();f.credit();expect((await api.resumeFunding())?.status).toBe('recorded');expect(f.transfer).toHaveBeenCalledTimes(1);
 expect(await api.retainedResult(nonce)).toMatchObject({outcome:{status:'recorded'},receipt:{senderUserId:sender,recipientUserId:recipient,amountUsdCents:'1000',clientNonce:nonce}});await api.resumeFunding();expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('leaves normal Send balance-first and reads historical checkout results without submission',async()=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'},{clientNonce:nonce});await api.execute(r,r.digest);expect(f.begin).not.toHaveBeenCalled();
 const next=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(next,next.digest);const calls=f.transfer.mock.calls.length;
 expect((await api.retainedResult(nonce))?.receipt?.clientNonce).toBe(nonce);expect(f.transfer).toHaveBeenCalledTimes(calls);
 await expect(api.prepare({recipient,amountUsdCents:'1000'},{clientNonce:nonce})).rejects.toThrow('NONCE');
});
it('binds the checkout return to the reviewed context and cannot silently change the card choice',async()=>{
 const f=fixture(),api=createWalletSend(f.options),context={checkoutId:nonce,username:'merchant'},r=await api.prepare({recipient,amountUsdCents:'1000'},{clientNonce:nonce,fundingPreference:'card',checkoutContext:context});
 await expect(api.execute({...r,fundingPreference:undefined},r.digest)).rejects.toThrow();await api.execute(r,r.digest);expect(f.begin).toHaveBeenCalledExactlyOnceWith('10.00',nonce,context);
});
it('refuses an empty supplied nonce before any account call',async()=>{
 const f=fixture();await expect(createWalletSend(f.options).prepare({recipient,amountUsdCents:'1000'},{clientNonce:''})).rejects.toThrow('NONCE');expect(f.request).not.toHaveBeenCalled();
});
it('cancels only the exact unsent funding approval and never revives it after card completion',async()=>{
 const f=fixture(),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'},{clientNonce:nonce,fundingPreference:'card'});await api.execute(review,review.digest);
 await expect(api.cancelFunding('10000000-0000-4000-8000-000000000006')).rejects.toThrow('FUNDING_NOT_PENDING');expect((await api.status())?.status).toBe('funding');
 await api.cancelFunding(nonce);f.credit();expect(await api.resumeFunding()).toMatchObject({status:'not-sent',reason:'card_cancelled'});expect(f.transfer).not.toHaveBeenCalled();expect(f.begin).toHaveBeenCalledOnce();
});
it.each(['25','10000001'])('rejects a full card amount of %s cents outside the existing range before funding',async amount=>{
 const f=fixture();await expect(createWalletSend(f.options).prepare({recipient,amountUsdCents:amount},{fundingPreference:'card'})).rejects.toThrow();expect(f.begin).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
it('does not create a card charge beyond the reviewed shortfall limit',async()=>{
 const f=fixture(),base=f.request.getMockImplementation()!;f.request.mockImplementation(async path=>path==='/api/connect/wallet/me'?{ok:true,wallet:{userId:sender,balanceUsd:'0.00',balancePhiMicro:'0',valueStates:{settledBalanceUsdCents:'0',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{}}}:base(path));
 f.transfer.mockImplementation(async(body:any)=>{throw Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:body.clientNonce}}});});
 const api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'},{cardFundingLimitUsdCents:'0'});
 expect(await api.execute(r,r.digest)).toMatchObject({status:'not-sent',reason:'wallet_funding_changed'});expect(f.begin).not.toHaveBeenCalled();
});
