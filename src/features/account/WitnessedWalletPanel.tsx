import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AmountInput } from '../../components/AmountInput';
import { formatMoney } from '../../core/money';
import { bankOperationDollars } from '../../receiz/bank-operations';
import type { OpenIdentity } from '../../receiz/native-identity';
import { isOpticalNoteFrame, readOpticalNoteFrames } from '../../receiz/optical-note-frames';
import type { WitnessedWallet, WitnessedWalletRecipient } from '../../receiz/witnessed-wallet';
import { PaymentScanner } from './PaymentScanner';
import { type OpticalFrames, WalletPaymentCode } from './WalletPaymentCode';

type Summary = Awaited<ReturnType<WitnessedWallet['summary']>>;
type ScanAction = 'pair' | 'recipient' | 'payment' | 'result' | 'approval';
type Code = { frames: OpticalFrames; label: string; help: string };

const instructions: Record<ScanAction, string> = {
  pair: 'Scan the witness’s pairing QR.',
  recipient: 'Scan the recipient’s receiving QR.',
  payment: 'Scan the payment QR shown by the witness.',
  result: 'Scan the result QR shown by the witness.',
  approval: 'Scan the sender’s approval QR.',
};

function describe(error: unknown, scan?: ScanAction) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'BANK_WITNESS_SETUP_CONNECTION') return 'Connect to finish setup or return funds. A paired payment works offline.';
  if (message === 'BANK_WITNESS_SEPARATE_DEVICE_REQUIRED') return 'Use the pairing QR from a separate witness device.';
  if (message === 'BANK_WITNESS_ALREADY_PAIRED') return 'This Wallet still holds funds or approvals for its current witness.';
  if (message === 'BANK_WITNESS_PAYMENT_PENDING') return 'Finish the approval already saved on this device.';
  if (message.includes('CAUSAL_PARENT_CONFLICT') || message.includes('WITNESS_PREDECESSOR_CONSUMED')) {
    return 'The witness already recorded a different step for this balance. Show the original approval again to recover its result.';
  }
  if (message === 'BANK_WITNESS_JOURNAL_REQUIRED') return 'Open the witness device that holds the payment history.';
  if (message === 'BANK_WALLET_FUNDED_TRANSPORT_UNAVAILABLE') return 'Bankeiz couldn’t complete the connected step. Reopen this Wallet to retry the same request.';
  if (scan) return instructions[scan] + ' You can also use a QR image.';
  return 'The Wallet couldn’t complete this step. Any approved handoff remains saved.';
}

export default function WitnessedWalletPanel({ identity, onRefresh }: { identity: OpenIdentity; onRefresh: () => void }) {
  const [wallet, setWallet] = useState<WitnessedWallet>();
  const [summary, setSummary] = useState<Summary>();
  const [scan, setScan] = useState<ScanAction>();
  const [code, setCode] = useState<Code>();
  const [meaning, setMeaning] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hosting, setHosting] = useState(false);
  const [fundingReview, setFundingReview] = useState(false);
  const [returning, setReturning] = useState(false);
  const [receiver, setReceiver] = useState<WitnessedWalletRecipient>();
  const [amount, setAmount] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const reader = useRef(readOpticalNoteFrames('wallet'));
  const running = useRef(false);

  useEffect(() => {
    let open = true;
    void identity.witnessedWallet!().then(async next => {
      const state = await next.summary();
      if (open) {
        setWallet(next);
        setSummary(state);
      }
    }).catch(cause => { if (open) setError(describe(cause)); });
    return () => { open = false; };
  }, [identity]);

  function beginScan(next: ScanAction) {
    reader.current = readOpticalNoteFrames('wallet');
    setMeaning('');
    setError('');
    setCode(undefined);
    setScan(next);
  }
  function showCode(frames: OpticalFrames, label: string, help: string) {
    setScan(undefined);
    setCode({ frames, label, help });
  }
  async function run(work: (current: WitnessedWallet) => Promise<void>, mode?: ScanAction) {
    if (!wallet || running.current) return false;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      await work(wallet);
      setSummary(await wallet.summary());
      return true;
    } catch (cause) {
      setError(describe(cause, mode));
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function readFrame(bytes: Uint8Array) {
    if (!scan || running.current) return false;
    if (!isOpticalNoteFrame(bytes)) { setError(instructions[scan]); return false; }
    try {
      const complete = reader.current.push(bytes);
      if (!complete) {
        setMeaning(`${reader.current.received} of ${reader.current.count} frames scanned.`);
        return false;
      }
      const exact = (await complete).bytes;
      reader.current = readOpticalNoteFrames('wallet');
      return run(async current => {
        setMeaning('');
        if (scan === 'pair') {
          await current.pair(exact);
          setMeaning('Witness paired. Your receiving QR is ready.');
        } else if (scan === 'recipient') {
          setReceiver(await current.readRecipient(exact));
        } else if (scan === 'approval') {
          showCode(await current.witnessApproval(exact), 'Witness result QR', 'Let the sender and recipient scan this code. A return only needs the account holder to scan.');
        } else if (scan === 'payment') {
          const received = await current.receive(exact);
          setMeaning(received.alreadyRecorded ? 'This Wallet already recorded the payment.' : `${formatMoney(received.amount)} available to send with this witness.`);
          onRefresh();
        } else {
          const result = await current.acceptResult(exact);
          setMeaning(result === 'payment' ? 'Payment recorded on this Wallet.' : 'Return signed. Connect when you’re ready to move the funds back.');
          onRefresh();
        }
        setScan(undefined);
      }, scan);
    } catch (cause) {
      reader.current = readOpticalNoteFrames('wallet');
      setError(describe(cause, scan));
      return false;
    }
  }

  const lot = summary?.lots.find(item => item.ref === selectedLot) ?? summary?.lots.find(item => BigInt(item.amount) > 0n) ?? summary?.lots[0];
  const chooseLot = summary && summary.lots.length > 1 && <label className="form-field">
    <span>Funds to use</span>
    <select value={lot?.ref} onChange={event => setSelectedLot(event.target.value)}>
      {summary.lots.map(item => <option key={item.ref} value={item.ref}>{formatMoney(item.amount)}</option>)}
    </select>
  </label>;
  const button = (label: string, action: () => void, disabled = false) => <button type="button" className="secondary-button"
    disabled={busy || disabled} onClick={action}>{label}</button>;

  let controls: ReactNode;
  if (hosting) {
    controls = <>
      <p className="body-copy small-copy">Keep this separate device available for each payment. It holds the signed payment history for the paired Wallets.</p>
      <div className="dual-actions">
        {button('Show pairing QR', () => void run(async current => showCode(await current.pairingCode(), 'Witness pairing QR', 'Scan this on each Wallet phone during setup.')))}
        {button('Scan approval', () => beginScan('approval'))}
      </div>
      <button className="text-button" type="button" onClick={() => { setHosting(false); setScan(undefined); setCode(undefined); }}>Back to your Wallet</button>
    </>;
  } else if (!summary) {
    controls = !error && <p role="status" className="body-copy">Opening Wallet…</p>;
  } else if (!summary.paired) {
    controls = <>
      <p className="body-copy small-copy">Pair once while connected. With the witness nearby, two paired Wallets can send and spend again offline.</p>
      <div className="dual-actions">
        {button('Pair with a witness', () => beginScan('pair'))}
        {button('Act as witness', () => { setHosting(true); setScan(undefined); setCode(undefined); })}
      </div>
    </>;
  } else if (summary.pending) {
    controls = <div className="dual-actions">
      {summary.pending === 'return'
        ? button('Return funds online', () => void run(async current => { await current.returnOnline(); setMeaning('Funds returned to your regular balance.'); onRefresh(); }))
        : <>
          {button('Show saved approval', () => void run(async current => {
            const saved = await current.outgoingCode();
            if (saved) showCode(saved, 'Wallet approval QR', 'Ask the witness to scan this approval.');
          }))}
          {button('Scan witnessed result', () => beginScan('result'))}
        </>}
    </div>;
  } else {
    controls = <>
      <p className="balance-label">Balance with this witness</p>
      <strong>{formatMoney(summary.availableUsdCents)}</strong>
      <div className="dual-actions">
        {button('Show receiving QR', () => void run(async current => showCode(await current.receivingCode(),
          'Wallet receiving QR', 'Ask the sender to scan your receiving QR. Then scan the payment from the witness.')))}
        {button('Scan payment', () => beginScan('payment'))}
        {button('Send nearby', () => beginScan('recipient'), summary.availableUsdCents === '0')}
      </div>
      {summary.canFund && !fundingReview && button('Prepare regular balance', () => setFundingReview(true))}
      {fundingReview && <>
        <p className="body-copy small-copy">This sets aside your current regular balance for this witness. You can return unused funds to your regular balance with a witnessed release.</p>
        {button('Confirm balance setup', () => void run(async current => { await current.prepareBalance(); setFundingReview(false); onRefresh(); }))}
      </>}
      {receiver && <form onSubmit={event => {
        event.preventDefault();
        if (!lot) return;
        void run(async current => {
          showCode(await current.approvePayment(lot.ref, receiver, bankOperationDollars(amount)), 'Wallet approval QR', 'Ask the witness to scan this approval.');
          setReceiver(undefined);
          setAmount('');
        });
      }}>
        <p className="body-copy">Pay {receiver.account.payload.ownerReceizId}</p>
        {chooseLot}
        <AmountInput label="Amount to send" dollars value={amount} onChange={setAmount} disabled={busy}/>
        <button className="primary-button" disabled={busy || !lot || !amount.trim()}>Approve payment</button>
      </form>}
      {lot && !receiver && !returning && <button className="text-button" type="button" onClick={() => setReturning(true)}>Return funds</button>}
      {lot && returning && <>
        {chooseLot}
        <p className="body-copy small-copy">The witness signs the return of this portion. Connect afterward to add it to your regular balance.</p>
        {button('Approve return', () => void run(async current => {
          showCode(await current.approveRelease(lot.ref), 'Wallet return approval QR', 'Ask the witness to scan this approval.');
          setReturning(false);
        }))}
      </>}
    </>;
  }

  return <section className="detail-list" aria-label="Offline payments with a witness">
    {controls}
    {scan && <div key={scan}>
      <p className="body-copy small-copy">{instructions[scan]}</p>
      <PaymentScanner onBytes={readFrame}/>
    </div>}
    {code && <>
      <p className="body-copy small-copy">{code.help}</p>
      <WalletPaymentCode frames={code.frames} label={code.label} onError={cause => setError(describe(cause))}/>
    </>}
    {meaning && <p className="body-copy small-copy" role="status">{meaning}</p>}
    {error && <p className="body-copy small-copy" role="status">{error}</p>}
  </section>;
}
