import {useLayoutEffect,useState,type ReactNode,type RefObject} from 'react';
import {createPortal} from 'react-dom';

/** Keep the portal target stable: changing targets would recreate RTC media. */
export function CallPortal({inlineHost,expanded,children}:{inlineHost:RefObject<HTMLDivElement|null>;expanded:boolean;children:ReactNode}){
  const [container]=useState(()=>{const element=document.createElement('div');element.className='bank-call-portal';return element;});
  useLayoutEffect(()=>{
    const place=()=>{
      // Native modal dialogs make body siblings inert. Keep compact controls in
      // the current modal's top layer, including when another Bank sheet opens.
      const dialogs=[...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(dialog=>!dialog.closest('[hidden],[inert]'));
      const destination=expanded&&inlineHost.current?inlineHost.current:dialogs.at(-1)??document.body;
      if(container.parentElement===destination)return;
      const movable=destination as HTMLElement&{moveBefore?:(node:Node,before:Node|null)=>void};
      if(container.isConnected&&movable.moveBefore)movable.moveBefore(container,null);
      else destination.appendChild(container);
    };
    place();
    const observer=new MutationObserver(place);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','inert']});
    return()=>observer.disconnect();
  },[container,expanded,inlineHost]);
  useLayoutEffect(()=>()=>container.remove(),[container]);
  return createPortal(children,container);
}

export function clampCallPosition(position:{x:number;y:number},size:{width:number;height:number},viewport:{width:number;height:number;left?:number;top?:number;insets?:{left:number;right:number;top:number;bottom:number}}){
  const insets=viewport.insets??{left:0,right:0,top:0,bottom:0},left=(viewport.left??0)+insets.left+8,top=(viewport.top??0)+insets.top+8;
  return{x:Math.max(left,Math.min(position.x,(viewport.left??0)+viewport.width-size.width-insets.right-8)),y:Math.max(top,Math.min(position.y,(viewport.top??0)+viewport.height-size.height-insets.bottom-8))};
}
