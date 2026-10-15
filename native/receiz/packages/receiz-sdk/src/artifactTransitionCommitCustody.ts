import type {
  ReceizArtifactTransitionCommitUnit,
  ReceizArtifactTransitionStoreVerificationInput,
} from "./artifactTransitionStore.js";

type CanonicalCommitCustody = Readonly<{
  verifyFreshStoreCandidate(input: ReceizArtifactTransitionStoreVerificationInput): Promise<boolean>;
}>;

const canonicalUnits = new WeakMap<object, CanonicalCommitCustody>();
const testingUnits = new WeakSet<object>();

export function registerReceizCanonicalArtifactTransitionCommitUnit(
  unit: ReceizArtifactTransitionCommitUnit,
  custody: CanonicalCommitCustody,
): void {
  canonicalUnits.set(unit, Object.freeze({
    verifyFreshStoreCandidate: custody.verifyFreshStoreCandidate,
  }));
}

export function readReceizCanonicalArtifactTransitionCommitUnit(
  unit: unknown,
): CanonicalCommitCustody | null {
  return unit !== null && typeof unit === "object" ? canonicalUnits.get(unit) ?? null : null;
}

export function registerReceizTestingArtifactTransitionCommitUnit(
  unit: ReceizArtifactTransitionCommitUnit,
): void {
  testingUnits.add(unit);
}

export function isReceizTestingArtifactTransitionCommitUnit(unit: unknown): boolean {
  return unit !== null && typeof unit === "object" && testingUnits.has(unit);
}
