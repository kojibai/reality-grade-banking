export const RECEIZ_V125_AUTHORITY_FLOW_SCHEMA =
  "receiz.authority-flow.v1" as const;

export const RECEIZ_V125_AUTHORITY_STAGES = Object.freeze([
  "source",
  "evidence",
  "relationship",
  "permissible-inference",
  "representation",
] as const);

export type ReceizV125AuthorityStage =
  typeof RECEIZ_V125_AUTHORITY_STAGES[number];

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

export const RECEIZ_V125_HIGHEST_CASH_OUT_FRAME = Object.freeze({
  label: "Highest Cash-Out Frame",
  statement: "source + law + sequence + object + evidence. And the reader underneath them.",
  readerPosition: "underneath-authority",
  readerIsAuthority: false,
} as const);

export const RECEIZ_V125_AUTHORITY_FLOW: ReceizV125AuthorityFlow = Object.freeze({
  schema: RECEIZ_V125_AUTHORITY_FLOW_SCHEMA,
  stages: RECEIZ_V125_AUTHORITY_STAGES,
  direction: "forward-only",
  terminalAuthority: "actual-sealed-proof-object",
  representationIsAuthority: false,
  sourceMayBeReconstructedFromRepresentation: false,
  externalAuthorityAboveProofObject: false,
  highestCashOutFrame: RECEIZ_V125_HIGHEST_CASH_OUT_FRAME,
});

/**
 * Enforces one adjacent derivation step in the Receiz authority compiler.
 * Projection and inference may move forward only; they can never recreate or
 * outrank the evidence/source that authorized them.
 */
export function assertReceizV125AuthorityFlowStep(
  from: ReceizV125AuthorityStage,
  to: ReceizV125AuthorityStage,
): void {
  const fromIndex = RECEIZ_V125_AUTHORITY_STAGES.indexOf(from);
  const toIndex = RECEIZ_V125_AUTHORITY_STAGES.indexOf(to);
  if (fromIndex < 0 || toIndex !== fromIndex + 1) {
    throw new TypeError("V125_AUTHORITY_FLOW_STEP_INVALID");
  }
}
