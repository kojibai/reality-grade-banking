import{readdir,lstat,mkdir,copyFile,rm}from'node:fs/promises';import{constants}from'node:fs';import{resolve,relative,dirname,join}from'node:path';import{fileURLToPath}from'node:url';
const entries=['bank','explore','ledger','ledger/proofs','analytics','explore/music','explore/images','explore/videos','explore/books','explore/essays','explore/moments','explore/collectibles','explore/documents','explore/currencies','market-cap','feed','discover'];
const relocated=new Map(entries.map(path=>[path==='bank'?'index.html':path+'/index.html','__bank_static_entry/'+path+'/index.html']));
/** Deploy packaging only: original dist stays the private template/hash input.
 * No source, account, operator environment or arbitrary parent is copied. */
export async function buildPublicDeliveryOutput({source='dist',output='dist-public'}={}){
 const from=resolve(source),to=resolve(output);if(from===to||!relative(from,to).startsWith('..')||!relative(to,from).startsWith('..'))throw Error('PUBLIC_DELIVERY_DIRECTORIES_INVALID');
 const files=[];async function visit(path=''){for(const entry of await readdir(join(from,path),{withFileTypes:true})){const name=join(path,entry.name),info=await lstat(join(from,name));if(info.isSymbolicLink())throw Error('PUBLIC_DELIVERY_SYMLINK_FORBIDDEN');if(info.isDirectory())await visit(name);else if(info.isFile())files.push(name);else throw Error('PUBLIC_DELIVERY_FILE_INVALID');}}
 await visit();await rm(to,{recursive:true,force:true});await mkdir(to,{recursive:true});
 // Copy-on-write where supported; Node falls back to a regular byte copy.
 // The exact verified bytes and independent source/output lifetimes remain.
 for(const path of files){const selected=relocated.get(path)||path;await mkdir(dirname(join(to,selected)),{recursive:true});await copyFile(join(from,path),join(to,selected),constants.COPYFILE_FICLONE);}
 return{files:files.length,relocated:files.filter(path=>relocated.has(path)).length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildPublicDeliveryOutput()));
