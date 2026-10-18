// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {zipSync,strToU8} from 'fflate';
const opened=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({createReceizClient:()=>({artifacts:{verifyAndOpen:opened}})})}));
import {openProofMedia,readMediaPayload,readDocumentText} from '../src/receiz/proof-media';
afterEach(()=>{opened.mockReset();vi.restoreAllMocks();});
const bytes=new TextEncoder().encode('An original essay.\n\nEvery paragraph remains available.');
const payload={bytes,filename:'essay.txt',mimeType:'text/plain',sha256:'b'.repeat(64)};
it('opens only the exact original before reading its payload, refusing a digest mismatch',async()=>{
 opened.mockResolvedValue({sealedArtifact:{artifactSha256:'a'.repeat(64)},verifiedPayload:payload});
 const result=await openProofMedia({kind:'held',bytes:new Uint8Array([1]),filename:'original.receiz',digest:'a'.repeat(64)});
 expect(result.files[0]).toMatchObject({kind:'text',filename:'essay.txt',text:new TextDecoder().decode(bytes)});
 expect(result.artifactDigest).toBe('a'.repeat(64));expect(opened).toHaveBeenCalledOnce();
 await expect(openProofMedia({kind:'held',bytes:new Uint8Array([1]),filename:'original.receiz',digest:'c'.repeat(64)})).rejects.toThrow('match');
});
it('does not follow arbitrary public URLs, and reads bounded public original bytes without credentials',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(new Uint8Array([1])));
 await expect(openProofMedia({kind:'public',url:'https://evil.example/test',digest:'a'.repeat(64)})).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();
 opened.mockResolvedValue({sealedArtifact:{artifactSha256:'a'.repeat(64)},verifiedPayload:payload});
 await openProofMedia({kind:'public',url:'https://receiz.com/api/profile/originals/download?receizId=proof_123&kind=original',digest:'a'.repeat(64)});
 expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error'});
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
it('refuses a book whose spine points outside its carried source',async()=>{
 const epub=zipSync({'META-INF/container.xml':strToU8('<container><rootfile full-path="book/main.opf"/></container>'),'book/main.opf':strToU8('<package><manifest><item id="a" href="https://evil.example"/></manifest><spine><itemref idref="a"/></spine></package>')});
 await expect(readMediaPayload({...payload,bytes:epub,filename:'book.epub',mimeType:'application/epub+zip'})).rejects.toThrow();
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
