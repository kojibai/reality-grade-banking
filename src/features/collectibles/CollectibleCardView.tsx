import {useEffect,useId,useRef,type PointerEvent as ReactPointerEvent,type ReactNode} from 'react';
import './collectible-card-view.css';

type Gesture={id:number;x:number;y:number;vertical:boolean;bounds:DOMRect};

/** Passive faces for the selected original. Source admission and actions stay with the caller. */
export function CollectibleCardView({label,flipped,onFlip,front,back}:{
 label:string;flipped:boolean;onFlip:(flipped:boolean)=>void;front:ReactNode;back:ReactNode;
}){
 const element=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null);
 const faceId=useId();
 const reduced=useRef(false),bounds=useRef<DOMRect|null>(null),suppressClickUntil=useRef(0);
 const resetTilt=()=>{
  const node=element.current;if(!node)return;
  node.style.removeProperty('--collectible-tilt-x');node.style.removeProperty('--collectible-tilt-y');
  node.removeAttribute('data-handling');
 };
 useEffect(()=>{
  const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(!preference)return;
  const update=()=>{reduced.current=preference.matches;if(preference.matches)resetTilt();};
  update();preference.addEventListener('change',update);
  return()=>preference.removeEventListener('change',update);
 },[]);
 const tilt=(x:number,y:number,rect:DOMRect)=>{
  const node=element.current;if(!node||reduced.current||!rect.width||!rect.height)return;
  const clamp=(n:number)=>Math.max(-1,Math.min(1,n));
  node.style.setProperty('--collectible-tilt-x',`${(-clamp((y-rect.top)/rect.height*2-1)*4).toFixed(2)}deg`);
  node.style.setProperty('--collectible-tilt-y',`${(clamp((x-rect.left)/rect.width*2-1)*4).toFixed(2)}deg`);
  node.setAttribute('data-handling','');
 };
 const cancel=()=>{if(gesture.current)suppressClickUntil.current=performance.now()+350;gesture.current=null;resetTilt();};
 const start=(event:ReactPointerEvent<HTMLDivElement>)=>{
  // A second pointer belongs to a pinch, never to a card turn.
  if(gesture.current||event.isPrimary===false){cancel();return;}
  if(event.button!==0)return;
  const rect=event.currentTarget.getBoundingClientRect();bounds.current=rect;
  gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,vertical:false,bounds:rect};
  event.currentTarget.setPointerCapture?.(event.pointerId);
  tilt(event.clientX,event.clientY,rect);
 };
 const move=(event:ReactPointerEvent<HTMLDivElement>)=>{
  const current=gesture.current;
  if(current){
   if(current.id!==event.pointerId)return;
   const dx=Math.abs(event.clientX-current.x),dy=Math.abs(event.clientY-current.y);
   if(dy>10&&dy>dx)current.vertical=true;
   if(current.vertical){resetTilt();return;}
   tilt(event.clientX,event.clientY,current.bounds);
  }else if(event.pointerType==='mouse'&&bounds.current){tilt(event.clientX,event.clientY,bounds.current);}
 };
 const end=(event:ReactPointerEvent<HTMLDivElement>)=>{
  const current=gesture.current;if(!current||current.id!==event.pointerId)return;
  gesture.current=null;resetTilt();
  const dx=Math.abs(event.clientX-current.x),dy=Math.abs(event.clientY-current.y);
  if(dx>10||dy>10)suppressClickUntil.current=performance.now()+350;
  if(!current.vertical&&dx>=36&&dx>dy*1.35)onFlip(!flipped);
 };
 return <div ref={element} className="collectible-card" data-collectible-card="" data-flipped={flipped}
  role="button" tabIndex={0} aria-label={label} aria-pressed={flipped} aria-describedby={`${faceId}-${flipped?'back':'front'}`}
  onClick={()=>{if(performance.now()>=suppressClickUntil.current)onFlip(!flipped);}}
  onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!event.repeat)onFlip(!flipped);}}}
  onPointerEnter={event=>{bounds.current=event.currentTarget.getBoundingClientRect();}}
  onPointerLeave={()=>{if(!gesture.current){bounds.current=null;resetTilt();}}}
  onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={()=>{if(gesture.current)cancel();}}
  onDragStart={event=>event.preventDefault()} onBlur={cancel}>
  <div className="collectible-card__handling"><div className="collectible-card__turn">
   <div id={`${faceId}-front`} className="collectible-card__face" data-card-face="front" aria-hidden={flipped}>{front}</div>
   <div id={`${faceId}-back`} className="collectible-card__face collectible-card__face--back" data-card-face="back" aria-hidden={!flipped}>{back}</div>
  </div></div>
 </div>;
}
