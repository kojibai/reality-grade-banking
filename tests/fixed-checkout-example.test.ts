import {expect,it} from 'vitest';
import {fixedCheckoutInstallation} from '../institution/examples/fixed-checkout';
import {createFixedSale} from '../src/receiz/fixed-checkout';
it('publishes the exact validated fixed request as an escaped website button without an execution grant',async()=>{
 const sale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:'20000000-0000-4000-8000-000000000001',recipientUserId:'10000000-0000-4000-8000-000000000002',username:'merchant',currency:'usd',amountUsdCents:'1230'}),tools=await fixedCheckoutInstallation(sale);expect(tools.hostedCheckoutLink).toBe('https://bankeiz.com/pay/merchant/?fixed=1&sale=20000000-0000-4000-8000-000000000001&recipient=10000000-0000-4000-8000-000000000002&amount=12.30');expect(tools.buttonHtml).toContain('&amp;recipient=');await expect(fixedCheckoutInstallation({...sale,amountUsdCents:'1'})).rejects.toThrow();
});
