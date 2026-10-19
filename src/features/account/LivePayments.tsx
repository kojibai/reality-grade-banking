import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Radio, Share2, ShieldCheck } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { SharedWallet } from '../../receiz/shared-wallet';
import { AmountInput } from '../../components/AmountInput';
import { buildPaymentRequest, type PaymentRequest } from '../../receiz/payment-request';
import { paymentQr, paymentQrPath } from '../../receiz/payment-qr';
import { formatMoney } from '../../core/money';
import { verifyPaymentTag, type BankNfcConstructor } from '../../receiz/payment-nfc';
import { OfflineNotes } from '../notes/OfflineNotes';
import { WalletSendOperation } from './WalletSendOperation';
import { LiveOwnership } from '../assets/LiveOwnership';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { PaymentScanner } from './PaymentScanner';

export function LiveReceive({ identity, onRefresh = () => {} }: { identity: OpenIdentity; onRefresh?: () => void }) {
  const [noteMode, setNoteMode] = useState(false);
  const [amount, setAmount] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [tagWritten, setTagWritten] = useState(false), [tagHelp, setTagHelp] = useState(false); const nfc = useRef<AbortController | null>(null);
  useEffect(() => () => nfc.current?.abort(), []);
  const candidate = identity.walletReceivingAddress?.() ?? identity.knownWallet?.()?.wallet.userId ?? identity.accountUsername?.() ?? identity.username ?? '';
  const coordinate = /^(?:[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|[a-z0-9_]{3,24})$/i.test(candidate) ? candidate : '';
  const request = useMemo(() => { try { if(!coordinate)throw Error('Open your Wallet connection to obtain this account’s receiving address.');const link = buildPaymentRequest(coordinate, amount); return { link, path: paymentQrPath(paymentQr(link)), error: '' }; } catch (cause) { return { link: '', path: '', error: cause instanceof Error ? cause.message : 'This request could not be created.' }; } }, [coordinate, amount]);
  const copy = async () => { try { await navigator.clipboard.writeText(request.link); setNotice('Payment link copied.'); } catch { setNotice('Select and copy the payment link below.'); } };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: 'Bankeiz payment', url: request.link }); else await copy(); } catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setNotice('Sharing is unavailable. Copy the payment link below.'); } };
  const writeTag = async () => { const Reader = (window as unknown as { NDEFReader?: BankNfcConstructor }).NDEFReader; if (!Reader || !isSecureContext) { setTagHelp(true); setNotice('This browser cannot write NFC tags. Copy your payment link into an NFC tag writer as a URL record, or open this bank in Chrome on an NFC-enabled Android phone.'); return; } if (busy) return; setBusy(true); nfc.current?.abort(); const controller = new AbortController(); nfc.current = controller; setNotice('Hold a writable NFC tag near your phone.'); try { await new Reader().write({ records: [{ recordType: 'url', data: request.link }] }, { signal: controller.signal }); if (!controller.signal.aborted) { setTagWritten(true); setNotice('Tag ready. A tap opens your bank payment request.'); } } catch (cause) { if (!controller.signal.aborted) setNotice(cause instanceof Error && cause.name === 'NotAllowedError' ? 'Allow NFC access to program this tag.' : 'The tag could not be written. Try a writable tag or use your QR code.'); } finally { if (!controller.signal.aborted) setBusy(false); } };
  useEffect(() => { nfc.current?.abort(); setBusy(false); setTagWritten(false); }, [request.link]);
  const verifyTag = async () => { const Reader = (window as unknown as { NDEFReader?: BankNfcConstructor }).NDEFReader; if (!Reader || busy) return; const controller = new AbortController(); nfc.current?.abort(); nfc.current = controller; setBusy(true); setNotice('Hold the programmed tag near your phone again.'); try { await verifyPaymentTag(Reader, request.link, controller.signal); if (!controller.signal.aborted) setNotice('Verified. This tag opens your exact bank payment request.'); } catch (error) { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'The tag could not be verified.'); } finally { controller.abort(); if (nfc.current === controller) setBusy(false); } };
  if (noteMode) return <OfflineNotes identity={identity} mode="deposit" onBack={() => setNoteMode(false)} onRefresh={onRefresh} />;
  return <><button className="text-button note-action" onClick={() => setNoteMode(true)}>Deposit note</button><h1 className="sheet-hero">Your value<br />has a home.</h1><p className="body-copy">Receive value or asset ownership directly into your account.</p><div className="receiving-card">{request.path ? <svg viewBox="0 0 61 61" className="payment-qr" role="img" aria-label="Your payment QR"><rect width="61" height="61" fill="#fff" /><path d={request.path} fill="#142d50" /></svg> : <ShieldCheck size={45} />}<span>Your receiving address</span><strong className="receiving-coordinate">{coordinate}</strong></div><AmountInput label="Request amount (optional)" value={amount} onChange={setAmount} dollars />{request.error && <p role="alert" className="error-message">{request.error}</p>}<button className="primary-button" disabled={!request.link} onClick={() => void share()}><Share2 size={17} />Share payment link</button><div className="dual-actions"><button className="secondary-button" disabled={!request.link} onClick={() => void copy()}><Copy size={17} />Copy link</button><button className="secondary-button" disabled={!request.link || busy} onClick={() => void writeTag()}><Radio size={17} />{busy ? 'Hold tag nearby…' : 'Set up NFC tag'}</button></div>{busy && <button className="text-button" onClick={() => { nfc.current?.abort(); setBusy(false); setNotice('NFC setup cancelled. Your account is unchanged.'); }}>Cancel NFC operation</button>}{tagWritten && <button className="secondary-button" disabled={busy} onClick={() => void verifyTag()}>Verify NFC tag</button>}{tagHelp && <p className="body-copy small-copy">Write a URL record using the link below. Keep the tag writable so you can update it later. Test it by tapping another phone before sharing it.</p>}{request.link && <p className="payment-link">{request.link}</p>}{notice && <p className="body-copy" role="status">{notice}</p>}<div className="note-box"><ShieldCheck size={18} /><p>Scanning or tapping opens a payment request. The sender reviews and approves the payment in their bank.</p></div></>;
}

export function LiveSend({ identity, onRefresh = () => {}, wallet, initialRequest, onClose: _onClose }: { identity?: OpenIdentity; onRefresh?: () => void; wallet: SharedWallet | null; initialRequest?: PaymentRequest | null; onClose: () => void }) {
  const [noteMode, setNoteMode] = useState(false);
  const [recipient, setRecipient] = useState(initialRequest?.recipient ?? ''), [amount, setAmount] = useState(initialRequest?.amount ?? ''), [mode, setMode] = useState<'value' | 'asset'>('value');
  if (noteMode && identity) return <OfflineNotes identity={identity} mode="create" onBack={() => setNoteMode(false)} onRefresh={onRefresh} />;
  const choices = <>{identity && <button className="text-button note-action" onClick={() => setNoteMode(true)}>Create note</button>}<div className="segmented"><button className={mode === 'value' ? 'active' : ''} onClick={() => setMode('value')}>Send value</button><button className={mode === 'asset' ? 'active' : ''} onClick={() => setMode('asset')}>Send ownership</button></div></>;
  if (mode === 'asset' && identity) return <>{choices}<LiveOwnership identity={identity} onRefresh={onRefresh} /></>;
  return <>{choices}<WalletSendOperation identity={identity} inputKey={JSON.stringify([recipient, amount])} input={() => ({ amountUsdCents: bankOperationDollars(amount), recipient })} onRefresh={onRefresh}>
    <h1 className="sheet-hero">Move value.<br />Keep what makes it yours.</h1>
    <AmountInput label="Amount to send" value={amount} onChange={setAmount} dollars />
    <div className="detail-list"><div><span>Reserve</span><strong>{wallet ? formatMoney(wallet.reserveUsdCents) : '—'}</strong></div><div><span>Settlement</span><strong>{wallet ? formatMoney(wallet.settlementUsdCents) : '—'}</strong></div></div>
    <label className="form-field"><span>Recipient</span><input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Receiz ID or public username" maxLength={160} /></label>
    <PaymentScanner onRequest={request => { setRecipient(request.recipient); setAmount(request.amount ?? ''); }} />
  </WalletSendOperation></>;
}
