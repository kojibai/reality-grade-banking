import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,Copy,Landmark,Mail,Share2} from 'lucide-react';
import {Sheet} from '../../components/Sheet';
import type {OpenIdentity} from '../../receiz/native-identity';
import {bankOperationDollars} from '../../receiz/bank-operations';
import {formatMoney} from '../../core/money';
import {RECEIVING_MESSAGE,institutionRequest,type ReceivingInvitation} from '../../adoption/invitation';
import {saveInvitationSnapshot,invitationSnapshotDigest,invitationSnapshotUrl} from '../../adoption/invitation-snapshot';
import {openReceivingWork,type ReceivingDraft,type ReceivingWork} from '../../adoption/workspace';
import './receiving-help.css';

export type ReceivingPaymentInput={recipient:string;recipientUserId?:string;recipientUsername?:string;amount:string};
export type ReceivingHelpInput=ReceivingPaymentInput&{purpose?:string;recipientName?:string};
const workByIdentity=new WeakMap<OpenIdentity,Promise<ReceivingWork>>();
function workFor(identity:OpenIdentity){
 let work=workByIdentity.get(identity);
 if(!work){work=openReceivingWork(identity.binding);workByIdentity.set(identity,work);void work.catch(()=>{if(workByIdentity.get(identity)===work)workByIdentity.delete(identity);});}
 return work;
}
function addressedName(name:string|undefined,...coordinates:(string|undefined)[]){const value=name?.trim();return value&&!/\S+@\S+\.\S+/.test(value)&&!coordinates.some(coordinate=>coordinate&&value.toLowerCase()===coordinate.trim().toLowerCase())?value:undefined;}
function reviewedDraft(draft:ReceivingDraft):ReceivingDraft{const recipientName=addressedName(draft.recipientName,draft.recipient,draft.recipientUserId);return recipientName===draft.recipientName?draft:{...draft,recipientName};}
function draftFor(initial:ReceivingHelpInput):ReceivingDraft{const recipientName=addressedName(initial.recipientName,initial.recipient,initial.recipientUserId);return{id:crypto.randomUUID(),recipient:initial.recipient,amount:initial.amount,purpose:initial.purpose??'',message:RECEIVING_MESSAGE,...(recipientName?{recipientName}:{}),includeContext:false,followUp:true,status:'draft',...(initial.recipientUserId?{recipientUserId:initial.recipientUserId,recipientUsername:initial.recipientUsername}: {})};}
const statusLabel=(draft:ReceivingDraft)=>draft.status==='link-copied'?'Link copied':draft.status==='sharing-initiated'?'Sharing initiated':draft.status==='closed'?'Closed':draft.status==='declined'?'Declined':'Draft';
function invitationFor(draft:ReceivingDraft,senderName?:string,senderUsername?:string):ReceivingInvitation{
 const result:ReceivingInvitation={schema:'bankeiz.receiving-invitation.v1',message:draft.message,...(senderName?{senderName}:{}),...(senderUsername?{senderUsername}:{}),...(draft.recipientName?.trim()?{recipientName:draft.recipientName.trim()}:{}),...(draft.institution?{institution:draft.institution}:{})};
 if(draft.includeContext){if(draft.amount)result.amountUsdCents=bankOperationDollars(draft.amount);if(draft.purpose.trim())result.purpose=draft.purpose.trim();}
 return result;
}
function knownContacts(identity:OpenIdentity){try{return identity.knownOrganizer?.()?.knownContacts()??identity.knownOrganizerDisplay?.()?.contacts??[];}catch{return[];}}

/** Only explicit help/draft actions open private work. Ordinary Send never reads it. */
export function ReceivingWorkList({identity,onOpen}:{identity:OpenIdentity;onOpen(draft:ReceivingDraft):void}){
 const [rows,setRows]=useState<ReceivingDraft[]|null>(null),[error,setError]=useState(''),alive=useRef(true),reading=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const read=()=>{if(reading.current)return;reading.current=true;setError('');void workFor(identity).then(work=>{if(alive.current)setRows(work.known());}).catch(()=>{if(alive.current)setError('Saved invitations could not be opened. Your payment flow is available.');}).finally(()=>{reading.current=false;});};
 return <details className="receiving-work-list" onToggle={event=>{if(event.currentTarget.open)read();}}><summary>Receiving invitations</summary>
  <p className="body-copy small-copy">Your private drafts and next steps.</p>
  {rows===null&&!error&&<p role="status" className="small-copy">Opening saved invitations…</p>}
  {rows?.length===0&&<p className="body-copy small-copy">Invitations you save appear here.</p>}
  {rows?.map(draft=><button type="button" key={draft.id} className="receiving-work-row" onClick={()=>onOpen(draft)}><span><strong>{draft.recipientName||draft.institution?.name||draft.recipient||'Receiving invitation'}</strong><small>{statusLabel(draft)}{draft.reportedResponse?` · Recipient ${draft.reportedResponse==='ready'?'reported ready':'reported declined'}`:''}</small></span><ArrowUpRight size={16}/></button>)}
  {error&&<p role="status" className="small-copy">{error} <button type="button" className="text-button" onClick={read}>Try again</button></p>}
 </details>;
}

export function ReceivingHelp({identity,initial,savedDraft,onPay,onClose,active=true}:{identity:OpenIdentity;active?:boolean;initial:ReceivingHelpInput;savedDraft?:ReceivingDraft;onPay(input:ReceivingPaymentInput):void;onClose():void}){
 const [draft,setDraft]=useState<ReceivingDraft>(()=>savedDraft?reviewedDraft(savedDraft):draftFor(initial));
 const [{name:sender,username:senderUsername}]=useState(()=>{const username=identity.accountUsername?.()??identity.username,name=identity.knownProfile?.()?.displayName?.trim()||username;return{name:name?.slice(0,120),username:typeof username==='string'&&/^[a-z0-9_]{3,24}$/.test(username)?username:undefined};});
 const [page,setPage]=useState<'options'|'edit'|'ready'>(()=>savedDraft?'edit':'options');
 const [saved,setSaved]=useState<ReceivingDraft|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[showLink,setShowLink]=useState(false);
 const alive=useRef(true),running=useRef(false),sharing=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const edit=(next:Partial<ReceivingDraft>)=>{setDraft(value=>({...value,...next,status:'draft'}));setSaved(null);setNotice('');};
 const save=async(next:ReceivingDraft,prepared?:ReceivingInvitation)=>{
  if(running.current)return false;running.current=true;setBusy(true);setError('');let writing=false;
  try{const work=await workFor(identity);if(prepared){const url=await saveInvitationSnapshot(prepared,fetch,next.publishedDigest);next={...next,publishedDigest:invitationSnapshotDigest(url)!};}writing=true;await work.save(next);if(alive.current){setDraft(next);setSaved(next);}return alive.current;}
  catch(cause){if(writing)workByIdentity.delete(identity);if(alive.current)setError(prepared&&cause instanceof Error&&['RECEIVING_INVITATION_INVALID','INVITATION_TOO_LARGE'].includes(cause.message)?'Check the amount or shorten your invitation before continuing.':prepared?'This invitation link could not be prepared. Keep your draft here and try again.':'This invitation could not be saved. Keep your draft here and try again.');return false;}
  finally{running.current=false;if(alive.current)setBusy(false);}
 };
 const review=async()=>{try{const invitation=invitationFor(draft,sender,senderUsername);if(await save({...draft,status:'draft'},invitation)){if(alive.current)setPage('ready');}}catch{setError('Check the amount or shorten your invitation before continuing.');}};
 const link=saved?.publishedDigest?invitationSnapshotUrl(saved.publishedDigest):'';
 const shareText=(value:ReceivingDraft)=>value.institution?institutionRequest(value.institution.name,value.institution.id):value.message;
 const copied=async(linkOnly=false)=>{
  if(!saved||!link||running.current||sharing.current)return;const current=saved;sharing.current=true;setBusy(true);setError('');
  try{await navigator.clipboard.writeText(linkOnly?link:shareText(current)+'\n\n'+link);if(!alive.current)return;if(await save({...current,status:'link-copied'}))setNotice('Invitation link copied.');}
  catch{if(alive.current){setShowLink(true);setError('Copy is unavailable. Select the invitation link below.');}}
  finally{sharing.current=false;if(alive.current)setBusy(false);}
 };
 const share=async()=>{
  if(!saved||!link||running.current||sharing.current)return;const current=saved;sharing.current=true;setBusy(true);setError('');
  // Invoke from the user's gesture before local persistence or another await.
  try{await navigator.share({title:'Receiving money',text:shareText(current),url:link});if(!alive.current)return;if(await save({...current,status:'sharing-initiated'}))setNotice('Sharing initiated.');}
  catch(cause){if(alive.current&&!(cause instanceof Error&&cause.name==='AbortError'))setError('Sharing is unavailable. You can copy the reviewed invitation.');}
  finally{sharing.current=false;if(alive.current)setBusy(false);}
 };
 const pay=()=>{onPay({recipient:draft.recipient,amount:draft.amount,...(draft.recipientUserId?{recipientUserId:draft.recipientUserId,recipientUsername:draft.recipientUsername}:{})});onClose();};
 const contacts=page==='edit'?knownContacts(identity):[];
 return <Sheet active={active} title="Help someone receive" onClose={onClose} className="receiving-help-sheet"><section className="receiving-help" aria-busy={busy}>
  {page!=='options'&&<button className="text-button receiving-back" type="button" disabled={busy} onClick={()=>{setPage('options');setError('');}}><ArrowLeft size={15}/>Receiving options</button>}
  {page==='options'?<><p className="eyebrow">Reality-Grade Banking</p><h1 className="sheet-hero">Keep your money moving.</h1><p className="body-copy">Prepare the next person, business or institution to receive your payment—with its proof, ownership and history intact.</p>
   {draft.recipient&&<button className="primary-button" type="button" onClick={pay}>Continue to payment<ArrowRight size={17}/></button>}
   <button className="receiving-option" type="button" onClick={()=>setPage('edit')}><Mail size={20}/><span><strong>Prepare a receiving invitation</strong><small>Review the message and choose what to share.</small></span><ArrowRight size={17}/></button>
   <button className="receiving-option" type="button" onClick={()=>{edit({institution:{name:draft.institution?.name??''}});setPage('edit');}}><Landmark size={20}/><span><strong>Bring the standard to an institution</strong><small>The receiving requirements, kit and evidence process.</small></span><ArrowRight size={17}/></button>
   <a className="text-button receiving-guide-link" href="/receiving/">Explore receiving options<ArrowUpRight size={15}/></a>
   <ReceivingWorkList identity={identity} onOpen={value=>{setDraft(reviewedDraft(value));setSaved(null);setPage('edit');setError('');}}/>
  </>:page==='edit'?<><h1 className="sheet-hero">Your invitation.</h1><p className="body-copy">Ready to pay. A clear path to receive.</p>
   <form onSubmit={event=>{event.preventDefault();void review();}}><fieldset className="receiving-editor-fields" disabled={busy}>
    {contacts.length>0&&<label className="form-field"><span>Choose a held contact</span><select value="" onChange={event=>{const person=contacts.find(person=>person.id===event.target.value);if(person){const username=typeof person.username==='string'?person.username:person.fullName||person.email||person.linkedUserId;edit({recipient:person.email||username,recipientName:addressedName(person.fullName,person.email,person.linkedUserId),recipientUserId:person.linkedUserId||undefined,recipientUsername:person.linkedUserId?username:undefined});}}}><option value="">Choose someone</option>{contacts.map(person=><option key={person.id} value={person.id}>{person.fullName||person.email}</option>)}</select></label>}
    <label className="form-field"><span>Recipient</span><input value={draft.recipient} maxLength={254} placeholder="Name, Receiz ID or email" onChange={event=>edit({recipient:event.target.value,recipientName:undefined,recipientUserId:undefined,recipientUsername:undefined})}/></label>
    <label className="form-field"><span>Address invitation to</span><input value={draft.recipientName??''} maxLength={200} placeholder="Recipient name or team" onChange={event=>edit({recipientName:event.target.value||undefined})}/><small>This name appears on the invitation. Your recipient’s email and account ID stay private.</small></label>
    {draft.institution&&<label className="form-field"><span>Institution</span><input required value={draft.institution.name} maxLength={180} placeholder="Institution name" onChange={event=>edit({institution:{name:event.target.value}})}/><small>A name identifies your request; published evidence stays in the Registry.</small></label>}
    <label className="form-field"><span>Invitation message</span><textarea value={draft.message} maxLength={4000} rows={5} required onChange={event=>edit({message:event.target.value})}/></label>
    <label className="consent-option"><input type="checkbox" checked={draft.includeContext} onChange={event=>edit({includeContext:event.target.checked})}/><span>Include amount and payment context</span></label>
    {draft.includeContext&&<div className="receiving-context-fields"><label className="form-field"><span>Amount</span><input inputMode="decimal" value={draft.amount} maxLength={22} onChange={event=>edit({amount:event.target.value})}/></label><label className="form-field"><span>Payment context</span><input value={draft.purpose} maxLength={280} onChange={event=>edit({purpose:event.target.value})}/></label></div>}
    <p className="body-copy small-copy">Creates a shareable page from the details above. Its link preview shows the names you include.</p><button className="primary-button" type="submit" disabled={busy}>Prepare invitation<ArrowRight size={17}/></button>
   </fieldset></form>
  </>:saved&&<><p className="eyebrow">Receiving invitation</p><h1 className="sheet-hero">Ready to share.</h1><div className="receiving-invitation-preview">{sender&&<p className="small-copy">From {sender}</p>}<p>{saved.message}</p>{saved.recipientName&&<p className="small-copy">To {saved.recipientName}</p>}{saved.institution&&<p><strong>{saved.institution.name}</strong><br/>The receiving standard, tools and evidence process.</p>}{saved.includeContext&&<p>{saved.amount&&formatMoney(bankOperationDollars(saved.amount))}{saved.amount&&saved.purpose?' · ':''}{saved.purpose}</p>}</div>
   <p className="body-copy small-copy">Invitation only. Your payment is reviewed and approved separately.</p>
   <div className="dual-actions"><button className="primary-button" type="button" disabled={busy||!link} onClick={()=>void copied()}><Copy size={17}/>Copy invitation</button>{typeof navigator.share==='function'&&<button className="secondary-button" type="button" disabled={busy||!link} onClick={()=>void share()}><Share2 size={17}/>Share invitation</button>}</div>
   <details className="receiving-follow-through" open={showLink} onToggle={event=>setShowLink(event.currentTarget.open)}><summary>Invitation link</summary><div className="receiving-link-row"><label className="form-field receiving-link-field"><span>Reviewed invitation link</span><textarea value={link} readOnly rows={2} onFocus={event=>event.target.select()}/></label><button className="icon-button" type="button" aria-label="Copy link" title="Copy link" disabled={busy||!link} onClick={()=>void copied(true)}><Copy size={18}/></button></div></details>
   <button className="text-button" type="button" disabled={busy} onClick={()=>setPage('edit')}>Edit invitation</button>
   <details className="receiving-follow-through"><summary>Follow-through</summary><p className="body-copy small-copy">Record what the recipient tells you. Reported progress stays separate from verified evidence and payment approval.</p>
    <label className="form-field"><span>Recipient response · reported by you</span><select value={saved.reportedResponse??''} disabled={busy} onChange={event=>void save({...saved,reportedResponse:event.target.value?event.target.value as 'ready'|'declined':undefined})}><option value="">No response recorded</option><option value="ready">Recipient reported ready</option><option value="declined">Recipient reported declined</option></select></label>
    <label className="consent-option"><input type="checkbox" checked={saved.followUp} disabled={busy} onChange={event=>void save({...saved,followUp:event.target.checked})}/><span>Keep for follow-up</span></label>
    <a className="text-button" href="/registry/">Inspect published institutional evidence<ArrowUpRight size={14}/></a>
    {saved.recipient&&<button className="secondary-button" type="button" disabled={busy} onClick={pay}>Review payment<ArrowRight size={16}/></button>}
    <div className="dual-actions"><button className="text-button" type="button" disabled={busy} onClick={()=>void save({...saved,status:'closed'}).then(ok=>{if(ok)onClose();})}>Close invitation</button><button className="text-button" type="button" disabled={busy} onClick={()=>void save({...saved,status:'declined',reportedResponse:'declined'}).then(ok=>{if(ok)onClose();})}>Record declined</button></div>
   </details>
  </>}
  {notice&&<p className="receiving-notice" role="status"><Check size={15}/>{notice}</p>}{error&&<p className="error-message" role="alert">{error}</p>}
 </section></Sheet>;
}
