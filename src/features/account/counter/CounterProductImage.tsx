import {useEffect,useRef,useState} from 'react';
import {Package} from 'lucide-react';
import type {CounterRegisterController} from '../../../receiz/counter/controller';
export function CounterProductImage({api,source,alt}:{api:CounterRegisterController;source:string;alt:string}){
 const[failed,setFailed]=useState(''),[held,setHeld]=useState<{source:string;url:string}|null>(null),target=useRef<HTMLSpanElement>(null),url=failed===source?'':source.startsWith('https:')?source:held?.source===source?held.url:'';
 useEffect(()=>{if(!source.startsWith('sha256:'))return;let live=true,started=false,ownedUrl:string|undefined,observer:IntersectionObserver|undefined;
  const load=()=>{if(started)return;started=true;observer?.disconnect();void api.productImage(source).then(bytes=>{if(!live)return;ownedUrl=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'image/webp'}));setHeld({source,url:ownedUrl});}).catch(()=>{});};
  if(typeof IntersectionObserver==='undefined')load();else{observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))load();},{rootMargin:'150px'});if(target.current)observer.observe(target.current);}
  return()=>{live=false;observer?.disconnect();if(ownedUrl)URL.revokeObjectURL(ownedUrl);};
 },[api,source]);
 return <span ref={target} className="register-product-image">{url?<img src={url} alt={alt} width="160" height="160" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(source)}/>:<span className="register-image-placeholder"><Package size={23}/></span>}</span>;
}
