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
/** @internal Test isolation only; not exported by the package entry point. */
export declare function __resetReceizKaiNowHeadForTests(): void;
export declare function receizKaiNow(): ReceizKaiNow;
/**
 * Projects an already sealed whole-pulse coordinate without consulting UTC,
 * device time, timezone, process uptime, or a server. The sealed coordinate is
 * authority; this function is a deterministic representation only.
 */
export declare function receizKaiMomentFromSealedPulse(sealedPulse: number | bigint): ReceizKaiSealedMoment;
/**
 * Projects an already sealed exact micro-pulse coordinate. The carried
 * coordinate remains authority; this function only derives its KKS lattice.
 */
export declare function receizKaiMomentFromSealedUpulse(sealedUpulse: number | bigint): ReceizKaiSealedUpulseMoment;
//# sourceMappingURL=v124Kai.d.ts.map