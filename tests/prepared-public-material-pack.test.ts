import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {afterEach,expect,it,vi} from 'vitest';
import {readPreparedPublicMaterial,preparedPublicMaterialSelection,withPreparedPublicMaterialScope} from '../server/prepared-public-material';
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
afterEach(()=>vi.unstubAllGlobals());
it('reuses selected pack parts within one render and still checks the root after rendering and on the next request',async()=>{
 const text=JSON.stringify({held:'root'}),root=sha(text),values=Array.from({length:300},(_,n)=>JSON.stringify({held:n})),parts=Object.fromEntries([[root,text],...values.map(value=>[sha(value),value])]);let eligible=true;
 const fetcher=vi.fn(async()=>eligible?new Response(gzipSync(JSON.stringify({schema:'receiz.public-display.selected-pack.v1',generation:root,root,parts})),{headers:{'content-type':'application/gzip'}}):new Response(null,{status:503}));vi.stubGlobal('fetch',fetcher);
 await withPreparedPublicMaterialScope(async()=>{
  expect(await readPreparedPublicMaterial(root)).toBe(text);const reader=preparedPublicMaterialSelection({root});
  for(const value of values)expect(await reader.read(sha(value))).toBe(value);
  expect(fetcher).toHaveBeenCalledTimes(1);
  eligible=false;await expect(readPreparedPublicMaterial(root)).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');
 });
 await withPreparedPublicMaterialScope(async()=>{await expect(preparedPublicMaterialSelection({root}).read(sha(values[0]))).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');});
 expect(fetcher).toHaveBeenCalledTimes(3);
});
it('refuses an altered packed part without retaining any of that packet',async()=>{
 const text=JSON.stringify({held:'root'}),root=sha(text),part=sha('original');
 vi.stubGlobal('fetch',async()=>new Response(gzipSync(JSON.stringify({schema:'receiz.public-display.selected-pack.v1',generation:root,root,parts:{[root]:text,[part]:'altered'}})),{headers:{'content-type':'application/gzip'}}));
 await withPreparedPublicMaterialScope(async()=>{await expect(readPreparedPublicMaterial(root)).rejects.toThrow('PUBLIC_MATERIAL_INTEGRITY');});
});
