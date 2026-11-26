import {useEffect, useState} from 'react';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {OriginalPieceSummary} from '../../receiz/original-pieces';

const noPieces: readonly OriginalPieceSummary[] = [];

export function useHeldOriginalPieces(identity: OpenIdentity, active = true, includeTransferred = false) {
  const [held, setHeld] = useState<{identity: OpenIdentity; pieces: readonly OriginalPieceSummary[]} | null>(null);
  useEffect(() => {
    if (!active || !identity.originalPieces) return;
    let current = true, revision = 0;
    const read = () => {
      const selected = ++revision;
      void identity.originalPieces?.().then(api => api.list({includeTransferred})).then(pieces => {
        if (current && selected === revision) setHeld({identity, pieces});
      }).catch(() => {});
    };
    read();
    addEventListener('bankeiz:original-pieces', read);
    return () => {
      current = false;
      removeEventListener('bankeiz:original-pieces', read);
    };
  }, [active, identity, includeTransferred]);
  return held?.identity === identity ? held.pieces : noPieces;
}
