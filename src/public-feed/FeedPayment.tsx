import {useState} from 'react';
import {HostedCheckout} from '../checkout/HostedCheckout';
import {createCheckoutIdentitySession} from '../checkout/checkout-identity';
/** The canonical session is acquired lazily and released by HostedCheckout.
 * Replayed UI effects can acquire a fresh session; account entry is unchanged.
 * Same hosted payment and identity entry as /pay; the feed adds no writer. */
export default function FeedPayment({username}:{username:string}){
 const [session]=useState(()=>{let held:ReturnType<typeof createCheckoutIdentitySession>|undefined;const current=()=>held??=createCheckoutIdentitySession({restore:async()=>(await import('../receiz/native-identity')).restoreNativeIdentity(),create:async consent=>(await import('../receiz/native-identity')).createNativeIdentity(consent),importIdentity:async(file,phrase,consent)=>(await import('../receiz/native-identity')).importNativeIdentity(file,phrase,consent),recover:async()=>(await import('../receiz/pbi-account')).openPbiAccount(true)});return{open:()=>current().open(),import:(file:File,phrase:string)=>current().import(file,phrase),recoverPbi:()=>current().recoverPbi(),close:()=>{held?.close();held=undefined;}};});
 return <HostedCheckout request={{username}} identitySession={session}/>;
}
