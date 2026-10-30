// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicFeed} from '../src/public-feed/PublicFeed';
import {MusicMiniPlayer} from '../src/public-feed/MusicMiniPlayer';
import {feedMusicSnapshot,stopFeedMusic} from '../src/public-feed/feed-music-owner';
import type {PublicMarketItem} from '../src/receiz/public-market';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const song:PublicMarketItem={id:'carried-song',assetId:'carried-song',title:'Carried song',summary:'',category:'proof',mediaKind:'audio',sourceUrl:'https://receiz.com/artist/verified/carried-song',playback:{url:'https://receiz.com/song.mp3',mimeType:'audio/mpeg'},originalUrl:null,originalDigest:null,verifyUrl:null,pulse:null,sealedAt:null,ownerUsername:'artist',ownerDisplayName:'Artist',ownerProfileUrl:null,priceUsd:null,changePct:null,chart:[],authority:'projection-only',canTrade:false};
afterEach(()=>{act(()=>stopFeedMusic());vi.restoreAllMocks();});

it('keeps the same playing audio and floating controls after closing For you and navigating away',async()=>{
 vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(function(this:HTMLMediaElement){Object.defineProperty(this,'paused',{configurable:true,value:false});this.dispatchEvent(new Event('play'));return Promise.resolve();});
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(function(this:HTMLMediaElement){Object.defineProperty(this,'paused',{configurable:true,value:true});this.dispatchEvent(new Event('pause'));});
 vi.spyOn(HTMLMediaElement.prototype,'load').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host),controlsHost=document.createElement('div'),controls=createRoot(controlsHost),before=location.pathname;
 document.body.append(host,controlsHost);history.replaceState({},'','/discover/');
 try{
  function App({open=true}:{open?:boolean}){return open?<PublicFeed seed={[song]} active discover={false} onClose={()=>root.render(<App open={false}/>)}/>:<p>Discover is still here</p>;}
  await act(async()=>{root.render(<App/>);controls.render(<MusicMiniPlayer/>);});
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Play music"]')!.click());
  const audio=[...document.querySelectorAll('audio')].find(node=>node.getAttribute('src')===song.playback!.url)!;
  expect(audio.paused).toBe(false);
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Close feed"]')!.click());
  expect(host.textContent).toContain('Discover is still here');
  expect(audio.isConnected).toBe(true);expect(audio.paused).toBe(false);
  expect(feedMusicSnapshot()).toMatchObject({itemId:song.id,paused:false});
  expect(document.querySelector('[aria-label="Music controls"]')).not.toBeNull();
  history.replaceState({},'','/artist/');await act(async()=>dispatchEvent(new Event('receiz-bank:surface')));
  expect(audio.isConnected).toBe(true);expect(audio.paused).toBe(false);
  const pause=document.querySelector<HTMLButtonElement>('[aria-label="Pause music"]')!;
  await act(async()=>pause.click());expect(audio.paused).toBe(true);
  await act(async()=>document.querySelector<HTMLButtonElement>('[aria-label="Resume music"]')!.click());expect(audio.paused).toBe(false);
  await act(async()=>document.querySelector<HTMLButtonElement>('[aria-label="Stop music and close player"]')!.click());
  expect(feedMusicSnapshot().itemId).toBeNull();expect(audio.hasAttribute('src')).toBe(false);
 }finally{act(()=>{root.unmount();controls.unmount();});host.remove();controlsHost.remove();history.replaceState({},'',before);}
});
