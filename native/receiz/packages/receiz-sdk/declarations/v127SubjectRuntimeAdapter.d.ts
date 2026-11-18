import { type ReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import { createReceizLivingSubjectRuntime, type ReceizLivingSubjectRuntimeOptions, type ReceizLivingSubjectRuntimeSnapshotV1 } from "./livingSubjectRuntime.js";
import { restoreReceizSubjectProofBrain } from "./livingSubjects.js";
import type { ReceizSubjectArtifactV1, ReceizSubjectTwinMessageInput } from "./livingSubjects.js";
type Runtime = ReturnType<typeof createReceizLivingSubjectRuntime>;
type Subjects = Runtime["subjects"];
type Argument<F extends (...args: never[]) => unknown, N extends number = 0> = Parameters<F>[N];
export type ReceizV127SubjectRuntimeSource = Readonly<{
    verification: ReceizArtifactVerificationResult;
    /** Exact enclosing-artifact payload; its digest is checked before parsing. */
    payloadBytes: Uint8Array;
}>;
export type ReceizV127SubjectRuntimeRecord = Readonly<{
    schema: "receiz.subject.local-runtime.v127";
    ownerReceizId: string;
    revision: string;
    sources: readonly Readonly<{
        artifactDigest: string;
        payloadDigest: string;
        exactArtifactBytesB64u: string;
        filename: string;
        mimeType: string;
        role?: "portable-envelope";
    }>[];
    snapshot: ReceizLivingSubjectRuntimeSnapshotV1;
    /** Verified append bindings; absence explicitly leaves historical Kai integers unproved. */
    temporalTransitions?: readonly Readonly<{
        legacyKaiUnit: "kai-pulse";
        kind?: "proof-execution" | "historical-source-import";
        previousSnapshotDigest: string;
        snapshotDigest: string;
        enclosingSourceArtifactDigests: readonly string[];
        coordinates: readonly ReceizKksV1ProofCoordinate[];
    }>[];
}>;
export type ReceizV127SubjectPortableSnapshot = Readonly<{
    schema: "receiz.subject.portable-runtime.v127";
    version: "127.0.0";
    snapshot: ReceizLivingSubjectRuntimeSnapshotV1;
    snapshotDigest: string;
    sourceArtifacts: ReceizV127SubjectRuntimeRecord["sources"];
    temporalEvidence: Readonly<{
        legacyKaiUnit: "kai-pulse";
        historicalKaiAuthority: "not-retroactively-proved";
        transitions: NonNullable<ReceizV127SubjectRuntimeRecord["temporalTransitions"]>;
    }>;
}>;
/** Host custody, never a transported snapshot/authority supplied by a tool caller.
 * Implementations must provide durable, private, atomic compare-and-set storage. */
export type ReceizV127SubjectRuntimeStore = Readonly<{
    load(): Promise<ReceizV127SubjectRuntimeRecord | null>;
    compareAndSet(expectedRevision: string | null, next: ReceizV127SubjectRuntimeRecord): Promise<boolean>;
}>;
export type ReceizV127SubjectTemporalResolver = (context: Readonly<{
    previousKaiSigilProofHead: string | null;
    minimumExclusiveKaiUpulse?: string;
    minimumInclusiveLegacyKai: string;
    legacyKaiUnit: "kai-pulse";
    operation: string;
}>) => Promise<unknown>;
export type ReceizV127SubjectRuntimeAdapterOptions = Omit<ReceizLivingSubjectRuntimeOptions, "snapshot" | "initialKai" | "temporalExecution"> & Readonly<{
    identityAdmission: unknown;
    store: ReceizV127SubjectRuntimeStore;
    initialSource?: ReceizV127SubjectRuntimeSource;
    resolveTemporalCoordinate?: ReceizV127SubjectTemporalResolver;
}>;
/** Explicit V120 host composition. It preserves V120 identities and reducers;
 * V122 sources are not converted. Identity and verifier objects retain SDK custody. */
export declare function createReceizV127SubjectRuntimeAdapter(options: ReceizV127SubjectRuntimeAdapterOptions): Promise<Readonly<{
    version: "120.0.0";
    registryDigest: string;
    reducerDigest: string;
    exportSnapshot: () => Promise<Readonly<{
        schema: "receiz.subject.portable-runtime.v127";
        version: "127.0.0";
        snapshot: ReceizLivingSubjectRuntimeSnapshotV1;
        snapshotDigest: string;
        sourceArtifacts: ReceizV127SubjectRuntimeRecord["sources"];
        temporalEvidence: Readonly<{
            legacyKaiUnit: "kai-pulse";
            historicalKaiAuthority: "not-retroactively-proved";
            transitions: NonNullable<ReceizV127SubjectRuntimeRecord["temporalTransitions"]>;
        }>;
    }>>;
    importSnapshot: (source: ReceizV127SubjectRuntimeSource) => Promise<{
        subjectIds: string[];
        snapshotDigest: string;
    }>;
    /** Restore only a verified extension of held causal history. A divergent crystal never replaces it. */
    restoreSnapshot: (source: ReceizV127SubjectRuntimeSource) => Promise<{
        status: "already-held";
        subjectIds: string[];
        snapshotDigest: string;
    } | {
        status: "restored" | "extended";
        subjectIds: string[];
        snapshotDigest: string;
    }>;
    admitSubject: (source: ReceizV127SubjectRuntimeSource) => Promise<Readonly<{
        schema: "receiz.subject.v1";
        subject: import("./livingSubjects.js").ReceizSubjectV1;
        exactBytesB64u: string;
        artifactDigest: string;
        registryDigest: string;
        reducerDigest: string;
        authority: Readonly<{
            artifactIsProofAuthority: true;
            modelOutputIsAuthority: false;
            indexIsAuthority: false;
        }>;
    }>>;
    subjects: Readonly<{
        resolve: (id: string) => Promise<Readonly<{
            schema: "receiz.subject.v1";
            subject: import("./livingSubjects.js").ReceizSubjectV1;
            exactBytesB64u: string;
            artifactDigest: string;
            registryDigest: string;
            reducerDigest: string;
            authority: Readonly<{
                artifactIsProofAuthority: true;
                modelOutputIsAuthority: false;
                indexIsAuthority: false;
            }>;
        }>>;
        state: (id: string) => Promise<Readonly<{
            schema: "receiz.subject.v1";
            subjectId: string;
            proofObjectId: string;
            subjectType: string;
            ownerReceizId: string;
            identityDigest: string;
            genesisDigest: string;
            createdAtKai: string;
            head: string;
            ownershipHead: string;
            currentOwnerReceizId: string;
            namespaces: import("./livingSubjects.js").ReceizSubjectNamespaceBytesV1;
        }>>;
        verify: (artifact: Argument<Subjects["verify"]>) => Promise<{
            valid: boolean;
            sourcePrimitive: "receiz.subject.v1";
        }>;
        history: (id: string, input?: Argument<Subjects["history"], 1>) => Promise<Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>[]>;
        additions: (id: string, input?: Argument<Subjects["additions"], 1>) => Promise<Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>[]>;
        subscribe: (id: string, input?: Argument<Subjects["subscribe"], 1>) => AsyncGenerator<Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>, void, unknown>;
        brain: Readonly<{
            head: (id: string) => Promise<Readonly<{
                schema: "receiz.subject.proof_brain.v1";
                subjectId: string;
                subjectDigest: string;
                subjectHead: string;
                historyHead: string;
                indexRoot: string;
                objectMerkleRoot: string;
                objectCount: string;
                operationCount: string;
                maximumKai: string;
                priorBrainHead: string | null;
                fibonacci: import("./compositeProofKernel.js").ReceizCompositeFibonacciState;
                registryDigest: string;
                reducerDigest: string;
                authority: Readonly<{
                    brainHeadIsProofAuthority: false;
                    indexIsProofAuthority: false;
                    strongerTruth: "sealed-receiz-proof-object";
                }>;
            }>>;
            search: (id: string, input: Argument<Subjects["brain"]["search"], 1>) => Promise<Readonly<{
                schema: "receiz.subject.proof_reference.v1";
                subjectId: string;
                subjectHead: string;
                proofObjectId: string;
                objectDigest: string;
                kai: string;
                score: number;
                matchedTerms: readonly string[];
                eventIds: readonly string[];
                membership: Readonly<{
                    objectOrdinal: number;
                    objectMerkleRoot: string;
                    indexRoot: string;
                }>;
            }>[]>;
            resolve: (id: string, input: Argument<ReturnType<typeof restoreReceizSubjectProofBrain>["resolveContext"]>) => Promise<Readonly<{
                schema: "receiz.subject.proof_context.v1";
                head: import("./livingSubjects.js").ReceizSubjectProofBrainHeadV1;
                references: readonly import("./livingSubjects.js").ReceizSubjectProofReferenceV1[];
                primaryObjects: readonly import("./livingSubjects.js").ReceizSubjectPrimaryProofObjectV1[];
                passages: readonly import("./livingSubjects.js").ReceizSubjectProofPassageV1[];
                receipt: import("./livingSubjects.js").ReceizSubjectProofRetrievalReceiptV1;
            }>>;
            stream: (id: string, input: Argument<Subjects["brain"]["stream"], 1>) => AsyncGenerator<import("./livingSubjects.js").ReceizSubjectProofBrainStreamEvent, void, unknown>;
            append: (id: string, source: ReceizV127SubjectRuntimeSource) => Promise<Readonly<{
                schema: "receiz.subject.proof_brain.v1";
                subjectId: string;
                subjectDigest: string;
                subjectHead: string;
                historyHead: string;
                indexRoot: string;
                objectMerkleRoot: string;
                objectCount: string;
                operationCount: string;
                maximumKai: string;
                priorBrainHead: string | null;
                fibonacci: import("./compositeProofKernel.js").ReceizCompositeFibonacciState;
                registryDigest: string;
                reducerDigest: string;
                authority: Readonly<{
                    brainHeadIsProofAuthority: false;
                    indexIsProofAuthority: false;
                    strongerTruth: "sealed-receiz-proof-object";
                }>;
            }>>;
        }>;
        twin: Readonly<{
            profile: (id: string) => Promise<Readonly<{
                subjectId: string;
                subjectType: string;
                head: string;
                selfModel: unknown;
                brainHead: Readonly<{
                    schema: "receiz.subject.proof_brain.v1";
                    subjectId: string;
                    subjectDigest: string;
                    subjectHead: string;
                    historyHead: string;
                    indexRoot: string;
                    objectMerkleRoot: string;
                    objectCount: string;
                    operationCount: string;
                    maximumKai: string;
                    priorBrainHead: string | null;
                    fibonacci: import("./compositeProofKernel.js").ReceizCompositeFibonacciState;
                    registryDigest: string;
                    reducerDigest: string;
                    authority: Readonly<{
                        brainHeadIsProofAuthority: false;
                        indexIsProofAuthority: false;
                        strongerTruth: "sealed-receiz-proof-object";
                    }>;
                }>;
            }>>;
            message: (id: string, input: Omit<ReceizSubjectTwinMessageInput, "ownerReceizId">) => Promise<Readonly<{
                schema: "receiz.subject.twin_result.v1";
                subjectId: string;
                subjectHead: string;
                spokenResponse: string;
                proposedIntent: import("./livingSubjects.js").ReceizSubjectIntentV1;
                observedFacts: readonly Readonly<{
                    fact: string;
                    eventIds: readonly string[];
                    proofObjectIds: readonly string[];
                }>[];
                proofDerivedMemories: readonly Readonly<{
                    memoryId: string;
                    summary: string;
                    eventIds: readonly string[];
                }>[];
                performance: Readonly<Record<string, unknown>> | null;
                proofContext: import("./livingSubjects.js").ReceizSubjectProofContextV1;
                worldEventIds: readonly [];
                authority: Readonly<{
                    modelOutputIsWorldEvent: false;
                    deterministicAdmissionRequired: true;
                }>;
            }>>;
            stream: (id: string, input: Omit<ReceizSubjectTwinMessageInput, "ownerReceizId">) => AsyncGenerator<import("./livingSubjects.js").ReceizSubjectTwinStreamEvent, void, unknown>;
            streamPerformance: (id: string, input: Omit<ReceizSubjectTwinMessageInput, "ownerReceizId">) => AsyncGenerator<import("./livingSubjects.js").ReceizSubjectTwinStreamEvent, void, unknown>;
            exportMind: (id: string) => Promise<Readonly<{
                schema: "receiz.subject.mind.v1";
                subjectArtifact: ReceizSubjectArtifactV1;
                brainHead: import("./livingSubjects.js").ReceizSubjectProofBrainHeadV1;
                portableWindow: readonly import("./livingSubjects.js").ReceizSubjectPrimaryProofObjectV1[];
                completeHistory: Readonly<{
                    objectCount: string;
                    objectMerkleRoot: string;
                    indexRoot: string;
                    contentAddress: string;
                    primaryObjectsRequiredForReasoning: true;
                }>;
                publicMemoryIds: readonly string[];
                privateMemoryIds: readonly string[];
                priorMindHead: string | null;
                mindDigest: string;
                exactBytesB64u: string;
                registryDigest: string;
                reducerDigest: string;
            }>>;
            importMind: (id: string, source: ReceizV127SubjectRuntimeSource) => Promise<Readonly<{
                ok: false;
                code: "RECEIZ_SUBJECT_MIND_FORK_PRESERVED";
                writes: 0;
                localHead: string;
                importedHead: string;
                forkDigest: string;
            }> | Readonly<{
                ok: true;
                subjectId: string;
                mindDigest: string;
                head: string;
            }>>;
            memorySummary: (id: string) => Promise<Readonly<{
                subjectId: string;
                head: string;
                counts: Readonly<{
                    [k: string]: number;
                }>;
                projectionDigest: string;
            }>>;
        }>;
        mandates: Readonly<{
            get: (id: string) => Promise<Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: import("./livingSubjects.js").ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[]>;
            plan: (id: string, input: Argument<Subjects["mandates"]["plan"], 1>) => Promise<Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: import("./livingSubjects.js").ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>>;
            activate: (id: string, mandateDigest: string) => Promise<Readonly<{
                status: "active";
                activatedCapabilityDigest: string;
                activatedAtKai: string;
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: import("./livingSubjects.js").ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                revokedAtKai: string | null;
            }>>;
            pause: (id: string) => Promise<Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: import("./livingSubjects.js").ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[]>;
            revoke: (id: string) => Promise<Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: import("./livingSubjects.js").ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[]>;
            explain: (id: string) => Promise<{
                temporalCoordinate: Readonly<{
                    schema: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA;
                    kksVersion: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_VERSION;
                    kaiPulse: string;
                    kaiUpulse: string;
                    source: import("./v125KaiAuthority.js").ReceizKksV1CoordinateSource;
                    kaiSigil: import("./v125KaiAuthority.js").ReceizKaiSigilTemporalProofV1;
                    authority: Readonly<{
                        temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
                        intrinsicProof: "kaisigil-blake3-poseidon-groth16";
                        causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse";
                        chronosRole: "descriptive-projection-only";
                        createdAtAuthority: false;
                        networkRequired: false;
                    }>;
                }>;
                subjectId: string;
                currentKai: string;
                mandates: readonly {
                    executable: boolean;
                    schema: "receiz.subject.mandate.v1";
                    mandateId: string;
                    subjectId: string;
                    ownerReceizId: string;
                    policy: import("./livingSubjects.js").ReceizSubjectMandatePolicyV1;
                    mandateDigest: string;
                    status: "planned" | "active" | "paused" | "revoked" | "expired";
                    activatedCapabilityDigest: string | null;
                    activatedAtKai: string | null;
                    revokedAtKai: string | null;
                }[];
            }>;
        }>;
        runtime: Readonly<{
            enqueueTick: (input: Argument<Subjects["runtime"]["enqueueTick"]>) => Promise<Readonly<{
                jobId: string;
                input: import("./livingSubjects.js").ReceizSubjectRuntimeTickInput;
                status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
                leaseUntilKai: string | null;
                attemptCount: number;
                eventIds: readonly string[];
                failureCode: string | null;
            }>>;
            status: (id: string) => Promise<Readonly<{
                jobId: string;
                input: import("./livingSubjects.js").ReceizSubjectRuntimeTickInput;
                status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
                leaseUntilKai: string | null;
                attemptCount: number;
                eventIds: readonly string[];
                failureCode: string | null;
            }>>;
            pause: (id: string) => Promise<Readonly<{
                subjectId: string;
                cancelledJobIds: readonly string[];
                writes: number;
            }>>;
            catchUp: (id: string, input?: Argument<Subjects["runtime"]["catchUp"], 1>) => Promise<Readonly<{
                subjectId: string;
                processed: number;
                jobs: readonly Readonly<{
                    jobId: string;
                    input: import("./livingSubjects.js").ReceizSubjectRuntimeTickInput;
                    status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
                    leaseUntilKai: string | null;
                    attemptCount: number;
                    eventIds: readonly string[];
                    failureCode: string | null;
                }>[];
            }>>;
        }>;
        memory: Readonly<{
            query: (id: string, input?: Argument<Subjects["memory"]["query"], 1>) => Promise<Readonly<{
                schema: "receiz.subject.memory_event.v1";
                memoryId: string;
                subjectId: string;
                type: import("./livingSubjects.js").ReceizSubjectMemoryType;
                summary: string;
                eventIds: readonly string[];
                proofObjectIds: readonly string[];
                visibility: "public" | "private";
                head: string;
                kai: string;
            }>[]>;
            project: (id: string, input: Argument<Subjects["memory"]["project"], 1>) => Promise<Readonly<{
                schema: "receiz.subject.memory_projection.v1";
                subjectId: string;
                throughHead: string;
                memories: readonly import("./livingSubjects.js").ReceizSubjectMemoryEventV1[];
                projectionDigest: string;
                rebuildable: true;
            }>>;
            citations: (id: string, memoryId: string) => Promise<Readonly<{
                memoryId: string;
                eventIds: readonly string[];
                proofObjectIds: readonly string[];
            }>>;
            compact: (id: string, input?: Argument<Subjects["memory"]["compact"], 1>) => Promise<Readonly<{
                schema: "receiz.subject.memory_projection.v1";
                subjectId: string;
                throughHead: string;
                memories: readonly import("./livingSubjects.js").ReceizSubjectMemoryEventV1[];
                projectionDigest: string;
                rebuildable: true;
            }>>;
        }>;
        relationships: Readonly<{
            list: (id: string) => Promise<Readonly<{
                schema: "receiz.subject.relationship.v1";
                relationshipId: string;
                subjectIds: readonly [string, string];
                status: "proposed" | "active" | "declined" | "blocked";
                familiarity: number;
                trust: number;
                rivalry: number;
                affection: number;
                mentorship: number;
                visibility: "public" | "private";
                eventIds: readonly string[];
                head: string;
            }>[]>;
            history: (id: string) => Promise<Readonly<{
                schema: "receiz.world.event.v1";
                eventId: string;
                commandId: string;
                worldId: string;
                kind: string;
                actorSubjectId: string;
                participantSubjectIds: readonly string[];
                payload: Readonly<Record<string, unknown>>;
                causalParents: readonly string[];
                priorHeads: Readonly<Record<string, string>>;
                nextHeads: Readonly<Record<string, string>>;
                priorWorldHead: string;
                worldHead: string;
                mandateDigest?: string;
                kai: string;
                registryDigest: string;
                reducerDigest: string;
            }>[]>;
            propose: (input: Argument<Subjects["relationships"]["propose"]>) => Promise<Readonly<{
                schema: "receiz.world.transaction.v1";
                transactionId: string;
                transactionDigest: string;
                worldId: string;
                participants: readonly string[];
                expectedHeads: Readonly<Record<string, string>>;
                commands: readonly import("./livingSubjects.js").ReceizWorldCommandV1[];
                registryDigest: string;
                reducerDigest: string;
            }>>;
            respond: (input: Omit<Argument<Subjects["relationships"]["respond"]>, "authority">) => Promise<Readonly<{
                ok: false;
                schema: "receiz.world.zero-write-failure.v1";
                code: string;
                message: string;
                commandId: string | null;
                attemptId: string | null;
                writes: 0;
                currentHeads: Readonly<Record<string, string>>;
                worldHead: string;
                registryDigest: string;
                reducerDigest: string;
            }> | Readonly<{
                ok: true;
                receipt: import("./livingSubjects.js").ReceizWorldReceiptV1;
                events: readonly import("./livingSubjects.js").ReceizWorldEventV1[];
            }>>;
        }>;
        inventory: Readonly<{
            list: (id: string) => Promise<Readonly<{
                schema: "receiz.subject.inventory.v1";
                subjectId: string;
                head: string;
                items: readonly import("./livingSubjects.js").ReceizSubjectInventoryItemV1[];
            }>>;
            use: (input: Omit<Argument<Subjects["inventory"]["use"]>, "authority">) => Promise<Readonly<{
                ok: false;
                schema: "receiz.world.zero-write-failure.v1";
                code: string;
                message: string;
                commandId: string | null;
                attemptId: string | null;
                writes: 0;
                currentHeads: Readonly<Record<string, string>>;
                worldHead: string;
                registryDigest: string;
                reducerDigest: string;
            }> | Readonly<{
                ok: true;
                receipt: import("./livingSubjects.js").ReceizWorldReceiptV1;
                events: readonly import("./livingSubjects.js").ReceizWorldEventV1[];
            }>>;
        }>;
        trades: Readonly<{
            preview: (input: Argument<Subjects["trades"]["preview"]>) => Promise<Readonly<{
                transaction: Readonly<{
                    schema: "receiz.world.transaction.v1";
                    transactionId: string;
                    transactionDigest: string;
                    worldId: string;
                    participants: readonly string[];
                    expectedHeads: Readonly<Record<string, string>>;
                    commands: readonly import("./livingSubjects.js").ReceizWorldCommandV1[];
                    registryDigest: string;
                    reducerDigest: string;
                }>;
                item: Readonly<{
                    itemId: string;
                    proofObjectId: string;
                    ownerSubjectId: string;
                    quantity: string;
                    valueMinor: string;
                    namespaceBytes: string;
                }>;
                requiresOwnerApproval: boolean;
                exactOwnershipHeads: Readonly<Record<string, string>>;
                previewDigest: string;
            }>>;
            execute: (preview: Argument<Subjects["trades"]["execute"]>) => Promise<Readonly<{
                ok: false;
                schema: "receiz.world.zero-write-failure.v1";
                code: string;
                message: string;
                commandId: string | null;
                attemptId: string | null;
                writes: 0;
                currentHeads: Readonly<Record<string, string>>;
                worldHead: string;
                registryDigest: string;
                reducerDigest: string;
            }> | Readonly<{
                ok: true;
                receipt: import("./livingSubjects.js").ReceizWorldReceiptV1;
                events: readonly import("./livingSubjects.js").ReceizWorldEventV1[];
            }>>;
        }>;
    }>;
    world: Readonly<{
        head: (id: string) => Promise<string>;
        planCommand: (input: Argument<Runtime["world"]["planCommand"]>) => Promise<Readonly<{
            schema: "receiz.world.command_plan.v1";
            planId: string;
            planDigest: string;
            command: import("./livingSubjects.js").ReceizWorldCommandV1;
            priorHeads: Readonly<Record<string, string>>;
            worldHead: string;
            registryDigest: string;
            reducerDigest: string;
            writesOnFailure: 0;
        }>>;
        validateCommand: (input: Argument<Runtime["world"]["validateCommand"]>) => Promise<{
            temporalCoordinate: Readonly<{
                schema: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA;
                kksVersion: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_VERSION;
                kaiPulse: string;
                kaiUpulse: string;
                source: import("./v125KaiAuthority.js").ReceizKksV1CoordinateSource;
                kaiSigil: import("./v125KaiAuthority.js").ReceizKaiSigilTemporalProofV1;
                authority: Readonly<{
                    temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
                    intrinsicProof: "kaisigil-blake3-poseidon-groth16";
                    causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse";
                    chronosRole: "descriptive-projection-only";
                    createdAtAuthority: false;
                    networkRequired: false;
                }>;
            }>;
            ok: false;
            schema: "receiz.world.zero-write-failure.v1";
            code: string;
            message: string;
            commandId: string | null;
            attemptId: string | null;
            writes: 0;
            currentHeads: Readonly<Record<string, string>>;
            worldHead: string;
            registryDigest: string;
            reducerDigest: string;
        } | {
            temporalCoordinate: Readonly<{
                schema: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA;
                kksVersion: typeof import("./v125KaiAuthority.js").RECEIZ_KKS_V1_VERSION;
                kaiPulse: string;
                kaiUpulse: string;
                source: import("./v125KaiAuthority.js").ReceizKksV1CoordinateSource;
                kaiSigil: import("./v125KaiAuthority.js").ReceizKaiSigilTemporalProofV1;
                authority: Readonly<{
                    temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
                    intrinsicProof: "kaisigil-blake3-poseidon-groth16";
                    causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse";
                    chronosRole: "descriptive-projection-only";
                    createdAtAuthority: false;
                    networkRequired: false;
                }>;
            }>;
            ok: true;
            planId: string;
            planDigest: string;
            currentHeads: Readonly<Record<string, string>>;
            worldHead: string;
            writes: 0;
            registryDigest: string;
            reducerDigest: string;
        }>;
        executeCommand: (input: Argument<Runtime["world"]["executeCommand"]>) => Promise<Readonly<{
            ok: false;
            schema: "receiz.world.zero-write-failure.v1";
            code: string;
            message: string;
            commandId: string | null;
            attemptId: string | null;
            writes: 0;
            currentHeads: Readonly<Record<string, string>>;
            worldHead: string;
            registryDigest: string;
            reducerDigest: string;
        }> | Readonly<{
            ok: true;
            receipt: import("./livingSubjects.js").ReceizWorldReceiptV1;
            events: readonly import("./livingSubjects.js").ReceizWorldEventV1[];
        }>>;
        planTransaction: (input: Argument<Runtime["world"]["planTransaction"]>) => Promise<Readonly<{
            schema: "receiz.world.transaction.v1";
            transactionId: string;
            transactionDigest: string;
            worldId: string;
            participants: readonly string[];
            expectedHeads: Readonly<Record<string, string>>;
            commands: readonly import("./livingSubjects.js").ReceizWorldCommandV1[];
            registryDigest: string;
            reducerDigest: string;
        }>>;
        executeTransaction: (input: Argument<Runtime["world"]["executeTransaction"]>) => Promise<Readonly<{
            ok: false;
            schema: "receiz.world.zero-write-failure.v1";
            code: string;
            message: string;
            commandId: string | null;
            attemptId: string | null;
            writes: 0;
            currentHeads: Readonly<Record<string, string>>;
            worldHead: string;
            registryDigest: string;
            reducerDigest: string;
        }> | Readonly<{
            ok: true;
            receipt: import("./livingSubjects.js").ReceizWorldReceiptV1;
            events: readonly import("./livingSubjects.js").ReceizWorldEventV1[];
        }>>;
        receipt: (id: string) => Promise<Readonly<{
            schema: "receiz.world.receipt.v1";
            receiptId: string;
            commandId: string;
            attemptId: string;
            eventIds: readonly string[];
            actorSubjectId: string;
            mandateDigest?: string;
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            worldHead: string;
            reducerDigest: string;
            registryDigest: string;
            kai: string;
        }>>;
        replay: (input: Argument<Runtime["world"]["replay"]>) => Promise<Readonly<{
            schema: "receiz.world.checkpoint.v1";
            worldId: string;
            throughHead: string;
            events: readonly Readonly<{
                schema: "receiz.world.event.v1";
                eventId: string;
                commandId: string;
                worldId: string;
                kind: string;
                actorSubjectId: string;
                participantSubjectIds: readonly string[];
                payload: Readonly<Record<string, unknown>>;
                causalParents: readonly string[];
                priorHeads: Readonly<Record<string, string>>;
                nextHeads: Readonly<Record<string, string>>;
                priorWorldHead: string;
                worldHead: string;
                mandateDigest?: string;
                kai: string;
                registryDigest: string;
                reducerDigest: string;
            }>[];
            subjectHeads: Readonly<Record<string, string>>;
            checkpointDigest: string;
            registryDigest: string;
            reducerDigest: string;
        }>>;
        additions: (input: Argument<Runtime["world"]["additions"]>) => Promise<Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>[]>;
        subscribe: (input: Argument<Runtime["world"]["subscribe"]>) => AsyncGenerator<Readonly<{
            schema: "receiz.world.event.v1";
            eventId: string;
            commandId: string;
            worldId: string;
            kind: string;
            actorSubjectId: string;
            participantSubjectIds: readonly string[];
            payload: Readonly<Record<string, unknown>>;
            causalParents: readonly string[];
            priorHeads: Readonly<Record<string, string>>;
            nextHeads: Readonly<Record<string, string>>;
            priorWorldHead: string;
            worldHead: string;
            mandateDigest?: string;
            kai: string;
            registryDigest: string;
            reducerDigest: string;
        }>, void, unknown>;
    }>;
}>>;
export type ReceizV127SubjectRuntimeAdapter = Awaited<ReturnType<typeof createReceizV127SubjectRuntimeAdapter>>;
export {};
//# sourceMappingURL=v127SubjectRuntimeAdapter.d.ts.map