import { openCanonicalProofFile } from './proof-capture';
import type { RecordProofExportInput } from './record-proof-export';

/** Seal the verified collection while preserving each original file intact. */
export async function proofBackupFile(
  backup: { bytes: Uint8Array },
  ownerReceizId: string,
  seal: (input: RecordProofExportInput) => Promise<File>,
  assertOpen: () => void = () => {},
) {
  assertOpen();
  const bytes = new Uint8Array(backup.bytes);
  const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (payload?.schema !== 'bankeiz.proof-backup.v1' || payload.ownerReceizId !== ownerReceizId || !Array.isArray(payload.sources) || !payload.sources.length) {
    throw Error('PROOF_BACKUP_SOURCE_REQUIRED');
  }
  const filename = `Bankeiz-Private-Proof-Backup-${ownerReceizId.replace(/\.receiz\.id$/, '')}.json`;
  const file = await seal({ bytes, filename, mimeType: 'application/json' });
  assertOpen();
  const opened = await openCanonicalProofFile(file);
  assertOpen();
  const carried = opened.verifiedPayload.bytes;
  if (opened.sealedArtifact.continuity.ownerReceizId !== ownerReceizId || carried.length !== bytes.length || carried.some((value, index) => value !== bytes[index])) {
    throw Error('PROOF_BACKUP_SOURCE_MISMATCH');
  }
  const exact = new Uint8Array(await file.arrayBuffer());
  assertOpen();
  return { bytes: exact, filename: file.name };
}
