// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {requestPublicAssetBankRuntime} from '../src/receiz/public-asset-trade';
import {requestBankNavigation} from '../src/core/bank-navigation';
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks();});
it('keeps an early explicit ownership action until the existing Bank listener is ready',async()=>{
 vi.spyOn(document,'readyState','get').mockReturnValue('loading');const nav=document.createElement('script');nav.id='receiz-navigation';nav.textContent='{"pages":{}}';document.body.append(nav);
 let settled=false,error:unknown;const pending=requestPublicAssetBankRuntime();void pending.then(()=>{settled=true;},cause=>{error=cause;});await Promise.resolve();expect(error).toBeUndefined();expect(settled).toBe(false);
 const accept=vi.fn((event:Event)=>{const detail=(event as CustomEvent).detail;detail.handled=true;detail.resolve();});addEventListener('bankeiz:request-bank-runtime',accept);
 try{nav.textContent='';document.dispatchEvent(new Event('DOMContentLoaded'));await pending;expect(accept).toHaveBeenCalledOnce();expect(settled).toBe(true);}finally{removeEventListener('bankeiz:request-bank-runtime',accept);}
});
it('keeps an early profile Message navigation until the existing navigator is ready',()=>{
 vi.spyOn(document,'readyState','get').mockReturnValue('loading');requestBankNavigation('#account/messages');
 const accept=vi.fn((event:Event)=>{(event as CustomEvent).detail.handled=true;});addEventListener('bankeiz:navigate-bank',accept);
 try{document.dispatchEvent(new Event('DOMContentLoaded'));expect(accept).toHaveBeenCalledOnce();expect(accept.mock.calls[0][0]).toHaveProperty('detail.hash','#account/messages');}finally{removeEventListener('bankeiz:navigate-bank',accept);}
});
it('keeps ordinary ready-page delivery synchronous and retains the real missing-listener refusal',async()=>{
 vi.spyOn(document,'readyState','get').mockReturnValue('complete');const accept=(event:Event)=>{(event as CustomEvent).detail.handled=true;};addEventListener('bankeiz:navigate-bank',accept);
 try{expect(requestBankNavigation('#account/messages')).toBe(true);}finally{removeEventListener('bankeiz:navigate-bank',accept);}
 await expect(requestPublicAssetBankRuntime()).rejects.toThrow('Your account could not open here. Please try again.');
});
