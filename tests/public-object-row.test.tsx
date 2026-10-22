// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicObjectRow} from '../src/features/market/PublicObjectRow';
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import {ProfileCollection} from '../src/public-explorer/ProfileCollection';
import {parsePublicProfile} from '../src/receiz/public-profile';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:Root|null=null;
afterEach(()=>{if(root)act(()=>root!.unmount());root=null;document.body.replaceChildren();vi.restoreAllMocks();});
function item(kind:string,media:Record<string,unknown>={}):PublicMarketItem{
 return parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'listed-object',receizId:'asset-1',title:'Listed original',valueUsd:12,ownerUsername:'artist',createdAt:'2026-10-01T12:00:00Z',profileOriginal:{media:{kind,originalDownloadSrc:'/api/profile/originals/download?receizId=asset-1&kind=original',originalDownloadSha256Hex:'a'.repeat(64),...media}}}]}}).items[0];
}
function mount(value:PublicMarketItem,onOpen=()=>{}){
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<PublicObjectRow item={value} onOpen={onOpen}/>));return host;
}
it.each([
 ['image','src','image.png','Image'],
 ['audio','audioCoverSrc','album.jpg','Music'],
 ['video','videoPosterSrc','poster.webp','Video'],
 ['epub','epubCoverSrc','book.png','Book'],
])('renders the carried %s artwork and retains its content caption without opening media',(kind,field,file,label)=>{
 const fetcher=vi.spyOn(globalThis,'fetch'),onOpen=vi.fn(),value=item(kind,{[field]:'/artwork/'+file}),host=mount(value,onOpen),image=host.querySelector('img');
 expect(image?.getAttribute('src')).toBe('https://receiz.com/artwork/'+file);
 expect(image?.getAttribute('alt')).toBe('');
 expect(host.querySelector('.row-copy>strong')?.textContent).toBe('Listed original');
 expect(host.querySelector('.row-copy>span')?.textContent).toBe(label);
 expect(host.textContent).toContain('@artist');expect(host.textContent).toContain('$12.00');
 expect(host.querySelector('.asset-mark svg')).toBeNull();
 expect(fetcher).not.toHaveBeenCalled();
 act(()=>host.querySelector('button')!.click());expect(onOpen).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
});
it('keeps the fallback icon when artwork is absent instead of loading the sealed original',()=>{
 const fetcher=vi.spyOn(globalThis,'fetch'),host=mount(item('audio'));
 expect(host.querySelector('img')).toBeNull();expect(host.querySelector('.asset-mark svg')).not.toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it('keeps the fallback icon for an unsupported artwork URL',()=>{
 const host=mount({...item('image'),artworkUrl:'https://outside.example/artwork.png'});
 expect(host.querySelector('img')).toBeNull();expect(host.querySelector('.asset-mark svg')).not.toBeNull();
});
it('restores the fallback icon on an image error and can show newly carried artwork',()=>{
 const value=item('audio',{audioCoverSrc:'/artwork/album.jpg'}),host=mount(value),image=host.querySelector('img');
 expect(image).not.toBeNull();
 act(()=>image!.dispatchEvent(new Event('error')));
 expect(host.querySelector('img')).toBeNull();expect(host.querySelector('.asset-mark svg')).not.toBeNull();expect(host.querySelector('.row-copy>span')?.textContent).toBe('Music');
 act(()=>root!.render(<PublicObjectRow item={{...value,artworkUrl:'https://receiz.com/artwork/revised-album.jpg'}} onOpen={()=>{}}/>));
 expect(host.querySelector('img')?.getAttribute('src')).toBe('https://receiz.com/artwork/revised-album.jpg');
});
it.each([false,true])('shows the carried artwork immediately in a public asset popover (readOnly=%s) without fetching its original',readOnly=>{
 const fetcher=vi.spyOn(globalThis,'fetch'),value=item('audio',{audioCoverSrc:'/artwork/album.jpg'}),host=document.createElement('div');document.body.append(host);root=createRoot(host);
 act(()=>root!.render(<PublicAssetDetail item={value} readOnly={readOnly}/>));
 expect(host.querySelector('.asset-detail-heading img')?.getAttribute('src')).toBe('https://receiz.com/artwork/album.jpg');
 expect(host.querySelector('.proof-object-artwork img')?.getAttribute('src')).toBe('https://receiz.com/artwork/album.jpg');
 expect(host.querySelector('.asset-object')?.getAttribute('data-showing')).toBe('front');
 expect(host.textContent).not.toContain('Original verified');expect(fetcher).not.toHaveBeenCalled();
});
it('shows carried artwork in the popover heading when no original locator is supplied',()=>{
 const fetcher=vi.spyOn(globalThis,'fetch'),value={...item('image',{src:'/artwork/image.png'}),originalUrl:null,originalDigest:null},host=document.createElement('div');document.body.append(host);root=createRoot(host);
 act(()=>root!.render(<PublicAssetDetail item={value}/>));
 const image=host.querySelector('.asset-detail-heading img');expect(image?.getAttribute('src')).toBe('https://receiz.com/artwork/image.png');expect(fetcher).not.toHaveBeenCalled();
 act(()=>image!.dispatchEvent(new Event('error')));expect(host.querySelector('.asset-detail-heading img')).toBeNull();expect(host.querySelector('.asset-detail-heading .asset-mark svg')).not.toBeNull();
});
it.each(['image','audio'])('opens already-carried %s artwork without lazy deferral and with the same request mode as the Market row',kind=>{
 const fetcher=vi.spyOn(globalThis,'fetch'),value=item(kind,{[kind==='image'?'src':'audioCoverSrc']:'/api/proof-material/packages/'+'c'.repeat(64)+'/artifact'}),host=mount(value),rowImage=host.querySelector('img')!;
 expect(rowImage.getAttribute('crossorigin')).toBe('anonymous');
 act(()=>root!.render(<PublicAssetDetail item={value}/>));
 const cover=host.querySelector<HTMLImageElement>('.proof-media img')!;
 expect(cover.src).toBe(rowImage.src);expect(cover.getAttribute('crossorigin')).toBe('anonymous');expect(cover.loading).not.toBe('lazy');expect(fetcher).not.toHaveBeenCalled();
});
const legacyAudioId='2cfe5eb6-56b0-423b-b414-09c49b33d147';
const legacyAudioPlayback='https://receiz.com/api/storage/object?bucket=receiz-profile-originals&path=originals%2Feecb99a0-9c6a-4e89-813b-f76331ea9c41%2F20260601133009_9f63e62bd8f766f6f52f.mp3';
const legacyAudio=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:bjklock:'+legacyAudioId,receizId:legacyAudioId,title:'SHOW ME THE THING',canonicalHref:'/bjklock/verified/'+legacyAudioId,verifyHref:'/v/20260601_0930/CD3A5EA2/12413334?a=ba6517cc&ms=1780320602933',profileOriginal:{hasLongForm:false,mediaKind:'audio',playback:{url:legacyAudioPlayback,mimeType:'audio/mpeg'},media:{gateAudioPlayback:false,originalDownloadMime:'audio/mpeg',originalDownloadSrc:'/api/profile/originals/download?receizId='+legacyAudioId+'&kind=original',originalDownloadSha256Hex:'6f19099f898afcfd39848779050b19301a21c4ae9958374d04b40cb5c8b09302',material:null}}}]}}).items[0];
it.each([false,true])('plays carried legacy public audio without resolving or fetching its separately sold Original (standalone=%s)',async standalone=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({ok:false},{status:402})),value=legacyAudio(),host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<PublicAssetDetail item={value} readOnly standalone={standalone}/>));
 if(!standalone){expect(host.querySelector('audio')).toBeNull();await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());}
 expect(host.querySelector('audio')?.getAttribute('src')).toBe(legacyAudioPlayback);expect(host.querySelector('audio')?.getAttribute('preload')).toBe('metadata');
 expect(host.querySelector('[aria-label="Play audio"]')).not.toBeNull();expect(host.textContent).toContain('Public playback');expect(host.textContent).not.toContain('Original verified');expect(host.querySelector('.proof-media-binding')).toBeNull();
 expect(value.originalUrl).toBe('https://receiz.com/api/profile/originals/download?receizId='+legacyAudioId+'&kind=original');expect(host.querySelector('a[href="'+value.verifyUrl+'"]')).not.toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it('uses the same public audio stream when an older object opens in its profile collection',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({ok:false},{status:402})),value=legacyAudio();
 const profile=parsePublicProfile({ok:true,profile:{profile:{userId:'public-audio-fixture',username:'bjklock',isPrivate:false},viewer:{canView:true},originals:[]}},'bjklock');
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<ProfileCollection profile={profile} items={[value]} active/>));
 expect(host.querySelector('audio')).toBeNull();await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Experience SHOW ME THE THING"]')!.click());
 expect(host.querySelector('audio')?.getAttribute('src')).toBe(legacyAudioPlayback);expect(host.textContent).toContain('Public playback');expect(fetcher).not.toHaveBeenCalled();
});
