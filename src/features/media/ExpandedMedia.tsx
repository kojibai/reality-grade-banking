import {useId,useLayoutEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {lockDocumentScroll} from '../../core/scroll-lock';
import {restorePanelFocus} from '../../core/return-focus';
export function ExpandedMedia({title,label='Original media',opener,children,onClose}:{title:string;label?:string;opener?:HTMLElement|null;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),id=useId();
 useLayoutEffect(()=>{const dialog=ref.current!,returnTo=opener??document.activeElement as HTMLElement|null,pointer=!returnTo?.matches(':focus-visible');dialog.showModal();const unlock=lockDocumentScroll();return()=>{dialog.close();unlock();queueMicrotask(()=>{if(returnTo?.isConnected)restorePanelFocus(returnTo,pointer);});};},[]);
 return <dialog ref={ref} className="proof-media-dialog" aria-labelledby={id} onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}><header><div><span>{label}</span><h2 id={id}>{title}</h2></div><button autoFocus aria-label="Close media" onClick={onClose}><X size={21}/></button></header>{children}</dialog>;
}
