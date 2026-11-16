import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {FileText} from 'lucide-react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {NativeMessaging} from '../../receiz/native-messaging';
import {openOwnerDocumentOutput,readOwnerDocumentOutputs} from '../../receiz/owner-document-workspace';
import type {BusinessDocumentDraft} from '../../receiz/business-document';
const OwnerDocumentViewer=lazy(()=>import('./documents/OwnerDocumentViewer').then(module=>({default:module.OwnerDocumentViewer})));
export function OwnerDocuments({identity,api,threadKey,revision,isCurrent,onShare}:{identity:OpenIdentity;api:NativeMessaging;threadKey:string;revision:number;isCurrent():boolean;onShare?:(original:File,title:string)=>void}){
 const [view,setView]=useState<{original:File;payload:File;draft:BusinessDocumentDraft}|null>(null),[busy,setBusy]=useState(''),[error,setError]=useState('');const mounted=useRef(false),current=useRef(isCurrent);current.current=isCurrent;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 let outputs:ReturnType<typeof readOwnerDocumentOutputs>=[];try{outputs=readOwnerDocumentOutputs(api.knownOwnerDocumentWork?.(threadKey));}catch{/* An optional display row never admits a file. */}
 async function open(digest:string){if(busy||!current.current())return;setBusy(digest);setError('');try{const held=await openOwnerDocumentOutput({identity,api,threadKey,artifactSha256:digest,isCurrent:()=>mounted.current&&current.current()});if(mounted.current&&current.current())setView(held);}catch{if(mounted.current&&current.current())setError('This document could not be opened yet. Your saved work remains available.');}finally{if(mounted.current)setBusy('');}}
 if(!outputs.length)return null;
 return <section className="bank-owner-documents" aria-label="Your documents"><details key={revision} open={revision>0}><summary><FileText size={14}/>Documents<span>{outputs.length}</span></summary><div>{outputs.map(output=><button type="button" key={output.artifactSha256} disabled={!!busy} onClick={()=>void open(output.artifactSha256)}><span><strong>{output.title}</strong><small>{output.format.toUpperCase()} · {new Date(output.createdAt).toLocaleDateString()}</small></span><span>{busy===output.artifactSha256?'Opening…':'Open'}</span></button>)}</div></details>{error&&<p role="alert">{error}</p>}{view&&<Suspense fallback={<p role="status">Opening document…</p>}><OwnerDocumentViewer view={view} onClose={()=>setView(null)} onShare={onShare?()=>{onShare(view.original,view.draft.title);setView(null);}:undefined}/></Suspense>}</section>;
}
