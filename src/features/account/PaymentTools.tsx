import {CopyFeedbackIcon} from '../../components/CopyFeedback';
import {useEffect,useState} from 'react';
import {ArrowUpRight,ChevronDown,Code2,Globe2} from 'lucide-react';
import {buildPaymentTools} from '../../receiz/payment-tools';
import './payment-tools.css';

export function PaymentTools({username,amount}:{username:string;amount:string}){
 const [mode,setMode]=useState<'button'|'checkout'>('button');
 const [feedback,setFeedback]=useState<{value:string;ok:boolean}|null>(null);
 useEffect(()=>{if(!feedback)return;const timer=setTimeout(()=>setFeedback(null),1600);return()=>clearTimeout(timer);},[feedback]);
 let tools:ReturnType<typeof buildPaymentTools>;
 try{tools=buildPaymentTools(username,amount);}catch{return null;}
 const code=mode==='button'?tools.buttonHtml:tools.externalWidgetHtml;
 const copied=feedback?.value===code&&feedback.ok;
 const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);setFeedback({value,ok:true});}catch{setFeedback({value,ok:false});}};
 return <details className="payment-tools">
  <summary><span><Globe2 size={17}/>Accept payments anywhere</span><ChevronDown size={16}/></summary>
  <div className="payment-tools-content">
   <p className="body-copy small-copy">Share your link. Add a payment button. Or put checkout on your website.</p>
   <div className="segmented" aria-label="Website integration">
    <button type="button" aria-pressed={mode==='button'} className={mode==='button'?'active':''} onClick={()=>setMode('button')}>Payment button</button>
    <button type="button" aria-pressed={mode==='checkout'} className={mode==='checkout'?'active':''} onClick={()=>setMode('checkout')}>Embedded checkout</button>
   </div>
   <p className="payment-tools-caption">{mode==='button'?'Paste into an HTML block on your website. Customers pay directly with a card, balance or any supported Note. No signup step.':'Paste into a custom HTML block that allows scripts. The existing Receiz checkout opens card payment within your site.'}</p>
   {mode==='button'&&<div className="payment-button-preview"><a href={tools.hostedCheckoutLink} target="_blank" rel="noopener noreferrer">Pay @{tools.username}<ArrowUpRight size={16}/></a></div>}
   <label className="payment-tools-code"><span><Code2 size={15}/>{mode==='button'?'Your payment button':'Your checkout code'}</span><textarea aria-label={mode==='button'?'Payment button code':'Checkout code'} value={code} readOnly rows={4} spellCheck={false}/></label>
   <button type="button" className="secondary-button" aria-label={copied?(mode==='button'?'Payment button code copied':'Checkout code copied'):(mode==='button'?'Copy payment button code':'Copy checkout code')} onClick={()=>void copy(code)}><CopyFeedbackIcon copied={copied} size={17}/>Copy code</button>
   {mode==='checkout'&&<><p className="payment-tools-caption">No website? Share your Receiz card checkout link instead. Customers choose the amount there; the optional amount above applies to your Bankeiz button.</p><div className="payment-tools-link"><a href={tools.externalCheckoutLink} target="_blank" rel="noopener noreferrer">receiz.com/payments/{tools.username}<ArrowUpRight size={15}/></a><button type="button" aria-label={feedback?.value===tools.externalCheckoutLink&&feedback.ok?'Checkout link copied':'Copy checkout link'} onClick={()=>void copy(tools.externalCheckoutLink)}><CopyFeedbackIcon copied={feedback?.value===tools.externalCheckoutLink&&feedback.ok===true}/></button></div></>}
   {feedback?.ok===false&&(feedback.value===code||feedback.value===tools.externalCheckoutLink)&&<p role="status" className="payment-tools-caption">Copying is unavailable. Select and copy the code or link above.</p>}
   <details className="payment-tools-methods"><summary>Payment methods</summary><p>Your Bankeiz button supports Reserve, Settlement and Settlement Reserve Notes through Pay with a Note. The payer approves one payment. Selected Notes confirm their credit before that payment continues. The original proof and funding composition stay connected. Receiz’s embedded widget is a separate card checkout with legacy Wallet Note compatibility.</p></details>
   <a className="payment-tools-guide" href="/learn/get-paid/">Setup and developer guide<ArrowUpRight size={15}/></a>
  </div>
 </details>;
}
