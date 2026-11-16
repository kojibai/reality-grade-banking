import {useEffect,useRef,useState} from 'react';
import {FileText} from 'lucide-react';
import type {ChatMessage,NativeMessaging} from '../../receiz/native-messaging';
import {openWorkspaceFile,readWorkspaceFile,type WorkspaceFileReview} from '../../receiz/workspace-file-share';
import {Sheet} from '../../components/Sheet';
import {DocumentFilePreview,saveDocumentFile} from './documents/DocumentTermsView';
import './documents/documents.css';
export function WorkspaceFileCard({api,message,isCurrent}:{api:NativeMessaging;message:ChatMessage;isCurrent():boolean}){
 const mounted=useRef(false);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const file=readWorkspaceFile(message),current=useRef(isCurrent);current.current=isCurrent;const[review,setReview]=useState<WorkspaceFileReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function open(){if(busy||!current.current())return;setBusy(true);setError('');try{const result=await openWorkspaceFile(api,message);if(mounted.current&&current.current())setReview(result);}catch{if(mounted.current&&current.current())setError('The exact shared Original could not be opened. Keep this message and check it again.');}finally{if(mounted.current&&current.current())setBusy(false);}}
 if(!file)return null;
 return <article className="bank-document-card"><small>Shared file</small><h3>{file.title}</h3><button type="button" className="secondary-button" disabled={busy} onClick={()=>void open()}><FileText size={15}/>{busy?'Opening Original…':'Open document'}</button>{error&&<p role="alert">{error}</p>}{review&&<Sheet title={file.title} className="bank-document-sheet" onClose={()=>setReview(null)}><DocumentFilePreview file={review.payload}/><details className="bank-document-evidence"><summary>Original</summary><p>Sealed owner · {review.ownerReceizId}</p><button type="button" onClick={()=>saveDocumentFile(review.original)}>Download Original</button></details></Sheet>}</article>;
}
