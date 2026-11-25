export type NoteHandoffHead = Readonly<{requestRef: string; successorRef: string}>;
export interface NoteHandoffWitness {
  read(predecessor: string): NoteHandoffHead | undefined;
  record(predecessor: string, head: NoteHandoffHead): void;
}

const digest = /^[a-f0-9]{64}$/u;
export const needsHandoffProof = (cause: unknown) =>
  cause instanceof Error && cause.message === 'BANK_NOTE_HANDOFF_PROOF_REQUIRED';

/** A rollback hint, scoped to one identity and one exact predecessor. Only the
 * existing signed Note reader can authorize recovery of a newer handoff. */
export function createNoteHandoffWitness(keyId: string, getStorage: () => Pick<Storage, 'getItem' | 'setItem'> | undefined): NoteHandoffWitness {
  const key = (predecessor: string) => `bankeiz:note-handoff:v1:${keyId}:${predecessor}`;
  function read(predecessor: string) {
    const raw = getStorage()?.getItem(key(predecessor));
    if (raw == null) return undefined;
    const [requestRef, successorRef, extra] = raw.split(':');
    if (extra !== undefined || !requestRef || !successorRef || !digest.test(requestRef) || !digest.test(successorRef))
      throw Error('BANK_NOTE_HANDOFF_PROOF_REQUIRED');
    return {requestRef, successorRef};
  }
  return {
    read,
    record(predecessor, head) {
      const previous = read(predecessor);
      if (previous) {
        if (previous.requestRef !== head.requestRef || previous.successorRef !== head.successorRef)
          throw Error('BANK_NOTE_EXACT_TRANSFER_REQUIRED');
        return;
      }
      getStorage()?.setItem(key(predecessor), `${head.requestRef}:${head.successorRef}`);
    },
  };
}

export async function openWitnessedNote(
  head: NoteHandoffHead,
  restore: (ref: string) => Promise<Uint8Array>,
  proof?: Uint8Array,
) {
  if (proof) return proof.slice();
  try {
    return await restore(head.successorRef);
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'BANK_NOTE_EXACT_SOURCE_UNAVAILABLE')
      throw Error('BANK_NOTE_HANDOFF_PROOF_REQUIRED');
    throw cause;
  }
}
