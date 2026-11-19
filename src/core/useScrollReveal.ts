import {useEffect,useState,type RefObject} from 'react';

const scrollReaders=new Set<(y:number)=>void>();
let frame=0;
function scheduleScrollRead(){
 if(frame)return;
 frame=requestAnimationFrame(()=>{frame=0;const y=window.scrollY;for(const read of scrollReaders)read(y);});
}
function observeScroll(read:(y:number)=>void){
 if(!scrollReaders.size)window.addEventListener('scroll',scheduleScrollRead,{passive:true});
 scrollReaders.add(read);
 return()=>{scrollReaders.delete(read);if(!scrollReaders.size){window.removeEventListener('scroll',scheduleScrollRead);cancelAnimationFrame(frame);frame=0;}};
}

/** Direction changes affect only retained controls, never their source/list. */
export function useScrollReveal(active:boolean,focusSelector:string,naturalAnchor?:RefObject<HTMLElement|null>,resetOnNavigation=false){
 const [away,setAway]=useState(false);
 useEffect(()=>{if(!active){if(!naturalAnchor)setAway(false);return;}let previous=window.scrollY;
 const read=(y:number)=>{
  const delta=y-previous;
  const before=naturalAnchor?!naturalAnchor.current||naturalAnchor.current.getBoundingClientRect().top>=0:y<180;
  if(document.activeElement?.closest(focusSelector)){setAway(false);previous=y;return;}
  if(before){setAway(false);previous=y;}
  else if(Math.abs(delta)>6){setAway(delta>0);previous=y;}
 };
 // A retained Ledger may reopen above its controls after hiding them farther
 // down. Its normal-flow anchor is unaffected by the sticky bar's transform.
 if(naturalAnchor)read(previous);
 const reset=()=>{previous=window.scrollY;setAway(false);};
 if(resetOnNavigation)window.addEventListener('receiz-bank:surface',reset);
 const stop=observeScroll(read);
 return()=>{stop();if(resetOnNavigation)window.removeEventListener('receiz-bank:surface',reset);};},[active,focusSelector,naturalAnchor,resetOnNavigation]);
 return {away,reveal:()=>setAway(false)};
}
