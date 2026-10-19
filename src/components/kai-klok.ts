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
// Native WEEK_SPIRALS names/definitions; week colors carried by Mind's guide
// from the frontend ETERNAL_WEEK_DESCRIPTIONS. Week four has a frontend alias.
export const KAI_WEEKS = [
  { name: 'Awakening Flame', definition: 'Root fire of ignition, will, resurrektion', color: '#DC143C', colorName: 'Crimson red' },
  { name: 'Flowing Heart', definition: 'Emotional waters, intimasy, surrender', color: '#FF9F24', colorName: 'Amber orange' },
  { name: 'Radiant Will', definition: 'Solar klarity, aligned konfidence, embodiment', color: '#FFD700', colorName: 'Radiant gold' },
  { name: 'Harmonic Voice', definition: 'Spoken truth, vibration, koherense in sound', color: '#0F52BA', colorName: 'Sapphire blue', alias: 'Harmonik Voh' },
  { name: 'Inner Mirror', definition: 'Reflektion, purifikation, self-seeing', color: '#4B0082', colorName: 'Deep indigo' },
  { name: 'Dreamfire Memory', definition: 'Lusid vision, divine memory, encoded light', color: 'linear-gradient(135deg,#A855F7,#CBD5E1)', colorName: 'Violet flame and soft silver' },
  { name: 'Krowned Light', definition: 'Integration, sovereignty, harmonik ascension', color: 'linear-gradient(135deg,#FFFFFF,#FFD700,#F8F5E8)', colorName: 'White-gold prism' },
] as const;
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
    week, weekName: KAI_WEEKS[week - 1].name,
    beatProgress: moment.beat / BEATS_DAY,
    stepProgress: moment.stepIndex / STEPS_BEAT,
    pulseProgress: withinStep / Number(PULSES_PER_STEP_MICRO / 1_000_000n),
  };
}

export type KaiKlokMoment = ReturnType<typeof projectKaiKlok>;
