import { useRef, useState } from 'react';
import { Fingerprint, ArrowUpRight, Upload } from 'lucide-react';
import { inspectIdentityLock } from '../../receiz/identity-lock';
import { BANK_READ_CONSENT } from '../../receiz/config';
import { branding } from '../../../branding/profile.mjs';
import { EntranceConformanceStatus } from './EntranceConformanceStatus';
export function Entrance({ opening, busy, error, onCreate, onImport }: { opening: boolean; busy: boolean; error: string | null; onCreate: (consent: boolean) => Promise<void>; onImport: (file: File, phrase: string, consent: boolean) => Promise<void> }) {
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
  return <div className="console identity-entrance"><header className="app-header"><span className="wordmark">{branding.wordmark}<span>{branding.descriptor}</span></span><EntranceConformanceStatus /></header><main className="entrance-content"><span className="entrance-symbol"><Fingerprint size={39} strokeWidth={1.4} /></span><h1>Your value.<br />More possibilities.</h1><p className="page-subtitle">One place to hold, move, and put your value to work.</p>
    {opening ? <p role="status" className="body-copy">Opening your Receiz ID…</p> : <><p className="entrance-hairline">Create your account</p>
      <button className="primary-button" disabled={busy || inspecting} onClick={() => void onCreate(true)}>Enter<ArrowUpRight size={20} /></button>
      <button className="secondary-button" disabled={busy || inspecting} onClick={() => picker.current?.click()}><Upload size={18} />Use existing account</button>
      <input ref={picker} type="file" accept=".png,.pdf,.receiz,.receizkey,.json,application/octet-stream" hidden onChange={event => { const selected = event.target.files?.[0] ?? null; event.target.value = ''; void chooseFile(selected); }} />
      {file && <form className="identity-import" onSubmit={event => { event.preventDefault(); if (needsPhrase && phrase && !busy && !inspecting && !fileError) void onImport(file, phrase, true); }}><span className="small-copy">{file.name}</span>{needsPhrase && <><label>Unlock phrase<input type="password" autoComplete="off" value={phrase} onChange={event => setPhrase(event.target.value)} placeholder="Unlock your Identity Seal" /></label><button className="primary-button" disabled={busy || inspecting || Boolean(fileError) || !phrase}>Unlock account</button></>}{inspecting && <p className="body-copy" role="status">Opening your ID…</p>}{fileError && <p className="form-error" role="alert">{fileError}</p>}</form>}
      {busy && <p role="status" className="body-copy">Opening your proof-backed identity…</p>}
    <p className="entrance-consent">By creating or opening your ID, you approve the following:<br />{BANK_READ_CONSENT}</p></>}{error && <p role="alert" className="form-error">{error}</p>}<p className="entrance-note">Your signing key stays on this device. Receiz registers this device to protect your ID.</p><a className="entrance-learn" href="/learn/">Explore proof-native banking</a></main></div>;
}
