import {forgetPushSubscription} from '../pwa/push-registration';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createNativeIdentity, importNativeIdentity, restoreNativeIdentity, forgetDeviceIdentity, type OpenIdentity } from './native-identity';
import type { SharedWallet } from './shared-wallet';
import { hasSettledAccountView } from './account-view';
import type { WalletPoint } from './wallet-series';
import type { WalletObservation } from './wallet-observation';
import { preloadPrivateHistory } from './private-history-restore';
function walletReadMessage(cause: unknown, refreshing = false): string {
  if (cause instanceof Error && cause.message === 'proof_replay_guard_unavailable') return 'Secure account access is temporarily unavailable. Your Identity Record is unchanged. Refresh your balance to try again.';
  return refreshing ? 'Your balance could not be updated. Your Identity Record stays on this device. Try again when the source is available.' : 'Your balance could not be opened. Your Identity Record stays on this device. Refresh your balance to try again.';
}
const nativeCustody = { createNativeIdentity, importNativeIdentity, restoreNativeIdentity, forgetDeviceIdentity };
export function useNativeAccount(custody = nativeCustody) {
  const [identity, setIdentity] = useState<OpenIdentity | null>(null), [wallet, setWallet] = useState<SharedWallet | null>(null);
  const [walletHistory, setWalletHistory] = useState<WalletPoint[]>([]);
  const [historyComplete,setHistoryComplete]=useState(false);
  const [receivedNotes,setReceivedNotes]=useState<readonly import('./offline-notes').BankNoteDepositResult[]>([]);
  const [openingStage, setOpeningStage] = useState<'identity' | 'history' | 'ready'>('identity');
  const [opening, setOpening] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [observedAt, setObservedAt] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const refreshQueued=useRef(false);
  const held = useRef<OpenIdentity | null>(null), generation = useRef(0), pending = useRef(false), openingOperation = useRef(false), hasObservation = useRef(false);
  const publishObservation = useCallback((known: WalletObservation) => {
    hasObservation.current = true; setWallet(known.wallet); setObservedAt(known.observedAt); setWalletHistory(known.history ?? []); setHistoryComplete(hasSettledAccountView(known));
  }, []);
  const localValuation = useRef<{ identity: OpenIdentity; promise: Promise<WalletObservation | null> } | null>(null);
  const refreshLocal = useCallback(() => {
    const current = held.current, ticket = generation.current;
    if (!current?.refreshLocalValuation) return Promise.resolve(null);
    if (localValuation.current?.identity === current) return localValuation.current.promise;
    const attempt = Promise.resolve().then(() => ticket === generation.current && held.current === current ? current.refreshLocalValuation!() : null).then(known => {
      if (known && ticket === generation.current && held.current === current) publishObservation(known);
      return known;
    }).catch(() => null);
    localValuation.current = { identity: current, promise: attempt };
    void attempt.finally(() => { if (localValuation.current?.promise === attempt) localValuation.current = null; }).catch(() => {});
    return attempt;
  }, [publishObservation]);
  const refresh = useCallback(async (background = false):Promise<void> => {
    const current = held.current, ticket = generation.current;
    if (!current) return;
    // A native action may have retained a newer account successor while an
    // earlier remote read is still pending. Paint that result immediately.
    const known = current.knownWallet?.();
    if (known) publishObservation(known);
    if (background) await refreshLocal();
    if (ticket !== generation.current || held.current !== current) return;
    if(pending.current){if(!background){refreshQueued.current=true;setBusy(true);}return;}
    pending.current = true; if (!background) setBusy(true);
    try {
      do{
        refreshQueued.current=false;
        try{const value=await current.readWallet();if(ticket===generation.current&&!refreshQueued.current){const observed=current.knownWallet?.();hasObservation.current=true;setWallet(value);setObservedAt(observed?.observedAt??new Date().toISOString());setWalletHistory(observed?.history??[]);setHistoryComplete(hasSettledAccountView(observed??null));setError(null);setSyncPending(false);}}
        catch(cause){if(ticket===generation.current&&!refreshQueued.current){setSyncPending(true);if(current.knownWallet?.()?.source!=='account-genesis')setError(walletReadMessage(cause,hasObservation.current));}}
      }while(ticket===generation.current&&held.current===current&&refreshQueued.current);
    }
    finally { if (ticket === generation.current) { pending.current = false; setBusy(false); } }
  }, [publishObservation, refreshLocal]);
  const entering = useRef<OpenIdentity | null>(null);
  const accept = useCallback(async (next: OpenIdentity, ticket: number) => {
    if (ticket !== generation.current) { next.dispose(); return; }
    entering.current = next;
    setOpeningStage('history');
    try {
      const provisionalUid = next.knownWallet?.()?.wallet.userId;
      const preloading=provisionalUid?preloadPrivateHistory(next,provisionalUid):null;
      const known = await next.prepareAccountView();
      if (ticket !== generation.current) { next.dispose(); return; }
      // Reuse the already-started local restore in the first complete frame;
      // account entry and the Ledger hook must not start separate reads.
      const retainedRows=preloading&&provisionalUid===known.wallet.userId?preloading:preloadPrivateHistory(next,known.wallet.userId);
      await retainedRows;
      if (ticket !== generation.current) { next.dispose(); return; }
      held.current?.dispose(); held.current = next; pending.current = false;refreshQueued.current=false;
      setReceivedNotes(next.knownReceivedNotes?.()??[]);
      // One React commit: no admitted account shell with an absent chart.
      hasObservation.current = true; setWallet(known.wallet); setObservedAt(known.observedAt); setWalletHistory(known.history ?? []); setHistoryComplete(hasSettledAccountView(known));
      setError(null); setSyncPending(false); setOpeningStage('ready'); setIdentity(next); setOpening(false); setBusy(false);
    } catch (cause) { next.dispose(); throw cause; }
    finally { if (entering.current === next) entering.current = null; }
  }, []);
  useEffect(() => {
    let alive = true;
    const ticket = generation.current;
    void custody.restoreNativeIdentity().then(async next => {
      if (!alive) { next?.dispose(); return; }
      if (next) await accept(next, ticket); else setOpening(false);
    }).catch(cause => { if (alive) { setOpening(false); setError(cause instanceof Error ? cause.message : 'Your account could not be opened. Your Identity Record is unchanged.'); } });
    const foreground = () => alive && document.visibilityState === 'visible' && location.pathname === '/' && Boolean(held.current);
    let wakeQueued = false;
    const wake = () => {
      if (!foreground() || wakeQueued) return;
      wakeQueued = true;
      queueMicrotask(() => { wakeQueued = false; if (foreground()) void refresh(true); });
    };
    const timer = setInterval(wake, 60_000);
    const localTimer = setInterval(() => { if (foreground()) void refreshLocal(); }, 1_000);
    const repaint = () => { const current=held.current,known = current?.knownWallet?.(); if (current) setReceivedNotes(current.knownReceivedNotes?.()??[]); if (known) { hasObservation.current=true; setWallet(known.wallet); setObservedAt(known.observedAt); setWalletHistory(known.history ?? []); setHistoryComplete(hasSettledAccountView(known)); setError(null); setSyncPending(false); } };
    const paymentRecorded=(event:Event)=>{const current=held.current,detail=(event as CustomEvent).detail;if(current&&detail?.identityDigest===current.binding.artifactSha256)void refresh();};
    addEventListener('bankeiz:wallet-send-recorded',paymentRecorded);
    addEventListener('bankeiz:account-observation', repaint);
    const wakeEvents = ['online', 'focus', 'pageshow', 'popstate', 'receiz-bank:surface'] as const;
    for (const event of wakeEvents) addEventListener(event, wake);
    document.addEventListener('visibilitychange', wake);
    return () => { alive = false; entering.current?.dispose(); held.current?.dispose(); held.current = null; generation.current++; clearInterval(timer); clearInterval(localTimer);removeEventListener('bankeiz:wallet-send-recorded',paymentRecorded); removeEventListener('bankeiz:account-observation', repaint); for (const event of wakeEvents) removeEventListener(event, wake); document.removeEventListener('visibilitychange', wake); };
  }, [accept, refresh, refreshLocal, custody]);
  const open = async (operation: () => Promise<OpenIdentity>) => {
    if (openingOperation.current) return;
    openingOperation.current = true; const ticket = generation.current; setOpeningStage('identity'); setBusy(true); setError(null);
    try {
      const next = await operation();
      if (ticket !== generation.current) { next.dispose(); return; }
      // Prepare the full visible account before publishing the admitted identity.
      await accept(next, ticket);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your ID could not be opened.'); }
    finally { openingOperation.current = false; if (!held.current) setBusy(false); }
  };
  const create = (consent: boolean) => open(() => custody.createNativeIdentity(consent));
  const importId = (file: File, phrase: string, consent: boolean) => open(() => custody.importNativeIdentity(file, phrase, consent));
  const forget = async () => { const current=held.current;if(current){await current.cancelUnsentNotes?.();if(held.current!==current)throw Error('Your device identity changed. Reopen this action.');}await forgetPushSubscription().catch(()=>{});await custody.forgetDeviceIdentity(); entering.current?.dispose(); held.current?.dispose(); held.current = null; generation.current++; pending.current = false; hasObservation.current = false; setIdentity(null); setWallet(null); setWalletHistory([]); setReceivedNotes([]); setHistoryComplete(false); setObservedAt(null); setOpeningStage('identity'); setOpening(false); setBusy(false); setSyncPending(false); };
  return { identity, wallet, walletHistory, receivedNotes, historyComplete, opening, openingStage, busy, error, observedAt, syncPending, refresh, create, importId, forget };
}
