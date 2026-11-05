import {nativeFetch} from '../native-transport';
import {inspectVaultDisclosure} from './disclose';
import {openVaultImage} from './export';
import type {VaultLocation} from './location';
import {vaultCanonical} from './encoding';
export type VaultDisclosure=Awaited<ReturnType<typeof inspectVaultDisclosure>>;
const MAX=48*1024*1024;
type ReaderPorts={fetch?:typeof fetch;inspect?:typeof inspectVaultDisclosure;capture?(record:VaultDisclosure):Promise<File>};
/** Digest-addressed public evidence is immutable. Share one admission/request
 * within this reader lifetime, never a balance read or a private access grant. */
export function createVaultPublicReader(ports:ReaderPorts={}){
 const originals=new Map<string,Promise<VaultDisclosure>>(),inspect=ports.inspect??inspectVaultDisclosure;
 type Held={canonical:string;projection:string;recordSha256:string;vaultId:string;ownerReceizId:string;file?:File;work?:Promise<File>};
 const admitted=new WeakMap<VaultDisclosure,Held>();
 const projection=(record:VaultDisclosure)=>vaultCanonical({name:record.name??null,holdings:record.holdings??null,at:record.sealedAtKaiUPulse??null,grantsAccess:record.grantsAccess??null,currentUnspentness:record.currentUnspentness??null});
 const remember=(record:VaultDisclosure,file?:File)=>{admitted.set(record,{canonical:vaultCanonical(record.record),projection:projection(record),recordSha256:record.recordSha256,vaultId:record.vaultId,ownerReceizId:record.ownerReceizId,file});return record;};
 const selected=(record:VaultDisclosure)=>{const held=admitted.get(record);if(!held)throw Error('VAULT_PUBLIC_VERIFIED_SOURCE_REQUIRED');if(held.canonical!==vaultCanonical(record.record)||held.projection!==projection(record)||held.recordSha256!==record.recordSha256||held.vaultId!==record.vaultId||held.ownerReceizId!==record.ownerReceizId)throw Error('VAULT_PUBLIC_SOURCE_CHANGED');return held;};
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
     if(admitted.vaultId!==route.vaultId)throw Error('VAULT_PUBLIC_LOCATOR_MISMATCH');return remember(admitted);
    })();
    originals.set(key,held);void held.catch(()=>{if(originals.get(key)===held)originals.delete(key);});
   }
   return held;
  },
  async open(input:Uint8Array,filename?:string,mimeType?:string){
   const bytes=new Uint8Array(input);if(!bytes.length||bytes.length>MAX)throw Error('VAULT_IMAGE_CAPACITY');
   if(filename&&(/[\\/\x00-\x1f\x7f]/.test(filename)||filename.length>240))throw Error('VAULT_PUBLIC_FILENAME_INVALID');
   if(mimeType&&(/[\x00-\x1f\x7f]/.test(mimeType)||mimeType.length>160))throw Error('VAULT_PUBLIC_FILENAME_INVALID');
   let record:unknown,canonical=false;
   if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71){
    const {loadReceiz}=await import('../client'),sdk=await loadReceiz();
    const opened=await openVaultImage(bytes,async value=>canonical=(await sdk.verifyReceizArtifact(value)).status==='verified-artifact');
    if(opened.kind!=='public')throw Error('VAULT_PRIVATE_ORIGINAL');record=opened.value;
   }else{
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);record=JSON.parse(text);
    // Historical native JSON remains readable. A carried canonical JSON proof
    // must also pass the standard verifier; malformed proofs never downgrade.
    if(text.trimEnd().length!==text.length){
     const {loadReceiz}=await import('../client'),sdk=await loadReceiz(),verification=await sdk.verifyReceizArtifact(new File([bytes],filename??'vault-public.json',{type:'application/json'}));
     canonical=verification.status==='verified-artifact';
     if(!canonical&&(verification.status!=='invalid'||verification.errors.some(error=>error.message!=='Missing embedded JSON proof bundle.')))throw Error('VAULT_IMAGE_SEAL_INVALID');
    }
   }
   const disclosure=await inspect(record);
   return remember(disclosure,canonical?new File([bytes],filename??`vault-${disclosure.vaultId}.public.${bytes[0]===137?'png':'json'}`,{type:mimeType||(bytes[0]===137?'image/png':'application/json')}):undefined);
  },
  async export(record:VaultDisclosure):Promise<File>{
   const held=selected(record);if(held.file)return held.file;if(held.work)return held.work;
   const work=(async()=>{
    let file:File;
    if(ports.capture)file=await ports.capture(record);
    else{
     const {exportPublicRecordProof}=await import('../public-record-export');
     file=await exportPublicRecordProof({bytes:new TextEncoder().encode(held.canonical),filename:`vault-${held.vaultId}.public-proof.json`,mimeType:'application/json',recordHash:held.recordSha256});
    }
    selected(record);held.file=file;return file;
   })();held.work=work;void work.finally(()=>{if(held.work===work)held.work=undefined;}).catch(()=>{});return work;
  },
 };
}
