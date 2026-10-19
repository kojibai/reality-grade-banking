import {
  BASE_DAY_MICRO, BEATS_DAY, N_DAY_MICRO, STEPS_BEAT,
  buildKaiKlockResponseFromPulseSync, latticeFromMicroPulses,
  microPulsesSinceGenesis, momentFromPulse,
} from '../../native/receiz/app/utils/kai_pulse';
import { projectKaiKlok } from './kai-klok';
import { BANK_KAI_PALETTE, bankKaiBeatTone, bankKaiMomentTones } from './kai-klok-palette';
import { kaiNeedleProjection, type KaiKlockProps } from './kai-klok/CanonicalKaiKlock';

export type KaiBoundary = 'none' | 'pulse' | 'step' | 'beat';

/** Classify native state changes. Presentation never advances the Kai state. */
export function kaiBoundary(previous: number, next: number): KaiBoundary {
  if (next <= previous) return 'none';
  const before = momentFromPulse(previous), after = momentFromPulse(next);
  if (before.beat !== after.beat) return 'beat';
  if (before.stepIndex !== after.stepIndex) return 'step';
  return 'pulse';
}

/**
 * A controlled view of the one native Kai coordinate. The ☀ hand projects the
 * same coordinate relative to the native Greenwich sunrise anchor. It neither
 * samples another clock nor changes the eternal coordinate or its ordering.
 */
export function projectCanonicalKaiFace(pulse: number, solarAnchorIso?: string): KaiKlockProps & { canonical: NonNullable<KaiKlockProps['canonical']>; solarNeedleColor: string } {
  const moment = projectKaiKlok(pulse), exact = momentFromPulse(pulse);
  const micro = BigInt(pulse) * 1_000_000n;
  const dayMicro = micro % N_DAY_MICRO;
  const lattice = latticeFromMicroPulses(micro);
  const nativeView = buildKaiKlockResponseFromPulseSync(BigInt(pulse));
  const sunrise = solarAnchorIso ?? nativeView.solar_day_start_iso;
  const solarMicro = micro - microPulsesSinceGenesis(new Date(sunrise));
  const solar = latticeFromMicroPulses(solarMicro);
  const rotation = ((solar.beat + .5) / BEATS_DAY) * 360;
  const phaseColors = BANK_KAI_PALETTE.dark.phases;
  return {
    hue: bankKaiMomentTones(moment, 'dark').phase,
    pulse: Number(solarMicro) / 1_000_000,
    kaiPulseEternal: pulse,
    harmonicDayPercent: Number(dayMicro) / Number(N_DAY_MICRO) * 100,
    microCyclePercent: lattice.percentIntoStep * 100,
    dayLabel: moment.weekday, monthLabel: moment.monthName, monthDay: moment.day,
    rotationOverride: rotation,
    solarNeedleColor: kaiNeedleProjection(rotation, phaseColors).needleColor,
    solarSpiralStepString: `${solar.beat}:${String(solar.stepIndex).padStart(2, '0')}`,
    solarSpiralStep: { beatIndex: solar.beat, stepIndex: solar.stepIndex, stepsPerBeat: STEPS_BEAT, percentIntoStep: solar.percentIntoStep * 100 },
    eternalBeatIndex: exact.beat, eternalStepIndex: exact.stepIndex,
    canonical: {
      eternalDayPulse: Number(dayMicro / 1_000_000n),
      eternalBeatFraction: exact.stepPctAcrossBeat,
      eternalStepFraction: lattice.percentIntoStep,
      monthIndex: moment.month,
      solarBeatIndex: solar.beat,
      solarStepFraction: solar.percentIntoStep,
      phaseColors,
      beatColors: Array.from({ length: BEATS_DAY }, (_, i) => bankKaiBeatTone(i)),
      solarAnchorIso: sunrise,
      gridMicro: (dayMicro * BASE_DAY_MICRO / N_DAY_MICRO).toString(),
      coordinate: moment.time,
    },
  };
}
