import {useRef,useState} from 'react';
import {Download,FileCheck2,X} from 'lucide-react';
import type {GovernanceAttachment} from '../../receiz/governance-documents';

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

export function GovernanceFilePicker({files,change,disabled}:{files:File[];change:(files:File[])=>void;disabled:boolean}){
  return <fieldset className="gov-box gov-files" disabled={disabled}><legend>Supporting documents</legend>
    <label>Add files<input type="file" multiple onChange={e=>{change([...files,...Array.from(e.target.files??[])]);e.target.value='';}}/></label>
    <small>Files become public when you publish this Original.</small>
    {files.map((file,i)=><div key={i}><span>{file.name}</span><button type="button" aria-label={'Remove '+file.name} onClick={()=>change(files.filter((_,j)=>i!==j))}><X size={16}/></button></div>)}
  </fieldset>;
}

export function GovernanceFileList({files}:{files:readonly GovernanceAttachment[]}){
  const [error,setError]=useState(''),[pending,setPending]=useState('');
  async function download(file:GovernanceAttachment,proof:boolean){
    setPending(file.source);setError('');
    try{
      const {readProofMaterial}=await import('../../receiz/proof-material-sharing');
      const {opened,original}=await readProofMaterial(file.source),payload=opened.verifiedPayload;
      const blob=proof?original:new Blob([new Uint8Array(payload.bytes)],{type:payload.mimeType});
      const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=proof?original.name:file.name;a.click();setTimeout(()=>URL.revokeObjectURL(href),30000);
    }catch(e){setError(e instanceof Error?e.message:'The document could not be opened.');}
    finally{setPending('');}
  }
  return <section className="gov-files"><h3>Supporting documents</h3>{files.map(file=><div key={file.source}><button type="button" disabled={!!pending} onClick={()=>void download(file,false)}><Download size={16}/>{file.name}</button><button type="button" aria-label={'Save proof for '+file.name} title="Save sealed Original" disabled={!!pending} onClick={()=>void download(file,true)}><FileCheck2 size={16}/></button></div>)}{error&&<p role="alert">{error}</p>}</section>;
}
