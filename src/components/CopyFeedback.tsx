import {useCallback,useEffect,useRef,useState} from 'react';
import {Check,Copy} from 'lucide-react';
import './copy-feedback.css';

/** Feedback starts only after the existing clipboard action succeeds. */
export function useCopyFeedback(value='copy'){
 const [confirmed,setConfirmed]=useState<string|null>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),alive=useRef(true),current=useRef(value);
 current.current=value;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(timer.current);};},[]);
 const clear=useCallback(()=>{clearTimeout(timer.current);if(alive.current)setConfirmed(null);},[]);
 const confirm=useCallback(()=>{
  if(!alive.current||current.current!==value)return;
  clearTimeout(timer.current);setConfirmed(value);
  timer.current=setTimeout(()=>{if(alive.current)setConfirmed(null);},1600);
 },[value]);
 return{copied:confirmed===value,confirm,clear};
}

export function CopyFeedbackIcon({copied,size=17}:{copied:boolean;size?:number}){
 return <span className="copy-feedback-mark" data-copied={copied} aria-hidden="true" style={{width:size,height:size}}>{copied?<Check size={size}/>:<Copy size={size}/>}</span>;
}
