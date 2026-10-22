import {expect,it} from 'vitest';
import {checkoutEntryPath} from '../server/checkout-preview-plugin';
it('routes checkout cold loads and card returns to their own entry rather than a profile or account app',()=>{
 expect(checkoutEntryPath('/pay/merchant/?amount=12.30')).toBe('/pay/index.html');expect(checkoutEntryPath('/pay/merchant')).toBe('/pay/index.html');expect(checkoutEntryPath('/pay/merchant/?checkoutReturn=1&session_id=cs_test_return123&checkout_id=x')).toBe('/pay/index.html');expect(checkoutEntryPath('/merchant/')).toBeNull();expect(checkoutEntryPath('/pay/index.html')).toBeNull();
});
import {checkoutEntry} from '../src/checkout/entry';
it('rejects invalid pages before device entry and handles iframe returns without opening checkout',()=>{
 expect(()=>checkoutEntry('https://bankeiz.com/pay/no/?amount=1','https://bankeiz.com')).toThrow();expect(()=>checkoutEntry('https://bankeiz.com/pay/merchant/?paid=1','https://bankeiz.com')).toThrow();
 const url='https://bankeiz.com/pay/merchant/?checkoutReturn=1&checkout_id=10000000-0000-4000-8000-000000000001&session_id=cs_test_original123';expect(checkoutEntry(url,'https://bankeiz.com',true).kind).toBe('frame-return');expect(checkoutEntry(url,'https://bankeiz.com').kind).toBe('checkout');
});
