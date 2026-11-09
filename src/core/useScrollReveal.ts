import {useLayoutEffect,useState,type RefObject} from 'react';

/** Direction changes affect only retained controls, never their source/list. */
export function useScrollReveal(active:boolean,focusSelector:string,naturalAnchor?:RefObject<HTMLElement|null>){
 const [away,setAway]=useState(false);
 useLayoutEffect(()=>{if(!active)return;let previous=window.scrollY,frame=0;
 const read=()=>{
  frame=0;const y=window.scrollY,delta=y-previous;
  const before=naturalAnchor?!naturalAnchor.current||naturalAnchor.current.getBoundingClientRect().top>=0:y<180;
  if(document.activeElement?.closest(focusSelector)){setAway(false);previous=y;return;}
  if(before){setAway(false);previous=y;}
  else if(Math.abs(delta)>6){setAway(delta>0);previous=y;}
 };
 // A retained page can reopen at the top without emitting a scroll event.
 // Reconcile its position before painting the previously translated controls.
 read();
 const scroll=()=>{if(!frame)frame=requestAnimationFrame(read);};window.addEventListener('scroll',scroll,{passive:true});return()=>{window.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);};},[active,focusSelector,naturalAnchor]);
 return {away,reveal:()=>setAway(false)};
}
