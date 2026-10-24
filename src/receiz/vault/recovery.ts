import {decryptVaultBytes,readEncryptedVault} from './encryption';
import {vaultBase64,vaultBytes,vaultCanonical,vaultObject} from './encoding';

export type IdentityRecoveryOriginal={bytes:Uint8Array;filename:string;phrase:string};
type AdmittedIdentity={binding:{keyId:string;identityOwnerReceizId:string};dispose():void};
// The base64 original and closed metadata must fit the encrypted carrier bound.
const MAX=23*1024*1024;
function original(value:IdentityRecoveryOriginal):IdentityRecoveryOriginal{
 if(!(value.bytes instanceof Uint8Array)||!value.bytes.length||value.bytes.length>MAX||typeof value.filename!=='string'||!value.filename.length||value.filename.length>255||/[\u0000-\u001f\u007f/\\]/.test(value.filename)||typeof value.phrase!=='string'||value.phrase.length>4096)throw Error('VAULT_RECOVERY_INVALID');
 return value;
}
export function encodeIdentityRecovery(input:IdentityRecoveryOriginal):Uint8Array{
 const value=original(input);
 return new TextEncoder().encode(vaultCanonical({schema:'bank.vault.identity-original.v1',filename:value.filename,phrase:value.phrase,bytes:vaultBase64(value.bytes)}));
}
/** Decryption supplies a private transport, never identity authority. The
 * existing canonical identity entry must admit the original and its phrase.
 * Callers persist the returned identity only after this owner check succeeds. */
export async function openIdentityRecovery<T extends AdmittedIdentity>(input:unknown,secret:Uint8Array,admit:(original:IdentityRecoveryOriginal)=>Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted)throw Error('VAULT_CLOSED');
 const envelope=readEncryptedVault(input);if(envelope.header.purpose!=='identity-recovery')throw Error('VAULT_RECOVERY_REQUIRED');
 const plaintext=await decryptVaultBytes(envelope,secret);
 let recovered:IdentityRecoveryOriginal;
 try{
  const payload=vaultObject(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plaintext)),['schema','filename','phrase','bytes']);
  if(payload.schema!=='bank.vault.identity-original.v1')throw Error('VAULT_RECOVERY_INVALID');
  recovered=original({bytes:vaultBytes(payload.bytes,MAX),filename:payload.filename as string,phrase:payload.phrase as string});
 }finally{plaintext.fill(0);}
 if(signal.aborted){recovered.bytes.fill(0);throw Error('VAULT_CLOSED');}
 let admitted:T;
 try{admitted=await admit(recovered);}catch(error){recovered.bytes.fill(0);throw error;}
 if(signal.aborted||admitted.binding.keyId!==envelope.header.owner.keyId||admitted.binding.identityOwnerReceizId!==envelope.header.owner.receizId){
  admitted.dispose();recovered.bytes.fill(0);throw Error(signal.aborted?'VAULT_CLOSED':'VAULT_OWNER_MISMATCH');
 }
 return admitted;
}
