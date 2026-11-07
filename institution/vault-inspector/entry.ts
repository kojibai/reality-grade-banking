import {inspectVaultOriginal,openVaultOriginalSources,recoverVaultOriginalSources} from '../../src/receiz/vault/inspect';
import {projectVaultDisclosure} from '../../src/receiz/vault/disclose';
import {readArtifact} from '../proof-verifier/verifier.entry';
import {receizCurrentPinnedSignatureV4Roots} from '../../native/receiz/packages/receiz-sdk/src/verifier/roots';
import * as native from '../../public/native/vault.v1.mjs';
import * as notes from '../../public/native/offline-notes.v129.mjs';
import * as receiver from '../../public/native/receiver-verifier.v129.mjs';
import {openConnectedNoteDelivery} from '../../src/receiz/note-delivery';
import type {ConnectedNoteModule} from '../../src/receiz/connected-note-application';
// The unchanged canonical browser verifier uses this runtime slot. Bind the
// included implementation so a standalone file never requests /snarkjs.min.js.
// @ts-expect-error bundled dependency has no application declaration
import {groth16} from 'snarkjs';
if(typeof window!=='undefined')Object.assign(window,{snarkjs:{groth16}});
/** This entry binds its own included, pinned verifiers. Callers cannot replace
 * issuer roots, declare a successful admission or obtain an execution port. */
const ports={
  verifyOuter:async(original:Uint8Array)=>{await readArtifact(original,'vault.png');return true;},
  public:async(value:unknown,expected?:string)=>{const checked=await native.verifyVaultPublicRecord(value,{roots:receizCurrentPinnedSignatureV4Roots()});if(expected!==undefined&&checked.recordSha256!==expected)throw Error('VAULT_PUBLIC_LOCATOR_MISMATCH');return projectVaultDisclosure(checked as never);},
  privateOptions:{native:async()=>native as never,notes:async()=>notes as never},
  notes:{async inspectNote(bytes:Uint8Array){
   if(await notes.isBankConnectedNoteImage(bytes)||await notes.isBankConnectedNoteSource(bytes)){
    const delivery=await openConnectedNoteDelivery({native:notes as ConnectedNoteModule,bytes});
    if(delivery.source.kind==='funding'&&!delivery.noteIdentity)throw Error('VAULT_NOTE_AUTHORITY_REQUIRED');
    const source=delivery.source;return{noteId:source.noteId,rail:source.rail,amountUsdCents:source.amountUsdCents,amountPhiMicro:source.amountPhiMicro,...(source.fundingParts?{fundingParts:source.fundingParts}:{})};
   }
   return receiver.inspectReserveNote(await receiver.openReserveNoteImage(bytes));
  }},
};
export const inspect=(bytes:Uint8Array)=>inspectVaultOriginal(bytes,ports);
export const open=(bytes:Uint8Array)=>openVaultOriginalSources(bytes,ports);
/** Private source bytes are returned only by this explicit local recovery
 * control, never by inspection or diagnostic output. */
export const recover=(bytes:Uint8Array)=>recoverVaultOriginalSources(bytes,ports);
/** Parser exceptions may contain input fragments. Only fixed diagnostic codes
 * cross the CLI/HTML output boundary. */
export function failureCode(error:unknown){
 const code=error instanceof Error?error.message:'';
 return ['VAULT_IMAGE_CAPACITY','VAULT_IMAGE_SEAL_INVALID','VAULT_IMAGE_FORMAT_INVALID','VAULT_PURPOSE_INVALID','VAULT_SOURCE_CHANGED','VAULT_SOURCE_REQUIRED','VAULT_SOURCE_DUPLICATE','VAULT_FORMAT_INVALID','VAULT_CUSTODY_MISMATCH','VAULT_CUSTODY_REQUIRED','VAULT_PUBLIC_RECORD_INVALID','VAULT_PUBLIC_COORDINATE_MISMATCH','VAULT_PUBLIC_HOLDER_INVALID','VAULT_NOTE_READER_REQUIRED','VAULT_NOTE_AUTHORITY_REQUIRED','VAULT_NOTE_SOURCE_CHANGED','VAULT_NOTE_SOURCE_DUPLICATE','VAULT_NOTE_NOTE_DUPLICATE','VAULT_NOTE_FORMAT_INVALID','VAULT_OWNER_MISMATCH','VAULT_PRESENCE_REQUIRED','VAULT_NOTE_RECOVERY_REQUIRED','ORIGINAL_CANONICAL_VERIFICATION_FAILED','LOCAL_FILE_CHANGED','NETWORK_DISABLED'].includes(code)?code:'VAULT_INSPECTION_FAILED';
}
