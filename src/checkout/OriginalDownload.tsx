import {useState} from 'react';
import {Download} from 'lucide-react';
import type {OpenIdentity} from '../receiz/native-identity';

export function OriginalDownload({identity,originalId,sha256}:{identity:OpenIdentity|null;originalId:string;sha256?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function download(){
  if(!identity?.originalPurchase||busy)return;
  setBusy(true);setError('');
  try{
   const {bytes,filename}=await identity.originalPurchase.download(originalId,sha256);
   const url=URL.createObjectURL(bytes),link=document.createElement('a');
   link.href=url;link.download=filename;link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{
   setError('The Original could not be downloaded. Your payment is saved. Try downloading again.');
  }finally{setBusy(false);}
 }
 return <>
  <button className="primary-button" type="button" onClick={()=>void download()} disabled={busy||!identity?.originalPurchase}>
   <Download size={17}/>{busy?'Preparing Original…':'Download Original'}
  </button>
  {error&&<p className="checkout-error" role="alert">{error}</p>}
 </>;
}
