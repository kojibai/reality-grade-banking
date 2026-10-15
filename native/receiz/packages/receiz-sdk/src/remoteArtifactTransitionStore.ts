import type {
  ReceizArtifactTransitionCommitUnit,
  ReceizArtifactTransitionStore,
  ReceizVerifiedArtifactTransitionCandidate,
} from "./artifactTransitionStore.js";
import type { ReceizArtifactDigest, ReceizCommitDomainId } from "./artifactTransition.js";
import {
  createReceizGlobalCoordinationHttpTransport,
  type ReceizGlobalCoordinationTransport,
} from "./globalCoordinationProtocol.js";

export type ReceizRemoteArtifactTransitionStoreOptions = Readonly<{
  namespace: string;
  commitDomain: ReceizCommitDomainId;
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  transport?: ReceizGlobalCoordinationTransport;
}>;

export function createReceizRemoteArtifactTransitionStore(
  options: ReceizRemoteArtifactTransitionStoreOptions,
): ReceizArtifactTransitionStore {
  if (!options.namespace || !options.accessToken || options.commitDomain.scheme !== "receiz-commit-domain.v1") {
    throw new TypeError("REMOTE_TRANSITION_STORE_OPTIONS_REQUIRED");
  }
  const transport = options.transport ?? createReceizGlobalCoordinationHttpTransport({
    baseUrl: options.baseUrl ?? "https://receiz.com",
    accessToken: options.accessToken,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  const scope = { namespace: options.namespace, commitDomain: options.commitDomain };
  return Object.freeze({
    commitDomain: options.commitDomain,
    async stageCandidate(candidate: ReceizVerifiedArtifactTransitionCandidate) {
      return await transport("transition.stage", { ...scope, candidate }) as Awaited<ReturnType<ReceizArtifactTransitionStore["stageCandidate"]>>;
    },
    async resolveCandidate(artifactDigest: ReceizArtifactDigest) {
      return await transport("transition.resolve", { ...scope, artifactDigest }) as Awaited<ReturnType<ReceizArtifactTransitionStore["resolveCandidate"]>>;
    },
    async commitTransition(unit: ReceizArtifactTransitionCommitUnit) {
      return await transport("transition.commit", { ...scope, unit }) as Awaited<ReturnType<ReceizArtifactTransitionStore["commitTransition"]>>;
    },
  });
}
