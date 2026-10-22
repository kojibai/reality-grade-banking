import {afterEach,expect,it,vi} from 'vitest';
import {Resvg} from '@resvg/resvg-js';
import sharp from 'sharp';
import {renderAssetImage} from '../server/asset-preview-render';
import {parsePublicMarket} from '../src/receiz/public-market';

const base=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:song',receizId:'song',title:'The First Light',ownerUsername:'artist',profileOriginal:{mediaKind:'audio'},valueUsd:1250}]}}).items[0];
const song=(name:string)=>({...base,artworkUrl:`https://receiz.com/artwork/${name}.png`});
const red=()=>new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f43f5e"/></svg>').render().asPng();
const response=()=>new Response(new Uint8Array(red()),{headers:{'content-type':'image/png'}});
const pixels=(bytes:Uint8Array)=>new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909"><image width="1730" height="909" href="data:image/png;base64,${Buffer.from(bytes).toString('base64')}"/></svg>`).render().pixels;
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});

it('renders the actual song cover on the front face while keeping the title/value side unchanged',async()=>{
 const fetcher=vi.fn(async()=>response());vi.stubGlobal('fetch',fetcher);
 const fallback=pixels(await renderAssetImage({...base,artworkUrl:null})),painted=pixels(await renderAssetImage(song('actual-cover'))),at=(540*1730+1230)*4;
 expect([...painted.subarray(at,at+4)].every((value,index)=>Math.abs(value-[244,63,94,255][index])<=1)).toBe(true);
 expect(Array.from({length:909},(_,y)=>painted.subarray(y*1730*4,(y*1730+900)*4).equals(fallback.subarray(y*1730*4,(y*1730+900)*4))).every(Boolean)).toBe(true);
 expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://receiz.com/artwork/actual-cover.png',expect.objectContaining({credentials:'omit',redirect:'error'}));
});
it('coalesces simultaneous share-image cover reads and reuses the prepared cover for later previews',async()=>{
 const fetcher=vi.fn(async()=>response());vi.stubGlobal('fetch',fetcher);const item=song('cached-cover');
 const [first,second]=await Promise.all([renderAssetImage(item),renderAssetImage(item)]);
 expect(Buffer.from(first)).toEqual(Buffer.from(second));expect(Buffer.from(await renderAssetImage(item))).toEqual(Buffer.from(first));expect(fetcher).toHaveBeenCalledOnce();
});
it('uses Receiz’s existing small public image derivative instead of reading a full sealed image',async()=>{
 const artwork='https://receiz.com/api/proof-material/packages/'+'a'.repeat(64)+'/artifact',preview='https://receiz.com/api/media/image?'+new URLSearchParams({src:artwork,w:'512',q:'80'});
 const webp=await sharp(red()).webp({lossless:true}).toBuffer();
 const fetcher=vi.fn(async(input:RequestInfo|URL)=>String(input)===preview?new Response(new Uint8Array(webp),{headers:{'content-type':'image/webp'}}):new Response(null,{status:404}));vi.stubGlobal('fetch',fetcher);
 const painted=pixels(await renderAssetImage({...base,mediaKind:'image',artworkUrl:artwork})),at=(540*1730+1230)*4;
 expect([...painted.subarray(at,at+4)].every((value,index)=>Math.abs(value-[244,63,94,255][index])<=1)).toBe(true);
 expect(fetcher).toHaveBeenCalledExactlyOnceWith(preview,expect.objectContaining({credentials:'omit',redirect:'error'}));
});
it('keeps the existing card when cover loading fails and never reads an untrusted or absent artwork URL',async()=>{
 const fetcher=vi.fn(async()=>{throw Error('Unavailable');});vi.stubGlobal('fetch',fetcher);
 const fallback=Buffer.from(await renderAssetImage({...base,artworkUrl:null}));
 expect(Buffer.from(await renderAssetImage(song('missing-cover')))).toEqual(fallback);
 expect(Buffer.from(await renderAssetImage({...base,artworkUrl:'https://foreign.invalid/cover.png'}))).toEqual(fallback);
 expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://receiz.com/artwork/missing-cover.png',expect.anything());
});
it.each(['image','video','epub','pdf','file','moment'] as const)('uses the carried cover for %s assets too',async mediaKind=>{
 const fetcher=vi.fn(async()=>response());vi.stubGlobal('fetch',fetcher);
 const painted=pixels(await renderAssetImage({...song(mediaKind+'-cover'),mediaKind})),at=(540*1730+1230)*4;
 expect([...painted.subarray(at,at+4)].every((value,index)=>Math.abs(value-[244,63,94,255][index])<=1)).toBe(true);expect(fetcher).toHaveBeenCalledOnce();
});
it('uses a collectible’s carried cover in the same frame',async()=>{
 const fetcher=vi.fn(async()=>response());vi.stubGlobal('fetch',fetcher);
 const painted=pixels(await renderAssetImage({...song('collectible-cover'),category:'sports',mediaKind:undefined,circulationCount:12})),at=(540*1730+1230)*4;
 expect([...painted.subarray(at,at+4)].every((value,index)=>Math.abs(value-[244,63,94,255][index])<=1)).toBe(true);expect(fetcher).toHaveBeenCalledOnce();
});
it.each([
 ['html',()=>new Response('<html>not artwork</html>',{headers:{'content-type':'text/html'}})],
 ['invalid',()=>new Response('not a PNG',{headers:{'content-type':'image/png'}})],
 ['oversized',()=>new Response(new Uint8Array(red()),{headers:{'content-type':'image/png','content-length':String(5*1024*1024)}})],
 ['huge-dimensions',async()=>new Response(new Uint8Array(await sharp({create:{width:8192,height:1,channels:3,background:'#f43f5e'}}).png().toBuffer()),{headers:{'content-type':'image/png'}})],
])('falls back for %s cover responses',async(name,makeResponse)=>{
 vi.stubGlobal('fetch',vi.fn(async()=>makeResponse()));
 expect(Buffer.from(await renderAssetImage(song(name)))).toEqual(Buffer.from(await renderAssetImage({...base,artworkUrl:null})));
});
it('stops an oversized stream even when the server omits its length',async()=>{
 let canceled=false;vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(4*1024*1024+1));},cancel(){canceled=true;}}),{headers:{'content-type':'image/png'}})));
 expect(Buffer.from(await renderAssetImage(song('oversized-stream')))).toEqual(Buffer.from(await renderAssetImage({...base,artworkUrl:null})));expect(canceled).toBe(true);
});
it('bounds a stalled cover request and keeps the working generic card available',async()=>{
 vi.useFakeTimers();const fetcher=vi.fn((_input:unknown,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(init.signal!.reason))));vi.stubGlobal('fetch',fetcher);
 const render=renderAssetImage(song('stalled-cover'));await vi.advanceTimersByTimeAsync(3500);
 expect(Buffer.from(await render).subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));expect(fetcher).toHaveBeenCalledOnce();
});
