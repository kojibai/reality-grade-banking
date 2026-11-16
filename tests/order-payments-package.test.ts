import {expect,it} from 'vitest';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
it('packs only distributable example files, excluding merchant runtime databases and journals',async()=>{
 const directory=await mkdtemp('integrations/payments/example/private-test-');try{for(const name of ['orders.sqlite','orders.sqlite-wal','orders.sqlite-shm'])await writeFile(join(directory,name),'synthetic private sentinel');
 const result=JSON.parse(execFileSync('npm',['pack','--dry-run','--ignore-scripts','--offline','--json','--cache',resolve(tmpdir(),'bankeiz-payments-pack-cache')],{cwd:'integrations/payments',encoding:'utf8'}));
 expect(result[0].files.some((file:{path:string})=>file.path.includes('private-test-'))).toBe(false);expect(result[0].files.some((file:{path:string})=>file.path==='example/server.mjs')).toBe(true);
 }finally{await rm(directory,{recursive:true,force:true});}
});
