import {usePublicObjectArtwork} from './usePublicObjectArtwork';
import {safeImportedSourceUrl} from '../../receiz/imported-source-url';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useMediaPinch} from './useMediaPinch';
import {Image,Maximize2,ZoomIn,ZoomOut} from 'lucide-react';

/** Image presentation only. A public preview never becomes a verified payload. */
export function ProofImageCanvas({url,label,expanded,onExpand,prioritize=false,resolved=false,onAspect}:{url:string;label:string;expanded:boolean;onExpand:()=>void;prioritize?:boolean;resolved?:boolean;onAspect?:(ratio:number)=>void}){
 const projected=usePublicObjectArtwork(resolved?null:url),source=!resolved&&safeImportedSourceUrl(url,'media')?projected??undefined:url;
 const [zoom,setZoom]=useState(1),[error,setError]=useState(false),frame=useRef<HTMLDivElement>(null),original=useRef<HTMLImageElement>(null);
 const restoreAnchor=useMediaPinch(frame,original,zoom,3,setZoom,expanded&&!error,url);
 useLayoutEffect(()=>restoreAnchor(),[zoom,restoreAnchor]);
 useEffect(()=>{setZoom(1);setError(false);},[url]);
 if(error)return <div className="proof-media-fallback"><Image size={36} strokeWidth={1}/><p>This image could not be displayed.</p><button onClick={()=>setError(false)}>Try image again</button></div>;
 const image={src:source,alt:label,draggable:false,loading:prioritize?'eager' as const:undefined,fetchPriority:prioritize?'high' as const:undefined,decoding:'async' as const,referrerPolicy:'no-referrer' as const,crossOrigin:url.startsWith('https://receiz.com/api/proof-material/packages/')?'anonymous' as const:undefined,onError:()=>setError(true),onLoad:onAspect?(event:React.SyntheticEvent<HTMLImageElement>)=>{const image=event.currentTarget;if(image.naturalWidth&&image.naturalHeight)onAspect(image.naturalWidth/image.naturalHeight);}:undefined};
 return <div className={`proof-image-view ${expanded?'is-expanded':''}`} data-asset-no-swipe={zoom>1?true:undefined}><div className="proof-image-scroll" ref={frame}>{!expanded?<button className="proof-image-open" data-asset-swipe="" aria-label="Open full image" onClick={onExpand}><img {...image}/><span><Maximize2 size={14}/></span></button>:<img {...image} ref={original} onDoubleClick={()=>setZoom(value=>value===1?2:1)} style={{width:`${zoom*100}%`,maxWidth:zoom===1?'100%':'none'}}/>}</div>{expanded&&<div className="proof-image-zoom"><button aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(n=>Math.max(1,n-.5))}><ZoomOut size={17}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" disabled={zoom>=3} onClick={()=>setZoom(n=>Math.min(3,n+.5))}><ZoomIn size={17}/></button></div>}</div>;
}
