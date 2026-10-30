import {createContext,useContext,useEffect,useRef,useState,useSyncExternalStore,type ReactNode,type RefObject} from 'react';
import {feedMediaPositions as positions,saveFeedMediaPosition as save} from './feed-media-positions';
import {feedMusicSnapshot,subscribeFeedMusic,toggleFeedMusic,seekFeedMusic,extendFeedMusic} from './feed-music-owner';
import {Pause,Play,Volume2,VolumeX} from 'lucide-react';
import {useProofAudio} from '../features/media/ProofAudioPlayer';
import type {PublicMarketItem} from '../receiz/public-market';
import {publicAssetEmbed} from '../receiz/public-asset-embed';
const clock=(time:number)=>`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;
export function permitsFeedAutoplay(){return !(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)&&!(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;}
export function FeedVideo({item,muted,onMute,controls}:{item:PublicMarketItem;muted:boolean;onMute():void;controls:boolean}){
 const stream=publicAssetEmbed(item),ref=useRef<HTMLVideoElement>(null),[paused,setPaused]=useState(true),[duration,setDuration]=useState(0),[time,setTime]=useState(positions[item.id]??0),[error,setError]=useState(false);
 useEffect(()=>{const video=ref.current;if(!video||!stream)return;if(video.getAttribute('src')!==stream.stream.url)video.src=stream.stream.url;if(permitsFeedAutoplay())void video.play().catch(()=>setPaused(true));return()=>{if(video.readyState>=1)save(item.id,video.currentTime);video.pause();video.removeAttribute('src');video.load();};},[item.id]);
 if(!stream)return null;
 const toggle=()=>{const video=ref.current;if(!video)return;if(video.paused)void video.play().catch(()=>setPaused(true));else video.pause();};
 return <><video ref={ref} className="feed-video" src={stream.stream.url} poster={item.artworkUrl??undefined} playsInline muted={muted} loop preload="metadata" aria-label={item.title} onLoadedMetadata={event=>{const video=event.currentTarget;setDuration(Number.isFinite(video.duration)?video.duration:0);if(positions[item.id]&&positions[item.id]<video.duration)video.currentTime=positions[item.id];}} onTimeUpdate={event=>{setTime(event.currentTarget.currentTime);save(item.id,event.currentTarget.currentTime);}} onPlay={()=>setPaused(false)} onPause={()=>setPaused(true)} onError={()=>setError(true)}/><div className="feed-video-tools" hidden={!controls}><button className="feed-icon" aria-label={muted?'Unmute video':'Mute video'} onClick={onMute}>{muted?<VolumeX/>:<Volume2/>}</button></div><div className="feed-video-transport" hidden={!controls}><button className="feed-icon" aria-label={paused?'Play video':'Pause video'} onClick={toggle}>{paused?<Play/>:<Pause/>}</button>{duration>0&&<input type="range" aria-label="Seek video" min="0" max={duration} step=".1" value={Math.min(time,duration)} onChange={event=>{if(ref.current)ref.current.currentTime=Number(event.target.value);}}/>}{error&&<button className="feed-media-retry" onClick={()=>{setError(false);ref.current?.load();toggle();}}>Play again</button>}</div></>;
}
type AudioPlayback={state:Pick<ReturnType<typeof useProofAudio>['state'],'paused'|'time'|'duration'|'message'>;seek(time:number):void};
type MusicContext={queue:readonly PublicMarketItem[];continuation?:()=>Promise<readonly PublicMarketItem[]>};
const MusicSession=createContext<MusicContext|null>(null);
/** Views share presentation; the native owner survives their close/unmount. */
export function FeedMusicSession({queue,continuation,children}:{queue:readonly PublicMarketItem[]|null;continuation?:()=>Promise<readonly PublicMarketItem[]>;children:ReactNode}){useEffect(()=>{if(queue)extendFeedMusic(queue);},[queue]);return <MusicSession.Provider value={queue?{queue,continuation}:null}>{children}</MusicSession.Provider>;}
function PersistentFeedAudio({item,queue,continuation,controls}:{item:PublicMarketItem;queue:readonly PublicMarketItem[];continuation?:()=>Promise<readonly PublicMarketItem[]>;controls:boolean}){
 const held=useSyncExternalStore(subscribeFeedMusic,feedMusicSnapshot,feedMusicSnapshot),state=held.itemId===item.id?held:{paused:true,time:positions[item.id]??0,duration:0,message:''};
 return <AudioControls item={item} controls={controls} audio={{state,seek:seekFeedMusic}} toggle={()=>toggleFeedMusic(queue,queue.findIndex(row=>row.id===item.id),continuation)}/>;
}
function AudioControls({item,controls,audio,toggle,element,wrap}:{item:PublicMarketItem;controls:boolean;audio:AudioPlayback;toggle():void;element?:ReactNode;wrap?:RefObject<HTMLDivElement|null>}){
 return <div ref={wrap} className="feed-audio" hidden={!controls}>{element}<button className="feed-audio-play" aria-label={audio.state.paused?'Play music':'Pause music'} onClick={toggle}>{audio.state.paused?<Play fill="currentColor"/>:<Pause fill="currentColor"/>}</button>{audio.state.duration>0&&<div className="feed-audio-progress"><time>{clock(audio.state.time)}</time><input type="range" aria-label="Seek music" min="0" max={audio.state.duration} step=".1" value={Math.min(audio.state.time,audio.state.duration)} onChange={event=>audio.seek(Number(event.target.value))}/><time>{clock(audio.state.duration)}</time></div>}{audio.state.message&&<span role="status">{audio.state.message}</span>}<span className="sr-only">{item.title}</span></div>;
}
function LocalFeedAudio({item,controls}:{item:PublicMarketItem;controls:boolean}){
 const stream=publicAssetEmbed(item),wrap=useRef<HTMLDivElement>(null),places=useRef(positions),audio=useProofAudio({file:{filename:item.title,memberPath:item.id},url:stream?.stream.url??'',positions:places});
 useEffect(()=>{const element=wrap.current?.querySelector<HTMLAudioElement>('audio');if(element&&stream&&element.getAttribute('src')!==stream.stream.url)element.src=stream.stream.url;return()=>{if(element){if(element.readyState>=1)save(item.id,element.currentTime);element.pause();element.removeAttribute('src');element.load();}};},[item.id]);
 return <AudioControls item={item} controls={controls} audio={audio} toggle={audio.toggle} element={audio.element} wrap={wrap}/>;
}
export function FeedAudio({item,controls}:{item:PublicMarketItem;controls:boolean}){
 const session=useContext(MusicSession);return session?<PersistentFeedAudio item={item} queue={session.queue} continuation={session.continuation} controls={controls}/>:<LocalFeedAudio item={item} controls={controls}/>;
}
