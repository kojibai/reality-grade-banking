export type HashHex = string;
export interface SigilPayload {
    name: string;
    mime: string;
    size: number;
    encoded?: string;
}
export interface SigilTransfer {
    senderSignature: string;
    senderStamp: string;
    senderKaiPulse: number;
    payload?: SigilPayload;
    receiverSignature?: string;
    receiverStamp?: string;
    receiverKaiPulse?: number;
}
/** Optional ZK proof container (integration hook; cryptography provided by caller) */
export interface ZkProof {
    scheme: "groth16";
    curve: "bn128" | "bls12-381";
    proof: string;
    publicInputsHash: string;
    verifierId?: string;
}
export interface SigilMetadataLite {
    pulse?: number;
    kaiPulse?: number;
    kaiSignature?: string;
    userPhiKey?: string;
    beat?: number;
    stepIndex?: number;
    stepsPerBeat?: number;
    seriesSize?: number;
    quality?: "low" | "med" | "high";
    creatorVerified?: boolean;
    creatorRep?: number;
    frequencyHz?: number;
    chakraDay?: string;
    chakraGate?: string;
    transfers?: SigilTransfer[];
    cumulativeTransfers?: number;
    segments?: {
        index: number;
        root: HashHex;
        cid: HashHex;
        count: number;
    }[];
    segmentsMerkleRoot?: HashHex;
    transfersWindowRoot?: HashHex;
    ip?: {
        expectedCashflowPhi?: {
            atPulse: number;
            amountPhi: number;
        }[];
        expectedCashflowKS?: {
            atPulse: number;
            amountKS: number;
        }[];
    };
    valuationPolicyId?: string;
}
export type ValueUnit = "Φ";
export interface ValueInputs {
    size: number;
    quality: "low" | "med" | "high";
    creatorVerified: boolean;
    creatorRep: number;
    uniqueHolders: number;
    closedFraction: number;
    cadenceRegularity: number;
    medianHoldBeats: number;
    velocityPerBeat: number;
    resonancePhi: number;
    pulsesPerBeat: number;
    agePulses: number;
    geometryLift: number;
    momentLift: number;
    pv_phi: number;
    algorithmVersion: "phi/kosmos-vφ-5";
    adoptionAtClaim: number;
    adoptionNow: number;
    adoptionDelta: number;
    rarityScore01: number;
    fibAccrualLevels: number;
    lucasAccrualLevels: number;
    indexScarcity: number;
    adoptionLift: number;
    fibAccrualLift: number;
    lucasAccrualLift: number;
    breathPhase01: number;
    breathWave: number;
    dayPhase01: number;
    dayWave: number;
    strobePhase01: number;
    strobeWave: number;
    momentAffinitySim01: number;
    momentAffinityAmp: number;
    momentAffinityOsc: number;
    combinedOsc: number;
    dynamicGrowth: number;
    rarityFloor: number;
    premiumBandBase: number;
}
export interface ValueSeal {
    version: 1;
    unit: ValueUnit;
    algorithm: "phi/kosmos-vφ-5";
    policyId?: string | undefined;
    policyChecksum: string;
    valuePhi: number;
    premium: number;
    inputs: ValueInputs;
    computedAtPulse: number;
    headRef: {
        headHash?: HashHex | undefined;
        transfersWindowRoot?: HashHex | undefined;
        cumulativeTransfers: number;
    };
    stamp: HashHex;
    zkProof?: ZkProof;
}
declare const QUALITY_MAP: Record<"low" | "med" | "high", number>;
declare const POLICY: {
    RARITY_ONE_OF_ONE: number;
    RARITY_EXP: number;
    QUALITY_MAP: Record<"low" | "med" | "high", number>;
    CREATOR_VERIFIED_LIFT: number;
    CREATOR_REP_MAX: number;
    PROV_LOG_SLOPE: number;
    HOLD_SLOPE: number;
    HOLD_CAP: number;
    CLOSURE_CENTER: number;
    CLOSURE_RANGE: number;
    CLOSURE_GAIN: number;
    CADENCE_GAIN: number;
    CHURN_KAPPA: number;
    AGE_EPS: number;
    AGE_CAP: number;
    RESONANCE_GAIN: number;
    DISCOUNT_PULSE_HALFSPAN: number;
    GEOM_EDGE_GAIN: number;
    GEOM_PHI_GAIN: number;
    GEOM_PRIME_GAIN: number;
    MOMENT_FIB_EXACT_GAIN: number;
    MOMENT_LUCAS_EXACT_GAIN: number;
    MOMENT_PHI_TRANSITION_GAIN: number;
    MOMENT_UNIFORM_GAIN: number;
    MOMENT_PAL_GAIN: number;
    MOMENT_RUN_GAIN: number;
    MOMENT_SEQ_GAIN: number;
    MOMENT_LOW_ENTROPY_GAIN: number;
    GENESIS_BIAS_GAIN: number;
    YEAR_PULSES_APPROX: number;
    ADOPTION_TAU_PULSES: number;
    ADOPTION_GAIN_BASE: number;
    ADOPTION_GAIN_RARE: number;
    INDEX_SCARCITY_GAIN: number;
    FIB_STEP_GAIN: number;
    LUCAS_STEP_GAIN: number;
    BREATH_WAVE_GAIN: number;
    DAY_WAVE_GAIN: number;
    STROBE_WAVE_GAIN: number;
    MOMENT_AFFINITY_GAIN_BASE: number;
    MOMENT_AFFINITY_DIGIT_WEIGHT: number;
    DEFAULT_STEPS_PER_BEAT: 44;
    PULSES_PER_STEP: 11;
    PULSES_PER_BEAT_CANON: number;
    PULSES_PER_DAY_EXACT: number;
    PHI: number;
};
type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | {
    [key: string]: JSONValue;
} | JSONValue[];
export declare function stableStringify(x: JSONValue): string;
export declare function stableStringify(x: unknown): string;
/** Published vφ-5 mechanics. Checksums identify policy serialization; they are
 * not signatures, proof admission, ownership, or settlement authority. */
export declare const SIGIL_VALUATION_ALGORITHM: "phi/kosmos-v\u03C6-5";
export declare const SIGIL_VALUATION_POLICY_CHECKSUM: string;
export declare const SIGIL_VALUATION_ROUNDING: Readonly<{
    numberSemantics: "ECMAScript Number (IEEE-754 binary64), ECMAScript Math functions";
    canonicalNumberSerialization: "JSON.stringify(number); nonfinite numbers serialize as null; -0 serializes as 0";
    oscillator: Readonly<{
        scale: 1000000;
        formula: "Math.round(x * 1000000) / 1000000";
        nonfiniteResult: 0;
    }>;
    phiMicroDisplay: Readonly<{
        scale: 1000000;
        formula: "Math.round(valuePhi * 1000000)";
        purpose: "display projection; intrinsic value remains the original Number";
    }>;
}>;
export declare const SIGIL_VALUATION_LEGACY_DEFAULTS: Readonly<{
    originPulse: "kaiPulse when numeric, else pulse when numeric, else explicit evaluation pulse (low-level compatibility only)";
    stepsPerBeat: "finite positive stepsPerBeat is truncated; otherwise 44";
    stepIndex: "finite supplied stepIndex is truncated and clamped; otherwise derive from origin pulse";
    beat: "finite supplied beat is truncated; otherwise floor(originPulse / pulsesPerBeat)";
    seriesSize: 1;
    quality: "med";
    creatorVerified: false;
    creatorRep: 0;
    transfers: "empty array when absent; policy uniqueHolders floor 1, closure 1, cadence 1, median hold 0";
    resonancePhi: "0.5 when frequencyHz is missing, nonfinite, zero or negative";
    ip: "zero present value when cashflows absent; legacy KS cashflows retain their original Phi alias behavior";
    cumulativeTransfers: "supplied count, else transfers.length";
    policyId: "unpinned when absent";
}>;
export declare const SIGIL_VALUATION_POLICY: Readonly<{
    algorithm: "phi/kosmos-vφ-5";
    checksum: string;
    checksumDomain: "val-policy:";
    checksumAlgorithm: "original 32-bit FNV-like accumulation over UTF-16 code units; noncryptographic policy identifier";
    constants: Readonly<Omit<typeof POLICY, "QUALITY_MAP">> & {
        readonly QUALITY_MAP: Readonly<typeof QUALITY_MAP>;
    };
    canonicalSerialization: string;
    rounding: Readonly<{
        numberSemantics: "ECMAScript Number (IEEE-754 binary64), ECMAScript Math functions";
        canonicalNumberSerialization: "JSON.stringify(number); nonfinite numbers serialize as null; -0 serializes as 0";
        oscillator: Readonly<{
            scale: 1000000;
            formula: "Math.round(x * 1000000) / 1000000";
            nonfiniteResult: 0;
        }>;
        phiMicroDisplay: Readonly<{
            scale: 1000000;
            formula: "Math.round(valuePhi * 1000000)";
            purpose: "display projection; intrinsic value remains the original Number";
        }>;
    }>;
    legacyDefaults: Readonly<{
        originPulse: "kaiPulse when numeric, else pulse when numeric, else explicit evaluation pulse (low-level compatibility only)";
        stepsPerBeat: "finite positive stepsPerBeat is truncated; otherwise 44";
        stepIndex: "finite supplied stepIndex is truncated and clamped; otherwise derive from origin pulse";
        beat: "finite supplied beat is truncated; otherwise floor(originPulse / pulsesPerBeat)";
        seriesSize: 1;
        quality: "med";
        creatorVerified: false;
        creatorRep: 0;
        transfers: "empty array when absent; policy uniqueHolders floor 1, closure 1, cadence 1, median hold 0";
        resonancePhi: "0.5 when frequencyHz is missing, nonfinite, zero or negative";
        ip: "zero present value when cashflows absent; legacy KS cashflows retain their original Phi alias behavior";
        cumulativeTransfers: "supplied count, else transfers.length";
        policyId: "unpinned when absent";
    }>;
    baseUnit: "1 coherent breath = 1 Φ";
    formula: "valuePhi = rarityFloor + premiumBandBase * combinedOsc + pv_phi";
    affinityWeights: Readonly<{
        step: 0.3;
        breath: 0.3;
        phiFraction: 0.2;
        digit: 0.2;
    }>;
}>;
export type SigilValuationPolicy = typeof SIGIL_VALUATION_POLICY;
export type SigilCalculationTerm = Readonly<{
    id: string;
    label: string;
    formula: string;
    operands: Readonly<Record<string, string>>;
    result: string;
    unit: string;
    sourceReferences: readonly string[];
}>;
export type ValuationLegacyDefault = Readonly<{
    field: string;
    rule: string;
    value: JSONValue;
    authority: "reproducibility-only";
}>;
export type UnsignedSeal = Omit<ValueSeal, "stamp" | "policyChecksum" | "algorithm"> & {
    algorithm: "phi/kosmos-vφ-5";
    policyChecksum: string;
};
export type IntrinsicValuationComputation = Readonly<{
    unsigned: UnsignedSeal;
    stampPayload: string;
    calculation: readonly SigilCalculationTerm[];
    appliedDefaults: readonly ValuationLegacyDefault[];
}>;
export declare function computeIntrinsicUnsigned(meta: SigilMetadataLite, nowPulse: number): IntrinsicValuationComputation;
export {};
//# sourceMappingURL=sigilValuationCore.d.ts.map