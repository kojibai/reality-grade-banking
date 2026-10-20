"use client";

import {
  createVerifiedProfileShowcaseChildDescriptor,
  createProfileShowcaseHandoff,
  openVerifiedProfileShowcaseAdmissionBytes,
  openVerifiedProfileShowcaseChildDescriptor,
  verifyProfileShowcaseFirstPaintHandoff,
  type ProfileShowcaseArtifactOpeners,
  type ProfileShowcaseHandoffV1,
  type VerifiedProfileShowcaseChild,
} from "./handoff";
import {
  restoreVerifiedProfileShowcaseFromAdmission,
  type VerifiedProfileShowcase,
} from "./artifact";
import {
  recoverProfileShowcaseSegmentOperations,
  sealProfileShowcaseSegment,
  verifyProfileShowcaseSegment,
} from "./segments";
import type {
  ProfileShowcaseArtifactId,
  ProfileShowcaseCommittedSegment,
  ProfileShowcaseOperationV1,
  ProfileShowcaseSegmentCommitment,
} from "./types";

export const PROFILE_SHOWCASE_EDGE_VAULT_DB = "receiz-profile-showcase-edge-vault-v1";
export const PROFILE_SHOWCASE_EDGE_VAULT_VERSION = 2;
export const PROFILE_SHOWCASE_EDGE_ACTIVE_STORE = "active-heads";
export const PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE = "immutable-artifacts";
export const PROFILE_SHOWCASE_EDGE_CHILD_STORE = "verified-children";
export const PROFILE_SHOWCASE_EDGE_SEGMENT_STORE = "immutable-segments";
export const PROFILE_SHOWCASE_EDGE_OUTBOX_STORE = "reconciliation-outbox";

export type ProfileShowcaseReconciliationAttempt = Readonly<{
  attemptId: string;
  artifactId: ProfileShowcaseArtifactId;
  artifactDigest: string;
  headKaiUpulse: string;
  status: "network-pending" | "accepted" | "diverged" | "rejected";
  attempts: number;
  lastError: string | null;
  acceptedArtifactDigest: string | null;
}>;

type ActiveHeadRecord = Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  artifactDigest: string;
}>;

type ArtifactRecord = Readonly<{
  artifactDigest: string;
  artifactId: ProfileShowcaseArtifactId;
  handoff: Omit<ProfileShowcaseHandoffV1, "visibleWindow"> & Readonly<{
    visibleWindow: Omit<ProfileShowcaseHandoffV1["visibleWindow"], "children">;
  }>;
  visibleWindowChildKeys: readonly string[];
  directChildKeys: readonly string[];
}>;

type ChildRecord = Readonly<{
  key: string;
  child: VerifiedProfileShowcaseChild;
}>;

type SegmentRecord = Readonly<{
  key: string;
  segment: ProfileShowcaseCommittedSegment;
}>;

function omitVisibleWindowChildren(
  handoff: ProfileShowcaseHandoffV1,
): ArtifactRecord["handoff"] {
  return {
    schema: handoff.schema,
    artifactId: handoff.artifactId,
    artifactDigest: handoff.artifactDigest,
    immutableObjectVersion: handoff.immutableObjectVersion,
    verificationScope: handoff.verificationScope,
    transportMetadata: handoff.transportMetadata,
    verifierVersion: handoff.verifierVersion,
    kernelVersion: handoff.kernelVersion,
    registryDigest: handoff.registryDigest,
    operationMatrixDigest: handoff.operationMatrixDigest,
    proofHistoryEvidenceRoot: handoff.proofHistoryEvidenceRoot,
    head: handoff.head,
    settledCounts: handoff.settledCounts,
    visibleWindow: {
      startVisibleIndex: handoff.visibleWindow.startVisibleIndex,
      endVisibleIndex: handoff.visibleWindow.endVisibleIndex,
      totalVisibleCount: handoff.visibleWindow.totalVisibleCount,
      continuation: handoff.visibleWindow.continuation,
      commitmentDigest: handoff.visibleWindow.commitmentDigest,
    },
    segmentWindow: handoff.segmentWindow,
  };
}

export type ProfileShowcaseEdgeVaultOptions = ProfileShowcaseArtifactOpeners & Readonly<{
  indexedDB?: IDBFactory;
  databaseName?: string;
}>;

export type ProfileShowcaseEdgeVault = Readonly<{
  admit(showcase: VerifiedProfileShowcase): Promise<ProfileShowcaseHandoffV1>;
  readHead(artifactId: ProfileShowcaseArtifactId): Promise<VerifiedProfileShowcase | null>;
  readFirstPaint(artifactId: ProfileShowcaseArtifactId): Promise<ProfileShowcaseHandoffV1 | null>;
  appendVerifiedAdditions(showcase: VerifiedProfileShowcase): Promise<ProfileShowcaseHandoffV1>;
  recoverSegment(
    artifactDigest: string,
    segmentId: string,
  ): Promise<readonly ProfileShowcaseOperationV1[]>;
  hasImmutableArtifact(artifactDigest: string): Promise<boolean>;
  inspectPersistedHead(
    artifactDigest: string,
  ): Promise<Readonly<{
    serializedMetadataBytes: number;
    visibleWindowChildCount: number;
    persistedHistoricalSegmentCount: number;
    hasCompleteVisibleArray: boolean;
  }>>;
  residentMediaByteLength(): number;
}>;

function requestResult<T>(request: IDBRequest<T>, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(code));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("PROFILE_SHOWCASE_EDGE_TRANSACTION_ABORTED"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("PROFILE_SHOWCASE_EDGE_TRANSACTION_FAILED"));
  });
}

export function openProfileShowcaseEdgeVaultDatabase(
  options: Pick<ProfileShowcaseEdgeVaultOptions, "indexedDB" | "databaseName"> = {},
): Promise<IDBDatabase> {
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory) return Promise.reject(new Error("PROFILE_SHOWCASE_EDGE_INDEXEDDB_UNAVAILABLE"));
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(
      options.databaseName ?? PROFILE_SHOWCASE_EDGE_VAULT_DB,
      PROFILE_SHOWCASE_EDGE_VAULT_VERSION,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROFILE_SHOWCASE_EDGE_ACTIVE_STORE)) {
        database.createObjectStore(PROFILE_SHOWCASE_EDGE_ACTIVE_STORE, { keyPath: "artifactId" });
      }
      if (!database.objectStoreNames.contains(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE)) {
        database.createObjectStore(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE, { keyPath: "artifactDigest" });
      }
      if (!database.objectStoreNames.contains(PROFILE_SHOWCASE_EDGE_CHILD_STORE)) {
        database.createObjectStore(PROFILE_SHOWCASE_EDGE_CHILD_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(PROFILE_SHOWCASE_EDGE_SEGMENT_STORE)) {
        database.createObjectStore(PROFILE_SHOWCASE_EDGE_SEGMENT_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(PROFILE_SHOWCASE_EDGE_OUTBOX_STORE)) {
        database.createObjectStore(PROFILE_SHOWCASE_EDGE_OUTBOX_STORE, { keyPath: "attemptId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("PROFILE_SHOWCASE_EDGE_INDEXEDDB_OPEN_FAILED"));
  });
}

function attemptFor(handoff: ProfileShowcaseHandoffV1): ProfileShowcaseReconciliationAttempt {
  return {
    attemptId: `profile-showcase:${handoff.artifactDigest}`,
    artifactId: handoff.artifactId,
    artifactDigest: handoff.artifactDigest,
    headKaiUpulse: handoff.head.payload.headKaiUpulse,
    status: "network-pending",
    attempts: 0,
    lastError: null,
    acceptedArtifactDigest: null,
  };
}

function canActivate(
  current: ProfileShowcaseHandoffV1 | null,
  incoming: ProfileShowcaseHandoffV1,
): boolean {
  if (!current) return true;
  if (current.artifactDigest === incoming.artifactDigest) return true;
  return incoming.head.payload.artifactId === current.artifactId
    && incoming.head.payload.parentArtifactDigests.includes(current.artifactDigest)
    && BigInt(incoming.head.payload.headKaiUpulse) >= BigInt(current.head.payload.headKaiUpulse)
    && incoming.head.payload.resultingOperationCount >= current.head.payload.resultingOperationCount;
}

function childStorageKey(child: Pick<
  VerifiedProfileShowcaseChild,
  "artifactId" | "immutableObjectVersion" | "artifactDigest"
>): string {
  return `${child.artifactId}\u0000${child.immutableObjectVersion}\u0000${child.artifactDigest}`;
}

function operationPosition(operation: ProfileShowcaseOperationV1): number {
  return operation.priorCommittedCount + operation.directDeltaPosition;
}

export function selectProfileShowcaseFibonacciRecoveryCheckpoint(
  checkpoints: ProfileShowcaseHandoffV1["head"]["payload"]["fibonacci"]["checkpoints"],
  currentOperationCount: number,
  targetOperationCount: number,
) {
  if (
    !Number.isSafeInteger(currentOperationCount)
    || !Number.isSafeInteger(targetOperationCount)
    || targetOperationCount < 0
    || targetOperationCount >= currentOperationCount
  ) return null;
  const remaining = currentOperationCount - targetOperationCount;
  return [...checkpoints]
    .filter((candidate) => (
      candidate.distance <= remaining
      && candidate.operationCount >= targetOperationCount
      && candidate.operationCount === currentOperationCount - candidate.distance
    ))
    .sort((left, right) => right.distance - left.distance)[0] ?? null;
}

function directChildDigests(showcase: VerifiedProfileShowcase): readonly string[] {
  const digests = new Set<string>();
  for (const operation of showcase.payload.directOperations) {
    if (operation.kind === "showcase.merge") {
      for (const child of operation.mergedChildren) digests.add(child.childArtifactDigest);
    } else {
      digests.add(operation.child.childArtifactDigest);
      if (operation.kind === "showcase.order.supersede" && operation.afterChild) {
        digests.add(operation.afterChild.childArtifactDigest);
      }
    }
  }
  return [...digests];
}

export function createProfileShowcaseEdgeVault(
  options: ProfileShowcaseEdgeVaultOptions = {},
): ProfileShowcaseEdgeVault {
  let databasePromise: Promise<IDBDatabase> | null = null;
  const artifactAdmissions = new Map<ProfileShowcaseArtifactId, Promise<void>>();
  const database = () => {
    databasePromise ??= openProfileShowcaseEdgeVaultDatabase(options);
    return databasePromise;
  };
  const readRawRecord = async (artifactDigest: string): Promise<ArtifactRecord | null> => {
    const db = await database();
    const transaction = db.transaction(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE, "readonly");
    return await requestResult(
      transaction.objectStore(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE).get(artifactDigest),
      "PROFILE_SHOWCASE_EDGE_ARTIFACT_READ_FAILED",
    ) as ArtifactRecord | undefined ?? null;
  };

  const readStoredHandoffByDigest = async (
    artifactDigest: string,
  ): Promise<ProfileShowcaseHandoffV1 | null> => {
    const db = await database();
    const artifactTransaction = db.transaction(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE, "readonly");
    const record = await requestResult(
      artifactTransaction.objectStore(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE).get(artifactDigest),
      "PROFILE_SHOWCASE_EDGE_ARTIFACT_READ_FAILED",
    ) as ArtifactRecord | undefined;
    if (!record) return null;
    const childTransaction = db.transaction(PROFILE_SHOWCASE_EDGE_CHILD_STORE, "readonly");
    const childStore = childTransaction.objectStore(PROFILE_SHOWCASE_EDGE_CHILD_STORE);
    const storedChildren = await Promise.all(
      record.visibleWindowChildKeys.map((childKey) =>
        requestResult(
          childStore.get(childKey),
          "PROFILE_SHOWCASE_EDGE_CHILD_READ_FAILED",
        ) as Promise<ChildRecord | undefined>),
    );
    const children: VerifiedProfileShowcaseChild[] = [];
    for (const childRecord of storedChildren) {
      if (!childRecord) return null;
      children.push(childRecord.child);
    }
    const candidate: ProfileShowcaseHandoffV1 = {
      ...record.handoff,
      visibleWindow: {
        ...record.handoff.visibleWindow,
        children,
      },
    };
    return candidate;
  };

  const readHandoffByDigest = async (
    artifactDigest: string,
  ): Promise<ProfileShowcaseHandoffV1 | null> => {
    const candidate = await readStoredHandoffByDigest(artifactDigest);
    if (!candidate) return null;
    return await verifyProfileShowcaseFirstPaintHandoff(candidate, options);
  };

  const readFirstPaint = async (
    artifactId: ProfileShowcaseArtifactId,
  ): Promise<ProfileShowcaseHandoffV1 | null> => {
    const db = await database();
    const transaction = db.transaction(PROFILE_SHOWCASE_EDGE_ACTIVE_STORE, "readonly");
    const active = await requestResult(
      transaction.objectStore(PROFILE_SHOWCASE_EDGE_ACTIVE_STORE).get(artifactId),
      "PROFILE_SHOWCASE_EDGE_ACTIVE_READ_FAILED",
    ) as ActiveHeadRecord | undefined;
    return active ? readHandoffByDigest(active.artifactDigest) : null;
  };

  const readSegment = async (segmentId: string): Promise<ProfileShowcaseCommittedSegment | null> => {
    const db = await database();
    const transaction = db.transaction(PROFILE_SHOWCASE_EDGE_SEGMENT_STORE, "readonly");
    const record = await requestResult(
      transaction.objectStore(PROFILE_SHOWCASE_EDGE_SEGMENT_STORE).get(segmentId),
      "PROFILE_SHOWCASE_EDGE_SEGMENT_READ_FAILED",
    ) as SegmentRecord | undefined;
    if (!record) return null;
    if (!await verifyProfileShowcaseSegment(record.segment)) {
      throw new TypeError("PROFILE_SHOWCASE_SEGMENT_CORRUPT");
    }
    return record.segment;
  };

  const exactCommitment = (
    segment: ProfileShowcaseCommittedSegment,
    commitment: ProfileShowcaseSegmentCommitment,
  ): boolean => segment.commitment.segmentId === commitment.segmentId
    && segment.commitment.startOperationCount === commitment.startOperationCount
    && segment.commitment.endOperationCount === commitment.endOperationCount
    && segment.commitment.operationCount === commitment.operationCount
    && segment.commitment.root === commitment.root;

  const recoverSegment = async (
    artifactDigest: string,
    segmentId: string,
  ): Promise<readonly ProfileShowcaseOperationV1[]> => {
    const held = await readSegment(segmentId);
    if (held) return recoverProfileShowcaseSegmentOperations(held);
    const target = await readHandoffByDigest(artifactDigest);
    const commitment = target?.head.payload.segments.find(
      (candidate) => candidate.segmentId === segmentId,
    );
    if (!target || !commitment) {
      throw new TypeError("PROFILE_SHOWCASE_SEGMENT_RECOVERY_MISSING");
    }
    let carrier = target;
    while (carrier.head.payload.resultingOperationCount > commitment.endOperationCount) {
      const checkpoint = selectProfileShowcaseFibonacciRecoveryCheckpoint(
        carrier.head.payload.fibonacci.checkpoints,
        carrier.head.payload.resultingOperationCount,
        commitment.endOperationCount,
      );
      if (!checkpoint) {
        throw new TypeError("PROFILE_SHOWCASE_SEGMENT_RECOVERY_CHECKPOINT_MISSING");
      }
      const next = await readHandoffByDigest(checkpoint.artifactDigest);
      if (
        !next
        || next.head.payload.resultingOperationCount !== checkpoint.operationCount
        || next.artifactDigest !== checkpoint.artifactDigest
      ) {
        throw new TypeError("PROFILE_SHOWCASE_SEGMENT_RECOVERY_CHECKPOINT_MISSING");
      }
      carrier = next;
    }
    if (carrier.head.payload.resultingOperationCount !== commitment.endOperationCount) {
      throw new TypeError("PROFILE_SHOWCASE_SEGMENT_RECOVERY_CHECKPOINT_MISSING");
    }
    const carrierAdmission = await openVerifiedProfileShowcaseAdmissionBytes(
      carrier.head.sealedArtifactBytes,
      options,
    );
    const operations = new Map<number, ProfileShowcaseOperationV1>();
    for (const node of carrierAdmission.proofHistory?.nodes ?? []) {
      if (
        node.event.type !== "profile-showcase.transition"
        || !Array.isArray(node.event.directOperations)
      ) continue;
      for (const candidate of node.event.directOperations) {
        const operation = candidate as ProfileShowcaseOperationV1;
        const position = operationPosition(operation);
        if (
          position >= commitment.startOperationCount
          && position < commitment.endOperationCount
        ) operations.set(position, operation);
      }
    }
    const ordered = [...operations.entries()]
      .sort(([left], [right]) => left - right)
      .map(([, operation]) => operation);
    if (ordered.length !== commitment.operationCount) {
      throw new TypeError("PROFILE_SHOWCASE_SEGMENT_RECOVERY_MISSING");
    }
    const recovered = await sealProfileShowcaseSegment(ordered);
    if (!exactCommitment(recovered, commitment)) {
      throw new TypeError("PROFILE_SHOWCASE_SEGMENT_CORRUPT");
    }
    const db = await database();
    const transaction = db.transaction(PROFILE_SHOWCASE_EDGE_SEGMENT_STORE, "readwrite");
    transaction.objectStore(PROFILE_SHOWCASE_EDGE_SEGMENT_STORE).put({
      key: recovered.commitment.segmentId,
      segment: recovered,
    } satisfies SegmentRecord);
    await transactionComplete(transaction);
    return recoverProfileShowcaseSegmentOperations(recovered);
  };

  const prepareSegments = async (
    showcase: VerifiedProfileShowcase,
  ): Promise<readonly ProfileShowcaseCommittedSegment[]> => {
    const prepared: ProfileShowcaseCommittedSegment[] = [];
    const directStart = showcase.payload.priorOperationCount;
    const directEnd = showcase.payload.resultingOperationCount;
    const continuationSegmentId =
      showcase.payload.firstPaintWindow.continuation?.segmentId ?? null;
    const affectedCommitments = showcase.payload.segments.filter((commitment) => (
      (
        commitment.endOperationCount > directStart
        && commitment.startOperationCount < directEnd
      )
      || commitment.segmentId === continuationSegmentId
    ));
    for (const commitment of affectedCommitments) {
      const existing = await readSegment(commitment.segmentId);
      if (existing) {
        if (!exactCommitment(existing, commitment)) {
          throw new TypeError("PROFILE_SHOWCASE_SEGMENT_CORRUPT");
        }
        continue;
      }
      const direct = showcase.payload.directOperations.filter((operation) => {
        const position = operationPosition(operation);
        return position >= commitment.startOperationCount
          && position < commitment.endOperationCount;
      });
      let operations = [...direct];
      if (operations.length < commitment.operationCount) {
        const parentDigest = showcase.payload.parentArtifactDigests[0] ?? null;
        const parent = parentDigest ? await readHandoffByDigest(parentDigest) : null;
        const parentCommitment = parent?.head.payload.segments.find(
          (candidate) => candidate.startOperationCount === commitment.startOperationCount
            && candidate.endOperationCount <= commitment.endOperationCount,
        );
        if (parent && parentCommitment) {
          operations = [
            ...await recoverSegment(parent.artifactDigest, parentCommitment.segmentId),
            ...direct,
          ];
        }
      }
      const segment = await sealProfileShowcaseSegment(operations);
      if (!exactCommitment(segment, commitment)) {
        throw new TypeError("PROFILE_SHOWCASE_SEGMENT_CORRUPT");
      }
      prepared.push(segment);
    }
    return prepared;
  };

  const persist = async (
    handoff: ProfileShowcaseHandoffV1,
    showcase: VerifiedProfileShowcase,
  ): Promise<ProfileShowcaseHandoffV1> => {
    const directDigests = new Set(directChildDigests(showcase));
    const directAdmissions = showcase.admittedChildren.filter(
      (child) => directDigests.has(child.artifactSha256),
    );
    const directChildren = await Promise.all(
      directAdmissions.map((child) => createVerifiedProfileShowcaseChildDescriptor(child)),
    );
    const directChildKeys = directChildren.map(childStorageKey);
    const visibleWindowChildKeys = handoff.visibleWindow.children.map(childStorageKey);
    const segments = await prepareSegments(showcase);
    const db = await database();
    const activates = await new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction([
        PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE,
        PROFILE_SHOWCASE_EDGE_CHILD_STORE,
        PROFILE_SHOWCASE_EDGE_SEGMENT_STORE,
        PROFILE_SHOWCASE_EDGE_OUTBOX_STORE,
        PROFILE_SHOWCASE_EDGE_ACTIVE_STORE,
      ], "readwrite");
      const childStore = transaction.objectStore(PROFILE_SHOWCASE_EDGE_CHILD_STORE);
      const segmentStore = transaction.objectStore(PROFILE_SHOWCASE_EDGE_SEGMENT_STORE);
      const artifactStore = transaction.objectStore(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE);
      const outboxStore = transaction.objectStore(PROFILE_SHOWCASE_EDGE_OUTBOX_STORE);
      const activeStore = transaction.objectStore(PROFILE_SHOWCASE_EDGE_ACTIVE_STORE);
      let activatesIncoming = false;
      transaction.oncomplete = () => resolve(activatesIncoming);
      transaction.onabort = () => reject(
        transaction.error ?? new Error("PROFILE_SHOWCASE_EDGE_TRANSACTION_ABORTED"),
      );
      transaction.onerror = () => reject(
        transaction.error ?? new Error("PROFILE_SHOWCASE_EDGE_TRANSACTION_FAILED"),
      );

      const queueWrites = (
        currentRecord: ArtifactRecord | undefined,
        existingAttempt: ProfileShowcaseReconciliationAttempt | undefined,
      ) => {
        const current = currentRecord
          ? ({
              ...currentRecord.handoff,
              visibleWindow: {
                ...currentRecord.handoff.visibleWindow,
                children: [],
              },
            } as ProfileShowcaseHandoffV1)
          : null;
        activatesIncoming = canActivate(current, handoff);
        directChildren.forEach((child, position) => {
          childStore.put({ key: directChildKeys[position]!, child } satisfies ChildRecord);
        });
        handoff.visibleWindow.children.forEach((child) => {
          childStore.put({ key: childStorageKey(child), child } satisfies ChildRecord);
        });
        segments.forEach((segment) => {
          segmentStore.put({
            key: segment.commitment.segmentId,
            segment,
          } satisfies SegmentRecord);
        });
        artifactStore.put({
          artifactDigest: handoff.artifactDigest,
          artifactId: handoff.artifactId,
          handoff: omitVisibleWindowChildren(handoff),
          visibleWindowChildKeys,
          directChildKeys,
        } satisfies ArtifactRecord);
        outboxStore.put(existingAttempt ?? attemptFor(handoff));
        if (activatesIncoming) {
          activeStore.put({
            artifactId: handoff.artifactId,
            artifactDigest: handoff.artifactDigest,
          } satisfies ActiveHeadRecord);
        }
      };

      const readAttemptThenWrite = (currentRecord: ArtifactRecord | undefined) => {
        const attemptRequest = outboxStore.get(`profile-showcase:${handoff.artifactDigest}`);
        attemptRequest.onsuccess = () => queueWrites(
          currentRecord,
          attemptRequest.result as ProfileShowcaseReconciliationAttempt | undefined,
        );
      };
      const activeRequest = activeStore.get(handoff.artifactId);
      activeRequest.onsuccess = () => {
        const active = activeRequest.result as ActiveHeadRecord | undefined;
        if (!active) {
          readAttemptThenWrite(undefined);
          return;
        }
        const artifactRequest = artifactStore.get(active.artifactDigest);
        artifactRequest.onsuccess = () => readAttemptThenWrite(
          artifactRequest.result as ArtifactRecord | undefined,
        );
      };
    });
    if (!activates) throw new TypeError("PROFILE_SHOWCASE_EDGE_STALE_OR_DIVERGENT");
    return handoff;
  };

  const serializeAdmission = async <T>(
    artifactId: ProfileShowcaseArtifactId,
    operation: () => Promise<T>,
  ): Promise<T> => {
    const prior = artifactAdmissions.get(artifactId) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = prior.catch(() => undefined).then(() => next);
    artifactAdmissions.set(artifactId, queued);
    await prior.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (artifactAdmissions.get(artifactId) === queued) artifactAdmissions.delete(artifactId);
    }
  };

  const admit = (showcase: VerifiedProfileShowcase) => serializeAdmission(
    showcase.artifactId,
    async () => {
      const parentDigest = showcase.payload.parentArtifactDigests[0] ?? null;
      if (parentDigest && !await readHandoffByDigest(parentDigest)) {
        throw new TypeError("PROFILE_SHOWCASE_EDGE_PREDECESSOR_CUSTODY_REQUIRED");
      }
      return persist(await createProfileShowcaseHandoff(showcase), showcase);
    },
  );

  const restoreHeadByDigest = async (
    artifactDigest: string,
    memo = new Map<string, VerifiedProfileShowcase>(),
  ): Promise<VerifiedProfileShowcase | null> => {
    const held = memo.get(artifactDigest);
    if (held) return held;
    const handoff = await readHandoffByDigest(artifactDigest);
    const record = await readRawRecord(artifactDigest);
    if (!handoff || !record) return null;
    const parentDigest = handoff.head.payload.parentArtifactDigests[0] ?? null;
    const predecessor = parentDigest
      ? await restoreHeadByDigest(parentDigest, memo)
      : null;
    if (parentDigest && !predecessor) return null;
    const db = await database();
    const transaction = db.transaction(PROFILE_SHOWCASE_EDGE_CHILD_STORE, "readonly");
    const store = transaction.objectStore(PROFILE_SHOWCASE_EDGE_CHILD_STORE);
    const storedChildren = await Promise.all(record.directChildKeys.map((key) =>
      requestResult(
        store.get(key),
        "PROFILE_SHOWCASE_EDGE_CHILD_READ_FAILED",
      ) as Promise<ChildRecord | undefined>));
    const directChildren = [];
    for (const stored of storedChildren) {
      if (!stored) return null;
      const child = await openVerifiedProfileShowcaseChildDescriptor(stored.child, options);
      if (!child) return null;
      directChildren.push(child);
    }
    const admission = await openVerifiedProfileShowcaseAdmissionBytes(
      handoff.head.sealedArtifactBytes,
      options,
    );
    const inheritedDigests = new Set(
      predecessor?.admittedChildren.map((child) => child.artifactSha256) ?? [],
    );
    const restored = await restoreVerifiedProfileShowcaseFromAdmission({
      admission,
      predecessor,
      admittedChildren: directChildren.filter(
        (child) => !inheritedDigests.has(child.artifactSha256),
      ),
    });
    memo.set(artifactDigest, restored);
    return restored;
  };

  return Object.freeze({
    admit,
    async readHead(artifactId) {
      const handoff = await readFirstPaint(artifactId);
      if (!handoff) return null;
      return restoreHeadByDigest(handoff.artifactDigest);
    },
    readFirstPaint,
    appendVerifiedAdditions: admit,
    recoverSegment,
    async hasImmutableArtifact(artifactDigest) {
      const db = await database();
      const transaction = db.transaction(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE, "readonly");
      return Boolean(await requestResult(
        transaction.objectStore(PROFILE_SHOWCASE_EDGE_ARTIFACT_STORE).getKey(artifactDigest),
        "PROFILE_SHOWCASE_EDGE_ARTIFACT_READ_FAILED",
      ));
    },
    async inspectPersistedHead(artifactDigest) {
      const record = await readRawRecord(artifactDigest);
      if (!record) throw new TypeError("PROFILE_SHOWCASE_EDGE_ARTIFACT_READ_FAILED");
      const recordShape = record as unknown as Record<string, unknown>;
      const handoffShape = record.handoff as unknown as Record<string, unknown>;
      const persistedMetadata = {
        ...record,
        handoff: {
          ...record.handoff,
          head: {
            ...record.handoff.head,
            sealedArtifactBytes: null,
          },
        },
      };
      const metadataBytes = new TextEncoder().encode(
        JSON.stringify(persistedMetadata),
      ).byteLength;
      return Object.freeze({
        serializedMetadataBytes:
          metadataBytes + record.handoff.head.sealedArtifactBytes.byteLength,
        visibleWindowChildCount: record.visibleWindowChildKeys.length,
        persistedHistoricalSegmentCount: record.handoff.segmentWindow.length,
        hasCompleteVisibleArray:
          Object.prototype.hasOwnProperty.call(recordShape, "visibleChildren")
          || Object.prototype.hasOwnProperty.call(recordShape, "visibleChildKeys")
          || Object.prototype.hasOwnProperty.call(handoffShape, "visibleChildren"),
      });
    },
    residentMediaByteLength() {
      return 0;
    },
  });
}
