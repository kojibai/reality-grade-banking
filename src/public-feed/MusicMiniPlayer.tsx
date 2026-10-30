import {useEffect,useState,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {createPortal} from 'react-dom';
import {Music2,Pause,Play,X} from 'lucide-react';
import {MarketFeedPopover} from '../features/market/MarketFeedPopover';
import {feedMusicSnapshot,subscribeFeedMusic,feedMusicQueue,toggleFeedMusic,stopFeedMusic} from './feed-music-owner';
import './music-mini-player.css';
/** Only presentation is portaled into the active dialog. Native playback stays
 * outside every page/panel and never depends on this view remaining mounted. */
export function MusicMiniPlayer(){
 const state=useSyncExternalStore(subscribeFeedMusic,feedMusicSnapshot,feedMusicSnapshot),[open,setOpen]=useState(false),[surface,setSurface]=useState<{host:HTMLElement;full:boolean}>(()=>({host:document.body,full:false}));
 useEffect(()=>{if(!open)return;const from=location.href,changed=()=>{if(location.href!==from)setOpen(false);};addEventListener('receiz-bank:surface',changed);addEventListener('receiz-learn:page',changed);return()=>{removeEventListener('receiz-bank:surface',changed);removeEventListener('receiz-learn:page',changed);};},[open]);
 useEffect(()=>{if(!state.itemId){setOpen(false);return;}const update=()=>{
  const dialogs=[...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(dialog=>!dialog.closest('[hidden]')),host=dialogs.at(-1)??document.body;
  const music=[...host.querySelectorAll<HTMLElement>('.feed-stage[data-feed-kind="audio"][aria-hidden="false"]')].some(node=>!node.closest('[hidden]')&&node.getClientRects().length>0);
  setSurface(previous=>previous.host===host&&previous.full===music?previous:{host,full:music});
 };update();const observer=new MutationObserver(records=>{if(records.some(record=>record.type==='attributes'||[...record.addedNodes,...record.removedNodes].some(node=>node instanceof Element&&(node.matches('dialog,.public-feed')||node.querySelector('dialog,.public-feed')))))update();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','aria-hidden','data-bank-surface']});return()=>observer.disconnect();},[state.itemId]);
 const queue=feedMusicQueue(),at=queue.findIndex(item=>item.id===state.itemId),item=queue[at];if(!item)return null;
 return <>{!open&&!surface.full&&createPortal(<aside className="music-mini-player" aria-label="Music controls"><button className="music-mini-open" aria-label={'Open music feed: '+item.title} title={item.title} onClick={()=>setOpen(true)}>{item.artworkUrl?<img src={item.artworkUrl} alt=""/>:<Music2 size={19}/>}</button><button className="music-mini-transport" aria-label={state.paused?'Resume music':'Pause music'} title={state.paused?'Play':'Pause'} onClick={()=>toggleFeedMusic(queue,at)}>{state.paused?<Play size={16} fill="currentColor"/>:<Pause size={16} fill="currentColor"/>}</button><button className="music-mini-stop" aria-label="Stop music and close player" title="Stop music" onClick={stopFeedMusic}><X size={14}/></button></aside>,surface.host)}{open&&<MarketFeedPopover items={queue} initialFilter="audio" selectedItemId={item.id} active onClose={()=>setOpen(false)}/>}</>;
}
let mounted=false;
export function mountMusicMiniPlayer(){if(mounted)return;mounted=true;const navigation=new URL('/learn/discover.js',location.origin).href;void import(/* @vite-ignore */ navigation).then(module=>module.init()).catch(()=>{});const host=document.createElement('div');host.dataset.musicControls='';document.body.append(host);createRoot(host).render(<MusicMiniPlayer/>);}
