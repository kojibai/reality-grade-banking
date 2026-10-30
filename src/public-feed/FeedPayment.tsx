import {useState} from 'react';
import {HostedCheckout} from '../checkout/HostedCheckout';
import {createCheckoutIdentitySession} from '../checkout/checkout-identity';
/** Same hosted payment and identity entry as /pay; the feed adds no writer. */
export default function FeedPayment({username}:{username:string}){
 const [session]=useState(()=>createCheckoutIdentitySession({restore:async()=>(await import('../receiz/native-identity')).restoreNativeIdentity(),create:async consent=>(await import('../receiz/native-identity')).createNativeIdentity(consent),importIdentity:async(file,phrase,consent)=>(await import('../receiz/native-identity')).importNativeIdentity(file,phrase,consent),recover:async()=>(await import('../receiz/pbi-account')).openPbiAccount(true)}));
 return <HostedCheckout request={{username}} identitySession={session}/>;
}
