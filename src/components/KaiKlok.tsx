import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { X } from 'lucide-react';
import { GENESIS_TS, epochMsFromPulse } from '../../native/receiz/app/utils/kai_pulse';
import { KAI_DAYS, KAI_MONTHS, KAI_PHASES, KAI_WEEKS, projectKaiKlok, type KaiKlokMoment } from './kai-klok';
import { useKaiKlok } from './useKaiKlok';
import CanonicalKaiKlock, { BANK_KAI_SURFACE_COLORS } from './kai-klok/CanonicalKaiKlock';
import { projectCanonicalKaiFace } from './kai-klok-face';
import { useKaiSunrise } from './useKaiSunrise';
import { BANK_KAI_PALETTE, bankKaiMomentTones } from './kai-klok-palette';
import { useKaiOrb } from './useKaiOrb';
import type { KaiPulseMotion } from './kai-klok-motion';
import './kai-klok.css';

const number = new Intl.NumberFormat('en-US');
const localTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'long' });

function momentStyle(moment: KaiKlokMoment): CSSProperties {
  const tones = bankKaiMomentTones(moment, 'light');
  return { '--kai-phase': tones.phase, '--kai-day': tones.day, '--kai-month': tones.month } as CSSProperties;
}

function KaiDate({ moment }: { moment: KaiKlokMoment }) {
  return <span className="kai-date"><span className="kai-date-day">D{moment.day}</span><i>/</i><span className="kai-date-month">M{moment.month}</span><i>/</i><span>Y{moment.year}</span></span>;
}

function KaiFace({ moment, anchorIso, reference, visible, revision, readMotion }: { moment: KaiKlokMoment; anchorIso: string; reference: 'local' | 'greenwich'; visible: boolean; revision: number; readMotion: () => KaiPulseMotion }) {
  const face = projectCanonicalKaiFace(moment.pulse, anchorIso);
  const tones = bankKaiMomentTones(moment, 'dark');
  const dial = useRef<HTMLDivElement>(null);
  useKaiOrb(dial, moment.pulse, visible, revision, readMotion);
  return <div className="kai-face-presentation">
    <div ref={dial} className="kai-canonical-face" aria-hidden="true" style={{ '--kai-phase': tones.phase, '--kai-day': tones.day, '--kai-month': tones.month } as CSSProperties}><CanonicalKaiKlock {...face} /><span className="kai-cadence-breath" /><span key={moment.pulse} className="kai-face-accent" /></div>
    <p className="kai-face-key"><span><i className="kai-solar-key" style={{ background: face.solarNeedleColor }} />☀ {reference === 'local' ? 'Local' : 'Greenwich'} sunrise</span><span><i className="kai-eternal-key" style={{ borderColor: BANK_KAI_SURFACE_COLORS.eternalStroke }} />Eternal Kai</span></p>
    <dl className="kai-face-readouts">
      <div><dt>Solar<small>beat · step</small></dt><dd className="kai-solar-coordinate" style={{ color: BANK_KAI_SURFACE_COLORS.readout }}>{face.solarSpiralStepString}</dd></div>
      <div><dt>Eternal fill<small>of current step</small></dt><dd style={{ color: face.canonical.beatColors[face.canonical.solarBeatIndex] }}>{(face.canonical.eternalStepFraction * 100).toFixed(1)}%</dd></div>
      <div><dt>Today<small>eternal pulses</small></dt><dd style={{ color: BANK_KAI_SURFACE_COLORS.readout }}>{number.format(face.canonical.eternalDayPulse)}</dd></div>
      <div className="kai-face-global"><dt>☤KAI</dt><dd style={{ color: BANK_KAI_SURFACE_COLORS.eternalReadout }} data-kai-eternal-pulse>{number.format(moment.pulse)}</dd></div>
    </dl>
    <div className="kai-face-arcs" aria-label="Solar arks">{KAI_PHASES.map((phase, i) => <span key={phase.name} aria-current={Math.floor(face.canonical.solarBeatIndex / 6) === i ? 'true' : undefined}><i style={{ background: BANK_KAI_PALETTE.dark.phases[i] }} aria-hidden="true" />{phase.name}</span>)}</div>
  </div>;
}

export function KaiKlok({ active = true }: { active?: boolean }) {
  const { pulse, boundary, visible, revision, readPulseMotion } = useKaiKlok(active), moment = projectKaiKlok(pulse);
  const sunrise = useKaiSunrise(pulse);
  const lightTones = bankKaiMomentTones(moment, 'light');
  const sunriseStatus = sunrise.preference === 'greenwich' ? 'Greenwich sunrise selected.'
    : sunrise.status === 'pending' ? `Waiting for location. Using ${sunrise.reference === 'local' ? 'your current local' : 'Greenwich'} sunrise.`
    : sunrise.status === 'denied' ? 'Location was not allowed. Using Greenwich sunrise.'
    : sunrise.status === 'unavailable' ? 'Location is unavailable. Using Greenwich sunrise.'
    : sunrise.unavailable ? 'Local sunrise is unavailable for this date. Using Greenwich sunrise.'
    : sunrise.reference === 'local' ? `Calculated local sunrise · ${localTime.format(new Date(sunrise.anchorIso))}`
    : 'Local is preferred. Using Greenwich sunrise until you choose your location.';
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
  return <div className="kai-klok" data-kai-boundary={boundary} data-kai-visible={active && visible} ref={container} style={momentStyle(moment)} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); dismiss(); } }}>
    <button ref={trigger} className="kai-header-button" aria-label="Explain this Kai moment" aria-description={`${moment.time}, day ${moment.day}, month ${moment.month}, year ${moment.year}, eternal KAI ${number.format(pulse)}`} aria-expanded={open} aria-controls={open ? panelId : undefined} aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>
      <span className="kai-header-coordinate"><strong>{moment.time}</strong><KaiDate moment={moment} /></span>
      <span className="kai-header-meta"><span className="kai-header-pulse">☤ {number.format(pulse)}</span></span><span key={pulse} className="kai-header-accent" aria-hidden="true" />
    </button>
    {open && <div className="kai-popover" id={panelId} role="dialog" aria-labelledby={titleId}>
      <div className="kai-popover-heading"><div><span className="kai-eyebrow">THE LIVING COORDINATE</span><h2 id={titleId}>Kai-Klok KKSv1</h2></div><button ref={close} className="kai-close" aria-label="Close Kai Klok" onClick={() => dismiss()}><X size={19} /></button></div>
      <p className="kai-introduction">One precise position in a continuous sequence. The Kai Klok is a deterministic temporal indexing system: every moment can be recomputed, compared, and read independently.</p>
      <div className="kai-moment-layout"><KaiFace moment={moment} anchorIso={sunrise.anchorIso} reference={sunrise.reference} visible={active && visible} revision={revision} readMotion={readPulseMotion} /><div className="kai-moment-context">
        <span className="kai-eyebrow">THIS MOMENT</span>
        <h3>{moment.weekday}<span>{moment.monthName} · Y{moment.year}</span></h3>
        <div className="kai-moment-identity"><span style={{ background: lightTones.day }} aria-hidden="true" /><span>Day {moment.day} of 42<small>{moment.dayColorName}</small></span><span style={{ background: moment.month === 8 ? BANK_KAI_PALETTE.light.monthPrism : lightTones.month }} aria-hidden="true" /><span>Month {moment.month} of 8<small>{moment.monthColorName}</small></span></div>
        <p className="kai-week">Week {moment.week} · {moment.weekName}</p>
        <dl className="kai-units"><div><dt>BEAT</dt><dd>{String(moment.beat).padStart(2, '0')}<span>/ 36 beats per day</span></dd></div><div><dt>STEP</dt><dd>{String(moment.step).padStart(2, '0')}<span>/ 44 steps per beat</span></dd></div><div><dt>PULSE</dt><dd>{String(moment.withinStep).padStart(2, '0')}<span>/ 11 pulses per step</span></dd></div></dl>
      </div></div>
      <section className="kai-sunrise-controls" aria-label="Solar sunrise reference"><div className="kai-sunrise-choice"><span>Solar reference</span><div role="group" aria-label="Choose solar sunrise reference"><button data-sunrise-reference="local" aria-pressed={sunrise.preference === 'local'} onClick={() => sunrise.setPreference('local')}>Local</button><button data-sunrise-reference="greenwich" aria-pressed={sunrise.preference === 'greenwich'} onClick={() => sunrise.setPreference('greenwich')}>Greenwich</button></div></div><p className="kai-sunrise-status" role="status">{sunriseStatus}</p>{sunrise.preference === 'local' && <div className="kai-sunrise-actions"><button className="kai-use-sunrise" disabled={sunrise.status === 'pending'} onClick={sunrise.request}>{sunrise.status === 'pending' ? 'Locating…' : sunrise.hasLocation ? 'Update location' : 'Use my sunrise'}</button>{sunrise.hasLocation && <button className="kai-clear-sunrise" onClick={sunrise.clear}>Clear location</button>}</div>}<p className="kai-sunrise-privacy">Computed on this device. Bankeiz does not send or save your coordinates. Only the solar reference changes.</p></section>
      <p className="kai-local-time"><span>Local Chronos</span><time dateTime={new Date(epochMs).toISOString()}>{localTime.format(epochMs)}</time></p>
      <div className="kai-explanation"><p><strong>A precise frequency.</strong><span className="kai-exact-formula">f = 1 / (3 + √5) Hz</span><span className="kai-formula-approx">≈ 0.190983005625 cycles per second</span>Its reciprocal period is exactly 3 + √5 seconds, approximately 5.2360679775 seconds per pulse.</p><p><strong>A readable state.</strong> Beat, step, and pulse start at zero. Day and month start at one; the first Kai year is Y0. The eternal KAI number continues across them all. Color identifies the phase, day, and month.</p></div>
      <details className="kai-technical"><summary>Read the system in detail<span aria-hidden="true">+</span></summary><div>
        <h3>Exact structure</h3><p>Six days form a week. Seven weeks form a 42-day month. Eight months form a 336-day year. These fixed Kai boundaries are independent of civil midnight and Gregorian month lengths.</p>
        <p>KKSv1 uses integer micro-pulses: 1 pulse = 1,000,000 micro-pulses. Each day closes at exactly 17,491.270421 pulses and projects onto the 36 × 44 × 11 display lattice. The final field is the pulse position within that projected step.</p>
        <h3>The seven-week month</h3><p>Each of seven weeks contains the same six Kai days. Seven equal six-day weeks form a 42-day month; eight months form a 336-day year. Week names, meanings, and colors identify these fixed positions.</p>
        <ol className="kai-week-legend">{KAI_WEEKS.map((week, i) => <li key={week.name} aria-current={moment.week === i + 1 ? 'date' : undefined}><i style={{ background: BANK_KAI_PALETTE.light.weeks[i] }} aria-hidden="true" /><div><strong>W{i + 1} · {week.name}{'alias' in week ? <span className="kai-week-alias"> / {week.alias}</span> : null}</strong><span className="kai-week-range">D{i * 6 + 1}–D{(i + 1) * 6} · {week.colorName}</span><p>{week.definition}</p></div></li>)}</ol>
        <h3>Moment colors</h3><p>The phase colors follow six segments of six beats. Day and month colors identify their own calendar positions.</p>
        <div className="kai-color-key">{KAI_PHASES.map((phase, i) => <span key={phase.name}><i style={{ background: BANK_KAI_PALETTE.light.phases[i] }} /><span>{phase.name}<small>{String(i * 6).padStart(2, '0')}–{String(i * 6 + 5).padStart(2, '0')}</small></span></span>)}</div>
        <h3>Days</h3><div className="kai-color-key">{KAI_DAYS.map((day, i) => <span key={day.name}><i style={{ background: BANK_KAI_PALETTE.light.days[i] }} /><span>{day.name}<small>{day.colorName}</small></span></span>)}</div>
        <h3>Months</h3><div className="kai-color-key">{KAI_MONTHS.map((month, i) => <span key={month.name}><i style={{ background: i === 7 ? BANK_KAI_PALETTE.light.monthPrism : BANK_KAI_PALETTE.light.months[i] }} /><span>M{i + 1} · {month.name}<small>{month.colorName}</small></span></span>)}</div>
        <h3>Local display, carried proof</h3><p>This live display runs locally from the canonical Kai bridge, anchored at {new Date(GENESIS_TS).toISOString()}. Local Chronos is a timezone-formatted projection of the displayed whole-pulse boundary.</p><p>A sealed record carries its own exact Kai coordinate and predecessor bindings. This live display provides orientation; the sealed source remains the authority for recorded activity.</p>
        <p>The original Kai Klok face retains two references. Its colored ☀ hand projects the same Kai coordinate from {sunrise.reference === 'local' ? 'your calculated local sunrise' : 'the native Greenwich sunrise anchor'}. Local sunrise uses the canonical solar calculation with your chosen location; Greenwich is the fallback whenever local sunrise is unavailable. This is a sunrise reference, independent of a timezone offset. Its pale outlined hand, central beat, step and pulse, calendar, and eternal pulse use the native eternal coordinate. Each hand shows its own step number and fills through that step before resetting at its next boundary. The two hands share one sampled Kai moment.</p>
        <p className="kai-source-reference"><a href="https://github.com/kojibai/klok" target="_blank" rel="noopener noreferrer">Kai Klok technical reference <span aria-hidden="true">↗</span></a></p>
      </div></details>
      <div className="kai-popover-footer"><span className="kai-living-dot" />Computed on this device · available offline</div>
    </div>}
  </div>;
}
