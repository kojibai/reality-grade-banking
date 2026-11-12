// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {AssetsRowArtwork} from '../src/features/assets/AssetsRowArtwork';
import type {PublicMarketItem} from '../src/receiz/public-market';
vi.mock('../src/features/market/PublicObjectRow',()=>({PublicObjectArtwork:({item}:{item:PublicMarketItem})=><img src={item.artworkUrl!} alt=""/>}));
const item={id:'exact-held-original',artworkUrl:'/already-held.png'} as PublicMarketItem;
afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';});
it('releases distant media while preserving its frame, restores before entry, and retains artwork across hidden-tab zero geometry',async()=>{
 let notify!:IntersectionObserverCallback;const observe=vi.fn(),unobserve=vi.fn();
 vi.stubGlobal('IntersectionObserver',class{constructor(callback:IntersectionObserverCallback,options:IntersectionObserverInit){notify=callback;expect(options.rootMargin).toBe('600px 0px');}observe=observe;unobserve=unobserve;});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(()=>root.render(<AssetsRowArtwork item={item} initiallyNear={true}/>));
 const frame=host.firstElementChild!;expect(frame.querySelector('img')?.getAttribute('src')).toBe('/already-held.png');
 const seen=(isIntersecting:boolean,width:number)=>act(()=>notify([{target:frame,isIntersecting,boundingClientRect:{width}} as IntersectionObserverEntry],{} as IntersectionObserver));
 await seen(false,200);expect(host.firstElementChild).toBe(frame);expect(frame.querySelector('img')).toBeNull();
 await seen(true,200);expect(frame.querySelector('img')).not.toBeNull();
 await seen(false,0);expect(frame.querySelector('img')).not.toBeNull();
 await act(()=>root.unmount());expect(unobserve).toHaveBeenCalledWith(frame);
});
it('keeps the existing artwork immediately when visibility observation is unavailable',async()=>{
 vi.stubGlobal('IntersectionObserver',undefined);const host=document.createElement('div');const root=createRoot(host);
 await act(()=>root.render(<AssetsRowArtwork item={item} initiallyNear={false}/>));expect(host.querySelector('img')).not.toBeNull();
 await act(()=>root.unmount());
});
