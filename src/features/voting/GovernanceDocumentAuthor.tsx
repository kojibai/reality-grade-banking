import {useEffect,useRef,useState} from 'react';
import {FilePlus2} from 'lucide-react';
import {DocumentComposer} from '../messages/documents/DocumentComposer';
import {createOwnerDocumentWorkspace} from '../../receiz/owner-document-workspace';
import type {DocumentAuthoringWorkspace} from '../../receiz/chat-document-workspace';
import type {GovernanceAttachment} from '../../receiz/governance-documents';
import type {OpenIdentity} from '../../receiz/native-identity';
import {prepareProofMaterial} from '../../receiz/proof-material-sharing';

// One private document workspace per owner for governance. Its saved drafts and
// recoverable seal attempts use the same retention as the private Messages editor.
const governanceDocuments='883c98f9-2027-48b3-94a6-dec9076057df';

export function GovernanceDocumentAuthor({identity,onAttach,onClose}:{identity:OpenIdentity;onAttach:(attachment:GovernanceAttachment)=>void;onClose:()=>void}){
  const [workspace,setWorkspace]=useState<DocumentAuthoringWorkspace|null>(null);
  const [consent,setConsent]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const [created,setCreated]=useState<File|null>(null),[entitled,setEntitled]=useState(false);
  const generation=useRef(0),working=useRef(false);
  async function open(approved=false){
    const ticket=++generation.current;
    const current=()=>ticket===generation.current;
    setError('');setConsent(false);
    try{
      if(!identity.messaging)throw Error('Reopen your Receiz identity to create a document.');
      const api=await identity.messaging(approved);
      if(!current())return;
      const editor=createOwnerDocumentWorkspace({identity,api,threadKey:'api:'+api.accountUid+':'+governanceDocuments,
        parties:{issuerName:identity.knownProfile?.()?.displayName||identity.accountUsername?.()||identity.username||'Document issuer',issuerDetails:'',clientName:'',clientDetails:''},context:[],isCurrent:current});
      setEntitled(Boolean(api.knownTwinAccess?.()??identity.knownTwinAccess?.()));
      setWorkspace(editor);
      if(editor.snapshot().phase==='created')await editor.check();
    }catch(cause){
      if(!current())return;
      if(cause instanceof Error&&cause.message==='MESSAGING_CONSENT_REQUIRED')setConsent(true);
      else setError(cause instanceof Error?cause.message:'The document workspace could not be opened.');
    }
  }
  useEffect(()=>{void open();return()=>{generation.current++;};},[identity]);
  async function attach(){
    const payload=workspace?.snapshot().payload;
    if(!created||!payload||working.current)return;
    working.current=true;setPending(true);setError('');
    const ticket=generation.current;
    try{
      const {headUrl}=await prepareProofMaterial(created);
      if(ticket===generation.current)onAttach({name:payload.name,source:headUrl});
    }catch(cause){if(ticket===generation.current)setError(cause instanceof Error?cause.message:'The Original could not be attached.');}
    finally{working.current=false;if(ticket===generation.current)setPending(false);}
  }
  function newDocument(){
    if(!workspace||working.current)return;
    setCreated(null);workspace.updateDraft({kind:'document',title:'',summary:'',sections:[{heading:'',body:''}],tables:[]});
  }
  return <section className="gov-document-author" aria-label="Create a supporting document">
    {workspace?<><DocumentComposer workspace={workspace} presentation="embedded" returnLabel="Back to governance" onClose={onClose} onCreated={setCreated} canDraftWithTwin={entitled} twinDraftingDisabled={!entitled}/>
      {created&&<div className="gov-actions"><button type="button" className="gov-primary" disabled={pending} onClick={()=>void attach()}><FilePlus2 size={16}/>{pending?'Attaching…':'Attach this Original'}</button><button type="button" disabled={pending} onClick={newDocument}>Create another document</button></div>}</>:
      <>{consent?<><p>Enable your Receiz Messages workspace to create documents with this identity.</p><button type="button" onClick={()=>void open(true)}>Enable Messages workspace</button></>:!error&&<p role="status">Opening your document workspace…</p>}<button type="button" onClick={onClose}>Back to governance</button></>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
