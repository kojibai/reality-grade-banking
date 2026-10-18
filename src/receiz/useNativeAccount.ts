import { useCallback, useEffect, useRef, useState } from 'react';
import { createNativeIdentity, importNativeIdentity, restoreNativeIdentity, restoreKnownWalletObservation, forgetDeviceIdentity, type OpenIdentity } from './native-identity';
import type { SharedWallet } from './shared-wallet';
function walletReadMessage(cause: unknown, refreshing = false): string {
  if (cause instanceof Error && cause.message === 'proof_replay_guard_unavailable') return 'Secure account access is temporarily unavailable. Your Identity Seal is unchanged. Refresh your balance to try again.';
  return refreshing ? 'Receiz could not update this account. Your Identity Seal stays on this device. Try again when the source is available.' : 'Your balance could not be opened. Your Identity Seal stays on this device. Refresh your balance to try again.';
}
export function useNativeAccount() {
  const [identity, setIdentity] = useState<OpenIdentity | null>(null), [wallet, setWallet] = useState<SharedWallet | null>(null);
  const [opening, setOpening] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [observedAt, setObservedAt] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const held = useRef<OpenIdentity | null>(null), generation = useRef(0), pending = useRef(false), openingOperation = useRef(false), hasObservation = useRef(false);
  const refresh = useCallback(async () => {
    const current = held.current, ticket = generation.current;
    if (!current) return;
    // A native action may have retained a newer account successor while an
    // earlier remote read is still pending. Paint that result immediately.
    const known = current.knownWallet?.();
    if (known) { setWallet(known.wallet); setObservedAt(known.observedAt); }
    if (pending.current) return; pending.current = true; setBusy(true);
    try { const value = await current.readWallet(); if (ticket === generation.current) { hasObservation.current = true; setWallet(value); setObservedAt(current.knownWallet?.()?.observedAt ?? new Date().toISOString()); setError(null); setSyncPending(false); } }
    catch (cause) { if (ticket === generation.current) { setSyncPending(true); if (current.knownWallet?.()?.source !== 'account-genesis') setError(walletReadMessage(cause, hasObservation.current)); } }
    finally { if (ticket === generation.current) { pending.current = false; setBusy(false); } }
  }, []);
  const accept = useCallback((next: OpenIdentity) => {
    held.current?.dispose(); held.current = next; generation.current++; pending.current = false;
    const known = next.knownWallet?.();
    hasObservation.current = Boolean(known); setWallet(known?.wallet ?? null); setObservedAt(known?.observedAt ?? null);
    setError(null); setSyncPending(false); setIdentity(next); setOpening(false); setBusy(false);
    void refresh();
  }, [refresh]);
  useEffect(() => {
    let alive = true;
    const ticket = generation.current;
    void restoreKnownWalletObservation().then(known => { if (alive && ticket === generation.current && !held.current && known) { hasObservation.current = true; setWallet(known.wallet); setObservedAt(known.observedAt); } });
    void restoreNativeIdentity().then(next => { if (alive) { if (next) accept(next); else setOpening(false); } else next?.dispose(); }).catch(() => { if (alive) { setOpening(false); setError('The saved ID could not be opened. Import your Identity Seal to restore it.'); } });
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    const repaint = () => { const known = held.current?.knownWallet?.(); if (known) { hasObservation.current=true; setWallet(known.wallet); setObservedAt(known.observedAt); setError(null); setSyncPending(false); } };
    addEventListener('bankeiz:account-observation', repaint);
    addEventListener('online', wake); document.addEventListener('visibilitychange', wake);
    return () => { alive = false; held.current?.dispose(); held.current = null; generation.current++; clearInterval(timer); removeEventListener('bankeiz:account-observation', repaint); removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); };
  }, [accept, refresh]);
  const open = async (operation: () => Promise<OpenIdentity>) => {
    if (openingOperation.current) return;
    openingOperation.current = true; const ticket = generation.current; setBusy(true); setError(null);
    try {
      const next = await operation();
      if (ticket !== generation.current) { next.dispose(); await forgetDeviceIdentity(); return; }
      // Identity admission and retained local state open the account. A remote
      // read may append new observations, never gate this completed restore.
      accept(next);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your ID could not be opened.'); }
    finally { openingOperation.current = false; if (!held.current) setBusy(false); }
  };
  const create = (consent: boolean) => open(() => createNativeIdentity(consent));
  const importId = (file: File, phrase: string, consent: boolean) => open(() => importNativeIdentity(file, phrase, consent));
  const forget = async () => { await forgetDeviceIdentity(); held.current?.dispose(); held.current = null; generation.current++; pending.current = false; hasObservation.current = false; setIdentity(null); setWallet(null); setObservedAt(null); setBusy(false); setSyncPending(false); };
  return { identity, wallet, opening, busy, error, observedAt, syncPending, refresh, create, importId, forget };
}
