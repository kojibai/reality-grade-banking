import type { ReceizArtifactAppendPlan } from "./artifactTransition.js";
/** Additional conditions of an already admitted append, enforced by the existing atomic admission store. */
export type ReceizArtifactTransitionAtomicRequirements = Readonly<{
  readDependencies: readonly Readonly<{ resource: string; expectedHeadDigest: string }>[];
  consumedPbiReceiptDigests: readonly string[];
}>;
const requirements = new WeakMap<object, ReceizArtifactTransitionAtomicRequirements>();
/** Internal source-planner custody; never exported from the package root. */
export function bindReceizArtifactTransitionAtomicRequirements(plan: ReceizArtifactAppendPlan, value: ReceizArtifactTransitionAtomicRequirements): void {
  const snapshot = Object.freeze({ readDependencies: Object.freeze(value.readDependencies.map((entry) => Object.freeze({ ...entry }))),
    consumedPbiReceiptDigests: Object.freeze([...value.consumedPbiReceiptDigests]) });
  const prior = requirements.get(plan);
  if (prior && JSON.stringify(prior) !== JSON.stringify(snapshot)) throw new TypeError("ATOMIC_REQUIREMENTS_ALREADY_BOUND");
  requirements.set(plan, snapshot);
}
export function readReceizArtifactTransitionAtomicRequirements(plan: ReceizArtifactAppendPlan) { return requirements.get(plan); }
