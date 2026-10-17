import type { ReceizKeyFile } from '@receiz/sdk';
import {readNoteAccountObservation} from './note-account-observation';
import type {WalletObservation} from './wallet-observation';
import {appendWalletPoint} from './wallet-series';

/** Display retention for an account head already admitted by the native note
 * runtime. This projection never grants funding or replaces its complete source. */
export async function readLocalAccountCheckpoint(proof:ReceizKeyFile,identity:ReceizKeyFile,uid:string,previous:WalletObservation|null,completedAt?:string):Promise<WalletObservation>{
 const observation=await readNoteAccountObservation(proof,identity,uid),digest=proof.portableState!.proof!.digestSha256Hex;
 if(previous?.source==='local-note-head'&&previous.localHeadDigest===digest&&previous.wallet.userId===uid)return previous;
 const captured=completedAt??observation.observedAt;
 // The signed successor defines sequence. A clock rollback must not erase
 // earlier chart observations; this timestamp orders display points only.
 const last=previous?.history?.at(-1)?.at;
 const observedAt=last&&Date.parse(captured)<=Date.parse(last)?new Date(Date.parse(last)+1).toISOString():captured;
 if(!Number.isFinite(Date.parse(observedAt)))throw Error('BANK_NOTE_ACCOUNT_SUCCESSOR_INVALID');
 return {...observation,observedAt,source:'local-note-head',localHeadDigest:digest,history:appendWalletPoint(previous?.history??[],observation.wallet,observedAt,observation.wallet.kaiUpulse)};
}
