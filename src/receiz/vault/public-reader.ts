import {nativeFetch} from '../native-transport';
import {inspectVaultDisclosure} from './disclose';
import {openVaultImage} from './export';
import type {VaultLocation} from './location';
export type VaultDisclosure=Awaited<ReturnType<typeof inspectVaultDisclosure>>;
const MAX=48*1024*1024;
type ReaderPorts={fetch?:typeof fetch;inspect?:typeof inspectVaultDisclosure};
/** Digest-addressed public evidence is immutable. Share one admission/request
 * within this reader lifetime, never a balance read or a private access grant. */
export function createVaultPublicReader(ports:ReaderPorts={}){
 const originals=new Map<string,Promise<VaultDisclosure>>(),inspect=ports.inspect??inspectVaultDisclosure;
 return{
  async load(route:VaultLocation){
   const proof=route.proof;if(!proof)throw Error('VAULT_PUBLIC_RECORD_REQUIRED');
   const key=route.vaultId+':'+proof;let held=originals.get(key);
   if(!held){
    held=(async()=>{
     const response=await(ports.fetch??nativeFetch)(`https://receiz.com/api/connect/vault/public?vaultId=${encodeURIComponent(route.vaultId)}&proof=${proof}`,{method:'GET',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(30000)});
     if(!response.ok)throw Error(response.status===404?'VAULT_PUBLIC_RECORD_NOT_FOUND':'VAULT_PUBLIC_RECORD_UNAVAILABLE');
     const bytes=new Uint8Array(await response.arrayBuffer());if(!bytes.length||bytes.length>MAX)throw Error('VAULT_IMAGE_CAPACITY');
     const admitted=await inspect(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),proof);
     if(admitted.vaultId!==route.vaultId)throw Error('VAULT_PUBLIC_LOCATOR_MISMATCH');return admitted;
    })();
    originals.set(key,held);void held.catch(()=>{if(originals.get(key)===held)originals.delete(key);});
   }
   return held;
  },
  async open(input:Uint8Array){
   const bytes=new Uint8Array(input);if(!bytes.length||bytes.length>MAX)throw Error('VAULT_IMAGE_CAPACITY');
   let record:unknown;
   if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71){
    const {loadReceiz}=await import('../client'),sdk=await loadReceiz();
    const opened=await openVaultImage(bytes,async value=>(await sdk.verifyReceizArtifact(value)).status==='verified-artifact');
    if(opened.kind!=='public')throw Error('VAULT_PRIVATE_ORIGINAL');record=opened.value;
   }else record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   return inspect(record);
  },
 };
}
