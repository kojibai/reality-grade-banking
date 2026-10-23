import {useEffect,useRef,useState,type CSSProperties,type MutableRefObject} from 'react';
import {Download,LoaderCircle,Music2,Pause,Play,RotateCcw,RotateCw,Volume2,VolumeX} from 'lucide-react';
import type {MediaFile} from '../../receiz/proof-media';
import {usePassiveMediaPreload} from './usePassiveMediaPreload';
import './proof-audio-player.css';

type AudioState={time:number;duration:number;paused:boolean;volume:number;muted:boolean;waiting:boolean;error:boolean;message:string};
const initial:AudioState={time:0,duration:0,paused:true,volume:1,muted:false,waiting:false,error:false,message:''};
const durationOf=(audio:HTMLAudioElement)=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:0;
const timeOf=(audio:HTMLAudioElement)=>Number.isFinite(audio.currentTime)?Math.max(0,audio.currentTime):0;
function clock(seconds:number){const total=Math.floor(Math.max(0,seconds)),hours=Math.floor(total/3600),minutes=Math.floor(total/60)%60;return `${hours?`${hours}:`:''}${hours?String(minutes).padStart(2,'0'):minutes}:${String(total%60).padStart(2,'0')}`;}

/** One native audio element owns playback. Its controls may move between views
 * without replacing that element, reloading bytes, or restarting playback. */
export function useProofAudio({file,url,positions}:{file?:Pick<MediaFile,'filename'|'memberPath'>;url:string;positions:MutableRefObject<Record<string,number>>}){
 const ref=useRef<HTMLAudioElement>(null),[state,setState]=useState<AudioState>(initial),mediaKey=file?.memberPath??file?.filename??'';
 const preload=usePassiveMediaPreload();
 function sync(patch:Partial<AudioState>={}){
  const audio=ref.current;if(!audio)return;
  const time=timeOf(audio);if(mediaKey)positions.current[mediaKey]=time;
  setState(previous=>{const next={...previous,time,duration:durationOf(audio),paused:audio.paused,volume:audio.volume,muted:audio.muted,...patch};return Object.keys(next).every(key=>next[key as keyof AudioState]===previous[key as keyof AudioState])?previous:next;});
 }
 useEffect(()=>{setState({...initial});if(ref.current&&ref.current.readyState>=1)sync();},[url]);
 function seek(time:number){const audio=ref.current;if(!audio||!durationOf(audio)||!Number.isFinite(time))return;try{audio.currentTime=Math.min(durationOf(audio),Math.max(0,time));sync();}catch{/* The native element may be between sources; its next metadata event restores seeking. */}}
 function toggle(){const audio=ref.current;if(!audio)return;if(!audio.paused){audio.pause();sync();return;}setState(previous=>({...previous,message:''}));void audio.play().catch(()=>setState(previous=>({...previous,message:'Playback could not start. Try again.'})));}
 function mute(){const audio=ref.current;if(audio){audio.muted=!audio.muted;sync();}}
 function volume(value:number){const audio=ref.current;if(audio&&Number.isFinite(value)){audio.volume=Math.max(0,Math.min(1,value));if(value>0)audio.muted=false;sync();}}
 const element=file&&url?<audio ref={ref} src={url} controls hidden tabIndex={-1} aria-hidden="true" aria-label={file.filename} preload={preload} onLoadedMetadata={()=>{const audio=ref.current!,position=positions.current[mediaKey];if(position&&position<durationOf(audio))audio.currentTime=position;sync({waiting:false});}} onDurationChange={()=>sync()} onTimeUpdate={()=>sync()} onPlay={()=>sync({message:''})} onPause={()=>sync({waiting:false})} onEnded={()=>sync({waiting:false})} onWaiting={()=>sync({waiting:true})} onPlaying={()=>sync({waiting:false})} onCanPlay={()=>sync({waiting:false})} onVolumeChange={()=>sync()} onError={()=>sync({error:true,waiting:false})}/>:null;
 return{element,state,seek,toggle,mute,volume,skip:(seconds:number)=>{if(ref.current)seek(timeOf(ref.current)+seconds);}};
}
type Playback=ReturnType<typeof useProofAudio>;
export function ProofAudioPlayer({title,file,url,artworkUrl,onArtworkError,playback,prioritizeArtwork=false,label='Original audio'}:{title:string;file:Pick<MediaFile,'filename'>;url:string;artworkUrl:string|null;onArtworkError:()=>void;playback:Playback;prioritizeArtwork?:boolean;label?:string}){
 const {state,seek,toggle,mute,volume,skip}=playback,seekable=state.duration>0,fill=seekable?Math.min(100,state.time/state.duration*100):0;
 if(state.error)return <div className="proof-media-fallback proof-audio-error"><Music2 size={36} strokeWidth={1}/><p>This device cannot play this audio.</p><a href={url} download={file.filename}>Save audio<Download size={15}/></a></div>;
 return <div className={`proof-audio-view proof-audio-player ${!state.paused?'is-playing':''}`}>
  {artworkUrl?<div className="proof-audio-artwork"><img src={artworkUrl} alt={`${title} artwork`} loading="eager" fetchPriority={prioritizeArtwork?'high':'auto'} decoding="async" referrerPolicy="no-referrer" crossOrigin={artworkUrl.includes('/api/proof-material/packages/')?'anonymous':undefined} draggable={false} onError={onArtworkError}/></div>:<div className="proof-audio-disc" aria-hidden="true"><span><Music2 size={24} strokeWidth={1}/></span></div>}
  <div className="proof-audio-player-caption"><span>{state.waiting&&!state.paused?'Buffering':state.paused?label:'Now playing'}</span><h3>{title}</h3></div>
  <div className="proof-audio-player-controls">
   <label className="proof-audio-seek"><input type="range" aria-label="Seek audio" min="0" max={state.duration||0} step="0.1" value={seekable?Math.min(state.time,state.duration):0} disabled={!seekable} aria-valuetext={`${clock(state.time)} of ${seekable?clock(state.duration):'duration unavailable'}`} style={{'--audio-fill':`${fill}%`} as CSSProperties} onChange={event=>seek(Number(event.target.value))}/></label>
   <div className="proof-audio-timing" aria-hidden="true"><time>{clock(state.time)}</time><time>{seekable?clock(state.duration):'—:—'}</time></div>
   <div className="proof-audio-transport"><div className="proof-audio-player-buttons"><button type="button" aria-label="Back 15 seconds" title="Back 15 seconds" disabled={!seekable} onClick={()=>skip(-15)}><RotateCcw size={19} strokeWidth={1.5}/><span aria-hidden="true">15</span></button><button type="button" className="proof-audio-play" aria-label={state.paused?'Play audio':'Pause audio'} onClick={toggle}>{state.waiting&&!state.paused?<LoaderCircle size={23} strokeWidth={1.5} className="proof-media-spinner"/>:state.paused?<Play size={23} fill="currentColor" strokeWidth={1}/>:<Pause size={23} fill="currentColor" strokeWidth={1}/>}</button><button type="button" aria-label="Forward 15 seconds" title="Forward 15 seconds" disabled={!seekable} onClick={()=>skip(15)}><RotateCw size={19} strokeWidth={1.5}/><span aria-hidden="true">15</span></button></div>
    <div className="proof-audio-volume"><button type="button" aria-label={state.muted||state.volume===0?'Unmute audio':'Mute audio'} title={state.muted?'Unmute':'Mute'} onClick={()=>{if(state.volume===0)volume(1);else mute();}}>{state.muted||state.volume===0?<VolumeX size={17} strokeWidth={1.5}/>:<Volume2 size={17} strokeWidth={1.5}/>}</button><input type="range" aria-label="Audio volume" min="0" max="1" step="0.05" value={state.muted?0:state.volume} aria-valuetext={`${Math.round((state.muted?0:state.volume)*100)} percent`} onChange={event=>volume(Number(event.target.value))}/></div>
   </div>
  </div>{state.message&&<p className="proof-audio-playback-message" role="status">{state.message}</p>}
 </div>;
}
