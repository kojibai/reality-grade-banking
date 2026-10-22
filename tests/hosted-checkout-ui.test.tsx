// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {HostedCheckout} from '../src/checkout/HostedCheckout';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {hostedFixture} from './fixtures/hosted-checkout';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const settle=async(host:HTMLElement,text:string)=>{for(let i=0;i<40&&!host.textContent?.includes(text);i++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,5));});expect(host.textContent).toContain(text);};
const click=(host:HTMLElement,text:string)=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===text);expect(button,text).toBeTruthy();if(button!.type==='submit'&&button!.form)button!.form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));else button!.click();};
it('paints the recipient and amount while device entry is pending without financial actions',async()=>{
 const open=vi.fn(()=>new Promise<OpenIdentity>(()=>{})),session={open,import:vi.fn(),close:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<HostedCheckout request={{username:'merchant',amount:'12.30'}} identitySession={session}/>));expect(host.textContent).toContain('@merchant');expect(host.querySelector<HTMLInputElement>('[aria-label="Payment amount"]')?.value).toBe('12.30');expect(host.textContent).not.toContain('Create account');expect(host.textContent).not.toContain('Enter bank');expect(host.querySelector('iframe')).toBeNull();}finally{await act(async()=>root.unmount());}
});
it('reviews then pays through the real controller and presents a sanitized receipt',async()=>{
 const f=hostedFixture(1000),controller=f.newController();await controller.ready;
 const identity={hostedCheckout:async()=>controller,knownWallet:()=>({wallet:{totalUsdCents:'1000'}}),backup:()=>({bytes:new Uint8Array([1]),filename:'identity_record.png',phrase:''})}as unknown as OpenIdentity;
 const session={open:async()=>identity,import:vi.fn(),close:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<HostedCheckout request={{username:'merchant',amount:'10.00'}} identitySession={session}/>));await act(async()=>click(host,'Balance'));await act(async()=>click(host,'Continue'));await settle(host,'Review payment');expect(f.transfer).not.toHaveBeenCalled();expect(host.textContent).toContain('Review payment');await act(async()=>click(host,'Pay $10.00'));await settle(host,'Payment complete');expect(host.textContent).toContain('Payment complete');expect(host.textContent).toContain('$10.00');expect(host.textContent).toContain('Save Identity Record');expect(host.textContent).not.toContain('private-fixture');expect(f.transfer).toHaveBeenCalledTimes(1);}finally{await act(async()=>root.unmount());}
});
it('shows a restore error without creating or paying and keeps import accessible',async()=>{
 const session={open:vi.fn(async()=>{throw Error('Saved identity unavailable');}),import:vi.fn(),close:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<HostedCheckout request={{username:'merchant'}} identitySession={session}/>));expect(host.textContent).toContain('could not');expect(host.textContent).toContain('Use existing Identity Record');expect(host.querySelector('iframe')).toBeNull();}finally{await act(async()=>root.unmount());}
});
it('does not display or act on another saved checkout when a card-return session mismatches',async()=>{
 const f=hostedFixture(0),controller=f.newController();await controller.ready;const a=await controller.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await controller.approve(a.digest);
 const identity={hostedCheckout:async()=>controller,backup:()=>({bytes:new Uint8Array([1]),filename:'identity_record.png',phrase:''})}as unknown as OpenIdentity,session={open:async()=>identity,import:vi.fn(),close:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>{root.render(<HostedCheckout request={{username:'merchant'}} returnContext={{username:'merchant',checkoutId:a.checkoutId,sessionId:'cs_test_wrongoriginal'}} identitySession={session}/>);});await settle(host,'does not match');expect(host.querySelector('iframe')).toBeNull();expect(f.transfer).not.toHaveBeenCalled();expect(f.begin).toHaveBeenCalledTimes(1);}finally{await act(async()=>root.unmount());}
});
it('opens the selected card form only after approval and keeps Back reversible',async()=>{
 const f=hostedFixture(0),controller=f.newController();await controller.ready;
 const identity={hostedCheckout:async()=>controller,backup:()=>({bytes:new Uint8Array([1]),filename:'identity_record.png',phrase:''})}as unknown as OpenIdentity,session={open:async()=>identity,import:vi.fn(),close:vi.fn()},host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<HostedCheckout request={{username:'merchant',amount:'10.00'}} identitySession={session}/>));await act(async()=>click(host,'Continue'));await settle(host,'Review payment');expect(host.querySelector('iframe')).toBeNull();await act(async()=>click(host,'Pay $10.00'));await settle(host,'Complete your payment.');await settle(host,'Check payment status');expect(host.querySelector('iframe')?.title).toBe('Secure card payment');await act(async()=>click(host,'Back'));expect(host.querySelector('iframe')).toBeNull();expect(host.textContent).toContain('Resume payment');await act(async()=>click(host,'Resume payment'));expect(f.begin).toHaveBeenCalledTimes(1);expect(f.transfer).not.toHaveBeenCalled();}finally{await act(async()=>root.unmount());}
});
