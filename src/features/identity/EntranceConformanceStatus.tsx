import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import manifest from 'virtual:receiz-receiver-build';
import profile from '../../../institution/receiver-profile.json';
import recorded from '../../../docs/verification/2026-10-17-browser-resources.json';
import type { CheckResult, ReferenceReport } from '../../conformance/reference';

type Phase = 'unverified' | 'checking' | 'passed' | 'refused' | 'error';
type Snapshot = { phase: Phase; total: number | null; results: CheckResult[]; report: ReferenceReport | null; error: string | null; origin: 'recorded' | 'device' | 'session' };
const initialSnapshot: Snapshot = { phase: 'unverified', total: null, results: [], report: null, error: null, origin: 'recorded' };
const checkIds = ['release', 'integrity', 'source', 'custody', 'transport', 'temporal', 'edges'] as const;
const storageKey = 'bankeiz.reference-status.v1';
const build = `${profile.receizVersion}:${profile.registryDigest}:${manifest.moduleSha256}:${checkIds.join(',')}`;

function isPinnedReport(value: unknown): value is ReferenceReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as ReferenceReport;
  return report.schema === 'receiz.bank.browser-reference-checks.v1'
    && manifest.version === profile.receizVersion
    && report.receizVersion === profile.receizVersion
    && report.registryDigest === profile.registryDigest
    && report.verifierModuleSha256 === manifest.moduleSha256
    && Array.isArray(report.checks) && report.checks.length === checkIds.length
    && report.checks.every(result => result && typeof result === 'object' && checkIds.includes(result.id) && typeof result.passed === 'boolean')
    && new Set(report.checks.map(result => result.id)).size === checkIds.length
    && report.localChecksPassed === report.checks.every(result => result.passed)
    && report.institutionConformance === 'not-assessed'
    && report.creditAuthorized === false
    && report.financialActionsPerformed === 0
    && report.timestampsAreAuthority === false;
}

function completedSnapshot(report: ReferenceReport, origin: Snapshot['origin']): Snapshot {
  const pinned = isPinnedReport(report), passed = pinned && report.localChecksPassed;
  return { phase: passed ? 'passed' : 'refused', total: checkIds.length, results: pinned ? report.checks : [], report: pinned ? report : null, origin, error: pinned ? null : 'The result does not match the complete pinned verifier checks.' };
}

function readLastResult(): Snapshot {
  // Presentation only: this public cache never grants access, custody or financial authority.
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw && raw.length < 24000) {
      const saved = JSON.parse(raw);
      if (saved.build === build) {
        if (isPinnedReport(saved.report)) return completedSnapshot(saved.report, 'device');
        if (['refused', 'error'].includes(saved.phase) && typeof saved.error === 'string') return { ...initialSnapshot, phase: saved.phase, error: saved.error.slice(0, 240), origin: 'device' };
      }
    }
  } catch { /* The recorded report remains available with blocked or malformed storage. */ }
  return isPinnedReport(recorded) ? completedSnapshot(recorded, 'recorded') : initialSnapshot;
}

function retainResult(snapshot: Snapshot) {
  try {
    const report = snapshot.report ? { ...snapshot.report, checks: snapshot.report.checks.map(result => ({ ...result, evidence: null })) } : null;
    localStorage.setItem(storageKey, JSON.stringify({ build, phase: snapshot.phase, report, error: snapshot.error }));
  } catch { /* Checks and the current result do not depend on browser storage. */ }
}

export function EntranceConformanceStatus() {
  const [open, setOpen] = useState(false), [snapshot, setSnapshot] = useState(readLastResult);
  const [refreshing, setRefreshing] = useState(false), [progress, setProgress] = useState<{ total: number | null; activeName: string | null; results: CheckResult[] }>({ total: null, activeName: null, results: [] });
  const wrapper = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), popup = useRef<HTMLDivElement>(null), close = useRef<HTMLButtonElement>(null);
  const alive = useRef(false), started = useRef(false), running = useRef(false);
  const id = useId(), popupId = `${id}-conformance`, titleId = `${id}-conformance-title`;

  const runChecks = useCallback(async () => {
    if (running.current || !alive.current) return;
    started.current = true; running.current = true;
    setRefreshing(true); setProgress({ total: null, activeName: null, results: [] });
    setSnapshot(current => current.phase === 'unverified' ? { ...current, phase: 'checking' } : current);
    try {
      // The SDK and verifier enter the graph only after idle scheduling or an explicit click.
      const reference = await import('../../conformance/reference');
      if (!alive.current) return;
      setProgress(current => ({ ...current, total: reference.checks.length }));
      const report = await reference.runBrowserChecks(
        checkId => { if (alive.current) setProgress(current => ({ ...current, activeName: reference.checks.find(check => check.id === checkId)?.name ?? null })); },
        result => { if (alive.current) setProgress(current => ({ ...current, results: [...current.results, result] })); },
      );
      if (!alive.current) return;
      const next = completedSnapshot(report, 'session');
      retainResult(next); setSnapshot(next);
    } catch (error) {
      if (alive.current) {
        const next: Snapshot = { ...initialSnapshot, phase: 'error', origin: 'session', error: error instanceof Error ? error.message.slice(0, 240) : 'VERIFIER_CHECKS_UNAVAILABLE' };
        retainResult(next); setSnapshot(next);
      }
    } finally { running.current = false; if (alive.current) setRefreshing(false); }
  }, []);

  useEffect(() => {
    alive.current = true;
    let idle: number | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    // Leave the entrance's first paint free of verifier loading and work.
    const frame = requestAnimationFrame(() => {
      const begin = () => { if (alive.current && !started.current) void runChecks(); };
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(begin, { timeout: 1500 });
      else timer = setTimeout(begin, 100);
    });
    return () => {
      alive.current = false; cancelAnimationFrame(frame);
      if (idle !== undefined) cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [runChecks]);

  useEffect(() => {
    if (!open) return;
    close.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (popup.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
  }, [open]);

  const { phase, total, results, error } = snapshot;
  const passed = results.filter(result => result.passed).length;
  const label = phase === 'passed' ? 'Browser checks passed' : phase === 'checking' ? 'Checking this build' : phase === 'refused' ? 'Did not qualify' : phase === 'error' ? 'Checks unavailable' : 'Not checked';
  const dismiss = () => {
    if (popup.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
    setOpen(false);
  };

  return <div className="entrance-conformance" ref={wrapper}>
    <button ref={trigger} type="button" className="entrance-conformance-trigger" data-state={phase} aria-label={`Conformance status: ${label.toLowerCase()}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={popupId} title={label} onClick={() => { setOpen(current => !current); if (!started.current) void runChecks(); }}><ShieldCheck size={19} aria-hidden="true" /></button>
    {open && <div ref={popup} id={popupId} className="entrance-conformance-popover" role="dialog" aria-labelledby={titleId}>
      <div className="entrance-conformance-heading"><h2 id={titleId}>Conformance</h2><button ref={close} type="button" aria-label="Close conformance status" onClick={dismiss}><X size={15} aria-hidden="true" /></button></div>
      <div className="entrance-conformance-status" data-state={phase}><span className="entrance-conformance-emblem"><ShieldCheck size={21} strokeWidth={1.6} aria-hidden="true" /></span><p role="status" aria-live="polite" aria-atomic="true"><strong>{label}</strong><span>{total === null ? 'Current build not yet checked' : `${passed} of ${total} passed`}</span></p></div>
      {refreshing && <p className="entrance-conformance-detail"><LoaderCircle size={12} aria-hidden="true" />{progress.total === null ? 'Refreshing checks…' : `${progress.results.length} of ${progress.total} complete`}{progress.activeName && ` · ${progress.activeName}`}</p>}
      {phase === 'refused' && <p className="entrance-conformance-error">{error ?? results.find(result => !result.passed)?.error ?? 'The browser reference checks did not all pass.'}</p>}
      {phase === 'error' && <p className="entrance-conformance-error">{error}</p>}
      <dl className="entrance-conformance-scope"><div><dt>Browser reference</dt><dd>Receiz v{profile.receizVersion.split('.')[0]}</dd></div></dl>
      <p className="entrance-conformance-boundary">No private data accessed. No funds moved.</p>
      {phase === 'passed' && <p className="entrance-conformance-build" title={`Verifier SHA-256: ${manifest.moduleSha256}`}>{snapshot.origin === 'recorded' ? 'Recorded reference result' : snapshot.origin === 'device' ? 'Last result on this device' : 'Checked this session'} · Verifier {manifest.moduleSha256.slice(0, 10)}</p>}
      <div className="entrance-conformance-footer"><a href="/conformance/">Open conformance console<ArrowUpRight size={13} aria-hidden="true" /></a>{!refreshing && <button type="button" onClick={() => void runChecks()}>{phase === 'error' || phase === 'refused' ? 'Try again' : 'Recheck'}</button>}</div>
    </div>}
  </div>;
}
