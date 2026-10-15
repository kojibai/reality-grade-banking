import { microPulsesSinceGenesisEpochMsV124 } from "./v124KaiBridge.generated.js";

export type ReceizKaiNow = Readonly<{
  pulse: number;
  uPulse: number;
}>;

export type ReceizKaiSealedMoment = Readonly<{
  pulse: number;
  beat: number;
  stepIndex: number;
  stepPctAcrossBeat: number;
  weekday: "Solhara" | "Aquaris" | "Flamora" | "Verdari" | "Sonari" | "Kaelith";
  chakraDay: "Root" | "Sacral" | "Solar Plexus" | "Heart" | "Throat" | "Crown";
  authority: Readonly<{
    deviceClockIsAuthority: false;
    strongerTruth: "sealed-kai-creation-pulse";
  }>;
}>;

export type ReceizKaiSealedUpulseMoment = Readonly<{
  uPulse: number;
  pulse: number;
  beat: number;
  stepIndex: number;
  stepPctAcrossBeat: number;
  weekday: "Solhara" | "Aquaris" | "Flamora" | "Verdari" | "Sonari" | "Kaelith";
  chakraDay: "Root" | "Sacral" | "Solar Plexus" | "Heart" | "Throat" | "Crown";
  authority: Readonly<{
    deviceClockIsAuthority: false;
    strongerTruth: "sealed-kai-creation-upulse";
  }>;
}>;

const N_DAY_MICRO = 17_491_270_421n;
const BASE_DAY_MICRO = 17_424_000_000n;
const PULSES_PER_STEP_MICRO = 11_000_000n;
const PULSES_PER_BEAT_MICRO = 484_000_000n;
const STEPS_PER_BEAT = 44;
const WEEKDAYS = Object.freeze(["Solhara", "Aquaris", "Flamora", "Verdari", "Sonari", "Kaelith"] as const);
const CHAKRA_DAYS = Object.freeze(["Root", "Sacral", "Solar Plexus", "Heart", "Throat", "Crown"] as const);

const modE = (value: bigint, modulus: bigint): bigint => {
  const remainder = value % modulus;
  return remainder >= 0n ? remainder : remainder + modulus;
};

const floorDivE = (value: bigint, divisor: bigint): bigint => {
  const quotient = value / divisor;
  const remainder = value % divisor;
  return remainder === 0n || value >= 0n ? quotient : quotient - 1n;
};

function fail(code: string): never {
  throw new TypeError(code);
}

let retainedLiveKaiUpulseHead: bigint | null = null;

/** @internal Test isolation only; not exported by the package entry point. */
export function __resetReceizKaiNowHeadForTests(): void {
  retainedLiveKaiUpulseHead = null;
}

export function receizKaiNow(): ReceizKaiNow {
  const epochMs = Date.now();
  if (!Number.isFinite(epochMs) || !Number.isSafeInteger(epochMs)) {
    return fail("V124_KAI_NOW_SAMPLE_INVALID");
  }

  const sampledMicroPulses = microPulsesSinceGenesisEpochMsV124(BigInt(epochMs));
  if (sampledMicroPulses < 0n || sampledMicroPulses > BigInt(Number.MAX_SAFE_INTEGER)) {
    return fail("V124_KAI_NOW_RANGE_INVALID");
  }

  let exactMicroPulses = sampledMicroPulses;
  if (retainedLiveKaiUpulseHead !== null && sampledMicroPulses <= retainedLiveKaiUpulseHead) {
    exactMicroPulses = retainedLiveKaiUpulseHead + BigInt(1);
  }
  if (exactMicroPulses > BigInt(Number.MAX_SAFE_INTEGER)) {
    return fail("V124_KAI_NOW_RANGE_INVALID");
  }
  retainedLiveKaiUpulseHead = exactMicroPulses;

  const uPulse = Number(exactMicroPulses);
  const pulse = Math.floor(uPulse / 1_000_000);
  if (!Number.isSafeInteger(uPulse) || !Number.isSafeInteger(pulse)) {
    return fail("V124_KAI_NOW_RANGE_INVALID");
  }

  return Object.freeze({ pulse, uPulse });
}

/**
 * Projects an already sealed whole-pulse coordinate without consulting UTC,
 * device time, timezone, process uptime, or a server. The sealed coordinate is
 * authority; this function is a deterministic representation only.
 */
export function receizKaiMomentFromSealedPulse(
  sealedPulse: number | bigint,
): ReceizKaiSealedMoment {
  const pulseBig = typeof sealedPulse === "bigint"
    ? sealedPulse
    : Number.isSafeInteger(sealedPulse)
      ? BigInt(sealedPulse)
      : fail("RECEIZ_SEALED_KAI_PULSE_INVALID");
  if (pulseBig > BigInt(Number.MAX_SAFE_INTEGER) || pulseBig < BigInt(Number.MIN_SAFE_INTEGER)) {
    return fail("RECEIZ_SEALED_KAI_PULSE_RANGE_INVALID");
  }
  const uPulse = pulseBig * 1_000_000n;
  const pulsesInDay = modE(uPulse, N_DAY_MICRO);
  const pulsesInGrid = (pulsesInDay * BASE_DAY_MICRO) / N_DAY_MICRO;
  const beatBig = pulsesInGrid / PULSES_PER_BEAT_MICRO;
  const pulsesInBeat = pulsesInGrid - beatBig * PULSES_PER_BEAT_MICRO;
  const stepBig = pulsesInBeat / PULSES_PER_STEP_MICRO;
  const pulsesInStep = pulsesInBeat - stepBig * PULSES_PER_STEP_MICRO;
  const dayIndex = floorDivE(uPulse, N_DAY_MICRO);
  const weekdayIndex = Number(modE(dayIndex, BigInt(WEEKDAYS.length)));
  const stepIndex = Number(stepBig);
  const percentIntoStep = Number(pulsesInStep) / Number(PULSES_PER_STEP_MICRO);
  return Object.freeze({
    pulse: Number(pulseBig),
    beat: Number(beatBig),
    stepIndex,
    stepPctAcrossBeat: (stepIndex + percentIntoStep) / STEPS_PER_BEAT,
    weekday: WEEKDAYS[weekdayIndex]!,
    chakraDay: CHAKRA_DAYS[weekdayIndex]!,
    authority: Object.freeze({
      deviceClockIsAuthority: false as const,
      strongerTruth: "sealed-kai-creation-pulse" as const,
    }),
  });
}

/**
 * Projects an already sealed exact micro-pulse coordinate. The carried
 * coordinate remains authority; this function only derives its KKS lattice.
 */
export function receizKaiMomentFromSealedUpulse(
  sealedUpulse: number | bigint,
): ReceizKaiSealedUpulseMoment {
  const uPulse = typeof sealedUpulse === "bigint"
    ? sealedUpulse
    : Number.isSafeInteger(sealedUpulse)
      ? BigInt(sealedUpulse)
      : fail("RECEIZ_SEALED_KAI_UPULSE_INVALID");
  if (uPulse > BigInt(Number.MAX_SAFE_INTEGER) || uPulse < 0n) {
    return fail("RECEIZ_SEALED_KAI_UPULSE_RANGE_INVALID");
  }
  const pulsesInDay = modE(uPulse, N_DAY_MICRO);
  const pulsesInGrid = (pulsesInDay * BASE_DAY_MICRO) / N_DAY_MICRO;
  const beatBig = pulsesInGrid / PULSES_PER_BEAT_MICRO;
  const pulsesInBeat = pulsesInGrid - beatBig * PULSES_PER_BEAT_MICRO;
  const stepBig = pulsesInBeat / PULSES_PER_STEP_MICRO;
  const pulsesInStep = pulsesInBeat - stepBig * PULSES_PER_STEP_MICRO;
  const dayIndex = floorDivE(uPulse, N_DAY_MICRO);
  const weekdayIndex = Number(modE(dayIndex, BigInt(WEEKDAYS.length)));
  const stepIndex = Number(stepBig);
  const percentIntoStep = Number(pulsesInStep) / Number(PULSES_PER_STEP_MICRO);
  return Object.freeze({
    uPulse: Number(uPulse),
    pulse: Number(uPulse / 1_000_000n),
    beat: Number(beatBig),
    stepIndex,
    stepPctAcrossBeat: (stepIndex + percentIntoStep) / STEPS_PER_BEAT,
    weekday: WEEKDAYS[weekdayIndex]!,
    chakraDay: CHAKRA_DAYS[weekdayIndex]!,
    authority: Object.freeze({
      deviceClockIsAuthority: false as const,
      strongerTruth: "sealed-kai-creation-upulse" as const,
    }),
  });
}
