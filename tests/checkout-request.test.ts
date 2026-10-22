import {expect,it} from 'vitest';
import {buildCheckoutRequest,parseCheckoutRequest,buildCheckoutReturn,parseCheckoutReturn} from '../src/receiz/checkout-request';
import {parsePaymentRequest,buildPaymentRequest} from '../src/receiz/payment-request';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
const id='10000000-0000-4000-8000-000000000001';
it('normalizes the shared checkout URL and preserves old Send links',()=>{
 const url=buildCheckoutRequest('@Merchant','12.3');expect(url).toBe('https://bankeiz.com/pay/merchant/?amount=12.30');
 expect(buildCheckoutRequest('merchant.receiz.id')).toBe('https://bankeiz.com/pay/merchant/');
 expect(parseCheckoutRequest(url)).toEqual({username:'merchant',amount:'12.30'});
 expect(parseCheckoutRequest('https://bankeiz.com/pay/merchant')).toEqual({username:'merchant'});
 expect(parseCheckoutRequest('https://bankeiz.com/explore/')).toBeNull();
 expect(parsePaymentRequest(url)).toEqual({recipient:'merchant',amount:'12.30'});
 expect(buildPaymentRequest('merchant','12.30')).toBe('https://bankeiz.com/?to=merchant&amount=12.30');
 expect(profilePageUsername('/pay/')).toBeNull();expect(profilePagePath('pay')).toBe('/u/pay/');
});
it.each(['0','-1','1e2','1.001','NaN','1&to=other'])('rejects invalid exact amounts %s',amount=>expect(()=>buildCheckoutRequest('merchant',amount)).toThrow());
it.each(['https://evil.example/pay/merchant/','https://bankeiz.com/pay/user%2Fother/','https://bankeiz.com/pay/merchant/?amount=1&amount=2','https://bankeiz.com/pay/merchant/?to=other','https://user@bankeiz.com/pay/merchant/','https://bankeiz.com/pay/merchant/#paid'])('rejects malformed or foreign payment entries %s',url=>expect(()=>parseCheckoutRequest(url)).toThrow());
it('validates a separate return locator and never embeds secrets or arbitrary redirects',()=>{
 const template=buildCheckoutReturn({username:'merchant',checkoutId:id},'https://bankeiz.com');
 expect(template).toContain('session_id={CHECKOUT_SESSION_ID}');
 expect(parseCheckoutReturn(template.replace('{CHECKOUT_SESSION_ID}','cs_test_original1234'),'https://bankeiz.com')).toEqual({username:'merchant',checkoutId:id,sessionId:'cs_test_original1234'});
 expect(()=>parseCheckoutReturn(template.replace('{CHECKOUT_SESSION_ID}','cs_test_original1234')+'&checkout_id='+id,'https://bankeiz.com')).toThrow();
 expect(()=>buildCheckoutReturn({username:'merchant',checkoutId:'bad'},'https://bankeiz.com')).toThrow();
 expect(()=>buildCheckoutReturn({username:'merchant',checkoutId:id},'https://evil.example')).toThrow();
 expect(parseCheckoutReturn(buildCheckoutRequest('merchant'),'https://bankeiz.com')).toBeNull();
});
