import { RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE } from "./currentRelease.generated.js";
import type { ReceizAuthorityProfile } from "./commandAdmission.js";
export declare const RECEIZ_APP_CONTRACT_SCHEMA: "receiz.app.contract.v1";
export declare const RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE: ">=112.0.0 <113.0.0";
export declare const RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE: ">=113.0.0 <114.0.0";
export declare const RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE: ">=114.0.0 <115.0.0";
export declare const RECEIZ_V115_APP_COMPATIBLE_SDK_RANGE: ">=115.0.0 <116.0.0";
export declare const RECEIZ_V116_APP_COMPATIBLE_SDK_RANGE: ">=116.0.0 <117.0.0";
export declare const RECEIZ_V117_APP_COMPATIBLE_SDK_RANGE: ">=117.0.0 <118.0.0";
export declare const RECEIZ_V118_APP_COMPATIBLE_SDK_RANGE: ">=118.0.0 <119.0.0";
export declare const RECEIZ_V119_APP_COMPATIBLE_SDK_RANGE: ">=119.0.0 <120.0.0";
export declare const RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE: ">=120.0.0 <121.0.0";
export declare const RECEIZ_V121_APP_COMPATIBLE_SDK_RANGE: ">=121.0.0 <122.0.0";
export declare const RECEIZ_V122_APP_COMPATIBLE_SDK_RANGE: ">=122.0.0 <123.0.0";
export declare const RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE: ">=123.0.0 <124.0.0";
export declare const RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE: ">=124.0.0 <125.0.0";
export declare const RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE: ">=125.0.0 <126.0.0";
export declare const RECEIZ_V112_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate"];
export declare const RECEIZ_V113_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile"];
export declare const RECEIZ_V114_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan"];
export declare const RECEIZ_V115_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan"];
export declare const RECEIZ_V116_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan"];
export declare const RECEIZ_V117_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan"];
export declare const RECEIZ_V118_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan"];
export declare const RECEIZ_V119_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan"];
export declare const RECEIZ_V120_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan", "subject.resolve", "subject.brain.retrieve", "subject.twin.message", "subject.mandate.activate", "world.command.plan", "world.command.execute", "world.transaction.plan", "world.transaction.execute", "subject.runtime.enqueue", "subject.memory.project", "bearer.transfer.plan", "bearer.instrument.issue", "bearer.instrument.claim", "bearer.transfer.cancel"];
export declare const RECEIZ_V121_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan", "subject.resolve", "subject.brain.retrieve", "subject.twin.message", "subject.mandate.activate", "world.command.plan", "world.command.execute", "world.transaction.plan", "world.transaction.execute", "subject.runtime.enqueue", "subject.memory.project", "bearer.transfer.plan", "bearer.instrument.issue", "bearer.instrument.claim", "bearer.transfer.cancel"];
export declare const RECEIZ_V122_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan", "subject.resolve", "subject.brain.retrieve", "subject.twin.message", "subject.mandate.activate", "world.command.plan", "world.command.execute", "world.transaction.plan", "world.transaction.execute", "subject.runtime.enqueue", "subject.memory.project", "bearer.transfer.plan", "bearer.instrument.issue", "bearer.instrument.claim", "bearer.transfer.cancel"];
export declare const RECEIZ_V123_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan", "subject.resolve", "subject.brain.retrieve", "subject.twin.message", "subject.mandate.activate", "world.command.plan", "world.command.execute", "world.transaction.plan", "world.transaction.execute", "subject.runtime.enqueue", "subject.memory.project", "bearer.transfer.plan", "bearer.instrument.issue", "bearer.instrument.claim", "bearer.transfer.cancel", "identity.proof-authority.exchange", "authorization.scopes.introspect", "subject.namespaces.resolve", "value.settlement.execute", "value.reserve.execute", "value.execution.resolve"];
export declare const RECEIZ_V124_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan", "subject.resolve", "subject.brain.retrieve", "subject.twin.message", "subject.mandate.activate", "world.command.plan", "world.command.execute", "world.transaction.plan", "world.transaction.execute", "subject.runtime.enqueue", "subject.memory.project", "bearer.transfer.plan", "bearer.instrument.issue", "bearer.instrument.claim", "bearer.transfer.cancel", "identity.proof-authority.exchange", "authorization.scopes.introspect", "subject.namespaces.resolve", "value.settlement.execute", "value.reserve.execute", "value.execution.resolve", "time.kai.now", "identity.proof-authority.challenge.create", "runtime.authority-session.open", "runtime.authority-session.refresh", "runtime.authority-session.close", "runtime.capabilities.qualify", "domain.verified-additions.resolve", "domain.replay.verify", "domain.checkpoint.verify", "domain.private-additions.resolve", "execution.stage", "execution.execute", "execution.resolve", "execution.resolve-by-idempotency-key", "execution.cancel", "execution.atomic-mutation.plan", "identity.public-recipient.resolve"];
export declare const RECEIZ_V125_APPLICATION_OPERATIONS: readonly ["artifact.verify", "artifact.admit", "artifact.append.plan", "identity.capability.sign", "artifact.transition.seal", "artifact.transition.stage", "artifact.transition.commit", "admission.command.execute", "public-proof.projection.locate", "artifact.global.resolve", "artifact.offline.reconcile", "profile-showcase.genesis.plan", "profile-showcase.append.plan", "economy-showcase.genesis.plan", "economy-showcase.append.plan", "economy-showcase.merge.plan", "subject.resolve", "subject.brain.retrieve", "subject.twin.message", "subject.mandate.activate", "world.command.plan", "world.command.execute", "world.transaction.plan", "world.transaction.execute", "subject.runtime.enqueue", "subject.memory.project", "bearer.transfer.plan", "bearer.instrument.issue", "bearer.instrument.claim", "bearer.transfer.cancel", "identity.proof-authority.exchange", "authorization.scopes.introspect", "subject.namespaces.resolve", "value.settlement.execute", "value.reserve.execute", "value.execution.resolve", "time.kai.now", "identity.proof-authority.challenge.create", "runtime.authority-session.open", "runtime.authority-session.refresh", "runtime.authority-session.close", "runtime.capabilities.qualify", "domain.verified-additions.resolve", "domain.replay.verify", "domain.checkpoint.verify", "domain.private-additions.resolve", "execution.stage", "execution.execute", "execution.resolve", "execution.resolve-by-idempotency-key", "execution.cancel", "execution.atomic-mutation.plan", "identity.public-recipient.resolve", "action.law.resolve", "action.plan", "action.proof.verify", "action.admit", "action.value-head.derive", "action.settlement.execute", "action.outcome.resolve"];
export type ReceizAppOperationInputAuthority = "exact-artifact-bytes" | "verified-artifact-runtime" | "verified-admission-runtime" | "verified-actor-runtime" | "identity-key-file" | "sdk-plan-runtime" | "sealed-candidate-runtime" | "staged-candidate-reference" | "claimed-command" | "projection-only" | "subject-id" | "subject-proof-reference" | "verified-subject-artifact-runtime" | "subject-mandate-plan-runtime" | "world-command-input" | "world-command-plan-runtime" | "world-transaction-input" | "world-transaction-plan-runtime" | "subject-runtime-tick-input" | "bearer-transfer-input" | "bearer-transfer-plan-runtime" | "bearer-instrument-bytes" | "proof-authority-challenge" | "rail-scope-query" | "value-intent-runtime" | "kai-genesis-phi-bridge" | "authority-session-handle" | "domain-replay-wire" | "domain-checkpoint-wire" | "private-domain-query" | "durable-execution-input" | "durable-execution-handle" | "public-recipient-query" | "lawful-action-law-query" | "lawful-action-plan-input" | "lawful-action-proof" | "verified-lawful-action-runtime" | "lawful-action-admission-runtime";
export type ReceizAppOperationOutputAuthority = "verified-artifact-runtime" | "verified-admission-runtime" | "sdk-plan-runtime" | "signed-capability-claim-not-yet-verified" | "sealed-candidate-proof-object-not-accepted-head" | "staged-candidate-locator-non-authoritative" | "accepted-artifact-history-with-report-only-receipt" | "admission-receipt-non-authoritative" | "exact-artifact-bytes-not-yet-verified" | "verified-subject-runtime" | "proof-context-non-authoritative" | "model-intent-non-authoritative" | "active-mandate-runtime" | "world-command-plan-runtime" | "accepted-world-event-with-report-only-receipt" | "world-transaction-plan-runtime" | "runtime-job-non-authoritative" | "event-memory-projection-non-authoritative" | "bearer-transfer-plan-runtime" | "bearer-instrument-not-ownership" | "ownership-transition-with-sealed-artifact" | "scoped-proof-capability-not-proof-authority" | "granted-scope-projection-non-authoritative" | "exact-head-namespace-projection-non-authoritative" | "accepted-phi-movement-with-report-only-receipt" | "execution-outcome-projection-non-authoritative" | "kai-coordinate-projection-non-authoritative" | "proof-authority-challenge-not-proof-authority" | "server-custodied-authority-session-not-proof-authority" | "operational-capability-report-non-authoritative" | "authenticated-verified-additions-projection-non-authoritative" | "authenticated-checkpoint-projection-non-authoritative" | "access-filtered-private-additions-projection-non-authoritative" | "persisted-plan-handle-non-authoritative" | "privacy-safe-one-use-recipient-locator-non-authoritative" | "action-law-projection-non-authoritative" | "lawful-action-plan-runtime" | "verified-lawful-action-runtime" | "admitted-lawful-action-with-report-only-receipt" | "deterministic-value-head-projection-non-authoritative";
export type ReceizAppOperationProcessBoundary = "reverify-exact-bytes" | "same-runtime-custody" | "local-identity-key-custody" | "projection-only";
export type ReceizAppOperationNamespacePolicy = "preserve-all-non-target" | "not-applicable";
export type ReceizAppOperationRequiredEvidence = "exact-artifact-bytes" | "pinned-verifier-roots" | "verified-artifact-runtime" | "admission-profile" | "current-registry" | "verified-admission-runtime" | "verified-history-runtime" | "verified-actor-runtime" | "discovered-registry-law-runtime" | "sdk-plan-runtime" | "commit-domain" | "canonical-event" | "expected-head" | "idempotency-identity" | "identity-key-file" | "capability-payload" | "verified-capability-runtime" | "transition-sealer-runtime" | "conforming-transition-store-runtime" | "sealed-candidate-runtime" | "staged-candidate-reference" | "claimed-command" | "capability-verifier-runtime" | "consequence-projector-runtime" | "admission-store" | "projection-locator" | "v114-registry-runtime" | "v114-operation-matrix-runtime" | "literal-artifact-identity" | "canonical-genesis-body" | "unaccepted-head-expectation" | "verified-sibling-heads" | "exact-subject-artifact-bytes" | "subject-identity-digest" | "exact-subject-head" | "exact-ownership-head" | "registry-digest" | "reducer-digest" | "byte-exact-namespaces" | "proof-index-reference" | "exact-primary-proof-object-bytes" | "model-audit-digests" | "owner-capability" | "active-bounded-mandate" | "deterministic-world-reducer" | "exact-participant-heads" | "event-citations" | "one-time-claim-capability" | "transfer-policy-digest" | "instrument-expiry-and-replay-state" | "application-bound-challenge" | "explicit-consent" | "minimum-scope-set" | "short-lived-non-refreshable-capability" | "rail-identity" | "amount-phi-micro" | "persisted-canonical-intent" | "exact-execution-outcome" | "genesis-epoch" | "phi-exact-ties-to-even-bridge" | "live-whole-pulse" | "server-custodied-session" | "exact-domain-head" | "exact-revocation-head" | "authenticated-transport" | "closed-wire-shape" | "access-grant-head" | "access-key-head" | "persisted-canonical-plan" | "semantic-idempotency-digest" | "immutable-terminal-outcome" | "atomic-compare-and-swap" | "public-recipient-consent" | "privacy-safe-rate-limit" | "one-use-purpose-bound-locator" | "current-action-law" | "exact-enclosing-proof-object" | "actor-subject-heads" | "causal-parent-heads" | "input-output-commitments" | "start-completion-kai" | "completion-witness" | "verified-portable-execution-authority" | "law-digest" | "action-idempotency-identity" | "one-spendable-membership" | "universal-kai-value-law" | "exact-settlement-head";
export type ReceizAppOperationAuthorityDeclaration = Readonly<{
    operation: (typeof RECEIZ_V125_APPLICATION_OPERATIONS)[number] | "conversation.source.open";
    authorityProfiles: readonly ReceizAuthorityProfile[];
    inputAuthority: ReceizAppOperationInputAuthority;
    requiredEvidence: readonly ReceizAppOperationRequiredEvidence[];
    outputAuthority: ReceizAppOperationOutputAuthority;
    processBoundary: ReceizAppOperationProcessBoundary;
    namespacePolicy: ReceizAppOperationNamespacePolicy;
    compatibleSdkRange: typeof RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V114_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V115_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V116_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V117_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V118_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V119_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V120_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V121_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V122_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V123_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V124_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V125_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE | typeof RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE;
}>;
declare const V112_OPERATION_MATRIX: readonly [{
    readonly operation: "artifact.verify";
    readonly authorityProfiles: readonly [];
    readonly inputAuthority: "exact-artifact-bytes";
    readonly requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    readonly outputAuthority: "verified-artifact-runtime";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "artifact.admit";
    readonly authorityProfiles: readonly [];
    readonly inputAuthority: "verified-artifact-runtime";
    readonly requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    readonly outputAuthority: "verified-admission-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "artifact.append.plan";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "verified-admission-runtime";
    readonly requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    readonly outputAuthority: "sdk-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "identity.capability.sign";
    readonly authorityProfiles: readonly [];
    readonly inputAuthority: "identity-key-file";
    readonly requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    readonly outputAuthority: "signed-capability-claim-not-yet-verified";
    readonly processBoundary: "local-identity-key-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "artifact.transition.seal";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "sdk-plan-runtime";
    readonly requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    readonly outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "artifact.transition.stage";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "sealed-candidate-runtime";
    readonly requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    readonly outputAuthority: "staged-candidate-locator-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "artifact.transition.commit";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "staged-candidate-reference";
    readonly requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    readonly outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "admission.command.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    readonly inputAuthority: "claimed-command";
    readonly requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    readonly outputAuthority: "admission-receipt-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}, {
    readonly operation: "public-proof.projection.locate";
    readonly authorityProfiles: readonly ["projection-only"];
    readonly inputAuthority: "projection-only";
    readonly requiredEvidence: readonly ["projection-locator"];
    readonly outputAuthority: "exact-artifact-bytes-not-yet-verified";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=112.0.0 <113.0.0";
}];
export declare const RECEIZ_V112_APPLICATION_OPERATION_MATRIX: typeof V112_OPERATION_MATRIX;
export declare const RECEIZ_V112_APPLICATION_OPERATION_MATRIX_DIGEST: "d8654731e25c3d3fbe67f5313c189a843551b87fe692cf9c683596d47a5bf877";
declare const V113_OPERATION_MATRIX: readonly [...({
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=113.0.0 <114.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
})[], {
    readonly operation: "artifact.global.resolve";
    readonly authorityProfiles: readonly ["global-shared", "projection-only"];
    readonly inputAuthority: "projection-only";
    readonly requiredEvidence: readonly ["projection-locator", "commit-domain"];
    readonly outputAuthority: "exact-artifact-bytes-not-yet-verified";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=113.0.0 <114.0.0";
}, {
    readonly operation: "artifact.offline.reconcile";
    readonly authorityProfiles: readonly ["global-shared"];
    readonly inputAuthority: "exact-artifact-bytes";
    readonly requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    readonly outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=113.0.0 <114.0.0";
}];
export declare const RECEIZ_V113_APPLICATION_OPERATION_MATRIX: typeof V113_OPERATION_MATRIX;
export declare const RECEIZ_V113_APPLICATION_OPERATION_MATRIX_DIGEST: "091ab9e6b3acb05283510a19754e53c637dbd96b47b499a524dc44c34f8e783b";
declare const V114_OPERATION_MATRIX: readonly [...({
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=114.0.0 <115.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
})[], {
    readonly operation: "profile-showcase.genesis.plan";
    readonly authorityProfiles: readonly ["artifact-local"];
    readonly inputAuthority: "verified-actor-runtime";
    readonly requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    readonly outputAuthority: "sdk-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=114.0.0 <115.0.0";
}, {
    readonly operation: "profile-showcase.append.plan";
    readonly authorityProfiles: readonly ["artifact-local"];
    readonly inputAuthority: "verified-admission-runtime";
    readonly requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    readonly outputAuthority: "sdk-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=114.0.0 <115.0.0";
}, {
    readonly operation: "economy-showcase.genesis.plan";
    readonly authorityProfiles: readonly ["global-shared"];
    readonly inputAuthority: "verified-actor-runtime";
    readonly requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    readonly outputAuthority: "sdk-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=114.0.0 <115.0.0";
}, {
    readonly operation: "economy-showcase.append.plan";
    readonly authorityProfiles: readonly ["global-shared"];
    readonly inputAuthority: "verified-admission-runtime";
    readonly requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    readonly outputAuthority: "sdk-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=114.0.0 <115.0.0";
}, {
    readonly operation: "economy-showcase.merge.plan";
    readonly authorityProfiles: readonly ["global-shared"];
    readonly inputAuthority: "verified-admission-runtime";
    readonly requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    readonly outputAuthority: "sdk-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=114.0.0 <115.0.0";
}];
export declare const RECEIZ_V114_APPLICATION_OPERATION_MATRIX: typeof V114_OPERATION_MATRIX;
export declare const RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST: "fd4ea8fccd867a0b9aab772ea6c5827ea8bdfe4c7fbed017c5a4843a40109c4f";
declare const V115_OPERATION_MATRIX: typeof V114_OPERATION_MATRIX;
export declare const RECEIZ_V115_APPLICATION_OPERATION_MATRIX: typeof V115_OPERATION_MATRIX;
export declare const RECEIZ_V115_APPLICATION_OPERATION_MATRIX_DIGEST: "0393000708aada33c9f8bbcc4b98c9aa202a9d37036e67e09fc34c6815f77c8a";
declare const V116_OPERATION_MATRIX: typeof V115_OPERATION_MATRIX;
export declare const RECEIZ_V116_APPLICATION_OPERATION_MATRIX: typeof V116_OPERATION_MATRIX;
export declare const RECEIZ_V116_APPLICATION_OPERATION_MATRIX_DIGEST: "ec5829eeec039c1f4885d056b8cd6cf6506d08547cee58daa229ecbd44155420";
declare const V117_OPERATION_MATRIX: typeof V116_OPERATION_MATRIX;
export declare const RECEIZ_V117_APPLICATION_OPERATION_MATRIX: typeof V117_OPERATION_MATRIX;
export declare const RECEIZ_V117_APPLICATION_OPERATION_MATRIX_DIGEST: "6c71f54e2fd709f69ce35e8cf3112d9066b5b108b9d610768d9b16ad38d5cab5";
declare const V118_OPERATION_MATRIX: typeof V117_OPERATION_MATRIX;
export declare const RECEIZ_V118_APPLICATION_OPERATION_MATRIX: typeof V118_OPERATION_MATRIX;
export declare const RECEIZ_V118_APPLICATION_OPERATION_MATRIX_DIGEST: "153b2472830567ec3b445c2c1b4102e4c036ed4c45cc374d40d0079096a40f54";
declare const V119_OPERATION_MATRIX: typeof V118_OPERATION_MATRIX;
export declare const RECEIZ_V119_APPLICATION_OPERATION_MATRIX: typeof V119_OPERATION_MATRIX;
export declare const RECEIZ_V119_APPLICATION_OPERATION_MATRIX_DIGEST: "53cf9d6862b2396e2fe7864f8607c00c4e3b6e31b082ab5c5c8dff088fcb52c1";
declare const V120_OPERATION_MATRIX: readonly [...({
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "profile-showcase.genesis.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "profile-showcase.append.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "economy-showcase.genesis.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "economy-showcase.append.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=120.0.0 <121.0.0";
    operation: "economy-showcase.merge.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
})[], {
    readonly operation: "subject.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "subject-id";
    readonly requiredEvidence: readonly ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    readonly outputAuthority: "verified-subject-runtime";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "subject.brain.retrieve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "subject-proof-reference";
    readonly requiredEvidence: readonly ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"];
    readonly outputAuthority: "proof-context-non-authoritative";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "subject.twin.message";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "verified-subject-artifact-runtime";
    readonly requiredEvidence: readonly ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"];
    readonly outputAuthority: "model-intent-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "subject.mandate.activate";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "subject-mandate-plan-runtime";
    readonly requiredEvidence: readonly ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"];
    readonly outputAuthority: "active-mandate-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "world.command.plan";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    readonly inputAuthority: "world-command-input";
    readonly requiredEvidence: readonly ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"];
    readonly outputAuthority: "world-command-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "world.command.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "world-command-plan-runtime";
    readonly requiredEvidence: readonly ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    readonly outputAuthority: "accepted-world-event-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "world.transaction.plan";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    readonly inputAuthority: "world-transaction-input";
    readonly requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"];
    readonly outputAuthority: "world-transaction-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "world.transaction.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "world-transaction-plan-runtime";
    readonly requiredEvidence: readonly ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    readonly outputAuthority: "accepted-world-event-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "subject.runtime.enqueue";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "subject-runtime-tick-input";
    readonly requiredEvidence: readonly ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"];
    readonly outputAuthority: "runtime-job-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "subject.memory.project";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "verified-subject-artifact-runtime";
    readonly requiredEvidence: readonly ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"];
    readonly outputAuthority: "event-memory-projection-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "bearer.transfer.plan";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    readonly inputAuthority: "bearer-transfer-input";
    readonly requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"];
    readonly outputAuthority: "bearer-transfer-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "bearer.instrument.issue";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "bearer-transfer-plan-runtime";
    readonly requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"];
    readonly outputAuthority: "bearer-instrument-not-ownership";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "bearer.instrument.claim";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "bearer-instrument-bytes";
    readonly requiredEvidence: readonly ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"];
    readonly outputAuthority: "ownership-transition-with-sealed-artifact";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}, {
    readonly operation: "bearer.transfer.cancel";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "bearer-transfer-plan-runtime";
    readonly requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"];
    readonly outputAuthority: "ownership-transition-with-sealed-artifact";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=120.0.0 <121.0.0";
}];
export declare const RECEIZ_V120_APPLICATION_OPERATION_MATRIX: typeof V120_OPERATION_MATRIX;
export declare const RECEIZ_V120_APPLICATION_OPERATION_MATRIX_DIGEST: "1c779ee5ade4b877ae9c6922ab02ba96fffffeb7580f1cf105a59fbb4424f351";
declare const V121_OPERATION_MATRIX: typeof V120_OPERATION_MATRIX;
export declare const RECEIZ_V121_APPLICATION_OPERATION_MATRIX: typeof V121_OPERATION_MATRIX;
export declare const RECEIZ_V121_APPLICATION_OPERATION_MATRIX_DIGEST: "208553829ba78a5536524b864577ce59989e2d0a994fad9598d39ae3d557c4f5";
declare const V122_OPERATION_MATRIX: typeof V121_OPERATION_MATRIX;
export declare const RECEIZ_V122_APPLICATION_OPERATION_MATRIX: typeof V122_OPERATION_MATRIX;
export declare const RECEIZ_V122_APPLICATION_OPERATION_MATRIX_DIGEST: "bd1d7ccf1543e2484df68e3025c7376f8ae37cafe1ca0d7c9cd9f52f6342b325";
declare const V123_OPERATION_MATRIX: readonly [...({
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "profile-showcase.genesis.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "profile-showcase.append.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "economy-showcase.genesis.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "economy-showcase.append.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "economy-showcase.merge.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "subject.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-id";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "verified-subject-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "subject.brain.retrieve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"];
    outputAuthority: "proof-context-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "subject.twin.message";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"];
    outputAuthority: "model-intent-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "subject.mandate.activate";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-mandate-plan-runtime";
    requiredEvidence: readonly ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"];
    outputAuthority: "active-mandate-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "world.command.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-command-input";
    requiredEvidence: readonly ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-command-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "world.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-command-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "world.transaction.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "world.transaction.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-transaction-plan-runtime";
    requiredEvidence: readonly ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "subject.runtime.enqueue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-runtime-tick-input";
    requiredEvidence: readonly ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "runtime-job-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "subject.memory.project";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"];
    outputAuthority: "event-memory-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "bearer.transfer.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "bearer-transfer-input";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"];
    outputAuthority: "bearer-transfer-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "bearer.instrument.issue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"];
    outputAuthority: "bearer-instrument-not-ownership";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "bearer.instrument.claim";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-instrument-bytes";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=123.0.0 <124.0.0";
    operation: "bearer.transfer.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
})[], {
    readonly operation: "identity.proof-authority.exchange";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "proof-authority-challenge";
    readonly requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set"];
    readonly outputAuthority: "scoped-proof-capability-not-proof-authority";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=123.0.0 <124.0.0";
}, {
    readonly operation: "authorization.scopes.introspect";
    readonly authorityProfiles: readonly ["projection-only"];
    readonly inputAuthority: "rail-scope-query";
    readonly requiredEvidence: readonly ["minimum-scope-set"];
    readonly outputAuthority: "granted-scope-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=123.0.0 <124.0.0";
}, {
    readonly operation: "subject.namespaces.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "subject-proof-reference";
    readonly requiredEvidence: readonly ["exact-subject-head", "exact-subject-artifact-bytes", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    readonly outputAuthority: "exact-head-namespace-projection-non-authoritative";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=123.0.0 <124.0.0";
}, {
    readonly operation: "value.settlement.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "value-intent-runtime";
    readonly requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    readonly outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=123.0.0 <124.0.0";
}, {
    readonly operation: "value.reserve.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "value-intent-runtime";
    readonly requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    readonly outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=123.0.0 <124.0.0";
}, {
    readonly operation: "value.execution.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "value-intent-runtime";
    readonly requiredEvidence: readonly ["idempotency-identity", "exact-execution-outcome"];
    readonly outputAuthority: "execution-outcome-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=123.0.0 <124.0.0";
}];
export declare const RECEIZ_V123_APPLICATION_OPERATION_MATRIX: typeof V123_OPERATION_MATRIX;
export declare const RECEIZ_V123_APPLICATION_OPERATION_MATRIX_DIGEST: "e08cec3e3ad22c20ddd6c08169ece19f094c366214d6d6b4dc432cd97558e2c5";
declare const V124_OPERATION_MATRIX: readonly [...({
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "profile-showcase.genesis.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "profile-showcase.append.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "economy-showcase.genesis.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "economy-showcase.append.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "economy-showcase.merge.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "subject.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-id";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "verified-subject-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "subject.brain.retrieve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"];
    outputAuthority: "proof-context-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "subject.twin.message";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"];
    outputAuthority: "model-intent-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "subject.mandate.activate";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-mandate-plan-runtime";
    requiredEvidence: readonly ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"];
    outputAuthority: "active-mandate-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "world.command.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-command-input";
    requiredEvidence: readonly ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-command-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "world.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-command-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "world.transaction.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "world.transaction.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-transaction-plan-runtime";
    requiredEvidence: readonly ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "subject.runtime.enqueue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-runtime-tick-input";
    requiredEvidence: readonly ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "runtime-job-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "subject.memory.project";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"];
    outputAuthority: "event-memory-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "bearer.transfer.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "bearer-transfer-input";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"];
    outputAuthority: "bearer-transfer-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "bearer.instrument.issue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"];
    outputAuthority: "bearer-instrument-not-ownership";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "bearer.instrument.claim";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-instrument-bytes";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "bearer.transfer.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "identity.proof-authority.exchange";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set"];
    outputAuthority: "scoped-proof-capability-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "authorization.scopes.introspect";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set"];
    outputAuthority: "granted-scope-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "subject.namespaces.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "exact-subject-artifact-bytes", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "exact-head-namespace-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "value.settlement.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "value.reserve.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=124.0.0 <125.0.0";
    operation: "value.execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["idempotency-identity", "exact-execution-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
})[], {
    readonly operation: "time.kai.now";
    readonly authorityProfiles: readonly ["artifact-local", "projection-only"];
    readonly inputAuthority: "kai-genesis-phi-bridge";
    readonly requiredEvidence: readonly ["genesis-epoch", "phi-exact-ties-to-even-bridge"];
    readonly outputAuthority: "kai-coordinate-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "identity.proof-authority.challenge.create";
    readonly authorityProfiles: readonly ["artifact-local", "projection-only"];
    readonly inputAuthority: "kai-genesis-phi-bridge";
    readonly requiredEvidence: readonly ["live-whole-pulse", "application-bound-challenge", "minimum-scope-set"];
    readonly outputAuthority: "proof-authority-challenge-not-proof-authority";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "runtime.authority-session.open";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "proof-authority-challenge";
    readonly requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set", "exact-subject-head", "exact-revocation-head"];
    readonly outputAuthority: "server-custodied-authority-session-not-proof-authority";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "runtime.authority-session.refresh";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "authority-session-handle";
    readonly requiredEvidence: readonly ["server-custodied-session", "application-bound-challenge", "explicit-consent", "exact-subject-head", "exact-revocation-head"];
    readonly outputAuthority: "server-custodied-authority-session-not-proof-authority";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "runtime.authority-session.close";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "authority-session-handle";
    readonly requiredEvidence: readonly ["server-custodied-session", "exact-revocation-head"];
    readonly outputAuthority: "execution-outcome-projection-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "runtime.capabilities.qualify";
    readonly authorityProfiles: readonly ["global-shared", "projection-only"];
    readonly inputAuthority: "rail-scope-query";
    readonly requiredEvidence: readonly ["minimum-scope-set", "exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport"];
    readonly outputAuthority: "operational-capability-report-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "domain.verified-additions.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "domain-replay-wire";
    readonly requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape"];
    readonly outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "domain.replay.verify";
    readonly authorityProfiles: readonly ["artifact-local", "projection-only"];
    readonly inputAuthority: "domain-replay-wire";
    readonly requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "canonical-event"];
    readonly outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "domain.checkpoint.verify";
    readonly authorityProfiles: readonly ["artifact-local", "projection-only"];
    readonly inputAuthority: "domain-checkpoint-wire";
    readonly requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "byte-exact-namespaces"];
    readonly outputAuthority: "authenticated-checkpoint-projection-non-authoritative";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "domain.private-additions.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "private-domain-query";
    readonly requiredEvidence: readonly ["exact-subject-head", "exact-domain-head", "access-grant-head", "access-key-head", "authenticated-transport"];
    readonly outputAuthority: "access-filtered-private-additions-projection-non-authoritative";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "execution.stage";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "durable-execution-input";
    readonly requiredEvidence: readonly ["persisted-canonical-plan", "semantic-idempotency-digest", "exact-participant-heads", "registry-digest", "reducer-digest"];
    readonly outputAuthority: "persisted-plan-handle-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "execution.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "durable-execution-handle";
    readonly requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "exact-participant-heads", "atomic-compare-and-swap", "semantic-idempotency-digest"];
    readonly outputAuthority: "accepted-world-event-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "execution.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "durable-execution-handle";
    readonly requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    readonly outputAuthority: "execution-outcome-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "execution.resolve-by-idempotency-key";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "durable-execution-input";
    readonly requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    readonly outputAuthority: "execution-outcome-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "execution.cancel";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "durable-execution-handle";
    readonly requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "semantic-idempotency-digest", "immutable-terminal-outcome"];
    readonly outputAuthority: "execution-outcome-projection-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "execution.atomic-mutation.plan";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    readonly inputAuthority: "world-transaction-input";
    readonly requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    readonly outputAuthority: "world-transaction-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}, {
    readonly operation: "identity.public-recipient.resolve";
    readonly authorityProfiles: readonly ["global-shared", "projection-only"];
    readonly inputAuthority: "public-recipient-query";
    readonly requiredEvidence: readonly ["public-recipient-consent", "privacy-safe-rate-limit", "one-use-purpose-bound-locator", "exact-subject-head", "authenticated-transport"];
    readonly outputAuthority: "privacy-safe-one-use-recipient-locator-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=124.0.0 <125.0.0";
}];
export declare const RECEIZ_V124_APPLICATION_OPERATION_MATRIX: typeof V124_OPERATION_MATRIX;
export declare const RECEIZ_V124_APPLICATION_OPERATION_MATRIX_DIGEST: "540d1c1bf39f1b288b257c79a6e020bdcc5e587fc9b7dbf6b7aaa5d082e20ad5";
declare const V125_OPERATION_MATRIX: readonly [...({
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "profile-showcase.genesis.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "profile-showcase.append.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "economy-showcase.genesis.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "economy-showcase.append.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "economy-showcase.merge.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-id";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "verified-subject-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.brain.retrieve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"];
    outputAuthority: "proof-context-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.twin.message";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"];
    outputAuthority: "model-intent-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.mandate.activate";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-mandate-plan-runtime";
    requiredEvidence: readonly ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"];
    outputAuthority: "active-mandate-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.command.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-command-input";
    requiredEvidence: readonly ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-command-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-command-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.transaction.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.transaction.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-transaction-plan-runtime";
    requiredEvidence: readonly ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.runtime.enqueue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-runtime-tick-input";
    requiredEvidence: readonly ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "runtime-job-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.memory.project";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"];
    outputAuthority: "event-memory-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.transfer.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "bearer-transfer-input";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"];
    outputAuthority: "bearer-transfer-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.instrument.issue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"];
    outputAuthority: "bearer-instrument-not-ownership";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.instrument.claim";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-instrument-bytes";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.transfer.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.proof-authority.exchange";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set"];
    outputAuthority: "scoped-proof-capability-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "authorization.scopes.introspect";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set"];
    outputAuthority: "granted-scope-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.namespaces.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "exact-subject-artifact-bytes", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "exact-head-namespace-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "value.settlement.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "value.reserve.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "value.execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["idempotency-identity", "exact-execution-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "time.kai.now";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["genesis-epoch", "phi-exact-ties-to-even-bridge"];
    outputAuthority: "kai-coordinate-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.proof-authority.challenge.create";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["live-whole-pulse", "application-bound-challenge", "minimum-scope-set"];
    outputAuthority: "proof-authority-challenge-not-proof-authority";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.authority-session.open";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.authority-session.refresh";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "application-bound-challenge", "explicit-consent", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.authority-session.close";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "exact-revocation-head"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.capabilities.qualify";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set", "exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport"];
    outputAuthority: "operational-capability-report-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.verified-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.replay.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "canonical-event"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.checkpoint.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-checkpoint-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "byte-exact-namespaces"];
    outputAuthority: "authenticated-checkpoint-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.private-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "private-domain-query";
    requiredEvidence: readonly ["exact-subject-head", "exact-domain-head", "access-grant-head", "access-key-head", "authenticated-transport"];
    outputAuthority: "access-filtered-private-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["persisted-canonical-plan", "semantic-idempotency-digest", "exact-participant-heads", "registry-digest", "reducer-digest"];
    outputAuthority: "persisted-plan-handle-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "exact-participant-heads", "atomic-compare-and-swap", "semantic-idempotency-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.resolve-by-idempotency-key";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "semantic-idempotency-digest", "immutable-terminal-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.atomic-mutation.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.public-recipient.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "public-recipient-query";
    requiredEvidence: readonly ["public-recipient-consent", "privacy-safe-rate-limit", "one-use-purpose-bound-locator", "exact-subject-head", "authenticated-transport"];
    outputAuthority: "privacy-safe-one-use-recipient-locator-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
})[], {
    readonly operation: "action.law.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "projection-only"];
    readonly inputAuthority: "lawful-action-law-query";
    readonly requiredEvidence: readonly ["current-registry", "registry-digest", "current-action-law"];
    readonly outputAuthority: "action-law-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.plan";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    readonly inputAuthority: "lawful-action-plan-input";
    readonly requiredEvidence: readonly ["current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "law-digest", "action-idempotency-identity"];
    readonly outputAuthority: "lawful-action-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.proof.verify";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "lawful-action-proof";
    readonly requiredEvidence: readonly ["exact-enclosing-proof-object", "pinned-verifier-roots", "current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "completion-witness", "law-digest", "action-idempotency-identity"];
    readonly outputAuthority: "verified-lawful-action-runtime";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.admit";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "verified-lawful-action-runtime";
    readonly requiredEvidence: readonly ["verified-artifact-runtime", "current-action-law", "verified-portable-execution-authority", "completion-witness", "action-idempotency-identity", "exact-subject-head", "admission-store"];
    readonly outputAuthority: "admitted-lawful-action-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.value-head.derive";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "lawful-action-admission-runtime";
    readonly requiredEvidence: readonly ["exact-enclosing-proof-object", "universal-kai-value-law", "one-spendable-membership", "exact-ownership-head", "start-completion-kai", "law-digest"];
    readonly outputAuthority: "deterministic-value-head-projection-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.settlement.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "lawful-action-admission-runtime";
    readonly requiredEvidence: readonly ["exact-settlement-head", "one-spendable-membership", "owner-capability", "action-idempotency-identity", "persisted-canonical-plan"];
    readonly outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.outcome.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "lawful-action-admission-runtime";
    readonly requiredEvidence: readonly ["action-idempotency-identity", "immutable-terminal-outcome", "authenticated-transport"];
    readonly outputAuthority: "execution-outcome-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}];
export declare const RECEIZ_V125_APPLICATION_OPERATION_MATRIX: typeof V125_OPERATION_MATRIX;
export declare const RECEIZ_V125_APPLICATION_OPERATION_MATRIX_DIGEST: "17c98e99c3f54b7a18dea9f2466a49ea2ac5da4d1cf0a90c723560184a314a6c";
declare const CONVERSATION_CANDIDATE_OPERATION_MATRIX: readonly [...({
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "profile-showcase.genesis.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "profile-showcase.append.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "economy-showcase.genesis.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "economy-showcase.append.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "economy-showcase.merge.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-id";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "verified-subject-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.brain.retrieve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"];
    outputAuthority: "proof-context-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.twin.message";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"];
    outputAuthority: "model-intent-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.mandate.activate";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-mandate-plan-runtime";
    requiredEvidence: readonly ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"];
    outputAuthority: "active-mandate-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.command.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-command-input";
    requiredEvidence: readonly ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-command-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-command-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.transaction.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "world.transaction.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-transaction-plan-runtime";
    requiredEvidence: readonly ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.runtime.enqueue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-runtime-tick-input";
    requiredEvidence: readonly ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "runtime-job-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.memory.project";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"];
    outputAuthority: "event-memory-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.transfer.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "bearer-transfer-input";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"];
    outputAuthority: "bearer-transfer-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.instrument.issue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"];
    outputAuthority: "bearer-instrument-not-ownership";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.instrument.claim";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-instrument-bytes";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "bearer.transfer.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.proof-authority.exchange";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set"];
    outputAuthority: "scoped-proof-capability-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "authorization.scopes.introspect";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set"];
    outputAuthority: "granted-scope-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "subject.namespaces.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "exact-subject-artifact-bytes", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "exact-head-namespace-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "value.settlement.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "value.reserve.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "value.execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["idempotency-identity", "exact-execution-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "time.kai.now";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["genesis-epoch", "phi-exact-ties-to-even-bridge"];
    outputAuthority: "kai-coordinate-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.proof-authority.challenge.create";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["live-whole-pulse", "application-bound-challenge", "minimum-scope-set"];
    outputAuthority: "proof-authority-challenge-not-proof-authority";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.authority-session.open";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.authority-session.refresh";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "application-bound-challenge", "explicit-consent", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.authority-session.close";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "exact-revocation-head"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "runtime.capabilities.qualify";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set", "exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport"];
    outputAuthority: "operational-capability-report-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.verified-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.replay.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "canonical-event"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.checkpoint.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-checkpoint-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "byte-exact-namespaces"];
    outputAuthority: "authenticated-checkpoint-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "domain.private-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "private-domain-query";
    requiredEvidence: readonly ["exact-subject-head", "exact-domain-head", "access-grant-head", "access-key-head", "authenticated-transport"];
    outputAuthority: "access-filtered-private-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["persisted-canonical-plan", "semantic-idempotency-digest", "exact-participant-heads", "registry-digest", "reducer-digest"];
    outputAuthority: "persisted-plan-handle-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "exact-participant-heads", "atomic-compare-and-swap", "semantic-idempotency-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.resolve-by-idempotency-key";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "semantic-idempotency-digest", "immutable-terminal-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "execution.atomic-mutation.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=125.0.0 <126.0.0";
    operation: "identity.public-recipient.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "public-recipient-query";
    requiredEvidence: readonly ["public-recipient-consent", "privacy-safe-rate-limit", "one-use-purpose-bound-locator", "exact-subject-head", "authenticated-transport"];
    outputAuthority: "privacy-safe-one-use-recipient-locator-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
})[], {
    readonly operation: "action.law.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "projection-only"];
    readonly inputAuthority: "lawful-action-law-query";
    readonly requiredEvidence: readonly ["current-registry", "registry-digest", "current-action-law"];
    readonly outputAuthority: "action-law-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.plan";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    readonly inputAuthority: "lawful-action-plan-input";
    readonly requiredEvidence: readonly ["current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "law-digest", "action-idempotency-identity"];
    readonly outputAuthority: "lawful-action-plan-runtime";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.proof.verify";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "lawful-action-proof";
    readonly requiredEvidence: readonly ["exact-enclosing-proof-object", "pinned-verifier-roots", "current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "completion-witness", "law-digest", "action-idempotency-identity"];
    readonly outputAuthority: "verified-lawful-action-runtime";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.admit";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "verified-lawful-action-runtime";
    readonly requiredEvidence: readonly ["verified-artifact-runtime", "current-action-law", "verified-portable-execution-authority", "completion-witness", "action-idempotency-identity", "exact-subject-head", "admission-store"];
    readonly outputAuthority: "admitted-lawful-action-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.value-head.derive";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "lawful-action-admission-runtime";
    readonly requiredEvidence: readonly ["exact-enclosing-proof-object", "universal-kai-value-law", "one-spendable-membership", "exact-ownership-head", "start-completion-kai", "law-digest"];
    readonly outputAuthority: "deterministic-value-head-projection-non-authoritative";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.settlement.execute";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared"];
    readonly inputAuthority: "lawful-action-admission-runtime";
    readonly requiredEvidence: readonly ["exact-settlement-head", "one-spendable-membership", "owner-capability", "action-idempotency-identity", "persisted-canonical-plan"];
    readonly outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    readonly processBoundary: "same-runtime-custody";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "action.outcome.resolve";
    readonly authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    readonly inputAuthority: "lawful-action-admission-runtime";
    readonly requiredEvidence: readonly ["action-idempotency-identity", "immutable-terminal-outcome", "authenticated-transport"];
    readonly outputAuthority: "execution-outcome-projection-non-authoritative";
    readonly processBoundary: "projection-only";
    readonly namespacePolicy: "not-applicable";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}, {
    readonly operation: "conversation.source.open";
    readonly authorityProfiles: readonly ["artifact-local", "projection-only"];
    readonly inputAuthority: "domain-replay-wire";
    readonly requiredEvidence: readonly ["exact-enclosing-proof-object", "registry-digest", "reducer-digest", "actor-subject-heads", "causal-parent-heads", "byte-exact-namespaces"];
    readonly outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    readonly processBoundary: "reverify-exact-bytes";
    readonly namespacePolicy: "preserve-all-non-target";
    readonly compatibleSdkRange: ">=125.0.0 <126.0.0";
}];
export declare const RECEIZ_CONVERSATION_CANDIDATE_APPLICATION_OPERATION_MATRIX: typeof CONVERSATION_CANDIDATE_OPERATION_MATRIX;
export declare const RECEIZ_CONVERSATION_CANDIDATE_APPLICATION_OPERATION_MATRIX_DIGEST: "b578dc6ac0ec6523808534894c989ecbe8b182c2fd98eff37d130a55b8abb2de";
export declare const RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE: ">=126.0.0 <127.0.0";
export declare const RECEIZ_V126_APPLICATION_OPERATION_MATRIX: readonly Readonly<{
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "profile-showcase.genesis.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "profile-showcase.append.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "economy-showcase.genesis.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "economy-showcase.append.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "economy-showcase.merge.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "subject.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-id";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "verified-subject-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "subject.brain.retrieve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"];
    outputAuthority: "proof-context-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "subject.twin.message";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"];
    outputAuthority: "model-intent-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "subject.mandate.activate";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-mandate-plan-runtime";
    requiredEvidence: readonly ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"];
    outputAuthority: "active-mandate-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "world.command.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-command-input";
    requiredEvidence: readonly ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-command-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "world.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-command-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "world.transaction.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "world.transaction.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-transaction-plan-runtime";
    requiredEvidence: readonly ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "subject.runtime.enqueue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-runtime-tick-input";
    requiredEvidence: readonly ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "runtime-job-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "subject.memory.project";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"];
    outputAuthority: "event-memory-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "bearer.transfer.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "bearer-transfer-input";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"];
    outputAuthority: "bearer-transfer-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "bearer.instrument.issue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"];
    outputAuthority: "bearer-instrument-not-ownership";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "bearer.instrument.claim";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-instrument-bytes";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "bearer.transfer.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "identity.proof-authority.exchange";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set"];
    outputAuthority: "scoped-proof-capability-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "authorization.scopes.introspect";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set"];
    outputAuthority: "granted-scope-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "subject.namespaces.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "exact-subject-artifact-bytes", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "exact-head-namespace-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "value.settlement.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "value.reserve.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "value.execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["idempotency-identity", "exact-execution-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "time.kai.now";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["genesis-epoch", "phi-exact-ties-to-even-bridge"];
    outputAuthority: "kai-coordinate-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "identity.proof-authority.challenge.create";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["live-whole-pulse", "application-bound-challenge", "minimum-scope-set"];
    outputAuthority: "proof-authority-challenge-not-proof-authority";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "runtime.authority-session.open";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "runtime.authority-session.refresh";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "application-bound-challenge", "explicit-consent", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "runtime.authority-session.close";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "exact-revocation-head"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "runtime.capabilities.qualify";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set", "exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport"];
    outputAuthority: "operational-capability-report-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "domain.verified-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "domain.replay.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "canonical-event"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "domain.checkpoint.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-checkpoint-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "byte-exact-namespaces"];
    outputAuthority: "authenticated-checkpoint-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "domain.private-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "private-domain-query";
    requiredEvidence: readonly ["exact-subject-head", "exact-domain-head", "access-grant-head", "access-key-head", "authenticated-transport"];
    outputAuthority: "access-filtered-private-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "execution.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["persisted-canonical-plan", "semantic-idempotency-digest", "exact-participant-heads", "registry-digest", "reducer-digest"];
    outputAuthority: "persisted-plan-handle-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "execution.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "exact-participant-heads", "atomic-compare-and-swap", "semantic-idempotency-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "execution.resolve-by-idempotency-key";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "execution.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "semantic-idempotency-digest", "immutable-terminal-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "execution.atomic-mutation.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "identity.public-recipient.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "public-recipient-query";
    requiredEvidence: readonly ["public-recipient-consent", "privacy-safe-rate-limit", "one-use-purpose-bound-locator", "exact-subject-head", "authenticated-transport"];
    outputAuthority: "privacy-safe-one-use-recipient-locator-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "action.law.resolve";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "lawful-action-law-query";
    requiredEvidence: readonly ["current-registry", "registry-digest", "current-action-law"];
    outputAuthority: "action-law-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "action.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "lawful-action-plan-input";
    requiredEvidence: readonly ["current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "law-digest", "action-idempotency-identity"];
    outputAuthority: "lawful-action-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "action.proof.verify";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "lawful-action-proof";
    requiredEvidence: readonly ["exact-enclosing-proof-object", "pinned-verifier-roots", "current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "completion-witness", "law-digest", "action-idempotency-identity"];
    outputAuthority: "verified-lawful-action-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "action.admit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-lawful-action-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "current-action-law", "verified-portable-execution-authority", "completion-witness", "action-idempotency-identity", "exact-subject-head", "admission-store"];
    outputAuthority: "admitted-lawful-action-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "action.value-head.derive";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "lawful-action-admission-runtime";
    requiredEvidence: readonly ["exact-enclosing-proof-object", "universal-kai-value-law", "one-spendable-membership", "exact-ownership-head", "start-completion-kai", "law-digest"];
    outputAuthority: "deterministic-value-head-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "action.settlement.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "lawful-action-admission-runtime";
    requiredEvidence: readonly ["exact-settlement-head", "one-spendable-membership", "owner-capability", "action-idempotency-identity", "persisted-canonical-plan"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=126.0.0 <127.0.0";
    operation: "action.outcome.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "lawful-action-admission-runtime";
    requiredEvidence: readonly ["action-idempotency-identity", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
}>[];
export declare const RECEIZ_V126_APPLICATION_OPERATION_MATRIX_DIGEST: "42c7f0924df91b4ba11c1b891fee2b92abb509430a86b030735c23d055e67949";
export declare const RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE: ">=129.0.0 <130.0.0";
export declare const RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX: readonly Readonly<{
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.verify";
    authorityProfiles: readonly [];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots"];
    outputAuthority: "verified-artifact-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.admit";
    authorityProfiles: readonly [];
    inputAuthority: "verified-artifact-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "admission-profile", "current-registry"];
    outputAuthority: "verified-admission-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.append.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "discovered-registry-law-runtime", "commit-domain", "canonical-event", "expected-head", "idempotency-identity"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "identity.capability.sign";
    authorityProfiles: readonly [];
    inputAuthority: "identity-key-file";
    requiredEvidence: readonly ["identity-key-file", "capability-payload"];
    outputAuthority: "signed-capability-claim-not-yet-verified";
    processBoundary: "local-identity-key-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.transition.seal";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sdk-plan-runtime";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sealed-candidate-proof-object-not-accepted-head";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.transition.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "sealed-candidate-runtime";
    requiredEvidence: readonly ["sealed-candidate-runtime", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "staged-candidate-locator-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.transition.commit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "staged-candidate-reference";
    requiredEvidence: readonly ["sdk-plan-runtime", "verified-capability-runtime", "staged-candidate-reference", "conforming-transition-store-runtime", "commit-domain"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "admission.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only", "simulation-only"];
    inputAuthority: "claimed-command";
    requiredEvidence: readonly ["claimed-command", "current-registry", "capability-verifier-runtime", "consequence-projector-runtime", "admission-store"];
    outputAuthority: "admission-receipt-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "public-proof.projection.locate";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.global.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "projection-only";
    requiredEvidence: readonly ["projection-locator", "commit-domain"];
    outputAuthority: "exact-artifact-bytes-not-yet-verified";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "artifact.offline.reconcile";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "exact-artifact-bytes";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "current-registry", "verified-history-runtime", "verified-actor-runtime", "sdk-plan-runtime", "verified-capability-runtime", "commit-domain", "expected-head", "idempotency-identity"];
    outputAuthority: "accepted-artifact-history-with-report-only-receipt";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "profile-showcase.genesis.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "profile-showcase.append.plan";
    authorityProfiles: readonly ["artifact-local"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "economy-showcase.genesis.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-actor-runtime";
    requiredEvidence: readonly ["verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-genesis-body", "unaccepted-head-expectation", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "economy-showcase.append.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "economy-showcase.merge.plan";
    authorityProfiles: readonly ["global-shared"];
    inputAuthority: "verified-admission-runtime";
    requiredEvidence: readonly ["verified-admission-runtime", "verified-history-runtime", "verified-sibling-heads", "verified-actor-runtime", "v114-registry-runtime", "v114-operation-matrix-runtime", "literal-artifact-identity", "canonical-event", "expected-head", "commit-domain", "idempotency-identity", "sdk-plan-runtime", "verified-capability-runtime", "transition-sealer-runtime", "conforming-transition-store-runtime"];
    outputAuthority: "sdk-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "subject.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-id";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "subject-identity-digest", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "verified-subject-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "subject.brain.retrieve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "proof-index-reference", "exact-primary-proof-object-bytes", "registry-digest", "reducer-digest"];
    outputAuthority: "proof-context-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "subject.twin.message";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-primary-proof-object-bytes", "model-audit-digests", "owner-capability"];
    outputAuthority: "model-intent-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "subject.mandate.activate";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-mandate-plan-runtime";
    requiredEvidence: readonly ["subject-identity-digest", "exact-subject-head", "owner-capability", "active-bounded-mandate", "registry-digest"];
    outputAuthority: "active-mandate-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "world.command.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-command-input";
    requiredEvidence: readonly ["exact-subject-head", "expected-head", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-command-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "world.command.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-command-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "world.transaction.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "world.transaction.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "world-transaction-plan-runtime";
    requiredEvidence: readonly ["exact-participant-heads", "owner-capability", "active-bounded-mandate", "deterministic-world-reducer", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "subject.runtime.enqueue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "subject-runtime-tick-input";
    requiredEvidence: readonly ["exact-subject-head", "active-bounded-mandate", "idempotency-identity", "registry-digest", "reducer-digest"];
    outputAuthority: "runtime-job-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "subject.memory.project";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "verified-subject-artifact-runtime";
    requiredEvidence: readonly ["exact-subject-head", "event-citations", "exact-primary-proof-object-bytes"];
    outputAuthority: "event-memory-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "bearer.transfer.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "bearer-transfer-input";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "transfer-policy-digest", "byte-exact-namespaces"];
    outputAuthority: "bearer-transfer-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "bearer.instrument.issue";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "transfer-policy-digest", "instrument-expiry-and-replay-state"];
    outputAuthority: "bearer-instrument-not-ownership";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "bearer.instrument.claim";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-instrument-bytes";
    requiredEvidence: readonly ["exact-subject-artifact-bytes", "exact-subject-head", "exact-ownership-head", "one-time-claim-capability", "instrument-expiry-and-replay-state", "byte-exact-namespaces"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "bearer.transfer.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "bearer-transfer-plan-runtime";
    requiredEvidence: readonly ["exact-subject-head", "exact-ownership-head", "owner-capability", "instrument-expiry-and-replay-state"];
    outputAuthority: "ownership-transition-with-sealed-artifact";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "identity.proof-authority.exchange";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set"];
    outputAuthority: "scoped-proof-capability-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "authorization.scopes.introspect";
    authorityProfiles: readonly ["projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set"];
    outputAuthority: "granted-scope-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "subject.namespaces.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "subject-proof-reference";
    requiredEvidence: readonly ["exact-subject-head", "exact-subject-artifact-bytes", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "exact-head-namespace-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "value.settlement.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "value.reserve.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["exact-subject-head", "owner-capability", "rail-identity", "amount-phi-micro", "persisted-canonical-intent", "idempotency-identity"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "value.execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "value-intent-runtime";
    requiredEvidence: readonly ["idempotency-identity", "exact-execution-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "time.kai.now";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["genesis-epoch", "phi-exact-ties-to-even-bridge"];
    outputAuthority: "kai-coordinate-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "identity.proof-authority.challenge.create";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "kai-genesis-phi-bridge";
    requiredEvidence: readonly ["live-whole-pulse", "application-bound-challenge", "minimum-scope-set"];
    outputAuthority: "proof-authority-challenge-not-proof-authority";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "runtime.authority-session.open";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "proof-authority-challenge";
    requiredEvidence: readonly ["exact-artifact-bytes", "pinned-verifier-roots", "application-bound-challenge", "explicit-consent", "minimum-scope-set", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "runtime.authority-session.refresh";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "application-bound-challenge", "explicit-consent", "exact-subject-head", "exact-revocation-head"];
    outputAuthority: "server-custodied-authority-session-not-proof-authority";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "runtime.authority-session.close";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "authority-session-handle";
    requiredEvidence: readonly ["server-custodied-session", "exact-revocation-head"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "runtime.capabilities.qualify";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "rail-scope-query";
    requiredEvidence: readonly ["minimum-scope-set", "exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport"];
    outputAuthority: "operational-capability-report-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "domain.verified-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "domain.replay.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-replay-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "canonical-event"];
    outputAuthority: "authenticated-verified-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "domain.checkpoint.verify";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "domain-checkpoint-wire";
    requiredEvidence: readonly ["exact-domain-head", "registry-digest", "reducer-digest", "authenticated-transport", "closed-wire-shape", "byte-exact-namespaces"];
    outputAuthority: "authenticated-checkpoint-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "domain.private-additions.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "private-domain-query";
    requiredEvidence: readonly ["exact-subject-head", "exact-domain-head", "access-grant-head", "access-key-head", "authenticated-transport"];
    outputAuthority: "access-filtered-private-additions-projection-non-authoritative";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "execution.stage";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["persisted-canonical-plan", "semantic-idempotency-digest", "exact-participant-heads", "registry-digest", "reducer-digest"];
    outputAuthority: "persisted-plan-handle-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "execution.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "exact-participant-heads", "atomic-compare-and-swap", "semantic-idempotency-digest"];
    outputAuthority: "accepted-world-event-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "execution.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "execution.resolve-by-idempotency-key";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "durable-execution-input";
    requiredEvidence: readonly ["semantic-idempotency-digest", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "execution.cancel";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "durable-execution-handle";
    requiredEvidence: readonly ["persisted-canonical-plan", "server-custodied-session", "semantic-idempotency-digest", "immutable-terminal-outcome"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "execution.atomic-mutation.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "world-transaction-input";
    requiredEvidence: readonly ["exact-participant-heads", "idempotency-identity", "registry-digest", "reducer-digest", "byte-exact-namespaces"];
    outputAuthority: "world-transaction-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "identity.public-recipient.resolve";
    authorityProfiles: readonly ["global-shared", "projection-only"];
    inputAuthority: "public-recipient-query";
    requiredEvidence: readonly ["public-recipient-consent", "privacy-safe-rate-limit", "one-use-purpose-bound-locator", "exact-subject-head", "authenticated-transport"];
    outputAuthority: "privacy-safe-one-use-recipient-locator-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "action.law.resolve";
    authorityProfiles: readonly ["artifact-local", "projection-only"];
    inputAuthority: "lawful-action-law-query";
    requiredEvidence: readonly ["current-registry", "registry-digest", "current-action-law"];
    outputAuthority: "action-law-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "action.plan";
    authorityProfiles: readonly ["artifact-local", "global-shared", "simulation-only"];
    inputAuthority: "lawful-action-plan-input";
    requiredEvidence: readonly ["current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "law-digest", "action-idempotency-identity"];
    outputAuthority: "lawful-action-plan-runtime";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "action.proof.verify";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "lawful-action-proof";
    requiredEvidence: readonly ["exact-enclosing-proof-object", "pinned-verifier-roots", "current-action-law", "verified-portable-execution-authority", "actor-subject-heads", "causal-parent-heads", "input-output-commitments", "start-completion-kai", "completion-witness", "law-digest", "action-idempotency-identity"];
    outputAuthority: "verified-lawful-action-runtime";
    processBoundary: "reverify-exact-bytes";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "action.admit";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "verified-lawful-action-runtime";
    requiredEvidence: readonly ["verified-artifact-runtime", "current-action-law", "verified-portable-execution-authority", "completion-witness", "action-idempotency-identity", "exact-subject-head", "admission-store"];
    outputAuthority: "admitted-lawful-action-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "action.value-head.derive";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "lawful-action-admission-runtime";
    requiredEvidence: readonly ["exact-enclosing-proof-object", "universal-kai-value-law", "one-spendable-membership", "exact-ownership-head", "start-completion-kai", "law-digest"];
    outputAuthority: "deterministic-value-head-projection-non-authoritative";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "action.settlement.execute";
    authorityProfiles: readonly ["artifact-local", "global-shared"];
    inputAuthority: "lawful-action-admission-runtime";
    requiredEvidence: readonly ["exact-settlement-head", "one-spendable-membership", "owner-capability", "action-idempotency-identity", "persisted-canonical-plan"];
    outputAuthority: "accepted-phi-movement-with-report-only-receipt";
    processBoundary: "same-runtime-custody";
    namespacePolicy: "preserve-all-non-target";
} | {
    compatibleSdkRange: ">=129.0.0 <130.0.0";
    operation: "action.outcome.resolve";
    authorityProfiles: readonly ["artifact-local", "global-shared", "projection-only"];
    inputAuthority: "lawful-action-admission-runtime";
    requiredEvidence: readonly ["action-idempotency-identity", "immutable-terminal-outcome", "authenticated-transport"];
    outputAuthority: "execution-outcome-projection-non-authoritative";
    processBoundary: "projection-only";
    namespacePolicy: "not-applicable";
}>[];
export declare const RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST: "c4e0cff348b62f31db2bb2ffdeec533a92ca3a6d476757bb9b559ac58a7875e1";
export declare const RECEIZ_V112_APP_CLIENT_SURFACES: readonly [Readonly<{
    name: "client.identity.signCapability";
    boundary: "local-identity-key-custody";
    output: "signed-capability-claim-not-yet-verified";
}>, Readonly<{
    name: "client.admission.createEngine";
    boundary: "runtime-composition-only";
}>, Readonly<{
    name: "client.admission.browserStore";
    boundary: "durable-admission-coordination-only";
    storesProofObjects: false;
    storesSealedArtifactBytes: false;
    blocksKnownArtifactFirstPaint: false;
}>];
export declare const RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES: readonly ["client.admission.remoteStore", "client.admission.reconcileOffline"];
export declare const RECEIZ_APP_FRAMEWORKS: readonly ["framework-neutral", "nextjs-app-router"];
export type ReceizAppFramework = (typeof RECEIZ_APP_FRAMEWORKS)[number];
export declare const RECEIZ_APP_FEATURES: readonly ["identity", "proof", "proofMemory", "publicStore", "commerce", "media", "webhooks", "world", "subjects"];
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
    code: "invalid_contract" | "invalid_schema" | "invalid_name" | "unsupported_framework" | "unsupported_feature" | "duplicate_feature" | "invalid_authority" | "database_authority_forbidden" | "invalid_deployment" | "invalid_operation_matrix" | "unknown_key";
    path: string;
    message: string;
}>;
export type ReceizAppContractValidationResult = Readonly<{
    ok: true;
    value: ReceizAppContract;
    issues: readonly [];
}> | Readonly<{
    ok: false;
    issues: readonly ReceizAppContractValidationIssue[];
}>;
export declare function validateReceizAppContract(input: unknown): ReceizAppContractValidationResult;
export declare function defineReceizApp<const T extends ReceizAppContract>(contract: T): T;
export {};
//# sourceMappingURL=appContract.d.ts.map