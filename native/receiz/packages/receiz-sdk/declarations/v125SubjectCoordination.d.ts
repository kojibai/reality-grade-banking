export { prepareReceizInitialTemporalSubjectSourceV125, readReceizTemporalSubjectSourceV125 } from "./v125SubjectSource.js";
import { planReceizExactKksArtifactAppend, type ReceizArtifactAppendPlan, type ReceizArtifactTransitionSealer, type ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import type { ReceizVerifiedCapability } from "./capabilityAuthority.js";
import type { ReceizArtifactTransitionCommitUnit, ReceizArtifactTransitionCommitResult, ReceizStagedArtifactTransition, ReceizArtifactTransitionStore } from "./artifactTransitionStore.js";
import { type ReceizSubjectSourceFamilyV125, type ReceizOpenedSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { type ReceizPbiAuthorshipVerifierV125, type ReceizPbiCeremonyReceiptV125, type ReceizPbiCeremonyReplayGuardV125 } from "./v125PbiCeremony.js";
export type ReceizSubjectRelationshipStatusV125 = "none" | "requested" | "connected" | "declined" | "revoked" | "blocked";
export type ReceizSubjectRelationshipEventKindV125 = "relationship_requested" | "relationship_accepted" | "relationship_declined" | "relationship_revoked" | "subject_blocked" | "subject_unblocked" | "subject_reported" | "introduction_requested" | "introduction_accepted" | "introduction_declined" | "introduction_expired";
export type ReceizSubjectRelationshipEventV125 = Readonly<{
    schema: "receiz.subject.relationship-event.v125";
    kind: ReceizSubjectRelationshipEventKindV125;
    subjectA: string;
    subjectB: string;
    actorSubjectId: string;
    actorReceizId: string;
    introducerSubjectId: string | null;
    subjectHeads: Readonly<Record<string, string>>;
    expectedPriorHead: string | null;
    consentDigest: string;
    eventKai: string;
    idempotencyKey: string;
    actorPresence: ReceizPbiCeremonyReceiptV125;
    eventDigest: string;
    authority: Readonly<{
        eventIsIdentityAuthority: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export type ReceizSubjectRelationshipEventInputV125 = Omit<ReceizSubjectRelationshipEventV125, "schema" | "eventDigest" | "authority">;
export type ReceizSubjectRelationshipEventPlanV125 = Readonly<{
    schema: "receiz.subject.relationship-plan.v125";
    event: ReceizSubjectRelationshipEventV125;
    planIdentity: string;
    confirmationDigest: string;
    confirmationRequired: true;
    transitionPlan?: ReceizArtifactAppendPlan;
    writesPerformed: 0;
    authority: Readonly<{
        planIsAdmission: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export type ReceizSubjectRelationshipEventApplyV125 = Readonly<{
    schema: "receiz.subject.relationship-apply.v125";
    history: readonly ReceizSubjectRelationshipEventV125[];
    projection: ReceizSubjectRelationshipProjectionV125;
    append: ReceizSubjectRelationshipEventV125;
    sourceArtifact: ReceizPortableSealedArtifactV124;
    committedTransition: ReceizCommittedArtifactTransition;
    sourceFamily?: ReceizSubjectSourceFamilyV125;
    writesPerformed: 0 | 1;
    authority: Readonly<{
        applyIsIdentityAuthority: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export type ReceizSubjectRelationshipProjectionV125 = Readonly<{
    schema: "receiz.subject.relationship-projection.v125";
    subjectA: string;
    subjectB: string;
    status: ReceizSubjectRelationshipStatusV125;
    acceptedHead: string | null;
    latestKai: string | null;
    reported: boolean;
    authority: Readonly<{
        projectionIsIdentityAuthority: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export type ReceizSubjectPresenceVisibilityV125 = "connections" | "introduced" | "event" | "public";
/** A namespace locator beneath the existing enclosing sealed subject proof. */
export type ReceizSubjectNamespaceSourceV125 = Readonly<{
    sourceArtifact: ReceizPortableSealedArtifactV124;
    namespace: string;
    sourceFamily?: ReceizSubjectSourceFamilyV125;
}>;
export type ReceizSubjectPresenceV125 = Readonly<{
    schema: "receiz.subject.presence.v125";
    subjectId: string;
    subjectHead: string;
    visibility: ReceizSubjectPresenceVisibilityV125;
    coarseCell: string | null;
    eventId: string | null;
    issuedKai: string;
    expiresAtKai: string;
    expectedPriorHead: string | null;
    presenceHead: string;
    authority: Readonly<{
        presenceIsIdentityAuthority: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export type ReceizSubjectDiscoveryResultV125 = Readonly<{
    schema: "receiz.subject.discovery-result.v125";
    viewerSubjectId: string;
    selectedKai: string;
    query: Readonly<{
        coarseCell: string | null;
        eventId: string | null;
    }>;
    subjects: readonly Readonly<{
        subjectId: string;
        subjectHead: string;
        presenceHead: string;
        relationshipHead: string | null;
    }>[];
    resultDigest: string;
    authority: Readonly<{
        discoveryProjectionIsAuthority: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export declare class ReceizSubjectCoordinationZeroWriteErrorV125 extends TypeError {
    readonly code: string;
    readonly writesPerformed: 0;
    constructor(code: string);
}
declare function relationshipAuthority(): {
    eventIsIdentityAuthority: false;
    strongerTruth: "sealed-subject-proof";
};
export declare function createReceizSubjectRelationshipEventBindingDigestV125(input: Omit<ReceizSubjectRelationshipEventInputV125, "actorPresence">): Promise<string>;
export declare function projectReceizSubjectRelationshipV125(events: readonly ReceizSubjectRelationshipEventV125[], input: Readonly<{
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizSubjectRelationshipProjectionV125>;
declare function planRelationshipEvent(input: Readonly<{
    history?: readonly ReceizSubjectRelationshipEventV125[];
    event: ReceizSubjectRelationshipEventInputV125;
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
    sealedSource?: ReceizSealedSubjectRelationshipContextV125;
}>): Promise<ReceizSubjectRelationshipEventPlanV125>;
export declare function planReceizSubjectRelationshipEventV125(input: Parameters<typeof planRelationshipEvent>[0]): Promise<ReceizSubjectRelationshipEventPlanV125>;
export type ReceizSealedSubjectRelationshipContextV125 = Readonly<{
    sourceArtifact: ReceizPortableSealedArtifactV124;
    sourceFamily?: ReceizSubjectSourceFamilyV125;
    participantSources: Readonly<Record<string, ReceizPortableSealedArtifactV124>>;
    identityArtifact: ReceizPortableSealedArtifactV124;
    expectedArtifactDigest: string;
    expectedHead: string;
    commitDomain: Parameters<typeof planReceizExactKksArtifactAppend>[0]["commitDomain"];
    kksCoordinate: unknown;
}>;
/** Retention and read-only accepted-source recovery, subordinate to canonical append verification. */
export interface ReceizSubjectRelationshipSourceStoreV125 extends ReceizArtifactTransitionStore {
    retainSubjectSourceFamily(family: ReceizOpenedSubjectSourceFamilyV125, successorArtifactDigest: string): Promise<void>;
    readSubjectSourceFamily(familySetDigest: string): Promise<ReceizOpenedSubjectSourceFamilyV125 | null>;
    findAcceptedSubjectTransition(plan: ReceizArtifactAppendPlan): Promise<Readonly<{
        staged: ReceizStagedArtifactTransition;
        familySetDigest: string;
    }> | null>;
    recoverAcceptedSubjectTransition(unit: ReceizArtifactTransitionCommitUnit): Promise<ReceizArtifactTransitionCommitResult>;
}
/** Complete enclosing sources admit additions; a detached array never grants access. */
export declare function readReceizSubjectRelationshipSourceV125(input: Readonly<{
    sourceArtifact: ReceizPortableSealedArtifactV124;
    subjectA: string;
    subjectB: string;
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
    sourceFamily?: ReceizOpenedSubjectSourceFamilyV125;
}>): Promise<readonly ReceizSubjectRelationshipEventV125[]>;
export declare function applyReceizSubjectRelationshipEventV125(input: Readonly<{
    history?: readonly ReceizSubjectRelationshipEventV125[];
    plan: ReceizSubjectRelationshipEventPlanV125;
    confirmationDigest: string;
    verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
    replayGuard: ReceizPbiCeremonyReplayGuardV125;
    capability: ReceizVerifiedCapability;
    sealer: ReceizArtifactTransitionSealer;
    store: ReceizArtifactTransitionStore;
}>): Promise<ReceizSubjectRelationshipEventApplyV125>;
declare function presenceAuthority(): {
    presenceIsIdentityAuthority: false;
    strongerTruth: "sealed-subject-proof";
};
export declare function createReceizSubjectPresenceV125(input: Omit<ReceizSubjectPresenceV125, "schema" | "presenceHead" | "authority">): Promise<ReceizSubjectPresenceV125>;
export type ReceizSubjectPresenceEventKindV125 = "presence_opted_in" | "presence_renewed" | "presence_revoked";
export type ReceizSubjectPresenceEventInputV125 = Readonly<{
    kind: ReceizSubjectPresenceEventKindV125;
    subjectId: string;
    subjectHead: string;
    actorReceizId: string;
    presence: ReceizSubjectPresenceV125 | null;
    expectedPriorHead: string | null;
    consentDigest: string;
    eventKai: string;
    idempotencyKey: string;
    actorPresence: ReceizPbiCeremonyReceiptV125;
}>;
export type ReceizSubjectPresenceEventV125 = ReceizSubjectPresenceEventInputV125 & Readonly<{
    schema: "receiz.subject.presence-event.v125";
    eventDigest: string;
    authority: ReturnType<typeof relationshipAuthority>;
}>;
export type ReceizSealedSubjectPresenceContextV125 = Omit<ReceizSealedSubjectRelationshipContextV125, "participantSources" | "sourceFamily"> & Readonly<{
    sourceFamily: ReceizSubjectSourceFamilyV125;
}>;
export type ReceizSubjectPresenceProjectionV125 = Readonly<{
    schema: "receiz.subject.presence-projection.v125";
    subjectId: string;
    sourceHead: string;
    selectedKai: string;
    status: "none" | "current" | "expired" | "not-yet-current" | "revoked";
    presence: ReceizSubjectPresenceV125 | null;
    acceptedHead: string | null;
    history: readonly ReceizSubjectPresenceEventV125[];
    authority: ReturnType<typeof presenceAuthority>;
}>;
export type ReceizSubjectPresenceEventPlanV125 = Readonly<{
    schema: "receiz.subject.presence-plan.v125";
    event: ReceizSubjectPresenceEventV125;
    transitionPlan: ReceizArtifactAppendPlan;
    planIdentity: string;
    confirmationDigest: string;
    confirmationRequired: true;
    writesPerformed: 0;
    authority: Readonly<{
        planIsAdmission: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export type ReceizSubjectPresenceEventApplyV125 = Readonly<{
    schema: "receiz.subject.presence-apply.v125";
    append: ReceizSubjectPresenceEventV125;
    projection: ReceizSubjectPresenceProjectionV125;
    sourceArtifact: ReceizPortableSealedArtifactV124;
    sourceFamily: ReceizSubjectSourceFamilyV125;
    committedTransition: ReceizCommittedArtifactTransition;
    writesPerformed: 0 | 1;
    authority: Readonly<{
        applyIsIdentityAuthority: false;
        strongerTruth: "sealed-subject-proof";
    }>;
}>;
export declare function createReceizSubjectPresenceEventBindingDigestV125(input: Omit<ReceizSubjectPresenceEventInputV125, "actorPresence">): Promise<string>;
/** Authenticate the complete source before projecting the selected deterministic Kai. */
export declare function projectReceizSubjectPresenceV125(input: Readonly<{
    sourceArtifact: ReceizPortableSealedArtifactV124;
    sourceFamily?: ReceizSubjectSourceFamilyV125;
    selectedKai: string;
    namespace?: string;
}>): Promise<ReceizSubjectPresenceProjectionV125>;
export declare function planReceizSubjectPresenceEventV125(input: Readonly<{
    event: ReceizSubjectPresenceEventInputV125;
    sealedSource: ReceizSealedSubjectPresenceContextV125;
}>): Promise<ReceizSubjectPresenceEventPlanV125>;
export declare function applyReceizSubjectPresenceEventV125(input: Readonly<{
    plan: ReceizSubjectPresenceEventPlanV125;
    confirmationDigest: string;
    replayGuard: ReceizPbiCeremonyReplayGuardV125;
    capability: ReceizVerifiedCapability;
    sealer: ReceizArtifactTransitionSealer;
    store: ReceizArtifactTransitionStore;
}>): Promise<ReceizSubjectPresenceEventApplyV125>;
/** Verify a declaration against its exact enclosing source. Historical proof remains valid;
 * use source-derived projection at selected Kai to determine current presence. */
export declare function verifyReceizSubjectPresenceV125(presence: ReceizSubjectPresenceV125, source?: ReceizSubjectNamespaceSourceV125): Promise<boolean>;
/** A declaration alone answers expiry only. A source-derived projection also carries revocation/currentness. */
export declare function resolveReceizSubjectPresenceCurrentnessV125(presence: ReceizSubjectPresenceV125 | ReceizSubjectPresenceProjectionV125, selectedKai: string): "current" | "expired" | "not-yet-current" | "invalid" | "none" | "revoked";
export declare function discoverReceizSubjectsV125(input: Readonly<{
    viewerSubjectId: string;
    selectedKai: string;
    query: Readonly<{
        coarseCell: string | null;
        eventId: string | null;
    }>;
    candidates: readonly Readonly<{
        presence: ReceizSubjectPresenceV125;
        source?: ReceizSubjectNamespaceSourceV125;
        relationshipSource?: ReceizSubjectNamespaceSourceV125;
        relationshipHead: string;
        blocked: boolean;
        consented: boolean;
    }>[];
    verifyPbiAuthorship?: ReceizPbiAuthorshipVerifierV125;
    sourceFamily?: ReceizSubjectSourceFamilyV125;
}>): Promise<ReceizSubjectDiscoveryResultV125>;
//# sourceMappingURL=v125SubjectCoordination.d.ts.map