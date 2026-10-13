import { useRef, useState } from 'react';
import { Fingerprint, ArrowUpRight, Upload, ShieldCheck } from 'lucide-react';
import { BANK_READ_CONSENT } from '../../receiz/config';
export function Entrance({ opening, busy, error, onCreate, onImport }: { opening: boolean; busy: boolean; error: string | null; onCreate: (consent: boolean) => Promise<void>; onImport: (file: File, phrase: string, consent: boolean) => Promise<void> }) {
  const [consent, setConsent] = useState(false), [file, setFile] = useState<File | null>(null), [phrase, setPhrase] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  return <div className="console identity-entrance"><header className="app-header"><span className="wordmark">receiz<span>bank</span></span><ShieldCheck size={19} /></header><main className="entrance-content"><span className="entrance-symbol"><Fingerprint size={39} strokeWidth={1.4} /></span><h1>Your value.<br />More possibilities.</h1><p className="page-subtitle">One place to hold, move, and put your value to work.</p>
    {opening ? <p role="status" className="body-copy">Opening your Receiz ID…</p> : <><label className="identity-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>Use my existing Receiz wallet.<small>{BANK_READ_CONSENT}</small></span></label>
      <button className="primary-button" disabled={busy || !consent} onClick={() => void onCreate(consent)}>Create my Receiz ID<ArrowUpRight size={20} /></button>
      <button className="secondary-button" disabled={busy} onClick={() => picker.current?.click()}><Upload size={18} />Import my Receiz ID</button>
      <input ref={picker} type="file" accept=".png,.pdf,.receiz,.receizkey,.json,application/octet-stream" hidden onChange={event => setFile(event.target.files?.[0] ?? null)} />
      {file && <form className="identity-import" onSubmit={event => { event.preventDefault(); void onImport(file, phrase, consent); }}><span className="small-copy">{file.name}</span><label>Recovery phrase<input type="password" autoComplete="off" value={phrase} onChange={event => setPhrase(event.target.value)} placeholder="Unlock your Identity Seal" /></label><button className="primary-button" disabled={busy || !consent || !phrase}>Open my account</button></form>}
      {busy && <p role="status" className="body-copy">Opening your proof-backed identity…</p>}
    </>}{error && <p role="alert" className="form-error">{error}</p>}<p className="entrance-note">Your signing key stays on this device. Receiz registers this device to protect your ID.</p></main></div>;
}
