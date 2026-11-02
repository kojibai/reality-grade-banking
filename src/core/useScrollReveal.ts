import {useEffect,useState} from 'react';

/** Direction changes affect only retained controls, never their source/list. */
export function useScrollReveal(active:boolean,focusSelector:string){
 const [away,setAway]=useState(false);
 useEffect(()=>{if(!active)return;let previous=window.scrollY,frame=0;
 const read=()=>{frame=0;const y=window.scrollY,delta=y-previous;if(document.activeElement?.closest(focusSelector)){setAway(false);previous=y;return;}if(y<180)setAway(false);else if(Math.abs(delta)>6){setAway(delta>0);previous=y;}if(y<180)previous=y;};
 const scroll=()=>{if(!frame)frame=requestAnimationFrame(read);};window.addEventListener('scroll',scroll,{passive:true});return()=>{window.removeEventListener('scroll',scroll);cancelAnimationFrame(frame);};},[active,focusSelector]);
 return {away,reveal:()=>setAway(false)};
}
