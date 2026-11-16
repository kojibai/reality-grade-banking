import {clientWorkScenario,type ClientWorkScenario} from '../content/client-work-scenarios.mjs';
import {readEditableProposalDraft,readProposalDraft,proposalTotal} from '../receiz/proposal-draft';
import {readBusinessDocumentDraft,type BusinessDocumentFormat} from '../receiz/business-document';
import {readDocumentBranding,type DocumentBranding} from '../receiz/document-branding';
import type {ChatProposalWorkspace,ChatProposalWorkspaceState} from '../receiz/chat-proposal-workspace';
import type {DocumentAuthoringWorkspace,DocumentAuthoringWorkspaceState} from '../receiz/chat-document-workspace';
export type ClientWorkIntent='proposal'|'invoice'|'document'|'agreement'|'communication'|'management';
export type ExampleMessage={id:string;author:'client'|'you'|'twin';body:string;file?:File;kind?:'proposal'|'invoice'|'document'|'agreement'};
type ScenarioState={messageDraft:string;twinDraft:string;messages:readonly ExampleMessage[];twin:readonly ExampleMessage[];notice:string};
const createdAt='2026-11-16T12:00:00.000Z';
/** A page-lifetime example only. No identity, proof, transport, AI or storage ports. */
export function createClientWorkSession(){
 const listeners=new Set<()=>void>(),scenarios=new Map<string,ReturnType<typeof createScenario>>();let revision=0;
 const notify=()=>{revision++;for(const listener of listeners)listener();};
 const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
 function createScenario(content:ClientWorkScenario){
  let sequence=0,state:ScenarioState={messageDraft:'',twinDraft:'',messages:[{id:'brief',author:'client',body:content.brief}],twin:[{id:'twin-intro',author:'twin',body:content.scriptedTwinReply}],notice:''};
  const proposals=new Map<'proposal'|'invoice',ChatProposalWorkspace>(),documents=new Map<'document'|'agreement',DocumentAuthoringWorkspace>();
  const publish=(patch:Partial<ScenarioState>)=>{state={...state,...patch};notify();};
  const branding=():DocumentBranding=>({issuerName:content.owner.name,issuerDetails:content.owner.role??'',clientName:content.client.name,clientDetails:content.client.company??''});
  const unavailable=async()=>{throw Error('Open your account to share, sign or request a payment.');};
  function proposal(kind:'proposal'|'invoice'):ChatProposalWorkspace{
   const held=proposals.get(kind);if(held)return held;
   let version=0,current:ChatProposalWorkspaceState={phase:'review',draft:readEditableProposalDraft(content[kind]),branding:branding(),proposal:null,pdf:null,sentMessage:null,error:'',clientName:content.client.name,sourceCount:1,hasEarlier:false};
   const emit=(patch:Partial<ChatProposalWorkspaceState>)=>{current={...current,...patch};notify();};
   const invalidate=(patch:Partial<ChatProposalWorkspaceState>)=>{version++;emit({...patch,phase:'review',proposal:null,pdf:null,error:''});};
   const port:ChatProposalWorkspace={subscribe,snapshot:()=>current,updateDraft:draft=>invalidate({draft:readEditableProposalDraft(draft)}),updateBranding:value=>invalidate({branding:readDocumentBranding(value,true)}),
    async generate(nextKind){if(nextKind!==current.draft.kind)invalidate({draft:{...current.draft,kind:nextKind}});publish({notice:'Scripted example: the fictional brief is already in the editable draft. Your edits are kept.'});},
    async preview(){const captured=version,draft=readProposalDraft(current.draft),parties=readDocumentBranding(current.branding!);emit({phase:'preparing',error:''});try{const {buildProposalPdf}=await import('../receiz/proposal-pdf');const bytes=await buildProposalPdf({...draft,reference:'EXAMPLE DRAFT — NOT ACCEPTED',issuer:{name:parties.issuerName,details:parties.issuerDetails},client:{name:parties.clientName,details:parties.clientDetails},totalUsdCents:proposalTotal(draft.items),createdAt});if(captured!==version)return;const name=draft.title.replace(/[^\p{L}\p{N} ._-]/gu,'').trim().slice(0,100)||draft.kind;emit({phase:'ready',pdf:new File([new Uint8Array(bytes)],name+'.pdf',{type:'application/pdf',lastModified:Date.parse(createdAt)})});}catch(cause){if(captured===version)emit({phase:'error',error:cause instanceof Error?cause.message:'The plain PDF could not be prepared.'});}},send:unavailable,check:unavailable};
   proposals.set(kind,port);return port;
  }
  function document(kind:'document'|'agreement'):DocumentAuthoringWorkspace{
   const held=documents.get(kind);if(held)return held;
   let version=0,current:DocumentAuthoringWorkspaceState={phase:'review',draft:readBusinessDocumentDraft(content[kind]),branding:branding(),format:'pdf',terms:null,payload:null,original:null,sentMessage:null,error:'',clientName:content.client.name,sourceCount:1,hasEarlier:false};
   const emit=(patch:Partial<DocumentAuthoringWorkspaceState>)=>{current={...current,...patch};notify();};
   const invalidate=(patch:Partial<DocumentAuthoringWorkspaceState>)=>{version++;emit({...patch,phase:'review',terms:null,payload:null,original:null,error:''});};
   const port:DocumentAuthoringWorkspace={subscribe,snapshot:()=>current,updateDraft:draft=>invalidate({draft:readBusinessDocumentDraft(draft)}),updateBranding:value=>invalidate({branding:readDocumentBranding(value,true)}),setFormat:(format:BusinessDocumentFormat)=>invalidate({format}),
    async generate(nextKind){if(nextKind!==current.draft.kind)invalidate({draft:{...current.draft,kind:nextKind}});publish({notice:'Scripted example: the fictional brief is already in the editable draft. Your edits are kept.'});},
    async preview(){const captured=version,draft=readBusinessDocumentDraft(current.draft),format=current.format,parties=readDocumentBranding(current.branding!);if(!draft.title.trim()||!draft.summary.trim()&&!draft.sections.some(row=>row.body.trim())&&!draft.tables.some(row=>row.rows.length))throw Error('Complete the document before previewing.');emit({phase:'preparing',error:''});try{const {renderBusinessDocument}=await import('../receiz/business-document');const payload=await renderBusinessDocument({draft,format,...parties,createdAt});if(captured===version)emit({phase:'ready',payload});}catch(cause){if(captured===version)emit({phase:'error',error:cause instanceof Error?cause.message:'The plain file could not be prepared.'});}},send:unavailable,check:unavailable};
   documents.set(kind,port);return port;
  }
  function addFile(kind:'proposal'|'invoice'|'document'|'agreement'){
   const snapshot=kind==='proposal'||kind==='invoice'?proposal(kind).snapshot():document(kind).snapshot(),file='pdf'in snapshot?snapshot.pdf:snapshot.payload;
   if(snapshot.phase!=='ready'||!file)throw Error('Preview the current draft before adding it to the example.');
   publish({messages:[...state.messages,{id:'local-'+(++sequence),author:'you',body:'Example draft · '+snapshot.draft.title,file,kind:snapshot.draft.kind}],notice:'Draft added to this example only. No one receives it.'});
  }
  return{content,snapshot:()=>state,proposal,document,addDocument:addFile,
   setMessageDraft:(messageDraft:string)=>publish({messageDraft}),setTwinDraft:(twinDraft:string)=>publish({twinDraft}),
   addMessage(){const body=state.messageDraft.trim();if(!body)return;publish({messages:[...state.messages,{id:'local-'+(++sequence),author:'you',body}],messageDraft:'',notice:'Message added to this example only.'});},
   askTwin(){const body=state.twinDraft.trim();if(!body)return;publish({twin:[...state.twin,{id:'twin-'+(++sequence),author:'you',body},{id:'twin-'+(++sequence),author:'twin',body:content.scriptedTwinReply}],twinDraft:'',notice:'Scripted Twin response. No AI service was called.'});},
   prepareReply(){publish({messageDraft:content.suggestedReply,notice:'Reply prepared. Edit it before adding it to the example.'});},
   continueConversation(){publish({messages:[...state.messages,{id:'local-'+(++sequence),author:'client',body:content.followup.body}],notice:'A fictional client follow-up was added.'});},
  };
 }
 return{subscribe,snapshot:()=>revision,scenario(id?:string){const content=clientWorkScenario(id),held=scenarios.get(content.id);if(held)return held;const next=createScenario(content);scenarios.set(content.id,next);return next;}};
}
export type ClientWorkSession=ReturnType<typeof createClientWorkSession>;
export type ClientWorkScenarioSession=ReturnType<ClientWorkSession['scenario']>;
