// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {ProposalCard} from '../src/features/messages/proposals/ProposalCard';
import {createChatProposal, proposalContentDigest, proposalEventBody, proposalMessageBody, type ChatProposal} from '../src/receiz/chat-proposal';
import {createFixedSale} from '../src/receiz/fixed-checkout';
import {emptyCheckoutSnapshot, type CheckoutApproval, type CheckoutReceipt, type CheckoutSnapshot} from '../src/receiz/checkout-state';
import {MessagingError, type ChatAttachment, type ChatMessage, type ChatNativeMessage, type ChatPage, type NativeMessaging} from '../src/receiz/native-messaging';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HostedCheckoutController} from '../src/receiz/hosted-checkout';

const ports = vi.hoisted(() => ({verify: vi.fn()}));
// This is the document-service UI port; canonical proof admission is tested by its own real SDK suite.
vi.mock('../src/receiz/proposal-document', () => ({verifyProposalDocument: ports.verify}));
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const issuer = '11111111-1111-4111-8111-111111111111', buyer = '22222222-2222-4222-8222-222222222222';
const conversationId = '33333333-3333-4333-8333-333333333333', proposalId = '44444444-4444-4444-8444-444444444444';
let host: HTMLDivElement, root: Root;
// Detached mounting exercises the real secure iframe markup without fetching its remote runtime.
beforeEach(() => {vi.clearAllMocks(); host = document.createElement('div'); root = createRoot(host);});
afterEach(() => {act(() => root.unmount()); host.remove(); vi.restoreAllMocks();});
const message = (body: string, senderUserId = issuer): ChatNativeMessage => ({id: crypto.randomUUID(), conversationId, senderUserId, senderKind: 'user', senderAiId: null, senderDisplay: 'Maya', body, createdAt: '2026-11-15T22:00:00.000Z', receizedAt: '2026-11-15T22:00:00.000Z', receipt: null, sealedOriginalAvailable: true});

async function fixture(accountUid = buyer) {
  const fixedSale = await createFixedSale({schema: 'bank.fixed-checkout.v1', saleId: proposalId, recipientUserId: issuer, username: 'mayastudio', currency: 'usd', amountUsdCents: '7500'});
  const proposal = createChatProposal({id: proposalId, conversationId, createdAt: '2026-11-15T21:00:00.000Z', issuer: {userId: issuer, name: 'Maya Studio', username: 'mayastudio', email: 'maya@example.com'}, recipients: [buyer], draft: {kind: 'proposal', title: 'Website review', summary: 'Review the complete booking flow.', items: [{description: 'Review and written action plan', quantity: '1.5', unitPriceUsdCents: '5000'}], deliverables: ['Live review', 'Written action plan'], timeline: 'Thursday at 2 PM', terms: 'Includes one revision.\nClient receives all editable source files.'}, source: {messageIds: [proposalId], digest: 'a'.repeat(64), hasEarlier: true}, fixedSale});
  const original = message(proposalMessageBody(proposal)), digest = await proposalContentDigest(proposal);
  let held: ChatMessage[] = [original], savedDraft: unknown = null;
  const page = (): ChatPage => ({conversation: {id: conversationId, kind: 'dm', title: 'Website review', members: [], aiAgents: [], defaultAiId: null, unreadCount: 0, previewMessage: original, createdAt: original.createdAt, updatedAt: original.createdAt, lastMessageAt: original.createdAt}, messages: held, hasMore: false, nextCursor: null});
  const api = {accountUid, knownMessages: page, messages: vi.fn(async () => page()), knownProposalDraft: () => structuredClone(savedDraft), saveProposalDraft: vi.fn(async (_id: string, value: unknown) => {await Promise.resolve(); savedDraft = structuredClone(value);}), attachment: vi.fn(), uploadAttachment: vi.fn(), send: vi.fn(async (_id: string, body: string, options?: {attachment?: ChatAttachment}) => {
    const sent = {...message(body, accountUid), ...(options?.attachment ? {walletTransfer: {kind: 'chat_attachment', ...options.attachment}} : {})};
    held = [...held, sent]; return sent;
  })} as unknown as NativeMessaging;
  const identity = {binding: {artifactSha256: crypto.randomUUID()}, walletReceivingAddress: () => accountUid, hostedCheckout: vi.fn(), merchantCounter: vi.fn()} as unknown as OpenIdentity;
  const verifiedFile = new File(['service-admitted-original'], 'proposal.pdf', {type: 'application/pdf'});
  ports.verify.mockResolvedValue({file: verifiedFile, digest});
  const onUpdated = vi.fn();
  const props = {identity, api, message: original, messages: held, onUpdated, isCurrent: () => true};
  return {proposal, digest, props, api, identity, page, savedDraft: () => structuredClone(savedDraft), setSavedDraft: (value: unknown) => {savedDraft = structuredClone(value);}, held: () => held, setHeld: (next: ChatMessage[]) => {held = next;}};
}
async function show(props: Parameters<typeof ProposalCard>[0]) {await act(async () => root.render(<ProposalCard {...props}/>));}
const button = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === label);
async function begin(label: string) {await vi.waitFor(() => expect(button(label)?.disabled, label).toBe(false)); await act(async () => button(label)!.click());}
async function click(label: string) {await begin(label); await vi.waitFor(() => expect(host.querySelector('.bank-proposal-working')).toBeNull());}
async function openDetails(label: string) {const details = [...host.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === label); expect(details).toBeDefined(); await act(async () => {details!.open = true;});}
function payment(proposal: ChatProposal, accountUid = buyer) {
  let view: CheckoutSnapshot = emptyCheckoutSnapshot(), receipt: CheckoutReceipt | null = null;
  const listeners = new Set<() => void>(), publish = () => {for (const listener of listeners) listener();};
  const approval: CheckoutApproval = {checkoutId: '55555555-5555-4555-8555-555555555555', clientNonce: '55555555-5555-4555-8555-555555555555', identityDigest: 'b'.repeat(64), accountUid, recipient: {userId: issuer, username: 'mayastudio', displayName: 'Maya Studio', avatarUrl: null}, amountUsdCents: '7500', method: 'balance', cardAmountUsdCents: '0', balanceContributionUsdCents: '7500', noteSourceDigests: [], fixedSale: proposal.fixedSale, digest: 'c'.repeat(64)};
  const controller = {ready: Promise.resolve(), snapshot: () => view, subscribe: (fn: () => void) => {listeners.add(fn); return () => listeners.delete(fn);}, inspectFixedSale: vi.fn(async () => receipt), prepare: vi.fn(async () => {view = {...view, phase: 'reviewed', approval}; publish(); return approval;}), approve: vi.fn(async () => {view = {...view, approvalHistory: [approval], phase: 'confirming'}; publish();}), check: vi.fn(async () => {})} as unknown as HostedCheckoutController;
  const paid: CheckoutReceipt = {checkoutId: approval.checkoutId, clientNonce: approval.clientNonce, transferId: '66666666-6666-4666-8666-666666666666', senderUserId: buyer, recipientUserId: issuer, amountUsdCents: '7500', recordedAt: '2026-11-15T22:01:00Z', recipient: approval.recipient, method: 'balance', fixedSale: proposal.fixedSale};
  return {controller, approval, paid, setView(next: CheckoutSnapshot) {view = next; publish();}, setReceipt(value: CheckoutReceipt | null) {receipt = value;}, view: () => view};
}
function attachment(): ChatAttachment {return Object.freeze({conversationId, mediaKind: 'file', name: 'action-plan.pdf', url: null, bucket: 'receiz-chat-attachments', path: 'sealed/chat/plan.pdf', mime: 'application/pdf', size: 24, sha256Hex: 'd'.repeat(64), verifyPath: '/v/20261115_2200/ABCDEFGH/123', verifyUrl: null, code: 'ABCDEFGH', pulse: '123', ts: '2026-11-15T22:00:00Z', anchorId: null, anchorMs: null});}

it('renders complete held terms immediately and expands without downloading or checking payment', async () => {
  const f = await fixture(); await show(f.props);
  for (const text of ['Maya Studio', 'Website review', '$75.00', '1.5', '$50.00', 'Live review', 'Thursday at 2 PM', 'Client receives all editable source files.']) expect(host.textContent).toContain(text);
  expect(host.querySelector('details')).not.toBeNull();
  await act(async () => {host.querySelector('details')!.open = true;});
  expect(ports.verify).not.toHaveBeenCalled(); expect(f.identity.hostedCheckout).not.toHaveBeenCalled(); expect(f.api.messages).not.toHaveBeenCalled();
  expect(host.querySelector('a')).toBeNull(); expect(host.textContent).not.toContain('Payment recorded');
});

it('keeps delivery controls and payment options closed until requested while the primary action remains visible', async () => {
  const f = await fixture(); await show(f.props);
  const options = host.querySelector('select[aria-label="Payment method"]')?.closest('details'); expect(options).not.toBeNull(); expect(options?.open).toBe(false);
  expect(button('Review payment')?.closest('details')).toBeNull(); await openDetails('Payment options'); expect(options?.open).toBe(true);
  const seller = await fixture(issuer); await show(seller.props);
  const delivery = host.querySelector('input[type="file"]')?.closest('details'); expect(delivery).not.toBeNull(); expect(delivery?.open).toBe(false);
  await openDetails('Deliver work'); expect(delivery?.open).toBe(true); expect(ports.verify).not.toHaveBeenCalled(); expect(seller.api.uploadAttachment).not.toHaveBeenCalled();
});

it('reviews the exact fixed sale before enabling an explicit payment approval', async () => {
  const f = await fixture(), p = payment(f.proposal); vi.mocked(f.identity.hostedCheckout!).mockResolvedValue(p.controller);
  await show(f.props); await click('Review payment');
  expect(ports.verify).toHaveBeenCalledWith(f.api, f.props.message, f.proposal);
  const {digest: _, ...fixedSale} = f.proposal.fixedSale;
  expect(p.controller.prepare).toHaveBeenCalledExactlyOnceWith({recipient: 'mayastudio', amountUsdCents: '7500', method: 'balance', fixedSale});
  expect(p.controller.approve).not.toHaveBeenCalled(); await click('Pay $75.00');
  expect(p.controller.approve).toHaveBeenCalledExactlyOnceWith(p.approval.digest);
  expect(host.textContent).toContain('confirmation'); expect(host.textContent).not.toContain('Payment recorded');
});

it('refuses a forged fixed-sale digest before checkout preparation', async () => {
  const f = await fixture(), changed = {...f.proposal, fixedSale: {...f.proposal.fixedSale, digest: 'f'.repeat(64)}};
  const row = {...f.props.message, body: proposalMessageBody(changed)};
  ports.verify.mockResolvedValue({file: new File(['port'], 'proposal.pdf'), digest: await proposalContentDigest(changed)});
  await show({...f.props, message: row}); await click('Review payment');
  expect(f.identity.hostedCheckout).not.toHaveBeenCalled(); expect(host.querySelector('[role="alert"]')).not.toBeNull();
});

it('keeps an unrelated pending payment intact and uses exact paid history without another preparation', async () => {
  const f = await fixture(), p = payment(f.proposal); vi.mocked(f.identity.hostedCheckout!).mockResolvedValue(p.controller);
  const {digest: _, ...fields} = f.proposal.fixedSale;
  const other = await createFixedSale({...fields, saleId: '77777777-7777-4777-8777-777777777777'});
  p.setView({...emptyCheckoutSnapshot(), phase: 'confirming', approval: {...p.approval, fixedSale: other}, approvalHistory: [{...p.approval, fixedSale: other}]});
  await show(f.props); await click('Review payment'); expect(p.controller.prepare).not.toHaveBeenCalled(); expect(p.view().approval?.fixedSale?.digest).toBe(other.digest);
  expect(host.textContent).toContain('saved payment');
  p.setReceipt(p.paid); await click('Review payment'); expect(host.textContent).toContain('Payment recorded'); expect(p.controller.prepare).not.toHaveBeenCalled();
});

it('resumes exact card funding inline and checks only the saved checkout', async () => {
  const f = await fixture(), p = payment(f.proposal); vi.mocked(f.identity.hostedCheckout!).mockResolvedValue(p.controller);
  p.setView({...emptyCheckoutSnapshot(), phase: 'funding', approval: p.approval, approvalHistory: [p.approval], walletOutcome: {status: 'funding', clientNonce: p.approval.clientNonce, stage: 'ready', amountUsdCents: '7500', recipientLabel: 'Maya Studio', checkout: {sessionId: 'cs_test_proposal', clientSecret: 'private-short-lived-secret', amountUsdCents: '7500'} as never}});
  await show(f.props); await click('Review payment');
  await vi.waitFor(() => expect(host.querySelector('iframe')?.title).toBe('Secure payment')); expect(p.controller.prepare).not.toHaveBeenCalled();
  await click('Check payment status'); expect(p.controller.check).toHaveBeenCalledExactlyOnceWith(p.approval.checkoutId);
  expect(host.textContent).not.toContain('Payment recorded');
});

it('records acceptance as an authenticated native statement bound to the exact proposal digest', async () => {
  const f = await fixture(); await show(f.props); await click('Accept proposal');
  expect(f.api.send).toHaveBeenCalledExactlyOnceWith(conversationId, proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'accepted'}));
  expect(host.textContent).toContain('You accepted'); expect(host.textContent).not.toContain('Payment recorded'); expect(f.props.onUpdated).toHaveBeenCalledOnce();
});

it('binds decline and receipt acknowledgment to the recipient and the exact proposal', async () => {
  const f = await fixture(); await show(f.props); await click('Decline proposal');
  expect(f.api.send).toHaveBeenLastCalledWith(conversationId, proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'declined'}));
  expect(host.textContent).toContain('You declined');
  const delivered = {...message(proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'delivery'})), walletTransfer: {kind: 'chat_attachment', ...attachment()}};
  await show({...f.props, messages: [...f.held(), delivered]}); await click('Mark received');
  expect(f.api.send).toHaveBeenLastCalledWith(conversationId, proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'received'}));
  expect(host.textContent).toContain('You marked this delivery received');
});

it('preserves one in-flight update across chat remount and rejects a substituted saved approval', async () => {
  const f = await fixture(); let finish!: (value: ChatMessage) => void;
  vi.mocked(f.api.send).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
  await show(f.props); await begin('Accept proposal');
  await vi.waitFor(() => expect(f.api.send).toHaveBeenCalledOnce()); await act(async () => root.render(null)); await show(f.props);
  expect(button('Accept proposal')).toBeUndefined(); expect(button('Check conversation')?.disabled).toBe(true); await act(async () => finish(message(proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'accepted'}), buyer)));
  expect(f.api.send).toHaveBeenCalledOnce();
  const p = payment(f.proposal); vi.mocked(f.identity.hostedCheckout!).mockResolvedValue(p.controller); await click('Review payment');
  await act(async () => p.setView({...p.view(), approval: {...p.approval, amountUsdCents: '1'}})); await click('Pay $0.01');
  expect(p.controller.approve).not.toHaveBeenCalled(); expect(host.querySelector('[role="alert"]')).not.toBeNull();
});

it('keeps an unknown send across remount and reopened identity, allowing read reconciliation without replay', async () => {
  const f = await fixture(); vi.mocked(f.api.send).mockRejectedValue(new MessagingError('CHAT_SEND_OUTCOME_UNKNOWN', true));
  await show(f.props); await click('Accept proposal'); expect(host.textContent).toContain('not confirmed');
  await act(async () => root.render(null));
  const reopenedApi = {...f.api, messages: vi.fn(async () => f.page())} as NativeMessaging;
  await show({...f.props, identity: {...f.identity}, api: reopenedApi}); expect(button('Accept proposal')).toBeUndefined();
  await click('Check conversation'); expect(reopenedApi.messages).toHaveBeenCalledOnce(); expect(f.api.send).toHaveBeenCalledOnce();
  const accepted = message(proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'accepted'}), buyer);
  f.setHeld([...f.held(), accepted]); await click('Check conversation'); expect(host.textContent).toContain('You accepted'); expect(f.api.send).toHaveBeenCalledOnce();
});

it('never calls a seller paid from a server boolean, and uses the native receipt-bearing sale check', async () => {
  const f = await fixture(issuer); let receipts: unknown[] = [];
  const counter = {ready: Promise.resolve(), check: vi.fn(async () => 'unchanged'), sale: vi.fn(async () => ({request: f.proposal.fixedSale, receipts, paymentRecorded: true}))};
  vi.mocked(f.identity.merchantCounter!).mockResolvedValue(counter as never);
  await show(f.props); await click('Check payment'); expect(counter.check).toHaveBeenCalledWith(expect.any(AbortSignal), [proposalId]);
  expect(host.textContent).not.toContain('Payment received');
  receipts = [{recipientUserId: issuer, senderUserId: buyer, amountUsdCents: '7500', transferId: '66666666-6666-4666-8666-666666666666'}];
  await click('Check payment'); expect(host.textContent).toContain('Payment received'); expect(f.api.send).not.toHaveBeenCalled();
});

it('sends delivery using the exact native upload object and never retries an unknown message', async () => {
  const f = await fixture(issuer), uploaded = attachment(); vi.mocked(f.api.uploadAttachment).mockResolvedValue(uploaded); vi.mocked(f.api.send).mockRejectedValue(new MessagingError('CHAT_SEND_OUTCOME_UNKNOWN', true));
  await show(f.props);
  const file = new File(['PRIVATE_DELIVERY_CONTENT_a93f'], 'sources.zip', {type: 'application/zip'});
  await openDetails('Deliver work');
  await act(async () => {const input = host.querySelector<HTMLInputElement>('input[type="file"]')!; Object.defineProperty(input, 'files', {value: [file]}); input.dispatchEvent(new Event('change', {bubbles: true}));});
  await click('Send delivery'); expect(f.api.uploadAttachment).toHaveBeenCalledExactlyOnceWith(conversationId, file); expect(vi.mocked(f.api.send).mock.calls[0][2]?.attachment).toBe(uploaded);
  const checkpoints = vi.mocked(f.api.saveProposalDraft!).mock.calls.map(call => call[1] as {activityAttempts: Array<{attempt: {stage: string; attachment?: unknown}}>});
  expect(checkpoints[0].activityAttempts[0].attempt.stage).toBe('upload'); expect(checkpoints[1].activityAttempts[0].attempt.stage).toBe('send');
  expect(vi.mocked(f.api.saveProposalDraft!).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(f.api.uploadAttachment).mock.invocationCallOrder[0]);
  expect(JSON.stringify(f.savedDraft())).not.toContain('PRIVATE_DELIVERY_CONTENT_a93f'); expect(checkpoints[1].activityAttempts[0].attempt.attachment).toEqual(uploaded);
  expect(host.textContent).toContain('not confirmed'); expect(button('Send delivery')).toBeUndefined();
  await click('Check conversation'); expect(f.api.send).toHaveBeenCalledOnce(); expect(f.api.uploadAttachment).toHaveBeenCalledOnce();
});

it('opens delivery only through the native attachment reader and refuses unsealed files without following delivery URLs', async () => {
  const f = await fixture(), info = attachment();
  const delivery = {...message(proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'delivery'})), walletTransfer: {kind: 'chat_attachment', ...info, url: 'https://storage.example.com/storage/v1/object/public/receiz-chat-attachments/sealed/chat/plan.pdf'}};
  vi.mocked(f.api.attachment).mockResolvedValue(new File(['not a proof'], 'unsealed.txt', {type: 'text/plain'}));
  await show({...f.props, messages: [f.props.message, delivery]}); await vi.waitFor(() => expect(button('Open delivery')).toBeDefined()); await click('Open delivery');
  expect(f.api.attachment).toHaveBeenCalledExactlyOnceWith(conversationId, delivery.id); expect(host.querySelector('a')).toBeNull(); expect(host.querySelector('[role="alert"]')).not.toBeNull();
});

it('does not dispatch a late verification result into another conversation', async () => {
  const f = await fixture(); let finish!: (value: {file: File; digest: string}) => void;
  ports.verify.mockReturnValue(new Promise(resolve => {finish = resolve;})); let current = true;
  await show({...f.props, isCurrent: () => current});
  await begin('Accept proposal'); current = false;
  await act(async () => finish({file: new File(['port'], 'proposal.pdf'), digest: f.digest}));
  expect(f.api.send).not.toHaveBeenCalled(); expect(f.props.onUpdated).not.toHaveBeenCalled();
});

it('awaits durable pending-event retention before dispatch and preserves the composer fields when clearing', async () => {
  const f = await fixture();
  const sibling = {proposalId, proposalDigest: f.digest, actorUserId: buyer, messageId: crypto.randomUUID(), messageBody: f.props.message.body, attempt: {kind: 'declined', body: proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'declined'}), beforeIds: [], stage: 'send'}};
  const composer = {schema: 'bankeiz.proposal-composer.v1', conversationId, proposalId: crypto.randomUUID(), draft: {...f.proposal.draft, title: 'An unfinished invoice'}, phase: 'review', proposal: null, source: null, activityAttempts: [sibling]};
  f.setSavedDraft(composer); let finish!: () => void, first = true;
  vi.mocked(f.api.saveProposalDraft!).mockImplementation(async (_id, value) => {if (first) {first = false; await new Promise<void>(resolve => {finish = resolve;});} f.setSavedDraft(value);});
  await show(f.props); await begin('Accept proposal');
  await vi.waitFor(() => expect(f.api.saveProposalDraft).toHaveBeenCalledOnce()); expect(f.api.send).not.toHaveBeenCalled();
  const written = vi.mocked(f.api.saveProposalDraft!).mock.calls[0][1] as Record<string, unknown>;
  expect(written).toMatchObject({...composer, activityAttempts: expect.any(Array)}); expect(written.activityAttempts).toEqual([sibling, expect.objectContaining({proposalId, proposalDigest: f.digest, actorUserId: buyer, messageId: f.props.message.id, messageBody: f.props.message.body, attempt: expect.objectContaining({kind: 'accepted', stage: 'send'})})]);
  await act(async () => finish()); await vi.waitFor(() => expect(host.querySelector('.bank-proposal-working')).toBeNull());
  expect(f.api.send).toHaveBeenCalledOnce(); expect(f.savedDraft()).toEqual(composer);
});

it('fails closed before an event or upload if durable retention is unavailable or rejects', async () => {
  const f = await fixture(); vi.mocked(f.api.saveProposalDraft!).mockRejectedValue(Error('Encrypted save is unavailable.'));
  await show(f.props); await click('Accept proposal'); expect(f.api.send).not.toHaveBeenCalled(); expect(host.textContent).toContain('save');
  const seller = await fixture(issuer), file = new File(['work'], 'work.txt', {type: 'text/plain'});
  await show({...seller.props, api: {...seller.api, saveProposalDraft: undefined} as unknown as NativeMessaging});
  await openDetails('Deliver work');
  await act(async () => {const input = host.querySelector<HTMLInputElement>('input[type="file"]')!; Object.defineProperty(input, 'files', {value: [file]}); input.dispatchEvent(new Event('change', {bubbles: true}));});
  await click('Send delivery'); expect(seller.api.uploadAttachment).not.toHaveBeenCalled(); expect(seller.api.send).not.toHaveBeenCalled();
});

it('restores a pending exact native update after a cold module restart and reconciles without another POST', async () => {
  const f = await fixture(); f.setSavedDraft({schema: 'bankeiz.proposal-composer.v1', conversationId, proposalId: crypto.randomUUID(), draft: f.proposal.draft, phase: 'review', proposal: null, source: null});
  vi.mocked(f.api.send).mockRejectedValue(new MessagingError('CHAT_SEND_OUTCOME_UNKNOWN', true));
  await show(f.props); await click('Accept proposal'); expect((f.savedDraft() as Record<string, unknown>).activityAttempts).toHaveLength(1);
  await act(async () => root.render(null)); vi.resetModules(); const {ProposalCard: ColdCard} = await import('../src/features/messages/proposals/ProposalCard');
  await act(async () => root.render(<ColdCard {...f.props} identity={{...f.identity}} api={{...f.api}}/>));
  await vi.waitFor(() => expect(button('Check conversation')).toBeDefined()); expect(button('Accept proposal')).toBeUndefined(); expect(f.api.send).toHaveBeenCalledOnce();
  const accepted = message(proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: f.digest, conversationId, kind: 'accepted'}), buyer);
  f.setHeld([...f.held(), accepted]); await click('Check conversation'); expect(host.textContent).toContain('You accepted'); expect(f.api.send).toHaveBeenCalledOnce();
  expect((f.savedDraft() as Record<string, unknown>).activityAttempts).toEqual([]); expect((f.savedDraft() as Record<string, unknown>).draft).toEqual(f.proposal.draft);
});

it('refuses an own saved attempt whose native event differs from its exact proposal binding', async () => {
  const f = await fixture(), wrongBody = proposalEventBody({schema: 'bankeiz.chat.proposal-event.v1', proposalId, proposalDigest: 'f'.repeat(64), conversationId, kind: 'accepted'});
  f.setSavedDraft({schema: 'bankeiz.proposal-composer.v1', conversationId, draft: f.proposal.draft, activityAttempts: [{proposalId, proposalDigest: f.digest, actorUserId: buyer, messageId: f.props.message.id, messageBody: f.props.message.body, attempt: {kind: 'accepted', body: wrongBody, beforeIds: [], stage: 'send'}}]});
  await show(f.props); await vi.waitFor(() => expect(host.querySelector('[role="alert"]')).not.toBeNull());
  expect(button('Accept proposal')?.disabled).toBe(true); expect(f.api.send).not.toHaveBeenCalled(); expect(f.api.saveProposalDraft).not.toHaveBeenCalled();
});

it('refuses an over-capacity activity marker without dropping the held composer', async () => {
  const f = await fixture(), composer = {schema: 'bankeiz.proposal-composer.v1', conversationId, draft: f.proposal.draft, memo: 'x'.repeat(31000)};
  expect(new TextEncoder().encode(JSON.stringify(composer)).byteLength).toBeLessThan(32768); f.setSavedDraft(composer);
  await show(f.props); await click('Accept proposal');
  expect(f.api.send).not.toHaveBeenCalled(); expect(f.api.saveProposalDraft).not.toHaveBeenCalled(); expect(f.savedDraft()).toEqual(composer); expect(host.textContent).toContain('full');
});
