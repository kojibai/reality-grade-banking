import {expect,it,vi} from 'vitest';
import {handleAssetPreview} from '../server/asset-preview';
import {assetPagePath,assetPageId} from '../src/receiz/public-asset-page';
import {parsePublicMarket} from '../src/receiz/public-market';
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'A moment $& <script>one</script>',summary:'The complete original.',ownerUsername:'artist',profileOriginal:{media:{kind:'image'}}}]}}).items[0];
const html='<html><head><title>Explore</title><meta name="description" content="Explore"><link rel="canonical" href="https://bankeiz.com/explore/"></head><body><div id="public-explore-root" data-public-runtime="explore"><main>Explore fallback</main></div><script id="receiz-navigation" type="application/json">{"pages":{}}</script></body></html>';
const deps=()=>({page:vi.fn(async()=>html),item:vi.fn(async()=>item),image:vi.fn(async()=>new Uint8Array([1,2]))});
it('starts the carried owner portrait in cold HTML without waiting for JavaScript or another profile read',async()=>{
 const f=deps();f.item.mockResolvedValue({...item,ownerAvatarUrl:'https://receiz.com/artwork/artist.png'});
 const body=await(await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f)).text();
 expect(body).toContain('<link rel="preload" as="image" href="https://receiz.com/artwork/artist.png"');expect(f.item).toHaveBeenCalledOnce();
});
it('starts the actual public image with matching anonymous CORS for preview and canonical verification',async()=>{
 const artwork='https://receiz.com/api/proof-material/packages/'+'a'.repeat(64)+'/artifact',f=deps();f.item.mockResolvedValue({...item,artworkUrl:artwork});
 const body=await(await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f)).text();
 expect(body).toMatch(/<link rel="preload" as="image"[^>]+crossorigin="anonymous"/);expect(body).toMatch(/<img[^>]+crossorigin="anonymous"/);expect(body).not.toContain('/api/receiz/download');
});
it('exposes the one selected safe cover in cold HTML and lets the browser start it before JavaScript without fetching it on the server',async()=>{
 const f=deps(),artwork='https://receiz.com/api/profile/originals/media?receizId=song&slot=audioCover';
 f.item.mockResolvedValue({...item,artworkUrl:artwork});
 const response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f),body=await response.text();
 expect(body).toContain('<link rel="preload" as="image" href="'+artwork.replaceAll('&','&amp;')+'"');
 expect(body).toContain('fetchpriority="high"');expect(body).toContain('loading="eager"');expect(body).toContain('artwork</');
 expect(f.item).toHaveBeenCalledOnce();expect(f.page).toHaveBeenCalledOnce();expect(f.image).not.toHaveBeenCalled();
 f.item.mockResolvedValue({...item,artworkUrl:'https://untrusted.example/cover.png'});
 const unsafe=await(await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f)).text();
 expect(unsafe).not.toContain('<link rel="preload" as="image"');expect(unsafe).not.toContain('<figure');
});
it('serves an asset-specific original, canonical and complete public seed without account or upstream work',async()=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f),body=await response.text();
 expect(response.status).toBe(200);expect(body).toContain('A moment $&amp; &lt;script&gt;one&lt;/script&gt;');expect(body).not.toContain('Explore fallback');
 expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
 expect(response.headers.get('content-disposition')).toBe('inline');
 expect(body).toContain('id="public-asset-seed"');expect(body).toContain('og.png');expect(body).toContain('projection-only');expect(f.image).not.toHaveBeenCalled();
 const seed=JSON.parse(body.match(/id="public-asset-seed" type="application\/json">([^<]+)<\/script>/)![1]);expect(seed.id).toBe(item.id);expect(seed.canTrade).toBe(false);
});
it('replaces the real built Explore shell before its noscript block while retaining first-paint styles',async()=>{
 const f=deps();f.page.mockResolvedValue(html.replace('<main>Explore fallback</main>','<main><style>.public-entry-placeholder{padding:24px}</style><h1>Explore fallback</h1></main>').replace('</div><script','</div><noscript>Enable JavaScript for live interaction.</noscript><script'));
 const body=await(await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f)).text();
 expect(body).not.toContain('Explore fallback');expect(body).toContain('<h1>A moment $&amp; &lt;script&gt;one&lt;/script&gt;</h1>');
 expect(body).toContain('.public-entry-placeholder{padding:24px}');expect(body).toContain('<noscript>Enable JavaScript for live interaction.</noscript>');
});
it('opens the canonical page through the trailing-slash function path used by production rewrites',async()=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com/api/asset/?asset='+encodeURIComponent(item.id)),f);
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
 expect(response.headers.get('content-disposition')).toBe('inline');expect(await response.text()).toContain('id="public-asset-seed"');
 expect(f.item).toHaveBeenCalledWith(item.id);
 const preview=await handleAssetPreview(new Request('https://bankeiz.com/api/asset/?asset='+encodeURIComponent(item.id)+'&image=1'),f);
 expect(preview.status).toBe(200);expect(preview.headers.get('content-type')).toBe('image/png');
});
it.each(['/api/asset/?asset=ID&id=ID','/asset/ID/?asset=ID&id=ID'])('opens a public asset with matching rewrite captures: %s',async template=>{
 const f=deps(),url='https://bankeiz.com'+template.replaceAll('ID',encodeURIComponent(item.id));
 const response=await handleAssetPreview(new Request(url),f);
 expect(response.status).toBe(200);expect(await response.text()).toContain('id="public-asset-seed"');expect(f.item).toHaveBeenCalledExactlyOnceWith(item.id);
 const conflict=await handleAssetPreview(new Request(url.replace('&id='+encodeURIComponent(item.id),'&id=another-source')),f);
 expect(conflict.status).toBe(400);
});
it.each(['','og.png'])('handles HEAD %s without source reads, font loading or image rendering',async suffix=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)+suffix,{method:'HEAD'}),f);
 expect(response.status).toBe(200);expect(await response.text()).toBe('');expect(f.page).not.toHaveBeenCalled();expect(f.item).not.toHaveBeenCalled();expect(f.image).not.toHaveBeenCalled();
});
it('renders sharing artwork only on its explicit image route',async()=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)+'og.png'),f);
 expect(response.headers.get('content-type')).toBe('image/png');expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1,2]));expect(f.page).not.toHaveBeenCalled();
});
it('does not assert an absent retained listing exists and refuses malformed or extra arguments',async()=>{
 const f=deps();f.item.mockResolvedValue(null as never);const response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath('new:public')),f);
 expect(await response.text()).toContain('noindex,follow');
 for(const url of ['https://bankeiz.com/api/asset?asset=a&asset=b','https://bankeiz.com/api/asset?asset=a&image=2','https://bankeiz.com/asset/%00/'])expect((await handleAssetPreview(new Request(url),f)).status).toBe(400);
});
it('round-trips an opaque source ID without treating it as a filesystem path',()=>{
 for(const id of ['sports:rsc_0123456789abcdef','public:name:a/b','source:?&%<>'])expect(assetPageId(assetPagePath(id))).toBe(id);
 expect(assetPageId('/asset/%/')).toBeNull();expect(assetPageId('/asset/source/og.png')).toBeNull();
});
it('resolves newly published public assets once per source window, without quotes or originals',async()=>{
 const {createLiveAssetResolver}=await import('../server/asset-preview');
 const read=vi.fn(async()=>({ok:true,transport:{publicOriginals:[{id:'profile:new:publication',receizId:'publication',title:'Newly published',visibility:'public'}]}}));
 const resolve=createLiveAssetResolver(read);
 const rows=await Promise.all([resolve('profile:new:publication'),resolve('profile:new:publication'),resolve('profile:absent:publication')]);
 expect(rows[0]?.title).toBe('Newly published');expect(rows[1]).toEqual(rows[0]);expect(rows[2]).toBeNull();expect(read.mock.calls).toEqual([['membership']]);
});
