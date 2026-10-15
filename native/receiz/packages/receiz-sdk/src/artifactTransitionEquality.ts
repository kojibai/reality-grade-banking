import type {
  ReceizArtifactTransitionBasis,
  ReceizDigest,
} from "./artifactTransition.js";

function sameDigest(left: ReceizDigest<string>, right: ReceizDigest<string>): boolean {
  return left.algorithm === right.algorithm
    && left.binds === right.binds
    && left.value === right.value;
}

function sameNamespace(
  left: ReceizArtifactTransitionBasis["namespace"],
  right: ReceizArtifactTransitionBasis["namespace"],
): boolean {
  return left.scheme === right.scheme && left.value === right.value;
}

/** Exact structural equality for the complete portable transition basis. */
export function receizArtifactTransitionBasisEquals(
  left: ReceizArtifactTransitionBasis,
  right: ReceizArtifactTransitionBasis,
): boolean {
  if (left.artifactId !== right.artifactId
    || !sameDigest(left.priorArtifactDigest, right.priorArtifactDigest)
    || !sameDigest(left.basePayloadDigest, right.basePayloadDigest)
    || !sameDigest(left.expectedHead, right.expectedHead)
    || !sameDigest(left.proposedHistoryHead, right.proposedHistoryHead)
    || !sameNamespace(left.namespace, right.namespace)
    || left.namespaceLawVersion !== right.namespaceLawVersion
    || left.namespaceReducerVersion !== right.namespaceReducerVersion
    || (left.priorNamespaceBodyDigest === null) !== (right.priorNamespaceBodyDigest === null)
    || (left.priorNamespaceBodyDigest !== null && right.priorNamespaceBodyDigest !== null
      && !sameDigest(left.priorNamespaceBodyDigest, right.priorNamespaceBodyDigest))
    || !sameDigest(left.eventDigest, right.eventDigest)
    || !sameDigest(left.proposedNamespaceBodyDigest, right.proposedNamespaceBodyDigest)
    || left.preservedNamespaces.length !== right.preservedNamespaces.length
    || !sameDigest(left.registryDigest, right.registryDigest)
    || left.actor.actorId !== right.actor.actorId
    || !sameDigest(left.actor.evidenceDigest, right.actor.evidenceDigest)
    || left.actor.admissionProfile !== right.actor.admissionProfile
    || !sameDigest(left.actor.registryDigest, right.actor.registryDigest)
    || left.proofSuiteRequirements.signatureVersion !== right.proofSuiteRequirements.signatureVersion
    || left.proofSuiteRequirements.carrier !== right.proofSuiteRequirements.carrier) return false;
  for (let index = 0; index < left.preservedNamespaces.length; index += 1) {
    const leftNamespace = left.preservedNamespaces[index]!;
    const rightNamespace = right.preservedNamespaces[index]!;
    if (!sameNamespace(leftNamespace.namespace, rightNamespace.namespace)
      || !sameDigest(leftNamespace.bodyDigest, rightNamespace.bodyDigest)) return false;
  }
  return true;
}
