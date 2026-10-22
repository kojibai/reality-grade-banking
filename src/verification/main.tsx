import {BankMark} from '../components/BankMark';
import {SiteFooter} from '../components/SiteFooter';
import { StrictMode,useEffect,useState } from 'react';
import {flushSync} from 'react-dom';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Fingerprint, ShieldCheck, ListChecks, LockKeyhole } from 'lucide-react';
import { AccountProofReader } from '../conformance/AccountProofInspector';
import './verify.css';
import {publicRuntimeRoot} from '../core/public-runtime';
import {accountProofRoute} from '../receiz/account-proof-links';

export function VerifyApp() {
  const [digest,setDigest]=useState(()=>accountProofRoute(location.pathname));
  useEffect(()=>{const changed=()=>{if(/^\/verify(?:\/|$)/.test(location.pathname))flushSync(()=>setDigest(accountProofRoute(location.pathname)));};addEventListener('popstate',changed);addEventListener('receiz-bank:surface',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('receiz-bank:surface',changed);};},[]);
  return <div className="verify-page"><a className="verify-skip" href="#verify-main">Skip to verification</a>
    <header className="verify-header"><a className="verify-brand" href="/" aria-label="Bankeiz home"><BankMark/></a><span>Account verification</span><a className="verify-enter" href="/">Enter bank<ArrowUpRight size={16} /></a></header>
    <main id="verify-main"><section className="verify-hero"><p className="verify-eyebrow">Reality-grade banking</p><h1>See the proof.</h1><p>Verify identity, funds and history.<br />From the original account source.</p></section>
      <div className="verify-workspace"><section className="verify-card"><div className="verify-card-kicker"><span className="verify-neutral-dot" />Local verification<span>No login required</span></div><AccountProofReader routeDigest={digest}/></section>
        <aside className="verify-scope"><h2>Know what stands behind it.</h2><div><Fingerprint size={22} /><section><h3>Identity</h3><p>The Receiz ID and public key bound to the verified account source.</p></section></div><div><ShieldCheck size={22} /><section><h3>Funds</h3><p>Reserve funds and Settlement Phi at the same accepted account head.</p></section></div><div><ListChecks size={22} /><section><h3>History</h3><p>The full disclosed transaction statement through that source head.</p></section></div><p className="verify-scope-note">Verification establishes the source and its stated scope. It does not establish government identity, later account activity or permission to spend.</p></aside></div>
      <div className="verify-privacy"><LockKeyhole size={16} /><p>Your file stays on this device. Opening it does not sign you in, upload the statement or change an account.</p></div>
    </main><SiteFooter/>
  </div>;
}
createRoot(publicRuntimeRoot('verify'),{identifierPrefix:'public-verify-'}).render(<StrictMode><VerifyApp /></StrictMode>);
