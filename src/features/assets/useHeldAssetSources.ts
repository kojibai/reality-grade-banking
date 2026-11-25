import { useEffect, useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { HeldDeposit } from '../../receiz/deposit-source';

function heldFrame(identity: OpenIdentity) {
  const known = identity.knownDeposits?.();
  return { identity, sources: known ?? [] as readonly HeldDeposit[], error: '', busy: known == null };
}

export function useHeldAssetSources(identity: OpenIdentity, active = true, revision = 0): Omit<ReturnType<typeof heldFrame>, 'identity'> {
  const [view, setView] = useState(() => heldFrame(identity));
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const read = () => {
      void identity.listDeposits().then(sources => {
        if (alive) setView({ identity, sources, error: '', busy: false });
      }).catch(() => {
        if (alive) setView(previous => ({
          identity,
          sources: previous.identity === identity ? previous.sources : identity.knownDeposits?.() ?? [],
          error: 'Your held proof sources could not be opened.',
          busy: false,
        }));
      });
    };
    read();
    addEventListener('bankeiz:asset-sources', read);
    return () => {
      alive = false;
      removeEventListener('bankeiz:asset-sources', read);
    };
  }, [identity, active, revision]);

  return view.identity === identity ? view : heldFrame(identity);
}
