import {useCallback,useEffect,useRef,type RefObject} from 'react';

type Point={x:number;y:number};
type Anchor={fraction:Point;center:Point};
type Pinch={distance:number;start:Point;rect:DOMRect;initial:number;next:number;anchor:Anchor};
function measure(touches:TouchList){
 const [a,b]=Array.from(touches);
 return {distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),center:{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}};
}

/** Transform the held pixels during a pinch, then commit to the reader's
 * existing zoom once. A single finger keeps native scroll and page gestures. */
export function useMediaPinch(frame:RefObject<HTMLDivElement|null>,content:RefObject<HTMLElement|null>,zoom:number,max:number,onZoom:(value:number)=>void,enabled:boolean,source:string){
 const settings=useRef({zoom,max,onZoom});settings.current={zoom,max,onZoom};
 const anchor=useRef<Anchor|null>(null);
 const restoreAnchor=useCallback(()=>{
  const scroller=frame.current,node=content.current,held=anchor.current;
  if(!scroller||!node||!held)return;
  anchor.current=null;
  const rect=node.getBoundingClientRect();
  scroller.scrollLeft+=rect.left+rect.width*held.fraction.x-held.center.x;
  scroller.scrollTop+=rect.top+rect.height*held.fraction.y-held.center.y;
 },[frame,content]);
 useEffect(()=>{
  const scroller=frame.current;
  if(!scroller||!enabled)return;
  let active:Pinch|null=null;
  function start(event:TouchEvent){
   const node=content.current;
   if(event.touches.length!==2||active||!node)return;
   const {distance,center}=measure(event.touches),rect=node.getBoundingClientRect(),initial=settings.current.zoom;
   if(!distance||!rect.width||!rect.height)return;
   if(event.cancelable)event.preventDefault();
   active={distance,start:center,rect,initial,next:initial,anchor:{fraction:{x:(center.x-rect.left)/rect.width,y:(center.y-rect.top)/rect.height},center}};
  }
  function move(event:TouchEvent){
   const node=content.current;
   if(!active||event.touches.length!==2||!node)return;
   if(event.cancelable)event.preventDefault();
   const {distance,center}=measure(event.touches),{initial,rect,start}=active;
   const next=Math.max(1,Math.min(settings.current.max,initial*distance/active.distance));
   active.next=next;
   active.anchor.center=center;
   node.style.transformOrigin=`${start.x-rect.left}px ${start.y-rect.top}px`;
   node.style.transform=`translate(${center.x-start.x}px,${center.y-start.y}px) scale(${next/initial})`;
  }
  function clear(){
   const node=content.current;
   node?.style.removeProperty('transform');
   node?.style.removeProperty('transform-origin');
  }
  function finish(event:TouchEvent){
   if(!active||event.touches.length>=2)return;
   clear();
   const current=active;active=null;
   if(current.next!==current.initial){
    anchor.current=current.anchor;
    settings.current.onZoom(current.next);
   }
  }
  function cancel(){if(!active)return;active=null;clear();}
  scroller.addEventListener('touchstart',start,{passive:false});
  scroller.addEventListener('touchmove',move,{passive:false});
  scroller.addEventListener('touchend',finish);
  scroller.addEventListener('touchcancel',cancel);
  return()=>{
   scroller.removeEventListener('touchstart',start);
   scroller.removeEventListener('touchmove',move);
   scroller.removeEventListener('touchend',finish);
   scroller.removeEventListener('touchcancel',cancel);
   cancel();anchor.current=null;
  };
 },[enabled,frame,content,source]);
 return restoreAnchor;
}
