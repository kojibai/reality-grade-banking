import {readFile,stat} from 'node:fs/promises';
await import('./inspector.js');
globalThis.fetch=()=>{throw Error('NETWORK_DISABLED');};
const path=process.argv[2];
if(!path){console.error('Usage: node verify.mjs /path/to/original-vault.png-or-public.json');process.exitCode=2;}
else try{const before=await stat(path);if(!before.isFile()||!before.size||before.size>48*1024*1024)throw Error('VAULT_IMAGE_CAPACITY');const bytes=new Uint8Array(await readFile(path));if(bytes.length!==before.size)throw Error('LOCAL_FILE_CHANGED');const result=await globalThis.VaultOfflineInspector.inspect(bytes);console.log(JSON.stringify(result,null,2));if(result.kind==='protected-private')process.exitCode=2;}
catch(error){console.error(JSON.stringify({verified:false,grantsAccess:false,error:globalThis.VaultOfflineInspector.failureCode(error)}));process.exitCode=1;}
