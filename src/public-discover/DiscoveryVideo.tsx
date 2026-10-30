import {useEffect,useRef,useState} from 'react';
import {publicAssetEmbed} from '../receiz/public-asset-embed';
import {safeReceizArtworkUrl,type PublicMarketItem} from '../receiz/public-market';
/** A paused first frame from the existing public playback role. No receipt is
 * substituted, no autoplay runs in the gallery, and hidden media is released. */
export function DiscoveryVideo({item,active}:{item:PublicMarketItem;active:boolean}){
 const stream=publicAssetEmbed(item),ref=useRef<HTMLVideoElement>(null),[failed,setFailed]=useState(false),poster=safeReceizArtworkUrl(item.videoPosterUrl);
 useEffect(()=>{const video=ref.current;if(!video||!active||!stream)return;video.preload='metadata';video.src=stream.stream.url;return()=>{video.pause();video.removeAttribute('src');video.load();};},[active,item.id]);
 if(!stream||failed)return poster?<img src={poster} alt=""/>:<span className="discover-cover-title">{item.title}</span>;
 return <video className="discover-video" ref={ref} poster={poster??undefined} muted playsInline preload="none" aria-label={item.title} onLoadedMetadata={event=>{try{event.currentTarget.currentTime=.001;}catch{/* Keep the decoded initial frame when seeking is unavailable. */}}} onError={()=>setFailed(true)}/>;
}
