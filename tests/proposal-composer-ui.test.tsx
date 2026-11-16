// @vitest-environment happy-dom
import {vi as pdfUiVi} from 'vitest';
pdfUiVi.mock('../src/features/media/ProofPdfReader',()=>({default:({title}:{title:string})=><div>PDF reader · {title}</div>}));
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ProposalComposer} from '../src/features/messages/proposals/ProposalComposer';
import type {ChatProposalWorkspace,ChatProposalWorkspaceState} from '../src/receiz/chat-proposal-workspace';
import {proposalTotal,readEditableProposalDraft,type ProposalDraft,type ChatProposal} from '../src/receiz/chat-proposal';
import type {ChatMessage} from '../src/receiz/native-messaging';
import composerCss from '../src/features/messages/proposals/proposal-composer.css?inline';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const owner='11111111-1111-4111-8111-111111111111',buyer='22222222-2222-4222-8222-222222222222',thread='33333333-3333-4333-8333-333333333333',proposalId='44444444-4444-4444-8444-444444444444';
const initialDraft:ProposalDraft={kind:'proposal',title:'Website refresh',summary:'A focused website and launch plan.',items:[{description:'Design and development',quantity:'1.5',unitPriceUsdCents:'25000'},{description:'Launch support',quantity:'1',unitPriceUsdCents:'5000'}],deliverables:['Responsive website','Editable source files'],timeline:'First review in two weeks.',terms:'One revision included.'};
const sentMessage:ChatMessage={id:'55555555-5555-4555-8555-555555555555',conversationId:thread,senderUserId:owner,senderKind:'user',senderAiId:null,senderDisplay:'Maya',body:'Shared proposal',createdAt:'2026-11-15T22:00:00.000Z',receizedAt:'2026-11-15T22:00:00.000Z',receipt:null,sealedOriginalAvailable:false};
function proposal(draft:ProposalDraft):ChatProposal{return{schema:'bankeiz.chat.proposal.v1',id:proposalId,conversationId:thread,createdAt:'2026-11-15T21:00:00.000Z',issuer:{userId:owner,name:'Maya Studio',username:'mayastudio',email:'maya@example.com'},recipients:[buyer],draft,source:{messageIds:[sentMessage.id],digest:'a'.repeat(64),hasEarlier:true},fixedSale:{schema:'bank.fixed-checkout.v1',saleId:proposalId,recipientUserId:owner,username:'mayastudio',currency:'usd',amountUsdCents:proposalTotal(draft.items),digest:'b'.repeat(64)}};}
function syntheticWorkspace(override:Partial<ChatProposalWorkspaceState>={}){
 let state:ChatProposalWorkspaceState={phase:'idle',draft:structuredClone(initialDraft),proposal:null,pdf:null,sentMessage:null,error:'',clientName:'Jordan Chen',sourceCount:12,hasEarlier:true,...override};
 const listeners=new Set<()=>void>(),calls={generate:[] as Array<{kind:'proposal'|'invoice';instruction?:string}>,preview:0,send:0,check:0};
 const emit=(change:Partial<ChatProposalWorkspaceState>)=>{state={...state,...change};for(const notify of listeners)notify();};
 const workspace:ChatProposalWorkspace={subscribe(listener){listeners.add(listener);return()=>{listeners.delete(listener);};},snapshot:()=>state,
  updateDraft(draft){try{emit({phase:'review',draft:readEditableProposalDraft(draft),proposal:null,pdf:null,error:''});}catch{emit({error:'Review the draft details.'});}},
  updateBranding(branding){emit({branding,phase:'review',proposal:null,pdf:null});},
  async generate(kind,instruction){calls.generate.push({kind,instruction});emit({phase:'drafting'});await Promise.resolve();emit({phase:'review',draft:{...state.draft,kind,title:'Drafted website scope'}});},
  async preview(){calls.preview++;emit({phase:'preparing'});await Promise.resolve();emit({phase:'ready',proposal:{...proposal(state.draft),...state.branding?{branding:state.branding}:{}},pdf:new File(['%PDF-1.7 synthetic UI preview'],'website-proposal.pdf',{type:'application/pdf'})});},
  async send(){calls.send++;emit({phase:'sending'});await Promise.resolve();emit({phase:'sent',sentMessage});},
  async check(){calls.check++;await Promise.resolve();},
 };
 return{workspace,calls,emit};
}
let host:HTMLDivElement,root:Root,style:HTMLStyleElement,files:Array<Blob|MediaSource>,revoked:string[];
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);style=document.createElement('style');style.textContent=composerCss;document.head.append(style);files=[];revoked=[];vi.spyOn(URL,'createObjectURL').mockImplementation(file=>{files.push(file);return'blob:proposal-preview-'+files.length;});vi.spyOn(URL,'revokeObjectURL').mockImplementation(url=>{revoked.push(url);});});
afterEach(()=>{act(()=>root.unmount());host.remove();style.remove();vi.restoreAllMocks();});
async function show(workspace:ChatProposalWorkspace,onClose=()=>{},onSent:((message:ChatMessage)=>void)=()=>{}){await act(async()=>root.render(<ProposalComposer workspace={workspace} onClose={onClose} onSent={onSent}/>));}
function button(label:string){return[...host.querySelectorAll<HTMLButtonElement>('button')].find(value=>value.textContent?.trim()===label)!;}
async function click(label:string){await act(async()=>button(label).click());}
async function fill(label:string,value:string){await act(async()=>{const input=host.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[aria-label="${label}"]`)!;const prototype=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}

it('reviews and edits exact contact addressing on proposals and invoices without asking the Twin',async()=>{const branding={issuerName:'Maya Studio',issuerDetails:'hello@example.test',clientName:'Mira Chen',clientDetails:'Mira Studio\nNew York'},port=syntheticWorkspace({branding});await show(port.workspace);expect(host.textContent).toContain('From Maya Studio · To Mira Chen');expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Recipient details"]')?.value).toBe(branding.clientDetails);await fill('Recipient details','Mira Studio\nRevised address');expect(port.workspace.snapshot().branding?.clientDetails).toBe('Mira Studio\nRevised address');await click('Preview PDF');expect(host.querySelector('[aria-label="Proposal preview"]')?.textContent).toContain('Revised address');expect(port.calls.generate).toEqual([]);expect(port.calls.send).toBe(0);});

it('opens the retained editable draft without generating, preparing or sending on mount or reopen',async()=>{
 const port=syntheticWorkspace();await show(port.workspace);expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')!.value).toBe('Website refresh');expect(host.textContent).toContain('Jordan Chen');expect(host.textContent).toContain('12');expect(host.textContent).toContain('full history');expect(host.querySelector('a[download]')).toBeNull();expect(button('Send proposal')).toBeUndefined();
 await fill('Terms','Two revisions included.');await act(async()=>root.render(null));await show(port.workspace);expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Terms"]')!.value).toBe('Two revisions included.');expect(port.calls).toEqual({generate:[],preview:0,send:0,check:0});
});

it('drafts once only after the owner asks and leaves the result editable for review',async()=>{
 const port=syntheticWorkspace();await show(port.workspace);expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Instructions for your Twin"]')!.maxLength).toBe(400);await fill('Instructions for your Twin','Focus on the launch.');await click('Draft with your Twin');expect(port.calls.generate).toEqual([{kind:'proposal',instruction:'Focus on the launch.'}]);expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')!.value).toBe('Drafted website scope');expect(port.calls.preview).toBe(0);expect(port.calls.send).toBe(0);expect(button('Send proposal')).toBeUndefined();
});

it('keeps prices exact and refuses an empty, exponential or overprecision amount instead of inventing a total',async()=>{
 const port=syntheticWorkspace();await show(port.workspace);expect(host.textContent).toContain('$425.00');
 for(const raw of ['','1e2','12.345']){await fill('Item 1 price in USD',raw);expect(port.workspace.snapshot().draft.items[0].unitPriceUsdCents).toBe('');expect(button('Preview PDF').disabled).toBe(true);expect(host.textContent).not.toContain('$425.00');}
 await fill('Item 1 price in USD','120.04');expect(port.workspace.snapshot().draft.items[0].unitPriceUsdCents).toBe('12004');expect(host.textContent).toContain('$230.06');expect(button('Preview PDF').disabled).toBe(false);
 await fill('Item 1 quantity','0.001');expect(button('Preview PDF').disabled).toBe(true);expect(host.textContent).toContain('whole cents');expect(port.calls.preview).toBe(0);
});

it('requires a prepared review before an explicit send and downloads the actual PDF draft',async()=>{
 const port=syntheticWorkspace(),recorded:ChatMessage[]=[];await show(port.workspace,()=>{},message=>recorded.push(message));expect(button('Send proposal')).toBeUndefined();await click('Preview PDF');expect(port.calls.preview).toBe(1);expect(port.calls.send).toBe(0);
 expect(host.querySelector('[aria-label="Proposal preview"]')?.textContent).toContain('Editable source files');expect(host.textContent).toContain('One revision included.');expect(host.textContent).toContain('full history');const download=host.querySelector<HTMLAnchorElement>('a[download]')!;expect(download.href).toBe('blob:proposal-preview-1');expect(download.download).toBe('website-proposal.pdf');expect(files[0]).toBe(port.workspace.snapshot().pdf);expect(host.textContent).not.toContain('Verified proof');
 await click('Send proposal');expect(port.calls.send).toBe(1);expect(recorded).toEqual([sentMessage]);expect(host.textContent).toContain('Sent in this chat');expect(host.querySelector('dialog')?.open).toBe(true);
 await act(async()=>root.render(null));await show(port.workspace,()=>{},message=>recorded.push(message));expect(recorded).toHaveLength(1);expect(port.calls.send).toBe(1);
});

it('editing prepared terms removes send permission and revokes the old PDF until another preview',async()=>{
 const port=syntheticWorkspace();await show(port.workspace);await click('Preview PDF');await click('Edit details');await fill('Terms','Payment after delivery.');expect(button('Send proposal')).toBeUndefined();expect(host.querySelector('a[download]')).toBeNull();expect(revoked).toContain('blob:proposal-preview-1');expect(port.workspace.snapshot().proposal).toBeNull();expect(port.workspace.snapshot().draft.terms).toBe('Payment after delivery.');await click('Preview PDF');expect(host.textContent).toContain('Payment after delivery.');expect(port.calls.preview).toBe(2);expect(port.calls.send).toBe(0);
});

it('checks an uncertain send without offering a retry or exposing editing and generation',async()=>{
 const port=syntheticWorkspace({phase:'unknown',proposal:proposal(initialDraft)});await show(port.workspace);expect(host.textContent).toContain('not confirmed');expect(button('Send proposal')).toBeUndefined();expect(button('Draft with your Twin')).toBeUndefined();expect(host.querySelector('input')).toBeNull();await click('Check chat');expect(port.calls.check).toBe(1);expect(port.calls.send).toBe(0);
 await act(async()=>root.render(null));await show(port.workspace);expect(port.calls.check).toBe(1);expect(port.calls.send).toBe(0);
});

it('preserves back and close behavior, restores chat focus and keeps mobile fields at readable input size',async()=>{
 const port=syntheticWorkspace(),opener=document.createElement('button');opener.textContent='Open proposal';document.body.append(opener);opener.focus();let closes=0;
 try{await show(port.workspace,()=>{closes++;});for(const input of host.querySelectorAll('input,textarea,select'))expect(Number.parseFloat(getComputedStyle(input).fontSize)).toBeGreaterThanOrEqual(16);await click('Back to chat');expect(closes).toBe(1);expect(port.calls.send).toBe(0);await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click());expect(closes).toBe(2);await act(async()=>root.render(null));expect(document.activeElement).toBe(opener);}finally{opener.remove();}
});

it('bounds line items and keeps a newly added price blank',async()=>{
 const port=syntheticWorkspace({draft:{...initialDraft,items:Array.from({length:39},(_,index)=>({description:'Item '+index,quantity:'1',unitPriceUsdCents:'100'}))}});await show(port.workspace);await click('Add item');expect(port.workspace.snapshot().draft.items).toHaveLength(40);expect(host.querySelector<HTMLInputElement>('[aria-label="Item 40 price in USD"]')!.value).toBe('');expect(button('Add item').disabled).toBe(true);await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Remove item 40"]')!.click());expect(port.workspace.snapshot().draft.items).toHaveLength(39);expect(button('Add item').disabled).toBe(false);
});

it('offers a manual draft when no messages are available without claiming access to earlier chat history',async()=>{
 const port=syntheticWorkspace({sourceCount:0,hasEarlier:false});await show(port.workspace);expect(button('Draft with your Twin').disabled).toBe(true);expect(host.textContent).toContain('No messages');expect(host.querySelector('[aria-label="Title"]')).not.toBeNull();expect(port.calls.generate).toEqual([]);
});

it('lets the owner replace a quantity and write multiline deliverables against the real editable draft contract',async()=>{
 const port=syntheticWorkspace();await show(port.workspace);await fill('Item 1 quantity','');expect(host.querySelector<HTMLInputElement>('[aria-label="Item 1 quantity"]')!.value).toBe('');expect(button('Preview PDF').disabled).toBe(true);await fill('Item 1 quantity','2');expect(port.workspace.snapshot().draft.items[0].quantity).toBe('2');expect(host.textContent).toContain('$550.00');
 await fill('Deliverables','Scope review\n');expect(host.querySelector<HTMLTextAreaElement>('[aria-label="Deliverables"]')!.value).toBe('Scope review\n');await fill('Deliverables','Scope review\nEditable files');expect(port.workspace.snapshot().draft.deliverables).toEqual(['Scope review','Editable files']);expect(button('Preview PDF').disabled).toBe(false);
});

it('preserves a dollar price beyond JavaScript integer precision through the exact draft total',async()=>{
 const port=syntheticWorkspace();await show(port.workspace);await fill('Item 1 quantity','1');await fill('Item 1 price in USD','90071992547409.93');expect(port.workspace.snapshot().draft.items[0].unitPriceUsdCents).toBe('9007199254740993');expect(host.textContent).toContain('$90,071,992,547,459.93');expect(button('Preview PDF').disabled).toBe(false);
});

it('uses the selected invoice kind for generation, review and explicit sharing',async()=>{
 const port=syntheticWorkspace();await show(port.workspace);await act(async()=>{const select=host.querySelector<HTMLSelectElement>('[aria-label="Document type"]')!;select.value='invoice';select.dispatchEvent(new Event('change',{bubbles:true}));});await click('Draft with your Twin');expect(port.calls.generate[0].kind).toBe('invoice');await click('Preview PDF');expect(host.querySelector('[aria-label="Invoice preview"]')).not.toBeNull();expect(button('Send invoice')).not.toBeUndefined();expect(port.calls.send).toBe(0);
});

it('keeps another workspace’s late preparation from changing the current chat or calling its sent callback',async()=>{
 const first=syntheticWorkspace(),second=syntheticWorkspace(),recorded:ChatMessage[]=[];let finish!:()=>void;
 first.workspace.preview=async()=>{first.calls.preview++;first.emit({phase:'preparing'});await new Promise<void>(resolve=>{finish=resolve;});first.emit({phase:'sent',sentMessage});};
 await show(first.workspace,()=>{},message=>recorded.push(message));await click('Preview PDF');
 await show(second.workspace,()=>{},message=>recorded.push(message));await act(async()=>finish());expect(recorded).toEqual([]);expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')!.value).toBe('Website refresh');expect(second.calls).toEqual({generate:[],preview:0,send:0,check:0});
});
it('keeps the proposal manually editable and preserves the Twin request as an upgrade intent for free users',async()=>{const p=syntheticWorkspace(),upgrade=vi.fn();await act(async()=>root.render(<ProposalComposer workspace={p.workspace} onClose={()=>{}} onSent={()=>{}} canDraftWithTwin={false} onTwinRequired={upgrade}/>));await click('Draft with your Twin');expect(upgrade).toHaveBeenCalledOnce();expect(p.calls.generate).toHaveLength(0);expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')?.disabled).toBe(false);});
