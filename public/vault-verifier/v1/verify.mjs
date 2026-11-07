import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {basename,extname,resolve} from 'node:path';
await import('./inspector.js');
globalThis.fetch=()=>{throw Error('NETWORK_DISABLED');};
const args=process.argv.slice(2),path=args[0],extract=args.length===3&&args[1]==='--extract'?args[2]:null;
if(!path||(args.length!==1&&!extract)){console.error('Usage: node verify.mjs /path/to/original-vault.png-or-public.json [--extract /private/output-directory]');process.exitCode=2;}
else try{
 const before=await stat(path);if(!before.isFile()||!before.size||before.size>48*1024*1024)throw Error('VAULT_IMAGE_CAPACITY');const bytes=new Uint8Array(await readFile(path));if(bytes.length!==before.size)throw Error('LOCAL_FILE_CHANGED');
 if(extract){
  const recovered=await globalThis.VaultOfflineInspector.recover(bytes),directory=resolve(extract);await mkdir(directory,{recursive:true,mode:0o700});
  for(const source of recovered.sources){const original=basename(source.filename),extension=extname(original).replace(/[^.a-zA-Z0-9]/g,'').slice(0,16),filename=source.kind+'-'+source.sha256+extension;await writeFile(resolve(directory,filename),source.bytes,{flag:'wx',mode:0o600});}
  console.log(JSON.stringify({...recovered.inspection,recoveredSources:recovered.sources.length},null,2));
 }else{const result=await globalThis.VaultOfflineInspector.inspect(bytes);console.log(JSON.stringify(result,null,2));if(result.kind==='protected-private')process.exitCode=2;}
}
catch(error){console.error(JSON.stringify({verified:false,grantsAccess:false,error:globalThis.VaultOfflineInspector.failureCode(error)}));process.exitCode=1;}
