// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {zipSync,strToU8} from 'fflate';
import {receizBase64UrlEncode} from '@receiz/sdk';
const opened=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/ledger-offline-proof',()=>({loadOfflineProofVerifier:async()=>({readArtifact:async(bytes:Uint8Array,filename:string)=>{const value=await opened(new File([new Uint8Array(bytes)],filename));return {report:{schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256:value.sealedArtifact.artifactSha256,payloadSha256:value.verifiedPayload.sha256},payload:value.verifiedPayload};}})}));
import {openProofMedia,readMediaPayload,readDocumentText} from '../src/receiz/proof-media';
import {prepareAssetMoment} from '../src/receiz/asset-moment';
afterEach(()=>{opened.mockReset();vi.restoreAllMocks();});
it('distinguishes a separately sold sealed download from a failed proof verification',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{"error":"payment_required"}',{status:402}));
 await expect(openProofMedia({kind:'public',url:'https://receiz.com/api/proof-material/packages/'+'f'.repeat(64)+'/artifact',digest:'f'.repeat(64)})).rejects.toThrow('separate download');
 expect(opened).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledOnce();
});
const bytes=new TextEncoder().encode('An original essay.\n\nEvery paragraph remains available.');
const payload={bytes,filename:'essay.txt',mimeType:'text/plain',sha256:'b'.repeat(64)};
it('opens only the exact original before reading its payload, refusing a digest mismatch',async()=>{
 opened.mockResolvedValue({sealedArtifact:{artifactSha256:'a'.repeat(64)},verifiedPayload:payload});
 const result=await openProofMedia({kind:'held',bytes:new Uint8Array([1]),filename:'original.receiz',digest:'a'.repeat(64)});
 expect(result.files[0]).toMatchObject({kind:'text',filename:'essay.txt',text:new TextDecoder().decode(bytes)});
 expect(result.artifactDigest).toBe('a'.repeat(64));expect(opened).toHaveBeenCalledOnce();
 await expect(openProofMedia({kind:'held',bytes:new Uint8Array([1]),filename:'original.receiz',digest:'c'.repeat(64)})).rejects.toThrow('match');
});
it('cold opens moment attachments and long-form text from the single verified source, without separate media fetches',async()=>{
 const moment=await prepareAssetMoment({files:[new File(['Exact original'],'essay.txt',{type:'text/plain'}),new File([new Uint8Array([137,80,78,71])],'image.png',{type:'image/png'})],title:'Full account',text:'Carried paragraphs.\n\nStill here offline.',metadata:{creator:'Author'}});
 opened.mockResolvedValue({sealedArtifact:{artifactSha256:'a'.repeat(64)},verifiedPayload:{...payload,filename:'moment.json',mimeType:'application/json',bytes:strToU8(JSON.stringify({schema:'receiz.bank.asset-definition.v1',moment}))}});
 const fetch=vi.spyOn(globalThis,'fetch');
 const result=await openProofMedia({kind:'held',bytes:new Uint8Array([1]),filename:'moment.receiz',digest:'a'.repeat(64)});
 expect(result.files.map(file=>file.kind)).toEqual(['text','image','text']);expect(result.files[0].text).toBe('Exact original');expect(result.files[2].text).toBe('Full account\n\nCarried paragraphs.\n\nStill here offline.');
 expect(result.files[0].details).toEqual({creator:'Author'});expect(opened).toHaveBeenCalledOnce();expect(fetch).not.toHaveBeenCalled();
});
it('cold opens an exact linked original carried inside an asset definition without requiring a separate device record',async()=>{
 const innerBytes=new Uint8Array([2]),linked='b'.repeat(64),outer=strToU8(JSON.stringify({schema:'receiz.bank.asset-definition.v1',definition:{linkedProofDigest:linked},linkedSource:{digest:linked,filename:'inner.receiz',exactArtifactB64u:receizBase64UrlEncode(innerBytes)}}));
 opened.mockImplementation(async(file:File)=>new Uint8Array(await file.arrayBuffer())[0]===2?{sealedArtifact:{artifactSha256:linked},verifiedPayload:payload}:{sealedArtifact:{artifactSha256:'a'.repeat(64)},verifiedPayload:{...payload,bytes:outer,mimeType:'application/json'}});
 const result=await openProofMedia({kind:'held',bytes:new Uint8Array([1]),filename:'outer.receiz',digest:'a'.repeat(64)});
 expect(result.linkedArtifactDigest).toBe(linked);expect(result.files[0].text).toBe(new TextDecoder().decode(bytes));expect(opened).toHaveBeenCalledTimes(2);
});
it('does not follow arbitrary public URLs, and reads bounded public original bytes without credentials',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array([1])));
 await expect(openProofMedia({kind:'public',url:'https://evil.example/test',digest:'a'.repeat(64)})).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();
 opened.mockResolvedValue({sealedArtifact:{artifactSha256:'a'.repeat(64)},verifiedPayload:payload});
 await openProofMedia({kind:'public',url:`https://receiz.com/api/proof-material/packages/${'b'.repeat(64)}/artifact`,digest:'a'.repeat(64)});
 expect(fetch.mock.calls[0][0]).toBe(`https://receiz.com/api/proof-material/packages/${'b'.repeat(64)}/artifact`);
 expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error'});expect(fetch).toHaveBeenCalledOnce();
});
it('reopens a cached public coordinate through its exact carried artifact instead of the separate download sale',async()=>{
 const path='/api/proof-material/packages/'+ 'c'.repeat(64)+'/artifact',artifact=new Uint8Array([1,2,3]);
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{
  if(input==='/api/bank/public-market/membership')return Response.json({ok:true,transport:{publicMembership:{},publicOriginals:[{id:'profile:artist:proof_123',receizId:'proof_123',title:'Essay',profileOriginal:{media:{originalDownloadSrc:'/api/profile/originals/download?receizId=proof_123&kind=original',originalDownloadSha256Hex:'a'.repeat(64),material:{proofObjectUrl:'/v/20261018_1200/AB12CD34/14700000#material=rmc1%3A'+'c'.repeat(64),sealedArtifactSha256Hex:'a'.repeat(64)}}}}]}});
  return String(input)===`https://receiz.com${path}`?new Response(artifact):new Response('payment_required',{status:402});
 });
 opened.mockImplementation(async(file:File)=>{expect(new Uint8Array(await file.arrayBuffer())).toEqual(artifact);return {sealedArtifact:{artifactSha256:'a'.repeat(64)},verifiedPayload:payload};});
 const result=await openProofMedia({kind:'public',url:'https://receiz.com/api/profile/originals/download?receizId=proof_123&kind=original',digest:'a'.repeat(64)});
 expect(result.files[0]).toMatchObject({kind:'text',text:new TextDecoder().decode(bytes)});
 expect(fetch.mock.calls.map(call=>call[0])).toEqual(['/receiz-public-market.json','/api/bank/public-market/membership',`https://receiz.com${path}`]);
});
it('explains an unsupported or invalid media carrier without exposing internal SDK errors',async()=>{
 opened.mockRejectedValue(Error('artifact_verification_failed'));
 await expect(openProofMedia({kind:'held',bytes:new Uint8Array([1]),filename:'legacy-original.receiz',digest:'a'.repeat(64)})).rejects.toThrow('could not be opened as verified media');
});
it('keeps markup inert, preserves long document text and never embeds an executable file',async()=>{
 expect(readDocumentText('<h1>A title</h1><p>One &amp; two.</p><script>alert(1)</script><p>End.</p>')).toBe('A title\n\nOne & two.\n\nEnd.');
 const html=await readMediaPayload({...payload,bytes:strToU8('<p>Readable</p><iframe src="https://evil.example"></iframe><img src="https://evil.example/x">'),mimeType:'text/html'});
 expect(html[0]).toMatchObject({kind:'text',text:'Readable'});
 const unknown=await readMediaPayload({...payload,mimeType:'application/x-executable',filename:'program.exe'});expect(unknown[0].kind).toBe('file');
});
it('reads EPUB spine order and preserves embedded illustrations without remote resources',async()=>{
 const epub=zipSync({'META-INF/container.xml':strToU8('<container><rootfiles><rootfile full-path="book/main.opf"/></rootfiles></container>'),'book/main.opf':strToU8('<package><manifest><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/><item id="art" href="art.png" media-type="image/png"/></manifest><spine><itemref idref="two"/><itemref idref="one"/></spine></package>'),'book/one.xhtml':strToU8('<h1>First</h1><p>First words.</p>'),'book/two.xhtml':strToU8('<h1>Second</h1><p>Second words.</p>'),'book/art.png':new Uint8Array([137,80,78,71])});
 const files=await readMediaPayload({...payload,bytes:epub,filename:'book.epub',mimeType:'application/epub+zip'});
 expect(files[0].kind).toBe('book');expect(files[0].chapters?.map(c=>c.title)).toEqual(['Second','First']);expect(files[1].kind).toBe('image');
});
it('recognizes a verified EPUB by its carried container marker when the canonical payload MIME is generic',async()=>{
 const epub=zipSync({'mimetype':[strToU8('application/epub+zip'),{level:0}],'META-INF/container.xml':strToU8('<container><rootfiles><rootfile full-path="book/main.opf"/></rootfiles></container>'),'book/main.opf':strToU8('<package><metadata><title>A real book</title></metadata><manifest><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/></spine></package>'),'book/one.xhtml':strToU8('<h1>First chapter</h1><p>Carried book content.</p>')});
 const files=await readMediaPayload({...payload,bytes:epub,filename:'original.receiz',mimeType:'application/octet-stream'});
 expect(files[0]).toMatchObject({kind:'book',mimeType:'application/epub+zip'});expect(files[0].chapters?.[0].text).toContain('Carried book content.');
 const ordinary=zipSync({'other.txt':strToU8('An ordinary ZIP')});expect((await readMediaPayload({...payload,bytes:ordinary,mimeType:'application/octet-stream'}))[0].kind).toBe('file');
 const falseMarker=zipSync({'mimetype':[strToU8('application/not-epub'),{level:0}],'META-INF/container.xml':strToU8('<container/>')});expect((await readMediaPayload({...payload,bytes:falseMarker,mimeType:'application/octet-stream'}))[0].kind).toBe('file');
});
it('refuses a book whose spine points outside its carried source',async()=>{
 const epub=zipSync({'META-INF/container.xml':strToU8('<container><rootfile full-path="book/main.opf"/></container>'),'book/main.opf':strToU8('<package><manifest><item id="a" href="https://evil.example"/></manifest><spine><itemref idref="a"/></spine></package>')});
 await expect(readMediaPayload({...payload,bytes:epub,filename:'book.epub',mimeType:'application/epub+zip'})).rejects.toThrow();
});
it('projects book cover, headings and paragraphs without mounting active markup or fetching external resources',async()=>{
 const epub=zipSync({'META-INF/container.xml':strToU8('<container><rootfile full-path="book/main.opf"/></container>'),'book/main.opf':strToU8('<package><metadata><title>A book</title><creator>A writer</creator></metadata><manifest><item id="a" href="one.xhtml"/><item id="art" href="cover.png" media-type="image/png"/></manifest><spine><itemref idref="a"/></spine></package>'),'book/one.xhtml':strToU8('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Do not read this</title></head><body><h1>Chapter one</h1><p>Words <em>with emphasis</em>.</p><img src="cover.png" alt="Cover"/><script>Do not execute</script><img src="https://evil.example/image"/><iframe src="https://evil.example"/></body></html>'),'book/cover.png':new Uint8Array([137,80,78,71])}),fetcher=vi.spyOn(globalThis,'fetch');
 const [book]=await readMediaPayload({...payload,bytes:epub,mimeType:'application/epub+zip'});expect(book.book).toMatchObject({title:'A book',author:'A writer'});expect(book.chapters?.[0].blocks).toEqual([{kind:'heading',text:'Chapter one'},{kind:'paragraph',text:'Words with emphasis.'},{kind:'image',path:'book/cover.png',text:'Cover'}]);expect(book.chapters?.[0].text).not.toContain('Do not');expect(fetcher).not.toHaveBeenCalled();
});
it('deduplicates book illustrations and bounds manifest references before rendering',async()=>{
 const book=(count:number)=>zipSync({'META-INF/container.xml':strToU8('<container><rootfile full-path="book/main.opf"/></container>'),'book/main.opf':strToU8('<package><manifest><item id="a" href="one.xhtml"/>'+Array.from({length:count},(_,i)=>`<item id="art${i}" href="art.png" media-type="image/png"/>`).join('')+'</manifest><spine><itemref idref="a"/></spine></package>'),'book/one.xhtml':strToU8('<p>A book.</p>'),'book/art.png':new Uint8Array([137,80,78,71])});
 expect(await readMediaPayload({...payload,bytes:book(1000),mimeType:'application/epub+zip'})).toHaveLength(2);
 await expect(readMediaPayload({...payload,bytes:book(5000),mimeType:'application/epub+zip'})).rejects.toThrow('media references');
});

it('bounds materialized book text even when a small archive repeats one chapter',async()=>{
 const epub=zipSync({'META-INF/container.xml':strToU8('<container><rootfile full-path="book/main.opf"/></container>'),'book/main.opf':strToU8('<package><manifest><item id="a" href="one.xhtml"/></manifest><spine>'+('<itemref idref="a"/>'.repeat(150))+'</spine></package>'),'book/one.xhtml':strToU8('x'.repeat(128*1024))});
 await expect(readMediaPayload({...payload,bytes:epub,filename:'book.epub',mimeType:'application/epub+zip'})).rejects.toThrow('text capacity');
});
it('refuses ZIP declarations that lie about stored member sizes before decompression',async()=>{
 const epub=zipSync({'META-INF/container.xml':strToU8('x')},{level:0}),view=new DataView(epub.buffer,epub.byteOffset,epub.byteLength);
 for(let at=0;at<epub.length-46;at++)if(view.getUint32(at,true)===0x02014b50){view.setUint32(at+24,0,true);break;}
 await expect(readMediaPayload({...payload,bytes:epub,filename:'book.epub',mimeType:'application/epub+zip'})).rejects.toThrow('archive');
});
it('does not embed remote playlists or executable SVG as active media',async()=>{
 expect((await readMediaPayload({...payload,bytes:strToU8('#EXTM3U\nhttps://evil.example/part'),mimeType:'video/mp4'}))[0].kind).toBe('file');
 expect((await readMediaPayload({...payload,bytes:strToU8('<svg onload="alert(1)"/>'),mimeType:'image/svg+xml'}))[0].kind).toBe('file');
});

it('refuses deflated data whose actual produced size exceeds its declared size',async()=>{
 const epub=zipSync({'META-INF/container.xml':strToU8('x'.repeat(128*1024))}),view=new DataView(epub.buffer,epub.byteOffset,epub.byteLength);
 for(let at=0;at<epub.length-46;at++)if(view.getUint32(at,true)===0x02014b50){view.setUint32(at+24,64,true);const local=view.getUint32(at+42,true);view.setUint32(local+22,64,true);break;}
 await expect(readMediaPayload({...payload,bytes:epub,filename:'book.epub',mimeType:'application/epub+zip'})).rejects.toThrow('decoded size');
});

it('reuses a retained authored source through the unchanged canonical reader without a public download',async()=>{
 const adoption=await import('../src/receiz/asset-publication-adoption');
 const file=new File([new Uint8Array([1])],'authored.receiz');
 adoption.retainAssetPublicationSource('d'.repeat(64),file);
 opened.mockResolvedValueOnce({sealedArtifact:{artifactSha256:'d'.repeat(64)},verifiedPayload:{bytes:new TextEncoder().encode('Read locally'),filename:'essay.txt',mimeType:'text/plain',sha256:'e'.repeat(64)}});
 const remote=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No download expected'));
 try{const result=await openProofMedia({kind:'public',url:'https://receiz.com/api/proof-material/packages/'+'d'.repeat(64)+'/artifact',digest:'d'.repeat(64)});expect(result.files[0].text).toBe('Read locally');expect(remote).not.toHaveBeenCalled();}finally{adoption.forgetAssetPublicationAdmissions();remote.mockRestore();}
});
