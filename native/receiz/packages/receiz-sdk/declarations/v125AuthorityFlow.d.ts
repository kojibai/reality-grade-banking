export declare const RECEIZ_V125_AUTHORITY_FLOW_SCHEMA: "receiz.authority-flow.v1";
export declare const RECEIZ_V125_AUTHORITY_STAGES: readonly ["source", "evidence", "relationship", "permissible-inference", "representation"];
export type ReceizV125AuthorityStage = typeof RECEIZ_V125_AUTHORITY_STAGES[number];
export type ReceizV125AuthorityFlow = Readonly<{
    schema: typeof RECEIZ_V125_AUTHORITY_FLOW_SCHEMA;
    stages: typeof RECEIZ_V125_AUTHORITY_STAGES;
    direction: "forward-only";
    terminalAuthority: "actual-sealed-proof-object";
    representationIsAuthority: false;
    sourceMayBeReconstructedFromRepresentation: false;
    externalAuthorityAboveProofObject: false;
    highestCashOutFrame: Readonly<{
        label: "Highest Cash-Out Frame";
        statement: "source + law + sequence + object + evidence. And the reader underneath them.";
        readerPosition: "underneath-authority";
        readerIsAuthority: false;
    }>;
}>;
export declare const RECEIZ_V125_HIGHEST_CASH_OUT_FRAME: Readonly<{
    readonly label: "Highest Cash-Out Frame";
    readonly statement: "source + law + sequence + object + evidence. And the reader underneath them.";
    readonly readerPosition: "underneath-authority";
    readonly readerIsAuthority: false;
}>;
export declare const RECEIZ_V125_AUTHORITY_FLOW: ReceizV125AuthorityFlow;
/**
 * Enforces one adjacent derivation step in the Receiz authority compiler.
 * Projection and inference may move forward only; they can never recreate or
 * outrank the evidence/source that authorized them.
 */
export declare function assertReceizV125AuthorityFlowStep(from: ReceizV125AuthorityStage, to: ReceizV125AuthorityStage): void;
//# sourceMappingURL=v125AuthorityFlow.d.ts.map