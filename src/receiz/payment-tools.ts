import {buildPaymentRequest,publicReceizId} from './payment-request';

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

/** Installation text only. No checkout, identity access, or financial execution. */
export function buildPaymentTools(coordinate:string,dollars?:string){
 const id=publicReceizId(coordinate);
 if(!id)throw Error('Use your confirmed public Receiz username.');
 const username=id.slice(0,-10),accountLink=buildPaymentRequest(username,dollars);
 return {
  username,accountLink,
  checkoutLink:`https://receiz.com/payments/${username}`,
  buttonHtml:`<a href="${escapeHtml(accountLink)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 24px;border-radius:12px;background:#172b45;color:#fff;font:600 16px/1.4 system-ui,sans-serif;text-decoration:none">Pay @${username}</a>`,
  // The current Receiz widget takes a username, not a fixed amount. Do not
  // invent data attributes or relabel its legacy token claim as native Notes.
  widgetHtml:`<div class="receiz-pay-embed" data-username="${username}"></div>\n<script src="https://receiz.com/receiz-pay-embed.js" async></script>`,
 };
}
