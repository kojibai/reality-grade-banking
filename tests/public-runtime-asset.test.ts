import{afterEach,expect,it,vi}from'vitest';
import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{handlePublicRuntimeAsset}from'../server/public-runtime-asset';
afterEach(()=>vi.unstubAllGlobals());
const digest=createHash('sha256').update('export const held=true;').digest('hex');
it('serves a missing generated asset through the fixed public Receiz reader without forwarding account authority',async()=>{
 const remote=vi.fn<typeof fetch>(async()=>new Response('export const held=true;',{headers:{'content-type':'text/javascript; charset=utf-8','content-length':'23',etag:'"'+digest+'"','x-receiz-public-runtime-sha256':digest,'set-cookie':'do-not-forward'}}));
 const response=await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file=explore-Abcdef12.js',{headers:{cookie:'private',authorization:'Bearer private'}}),remote);
 expect(response.status).toBe(200);expect(await response.text()).toBe('export const held=true;');expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');expect(response.headers.get('set-cookie')).toBeNull();
 expect(String(remote.mock.calls[0]?.[0])).toBe('https://receiz.com/api/market/public-runtime-asset?file=explore-Abcdef12.js');expect(remote.mock.calls[0]?.[1]).toMatchObject({credentials:'omit',redirect:'error'});expect(JSON.stringify(remote.mock.calls)).not.toContain('private');
});
it('registers the old-asset fallback as a normal rewrite, leaving current deployed files to existing filesystem precedence',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 expect(config.rewrites.find((row:{source:string})=>row.source==='/assets/:file')?.destination).toBe('/api/runtime-asset?file=:file');
});
it('refuses mutation, traversal, arbitrary origins and unhashed assets before a network request',async()=>{
 const remote=vi.fn<typeof fetch>();
 for(const [query,method,status]of [['file=explore-Abcdef12.js','POST',405],['file=../private','GET',400],['file=https://evil.test/asset-Abcdef12.js','GET',400],['file=script.js','GET',400],['file=x-Abcdef12.html','GET',400],['file=x-Abcdef12.js&url=https://evil.test','GET',400],['file=x-Abcdef12.js&file=x-Abcdef34.js','GET',400]]as const){
  expect((await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?'+query,{method}),remote)).status).toBe(status);
 }
 expect(remote).not.toHaveBeenCalled();
});
it('keeps missing and unavailable byte delivery explicit without falling through to HTML or Source discovery',async()=>{
 for(const status of [404,503]){const response=await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file=explore-Abcdef12.js'),async()=>new Response('<html>never execute</html>',{status}));expect(response.status).toBe(status);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.text()).not.toContain('<html>');}
 const invalidHeaders:HeadersInit[]=[{'content-type':'text/html'},{'content-type':'text/javascript; charset=utf-8','content-length':String(9*1024*1024)}];
 for(const headers of invalidHeaders)expect((await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file=explore-Abcdef12.js'),async()=>new Response('invalid',{headers}))).status).toBe(503);
});
it('retains MJS/CSS MIME and bounded HEAD delivery',async()=>{
 for(const [file,mime]of [['tokens-Abcdef12.css','text/css; charset=utf-8'],['pdf.worker.min-Abcdef12.mjs','text/javascript; charset=utf-8']]){
  const remote=vi.fn<typeof fetch>(async()=>new Response(null,{headers:{'content-type':mime,'content-length':'23','x-receiz-public-runtime-sha256':digest,etag:'"'+digest+'"'}}));
  const response=await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file='+file,{method:'HEAD'}),remote);expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe(mime);expect(await response.text()).toBe('');expect(remote.mock.calls[0]?.[1]?.method).toBe('HEAD');
 }
});
it('streams the exact retained executable when the deployment transport omits Content-Length',async()=>{
 const remote=vi.fn<typeof fetch>(async()=>new Response('export const held=true;',{headers:{'content-type':'text/javascript; charset=utf-8','x-receiz-public-runtime-sha256':digest}}));
 const response=await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file=ledger-Abcdef12.js'),remote);
 expect(response.status).toBe(200);expect(await response.text()).toBe('export const held=true;');expect(response.headers.get('content-length')).toBe('23');expect(remote).toHaveBeenCalledTimes(1);
});
it('preserves a lengthless HEAD without inventing a byte count or opening the executable',async()=>{
 const remote=vi.fn<typeof fetch>(async()=>new Response(null,{headers:{'content-type':'text/javascript; charset=utf-8','x-receiz-public-runtime-sha256':digest}}));
 const response=await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file=ledger-Abcdef12.js',{method:'HEAD'}),remote);
 expect(response.status).toBe(200);expect(await response.text()).toBe('');expect(response.headers.get('content-length')).toBeNull();expect(remote).toHaveBeenCalledTimes(1);expect(remote.mock.calls[0]?.[1]?.method).toBe('HEAD');
});
it('still refuses changed, empty or over-capacity bytes without a supplied length',async()=>{
 for(const body of ['changed bytes','', 'x'.repeat(8*1024*1024+1)]){
  const response=await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file=ledger-Abcdef12.js'),async()=>new Response(body,{headers:{'content-type':'text/javascript; charset=utf-8','x-receiz-public-runtime-sha256':createHash('sha256').update(body==='changed bytes'?'expected':body).digest('hex')}}));
  expect(response.status).toBe(503);expect(await response.text()).toBe('');
 }
});
it('refuses changed or truncated bytes even when public delivery headers claim the retained digest',async()=>{
 for(const body of ['x','x'.repeat(23)]){
  const response=await handlePublicRuntimeAsset(new Request('https://bankeiz.com/api/runtime-asset?file=explore-Abcdef12.js'),async()=>new Response(body,{headers:{'content-type':'text/javascript; charset=utf-8','content-length':'23','x-receiz-public-runtime-sha256':digest}}));
  expect(response.status).toBe(503);expect(await response.text()).toBe('');
 }
});
