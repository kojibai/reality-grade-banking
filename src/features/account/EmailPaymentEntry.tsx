import {useEffect,useRef,useState} from 'react';
import {BankMark} from '../../components/BankMark';
import {AccountOpening} from '../identity/AccountOpening';
import {openEmailPayment,readEmailPaymentEntry} from '../../receiz/email-payment-entry';

export function EmailPaymentEntry(){
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),attempted=useRef(false);
 const open=async()=>{
  if(attempted.current)return;attempted.current=true;setBusy(true);setError(null);
  try{await openEmailPayment();location.replace('/#account');}
  catch(cause){const code=cause instanceof Error?cause.message:'';setError(code==='EMAIL_PAYMENT_DIFFERENT_ACCOUNT'?'A different account is saved on this device. Your saved Identity Record is unchanged. Use your recipient account through existing account access to continue.':code==='EMAIL_PAYMENT_SAVED_ACCOUNT_REQUIRED'?'Your saved Identity Record could not be opened. It is unchanged. Use existing account access to continue.':code||'This payment could not be opened. Try again.');attempted.current=false;setBusy(false);}
 };
 useEffect(()=>{let alive=true;void readEmailPaymentEntry().then(value=>{if(!alive)return;setReady(true);if(!('pending'in value)||value.autoContinue)void open();}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'This link could not be verified.');});return()=>{alive=false;};},[]);
 if(busy)return <AccountOpening stage="identity"/>;
 return <div className="console identity-entrance"><header className="app-header"><span className="bank-home-mark" role="img" aria-label="Bankeiz"><BankMark/></span></header><main className="entrance-content"><h1>Your payment.<br/>Your account.</h1><p className="page-subtitle">Open the account verified for this payment email.</p>{ready&&<button className="primary-button" onClick={()=>void open()}>Open your account</button>}{error&&<p className="form-error" role="alert">{error}</p>}<p className="entrance-consent">By continuing, you authorize <a href="/learn/account-access/">account access</a>. Your signing key stays on this device.</p><a className="entrance-learn" href="/">Existing account access</a></main></div>;
}
