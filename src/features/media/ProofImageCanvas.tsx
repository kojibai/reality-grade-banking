import {usePublicObjectArtwork} from './usePublicObjectArtwork';
import {safeImportedSourceUrl} from '../../receiz/imported-source-url';
import {useEffect,useLayoutEffect,useRef,useState,type PointerEvent,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {useMediaPinch} from './useMediaPinch';
import {Image,Maximize2,ZoomIn,ZoomOut} from 'lucide-react';

type ObjectZoom={
 stage:RefObject<HTMLDivElement|null>;
 object:RefObject<HTMLDivElement|null>;
 front:boolean;
 onScale:(value:number)=>void;
};

/** Image presentation only. A public preview never becomes a verified payload. */
export function ProofImageCanvas({url,label,expanded,onExpand,prioritize=false,resolved=false,onAspect,zoomControlsHost,objectZoom}:{url:string;label:string;expanded:boolean;onExpand:()=>void;prioritize?:boolean;resolved?:boolean;onAspect?:(ratio:number)=>void;zoomControlsHost?:HTMLElement|null;objectZoom?:ObjectZoom}){
 const projected=usePublicObjectArtwork(resolved?null:url),source=!resolved&&safeImportedSourceUrl(url,'media')?projected??undefined:url;
 const [zoom,setZoom]=useState(1),[error,setError]=useState(false),frame=useRef<HTMLDivElement>(null),original=useRef<HTMLImageElement>(null);
 const viewport=objectZoom?.stage??frame;
 const content=objectZoom?.object??original;
 const onScale=objectZoom?.onScale;
 function changeZoom(value:number){
  setZoom(value);
  onScale?.(value);
 }
 const drag=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null);
 const restoreAnchor=useMediaPinch(viewport,content,zoom,3,changeZoom,expanded&&!error&&(objectZoom?.front??true),url);
 useLayoutEffect(()=>{
  if(restoreAnchor()||!onScale)return;
  const scroller=viewport.current;
  if(scroller){
   scroller.scrollLeft=(scroller.scrollWidth-scroller.clientWidth)/2;
   scroller.scrollTop=(scroller.scrollHeight-scroller.clientHeight)/2;
  }
 },[zoom,onScale,viewport,restoreAnchor]);
 useEffect(()=>{setZoom(1);onScale?.(1);setError(false);},[url,onScale]);
 if(error)return <div className="proof-media-fallback"><Image size={36} strokeWidth={1}/><p>This image could not be displayed.</p><button onClick={()=>setError(false)}>Try image again</button></div>;
 const image={src:source,alt:label,draggable:false,loading:prioritize?'eager' as const:undefined,fetchPriority:prioritize?'high' as const:undefined,decoding:'async' as const,referrerPolicy:'no-referrer' as const,crossOrigin:url.startsWith('https://receiz.com/api/proof-material/packages/')?'anonymous' as const:undefined,onError:()=>setError(true),onLoad:onAspect?(event:React.SyntheticEvent<HTMLImageElement>)=>{const image=event.currentTarget;if(image.naturalWidth&&image.naturalHeight)onAspect(image.naturalWidth/image.naturalHeight);}:undefined};
 const zoomControls=expanded?<div className="proof-image-zoom"><button type="button" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>changeZoom(Math.max(1,zoom-.5))}><ZoomOut size={17}/></button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Zoom in" disabled={zoom>=3} onClick={()=>changeZoom(Math.min(3,zoom+.5))}><ZoomIn size={17}/></button></div>:null;
 function startPan(event:PointerEvent<HTMLDivElement>){
  if(!expanded||zoom<=1||event.pointerType!=='mouse'||event.button!==0)return;
  const scroller=viewport.current;if(!scroller)return;
  drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:scroller.scrollLeft,top:scroller.scrollTop};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function pan(event:PointerEvent<HTMLDivElement>){
  const start=drag.current;
  if(!start||start.id!==event.pointerId)return;
  const scroller=viewport.current;if(!scroller)return;
  scroller.scrollLeft=start.left+start.x-event.clientX;
  scroller.scrollTop=start.top+start.y-event.clientY;
 }
 return <div className={`proof-image-view ${expanded?'is-expanded':''}`} data-asset-no-swipe={zoom>1?true:undefined}>
  <div className="proof-image-scroll" ref={frame} {...(expanded?{
   onPointerDown:startPan,onPointerMove:pan,onLostPointerCapture:()=>{drag.current=null;},
   onDoubleClick:()=>changeZoom(zoom===1?2:1)
  }:{})}>
   {!expanded?<button className="proof-image-open" data-asset-swipe="" aria-label="Open full image" onClick={onExpand}><img {...image}/><span><Maximize2 size={14}/></span></button>:<img {...image} ref={original} style={objectZoom?undefined:{width:`${zoom*100}%`,maxWidth:zoom===1?'100%':'none'}}/>}
  </div>
  {zoomControlsHost===undefined?zoomControls:zoomControlsHost&&zoomControls&&createPortal(zoomControls,zoomControlsHost)}
 </div>;
}
