import {SiteFooter} from '../components/SiteFooter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Fingerprint, ShieldCheck, ListChecks, LockKeyhole } from 'lucide-react';
import { AccountProofReader } from '../conformance/AccountProofInspector';
import './verify.css';

export function VerifyApp() {
  return <div className="verify-page"><a className="verify-skip" href="#verify-main">Skip to verification</a>
    <header className="verify-header"><a className="verify-wordmark" href="/">Bankeiz</a><span>Account verification</span><a className="verify-enter" href="/">Enter bank<ArrowUpRight size={16} /></a></header>
    <main id="verify-main"><section className="verify-hero"><p className="verify-eyebrow">Reality-Grade Banking</p><h1>See the proof.</h1><p>Verify identity, funds and history.<br />From the original account source.</p></section>
      <div className="verify-workspace"><section className="verify-card"><div className="verify-card-kicker"><span className="verify-neutral-dot" />Local verification<span>No login required</span></div><AccountProofReader /></section>
        <aside className="verify-scope"><h2>Know what stands behind it.</h2><div><Fingerprint size={22} /><section><h3>Identity</h3><p>The Receiz ID and public key bound to the verified account source.</p></section></div><div><ShieldCheck size={22} /><section><h3>Funds</h3><p>Reserve funds and Settlement Phi at the same accepted account head.</p></section></div><div><ListChecks size={22} /><section><h3>History</h3><p>The full disclosed transaction statement through that source head.</p></section></div><p className="verify-scope-note">Verification establishes the source and its stated scope. It does not establish government identity, later account activity or permission to spend.</p></aside></div>
      <div className="verify-privacy"><LockKeyhole size={16} /><p>Your file stays on this device. Opening it does not sign you in, upload the statement or change an account.</p></div>
    </main><SiteFooter/>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><VerifyApp /></StrictMode>);
