import {expect,it} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {sourceFiles} from '../scripts/source-files.mjs';
it('publishes only integration source files, excluding local order databases and journals by construction',async()=>{
 const directory=await mkdtemp('integrations/payments/private-example-');try{for(const name of ['orders.sqlite','orders.sqlite-wal','orders.sqlite-shm','unrelated.txt'])await writeFile(join(directory,name),'synthetic private sentinel');
 const files=await sourceFiles();expect(files.some((file:{path:string})=>file.path.startsWith(directory))).toBe(false);expect(files.some((file:{path:string})=>file.path==='integrations/payments/src/index.ts')).toBe(true);
 }finally{await rm(directory,{recursive:true,force:true});}
});
