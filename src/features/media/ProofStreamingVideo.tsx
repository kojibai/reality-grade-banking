import {useRef,useState} from 'react';
import {Maximize2,RotateCcw} from 'lucide-react';
import {usePassiveMediaPreload} from './usePassiveMediaPreload';
/** Native range playback over the public Receiz presentation role. It neither
 * downloads a complete sealed Original nor labels a stream as verified. */
export function ProofStreamingVideo({url,title,poster,playOnOpen=false}:{url:string;title:string;poster?:string|null;playOnOpen?:boolean}){
 const video=useRef<HTMLVideoElement>(null),[failed,setFailed]=useState(false),preload=usePassiveMediaPreload();
 const fullscreen=()=>{const element=video.current as HTMLVideoElement&{webkitEnterFullscreen?:()=>void};if(!element)return;if(element.requestFullscreen)void element.requestFullscreen().catch(()=>element.webkitEnterFullscreen?.());else element.webkitEnterFullscreen?.();};
 return <div className="proof-streaming-video"><div className="proof-video-view"><video key={url} ref={video} src={url} controls playsInline preload={playOnOpen?'auto':preload} autoPlay={playOnOpen} poster={poster??undefined} aria-label={title} onError={()=>setFailed(true)}/></div><div className="proof-streaming-controls"><span>Video</span><button aria-label="Open full video" title="Full screen" onClick={fullscreen}><Maximize2 size={16}/></button></div>{failed&&<div className="proof-media-error" role="status"><p>This video could not start. Try again or open its public source.</p><button onClick={()=>{setFailed(false);video.current?.load();void video.current?.play().catch(()=>{});}}><RotateCcw size={13}/>Try again</button></div>}</div>;
}
