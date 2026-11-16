import{readdir,readFile}from'node:fs/promises';
import{resolve}from'node:path';
import{createHash}from'node:crypto';

/** Generated-code transport inventory only. This is deliberately independent
 * of the selected installation resources: an on-demand runtime is archived
 * without making the Bank download it at installation or page opening. */
export async function generatedRuntimeAssets(directory='dist'){
 const root=resolve(directory,'assets'),entries=await readdir(root,{withFileTypes:true}),result=[];
 if(entries.length>4096)throw Error('OFFLINE_GENERATED_ASSET_CAPACITY');let total=0;
 for(const entry of entries){
  if(!entry.isFile()||!/^[-A-Za-z0-9_.]+\.(?:js|css|mjs)$/.test(entry.name))throw Error('OFFLINE_GENERATED_ASSET_INVALID');
  const body=await readFile(resolve(root,entry.name));total+=body.byteLength;
  if(!body.byteLength||body.byteLength>8*1024*1024||total>64*1024*1024)throw Error('OFFLINE_GENERATED_ASSET_CAPACITY');
  result.push({url:'/assets/'+entry.name,sha256:createHash('sha256').update(body).digest('hex'),bytes:body.byteLength});
 }
 return result.sort((a,b)=>a.url.localeCompare(b.url));
}
