import {createRoot} from 'react-dom/client';
import {HostedCheckout} from './HostedCheckout';
import {createCheckoutIdentitySession} from './checkout-identity';
import {checkoutEntry} from './entry';
import '../styles/tokens.css';
import './checkout.css';
const host=document.querySelector<HTMLElement>('[data-checkout-root]')!;
try{
 const entry=checkoutEntry(location.href,location.origin,window.parent!==window);
 if(entry.kind==='frame-return'){
  host.textContent='Returning to your payment…';
  window.parent.postMessage({source:'receiz-bank-card-return',type:'checkout-returned',sessionId:entry.returned.sessionId},location.origin);
 }else{
  const session=createCheckoutIdentitySession({restore:async()=> (await import('../receiz/native-identity')).restoreNativeIdentity(),create:async consent=>(await import('../receiz/native-identity')).createNativeIdentity(consent),importIdentity:async(file,phrase,consent)=>(await import('../receiz/native-identity')).importNativeIdentity(file,phrase,consent)});
  createRoot(host).render(<HostedCheckout request={entry.request} returnContext={entry.returned} identitySession={session}/>);
 }
}catch{
 host.innerHTML='<main class="checkout-opening"><p>Bankeiz · Secure payment</p><h1>This payment link could not be opened.</h1><p>Ask the recipient for their Bankeiz payment link. No payment was submitted.</p><a href="/">Open Bankeiz</a></main>';
}
