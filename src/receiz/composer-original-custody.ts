import type {ExactByteBlockWriter,ExactByteBlockResolver} from '../../native/receiz/packages/receiz-sdk/src/exactByteBlocks';

/** Explicit authoring/export only; reuse the ID's encrypted immutable byte
 * custody. These ports never write private Originals to public Source storage. */
export function composerOriginalCustody(binding:{artifactSha256:string},assertCurrent:()=>void):{writeProtectedBlock:ExactByteBlockWriter;resolveProtectedBlock:ExactByteBlockResolver}{
 return {
  async writeProtectedBlock(reference,bytes){
   assertCurrent();if(bytes.byteLength!==reference.byteLength)throw Error('COMPOSER_PRIVATE_ORIGINAL_BYTES_INVALID');
   const {saveComposerOriginalBlob}=await import('./identity-vault');assertCurrent();
   const digest=await saveComposerOriginalBlob(binding,bytes);assertCurrent();
   if(digest!==reference.sha256)throw Error('COMPOSER_PRIVATE_ORIGINAL_BYTES_INVALID');
  },
  async resolveProtectedBlock(reference){
   assertCurrent();const {loadComposerOriginalBlob}=await import('./identity-vault');assertCurrent();
   const bytes=await loadComposerOriginalBlob(binding,reference.sha256);assertCurrent();
   if(bytes.byteLength!==reference.byteLength)throw Error('COMPOSER_PRIVATE_ORIGINAL_BYTES_INVALID');return bytes;
  },
 };
}
