import { cloneAndFreezeExactValue } from "./exactClone.js";

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

export function createPublicProofProjection<
  TData extends Record<string, unknown> = Record<string, unknown>,
>(input: PublicProofProjectionInput<TData>): PublicProofProjection<TData> {
  const projection: {
    id?: string;
    sourceUrl?: string;
    data?: TData | null;
    authority: PublicProofProjection<TData>["authority"];
  } = {
    authority: Object.freeze({
      profile: "projection-only",
      projectionIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    }),
  };
  if (input.id !== undefined) projection.id = input.id;
  if (input.sourceUrl !== undefined) projection.sourceUrl = input.sourceUrl;
  if (input.data !== undefined) {
    projection.data = input.data === null ? null : cloneAndFreezeExactValue(input.data);
  }
  return Object.freeze(projection);
}
