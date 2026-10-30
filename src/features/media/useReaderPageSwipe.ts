import {useRef,type TouchEvent} from 'react';

/** Gesture-only paging over the already-held document. Native vertical scroll,
 * selection and multi-touch remain untouched; no animation or prefetch work. */
export function useReaderPageSwipe(page:number,turn:(direction:number)=>void,enabled=true){
 const gesture=useRef<{id:number;x:number;y:number;at:number;page:number}|null>(null);
 return {
  onTouchStart(event:TouchEvent<HTMLElement>){
   gesture.current=null;
   if(!enabled||event.touches.length!==1||window.getSelection()?.isCollapsed===false)return;
   const point=event.touches[0];gesture.current={id:point.identifier,x:point.clientX,y:point.clientY,at:Date.now(),page};
  },
  onTouchMove(event:TouchEvent<HTMLElement>){
   const start=gesture.current;if(!start)return;
   const point=Array.from(event.touches).find(point=>point.identifier===start.id);
   if(!enabled||event.touches.length!==1||!point||Math.abs(point.clientY-start.y)>12&&Math.abs(point.clientY-start.y)>Math.abs(point.clientX-start.x))gesture.current=null;
  },
  onTouchEnd(event:TouchEvent<HTMLElement>){
   const start=gesture.current;gesture.current=null;
   if(!enabled||!start||event.touches.length||start.page!==page||Date.now()-start.at>1000||window.getSelection()?.isCollapsed===false)return;
   const point=Array.from(event.changedTouches).find(point=>point.identifier===start.id);if(!point)return;
   const dx=point.clientX-start.x,dy=point.clientY-start.y;
   if(Math.abs(dx)<56||Math.abs(dx)<Math.abs(dy)*1.6)return;
   turn(dx<0?1:-1);
  },
  onTouchCancel(){gesture.current=null;},
 };
}
