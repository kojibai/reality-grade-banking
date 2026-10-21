import {afterEach,expect,it,vi} from 'vitest';
import {handlePublicDocument} from '../server/public-document';
import {publicDocumentUrl,safePublicDocumentUrl} from '../src/receiz/public-document';
afterEach(()=>vi.unstubAllGlobals());
const source='https://receiz.com/api/profile/originals/media?receizId=document&slot=preview',local='https://bankeiz.com/api/bank/public-document?'+new URLSearchParams({source,asset:'document'});
it('accepts only bound public PDF locators and never invents gated playback',()=>{
 expect(publicDocumentUrl({receizId:'document',profileOriginal:{media:{kind:'pdf',src:source,gateAudioPlayback:false}}})).toBe(source);
 for(const url of [source+'&token=x',source.replace('document','someone-else'),'https://evil.example/file.pdf','https://receiz.com/api/storage/object?bucket=private&path=file.pdf','https://receiz.com/api/profile/originals/download?receizId=document&kind=original'])expect(safePublicDocumentUrl(url,'document')).toBeNull();
 expect(publicDocumentUrl({receizId:'document',profileOriginal:{media:{kind:'pdf',src:source,gateAudioPlayback:true}}})).toBeNull();
});
it('uses a source-bound public PDF package when the other locator is a separate Original download',()=>{
 const artifact='https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact',digest='a'.repeat(64),media={kind:'pdf',src:'/api/profile/originals/download?receizId=document&kind=original',gateAudioPlayback:false,originalDownloadMime:'application/pdf',originalDownloadSha256Hex:digest,material:{sealedArtifactSha256Hex:digest}};
 expect(publicDocumentUrl({receizId:'document',profileOriginal:{media}},artifact)).toBe(artifact);expect(publicDocumentUrl({receizId:'document',profileOriginal:{media:{...media,material:{sealedArtifactSha256Hex:'c'.repeat(64)}}}},artifact)).toBeNull();
});
it('forwards only a single range, preserves streaming and strips credentials and cross-site frame restrictions',async()=>{
 let push!:(data:Uint8Array)=>void;const body=new ReadableStream<Uint8Array>({start(controller){push=data=>{controller.enqueue(data);controller.close();};}}),fetcher=vi.fn<typeof fetch>(async()=>new Response(body,{status:206,headers:{'content-type':'application/pdf','content-range':'bytes 0-9/1000000','accept-ranges':'bytes','x-frame-options':'DENY','set-cookie':'never-copy'}}));vi.stubGlobal('fetch',fetcher);
 const response=await handlePublicDocument(new Request(local,{headers:{range:'bytes=0-9',cookie:'never-forward',authorization:'Bearer never-forward'}}));expect(response.status).toBe(206);expect(response.headers.get('content-range')).toBe('bytes 0-9/1000000');expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');expect(response.headers.has('set-cookie')).toBe(false);expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error',headers:{range:'bytes=0-9'}});expect(JSON.stringify(fetcher.mock.calls)).not.toContain('never-forward');push(new TextEncoder().encode('%PDF-data'));expect(await response.text()).toBe('%PDF-data');
});
it('preserves paid and missing refusals, rejects non-PDF bodies, and never reads unsupported methods or multipart ranges',async()=>{
 const fetcher=vi.fn<typeof fetch>();vi.stubGlobal('fetch',fetcher);
 for(const status of [402,403,404,409,416]){fetcher.mockResolvedValueOnce(new Response(null,{status}));expect((await handlePublicDocument(new Request(local))).status).toBe(status);}
 fetcher.mockResolvedValueOnce(new Response('<script>not a PDF</script>',{headers:{'content-type':'text/html'}}));expect((await handlePublicDocument(new Request(local))).status).toBe(415);fetcher.mockClear();
 expect((await handlePublicDocument(new Request(local,{method:'POST'}))).status).toBe(405);expect((await handlePublicDocument(new Request(local,{headers:{range:'bytes=0-10,20-30'}}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
