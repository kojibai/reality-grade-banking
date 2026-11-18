export type ReceizConstitutionJson = null | boolean | number | string | ReceizConstitutionJson[] | {
    [key: string]: ReceizConstitutionJson;
};
export type ReceizConstitutionPhase = "command" | "event" | "merge" | "migration" | "admission";
export type ReceizLawExpression = Readonly<{
    op: "literal";
    value: ReceizConstitutionJson;
}> | Readonly<{
    op: "path";
    value: string;
}> | Readonly<{
    op: "equal";
    left: ReceizLawExpression;
    right: ReceizLawExpression;
}> | Readonly<{
    op: "all" | "any";
    values: readonly ReceizLawExpression[];
}> | Readonly<{
    op: "not";
    value: ReceizLawExpression;
}> | Readonly<{
    op: "transition";
    path: string;
    from: ReceizConstitutionJson;
    to: ReceizConstitutionJson;
}>;
export type ReceizConstitutionLaw = Readonly<{
    id: string;
    version: number;
    phases: readonly ReceizConstitutionPhase[];
    denyWhen: ReceizLawExpression;
    denial: Readonly<{
        code: string;
        safeAlternatives: readonly string[];
    }>;
}>;
export type ReceizProtocolLimits = Readonly<{
    exactArtifactBytes: number;
    archiveEntries: number;
    singleDecompressedEntryBytes: number;
    totalDecompressedBytes: number;
    rootArchiveContainerDepth: number;
    embeddedArchiveNesting: number;
    perEntryCompressionRatio: number;
    aggregateCompressionRatio: number;
    canonicalArchivePathBytes: number;
    archiveEntryNameBytes: number;
    manifestBytes: number;
    verifiedHistoryNodes: number;
    reconciliationAdditions: number;
    remotePredecessorFetches: number;
    artifactNamespaces: number;
    reducerOperations: number;
    lawExpressionOperations: number;
}>;
export type ReceizConstitutionRegistry = Readonly<{
    schema: "receiz.constitution.registry.v1";
    version: "106.0.0" | "107.0.0" | "108.0.0" | "109.0.0" | "110.0.0" | "111.0.0" | "112.0.0" | "113.0.0" | "114.0.0" | "115.0.0" | "116.0.0" | "117.0.0" | "118.0.0" | "119.0.0" | "120.0.0" | "121.0.0" | "122.0.0" | "123.0.0" | "124.0.0" | "125.0.0" | "126.0.0" | "127.0.0";
    previousRegistryDigest: string;
    effectiveKai: string;
    createdAt: string;
    predicateLanguageVersion?: "receiz-law-expression.v1";
    protocolLimits?: ReceizProtocolLimits;
    laws: readonly ReceizConstitutionLaw[];
    authority: Readonly<{
        registryPayloadIsAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizConstitutionRegistryValidationResult = Readonly<{
    ok: true;
    value: ReceizConstitutionRegistry;
    issues: readonly [];
}> | Readonly<{
    ok: false;
    issues: readonly string[];
}>;
export declare function canonicalizeReceizConstitution(value: unknown): string;
export declare function digestReceizConstitution(value: unknown): Promise<string>;
export declare function validateReceizConstitutionRegistry(value: unknown): ReceizConstitutionRegistryValidationResult;
export declare function assertReceizConstitutionRegistryInterpretable(input: {
    registry: ReceizConstitutionRegistry;
    budget: number;
}): Readonly<{
    predicateLanguageVersion: "receiz-law-expression.v1";
    budgetConsumed: number;
}>;
export declare function evaluateReceizLawSet(input: {
    registry: ReceizConstitutionRegistry;
    context: unknown;
    phase: ReceizConstitutionPhase;
    budget: number;
}): Promise<{
    schema: "receiz.constitution.evaluation.v1";
    allowed: boolean;
    denials: {
        law: string;
        code: string;
        attemptedTransition: string | null;
        affectedAsset: string | null;
        safeAlternatives: readonly string[];
    }[];
    budgetConsumed: number;
    registryDigest: string;
    authority: {
        evaluationIsAdmission: false;
        strongerTruth: "sealed-receiz-proof-object";
    };
}>;
//# sourceMappingURL=constitution.d.ts.map