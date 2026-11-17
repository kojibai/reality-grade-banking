import {useEffect,useState} from 'react';
import {HostedCheckout} from '../checkout/HostedCheckout';
import {checkoutIdentitySession,type CheckoutIdentitySession} from '../checkout/checkout-identity';
import type {CheckoutRequest} from '../receiz/checkout-request';
import type {InvoiceSource} from '../receiz/invoice-source';
import type {CheckoutReceipt} from '../receiz/checkout-state';
export function invoiceCheckoutRequest(source:InvoiceSource):CheckoutRequest{const {digest:_digest,...fixedSale}=source.proposal.fixedSale;return{username:fixedSale.username,amount:`${BigInt(fixedSale.amountUsdCents)/100n}.${String(BigInt(fixedSale.amountUsdCents)%100n).padStart(2,'0')}`,fixedSale};}
/** Mounted only after the customer's explicit Pay choice. The existing session,
 * account entry, Notes, funding and payment controller own the whole operation. */
export function InvoicePayment({source,onPaid}:{source:InvoiceSource;onPaid?(receipt:CheckoutReceipt):void}){
 const [session,setSession]=useState<CheckoutIdentitySession|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let current=true,owned:CheckoutIdentitySession|undefined;void checkoutIdentitySession().then(value=>{owned=value;if(current)setSession(value);else value.close();}).catch(()=>{if(current)setError(true);});return()=>{current=false;owned?.close();};},[]);
 return <div className="invoice-payment">{session?<HostedCheckout request={invoiceCheckoutRequest(source)} identitySession={session} onPaid={onPaid}/>:<p role="status" className="invoice-notice">{error?'Payment could not be opened yet. Your invoice is still here. Return to the invoice and try again.':'Opening your payment options…'}</p>}</div>;
}
