import {useEffect,useRef,useState} from 'react';
import {Pause,Play,Volume2,VolumeX} from 'lucide-react';
import {useProofAudio} from '../features/media/ProofAudioPlayer';
import type {PublicMarketItem} from '../receiz/public-market';
import {publicAssetEmbed} from '../receiz/public-asset-embed';
const positions:Record<string,number>={};
function save(id:string,time:number){positions[id]=time;const keys=Object.keys(positions);if(keys.length>48)delete positions[keys[0]];}
const clock=(time:number)=>`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;
export function permitsFeedAutoplay(){return !(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;}
export function FeedVideo({item,muted,onMute,controls}:{item:PublicMarketItem;muted:boolean;onMute():void;controls:boolean}){
 const stream=publicAssetEmbed(item),ref=useRef<HTMLVideoElement>(null),[paused,setPaused]=useState(true),[duration,setDuration]=useState(0),[time,setTime]=useState(positions[item.id]??0),[error,setError]=useState(false);
 useEffect(()=>{const video=ref.current;if(!video)return;if(permitsFeedAutoplay())void video.play().catch(()=>setPaused(true));return()=>{save(item.id,video.currentTime);video.pause();video.removeAttribute('src');video.load();};},[item.id]);
 if(!stream)return null;
 const toggle=()=>{const video=ref.current;if(!video)return;if(video.paused)void video.play().catch(()=>setPaused(true));else video.pause();};
 return <><video ref={ref} className="feed-video" src={stream.stream.url} poster={item.artworkUrl??undefined} playsInline muted={muted} loop preload="metadata" aria-label={item.title} onLoadedMetadata={event=>{const video=event.currentTarget;setDuration(Number.isFinite(video.duration)?video.duration:0);if(positions[item.id]&&positions[item.id]<video.duration)video.currentTime=positions[item.id];}} onTimeUpdate={event=>{setTime(event.currentTarget.currentTime);save(item.id,event.currentTarget.currentTime);}} onPlay={()=>setPaused(false)} onPause={()=>setPaused(true)} onError={()=>setError(true)}/><div className="feed-video-tools" hidden={!controls}><button className="feed-icon" aria-label={muted?'Unmute video':'Mute video'} onClick={onMute}>{muted?<VolumeX/>:<Volume2/>}</button></div><div className="feed-video-transport" hidden={!controls}><button className="feed-icon" aria-label={paused?'Play video':'Pause video'} onClick={toggle}>{paused?<Play/>:<Pause/>}</button>{duration>0&&<input type="range" aria-label="Seek video" min="0" max={duration} step=".1" value={Math.min(time,duration)} onChange={event=>{if(ref.current)ref.current.currentTime=Number(event.target.value);}}/>}{error&&<button className="feed-media-retry" onClick={()=>{setError(false);ref.current?.load();toggle();}}>Play again</button>}</div></>;
}
export function FeedAudio({item,controls}:{item:PublicMarketItem;controls:boolean}){
 const stream=publicAssetEmbed(item),wrap=useRef<HTMLDivElement>(null),places=useRef(positions),audio=useProofAudio({file:{filename:item.title,memberPath:item.id},url:stream?.stream.url??'',positions:places});
 useEffect(()=>{const element=wrap.current?.querySelector<HTMLAudioElement>('audio');return()=>{if(element){save(item.id,element.currentTime);element.pause();element.removeAttribute('src');element.load();}};},[item.id]);
 // The shared audio hook owns one element and retains the same playback semantics.
 return <div ref={wrap} className="feed-audio" hidden={!controls}>{audio.element}<button className="feed-audio-play" aria-label={audio.state.paused?'Play music':'Pause music'} onClick={audio.toggle}>{audio.state.paused?<Play fill="currentColor"/>:<Pause fill="currentColor"/>}</button>{audio.state.duration>0&&<div className="feed-audio-progress"><time>{clock(audio.state.time)}</time><input type="range" aria-label="Seek music" min="0" max={audio.state.duration} step=".1" value={Math.min(audio.state.time,audio.state.duration)} onChange={event=>audio.seek(Number(event.target.value))}/><time>{clock(audio.state.duration)}</time></div>}{audio.state.message&&<span role="status">{audio.state.message}</span>}</div>;
}
