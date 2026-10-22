import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import manifest from 'virtual:receiz-receiver-build';
import profile from '../../../institution/receiver-profile.json';
import recorded from '../../content/conformance-reference-status.json';
import {INSTITUTION_BROWSER_SUITE_ID,INSTITUTION_BROWSER_CHECK_IDS} from '../../conformance/check-ids';
import type { InstitutionCheckResult as CheckResult, EntranceReferenceReport as ReferenceReport } from '../../conformance/reference';

type Phase = 'unverified' | 'checking' | 'passed' | 'refused' | 'error';
type Snapshot = { phase: Phase; total: number | null; results: CheckResult[]; report: ReferenceReport | null; error: string | null; origin: 'recorded' | 'device' | 'session' };
const initialSnapshot: Snapshot = { phase: 'unverified', total: null, results: [], report: null, error: null, origin: 'recorded' };
const checkIds:readonly string[]=INSTITUTION_BROWSER_CHECK_IDS;
const storageKey = 'bankeiz.reference-status.v2';
const build = `${INSTITUTION_BROWSER_SUITE_ID}:${profile.profileVersion}:${profile.ruleset}:${profile.receizVersion}:${profile.registryDigest}:${profile.operationMatrixDigest}:${manifest.moduleSha256}:${checkIds.join(',')}`;

function isPinnedReport(value: unknown): value is ReferenceReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as ReferenceReport;
  return report.schema === 'receiz.bank.entrance-reference-status.v2'
    && report.suiteId===INSTITUTION_BROWSER_SUITE_ID
    && report.profileVersion===profile.profileVersion && report.ruleset===profile.ruleset
    && report.operationMatrixDigest===profile.operationMatrixDigest
    && typeof report.suiteSourceSha256==='string' && /^[a-f0-9]{64}$/.test(report.suiteSourceSha256)
    && report.scope==='nonfinancial-browser-reference'
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
  return { phase: passed ? 'passed' : 'refused', total: checkIds.length, results: pinned ? report.checks : [], report: pinned ? report : null, origin, error: pinned ? null : 'The result does not match the complete pinned twelve-check reference suite.' };
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
      setProgress(current => ({ ...current, total: reference.institutionChecks.length }));
      const report = await reference.runEntranceReferenceChecks(
        checkId => { if (alive.current) setProgress(current => ({ ...current, activeName: reference.institutionChecks.find(check => check.id === checkId)?.name ?? null })); },
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

  const { phase, total, results } = snapshot;
  const passed = results.filter(result => result.passed).length;
  const label = phase === 'passed' ? 'Verification passed' : phase === 'checking' ? 'Verification in progress' : phase === 'refused' ? 'Verification not satisfied' : phase === 'error' ? 'Verification unavailable' : 'Verification pending';
  const dismiss = () => {
    if (popup.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true });
    setOpen(false);
  };

  return <div className="entrance-conformance" ref={wrapper}>
    <button ref={trigger} type="button" className="entrance-conformance-trigger" data-state={phase} aria-label={`Conformance status: ${label.toLowerCase()}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={popupId} title={label} onClick={() => { setOpen(current => !current); if (!started.current) void runChecks(); }}><ShieldCheck size={19} aria-hidden="true" /></button>
    {open && <div ref={popup} id={popupId} className="entrance-conformance-popover" role="dialog" aria-labelledby={titleId}>
      <div className="entrance-conformance-heading"><h2 id={titleId}>Conformance record</h2><button ref={close} type="button" aria-label="Close conformance status" onClick={dismiss}><X size={15} aria-hidden="true" /></button></div>
      <div className="entrance-conformance-status" data-state={phase}><span className="entrance-conformance-emblem"><ShieldCheck size={21} strokeWidth={1.6} aria-hidden="true" /></span><p role="status" aria-live="polite" aria-atomic="true"><strong>{label}</strong><span>{total === null ? 'Verification pending' : `${passed} of ${total} passed`}</span></p></div>
      {refreshing && <p className="entrance-conformance-detail"><LoaderCircle size={12} aria-hidden="true" />Verification in progress{progress.total !== null && ` · ${progress.results.length} of ${progress.total} complete`}</p>}
      {phase === 'refused' && <p className="entrance-conformance-error">Verification did not satisfy all checks. Inspect the evidence for the recorded findings.</p>}
      {phase === 'error' && <p className="entrance-conformance-error">A current verification result could not be established. Retry verification or inspect the evidence.</p>}
      <dl className="entrance-conformance-scope"><div><dt>Standard</dt><dd>Reality-grade banking</dd></div><div><dt>Scope</dt><dd>Proof and continuity checks</dd></div>{phase === 'passed' && <div><dt>Evidence</dt><dd>{snapshot.origin === 'recorded' ? 'Recorded verification' : snapshot.origin === 'device' ? 'Last result on this device' : 'Verified this session'}</dd></div>}</dl>
      <div className="entrance-conformance-footer"><a href="/conformance/#reference">View verification evidence<ArrowUpRight size={13} aria-hidden="true" /></a>{!refreshing && <button type="button" onClick={() => void runChecks()}>{phase === 'error' || phase === 'refused' ? 'Retry verification' : 'Verify again'}</button>}</div>
    </div>}
  </div>;
}
