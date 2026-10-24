import type {ReceizIdentityLoginProof} from '@receiz/sdk';
import manifest from '../../../public/native/vault.v1.manifest.json';
import type {VaultMoneyAction,VaultMoneyCapacity} from './money';
export type VaultNativeKey={keyId:string;alg:'Ed25519'|'P-256';publicKeyRawB64u:string};
export type VaultNativeCustodyRequest={schema:'receiz.bank.vault-custody-create.v1';applicationId:string;vaultId:string;ownerUserId:string;ownerReceizId:string;parentSourceSha256:string;parent:VaultNativeKey;custody:VaultNativeKey&{accountId:string;localUid:string};createdAt:string};
export type VaultNativeCustodySubmission={request:VaultNativeCustodyRequest;parentProof:ReceizIdentityLoginProof;childProof:ReceizIdentityLoginProof};
export type VaultNativeCustodyAdmission={owner:{userId:string;receizId:string;keyId:string};custody:VaultNativeKey&{accountId:string;localUid:string};vaultId:string;applicationId:string;parentHead:string;custodyHead:string;receivingAddress:string};
export type VaultNativeExchangeRequest={schema:'receiz.bank.vault-custody-exchange.v1';applicationId:string;vaultId:string;ownerUserId:string;accountId:string;keyId:string;nonce:string;issuedAtMs:number};
type Roots=ReadonlyMap<string,unknown>;
export type VaultNativeCustodyWitness=Record<string,unknown>&{vaultId:string;applicationId:string;ownerUserId:string;ownerReceizId:string;accountId:string;keyId:string;alg:'Ed25519'|'P-256';publicKeyRawB64u:string;issuedAtKaiUPulse:string};
export type VaultNativeAssetTitle=Record<string,unknown>&{vaultId:string;applicationId:string;ownerReceizId:string;accountId:string;keyId:string;issuedAtKaiUPulse:string;asset:Record<string,unknown>&{id:string;quantityMicro:string;headSourceSha256:string;headKaiUPulse:string;definition:{name:string;symbol:string;description:string;supplyMicro:string;linkedProofDigest:string|null}}};
/** Bank's narrow interface to the pinned, reproducible portable closure. No
 * server route, parent identity store or foreign checkout is a runtime import. */
export interface VaultNativeRuntime{
 vaultMoneySourceReservation(input:{kind:VaultMoneyAction;request:Uint8Array;originals:readonly Uint8Array[];currentNativeHead:string|null}):Promise<VaultMoneyCapacity>;
 VAULT_CHILD_SCOPES:readonly string[];
 vaultAssetSourceReservation(input:unknown):{currentLineageBytes:number;currentLineageSteps:number;reservedSourceBytes:number};
 deriveVaultCustodyAccountId(ownerUserId:string,vaultId:string):Promise<string>;
 vaultCustodyChallenge(request:VaultNativeCustodyRequest):string;
 inspectVaultCustodySubmission(input:unknown):Promise<VaultNativeCustodySubmission>;
 verifyVaultCustodySource(input:unknown,roots?:Roots):Promise<VaultNativeCustodyAdmission>;
 vaultCustodyExchangeChallenge(request:VaultNativeExchangeRequest):string;
 verifyVaultCustodyWitness(input:unknown,options:{roots:Roots}):Promise<{source:unknown;witness:VaultNativeCustodyWitness}>;
 verifyVaultAssetSource(input:unknown,options:{roots:Roots}):Promise<{source:unknown;title:VaultNativeAssetTitle}>;
 verifyVaultAssetSuccessor(input:{previous:unknown;next:unknown},options:{roots:Roots}):Promise<{source:unknown;title:VaultNativeAssetTitle}>;
 verifyVaultAssetPublicWitness(input:unknown,options:{roots:Roots}):Promise<{source:unknown;witness:VaultNativeAssetTitle}>;
 verifyVaultAssetAuthoredOriginal(input:unknown,options:{roots:Roots}):Promise<{source:unknown;opened:unknown;totalExactBytes:number}>;
 verifyVaultPublicRecord(input:unknown,options:{roots:Roots}):Promise<{record:Record<string,unknown>;recordSha256:string;custody:VaultNativeCustodyWitness;witnesses:unknown[];grantsAccess:false;currentUnspentness:false}>;
}
let loading:Promise<VaultNativeRuntime>|null=null;
/** Nothing is loaded until an explicit Vault action invokes this function. */
export function loadVaultNative():Promise<VaultNativeRuntime>{
 if(!loading)loading=(async()=>{const url=`/native/vault.v1.mjs?build=${manifest.moduleSha256}`,module=await import(/* @vite-ignore */ url);for(const name of ['vaultMoneySourceReservation','vaultAssetSourceReservation','verifyVaultAssetAuthoredOriginal','deriveVaultCustodyAccountId','vaultCustodyChallenge','inspectVaultCustodySubmission','verifyVaultCustodySource','vaultCustodyExchangeChallenge','verifyVaultCustodyWitness','verifyVaultAssetSource','verifyVaultAssetSuccessor','verifyVaultAssetPublicWitness','verifyVaultPublicRecord'])if(typeof module[name]!=='function')throw Error('VAULT_NATIVE_RUNTIME_UNAVAILABLE');return module as VaultNativeRuntime;})().catch(error=>{loading=null;throw error;});return loading;
}
