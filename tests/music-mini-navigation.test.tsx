// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it,vi} from 'vitest';
const held=vi.hoisted(()=>({state:{itemId:'song',paused:false,time:17,duration:200,message:''},item:{id:'song',title:'Song',artworkUrl:null}}));
vi.mock('../src/public-feed/feed-music-owner',()=>({feedMusicSnapshot:()=>held.state,subscribeFeedMusic:()=>()=>{},feedMusicQueue:()=>[held.item],toggleFeedMusic:vi.fn(),stopFeedMusic:vi.fn()}));
vi.mock('../src/features/market/MarketFeedPopover',()=>({MarketFeedPopover:()=> <div data-open-music-view/>}));
import {MusicMiniPlayer} from '../src/public-feed/MusicMiniPlayer';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{history.replaceState({},'','/');});
it('closes only the opened music view on a real page transition while keeping the native session and return control',()=>{history.replaceState({},'','/discover/');const host=document.createElement('div'),root=createRoot(host);document.body.append(host);try{act(()=>root.render(<MusicMiniPlayer/>));act(()=>document.querySelector<HTMLButtonElement>('.music-mini-open')!.click());expect(document.querySelector('[data-open-music-view]')).not.toBeNull();act(()=>dispatchEvent(new Event('receiz-bank:surface')));expect(document.querySelector('[data-open-music-view]')).not.toBeNull();history.replaceState({},'','/creator/');act(()=>dispatchEvent(new Event('receiz-bank:surface')));expect(document.querySelector('[data-open-music-view]')).toBeNull();expect(document.querySelector('.music-mini-open')).not.toBeNull();expect(held.state).toMatchObject({itemId:'song',paused:false,time:17});}finally{act(()=>root.unmount());host.remove();}});

it('keeps Pause and Stop available when For you displays a different song from the one still playing',()=>{
 const host=document.createElement('div'),stage=document.createElement('article'),root=createRoot(host);stage.className='feed-stage';stage.dataset.feedKind='audio';stage.dataset.feedItem='different-song';stage.setAttribute('aria-hidden','false');stage.getClientRects=()=>[{}]as unknown as DOMRectList;document.body.append(stage,host);
 try{act(()=>root.render(<MusicMiniPlayer/>));expect(document.querySelector('[aria-label="Pause music"]')).not.toBeNull();expect(document.querySelector('[aria-label="Stop music and close player"]')).not.toBeNull();}finally{act(()=>root.unmount());host.remove();stage.remove();}
});
