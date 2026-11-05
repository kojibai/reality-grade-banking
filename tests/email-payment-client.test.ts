import {afterEach,expect,it,vi} from 'vitest';
import {openEmailPayment,readEmailPaymentEntry} from '../src/receiz/email-payment-entry';
const account=vi.hoisted(()=>({open:vi.fn(),dispose:vi.fn()}));
vi.mock('../src/receiz/pbi-account',()=>({openVerifiedEmailAccount:account.open}));
const payment={ok:true,authority:'wallet-observation',recipient:{userId:'10000000-0000-4000-8000-000000000002',email:'supplier@example.test'},payment:{id:'10000000-0000-4000-8000-000000000004',clientNonce:'synthetic-nonce',amountUsdCents:'1000'}};
afterEach(()=>{vi.unstubAllGlobals();vi.resetAllMocks();});
it('coalesces StrictMode continuations and opens only the canonical observed recipient once',async()=>{
 const send=vi.fn(async(_input:RequestInfo|URL)=>Response.json(payment));vi.stubGlobal('fetch',send);account.open.mockResolvedValue({dispose:account.dispose});
 const [first,second]=await Promise.all([openEmailPayment(),openEmailPayment()]);expect(first).toEqual(payment);expect(second).toBe(first);expect(send).toHaveBeenCalledOnce();expect(send.mock.calls[0][0]).toBe('/api/bank/native/email-payment/open');expect(account.open).toHaveBeenCalledExactlyOnceWith(payment.recipient.userId);expect(account.dispose).toHaveBeenCalledOnce();
});
it('does not open custody for a failed receipt and retries the canonical temporary stage after an interruption',async()=>{
 const send=vi.fn().mockResolvedValueOnce(Response.json({ok:false},{status:503})).mockResolvedValueOnce(Response.json(payment));vi.stubGlobal('fetch',send);account.open.mockResolvedValue({dispose:account.dispose});
 await expect(openEmailPayment()).rejects.toThrow();expect(account.open).not.toHaveBeenCalled();expect(await openEmailPayment()).toEqual(payment);expect(account.open).toHaveBeenCalledOnce();
});
it('a pending scanner state never consumes email authority or opens an identity',async()=>{
 const send=vi.fn(async(_input:RequestInfo|URL)=>Response.json({ok:true,pending:true,autoContinue:false}));vi.stubGlobal('fetch',send);expect(await readEmailPaymentEntry()).toEqual({ok:true,pending:true,autoContinue:false});expect(send.mock.calls[0][0]).toBe('/api/bank/native/email-payment/state');expect(account.open).not.toHaveBeenCalled();
});

it('recognizes only the explicit invitation-free state and never turns receipt errors into a public landing',async()=>{
 const send=vi.fn().mockResolvedValueOnce(Response.json({ok:true,invitation:false})).mockResolvedValueOnce(Response.json({ok:false},{status:401})).mockResolvedValueOnce(Response.json({ok:true,invitation:false,pending:true}));vi.stubGlobal('fetch',send);
 expect(await readEmailPaymentEntry()).toEqual({ok:true,invitation:false});await expect(readEmailPaymentEntry()).rejects.toThrow();await expect(readEmailPaymentEntry()).rejects.toThrow();expect(account.open).not.toHaveBeenCalled();
});

it('normalizes the real verified state wire to the declared observation without a pending transport flag',async()=>{
 const wire={...payment,pending:false};const send=vi.fn(async()=>Response.json(wire));vi.stubGlobal('fetch',send);
 const observed=await readEmailPaymentEntry();expect(observed).toEqual(payment);expect('pending' in observed).toBe(false);expect('invitation' in observed).toBe(false);expect(send).toHaveBeenCalledOnce();expect(account.open).not.toHaveBeenCalled();
});
