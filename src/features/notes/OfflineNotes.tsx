import {InlineOpening} from '../../components/InlineOpening';
import {sameNoteFundingParts} from '../../receiz/note-funding';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Download, FileDown, ShieldCheck, Upload } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankNoteReview, BankNoteRail, BankNoteImage, BankNoteInspection, BankNoteDepositResult, BankOfflineNotes } from '../../receiz/offline-notes';
import { AmountInput } from '../../components/AmountInput';
import { formatMoney, formatUnits } from '../../core/money';
import { OfflineNotePreview } from './OfflineNotePreview';
import { shareNoteImage } from './save-note-image';
import {noteError,noteRegistrationCode} from './note-error';
import {noteFailureStage} from '../../receiz/note-stage';
import {noteRegistrationEvidence,type NoteRegistrationEvidence} from '../../receiz/note-registration-evidence';
import {NoteContinuityDetails} from './NoteContinuityDetails';
import {noteTitle} from '../../receiz/note-design';
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
export function OfflineNotes({ identity, mode, onBack, onRefresh, backLabel, initialReview=false }: { identity: OpenIdentity; mode: 'create' | 'deposit'; onBack: () => void; onRefresh: () => void; backLabel?:string;initialReview?:boolean }) {
  const [rail, setRail] = useState<BankNoteRail>(()=>identity.knownWallet?.()?.wallet.reserveUsdCents==='0'?'settlement':'reserve');
  const [funding,setFunding]=useState<BankNoteReview|null>(null);
  const [amount, setAmount] = useState('100'), [review, setReview] = useState(initialReview), [busy, setBusy] = useState(false), [error, setError] = useState(''),[registrationCode,setRegistrationCode]=useState('');
  const [failureStage,setFailureStage]=useState<ReturnType<typeof noteFailureStage>>(null);
  const [connectionRequired,setConnectionRequired]=useState(false);
  const [inventoryReady,setInventoryReady]=useState(false);
  const [registrationEvidence,setRegistrationEvidence]=useState<NoteRegistrationEvidence|null>(null);
  const [saved, setSaved] = useState<BankNoteImage[]>([]);
  const [received,setReceived]=useState<BankNoteDepositResult[]>([]);
  const [pending, setPending] = useState<{ amountUsdCents: string; noteId: string; rail?: BankNoteRail; amountPhiMicro?:string;fundingParts?:BankNoteReview['fundingParts']; canCancel?: boolean } | null>(null), [created, setCreated] = useState<BankNoteImage | null>(null), [inspection, setInspection] = useState<BankNoteInspection | null>(null), [deposited, setDeposited] = useState<BankNoteDepositResult | null>(null), [image, setImage] = useState<Uint8Array | null>(null), [imageUrl, setImageUrl] = useState(''), [notice, setNotice] = useState('');
  const alive = useRef(true), running = useRef(false), api = useMemo(() => ({ current: null as BankOfflineNotes | null, pending: undefined as Promise<BankOfflineNotes> | undefined }), [identity]);
  const report=(cause:unknown)=>{setError(noteError(cause));setConnectionRequired(mode==='create'&&cause instanceof Error&&cause.message==='BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');setRegistrationCode(noteRegistrationCode(cause));setRegistrationEvidence(noteRegistrationEvidence(cause));setFailureStage(noteFailureStage(cause));};
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const notes = async () => {
    if(api.current)return Promise.resolve(api.current);
    return api.pending ??= identity.offlineNotes!().then(value => api.current = value).catch(cause => { api.pending = undefined; throw cause; });
  };
  const saveCreated=(downloadOnly=false)=>{
    if(!created)return;const note=created;
    void run(async()=>{
      const runtime=await notes(),image=runtime.exportImage?await runtime.exportImage(note.image,note.noteId):note.image;
      if(!alive.current)return;
      setCreated({...note,image});
      const filename=`${note.rail??'reserve'}-note-${note.noteId}.png`;
      if(downloadOnly||await shareNoteImage(image,filename,noteTitle(note.rail))==='download')download(image,filename,'image/png');
    });
  };
  useEffect(()=>{
    if(mode!=='deposit'||!identity.offlineNotes)return;
    let current=true;
    const read=()=>{void notes().then(n=>n.receivedNotes?.()??[]).then(items=>{if(current){setReceived(items);setDeposited(previous=>previous?items.find(note=>note.noteId===previous.noteId)??previous:previous);}}).catch(cause=>{if(current)report(cause);});};
    read();addEventListener('bankeiz:account-observation',read);
    return()=>{current=false;removeEventListener('bankeiz:account-observation',read);};
  },[identity,mode]);
  useEffect(()=>{
    if(mode!=='create'||!identity.offlineNotes)return;
    let current=true;
    const update=()=>{void notes().then(n=>n.savedNotes?.()??[]).then(items=>{if(current){setSaved(items);setCreated(previous=>previous?.selfDeposit?items.find(item=>item.noteId===previous.noteId)??previous:previous);}}).catch(cause=>{if(current)report(cause);});};
    addEventListener('bankeiz:account-observation',update);
    return()=>{current=false;removeEventListener('bankeiz:account-observation',update);};
  },[identity,mode]);
  useEffect(() => {
    if (!identity.offlineNotes || mode !== 'create') return;
    let current = true;setInventoryReady(false);
    void notes().then(async n => {
      const itemsRead=n.savedNotes?n.savedNotes():Promise.resolve([]);
      const pendingRead=(async()=>{try{return {value:await n.pending()};}catch(error){return {error};}})();
      const items=await itemsRead,result=await pendingRead;if('error' in result)throw result.error;const value=result.value;
      if(!current)return;
      setSaved(items);
      if(value)setFunding({...value,rail:value.rail??'reserve'});
      if(value){setPending(value);setRail(value.rail??'reserve');setAmount(`${BigInt(value.amountUsdCents)/100n}.${(BigInt(value.amountUsdCents)%100n).toString().padStart(2,'0')}`);setReview(true);}
      setInventoryReady(true);
    }).catch(cause=>{if(current)report(cause);});
    return()=>{current=false;};
  }, [identity,mode]);
  useEffect(() => { if (!created) return; const url = URL.createObjectURL(new Blob([new Uint8Array(created.image)], { type: 'image/png' })); setImageUrl(url); return () => URL.revokeObjectURL(url); }, [created]);
  const run = async (operation: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');setConnectionRequired(false);
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
                setRail(value.rail ?? 'reserve');setFunding({...value,rail:value.rail??'reserve'});
                setAmount(`${BigInt(value.amountUsdCents) / 100n}.${(BigInt(value.amountUsdCents) % 100n).toString().padStart(2, '0')}`);
              }
            }
          } catch { /* An unreadable outcome never clears retained recovery UI. */ }
        }
      }
    } finally { running.current = false; if (alive.current) setBusy(false); }
  };
  const inspect = (file?: File) => { if (!file || running.current) return; setImage(null); setInspection(null); setDeposited(null); void run(async () => { if (file.size > 32 * 1024 * 1024) throw new Error('This original exceeds the supported Note proof capacity.'); const prepared=notes().then(value=>({value}),error=>({error})),bytes = new Uint8Array(await file.arrayBuffer()),runtime=await prepared;if('error' in runtime)throw runtime.error;const result = await runtime.value.inspect(bytes); if (alive.current) { setImage(bytes); setInspection(result); } }); };
  const depositReviewedNote = () => run(async () => {
    if (!image || !inspection) throw Error('BANK_NOTE_REVIEW_REQUIRED');
    const result = await (await notes()).deposit(image);
    if (result.noteId !== inspection.noteId || (result.rail ?? 'reserve') !== (inspection.rail ?? 'reserve') || result.amountUsdCents !== inspection.amountUsdCents || result.amountPhiMicro !== inspection.amountPhiMicro || !sameNoteFundingParts(result.fundingParts,inspection.fundingParts)) throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
    if (alive.current) { setDeposited(result); onRefresh(); }
  });
  const prepareReceive = () => run(async () => { const request = await (await notes()).receivingRequest(); if (alive.current) { download(request, 'receiz-bank-note-receiving-request.json', 'application/json'); setNotice('Send this receiving request to the note’s holder. They will send you a Note addressed to your ID.'); } });
  return <div className="offline-notes-flow"><button className="back-link" disabled={busy} onClick={onBack}><ArrowLeft size={16} />{backLabel??(mode === 'create' ? 'All send options' : 'All receive options')}</button>
    {mode === 'create' && !created && <><h1 className="sheet-hero">{pending ? 'Resume your note.' : review ? 'Your value. In your hands.' : 'Create a note.'}</h1><p className="body-copy">Your value, in your hands. Ready to move—even offline.</p>
      {!review && <AmountInput label="Note amount" value={amount} onChange={value=>{if(!running.current)setAmount(value);}} disabled={busy} dollars />}
      <OfflineNotePreview amount={review&&funding?`${BigInt(funding.amountUsdCents)/100n}.${(BigInt(funding.amountUsdCents)%100n).toString().padStart(2,'0')}`:amount} rail={rail} />
      {review && <div className="detail-list"><div><span>{rail==='reserve'?'Note value':'Value at creation'}</span><strong>{formatMoney(pending?.amountUsdCents ?? funding?.amountUsdCents ?? cents(amount))}</strong></div></div>}
      <p className="body-copy small-copy">This amount moves from your account into the Note when creation completes.{review&&rail!=='reserve'?' Its exact funded units stay intact; their dollar reference can change.':''}</p>
      <details className="note-value-details"><summary>Note details</summary>{funding?.fundingParts&&<div className="detail-list"><div><span>Reserve source</span><strong>{formatMoney(funding.fundingParts.reserve.amountUsdCents)}</strong></div><div><span>Settlement source</span><strong>{formatMoney(funding.fundingParts.settlement.amountUsdCents)}</strong></div></div>}<p>{rail==='composite'?'One Settlement Note carries the full amount. Its two funding sources retain their exact units and complete proof underneath; you do not have to choose between them.':rail==='settlement'?'This Settlement Note holds exact Phi. Deposit returns the same Phi; its dollar value follows the deterministic rate.':'This Settlement Note holds its funded dollar denomination. Deposit returns that amount to your account.'}</p><p>Your identity signing key stays on this device. Keep the original PNG and this device until the Note is deposited or transferred.</p></details>
      <button className="primary-button" disabled={busy || !inventoryReady} onClick={() => { if (!review) { try { const value=cents(amount); if(api.current?.review){void run(async()=>{const result=await api.current!.review!(value);if(result.amountUsdCents!==value)throw Error('BANK_NOTE_EXACT_RESUME_REQUIRED');if(alive.current){setFunding(result);setRail(result.rail);setReview(true);}});}else{setReview(true);setError('');} } catch (cause) { report(cause); } return; } void run(async () => { const value = await (await notes()).create(pending?.amountUsdCents ?? funding?.amountUsdCents ?? cents(amount)); if (alive.current) { setCreated(value); setPending(null); onRefresh(); } }); }}><ArrowUpRight size={17} />{busy ? 'Preparing your note…' : review ? pending ? 'Resume this note' : 'Create funded note' : 'Review note'}</button>
      {!review && saved.length > 0 && <div className="retained-deposits"><p className="body-copy small-copy">Saved notes</p>{saved.map(note => <button key={note.noteId} className="asset-row" onClick={() => setCreated(note)}><span className="row-copy"><strong>{formatMoney(note.amountUsdCents)}</strong><span>{note.selfDeposit ? note.selfDeposit==='confirmed'?'Deposited · original kept':'Deposit pending · original kept' : note.transferred ? 'Transferred · save the updated image' : note.transferPending ? 'Transfer pending · resume' : 'Open your original note'}</span></span><Download size={18} /></button>)}</div>}
      {pending?.canCancel && <button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await (await notes()).cancelUnfunded(); if (alive.current) { setPending(null); setReview(false);setFunding(null); } })}>Discard unissued note</button>}
      {review && !pending && <button className="secondary-button" disabled={busy} onClick={() => {setReview(false);setFunding(null);}}>Edit amount</button>}
    </>}
    {created && <><div className="status-icon success"><Check size={32} /></div><h1 className="sheet-hero">{created.selfDeposit ? created.selfDeposit==='confirmed'?'Your note is deposited.':'Your deposit is pending.' : created.transferred ? created.consumption==='connection-required'?'Your note is addressed.':'Your note is transferred.' : created.transferPending ? 'Resume your transfer.' : 'Your note is ready.'}</h1><p className="body-copy">{created.selfDeposit ? created.selfDeposit==='confirmed'?'Its value has been returned to your account. Keep this original for your records.':'This original image is kept for your records. Your retained deposit will confirm when connected.' : created.transferred ? created.consumption==='connection-required'?'Save this updated image and send it to the recipient. Its one-time deposit is confirmed when they connect.':'Save this updated image and send it to the recipient.' : created.rail==='reserve'?`${formatMoney(created.amountUsdCents)} is held in your Note.`:`Your Note holds its exact funded value. ${formatMoney(created.amountUsdCents)} records its value at creation.`}</p>{imageUrl && <img className="issued-note-image" src={imageUrl} alt={`Your funded ${formatMoney(created.amountUsdCents)} ${noteTitle(created.rail)}`} />}<button className="primary-button" disabled={busy} onClick={() => saveCreated()}><Download size={17} />{created.selfDeposit?'Save original image':'Save note image'}</button>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <><button className="secondary-button" disabled={busy} onClick={() => saveCreated(true)}>Download original PNG</button><p className="body-copy small-copy">{created.selfDeposit?'This image preserves your original Note. It cannot be deposited again.':'Keep the original PNG for deposit. Photo apps can remove its carried proof when they convert the image.'}</p></>}
      {created.accountUpdateWarning && <p className="body-copy small-copy" role="status">{created.accountUpdateWarning}</p>}
      {created.selfDeposit==='pending'&&<button className="secondary-button" disabled={busy} onClick={()=>void run(async()=>{const result=await(await notes()).recoverDeposit?.(created.image);if(result&&alive.current){setCreated(null);setDeposited(result);onRefresh();}})}>Check saved deposit</button>}
      {created.transferPending && <button className="primary-button" disabled={busy} onClick={() => void run(async () => { const result = await (await notes()).transfer(created.noteId); if (alive.current) { setCreated({ ...created, image: result.image, transferred: true, transferPending: false }); setNotice(created.consumption==='connection-required'?'Handover saved. Send this updated image to the recipient.':'Ownership transferred. Save and send this updated note image to the recipient.'); } })}>{busy ? 'Resuming transfer…' : 'Resume transfer'}</button>}
      <label className="upload-choice"><ArrowUpRight size={18} /><span>{busy ? 'Preparing the transfer…' : 'Send using a receiving request'}<input disabled={busy || !!created.selfDeposit || created.transferred || created.transferPending} type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void run(async () => { if (file.size > 128 * 1024) throw new Error('Choose the original note receiving request.'); const result = await (await notes()).transfer(created.noteId, new Uint8Array(await file.arrayBuffer())); if (alive.current) { setCreated({ ...created, image: result.image, transferred: true, transferPending: false }); setNotice(created.consumption==='connection-required'?'Handover saved. Send this updated image to the recipient.':'Ownership transferred. Save and send this updated note image to the recipient.'); } }); }} /></span></label><p className="body-copy small-copy">{created.selfDeposit?'This archived original cannot create another handover. Open Deposit note to view or check its saved deposit.':'To send it, ask the recipient for a receiving request from Receive → Deposit note. Save the updated image after the transfer.'} {!created.selfDeposit&&(created.consumption==='connection-required'?'They can receive and save its proof offline. Receiz confirms exclusive consumption and credit when connected.':'Your device can no longer spend the transferred note.')}</p>
    </>}
    {mode === 'deposit' && !deposited && <><h1 className="sheet-hero">Deposit a note.</h1><p className="body-copy">Open the original note image. Its proof determines the receiving account.</p><label className="file-drop"><Upload size={30} /><strong>{<>Choose note image{busy&&<InlineOpening compact label="Preparing your note"/>}</>}</strong><span>Original note PNG or deposit proof</span><input type="file" accept="image/png,.png,application/json,.json" disabled={busy} onChange={event => inspect(event.target.files?.[0])} /></label>
      {inspection && <><div className="detail-list"><div><span>{inspection.rail==='reserve'?'Note value':'Value at creation'}</span><strong>{formatMoney(inspection.amountUsdCents)}</strong></div><div><span>Into</span><strong>Your account</strong></div></div><button className="primary-button" disabled={busy} onClick={() => void depositReviewedNote()}><FileDown size={17} />{busy ? 'Depositing your note…' : 'Deposit note'}</button><p className="body-copy small-copy">Deposit adds the Note’s exact funded value to your account once. Its complete proof stays with the receipt.</p><details className="note-value-details"><summary>Note details</summary><p>{noteTitle(inspection.rail)} · Exact funded units and complete source proof stay intact.</p>{inspection.rail==='settlement'&&<p>{exactPhi(inspection.amountPhiMicro)} Φ · Dollar reference at creation; deposit preserves these exact units.</p>}{inspection.fundingParts&&<div className="detail-list"><div><span>Reserve source</span><strong>{formatMoney(inspection.fundingParts.reserve.amountUsdCents)}</strong></div><div><span>Settlement source</span><strong>{exactPhi(inspection.fundingParts.settlement.amountPhiMicro)} Φ</strong></div></div>}</details></>}
      <button className="secondary-button" disabled={busy} onClick={() => void prepareReceive()}><Download size={17} />Create receiving request</button><p className="body-copy small-copy">Receiving from another person? Send them your ID’s receiving request first. Open the resulting Note here to verify and retain its complete proof.</p>
      {received.length>0&&<div className="retained-deposits"><p className="body-copy small-copy">Saved deposits</p>{received.map(note=><button className="asset-row" key={note.noteId} onClick={()=>setDeposited(note)}><span className="row-copy"><strong>{formatMoney(note.amountUsdCents)}</strong><span>{note.status==='received'?'Received · proof saved on this device':'Deposited · proof confirmed'}</span></span><Download size={18}/></button>)}</div>}
    </>}
    {deposited && <><div className="status-icon success"><Check size={32} /></div><h1 className="sheet-hero">{deposited.status==='received'?'Your note is received.':'Added to your account.'}</h1><div className="success-amount">{formatMoney(deposited.amountUsdCents)}</div>{deposited.rail!=='reserve'&&<p className="body-copy small-copy">Value at creation · exact funded units preserved.</p>}<p className="body-copy">{deposited.status==='received'?'Saved on this device with its complete proof. Its deposit will reconcile when connected, before you spend from your balance.':'Your Note is deposited with its complete verified proof.'}</p><details className="note-value-details"><summary>Note details</summary><p>{noteTitle(deposited.rail)} · {exactPhi(deposited.amountPhiMicro)} Φ{deposited.fundingParts ? ` · Reserve ${formatMoney(deposited.fundingParts.reserve.amountUsdCents)} · Settlement ${exactPhi(deposited.fundingParts.settlement.amountPhiMicro)} Φ` : ''}</p></details><button className="secondary-button" onClick={() => download(deposited.proofBytes, `receiz-note-deposit-${deposited.noteId}.receiz.json`, 'application/json')}>Save deposit proof</button><button className="primary-button" onClick={onBack}>Done</button></>}
    {notice && <p className="body-copy" role="status">{notice}</p>}{error && <><p className="error-message" role="alert">{error}</p>{(registrationCode||failureStage)&&<details className="note-registration-details"><summary>{registrationCode.startsWith('OFFLINE_NOTE_CUSTODY')?'Registration details':'Note details'}</summary>{registrationCode&&<code>{registrationCode}</code>}{failureStage&&<p>Stage: {failureStage.stage} · {failureStage.errorName}</p>}{registrationEvidence&&<><p>Browser response · registration not qualified</p><dl className="detail-list"><div><dt>Attestation format</dt><dd>{registrationEvidence.format}</dd></div><div><dt>Registration counter</dt><dd>{registrationEvidence.counter}</dd></div><div><dt>User verified</dt><dd>{registrationEvidence.userVerified?'Yes':'No'}</dd></div><div><dt>Backup eligible</dt><dd>{registrationEvidence.backupEligible?'Yes':'No'}</dd></div><div><dt>Backed up</dt><dd>{registrationEvidence.backedUp?'Yes':'No'}</dd></div></dl></>}<p>Share these details when requesting support. They contain no credentials or account data.</p></details>}</>}
    {connectionRequired&&<NoteContinuityDetails/>}
    <p className="trust-line"><ShieldCheck size={17} />Proof and custody stay connected.</p>
  </div>;
}
