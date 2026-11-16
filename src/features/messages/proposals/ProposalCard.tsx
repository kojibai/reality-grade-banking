import {lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {Check, ChevronDown, Download, FileText, PackageCheck} from 'lucide-react';
import type {OpenIdentity} from '../../../receiz/native-identity';
import {MessagingError, type NativeMessaging, type ChatMessage, type ChatAttachment} from '../../../receiz/native-messaging';
import {proposalContentDigest, proposalEventBody, projectProposalEvents, readChatProposal, readProposalEvent, type ChatProposal, type ProposalEvent} from '../../../receiz/chat-proposal';
import {readFixedSale, type FixedSale, type FixedSaleFields} from '../../../receiz/fixed-checkout';
import {readChatAttachmentInfo} from '../../../receiz/chat-attachment';
import {readProposalDraftDisplayValue} from '../../../receiz/messaging-retention';
import type {CheckoutApproval, CheckoutReceipt, CheckoutSnapshot} from '../../../receiz/checkout-state';
import type {HostedCheckoutController} from '../../../receiz/hosted-checkout';
import type {MerchantPaymentEvidence} from '../../../receiz/merchant-receive';
import {formatMoney} from '../../../core/money';
import './proposal-card.css';

const Card = lazy(() => import('../../deposit/ReceizCardCheckout').then(module => ({default: module.ReceizCardCheckout})));
const Pdf = lazy(() => import('../../media/ProofPdfReader'));
export type ProposalCardProps = {identity: OpenIdentity; api: NativeMessaging; message: ChatMessage; messages: readonly ChatMessage[]; onUpdated: () => void; isCurrent: () => boolean};
type UnknownUpdate = {kind: ProposalEvent['kind']; body: string; beforeIds: readonly string[]; attachment?: ChatAttachment; stage: 'upload' | 'send'};
type ActivityAttempt = {proposalId: string; proposalDigest: string; actorUserId: string; messageId: string; messageBody: string; attempt: UnknownUpdate};
type View = {busy: boolean; hydrated: boolean; retentionError: boolean; digest: string | null; error: string; notice: string; unknown: UnknownUpdate | null; localMessages: readonly ChatMessage[]; sellerReceipt: MerchantPaymentEvidence | null};
type Session = {snapshot: () => View; subscribe: (listener: () => void) => () => void; update: (change: Partial<View>) => void; verified?: {file: File; digest: string}; verification?: Promise<{file: File; digest: string}>};
// This map only coalesces mounted UI operations. Native encrypted proposal-draft
// retention below supplies cold recovery; native controllers admit all results.
const retained = new Map<string, Session>(), anonymousKeys = new WeakMap<OpenIdentity, string>();
function sessionFor({identity, api, message}: ProposalCardProps): Session {
  let owner = identity.binding?.artifactSha256;
  if (!owner) {owner = anonymousKeys.get(identity) ?? crypto.randomUUID(); anonymousKeys.set(identity, owner);}
  const key = `${owner}:${api.accountUid}:${message.conversationId}:${message.id}:${message.body}`;
  let session = retained.get(key);
  if (!session) {
    let state: View = {busy: false, hydrated: false, retentionError: false, digest: null, error: '', notice: '', unknown: null, localMessages: [], sellerReceipt: null};
    const listeners = new Set<() => void>();
    session = {snapshot: () => state, subscribe: listener => {listeners.add(listener); return () => {listeners.delete(listener);};}, update: change => {state = {...state, ...change}; for (const listener of listeners) listener();}};
    retained.set(key, session);
  }
  return session;
}
const noSubscription = () => () => {};
const noCheckout = () => null;
const composerSchema = 'bankeiz.proposal-composer.v1';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const retentionInvalid = () => Error('Your saved proposal update could not be read safely. Keep this conversation open and check its saved result.');
function activityContainer(api: NativeMessaging, conversationId: string) {
  const raw = api.knownProposalDraft?.(conversationId);
  if (raw === null || raw === undefined) return {schema: composerSchema, conversationId, proposalId: crypto.randomUUID(), draft: {kind: 'proposal', title: '', summary: '', items: [{description: '', quantity: '1', unitPriceUsdCents: ''}], deliverables: [], timeline: '', terms: ''}, phase: 'review', proposal: null, source: null, activityAttempts: []} as Record<string, unknown>;
  const held = readProposalDraftDisplayValue(raw);
  if (!held || held.schema !== composerSchema || held.conversationId !== conversationId || held.activityAttempts !== undefined && (!Array.isArray(held.activityAttempts) || held.activityAttempts.length > 32)) throw retentionInvalid();
  return held;
}
function boundAttempt(container: Record<string, unknown>, proposal: ChatProposal, message: ChatMessage, actorUserId: string, digest: string): ActivityAttempt | null {
  let found: ActivityAttempt | null = null;
  for (const raw of container.activityAttempts as unknown[] ?? []) {
    if (!record(raw)) throw retentionInvalid();
    if (raw.proposalId !== proposal.id || raw.actorUserId !== actorUserId || raw.messageId !== message.id) continue;
    if (found || Object.keys(raw).sort().join('|') !== 'actorUserId|attempt|messageBody|messageId|proposalDigest|proposalId' || raw.messageBody !== message.body || raw.proposalDigest !== digest || !record(raw.attempt)) throw retentionInvalid();
    const value = raw.attempt;
    if (Object.keys(value).some(key => !['kind', 'body', 'beforeIds', 'attachment', 'stage'].includes(key)) || !['upload', 'send'].includes(String(value.stage)) || typeof value.body !== 'string' || new TextEncoder().encode(value.body).byteLength > 16384 || !Array.isArray(value.beforeIds) || value.beforeIds.length > 300 || value.beforeIds.some(id => typeof id !== 'string' || !uuid.test(id)) || new Set(value.beforeIds).size !== value.beforeIds.length) throw retentionInvalid();
    let attachment: ChatAttachment | undefined;
    if (value.attachment !== undefined) {
      const info = readChatAttachmentInfo(value.attachment);
      if (!info || !record(value.attachment) || value.attachment.conversationId !== proposal.conversationId || Object.keys(value.attachment).sort().join('|') !== ['conversationId', ...Object.keys(info)].sort().join('|')) throw retentionInvalid();
      attachment = {conversationId: proposal.conversationId, ...info};
    }
    if (value.stage === 'upload' && (value.kind !== 'delivery' || attachment) || value.stage === 'send' && (value.kind === 'delivery') !== Boolean(attachment)) throw retentionInvalid();
    // Parsing authenticates no statement here: it strictly validates the saved
    // intent's existing event contract and exact sender/proposal coordinates.
    const event = readProposalEvent({...message, body: value.body, senderKind: 'user', senderUserId: actorUserId, senderAiId: null, createdAt: proposal.createdAt, ...(value.kind === 'delivery' ? {walletTransfer: {kind: 'chat_attachment'}} : {})}, proposal, digest);
    if (!event || event.kind !== value.kind || proposalEventBody(event) !== value.body) throw retentionInvalid();
    found = {proposalId: proposal.id, proposalDigest: digest, actorUserId, messageId: message.id, messageBody: message.body, attempt: {kind: event.kind, body: value.body, beforeIds: value.beforeIds as string[], stage: value.stage as 'upload' | 'send', ...(attachment ? {attachment} : {})}};
  }
  return found;
}
const fields = ({digest: _, ...sale}: FixedSale): FixedSaleFields => sale;
const amountFor = (quantity: string, unitPrice: string) => {const [whole, fraction = ''] = quantity.split('.'); return (BigInt(whole + fraction) * BigInt(unitPrice) / 10n ** BigInt(fraction.length)).toString();};
const pending = (state: CheckoutSnapshot) => Boolean(state.bookingPreparation && !['confirmed-paid', 'cancelled-paid', 'cancelled-unpaid'].includes(state.bookingPreparation.review?.phase ?? '') || state.notes.some(note => ['depositing', 'received', 'attention-required'].includes(note.status)) || state.approval && !['paid', 'not-sent'].includes(state.phase));

export function ProposalCard(props: ProposalCardProps) {
  const proposal = useMemo(() => readChatProposal(props.message), [props.message]);
  return proposal ? <ReadableProposalCard key={props.message.body} {...props} proposal={proposal}/> : null;
}

function ReadableProposalCard(props: ProposalCardProps & {proposal: ChatProposal}) {
  const {identity, api, message, proposal} = props;
  const session = useMemo(() => sessionFor(props), [identity, api, message.id, message.body]);
  const state = useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
  const [controller, setController] = useState<HostedCheckoutController | null>(null), [paid, setPaid] = useState<CheckoutReceipt | null>(null), [method, setMethod] = useState<'balance' | 'card'>('balance');
  const [delivery, setDelivery] = useState<File | null>(null), [deliveryNote, setDeliveryNote] = useState(''), [previewFile, setPreviewFile] = useState<File | null>(null), [previewUrl, setPreviewUrl] = useState('');
  const current = useRef(props), mounted = useRef(false), owner = useRef({identity, api, messageId: message.id, body: message.body}); current.current = props;
  const checkout = useSyncExternalStore(controller?.subscribe ?? noSubscription, controller?.snapshot ?? noCheckout, noCheckout);
  useEffect(() => {mounted.current = true; owner.current = {identity, api, messageId: message.id, body: message.body}; setController(null); setPaid(null); return () => {mounted.current = false;};}, [identity, api, message.id, message.body]);
  useEffect(() => {void hydrateActivity().catch(cause => session.update({hydrated: true, retentionError: true, error: explain(cause)}));}, [proposal, session, api]);
  useEffect(() => {if (!previewFile) {setPreviewUrl(''); return;} const url = URL.createObjectURL(previewFile); setPreviewUrl(url); return () => URL.revokeObjectURL(url);}, [previewFile]);
  const active = () => mounted.current && current.current.identity === identity && current.current.api === api && owner.current.identity === identity && owner.current.api === api && owner.current.messageId === message.id && owner.current.body === message.body && current.current.isCurrent();
  const assertCurrent = () => {if (!active()) throw Error('PROPOSAL_CONTEXT_CHANGED');};
  const allMessages = () => [...current.current.messages, ...session.snapshot().localMessages, ...(api.knownMessages(proposal.conversationId)?.messages ?? [])];
  const projection = state.digest ? projectProposalEvents(proposal, state.digest, allMessages()) : null;
  const issuer = api.accountUid === proposal.issuer.userId, recipient = proposal.recipients.includes(api.accountUid), participant = issuer || recipient;
  const kind = proposal.draft.kind === 'invoice' ? 'Invoice' : 'Proposal', accepted = projection?.acceptedBy.includes(api.accountUid), declined = projection?.declinedBy.includes(api.accountUid), received = projection?.receivedBy.includes(api.accountUid), withdrawn = projection?.withdrawn;
  const exactCheckout = checkout?.approval?.fixedSale?.digest === proposal.fixedSale.digest && checkout.approval.accountUid === api.accountUid ? checkout : null;
  const approval = exactCheckout?.approval, funding = exactCheckout?.walletOutcome?.status === 'funding' ? exactCheckout.walletOutcome : null;
  const deliveries = projection?.deliveryMessageIds.map(id => allMessages().find(row => row.id === id)).filter((row): row is ChatMessage => Boolean(row)) ?? [];
  const blocked = state.busy || !state.hydrated || state.retentionError;

  function explain(cause: unknown) {
    const code = cause instanceof Error ? cause.message : '';
    if (code === 'PROPOSAL_CONTEXT_CHANGED') return '';
    if (code === 'PROPOSAL_PENDING_OTHER') return 'Another saved payment needs attention. Finish or close that payment before reviewing this one.';
    if (code === 'PROPOSAL_WITHDRAWN') return 'This proposal was withdrawn. Ask the issuer for a new proposal.';
    if (/MISMATCH|INVALID|EXACT|CHANGED/.test(code)) return 'The original document or saved payment does not match this proposal. No new payment was approved.';
    if (cause instanceof MessagingError && !cause.ambiguous) return 'This update could not be sent. Review it and try again.';
    return code && !/^[A-Z_]+$/.test(code) ? code : 'This action needs attention. Your held proposal and saved payment remain available.';
  }
  async function action(work: () => Promise<void>) {
    if (session.snapshot().busy || !active()) return;
    session.update({busy: true, error: '', notice: ''});
    try {await work();} catch (cause) {session.update({error: explain(cause)});} finally {session.update({busy: false});}
  }
  async function hydrateActivity() {
    const digest = session.snapshot().digest ?? await proposalContentDigest(proposal), held = activityContainer(api, proposal.conversationId);
    const saved = boundAttempt(held, proposal, message, api.accountUid, digest);
    session.update({digest, hydrated: true, retentionError: false, ...(saved ? {unknown: saved.attempt, notice: 'The update outcome is not confirmed. Check this conversation before sending another update.'} : {})});
  }
  async function retainActivity(attempt: UnknownUpdate | null, digest: string) {
    if (!api.saveProposalDraft || !api.knownProposalDraft) throw Error('This update could not be saved securely. No update was sent. Keep this conversation open and try again.');
    const held = activityContainer(api, proposal.conversationId); boundAttempt(held, proposal, message, api.accountUid, digest);
    const entries = ((held.activityAttempts as unknown[] | undefined) ?? []).filter(entry => !record(entry) || entry.proposalId !== proposal.id || entry.actorUserId !== api.accountUid || entry.messageId !== message.id);
    if (attempt) entries.push({proposalId: proposal.id, proposalDigest: digest, actorUserId: api.accountUid, messageId: message.id, messageBody: message.body, attempt});
    const next = readProposalDraftDisplayValue({...held, activityAttempts: entries});
    if (!next || entries.length > 32) throw Error('The saved proposal updates are full. No update was sent. Check the pending updates before continuing.');
    boundAttempt(next, proposal, message, api.accountUid, digest);
    // The native method confirms encrypted retention; its synchronous display
    // projection alone never authorizes a POST or substitutes for this await.
    await api.saveProposalDraft(proposal.conversationId, next);
  }
  async function verified() {
    assertCurrent();
    const digest = session.snapshot().digest ?? await proposalContentDigest(proposal); assertCurrent();
    if (!session.verified) {
      session.verification ??= import('../../../receiz/proposal-document').then(module => module.verifyProposalDocument(api, message, proposal)).then(result => {if (result.digest !== digest) throw Error('PROPOSAL_DOCUMENT_MISMATCH'); session.verified = result; return result;}).finally(() => {session.verification = undefined;});
      await session.verification;
    }
    assertCurrent();
    if (session.verified!.digest !== digest) throw Error('PROPOSAL_DOCUMENT_MISMATCH');
    session.update({digest});
    return session.verified!;
  }
  async function exactSale() {const sale = await readFixedSale(proposal.fixedSale); assertCurrent(); return sale;}
  function assertOpen() {if (session.snapshot().digest && projectProposalEvents(proposal, session.snapshot().digest!, allMessages()).withdrawn) throw Error('PROPOSAL_WITHDRAWN');}
  function download(file: File) {
    assertCurrent(); const url = URL.createObjectURL(file), link = document.createElement('a'); link.href = url; link.download = file.name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function validateApproval(value: CheckoutApproval | null, sale: FixedSale) {
    if (!value?.fixedSale) throw Error('PROPOSAL_PAYMENT_MISMATCH');
    const held = await readFixedSale(value.fixedSale); assertCurrent();
    if (held.digest !== sale.digest || value.accountUid !== api.accountUid || value.recipient.userId !== sale.recipientUserId || value.recipient.username !== sale.username || value.amountUsdCents !== sale.amountUsdCents || value.booking) throw Error('PROPOSAL_PAYMENT_MISMATCH');
    return value;
  }
  async function inspectPaid(value: HostedCheckoutController, sale: FixedSale) {
    const receipt = await value.inspectFixedSale(fields(sale)); assertCurrent();
    if (receipt) {
      if (!receipt.fixedSale || (await readFixedSale(receipt.fixedSale)).digest !== sale.digest || receipt.senderUserId !== api.accountUid || receipt.recipientUserId !== sale.recipientUserId || receipt.amountUsdCents !== sale.amountUsdCents) throw Error('PROPOSAL_PAYMENT_MISMATCH');
      assertCurrent(); setPaid(receipt);
    }
    return receipt;
  }
  async function reviewPayment() {
    await hydrateActivity(); assertCurrent();
    if (!recipient || issuer || session.snapshot().unknown) return;
    await verified(); assertOpen(); const sale = await exactSale();
    if (!identity.hostedCheckout) throw Error('Payment is unavailable for this account.');
    const value = await identity.hostedCheckout(); assertCurrent(); await value.ready; assertCurrent(); setController(value);
    if (await inspectPaid(value, sale)) return;
    const saved = value.snapshot();
    if (saved.approval?.fixedSale?.digest === sale.digest && saved.phase !== 'not-sent') {await validateApproval(saved.approval, sale); return;}
    if (pending(saved)) throw Error('PROPOSAL_PENDING_OTHER');
    const result = await value.prepare({recipient: sale.username, amountUsdCents: sale.amountUsdCents, method, fixedSale: fields(sale)}); assertCurrent();
    await validateApproval(result, sale);
  }
  async function approvePayment() {
    await hydrateActivity(); assertCurrent();
    if (!controller || !recipient || session.snapshot().unknown) return;
    await verified(); assertOpen(); const sale = await exactSale(), saved = controller.snapshot();
    const exact = await validateApproval(saved.approval, sale);
    if (saved.approvalHistory.length || saved.phase !== 'reviewed') throw Error('Check the saved payment before approving another request.');
    await controller.approve(exact.digest); assertCurrent(); await inspectPaid(controller, sale);
    if (active()) current.current.onUpdated();
  }
  async function checkPayment() {
    await verified(); const sale = await exactSale();
    if (issuer) {
      if (!identity.merchantCounter) throw Error('Payment status is unavailable for this account.');
      const counter = await identity.merchantCounter(); assertCurrent(); await counter.ready; assertCurrent();
      const held = await counter.sale(sale.saleId); assertCurrent(); if ((await readFixedSale(held.request)).digest !== sale.digest) throw Error('PROPOSAL_PAYMENT_MISMATCH');
      assertCurrent(); await counter.check(new AbortController().signal, [sale.saleId]); assertCurrent();
      const result = await counter.sale(sale.saleId); assertCurrent(); if ((await readFixedSale(result.request)).digest !== sale.digest) throw Error('PROPOSAL_PAYMENT_MISMATCH');
      const receipt = result.receipts.find(row => row.recipientUserId === api.accountUid && row.amountUsdCents === sale.amountUsdCents && row.senderUserId !== api.accountUid);
      session.update({sellerReceipt: receipt ?? null, notice: receipt ? '' : 'No matching payment receipt is held yet.'});
      if (active()) current.current.onUpdated(); return;
    }
    if (!controller) return;
    const saved = await validateApproval(controller.snapshot().approval, sale);
    await controller.check(saved.checkoutId); assertCurrent(); await inspectPaid(controller, sale);
    if (active()) current.current.onUpdated();
  }
  function exactUpdate(row: ChatMessage, attempt: UnknownUpdate, digest: string) {
    const event = readProposalEvent(row, proposal, digest);
    if (!event || row.senderUserId !== api.accountUid || event.kind !== attempt.kind || row.body !== attempt.body || attempt.beforeIds.includes(row.id)) return false;
    if (attempt.attachment) {
      const info = readChatAttachmentInfo(row.walletTransfer);
      if (!info || info.sha256Hex !== attempt.attachment.sha256Hex || info.path !== attempt.attachment.path || info.bucket !== attempt.attachment.bucket) return false;
    }
    return true;
  }
  async function sendUpdate(event: ProposalEvent, attachment?: ChatAttachment) {
    const body = proposalEventBody(event), beforeIds = [...new Set(allMessages().filter(row => row.senderUserId === api.accountUid && row.body === body).map(row => row.id))], attempt: UnknownUpdate = {kind: event.kind, body, beforeIds, ...(attachment ? {attachment} : {}), stage: 'send'};
    await retainActivity(attempt, event.proposalDigest);
    assertCurrent();
    session.update({unknown: attempt});
    let row: ChatMessage | null;
    try {
      row = attachment ? await api.send(proposal.conversationId, body, {attachment}) : await api.send(proposal.conversationId, body);
      if (!row || !exactUpdate(row, attempt, event.proposalDigest)) throw new MessagingError('CHAT_SEND_OUTCOME_UNKNOWN', true);
    } catch (cause) {
      if (!(cause instanceof MessagingError) || cause.ambiguous) session.update({unknown: attempt, notice: 'The update outcome is not confirmed. Check this conversation before sending another update.'});
      else {await retainActivity(null, event.proposalDigest); session.update({unknown: null}); throw cause;}
      return;
    }
    session.update({localMessages: [...session.snapshot().localMessages, row]});
    await retainActivity(null, event.proposalDigest);
    session.update({unknown: null, notice: ''});
    if (active()) current.current.onUpdated();
  }
  async function update(kind: ProposalEvent['kind']) {
    await hydrateActivity(); assertCurrent();
    if (!participant || session.snapshot().unknown) return;
    const {digest} = await verified(); assertOpen();
    let attachment: ChatAttachment | undefined;
    if (kind === 'delivery') {
      if (!issuer || !delivery) return;
      const body = proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId: proposal.id, proposalDigest: digest, conversationId: proposal.conversationId, kind, ...(deliveryNote.trim() ? {note: deliveryNote.trim()} : {})});
      const attempt: UnknownUpdate = {kind, body, beforeIds: [], stage: 'upload'};
      await retainActivity(attempt, digest); assertCurrent(); session.update({unknown: attempt});
      try {attachment = await api.uploadAttachment(proposal.conversationId, delivery); assertCurrent();} catch (cause) {
        if (!(cause instanceof MessagingError) || cause.ambiguous) {session.update({unknown: attempt, notice: 'The upload outcome is not confirmed. Check this conversation before choosing the delivery again.'}); return;}
        await retainActivity(null, digest); session.update({unknown: null}); throw cause;
      }
    }
    await sendUpdate({schema: 'bankeiz.chat.proposal-event.v1', proposalId: proposal.id, proposalDigest: digest, conversationId: proposal.conversationId, kind, ...(kind === 'delivery' && deliveryNote.trim() ? {note: deliveryNote.trim()} : {})}, attachment);
    if (active() && !session.snapshot().unknown && kind === 'delivery') {setDelivery(null); setDeliveryNote('');}
  }
  async function checkConversation() {
    const attempt = session.snapshot().unknown; if (!attempt) return;
    const page = await api.messages(proposal.conversationId); assertCurrent();
    const digest = session.snapshot().digest ?? await proposalContentDigest(proposal); assertCurrent();
    if (attempt.stage === 'upload') {
      await retainActivity(null, digest); assertCurrent();
      session.update({unknown: null, localMessages: [...session.snapshot().localMessages, ...page.messages], notice: 'The conversation was checked. No delivery message was sent by this attempt. Choose the file again to send it.'});
    } else {
      const found = page.messages.find(row => exactUpdate(row, attempt, digest));
      if (found) {await retainActivity(null, digest); assertCurrent();}
      session.update({localMessages: [...session.snapshot().localMessages, ...page.messages], ...(found ? {unknown: null, notice: ''} : {notice: 'The update is not confirmed yet. Check this conversation again; the original attempt will not be repeated.'})});
    }
    if (active()) current.current.onUpdated();
  }
  async function openDelivery(row: ChatMessage) {
    const info = readChatAttachmentInfo(row.walletTransfer); if (!info) throw Error('The delivery attachment is unavailable.');
    const file = await api.attachment(proposal.conversationId, row.id); assertCurrent();
    const {openCanonicalProofFile} = await import('../../../receiz/proof-capture'), opened = await openCanonicalProofFile(file); assertCurrent();
    if (opened.sealedArtifact.artifactSha256 !== info.sha256Hex) throw Error('PROPOSAL_DELIVERY_MISMATCH');
    download(file);
  }

  return <article className="bank-proposal-card" aria-label={`${kind} from ${proposal.issuer.name}`}>
    <header><span className="bank-proposal-icon"><FileText size={18}/></span><div><small>{kind} · {proposal.issuer.name}</small><h3>{proposal.draft.title}</h3></div><strong className="bank-proposal-total">{formatMoney(proposal.fixedSale.amountUsdCents)}</strong></header>
    <p className="bank-proposal-summary">{proposal.draft.summary}</p>
    <details className="bank-proposal-terms"><summary>Full {proposal.draft.kind}<ChevronDown size={14}/></summary><div>
      <dl className="bank-proposal-meta"><div><dt>Issued by</dt><dd>{proposal.issuer.name}<span>@{proposal.issuer.username}</span>{proposal.issuer.email && <span>{proposal.issuer.email}</span>}{proposal.issuer.website && <span>{proposal.issuer.website}</span>}{proposal.branding?.issuerDetails&&<span className="bank-proposal-prewrap">{proposal.branding.issuerDetails}</span>}</dd></div>{proposal.branding&&<div><dt>{proposal.draft.kind==='invoice'?'Bill to':'Prepared for'}</dt><dd>{proposal.branding.clientName}<span className="bank-proposal-prewrap">{proposal.branding.clientDetails}</span></dd></div>}<div><dt>Reference</dt><dd>{proposal.id}</dd></div><div><dt>Created</dt><dd><time dateTime={proposal.createdAt}>{new Date(proposal.createdAt).toLocaleString()}</time></dd></div></dl>
      <div className="bank-proposal-table"><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{proposal.draft.items.map((item, index) => <tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{formatMoney(item.unitPriceUsdCents)}</td><td>{formatMoney(amountFor(item.quantity, item.unitPriceUsdCents))}</td></tr>)}</tbody><tfoot><tr><th colSpan={3}>Total · USD</th><td>{formatMoney(proposal.fixedSale.amountUsdCents)}</td></tr></tfoot></table></div>
      {proposal.draft.deliverables.length > 0 && <section><h4>Deliverables</h4><ol>{proposal.draft.deliverables.map((item, index) => <li key={index}>{item}</li>)}</ol></section>}
      <section><h4>Timeline</h4><p>{proposal.draft.timeline || 'Not specified'}</p></section><section><h4>Terms</h4><p>{proposal.draft.terms || 'Not specified'}</p></section>
      <small className="bank-proposal-source">Prepared from {proposal.source.messageIds.length} conversation {proposal.source.messageIds.length === 1 ? 'message' : 'messages'}{proposal.source.hasEarlier ? ' · Earlier messages are available in this chat' : ''}.</small>
    </div></details>
    <div className="bank-proposal-documents"><button type="button" disabled={state.busy} onClick={() => void action(async () => {const result = await verified(); setPreviewFile(result.file);})}><FileText size={13}/>View PDF</button><button type="button" disabled={state.busy} onClick={() => void action(async () => download((await verified()).file))}><Download size={13}/>Download original PDF</button></div>
    {previewUrl && <div className="bank-proposal-pdf"><button type="button" onClick={() => setPreviewFile(null)}>Close PDF</button><Suspense fallback={<p role="status">Opening PDF…</p>}><Pdf url={previewUrl} title={proposal.draft.title}/></Suspense></div>}
    {withdrawn ? <p className="bank-proposal-status">Withdrawn by issuer</p> : <>
      {recipient && <>{accepted && <p className="bank-proposal-status"><Check size={13}/>You accepted this {proposal.draft.kind}.</p>}{declined && <p className="bank-proposal-status">You declined this {proposal.draft.kind}.</p>}{!state.unknown && <div className="bank-proposal-actions">{!accepted && <button type="button" disabled={blocked} onClick={() => void action(() => update('accepted'))}>Accept proposal</button>}{!declined && <button type="button" disabled={blocked} onClick={() => void action(() => update('declined'))}>Decline proposal</button>}</div>}</>}
      {issuer && <>{projection?.acceptedBy.length ? <p className="bank-proposal-status">Accepted by {projection.acceptedBy.length} {projection.acceptedBy.length === 1 ? 'recipient' : 'recipients'}</p> : null}{projection?.declinedBy.length ? <p className="bank-proposal-status">Declined by {projection.declinedBy.length} {projection.declinedBy.length === 1 ? 'recipient' : 'recipients'}</p> : null}</>}
      {recipient && <section className="bank-proposal-payment" aria-label="Proposal payment">{paid ? <p className="bank-proposal-status"><Check size={14}/>Payment recorded · {formatMoney(paid.amountUsdCents)}</p> : <>
        {!approval && <><button className="bank-proposal-primary" type="button" disabled={blocked || Boolean(state.unknown)} onClick={() => void action(reviewPayment)}>Review payment</button><details className="bank-proposal-options bank-proposal-disclosure"><summary>Payment options<ChevronDown size={14}/></summary><label>Pay with<select aria-label="Payment method" value={method} disabled={blocked || Boolean(state.unknown)} onChange={event => setMethod(event.target.value as 'balance' | 'card')}><option value="balance">Balance, with card for any difference</option><option value="card">Card</option></select></label></details></>}
        {approval && exactCheckout?.phase === 'reviewed' && !exactCheckout.approvalHistory.length && <><dl className="bank-proposal-funding">{approval.balanceContributionUsdCents !== '0' && <div><dt>From balance</dt><dd>{formatMoney(approval.balanceContributionUsdCents)}</dd></div>}{approval.cardAmountUsdCents !== '0' && <div><dt>At secure checkout</dt><dd>{formatMoney(approval.cardAmountUsdCents)}</dd></div>}</dl><button className="bank-proposal-primary" type="button" disabled={blocked || Boolean(state.unknown)} onClick={() => void action(approvePayment)}>Pay {formatMoney(approval.amountUsdCents)}</button></>}
        {funding?.checkout ? <Suspense fallback={<p role="status">Preparing secure payment…</p>}><Card checkout={funding.checkout} purpose="payment" onCheck={() => action(checkPayment)}/></Suspense> : approval && exactCheckout?.approvalHistory.length ? <><p role="status">Payment confirmation is pending. Check the saved payment to continue.</p><button type="button" disabled={state.busy} onClick={() => void action(checkPayment)}>Check saved payment</button></> : null}
      </>}</section>}
      {issuer && <section className="bank-proposal-payment">{state.sellerReceipt && <p className="bank-proposal-status"><Check size={14}/>Payment received · {formatMoney(state.sellerReceipt.amountUsdCents)}</p>}<button type="button" disabled={state.busy} onClick={() => void action(checkPayment)}>Check payment</button></section>}
      {issuer && !state.unknown && <details className="bank-proposal-deliver bank-proposal-disclosure"><summary>Deliver work<ChevronDown size={14}/></summary><div className="bank-proposal-delivery-fields"><label>Delivery file<input aria-label="Delivery file" type="file" disabled={blocked} onChange={event => setDelivery(event.target.files?.[0] ?? null)}/></label><label>Delivery note<textarea aria-label="Delivery note" value={deliveryNote} maxLength={2000} rows={2} disabled={blocked} onChange={event => setDeliveryNote(event.target.value)}/></label><button type="button" disabled={blocked || !delivery} onClick={() => void action(() => update('delivery'))}>Send delivery</button></div></details>}
    </>}
    {deliveries.length > 0 && <section className="bank-proposal-deliveries"><h4><PackageCheck size={14}/>Delivered work</h4>{deliveries.map(row => {const event = state.digest && readProposalEvent(row, proposal, state.digest), info = readChatAttachmentInfo(row.walletTransfer); return <div key={row.id}><span>{info?.name ?? 'Delivery file'}</span>{event && event.note && <p>{event.note}</p>}<button type="button" disabled={state.busy} onClick={() => void action(() => openDelivery(row))}>Open delivery</button></div>;})}{recipient && (received ? <p className="bank-proposal-status">You marked this delivery received.</p> : !state.unknown && !withdrawn && <button type="button" disabled={blocked} onClick={() => void action(() => update('received'))}>Mark received</button>)}{issuer && Boolean(projection?.receivedBy.length) && <p className="bank-proposal-status">Marked received by {projection!.receivedBy.length} {projection!.receivedBy.length === 1 ? 'recipient' : 'recipients'}</p>}</section>}
    {state.unknown && <div className="bank-proposal-uncertain"><p role="status">{state.notice || 'The update outcome is not confirmed. Check this conversation to continue.'}</p><button type="button" disabled={state.busy} onClick={() => void action(checkConversation)}>Check conversation</button></div>}
    {!state.unknown && state.notice && <p role="status">{state.notice}</p>}{state.busy && <p className="bank-proposal-working" role="status">Working…</p>}{state.error && <p className="bank-proposal-error" role="alert">{state.error}</p>}
  </article>;
}
export default ProposalCard;
