import type {
  ReceizArtifactAppendPlan,
  ReceizArtifactTransitionSealer,
  ReceizArtifactTransitionStore,
  ReceizEconomyShowcaseHeadV114,
  ReceizVerifiedArtifactAdmission,
  ReceizVerifiedCapability,
  ReceizVerifiedIdentityArtifactAdmission,
  ReceizVerifiedProfileShowcaseAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import type {
  ReceizCompositeFibonacciState,
  ReceizCompositeMerkleState,
} from "../../proof/composite/types";

export const ECONOMY_SHOWCASE_ARTIFACT_ID =
  "economy-showcase:receiz.com" as const;

export type EconomyShowcaseArtifactId =
  typeof ECONOMY_SHOWCASE_ARTIFACT_ID;

export type EconomyShowcaseProfileAdmission = Readonly<{
  profile: "profile-showcase";
  artifactId: `profile-showcase:${string}`;
  artifactDigest: string;
  immutableVersion: string;
  historyHeadDigest: string;
  admissionEvidenceRoot: string;
  headKaiUpulse: string;
  authority: Readonly<{
    childIsProofAuthority: true;
    admissionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    custodyStatus: "verified-profile-showcase-admission-runtime";
  }>;
}>;

export type EconomyShowcaseAppendOperationV1 = Readonly<{
  schema: "receiz.economy-showcase.operation.v1";
  kind: "economy.profile-showcase.append";
  parentArtifactDigest: string;
  priorCommittedCount: number;
  directDeltaPosition: number;
  kai: Readonly<{ upulse: string }>;
  profileShowcase: EconomyShowcaseProfileAdmission;
  operationDigest: string;
}>;

export type EconomyShowcaseCandidate = Readonly<{
  schema: "receiz.economy-showcase-head.v114";
  artifactId: EconomyShowcaseArtifactId;
  candidateDigest: string;
  headKaiUpulse: string;
  parentArtifactDigests: readonly string[];
  priorOperationCount: number;
  resultingOperationCount: number;
  directProfiles: readonly EconomyShowcaseProfileAdmission[];
  directOperations: readonly EconomyShowcaseAppendOperationV1[];
  currentStateRoot: string;
  merkle: ReceizCompositeMerkleState;
  fibonacci: ReceizCompositeFibonacciState;
  counts: Readonly<{
    operationCount: number;
    profileShowcaseCount: number;
  }>;
  versions: Readonly<{
    kernelVersion: "receiz.composite.kernel.v1";
    verifierVersion: "receiz.economy-showcase.verifier.v114";
  }>;
  authority: Readonly<{
    candidateIsProofAuthority: false;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
    admissionStatus: "requires-native-seal-and-economy-admission";
  }>;
}>;

export type EconomyShowcaseVerifiedProfileAdmissionSource =
  ReceizVerifiedProfileShowcaseAdmission;

export type EconomyShowcaseTransitionAuthority = Readonly<{
  verifiedActorEvidence: ReceizVerifiedIdentityArtifactAdmission;
  plan: ReceizArtifactAppendPlan;
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
}>;

export type VerifiedEconomyShowcase = Readonly<{
  artifactId: EconomyShowcaseArtifactId;
  artifactDigest: string;
  admission: Extract<ReceizVerifiedArtifactAdmission, {
    profile: "economy-showcase";
  }>;
  head: ReceizEconomyShowcaseHeadV114;
  profileShowcases: readonly EconomyShowcaseProfileAdmission[];
  acceptedHead: string | null;
  coordination: Readonly<{
    status: "unaccepted" | "committed" | "diverged";
    coordinationStatusIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  authority: Readonly<{
    economyShowcaseIsProofAuthority: true;
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;
