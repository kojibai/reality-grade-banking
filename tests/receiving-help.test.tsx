// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ReceivingHelp,ReceivingWorkList,type ReceivingHelpInput} from '../src/features/adoption/ReceivingHelp';
import {createReceivingWork,openReceivingWork,type ReceivingDraft,type ReceivingWork,type ReceivingWorkState} from '../src/adoption/workspace';
import {readReceivingInvitationObject} from '../src/adoption/invitation';
import {saveInvitationSnapshot,invitationSnapshotDigest,invitationSnapshotUrl} from '../src/adoption/invitation-snapshot';
vi.mock('../src/adoption/invitation-snapshot',async original=>({...await original<typeof import('../src/adoption/invitation-snapshot')>(),saveInvitationSnapshot:vi.fn()}));
import type {OpenIdentity} from '../src/receiz/native-identity';

// Keep the real schema, mutation queue and CAS controller; substitute only its
// encrypted storage boundary so the component cannot perform identity or money work.
vi.mock('../src/adoption/workspace',async original=>({...await original<typeof import('../src/adoption/workspace')>(),openReceivingWork:vi.fn()}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:Root,host:HTMLDivElement;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);vi.mocked(openReceivingWork).mockReset();vi.mocked(saveInvitationSnapshot).mockReset();});
afterEach(async()=>{await act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
const initial:ReceivingHelpInput={recipient:'supplier@example.com',recipientUserId:'immutable-recipient-id',recipientUsername:'supplier',amount:'4800.00',purpose:'Private invoice #1048'};
function fixture(){
 let stored:unknown=null,work:ReceivingWork|undefined;
 const load=vi.fn(async()=>structuredClone(stored)),write=vi.fn(async(next:ReceivingWorkState,expected:unknown)=>{if(JSON.stringify(stored)!==JSON.stringify(expected))throw Error('BANK_NOTE_INTENT_CHANGED');stored=structuredClone(next);});
 const knownContacts=vi.fn(()=>[]),knownOrganizer=vi.fn(()=>({knownContacts})),organizer=vi.fn(),messaging=vi.fn(),walletSend=vi.fn(),readWallet=vi.fn(),onPay=vi.fn(),onClose=vi.fn();
 // Presentation-only dependency fixture. No SDK or financial admission guard is mocked.
 const identity={binding:{artifactSha256:'a'.repeat(64)},knownProfile:()=>({displayName:'Restaurant'}),knownOrganizer,organizer,messaging,walletSend,readWallet} as unknown as OpenIdentity;
 vi.mocked(openReceivingWork).mockImplementation(async binding=>{work=await createReceivingWork(binding,{load,save:write});return work;});
 const copy=vi.fn(async(_text:string)=>{}),share=vi.fn(async(_data:ShareData)=>{});vi.stubGlobal('navigator',{clipboard:{writeText:copy},share});
 const publish=vi.mocked(saveInvitationSnapshot).mockImplementation(async value=>{const payload=JSON.stringify(readReceivingInvitationObject(value)),bytes=new TextEncoder().encode(payload);if(bytes.length>12*1024)throw Error('INVITATION_TOO_LARGE');const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');return invitationSnapshotUrl(digest);});
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No network'));
 return{identity,load,write,copy,share,fetch,publish,knownContacts,knownOrganizer,organizer,messaging,walletSend,readWallet,onPay,onClose,
  work:()=>{if(!work)throw Error('Work has not been explicitly opened');return work;},
  render:(savedDraft?:ReceivingDraft)=>act(async()=>root.render(<ReceivingHelp identity={identity} initial={initial} savedDraft={savedDraft} onPay={onPay} onClose={onClose}/>)),
 };
}
function button(label:string){const result=[...host.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent===label||node.getAttribute('aria-label')===label||node.querySelector('strong')?.textContent===label);expect(result,`button ${label}`).toBeDefined();return result!;}
async function click(label:string){await act(async()=>button(label).click());}
function field(label:string){const parent=[...host.querySelectorAll('label')].find(node=>node.querySelector('span')?.textContent===label);expect(parent,`field ${label}`).toBeDefined();return parent!.querySelector<HTMLInputElement|HTMLTextAreaElement>('input,textarea')!;}
async function input(label:string,value:string){const node=field(label),prototype=node instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}
async function review(){await act(async()=>host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await vi.waitFor(async()=>{await act(async()=>{});expect(host.querySelector('.receiving-help')?.getAttribute('aria-busy')).toBe('false');});}
function reviewed(){return readReceivingInvitationObject(vi.mocked(saveInvitationSnapshot).mock.calls.at(-1)![0]);}

it('opens receiving options without storage, organizer discovery, network or financial work',async()=>{
 const f=fixture();await f.render();expect(host.textContent).toContain('Keep your money moving.');
 expect(openReceivingWork).not.toHaveBeenCalled();expect(f.load).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();expect(f.knownOrganizer).not.toHaveBeenCalled();expect(f.knownContacts).not.toHaveBeenCalled();
 for(const operation of [f.fetch,f.organizer,f.messaging,f.walletSend,f.readWallet,f.onPay])expect(operation).not.toHaveBeenCalled();
});
it('saves only on explicit review and excludes private recipient, amount and context from the default shared link',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await input('Invitation message','Ready to pay. Please review this receiving path.');
 expect(openReceivingWork).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();await review();
 expect(f.load).toHaveBeenCalledOnce();expect(f.write).toHaveBeenCalledOnce();expect(f.work().known()[0]).toMatchObject({...initial,message:'Ready to pay. Please review this receiving path.',status:'draft',includeContext:false});
 expect(reviewed()).toEqual({schema:'bankeiz.receiving-invitation.v1',message:'Ready to pay. Please review this receiving path.',senderName:'Restaurant'});
 expect(JSON.stringify(reviewed())).not.toMatch(/supplier@example|immutable-recipient|1048|4800/);expect(f.fetch).not.toHaveBeenCalled();expect(f.onPay).not.toHaveBeenCalled();
});
it('reviews an addressed invitation with the held sender profile and explicitly shared payment details',async()=>{
 const f=fixture();f.identity.username='restaurant';await f.render();await click('Prepare a receiving invitation');
 await input('Address invitation to','Alex · Accounts receivable');
 await act(async()=>field('Include amount and payment context').click());await input('Payment context','Invoice 1048');await review();
 expect(reviewed()).toMatchObject({senderName:'Restaurant',senderUsername:'restaurant',recipientName:'Alex · Accounts receivable',amountUsdCents:'480000',purpose:'Invoice 1048'});
 expect(invitationSnapshotDigest(field('Reviewed invitation link').value)).toMatch(/^[a-f0-9]{64}$/);expect(host.textContent).toContain('To Alex · Accounts receivable');
 expect(JSON.stringify(reviewed())).not.toMatch(/supplier@example|immutable-recipient|Private invoice/);expect(f.fetch).not.toHaveBeenCalled();expect(f.onPay).not.toHaveBeenCalled();
});
it('keeps an oversized Unicode invitation editable instead of saving an unshareable reviewed link',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await input('Invitation message','界'.repeat(4000));await input('Address invitation to','界'.repeat(200));await review();
 expect(host.querySelector('form')).not.toBeNull();expect(host.querySelector('[role=alert]')?.textContent).toContain('shorten');expect(f.write).not.toHaveBeenCalled();
});
it('shares only the amount and context explicitly selected and reviewed by the holder',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await act(async()=>field('Include amount and payment context').click());
 await input('Amount','125.50');await input('Payment context','Reviewed invoice #2048');await review();
 expect(reviewed()).toMatchObject({amountUsdCents:'12550',purpose:'Reviewed invoice #2048'});expect(JSON.stringify(reviewed())).not.toMatch(/supplier@example|immutable-recipient|Private invoice/);
 await click('Copy invitation');expect(f.copy).toHaveBeenCalledOnce();expect(f.work().known()[0].status).toBe('link-copied');expect(f.onPay).not.toHaveBeenCalled();expect(f.walletSend).not.toHaveBeenCalled();
});
it('leaves the durable reviewed draft unchanged after clipboard failure, then records successful copying only',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await review();f.copy.mockRejectedValueOnce(Error('Clipboard unavailable'));
 await click('Copy invitation');expect(f.work().known()[0].status).toBe('draft');expect(f.write).toHaveBeenCalledOnce();expect(host.querySelector('[role=alert]')?.textContent).toContain('Copy is unavailable');
 await click('Copy invitation');expect(f.work().known()[0].status).toBe('link-copied');expect(f.write).toHaveBeenCalledTimes(2);expect(host.textContent).toContain('Invitation link copied.');expect(f.onPay).not.toHaveBeenCalled();
});
it('treats native share cancellation as unchanged and successful handoff as sharing initiated, never delivered',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await review();const cancelled=new Error('Cancelled');cancelled.name='AbortError';f.share.mockRejectedValueOnce(cancelled);
 await click('Share invitation');expect(f.work().known()[0].status).toBe('draft');expect(f.write).toHaveBeenCalledOnce();expect(host.querySelector('[role=alert]')).toBeNull();
 await click('Share invitation');expect(f.work().known()[0].status).toBe('sharing-initiated');expect(f.write).toHaveBeenCalledTimes(2);expect(host.textContent).toContain('Sharing initiated.');expect(host.textContent).not.toMatch(/delivered|payment sent/i);expect(f.onPay).not.toHaveBeenCalled();
});
it('closing or cancelling options performs no save and never begins a payment',async()=>{
 const f=fixture();await f.render();await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label=Close]')!.click());await act(async()=>host.querySelector('dialog')!.dispatchEvent(new Event('cancel',{bubbles:true,cancelable:true})));
 expect(f.onClose).toHaveBeenCalledTimes(2);expect(openReceivingWork).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();expect(f.onPay).not.toHaveBeenCalled();expect(f.walletSend).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();
});
it('reopens the private list and selected draft through the same held controller without another restore',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await review();await click('Copy invitation');
 await act(async()=>root.render(null));const onOpen=vi.fn();await act(async()=>root.render(<ReceivingWorkList identity={f.identity} onOpen={onOpen}/>));
 expect(f.load).toHaveBeenCalledOnce();await act(async()=>{const details=host.querySelector('details')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
 expect(host.textContent).toContain('supplier@example.com');expect(host.textContent).toContain('Link copied');expect(openReceivingWork).toHaveBeenCalledOnce();expect(f.load).toHaveBeenCalledOnce();
 await act(async()=>host.querySelector<HTMLButtonElement>('.receiving-work-row')!.click());expect(onOpen).toHaveBeenCalledOnce();const saved=onOpen.mock.calls[0][0] as ReceivingDraft;
 await f.render(saved);expect(field('Recipient').value).toBe('supplier@example.com');expect(field('Invitation message').value).toBe(saved.message);expect(f.load).toHaveBeenCalledOnce();expect(f.write).toHaveBeenCalledTimes(2);expect(f.fetch).not.toHaveBeenCalled();
});
it('hands explicit Review payment the immutable recipient and amount without invitation text or private context',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await input('Invitation message','Private invitation message');await review();
 await act(async()=>{host.querySelector<HTMLDetailsElement>('.receiving-follow-through')!.open=true;});await click('Review payment');
 expect(f.onPay).toHaveBeenCalledExactlyOnceWith({recipient:'supplier@example.com',recipientUserId:'immutable-recipient-id',recipientUsername:'supplier',amount:'4800.00'});expect(f.onClose).toHaveBeenCalledOnce();
 expect(f.onPay.mock.calls[0][0]).not.toHaveProperty('purpose');expect(f.onPay.mock.calls[0][0]).not.toHaveProperty('message');expect(f.walletSend).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();
});
it.each(['Copy invitation','Share invitation'])('locks editing throughout pending %s and reenables it only after the captured action settles',async action=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await review();
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
 if(action==='Copy invitation')f.copy.mockImplementationOnce(()=>pending);else f.share.mockImplementationOnce(()=>pending);
 try{
  await click(action);expect(f.write).toHaveBeenCalledOnce();
  expect(button('Edit invitation').disabled).toBe(true);await click('Edit invitation');
  expect(host.querySelector('form')).toBeNull();expect(f.work().known()[0].status).toBe('draft');
  await act(async()=>{release();await pending;});
  expect(button('Edit invitation').disabled).toBe(false);expect(f.work().known()[0].status).toBe(action==='Copy invitation'?'link-copied':'sharing-initiated');
  await click('Edit invitation');await input('Invitation message','New message after the sharing result');await review();
  expect(f.work().known()[0].message).toBe('New message after the sharing result');expect(f.onPay).not.toHaveBeenCalled();
 }finally{await act(async()=>{release();await pending;});}
});
it('does not close a newly opened sheet when an older Close invitation save completes after unmount',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await review();
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;}),write=f.write.getMockImplementation()!;
 f.write.mockImplementationOnce(async(next,expected)=>{await pending;return write(next,expected);});
 try{
  await act(async()=>{host.querySelector<HTMLDetailsElement>('.receiving-follow-through')!.open=true;});await click('Close invitation');
  expect(f.write).toHaveBeenCalledTimes(2);expect(f.onClose).not.toHaveBeenCalled();
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label=Close]')!.click());expect(f.onClose).toHaveBeenCalledOnce();
  await act(async()=>root.render(<section aria-label="Newly opened sheet">New sheet remains open</section>));
  await act(async()=>{release();await pending;});
  expect(f.onClose).toHaveBeenCalledOnce();expect(host.querySelector('[aria-label="Newly opened sheet"]')?.textContent).toBe('New sheet remains open');expect(f.onPay).not.toHaveBeenCalled();
 }finally{await act(async()=>{release();await pending;});}
});

it('confirms the copied invitation URL immediately, resets the icon and adds no account read or payment action',async()=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await review();const url=field('Reviewed invitation link').value;
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;}),write=f.write.getMockImplementation()!;f.write.mockImplementationOnce(async(...args)=>{await pending;await write(...args);});
 vi.useFakeTimers();
 try{
  await click('Copy link');expect(f.copy).toHaveBeenCalledExactlyOnceWith(url);expect(button('Link copied').querySelector('.lucide-check')).not.toBeNull();expect(button('Link copied').disabled).toBe(true);
  expect(invitationSnapshotDigest(url)).toMatch(/^[a-f0-9]{64}$/);expect(f.work().known()[0].status).toBe('draft');
  await act(async()=>{release();await pending;});expect(f.work().known()[0].status).toBe('link-copied');
  await act(async()=>{vi.advanceTimersByTime(1600);});expect(button('Copy link').querySelector('.lucide-copy')).not.toBeNull();
  f.copy.mockRejectedValueOnce(Error('Clipboard unavailable'));await click('Copy link');expect(button('Copy link').querySelector('.lucide-check')).toBeNull();
  expect(f.load).toHaveBeenCalledOnce();expect(f.fetch).not.toHaveBeenCalled();expect(f.onPay).not.toHaveBeenCalled();
 }finally{release();vi.useRealTimers();}
});

it.each([
 ['email','supplier@example.com'],
 ['linked account ID','immutable-recipient-id'],
 ['email embedded in a contact label','Supplier <supplier@example.com>'],
])('does not auto-publish a held contact name containing its private %s',async(_kind,name)=>{
 const f=fixture(),contact={id:'held-contact',fullName:name,email:initial.recipient,linkedUserId:initial.recipientUserId,username:initial.recipientUsername};f.knownContacts.mockReturnValue([contact] as never[]);await f.render();await click('Prepare a receiving invitation');
 const select=host.querySelector<HTMLSelectElement>('select')!;await act(async()=>{select.value=contact.id;select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(field('Address invitation to').value).toBe('');expect(field('Recipient').value).toBe(initial.recipient);await review();expect(reviewed()).not.toHaveProperty('recipientName');expect(JSON.stringify(reviewed())).not.toMatch(/supplier@example\.com|immutable-recipient-id/);expect(f.work().known()[0]).toMatchObject({recipient:initial.recipient,recipientUserId:initial.recipientUserId});expect(f.fetch).not.toHaveBeenCalled();expect(f.onPay).not.toHaveBeenCalled();
});
it.each([initial.recipient,initial.recipientUserId!])('keeps a private initial recipient coordinate out of the addressed public name (%s)',async recipientName=>{
 const f=fixture();await act(async()=>root.render(<ReceivingHelp identity={f.identity} initial={{...initial,recipientName}} onPay={f.onPay} onClose={f.onClose}/>));await click('Prepare a receiving invitation');expect(field('Address invitation to').value).toBe('');await input('Address invitation to','Supplier accounts receivable');await review();expect(reviewed().recipientName).toBe('Supplier accounts receivable');expect(JSON.stringify(reviewed())).not.toMatch(/supplier@example\.com|immutable-recipient-id/);expect(f.fetch).not.toHaveBeenCalled();expect(f.onPay).not.toHaveBeenCalled();
});

it.each([initial.recipient,initial.recipientUserId!])('does not publish an old private addressed coordinate when opening savedDraft (%s)',async recipientName=>{
 const f=fixture(),old:ReceivingDraft={...initial,id:'old-private-draft',recipientName,purpose:initial.purpose??'',message:'Receive this payment with its proof.',includeContext:false,status:'draft',followUp:true};await f.render(old);expect(field('Address invitation to').value).toBe('');expect(field('Recipient').value).toBe(initial.recipient);await review();expect(reviewed()).not.toHaveProperty('recipientName');expect(JSON.stringify(reviewed())).not.toMatch(/supplier@example\.com|immutable-recipient-id/);expect(f.onPay).not.toHaveBeenCalled();expect(f.walletSend).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();
});
it.each([initial.recipient,initial.recipientUserId!])('does not publish an old private addressed coordinate adopted through the held draft list (%s)',async recipientName=>{
 const f=fixture();await f.render();await click('Prepare a receiving invitation');await review();const old={...f.work().known()[0]!,recipientName};await f.work().save(old);await act(async()=>root.render(null));await f.render();await act(async()=>{const list=host.querySelector<HTMLDetailsElement>('.receiving-work-list')!;list.open=true;list.dispatchEvent(new Event('toggle'));});await act(async()=>host.querySelector<HTMLButtonElement>('.receiving-work-row')!.click());expect(field('Address invitation to').value).toBe('');expect(field('Recipient').value).toBe(initial.recipient);expect(f.load).toHaveBeenCalledOnce();await review();expect(reviewed()).not.toHaveProperty('recipientName');expect(JSON.stringify(reviewed())).not.toMatch(/supplier@example\.com|immutable-recipient-id/);expect(f.work().known()[0]).toMatchObject({recipient:initial.recipient,recipientUserId:initial.recipientUserId});expect(f.onPay).not.toHaveBeenCalled();expect(f.walletSend).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();
});

it('prepares one short reviewed link, persists its acknowledged digest and reuses it for copy and share',async()=>{const f=fixture();await f.render();expect(f.publish).not.toHaveBeenCalled();await click('Prepare a receiving invitation');expect(f.publish).not.toHaveBeenCalled();expect(button('Prepare invitation')).toBeDefined();await review();const url=field('Reviewed invitation link').value,digest=invitationSnapshotDigest(url);expect(digest).toMatch(/^[a-f0-9]{64}$/);expect(url.length).toBeLessThan(105);expect(f.publish).toHaveBeenCalledOnce();expect(f.work().known()[0]).toMatchObject({publishedDigest:digest});await click('Copy link');expect(f.copy).toHaveBeenCalledWith(url);await click('Share invitation');expect(f.share).toHaveBeenCalledWith(expect.objectContaining({url}));expect(f.publish).toHaveBeenCalledOnce();expect(f.fetch).not.toHaveBeenCalled();expect(f.walletSend).not.toHaveBeenCalled();});

it('keeps a failed public invitation preparation editable and never starts a payment or automatically retries it',async()=>{const f=fixture();await f.render();await click('Prepare a receiving invitation');f.publish.mockRejectedValueOnce(Error('Public display source unavailable'));await review();expect(host.querySelector('form')).not.toBeNull();expect(field('Recipient').value).toBe(initial.recipient);expect(host.querySelector('[role=alert]')?.textContent).toContain('could not be prepared');expect(f.write).not.toHaveBeenCalled();expect(f.publish).toHaveBeenCalledOnce();expect(f.walletSend).not.toHaveBeenCalled();await review();expect(f.publish).toHaveBeenCalledTimes(2);expect(field('Reviewed invitation link')).toBeDefined();expect(f.work().known()[0].publishedDigest).toMatch(/^[a-f0-9]{64}$/);expect(f.load).toHaveBeenCalledOnce();});
