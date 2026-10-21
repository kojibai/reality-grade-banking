import {useEffect,useId,useRef,useState,type PointerEvent,type ReactNode,type TouchEvent} from 'react';
import {RotateCcw,RotateCw} from 'lucide-react';
import './asset-object.css';

export interface AssetObjectProps {
  front:ReactNode;
  renderBack:()=>ReactNode;
  label?:string;
  className?:string;
  onSideChange?:(side:'front'|'back')=>void;
}
const controls='a,button,input,textarea,select,option,audio,video,iframe,dialog,summary,[role="dialog"],[role="button"],[role="slider"],[contenteditable]:not([contenteditable="false"]),[data-asset-no-swipe]';
function protectsControl(target:EventTarget|null,stage:Element):boolean {
  const control=target instanceof Element?target.closest(controls):null;
  return Boolean(control&&stage.contains(control)&&!control.hasAttribute('data-asset-swipe'));
}

/** A display surface only. Proof content is mounted on demand by its owner. */
export function AssetObject({front,renderBack,label='Proof object',className='',onSideChange}:AssetObjectProps){
  const [back,setBack]=useState(false),[inView,setInView]=useState(()=>typeof IntersectionObserver==='undefined'),[pageVisible,setPageVisible]=useState(()=>typeof document==='undefined'||!document.hidden);
  const root=useRef<HTMLElement>(null),gesture=useRef<{id:number;x:number;y:number;at:number}|null>(null),suppressClickUntil=useRef(0),backId=useId();
  useEffect(()=>{
    const visible=()=>setPageVisible(!document.hidden);document.addEventListener('visibilitychange',visible);visible();
    const element=root.current,observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>setInView(entries.some(entry=>entry.isIntersecting)),{threshold:0});
    if(element)observer?.observe(element);
    return()=>{document.removeEventListener('visibilitychange',visible);observer?.disconnect();};
  },[]);
  function show(next:boolean){setBack(next);onSideChange?.(next?'back':'front');}
  function start(event:TouchEvent<HTMLDivElement>){
    gesture.current=null;
    if(event.touches.length!==1||protectsControl(event.target,event.currentTarget))return;
    const touch=event.touches[0];gesture.current={id:touch.identifier,x:touch.clientX,y:touch.clientY,at:Date.now()};
  }
  function end(event:TouchEvent<HTMLDivElement>){
    const initial=gesture.current;gesture.current=null;if(!initial||event.touches.length||protectsControl(event.target,event.currentTarget))return;
    const touch=Array.from(event.changedTouches).find(value=>value.identifier===initial.id);if(!touch)return;
    const dx=touch.clientX-initial.x,dy=touch.clientY-initial.y;
    if(Date.now()-initial.at>1000||Math.abs(dx)<56||Math.abs(dx)<Math.abs(dy)*1.6)return;
    suppressClickUntil.current=Date.now()+400;show(!back);
  }
  function tilt(event:PointerEvent<HTMLDivElement>){
    if(event.pointerType!=='mouse'||!inView||!pageVisible||protectsControl(event.target,event.currentTarget)||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const box=event.currentTarget.getBoundingClientRect();if(!box.width||!box.height)return;
    event.currentTarget.style.setProperty('--asset-tilt-x',`${((event.clientX-box.left)/box.width-.5)*3}deg`);
    event.currentTarget.style.setProperty('--asset-tilt-y',`${(.5-(event.clientY-box.top)/box.height)*3}deg`);
  }
  return <section ref={root} className={`asset-object ${className}`} aria-label={label} data-motion={inView&&pageVisible?'running':'paused'} data-showing={back?'back':'front'}>
    <div className="asset-object-stage" onTouchStart={start} onTouchEnd={end} onTouchCancel={()=>{gesture.current=null;}} onPointerMove={tilt} onPointerLeave={event=>{event.currentTarget.style.removeProperty('--asset-tilt-x');event.currentTarget.style.removeProperty('--asset-tilt-y');}} onClickCapture={event=>{if(event.detail>0&&Date.now()<suppressClickUntil.current){event.preventDefault();event.stopPropagation();suppressClickUntil.current=0;}}}>
      <div className="asset-object-float"><div className="asset-object-pose"><div className="asset-object-turn">
        <div className={`asset-object-side asset-object-front ${back?'is-inactive':''}`} data-side="front" aria-hidden={back} inert={back}>{front}</div>
        <div id={backId} className={`asset-object-side asset-object-back ${!back?'is-inactive':''}`} data-side="back" aria-hidden={!back} inert={!back}>{back?renderBack():null}</div>
      </div></div></div>
    </div>
    <div className="asset-object-toolbar"><span aria-hidden="true">{back?'Proof material':'The original'}</span><button type="button" className="asset-object-flip" aria-label={back?'Show front':'Show proof material'} aria-pressed={back} aria-controls={backId} onClick={()=>show(!back)}>{back?<RotateCcw size={14} strokeWidth={1.5}/>:<RotateCw size={14} strokeWidth={1.5}/>}<span>{back?'Front':'Proof'}</span></button></div>
  </section>;
}
