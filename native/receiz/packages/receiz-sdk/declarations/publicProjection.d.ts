export type PublicProofProjection<TData extends Record<string, unknown> = Record<string, unknown>> = Readonly<{
    id?: string;
    sourceUrl?: string;
    data?: TData | null;
    authority: Readonly<{
        profile: "projection-only";
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type PublicProofProjectionInput<TData extends Record<string, unknown> = Record<string, unknown>> = Readonly<{
    id?: string;
    sourceUrl?: string;
    data?: TData | null;
}>;
export declare function createPublicProofProjection<TData extends Record<string, unknown> = Record<string, unknown>>(input: PublicProofProjectionInput<TData>): PublicProofProjection<TData>;
//# sourceMappingURL=publicProjection.d.ts.map