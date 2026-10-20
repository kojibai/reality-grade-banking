import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Download, FileDown, ShieldCheck, Upload } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankNoteRail, BankNoteImage, BankNoteInspection, BankNoteDeposit, BankOfflineNotes } from '../../receiz/offline-notes';
import { AmountInput } from '../../components/AmountInput';
import { formatMoney, formatUnits } from '../../core/money';
import { OfflineNotePreview } from './OfflineNotePreview';
import { shareNoteImage } from './save-note-image';
import {noteError,noteRegistrationCode} from './note-error';
import {noteFailureStage} from '../../receiz/note-stage';
import {noteRegistrationEvidence,type NoteRegistrationEvidence} from '../../receiz/note-registration-evidence';
function download(bytes: Uint8Array, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type })), link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function cents(amount: string): string {
  const m = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (!m) throw new Error('Enter a dollar amount with up to two decimal places.');
  const value = BigInt(m[1]) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
  if (value <= 0n || value > 100000000n) throw new Error('Choose an amount from $0.01 to $1,000,000.');
  return value.toString();
}
function exactPhi(value?: string): string {
  if (value === undefined) return '—';
  const [whole, fraction] = formatUnits(value).split('.');
  return `${new Intl.NumberFormat('en-US').format(BigInt(whole))}${fraction ? `.${fraction}` : ''}`;
}
export function OfflineNotes({ identity, mode, onBack, onRefresh }: { identity: OpenIdentity; mode: 'create' | 'deposit'; onBack: () => void; onRefresh: () => void }) {
  const [rail, setRail] = useState<BankNoteRail>('reserve');
  const [amount, setAmount] = useState('100'), [review, setReview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''),[registrationCode,setRegistrationCode]=useState('');
  const [failureStage,setFailureStage]=useState<ReturnType<typeof noteFailureStage>>(null);
  const [inventoryReady,setInventoryReady]=useState(false);
  const [registrationEvidence,setRegistrationEvidence]=useState<NoteRegistrationEvidence|null>(null);
  const [saved, setSaved] = useState<BankNoteImage[]>([]);
  const [pending, setPending] = useState<{ amountUsdCents: string; noteId: string; rail?: BankNoteRail; canCancel?: boolean } | null>(null), [created, setCreated] = useState<BankNoteImage | null>(null), [inspection, setInspection] = useState<BankNoteInspection | null>(null), [deposited, setDeposited] = useState<BankNoteDeposit | null>(null), [image, setImage] = useState<Uint8Array | null>(null), [imageUrl, setImageUrl] = useState(''), [notice, setNotice] = useState('');
  const alive = useRef(true), running = useRef(false), api = useRef<BankOfflineNotes | null>(null);
  const report=(cause:unknown)=>{setError(noteError(cause));setRegistrationCode(noteRegistrationCode(cause));setRegistrationEvidence(noteRegistrationEvidence(cause));setFailureStage(noteFailureStage(cause));};
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const notes = async () => api.current ??= await identity.offlineNotes!();
  useEffect(() => {
    if (!identity.offlineNotes || mode !== 'create') return;
    let current = true;setInventoryReady(false);
    void notes().then(async n => {
      const items=n.savedNotes?await n.savedNotes():[],value=await n.pending();
      if(!current)return;
      setSaved(items);
      if(value){setPending(value);setRail(value.rail??'reserve');setAmount(`${BigInt(value.amountUsdCents)/100n}.${(BigInt(value.amountUsdCents)%100n).toString().padStart(2,'0')}`);setReview(true);}
      setInventoryReady(true);
    }).catch(cause=>{if(current)report(cause);});
    return()=>{current=false;};
  }, [identity,mode]);
  useEffect(() => { if (!created) return; const url = URL.createObjectURL(new Blob([new Uint8Array(created.image)], { type: 'image/png' })); setImageUrl(url); return () => URL.revokeObjectURL(url); }, [created]);
  const run = async (operation: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try {
      if (!identity.offlineNotes) throw new Error('Offline Notes are unavailable in this build.');
      await operation();
    } catch (cause) {
      if (alive.current) {
        report(cause);
        if (mode === 'create' && api.current) {
          try {
            const value = await api.current.pending();
            if (alive.current) {
              setPending(value); setReview(Boolean(value));
              if (value) {
                setRail(value.rail ?? 'reserve');
                setAmount(`${BigInt(value.amountUsdCents) / 100n}.${(BigInt(value.amountUsdCents) % 100n).toString().padStart(2, '0')}`);
              }
            }
          } catch { /* An unreadable outcome never clears retained recovery UI. */ }
        }
      }
    } finally { running.current = false; if (alive.current) setBusy(false); }
  };
  const inspect = (file?: File) => { if (!file || running.current) return; setImage(null); setInspection(null); setDeposited(null); void run(async () => { if (file.size > 8 * 1024 * 1024) throw new Error('Choose an original note image up to 8 MB.'); const bytes = new Uint8Array(await file.arrayBuffer()), result = await (await notes()).inspect(bytes); if (alive.current) { setImage(bytes); setInspection(result); } }); };
  const depositReviewedNote = () => run(async () => {
    if (!image || !inspection) throw Error('BANK_NOTE_REVIEW_REQUIRED');
    const result = await (await notes()).deposit(image);
    if (result.noteId !== inspection.noteId || (result.rail ?? 'reserve') !== (inspection.rail ?? 'reserve') || result.amountUsdCents !== inspection.amountUsdCents || result.amountPhiMicro !== inspection.amountPhiMicro) throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
    if (alive.current) { setDeposited(result); onRefresh(); }
  });
  const prepareReceive = () => run(async () => { const request = await (await notes()).receivingRequest(); if (alive.current) { download(request, 'receiz-bank-note-receiving-request.json', 'application/json'); setNotice('Send this receiving request to the note’s holder. They will send you a note addressed to this device.'); } });
  return <div className="offline-notes-flow"><button className="back-link" disabled={busy} onClick={onBack}><ArrowLeft size={16} />{mode === 'create' ? 'All send options' : 'All receive options'}</button>
    {mode === 'create' && !created && <><h1 className="sheet-hero">{pending ? 'Resume your note.' : review ? 'Your value. In your hands.' : 'Create a note.'}</h1><p className="body-copy">Your value, in your hands. Ready to move—even offline.</p>
      {!review && <AmountInput label="Note amount" value={amount} onChange={setAmount} dollars />}
      <OfflineNotePreview amount={amount} rail={rail} />
      <div className="detail-list"><div><span>From</span><label className="note-rail-choice"><select aria-label="From account" value={rail} disabled={busy || Boolean(pending)} onChange={event => { setRail(event.target.value as BankNoteRail); setReview(false); }}><option value="reserve">Reserve</option><option value="settlement">Settlement</option></select><ChevronDown size={15} aria-hidden="true" /></label></div>{review && <div><span>Note value</span><strong>{formatMoney(pending?.amountUsdCents ?? cents(amount))}</strong></div>}</div>
      <p className="body-copy small-copy">{rail === 'settlement' ? 'Creating this note locks exact Phi from Settlement. It returns the same Phi on deposit; its dollar value follows the deterministic rate.' : 'Creating this note moves its dollar denomination from Reserve into secure device custody.'} You approve this exact amount; your identity signing key stays on this device. A copied image alone cannot spend it. Keep this device until the note is deposited or transferred.</p>
      <button className="primary-button" disabled={busy || !inventoryReady} onClick={() => { if (!review) { try { cents(amount); setReview(true); setError(''); } catch (cause) { report(cause); } return; } void run(async () => { const value = await (await notes()).create(pending?.amountUsdCents ?? cents(amount), ...(rail === 'settlement' ? [rail] as const : [])); if (alive.current) { setCreated(value); setPending(null); onRefresh(); } }); }}><ArrowUpRight size={17} />{busy ? 'Preparing your note…' : review ? pending ? 'Resume this note' : 'Create funded note' : 'Review note'}</button>
      {!review && saved.length > 0 && <div className="retained-deposits"><p className="body-copy small-copy">Saved notes</p>{saved.map(note => <button key={note.noteId} className="asset-row" onClick={() => setCreated(note)}><span className="row-copy"><strong>{formatMoney(note.amountUsdCents)}</strong><span>{note.transferred ? 'Transferred · save the updated image' : note.transferPending ? 'Transfer pending · resume' : 'Open your original note'}</span></span><Download size={18} /></button>)}</div>}
      {pending?.canCancel && <button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await (await notes()).cancelUnfunded(); if (alive.current) { setPending(null); setReview(false); } })}>Discard unissued note</button>}
      {review && !pending && <button className="secondary-button" disabled={busy} onClick={() => setReview(false)}>Edit amount</button>}
    </>}
    {created && <><div className="status-icon success"><Check size={32} /></div><h1 className="sheet-hero">{created.transferred ? 'Your note is transferred.' : created.transferPending ? 'Resume your transfer.' : 'Your note is ready.'}</h1><p className="body-copy">{created.transferred ? 'Save this updated image and send it to the recipient.' : `${formatMoney(created.amountUsdCents)} is held in your funded Offline Note.`}</p>{imageUrl && <img className="issued-note-image" src={imageUrl} alt={`Your funded ${formatMoney(created.amountUsdCents)} ${created.rail === 'settlement' ? 'Settlement' : 'Reserve'} Note`} />}<button className="primary-button" onClick={() => { const note = created; void shareNoteImage(note.image, `${note.rail ?? 'reserve'}-note-${note.noteId}.png`).then(result => { if (result === 'download') download(note.image, `${note.rail ?? 'reserve'}-note-${note.noteId}.png`, 'image/png'); }); }}><Download size={17} />Save note image</button>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <><button className="secondary-button" onClick={() => download(created.image, `${created.rail ?? 'reserve'}-note-${created.noteId}.png`, 'image/png')}>Download original PNG</button><p className="body-copy small-copy">Keep the original PNG for deposit. Photo apps can remove its carried proof when they convert the image.</p></>}
      {created.accountUpdateWarning && <p className="body-copy small-copy" role="status">{created.accountUpdateWarning}</p>}
      {created.transferPending && <button className="primary-button" disabled={busy} onClick={() => void run(async () => { const result = await (await notes()).transfer(created.noteId); if (alive.current) { setCreated({ ...created, image: result.image, transferred: true, transferPending: false }); setNotice('Ownership transferred. Save and send this updated note image to the recipient.'); } })}>{busy ? 'Resuming transfer…' : 'Resume transfer'}</button>}
      <label className="upload-choice"><ArrowUpRight size={18} /><span>{busy ? 'Preparing the transfer…' : 'Send using a receiving request'}<input disabled={busy || created.transferred || created.transferPending} type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void run(async () => { if (file.size > 128 * 1024) throw new Error('Choose the original note receiving request.'); const result = await (await notes()).transfer(created.noteId, new Uint8Array(await file.arrayBuffer())); if (alive.current) { setCreated({ ...created, image: result.image, transferred: true, transferPending: false }); setNotice('Ownership transferred. Save and send this updated note image to the recipient.'); } }); }} /></span></label><p className="body-copy small-copy">To send it, ask the recipient for a receiving request from Receive → Deposit note. Save the updated image after the transfer. Your device can no longer spend the transferred note.</p>
    </>}
    {mode === 'deposit' && !deposited && <><h1 className="sheet-hero">Deposit a note.</h1><p className="body-copy">Open the original note image. Its proof determines the receiving account.</p><label className="file-drop"><Upload size={30} /><strong>{busy ? 'Opening your note…' : 'Choose note image'}</strong><span>Original note PNG</span><input type="file" accept="image/png,.png" disabled={busy} onChange={event => inspect(event.target.files?.[0])} /></label>
      {inspection && <><div className="detail-list"><div><span>Note value</span><strong>{formatMoney(inspection.amountUsdCents)}</strong></div><div><span>Into</span><strong>{inspection.rail === 'settlement' ? 'Settlement' : 'Reserve'}</strong></div>{inspection.rail === 'settlement' && <div><span>Exact Phi</span><strong>{exactPhi(inspection.amountPhiMicro)} Φ</strong></div>}</div><button className="primary-button" disabled={busy} onClick={() => void depositReviewedNote()}><FileDown size={17} />{busy ? 'Depositing your note…' : inspection.rail === 'settlement' ? 'Deposit exact Phi' : `Deposit ${formatMoney(inspection.amountUsdCents)}`}</button><p className="body-copy small-copy">{inspection.rail === 'settlement' ? 'Deposit redeems this note once into Settlement for the exact Phi locked. The dollar denomination records its value at issuance.' : 'Deposit redeems this note once. Its dollar denomination becomes spendable Reserve when its proof and current ownership verify.'}</p></>}
      <button className="secondary-button" disabled={busy} onClick={() => void prepareReceive()}><Download size={17} />Create receiving request</button><p className="body-copy small-copy">Receiving from another person? Send them this device’s receiving request first. A note must be held by this device before it can be deposited.</p>
    </>}
    {deposited && <><div className="status-icon success"><Check size={32} /></div><h1 className="sheet-hero">Added to {deposited.rail === 'settlement' ? 'Settlement' : 'Reserve'}.</h1><div className="success-amount">{deposited.rail === 'settlement' ? `${exactPhi(deposited.amountPhiMicro)} Φ` : formatMoney(deposited.amountUsdCents)}</div><p className="body-copy">Your note is redeemed. Its {deposited.rail === 'settlement' ? 'Settlement' : 'Reserve'} credit carries the complete verified proof.</p><button className="secondary-button" onClick={() => download(deposited.proofBytes, `receiz-note-deposit-${deposited.noteId}.receiz.json`, 'application/json')}>Save deposit proof</button><button className="primary-button" onClick={onBack}>Done</button></>}
    {notice && <p className="body-copy" role="status">{notice}</p>}{error && <><p className="error-message" role="alert">{error}</p>{(registrationCode||failureStage)&&<details className="note-registration-details"><summary>{registrationCode?'Registration details':'Note details'}</summary>{registrationCode&&<code>{registrationCode}</code>}{failureStage&&<p>Stage: {failureStage.stage} · {failureStage.errorName}</p>}{registrationEvidence&&<><p>Browser response · registration not qualified</p><dl className="detail-list"><div><dt>Attestation format</dt><dd>{registrationEvidence.format}</dd></div><div><dt>Registration counter</dt><dd>{registrationEvidence.counter}</dd></div><div><dt>User verified</dt><dd>{registrationEvidence.userVerified?'Yes':'No'}</dd></div><div><dt>Backup eligible</dt><dd>{registrationEvidence.backupEligible?'Yes':'No'}</dd></div><div><dt>Backed up</dt><dd>{registrationEvidence.backedUp?'Yes':'No'}</dd></div></dl></>}<p>Share these details when requesting support. They contain no credentials or account data.</p></details>}</>}
    <p className="trust-line"><ShieldCheck size={17} />Proof and custody stay connected.</p>
  </div>;
}
