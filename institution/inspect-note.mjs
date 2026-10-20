import { readFile, stat } from 'node:fs/promises';
import { openReserveNoteImage, inspectReserveNote, isBankNoteAccountDeposit, inspectAccountNoteDeposit,isBankConnectedNoteImage,isBankConnectedNoteSource,inspectConnectedNote,inspectConnectedNoteReceipt } from '../public/native/receiver-verifier.v129.mjs';
const path = process.argv[2];
if (!path) { console.error('Usage: npm run receiver:inspect -- /path/to/original-note.png'); process.exitCode = 2; }
else try {
  if ((await stat(path)).size > 32 * 1024 * 1024) throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
  const bytes=new Uint8Array(await readFile(path));
  let inspection;
  if(await isBankConnectedNoteImage(bytes)||await isBankConnectedNoteSource(bytes))inspection=await inspectConnectedNote(bytes);
  else if(isBankNoteAccountDeposit(bytes))inspection=await inspectAccountNoteDeposit(bytes);
  else{try{inspection=inspectReserveNote(await openReserveNoteImage(bytes));}catch{inspection=await inspectConnectedNoteReceipt(bytes);}}
  console.log(JSON.stringify(inspection, null, 2));
} catch (error) { console.error(JSON.stringify({ verified: false, creditAuthorized: false, error: error instanceof Error ? error.message : 'NOTE_INSPECTION_FAILED' })); process.exitCode = 1; }
