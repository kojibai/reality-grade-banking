/** Display projection of an already admitted original account-creation coordinate.
 * Never samples time, fetches an identity or changes the carried source. */
export declare function projectReceizAccountDisplayName(input: Readonly<{
    displayName?: string | null;
    chosenUsername?: string | null;
    useDefaultDisplayName?: boolean;
    creationKaiMicroPulse?: string | number | bigint | null;
    createdAt?: string | null;
    fallback?: string;
}>): string;
//# sourceMappingURL=accountDisplayName.d.ts.map