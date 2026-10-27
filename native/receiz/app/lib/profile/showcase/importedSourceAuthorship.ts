import {verifyReceizArtifact} from '../../../../packages/receiz-sdk/src/artifactVerification';
import {verifiedArtifactContext} from '../../../../packages/receiz-sdk/src/pbiProofObjectVerification';
import {normalizeLocalPbiAuthorshipProof,verifyLocalPbiAuthorshipProof,type LocalPbiAuthorshipInput,type LocalPbiAuthorshipProofV1} from '../../../../packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../../../../packages/receiz-sdk/src/pbiLocalVerifier';
import {jcsCanonicalize} from '@/app/utils/jcs';
import type {OpenedImportedProofSource,ImportedProofSourceReference} from './importedSource';
import {projectImportedSourceOriginal} from './importedSourceProjection';

/** The existing PBI proof signs the exact admitted source, never its display
 * projection. The existing sealed Showcase child carries this verified addition;
 * the Original's bytes, ownership, chronology and payload remain unchanged. */
export async function importedSourceAuthorshipInput(source:OpenedImportedProofSource,receizId:string,kaiUpulse:string):Promise<LocalPbiAuthorshipInput>{
 const context=verifiedArtifactContext(await verifyReceizArtifact(source.exactArtifact));
 if(!context||context.artifactSha256!==source.descriptor.artifactSha256||!/^[a-f0-9]{64}$/.test(receizId)||!/^\d+$/.test(kaiUpulse))throw new TypeError('IMPORTED_SOURCE_PBI_SOURCE_REQUIRED');
 return{slug:context.slug,code:context.code,pulse:context.pulse,claimHashHex:context.claimHashHex,proofObjectScope:{predecessorArtifactSha256:context.artifactSha256,predecessorProofHead:context.baseProofHead,receizId,authorshipPosition:0,kaiUpulse}};
}
export async function projectPbiSignedImportedSourceOriginal(source:OpenedImportedProofSource,reference:ImportedProofSourceReference,value:unknown){
 const proof=normalizeLocalPbiAuthorshipProof(value),scope=proof?.input.proofObjectScope;
 if(!proof||!scope)throw new TypeError('IMPORTED_SOURCE_PBI_PROOF_REQUIRED');
 const expected=await importedSourceAuthorshipInput(source,scope.receizId,scope.kaiUpulse);
 if(jcsCanonicalize(proof.input)!==jcsCanonicalize(expected)||!await verifyLocalPbiAuthorshipProof(proof,args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://receiz.com','https://www.receiz.com','https://bankeiz.com','https://www.bankeiz.com','https://bank.receiz.com'],requireUP:true,requireUV:true}})))throw new TypeError('IMPORTED_SOURCE_PBI_PROOF_INVALID');
 return Object.freeze({...projectImportedSourceOriginal(source,reference),hasPbiSignature:true,pbiReceiptHash:proof.pbiReceiptHash,pbiAuthorshipProof:proof});
}
export type ImportedSourceAuthorshipProof=LocalPbiAuthorshipProofV1;
