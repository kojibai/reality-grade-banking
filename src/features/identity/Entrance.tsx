import { useRef, useState } from 'react';
import { Fingerprint, ArrowUpRight, Upload } from 'lucide-react';
import { inspectIdentityLock } from '../../receiz/identity-lock';
import { branding } from '../../../branding/profile.mjs';
import { BankMark } from '../../components/BankMark';
import { EntranceConformanceStatus } from './EntranceConformanceStatus';
import { AccountOpening, type OpeningStage } from './AccountOpening';
export function Entrance({ opening, openingStage = 'identity', busy, error, onCreate, onImport }: { opening: boolean; openingStage?: OpeningStage; busy: boolean; error: string | null; onCreate: (consent: boolean) => Promise<void>; onImport: (file: File, phrase: string, consent: boolean) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null), [phrase, setPhrase] = useState('');
  const picker = useRef<HTMLInputElement>(null), inspection = useRef(0);
  const [needsPhrase, setNeedsPhrase] = useState(false), [inspecting, setInspecting] = useState(false), [fileError, setFileError] = useState<string | null>(null);
  const chooseFile = async (next: File | null) => {
    const ticket = ++inspection.current; setFile(next); setPhrase(''); setNeedsPhrase(false); setFileError(null);
    if (!next || busy) return;
    setInspecting(true);
    try {
      const lock = await inspectIdentityLock(next);
      if (ticket !== inspection.current) return;
      setNeedsPhrase(lock.needsPhrase);
      if (!lock.needsPhrase) await onImport(next, '', true);
    } catch { if (ticket === inspection.current) setFileError('This file could not be read as a Receiz ID. Choose your original Identity Seal.'); }
    finally { if (ticket === inspection.current) setInspecting(false); }
  };
  const explicitOpening = busy || inspecting;
  return <><div className="console identity-entrance" hidden={opening || explicitOpening} inert={opening || explicitOpening}><header className="app-header"><span className="bank-home-mark" role="img" aria-label={branding.applicationName}><BankMark /></span><EntranceConformanceStatus /></header><main className="entrance-content"><span className="entrance-symbol"><Fingerprint size={39} strokeWidth={1.4} /></span><h1>Your money.<br />In your hands.</h1><p className="page-subtitle">Send money. Receive payments. Manage assets.<br />Prove what’s yours, wherever you go.</p>
    {!opening && <>
      <button className="primary-button" disabled={busy || inspecting} onClick={() => void onCreate(true)}>Enter<ArrowUpRight size={20} /></button>
      <button className="secondary-button" disabled={busy || inspecting} onClick={() => picker.current?.click()}><Upload size={18} />Use existing account</button>
      <input ref={picker} type="file" accept=".png,.pdf,.receiz,.receizkey,.json,application/octet-stream" hidden onChange={event => { const selected = event.target.files?.[0] ?? null; event.target.value = ''; void chooseFile(selected); }} />
      {file && <form className="identity-import" onSubmit={event => { event.preventDefault(); if (needsPhrase && phrase && !busy && !inspecting && !fileError) void onImport(file, phrase, true); }}><span className="small-copy">{file.name}</span>{needsPhrase && <><label>Unlock phrase<input type="password" autoComplete="off" value={phrase} onChange={event => setPhrase(event.target.value)} placeholder="Unlock your Identity Seal" /></label><button className="primary-button" disabled={busy || inspecting || Boolean(fileError) || !phrase}>Unlock account</button></>}{fileError && <p className="form-error" role="alert">{fileError}</p>}</form>}
    <p className="entrance-consent">By continuing, you authorize <a href="/learn/account-access/">account access</a>, including balance viewing, your Twin, messages and calls. Your <a href="/learn/signing-key/">signing key</a> stays on this device.</p></>}{error && <p role="alert" className="form-error">{error}</p>}<a className="entrance-learn" href="/learn/">Explore Reality-Grade Banking</a></main></div>{explicitOpening ? <AccountOpening stage={openingStage} inspecting={inspecting && !busy}/> : opening && <AccountOpening stage={openingStage} resuming/>}</>;
}
