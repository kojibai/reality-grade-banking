import {expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readdir,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
it('does not rewrite identical verifier files while independent evidence readers may be hashing them',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'bank-verifier-build-'));
 const build=()=>execFileSync(process.execPath,['scripts/build-proof-verifier.mjs',directory],{stdio:'pipe'});
 try{
  build();const files=await readdir(directory),before=await Promise.all(files.map(async name=>[name,(await stat(join(directory,name))).mtimeMs]));
  build();const after=await Promise.all(files.map(async name=>[name,(await stat(join(directory,name))).mtimeMs]));
  expect(after).toEqual(before);
 }finally{await rm(directory,{recursive:true,force:true});}
},15_000);
