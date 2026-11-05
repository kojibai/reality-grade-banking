// @vitest-environment happy-dom
import {StrictMode,act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {EmailPaymentEntry} from '../src/features/account/EmailPaymentEntry';

// UI transport test: the real read/open client runs. Its open request remains
// pending, so no identity or Source authority is created in this fixture.
const custody=vi.hoisted(()=>({open:vi.fn(()=>{throw Error('No custody write is permitted in a wire display test.');})}));
vi.mock('../src/receiz/pbi-account',()=>({openVerifiedEmailAccount:custody.open}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it('shows verified facts and continues once from the actual pending-false state response through the real read boundary',async()=>{
 const wire={ok:true,authority:'wallet-observation',pending:false,recipient:{userId:'10000000-0000-4000-8000-000000000002',email:'supplier@example.test'},payment:{id:'10000000-0000-4000-8000-000000000004',clientNonce:'synthetic-nonce',amountUsdCents:'480000',senderUserId:'10000000-0000-4000-8000-000000000001'}};
 const send=vi.fn((_url:RequestInfo|URL,options?:RequestInit)=>options?.method==='POST'?new Promise<Response>(()=>{}):Promise.resolve(Response.json(wire)));vi.stubGlobal('fetch',send);
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<StrictMode><EmailPaymentEntry/></StrictMode>));
  expect(host.querySelector('[data-email-payment-amount]')?.textContent).toBe('$4,800.00');
  const details=host.querySelector('details')!;expect(details.open).toBe(false);expect(details.textContent).toContain(wire.payment.id);expect(details.textContent).toContain(wire.payment.senderUserId);
  expect(host.querySelector('[role="status"]')?.textContent).toBe('Receiving your payment');expect(host.querySelector('button')).toBeNull();
  const post=send.mock.calls.filter(([,options])=>options?.method==='POST');expect(post).toHaveLength(1);expect(post[0][0]).toBe('/api/bank/native/email-payment/open');expect(custody.open).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());host.remove();}
});
