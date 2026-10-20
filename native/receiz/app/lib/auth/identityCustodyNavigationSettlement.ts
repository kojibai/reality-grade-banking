let pendingIdentityCustodyFinalization: Promise<void> | null = null;

export function beginIdentityCustodyFinalization(args: Readonly<{
  finalizeCustody: () => Promise<void>;
  onFailure: (error: unknown) => void;
}>): Promise<void> {
  const finalization = args.finalizeCustody().catch((error) => {
    args.onFailure(error);
  });
  pendingIdentityCustodyFinalization = finalization;
  void finalization.finally(() => {
    if (pendingIdentityCustodyFinalization === finalization) {
      pendingIdentityCustodyFinalization = null;
    }
  });
  return finalization;
}

export async function awaitPendingIdentityCustodyFinalization(): Promise<void> {
  const pending = pendingIdentityCustodyFinalization;
  if (pending) await pending;
}
