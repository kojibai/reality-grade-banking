import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {afterEach,expect,it,vi} from 'vitest';
import {readPreparedPublicMaterial,recheckPreparedPublicMaterial,preparedPublicMaterialSelection,withPreparedPublicMaterialScope} from '../server/prepared-public-material';
import sdkFixture from './fixtures/prepared-public-material-sdk-root.json';
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
afterEach(()=>vi.unstubAllGlobals());
it.each(['packed','body'] as const)('reuses the genuine SDK615 selected root within the same request after %s transport is unavailable',async format=>{
 const root=sdkFixture.root,pack=JSON.parse(gunzipSync(Buffer.from(sdkFixture.gzipBase64,'base64')).toString()),text=pack.parts[root];expect(sdkFixture.sdkSourceHead.visibleCount).toBe(615);expect(sha(text)).toBe(root);
 const response=()=>new Response(format==='packed'?Buffer.from(sdkFixture.gzipBase64,'base64'):gzipSync(text),{headers:{'content-type':'application/gzip'}});
 const fetcher=vi.fn(async()=>response());
 await withPreparedPublicMaterialScope(async()=>{
  const context={root,role:'history-transition' as const};expect(await readPreparedPublicMaterial(root,fetcher as typeof fetch,context)).toBe(text);
  fetcher.mockImplementation(async()=>new Response(null,{status:503}));
  expect(await readPreparedPublicMaterial(root,fetcher as typeof fetch,context)).toBe(text);expect(fetcher).toHaveBeenCalledOnce();
  await expect(readPreparedPublicMaterial(root,fetcher as typeof fetch,{root,role:'root'})).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');
  await expect(readPreparedPublicMaterial(root,fetcher as typeof fetch,{...context,selection:'a'.repeat(64)})).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');
  await expect(recheckPreparedPublicMaterial(root,fetcher as typeof fetch,context)).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');
 });
 await withPreparedPublicMaterialScope(async()=>{await expect(readPreparedPublicMaterial(root,fetcher as typeof fetch,{root,role:'history-transition'})).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');});
 expect(fetcher).toHaveBeenCalledTimes(5);
});
it('reuses selected pack parts and exact root within one render while explicit policy checks and a new request still refuse',async()=>{
 const text=JSON.stringify({held:'root'}),root=sha(text),values=Array.from({length:300},(_,n)=>JSON.stringify({held:n})),parts=Object.fromEntries([[root,text],...values.map(value=>[sha(value),value])]);let eligible=true;
 const fetcher=vi.fn(async()=>eligible?new Response(gzipSync(JSON.stringify({schema:'receiz.public-display.selected-pack.v1',generation:root,root,parts})),{headers:{'content-type':'application/gzip'}}):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 await withPreparedPublicMaterialScope(async()=>{
  expect(await readPreparedPublicMaterial(root)).toBe(text);const reader=preparedPublicMaterialSelection({root});
  for(const value of values)expect(await reader.read(sha(value))).toBe(value);
  expect(fetcher).toHaveBeenCalledTimes(1);
  eligible=false;expect(await readPreparedPublicMaterial(root)).toBe(text);
  await expect(recheckPreparedPublicMaterial(root)).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');
 });
 await withPreparedPublicMaterialScope(async()=>{await expect(preparedPublicMaterialSelection({root}).read(sha(values[0]))).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');});
 expect(fetcher).toHaveBeenCalledTimes(3);
});
it('refuses an altered packed part without retaining any of that packet',async()=>{
 const text=JSON.stringify({held:'root'}),root=sha(text),part=sha('original');
 vi.stubGlobal('fetch',async()=>new Response(gzipSync(JSON.stringify({schema:'receiz.public-display.selected-pack.v1',generation:root,root,parts:{[root]:text,[part]:'altered'}})),{headers:{'content-type':'application/gzip'}}));
 await withPreparedPublicMaterialScope(async()=>{await expect(readPreparedPublicMaterial(root)).rejects.toThrow('PUBLIC_MATERIAL_INTEGRITY');});
});
