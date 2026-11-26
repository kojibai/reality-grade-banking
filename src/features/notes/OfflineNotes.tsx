import {RecipientInput} from '../account/RecipientInput';
import {InlineOpening} from '../../components/InlineOpening';
import {sameNoteFundingParts} from '../../receiz/note-funding';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Download, FileDown, ShieldCheck, Upload } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankNoteReview, BankNoteRail, BankNoteImage, BankNoteInspection, BankNoteDepositResult, BankNotePending, BankOfflineNotes } from '../../receiz/offline-notes';
import { AmountInput } from '../../components/AmountInput';
import { formatMoney, formatUnits } from '../../core/money';
import { OfflineNotePreview } from './OfflineNotePreview';
import { shareNoteImage } from './save-note-image';
import {noteError,noteRegistrationCode} from './note-error';
import {noteFailureStage} from '../../receiz/note-stage';
import {noteRegistrationEvidence,type NoteRegistrationEvidence} from '../../receiz/note-registration-evidence';
import {ForwardNoteHandoff,ReceivedNoteProofQr} from './ForwardNoteHandoff';
import {NoteContinuityDetails} from './NoteContinuityDetails';
import {OfflineCashOptions} from '../account/OfflineCashOptions';
import {walletBalanceNotice,type WalletBalanceNotice} from '../account/wallet-balance-notice';
import {noteTitle} from '../../receiz/note-design';
import {NOTE_ARTWORK_TYPES, validateNoteArtworkFile} from '../../receiz/note-artwork';
import {captureNoteDepositProof,readNoteProofImport} from '../../receiz/note-proof-portability';
const CurrencyNoteReview=lazy(()=>import('./CurrencyNotes').then(module=>({default:module.CurrencyNoteReview})));
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
export function OfflineNotes({ identity, mode, onBack, onRefresh, backLabel, initialReview=false,onCreated,onUseSendNearby,allowCurrencyNotes=false }: { identity: OpenIdentity; mode: 'create' | 'deposit'; onBack: () => void; onRefresh: () => void; backLabel?:string;initialReview?:boolean;allowCurrencyNotes?:boolean;onCreated?:(note:BankNoteImage)=>Promise<void>;onUseSendNearby?:(amount:string)=>void }) {
  const acceptsCurrencyNotes = mode === 'deposit' && allowCurrencyNotes && !!identity.currencyNotes;
  const [selectedCurrencyNote,setSelectedCurrencyNote] = useState<{identity:OpenIdentity;file:File}>();
  const currencyFile = acceptsCurrencyNotes && selectedCurrencyNote?.identity===identity ? selectedCurrencyNote.file : undefined;
  const [rail, setRail] = useState<BankNoteRail>(()=>identity.knownWallet?.()?.wallet.reserveUsdCents==='0'?'settlement':'reserve');
  const [specificRecipient,setSpecificRecipient]=useState(false),[recipient,setRecipient]=useState(''),[selectedRecipient,setSelectedRecipient]=useState<{userId:string;username:string}|null>(null);
  const [addressedCreationByDefault,setAddressedCreationByDefault]=useState(false);
  const [artwork,setArtwork]=useState<File|null>(null),[artworkUrl,setArtworkUrl]=useState<string>();
  const [funding,setFunding]=useState<BankNoteReview|null>(null);
  const [amount, setAmount] = useState('100'), [review, setReview] = useState(initialReview), [busy, setBusy] = useState(false), [error, setError] = useState(''),[registrationCode,setRegistrationCode]=useState('');
  const [failureStage,setFailureStage]=useState<ReturnType<typeof noteFailureStage>>(null);
  const [connectionRequired,setConnectionRequired]=useState(false);
  const [deviceOptions,setDeviceOptions]=useState<WalletBalanceNotice|null>(null);
  const [inventoryReady,setInventoryReady]=useState(false);
  const [offline,setOffline]=useState(()=>navigator.onLine===false);
  useEffect(()=>{
    const update=()=>setOffline(navigator.onLine===false);
    addEventListener('online',update);
    addEventListener('offline',update);
    return ()=>{removeEventListener('online',update);removeEventListener('offline',update);};
  },[]);
  const [registrationEvidence,setRegistrationEvidence]=useState<NoteRegistrationEvidence|null>(null);
  const [saved, setSaved] = useState<BankNoteImage[]>([]);
  const [received,setReceived]=useState<BankNoteDepositResult[]>([]);
  const [pending, setPending] = useState<BankNotePending | null>(null), [created, setCreated] = useState<BankNoteImage | null>(null), [inspection, setInspection] = useState<BankNoteInspection | null>(null), [deposited, setDeposited] = useState<BankNoteDepositResult | null>(null), [image, setImage] = useState<Uint8Array | null>(null), [imageUrl, setImageUrl] = useState(''), [notice, setNotice] = useState('');
  const alive = useRef(true), running = useRef(false), api = useMemo(() => ({ current: null as BankOfflineNotes | null, pending: undefined as Promise<BankOfflineNotes> | undefined }), [identity]);
  const currentIdentity=useRef(identity);currentIdentity.current=identity;
  const saveDeposit=()=>{if(!deposited)return;const source=deposited,owner=identity;void run(async()=>{
    if(!owner.sealRecordExport)throw Error('PROOF_EXPORT_SEAL_REQUIRED');
    const file=await captureNoteDepositProof(source.proofBytes,`receiz-note-deposit-${source.noteId}.receiz.json`,owner.sealRecordExport);
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(alive.current&&currentIdentity.current===owner)download(bytes,file.name,file.type);
  });};
  const saveReceivedImage=()=>{if(!deposited)return;const note=deposited,owner=identity;void run(async()=>{
    const runtime=await notes();
    if(!runtime.exportReceivedNote)throw Error('BANK_NOTE_SOURCE_REQUIRED');
    const bytes=await runtime.exportReceivedNote(note.noteId);
    if(alive.current&&currentIdentity.current===owner)download(bytes,`note-${note.noteId}.png`,'image/png');
  });};
  const report=(cause:unknown)=>{setError(noteError(cause));setConnectionRequired(mode==='create'&&cause instanceof Error&&cause.message==='BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');setRegistrationCode(noteRegistrationCode(cause));setRegistrationEvidence(noteRegistrationEvidence(cause));setFailureStage(noteFailureStage(cause));};
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const notes = async () => {
    if(api.current)return Promise.resolve(api.current);
    return api.pending ??= identity.offlineNotes!().then(value => api.current = value).catch(cause => { api.pending = undefined; throw cause; });
  };
  const saveCreated=(downloadOnly=false)=>{
    if(!created)return;const note=created;
    void run(async()=>{
      const runtime=await notes(),exported=runtime.exportNote?await runtime.exportNote(note.noteId):null,image=exported?.image??(runtime.exportImage?await runtime.exportImage(note.image,note.noteId):note.image);
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
    let current = true;setInventoryReady(false);setArtwork(null);
    void notes().then(async n => {
      const itemsRead=n.savedNotes?n.savedNotes():Promise.resolve([]);
      const pendingRead=(async()=>{try{return {value:await n.pending()};}catch(error){return {error};}})();
      const items=await itemsRead,result=await pendingRead;if('error' in result)throw result.error;const value=result.value;
      if(!current)return;
      setSaved(items);
      setAddressedCreationByDefault(n.addressedCreationByDefault===true);
      setSpecificRecipient(n.addressedCreationByDefault===true);
      if(value)setFunding({...value,rail:value.rail??'reserve'});
      if(value){setPending(value);setRail(value.rail??'reserve');setAmount(`${BigInt(value.amountUsdCents)/100n}.${(BigInt(value.amountUsdCents)%100n).toString().padStart(2,'0')}`);setReview(true);}
      setInventoryReady(true);
    }).catch(cause=>{if(current)report(cause);});
    return()=>{current=false;};
  }, [identity,mode]);
  useEffect(() => {
    if (!artwork || !specificRecipient) { setArtworkUrl(undefined); return; }
    const url = URL.createObjectURL(artwork);
    setArtworkUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [artwork, specificRecipient]);
  useEffect(() => { if (!created) return; const url = URL.createObjectURL(new Blob([new Uint8Array(created.image)], { type: 'image/png' })); setImageUrl(url); return () => URL.revokeObjectURL(url); }, [created]);
  const run = async (operation: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');setConnectionRequired(false);setDeviceOptions(null);
    try {
      if (!identity.offlineNotes) throw new Error('Offline Notes are unavailable in this build.');
      await operation();
    } catch (cause) {
      if (alive.current && currentIdentity.current===identity) {
        if(mode==='create'&&!pending&&onUseSendNearby&&cause instanceof Error&&cause.message==='BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION'){
          onUseSendNearby(amount);
          return;
        }
        const options=mode==='create'&&addressedCreationByDefault&&!specificRecipient
          ?walletBalanceNotice(cause,'enable'):null;
        if (mode === 'create' && api.current) {
          try {
            const value = await api.current.pending();
            if (alive.current && currentIdentity.current===identity) {
              setPending(value); setReview(Boolean(value));
              if(!value&&options?.support){
                setDeviceOptions(options);
                return;
              }
              if (value) {
                setRail(value.rail ?? 'reserve');setFunding({...value,rail:value.rail??'reserve'});
                setAmount(`${BigInt(value.amountUsdCents) / 100n}.${(BigInt(value.amountUsdCents) % 100n).toString().padStart(2, '0')}`);
              }
            }
          } catch { /* An unreadable outcome never clears retained recovery UI. */ }
        }
        if(alive.current&&currentIdentity.current===identity)report(cause);
      }
    } finally { running.current = false; if (alive.current) setBusy(false); }
  };
  function inspect(file?: File) {
    if (!file || running.current) return;
    setImage(null); setInspection(null); setDeposited(null);
    if (acceptsCurrencyNotes && /\.receizcurrency$/iu.test(file.name)) {
      setError('');
      setSelectedCurrencyNote({identity,file});
      return;
    }
    setSelectedCurrencyNote(undefined);
    void run(async () => {
      if (file.size > 32 * 1024 * 1024) throw new Error('This original exceeds the supported Note proof capacity.');
      const prepared = notes().then(value=>({value}),error=>({error}));
      const bytes = await readNoteProofImport(file), runtime = await prepared;
      if ('error' in runtime) throw runtime.error;
      const result = await runtime.value.inspect(bytes);
      if (alive.current && currentIdentity.current===identity) {
        setImage(bytes);
        setInspection(result);
      }
    });
  }
  const downloadNativeRequest = () => run(async () => {
    const runtime = await notes();
    if (!runtime.nativeReceivingRequest) return;
    const request = await runtime.nativeReceivingRequest();
    if (alive.current) download(request, 'bankeiz-note-receiving-request.json', 'application/json');
  });
  const sendNativeNote = (file?: File) => {
    if (!file || !created?.nativeHandoff) return;
    const held = created;
    void run(async () => {
      if (file.size > 64 * 1024) throw Error('BANK_NOTE_RECEIVING_REQUEST_INVALID');
      const result = await (await notes()).transfer(held.noteId, new Uint8Array(await file.arrayBuffer()));
      if (alive.current) setCreated({ ...held, image: result.image, transferred: true });
    });
  };
  const depositHeldNativeNote = () => {
    if (!created?.nativeHandoff) return;
    const held = created;
    void run(async () => {
      if (navigator.onLine === false) {
        if (alive.current) setNotice('Connect to add this Note to your account. You can still send it offline.');
        return;
      }
      const deposit = await (await notes()).deposit(held.image);
      if (deposit.noteId !== held.noteId || deposit.amountUsdCents !== held.amountUsdCents || deposit.amountPhiMicro !== held.amountPhiMicro)
        throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
      if (alive.current) { setCreated(null); setDeposited(deposit); onRefresh(); }
    });
  };
  const depositReviewedNote = () => run(async () => {
    if (!image || !inspection) throw Error('BANK_NOTE_REVIEW_REQUIRED');
    const runtime = await notes();
    if (inspection.nativeHandoff && runtime.acceptNativeNote) {
      const held = await runtime.acceptNativeNote(image);
      if (alive.current) {
        setCreated({ ...held, nativeHandoff: true });
        setImage(null);
        setInspection(null);
      }
      return;
    }
    const result = await runtime.deposit(image);
    if (result.noteId !== inspection.noteId || (result.rail ?? 'reserve') !== (inspection.rail ?? 'reserve') || result.amountUsdCents !== inspection.amountUsdCents || result.amountPhiMicro !== inspection.amountPhiMicro || !sameNoteFundingParts(result.fundingParts,inspection.fundingParts)) throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
    if (alive.current) { setDeposited(result); onRefresh(); }
  });
  const recipientUid=async()=>{
    if(!specificRecipient)return undefined;
    const handle=recipient.trim().replace(/^@/,'').toLowerCase();
    if(!/^[a-z0-9_]{3,24}$/.test(handle))throw Error('BANK_NOTE_RECIPIENT_REQUIRED');
    if(selectedRecipient?.username.toLowerCase()===handle)return selectedRecipient.userId;
    const held=identity.knownMessagingDisplay?.()?.inbox.flatMap(row=>row.members)??[];
    let matches=held.filter(person=>person.kind==='user'&&person.username?.toLowerCase()===handle);
    if(!matches.length){if(!identity.messaging)throw Error('BANK_NOTE_RECIPIENT_UNAVAILABLE');matches=await(await identity.messaging()).search(handle);}
    const ids=[...new Set(matches.filter(person=>person.kind==='user'&&person.username?.toLowerCase()===handle&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(person.userId)).map(person=>person.userId))];
    if(ids.length!==1)throw Error('BANK_NOTE_RECIPIENT_UNAVAILABLE');
    return ids[0];
  };
  const reviewNote=()=>void run(async()=>{
    const value=cents(amount),runtime=api.current??await notes();
    if(specificRecipient&&runtime.addressedCreationByDefault&&!pending&&navigator.onLine===false)throw Error('BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');
    const target=specificRecipient?await recipientUid():undefined;
    const result=runtime.review?await(target?runtime.review(value,target):runtime.review(value)):{rail,amountUsdCents:value,...(target?{recipientUserId:target}:{})};
    if(result.amountUsdCents!==value||result.recipientUserId!==target)throw Error('BANK_NOTE_EXACT_RESUME_REQUIRED');
    if(alive.current){setFunding(result);setRail(result.rail);setReview(true);}
  });
  // A saved protected Note was admitted by the existing local inventory reader.
  // Creating a new open Note still requires that operation's native custody checks.
  const canChooseOpenNote=!addressedCreationByDefault||saved.some(note=>note.consumption!=='connection-required');
  const sendFromBalance=addressedCreationByDefault&&!pending&&!canChooseOpenNote&&offline&&!!onUseSendNearby;
  const addressedRecipient=<fieldset className="native-operation-fields" disabled={busy}>
    <RecipientInput identity={identity} value={recipient}
      onChange={value=>{if(running.current)return;setRecipient(value);setSelectedRecipient(null);}}
      onSelect={person=>{if(running.current)return;setRecipient('@'+person.username);setSelectedRecipient(person);}}/>
    <p className="body-copy small-copy">Only this person can accept the Note’s first handoff.</p>
  </fieldset>;
  return <div className="offline-notes-flow"><button className="back-link" disabled={busy} onClick={onBack}><ArrowLeft size={16} />{backLabel??(mode === 'create' ? 'All send options' : 'All receive options')}</button>
    {mode === 'create' && !created && <><h1 className="sheet-hero">{pending ? 'Resume your note.' : review ? 'Your value. In your hands.' : 'Create a note.'}</h1><p className="body-copy">Your value, in your hands. Ready to move—even offline.</p>
      {!review && <AmountInput label="Note amount" value={amount} onChange={value=>{if(!running.current)setAmount(value);}} disabled={busy} dollars />}
      {!review && inventoryReady && !sendFromBalance && (canChooseOpenNote
        ? <details className="note-value-details note-recipient-choice" open={addressedCreationByDefault||undefined}>
          <summary>Who can deposit? · {specificRecipient?'Specific person':addressedCreationByDefault?'Open Note':'Anyone with the Note'}</summary>
          <label><input type="radio" name="note-recipient" checked={!specificRecipient} disabled={busy} onChange={()=>{setSpecificRecipient(false);setArtwork(null);setFunding(null);}}/>{addressedCreationByDefault?'Open Note':'Anyone with the Note'}</label>
          <label><input type="radio" name="note-recipient" checked={specificRecipient} disabled={busy} onChange={()=>{setSpecificRecipient(true);setFunding(null);setDeviceOptions(null);}}/>{addressedCreationByDefault?'Specific person':'Only a specific person'}</label>
          {specificRecipient?addressedRecipient:<p>{addressedCreationByDefault?'Choose the recipient when you hand off the Note.':'Keep the original PNG safe. Anyone holding it can deposit its value once.'}</p>}
        </details>
        : addressedRecipient)}
      {!review && !sendFromBalance && addressedCreationByDefault && specificRecipient && <div className="note-value-details">
        <label className="form-field"><span>Note artwork (optional)</span><input type="file" accept={NOTE_ARTWORK_TYPES} disabled={busy} onChange={event=>{
          const file=event.currentTarget.files?.[0];
          if(!file||running.current)return;
          try {validateNoteArtworkFile(file);setArtwork(file);setError('');}
          catch(cause){setArtwork(null);report(cause);}
        }}/></label>
        {artwork && <button className="text-button" disabled={busy} onClick={()=>setArtwork(null)}>Remove artwork</button>}
      </div>}
      {sendFromBalance
        ? <><p className="body-copy small-copy">Send from your balance while you’re offline. You can create a new funded Note when you reconnect.</p>
          <button className="primary-button" disabled={busy||!inventoryReady} onClick={()=>onUseSendNearby?.(amount)}>Send nearby</button></>
        : <>
          {!pending?.hasCustomArtwork && <OfflineNotePreview artwork={artworkUrl} amount={review&&funding?`${BigInt(funding.amountUsdCents)/100n}.${(BigInt(funding.amountUsdCents)%100n).toString().padStart(2,'0')}`:amount} rail={rail} />}
          {review && (pending?.hasCustomArtwork || artwork) && <p className="body-copy small-copy">{pending?.hasCustomArtwork?'Your artwork is saved with this Note.':artwork?.name}</p>}
          {review && <div className="detail-list"><div><span>{rail==='reserve'?'Note value':'Value at creation'}</span><strong>{formatMoney(pending?.amountUsdCents ?? funding?.amountUsdCents ?? cents(amount))}</strong></div><div><span>{(pending?.recipientUserId??funding?.recipientUserId)?'First recipient':'Who can deposit'}</span><strong>{(pending?.recipientUserId??funding?.recipientUserId)?selectedRecipient&&selectedRecipient.userId===(pending?.recipientUserId??funding?.recipientUserId)?'@'+selectedRecipient.username:'Chosen account':addressedCreationByDefault?'Recipient chosen at handoff':'Anyone with the Note'}</strong></div></div>}
          <p className="body-copy small-copy">This amount moves from your account into the Note when creation completes.{review&&rail!=='reserve'?' Its exact funded units stay intact; their dollar reference can change.':''}</p>
          <details className="note-value-details"><summary>Note details</summary>{funding?.fundingParts&&<div className="detail-list"><div><span>Reserve source</span><strong>{formatMoney(funding.fundingParts.reserve.amountUsdCents)}</strong></div><div><span>Settlement source</span><strong>{formatMoney(funding.fundingParts.settlement.amountUsdCents)}</strong></div></div>}<p>{rail==='composite'?'One Settlement Note carries the full amount. Its two funding sources retain their exact units and complete proof underneath; you do not have to choose between them.':rail==='settlement'?'This Settlement Note holds exact Phi. Deposit returns the same Phi; its dollar value follows the deterministic rate.':'This Settlement Note holds its funded dollar denomination. Deposit returns that amount to your account.'}</p><p>Your identity signing key stays on this device. Keep the original PNG and this device until the Note is deposited or transferred.</p></details>
          <button className="primary-button" disabled={busy || !inventoryReady} onClick={() => { if (!review) {if(!specificRecipient&&!api.current?.review){try{cents(amount);setReview(true);setError('');}catch(cause){report(cause);}}else reviewNote();return;} void run(async () => { const runtime=await notes(),owner=identity,amountValue=pending?.amountUsdCents??funding?.amountUsdCents??cents(amount),target=pending?.recipientUserId??funding?.recipientUserId;const value=target?await (artwork&&!pending?runtime.create(amountValue,undefined,target,artwork):runtime.create(amountValue,undefined,target)):await (addressedCreationByDefault&&!pending&&funding?runtime.create(amountValue,funding.rail):runtime.create(amountValue)); if (alive.current&&currentIdentity.current===owner) { setCreated(value); setPending(null); onRefresh(); if(currentIdentity.current===owner)await onCreated?.(value); } }); }}><ArrowUpRight size={17} />{busy ? 'Preparing your note…' : review ? pending ? 'Resume this note' : 'Create funded note' : 'Review note'}</button>
        </>}
      {!review && saved.length > 0 && <div className="retained-deposits"><p className="body-copy small-copy">Saved notes</p>{saved.map(note => <button key={note.noteId} className="asset-row" onClick={() => setCreated(note)}><span className="row-copy"><strong>{formatMoney(note.amountUsdCents)}</strong><span>{note.selfDeposit ? note.selfDeposit==='confirmed'?'Deposited · original kept':'Deposit pending · original kept' : note.handoffRecovery ? 'Passed on · recover handoff' : note.transferred ? 'Transferred · save the updated image' : note.transferPending ? 'Transfer pending · resume' : 'Open your original note'}</span></span><Download size={18} /></button>)}</div>}
      {pending?.canCancel && <button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await (await notes()).cancelUnfunded(); if (alive.current) { setPending(null); setReview(false);setArtwork(null);setFunding(null); } })}>Discard unissued note</button>}
      {review && !pending && <button className="secondary-button" disabled={busy} onClick={() => {setReview(false);setFunding(null);}}>Edit amount</button>}
    </>}
    {created && <><div className="status-icon success"><Check size={32} /></div><h1 className="sheet-hero">{created.selfDeposit ? created.selfDeposit==='confirmed'?'Your note is deposited.':'Your deposit is pending.' : created.transferred ? created.consumption==='connection-required'?'Your note is addressed.':'Your note is transferred.' : created.transferPending ? 'Resume your transfer.' : 'Your note is ready.'}</h1><p className="body-copy">{created.selfDeposit ? created.selfDeposit==='confirmed'?'Its value has been returned to your account. Keep this original for your records.':'This original image is kept for your records. Your retained deposit will confirm when connected.' : created.transferred ? created.consumption==='connection-required'?'Save this updated image and send it to the recipient. Its one-time deposit is confirmed when they connect.':'Save this updated image and send it to the recipient.' : created.rail==='reserve'?`${formatMoney(created.amountUsdCents)} is held in your Note.`:`Your Note holds its exact funded value. ${formatMoney(created.amountUsdCents)} records its value at creation.`}</p>{imageUrl && <img className="issued-note-image" src={imageUrl} alt={`Your funded ${formatMoney(created.amountUsdCents)} ${noteTitle(created.rail)}`} />}<button className="primary-button" disabled={busy} onClick={() => saveCreated()}><Download size={17} />{created.selfDeposit?'Save original image':'Save note image'}</button>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <><button className="secondary-button" disabled={busy} onClick={() => saveCreated(true)}>Download original PNG</button><p className="body-copy small-copy">{created.selfDeposit?'This image preserves your original Note. It cannot be deposited again.':'Keep the original PNG for deposit. Photo apps can remove its carried proof when they convert the image.'}</p></>}
      {created.accountUpdateWarning && <p className="body-copy small-copy" role="status">{created.accountUpdateWarning}</p>}
      {created.selfDeposit==='pending'&&<button className="secondary-button" disabled={busy} onClick={()=>void run(async()=>{const result=await(await notes()).recoverDeposit?.(created.image);if(result&&alive.current){setCreated(null);setDeposited(result);onRefresh();}})}>Check saved deposit</button>}
      {created.transferPending && <button className="primary-button" disabled={busy} onClick={() => void run(async () => { const result = await (await notes()).transfer(created.noteId); if (alive.current) { setCreated({ ...created, image: result.image, transferred: true, transferPending: false }); setNotice(created.consumption==='connection-required'?'Handover saved. Send this updated image to the recipient.':'Ownership transferred. Save and send this updated note image to the recipient.'); } })}>{busy ? 'Resuming transfer…' : 'Resume transfer'}</button>}
      {created.nativeHandoff && !created.transferred && !created.transferPending &&
        <label className="file-drop"><ArrowUpRight size={24} /><strong>Send this Note</strong><span>Choose the recipient’s receiving request</span><input type="file" accept="application/json,.json" disabled={busy} onChange={event => sendNativeNote(event.target.files?.[0])} /></label>}
      {created.nativeHandoff && !created.transferred && !created.transferPending &&
        <button className="secondary-button" disabled={busy} onClick={depositHeldNativeNote}><FileDown size={17} />Deposit to account</button>}
      {created.forwardable&&!created.selfDeposit&&<ForwardNoteHandoff key={created.noteId} identity={identity} note={created}
        onForwarded={()=>{void notes().then(runtime=>runtime.savedNotes()).then(items=>{const held=items.find(note=>note.noteId===created.noteId);if(held&&alive.current)setCreated(held);});onRefresh();}}/>}
      {!created.selfDeposit&&!created.transferred&&!created.transferPending&&created.consumption==='connection-required'&&<p className="body-copy small-copy">Save and send the original PNG. {created.recipientUserId?'The chosen account receives it first.':'Anyone holding it can deposit its value once.'} Its complete proof travels with it.</p>}

    </>}
    {mode === 'deposit' && !deposited && !created && <><h1 className="sheet-hero">Deposit a note.</h1><p className="body-copy">{acceptsCurrencyNotes ? 'Open the original Note image or currency note file to review it.' : api.current?.nativeReceivingRequest ? 'Open the original Note image to review it.' : 'Open the original Note image to add it to your account.'}</p>{api.current?.nativeReceivingRequest&&<button className="secondary-button" disabled={busy} onClick={() => void downloadNativeRequest()}><Download size={17} />Get a Note receiving request</button>}<label className="file-drop"><Upload size={30} /><strong>{<>{acceptsCurrencyNotes?'Choose note file':'Choose note image'}{busy&&<InlineOpening compact label="Preparing your note"/>}</>}</strong><span>{acceptsCurrencyNotes?'Note image, deposit proof or currency note file':'Original note PNG or deposit proof'}</span><input type="file" accept={'image/png,.png,application/json,.json'+(acceptsCurrencyNotes?',.receizcurrency':'')} disabled={busy} onChange={event => inspect(event.target.files?.[0])} /></label>
      {currencyFile&&<Suspense fallback={<InlineOpening label="Opening currency note"/>}><CurrencyNoteReview identity={identity} file={currencyFile} onRefresh={onRefresh}/></Suspense>}
      {inspection && <><div className="detail-list"><div><span>{inspection.rail==='reserve'?'Note value':'Value at creation'}</span><strong>{formatMoney(inspection.amountUsdCents)}</strong></div><div><span>Into</span><strong>{inspection.nativeHandoff ? 'Your saved Notes' : 'Your account'}</strong></div></div><button className="primary-button" disabled={busy} onClick={() => void depositReviewedNote()}><FileDown size={17} />{inspection.nativeHandoff ? 'Accept Note' : busy ? 'Depositing your note…' : 'Deposit note'}</button><p className="body-copy small-copy">{inspection.nativeHandoff ? 'Your Note is ready to pass on offline once you accept it.' : 'Deposit adds the Note’s exact funded value to your account once. Its complete proof stays with the receipt.'}</p><details className="note-value-details"><summary>Note details</summary><p>{noteTitle(inspection.rail)} · Exact funded units and complete source proof stay intact.</p>{inspection.rail==='settlement'&&<p>{exactPhi(inspection.amountPhiMicro)} Φ · Dollar reference at creation; deposit preserves these exact units.</p>}{inspection.fundingParts&&<div className="detail-list"><div><span>Reserve source</span><strong>{formatMoney(inspection.fundingParts.reserve.amountUsdCents)}</strong></div><div><span>Settlement source</span><strong>{exactPhi(inspection.fundingParts.settlement.amountPhiMicro)} Φ</strong></div></div>}</details></>}

      {received.length>0&&<div className="retained-deposits"><p className="body-copy small-copy">Saved deposits</p>{received.map(note=><button className="asset-row" key={note.noteId} onClick={()=>setDeposited(note)}><span className="row-copy"><strong>{formatMoney(note.amountUsdCents)}</strong><span>{note.status==='received'?'Received · proof saved on this device':note.status==='forwarded'?'Passed on · QR saved':'Deposited · proof confirmed'}</span></span><Download size={18}/></button>)}</div>}
    </>}
    {deposited && <><div className="status-icon success"><Check size={32} /></div><h1 className="sheet-hero">{deposited.status==='received'?'Your note is received.':deposited.status==='forwarded'?'Note ready to hand off.':'Added to your account.'}</h1><div className="success-amount">{formatMoney(deposited.amountUsdCents)}</div>{deposited.rail!=='reserve'&&<p className="body-copy small-copy">Value at creation · exact funded units preserved.</p>}<p className="body-copy">{deposited.status==='received'?deposited.depositError?'Your original proof is saved. This deposit needs your attention; checking uses the same saved claim.':deposited.handoffRecovery?'This Note was passed on. Recover the saved handoff.':deposited.forwardable?'Send this Note offline, or connect to add it to your balance.':'Saved on this device with its complete proof. Its deposit will reconcile when connected, before you spend from your balance.':deposited.status==='forwarded'?'The exact outgoing Note is saved on this device.':'Your Note is deposited with its complete verified proof.'}</p>{(deposited.status==='received'&&(deposited.forwardable||deposited.handoffRecovery)||deposited.status==='forwarded')&&<ForwardNoteHandoff key={deposited.noteId} identity={identity} note={deposited} onForwarded={value=>{setDeposited(value);onRefresh();}}/>}<details className="note-value-details"><summary>Note details</summary>{(deposited.status==='received'||deposited.status==='forwarded')&&identity.offlineNotes&&<ReceivedNoteProofQr identity={identity} noteId={deposited.noteId}/>}<p>{noteTitle(deposited.rail)} · {exactPhi(deposited.amountPhiMicro)} Φ{deposited.fundingParts ? ` · Reserve ${formatMoney(deposited.fundingParts.reserve.amountUsdCents)} · Settlement ${exactPhi(deposited.fundingParts.settlement.amountPhiMicro)} Φ` : ''}</p></details>{deposited.status==='received'&&deposited.depositError&&<button className="secondary-button" disabled={busy} onClick={()=>void run(async()=>{const rows=await(await notes()).reconcileReceivedNotes?.(true);if(alive.current&&rows){setReceived(rows);setDeposited(rows.find(row=>row.noteId===deposited.noteId)??deposited);onRefresh();}})}>Check saved deposit</button>}<button className="secondary-button" disabled={busy} onClick={saveDeposit}>Save deposit proof</button>{deposited.hasOriginalImage&&<button className="secondary-button" disabled={busy} onClick={saveReceivedImage}>Save original Note image</button>}<button className="primary-button" onClick={onBack}>Done</button></>}
    {notice && <p className="body-copy" role="status">{notice}</p>}{error && <><p className="error-message" role="alert">{error}</p>{(registrationCode||failureStage)&&<details className="note-registration-details"><summary>{registrationCode.startsWith('OFFLINE_NOTE_CUSTODY')?'Registration details':'Note details'}</summary>{registrationCode&&<code>{registrationCode}</code>}{failureStage&&<p>Stage: {failureStage.stage} · {failureStage.errorName}</p>}{registrationEvidence&&<><p>Browser response · registration not qualified</p><dl className="detail-list"><div><dt>Attestation format</dt><dd>{registrationEvidence.format}</dd></div><div><dt>Registration counter</dt><dd>{registrationEvidence.counter}</dd></div><div><dt>User verified</dt><dd>{registrationEvidence.userVerified?'Yes':'No'}</dd></div><div><dt>Backup eligible</dt><dd>{registrationEvidence.backupEligible?'Yes':'No'}</dd></div><div><dt>Backed up</dt><dd>{registrationEvidence.backedUp?'Yes':'No'}</dd></div></dl></>}<p>Share these details when requesting support. They contain no credentials or account data.</p></details>}</>}
    {deviceOptions&&<OfflineCashOptions notice={deviceOptions} canSendNearby={!!onUseSendNearby} onSendNearby={onUseSendNearby?()=>onUseSendNearby(amount):undefined}/>}
    {connectionRequired&&<NoteContinuityDetails/>}
    <p className="trust-line"><ShieldCheck size={17} />Proof and custody stay connected.</p>
  </div>;
}
