import { type ReceizKksV1ProofCoordinate, type ReceizKksV1AdmissionContext } from "./v125KaiAuthority.js";
import { type ReceizBearerCapabilityV1, type ReceizBearerInstrumentV1, type ReceizBearerTransferPlanV1, type ReceizBearerTransferPolicyV1, type ReceizBearerTransferReceiptV1, type ReceizLivingSubjectModel, type ReceizSubjectAdmissionInputV1, type ReceizSubjectArtifactV1, type ReceizSubjectCapabilityV1, type ReceizSubjectInventoryItemV1, type ReceizSubjectInventoryV1, type ReceizSubjectMandatePolicyV1, type ReceizSubjectMandateV1, type ReceizSubjectMemoryEventV1, type ReceizSubjectMindArtifactV1, type ReceizSubjectNamespaceBytesV1, type ReceizSubjectPrimaryProofObjectV1, type ReceizSubjectProofBrain, type ReceizSubjectProofBrainSnapshotV1, type ReceizSubjectProofBrainSearchInput, type ReceizSubjectRelationshipV1, type ReceizSubjectRuntimeJobV1, type ReceizSubjectRuntimeTickInput, type ReceizSubjectTwinMessageInput, type ReceizSubjectTwinResultV1, type ReceizSubjectTwinStreamEvent, type ReceizSubjectV1, type ReceizWorldAuthorityV1, type ReceizWorldTransactionAuthorityV1, type ReceizWorldCommandInputV1, type ReceizWorldCommandPlanV1, type ReceizWorldCommandV1, type ReceizWorldEventV1, type ReceizWorldExecutionResultV1, type ReceizWorldReceiptV1, type ReceizWorldTransactionV1 } from "./livingSubjects.js";
type StoredTransfer = {
    instrument: ReceizBearerInstrumentV1;
    status: ReceizBearerInstrumentV1["status"];
    receipt: ReceizBearerTransferReceiptV1 | null;
    claimCapabilityDigest: string | null;
};
export type ReceizLivingSubjectRuntimeSnapshotV1 = Readonly<{
    schema: "receiz.subject.runtime_snapshot.v1";
    version: "120.0.0";
    registryDigest: string;
    reducerDigest: string;
    kai: string;
    subjects: readonly Readonly<{
        artifact: ReceizSubjectArtifactV1;
        events: readonly ReceizWorldEventV1[];
        memories: readonly ReceizSubjectMemoryEventV1[];
        relationships: readonly (readonly [string, ReceizSubjectRelationshipV1])[];
        inventory: readonly (readonly [string, ReceizSubjectInventoryItemV1])[];
        mandates: readonly (readonly [string, ReceizSubjectMandateV1])[];
        jobs: readonly (readonly [string, ReceizSubjectRuntimeJobV1])[];
        brain: ReceizSubjectProofBrainSnapshotV1;
        pendingTransferId: string | null;
        priorMindHead: string | null;
        privateMemoryOwnerReceizId: string;
        privateConversationPolicy: ReceizBearerTransferPolicyV1["priorOwnerConversationPolicy"];
        runtimeExecutions: readonly Readonly<{
            mandateDigest: string;
            kai: string;
            valueMinor: string;
        }>[];
    }>[];
    worldEvents: readonly (readonly [string, readonly ReceizWorldEventV1[]])[];
    worldHeads: readonly (readonly [string, string])[];
    receipts: readonly (readonly [string, ReceizWorldReceiptV1])[];
    idempotentReceipts: readonly (readonly [string, string])[];
    transfers: readonly (readonly [string, StoredTransfer])[];
    claimedInstrumentDigests: readonly string[];
    snapshotDigest: string;
}>;
/** Opaque execution custody beneath the existing KaiSigil proof primitive.
 * A historical V120 integer is a whole-pulse projection, never proof authority. */
export type ReceizLivingSubjectTemporalExecution = Readonly<{
    schema: "receiz.subject.temporal-execution.v127";
}>;
export declare function createReceizLivingSubjectTemporalExecution(inputs: readonly unknown[], context: ReceizKksV1AdmissionContext & Readonly<{
    minimumInclusiveLegacyKai: string;
}>): Promise<ReceizLivingSubjectTemporalExecution>;
export declare function readReceizLivingSubjectTemporalExecution(handle: ReceizLivingSubjectTemporalExecution): readonly ReceizKksV1ProofCoordinate[];
export type ReceizLivingSubjectRuntimeOptions = Readonly<{
    registryDigest: string;
    reducerDigest: string;
    initialKai?: string;
    /** Optional admitted proof execution; the default counter is the historical reference runtime only. */
    temporalExecution?: ReceizLivingSubjectTemporalExecution;
    model?: ReceizLivingSubjectModel;
    snapshot?: ReceizLivingSubjectRuntimeSnapshotV1;
}>;
export declare function verifyReceizSubjectArtifactV1(artifact: ReceizSubjectArtifactV1): boolean;
export declare function createReceizLivingSubjectRuntime(options: ReceizLivingSubjectRuntimeOptions): Readonly<{
    version: "120.0.0";
    registryDigest: string;
    reducerDigest: string;
    admitSubject: (input: ReceizSubjectAdmissionInputV1) => ReceizSubjectArtifactV1;
    subjects: Readonly<{
        resolve: (subjectId: string) => Readonly<{
            schema: "receiz.subject.v1";
            subject: ReceizSubjectV1;
            exactBytesB64u: string;
            artifactDigest: string;
            registryDigest: string;
            reducerDigest: string;
            authority: Readonly<{
                artifactIsProofAuthority: true;
                modelOutputIsAuthority: false;
                indexIsAuthority: false;
            }>;
        }>;
        verify: (artifact: ReceizSubjectArtifactV1) => boolean;
        state: (subjectId: string) => Readonly<{
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
            namespaces: ReceizSubjectNamespaceBytesV1;
        }>;
        history: (subjectId: string, input?: Readonly<{
            afterHead?: string;
            limit?: number;
        }>) => Readonly<{
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
        additions: (subjectId: string, input?: Readonly<{
            afterHead?: string;
        }>) => Readonly<{
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
        subscribe: (subjectId: string, input?: Readonly<{
            afterHead?: string;
        }>) => AsyncGenerator<Readonly<{
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
            head: (subjectId: string) => Readonly<{
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
            search: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) => Readonly<{
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
            }>[];
            resolve: (subjectId: string, references: Parameters<ReceizSubjectProofBrain["resolve"]>[0]) => Readonly<{
                schema: "receiz.subject.primary-proof-object.v1";
                subjectId: string;
                proofObjectId: string;
                eventIds: readonly string[];
                kai: string;
                objectDigest: string;
                exactBytesB64u: string;
                visibility: "public" | "private";
                text: readonly import("./livingSubjects.js").ReceizSubjectProofTextV1[];
                namespaceDigests: Readonly<Record<string, string>>;
            }>[];
            stream: (subjectId: string, input: ReceizSubjectProofBrainSearchInput) => AsyncGenerator<import("./livingSubjects.js").ReceizSubjectProofBrainStreamEvent, any, any>;
            append: (subjectId: string, primaryObject: ReceizSubjectPrimaryProofObjectV1) => Readonly<{
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
        }>;
        twin: Readonly<{
            profile: (subjectId: string) => Readonly<{
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
            }>;
            message: (subjectId: string, input: ReceizSubjectTwinMessageInput) => Promise<ReceizSubjectTwinResultV1>;
            stream: (subjectId: string, input: ReceizSubjectTwinMessageInput) => AsyncGenerator<ReceizSubjectTwinStreamEvent>;
            exportMind: (subjectId: string) => ReceizSubjectMindArtifactV1;
            importMind: (subjectId: string, artifact: ReceizSubjectMindArtifactV1) => Readonly<{
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
            }>;
            memorySummary: (subjectId: string) => Readonly<{
                subjectId: string;
                head: string;
                counts: Readonly<{
                    [k: string]: number;
                }>;
                projectionDigest: string;
            }>;
            streamPerformance: (subjectId: string, input: ReceizSubjectTwinMessageInput) => AsyncGenerator<ReceizSubjectTwinStreamEvent>;
        }>;
        mandates: Readonly<{
            get: (subjectId: string) => Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[];
            plan: (subjectId: string, policy: ReceizSubjectMandatePolicyV1) => ReceizSubjectMandateV1;
            activate: (mandate: ReceizSubjectMandateV1, capability: ReceizSubjectCapabilityV1) => Readonly<{
                status: "active";
                activatedCapabilityDigest: string;
                activatedAtKai: string;
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                revokedAtKai: string | null;
            }>;
            pause: (subjectId: string) => Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[];
            revoke: (subjectId: string) => Readonly<{
                schema: "receiz.subject.mandate.v1";
                mandateId: string;
                subjectId: string;
                ownerReceizId: string;
                policy: ReceizSubjectMandatePolicyV1;
                mandateDigest: string;
                status: "planned" | "active" | "paused" | "revoked" | "expired";
                activatedCapabilityDigest: string | null;
                activatedAtKai: string | null;
                revokedAtKai: string | null;
            }>[];
            explain: (subjectId: string) => Readonly<{
                subjectId: string;
                currentKai: string;
                mandates: readonly {
                    executable: boolean;
                    schema: "receiz.subject.mandate.v1";
                    mandateId: string;
                    subjectId: string;
                    ownerReceizId: string;
                    policy: ReceizSubjectMandatePolicyV1;
                    mandateDigest: string;
                    status: "planned" | "active" | "paused" | "revoked" | "expired";
                    activatedCapabilityDigest: string | null;
                    activatedAtKai: string | null;
                    revokedAtKai: string | null;
                }[];
            }>;
        }>;
        runtime: Readonly<{
            enqueueTick: (input: ReceizSubjectRuntimeTickInput) => ReceizSubjectRuntimeJobV1;
            status: (jobId: string) => Readonly<{
                jobId: string;
                input: ReceizSubjectRuntimeTickInput;
                status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
                leaseUntilKai: string | null;
                attemptCount: number;
                eventIds: readonly string[];
                failureCode: string | null;
            }>;
            pause: (subjectId: string) => Readonly<{
                subjectId: string;
                cancelledJobIds: readonly string[];
                writes: number;
            }>;
            catchUp: (subjectId: string, input?: Readonly<{
                maximumTicks?: number;
                throughKai?: string;
                worldId?: string;
            }>) => Promise<Readonly<{
                subjectId: string;
                processed: number;
                jobs: readonly Readonly<{
                    jobId: string;
                    input: ReceizSubjectRuntimeTickInput;
                    status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
                    leaseUntilKai: string | null;
                    attemptCount: number;
                    eventIds: readonly string[];
                    failureCode: string | null;
                }>[];
            }>>;
        }>;
        memory: Readonly<{
            query: (subjectId: string, input?: Readonly<{
                types?: readonly ReceizSubjectMemoryEventV1["type"][];
                visibility?: "public" | "private" | "all";
                afterKai?: string;
                limit?: number;
            }>) => Readonly<{
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
            }>[];
            project: (subjectId: string, input: Readonly<{
                throughHead: string;
            }>) => Readonly<{
                schema: "receiz.subject.memory_projection.v1";
                subjectId: string;
                throughHead: string;
                memories: readonly ReceizSubjectMemoryEventV1[];
                projectionDigest: string;
                rebuildable: true;
            }>;
            citations: (subjectId: string, memoryId: string) => Readonly<{
                memoryId: string;
                eventIds: readonly string[];
                proofObjectIds: readonly string[];
            }>;
            compact: (subjectId: string, input?: Readonly<{
                throughHead?: string;
            }>) => Readonly<{
                schema: "receiz.subject.memory_projection.v1";
                subjectId: string;
                throughHead: string;
                memories: readonly ReceizSubjectMemoryEventV1[];
                projectionDigest: string;
                rebuildable: true;
            }>;
        }>;
        relationships: Readonly<{
            list: (subjectId: string) => Readonly<{
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
            }>[];
            propose: (input: Parameters<(input: Readonly<{
                subjectId: string;
                targetSubjectId: string;
                response?: "accept" | "decline";
                visibility?: "public" | "private";
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
            }>) => Readonly<{
                schema: "receiz.world.transaction.v1";
                transactionId: string;
                transactionDigest: string;
                worldId: string;
                participants: readonly string[];
                expectedHeads: Readonly<Record<string, string>>;
                commands: readonly ReceizWorldCommandV1[];
                registryDigest: string;
                reducerDigest: string;
            }>>[0]) => Readonly<{
                schema: "receiz.world.transaction.v1";
                transactionId: string;
                transactionDigest: string;
                worldId: string;
                participants: readonly string[];
                expectedHeads: Readonly<Record<string, string>>;
                commands: readonly ReceizWorldCommandV1[];
                registryDigest: string;
                reducerDigest: string;
            }>;
            respond: (input: Parameters<(input: Readonly<{
                subjectId: string;
                targetSubjectId: string;
                response?: "accept" | "decline";
                visibility?: "public" | "private";
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
            }>) => Readonly<{
                schema: "receiz.world.transaction.v1";
                transactionId: string;
                transactionDigest: string;
                worldId: string;
                participants: readonly string[];
                expectedHeads: Readonly<Record<string, string>>;
                commands: readonly ReceizWorldCommandV1[];
                registryDigest: string;
                reducerDigest: string;
            }>>[0] & Readonly<{
                response: "accept" | "decline";
                authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1;
            }>) => ReceizWorldExecutionResultV1;
            history: (subjectId: string) => Readonly<{
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
        }>;
        inventory: Readonly<{
            list: (subjectId: string) => ReceizSubjectInventoryV1;
            use: (input: Readonly<{
                subjectId: string;
                itemId: string;
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
                authority: ReceizWorldAuthorityV1;
            }>) => ReceizWorldExecutionResultV1;
        }>;
        trades: Readonly<{
            preview: (input: Readonly<{
                fromSubjectId: string;
                toSubjectId: string;
                itemId: string;
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
                mandateDigest?: string;
            }>) => Readonly<{
                transaction: Readonly<{
                    schema: "receiz.world.transaction.v1";
                    transactionId: string;
                    transactionDigest: string;
                    worldId: string;
                    participants: readonly string[];
                    expectedHeads: Readonly<Record<string, string>>;
                    commands: readonly ReceizWorldCommandV1[];
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
            }>;
            execute: (preview: ReturnType<(input: Readonly<{
                fromSubjectId: string;
                toSubjectId: string;
                itemId: string;
                worldId?: string;
                attemptId: string;
                idempotencyKey: string;
                mandateDigest?: string;
            }>) => Readonly<{
                transaction: Readonly<{
                    schema: "receiz.world.transaction.v1";
                    transactionId: string;
                    transactionDigest: string;
                    worldId: string;
                    participants: readonly string[];
                    expectedHeads: Readonly<Record<string, string>>;
                    commands: readonly ReceizWorldCommandV1[];
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
            }>>, authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1) => ReceizWorldExecutionResultV1;
        }>;
    }>;
    world: Readonly<{
        planCommand: (input: ReceizWorldCommandInputV1) => ReceizWorldCommandPlanV1;
        validateCommand: (plan: ReceizWorldCommandPlanV1) => Readonly<{
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
            planId: string;
            planDigest: string;
            currentHeads: Readonly<Record<string, string>>;
            worldHead: string;
            writes: 0;
            registryDigest: string;
            reducerDigest: string;
        }>;
        executeCommand: (plan: ReceizWorldCommandPlanV1, authority: ReceizWorldAuthorityV1) => ReceizWorldExecutionResultV1;
        planTransaction: (input: Readonly<{
            participants: readonly string[];
            expectedHeads: Readonly<Record<string, string>>;
            commands: readonly ReceizWorldCommandV1[];
        }>) => ReceizWorldTransactionV1;
        executeTransaction: (transaction: ReceizWorldTransactionV1, authority: ReceizWorldAuthorityV1 | ReceizWorldTransactionAuthorityV1) => ReceizWorldExecutionResultV1;
        receipt: (receiptId: string) => Readonly<{
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
        }>;
        replay: (input: Readonly<{
            worldId: string;
            throughHead?: string;
        }>) => Readonly<{
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
        }>;
        additions: (input: Readonly<{
            worldId: string;
            afterHead?: string;
            types?: readonly string[];
        }>) => Readonly<{
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
        subscribe: (input: Readonly<{
            worldId: string;
            afterHead?: string;
            types?: readonly string[];
        }>) => AsyncGenerator<Readonly<{
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
        head: (worldId: string) => string;
    }>;
    bearer: Readonly<{
        previewTransfer: (input: Readonly<{
            subjectId: string;
            policy: ReceizBearerTransferPolicyV1;
        }>) => ReceizBearerTransferPlanV1;
        issueTransferInstrument: (input: Readonly<{
            plan: ReceizBearerTransferPlanV1;
            ownerCapability: ReceizBearerCapabilityV1;
        }>) => ReceizBearerInstrumentV1;
        inspectInstrument: (instrument: ReceizBearerInstrumentV1) => Readonly<{
            valid: boolean;
            offlineVerified: boolean;
            instrument: Readonly<{
                schema: "receiz.bearer.instrument.v1";
                plan: ReceizBearerTransferPlanV1;
                oneTimeClaimDigest: string;
                issuedAtKai: string;
                exactBytesB64u: string;
                artifactDigest: string;
                status: "issued" | "pending-acceptance" | "claimed" | "cancelled" | "expired";
            }>;
            sourcePrimitive: "receiz.bearer.instrument.v1";
            registryDigest: string;
            reducerDigest: string;
        }>;
        claimInstrument: (instrument: ReceizBearerInstrumentV1, recipientCapability: ReceizBearerCapabilityV1) => Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_INSTRUMENT_INVALID";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_INSTRUMENT_REPLAYED";
            writes: 0;
        }> | Readonly<{
            ok: true;
            receipt: Readonly<{
                schema: "receiz.bearer.transfer_receipt.v1";
                receiptId: string;
                transferId: string;
                instrumentDigest: string;
                subjectId: string;
                identityDigest: string;
                priorOwnerReceizId: string;
                nextOwnerReceizId: string;
                priorSubjectHead: string;
                nextSubjectHead: string;
                priorOwnershipHead: string;
                nextOwnershipHead: string;
                eventIds: readonly string[];
                revokedMandateDigests: readonly string[];
                revokedCapabilityDigests: readonly string[];
                cancelledRuntimeJobIds: readonly string[];
                inventoryDispositionDigest: string;
                memoryPolicyDigest: string;
                sealedArtifact: ReceizSubjectArtifactV1;
                kai: string;
                registryDigest: string;
                reducerDigest: string;
            }>;
            idempotent: true;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_INSTRUMENT_CANCELLED";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_INSTRUMENT_EXPIRED";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_PENDING_CUSTODY_MISMATCH";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_STALE_OWNERSHIP_HEAD";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_STALE_SUBJECT_HEAD";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_RECIPIENT_MISMATCH";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_RECIPIENT_CAPABILITY_INVALID";
            writes: 0;
        }> | Readonly<{
            ok: true;
            receipt: Readonly<{
                schema: "receiz.bearer.transfer_receipt.v1";
                receiptId: string;
                transferId: string;
                instrumentDigest: string;
                subjectId: string;
                identityDigest: string;
                priorOwnerReceizId: string;
                nextOwnerReceizId: string;
                priorSubjectHead: string;
                nextSubjectHead: string;
                priorOwnershipHead: string;
                nextOwnershipHead: string;
                eventIds: readonly string[];
                revokedMandateDigests: readonly string[];
                revokedCapabilityDigests: readonly string[];
                cancelledRuntimeJobIds: readonly string[];
                inventoryDispositionDigest: string;
                memoryPolicyDigest: string;
                sealedArtifact: ReceizSubjectArtifactV1;
                kai: string;
                registryDigest: string;
                reducerDigest: string;
            }>;
            idempotent: false;
        }>;
        cancelTransfer: (transferId: string, ownerCapability: ReceizBearerCapabilityV1) => Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_TRANSFER_NOT_FOUND";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_TRANSFER_ALREADY_CLAIMED";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_OWNER_CAPABILITY_INVALID";
            writes: 0;
        }> | Readonly<{
            ok: false;
            code: "RECEIZ_BEARER_PENDING_CUSTODY_MISMATCH";
            writes: 0;
        }> | Readonly<{
            ok: true;
            transferId: string;
            status: "cancelled";
            head: string;
        }>;
        transferStatus: (transferId: string) => Readonly<{
            transferId: string;
            status: "expired" | "cancelled" | "issued" | "pending-acceptance" | "claimed";
            subjectId: string;
            instrumentDigest: string;
            receiptId: string | null;
        }>;
    }>;
    testing: Readonly<{
        currentKai: () => string;
        advanceKai: (next: string) => string;
        admitInventoryItem: (subjectId: string, item: ReceizSubjectInventoryItemV1) => Readonly<{
            schema: "receiz.subject.inventory.v1";
            subjectId: string;
            head: string;
            items: readonly ReceizSubjectInventoryItemV1[];
        }>;
        event: (eventId: string) => Readonly<{
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
        }> | null;
        subjectCount: () => number;
        appendCompetingOwnershipForConformance: (subjectId: string) => Readonly<{
            schema: "receiz.subject.v1";
            subject: ReceizSubjectV1;
            exactBytesB64u: string;
            artifactDigest: string;
            registryDigest: string;
            reducerDigest: string;
            authority: Readonly<{
                artifactIsProofAuthority: true;
                modelOutputIsAuthority: false;
                indexIsAuthority: false;
            }>;
        }>;
        snapshot: () => ReceizLivingSubjectRuntimeSnapshotV1;
    }>;
}>;
export {};
//# sourceMappingURL=livingSubjectRuntime.d.ts.map