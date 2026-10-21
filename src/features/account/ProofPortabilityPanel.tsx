import { useEffect, useRef, useState } from 'react';
import { Download, FileCheck2, Upload } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { ProofLibrary, ProofReview, ProofSummary } from '../../receiz/proof-library';
import { AccountProofPanel } from './AccountProofPanel';

function save(value: { bytes: Uint8Array; filename: string }) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(value.bytes)], { type: 'application/octet-stream' }));
  const link = document.createElement('a'); link.href = url; link.download = value.filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function failure(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : '';
  if (/IDENTITY|OWNER|belongs to a different/u.test(code)) return 'Open the matching Receiz ID before importing these proofs.';
  if (/CAPACITY/u.test(code)) return 'This collection exceeds the supported proof storage or file limits. Keep your original files; nothing was imported.';
  if (/CAPACITY|INVALID|DIGEST|MISMATCH/u.test(code)) return 'This file could not be verified as a complete supported proof. Choose the original file and try again.';
  return 'The proof could not be verified or retained. Your existing originals are unchanged. Keep this file and try again.';
}
export function ProofPortabilityPanel({ identity }: { identity: OpenIdentity }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [review, setReview] = useState<ProofReview | null>(null), [archive, setArchive] = useState<readonly ProofSummary[]>([]);
  const api = useRef<ProofLibrary | null>(null), generation = useRef(0), running = useRef(false);
  useEffect(() => {
    generation.current++; api.current = null; running.current = false;
    setBusy(false); setError(''); setNotice(''); setReview(null); setArchive([]);
    return () => { generation.current++; };
  }, [identity]);
  const library = async (ticket: number) => {
    if (!identity.proofLibrary) throw Error('PROOF_LIBRARY_UNAVAILABLE');
    if (api.current) return api.current;
    const value = await identity.proofLibrary();
    if (generation.current !== ticket) throw Error('PROOF_IDENTITY_CHANGED');
    return api.current = value;
  };
  const run = async (work: (lib: ProofLibrary, current: () => boolean) => Promise<void>) => {
    if (running.current) return;
    const ticket = generation.current, current = () => generation.current === ticket;
    running.current = true; setBusy(true); setError(''); setNotice('');
    try { const lib = await library(ticket); if (current()) await work(lib, current); }
    catch (cause) { if (current()) setError(failure(cause)); }
    finally { if (current()) { running.current = false; setBusy(false); } }
  };
  if (!identity.proofLibrary) return null;
  return <details className="identity-import proof-portability"><summary>Account proofs &amp; receipts</summary>
    <AccountProofPanel identity={identity} />
    <div className="proof-private-heading">Private evidence archive</div>
    <p className="body-copy small-copy">Keep your originals, verified account history, asset definitions and receipts together. This private archive preserves your evidence; it does not sign you in.</p>
    <button className="secondary-button" disabled={busy} onClick={() => void run(async (lib, current) => {
      const backup = await lib.exportBackup(); if (current()) { save(backup); setNotice('Proof backup saved. Keep this private file with your Identity Record.'); }
    })}><Download size={16} />Save private proof backup</button>
    <label className={`secondary-button proof-import-choice${busy ? ' disabled' : ''}`}><Upload size={16} />Import backup or proof<input type="file" aria-label="Proof backup or recovery file" disabled={busy} accept=".json,.receiz,.receizbundle,.png,.svg,.zip,.jpg,.jpeg,.webp,.pdf" onChange={event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; setReview(null);
      void run(async (lib, current) => { const value = await lib.inspect(file); if (current()) setReview(value); });
    }} /></label>
    <p className="body-copy small-copy">The backup contains private proof data. Save it somewhere secure. Your Identity Record is backed up separately; signing keys, unlock phrases, pending payments and hardware-bound note custody are not included.</p>
    {review && <section className="proof-import-review" aria-label="Verified proof import review">
      <div className="section-heading"><h3><FileCheck2 size={17} />{review.items.length} verified {review.items.length === 1 ? 'proof' : 'proofs'}</h3><span className="muted">{(review.totalBytes / 1024).toLocaleString(undefined, { maximumFractionDigits: 0 })} KB</span></div>
      <ul className="proof-import-items">{review.items.map(item => <li key={item.digest}><strong>{item.title}</strong><span>{item.filename}</span>{item.operationId && <code>{item.operationId}</code>}</li>)}</ul>
      <p className="body-copy small-copy">Import keeps the exact verified originals on this device and restores compatible account history. It does not move funds, replace pending transactions or restore note custody.</p>
      <button className="primary-button" disabled={busy || !review.items.length} onClick={() => void run(async (lib, current) => {
        const result = await lib.retain(review); if (!current()) return;
        const history = result.accountHistory === 'restored' ? ' Verified account history restored.' : result.accountHistory === 'retained' ? ' Account originals saved as evidence; the current account view is unchanged.' : '';
        setReview(null); setNotice(`${result.added} ${result.added === 1 ? 'proof imported' : 'proofs imported'}${result.alreadyHeld ? ` · ${result.alreadyHeld} already held` : ''}.${history}`);
        try { const held = await lib.list(); if (current()) setArchive(held); }
        catch { if (current()) setError('Import saved. The evidence list could not reopen; keep your original backup.'); }
      })}>Import verified proofs</button>
      <button className="text-button" disabled={busy} onClick={() => setReview(null)}>Cancel import</button>
    </section>}
    <button className="text-button" disabled={busy} onClick={() => void run(async (lib, current) => { const held = await lib.list(); if (current()) { setArchive(held); if (!held.length) setNotice('No imported receipts or recovery proofs held yet.'); } })}>Saved receipts &amp; recovery proofs</button>
    {archive.length > 0 && <ul className="proof-import-items proof-archive" aria-label="Saved proof evidence">{archive.map(item => <li key={item.digest}><strong>{item.title}</strong><span>{item.filename}</span><button className="text-button" disabled={busy} onClick={() => void run(async (lib, current) => { const original = await lib.exportProof(item.digest); if (current()) save(original); })}><Download size={14} />Save original</button></li>)}</ul>}
    {busy && <p className="body-copy small-copy" role="status">Verifying original sources on this device…</p>}
    {notice && <p className="body-copy small-copy" role="status">{notice}</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
  </details>;
}
