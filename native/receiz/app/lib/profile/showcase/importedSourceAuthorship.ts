import {normalizeLocalPbiAuthorshipProof,verifyLocalPbiAuthorshipProof,type LocalPbiAuthorshipInput,type LocalPbiAuthorshipProofV1} from '../../../../packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../../../../packages/receiz-sdk/src/pbiLocalVerifier';
import {jcsCanonicalize} from '@/app/utils/jcs';
import {requireOpenedImportedProofSource,type OpenedImportedProofSource,type ImportedProofSourceReference} from './importedSource';
import {projectImportedSourceOriginal} from './importedSourceProjection';

/** The existing PBI proof signs the exact admitted source, never its display
 * projection. The existing sealed Showcase child carries this verified addition;
 * the Original's bytes, ownership, chronology and payload remain unchanged. */
export async function importedSourceAuthorshipInput(source:OpenedImportedProofSource,_receizId:string,_kaiUpulse:string):Promise<LocalPbiAuthorshipInput>{
 requireOpenedImportedProofSource(source);
 const bundle=source.verification.bundle;
 if(!bundle||!/^[a-f0-9]{64}$/.test(source.descriptor.artifactSha256)||!/^\d{8}_\d{4}$/.test(bundle.slug)||! /^[A-Z0-9]{8}$/.test(bundle.code)||!bundle.kaiPulseEternal||! /^[a-f0-9]{64}$/.test(bundle.artifactSha256Basis??''))throw new TypeError('IMPORTED_SOURCE_PBI_SOURCE_REQUIRED');
 // This is the same four-field PBI action used by Showcase. The existing
 // opened Source and enclosing placement bind custody; an account handle is
 // not a v115 cryptographic identity and never becomes an extra ceremony gate.
 return{slug:bundle.slug,code:bundle.code,pulse:bundle.kaiPulseEternal,claimHashHex:bundle.artifactSha256Basis!};
}
const verifiedSignatures=new WeakMap<OpenedImportedProofSource,Map<string,ReturnType<typeof projectImportedSourceOriginal>>>();
export async function projectPbiSignedImportedSourceOriginal(source:OpenedImportedProofSource,reference:ImportedProofSourceReference,value:unknown){
 const proof=normalizeLocalPbiAuthorshipProof(value),scope=proof?.input.proofObjectScope;
 if(!proof)throw new TypeError('IMPORTED_SOURCE_PBI_PROOF_REQUIRED');
 const base=projectImportedSourceOriginal(source,reference),key=jcsCanonicalize(proof),known=verifiedSignatures.get(source)?.get(key);if(known)return known;
 const expected=await importedSourceAuthorshipInput(source,'','');
 if(scope){const continuity=source.verification.assetContinuity,head=continuity?.state==='verified'&&/^[a-f0-9]{64}$/.test(continuity.headReference??'')?continuity.headReference:source.verification.bundle?.groth16ProofDigest;
  if(!head)throw new TypeError('IMPORTED_SOURCE_PBI_SOURCE_REQUIRED');
  expected.proofObjectScope={predecessorArtifactSha256:source.descriptor.artifactSha256,predecessorProofHead:head,receizId:scope.receizId,authorshipPosition:0,kaiUpulse:scope.kaiUpulse};}
 if(jcsCanonicalize(proof.input)!==jcsCanonicalize(expected)||!await verifyLocalPbiAuthorshipProof(proof,args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://receiz.com','https://www.receiz.com','https://bankeiz.com','https://www.bankeiz.com','https://bank.receiz.com'],requireUP:true,requireUV:true}})))throw new TypeError('IMPORTED_SOURCE_PBI_PROOF_INVALID');
 const original=Object.freeze({...base,hasPbiSignature:true,pbiReceiptHash:proof.pbiReceiptHash,pbiAuthorshipProof:proof});
 let held=verifiedSignatures.get(source);if(!held){held=new Map();verifiedSignatures.set(source,held);}held.set(key,original);return original;
}
export type ImportedSourceAuthorshipProof=LocalPbiAuthorshipProofV1;
