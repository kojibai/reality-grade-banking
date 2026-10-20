import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "../../../../packages/receiz-sdk/src/index";
import {
  digestReceizCompositeCanonical,
} from "../../proof/composite/commitments";

export function canonicalizeEconomyShowcase(value: unknown): string {
  return canonicalizeReceizConstitution(value as ReceizConstitutionJson);
}

export function digestEconomyShowcaseCandidate(value: unknown): string {
  return digestReceizCompositeCanonical(value);
}
