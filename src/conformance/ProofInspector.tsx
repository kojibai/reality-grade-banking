import { useEffect, useRef, useState } from 'react';
import { FileUp, FileText, Landmark, UsersRound, ChevronDown, LoaderCircle } from 'lucide-react';
import { inspectOriginalNote, type NoteInspection } from './reference';
import { readOriginalNoteFile } from './boundaries';
import { formatMoney } from '../core/money';
import { EvidenceRail } from './EvidenceRail';
export interface InspectionState { busy: boolean; evidence: unknown | null; }
export function ProofInspector({ onState }: { onState: (value: InspectionState) => void }) {
  const picker = useRef<HTMLInputElement>(null), request = useRef(0);
  const [busy, setBusy] = useState(false), [report, setReport] = useState<NoteInspection | null>(null), [error, setError] = useState('');
  useEffect(() => () => { request.current++; }, []);
  const inspect = async (file: File) => {
    const ticket = ++request.current; setBusy(true); setReport(null); setError(''); onState({ busy: true, evidence: null });
    try { const result = await inspectOriginalNote(await readOriginalNoteFile(file)); if (ticket !== request.current) return; setReport(result); onState({ busy: false, evidence: { schema: 'receiz.bank.browser-note-inspection.v1', inspection: result, institutionConformance: 'not-assessed', financialActionsPerformed: 0 } }); }
    catch (cause) { if (ticket !== request.current) return; const code = cause instanceof Error ? cause.message.slice(0, 240) : 'NOTE_INSPECTION_FAILED'; setError(code); onState({ busy: false, evidence: { schema: 'receiz.bank.browser-note-inspection.v1', verified: false, refusal: code, creditAuthorized: false, institutionConformance: 'not-assessed', financialActionsPerformed: 0 } }); }
    finally { if (ticket === request.current) setBusy(false); }
  };
  return <div className="conformance-workspace inspector-workspace"><section className="inspector-main"><h2>Inspect the original.</h2><p className="section-description">Open the original Reserve Note PNG. Its carried sources are verified on this device.</p><div className="original-file-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file && !busy) void inspect(file); }}>
    {busy ? <LoaderCircle size={49} strokeWidth={1.3} className="spinning" /> : <FileUp size={49} strokeWidth={1.3} />}<h3>{busy ? 'Verifying carried sources…' : 'Choose original note'}</h3><p>.png · up to 8 MiB · stays on this device</p><button className="conformance-button primary" disabled={busy} onClick={() => picker.current?.click()}>Choose PNG</button><input ref={picker} type="file" accept="image/png,.png" aria-label="Original Reserve Note PNG" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void inspect(file); }} /></div>
    {error && <div className="proof-refusal" role="alert"><h3>Source not verified.</h3><p>Choose the original issued Reserve Note PNG. Artwork, screenshots and copied property bags cannot establish note authority.</p><code>{error}</code></div>}
    {report && <section className="verified-note-result" aria-label="Verified carried note source"><h3>Carried source verified.</h3><p className="inspection-amount">{formatMoney(report.amountUsdCents)} <span>Reserve Note</span></p><dl><div><dt>Note ID</dt><dd><code>{report.noteId}</code></dd></div><div><dt>Original denomination</dt><dd>{formatMoney(report.amountUsdCents)}</dd></div><div><dt>Fixed native amount</dt><dd>{report.amountPhiMicro} micro-Phi</dd></div><div><dt>Current spendability</dt><dd>Not checked</dd></div><div><dt>Credit authorized</dt><dd>No</dd></div></dl><details><summary>Inspect source coordinates <ChevronDown size={15} /></summary><pre>{JSON.stringify(report, null, 2)}</pre></details></section>}
    <section className="inspection-explainer"><h3>What inspection establishes</h3>{[[FileText, 'Complete carried source chain', 'The original complete note and linked funding source must verify under the native canonical roots.'], [Landmark, 'Original funded denomination', 'The denomination and fixed native obligation come from the verified source, never from the printed image.'], [UsersRound, 'Funding and receiving commitment', 'The source carries exact funding and receiving coordinates. Current qualified custody and a once-only credit are separate operations.']].map(([Icon, title, text]) => { const Mark = Icon as typeof FileText; return <details key={String(title)}><summary><Mark size={24} strokeWidth={1.5} /><span>{String(title)}</span><ChevronDown size={17} /></summary><p>{String(text)}</p></details>; })}</section>
  </section><EvidenceRail kind="inspector" /></div>;
}
