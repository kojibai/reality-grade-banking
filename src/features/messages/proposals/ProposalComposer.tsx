import {lazy,Suspense,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowLeft,ArrowUpRight,Check,Download,FileText,Plus,Sparkles,Trash2} from 'lucide-react';
import {Sheet} from '../../../components/Sheet';
import {formatMoney} from '../../../core/money';
import {proposalTotal,readEditableProposalDraft,readProposalDraft,type ProposalDraft,type ProposalItem} from '../../../receiz/chat-proposal';
import type {ChatProposalWorkspace} from '../../../receiz/chat-proposal-workspace';
import type {ChatMessage} from '../../../receiz/native-messaging';
import './proposal-composer.css';

const Pdf=lazy(()=>import('../../media/ProofPdfReader'));
interface Props {workspace:ChatProposalWorkspace;onClose():void;onSent(message:ChatMessage):void;canDraftWithTwin?:boolean;onTwinRequired?:(request?:string)=>void}
type Action='generate'|'preview'|'send'|'check';
type RawField={raw:string;stored:string};
const notified=new WeakMap<ChatProposalWorkspace,Set<string>>();
function dollars(cents:string){if(!/^(0|[1-9]\d{0,18})$/.test(cents))return'';const value=BigInt(cents);return`${value/100n}.${String(value%100n).padStart(2,'0')}`;}
function cents(value:string):string|null{
 if(value==='')return'';
 if(!/^(?:\d{1,17}(?:\.\d{0,2})?|\.\d{1,2})$/.test(value))return null;
 const [whole,fraction='']=value.split('.');return(BigInt(whole||'0')*100n+BigInt(fraction.padEnd(2,'0'))).toString();
}
function validation(raw:ProposalDraft):{draft:ProposalDraft|null;total:string|null;issue:string}{
 try{const draft=readProposalDraft({...raw,title:raw.title.trim(),summary:raw.summary.trim(),items:raw.items.map(item=>({...item,description:item.description.trim(),quantity:item.quantity.trim()})),deliverables:raw.deliverables.map(value=>value.trim()).filter(Boolean)});return{draft,total:proposalTotal(draft.items),issue:''};}
 catch(cause){return{draft:null,total:null,issue:cause instanceof Error&&cause.message==='PROPOSAL_FRACTIONAL_CENT'?'Line totals must use whole cents. Adjust the quantity or price.':raw.items.some(item=>!item.unitPriceUsdCents)?'Add a price for each item before previewing.':'Complete the title, summary, item descriptions, quantities and prices before previewing.'};}
}
function readableError(error:string){return /^[A-Z][A-Z0-9_:. -]+$/.test(error)?'This draft needs attention. Review the details and try again.':error;}

export function ProposalComposer(props:Props){
 const current=useRef({workspace:props.workspace,generation:0});if(current.current.workspace!==props.workspace)current.current={workspace:props.workspace,generation:current.current.generation+1};
 return <Composer key={current.current.generation} {...props}/>;
}
function Composer({workspace,onClose,onSent,canDraftWithTwin=true,onTwinRequired}:Props){
 const state=useSyncExternalStore(workspace.subscribe,workspace.snapshot,workspace.snapshot),[instruction,setInstruction]=useState(''),[editing,setEditing]=useState(false),[running,setRunning]=useState<Action|null>(null),[localError,setLocalError]=useState('');
 const [prices,setPrices]=useState<Record<number,RawField>>({}),[quantities,setQuantities]=useState<Record<number,RawField>>({}),[deliverables,setDeliverables]=useState<RawField|null>(null),inFlight=useRef(false),alive=useRef(false);
 const [download,setDownload]=useState<{file:File;href:string}|null>(null);
 const draft=state.draft,deliverablesText=deliverables?.stored===draft.deliverables.join('\n')?deliverables.raw:draft.deliverables.join('\n');
 const valid=validation({...draft,items:draft.items.map((row,index)=>({...row,quantity:quantities[index]?.stored===row.quantity?quantities[index].raw:row.quantity})),deliverables:deliverablesText.split('\n')}),prepared=state.proposal?validation(state.proposal.draft):null;
 const busy=!!running||['drafting','preparing','sending'].includes(state.phase),ready=state.phase==='ready'&&!editing&&!!state.proposal&&!!state.pdf&&!!prepared?.draft;
 const pdf=ready?state.pdf:null,href=download?.file===pdf?download?.href:null,kind=draft.kind==='invoice'?'invoice':'proposal';
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  if(!pdf){setDownload(null);return;}
  let url:string;try{url=URL.createObjectURL(pdf);}catch{setLocalError('The PDF download is unavailable. Close this review and open it again.');return;}
  setDownload({file:pdf,href:url});return()=>URL.revokeObjectURL(url);
 },[pdf]);
 useEffect(()=>{
  if(state.phase!=='sent'||!state.sentMessage)return;
  let messages=notified.get(workspace);if(!messages){messages=new Set();notified.set(workspace,messages);}if(messages.has(state.sentMessage.id))return;messages.add(state.sentMessage.id);onSent(state.sentMessage);
 },[workspace,state.phase,state.sentMessage,onSent]);
 async function run(action:Action,operation:()=>Promise<void>){
  if(inFlight.current||busy)return;inFlight.current=true;setRunning(action);setLocalError('');
  try{await operation();}
  catch{if(alive.current)setLocalError(action==='send'?'The chat has not confirmed this send. Check the conversation before trying again.':action==='generate'?'Your Twin could not finish this draft. You can edit the details below.':action==='check'?'The chat could not be checked yet. Check again when you are connected.':'The PDF could not be prepared. Review the details and try again.');}
  finally{inFlight.current=false;if(alive.current)setRunning(null);}
 }
 function update(next:ProposalDraft){setLocalError('');workspace.updateDraft(next);}
 function item(index:number,change:Partial<ProposalItem>){update({...draft,items:draft.items.map((row,at)=>at===index?{...row,...change}:row)});}
 function price(index:number,value:string){const converted=cents(value),stored=converted??'';setPrices(previous=>({...previous,[index]:{raw:value,stored}}));item(index,{unitPriceUsdCents:stored});}
 function quantity(index:number,value:string){let stored=draft.items[index].quantity;try{const next=readEditableProposalDraft({...draft,items:draft.items.map((row,at)=>at===index?{...row,quantity:value}:row)});stored=value;update(next);}catch{setLocalError('');}setQuantities(previous=>({...previous,[index]:{raw:value,stored}}));}
 function changeDeliverables(raw:string){let stored=draft.deliverables.join('\n');try{const next=readEditableProposalDraft({...draft,deliverables:raw.split('\n').map(value=>value.trim()).filter(Boolean)});stored=next.deliverables.join('\n');update(next);}catch{setLocalError('');}setDeliverables({raw,stored});}
 function remove(index:number){if(draft.items.length<=1)return;const shifted=(previous:Record<number,RawField>)=>Object.fromEntries(Object.entries(previous).filter(([key])=>Number(key)!==index).map(([key,value])=>[Number(key)>index?Number(key)-1:Number(key),value]));setPrices(shifted);setQuantities(shifted);update({...draft,items:draft.items.filter((_,at)=>at!==index)});}
 const error=localError||readableError(state.error);
 const preview=()=>void run('preview',async()=>{if(!valid.draft)return;workspace.updateDraft(valid.draft);await workspace.preview();if(alive.current)setEditing(false);});
 return <Sheet title={state.phase==='sent'?'Shared in chat':kind==='invoice'?'Create invoice':'Create proposal'} onClose={onClose} className="bank-proposal-sheet"><div className="bank-proposal-composer">
  <button type="button" className="bank-proposal-back" onClick={onClose}><ArrowLeft size={14} aria-hidden="true"/>Back to chat</button>
  <p className="bank-proposal-client">For <strong>{state.clientName||'this conversation'}</strong></p>
  {state.phase==='unknown'?<section className="bank-proposal-outcome" role="status"><FileText size={25} aria-hidden="true"/><h3>Send not confirmed</h3><p>This {kind} may already be in the conversation. Check chat before creating another.</p><button type="button" className="secondary-button" disabled={busy} onClick={()=>void run('check',()=>workspace.check())}>{running==='check'?'Checking chat…':'Check chat'}</button></section>
   :state.phase==='sent'?<section className="bank-proposal-outcome" role="status"><Check size={25} aria-hidden="true"/><h3>Sent in this chat</h3><p>Your {kind} is part of this conversation. You can return to the messages whenever you’re ready.</p></section>
   :state.phase==='sending'?<section className="bank-proposal-outcome" role="status"><FileText size={25} aria-hidden="true"/><h3>Sending your {kind}…</h3><p>Waiting for the conversation to confirm it.</p></section>
   :ready&&state.proposal?<>
    <article className="bank-proposal-preview" aria-label={kind==='invoice'?'Invoice preview':'Proposal preview'}><div className="bank-proposal-document-type"><FileText size={14} aria-hidden="true"/>{kind==='invoice'?'Invoice':'Proposal'}</div><h3>{state.proposal.draft.title}</h3><p className="bank-proposal-preview-issuer">{state.proposal.issuer.name} · @{state.proposal.issuer.username}</p><p className="bank-proposal-prewrap">{state.proposal.draft.summary}</p>{state.proposal.branding&&<div className="bank-proposal-parties"><section><h4>From {state.proposal.branding.issuerName}</h4><p className="bank-proposal-prewrap">{state.proposal.branding.issuerDetails}</p></section><section><h4>{kind==='invoice'?'Bill to':'Prepared for'} {state.proposal.branding.clientName}</h4><p className="bank-proposal-prewrap">{state.proposal.branding.clientDetails}</p></section></div>}
     <table><thead><tr><th scope="col">Scope</th><th scope="col">Qty</th><th scope="col">Unit price</th></tr></thead><tbody>{state.proposal.draft.items.map((row,index)=><tr key={index}><td>{row.description}</td><td>{row.quantity}</td><td>{formatMoney(row.unitPriceUsdCents)}</td></tr>)}</tbody></table>
     <div className="bank-proposal-total"><span>Total · USD</span><strong>{prepared?.total?formatMoney(prepared.total):''}</strong></div>
     {!!state.proposal.draft.deliverables.length&&<section><h4>Deliverables</h4><ul>{state.proposal.draft.deliverables.map((value,index)=><li key={index}>{value}</li>)}</ul></section>}
     {state.proposal.draft.timeline&&<section><h4>Timeline</h4><p className="bank-proposal-prewrap">{state.proposal.draft.timeline}</p></section>}{state.proposal.draft.terms&&<section><h4>Terms</h4><p className="bank-proposal-prewrap">{state.proposal.draft.terms}</p></section>}
    </article>
    {href&&<details className="bank-proposal-generated-pdf" open><summary>Branded PDF</summary><Suspense fallback={<p role="status">Opening PDF…</p>}><Pdf url={href} title={state.proposal.draft.title}/></Suspense></details>}
    <div className="bank-proposal-review-tools"><button type="button" disabled={busy} onClick={()=>setEditing(true)}>Edit details</button>{href&&pdf&&<a href={href} download={pdf.name}><Download size={14} aria-hidden="true"/>Download draft PDF</a>}</div>
    <p className="bank-proposal-note">{state.proposal.source.hasEarlier?'Your Twin uses recent excerpts; the full history stays in this chat. ':''}Review the scope, prices and terms before sharing.</p><button type="button" className="primary-button" disabled={busy} onClick={()=>void run('send',()=>workspace.send())}>Send {kind}<ArrowUpRight size={16} aria-hidden="true"/></button>
   </>:<>
    {state.branding&&<details className="bank-proposal-instructions"><summary>From {state.branding.issuerName} · {state.branding.clientName?'To '+state.branding.clientName:'Add recipient'}</summary><p className="bank-proposal-note">Prefilled from held profile and matching contact details. Review every detail; missing information stays blank.</p><div className="bank-proposal-parties"><label className="bank-proposal-field"><span>Your business</span><input aria-label="Your business name" maxLength={160} value={state.branding.issuerName} disabled={busy} onChange={event=>workspace.updateBranding({...state.branding!,issuerName:event.target.value})}/></label><label className="bank-proposal-field"><span>Addressed to</span><input aria-label="Recipient name" maxLength={160} value={state.branding.clientName} disabled={busy} onChange={event=>workspace.updateBranding({...state.branding!,clientName:event.target.value})}/></label><label className="bank-proposal-field"><span>Business details</span><textarea aria-label="Business details" maxLength={1200} rows={3} value={state.branding.issuerDetails} disabled={busy} onChange={event=>workspace.updateBranding({...state.branding!,issuerDetails:event.target.value})}/></label><label className="bank-proposal-field"><span>Recipient details</span><textarea aria-label="Recipient details" maxLength={1200} rows={3} value={state.branding.clientDetails} disabled={busy} onChange={event=>workspace.updateBranding({...state.branding!,clientDetails:event.target.value})}/></label></div></details>}
    <div className="bank-proposal-draft-tools"><label className="bank-proposal-field"><span>Document type</span><select aria-label="Document type" value={draft.kind} disabled={busy} onChange={event=>update({...draft,kind:event.target.value as ProposalDraft['kind']})}><option value="proposal">Proposal</option><option value="invoice">Invoice</option></select></label>
     <button type="button" className="bank-proposal-twin" disabled={busy||!state.sourceCount} onClick={()=>{if(!canDraftWithTwin){onTwinRequired?.(instruction.trim()||'Draft a '+draft.kind+' for '+state.clientName);return;}setPrices({});setQuantities({});setDeliverables(null);void run('generate',()=>workspace.generate(draft.kind,instruction.trim()||undefined));}}><Sparkles size={16} aria-hidden="true"/>Draft with your Twin</button>
    </div>
    <p className="bank-proposal-note">{state.sourceCount?`${state.sourceCount} recent messages available for your Twin.`:'No messages are available to draft from. You can write the details below.'}{state.hasEarlier?' Your Twin uses recent excerpts; the full history stays in this chat.':''}</p>
    <details className="bank-proposal-instructions"><summary>Add instructions for your Twin</summary><label className="bank-proposal-field"><span>What should the draft focus on?</span><textarea aria-label="Instructions for your Twin" value={instruction} onChange={event=>setInstruction(event.target.value)} disabled={busy} rows={2} maxLength={400}/></label></details>
    {['drafting','preparing'].includes(state.phase)&&<p className="bank-proposal-progress" role="status">{state.phase==='drafting'?'Your Twin is preparing a draft…':'Preparing your PDF preview…'}</p>}
    <div className="bank-proposal-editor"><label className="bank-proposal-field"><span>Title</span><input aria-label="Title" value={draft.title} onChange={event=>update({...draft,title:event.target.value})} disabled={busy} maxLength={160}/></label><label className="bank-proposal-field"><span>Summary</span><textarea aria-label="Summary" value={draft.summary} onChange={event=>update({...draft,summary:event.target.value})} disabled={busy} maxLength={2000} rows={3}/></label>
     <section className="bank-proposal-items" aria-label="Line items"><h3>Scope and pricing</h3>{draft.items.map((row,index)=><fieldset key={index} className="bank-proposal-item" disabled={busy}><legend>Item {index+1}</legend><button type="button" className="bank-proposal-remove" disabled={draft.items.length<=1} aria-label={`Remove item ${index+1}`} onClick={()=>remove(index)}><Trash2 size={14}/></button><label className="bank-proposal-field"><span>Description</span><textarea aria-label={`Item ${index+1} description`} rows={2} maxLength={500} value={row.description} onChange={event=>item(index,{description:event.target.value})}/></label><div className="bank-proposal-item-pricing"><label className="bank-proposal-field"><span>Quantity</span><input aria-label={`Item ${index+1} quantity`} inputMode="decimal" value={quantities[index]?.stored===row.quantity?quantities[index].raw:row.quantity} maxLength={13} onChange={event=>quantity(index,event.target.value)}/></label><label className="bank-proposal-field"><span>Unit price · USD</span><input aria-label={`Item ${index+1} price in USD`} inputMode="decimal" autoComplete="off" placeholder="Price in USD" value={prices[index]?.stored===row.unitPriceUsdCents?prices[index].raw:dollars(row.unitPriceUsdCents)} maxLength={24} onChange={event=>price(index,event.target.value)}/></label></div></fieldset>)}
      <button type="button" className="bank-proposal-add" disabled={busy||draft.items.length>=40} onClick={()=>{if(draft.items.length<40)update({...draft,items:[...draft.items,{description:'',quantity:'1',unitPriceUsdCents:''}]});}}><Plus size={15} aria-hidden="true"/>Add item</button>
     </section>
     <div className="bank-proposal-total" aria-live="polite"><span>Total · USD</span><strong>{valid.total?formatMoney(valid.total):'Add details and prices'}</strong></div>
     <label className="bank-proposal-field"><span>Deliverables · one per line</span><textarea aria-label="Deliverables" value={deliverablesText} onChange={event=>changeDeliverables(event.target.value)} disabled={busy} maxLength={12024} rows={3}/></label><label className="bank-proposal-field"><span>Timeline</span><textarea aria-label="Timeline" value={draft.timeline} onChange={event=>update({...draft,timeline:event.target.value})} disabled={busy} maxLength={1000} rows={2}/></label><label className="bank-proposal-field"><span>Terms</span><textarea aria-label="Terms" value={draft.terms} onChange={event=>update({...draft,terms:event.target.value})} disabled={busy} maxLength={6000} rows={4}/></label>
    </div>
    {valid.issue&&<p className="bank-proposal-note" role="status">{valid.issue}</p>}<button type="button" className="primary-button" disabled={busy||!valid.draft} onClick={preview}>Preview PDF<FileText size={16} aria-hidden="true"/></button>
   </>}
  {error&&<p className="bank-proposal-error" role="alert">{error}</p>}
 </div></Sheet>;
}
