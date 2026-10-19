import {readFile,stat} from 'node:fs/promises';
await import('./verifier.js');
const verifier=globalThis.ReceizOfflineVerifier;
// Prevent accidental server dependency during offline verification.
globalThis.fetch=()=>{throw Error('NETWORK_DISABLED');};
const [path='record.json',expected]=process.argv.slice(2);
try{
 const size=(await stat(path)).size;if(size<=0||size>24*1024*1024)throw Error('PROOF_INSPECTION_CAPACITY');
 const bytes=new Uint8Array(await readFile(path));if(bytes.length!==size)throw Error('LOCAL_FILE_CHANGED');
 if(path.endsWith('.json')&&!expected){
  const record=JSON.parse(new TextDecoder().decode(bytes));
  console.log(JSON.stringify(await verifier.inspectWalletCapsule(record.details?.proofBundle),null,2));
 }else{
  const result=await verifier.inspectArtifact(bytes,path.split('/').at(-1));
  if(expected&&result.artifactSha256!==expected)throw Error('SELECTED_RECORD_DIGEST_MISMATCH');
  console.log(JSON.stringify(result,null,2));
 }
}catch(error){console.error(error.message);process.exitCode=1;}
