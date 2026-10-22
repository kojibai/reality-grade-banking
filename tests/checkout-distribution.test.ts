import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {sourceFiles} from '../scripts/source-files.mjs';
it('distributes the complete hosted checkout document and maps production links ahead of profiles',async()=>{
 const files=await sourceFiles();expect(files.some((entry:{path:string})=>entry.path==='pay/index.html')).toBe(true);
 const config=JSON.parse(await readFile('vercel.json','utf8')),routes=config.rewrites,profile=routes.findIndex((row:{source:string})=>row.source.startsWith('/u/'));
 for(const source of ['/pay','/pay/','/pay/:username','/pay/:username/']){const index=routes.findIndex((row:{source:string})=>row.source===source);expect(index).toBeGreaterThanOrEqual(0);expect(index).toBeLessThan(profile);expect(routes[index].destination).toBe('/pay/index.html');}
});
