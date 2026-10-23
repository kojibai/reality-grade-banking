import {expect,it,vi} from 'vitest';
import {assetPreviewItem,handleAssetPreview} from '../server/asset-preview';
import {Window} from 'happy-dom';
import {assetPagePath,assetPageId} from '../src/receiz/public-asset-page';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicAssetManifest} from '../src/receiz/public-asset-manifest';
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'A moment $& <script>one</script>',summary:'The complete original.',ownerUsername:'artist',profileOriginal:{media:{kind:'image'}}}]}}).items[0];
const html='<html><head><title>Explore</title><meta name="description" content="Explore"><link rel="canonical" href="https://bankeiz.com/explore/"></head><body><div id="public-explore-root" data-public-runtime="explore"><main>Explore fallback</main></div><script id="receiz-navigation" type="application/json">{"pages":{}}</script></body></html>';
const deps=()=>({page:vi.fn(async()=>html),item:vi.fn(async()=>item),image:vi.fn(async()=>new Uint8Array([1,2]))});
it('ships the already-published proof fields on cold entry without a discovery or original read',async()=>{
 const read=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Cold proof material must already be carried'));
 try{
  const selected=await assetPreviewItem('profile:bjklock:b63e1e2f-62e7-41d8-a769-3a76400f95e0');
  const manifest=publicAssetManifest(selected!.proofManifestSource,selected!);
  expect(manifest.find(row=>row.label==='Groth16')?.value).toBe('B37CCA4A98F9FB56');
  expect(manifest.find(row=>row.label==='Poseidon')?.value).toBe('21bf25369a2469e8ef0ac886d7e5ee670624578b93b025c8c20d84b316328696');
  expect(manifest.find(row=>row.label==='Claim SHA-256')?.value).toBe('49FFCE5A826171A08CA8291AC6F9C6594D930525702B0662CD5DBEAC890D9C8B');
  expect(manifest.find(row=>row.label==='PBI Signature')?.value).toBe('97BB33DBD5F49F827DF4E4377F95F3A2B4E1CC624887D2BEC2C66E001F90CAF8');
  const response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(selected!.id)),{...deps(),item:async()=>selected});
  const document=new Window().document;document.write(await response.text());
  const seed=JSON.parse(document.querySelector('#public-asset-seed')!.textContent!);
  expect(seed.proofManifestSource.proof.groth16Id).toBe('B37CCA4A98F9FB56');expect(read).not.toHaveBeenCalled();
 }finally{read.mockRestore();}
});
it('starts the carried owner portrait in cold HTML without waiting for JavaScript or another profile read',async()=>{
 const f=deps();f.item.mockResolvedValue({...item,ownerAvatarUrl:'https://receiz.com/artwork/artist.png'});
 const body=await(await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f)).text();
 const document=new Window().document;document.write(body);
 const owner=document.querySelector('.asset-profile-byline'),portrait=owner?.querySelector('img');
 expect(owner?.getAttribute('href')).toBe('/artist/');expect(owner?.textContent).toContain('@artist');
 expect(portrait?.getAttribute('src')).toBe('https://receiz.com/artwork/artist.png');expect(portrait?.getAttribute('loading')).toBe('eager');expect(portrait?.getAttribute('decoding')).toBe('async');expect(portrait?.getAttribute('referrerpolicy')).toBe('no-referrer');
 expect(document.querySelector('link[rel="preload"][as="image"]')?.getAttribute('href')).toBe(portrait?.getAttribute('src'));
 expect(document.querySelector('#public-asset-seed')?.textContent).toContain('https://receiz.com/artwork/artist.png');
 expect(f.item).toHaveBeenCalledOnce();expect(f.page).toHaveBeenCalledOnce();expect(f.image).not.toHaveBeenCalled();
});
it.each([null,undefined,'javascript:alert(1)','https://user:password@example.com/avatar.png'])('omits an absent or unsafe cold owner portrait: %s',async ownerAvatarUrl=>{
 const f=deps();f.item.mockResolvedValue({...item,ownerAvatarUrl});
 const body=await(await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)),f)).text(),document=new Window().document;document.write(body);
 expect(document.querySelector('.asset-profile-byline')?.getAttribute('href')).toBe('/artist/');expect(document.querySelector('.asset-profile-byline img')).toBeNull();expect(document.querySelector('link[rel="preload"][as="image"]')).toBeNull();
});
it('carries the already-published owner portrait in a shipped asset without any upstream read',async()=>{
 const read=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Cold snapshot must not read upstream'));
 try{
  const source=await assetPreviewItem('profile:bjklock:b63e1e2f-62e7-41d8-a769-3a76400f95e0');
  expect(source?.ownerUsername).toBe('bjklock');expect(source?.ownerAvatarUrl).toMatch(/^https:\/\/receiz\.com\/api\/storage\/object\?/);expect(read).not.toHaveBeenCalled();
 }finally{read.mockRestore();}
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
it.each(['fbclid=instagram-click','igsh=instagram-share','igshid=instagram-share','utm_source=ig&utm_medium=social&utm_campaign=shared-asset','fbclid=click&igsh=share&utm_source=instagram','gclid=search-click&msclkid=search-click','utm_source=first&utm_source=second'])('opens the same cold asset document when a shared link carries harmless tracking: %s',async tracking=>{
 const f=deps(),path=assetPagePath(item.id),canonical=await(await handleAssetPreview(new Request('https://bankeiz.com'+path),f)).text();
 f.item.mockClear();f.page.mockClear();
 const response=await handleAssetPreview(new Request('https://bankeiz.com'+path+'?'+tracking,{headers:{'User-Agent':'Instagram','Referer':'https://l.instagram.com/'}}),f);
 expect(response.status).toBe(200);expect(response.headers.get('location')).toBeNull();expect(await response.text()).toBe(canonical);
 expect(f.item).toHaveBeenCalledExactlyOnceWith(item.id);expect(f.page).toHaveBeenCalledOnce();expect(f.image).not.toHaveBeenCalled();
});
it('ignores tracking on a rewritten asset URL without accepting conflicting selectors or extra controls',async()=>{
 const f=deps(),path='https://bankeiz.com/api/asset/?'+new URLSearchParams({asset:item.id,id:item.id,fbclid:'click',igsh:'share',utm_source:'instagram'});
 expect((await handleAssetPreview(new Request(path),f)).status).toBe(200);
 f.item.mockClear();f.page.mockClear();
 for(const suffix of ['&asset=other','&id=other','&image=2','&player=2','&url=https://foreign.invalid','&accountUid=foreign'])expect((await handleAssetPreview(new Request(path+suffix),f)).status).toBe(400);
 expect(f.item).not.toHaveBeenCalled();expect(f.page).not.toHaveBeenCalled();
});
it('answers tracked HEAD probes without reading the asset or document',async()=>{
 const f=deps(),response=await handleAssetPreview(new Request('https://bankeiz.com'+assetPagePath(item.id)+'?fbclid=click&igsh=share',{method:'HEAD'}),f);
 expect(response.status).toBe(200);expect(await response.text()).toBe('');expect(f.item).not.toHaveBeenCalled();expect(f.page).not.toHaveBeenCalled();expect(f.image).not.toHaveBeenCalled();
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
