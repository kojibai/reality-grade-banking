// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import CanonicalKaiKlock, { BANK_KAI_SURFACE_COLORS } from '../src/components/kai-klok/CanonicalKaiKlock';
import { projectCanonicalKaiFace } from '../src/components/kai-klok-face';
import provenance from '../src/components/kai-klok/provenance.json';
import { KAI_DAYS, KAI_MONTHS, KAI_PHASES } from '../src/components/kai-klok';
import { N_DAY_MICRO } from '../native/receiz/app/utils/kai_pulse';
import { BANK_KAI_PALETTE, bankKaiBeatTone } from '../src/components/kai-klok-palette';

it('records the exact upstream source while permitting authorized presentation refinements', () => {
  expect(provenance.repository).toBe('https://github.com/kojibai/kai-klok');
  expect(provenance.sourceSha256).toBe('78b329b58532214d3e4e7fb334f4f8cbe301afa7cf26553d88e95a47835ae31b');
});

it('uses authoritative day/month/ark identities and the authorized Bankeiz material accents', () => {
  expect(KAI_DAYS.map(day => day.color)).toEqual(['#ff3b3b', '#ff8a3d', '#ffd54a', '#3dff9a', '#46d3ff', '#c18bff']);
  expect(KAI_PHASES.map(phase => phase.color)).toEqual(['#ff0024', '#ff6f00', '#ffd600', '#00c853', '#00b0ff', '#c186ff']);
  expect(KAI_MONTHS.map(month => month.color)).toEqual(['#FF0000', '#FF7F00', '#FFD700', '#32CD32', '#1E90FF', '#4B0082', '#C9D1E6', '#00C2FF']);
  const css = readFileSync(resolve('src/components/kai-klok.css'), 'utf8');
  for (const [i, arc] of ['ignition', 'integration', 'harmonization', 'reflektion', 'purifikation', 'dream'].entries()) expect(css).toContain(`.arc-${arc} { --arc: ${BANK_KAI_PALETTE.dark.phases[i]}; }`);
  expect(css).toContain('.center-day, .kai-klok .kai-canonical-face .day-of-month[class*=" day-"] { fill: var(--kai-day); }');
  expect(css).toContain('.center-month, .kai-klok .kai-canonical-face .day-of-month[class*=" month-"] { fill: var(--kai-month); }');
  expect(css).toContain('.kai-header-coordinate > strong { color: color-mix(in srgb, var(--kai-phase) 80%, #172b45);');
  expect(css).toContain('.kai-header-button .kai-date-day { color: color-mix(in srgb, var(--kai-day) 80%, #172b45);');
  expect(css).toContain('.kai-header-button .kai-date-month { color: color-mix(in srgb, var(--kai-month) 80%, #172b45);');
  const source = readFileSync(resolve('src/components/kai-klok/CanonicalKaiKlock.tsx'), 'utf8');
  expect(source).toContain('canonical?.beatColors[i] ?? `hsl(${cf * 360},100%,50%)`');
  expect(BANK_KAI_SURFACE_COLORS).toMatchObject({ coordinate: '#a3c7c0', readout: '#94bcb5', eternalStroke: '#9cb9bc', eternalFill: '#8fb0b5' });
  expect(source).toContain('const ETHERIK_FILL   = BANK_KAI_SURFACE_COLORS.eternalFill');
  expect(source).toContain('const ETHERIK_STROKE = BANK_KAI_SURFACE_COLORS.eternalStroke');
  expect(css).not.toMatch(/eternal-hand(?:-fill|-tip|-label-digit)?\s*\{[^}]*fill:\s*#[0-9a-f]/i);
  for (let day = 0; day < 6; day++) {
    const pulse = Number((BigInt(day) * N_DAY_MICRO + 999_999n) / 1_000_000n);
    const face = projectCanonicalKaiFace(pulse);
    expect(face.dayLabel).toBe(KAI_DAYS[day].name);
    expect(face.canonical.phaseColors).toEqual(BANK_KAI_PALETTE.dark.phases);
  }
  expect(css).toContain('.kai-svg text { font-family: inherit; font-variant-numeric: tabular-nums;');
  const face = projectCanonicalKaiFace(14_717_707);
  expect(face.canonical.beatColors).toEqual(Array.from({ length: 36 }, (_, i) => bankKaiBeatTone(i)));
  for (const color of face.canonical.beatColors) expect(color).toMatch(/,35%,62%\)$/);
});

it('fills the single eternal hand through its native step and resets at its boundary', () => {
  const render = (pulse: number) => {
    const props = projectCanonicalKaiFace(pulse);
    const parsed = new DOMParser().parseFromString(renderToStaticMarkup(<CanonicalKaiKlock {...props} />), 'text/html');
    const eternal = Number(parsed.querySelector('.eternal-hand-fill')?.getAttribute('height'));
    const eternalTrack = Number(parsed.querySelector('.eternal-hand')?.getAttribute('height'));
    expect(eternalTrack).toBeGreaterThan(20);
    expect(parsed.querySelectorAll('.eternal-hand-group')).toHaveLength(1);
    expect(parsed.querySelector('.needle, .solar-hand-fill, .solar-hand-label-wrap')).toBeNull();
    expect(eternal).toBeCloseTo(eternalTrack * props.canonical.eternalStepFraction, 10);
    expect([...parsed.querySelectorAll('.eternal-hand-label-digit')].map(node => node.textContent).join('')).toBe(String(props.eternalStepIndex).padStart(2, '0'));
    return { eternal: eternal / eternalTrack, props };
  };
  const start = render(0), middle = render(6), end = render(11), reset = render(12);
  expect(start.eternal).toBe(0);
  expect(middle.eternal).toBeGreaterThan(.48); expect(middle.eternal).toBeLessThan(.6);
  expect(end.eternal).toBeGreaterThan(.95);
  expect(reset.eternal).toBeLessThan(.12);

});

it('renders the refined eternal face at a controlled native coordinate', () => {
  const props = projectCanonicalKaiFace(14_717_707);
  const parsed = new DOMParser().parseFromString(renderToStaticMarkup(<CanonicalKaiKlock {...props} />), 'text/html');
  expect(parsed.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 120 120');
  expect([...parsed.querySelectorAll('.beat-number')].map(node => node.textContent)).toEqual(Array.from({ length: 36 }, (_, i) => String(i)));
  expect(parsed.querySelector('.center-pulse')?.textContent).toBe('15:23:06');
  expect(parsed.querySelector('.center-coordinate-label')?.textContent).toBe('BEAT · STEP · PULSE');
  expect(parsed.querySelector('.center-day')?.textContent).toBe('Aquaris');
  expect(parsed.querySelector('.center-month')?.textContent).toBe('Kaelus');
  expect(parsed.querySelector('.center-day-number')?.textContent).toBe('D2');
  expect(parsed.querySelector('.center-month-number')?.textContent).toBe('M5');
  const css = readFileSync(resolve('src/components/kai-klok.css'), 'utf8');
  expect(css).toContain('.center-day-number { fill: var(--kai-day); }');
  expect(css).toContain('.center-month-number { fill: var(--kai-month); }');
  expect(parsed.querySelector('.eternal-pulse')?.textContent).toBe('14,717,707');
  expect(parsed.querySelector('.center-sub')?.textContent).toBe(new Intl.NumberFormat('en-US').format(props.canonical.eternalDayPulse));
  expect(parsed.querySelector('.needle')).toBeNull();
  expect(parsed.querySelector('.eternal-hand')?.getAttribute('width')).toBe('1.6');
  expect(parsed.querySelector('.inner-halo')?.getAttribute('r')).toBe('32');
  expect(parsed.querySelectorAll('.arc-label')).toHaveLength(6);
  expect(parsed.querySelectorAll('.solar-hand-label-digit')).toHaveLength(0);
  expect(parsed.querySelectorAll('.eternal-hand-label-digit')).toHaveLength(2);
});

it('renders a continuous native day-progress sweep instead of the source decorative dash pattern', () => {
  const props = projectCanonicalKaiFace(14_717_707);
  const parsed = new DOMParser().parseFromString(renderToStaticMarkup(<CanonicalKaiKlock {...props} />), 'text/html');
  const ring = parsed.querySelector('.day-progress')!;
  const style = ring.getAttribute('style')!;
  const circumference = Number(style.match(/stroke-dasharray:([.\d]+)/)?.[1]);
  const offset = Number(style.match(/stroke-dashoffset:([.\d]+)/)?.[1]);
  expect(circumference).toBeCloseTo(2 * Math.PI * Number(ring.getAttribute('r')), 10);
  expect(offset / circumference).toBeCloseTo(1 - props.harmonicDayPercent / 100, 10);
  expect(parsed.querySelector('.day-progress-track')?.getAttribute('r')).toBe(ring.getAttribute('r'));
});

it('restores the original compact header placement/dimensions and keeps dark material confined to the face', () => {
  const css = readFileSync(resolve('src/components/kai-klok.css'), 'utf8');
  expect(css).toContain('margin-left: auto; margin-right: auto;');
  expect(css).toContain('gap: 5px 10px; width: 240px; max-width: 100%; min-height: 44px; padding: 7px 12px;');
  expect(css).toContain('.kai-header-coordinate, .kai-header-meta { display: flex; justify-content: space-between; align-items: center; gap: 14px;');
  expect(css).toContain('grid-template-columns: max-content max-content; justify-content: center;');
  expect(css).toContain('.kai-header-coordinate { display: contents; }');
  expect(css).toContain('.kai-header-coordinate > strong { grid-column: 1; grid-row: 1 / span 2; align-self: center; }');
  expect(css).toContain('.kai-header-button .kai-date { grid-column: 2; grid-row: 1; justify-self: end; }');
  expect(css).toContain('.kai-header-meta { grid-column: 2; grid-row: 2; align-self: center; }');
  expect(css).toContain('width: 266px; padding: 9px 14px; min-height: 49px;');
  expect(css).toContain('width: 220px; padding: 7px 10px;');
  expect(css).toContain('width: 198px; padding-left: 9px; padding-right: 9px;');
  expect(css).toContain('background: transparent; border: 1px solid transparent; border-radius: 9px; box-shadow: none;');
  expect(css).toContain('.kai-header-button:hover, .kai-header-button[aria-expanded=true] { background: transparent; box-shadow: none; }');
  expect(css).toContain('.beat-number { font-size: 5.2px;');
  expect(css).toContain('.center-pulse { font-size: 12.8px;');
  expect(css).toContain('background: #fcfbf8;');
});

it('keeps pulse, step and beat accents restrained and ordered, with a reduced-motion escape', () => {
  const css = readFileSync(resolve('src/components/kai-klok.css'), 'utf8');
  const peak = (boundary: string) => Number(css.match(new RegExp(`data-kai-boundary=${boundary}\\]\\s*\\{[^}]*--kai-accent-peak:\\s*([.\\d]+)`))?.[1]);
  expect(peak('pulse')).toBeGreaterThan(0);
  expect(peak('pulse')).toBeLessThan(peak('step'));
  expect(peak('step')).toBeLessThan(peak('beat'));
  expect(peak('beat')).toBeLessThanOrEqual(.08);
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  expect(css).toContain('animation: none !important');
  expect(css).toContain('animation-play-state: paused !important');
});
