import {useEffect, useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {OriginalPieceSummary} from '../../receiz/original-pieces';

export function useHeldOriginalPieces(identity: OpenIdentity, active = true) {
  const [held, setHeld] = useState<{identity: OpenIdentity; pieces: readonly OriginalPieceSummary[]} | null>(null);
  useEffect(() => {
    if (!active || !identity.originalPieces) return;
    let current = true;
    const read = () => {
      void identity.originalPieces?.().then(api => api.list()).then(pieces => {
        if (current) setHeld({identity, pieces});
      }).catch(() => {});
    };
    read();
    addEventListener('bankeiz:original-pieces', read);
    return () => {
      current = false;
      removeEventListener('bankeiz:original-pieces', read);
    };
  }, [active, identity]);
  return held?.identity === identity ? held.pieces : [];
}
