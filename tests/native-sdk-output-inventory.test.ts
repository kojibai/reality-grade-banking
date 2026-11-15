import {expect,it} from 'vitest';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
// @ts-expect-error Build tooling is plain ESM.
import {verifySdkOutputInventory} from '../scripts/sdk-output-inventory.mjs';
it('refuses omitted, extra, duplicated or altered SDK JS outputs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-sdk-inventory-'));
 try{
  await mkdir(join(root,'dist'));await writeFile(join(root,'dist/one.js'),'exact');
  const row={path:'dist/one.js',sha256:createHash('sha256').update('exact').digest('hex')};
  await expect(verifySdkOutputInventory(root,[row])).resolves.toBeUndefined();
  await expect(verifySdkOutputInventory(root,[])).rejects.toThrow('inventory');
  await expect(verifySdkOutputInventory(root,[row,row])).rejects.toThrow('Duplicate');
  await writeFile(join(root,'dist/two.js'),'new');await expect(verifySdkOutputInventory(root,[row])).rejects.toThrow('inventory');
  await rm(join(root,'dist/two.js'));await writeFile(join(root,'dist/one.js'),'changed');await expect(verifySdkOutputInventory(root,[row])).rejects.toThrow('output differs');
 }finally{await rm(root,{recursive:true,force:true});}
});
