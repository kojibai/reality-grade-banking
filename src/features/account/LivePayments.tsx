import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Copy, Radio, Share2, ShieldCheck } from 'lucide-react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { SharedWallet } from '../../receiz/shared-wallet';
import {buildCheckoutRequest} from '../../receiz/checkout-request';
import { AmountInput } from '../../components/AmountInput';
import { buildPaymentRequest, publicReceizId, type PaymentRequest } from '../../receiz/payment-request';
import { paymentQr, paymentQrPath } from '../../receiz/payment-qr';
import { verifyPaymentTag, type BankNfcConstructor } from '../../receiz/payment-nfc';
import { OfflineNotes } from '../notes/OfflineNotes';
import { WalletSendOperation } from './WalletSendOperation';
import { LiveOwnership } from '../assets/LiveOwnership';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { PaymentScanner } from './PaymentScanner';
import {RecipientInput} from './RecipientInput';
import {PaymentTools} from './PaymentTools';
import {LiveDeposit} from '../deposit/LiveDeposit';

export function LiveReceive({ identity, onRefresh = () => {} }: { identity: OpenIdentity; onRefresh?: () => void }) {
  const [noteMode, setNoteMode] = useState(false);
  const [linkMode,setLinkMode]=useState<'send'|'checkout'>('send');
  const [copiedLink, setCopiedLink] = useState<{link: string} | null>(null);
  useEffect(() => {
    if (!copiedLink) return;
    const reset = setTimeout(() => setCopiedLink(null), 1600);
    return () => clearTimeout(reset);
  }, [copiedLink]);
  const [amount, setAmount] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [tagWritten, setTagWritten] = useState(false), [tagHelp, setTagHelp] = useState(false); const nfc = useRef<AbortController | null>(null);
  const [receiving,setReceiving]=useState<{identity:OpenIdentity|null;username:string|null;pending:boolean;error:string}>({identity:null,username:null,pending:false,error:''}),[receivingAttempt,setReceivingAttempt]=useState(0);
  useEffect(()=>{
    if(!identity.prepareReceivingUsername)return;
    let active=true;setReceiving({identity,username:null,pending:true,error:''});
    void Promise.resolve().then(()=>identity.prepareReceivingUsername!()).then(value=>{if(!active)return;const username=publicReceizId(value)?.slice(0,-10)??null;setReceiving({identity,username,pending:false,error:username?'':'Your public receiving ID is still being prepared. Try again.'});},()=>{if(active)setReceiving({identity,username:null,pending:false,error:'Your public receiving ID could not be prepared yet. Try again.'});});
    return()=>{active=false;};
  },[identity,receivingAttempt]);
  useEffect(() => () => nfc.current?.abort(), []);
  const receivingPending=!!identity.prepareReceivingUsername&&(receiving.identity!==identity||receiving.pending);
  const coordinate = identity.prepareReceivingUsername?(receiving.identity===identity?receiving.username??'':''):(publicReceizId(identity.accountUsername?.()) ?? publicReceizId(identity.username) ?? '').replace(/\.receiz\.id$/, '');
  const request = useMemo(() => { try { if(!coordinate)throw Error('Open your Wallet connection to obtain your public Receiz ID.');const link = (linkMode==='checkout'?buildCheckoutRequest:buildPaymentRequest)(coordinate,amount); return { link,nfcUrl:link, path: paymentQrPath(paymentQr(link)), error: '' }; } catch (cause) { return { link: '',nfcUrl:'', path: '', error: cause instanceof Error ? cause.message : 'This request could not be created.' }; } }, [coordinate, amount,linkMode]);
  const copy = async () => { try { await navigator.clipboard.writeText(amount?request.link:coordinate); setNotice(amount?'Payment request copied.':'Receiz ID copied.'); } catch { setNotice('Select and copy your receiving ID below.'); } };
  const linkCopied = copiedLink?.link === request.link;
  const copyLink = async () => { try { await navigator.clipboard.writeText(request.link); setNotice(''); setCopiedLink({link: request.link}); } catch { setCopiedLink(null); setNotice('Select and copy your payment link below.'); } };
  const share = async () => { try { if (navigator.share) await navigator.share({title:amount?'Payment request':'Payment link',url:request.link}); else await copyLink(); } catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setNotice('Sharing is unavailable. Copy your payment link below.'); } };
  const writeTag = async () => { const Reader = (window as unknown as { NDEFReader?: BankNfcConstructor }).NDEFReader; if (!Reader || !isSecureContext) { setTagHelp(true); setNotice('This browser cannot write NFC tags. Use the NFC URL below in your tag writer as a URL record, or open this bank in Chrome on an NFC-enabled Android phone.'); return; } if (busy) return; setBusy(true); nfc.current?.abort(); const controller = new AbortController(); nfc.current = controller; setNotice('Hold a writable NFC tag near your phone.'); try { await new Reader().write({ records: [{ recordType: 'url', data: request.nfcUrl }] }, { signal: controller.signal }); if (!controller.signal.aborted) { setTagWritten(true); setNotice('Tag ready. A tap opens your bank payment request.'); } } catch (cause) { if (!controller.signal.aborted) setNotice(cause instanceof Error && cause.name === 'NotAllowedError' ? 'Allow NFC access to program this tag.' : 'The tag could not be written. Try a writable tag or use your QR code.'); } finally { if (!controller.signal.aborted) setBusy(false); } };
  useEffect(() => { nfc.current?.abort(); setBusy(false); setTagWritten(false); }, [request.link]);
  const verifyTag = async () => { const Reader = (window as unknown as { NDEFReader?: BankNfcConstructor }).NDEFReader; if (!Reader || busy) return; const controller = new AbortController(); nfc.current?.abort(); nfc.current = controller; setBusy(true); setNotice('Hold the programmed tag near your phone again.'); try { await verifyPaymentTag(Reader, request.nfcUrl, controller.signal); if (!controller.signal.aborted) setNotice('Verified. This tag opens your exact bank payment request.'); } catch (error) { if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'The tag could not be verified.'); } finally { controller.abort(); if (nfc.current === controller) setBusy(false); } };
  if (noteMode) return <OfflineNotes identity={identity} mode="deposit" onBack={() => setNoteMode(false)} onRefresh={onRefresh} />;
  return <><button className="text-button note-action" onClick={() => setNoteMode(true)}>Deposit note</button><h1 className="sheet-hero">Your value<br />has a home.</h1><p className="body-copy">Receive money or asset ownership directly into your account.</p><div className="segmented" role="group" aria-label="Payment link type"><button type="button" aria-pressed={linkMode==='send'} className={linkMode==='send'?'active':''} onClick={()=>setLinkMode('send')}>Send link</button><button type="button" aria-pressed={linkMode==='checkout'} className={linkMode==='checkout'?'active':''} onClick={()=>setLinkMode('checkout')}>Checkout link</button></div><p className="body-copy small-copy">{linkMode==='checkout'?'A dedicated page to pay you by card, balance or Note. No signup step.':'Opens your address in the bank’s Send flow.'}</p><div className="receiving-card">{request.path ? <svg viewBox="0 0 61 61" className="payment-qr" role="img" aria-label="Your payment QR"><rect width="61" height="61" fill="#fff" /><path d={request.path} fill="#142d50" /></svg> : <ShieldCheck size={45} />}<span>Your receiving address</span><strong className="receiving-coordinate">{coordinate||(receivingPending?'Preparing Receiz ID…':'Receiz ID unavailable')}</strong></div><AmountInput label="Request amount (optional)" value={amount} onChange={setAmount} dollars />{!receivingPending && (receiving.identity===identity&&receiving.error||request.error) && <p role="alert" className="error-message">{receiving.identity===identity&&receiving.error||request.error}</p>}{identity.prepareReceivingUsername&&!receivingPending&&!coordinate&&<button className="secondary-button" onClick={()=>setReceivingAttempt(value=>value+1)}>Try receiving ID again</button>}<button className="primary-button" disabled={!request.link} onClick={() => void share()}><Share2 size={17} />{amount?'Share payment request':'Share payment link'}</button><div className="dual-actions"><button className="secondary-button" disabled={!request.link} onClick={() => void copy()}><Copy size={17} />{amount?'Copy payment request':'Copy Receiz ID'}</button><button className="secondary-button" disabled={!request.link || busy} onClick={() => void writeTag()}><Radio size={17} />{busy ? 'Hold tag nearby…' : 'Set up NFC tag'}</button></div>{busy && <button className="text-button" onClick={() => { nfc.current?.abort(); setBusy(false); setNotice('NFC setup cancelled. Your account is unchanged.'); }}>Cancel NFC operation</button>}{tagWritten && <button className="secondary-button" disabled={busy} onClick={() => void verifyTag()}>Verify NFC tag</button>}{tagHelp&&<div className="nfc-manual-url"><p className="body-copy small-copy">Write this URL record in your NFC tag writer. Test the tag with another phone before sharing it.</p><code className="payment-link">{request.nfcUrl}</code><button disabled={!request.nfcUrl} className="text-button" onClick={()=>void navigator.clipboard.writeText(request.nfcUrl).then(()=>setNotice('NFC URL copied.')).catch(()=>setNotice('Select and copy the NFC URL above.'))}>Copy NFC URL</button></div>}{request.link && <div className="receive-payment-link"><span>Your payment link</span><div><a className="payment-link" href={request.link}>{request.link.replace(/^https:\/\//,'')}</a><button type="button" className="icon-button receive-link-copy" aria-label={linkCopied?'Payment link copied':'Copy payment link'} data-copied={linkCopied} onClick={()=>void copyLink()}><span className="receive-copy-mark" aria-hidden="true"><Copy size={16} className="receive-copy-symbol"/><Check size={16} className="receive-copy-check"/></span></button></div></div>}<PaymentTools username={coordinate} amount={amount}/>{notice && <p className="body-copy" role="status">{notice}</p>}<div className="note-box"><ShieldCheck size={18} /><p>Scanning or tapping opens your selected payment page. The payer reviews and approves the recipient and amount.</p></div></>;
}

export function LiveSend({ identity, onRefresh = () => {}, initialRequest, initialRecipient, onClose: _onClose }: { identity?: OpenIdentity; onRefresh?: () => void; wallet: SharedWallet | null; initialRequest?: PaymentRequest | null; initialRecipient?: {userId:string;username:string}; onClose: () => void }) {
  const [noteMode, setNoteMode] = useState<'create'|'deposit'|null>(null);
  const [cardFunding,setCardFunding]=useState(false);
  const [recipient, setRecipient] = useState(initialRequest?.recipient ?? initialRecipient?.username ?? ''), [amount, setAmount] = useState(initialRequest?.amount ?? ''), [mode, setMode] = useState<'value' | 'asset'>('value'), [sendNote,setSendNote]=useState('');
  // The displayed handle is presentation. A chat handoff keeps its selected
  // account ID for review even if that handle is renamed or reassigned.
  const [selectedRecipient,setSelectedRecipient]=useState(initialRequest?undefined:initialRecipient);
  const recipientCoordinate=selectedRecipient&&recipient===selectedRecipient.username?selectedRecipient.userId:recipient;
  const noteHint=useId();
  if (noteMode && identity) return <OfflineNotes identity={identity} mode={noteMode} onBack={() => setNoteMode(null)} backLabel="Back to payment" onRefresh={onRefresh} />;
  if (cardFunding && identity) return <LiveDeposit identity={identity} onClose={()=>setCardFunding(false)} onRefresh={onRefresh} funding={{purpose:'payment',initialAmount:amount,onBack:()=>setCardFunding(false),onCredited:()=>setCardFunding(false)}}/>;
  const choices = <>{identity && <button className="text-button note-action" onClick={() => setNoteMode('create')}>Create note</button>}<div className="segmented"><button className={mode === 'value' ? 'active' : ''} onClick={() => setMode('value')}>Send money</button><button className={mode === 'asset' ? 'active' : ''} onClick={() => setMode('asset')}>Send ownership</button></div></>;
  if (mode === 'asset' && identity) return <>{choices}<LiveOwnership identity={identity} onRefresh={onRefresh} /></>;
  return <>{choices}<WalletSendOperation identity={identity} inputKey={JSON.stringify([recipientCoordinate, amount,sendNote])} input={() => ({ amountUsdCents: bankOperationDollars(amount), recipient:recipientCoordinate,note:sendNote })} onRefresh={onRefresh}>
    <h1 className="sheet-hero">Move money.<br />Keep what makes it yours.</h1>
    <AmountInput label="Amount to send" value={amount} onChange={setAmount} dollars />
    <RecipientInput identity={identity} value={recipient} onChange={value=>{setSelectedRecipient(undefined);setRecipient(value);}} onSelect={person=>{setSelectedRecipient(person);setRecipient(person.username);}}/>
    <details className="send-note-field"><summary>Add a note <span>Optional</span></summary><label className="form-field"><span>Payment note</span><textarea aria-label="Payment note" aria-describedby={noteHint} value={sendNote} onChange={event=>setSendNote(event.target.value)} maxLength={280} rows={2} placeholder="What is this payment for?"/><small id={noteHint}>This note is included with your payment in the public Ledger.</small></label></details>
    {identity&&<details className="payment-funding-options"><summary>Payment options</summary><p className="body-copy small-copy">Use your balance, add money by card, or deposit a Note to fund this payment.</p><div className="dual-actions"><button type="button" className="secondary-button" onClick={()=>setNoteMode('deposit')}>Pay with a Note</button><button type="button" className="secondary-button" onClick={()=>setCardFunding(true)}>Add money by card</button></div></details>}
    <PaymentScanner onRequest={request => { setSelectedRecipient(undefined);setRecipient(request.recipient); setAmount(request.amount ?? ''); }} />
  </WalletSendOperation></>;
}
