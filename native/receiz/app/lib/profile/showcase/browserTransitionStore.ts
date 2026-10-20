"use client";

import {
  createReceizBrowserAdmissionStore,
  digestReceizAuthority,
  verifyReceizArtifactTransitionCommitCandidate,
  type ReceizAppendReceipt,
  type ReceizArtifactId,
  type ReceizArtifactTransitionCommitResult,
  type ReceizArtifactTransitionCommitUnit,
  type ReceizArtifactTransitionStore,
  type ReceizCommitDomainId,
  type ReceizConstitutionJson,
  type ReceizHistoryDigest,
  type ReceizStagedArtifactTransition,
  type ReceizStagedCandidateReference,
  type ReceizVerifiedArtifactTransitionCandidate,
} from "../../../../packages/receiz-sdk/src/index";
import {
  readReceizArtifactTransitionCandidateCustody,
} from "../../../../packages/receiz-sdk/src/artifactTransitionCandidateCustody";
import { sha256ReceizBytes } from "../../../../packages/receiz-sdk/src/artifacts";
import { readReceizInitialSourcePlanStorageV125, verifyReceizInitialSourceCommitV125,
  type ReceizInitialSourceStoreV125, type ReceizInitialSourcePlanV125, type ReceizInitialSourceCommitV125,
} from "../../../../packages/receiz-sdk/src/v125InitialSource";
import type { ReceizPortableSealedArtifactV124 } from "../../../../packages/receiz-sdk/src/v124PortableAuthority";

import { openReceizSubjectSourceFamilyV125, readReceizSubjectSourceFamilyMemberV125,
  type ReceizOpenedSubjectSourceFamilyV125, type ReceizSubjectSourceFamilyV125 } from "../../../../packages/receiz-sdk/src/v125SubjectSourceFamily";
import type { ReceizSubjectRelationshipSourceStoreV125 } from "../../../../packages/receiz-sdk/src/v125SubjectCoordination";
import { assertReceizArtifactAppendPlanCustody, type ReceizArtifactAppendPlan } from "../../../../packages/receiz-sdk/src/artifactTransition";
import { canonicalizeReceizV122 } from "../../../../packages/receiz-sdk/src/v122Canonical";
import { receizBase64UrlEncode } from "../../../../packages/receiz-sdk/src/identity";

import { openReceizSubjectThreadSourceFamilyV125, readReceizSubjectThreadPlanningContextV125,
  type ReceizOpenedSubjectThreadSourceFamilyV125 } from "../../../../packages/receiz-sdk/src/v125SubjectThreadSource";
import type { ReceizSubjectThreadSourceStoreV125 } from "../../../../packages/receiz-sdk/src/v125SubjectMessageSource";

const CANDIDATE_STORE = "immutable-candidates";
const DATABASE_VERSION = 1;

type CandidateRecord = Readonly<{
  artifactDigest: string;
  reference: ReceizStagedCandidateReference;
  exactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  payloadSha256: string;
  planDigest: string;
}>;
type InitialRecord = Readonly<{ kind: "initial-source"; artifactDigest: string; sourceArtifact: ReceizPortableSealedArtifactV124 }>;

type FamilySourceRecord = Readonly<{ kind: "family-source"; artifactDigest: string; sourceArtifact: ReceizPortableSealedArtifactV124 }>;
type FamilyIndex = Readonly<{ kind: "family-index"; artifactDigest: string; familySetDigest: string;
  sourceDigests: readonly string[]; bindings: ReceizSubjectSourceFamilyV125["bindings"] }>;
type FamilyPointer = Readonly<{ kind: "family-pointer"; artifactDigest: string; familySetDigest: string }>;
type ThreadFamilyRecord = Readonly<{ kind: "thread-family"; artifactDigest: string;
  material: Parameters<typeof openReceizSubjectThreadSourceFamilyV125>[0] }>;
type StoredRecord = CandidateRecord | InitialRecord | FamilySourceRecord | FamilyIndex | FamilyPointer | ThreadFamilyRecord;
const familyKey = (digest: string) => `subject-family:v125:${digest}`;
const familyPointerKey = (digest: string) => `subject-family-successor:v125:${digest}`;
function portableRecord(record: StoredRecord | undefined): ReceizPortableSealedArtifactV124 | null {
  if (!record) return null;
  if ("kind" in record) return record.kind === "initial-source" || record.kind === "family-source" ? record.sourceArtifact : null;
  return { schema: "receiz.sealed-artifact-bytes.v124", exactBytesB64u: receizBase64UrlEncode(record.exactBytes),
    filename: record.filename, mimeType: record.mimeType, artifactSha256: record.artifactDigest, payloadSha256: record.payloadSha256 };
}

export type ReceizBrowserArtifactTransitionStore =
  ReceizArtifactTransitionStore & ReceizInitialSourceStoreV125 & ReceizSubjectRelationshipSourceStoreV125 & ReceizSubjectThreadSourceStoreV125 & Readonly<{
    ensureHead(resource: ReceizArtifactId, head: ReceizHistoryDigest): Promise<void>;
  }>;

function sameDomain(left: ReceizCommitDomainId, right: ReceizCommitDomainId): boolean {
  return left.scheme === right.scheme && left.value === right.value;
}

function sameDigest(
  left: Readonly<{ algorithm: string; binds: string; value: string }>,
  right: Readonly<{ algorithm: string; binds: string; value: string }>,
): boolean {
  return left.algorithm === right.algorithm
    && left.binds === right.binds
    && left.value === right.value;
}

function sameReference(
  left: ReceizStagedCandidateReference,
  right: ReceizStagedCandidateReference,
): boolean {
  return sameDomain(left.commitDomain, right.commitDomain)
    && sameDigest(left.artifactDigest, right.artifactDigest)
    && sameDigest(left.transitionDigest, right.transitionDigest)
    && sameDigest(left.storageKeyDigest, right.storageKeyDigest);
}

function openDatabase(
  indexedDB: IDBFactory,
  databaseName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CANDIDATE_STORE)) {
        request.result.createObjectStore(CANDIDATE_STORE, {
          keyPath: "artifactDigest",
        });
      }
    };
    request.onerror = () => reject(
      request.error ?? new Error("RECEIZ_TRANSITION_CANDIDATE_STORE_OPEN_FAILED"),
    );
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function staged(record: CandidateRecord): ReceizStagedArtifactTransition {
  return Object.freeze({
    status: "staged-transition",
    reference: structuredClone(record.reference),
    exactBytes: new Uint8Array(record.exactBytes),
    filename: record.filename,
    mimeType: record.mimeType,
    payloadSha256: record.payloadSha256,
    committed: false,
  });
}

export function createReceizBrowserArtifactTransitionStore(options: Readonly<{
  indexedDB?: IDBFactory;
  databaseName: string;
  namespace: string;
  commitDomain: ReceizCommitDomainId;
}>): ReceizBrowserArtifactTransitionStore {
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  if (!indexedDB) throw new TypeError("RECEIZ_TRANSITION_INDEXEDDB_REQUIRED");
  const commitDomain = Object.freeze(structuredClone(options.commitDomain));
  const database = openDatabase(indexedDB, `${options.databaseName}-candidates`);
  const admissionStore = createReceizBrowserAdmissionStore({
    databaseName: options.databaseName,
    namespace: options.namespace,
  });
  const aggregateId = (resource: ReceizArtifactId) =>
    `${commitDomain.value}\u0000${resource}`;
  const idempotencyId = (unit: ReceizArtifactTransitionCommitUnit) => [
    commitDomain.value,
    unit.plan.actor.actorId,
    unit.plan.resource,
    unit.plan.operation,
    unit.plan.idempotencyKeyDigest.value,
  ].join("\u0000");
  const readCandidate = async (artifactDigest: string): Promise<CandidateRecord | null> => {
    const db = await database;
    const record = await requestResult(
      db.transaction(CANDIDATE_STORE, "readonly")
        .objectStore(CANDIDATE_STORE)
        .get(artifactDigest),
    ) as CandidateRecord | InitialRecord | undefined;
    return record && !("kind" in record) ? record : null;
  };
  const readInitial = async (artifactDigest: string): Promise<ReceizPortableSealedArtifactV124 | null> => {
    const db = await database;
    const record = await requestResult(db.transaction(CANDIDATE_STORE, "readonly").objectStore(CANDIDATE_STORE).get(artifactDigest)) as InitialRecord | CandidateRecord | undefined;
    return record && "kind" in record && record.kind === "initial-source" ? structuredClone(record.sourceArtifact) : null;
  };
  const findInitialSource = async (plan: ReceizInitialSourcePlanV125) => {
    if (!sameDomain(plan.commitDomain, commitDomain)) throw new TypeError("V125_INITIAL_COMMIT_DOMAIN_MISMATCH");
    const storage = readReceizInitialSourcePlanStorageV125(plan);
    const prior = await admissionStore.readIdempotency(storage.idempotencyKey);
    if (!prior) return null;
    if (prior.commandDigest !== storage.commandDigest) throw new TypeError("V125_INITIAL_IDEMPOTENCY_CONFLICT");
    const receipt = prior.receipt as { artifactSha256?: unknown };
    if (typeof receipt.artifactSha256 !== "string") throw new TypeError("V125_INITIAL_RETENTION_FAILED");
    const artifact = await readInitial(receipt.artifactSha256);
    if (!artifact) throw new TypeError("V125_INITIAL_RETENTION_FAILED");
    return artifact;
  };

  const readRecord = async (key: string): Promise<StoredRecord | undefined> => {
    const db = await database;
    return requestResult(db.transaction(CANDIDATE_STORE, "readonly").objectStore(CANDIDATE_STORE).get(key));
  };
  const readSubjectSourceFamily = async (familySetDigest: string): Promise<ReceizOpenedSubjectSourceFamilyV125 | null> => {
    const index = await readRecord(familyKey(familySetDigest));
    if (!index) return null;
    if (!("kind" in index) || index.kind !== "family-index" || index.familySetDigest !== familySetDigest) throw new TypeError("V125_SUBJECT_FAMILY_RETENTION_FAILED");
    const artifacts = [];
    for (const digest of index.sourceDigests) {
      const artifact = portableRecord(await readRecord(digest));
      if (!artifact || artifact.artifactSha256 !== digest) throw new TypeError("V125_SUBJECT_FAMILY_RETENTION_FAILED");
      artifacts.push(artifact);
    }
    return openReceizSubjectSourceFamilyV125({ family: { schema: "receiz.subject-source-family.v125", artifacts,
      bindings: index.bindings, familySetDigest } });
  };
  const planIdempotencyId = (plan: ReceizArtifactAppendPlan) => [commitDomain.value, plan.actor.actorId, plan.resource,
    plan.operation, plan.idempotencyKeyDigest.value].join("\u0000");
  const validateUnitCandidate = async (unit: ReceizArtifactTransitionCommitUnit): Promise<CandidateRecord | null> => {
    if (!sameDomain(unit.commitDomain, commitDomain)) return null;
    const record = await readCandidate(unit.command.candidateArtifactDigest.value);
    if (!record || record.planDigest !== unit.plan.planDigest.value) return null;
    const detached = staged(record);
    if (!sameReference(detached.reference, unit.command.stagedCandidateReference)
      || await sha256ReceizBytes(record.exactBytes) !== unit.command.candidateArtifactDigest.value
      || !await verifyReceizArtifactTransitionCommitCandidate(unit, { exactBytes: record.exactBytes.slice(), staged: detached,
        plan: unit.plan, capability: unit.capability, command: unit.command })) return null;
    return record;
  };

  return Object.freeze({
    commitDomain,
    atomicReadDependencies: true,
    async retainThreadSourceFamily(thread: ReceizOpenedSubjectThreadSourceFamilyV125) {
      const context = readReceizSubjectThreadPlanningContextV125(thread);
      const record: ThreadFamilyRecord = { kind: "thread-family", artifactDigest: `thread-family:v125:${thread.family.familySetDigest}`,
        material: { family: thread.family, expected: context.expected, expectedConversationId: thread.conversationId } };
      const db = await database; const transaction = db.transaction(CANDIDATE_STORE, "readwrite");
      const completion = transactionComplete(transaction); const objects = transaction.objectStore(CANDIDATE_STORE);
      const prior = await requestResult(objects.get(record.artifactDigest)) as StoredRecord | undefined;
      if (prior && canonicalizeReceizV122(prior) !== canonicalizeReceizV122(record)) {
        transaction.abort(); await completion.catch(() => undefined); throw new TypeError("V125_THREAD_SOURCE_RETENTION_FAILED");
      }
      if (!prior) objects.add(record);
      await completion;
      const retained = await readRecord(record.artifactDigest);
      if (!retained || !("kind" in retained) || retained.kind !== "thread-family"
        || canonicalizeReceizV122(retained) !== canonicalizeReceizV122(record)) throw new TypeError("V125_THREAD_SOURCE_RETENTION_FAILED");
      // This is staged source custody only. Accepted reads below use the existing
      // atomic admission receipt; retention cannot expose an accepted successor.
      return openReceizSubjectThreadSourceFamilyV125(retained.material);
    },
    async readThreadSourceFamily(familySetDigest: string) {
      const record = await readRecord(`thread-family:v125:${familySetDigest}`);
      if (!record) return null;
      if (!("kind" in record) || record.kind !== "thread-family" || record.material.family.familySetDigest !== familySetDigest) throw new TypeError("V125_THREAD_SOURCE_RETENTION_FAILED");
      const thread = await openReceizSubjectThreadSourceFamilyV125(record.material);
      // The source opener already recomputes this canonical plan, including for
      // records retained by older versions. No storage-format authority is added.
      const { transitionPlan: plan } = readReceizSubjectThreadPlanningContextV125(thread);
      if (!plan || !sameDomain(plan.commitDomain, commitDomain)) return null;
      const accepted = await admissionStore.readIdempotency(planIdempotencyId(plan));
      if (!accepted) return null;
      const receipt = accepted.receipt as unknown as ReceizAppendReceipt;
      const candidate = await readCandidate(thread.currentArtifactSha256);
      if (!candidate || candidate.planDigest !== plan.planDigest.value
        || !sameDomain(receipt.commitDomain, commitDomain)
        || receipt.actor.actorId !== plan.actor.actorId || receipt.resource !== plan.resource || receipt.operation !== plan.operation
        || !sameDigest(receipt.planDigest, plan.planDigest) || !sameDigest(receipt.transitionDigest, plan.transitionDigest)
        || !sameDigest(receipt.idempotencyIdentityDigest, plan.idempotencyKeyDigest)
        || !sameDigest(receipt.priorHead, plan.transition.expectedHead)
        || !sameDigest(receipt.acceptedHead, plan.transition.proposedHistoryHead)
        || !sameDigest(receipt.artifactDigest, candidate.reference.artifactDigest)
        || !sameDigest(candidate.reference.transitionDigest, plan.transitionDigest)
        || receipt.artifactDigest.value !== thread.currentArtifactSha256
        || receipt.commandDigest.value !== accepted.commandDigest
        || await sha256ReceizBytes(candidate.exactBytes) !== thread.currentArtifactSha256) return null;
      return thread;
    },
    findInitialSource,
    readSubjectSourceFamily,
    async retainSubjectSourceFamily(opened: ReceizOpenedSubjectSourceFamilyV125, successorArtifactDigest: string) {
      // A caller clone/index is not canonical opened custody.
      readReceizSubjectSourceFamilyMemberV125(opened, successorArtifactDigest);
      const family = opened.family;
      const records: StoredRecord[] = family.artifacts.map((member) => ({ kind: "family-source" as const,
        artifactDigest: member.artifactSha256, sourceArtifact: readReceizSubjectSourceFamilyMemberV125(opened, member.artifactSha256).artifact }));
      records.push({ kind: "family-index", artifactDigest: familyKey(family.familySetDigest), familySetDigest: family.familySetDigest,
        sourceDigests: family.artifacts.map((member) => member.artifactSha256), bindings: family.bindings },
        { kind: "family-pointer", artifactDigest: familyPointerKey(successorArtifactDigest), familySetDigest: family.familySetDigest });
      const db = await database; const transaction = db.transaction(CANDIDATE_STORE, "readwrite");
      const completion = transactionComplete(transaction); const objects = transaction.objectStore(CANDIDATE_STORE);
      try {
        for (const record of records) {
          const prior = await requestResult(objects.get(record.artifactDigest)) as StoredRecord | undefined;
          if (prior) {
            const portable = portableRecord(record);
            if (portable ? canonicalizeReceizV122(portableRecord(prior)) !== canonicalizeReceizV122(portable)
              : canonicalizeReceizV122(prior) !== canonicalizeReceizV122(record)) throw new TypeError("V125_SUBJECT_FAMILY_RETAINED_SOURCE_MISMATCH");
          } else objects.add(record);
        }
        await completion;
      } catch (error) { try { transaction.abort(); } catch { /* Already aborted by IndexedDB. */ }
        await completion.catch(() => undefined); throw error; }
    },
    async findAcceptedSubjectTransition(plan: ReceizArtifactAppendPlan) {
      assertReceizArtifactAppendPlanCustody(plan);
      if (!sameDomain(plan.commitDomain, commitDomain)) throw new TypeError("COMMIT_DOMAIN_MISMATCH");
      const prior = await admissionStore.readIdempotency(planIdempotencyId(plan));
      if (!prior) return null;
      const receipt = prior.receipt as unknown as ReceizAppendReceipt;
      if (receipt.planDigest.value !== plan.planDigest.value || receipt.transitionDigest.value !== plan.transitionDigest.value
        || receipt.commandDigest.value !== prior.commandDigest) throw new TypeError("IDEMPOTENCY_CONFLICT");
      const record = await readCandidate(receipt.artifactDigest.value);
      const pointer = await readRecord(familyPointerKey(receipt.artifactDigest.value));
      if (!record || !(pointer && "kind" in pointer && pointer.kind === "family-pointer")) throw new TypeError("V125_SUBJECT_FAMILY_RETENTION_FAILED");
      return { staged: staged(record), familySetDigest: pointer.familySetDigest };
    },
    async recoverAcceptedSubjectTransition(unit: ReceizArtifactTransitionCommitUnit): Promise<ReceizArtifactTransitionCommitResult> {
      if (!await validateUnitCandidate(unit)) return { status: "rejected", code: "CANDIDATE_VERIFICATION_FAILED" };
      const prior = await admissionStore.readIdempotency(idempotencyId(unit));
      if (!prior || prior.commandDigest !== unit.command.commandDigest.value) return { status: "conflict", code: "IDEMPOTENCY_CONFLICT" };
      // Strictly read-only. This path cannot create an accepted append when no
      // accepted command exists; canonical commit separately verifies the receipt.
      return { status: "idempotent", receipt: structuredClone(prior.receipt) as unknown as ReceizAppendReceipt };
    },
    async commitInitialSource(unit: ReceizInitialSourceCommitV125) {
      // Verify canonical source/capability custody before retaining any bytes.
      await verifyReceizInitialSourceCommitV125(unit, unit.sourceArtifact, commitDomain);
      const record: InitialRecord = { kind: "initial-source", artifactDigest: unit.sourceArtifact.artifactSha256,
        sourceArtifact: structuredClone(unit.sourceArtifact) };
      const db = await database;
      const transaction = db.transaction(CANDIDATE_STORE, "readwrite");
      const completion = transactionComplete(transaction);
      const objects = transaction.objectStore(CANDIDATE_STORE);
      const previous = await requestResult(objects.get(record.artifactDigest)) as InitialRecord | CandidateRecord | undefined;
      if (previous) {
        if (!("kind" in previous) || JSON.stringify(previous) !== JSON.stringify(record)) {
          transaction.abort(); await completion.catch(() => undefined);
          throw new TypeError("V125_INITIAL_RETAINED_SOURCE_MISMATCH");
        }
      } else objects.add(record);
      await completion;
      const retained = await readInitial(record.artifactDigest);
      if (!retained) throw new TypeError("V125_INITIAL_RETENTION_FAILED");
      // Existing null-head CAS remains the only accepted-identity storage boundary.
      const admission = await verifyReceizInitialSourceCommitV125(unit, retained, commitDomain);
      const result = await admissionStore.commit(admission);
      if (result.status !== "committed" && result.status !== "idempotent") throw new TypeError(`V125_INITIAL_${result.code}`);
      const accepted = await findInitialSource(unit.plan);
      if (!accepted) throw new TypeError("V125_INITIAL_RETENTION_FAILED");
      return { acceptance: result.status, sourceArtifact: accepted };
    },
    async ensureHead(resource: ReceizArtifactId, head: ReceizHistoryDigest) {
      const id = aggregateId(resource);
      if (await admissionStore.readAggregate(id)) return;
      try {
        await admissionStore.seedAggregate({
          aggregateId: id,
          revision: 0,
          headDigest: head.value,
          state: {},
        });
      } catch {
        if (!(await admissionStore.readAggregate(id))) throw new Error(
          "RECEIZ_TRANSITION_HEAD_SEED_FAILED",
        );
      }
    },
    async stageCandidate(candidate: ReceizVerifiedArtifactTransitionCandidate) {
      const custody = readReceizArtifactTransitionCandidateCustody(candidate);
      if (
        !custody
        || !sameDomain(custody.commitDomain, commitDomain)
        || !sameDigest(custody.plan.planDigest, candidate.planDigest)
        || !sameDigest(custody.plan.transitionDigest, candidate.transitionDigest)
        || await sha256ReceizBytes(custody.exactBytes)
          !== candidate.artifactDigest.value
      ) throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
      const existing = await readCandidate(candidate.artifactDigest.value);
      if (existing) {
        if (
          existing.planDigest !== candidate.planDigest.value
          || !sameDigest(existing.reference.transitionDigest, candidate.transitionDigest)
          || await sha256ReceizBytes(existing.exactBytes)
            !== candidate.artifactDigest.value
        ) throw new TypeError("CANDIDATE_VERIFICATION_FAILED");
        return staged(existing);
      }
      const storageKeyDigest = {
        algorithm: "sha-256" as const,
        binds: "candidate-storage-key" as const,
        value: await digestReceizAuthority(
          "command",
          "receiz.candidate-storage-key.v112",
          { commitDomain, artifactDigest: candidate.artifactDigest },
        ),
      };
      const reference: ReceizStagedCandidateReference = Object.freeze({
        commitDomain,
        artifactDigest: structuredClone(candidate.artifactDigest),
        transitionDigest: structuredClone(candidate.transitionDigest),
        storageKeyDigest,
        authority: Object.freeze({
          stagingReferenceIsProofAuthority: false,
          strongerTruth: "sealed-receiz-proof-object",
        }),
      });
      const record: CandidateRecord = {
        artifactDigest: candidate.artifactDigest.value,
        reference,
        exactBytes: custody.exactBytes.slice(),
        filename: custody.filename,
        mimeType: custody.mimeType,
        payloadSha256: custody.payloadSha256,
        planDigest: candidate.planDigest.value,
      };
      const db = await database;
      const transaction = db.transaction(CANDIDATE_STORE, "readwrite");
      transaction.objectStore(CANDIDATE_STORE).add(record);
      await transactionComplete(transaction);
      return staged(record);
    },
    async resolveCandidate(
      artifactDigest: Parameters<ReceizArtifactTransitionStore["resolveCandidate"]>[0],
    ) {
      const record = await readCandidate(artifactDigest.value);
      return record ? staged(record) : null;
    },
    async commitTransition(
      unit: ReceizArtifactTransitionCommitUnit,
    ): Promise<ReceizArtifactTransitionCommitResult> {
      if (!sameDomain(unit.commitDomain, commitDomain)) {
        return { status: "rejected", code: "COMMIT_DOMAIN_MISMATCH" };
      }
      const record = await readCandidate(unit.command.candidateArtifactDigest.value);
      if (!record) return { status: "rejected", code: "CANDIDATE_NOT_STAGED" };
      const detached = staged(record);
      if (
        !sameReference(detached.reference, unit.command.stagedCandidateReference)
        || record.planDigest !== unit.plan.planDigest.value
        || await sha256ReceizBytes(record.exactBytes)
          !== unit.command.candidateArtifactDigest.value
        || !await verifyReceizArtifactTransitionCommitCandidate(unit, {
          exactBytes: record.exactBytes.slice(),
          staged: detached,
          plan: unit.plan,
          capability: unit.capability,
          command: unit.command,
        })
      ) return { status: "rejected", code: "CANDIDATE_VERIFICATION_FAILED" };

      const existing = await admissionStore.readIdempotency(idempotencyId(unit));
      if (existing) {
        return existing.commandDigest === unit.command.commandDigest.value
          ? {
              status: "idempotent",
              receipt: structuredClone(existing.receipt) as unknown as ReceizAppendReceipt,
            }
          : { status: "conflict", code: "IDEMPOTENCY_CONFLICT" };
      }
      const aggregate = await admissionStore.readAggregate(
        aggregateId(unit.plan.resource),
      );
      if (!aggregate || aggregate.headDigest !== unit.expectedHead.value) {
        return { status: "conflict", code: "EXPECTED_HEAD_MISMATCH" };
      }
      const receipt: ReceizAppendReceipt = Object.freeze({
        commitDomain,
        actor: Object.freeze({
          actorId: unit.plan.actor.actorId,
          evidenceDigest: structuredClone(unit.plan.actor.evidenceDigest),
          admissionProfile: "identity",
          registryDigest: structuredClone(unit.plan.actor.registryDigest),
        }),
        resource: unit.plan.resource,
        operation: "artifact.append",
        planDigest: structuredClone(unit.plan.planDigest),
        capabilityDigest: structuredClone(unit.command.capabilityDigest),
        transitionDigest: structuredClone(unit.plan.transitionDigest),
        artifactDigest: structuredClone(unit.command.candidateArtifactDigest),
        priorHead: structuredClone(unit.expectedHead),
        acceptedHead: structuredClone(unit.plan.transition.proposedHistoryHead),
        commandDigest: structuredClone(unit.command.commandDigest),
        idempotencyIdentityDigest: structuredClone(unit.plan.idempotencyKeyDigest),
        authority: Object.freeze({
          receiptIsProofAuthority: false,
          strongerTruth: "sealed-receiz-proof-object",
        }),
      });
      const accepted = await admissionStore.commit({
        schema: "receiz.admission.unit-of-work.v1",
        ...(unit.command.atomicRequirements ? {
          readDependencies: unit.command.atomicRequirements.readDependencies.map((entry) => ({ aggregateId: aggregateId(entry.resource), expectedHeadDigest: entry.expectedHeadDigest })),
          consumedPbiReceiptDigests: unit.command.atomicRequirements.consumedPbiReceiptDigests,
        } : {}),
        aggregateId: aggregateId(unit.plan.resource),
        commandDigest: unit.command.commandDigest.value,
        idempotencyKey: idempotencyId(unit),
        expectedRevision: aggregate.revision,
        expectedHeadDigest: unit.expectedHead.value,
        acceptedCommand: structuredClone(unit.command) as unknown as ReceizConstitutionJson,
        events: [{
          type: "receiz.artifact-transition.accepted.v112",
          artifactDigest: record.artifactDigest,
          transitionDigest: unit.plan.transitionDigest.value,
        }],
        nextHead: {
          revision: aggregate.revision + 1,
          digest: unit.plan.transition.proposedHistoryHead.value,
          state: { artifactDigest: record.artifactDigest },
        },
        resourceEffects: { "artifact.append": 1 },
        receipt: structuredClone(receipt) as unknown as ReceizConstitutionJson,
        outboxIntents: [],
        auditReference: {
          commandDigest: unit.command.commandDigest.value,
        },
      });
      if (accepted.status === "committed" || accepted.status === "idempotent") {
        return {
          status: accepted.status,
          receipt: structuredClone(accepted.receipt) as unknown as ReceizAppendReceipt,
        };
      }
      if (accepted.status === "conflict") {
        return {
          status: "conflict",
          code: accepted.code === "IDEMPOTENCY_CONFLICT"
            ? "IDEMPOTENCY_CONFLICT"
            : "EXPECTED_HEAD_MISMATCH",
        };
      }
      return { status: "failed", code: "ATOMIC_COMMIT_FAILED" };
    },
  });
}
