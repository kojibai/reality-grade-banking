import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
import {syntheticWalletRecord} from './fixtures/wallet-send';
const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',conversation='10000000-0000-4000-8000-000000000003';
const checkout={sessionId:'cs_test_funded_send123',clientSecret:'synthetic-only-card-secret',amountUsdCents:'1000'};
function fixture(){
 let state:any=null,record:any=null,credit:'open'|'settling'|'credited'|'unpaid'|'expired'='open',refuse=true;
 const write=vi.fn(async(next:any,expected:any)=>{expect(state).toEqual(expected);state=structuredClone(next);});
 const begin=vi.fn(async()=>({...checkout})),check=vi.fn(async(_checkout:unknown,beforeCredit:()=>Promise<void>)=>{if(credit==='credited')await beforeCredit();return{status:credit};});
 const transfer=vi.fn(async(body:any)=>{if(refuse)throw Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:body.clientNonce}}});record=syntheticWalletRecord(body,sender);return{};});
 const request=vi.fn(async(path:string)=>path.includes('amountUsd=')?{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'0',ecosystemUsdCents:'1000',fundingRule:'settled_first_then_phi'}}:path==='/api/chat/conversations'?{ok:true,conversation:{id:conversation}}:record??{ok:true,found:false});
 const options={ownerReceizId:'sender.receiz.id',assertOpen(){},assertNoOtherPending:vi.fn(async()=>{}),lock:async<T,>(work:()=>Promise<T>)=>work(),store:{read:async()=>state,write},connect:async()=>({accountUid:sender,client:{request,connect:{transfer}}}),funding:{begin,check}};
 return{options,begin,check,transfer,request,write,get state(){return state;},set credit(value:typeof credit){credit=value;if(value==='credited')refuse=false;}};
}
it('opens the existing card checkout for the approved payment after an explicit no-submission funds refusal, then sends the same nonce once',async()=>{
 const f=fixture(),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'}),pending=await api.execute(review,review.digest);
 expect(pending).toMatchObject({status:'funding',stage:'ready',checkout,amountUsdCents:'1000',recipientLabel:recipient});expect(f.begin).toHaveBeenCalledExactlyOnceWith('10.00',review.clientNonce);expect(f.state.current.body.clientNonce).toBe(review.clientNonce);
 expect((await api.resumeFunding())?.status).toBe('funding');expect(f.transfer).toHaveBeenCalledTimes(1);
 f.credit='credited';expect((await api.resumeFunding())?.status).toBe('recorded');expect(f.state.current.funding.stage).toBe('credited');expect(f.transfer).toHaveBeenCalledTimes(2);expect(f.transfer.mock.calls[0][0]).toEqual(f.transfer.mock.calls[1][0]);
 expect((await api.resumeFunding())?.status).toBe('recorded');expect(f.begin).toHaveBeenCalledTimes(1);expect(f.transfer).toHaveBeenCalledTimes(2);
});
it('resumes only the encrypted saved approval after reopening, without another recipient lookup, quote, checkout or approval',async()=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(r,r.digest);const count=f.request.mock.calls.length;f.credit='credited';
 expect((await createWalletSend(f.options).resumeFunding())?.status).toBe('recorded');expect(f.begin).toHaveBeenCalledTimes(1);expect(f.request.mock.calls.slice(count).every(([path])=>path.includes('clientNonce='))).toBe(true);
});
it.each(['open','settling','unpaid','expired'] as const)('does not send on a %s checkout result',async status=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(r,r.digest);f.credit=status;await api.resumeFunding();expect(f.transfer).toHaveBeenCalledTimes(1);expect(f.begin).toHaveBeenCalledTimes(1);
});
it('keeps an uncertain send unknown and only reads its original reference',async()=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(r,r.digest);f.credit='credited';f.transfer.mockRejectedValue(Error('response lost'));
 expect((await api.resumeFunding())?.status).toBe('unknown');expect((await api.resumeFunding())?.status).toBe('unknown');expect(f.transfer).toHaveBeenCalledTimes(2);expect(f.begin).toHaveBeenCalledTimes(1);
});
it('does not open checkout for an ambiguous refusal or an unknown transfer outcome',async()=>{
 const f=fixture();f.transfer.mockRejectedValue(Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds'}}));const api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('unknown');expect(f.begin).not.toHaveBeenCalled();
});
it('never starts a second checkout after losing the first checkout creation response',async()=>{
 const f=fixture();f.begin.mockRejectedValue(Error('result unknown'));const api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'});expect((await api.execute(r,r.digest)).status).toBe('funding');expect(f.state.current.funding.stage).toBe('creating');expect(f.transfer).toHaveBeenCalledTimes(1);
 await expect(api.prepare({recipient,amountUsdCents:'1000'})).rejects.toThrow('PENDING');
});
it('retains confirmed credit before the deposit can be cleared and before any transfer is submitted',async()=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(r,r.digest);f.credit='credited';f.check.mockImplementation(async(_checkout,beforeCredit)=>{await beforeCredit();expect(f.state.current.funding.stage).toBe('credited');expect(f.transfer).toHaveBeenCalledTimes(1);return{status:'credited'};});expect((await api.resumeFunding())?.status).toBe('recorded');
});
it('does not invent a successful credit from a callback that did not retain it',async()=>{
 const f=fixture(),api=createWalletSend(f.options),r=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(r,r.digest);f.credit='credited';f.check.mockImplementation(async()=>({status:'credited'}));await expect(api.resumeFunding()).rejects.toThrow('FUNDING');expect(f.transfer).toHaveBeenCalledTimes(1);
});
