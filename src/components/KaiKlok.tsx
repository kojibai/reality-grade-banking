import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { GENESIS_TS, epochMsFromPulse } from '../../native/receiz/app/utils/kai_pulse';
import { KAI_DAYS, KAI_MONTHS, KAI_PHASES, projectKaiKlok, type KaiKlokMoment } from './kai-klok';
import { useKaiKlok } from './useKaiKlok';
import './kai-klok.css';

const number = new Intl.NumberFormat('en-US');
const localTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' });

function momentStyle(moment: KaiKlokMoment): CSSProperties {
  return { '--kai-phase': moment.phaseColor, '--kai-day': moment.dayColor, '--kai-month': moment.monthColor } as CSSProperties;
}

function KaiDate({ moment }: { moment: KaiKlokMoment }) {
  return <span className="kai-date"><span className="kai-date-day">D{moment.day}</span><i>/</i><span className="kai-date-month">M{moment.month}</span><i>/</i><span>Y{moment.year}</span></span>;
}

function KaiFace({ moment }: { moment: KaiKlokMoment }) {
  return <div className="kai-face" style={momentStyle(moment)}>
    <svg className="kai-face-rings" viewBox="0 0 300 300" aria-hidden="true">
      <circle className="kai-ring-track" cx="150" cy="150" r="139" pathLength="36" strokeDasharray=".72 .28" />
      <circle className="kai-ring-track kai-ring-inner" cx="150" cy="150" r="125" pathLength="44" strokeDasharray=".62 .38" />
      <circle className="kai-ring-track kai-ring-core" cx="150" cy="150" r="112" pathLength="11" strokeDasharray=".8 .2" />
      <circle className="kai-ring-progress" cx="150" cy="150" r="139" pathLength="1" strokeDasharray={`${moment.beatProgress} 1`} />
      <circle className="kai-ring-progress kai-ring-step" cx="150" cy="150" r="125" pathLength="1" strokeDasharray={`${moment.stepProgress} 1`} />
      <circle className="kai-ring-progress kai-ring-pulse" cx="150" cy="150" r="112" pathLength="1" strokeDasharray={`${moment.pulseProgress} 1`} />
    </svg>
    <div className="kai-face-readout"><span className="kai-face-caption">BEAT · STEP · PULSE</span><strong className="kai-face-time">{moment.time}</strong><KaiDate moment={moment} /><span className="kai-face-phase"><span key={moment.pulse} className="kai-living-dot" />{moment.phase}</span></div>
    <span className="kai-face-pulse">☤ KAI <strong>{number.format(moment.pulse)}</strong></span>
  </div>;
}

export function KaiKlok({ active = true }: { active?: boolean }) {
  const pulse = useKaiKlok(active), moment = projectKaiKlok(pulse);
  const epochMs = Number(epochMsFromPulse(BigInt(pulse)));
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null);
  const panelId = useId(), titleId = useId();
  const dismiss = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!open) return;
    close.current?.focus({ preventScroll: true });
    const outside = (event: Event) => { if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); };
  }, [open]);
  useEffect(() => { if (!active) setOpen(false); }, [active]);
  return <div className="kai-klok" ref={container} style={momentStyle(moment)} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); dismiss(); } }}>
    <button ref={trigger} className="kai-header-button" aria-label="Explain this Kai moment" aria-description={`${moment.time}, day ${moment.day}, month ${moment.month}, year ${moment.year}, eternal KAI ${number.format(pulse)}`} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>
      <span className="kai-header-coordinate"><strong>{moment.time}</strong><KaiDate moment={moment} /></span>
      <span className="kai-header-meta"><span><span key={pulse} className="kai-living-dot" />KAI KLOK</span><span>☤ {number.format(pulse)}</span></span>
    </button>
    {open && <div className="kai-popover" id={panelId} role="dialog" aria-labelledby={titleId}>
      <div className="kai-popover-heading"><div><span className="kai-eyebrow">THE LIVING COORDINATE</span><h2 id={titleId}>Kai-Klok KKSv1</h2></div><button ref={close} className="kai-close" aria-label="Close Kai Klok" onClick={() => dismiss()}><X size={19} /></button></div>
      <p className="kai-introduction">One precise position in a continuous sequence. The Kai Klok is a deterministic temporal indexing system: every moment can be recomputed, compared, and read independently.</p>
      <div className="kai-moment-layout"><KaiFace moment={moment} /><div className="kai-moment-context">
        <span className="kai-eyebrow">THIS MOMENT</span>
        <h3>{moment.weekday}<span>{moment.monthName} · Y{moment.year}</span></h3>
        <div className="kai-moment-identity"><span style={{ background: moment.dayColor }} aria-hidden="true" /><span>Day {moment.day} of 42<small>{moment.dayColorName}</small></span><span style={{ background: moment.monthSwatch }} aria-hidden="true" /><span>Month {moment.month} of 8<small>{moment.monthColorName}</small></span></div>
        <p className="kai-week">Week {moment.week} · {moment.weekName}</p>
        <dl className="kai-units"><div><dt>BEAT</dt><dd>{String(moment.beat).padStart(2, '0')}<span>/ 36 beats per day</span></dd></div><div><dt>STEP</dt><dd>{String(moment.step).padStart(2, '0')}<span>/ 44 steps per beat</span></dd></div><div><dt>PULSE</dt><dd>{String(moment.withinStep).padStart(2, '0')}<span>/ 11 pulses per step</span></dd></div></dl>
      </div></div>
      <p className="kai-local-time"><span>Local Chronos</span><time dateTime={new Date(epochMs).toISOString()}>{localTime.format(epochMs)}</time></p>
      <div className="kai-explanation"><p><strong>A stable rhythm.</strong> A pulse spans 3 + √5 seconds, about 5.236 seconds. The eternal KAI number continues across every day, month, and year.</p><p><strong>A readable state.</strong> Beat, step, and pulse start at zero. Day and month start at one; the first Kai year is Y0. Color identifies the phase, day, and month.</p></div>
      <details className="kai-technical"><summary>Read the system in detail<span aria-hidden="true">+</span></summary><div>
        <h3>Exact structure</h3><p>Six days form a week. Seven weeks form a 42-day month. Eight months form a 336-day year. These fixed Kai boundaries are independent of civil midnight and Gregorian month lengths.</p>
        <p>KKSv1 uses integer micro-pulses: 1 pulse = 1,000,000 micro-pulses. Each day closes at exactly 17,491.270421 pulses and projects onto the 36 × 44 × 11 display lattice. The final field is the pulse position within that projected step.</p>
        <h3>Moment colors</h3><p>The phase colors follow six segments of six beats. Day and month colors identify their own calendar positions.</p>
        <div className="kai-color-key">{KAI_PHASES.map((phase, i) => <span key={phase.name}><i style={{ background: phase.color }} /><span>{phase.name}<small>{String(i * 6).padStart(2, '0')}–{String(i * 6 + 5).padStart(2, '0')}</small></span></span>)}</div>
        <h3>Days</h3><div className="kai-color-key">{KAI_DAYS.map(day => <span key={day.name}><i style={{ background: day.color }} /><span>{day.name}<small>{day.colorName}</small></span></span>)}</div>
        <h3>Months</h3><div className="kai-color-key">{KAI_MONTHS.map((month, i) => <span key={month.name}><i style={{ background: i === 7 ? 'linear-gradient(135deg,#00C2FF 0%,#A855F7 48%,#F59E0B 100%)' : month.color }} /><span>M{i + 1} · {month.name}<small>{month.colorName}</small></span></span>)}</div>
        <h3>Local display, carried proof</h3><p>This live display runs locally from the canonical Kai bridge, anchored at {new Date(GENESIS_TS).toISOString()}. Local Chronos is a timezone-formatted projection of the displayed whole-pulse boundary.</p><p>A sealed record carries its own exact Kai coordinate and predecessor bindings. This live display provides orientation; the sealed source remains the authority for recorded activity.</p>
        <p className="kai-source-reference"><a href="https://github.com/kojibai/klok" target="_blank" rel="noopener noreferrer">Kai Klok technical reference <span aria-hidden="true">↗</span></a></p>
      </div></details>
      <div className="kai-popover-footer"><span className="kai-living-dot" />Computed on this device · available offline</div>
    </div>}
  </div>;
}
