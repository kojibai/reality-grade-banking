import {expect,it,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {assetPagePath} from '../src/receiz/public-asset-page';
import {assetPreviewHtml,handleAssetPreview} from '../server/asset-preview';

const id='profile:artist:12345678-1234-4234-9234-123456789abc',assetId=id.split(':')[2];
const source=(kind='audio',playbackSrc?:string)=>({id,receizId:assetId,title:'An authored title',summary:'A carried caption.',ownerUsername:'artist',canonicalHref:`/artist/verified/${assetId}`,profileOriginal:{media:{kind,playbackSrc,playbackMime:kind==='audio'?'audio/mpeg':'video/mp4'}}});
const item=(kind='audio',playbackSrc?:string)=>parsePublicMarket({ok:true,transport:{publicOriginals:[source(kind,playbackSrc)]}}).items[0];
const html='<html><head><title>Explore</title></head><body><div id="public-explore-root"></div><script id="receiz-navigation">{}</script></body></html>';
const deps=(value=item())=>({item:vi.fn(async()=>value),page:vi.fn(async()=>html),image:vi.fn(async()=>new Uint8Array())});
const canonical='https://bankeiz.com'+assetPagePath(id);

it('uses an explicitly public self-contained audio Original when no separate playback was prepared, without changing its asset URL',async()=>{
 const row=source('audio',`/api/profile/originals/media?receizId=${assetId}&slot=playback`),artifact='https://receiz.com/api/proof-material/packages/'+ 'a'.repeat(64)+'/artifact',digest='b'.repeat(64);
 Object.assign(row.profileOriginal.media,{gateAudioPlayback:false,playbackMime:null,originalDownloadMime:'audio/mpeg',originalDownloadSha256Hex:digest,material:{sealedArtifactSha256Hex:digest,proofObjectUrl:artifact}});
 Object.assign(row,{playbackSrc:`/api/profile/originals/download?receizId=${assetId}&kind=original`});
 const read=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[row]}}).items[0];
 expect(read().playback).toEqual({url:artifact,mimeType:'audio/mpeg'});
 const response=await handleAssetPreview(new Request(canonical),deps(read())),body=await response.text();
 expect(body).toContain(`property="og:audio" content="${artifact}"`);expect(body).toContain(`<link rel="canonical" href="${canonical}">`);expect(response.headers.get('location')).toBeNull();
 for(const invalid of [{gateAudioPlayback:true},{originalDownloadMime:'image/png'},{originalDownloadSha256Hex:'c'.repeat(64)}]){
  const changed={...row,profileOriginal:{media:{...row.profileOriginal.media,...invalid}}};
  expect(parsePublicMarket({ok:true,transport:{publicOriginals:[changed]}}).items[0].playback?.url).not.toBe(artifact);
 }
});

it('preserves explicit prepared playback and legacy raw streams instead of replacing them with a material artifact',()=>{
 const artifact='https://receiz.com/api/proof-material/packages/'+'a'.repeat(64)+'/artifact',digest='b'.repeat(64),custom='https://receiz.com/music/prepared.mp3';
 const row=source('audio',custom);Object.assign(row.profileOriginal.media,{gateAudioPlayback:false,playbackMime:null,originalDownloadMime:'audio/mpeg',originalDownloadSha256Hex:digest,material:{sealedArtifactSha256Hex:digest,proofObjectUrl:artifact}});
 const read=()=>parsePublicMarket({ok:true,transport:{publicOriginals:[row]}}).items[0].playback?.url;
 expect(read()).toBe(custom);
 Object.assign(row.profileOriginal.media,{playbackSrc:`/api/profile/originals/media?receizId=${assetId}&slot=playback`,playbackReadyAt:'2026-10-21T00:00:00Z'});expect(read()).toContain('slot=playback');
 const legacy=source('audio');Object.assign(legacy,{playbackSrc:`/api/profile/originals/media?receizId=${assetId}&slot=preview`});expect(parsePublicMarket({ok:true,transport:{publicOriginals:[legacy]}}).items[0].playback?.url).toContain('slot=preview');
});

it.each(['audio','video'])('keeps the asset canonical while advertising the existing Receiz %s player and oEmbed discovery without fetching media',async kind=>{
 const playback=`https://receiz.com/api/profile/originals/media?receizId=${assetId}&slot=playback`,f=deps(item(kind,playback));
 const response=await handleAssetPreview(new Request(canonical),f),body=await response.text();
 expect(body).toContain(`<link rel="canonical" href="${canonical}">`);
 expect(body).toContain('name="twitter:card" content="player"');
 expect(body).toContain(canonical+'player/');
 expect(body).toContain(`property="og:${kind==='audio'?'audio':'video'}" content="${playback.replaceAll('&','&amp;')}"`);
 expect(body).toContain('type="application/json+oembed"');expect(body).not.toContain('<iframe');
 expect(f.item).toHaveBeenCalledOnce();expect(f.page).toHaveBeenCalledOnce();expect(f.image).not.toHaveBeenCalled();
});

it('does not invent a direct stream, leak gated or unsafe sources, or give a nonmedia asset a player card',()=>{
 const valid=`https://receiz.com/api/profile/originals/media?receizId=${assetId}&slot=playback`;
 for(const playback of ['https://private.example/audio.mp3',valid+'&token=secret',valid.replace(assetId,'another-id'),'javascript:alert(1)'])expect(assetPreviewHtml(html,id,item('audio',playback))).not.toContain('property="og:audio"');
 const gated=source('audio',valid);Object.assign(gated.profileOriginal.media,{gateAudioPlayback:true});
 const gatedItem=parsePublicMarket({ok:true,transport:{publicOriginals:[gated]}}).items[0];expect(assetPreviewHtml(html,id,gatedItem)).not.toContain('property="og:audio"');
 const absent=assetPreviewHtml(html,id,item());expect(absent).toContain('summary_large_image');expect(absent).not.toContain('property="og:audio"');
 const nonmedia=assetPreviewHtml(html,id,item('image'));expect(nonmedia).toContain('summary_large_image');expect(nonmedia).not.toContain('twitter:player');
});

it.each(['audio','video'])('returns constrained %s oEmbed markup for the existing native player and makes no page, image or stream read',async kind=>{
 const f=deps(item(kind,`https://receiz.com/api/profile/originals/media?receizId=${assetId}&slot=playback`));
 const response=await handleAssetPreview(new Request('https://bankeiz.com/oembed?'+new URLSearchParams({url:canonical,format:'json',maxwidth:'380',maxheight:'180'})),f);
 expect(response.status).toBe(200);expect(response.headers.get('access-control-allow-origin')).toBe('*');
 const body=await response.json();expect(body.version).toBe('1.0');expect(body.type).toBe(kind==='audio'?'rich':'video');expect(body.title).toBe('An authored title');
 expect(body.width).toBeLessThanOrEqual(380);expect(body.height).toBeLessThanOrEqual(180);
 expect(body.html).toContain(canonical+'player/');expect(body.html).not.toContain('autoplay=');expect(body.html).not.toContain('<script');
 expect(f.item).toHaveBeenCalledExactlyOnceWith(id);expect(f.page).not.toHaveBeenCalled();expect(f.image).not.toHaveBeenCalled();
});

it('supports the Vercel oEmbed rewrite, explicit unavailable responses and side-effect-free HEAD',async()=>{
 const f=deps();
 const url='https://bankeiz.com/api/asset?oembed=1&'+new URLSearchParams({url:canonical});
 expect((await handleAssetPreview(new Request(url),f)).status).toBe(200);
 f.item.mockClear();const head=await handleAssetPreview(new Request(url,{method:'HEAD'}),f);expect(head.status).toBe(200);expect(await head.text()).toBe('');expect(f.item).not.toHaveBeenCalled();
 for(const target of ['https://untrusted.example/asset/id/','https://bankeiz.com:444/asset/id/',canonical+'?private=1',canonical+'#secret','https://bankeiz.com/asset/%00/'])expect((await handleAssetPreview(new Request('https://bankeiz.com/oembed?'+new URLSearchParams({url:target})),f)).status).toBe(400);
 expect((await handleAssetPreview(new Request('https://bankeiz.com/oembed?'+new URLSearchParams({url:canonical,format:'xml'})),f)).status).toBe(501);
 expect((await handleAssetPreview(new Request('https://bankeiz.com/oembed?'+new URLSearchParams({url:canonical,maxwidth:'0'})),f)).status).toBe(400);
 f.item.mockResolvedValue(null as never);expect((await handleAssetPreview(new Request(url),f)).status).toBe(404);
});


it('serves an iframe-safe lightweight player using existing public media, without account scripts or an asset redirect',async()=>{
 const playback=`https://receiz.com/api/profile/originals/media?receizId=${assetId}&slot=playback`,f=deps(item('audio',playback));
 const response=await handleAssetPreview(new Request(canonical+'player/'),f),body=await response.text();
 expect(response.status).toBe(200);expect(response.headers.get('location')).toBeNull();expect(response.headers.get('x-frame-options')).toBeNull();expect(response.headers.get('content-security-policy')).toContain('frame-ancestors *');
 expect(body).toContain('<audio controls preload="none"');expect(body).toContain(playback.replaceAll('&','&amp;'));expect(body).toContain(`href="${canonical}"`);expect(body).not.toContain('<script');expect(body).not.toContain('autoplay');
 expect(f.page).not.toHaveBeenCalled();expect(f.image).not.toHaveBeenCalled();
 const rewritten=await handleAssetPreview(new Request('https://bankeiz.com/api/asset?'+new URLSearchParams({asset:id,player:'1'})),f);expect(rewritten.status).toBe(200);
 f.item.mockClear();await handleAssetPreview(new Request(canonical+'player/',{method:'HEAD'}),f);expect(f.item).not.toHaveBeenCalled();
});
