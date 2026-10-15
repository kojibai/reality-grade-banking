import { RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE } from "./currentRelease.generated.js";
import type { ReceizAuthorityProfile } from "./commandAdmission.js";

export const RECEIZ_APP_CONTRACT_SCHEMA = "receiz.app.contract.v1" as const;

export const RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE = ">=112.0.0 <113.0.0" as const;
export const RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE = ">=113.0.0 <114.0.0" as const;
export const RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE = ">=114.0.0 <115.0.0" as const;
export const RECEIZ_V115_APP_COMPATIBLE_SDK_RANGE = ">=115.0.0 <116.0.0" as const;
export const RECEIZ_V116_APP_COMPATIBLE_SDK_RANGE = ">=116.0.0 <117.0.0" as const;
export const RECEIZ_V117_APP_COMPATIBLE_SDK_RANGE = ">=117.0.0 <118.0.0" as const;
export const RECEIZ_V118_APP_COMPATIBLE_SDK_RANGE = ">=118.0.0 <119.0.0" as const;
export const RECEIZ_V119_APP_COMPATIBLE_SDK_RANGE = ">=119.0.0 <120.0.0" as const;
export const RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE = ">=120.0.0 <121.0.0" as const;
export const RECEIZ_V121_APP_COMPATIBLE_SDK_RANGE = ">=121.0.0 <122.0.0" as const;
export const RECEIZ_V122_APP_COMPATIBLE_SDK_RANGE = ">=122.0.0 <123.0.0" as const;
export const RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE = ">=123.0.0 <124.0.0" as const;
export const RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE = ">=124.0.0 <125.0.0" as const;
export const RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE = ">=125.0.0 <126.0.0" as const;

export const RECEIZ_V112_APPLICATION_OPERATIONS = [
  "artifact.verify",
  "artifact.admit",
  "artifact.append.plan",
  "identity.capability.sign",
  "artifact.transition.seal",
  "artifact.transition.stage",
  "artifact.transition.commit",
  "admission.command.execute",
  "public-proof.projection.locate",
] as const;

export const RECEIZ_V113_APPLICATION_OPERATIONS = [
  ...RECEIZ_V112_APPLICATION_OPERATIONS,
  "artifact.global.resolve",
  "artifact.offline.reconcile",
] as const;

export const RECEIZ_V114_APPLICATION_OPERATIONS = [
  ...RECEIZ_V113_APPLICATION_OPERATIONS,
  "profile-showcase.genesis.plan",
  "profile-showcase.append.plan",
  "economy-showcase.genesis.plan",
  "economy-showcase.append.plan",
  "economy-showcase.merge.plan",
] as const;
export const RECEIZ_V115_APPLICATION_OPERATIONS = RECEIZ_V114_APPLICATION_OPERATIONS;
export const RECEIZ_V116_APPLICATION_OPERATIONS = RECEIZ_V115_APPLICATION_OPERATIONS;
export const RECEIZ_V117_APPLICATION_OPERATIONS = RECEIZ_V116_APPLICATION_OPERATIONS;
export const RECEIZ_V118_APPLICATION_OPERATIONS = RECEIZ_V117_APPLICATION_OPERATIONS;
export const RECEIZ_V119_APPLICATION_OPERATIONS = RECEIZ_V118_APPLICATION_OPERATIONS;
export const RECEIZ_V120_APPLICATION_OPERATIONS = [
  ...RECEIZ_V119_APPLICATION_OPERATIONS,
  "subject.resolve",
  "subject.brain.retrieve",
  "subject.twin.message",
  "subject.mandate.activate",
  "world.command.plan",
  "world.command.execute",
  "world.transaction.plan",
  "world.transaction.execute",
  "subject.runtime.enqueue",
  "subject.memory.project",
  "bearer.transfer.plan",
  "bearer.instrument.issue",
  "bearer.instrument.claim",
  "bearer.transfer.cancel",
] as const;
export const RECEIZ_V121_APPLICATION_OPERATIONS = RECEIZ_V120_APPLICATION_OPERATIONS;
export const RECEIZ_V122_APPLICATION_OPERATIONS = RECEIZ_V121_APPLICATION_OPERATIONS;
export const RECEIZ_V123_APPLICATION_OPERATIONS = [
  ...RECEIZ_V122_APPLICATION_OPERATIONS,
  "identity.proof-authority.exchange",
  "authorization.scopes.introspect",
  "subject.namespaces.resolve",
  "value.settlement.execute",
  "value.reserve.execute",
  "value.execution.resolve",
] as const;
export const RECEIZ_V124_APPLICATION_OPERATIONS = [
  ...RECEIZ_V123_APPLICATION_OPERATIONS,
  "time.kai.now",
  "identity.proof-authority.challenge.create",
  "runtime.authority-session.open",
  "runtime.authority-session.refresh",
  "runtime.authority-session.close",
  "runtime.capabilities.qualify",
  "domain.verified-additions.resolve",
  "domain.replay.verify",
  "domain.checkpoint.verify",
  "domain.private-additions.resolve",
  "execution.stage",
  "execution.execute",
  "execution.resolve",
  "execution.resolve-by-idempotency-key",
  "execution.cancel",
  "execution.atomic-mutation.plan",
  "identity.public-recipient.resolve",
] as const;
export const RECEIZ_V125_APPLICATION_OPERATIONS = [
  ...RECEIZ_V124_APPLICATION_OPERATIONS,
  "action.law.resolve",
  "action.plan",
  "action.proof.verify",
  "action.admit",
  "action.value-head.derive",
  "action.settlement.execute",
  "action.outcome.resolve",
] as const;

export type ReceizAppOperationInputAuthority =
  | "exact-artifact-bytes"
  | "verified-artifact-runtime"
  | "verified-admission-runtime"
  | "verified-actor-runtime"
  | "identity-key-file"
  | "sdk-plan-runtime"
  | "sealed-candidate-runtime"
  | "staged-candidate-reference"
  | "claimed-command"
  | "projection-only"
  | "subject-id"
  | "subject-proof-reference"
  | "verified-subject-artifact-runtime"
  | "subject-mandate-plan-runtime"
  | "world-command-input"
  | "world-command-plan-runtime"
  | "world-transaction-input"
  | "world-transaction-plan-runtime"
  | "subject-runtime-tick-input"
  | "bearer-transfer-input"
  | "bearer-transfer-plan-runtime"
  | "bearer-instrument-bytes"
  | "proof-authority-challenge"
  | "rail-scope-query"
  | "value-intent-runtime"
  | "kai-genesis-phi-bridge"
  | "authority-session-handle"
  | "domain-replay-wire"
  | "domain-checkpoint-wire"
  | "private-domain-query"
  | "durable-execution-input"
  | "durable-execution-handle"
  | "public-recipient-query"
  | "lawful-action-law-query"
  | "lawful-action-plan-input"
  | "lawful-action-proof"
  | "verified-lawful-action-runtime"
  | "lawful-action-admission-runtime";

export type ReceizAppOperationOutputAuthority =
  | "verified-artifact-runtime"
  | "verified-admission-runtime"
  | "sdk-plan-runtime"
  | "signed-capability-claim-not-yet-verified"
  | "sealed-candidate-proof-object-not-accepted-head"
  | "staged-candidate-locator-non-authoritative"
  | "accepted-artifact-history-with-report-only-receipt"
  | "admission-receipt-non-authoritative"
  | "exact-artifact-bytes-not-yet-verified"
  | "verified-subject-runtime"
  | "proof-context-non-authoritative"
  | "model-intent-non-authoritative"
  | "active-mandate-runtime"
  | "world-command-plan-runtime"
  | "accepted-world-event-with-report-only-receipt"
  | "world-transaction-plan-runtime"
  | "runtime-job-non-authoritative"
  | "event-memory-projection-non-authoritative"
  | "bearer-transfer-plan-runtime"
  | "bearer-instrument-not-ownership"
  | "ownership-transition-with-sealed-artifact"
  | "scoped-proof-capability-not-proof-authority"
  | "granted-scope-projection-non-authoritative"
  | "exact-head-namespace-projection-non-authoritative"
  | "accepted-phi-movement-with-report-only-receipt"
  | "execution-outcome-projection-non-authoritative"
  | "kai-coordinate-projection-non-authoritative"
  | "proof-authority-challenge-not-proof-authority"
  | "server-custodied-authority-session-not-proof-authority"
  | "operational-capability-report-non-authoritative"
  | "authenticated-verified-additions-projection-non-authoritative"
  | "authenticated-checkpoint-projection-non-authoritative"
  | "access-filtered-private-additions-projection-non-authoritative"
  | "persisted-plan-handle-non-authoritative"
  | "privacy-safe-one-use-recipient-locator-non-authoritative"
  | "action-law-projection-non-authoritative"
  | "lawful-action-plan-runtime"
  | "verified-lawful-action-runtime"
  | "admitted-lawful-action-with-report-only-receipt"
  | "deterministic-value-head-projection-non-authoritative";

export type ReceizAppOperationProcessBoundary =
  | "reverify-exact-bytes"
  | "same-runtime-custody"
  | "local-identity-key-custody"
  | "projection-only";

export type ReceizAppOperationNamespacePolicy = "preserve-all-non-target" | "not-applicable";

export type ReceizAppOperationRequiredEvidence =
  | "exact-artifact-bytes"
  | "pinned-verifier-roots"
  | "verified-artifact-runtime"
  | "admission-profile"
  | "current-registry"
  | "verified-admission-runtime"
  | "verified-history-runtime"
  | "verified-actor-runtime"
  | "discovered-registry-law-runtime"
  | "sdk-plan-runtime"
  | "commit-domain"
  | "canonical-event"
  | "expected-head"
  | "idempotency-identity"
  | "identity-key-file"
  | "capability-payload"
  | "verified-capability-runtime"
  | "transition-sealer-runtime"
  | "conforming-transition-store-runtime"
  | "sealed-candidate-runtime"
  | "staged-candidate-reference"
  | "claimed-command"
  | "capability-verifier-runtime"
  | "consequence-projector-runtime"
  | "admission-store"
  | "projection-locator"
  | "v114-registry-runtime"
  | "v114-operation-matrix-runtime"
  | "literal-artifact-identity"
  | "canonical-genesis-body"
  | "unaccepted-head-expectation"
  | "verified-sibling-heads"
  | "exact-subject-artifact-bytes"
  | "subject-identity-digest"
  | "exact-subject-head"
  | "exact-ownership-head"
  | "registry-digest"
  | "reducer-digest"
  | "byte-exact-namespaces"
  | "proof-index-reference"
  | "exact-primary-proof-object-bytes"
  | "model-audit-digests"
  | "owner-capability"
  | "active-bounded-mandate"
  | "deterministic-world-reducer"
  | "exact-participant-heads"
  | "event-citations"
  | "one-time-claim-capability"
  | "transfer-policy-digest"
  | "instrument-expiry-and-replay-state"
  | "application-bound-challenge"
  | "explicit-consent"
  | "minimum-scope-set"
  | "short-lived-non-refreshable-capability"
  | "rail-identity"
  | "amount-phi-micro"
  | "persisted-canonical-intent"
  | "exact-execution-outcome"
  | "genesis-epoch"
  | "phi-exact-ties-to-even-bridge"
  | "live-whole-pulse"
  | "server-custodied-session"
  | "exact-domain-head"
  | "exact-revocation-head"
  | "authenticated-transport"
  | "closed-wire-shape"
  | "access-grant-head"
  | "access-key-head"
  | "persisted-canonical-plan"
  | "semantic-idempotency-digest"
  | "immutable-terminal-outcome"
  | "atomic-compare-and-swap"
  | "public-recipient-consent"
  | "privacy-safe-rate-limit"
  | "one-use-purpose-bound-locator"
  | "current-action-law"
  | "exact-enclosing-proof-object"
  | "actor-subject-heads"
  | "causal-parent-heads"
  | "input-output-commitments"
  | "start-completion-kai"
  | "completion-witness"
  | "verified-portable-execution-authority"
  | "law-digest"
  | "action-idempotency-identity"
  | "one-spendable-membership"
  | "universal-kai-value-law"
  | "exact-settlement-head";

export type ReceizAppOperationAuthorityDeclaration = Readonly<{
  operation: (typeof RECEIZ_V125_APPLICATION_OPERATIONS)[number] | "conversation.source.open";
  authorityProfiles: readonly ReceizAuthorityProfile[];
  inputAuthority: ReceizAppOperationInputAuthority;
  requiredEvidence: readonly ReceizAppOperationRequiredEvidence[];
  outputAuthority: ReceizAppOperationOutputAuthority;
  processBoundary: ReceizAppOperationProcessBoundary;
  namespacePolicy: ReceizAppOperationNamespacePolicy;
  compatibleSdkRange:
    | typeof RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V115_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V116_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V117_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V118_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V119_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V121_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V122_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE
    | typeof RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE;
}>;

const V112_OPERATION_MATRIX = [
  { operation: "artifact.verify", authorityProfiles: [], inputAuthority: "exact-artifact-bytes", requiredEvidence: ["exact-artifact-bytes", "pinned-verifier-roots"], outputAuthority: "verified-artifact-runtime", processBoundary: "reverify-exact-bytes", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "artifact.admit", authorityProfiles: [], inputAuthority: "verified-artifact-runtime", requiredEvidence: ["verified-artifact-runtime", "admission-profile", "current-registry"], outputAuthority: "verified-admission-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "artifact.append.plan", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "verified-admission-runtime", requiredEvidence: ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"], outputAuthority: "sdk-plan-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "identity.capability.sign", authorityProfiles: [], inputAuthority: "identity-key-file", requiredEvidence: ["identity-key-file", "capability-payload"], outputAuthority: "signed-capability-claim-not-yet-verified", processBoundary: "local-identity-key-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "artifact.transition.seal", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "sdk-plan-runtime", requiredEvidence: ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"], outputAuthority: "sealed-candidate-proof-object-not-accepted-head", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "artifact.transition.stage", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "sealed-candidate-runtime", requiredEvidence: ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"], outputAuthority: "staged-candidate-locator-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "artifact.transition.commit", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "staged-candidate-reference", requiredEvidence: ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"], outputAuthority: "accepted-artifact-history-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "admission.command.execute", authorityProfiles: ["artifact-local", "global-shared", "projection-only", "simulation-only"], inputAuthority: "claimed-command", requiredEvidence: ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"], outputAuthority: "admission-receipt-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
  { operation: "public-proof.projection.locate", authorityProfiles: ["projection-only"], inputAuthority: "projection-only", requiredEvidence: ["projection-locator"], outputAuthority: "exact-artifact-bytes-not-yet-verified", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];

export const RECEIZ_V112_APPLICATION_OPERATION_MATRIX = Object.freeze(V112_OPERATION_MATRIX.map((row) => Object.freeze({
  ...row,
  authorityProfiles: Object.freeze([...row.authorityProfiles]),
  requiredEvidence: Object.freeze([...row.requiredEvidence]),
}))) as unknown as typeof V112_OPERATION_MATRIX;

export const RECEIZ_V112_APPLICATION_OPERATION_MATRIX_DIGEST = "d8654731e25c3d3fbe67f5313c189a843551b87fe692cf9c683596d47a5bf877" as const;

const V113_OPERATION_MATRIX = [
  ...V112_OPERATION_MATRIX.map((row) => ({ ...row, compatibleSdkRange: RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE })),
  { operation: "artifact.global.resolve", authorityProfiles: ["global-shared", "projection-only"], inputAuthority: "projection-only", requiredEvidence: ["projection-locator", "commit-domain"], outputAuthority: "exact-artifact-bytes-not-yet-verified", processBoundary: "reverify-exact-bytes", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE },
  { operation: "artifact.offline.reconcile", authorityProfiles: ["global-shared"], inputAuthority: "exact-artifact-bytes", requiredEvidence: ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"], outputAuthority: "accepted-artifact-history-with-report-only-receipt", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];

export const RECEIZ_V113_APPLICATION_OPERATION_MATRIX = Object.freeze(V113_OPERATION_MATRIX.map((row) => Object.freeze({
  ...row,
  authorityProfiles: Object.freeze([...row.authorityProfiles]),
  requiredEvidence: Object.freeze([...row.requiredEvidence]),
}))) as unknown as typeof V113_OPERATION_MATRIX;

export const RECEIZ_V113_APPLICATION_OPERATION_MATRIX_DIGEST = "091ab9e6b3acb05283510a19754e53c637dbd96b47b499a524dc44c34f8e783b" as const;

const V114_OPERATION_MATRIX = [
  ...V113_OPERATION_MATRIX.map((row) => ({ ...row, compatibleSdkRange: RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE })),
  {
    operation: "profile-showcase.genesis.plan",
    authorityProfiles: ["artifact-local"],
    inputAuthority: "verified-actor-runtime",
    requiredEvidence: [
      "verified-actor-runtime",
      "v114-registry-runtime",
      "v114-operation-matrix-runtime",
      "literal-artifact-identity",
      "canonical-genesis-body",
      "unaccepted-head-expectation",
      "commit-domain",
      "idempotency-identity",
      "sdk-plan-runtime",
      "verified-capability-runtime",
      "transition-sealer-runtime",
    ],
    outputAuthority: "sdk-plan-runtime",
    processBoundary: "same-runtime-custody",
    namespacePolicy: "preserve-all-non-target",
    compatibleSdkRange: RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE,
  },
  {
    operation: "profile-showcase.append.plan",
    authorityProfiles: ["artifact-local"],
    inputAuthority: "verified-admission-runtime",
    requiredEvidence: [
      "verified-admission-runtime",
      "verified-history-runtime",
      "verified-actor-runtime",
      "v114-registry-runtime",
      "v114-operation-matrix-runtime",
      "canonical-event",
      "expected-head",
      "commit-domain",
      "idempotency-identity",
      "sdk-plan-runtime",
      "verified-capability-runtime",
      "transition-sealer-runtime",
      "conforming-transition-store-runtime",
    ],
    outputAuthority: "sdk-plan-runtime",
    processBoundary: "same-runtime-custody",
    namespacePolicy: "preserve-all-non-target",
    compatibleSdkRange: RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE,
  },
  {
    operation: "economy-showcase.genesis.plan",
    authorityProfiles: ["global-shared"],
    inputAuthority: "verified-actor-runtime",
    requiredEvidence: [
      "verified-actor-runtime",
      "v114-registry-runtime",
      "v114-operation-matrix-runtime",
      "literal-artifact-identity",
      "canonical-genesis-body",
      "unaccepted-head-expectation",
      "commit-domain",
      "idempotency-identity",
      "sdk-plan-runtime",
      "verified-capability-runtime",
      "transition-sealer-runtime",
    ],
    outputAuthority: "sdk-plan-runtime",
    processBoundary: "same-runtime-custody",
    namespacePolicy: "preserve-all-non-target",
    compatibleSdkRange: RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE,
  },
  {
    operation: "economy-showcase.append.plan",
    authorityProfiles: ["global-shared"],
    inputAuthority: "verified-admission-runtime",
    requiredEvidence: [
      "verified-admission-runtime",
      "verified-history-runtime",
      "verified-actor-runtime",
      "v114-registry-runtime",
      "v114-operation-matrix-runtime",
      "literal-artifact-identity",
      "canonical-event",
      "expected-head",
      "commit-domain",
      "idempotency-identity",
      "sdk-plan-runtime",
      "verified-capability-runtime",
      "transition-sealer-runtime",
      "conforming-transition-store-runtime",
    ],
    outputAuthority: "sdk-plan-runtime",
    processBoundary: "same-runtime-custody",
    namespacePolicy: "preserve-all-non-target",
    compatibleSdkRange: RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE,
  },
  {
    operation: "economy-showcase.merge.plan",
    authorityProfiles: ["global-shared"],
    inputAuthority: "verified-admission-runtime",
    requiredEvidence: [
      "verified-admission-runtime",
      "verified-history-runtime",
      "verified-sibling-heads",
      "verified-actor-runtime",
      "v114-registry-runtime",
      "v114-operation-matrix-runtime",
      "literal-artifact-identity",
      "canonical-event",
      "expected-head",
      "commit-domain",
      "idempotency-identity",
      "sdk-plan-runtime",
      "verified-capability-runtime",
      "transition-sealer-runtime",
      "conforming-transition-store-runtime",
    ],
    outputAuthority: "sdk-plan-runtime",
    processBoundary: "same-runtime-custody",
    namespacePolicy: "preserve-all-non-target",
    compatibleSdkRange: RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE,
  },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];

export const RECEIZ_V114_APPLICATION_OPERATION_MATRIX = Object.freeze(V114_OPERATION_MATRIX.map((row) => Object.freeze({
  ...row,
  authorityProfiles: Object.freeze([...row.authorityProfiles]),
  requiredEvidence: Object.freeze([...row.requiredEvidence]),
}))) as unknown as typeof V114_OPERATION_MATRIX;

export const RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST =
  "fd4ea8fccd867a0b9aab772ea6c5827ea8bdfe4c7fbed017c5a4843a40109c4f" as const;

const V115_OPERATION_MATRIX = V114_OPERATION_MATRIX.map((row) => ({
  ...row,
  compatibleSdkRange: RECEIZ_V115_APP_COMPATIBLE_SDK_RANGE,
})) as unknown as typeof V114_OPERATION_MATRIX;

export const RECEIZ_V115_APPLICATION_OPERATION_MATRIX = Object.freeze(
  V115_OPERATION_MATRIX.map((row) => Object.freeze({
    ...row,
    authorityProfiles: Object.freeze([...row.authorityProfiles]),
    requiredEvidence: Object.freeze([...row.requiredEvidence]),
  })),
) as unknown as typeof V115_OPERATION_MATRIX;

export const RECEIZ_V115_APPLICATION_OPERATION_MATRIX_DIGEST =
  "0393000708aada33c9f8bbcc4b98c9aa202a9d37036e67e09fc34c6815f77c8a" as const;

const V116_OPERATION_MATRIX = V115_OPERATION_MATRIX.map((row) => ({
  ...row,
  compatibleSdkRange: RECEIZ_V116_APP_COMPATIBLE_SDK_RANGE,
})) as unknown as typeof V115_OPERATION_MATRIX;

export const RECEIZ_V116_APPLICATION_OPERATION_MATRIX = Object.freeze(
  V116_OPERATION_MATRIX.map((row) => Object.freeze({
    ...row,
    authorityProfiles: Object.freeze([...row.authorityProfiles]),
    requiredEvidence: Object.freeze([...row.requiredEvidence]),
  })),
) as unknown as typeof V116_OPERATION_MATRIX;

export const RECEIZ_V116_APPLICATION_OPERATION_MATRIX_DIGEST =
  "ec5829eeec039c1f4885d056b8cd6cf6506d08547cee58daa229ecbd44155420" as const;

const V117_OPERATION_MATRIX = V116_OPERATION_MATRIX.map((row) => ({
  ...row,
  compatibleSdkRange: RECEIZ_V117_APP_COMPATIBLE_SDK_RANGE,
})) as unknown as typeof V116_OPERATION_MATRIX;

export const RECEIZ_V117_APPLICATION_OPERATION_MATRIX = Object.freeze(
  V117_OPERATION_MATRIX.map((row) => Object.freeze({
    ...row,
    authorityProfiles: Object.freeze([...row.authorityProfiles]),
    requiredEvidence: Object.freeze([...row.requiredEvidence]),
  })),
) as unknown as typeof V117_OPERATION_MATRIX;

export const RECEIZ_V117_APPLICATION_OPERATION_MATRIX_DIGEST =
  "6c71f54e2fd709f69ce35e8cf3112d9066b5b108b9d610768d9b16ad38d5cab5" as const;

const V118_OPERATION_MATRIX = V117_OPERATION_MATRIX.map((row) => ({
  ...row,
  compatibleSdkRange: RECEIZ_V118_APP_COMPATIBLE_SDK_RANGE,
})) as unknown as typeof V117_OPERATION_MATRIX;

export const RECEIZ_V118_APPLICATION_OPERATION_MATRIX = Object.freeze(
  V118_OPERATION_MATRIX.map((row) => Object.freeze({
    ...row,
    authorityProfiles: Object.freeze([...row.authorityProfiles]),
    requiredEvidence: Object.freeze([...row.requiredEvidence]),
  })),
) as unknown as typeof V118_OPERATION_MATRIX;

export const RECEIZ_V118_APPLICATION_OPERATION_MATRIX_DIGEST =
  "153b2472830567ec3b445c2c1b4102e4c036ed4c45cc374d40d0079096a40f54" as const;

const V119_OPERATION_MATRIX = V118_OPERATION_MATRIX.map((row) => ({
  ...row,
  compatibleSdkRange: RECEIZ_V119_APP_COMPATIBLE_SDK_RANGE,
})) as unknown as typeof V118_OPERATION_MATRIX;

export const RECEIZ_V119_APPLICATION_OPERATION_MATRIX = Object.freeze(
  V119_OPERATION_MATRIX.map((row) => Object.freeze({
    ...row,
    authorityProfiles: Object.freeze([...row.authorityProfiles]),
    requiredEvidence: Object.freeze([...row.requiredEvidence]),
  })),
) as unknown as typeof V119_OPERATION_MATRIX;

export const RECEIZ_V119_APPLICATION_OPERATION_MATRIX_DIGEST =
  "53cf9d6862b2396e2fe7864f8607c00c4e3b6e31b082ab5c5c8dff088fcb52c1" as const;

const V120_OPERATION_MATRIX = [
  ...V119_OPERATION_MATRIX.map((row) => ({ ...row, compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE })),
  { operation: "subject.resolve", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "subject-id", requiredEvidence: ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"], outputAuthority: "verified-subject-runtime", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "subject.brain.retrieve", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "subject-proof-reference", requiredEvidence: ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"], outputAuthority: "proof-context-non-authoritative", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "subject.twin.message", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "verified-subject-artifact-runtime", requiredEvidence: ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"], outputAuthority: "model-intent-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "subject.mandate.activate", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "subject-mandate-plan-runtime", requiredEvidence: ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"], outputAuthority: "active-mandate-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "world.command.plan", authorityProfiles: ["artifact-local", "global-shared", "simulation-only"], inputAuthority: "world-command-input", requiredEvidence: ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"], outputAuthority: "world-command-plan-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "world.command.execute", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "world-command-plan-runtime", requiredEvidence: ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"], outputAuthority: "accepted-world-event-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "world.transaction.plan", authorityProfiles: ["artifact-local", "global-shared", "simulation-only"], inputAuthority: "world-transaction-input", requiredEvidence: ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"], outputAuthority: "world-transaction-plan-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "world.transaction.execute", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "world-transaction-plan-runtime", requiredEvidence: ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"], outputAuthority: "accepted-world-event-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "subject.runtime.enqueue", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "subject-runtime-tick-input", requiredEvidence: ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"], outputAuthority: "runtime-job-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "subject.memory.project", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "verified-subject-artifact-runtime", requiredEvidence: ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"], outputAuthority: "event-memory-projection-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "bearer.transfer.plan", authorityProfiles: ["artifact-local", "global-shared", "simulation-only"], inputAuthority: "bearer-transfer-input", requiredEvidence: ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"], outputAuthority: "bearer-transfer-plan-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "bearer.instrument.issue", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "bearer-transfer-plan-runtime", requiredEvidence: ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"], outputAuthority: "bearer-instrument-not-ownership", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "bearer.instrument.claim", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "bearer-instrument-bytes", requiredEvidence: ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"], outputAuthority: "ownership-transition-with-sealed-artifact", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
  { operation: "bearer.transfer.cancel", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "bearer-transfer-plan-runtime", requiredEvidence: ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"], outputAuthority: "ownership-transition-with-sealed-artifact", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];

export const RECEIZ_V120_APPLICATION_OPERATION_MATRIX = Object.freeze(
  V120_OPERATION_MATRIX.map((row) => Object.freeze({
    ...row,
    authorityProfiles: Object.freeze([...row.authorityProfiles]),
    requiredEvidence: Object.freeze([...row.requiredEvidence]),
  })),
) as unknown as typeof V120_OPERATION_MATRIX;

export const RECEIZ_V120_APPLICATION_OPERATION_MATRIX_DIGEST =
  "1c779ee5ade4b877ae9c6922ab02ba96fffffeb7580f1cf105a59fbb4424f351" as const;

const V121_OPERATION_MATRIX = V120_OPERATION_MATRIX.map((row) => ({
  ...row,
  compatibleSdkRange: RECEIZ_V121_APP_COMPATIBLE_SDK_RANGE,
})) as unknown as typeof V120_OPERATION_MATRIX;

export const RECEIZ_V121_APPLICATION_OPERATION_MATRIX = Object.freeze(
  V121_OPERATION_MATRIX.map((row) => Object.freeze({
    ...row,
    authorityProfiles: Object.freeze([...row.authorityProfiles]),
    requiredEvidence: Object.freeze([...row.requiredEvidence]),
  })),
) as unknown as typeof V121_OPERATION_MATRIX;

// Locked by scripts/test_v121_release_lock.ts from the canonical JSON encoding.
export const RECEIZ_V121_APPLICATION_OPERATION_MATRIX_DIGEST =
  "208553829ba78a5536524b864577ce59989e2d0a994fad9598d39ae3d557c4f5" as const;
const V122_OPERATION_MATRIX = V121_OPERATION_MATRIX.map((row) => ({ ...row, compatibleSdkRange: RECEIZ_V122_APP_COMPATIBLE_SDK_RANGE })) as unknown as typeof V121_OPERATION_MATRIX;
export const RECEIZ_V122_APPLICATION_OPERATION_MATRIX = Object.freeze(V122_OPERATION_MATRIX.map((row) => Object.freeze({ ...row, authorityProfiles: Object.freeze([...row.authorityProfiles]), requiredEvidence: Object.freeze([...row.requiredEvidence]) }))) as unknown as typeof V122_OPERATION_MATRIX;
export const RECEIZ_V122_APPLICATION_OPERATION_MATRIX_DIGEST = "bd1d7ccf1543e2484df68e3025c7376f8ae37cafe1ca0d7c9cd9f52f6342b325" as const;
const V123_OPERATION_MATRIX = [
  ...V122_OPERATION_MATRIX.map((row) => ({ ...row, compatibleSdkRange: RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE })),
  { operation: "identity.proof-authority.exchange", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "proof-authority-challenge", requiredEvidence: ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set"], outputAuthority: "scoped-proof-capability-not-proof-authority", processBoundary: "reverify-exact-bytes", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE },
  { operation: "authorization.scopes.introspect", authorityProfiles: ["projection-only"], inputAuthority: "rail-scope-query", requiredEvidence: ["minimum-scope-set"], outputAuthority: "granted-scope-projection-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE },
  { operation: "subject.namespaces.resolve", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "subject-proof-reference", requiredEvidence: ["exact-subject-head", "exact-subject-artifact-bytes", "registry-digest", "reducer-digest", "byte-exact-namespaces"], outputAuthority: "exact-head-namespace-projection-non-authoritative", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE },
  { operation: "value.settlement.execute", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "value-intent-runtime", requiredEvidence: ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"], outputAuthority: "accepted-phi-movement-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE },
  { operation: "value.reserve.execute", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "value-intent-runtime", requiredEvidence: ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"], outputAuthority: "accepted-phi-movement-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE },
  { operation: "value.execution.resolve", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "value-intent-runtime", requiredEvidence: ["idempotency-identity", "exact-execution-outcome"], outputAuthority: "execution-outcome-projection-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];
export const RECEIZ_V123_APPLICATION_OPERATION_MATRIX = Object.freeze(V123_OPERATION_MATRIX.map((row) => Object.freeze({ ...row, authorityProfiles: Object.freeze([...row.authorityProfiles]), requiredEvidence: Object.freeze([...row.requiredEvidence]) }))) as unknown as typeof V123_OPERATION_MATRIX;
export const RECEIZ_V123_APPLICATION_OPERATION_MATRIX_DIGEST = "e08cec3e3ad22c20ddd6c08169ece19f094c366214d6d6b4dc432cd97558e2c5" as const;
const V124_OPERATION_MATRIX = [
  ...V123_OPERATION_MATRIX.map((row) => ({ ...row, compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE })),
  { operation: "time.kai.now", authorityProfiles: ["artifact-local", "projection-only"], inputAuthority: "kai-genesis-phi-bridge", requiredEvidence: ["genesis-epoch", "phi-exact-ties-to-even-bridge"], outputAuthority: "kai-coordinate-projection-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "identity.proof-authority.challenge.create", authorityProfiles: ["artifact-local", "projection-only"], inputAuthority: "kai-genesis-phi-bridge", requiredEvidence: ["live-whole-pulse", "application-bound-challenge", "minimum-scope-set"], outputAuthority: "proof-authority-challenge-not-proof-authority", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "runtime.authority-session.open", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "proof-authority-challenge", requiredEvidence: ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set", "exact-subject-head", "exact-revocation-head"], outputAuthority: "server-custodied-authority-session-not-proof-authority", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "runtime.authority-session.refresh", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "authority-session-handle", requiredEvidence: ["server-custodied-session", "application-bound-challenge", "explicit-consent", "exact-subject-head", "exact-revocation-head"], outputAuthority: "server-custodied-authority-session-not-proof-authority", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "runtime.authority-session.close", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "authority-session-handle", requiredEvidence: ["server-custodied-session", "exact-revocation-head"], outputAuthority: "execution-outcome-projection-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "runtime.capabilities.qualify", authorityProfiles: ["global-shared", "projection-only"], inputAuthority: "rail-scope-query", requiredEvidence: ["minimum-scope-set", "exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport"], outputAuthority: "operational-capability-report-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "domain.verified-additions.resolve", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "domain-replay-wire", requiredEvidence: ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape"], outputAuthority: "authenticated-verified-additions-projection-non-authoritative", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "domain.replay.verify", authorityProfiles: ["artifact-local", "projection-only"], inputAuthority: "domain-replay-wire", requiredEvidence: ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "canonical-event"], outputAuthority: "authenticated-verified-additions-projection-non-authoritative", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "domain.checkpoint.verify", authorityProfiles: ["artifact-local", "projection-only"], inputAuthority: "domain-checkpoint-wire", requiredEvidence: ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "byte-exact-namespaces"], outputAuthority: "authenticated-checkpoint-projection-non-authoritative", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "domain.private-additions.resolve", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "private-domain-query", requiredEvidence: ["exact-subject-head", "exact-domain-head", "access-grant-head", "access-key-head", "authenticated-transport"], outputAuthority: "access-filtered-private-additions-projection-non-authoritative", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "execution.stage", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "durable-execution-input", requiredEvidence: ["persisted-canonical-plan", "semantic-idempotency-digest", "exact-participant-heads", "registry-digest", "reducer-digest"], outputAuthority: "persisted-plan-handle-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "execution.execute", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "durable-execution-handle", requiredEvidence: ["persisted-canonical-plan", "server-custodied-session", "exact-participant-heads", "atomic-compare-and-swap", "semantic-idempotency-digest"], outputAuthority: "accepted-world-event-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "execution.resolve", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "durable-execution-handle", requiredEvidence: ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"], outputAuthority: "execution-outcome-projection-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "execution.resolve-by-idempotency-key", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "durable-execution-input", requiredEvidence: ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"], outputAuthority: "execution-outcome-projection-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "execution.cancel", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "durable-execution-handle", requiredEvidence: ["persisted-canonical-plan", "server-custodied-session", "semantic-idempotency-digest", "immutable-terminal-outcome"], outputAuthority: "execution-outcome-projection-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "execution.atomic-mutation.plan", authorityProfiles: ["artifact-local", "global-shared", "simulation-only"], inputAuthority: "world-transaction-input", requiredEvidence: ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest", "byte-exact-namespaces"], outputAuthority: "world-transaction-plan-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
  { operation: "identity.public-recipient.resolve", authorityProfiles: ["global-shared", "projection-only"], inputAuthority: "public-recipient-query", requiredEvidence: ["public-recipient-consent", "privacy-safe-rate-limit", "one-use-purpose-bound-locator", "exact-subject-head", "authenticated-transport"], outputAuthority: "privacy-safe-one-use-recipient-locator-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];
export const RECEIZ_V124_APPLICATION_OPERATION_MATRIX = Object.freeze(V124_OPERATION_MATRIX.map((row) => Object.freeze({ ...row, authorityProfiles: Object.freeze([...row.authorityProfiles]), requiredEvidence: Object.freeze([...row.requiredEvidence]) }))) as unknown as typeof V124_OPERATION_MATRIX;
export const RECEIZ_V124_APPLICATION_OPERATION_MATRIX_DIGEST = "540d1c1bf39f1b288b257c79a6e020bdcc5e587fc9b7dbf6b7aaa5d082e20ad5" as const;
const V125_OPERATION_MATRIX = [
  ...V124_OPERATION_MATRIX.map((row) => ({ ...row, compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE })),
  { operation: "action.law.resolve", authorityProfiles: ["artifact-local", "projection-only"], inputAuthority: "lawful-action-law-query", requiredEvidence: ["current-registry", "registry-digest", "current-action-law"], outputAuthority: "action-law-projection-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
  { operation: "action.plan", authorityProfiles: ["artifact-local", "global-shared", "simulation-only"], inputAuthority: "lawful-action-plan-input", requiredEvidence: ["current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "law-digest", "action-idempotency-identity"], outputAuthority: "lawful-action-plan-runtime", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
  { operation: "action.proof.verify", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "lawful-action-proof", requiredEvidence: ["exact-enclosing-proof-object", "pinned-verifier-roots", "current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "completion-witness", "law-digest", "action-idempotency-identity"], outputAuthority: "verified-lawful-action-runtime", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
  { operation: "action.admit", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "verified-lawful-action-runtime", requiredEvidence: ["verified-artifact-runtime", "current-action-law", "verified-portable-execution-authority", "completion-witness", "action-idempotency-identity", "exact-subject-head", "admission-store"], outputAuthority: "admitted-lawful-action-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
  { operation: "action.value-head.derive", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "lawful-action-admission-runtime", requiredEvidence: ["exact-enclosing-proof-object", "universal-kai-value-law", "one-spendable-membership", "exact-ownership-head", "start-completion-kai", "law-digest"], outputAuthority: "deterministic-value-head-projection-non-authoritative", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
  { operation: "action.settlement.execute", authorityProfiles: ["artifact-local", "global-shared"], inputAuthority: "lawful-action-admission-runtime", requiredEvidence: ["exact-settlement-head", "one-spendable-membership", "owner-capability", "action-idempotency-identity", "persisted-canonical-plan"], outputAuthority: "accepted-phi-movement-with-report-only-receipt", processBoundary: "same-runtime-custody", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
  { operation: "action.outcome.resolve", authorityProfiles: ["artifact-local", "global-shared", "projection-only"], inputAuthority: "lawful-action-admission-runtime", requiredEvidence: ["action-idempotency-identity", "immutable-terminal-outcome", "authenticated-transport"], outputAuthority: "execution-outcome-projection-non-authoritative", processBoundary: "projection-only", namespacePolicy: "not-applicable", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];
export const RECEIZ_V125_APPLICATION_OPERATION_MATRIX = Object.freeze(V125_OPERATION_MATRIX.map((row) => Object.freeze({ ...row, authorityProfiles: Object.freeze([...row.authorityProfiles]), requiredEvidence: Object.freeze([...row.requiredEvidence]) }))) as unknown as typeof V125_OPERATION_MATRIX;
export const RECEIZ_V125_APPLICATION_OPERATION_MATRIX_DIGEST = "17c98e99c3f54b7a18dea9f2466a49ea2ac5da4d1cf0a90c723560184a314a6c" as const;
const CONVERSATION_CANDIDATE_OPERATION_MATRIX = [
  ...RECEIZ_V125_APPLICATION_OPERATION_MATRIX,
  { operation: "conversation.source.open", authorityProfiles: ["artifact-local", "projection-only"], inputAuthority: "domain-replay-wire", requiredEvidence: ["exact-enclosing-proof-object", "registry-digest", "reducer-digest", "actor-subject-heads", "causal-parent-heads", "byte-exact-namespaces"], outputAuthority: "authenticated-verified-additions-projection-non-authoritative", processBoundary: "reverify-exact-bytes", namespacePolicy: "preserve-all-non-target", compatibleSdkRange: RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE },
] as const satisfies readonly ReceizAppOperationAuthorityDeclaration[];
export const RECEIZ_CONVERSATION_CANDIDATE_APPLICATION_OPERATION_MATRIX = Object.freeze(CONVERSATION_CANDIDATE_OPERATION_MATRIX.map((row) => Object.freeze({ ...row, authorityProfiles: Object.freeze([...row.authorityProfiles]), requiredEvidence: Object.freeze([...row.requiredEvidence]) }))) as unknown as typeof CONVERSATION_CANDIDATE_OPERATION_MATRIX;
export const RECEIZ_CONVERSATION_CANDIDATE_APPLICATION_OPERATION_MATRIX_DIGEST = "b578dc6ac0ec6523808534894c989ecbe8b182c2fd98eff37d130a55b8abb2de" as const;
// Historical v126 compilation keeps its exact matrix and digest after promotion.
export const RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE = ">=126.0.0 <127.0.0" as const;
export const RECEIZ_V126_APPLICATION_OPERATION_MATRIX = Object.freeze(RECEIZ_V125_APPLICATION_OPERATION_MATRIX.map((row) => Object.freeze({ ...row, compatibleSdkRange: RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE })));
export const RECEIZ_V126_APPLICATION_OPERATION_MATRIX_DIGEST = "42c7f0924df91b4ba11c1b891fee2b92abb509430a86b030735c23d055e67949" as const;
export const RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE = RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE;
export const RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX = Object.freeze(RECEIZ_V125_APPLICATION_OPERATION_MATRIX.map((row) => Object.freeze({ ...row, compatibleSdkRange: RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE })));
export const RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST = "c4e0cff348b62f31db2bb2ffdeec533a92ca3a6d476757bb9b559ac58a7875e1" as const;

export const RECEIZ_V112_APP_CLIENT_SURFACES = Object.freeze([
  Object.freeze({ name: "client.identity.signCapability", boundary: "local-identity-key-custody", output: "signed-capability-claim-not-yet-verified" }),
  Object.freeze({ name: "client.admission.createEngine", boundary: "runtime-composition-only" }),
  Object.freeze({ name: "client.admission.browserStore", boundary: "durable-admission-coordination-only", storesProofObjects: false, storesSealedArtifactBytes: false, blocksKnownArtifactFirstPaint: false }),
] as const);

export const RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES = Object.freeze([
  "client.admission.remoteStore",
  "client.admission.reconcileOffline",
] as const);

export const RECEIZ_APP_FRAMEWORKS = ["framework-neutral", "nextjs-app-router"] as const;
export type ReceizAppFramework = (typeof RECEIZ_APP_FRAMEWORKS)[number];

export const RECEIZ_APP_FEATURES = [
  "identity",
  "proof",
  "proofMemory",
  "publicStore",
  "commerce",
  "media",
  "webhooks",
  "world",
  "subjects",
] as const;
export type ReceizAppFeature = (typeof RECEIZ_APP_FEATURES)[number];

export type ReceizAppContract = Readonly<{
  schema: typeof RECEIZ_APP_CONTRACT_SCHEMA;
  name: string;
  framework: ReceizAppFramework;
  features: readonly ReceizAppFeature[];
  authority: Readonly<{
    mode: "artifact-first";
    allowDatabaseAuthority: false;
  }>;
  deployment: Readonly<{
    target: "vercel" | "node" | "custom";
  }>;
  operations?: readonly ReceizAppOperationAuthorityDeclaration[];
}>;

export type ReceizAppContractValidationIssue = Readonly<{
  code:
    | "invalid_contract"
    | "invalid_schema"
    | "invalid_name"
    | "unsupported_framework"
    | "unsupported_feature"
    | "duplicate_feature"
    | "invalid_authority"
    | "database_authority_forbidden"
    | "invalid_deployment"
    | "invalid_operation_matrix"
    | "unknown_key";
  path: string;
  message: string;
}>;

export type ReceizAppContractValidationResult =
  | Readonly<{ ok: true; value: ReceizAppContract; issues: readonly [] }>
  | Readonly<{ ok: false; issues: readonly ReceizAppContractValidationIssue[] }>;

const ROOT_KEYS = new Set(["schema", "name", "framework", "features", "authority", "deployment", "operations"]);
const AUTHORITY_KEYS = new Set(["mode", "allowDatabaseAuthority"]);
const DEPLOYMENT_KEYS = new Set(["target"]);
const FRAMEWORKS = new Set<string>(RECEIZ_APP_FRAMEWORKS);
const FEATURES = new Set<string>(RECEIZ_APP_FEATURES);
const DEPLOYMENTS = new Set(["vercel", "node", "custom"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const OPERATION_KEYS = [
  "authorityProfiles",
  "compatibleSdkRange",
  "inputAuthority",
  "namespacePolicy",
  "operation",
  "outputAuthority",
  "processBoundary",
  "requiredEvidence",
] as const;

function exactStringSet(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((item): item is string => typeof item === "string")
    && new Set(value).size === value.length
    && expected.every((item) => value.includes(item));
}

function matchesOperationMatrix(value: unknown, matrix: readonly ReceizAppOperationAuthorityDeclaration[]): boolean {
  if (!Array.isArray(value) || value.length !== matrix.length) return false;
  return matrix.every((expected) => {
    const matches = value.filter((candidate) => isRecord(candidate) && candidate.operation === expected.operation);
    if (matches.length !== 1) return false;
    const candidate = matches[0]!;
    if (Object.keys(candidate).sort().join("\0") !== OPERATION_KEYS.join("\0")) return false;
    return exactStringSet(candidate.authorityProfiles, expected.authorityProfiles)
      && exactStringSet(candidate.requiredEvidence, expected.requiredEvidence)
      && candidate.inputAuthority === expected.inputAuthority
      && candidate.outputAuthority === expected.outputAuthority
      && candidate.processBoundary === expected.processBoundary
      && candidate.namespacePolicy === expected.namespacePolicy
      && candidate.compatibleSdkRange === expected.compatibleSdkRange;
  });
}

function recognizedOperationMatrix(value: unknown): readonly ReceizAppOperationAuthorityDeclaration[] | null {
  if (matchesOperationMatrix(value, RECEIZ_CONVERSATION_CANDIDATE_APPLICATION_OPERATION_MATRIX)) return RECEIZ_CONVERSATION_CANDIDATE_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX)) return RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V126_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V126_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V125_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V125_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V124_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V124_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V123_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V123_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V122_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V122_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V121_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V121_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V120_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V120_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V119_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V119_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V118_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V118_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V117_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V117_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V116_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V116_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V115_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V115_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V114_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V114_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V113_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V113_APPLICATION_OPERATION_MATRIX;
  if (matchesOperationMatrix(value, RECEIZ_V112_APPLICATION_OPERATION_MATRIX)) return RECEIZ_V112_APPLICATION_OPERATION_MATRIX;
  return null;
}

function unknownKeyIssues(value: Record<string, unknown>, allowed: Set<string>, path: string): ReceizAppContractValidationIssue[] {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort()
    .map((key) => ({ code: "unknown_key", path: `${path}.${key}`, message: `Unknown contract key: ${path}.${key}` }));
}

export function validateReceizAppContract(input: unknown): ReceizAppContractValidationResult {
  if (!isRecord(input)) {
    return { ok: false, issues: [{ code: "invalid_contract", path: "$", message: "Receiz app contract must be an object." }] };
  }

  const issues: ReceizAppContractValidationIssue[] = unknownKeyIssues(input, ROOT_KEYS, "$");
  if (input.schema !== RECEIZ_APP_CONTRACT_SCHEMA) {
    issues.push({ code: "invalid_schema", path: "$.schema", message: `schema must equal ${RECEIZ_APP_CONTRACT_SCHEMA}` });
  }
  if (typeof input.name !== "string" || input.name.trim().length < 1 || input.name.trim().length > 120) {
    issues.push({ code: "invalid_name", path: "$.name", message: "name must be 1-120 visible characters." });
  }
  if (typeof input.framework !== "string" || !FRAMEWORKS.has(input.framework)) {
    issues.push({ code: "unsupported_framework", path: "$.framework", message: `unsupported_framework: ${String(input.framework)}` });
  }

  const features: string[] = [];
  if (!Array.isArray(input.features)) {
    issues.push({ code: "unsupported_feature", path: "$.features", message: "features must be an array of supported feature names." });
  } else {
    const seen = new Set<string>();
    for (const [index, value] of input.features.entries()) {
      if (typeof value !== "string" || !FEATURES.has(value)) {
        issues.push({ code: "unsupported_feature", path: `$.features[${index}]`, message: `Unsupported feature: ${String(value)}` });
        continue;
      }
      if (seen.has(value)) {
        issues.push({ code: "duplicate_feature", path: `$.features[${index}]`, message: `Duplicate feature: ${value}` });
        continue;
      }
      seen.add(value);
      features.push(value);
    }
  }

  if (!isRecord(input.authority)) {
    issues.push({ code: "invalid_authority", path: "$.authority", message: "authority must declare artifact-first mode." });
  } else {
    issues.push(...unknownKeyIssues(input.authority, AUTHORITY_KEYS, "$.authority"));
    if (input.authority.mode !== "artifact-first") {
      issues.push({ code: "invalid_authority", path: "$.authority.mode", message: "authority.mode must be artifact-first." });
    }
    if (input.authority.allowDatabaseAuthority !== false) {
      issues.push({ code: "database_authority_forbidden", path: "$.authority.allowDatabaseAuthority", message: "Database authority is forbidden for Receiz proof truth." });
    }
  }

  if (!isRecord(input.deployment)) {
    issues.push({ code: "invalid_deployment", path: "$.deployment", message: "deployment must declare a supported target." });
  } else {
    issues.push(...unknownKeyIssues(input.deployment, DEPLOYMENT_KEYS, "$.deployment"));
    if (typeof input.deployment.target !== "string" || !DEPLOYMENTS.has(input.deployment.target)) {
      issues.push({ code: "invalid_deployment", path: "$.deployment.target", message: `Unsupported deployment target: ${String(input.deployment.target)}` });
    }
  }

  const operationMatrix = input.operations === undefined ? null : recognizedOperationMatrix(input.operations);
  if (input.operations !== undefined && operationMatrix === null) {
    issues.push({
      code: "invalid_operation_matrix",
      path: "$.operations",
      message: "operations must equal one complete exact Receiz application authority matrix.",
    });
  }

  issues.sort((left, right) => left.path.localeCompare(right.path) || left.code.localeCompare(right.code));
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    issues: [],
    value: {
      schema: RECEIZ_APP_CONTRACT_SCHEMA,
      name: (input.name as string).trim(),
      framework: input.framework as ReceizAppFramework,
      features: features as ReceizAppFeature[],
      authority: { mode: "artifact-first", allowDatabaseAuthority: false },
      deployment: { target: (input.deployment as Record<string, unknown>).target as "vercel" | "node" | "custom" },
      ...(operationMatrix !== null ? { operations: operationMatrix } : {}),
    },
  };
}

export function defineReceizApp<const T extends ReceizAppContract>(contract: T): T {
  const result = validateReceizAppContract(contract);
  if (!result.ok) {
    throw new Error(result.issues.map((issue) => `${issue.code}:${issue.path}`).join(","));
  }
  return contract;
}
