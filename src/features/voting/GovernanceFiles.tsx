import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {BookOpen,Download,FilePlus2,X} from 'lucide-react';
import type {GovernanceAttachment} from '../../receiz/governance-documents';

import type {OpenIdentity} from '../../receiz/native-identity';
import {useDocumentUrl,saveDocumentFile} from '../messages/documents/DocumentTermsView';
const DocumentAuthor=lazy(()=>import('./GovernanceDocumentAuthor').then(m=>({default:m.GovernanceDocumentAuthor})));
const PdfReader=lazy(()=>import('../media/ProofPdfReader'));

export function CharterLogoPicker({logo,change,busy}:{logo:string;change:(value:string)=>void;busy:(value:boolean)=>void}){
  const [error,setError]=useState(''),ticket=useRef(0);
  async function select(file:File){
    const current=++ticket.current;busy(true);setError('');
    try{
      const {prepareProfileImage}=await import('../../receiz/profile-image');
      const image=await prepareProfileImage(file,'logo'),reader=new FileReader();
      const value=await new Promise<string>((resolve,reject)=>{reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('The logo could not be read.'));reader.readAsDataURL(image);});
      if(current===ticket.current)change(value);
    }catch(e){if(current===ticket.current)setError(e instanceof Error?e.message:'Choose another image.');}
    finally{if(current===ticket.current)busy(false);}
  }
  return <div className="gov-files"><label>Charter logo<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void select(file);}}/></label>{logo&&<div><img className="gov-logo" src={logo} alt="Charter logo"/><button type="button" onClick={()=>{ticket.current++;busy(false);change('');}}>Remove logo</button></div>}{error&&<p role="alert">{error}</p>}</div>;
}

export function GovernanceFilePicker({files,change,disabled,identity,attach,onEditing}:{files:File[];change:(files:File[])=>void;disabled:boolean;identity:OpenIdentity;attach:(file:GovernanceAttachment)=>void;onEditing:(value:boolean)=>void}){
  const [writing,setWriting]=useState(false);
  function editor(value:boolean){setWriting(value);onEditing(value);}
  if(writing)return <Suspense fallback={<p role="status">Opening document editor…</p>}><DocumentAuthor identity={identity} onClose={()=>editor(false)} onAttach={file=>{attach(file);editor(false);}}/></Suspense>;
  return <fieldset className="gov-box gov-files" disabled={disabled}><legend>Supporting documents</legend>
    <button type="button" onClick={()=>editor(true)}><FilePlus2 size={16}/>Create document</button>
    <label>Add files<input type="file" multiple onChange={e=>{change([...files,...Array.from(e.target.files??[])]);e.target.value='';}}/></label>
    <small>Files become public when you publish this Original.</small>
    {files.map((file,i)=><div key={i}><span>{file.name}</span><button type="button" aria-label={'Remove '+file.name} onClick={()=>change(files.filter((_,j)=>i!==j))}><X size={16}/></button></div>)}
  </fieldset>;
}

type Material=Awaited<ReturnType<typeof import('../../receiz/proof-material-sharing').readProofMaterial>>;
function Attachment({file,remove}:{file:GovernanceAttachment;remove?:()=>void}){
  const held=useRef<Promise<Material>|null>(null),alive=useRef(true),working=useRef(false);
  const [payload,setPayload]=useState<File|null>(null),[text,setText]=useState(''),[reading,setReading]=useState(false);
  const [error,setError]=useState(''),[pending,setPending]=useState(false);
  const url=useDocumentUrl(reading?payload:null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;held.current=null;};},[]);
  async function open(download:boolean){
    if(working.current)return;
    if(!download&&reading){setReading(false);return;}
    working.current=true;setPending(true);setError('');
    try{
      held.current??=import('../../receiz/proof-material-sharing').then(m=>m.readProofMaterial(file.source));
      const material=await held.current;
      if(!alive.current)return;
      if(download){saveDocumentFile(material.original);return;}
      const source=material.opened.verifiedPayload;
      if(!payload){
        setPayload(new File([new Uint8Array(source.bytes)],source.filename,{type:source.mimeType}));
        if(source.mimeType==='text/plain')setText(new TextDecoder().decode(source.bytes.subarray(0,64000))+(source.bytes.length>64000?'…':''));
      }
      setReading(true);
    }catch(cause){held.current=null;if(alive.current)setError(cause instanceof Error?cause.message:'The document could not be opened.');}
    finally{working.current=false;if(alive.current)setPending(false);}
  }
  return <article className="gov-attachment"><div className="gov-actions">
    <button type="button" disabled={pending} aria-expanded={reading} onClick={()=>void open(false)}><BookOpen size={16}/>{file.name}</button>
    <button type="button" aria-label={'Download Original for '+file.name} title="Download Original" disabled={pending} onClick={()=>void open(true)}><Download size={16}/></button>
    {remove&&<button type="button" onClick={remove} aria-label={'Remove '+file.name}><X size={16}/></button>}
    </div>{reading&&payload&&(payload.type==='application/pdf'?url?<Suspense fallback={<p role="status">Opening PDF…</p>}><PdfReader url={url} title={payload.name}/></Suspense>:<p role="status">Opening PDF…</p>:payload.type==='text/plain'?<pre>{text}</pre>:<p>{payload.name} · {payload.type} · {payload.size.toLocaleString()} bytes. Download its Original to open the full file.</p>)}
    {error&&<p role="alert">{error}</p>}</article>;
}
export function GovernanceFileList({files,remove}:{files:readonly GovernanceAttachment[];remove?:(source:string)=>void}){
  return <section className="gov-files"><h3>Supporting documents</h3>{files.map(file=><Attachment key={file.source} file={file} remove={remove?()=>remove(file.source):undefined}/>)}</section>;
}
