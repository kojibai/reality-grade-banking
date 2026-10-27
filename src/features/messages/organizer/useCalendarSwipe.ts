import {useRef,type TouchEvent,type MouseEvent} from 'react';
/** A completed horizontal gesture changes one coordinate. No drag state,
 * global listeners, promoted layers or work during ordinary scrolling. */
export function useCalendarSwipe(coordinate:string,turn:(direction:number)=>void){
 const gesture=useRef<{id:number;x:number;y:number;at:number;coordinate:string}|null>(null),suppressUntil=useRef(0);
 const cancel=()=>{gesture.current=null;};
 return{
  onTouchStart(event:TouchEvent<HTMLElement>){cancel();if(event.touches.length!==1||window.getSelection()?.isCollapsed===false||event.target instanceof Element&&event.target.closest('a,input,textarea,select,summary,[contenteditable=true]'))return;const p=event.touches[0];gesture.current={id:p.identifier,x:p.clientX,y:p.clientY,at:Date.now(),coordinate};},
  onTouchMove(event:TouchEvent<HTMLElement>){const start=gesture.current;if(!start)return;const p=Array.from(event.touches).find(p=>p.identifier===start.id);if(event.touches.length!==1||!p||Math.abs(p.clientY-start.y)>12&&Math.abs(p.clientY-start.y)>Math.abs(p.clientX-start.x))cancel();},
  onTouchEnd(event:TouchEvent<HTMLElement>){const start=gesture.current;cancel();if(!start||event.touches.length||start.coordinate!==coordinate||Date.now()-start.at>1000||window.getSelection()?.isCollapsed===false)return;const p=Array.from(event.changedTouches).find(p=>p.identifier===start.id);if(!p)return;const dx=p.clientX-start.x,dy=p.clientY-start.y;if(Math.abs(dx)<56||Math.abs(dx)<Math.abs(dy)*1.6)return;suppressUntil.current=Date.now()+700;turn(dx<0?1:-1);},
  onTouchCancel:cancel,
  onClickCapture(event:MouseEvent<HTMLElement>){if(event.detail>0&&Date.now()<suppressUntil.current){event.preventDefault();event.stopPropagation();suppressUntil.current=0;}},
 };
}
