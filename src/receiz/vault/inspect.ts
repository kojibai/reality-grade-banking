import {openVaultCarrier,readVaultCarrier} from './carrier';
import {readVaultPrivateSource} from './source';
import {admitVaultPrivateSourceForBank,type VaultPrivateAdmissionOptions} from './admit';
import {inspectVaultDisclosure} from './disclose';
import {openVaultImage} from './export';
import {vaultDigest} from './encoding';
type Ports={verifyOuter(bytes:Uint8Array):Promise<boolean>;privateOptions?:VaultPrivateAdmissionOptions;public?:typeof inspectVaultDisclosure;private?:typeof admitVaultPrivateSourceForBank};
/** Read-only inspection. No signer enrollment, account grant or financial
 * execution capability exists here. Never return a private carrier or key. */
export async function inspectVaultOriginal(input:Uint8Array,ports:Ports){
 const bytes=new Uint8Array(input);if(!bytes.length||bytes.length>48*1024*1024)throw Error('VAULT_IMAGE_CAPACITY');
 const artifactSha256=await vaultDigest(bytes),png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const opened=png?await openVaultImage(bytes,ports.verifyOuter):{kind:'public' as const,value:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
 if(opened.kind==='public'){
  const checked=await(ports.public??inspectVaultDisclosure)(opened.value);
  return{kind:'public' as const,verified:true as const,artifactSha256,grantsAccess:false as const,currentUnspentness:false as const,record:checked};
 }
 const carrier=readVaultCarrier(opened.value);
 if(carrier.header.purpose!=='vault-private')throw Error('VAULT_PURPOSE_INVALID');
 if(carrier.schema==='bank.vault.encrypted.v1')return{kind:'protected-private' as const,verified:false as const,outerVerified:true as const,contentsVerified:false as const,passkeyRequired:true as const,artifactSha256,grantsAccess:false as const,currentUnspentness:false as const};
 const source=await readVaultPrivateSource(await openVaultCarrier(carrier));
 if(source.vaultId!==carrier.header.id||source.owner.keyId!==carrier.header.owner.keyId||source.owner.receizId!==carrier.header.owner.receizId)throw Error('VAULT_CUSTODY_MISMATCH');
 const record=await(ports.private??admitVaultPrivateSourceForBank)(source,ports.privateOptions);
 return{kind:'private' as const,verified:true as const,artifactSha256,grantsAccess:false as const,currentUnspentness:false as const,privateOriginalGrantsAccess:true as const,record};
}
