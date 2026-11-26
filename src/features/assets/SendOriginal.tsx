import {useEffect, useRef, useState} from 'react';
import {Download} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {HeldDeposit} from '../../receiz/deposit-source';
import type {OriginalPieceSummary} from '../../receiz/original-pieces';
import {InlineOpening} from '../../components/InlineOpening';
import {AmountInput} from '../../components/AmountInput';
import type {PublicMarketItem} from '../../receiz/public-market';
import {retainedAssetPublicationSource} from '../../receiz/asset-publication-adoption';
import {PublicOriginalPurchaseRequired, resolvePublicOriginalUrl, selectedPublicOriginalUrl, verifyPublicOriginalBytes} from '../../receiz/public-original';
import {readPublicLedgerBytes} from '../../receiz/public-ledger-transfer';
import {safeImportedSourceUrl} from '../../receiz/imported-source-url';

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

function selectPercentage(value: string, totalBytes: number, available: readonly {offset: number; byteLength: number}[]) {
  if (!value.trim()) return available;
  const [whole, fraction = ''] = value.trim().split('.');
  if (!/^\d{1,3}(?:\.\d{1,8})?$/u.test(value.trim())) throw Error('Enter a percentage with up to 8 decimal places.');
  const precision = 100_000_000n;
  const percent = BigInt(whole) * precision + BigInt(fraction.padEnd(8, '0'));
  if (percent === 0n || percent > precision * 100n) throw Error('Enter a percentage greater than zero and at most 100%.');
  let remaining = Number(BigInt(totalBytes) * percent / (precision * 100n));
  if (!remaining) throw Error('Choose a percentage that includes at least one byte.');
  const ranges = [...available].sort((a,b) => a.offset-b.offset).flatMap(range => {
    if (!remaining) return [];
    const byteLength = Math.min(range.byteLength, remaining);
    remaining -= byteLength;
    return [{offset:range.offset, byteLength}];
  });
  if (remaining) throw Error('Choose a percentage within the bytes you hold.');
  return ranges;
}

async function openShowcaseOriginal(item: PublicMarketItem, signal: AbortSignal) {
  const digest = item.originalDigest!.toLowerCase();
  const retained = retainedAssetPublicationSource(digest);
  if (retained) return retained;
  if (!item.originalUrl) throw Error('The exact Original is unavailable from your Showcase.');
  const selectedUrl = selectedPublicOriginalUrl(item.originalUrl, digest);
  const coordinate = safeImportedSourceUrl(selectedUrl, 'artifact');
  if (coordinate && typeof indexedDB !== 'undefined') {
    const reference = JSON.parse(new URL(coordinate).searchParams.get('reference')!);
    if (reference.artifactSha256 !== digest) throw Error('This source does not match the selected Original.');
    const {loadAssetPublicationRuntime} = await import('../../receiz/asset-publication-runtime');
    const runtime = await loadAssetPublicationRuntime();
    const held = (await runtime.readHeldImportedProfileOriginalMaterial(reference, coordinate))?.source;
    signal.throwIfAborted();
    if (held) return new File([held.exactArtifact], held.descriptor.filename, {type:held.exactArtifact.type});
  }
  const url = new URL(await resolvePublicOriginalUrl(selectedUrl, digest, signal));
  const direct = /^\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/u.test(url.pathname) && !url.search;
  const response = await fetch(direct ? url.href : '/api/bank/public-market/original?path=' + encodeURIComponent(url.pathname + url.search), {
    credentials:'omit', redirect:'error', signal,
  });
  if (response.status === 402) throw new PublicOriginalPurchaseRequired();
  if (!response.ok) throw Error('The exact Original could not be opened. Check your connection and try again.');
  const bytes = await readPublicLedgerBytes(response, 16 * 1024 * 1024);
  signal.throwIfAborted();
  await verifyPublicOriginalBytes(bytes, digest);
  return new File([new Uint8Array(bytes)], 'original.receizbundle', {type:'application/vnd.receiz.bundle+json'});
}

function transferError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : '';
  if (cause instanceof PublicOriginalPurchaseRequired) return 'Open your Original from your Receiz Showcase to continue.';
  if (message.startsWith('The exact Original') || message.startsWith('This source does not match')) return message;
  if (message.includes('CONFLICT') || message.includes('OWNER'))
    return 'These bytes have a newer ownership record. Open your current Original before sending.';
  if (message.includes('RANGE')) return 'Choose non-overlapping bytes that you hold.';
  if (message.includes('RECIPIENT') || message.includes('ADDRESS'))
    return 'Use the recipient’s complete Original receiving address.';
  if (/^(Enter|Choose) a |^Enter byte ranges/u.test(message)) return message;
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

export function SendOriginal({identity, source, held, showcase, onRefresh}: {
  identity: OpenIdentity;
  source?: HeldDeposit;
  held?: OriginalPieceSummary;
  showcase?: PublicMarketItem;
  onRefresh(): void;
}) {
  const [recipient, setRecipient] = useState(''), [rangeText, setRangeText] = useState('');
  const [percentage, setPercentage] = useState('');
  const opened = useRef<{file:File;digest:string} | null>(null);
  const opening = useRef<AbortController | null>(null);
  const [review, setReview] = useState<Review | null>(null), [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const active = useRef(true), running = useRef(false);
  const title = source?.title ?? showcase?.title ?? held?.filename ?? 'Original';
  const length = held?.totalBytes ?? source?.bytes.length ?? opened.current?.file.size ?? 0;

  useEffect(() => {
    active.current = true;
    void identity.originalPieces?.().then(async api => {
      const next = await api.pending();
      if (active.current) setPending(!!next);
    }).catch(() => {});
    return () => { active.current = false; opening.current?.abort(); };
  }, [identity]);

  async function readShowcaseFile(item: PublicMarketItem) {
    const digest = item.originalDigest!.toLowerCase();
    if (opened.current?.digest === digest) return opened.current.file;
    const controller = new AbortController();
    opening.current = controller;
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(90_000)]);
      const file = await openShowcaseOriginal(item, signal);
      signal.throwIfAborted();
      // Keep the exact Original available if a signed transfer resumes after reload.
      const retained = await identity.holdProof(file);
      signal.throwIfAborted();
      if (retained.digest !== digest) throw Error('This source does not match the selected Original.');
      opened.current = {file,digest};
      return file;
    } finally {
      if (opening.current === controller) opening.current = null;
    }
  }

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
      if (!source && !held && !showcase) return;
      const original = held ? {heldProofDigest:held.proofDigest}
        : source ? new File([new Uint8Array(source.bytes)], source.filename) : await readShowcaseFile(showcase!);
      const bytes = original instanceof File ? original.size : held!.totalBytes;
      const available = held?.ranges ?? [{offset:0,byteLength:bytes}];
      const ranges = rangeText.trim() ? rangesFromText(rangeText) : selectPercentage(percentage, bytes, available);
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
        onClick={() => void run(async api => complete(await api.send(review, review.confirmationDigest)))}>Send Original</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => setReview(null)}>Edit details</button>
    </> : <>
      <div className="holding-panel"><span>Original</span><strong>{title}</strong><p>{held
        ? `${held.ownedBytes.toLocaleString()} of ${length.toLocaleString()} bytes held · ${held.percentage}`
        : length ? `${length.toLocaleString()} bytes` : 'From your Showcase'}</p></div>
      <div className="ownership-send-amount">
        <AmountInput label="Percentage of Original" value={percentage} onChange={value => {setPercentage(value);setRangeText('');}} suffix="%"/>
        <button type="button" className="secondary-button" onClick={() => {setPercentage('');setRangeText('');}}>All held</button>
      </div>
      {!percentage && !rangeText && <p className="body-copy small-copy">All bytes you hold are selected.</p>}
      <label className="form-field"><span>Recipient</span><input value={recipient} onChange={event => setRecipient(event.target.value)}
        placeholder="Original receiving address" maxLength={160}/></label>
      <details className="transaction-proof-details">
        <summary>Advanced</summary>
        <label className="form-field"><span>Exact byte ranges</span><input value={rangeText} onChange={event => {setRangeText(event.target.value);setPercentage('');}}
          placeholder="1–100, 200–249" maxLength={4096}/></label>
        <p className="body-copy small-copy">Count from byte 1 and include both ends.</p>
        {held && <p className="body-copy small-copy">Your ranges {held.ranges.map(rangeLabel).join(', ')}</p>}
      </details>
      <button type="button" className="primary-button" disabled={busy || (!length && !showcase) || !recipient.trim()} onClick={prepare}>Review send</button>
    </>}
    {busy && <InlineOpening compact label="Checking the Original transfer"/>}
    {error && <p className="error-message" role="status">{error}</p>}
  </section>;
}
