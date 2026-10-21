import {expect,it} from 'vitest';
import {buildPaymentTools} from '../src/receiz/payment-tools';
import {parsePaymentRequest} from '../src/receiz/payment-request';

it('builds a shareable payment button for the confirmed public username and exact optional amount',()=>{
 const tools=buildPaymentTools('@Klok','12.30');
 expect(parsePaymentRequest(tools.accountLink)).toEqual({recipient:'klok',amount:'12.30'});
 expect(tools.buttonHtml).toContain('href="https://bankeiz.com/?to=klok&amp;amount=12.30"');
 expect(tools.buttonHtml).toContain('Pay @klok');
 expect(tools.buttonHtml).toContain('rel="noopener noreferrer"');
});

it('uses the existing Receiz checkout widget without inventing a fixed-amount attribute or financial credentials',()=>{
 const tools=buildPaymentTools('klok.receiz.id','12.30');
 expect(tools.checkoutLink).toBe('https://receiz.com/payments/klok');
 expect(tools.widgetHtml).toBe('<div class="receiz-pay-embed" data-username="klok"></div>\n<script src="https://receiz.com/receiz-pay-embed.js" async></script>');
 expect(tools.widgetHtml).not.toMatch(/amount|token|secret|application/);
});

it('refuses malformed or substituted recipients and invalid amounts instead of silently rewriting them',()=>{
 for(const username of ['','a','klok<svg>','someone@example.com','klok" onclick="evil()','https://evil.example'])expect(()=>buildPaymentTools(username)).toThrow();
 for(const amount of ['0','-1','1.001','1e2'])expect(()=>buildPaymentTools('klok',amount)).toThrow();
});
