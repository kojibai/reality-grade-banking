import {
  BASE_DAY_MICRO, BEATS_DAY, DAYS_PER_MONTH, DAYS_PER_WEEK, DAYS_PER_YEAR,
  MONTHS_PER_YEAR, N_DAY_MICRO, PULSES_PER_STEP_MICRO, STEPS_BEAT,
  momentFromPulse,
} from '../../native/receiz/app/utils/kai_pulse';

// Display identities carried from Receiz Mind's kai-projection.js / kai-guide.js.
// Phase colors originate in SigilModal; day colors in KaiStatus. These are
// presentation tokens, never a second time engine or proof authority.
export const KAI_DAYS = [
  { name: 'Solhara', color: '#ff3b3b', colorName: 'Red' },
  { name: 'Aquaris', color: '#ff8a3d', colorName: 'Orange' },
  { name: 'Flamora', color: '#ffd54a', colorName: 'Yellow' },
  { name: 'Verdari', color: '#3dff9a', colorName: 'Green' },
  { name: 'Sonari', color: '#46d3ff', colorName: 'Cyan' },
  { name: 'Kaelith', color: '#c18bff', colorName: 'Violet' },
] as const;
export const KAI_MONTHS = [
  { name: 'Aethon', color: '#FF0000', colorName: 'Krimson Red' },
  { name: 'Virelai', color: '#FF7F00', colorName: 'Orange Gold' },
  { name: 'Solari', color: '#FFD700', colorName: 'Golden Yellow' },
  { name: 'Amarin', color: '#32CD32', colorName: 'Emerald Green' },
  { name: 'Kaelus', color: '#1E90FF', colorName: 'Sky Blue' },
  { name: 'Umbriel', color: '#4B0082', colorName: 'Indigo Violet' },
  { name: 'Noktura', color: '#C9D1E6', colorName: 'Lunar Platinum' },
  { name: 'Liora', color: '#00C2FF', colorName: 'Prismatik Aurora' },
] as const;
export const KAI_PHASES = [
  { name: 'Initialization', color: '#ff0024' },
  { name: 'Integration', color: '#ff6f00' },
  { name: 'Harmonization', color: '#ffd600' },
  { name: 'Reflection', color: '#00c853' },
  { name: 'Purification', color: '#00b0ff' },
  { name: 'Synthesis', color: '#c186ff' },
] as const;
const WEEK_NAMES = ['Awakening Flame', 'Flowing Heart', 'Radiant Will', 'Harmonic Voice', 'Inner Mirror', 'Dreamfire Memory', 'Krowned Light'] as const;
const LIORA_PRISM = 'linear-gradient(135deg,#00C2FF 0%,#A855F7 48%,#F59E0B 100%)';
const pad = (value: number) => String(value).padStart(2, '0');

/** Same whole-pulse display projection as Mind, over the pinned native engine. */
export function projectKaiKlok(pulse: number) {
  if (!Number.isSafeInteger(pulse) || pulse < 0) throw new TypeError('KAI_KLOK_DISPLAY_PULSE_INVALID');
  const moment = momentFromPulse(pulse), micro = BigInt(pulse) * 1_000_000n;
  const dayIndex = micro / N_DAY_MICRO;
  const day = Number(dayIndex % BigInt(DAYS_PER_MONTH)) + 1;
  const monthIndex = Number(dayIndex / BigInt(DAYS_PER_MONTH) % BigInt(MONTHS_PER_YEAR));
  const year = String(dayIndex / BigInt(DAYS_PER_YEAR));
  const grid = micro % N_DAY_MICRO * BASE_DAY_MICRO / N_DAY_MICRO;
  const withinStep = Number(grid % PULSES_PER_STEP_MICRO / 1_000_000n);
  const dayIdentity = KAI_DAYS.find(day => day.name === moment.weekday)!;
  const monthIdentity = KAI_MONTHS[monthIndex];
  const phase = KAI_PHASES[Math.floor(moment.beat / (BEATS_DAY / KAI_PHASES.length))];
  const week = Math.floor((day - 1) / DAYS_PER_WEEK) + 1;
  return {
    pulse, beat: moment.beat, step: moment.stepIndex, withinStep,
    time: [moment.beat, moment.stepIndex, withinStep].map(pad).join(':'),
    day, month: monthIndex + 1, year, weekday: moment.weekday,
    monthName: monthIdentity.name, phase: phase.name,
    phaseColor: phase.color, dayColor: dayIdentity.color, dayColorName: dayIdentity.colorName,
    monthColor: monthIdentity.color, monthColorName: monthIdentity.colorName,
    monthSwatch: monthIndex === MONTHS_PER_YEAR - 1 ? LIORA_PRISM : monthIdentity.color,
    week, weekName: WEEK_NAMES[week - 1],
    beatProgress: moment.beat / BEATS_DAY,
    stepProgress: moment.stepIndex / STEPS_BEAT,
    pulseProgress: withinStep / Number(PULSES_PER_STEP_MICRO / 1_000_000n),
  };
}

export type KaiKlokMoment = ReturnType<typeof projectKaiKlok>;
