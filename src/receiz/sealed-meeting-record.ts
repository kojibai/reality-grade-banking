import type {createReceizOfflineSealer} from '@receiz/sdk/offline';
/** seal() returns its exact output only after canonical offline verification.
 * Reuse that admitted result: a second generic whole-file admission has a
 * different memory bound and must not reclassify a verified recording. */
export async function sealMeetingRecord(sealer:Pick<ReturnType<typeof createReceizOfflineSealer>,'seal'>,bytes:Uint8Array,filename:string):Promise<File>{
 const sealed=await sealer.seal({bytes,filename,mimeType:'application/zip'});
 if(!sealed.verification.ok)throw Error('MEETING_RECORD_PROOF_INVALID');
 return new File([new Uint8Array(sealed.artifactBytes)],sealed.filename,{type:sealed.mimeType});
}
