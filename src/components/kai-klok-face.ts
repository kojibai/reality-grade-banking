import {
  BASE_DAY_MICRO, BEATS_DAY, N_DAY_MICRO,
  latticeFromMicroPulses, momentFromPulse,
} from '../../native/receiz/app/utils/kai_pulse';
import { projectKaiKlok, type KaiKlokMoment } from './kai-klok';
import { BANK_KAI_PALETTE, bankKaiBeatTone, bankKaiMomentTones } from './kai-klok-palette';
import type { KaiKlockProps } from './kai-klok/CanonicalKaiKlock';

export type KaiBoundary = 'none' | 'pulse' | 'step' | 'beat';

/** Classify native state changes. Presentation never advances the Kai state. */
export function kaiBoundary(previous: number, next: number): KaiBoundary {
  if (next <= previous) return 'none';
  const before = momentFromPulse(previous), after = momentFromPulse(next);
  if (before.beat !== after.beat) return 'beat';
  if (before.stepIndex !== after.stepIndex) return 'step';
  return 'pulse';
}

/** One controlled native eternal coordinate; presentation never creates an anchor. */
export function projectCanonicalKaiFace(pulse: number, moment: KaiKlokMoment = projectKaiKlok(pulse)): KaiKlockProps & { canonical: NonNullable<KaiKlockProps['canonical']> } {
  if (moment.pulse !== pulse) throw new TypeError('KAI_KLOK_DISPLAY_COORDINATE_MISMATCH');
  const exact = momentFromPulse(pulse);
  const micro = BigInt(pulse) * 1_000_000n;
  const dayMicro = micro % N_DAY_MICRO;
  const lattice = latticeFromMicroPulses(micro);
  const phaseColors = BANK_KAI_PALETTE.dark.phases;
  return {
    hue: bankKaiMomentTones(moment, 'dark').phase,
    kaiPulseEternal: pulse,
    harmonicDayPercent: Number(dayMicro) / Number(N_DAY_MICRO) * 100,
    microCyclePercent: lattice.percentIntoStep * 100,
    dayLabel: moment.weekday, monthLabel: moment.monthName, monthDay: moment.day,
    eternalBeatIndex: exact.beat, eternalStepIndex: exact.stepIndex,
    canonical: {
      eternalDayPulse: Number(dayMicro / 1_000_000n),
      eternalBeatFraction: exact.stepPctAcrossBeat,
      eternalStepFraction: lattice.percentIntoStep,
      monthIndex: moment.month,
      phaseColors,
      beatColors: Array.from({ length: BEATS_DAY }, (_, i) => bankKaiBeatTone(i)),
      gridMicro: (dayMicro * BASE_DAY_MICRO / N_DAY_MICRO).toString(),
      coordinate: moment.time,
    },
  };
}
