import {useCallback,useEffect,useRef,type RefObject} from 'react';

type Point={x:number;y:number};
type Anchor={fraction:Point;center:Point};
type Input='touch'|'gesture'|'wheel';
type SafariGesture=MouseEvent&{scale:number};
type Pinch={input:Input;distance:number;start:Point;rect:DOMRect;initial:number;next:number;anchor:Anchor};
function measure(touches:TouchList){
 const [a,b]=Array.from(touches);
 return {distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),center:{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}};
}

/** Transform the held pixels during a pinch, then commit to the reader's
 * existing zoom once. Regular scrolling and single-finger gestures stay native. */
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
  let wheelEnd:number|undefined;
  function begin(input:Input,center:Point,distance=1){
   const node=content.current;
   if(active||!node||!distance)return;
   const rect=node.getBoundingClientRect(),initial=settings.current.zoom;
   if(!rect.width||!rect.height)return;
   active={input,distance,start:center,rect,initial,next:initial,anchor:{fraction:{x:(center.x-rect.left)/rect.width,y:(center.y-rect.top)/rect.height},center}};
  }
  function update(pinch:Pinch,center:Point,scale:number){
   const node=content.current;
   if(!node||!Number.isFinite(scale))return;
   const {initial,rect,start}=pinch;
   pinch.next=Math.max(1,Math.min(settings.current.max,initial*scale));
   pinch.anchor.center=center;
   node.style.transformOrigin=`${start.x-rect.left}px ${start.y-rect.top}px`;
   node.style.transform=`translate(${center.x-start.x}px,${center.y-start.y}px) scale(${pinch.next/initial})`;
  }
  function clear(){
   window.clearTimeout(wheelEnd);
   if(!active)return;
   const node=content.current;
   node?.style.removeProperty('transform');
   node?.style.removeProperty('transform-origin');
   active=null;
  }
  function commit(input:Input){
   const pinch=active;
   if(pinch?.input!==input)return;
   clear();
   if(pinch.next!==pinch.initial){
    anchor.current=pinch.anchor;
    settings.current.onZoom(pinch.next);
   }
  }
  function start(event:TouchEvent){
   if(event.touches.length!==2)return;
   const {distance,center}=measure(event.touches);
   begin('touch',center,distance);
   if(active?.input==='touch'&&event.cancelable)event.preventDefault();
  }
  function move(event:TouchEvent){
   if(active?.input!=='touch'||event.touches.length!==2)return;
   if(event.cancelable)event.preventDefault();
   const {distance,center}=measure(event.touches);
   update(active,center,distance/active.distance);
  }
  function finish(event:TouchEvent){if(event.touches.length<2)commit('touch');}
  function cancel(){if(active?.input==='touch')clear();}
  // Safari emits its own pinch events. A touchscreen can supply both streams.
  function gestureStart(event:Event){
   const {clientX:x,clientY:y}=event as SafariGesture;
   begin('gesture',{x,y});
   if(active&&event.cancelable)event.preventDefault();
  }
  function gestureMove(event:Event){
   if(!active)return;
   if(event.cancelable)event.preventDefault();
   const {clientX:x,clientY:y,scale}=event as SafariGesture;
   if(active.input==='gesture')update(active,{x,y},scale);
  }
  function gestureEnd(event:Event){
   if(active&&event.cancelable)event.preventDefault();
   commit('gesture');
  }
  // Other desktop browsers report trackpad pinches as control-wheel input.
  function wheel(event:WheelEvent){
   if(!event.ctrlKey)return;
   const center={x:event.clientX,y:event.clientY};
   begin('wheel',center);
   if(!active)return;
   if(event.cancelable)event.preventDefault();
   if(active.input!=='wheel')return;
   const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?scroller!.clientHeight:1);
   update(active,center,active.next/active.initial*Math.exp(-pixels*.01));
   // Keep displaying the current pixels while pinching, then rerender once.
   window.clearTimeout(wheelEnd);
   wheelEnd=window.setTimeout(()=>commit('wheel'),120);
  }
  scroller.addEventListener('touchstart',start,{passive:false});
  scroller.addEventListener('touchmove',move,{passive:false});
  scroller.addEventListener('touchend',finish);
  scroller.addEventListener('touchcancel',cancel);
  scroller.addEventListener('gesturestart',gestureStart,{passive:false});
  scroller.addEventListener('gesturechange',gestureMove,{passive:false});
  scroller.addEventListener('gestureend',gestureEnd,{passive:false});
  scroller.addEventListener('wheel',wheel,{passive:false});
  return()=>{
   scroller.removeEventListener('touchstart',start);
   scroller.removeEventListener('touchmove',move);
   scroller.removeEventListener('touchend',finish);
   scroller.removeEventListener('touchcancel',cancel);
   scroller.removeEventListener('gesturestart',gestureStart);
   scroller.removeEventListener('gesturechange',gestureMove);
   scroller.removeEventListener('gestureend',gestureEnd);
   scroller.removeEventListener('wheel',wheel);
   clear();anchor.current=null;
  };
 },[enabled,frame,content,source]);
 return restoreAnchor;
}
