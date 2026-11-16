import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {Check,Download,FileText,PenLine} from 'lucide-react';
import type {OpenIdentity} from '../../../receiz/native-identity';
import type {NativeMessaging,ChatMessage} from '../../../receiz/native-messaging';
import {readChatDocument,readChatDocumentSignature} from '../../../receiz/chat-document';
import {DOCUMENT_CONSENT_STATEMENT,DOCUMENT_CONSENT_MAX_ORIGINAL_BYTES} from '../../../receiz/document-consent';
import {DocumentTermsView,DocumentFilePreview,saveDocumentFile} from './DocumentTermsView';
import {documentSignatureSession} from './document-signature-session';
import './documents.css';
export type DocumentCardProps={identity:OpenIdentity;api:NativeMessaging;message:ChatMessage;messages:readonly ChatMessage[];onUpdated():void;isCurrent():boolean};
export function DocumentCard(props:DocumentCardProps){const document=readChatDocument(props.message);if(!document)return null;return <DocumentCardBody key={JSON.stringify([props.api.accountUid,props.message.id,props.message.body])} {...props} document={document}/>;}
function DocumentCardBody({identity,api,message,messages,onUpdated,isCurrent,document}:DocumentCardProps&{document:NonNullable<ReturnType<typeof readChatDocument>>}){
 const guard=useRef(isCurrent);guard.current=isCurrent;
 const session=useMemo(()=>documentSignatureSession(identity,api,message,document,()=>guard.current()),[identity,api,message.id,message.body]);
 const state=useSyncExternalStore(session.subscribe,session.snapshot,session.snapshot),[intent,setIntent]=useState(false),reported=useRef(new Set<string>());
 useEffect(()=>{setIntent(false);},[session]);
 useEffect(()=>{if(state.updated&&!reported.current.has(state.updated.id)&&isCurrent()){reported.current.add(state.updated.id);onUpdated();}},[state.updated,isCurrent,onUpdated]);
 const signatures=messages.filter(row=>readChatDocumentSignature(row,document)),ownAvailable=signatures.some(row=>readChatDocumentSignature(row,document)?.signerUid===api.accountUid)||[...state.signatures.values()].some(value=>value.signerUid===api.accountUid),party=[document.issuer.userId,...document.recipients].includes(api.accountUid),canSign=state.reviewed&&document.signatureRequested&&party&&identity.signDocumentConsent&&!ownAvailable&&!['unknown','ready-share','signed','signing'].includes(state.phase),loading=state.working,tooLarge=!!state.reviewed&&state.reviewed.original.size>DOCUMENT_CONSENT_MAX_ORIGINAL_BYTES;
 return <section className="bank-document-card" aria-label={document.kind==='agreement'?'Agreement':'Document'}>
  <div className="bank-document-card-heading"><FileText size={19}/><div><span className="bank-document-eyebrow">{document.kind==='agreement'?'Agreement':'Work file'} · {document.format.toUpperCase()}</span><h3>{document.title}</h3></div></div>
  {document.summary&&<p className="bank-document-card-summary">{document.summary}</p>}
  <p className="bank-document-note">{document.signatureRequested?'Signature requested':'Shared document'} · {document.issuer.name}</p>
  {!state.reviewed&&<button type="button" className="bank-document-card-primary" disabled={loading} onClick={()=>{void session.read();}}>{loading?'Opening complete document…':'Read and review'}</button>}
  {state.reviewed&&<div className="bank-document-card-review"><DocumentTermsView draft={state.reviewed.terms.draft} branding={state.reviewed.terms.branding}/><DocumentFilePreview file={state.reviewed.payload}/><button type="button" onClick={()=>saveDocumentFile(state.reviewed!.original)}><Download size={14}/>Save Original</button><p className="bank-document-note">This Original encloses the exact shared document and its recorded terms.</p></div>}
  {signatures.map(row=>{const held=state.signatures.get(row.id),locator=readChatDocumentSignature(row,document),verified=held&&held.method==='receiz-native-owner'&&held.signerUid===locator?.signerUid&&held.sealedArtifact.artifactSha256===locator.signatureArtifactSha256?held:null;return <div className="bank-document-signature" key={row.id}><span>{verified?<><Check size={14}/>Signed Original</>:<><PenLine size={14}/>Signature available</>}</span><small>{row.senderDisplay||'Agreement party'}</small>{verified&&<small className="bank-document-source-owner">Source owner · {verified.signerOwnerReceizId}</small>}{verified&&state.signatureFiles.has(row.id)&&<button type="button" onClick={()=>saveDocumentFile(state.signatureFiles.get(row.id)!)}>Save signature Original</button>}{!verified&&state.reviewed&&<button type="button" disabled={loading} onClick={()=>{void session.verify(row);}}>Verify signature</button>}</div>;})}
  {state.phase==='signed'&&state.updated&&!signatures.some(row=>row.id===state.updated!.id)&&<p className="bank-document-signed"><Check size={15}/><span>Signed Original<small className="bank-document-source-owner">Source owner · {state.signatures.get(state.updated.id)?.signerOwnerReceizId}</small></span></p>}
  {state.signatureFile&&state.phase==='signed'&&!signatures.some(row=>state.signatures.has(row.id))&&<button type="button" onClick={()=>saveDocumentFile(state.signatureFile!)}><Download size={14}/>Save signature Original</button>}
  {canSign&&<div className="bank-document-consent"><p>Signing records your agreement to this exact document with your Receiz ID.</p><label><input type="checkbox" aria-label="I agree to these exact terms" checked={intent} disabled={tooLarge} onChange={event=>setIntent(event.target.checked)}/><span>{DOCUMENT_CONSENT_STATEMENT}</span></label>{tooLarge?<p className="bank-document-note">This agreement is too large for identity signing here. Keep its Original and ask for a smaller agreement.</p>:<button type="button" className="bank-document-card-primary" disabled={!intent||loading} onClick={()=>{setIntent(false);void session.sign();}}><PenLine size={15}/>Agree and sign with Receiz ID</button>}</div>}
  {state.working&&<p role="status">{state.phase==='loading'?'Opening the complete document…':state.phase==='signing'?'Recording your agreement…':'Checking the exact result…'}</p>}
  {state.phase==='unknown'&&<div className="bank-document-pending"><p>Signature sharing is not confirmed.</p><button type="button" disabled={loading} onClick={()=>{void session.check();}}>Check chat</button></div>}
  {state.phase==='ready-share'&&<button type="button" className="bank-document-card-primary" onClick={()=>{void session.share();}}>Share signature</button>}
  {state.error&&<p role="alert" className="bank-document-error">{state.error}</p>}
 </section>;
}
