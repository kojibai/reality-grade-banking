import { readFile, stat } from 'node:fs/promises';
import { openReserveNoteImage, inspectReserveNote, isBankNoteAccountDeposit, inspectAccountNoteDeposit } from '../public/native/receiver-verifier.v129.mjs';
const path = process.argv[2];
if (!path) { console.error('Usage: npm run receiver:inspect -- /path/to/original-note.png'); process.exitCode = 2; }
else try {
  if ((await stat(path)).size > 32 * 1024 * 1024) throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
  const bytes=new Uint8Array(await readFile(path));
  const inspection=isBankNoteAccountDeposit(bytes)?await inspectAccountNoteDeposit(bytes):inspectReserveNote(await openReserveNoteImage(bytes));
  console.log(JSON.stringify(inspection, null, 2));
} catch (error) { console.error(JSON.stringify({ verified: false, creditAuthorized: false, error: error instanceof Error ? error.message : 'NOTE_INSPECTION_FAILED' })); process.exitCode = 1; }
