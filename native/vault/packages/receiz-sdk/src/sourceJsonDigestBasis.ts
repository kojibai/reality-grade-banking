import { canonicalizeReceizConstitution } from "./constitution.js";

function containsNonAuthorityNumber(value: unknown): boolean {
  if (typeof value === "number") return !Number.isSafeInteger(value);
  if (value && typeof value === "object") return Object.values(value).some(containsNonAuthorityNumber);
  return false;
}

/** Reuses Identity admission's exact carried-JSON binding beneath its Source.
 * The authority encoder remains integer-only; existing integer digest inputs
 * stay unchanged. This neither admits JSON nor issues Source custody. */
export function sourceJsonDigestBasis<T>(value: T): T | string {
  return containsNonAuthorityNumber(value) ? canonicalizeReceizConstitution(value) : value;
}
