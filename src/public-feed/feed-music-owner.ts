import {publicAssetEmbed} from '../receiz/public-asset-embed';
import type {PublicMarketItem} from '../receiz/public-market';
import {feedMediaPositions,saveFeedMediaPosition} from './feed-media-positions';
export type MusicState={itemId:string|null;paused:boolean;time:number;duration:number;message:string};
const initial:MusicState={itemId:null,paused:true,time:0,duration:0,message:''};
/** Native playback is document-owned, beneath the existing public media role.
 * Only Play creates players. One plays; one prepares the next public stream.
 * Closing/hiding a presentation never owns or stops this session. */
export function createFeedMusicOwner(createAudio:()=>HTMLAudioElement,media?:MediaSession,metadata?:(item:PublicMarketItem)=>MediaMetadata){
 let state:MusicState=initial,queue:PublicMarketItem[]=[],at=0,intent=false,players:HTMLAudioElement[]=[],current:HTMLAudioElement|null=null,prepared:HTMLAudioElement|null=null;
 let revision=0,continuationRevision=-1;
 const listeners=new Set<()=>void>(),removals:(()=>void)[]=[];
 const publish=(patch:Partial<MusicState>)=>{const next={...state,...patch};if(Object.keys(next).every(k=>next[k as keyof MusicState]===state[k as keyof MusicState]))return;state=next;for(const notify of listeners)notify();};
 const seconds=(value:number)=>Number.isFinite(value)?Math.max(0,value):0;
 const item=()=>queue[at]??null;
 const playbackState=()=>{if(media)try{media.playbackState=intent?'playing':'paused';}catch{/* Native playback remains authoritative. */}};
 const pause=()=>{intent=false;current?.pause();publish({paused:true});playbackState();};
 const sync=(node:HTMLAudioElement)=>{if(node!==current)return;const time=seconds(node.currentTime);if(item())saveFeedMediaPosition(item()!.id,time);publish({time,duration:seconds(node.duration),paused:node.paused});};
 function restore(node:HTMLAudioElement){const held=item();if(node!==current||!held)return;const time=feedMediaPositions[held.id];if(time&&Number.isFinite(node.duration)&&time<node.duration)node.currentTime=time;sync(node);}
 function bind(node:HTMLAudioElement){
  node.preload='auto';node.setAttribute('playsinline','');
  const listen=(name:string,read:()=>void)=>{node.addEventListener(name,read);removals.push(()=>node.removeEventListener(name,read));};
  listen('loadedmetadata',()=>restore(node));listen('durationchange',()=>sync(node));listen('timeupdate',()=>sync(node));
  listen('play',()=>{if(node===current){intent=true;sync(node);publish({message:''});playbackState();}});
  listen('pause',()=>{if(node===current){if(node.paused&&!node.ended)intent=false;sync(node);playbackState();}});
  listen('error',()=>{if(node===current){intent=false;publish({paused:true,message:'Playback could not start. Try again.'});playbackState();}});
  listen('ended',()=>{if(node!==current||!intent)return;const next=at+1;if(next<queue.length){saveFeedMediaPosition(queue[next].id,0);activate(queue,next,true);}else pause();});
 }
 function ensure(){if(players.length)return;current=createAudio();prepared=createAudio();players=[current,prepared];players.forEach(bind);}
 function prepareNext(){const next=queue[at+1],stream=next?publicAssetEmbed(next):null;if(!prepared)return;if(stream){if(prepared.getAttribute('src')!==stream.stream.url){prepared.src=stream.stream.url;prepared.load();}}else{prepared.pause();prepared.removeAttribute('src');prepared.load();}}
 function playCurrent(){if(!current)return;intent=true;playbackState();const selected=current;void selected.play().catch(()=>{if(current===selected){intent=false;publish({paused:true,message:'Playback could not start. Try again.'});playbackState();}});}
 function activate(rows:readonly PublicMarketItem[],index:number,play:boolean){
  const selected=rows[index],stream=selected?publicAssetEmbed(selected):null;if(!selected||stream?.kind!=='audio')return;
  const nextQueue=rows.filter(row=>publicAssetEmbed(row)?.kind==='audio');if(nextQueue.length!==queue.length||nextQueue.some((row,i)=>row.id!==queue[i]?.id))revision++;queue=nextQueue;at=queue.findIndex(row=>row.id===selected.id);if(at<0)return;
  const same=state.itemId===selected.id;
  if(!play&&!players.length){publish({itemId:selected.id,paused:true,time:feedMediaPositions[selected.id]??0,duration:0,message:''});return;}
  ensure();if(!same||current!.getAttribute('src')!==stream.stream.url){
   current!.pause();
   if(prepared!.getAttribute('src')===stream.stream.url){[current,prepared]=[prepared,current];}else{current!.src=stream.stream.url;current!.load();}
   publish({itemId:selected.id,time:feedMediaPositions[selected.id]??0,duration:seconds(current!.duration),paused:!play,message:''});restore(current!);
   if(media&&metadata)try{media.metadata=metadata(selected);}catch{/* Optional system presentation never gates sound. */}
  }
  if(play)playCurrent();else{intent=false;current!.pause();publish({paused:true});playbackState();}
  if(play)prepareNext();
 }
 /** Same-source display additions extend this exact queue; current native audio
  * stays untouched even when the originating view has already closed. */
 const extendQueue=(rows:readonly PublicMarketItem[])=>{if(!state.itemId||!queue.length)return;const incoming=rows.filter(row=>publicAssetEmbed(row)?.kind==='audio'),ids=new Set(incoming.map(row=>row.id));if(!queue.every(row=>ids.has(row.id)))return;const known=new Set(queue.map(row=>row.id)),additions=incoming.filter(row=>!known.has(row.id));if(!additions.length)return;queue=[...queue,...additions];if(intent)prepareNext();};
 const continueFrom=(source:()=>Promise<readonly PublicMarketItem[]>)=>{if(!state.itemId||continuationRevision===revision)return;const version=revision;continuationRevision=version;try{void source().then(rows=>{if(version===revision)extendQueue(rows);}).catch(()=>{if(version===revision)continuationRevision=-1;});}catch{if(version===revision)continuationRevision=-1;}};
 const select=(rows:readonly PublicMarketItem[],index:number)=>{if(rows[index]?.id===state.itemId)return;activate(rows,index,intent);};
 const toggle=(rows:readonly PublicMarketItem[],index:number)=>{if(rows[index]?.id===state.itemId&&intent){pause();return;}activate(rows,index,true);};
 const seek=(time:number)=>{if(current&&Number.isFinite(time)&&Number.isFinite(current.duration)){current.currentTime=Math.max(0,Math.min(current.duration,time));sync(current);}};
 const next=()=>{if(at+1<queue.length)activate(queue,at+1,intent);};
 if(media){const actions:Partial<Record<MediaSessionAction,MediaSessionActionHandler>>={play:()=>{if(queue.length)activate(queue,at,true);},pause,nexttrack:next,previoustrack:()=>{if(at>0)activate(queue,at-1,intent);},seekto:details=>{if(details.seekTime!==undefined)seek(details.seekTime);},seekbackward:details=>seek(state.time-(details.seekOffset??10)),seekforward:details=>seek(state.time+(details.seekOffset??10))};for(const [action,handle]of Object.entries(actions))try{media.setActionHandler(action as MediaSessionAction,handle!);}catch{/* Unsupported native controls are optional. */}}
 return {snapshot:()=>state,subscribe:(notify:()=>void)=>{listeners.add(notify);return()=>{listeners.delete(notify);};},select,toggle,pause,seek,next,extendQueue,continueFrom,queue:()=>queue,stop:()=>{revision++;pause();queue=[];publish({...initial});if(media)try{media.metadata=null;media.playbackState='none';}catch{}players.forEach(node=>{node.removeAttribute('src');node.load();});},dispose:()=>{revision++;intent=false;removals.splice(0).forEach(remove=>remove());players.forEach(node=>{node.pause();node.removeAttribute('src');node.load();node.remove();});players=[];current=prepared=null;listeners.clear();}};
}
type Owner=ReturnType<typeof createFeedMusicOwner>;
let owner:Owner|undefined;
function heldOwner(){
 if(!owner){let host:HTMLElement|undefined;owner=createFeedMusicOwner(()=>{if(!host){host=document.createElement('div');host.hidden=true;host.dataset.feedMusicOwner='';document.body.append(host);void import('./MusicMiniPlayer').then(module=>module.mountMusicMiniPlayer());}const audio=document.createElement('audio');host.append(audio);return audio;},typeof navigator==='undefined'?undefined:navigator.mediaSession,typeof MediaMetadata==='undefined'?undefined:item=>new MediaMetadata({title:item.title,artist:item.ownerDisplayName??item.ownerUsername??'',album:'Bankeiz',...(item.artworkUrl?{artwork:[{src:item.artworkUrl}]}:{})}));}
 return owner;
}
export const subscribeFeedMusic=(notify:()=>void)=>heldOwner().subscribe(notify);
export const feedMusicSnapshot=()=>owner?.snapshot()??initial;
export const feedMusicItemId=()=>feedMusicSnapshot().itemId;
export const selectFeedMusic=(rows:readonly PublicMarketItem[],index:number)=>heldOwner().select(rows,index);
export const toggleFeedMusic=(rows:readonly PublicMarketItem[],index:number,continuation?:()=>Promise<readonly PublicMarketItem[]>)=>{const selected=heldOwner();selected.toggle(rows,index);if(continuation&&!selected.snapshot().paused)selected.continueFrom(continuation);};
export const extendFeedMusic=(rows:readonly PublicMarketItem[])=>owner?.extendQueue(rows);
export const seekFeedMusic=(time:number)=>owner?.seek(time);

const emptyQueue:readonly PublicMarketItem[]=[];
export const feedMusicQueue=()=>owner?.queue()??emptyQueue;
export const stopFeedMusic=()=>owner?.stop();
