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
it('does not consume or open an identity for ambiguous scanner state until the visitor chooses the account button',async()=>{
 const f=await fixture();try{expect(entry.open).not.toHaveBeenCalled();expect(f.host.textContent).toContain('Open your account');await act(async()=>f.host.querySelector<HTMLButtonElement>('button')!.click());expect(entry.open).toHaveBeenCalledOnce();}finally{f.close();}
});
it('continues a user-activated email visit once without another required button, including StrictMode replay',async()=>{
 entry.read.mockResolvedValue({ok:true,pending:true,autoContinue:true});const f=await fixture();try{expect(entry.open).toHaveBeenCalledOnce();expect(f.host.querySelector('button')).toBeNull();}finally{f.close();}
});
it('preserves a different account and offers existing account access without promising that a consumed link works in another browser',async()=>{
 entry.read.mockResolvedValue({ok:true,pending:true,autoContinue:true});entry.open.mockRejectedValue(Error('EMAIL_PAYMENT_DIFFERENT_ACCOUNT'));const f=await fixture();try{expect(f.host.querySelector('[role="alert"]')?.textContent).toContain('Your saved Identity Record is unchanged');expect(f.host.querySelector<HTMLAnchorElement>('a.entrance-learn')?.getAttribute('href')).toBe('/');expect(f.host.textContent).not.toContain('separate browser');}finally{f.close();}
});
