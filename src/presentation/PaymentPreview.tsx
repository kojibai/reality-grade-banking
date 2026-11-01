/** Build-only capture of the unmodified checkout. No Identity or transport is
 * opened. Fictional presentation state cannot be admitted as financial proof. */
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {HostedCheckout} from '../checkout/HostedCheckout';
import type {CheckoutSnapshot,CheckoutApproval} from '../receiz/checkout-state';
import type {HostedCheckoutController} from '../receiz/hosted-checkout';
import type {OpenIdentity} from '../receiz/native-identity';
export async function capturePaymentExamples(){
 const host=document.createElement('div'),root=createRoot(host),listeners=new Set<()=>void>();
 let view:CheckoutSnapshot={phase:'editing',approval:null,approvalHistory:[],walletOutcome:null,notes:[],receipt:null,error:null};
 const publish=(next:CheckoutSnapshot)=>{view=next;listeners.forEach(fn=>fn());};
 const forbidden=()=>{throw Error('PAYMENT_EXAMPLE_HAS_NO_AUTHORITY');};
 const controller={ready:Promise.resolve(),snapshot:()=>view,subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};},
  async prepare(value:{amountUsdCents:string}){
   const approval:CheckoutApproval={checkoutId:'example-not-a-checkout',clientNonce:'example-not-a-payment',identityDigest:'example-not-an-identity',accountUid:'example-payer',recipient:{userId:'example-recipient',username:'mayaexample',displayName:'Maya · Example',avatarUrl:null},amountUsdCents:value.amountUsdCents,method:'balance',cardAmountUsdCents:value.amountUsdCents,balanceContributionUsdCents:'0',noteSourceDigests:[],digest:'example-not-an-approval'};
   publish({...view,phase:'reviewed',approval});return approval;
  },async approve(){
   const a=view.approval!;publish({...view,phase:'paid',approvalHistory:[a],walletOutcome:{status:'recorded',clientNonce:a.clientNonce,transferId:'example-not-a-transfer'},receipt:{checkoutId:a.checkoutId,clientNonce:a.clientNonce,transferId:'example-not-a-transfer',senderUserId:a.accountUid,recipientUserId:a.recipient.userId,recipient:a.recipient,amountUsdCents:a.amountUsdCents,method:'balance',recordedAt:null}});
  }} as unknown as HostedCheckoutController;
 const identity={hostedCheckout:async()=>controller,backup:forbidden} as unknown as OpenIdentity;
 const session={open:async()=>identity,import:async()=>forbidden(),close(){}};
 const key='bankeiz:public-recipient-portrait:mayaexample',previous=sessionStorage.getItem(key);
 sessionStorage.setItem(key,JSON.stringify({username:'mayaexample',avatarUrl:null,at:Date.now()}));
 try{
  await act(async()=>root.render(<HostedCheckout request={{username:'mayaexample',amount:'75.00'}} identitySession={session}/>));
  const amount=host.innerHTML;
  await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  const review=host.innerHTML;
  const pay=[...host.querySelectorAll('button')].find(button=>button.textContent==='Pay $75.00');if(!pay)throw Error('PAYMENT_PREVIEW_REVIEW_MISSING');
  await act(async()=>pay.click());
  const complete=host.innerHTML;if(!complete.includes('Payment complete.'))throw Error('PAYMENT_PREVIEW_COMPLETION_MISSING');
  return{amount,review,complete};
 }finally{await act(async()=>root.unmount());if(previous===null)sessionStorage.removeItem(key);else sessionStorage.setItem(key,previous);}
}
