type WalletDebit = Readonly<{ sequence: string; proofRef: string }>;

export interface WalletDebitWitness {
  read(allocationId: string): WalletDebit | undefined;
  record(allocationId: string, debit: WalletDebit): void;
}

const sequence = /^[1-9]\d{0,18}$/u;
const digest = /^[a-f0-9]{64}$/u;

/** Retain a recovery pointer outside the encrypted Wallet journal, as for Note
 * handoffs. The complete Wallet proof remains in private Original storage. */
export function createWalletDebitWitness(
  keyId: string,
  getStorage: () => Pick<Storage, 'getItem' | 'setItem'> | undefined,
): WalletDebitWitness {
  const key = (allocationId: string) => `bankeiz:wallet-debit:v1:${keyId}:${allocationId}`;
  function read(allocationId: string) {
    const raw = getStorage()?.getItem(key(allocationId));
    if (!raw) return undefined;
    const [index, proofRef, extra] = raw.split(':');
    if (extra !== undefined || !index || !proofRef || !sequence.test(index) || !digest.test(proofRef)) return undefined;
    return { sequence: index, proofRef };
  }
  return {
    read,
    record(allocationId, debit) {
      const previous = read(allocationId);
      if (previous && BigInt(previous.sequence) >= BigInt(debit.sequence)) return;
      getStorage()?.setItem(key(allocationId), `${debit.sequence}:${debit.proofRef}`);
    },
  };
}
