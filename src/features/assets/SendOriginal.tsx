import {useEffect, useRef, useState} from 'react';
import {Download} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {HeldDeposit} from '../../receiz/deposit-source';
import type {OriginalPieceSummary} from '../../receiz/original-pieces';
import {InlineOpening} from '../../components/InlineOpening';

type Pieces = Awaited<ReturnType<NonNullable<OpenIdentity['originalPieces']>>>;
type Review = Awaited<ReturnType<Pieces['prepare']>>;
type Result = Awaited<ReturnType<Pieces['send']>>;

function rangesFromText(value: string) {
  const ranges = value.split(',').map(range => {
    const pair = /^(\d+)\s*(?:–|-)\s*(\d+)$/.exec(range.trim());
    const first = Number(pair?.[1]), last = Number(pair?.[2]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last < first)
      throw Error('Enter byte ranges like 1–100, 200–249.');
    return {offset: first - 1, byteLength: last - first + 1};
  });
  return ranges;
}

const rangeLabel = (range: {offset: number; byteLength: number}) =>
  `${(range.offset + 1).toLocaleString()}–${(range.offset + range.byteLength).toLocaleString()}`;

function transferError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (message.includes('CONFLICT') || message.includes('OWNER'))
    return 'These bytes have a newer ownership record. Open your current Original before sending.';
  if (message.includes('RANGE')) return 'Choose non-overlapping bytes that you hold.';
  if (message.includes('RECIPIENT') || message.includes('ADDRESS'))
    return 'Use the recipient’s complete Original receiving address.';
  if (message.includes('Enter byte ranges')) return message;
  return 'Connect to finish your transfer. You can reopen a saved request here.';
}

function savePacket(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SendOriginal({identity, source, held, onRefresh}: {
  identity: OpenIdentity;
  source?: HeldDeposit;
  held?: OriginalPieceSummary;
  onRefresh(): void;
}) {
  const [recipient, setRecipient] = useState(''), [rangeText, setRangeText] = useState('');
  const [review, setReview] = useState<Review | null>(null), [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef(true), running = useRef(false);
  const title = held?.filename ?? source?.title ?? 'Original';
  const length = held?.totalBytes ?? source?.bytes.length ?? 0;
  const available = held?.ranges ?? [{offset: 0, byteLength: length}];

  useEffect(() => {
    active.current = true;
    void identity.originalPieces?.().then(async api => {
      const next = await api.pending();
      if (active.current) setPending(!!next);
    }).catch(() => {});
    return () => { active.current = false; };
  }, [identity]);

  async function run(work: (api: Pieces) => Promise<void>) {
    if (running.current || !identity.originalPieces) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await work(await identity.originalPieces());
    } catch (cause) {
      if (active.current) setError(transferError(cause));
      try {
        const next = await (await identity.originalPieces()).pending();
        if (active.current) setPending(!!next);
      } catch { /* Keep the actionable message with the held form. */ }
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }

  function prepare() {
    void run(async api => {
      if (!source && !held) return;
      const original = held ? {heldProofDigest: held.proofDigest} : new File([new Uint8Array(source!.bytes)], source!.filename);
      const ranges = rangeText.trim() ? rangesFromText(rangeText) : available;
      const next = await api.prepare({original, recipient: recipient.trim(), ranges});
      if (active.current) setReview(next);
    });
  }

  function complete(next: Result) {
    if (!active.current) return;
    setResult(next);
    setPending(false);
    onRefresh();
  }

  return <section>
    <h1 className="sheet-hero">{result ? 'Original transfer recorded.' : 'Send an Original.'}</h1>
    {result ? <>
      <p className="body-copy">Save the transfer file and share it privately. The recipient opens it from Add → An asset.</p>
      <button type="button" className="primary-button" onClick={() => savePacket(result.file)}><Download size={18}/>Save transfer file</button>
    </> : pending ? <>
      <p className="body-copy" role="status">A signed Original transfer is saved. Resume it to check the result and open the exact file.</p>
      <button type="button" className="primary-button" disabled={busy} onClick={() => void run(async api => {
        const next = await api.resumePending();
        if (next) complete(next);
        else if (active.current) setPending(false);
      })}>Resume transfer</button>
    </> : review ? <>
      <div className="detail-list">
        <div><span>Original</span><strong>{title}</strong></div>
        <div><span>Recipient</span><strong>{review.recipient}</strong></div>
        <div><span>Bytes to transfer</span><strong>{review.command.ranges.map(rangeLabel).join(', ')}</strong></div>
      </div>
      <button type="button" className="primary-button" disabled={busy}
        onClick={() => void run(async api => complete(await api.send(review, review.confirmationDigest)))}>Confirm transfer</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => setReview(null)}>Edit details</button>
    </> : <>
      <div className="holding-panel"><span>Original</span><strong>{title}</strong><p>{held
        ? `${held.ownedBytes.toLocaleString()} of ${length.toLocaleString()} bytes held · ${held.percentage}`
        : `${length.toLocaleString()} bytes`}</p></div>
      <label className="form-field"><span>Recipient</span><input value={recipient} onChange={event => setRecipient(event.target.value)}
        placeholder="Original receiving address" maxLength={160}/></label>
      <details className="transaction-proof-details">
        <summary>Advanced</summary>
        <label className="form-field"><span>Exact byte ranges</span><input value={rangeText} onChange={event => setRangeText(event.target.value)}
          placeholder="1–100, 200–249" maxLength={4096}/></label>
        <p className="body-copy small-copy">Count from byte 1 and include both ends. Leave blank to send all the bytes you hold.</p>
        {held && <p className="body-copy small-copy">Your ranges {held.ranges.map(rangeLabel).join(', ')}</p>}
      </details>
      <button type="button" className="primary-button" disabled={busy || !recipient.trim()} onClick={prepare}>Review transfer</button>
    </>}
    {busy && <InlineOpening compact label="Checking the Original transfer"/>}
    {error && <p className="error-message" role="status">{error}</p>}
  </section>;
}
