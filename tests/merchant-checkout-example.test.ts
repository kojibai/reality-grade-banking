import {createReceizClient} from '@receiz/sdk';
import {expect,it,vi} from 'vitest';
import {prepareMerchantCardCheckout,readMerchantCardCheckout,type MerchantOrder} from '../institution/examples/merchant-checkout';
const order:MerchantOrder={referenceId:'order_123',merchantUsername:'klok',merchantUserId:'11111111-1111-4111-8111-111111111111',amountUsdCents:'1230'};
const sessionId='cs_test_12345678';
const checkout={ok:true,merchant:{username:'klok'},checkout:{mode:'embedded',sessionId,clientSecret:`${sessionId}_secret_fixture`,amountUsdCents:'1230',currency:'usd',referenceId:'order_123'}};
const paid={ok:true,session:{sessionId,state:'paid',isPaid:true,isTerminal:true,merchantUsername:'klok'},settlement:{kind:'connect_payment_checkout',userId:order.merchantUserId,amountUsdCents:'1230',amountPhiMicro:'1000000',alreadyProcessed:false}};
const clientFor=(response:unknown)=>{const fetchImpl=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify(response),{headers:{'content-type':'application/json'}}));return {client:createReceizClient({baseUrl:'https://receiz.com',fetchImpl:fetchImpl as typeof fetch}),fetchImpl};};

it('uses the actual pinned SDK public checkout transport and retains the exact order/session for later confirmation',async()=>{
 const {client,fetchImpl}=clientFor(checkout),pending=await prepareMerchantCardCheckout(client,order);
 expect(fetchImpl).toHaveBeenCalledOnce();
 expect(String(fetchImpl.mock.calls[0][0])).toBe('https://receiz.com/api/payments/embed/checkout');
 const body=JSON.parse(fetchImpl.mock.calls[0][1]!.body as string);
 expect(body).toEqual({username:'klok',amountUsd:'12.30',currency:'usd',uiMode:'embedded',referenceId:'order_123'});
 expect(pending.sessionId).toBe(sessionId);expect(pending.order).toEqual(order);
 const frame=new URL(pending.frameUrl);expect(frame.search).toBe('');expect(new URLSearchParams(frame.hash.slice(1)).get('client_secret')).toBe(`${sessionId}_secret_fixture`);
});

it('confirms the original session only after exact merchant and amount match a confirmed host credit',async()=>{
 const pending=await prepareMerchantCardCheckout(clientFor(checkout).client,order);
 const {client,fetchImpl}=clientFor(paid);
 expect((await readMerchantCardCheckout(client,pending)).status).toBe('paid');
 expect(String(fetchImpl.mock.calls[0][0])).toBe(`https://receiz.com/api/payments/embed/checkout/session?session_id=${sessionId}&merchant=klok`);
 for(const changed of [{...paid,settlement:null},{...paid,session:{...paid.session,sessionId:'cs_test_other1234'}},{...paid,settlement:{...paid.settlement,userId:'another-user'}},{...paid,settlement:{...paid.settlement,amountUsdCents:'1231'}}])await expect(readMerchantCardCheckout(clientFor(changed).client,pending)).rejects.toThrow();
});

it('keeps open and unpaid sessions unfulfilled and rejects malformed order inputs before transport',async()=>{
 const pending=await prepareMerchantCardCheckout(clientFor(checkout).client,order);
 expect((await readMerchantCardCheckout(clientFor({...paid,session:{...paid.session,state:'open',isPaid:false,isTerminal:false},settlement:null}).client,pending)).status).toBe('pending');
 expect((await readMerchantCardCheckout(clientFor({...paid,session:{...paid.session,state:'complete_unpaid',isPaid:false},settlement:null}).client,pending)).status).toBe('closed');
 const {client,fetchImpl}=clientFor(checkout);
 for(const amount of ['0','49','12.30','10000001'])await expect(prepareMerchantCardCheckout(client,{...order,amountUsdCents:amount})).rejects.toThrow();
 expect(fetchImpl).not.toHaveBeenCalled();
});
