import { useEffect, useState } from 'react';
import { AmountInput } from '../../components/AmountInput';
import { formatUnits } from '../../core/money';
import type { HeldDeposit } from '../../receiz/deposit-source';
import type { OpenIdentity } from '../../receiz/native-identity';
import { openCurrencyNoteFile, type CurrencyNotes as CurrencyNoteController } from '../../receiz/currency-notes';
import { NativeOperation } from '../account/NativeOperation';

type Saved = Awaited<ReturnType<CurrencyNoteController['files']>>;
function save(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function SavedNotes({files}: {files: Saved}) {
  if (!files.length) return null;
  return <details className="transaction-proof-details">
    <summary>My issued notes</summary>
    <ul>{files.map(({file, quantityMicro, claimCommitment, recipient}) =>
      <li key={claimCommitment}>
        <button className="secondary-button" type="button" onClick={() => save(file)}>
          Save note · {formatUnits(quantityMicro)} units
        </button>
        <p>{recipient ? `Payable to ${recipient}` : 'Anyone with this file can claim it. Share it privately.'}</p>
      </li>)}</ul>
  </details>;
}

export function IssueCurrencyNote({ identity, asset, onRefresh }: {
  identity: OpenIdentity; asset: HeldDeposit; onRefresh(): void;
}) {
  const [amount, setAmount] = useState('1');
  const [recipient, setRecipient] = useState('');
  const [file, setFile] = useState<File|null>(null);
  const [revision, setRevision] = useState(0);
  const [issued, setIssued] = useState<Saved>([]);
  const holding = asset.nativeAsset;
  if (!identity.currencyNotes || !holding?.currency || !asset.executionDigest) return null;
  return <>
    <NativeOperation identity={identity} title="Currency note" confirmLabel="Issue note" onRefresh={onRefresh}
      inputKey={JSON.stringify([asset.executionDigest,amount,recipient,revision])}
      input={async () => {
        const trimmed = amount.trim();
        if (!/^\d{1,16}$/u.test(trimmed) || BigInt(trimmed) < 1n) throw Error('Enter a positive whole number of units.');
        const quantity = BigInt(trimmed) * 1_000_000n;
        if (quantity > BigInt(holding.quantityMicro)) throw Error('Choose an amount within your available units.');
        const address = recipient.trim();
        if (address && !/^[A-Za-z0-9_.@-]{1,160}$/u.test(address)) throw Error('Enter a Receiz ID or public username.');
        const {claimCommitment, artworkSha256} = await (await identity.currencyNotes!()).prepareClaim(file);
        return {kind:'issue-currency-note', assetDigest:asset.executionDigest!, quantityMicro:quantity.toString(),
          recipient:address || null, claimCommitment, artworkSha256};
      }}
      onResult={async result => {
        if (result.status !== 'committed' || !('nativeAssetSource' in result)) return;
        setIssued(await (await identity.currencyNotes!()).files(holding.assetId,result.nativeAssetSource));
      }}>
      <p className="body-copy">Reserve units you own in a note you can share as a file.</p>
      <AmountInput label="Whole units to reserve" value={amount} onChange={setAmount} suffix={holding.symbol}/>
      <label className="form-field">Recipient (optional)
        <input value={recipient} onChange={event=>setRecipient(event.target.value)} placeholder="Receiz ID or public username"/>
      </label>
      <label className="form-field">Custom artwork (optional)
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{
          setFile(event.target.files?.[0]??null);setRevision(value=>value+1);
        }}/>
      </label>
      <p className="body-copy small-copy">{recipient.trim()
        ? 'The named recipient can redeem the note for these units.'
        : 'Anyone with the file can claim these units. Share it privately.'}</p>
    </NativeOperation>
    {issued[0]&&<button className="primary-button" type="button" onClick={()=>save(issued[0].file)}>Save currency note</button>}
    <SavedNotes files={issued}/>
  </>;
}

export function RedeemCurrencyNote({ identity, initialFile, onRefresh }: {
  identity: OpenIdentity; initialFile?: File; onRefresh(): void;
}) {
  const [note, setNote] = useState<Awaited<ReturnType<typeof openCurrencyNoteFile>> | null>(null);
  const [files, setFiles] = useState<Saved>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (initialFile) {
      setBusy(true);
      void openCurrencyNoteFile(initialFile).then(result=>{if(active)setNote(result);},()=>{
        if(active)setError('This file does not contain a verified currency note.');
      }).finally(()=>{if(active)setBusy(false);});
    }
    void identity.currencyNotes?.().then(controller=>controller.files()).then(result=>{
      if(active)setFiles(result);
    }).catch(()=>{});
    return () => {active=false;};
  }, [identity, initialFile]);
  async function open(file?: File) {
    if (!file || busy) return;
    setBusy(true);setNote(null);setError('');
    try {setNote(await openCurrencyNoteFile(file));}
    catch {setError('This file does not contain a verified currency note.');}
    finally {setBusy(false);}
  }
  return <>
    <h1 className="sheet-hero">Redeem a currency note.</h1>
    <label className="form-field">Choose a currency note<input type="file" accept=".receizcurrency,application/json" disabled={busy}
      onChange={event=>{void open(event.target.files?.[0]);event.target.value='';}}/></label>
    {busy&&<p role="status">Checking the signed note…</p>}
    {error&&<p className="error-message" role="alert">{error}</p>}
    {note&&<NativeOperation identity={identity} title="Currency note redemption" confirmLabel="Redeem note"
      inputKey={note.claimCommitment} onRefresh={onRefresh}
      input={()=>({kind:'redeem-currency-note',assetId:note.assetId,quantityMicro:note.quantityMicro,claimSecret:note.claimSecret})}>
      {note.artwork&&<img className="currency-note-artwork" alt="Custom currency note artwork"
        src={`data:${note.artwork.mimeType};base64,${note.artwork.bytesB64u.replace(/-/gu,'+').replace(/_/gu,'/')}`} width={240}/>}
      <dl className="detail-list">
        <div><dt>Reserved units</dt><dd>{formatUnits(note.quantityMicro)}</dd></div>
        <div><dt>Issued by</dt><dd>{note.issuedBy}</dd></div>
        <div><dt>Payable to</dt><dd>{note.recipient??'Holder of the note'}</dd></div>
      </dl>
      <p className="body-copy">Connect to claim the reserved units in your account.</p>
    </NativeOperation>}
    <SavedNotes files={files}/>
  </>;
}
