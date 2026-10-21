import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
import {syntheticWalletRecord} from './fixtures/wallet-send';
const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',conversation='10000000-0000-4000-8000-000000000003';
const checkout={sessionId:'cs_test_funded_send123',clientSecret:'synthetic-only-card-secret',amountUsdCents:'1000'};
function fixture(reserve='0',settlement='0'){
 let state:any=null,record:any=null,credit:'open'|'settling'|'credited'|'unpaid'|'expired'='open',refuse=true;
 const write=vi.fn(async(next:any,expected:any)=>{expect(state).toEqual(expected);state=structuredClone(next);});
 const begin=vi.fn(async(amount:string)=>{const [whole,fraction]=amount.split('.');return{...checkout,amountUsdCents:String(BigInt(whole)*100n+BigInt(fraction))};}),check=vi.fn(async(_checkout:unknown,beforeCredit:()=>Promise<void>)=>{if(credit==='credited')await beforeCredit();return{status:credit};});
 const transfer=vi.fn(async(body:any)=>{if(refuse)throw Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:body.clientNonce}}});record=syntheticWalletRecord(body,sender);return{};});
 const request=vi.fn(async(path:string)=>path==='/api/connect/wallet/me'?{ok:true,wallet:{userId:sender,balanceUsd:`${(BigInt(reserve)+BigInt(settlement))/100n}.${String((BigInt(reserve)+BigInt(settlement))%100n).padStart(2,'0')}`,balancePhiMicro:'3000000',valueStates:{settledBalanceUsdCents:reserve,ecosystemBalanceUsdCents:settlement},sync:{projectionComplete:true},rollup:{}}}:path.includes('amountUsd=')?{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'0',ecosystemUsdCents:'1000',fundingRule:'settled_first_then_phi'}}:path==='/api/chat/conversations'?{ok:true,conversation:{id:conversation}}:record??{ok:true,found:false});
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

it.each([
 {reserve:'300',settlement:'0',charge:'700',dollars:'7.00'},
 {reserve:'0',settlement:'450',charge:'550',dollars:'5.50'},
 {reserve:'200',settlement:'400',charge:'400',dollars:'4.00'},
])('funds only the missing amount from a $reserve/$settlement account and completes the full Send once',async({reserve,settlement,charge,dollars})=>{
 const f=fixture(reserve,settlement),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});
 const result=await api.execute(review,review.digest);
 expect(result).toMatchObject({status:'funding',amountUsdCents:'1000',cardAmountUsdCents:charge,shortfallUsdCents:charge,checkout:{amountUsdCents:charge}});
 expect(f.begin).toHaveBeenCalledExactlyOnceWith(dollars,review.clientNonce);expect(f.state.current.funding.amountUsdCents).toBe(charge);
 const reads=f.request.mock.calls.filter(([path])=>path==='/api/connect/wallet/me');expect(reads).toHaveLength(1);
 f.credit='credited';expect((await createWalletSend(f.options).resumeFunding())?.status).toBe('recorded');
 expect(f.transfer).toHaveBeenCalledTimes(2);expect(f.transfer.mock.calls[1][0]).toEqual(f.transfer.mock.calls[0][0]);expect(f.transfer.mock.calls[1][0].amountUsd).toBe('10.00');
 expect(f.request.mock.calls.filter(([path])=>path==='/api/connect/wallet/me')).toHaveLength(1);expect(f.begin).toHaveBeenCalledTimes(1);
});
it('retains the exact shortfall before opening checkout and never recalculates or recharges it after response loss',async()=>{
 const f=fixture('300'),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});
 f.begin.mockImplementation(async()=>{expect(f.state.current.funding).toMatchObject({stage:'creating',amountUsdCents:'700',shortfallUsdCents:'700'});throw Error('response lost');});
 expect(await api.execute(review,review.digest)).toMatchObject({status:'funding',stage:'creating',cardAmountUsdCents:'700'});
 const base=f.request.getMockImplementation()!;f.request.mockImplementation(async path=>{if(path==='/api/connect/wallet/me')throw Error('must reuse held amount');return base(path);});
 await createWalletSend(f.options).resumeFunding();expect(f.begin.mock.calls).toEqual([['7.00',review.clientNonce],['7.00',review.clientNonce]]);expect(f.transfer).toHaveBeenCalledTimes(1);
});
it.each(['foreign','inconsistent','unavailable'])('does not guess a card amount from a %s wallet response',async kind=>{
 const f=fixture('300'),base=f.request.getMockImplementation()!;f.request.mockImplementation(async path=>{const value:any=await base(path);if(path==='/api/connect/wallet/me'){if(kind==='unavailable')throw Error('offline');if(kind==='foreign')value.wallet.userId=recipient;else value.wallet.balanceUsd='9.99';}return value;});
 const api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});
 expect(await api.execute(review,review.digest)).toMatchObject({status:'funding',stage:'reviewing'});expect(f.begin).not.toHaveBeenCalled();
 f.request.mockImplementation(base);expect(await createWalletSend(f.options).resumeFunding()).toMatchObject({status:'funding',stage:'ready',cardAmountUsdCents:'700'});expect(f.begin).toHaveBeenCalledExactlyOnceWith('7.00',review.clientNonce);
});
it('shows the card minimum separately from a smaller shortfall and keeps the original send amount',async()=>{
 const f=fixture('975'),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});
 expect(await api.execute(review,review.digest)).toMatchObject({status:'funding',amountUsdCents:'1000',cardAmountUsdCents:'50',shortfallUsdCents:'25'});expect(f.begin).toHaveBeenCalledExactlyOnceWith('0.50',review.clientNonce);
 f.credit='credited';expect((await createWalletSend(f.options).resumeFunding())?.status).toBe('recorded');expect(f.transfer.mock.calls[1][0].amountUsd).toBe('10.00');
});
it('uses a now-sufficient wallet without opening checkout or looping on another refusal',async()=>{
 const f=fixture('1000'),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});
 f.transfer.mockImplementationOnce(async body=>{f.credit='credited';throw Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:body.clientNonce}}});});
 expect((await api.execute(review,review.digest)).status).toBe('recorded');expect(f.transfer).toHaveBeenCalledTimes(2);expect(f.begin).not.toHaveBeenCalled();
 const refused=fixture('1000'),retry=createWalletSend(refused.options),r=await retry.prepare({recipient,amountUsdCents:'1000'});expect((await retry.execute(r,r.digest)).status).toBe('not-sent');expect(refused.transfer).toHaveBeenCalledTimes(2);expect(refused.begin).not.toHaveBeenCalled();
});
it('does not read the wallet or open checkout for a send that succeeds from the existing balance',async()=>{
 const f=fixture('1000');f.credit='credited';const api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});
 expect((await api.execute(review,review.digest)).status).toBe('recorded');expect(f.request.mock.calls.some(([path])=>path==='/api/connect/wallet/me')).toBe(false);expect(f.begin).not.toHaveBeenCalled();
});
it('rejects a changed stored shortfall or card amount before resuming payment',async()=>{
 const f=fixture('300'),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(review,review.digest);
 f.state.current.funding.amountUsdCents='800';await expect(createWalletSend(f.options).resumeFunding()).rejects.toThrow('FUNDING');expect(f.transfer).toHaveBeenCalledTimes(1);
});

it('continues a legacy full-amount checkout without changing its amount or reading a new shortfall',async()=>{
 const f=fixture(),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(review,review.digest);delete f.state.current.funding.shortfallUsdCents;
 const before=f.request.mock.calls.length;f.credit='credited';expect((await createWalletSend(f.options).resumeFunding())?.status).toBe('recorded');expect(f.begin).toHaveBeenCalledTimes(1);expect(f.request.mock.calls.slice(before).every(([path])=>path.includes('clientNonce='))).toBe(true);
});
it('never opens a checkout when the calculated shortfall cannot be saved first',async()=>{
 const f=fixture('300'),write=f.write.getMockImplementation()!;f.write.mockImplementation(async(next,previous)=>{if(next.current.funding?.stage==='creating')throw Error('storage failed');return write(next,previous);});
 const api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});await expect(api.execute(review,review.digest)).rejects.toThrow('storage failed');expect(f.state.current.funding.stage).toBe('reviewing');expect(f.begin).not.toHaveBeenCalled();expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('does not take another card payment when the wallet changes while the first checkout is open',async()=>{
 const f=fixture('300'),api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});await api.execute(review,review.digest);f.credit='credited';f.transfer.mockRejectedValue(Object.assign(Error('wallet_insufficient_funds'),{status:409,payload:{error:'wallet_insufficient_funds',submission:{status:'not-submitted',clientNonce:review.clientNonce}}}));
 expect(await api.resumeFunding()).toMatchObject({status:'not-sent',reason:'wallet_insufficient_funds'});expect((await api.resumeFunding())?.status).toBe('not-sent');expect(f.begin).toHaveBeenCalledExactlyOnceWith('7.00',review.clientNonce);expect(f.transfer).toHaveBeenCalledTimes(2);
});

it.each([
 {source:'profile_plus_ledger_v1',lawfulActionProjectionAvailable:false,creationSigilEntitlementEnabled:true},
 {source:'profile_plus_ledger_v1',lawfulActionProjectionAvailable:true,creationSigilEntitlementEnabled:true},
])('keeps an explicitly incomplete $source balance unresolved instead of funding its omitted value',async flags=>{
 const f=fixture('300'),base=f.request.getMockImplementation()!;f.request.mockImplementation(async path=>{const raw:any=await base(path);if(path==='/api/connect/wallet/me'){raw.wallet.creationSigilEntitlementEnabled=flags.creationSigilEntitlementEnabled;raw.wallet.sync={...raw.wallet.sync,...flags,projectionComplete:false};}return raw;});
 const api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});expect(await api.execute(review,review.digest)).toMatchObject({status:'funding',stage:'reviewing'});expect(f.begin).not.toHaveBeenCalled();expect(f.transfer).toHaveBeenCalledTimes(1);
});
it('accepts the complete account-only amount when no profile entitlement applies',async()=>{
 const f=fixture('300'),base=f.request.getMockImplementation()!;f.request.mockImplementation(async path=>{const raw:any=await base(path);if(path==='/api/connect/wallet/me'){raw.wallet.creationSigilEntitlementEnabled=false;raw.wallet.sync={projectionComplete:false,source:'account_only',lawfulActionProjectionAvailable:true};}return raw;});
 const api=createWalletSend(f.options),review=await api.prepare({recipient,amountUsdCents:'1000'});expect(await api.execute(review,review.digest)).toMatchObject({status:'funding',cardAmountUsdCents:'700'});expect(f.begin).toHaveBeenCalledExactlyOnceWith('7.00',review.clientNonce);
});
