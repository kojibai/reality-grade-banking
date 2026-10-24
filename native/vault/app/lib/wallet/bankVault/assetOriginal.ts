import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import {parseExactByteBlockReference,type ExactByteBlockReference} from '../../../../packages/receiz-sdk/src/exactByteBlocks';
import {receizBase64UrlDecode,receizBase64UrlEncode} from '../../../../packages/receiz-sdk/src/identity';
import {parseImportedProofSourceReference,type ImportedProofSourceReference} from '../../profile/showcase/importedSourceReference';
import {custodyCanonical,custodyExact,custodyHex} from './custody';
import {sha256Hex} from '../../../utils/sha256';
import {nativeAssetSupplyMicro} from '../bankNotes/nativeAsset';
/** Explicit private export capacity beneath the current 32 MiB image carrier.
 * An operational denial never truncates a Source or asserts invalid proof. */
export const VAULT_ASSET_ORIGINAL_MAX_EXACT_BYTES=16*1024*1024;
export type VaultAssetAuthoredOriginal=Readonly<{reference:ImportedProofSourceReference;ownerReceizId:string;blocks:readonly Readonly<{reference:ExactByteBlockReference;exactBytesB64u:string}>[]}>;
export async function verifyVaultAssetAuthoredOriginal(input:unknown,options:Readonly<{roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;expectedReference?:ImportedProofSourceReference;expectedOwner?:string;definition?:Readonly<{name:string;symbol:string;description:string;supplyMicro:string}>}>){
 function fail():never{throw Error('VAULT_ASSET_ORIGINAL_INVALID');}
 if(!custodyExact(input,['reference','ownerReceizId','blocks'])||typeof input.ownerReceizId!=='string'||!Array.isArray(input.blocks))fail();const reference=parseImportedProofSourceReference(input.reference as ImportedProofSourceReference);
 if(reference.byteLength>VAULT_ASSET_ORIGINAL_MAX_EXACT_BYTES)throw Error('VAULT_ASSET_ORIGINAL_EXECUTION_CAPACITY');
 if(options.expectedReference&&custodyCanonical(reference)!==custodyCanonical(options.expectedReference)||options.expectedOwner&&input.ownerReceizId!==options.expectedOwner)fail();
 const blocks=new Map<string,{reference:ExactByteBlockReference;bytes:Uint8Array}>();let totalExactBytes=0;
 for(const row of input.blocks){if(!custodyExact(row,['reference','exactBytesB64u'])||typeof row.exactBytesB64u!=='string')fail();const ref=parseExactByteBlockReference(row.reference);if(blocks.has(ref.sha256))fail();totalExactBytes+=ref.byteLength;if(totalExactBytes>VAULT_ASSET_ORIGINAL_MAX_EXACT_BYTES)throw Error('VAULT_ASSET_ORIGINAL_EXECUTION_CAPACITY');const bytes=receizBase64UrlDecode(row.exactBytesB64u);if(bytes.length!==ref.byteLength||receizBase64UrlEncode(bytes)!==row.exactBytesB64u||await sha256Hex(bytes)!==ref.sha256)fail();blocks.set(ref.sha256,{reference:ref,bytes});}
 const used=new Set<string>(),resolve=async(ref:ExactByteBlockReference)=>{const row=blocks.get(ref.sha256);if(!row||custodyCanonical(row.reference)!==custodyCanonical(ref))throw Error('VAULT_ASSET_ORIGINAL_COMPLETE_SOURCE_REQUIRED');used.add(ref.sha256);return row.bytes.slice();};
 // Existing canonical Original opening includes privacy inspection, every
 // composer media/resource block and recursively carried source closure.
 const {reopenImportedProofSource}=await import('../../profile/showcase/importedSource'),opened=await reopenImportedProofSource(reference,resolve,{resolveSourceBlock:resolve,canonicalSignatureV4RootPublicKeys:options.roots});
 if(opened.projection.ownerReceizId!==input.ownerReceizId||!opened.projection.bankAsset?.composer||used.size!==blocks.size||!custodyHex(opened.descriptor.artifactSha256)||opened.descriptor.artifactSha256!==reference.artifactSha256)fail();
 const d=options.definition,c=opened.projection.bankAsset.composer;if(d&&(c.title!==d.name||c.description!==d.description||c.definition&&(c.definition.symbol!==d.symbol||nativeAssetSupplyMicro(c.definition.units)!==d.supplyMicro)))fail();
 return {source:structuredClone(input) as unknown as VaultAssetAuthoredOriginal,opened,totalExactBytes};
}

export type VaultAssetOriginalPreflight=Readonly<{schema:'receiz.bank.vault-asset-original-preflight.v1';assetId:string;sourceHead:string;authoredOriginal:VaultAssetAuthoredOriginal|null;totalExactBytes:number;maxExactBytes:number;serializedClosureBytes:number;currentLineageBytes:number;currentLineageSteps:number;reservedSourceBytes:number}>;
