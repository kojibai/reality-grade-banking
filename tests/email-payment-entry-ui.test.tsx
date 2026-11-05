// @vitest-environment happy-dom
import {StrictMode,act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {EmailPaymentEntry} from '../src/features/account/EmailPaymentEntry';
const entry=vi.hoisted(()=>({read:vi.fn(),open:vi.fn()}));
vi.mock('../src/receiz/email-payment-entry',()=>({readEmailPaymentEntry:entry.read,openEmailPayment:entry.open}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(()=>{entry.read.mockReset().mockResolvedValue({ok:true,pending:true,autoContinue:false});entry.open.mockReset().mockImplementation(()=>new Promise(()=>{}));});
afterEach(()=>vi.restoreAllMocks());
async function fixture(){const host=document.createElement('div'),root=createRoot(host);document.body.append(host);await act(async()=>root.render(<StrictMode><EmailPaymentEntry/></StrictMode>));return{host,close(){act(()=>root.unmount());host.remove();}};}
it('does not consume or open an identity for ambiguous scanner state until the visitor chooses to accept the payment',async()=>{
 const f=await fixture();try{expect(entry.open).not.toHaveBeenCalled();expect(f.host.textContent).toContain('Accept payment');await act(async()=>f.host.querySelector<HTMLButtonElement>('button')!.click());expect(entry.open).toHaveBeenCalledOnce();}finally{f.close();}
});
it('continues a user-activated email visit once without another required button, including StrictMode replay',async()=>{
 entry.read.mockResolvedValue({ok:true,pending:true,autoContinue:true});const f=await fixture();try{expect(entry.open).toHaveBeenCalledOnce();expect(f.host.querySelector('button')).toBeNull();}finally{f.close();}
});
it('preserves a different account and offers an existing Identity Record without promising that a consumed link works in another browser',async()=>{
 entry.read.mockResolvedValue({ok:true,pending:true,autoContinue:true});entry.open.mockRejectedValue(Error('EMAIL_PAYMENT_DIFFERENT_ACCOUNT'));const f=await fixture();try{expect(f.host.querySelector('[role="alert"]')?.textContent).toContain('Your saved Identity Record is unchanged');expect(f.host.querySelector<HTMLAnchorElement>('a.entrance-learn')?.getAttribute('href')).toBe('/');expect(f.host.textContent).not.toContain('separate browser');}finally{f.close();}
});

it('keeps receiving copy and its own busy state without account-opening language',async()=>{
 entry.read.mockResolvedValue({ok:true,pending:true,autoContinue:true});const f=await fixture();try{expect(f.host.querySelector('[role="status"]')?.textContent).toBe('Receiving your payment');expect(f.host.querySelector('[aria-busy="true"]')).not.toBeNull();expect(f.host.textContent).not.toMatch(/creating|opening|new account/i);expect(f.host.querySelector('button')).toBeNull();}finally{f.close();}
});
it('shows no amount before verified payment facts, then uses only the already held verified amount',async()=>{
 const pending=await fixture();try{expect(pending.host.querySelector('[data-email-payment-amount]')).toBeNull();expect(pending.host.textContent).toContain('Use an existing Identity Record');}finally{pending.close();}
 entry.read.mockResolvedValue({ok:true,authority:'wallet-observation',recipient:{userId:'recipient',email:'recipient@example.test'},payment:{id:'verified-payment-reference',clientNonce:'existing-nonce',amountUsdCents:'480000',senderUserId:'verified-sender'}});const held=await fixture();try{expect(held.host.querySelector('[data-email-payment-amount]')?.textContent).toBe('$4,800.00');const details=held.host.querySelector('details')!;expect(details.open).toBe(false);expect(details.querySelector('summary')?.textContent).toBe('Payment details');expect(details.textContent).toContain('verified-payment-reference');expect(details.textContent).toContain('Sender record ID');expect(details.textContent).toContain('verified-sender');expect(entry.open).toHaveBeenCalledOnce();}finally{held.close();}
});

it('does not present an unverified amount or acceptance-ready claim when verification fails',async()=>{
 entry.read.mockRejectedValue(Error('This payment could not be verified.'));const f=await fixture();try{expect(f.host.querySelector('[data-email-payment-amount]')).toBeNull();expect(f.host.querySelector('h1')?.textContent).toContain('Review your invitation');expect(f.host.querySelector('h1')?.textContent).not.toContain('Ready to accept');expect(entry.open).not.toHaveBeenCalled();}finally{f.close();}
});

it('shows the public receiving landing only for the explicit absence of an invitation',async()=>{
 entry.read.mockResolvedValue({ok:true,invitation:false});const f=await fixture();try{expect(f.host.querySelector('h1')?.textContent).toContain('Receive a payment.Keep it with you.');expect(f.host.textContent).toContain('Use the button in your payment email');expect(f.host.querySelector('a[href="/accept/#email-payments"]')?.textContent).toContain('How receiving works');expect(f.host.querySelector('a[href="/learn/"]')?.textContent).toContain('Explore Bankeiz');expect(f.host.querySelector('[data-email-payment-amount]')).toBeNull();expect(f.host.querySelector('button')).toBeNull();expect(entry.open).not.toHaveBeenCalled();}finally{f.close();}
});
