import {parseCheckoutRequest,parseCheckoutReturn} from '../receiz/checkout-request';
export function checkoutEntry(href:string,origin:string,framed=false){
 const returned=parseCheckoutReturn(href,origin);
 if(returned)return framed?{kind:'frame-return' as const,returned}:{kind:'checkout' as const,request:{username:returned.username},returned};
 if(framed)throw Error('Open this payment in its own page.');
 const request=parseCheckoutRequest(href,origin);if(!request)throw Error('Open a valid Bankeiz payment link.');
 return{kind:'checkout' as const,request};
}
