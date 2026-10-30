// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';import {zipSync,strToU8} from 'fflate';
import {parsePublicMarket} from '../src/receiz/public-market';
import {handlePublicDocument} from '../server/public-document';
import {safePublicBookUrl} from '../src/receiz/public-book';
import {readPublicBook,retainedPublicBook} from '../src/receiz/public-book-reader';
import FeedExperience from '../src/public-feed/FeedExperience';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const id='6e0ad6b8-8537-40ee-9bb6-a64d06d0f71b',digest='a'.repeat(64),reading='https://receiz.com/api/profile/originals/media?receizId='+id+'&slot=preview';
const bytes=zipSync({'mimetype':strToU8('application/epub+zip'),'META-INF/container.xml':strToU8('<container><rootfiles><rootfile full-path="EPUB/book.opf"/></rootfiles></container>'),'EPUB/book.opf':strToU8('<package><metadata><title>A readable book</title></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>'),'EPUB/chapter.xhtml':strToU8('<html><body><h1>Chapter one</h1><p>Public reading stays open. Owning the downloadable Original is separate.</p></body></html>')});
const hex=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))),b=>b.toString(16).padStart(2,'0')).join('');
const original={id:'profile:artist:'+id,receizId:id,title:'A readable book',ownerUsername:'artist',canonicalHref:'/artist/verified/'+id,profileOriginal:{mediaKind:'epub',media:{kind:'epub',src:reading,sha256Hex:hex,originalDownloadSrc:'/api/profile/originals/download?receizId='+id+'&kind=original',originalDownloadSha256Hex:digest,originalDownloadPriceCents:500,material:null}}},membership={ok:true,transport:{publicOriginals:[original]}};
afterEach(()=>vi.restoreAllMocks());

it('rejects sale, foreign, mismatched and credential-bearing reading coordinates',()=>{
 for(const url of [reading.replace('receiz.com','foreign.example'),reading.replace(id,'someone-else'),reading+'&paymentSessionId=paid',reading+'&slot=preview',reading.replace('slot=preview','slot=playback'),'https://receiz.com/api/profile/originals/download?receizId='+id+'&kind=original'])expect(safePublicBookUrl(url,id)).toBeNull();
});
it('rejects changed reading bytes, shares a pending read and leaves failures retryable',async()=>{
 const source={assetId:id,url:reading,payloadDigest:'f'.repeat(64)},fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(new Uint8Array(bytes),{headers:{'content-type':'application/epub+zip'}}));
 const results=await Promise.allSettled([readPublicBook(source),readPublicBook(source)]);expect(results.every(result=>result.status==='rejected'&&result.reason.message.includes('does not match'))).toBe(true);expect(fetcher).toHaveBeenCalledOnce();expect(retainedPublicBook(source)).toBeNull();
 fetcher.mockResolvedValueOnce(new Response(null,{status:403}));await expect(readPublicBook(source)).rejects.toThrow('not publicly available');expect(fetcher).toHaveBeenCalledTimes(2);
});

it('carries the public EPUB reading role separately from the paid Original download',()=>{
 const item=parsePublicMarket(membership).items[0];
 expect(item.book).toEqual({assetId:id,url:reading,payloadDigest:hex});
 expect(item.originalUrl).toBe('https://receiz.com/api/profile/originals/download?receizId='+id+'&kind=original');
 expect(parsePublicMarket({ok:true,transport:{publicOriginals:[{...original,visibility:'private'}]}}).items).toEqual([]);
 const carried={...original,profileOriginal:{...original.profileOriginal,media:{...original.profileOriginal.media,material:{sealedArtifactSha256Hex:digest,originalArtifactSrc:'/api/proof-material/packages/'+'b'.repeat(64)+'/artifact'}}}};
 expect(parsePublicMarket({ok:true,transport:{publicOriginals:[carried]}}).items[0].book).toBeUndefined();
});
it('streams only a bound public EPUB reading role and preserves private refusal without payment credentials',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array(bytes),{headers:{'content-type':'application/epub+zip'}})),url='https://bankeiz.com/api/bank/public-book?'+new URLSearchParams({source:reading,asset:id});
 const response=await handlePublicDocument(new Request(url,{headers:{cookie:'private-cookie',authorization:'Bearer never-forward'}}));
 expect(response.status).toBe(200);expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
 expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error'});expect(JSON.stringify(fetcher.mock.calls)).not.toContain('never-forward');
 fetcher.mockResolvedValueOnce(new Response(null,{status:403}));expect((await handlePublicDocument(new Request(url))).status).toBe(403);
 fetcher.mockClear();expect((await handlePublicDocument(new Request(url.replace('slot%3Dpreview','slot%3Dplayback')))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
it('reads a paid-download book in the existing reader without buying, exposing a free file download, or rereading on reopen',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).startsWith('/api/bank/public-book?')?new Response(new Uint8Array(bytes),{headers:{'content-type':'application/epub+zip'}}):String(input).includes('membership')||input==='/receiz-public-market.json'?Response.json(membership):new Response('{"error":"payment_required"}',{status:402}));
 const item=parsePublicMarket(membership).items[0],host=document.createElement('div');document.body.append(host);let root=createRoot(host);
 try{
  await act(async()=>root.render(<FeedExperience item={item}/>));
  await vi.waitFor(()=>expect(host.querySelector('[aria-label="EPUB reader"]')?.textContent).toContain('Public reading stays open.'));
  expect(host.querySelector('a[download]')).toBeNull();expect(host.textContent).not.toContain('separate download');expect(host.textContent).not.toContain('Original verified');
  const before=fetcher.mock.calls.length;act(()=>root.unmount());root=createRoot(host);await act(async()=>root.render(<FeedExperience item={item}/>));
  expect(host.querySelector('[aria-label="EPUB reader"]')?.textContent).toContain('Public reading stays open.');expect(fetcher.mock.calls.length).toBe(before);expect(before).toBe(1);
 }finally{act(()=>root.unmount());host.remove();}
});
