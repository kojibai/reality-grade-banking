import {SiteFooter} from '../components/SiteFooter';
import {RECEIZ_VERSION} from '../receiz/client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, LaptopMinimal, FileText, Landmark, LoaderCircle } from 'lucide-react';
import { branding } from '../../branding/profile.mjs';
import { checks, downloadEvidence, runBrowserChecks, type CheckId, type CheckResult, type ReferenceReport } from './reference';
import { ReferenceChecks } from './ReferenceChecks';
import { ProofInspector, type InspectionState } from './ProofInspector';
import { QualificationMatrix } from './QualificationMatrix';
import {DeviceEvidence} from './DeviceEvidence';
import type {DeviceCustodyEvidence} from './device-evidence';
const tabs = [{ id: 'reference', label: 'Reference checks' }, { id: 'inspector', label: 'Proof inspector' }, { id: 'qualification', label: 'Qualification' }] as const;
type Tab = typeof tabs[number]['id'];
const readTab = (): Tab => location.hash==='#device-evidence'?'qualification':tabs.find(tab => `#${tab.id}` === location.hash)?.id ?? 'reference';
export default function ConformanceApp({activeSurface=true}:{activeSurface?:boolean}) {
  const [tab, setTab] = useState<Tab>(readTab), [busy, setBusy] = useState(false), [active, setActive] = useState<CheckId | null>(null), [results, setResults] = useState<CheckResult[]>([]), [report, setReport] = useState<ReferenceReport | null>(null), [inspection, setInspection] = useState<InspectionState>({ busy: false, evidence: null }), [visible, setVisible] = useState(!document.hidden);
  const alive = useRef(true);
  const [deviceEvidence,setDeviceEvidence]=useState<DeviceCustodyEvidence|null>(null);
  useEffect(() => { alive.current = true; const sync = () => {if(location.pathname==='/conformance/')setTab(readTab());}, visibility = () => setVisible(!document.hidden); addEventListener('popstate', sync); addEventListener('hashchange', sync); document.addEventListener('visibilitychange', visibility); return () => { alive.current = false; removeEventListener('popstate', sync); removeEventListener('hashchange', sync); document.removeEventListener('visibilitychange', visibility); }; }, []);
  const select = (next: Tab) => { setTab(next); history.pushState(null, '', `#${next}`); };
  const run = async () => {
    if (busy) return; select('reference'); setBusy(true); setReport(null); setResults([]); setActive(null);
    try { const result = await runBrowserChecks(id => { if (alive.current) setActive(id); }, result => { if (alive.current) setResults(current => [...current, result]); }); if (alive.current) setReport(result); }
    finally { if (alive.current) { setBusy(false); setActive(null); } }
  };
  const exported = tab === 'inspector' ? inspection.evidence : tab==='qualification'?deviceEvidence:report;
  const exportPending = busy || (tab === 'inspector' && inspection.busy);
  const passed = results.filter(result => result.passed).length;
  return <div className={`conformance-root ${visible&&activeSurface ? '' : 'conformance-paused'}`}><a className="conformance-skip" href="#conformance-main">Skip to workspace</a><header className="conformance-header"><a className="conformance-brand" href="/" aria-label={`${branding.applicationName} home`}>{branding.wordmark}<span>{branding.descriptor}</span></a><span className="conformance-product">Conformance</span><nav aria-label="Main navigation"><a href="/">Bank</a><a href="/learn/">Learn</a><a href="https://github.com/kojibai/reality-grade-banking/tree/main/institution">Developer kit</a></nav></header>
    <main id="conformance-main"><div className="conformance-hero"><div><h1>Conformance<span>.</span></h1><p>Verification. Ownership. History.</p></div><div className="conformance-actions"><div><button className="conformance-button primary" disabled={busy} onClick={() => void run()}>{busy ? 'Running checks' : 'Run reference checks'}{busy ? <LoaderCircle size={20} className="spinning" /> : <ArrowRight size={20} />}</button><button className="conformance-button secondary" disabled={!exported || exportPending} onClick={() => { if (exported) downloadEvidence(exported, tab === 'inspector' ? 'receiz-note-inspection.json' : tab==='qualification'?'bankeiz-device-evidence.json':'receiz-reference-evidence.json'); }}>Export evidence <Download size={18} /></button></div><small>{busy ? 'Verifying on this device. No funds move.' : exported ? 'Local evidence. Assessment scope stays explicit.' : tab === 'inspector' ? (inspection.busy ? 'Verifying the selected original.' : 'Inspect an original to enable export.') : tab==='qualification'?'Run the device check to enable export.':'Run checks to enable export.'}</small></div></div>
    <div className="conformance-tabs" role="tablist" aria-label="Conformance workspace">{tabs.map((item, i) => <button key={item.id} role="tab" id={`tab-${item.id}`} aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} onClick={() => select(item.id)} onKeyDown={event => { if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return; event.preventDefault(); const next = tabs[(i + (event.key === 'ArrowRight' ? 1 : 2)) % tabs.length]; select(next.id); document.getElementById(`tab-${next.id}`)?.focus(); }}>{item.label}</button>)}</div>
    <section role="tabpanel" id="panel-reference" aria-labelledby="tab-reference" hidden={tab !== 'reference'}><div className="conformance-summary"><div><LaptopMinimal size={36} strokeWidth={1.5} /><p><span>On-device checks</span><strong className={report && !report.localChecksPassed ? 'failed' : ''}>{busy ? `${results.length} / ${checks.length} complete` : report ? `${passed} / ${checks.length} passed` : 'Not run'}</strong></p></div><div><FileText size={36} strokeWidth={1.5} /><p><span>Protocol</span><strong>v{RECEIZ_VERSION}</strong></p></div><div><Landmark size={36} strokeWidth={1.5} /><p><span>Institution assessment</span><strong>Not assessed</strong></p></div></div><ReferenceChecks results={results} active={active} report={report} busy={busy} /></section>
    <section role="tabpanel" id="panel-inspector" aria-labelledby="tab-inspector" hidden={tab !== 'inspector'}><ProofInspector onState={setInspection} /></section><section role="tabpanel" id="panel-qualification" aria-labelledby="tab-qualification" hidden={tab !== 'qualification'}>{tab==='qualification'&&activeSurface&&<DeviceEvidence onEvidence={setDeviceEvidence}/>}<QualificationMatrix /></section>
    </main><SiteFooter/></div>;
}
