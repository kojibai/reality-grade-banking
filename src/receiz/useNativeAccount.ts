import { useCallback, useEffect, useRef, useState } from 'react';
import { createNativeIdentity, importNativeIdentity, restoreNativeIdentity, restoreKnownWalletObservation, forgetDeviceIdentity, type OpenIdentity } from './native-identity';
import type { SharedWallet } from './shared-wallet';
export function useNativeAccount() {
  const [identity, setIdentity] = useState<OpenIdentity | null>(null), [wallet, setWallet] = useState<SharedWallet | null>(null);
  const [opening, setOpening] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [observedAt, setObservedAt] = useState<string | null>(null);
  const held = useRef<OpenIdentity | null>(null), generation = useRef(0), pending = useRef(false), openingOperation = useRef(false);
  const refresh = useCallback(async () => {
    const current = held.current, ticket = generation.current;
    if (!current || pending.current) return; pending.current = true; setBusy(true);
    try { const value = await current.readWallet(); if (ticket === generation.current) { setWallet(value); setObservedAt(new Date().toISOString()); setError(null); } }
    catch { if (ticket === generation.current) setError('Receiz could not update this account. Your Identity Seal stays on this device. Try again when the source is available.'); }
    finally { if (ticket === generation.current) { pending.current = false; setBusy(false); } }
  }, []);
  const accept = useCallback((next: OpenIdentity, initialError: string | null = null) => { held.current?.dispose(); held.current = next; generation.current++; pending.current = false; setWallet(next.knownWallet?.()?.wallet ?? null); setObservedAt(next.knownWallet?.()?.observedAt ?? null); setError(initialError); setIdentity(next); setOpening(false); void refresh(); }, [refresh]);
  useEffect(() => {
    let alive = true;
    const ticket = generation.current;
    void restoreKnownWalletObservation().then(known => { if (alive && ticket === generation.current && !held.current && known) { setWallet(known.wallet); setObservedAt(known.observedAt); } });
    void restoreNativeIdentity().then(next => { if (alive) { if (next) accept(next); else setOpening(false); } else next?.dispose(); }).catch(() => { if (alive) { setOpening(false); setError('The saved ID could not be opened. Import your Identity Seal to restore it.'); } });
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60_000);
    const wake = () => { if (document.visibilityState === 'visible') void refresh(); };
    addEventListener('online', wake); document.addEventListener('visibilitychange', wake);
    return () => { alive = false; held.current?.dispose(); held.current = null; generation.current++; clearInterval(timer); removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); };
  }, [accept, refresh]);
  const open = async (operation: () => Promise<OpenIdentity>) => { if (openingOperation.current) return; openingOperation.current = true; const ticket = generation.current; setBusy(true); setError(null); try { const next = await operation(); if (ticket !== generation.current) { next.dispose(); await forgetDeviceIdentity(); return; } let initialError: string | null = null; if (!next.knownWallet?.()) { try { await next.readWallet(); } catch (cause) { initialError = cause instanceof Error ? cause.message : 'Receiz could not open your balance. Try again when the source is available.'; } } if (ticket !== generation.current) { next.dispose(); await forgetDeviceIdentity(); return; } accept(next, initialError); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your ID could not be opened.'); } finally { openingOperation.current = false; if (!held.current) setBusy(false); } };
  const create = (consent: boolean) => open(() => createNativeIdentity(consent));
  const importId = (file: File, phrase: string, consent: boolean) => open(() => importNativeIdentity(file, phrase, consent));
  const forget = async () => { held.current?.dispose(); held.current = null; generation.current++; pending.current = false; setIdentity(null); setWallet(null); setObservedAt(null); setBusy(false); await forgetDeviceIdentity(); };
  return { identity, wallet, opening, busy, error, observedAt, refresh, create, importId, forget };
}
