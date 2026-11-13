import {appendCarriedFileAuthorship,readCarriedFileAuthorship,verifyCarriedFileAuthorship} from '../../../../packages/receiz-sdk/src/verifier/carriedFileAuthorship';
import {requireOpenedImportedProofSource,type OpenedImportedProofSource} from './importedSource';
import {normalizeLocalPbiAuthorshipProof} from '../../../../packages/receiz-sdk/src/pbiLocalAuthorship';

/** One native download carrying the unchanged Original Source and its existing
 * PBI proof. This composes retained bytes only; it never signs or seals. */
export async function composerAuthoredFile(input:Readonly<{
 source:OpenedImportedProofSource;original:File;proof:unknown;assertCurrent():void;
}>):Promise<File>{
 input.assertCurrent();requireOpenedImportedProofSource(input.source);
 const proof=normalizeLocalPbiAuthorshipProof(input.proof);if(!proof)throw TypeError('FILE_AUTHORSHIP_PROOF_INVALID');
 // A placement can retain the already-open authored Source. Select its exact
 // signed basis; neither the placement nor its display projection retargets PBI.
 let selected=input.source;const visited=new Set<OpenedImportedProofSource>();
 while(selected.verification.bundle?.artifactSha256Basis!==proof.input.claimHashHex){
  if(visited.has(selected)||selected.referencedSources?.length!==1)throw TypeError('FILE_AUTHORSHIP_PROOF_MISMATCH');visited.add(selected);selected=selected.referencedSources[0]!;requireOpenedImportedProofSource(selected);
 }
 const [original,source,payloadBytes]=await Promise.all([input.original.arrayBuffer(),selected.exactArtifact.arrayBuffer(),selected.sourcePayload.arrayBuffer()]);input.assertCurrent();
 const bytes=appendCarriedFileAuthorship({original:new Uint8Array(original),source:new Uint8Array(source),
  sourceFilename:selected.descriptor.filename,sourceMimeType:selected.descriptor.mimeType,proof:input.proof});
 const carried=readCarriedFileAuthorship(bytes)!;
 // Reuse the actual admitted Source. The independent offline reader reopens
 // both its canonical seal and PBI from the resulting file without this cache.
 await verifyCarriedFileAuthorship({carried,readSource:async()=>({ok:true,verification:selected.verification as never,
  artifactBytes:new Uint8Array(source),payloadBytes:new Uint8Array(payloadBytes),payloadFilename:selected.descriptor.filename,
  payloadMimeType:selected.sourcePayload.type,legacyCompatibility:'verified-legacy-read'})});input.assertCurrent();
 return new File([bytes.slice().buffer as ArrayBuffer],input.original.name,{type:input.original.type});
}
