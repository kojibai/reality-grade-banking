import {gzipSync} from 'node:zlib';
import {afterEach,expect,it,vi} from 'vitest';
import {decodePublicDocumentGzip} from '../src/receiz/public-document-gzip';
const raw=Buffer.from('The same complete public state. '.repeat(1000)),compressed=gzipSync(raw),packet={gzipB64u:compressed.toString('base64url'),bytes:raw.length},limits={raw:1024*1024,gzip:1024*1024};
afterEach(()=>vi.unstubAllGlobals());
it.each([false,true])('preserves exact prepared bytes with bounded native or existing fallback decoding (fallback=%s)',async fallback=>{
 if(fallback)vi.stubGlobal('DecompressionStream',undefined);
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(await decodePublicDocumentGzip(packet,limits)).toEqual(new Uint8Array(raw));expect(fetcher).not.toHaveBeenCalled();
});
it.each([false,true])('rejects overrun, truncation, capacity and noncanonical delivery without returning partial bytes (fallback=%s)',async fallback=>{
 if(fallback)vi.stubGlobal('DecompressionStream',undefined);
 for(const invalid of [{...packet,bytes:raw.length-1},{...packet,bytes:raw.length+1},{...packet,bytes:limits.raw+1},{...packet,gzipB64u:packet.gzipB64u+'='},{...packet,gzipB64u:'A'},{...packet,gzipB64u:compressed.subarray(0,10).toString('base64url')}])await expect(decodePublicDocumentGzip(invalid,limits)).rejects.toThrow();
 await expect(decodePublicDocumentGzip(packet,{...limits,gzip:1})).rejects.toThrow();
});
