import {expect,it} from 'vitest';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
// Actual build-only producer; no runtime financial state.
import {writeOriginalsQualificationAssets} from '../scripts/originals-qualification-assets.mjs';
it('records the exact emitted module closure and bytes for the existing offline resource verifier',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bank-originals-modules-'));
 try{await writeOriginalsQualificationAssets(directory);const path=join(directory,'learn/originals-qualification.modules.json');expect(existsSync(path),'The actual module producer carries its emitted resource list').toBe(true);const manifest=JSON.parse(await readFile(path,'utf8')) as {version:number;entry:string;resources:Array<{url:string;sha256:string;bytes:number}>};expect(manifest.version).toBe(1);expect(manifest.entry).toMatch(/^\/learn\/originals-qualification-main-[A-Za-z0-9]+\.js$/);expect(manifest.resources.map(item=>item.url)).toContain(manifest.entry);const emitted=(await readdir(join(directory,'learn'))).filter(name=>/^originals-qualification-(main|chunk)-/.test(name)).map(name=>'/learn/'+name).sort();expect(manifest.resources.map(item=>item.url).sort()).toEqual(emitted);
 for(const resource of manifest.resources){expect(resource.url).toMatch(/^\/learn\/originals-qualification-(main|chunk)-[A-Za-z0-9]+\.js$/);const bytes=await readFile(join(directory,resource.url.slice(1)));expect(resource.bytes).toBe(bytes.length);expect(resource.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));}
 }finally{await rm(directory,{recursive:true,force:true});}
},30000);
