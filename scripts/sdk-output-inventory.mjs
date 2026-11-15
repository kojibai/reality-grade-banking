import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

/** Preferred source must reproduce the complete qualified SDK JS inventory. */
export async function verifySdkOutputInventory(sdk,expected){
 const actual=[];
 async function visit(directory,prefix='dist/'){
  for(const entry of await readdir(directory,{withFileTypes:true})){
   const path=prefix+entry.name;
   if(entry.isDirectory())await visit(resolve(directory,entry.name),path+'/');
   else if(path.endsWith('.js'))actual.push(path);
  }
 }
 await visit(resolve(sdk,'dist'));
 const paths=expected.map(entry=>entry.path);
 assert.equal(new Set(paths).size,paths.length,'Duplicate SDK output path.');
 assert.ok(paths.every(path=>path.startsWith('dist/')&&!path.split('/').includes('..')&&path.endsWith('.js')),'Invalid SDK output path.');
 assert.deepEqual(actual.sort(),[...paths].sort(),'SDK output inventory differs.');
 for(const entry of expected)assert.equal(createHash('sha256').update(await readFile(resolve(sdk,entry.path))).digest('hex'),entry.sha256,`SDK output differs: ${entry.path}`);
}
