import { admitReceizKksV1ProofCoordinate, type ReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { createReceizArtifactAdmissionEngineWithSourceContext, readReceizIdentityPublicBinding, verifyReceizArtifactWithSourceContext } from "./artifactAdmission.js";
import { readRuntimeCustodiedReceizArtifactSnapshot, type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import { digestReceizCompositeCanonical } from "./compositeProofKernel.js";
import { receizBase64UrlEncode, receizBase64UrlDecode } from "./identity.js";
import { createReceizLivingSubjectRuntime, createReceizLivingSubjectTemporalExecution, readReceizLivingSubjectTemporalExecution, type ReceizLivingSubjectTemporalExecution, type ReceizLivingSubjectRuntimeOptions, type ReceizLivingSubjectRuntimeSnapshotV1 } from "./livingSubjectRuntime.js";
import { restoreReceizSubjectProofBrain } from "./livingSubjects.js";
import type { ReceizSubjectArtifactV1, ReceizSubjectMindArtifactV1, ReceizSubjectTwinMessageInput } from "./livingSubjects.js";
import { sha256Hex } from "./verifier/crypto.js";

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
  sources: readonly Readonly<{ artifactDigest: string; payloadDigest: string; exactArtifactBytesB64u: string; filename: string; mimeType: string; role?: "portable-envelope" }>[];
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
export async function createReceizV127SubjectRuntimeAdapter(options: ReceizV127SubjectRuntimeAdapterOptions) {
  if (Object.hasOwn(options, "initialKai") || Object.hasOwn(options, "temporalExecution")) throw new TypeError("SUBJECT_RUNTIME_RAW_KAI_AUTHORITY_FORBIDDEN");
  const identity = await readReceizIdentityPublicBinding(options.identityAdmission);
  // Canonical identity admission already binds the account UID or its Receiz ID
  // to the enclosing seal. Preserve that artifact owner, including username aliases.
  const owner = identity.artifactOwnerReceizId;
  if (!owner || !identity.signatureVerified) throw new TypeError("SUBJECT_RUNTIME_IDENTITY_OWNER_REQUIRED");
  const admit = await createReceizArtifactAdmissionEngineWithSourceContext(options.identityAdmission);
  const core = (snapshot?: ReceizLivingSubjectRuntimeSnapshotV1, temporalExecution?: ReceizLivingSubjectTemporalExecution) => createReceizLivingSubjectRuntime({
    registryDigest: options.registryDigest, reducerDigest: options.reducerDigest,
    ...(temporalExecution ? { temporalExecution } : {}),
    ...(options.model === undefined ? {} : { model: options.model }),
    ...(snapshot === undefined ? {} : { snapshot: structuredClone(snapshot) }),
  });
  const makeRecord = (snapshot: ReceizLivingSubjectRuntimeSnapshotV1, sources: ReceizV127SubjectRuntimeRecord["sources"], temporalTransitions?: ReceizV127SubjectRuntimeRecord["temporalTransitions"]): ReceizV127SubjectRuntimeRecord => {
    const basis = { schema: "receiz.subject.local-runtime.v127" as const, ownerReceizId: owner, sources, snapshot, ...(temporalTransitions ? { temporalTransitions } : {}) };
    return { ...basis, revision: digestReceizCompositeCanonical(basis) };
  };
  const validate = (record: ReceizV127SubjectRuntimeRecord) => {
    if (record.schema !== "receiz.subject.local-runtime.v127" || record.ownerReceizId !== owner) throw new TypeError("SUBJECT_RUNTIME_OWNER_MISMATCH");
    if (makeRecord(record.snapshot, record.sources, record.temporalTransitions).revision !== record.revision) throw new TypeError("SUBJECT_RUNTIME_DURABLE_INTEGRITY_FAILED");
    const runtime = core(record.snapshot);
    for (const saved of record.snapshot.subjects) {
      if (saved.artifact.subject.currentOwnerReceizId !== owner) throw new TypeError("SUBJECT_RUNTIME_OWNER_MISMATCH");
      if (saved.privateMemoryOwnerReceizId !== owner && saved.privateConversationPolicy !== "inherited") {
        throw new TypeError("SUBJECT_RUNTIME_PRIOR_OWNER_PRIVATE_HISTORY_REQUIRES_OWNER_HOST");
      }
    }
    return runtime;
  };
  const admittedTemporalHistories = new Set<string>();
  const temporalHistoryIdentity = (record: ReceizV127SubjectRuntimeRecord) => digestReceizCompositeCanonical({ transitions: record.temporalTransitions, snapshotDigest: record.snapshot.snapshotDigest, sources: record.sources.filter(source => source.role !== "portable-envelope").map(source => source.artifactDigest) });
  const verifyTemporalHistory = async (record: ReceizV127SubjectRuntimeRecord) => {
    if (!record.temporalTransitions?.length) return;
    const identity = temporalHistoryIdentity(record);
    if (admittedTemporalHistories.has(identity)) return;
    let previous: ReceizKksV1ProofCoordinate | undefined;
    let previousSnapshotDigest: string | undefined;
    for (const transition of record.temporalTransitions) {
      if (transition.legacyKaiUnit !== "kai-pulse" || (transition.kind !== "historical-source-import" && !transition.coordinates.length) || (transition.kind === "historical-source-import" && transition.coordinates.length)) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_BINDING_INVALID");
      if (previousSnapshotDigest !== undefined && transition.previousSnapshotDigest !== previousSnapshotDigest) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_SNAPSHOT_BINDING_INVALID");
      if (!/^[a-f0-9]{64}$/.test(transition.previousSnapshotDigest) || !/^[a-f0-9]{64}$/.test(transition.snapshotDigest) || transition.enclosingSourceArtifactDigests.some(digest => !record.sources.some(source => source.artifactDigest === digest && source.role !== "portable-envelope"))) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_SOURCE_BINDING_INVALID");
      previousSnapshotDigest = transition.snapshotDigest;
      for (const raw of transition.coordinates) {
        previous = await admitReceizKksV1ProofCoordinate(raw, {
          expectedPreviousKaiSigilProofHead: previous?.kaiSigil.proofHead ?? null,
          ...(previous ? { minimumExclusiveKaiUpulse: previous.kaiUpulse } : {}),
        });
      }
    }
    if (previousSnapshotDigest !== record.snapshot.snapshotDigest) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_SNAPSHOT_BINDING_INVALID");
    if (previous && BigInt(record.snapshot.kai) < BigInt(previous.kaiPulse)) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_SNAPSHOT_REGRESSION");
    admittedTemporalHistories.add(identity);
  };
  const minimumLegacyKai = (snapshot: ReceizLivingSubjectRuntimeSnapshotV1) => {
    const values = [snapshot.kai, ...snapshot.subjects.map(saved => saved.artifact.subject.createdAtKai), ...snapshot.worldEvents.flatMap(([, events]) => events.map(event => event.kai))];
    return values.reduce((head, value) => BigInt(value) > BigInt(head) ? value : head, "0");
  };
  const openSource = async (source: ReceizV127SubjectRuntimeSource) => {
    const bytes = source.payloadBytes.slice();
    const exact = await readRuntimeCustodiedReceizArtifactSnapshot(source.verification);
    const admitted = await admit(source.verification, { profile: "document" });
    if (admitted.verdict !== "verified-document") throw new TypeError("SUBJECT_RUNTIME_ENCLOSING_PROOF_REQUIRED");
    if (admitted.ownerReceizId !== owner) throw new TypeError("SUBJECT_RUNTIME_ENCLOSING_OWNER_MISMATCH");
    if (await sha256Hex(bytes) !== admitted.payloadSha256) throw new TypeError("SUBJECT_RUNTIME_PAYLOAD_MISMATCH");
    return {
      payload: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown,
      source: { artifactDigest: admitted.artifactSha256, payloadDigest: admitted.payloadSha256,
        exactArtifactBytesB64u: receizBase64UrlEncode(exact.bytes), filename: exact.filename, mimeType: exact.mimeType },
    };
  };
  const openPortableSnapshot = async (opened: Awaited<ReturnType<typeof openSource>>) => {
    const value = opened.payload as Partial<ReceizV127SubjectPortableSnapshot> | null;
    if (value?.schema !== "receiz.subject.portable-runtime.v127") {
      const snapshot = opened.payload as ReceizLivingSubjectRuntimeSnapshotV1;
      if (snapshot?.schema !== "receiz.subject.runtime_snapshot.v1" || snapshot.version !== "120.0.0") throw new TypeError("SUBJECT_RUNTIME_EXACT_V120_PROTOCOL_REQUIRED");
      return { snapshot, sources: [opened.source], temporalTransitions: undefined };
    }
    if (value.version !== "127.0.0" || !value.snapshot || value.snapshotDigest !== value.snapshot.snapshotDigest || !Array.isArray(value.sourceArtifacts) || value.temporalEvidence?.legacyKaiUnit !== "kai-pulse" || value.temporalEvidence.historicalKaiAuthority !== "not-retroactively-proved" || !Array.isArray(value.temporalEvidence.transitions)) throw new TypeError("SUBJECT_RUNTIME_PORTABLE_EVIDENCE_INVALID");
    const sources: Array<ReceizV127SubjectRuntimeRecord["sources"][number]> = [];
    for (const original of value.sourceArtifacts) {
      if (original.role !== undefined || sources.some(source => source.artifactDigest === original.artifactDigest)) throw new TypeError("SUBJECT_RUNTIME_PORTABLE_SOURCE_INVALID");
      const bytes = receizBase64UrlDecode(original.exactArtifactBytesB64u);
      const verification = await verifyReceizArtifactWithSourceContext(options.identityAdmission, new File([bytes.slice().buffer], original.filename, { type: original.mimeType }));
      const admission = await admit(verification, { profile: "document" });
      if (admission.verdict !== "verified-document" || admission.ownerReceizId !== owner || admission.artifactSha256 !== original.artifactDigest || admission.payloadSha256 !== original.payloadDigest) throw new TypeError("SUBJECT_RUNTIME_PORTABLE_SOURCE_INVALID");
      sources.push({ artifactDigest: original.artifactDigest, payloadDigest: original.payloadDigest, exactArtifactBytesB64u: original.exactArtifactBytesB64u, filename: original.filename, mimeType: original.mimeType });
    }
    sources.push({ ...opened.source, role: "portable-envelope" });
    const candidate = makeRecord(value.snapshot, sources, value.temporalEvidence.transitions);
    validate(candidate);
    await verifyTemporalHistory(candidate);
    return { snapshot: value.snapshot, sources, temporalTransitions: value.temporalEvidence.transitions };
  };
  const portableSnapshot = (record: ReceizV127SubjectRuntimeRecord): ReceizV127SubjectPortableSnapshot => ({
    schema: "receiz.subject.portable-runtime.v127", version: "127.0.0", snapshot: structuredClone(record.snapshot), snapshotDigest: record.snapshot.snapshotDigest,
    sourceArtifacts: structuredClone(record.sources.filter(source => source.role !== "portable-envelope")),
    temporalEvidence: { legacyKaiUnit: "kai-pulse", historicalKaiAuthority: "not-retroactively-proved", transitions: structuredClone(record.temporalTransitions ?? []) },
  });
  let initial = await options.store.load();
  if (!initial) {
    let snapshot = core().testing.snapshot();
    let sources: ReceizV127SubjectRuntimeRecord["sources"] = [];
    let temporalTransitions: ReceizV127SubjectRuntimeRecord["temporalTransitions"];
    if (options.initialSource) {
      ({ snapshot, sources, temporalTransitions } = await openPortableSnapshot(await openSource(options.initialSource)));
    }
    initial = makeRecord(snapshot, sources, temporalTransitions);
    validate(initial);
    if (!await options.store.compareAndSet(null, initial)) throw new Error("SUBJECT_RUNTIME_DURABLE_CONFLICT");
  } else if (options.initialSource) {
    throw new TypeError("SUBJECT_RUNTIME_ALREADY_INITIALIZED");
  }
  validate(initial);
  await verifyTemporalHistory(initial);

  // Never hand the mutable runtime or its testing namespace to the consumer.
  // Every call uses current durable truth and stages changes in an isolated core.
  const access = async <T>(ids: readonly string[], operation: (runtime: Runtime, coordinate?: ReceizKksV1ProofCoordinate) => T | Promise<T>, mutate = false, source?: ReceizV127SubjectRuntimeRecord["sources"][number], temporalOptions: { count?: number; throughKai?: string; requireProof?: boolean; operation?: string } = {}): Promise<T> => {
    const record = await options.store.load();
    if (!record) throw new Error("SUBJECT_RUNTIME_DURABLE_STATE_MISSING");
    let runtime = validate(record);
    await verifyTemporalHistory(record);
    for (const id of ids) if (runtime.subjects.state(id).currentOwnerReceizId !== owner) throw new TypeError("SUBJECT_RUNTIME_OWNER_MISMATCH");
    let temporalExecution: ReceizLivingSubjectTemporalExecution | undefined;
    if ((mutate && !source) || temporalOptions.requireProof) {
      if (!options.resolveTemporalCoordinate) throw new TypeError("SUBJECT_RUNTIME_KAISIGIL_PROVER_REQUIRED");
      const prior = record.temporalTransitions?.flatMap(transition => transition.coordinates).at(-1);
      const minimum = minimumLegacyKai(record.snapshot);
      const coordinates: ReceizKksV1ProofCoordinate[] = [];
      const requestedCount = temporalOptions.count ?? 1;
      const proofCount = temporalOptions.operation === "subjects.runtime.catchUp"
        ? Math.max(1, Math.min(requestedCount, record.snapshot.subjects.filter(subject => ids.includes(subject.artifact.subject.subjectId)).flatMap(subject => subject.jobs).filter(([, job]) => job.status === "queued" || job.status === "leased").length))
        : requestedCount;
      let previous = prior;
      for (let index = 0; index < proofCount; index++) {
        const candidate = await options.resolveTemporalCoordinate({
          previousKaiSigilProofHead: previous?.kaiSigil.proofHead ?? null,
          ...(previous ? { minimumExclusiveKaiUpulse: previous.kaiUpulse } : {}),
          minimumInclusiveLegacyKai: minimum, legacyKaiUnit: "kai-pulse", operation: temporalOptions.operation ?? "subject-runtime-transition",
        });
        const coordinate = await admitReceizKksV1ProofCoordinate(candidate, {
          expectedPreviousKaiSigilProofHead: previous?.kaiSigil.proofHead ?? null,
          ...(previous ? { minimumExclusiveKaiUpulse: previous.kaiUpulse } : {}),
        });
        if (BigInt(coordinate.kaiPulse) < BigInt(minimum)) throw new TypeError("SUBJECT_RUNTIME_TEMPORAL_PROOF_BEHIND_HISTORY");
        coordinates.push(coordinate);
        previous = coordinate;
      }
      if (temporalOptions.throughKai !== undefined && temporalOptions.throughKai !== coordinates[0]!.kaiPulse) throw new TypeError("SUBJECT_RUNTIME_THROUGH_KAI_PROOF_MISMATCH");
      temporalExecution = await createReceizLivingSubjectTemporalExecution(coordinates, {
        expectedPreviousKaiSigilProofHead: prior?.kaiSigil.proofHead ?? null,
        ...(prior ? { minimumExclusiveKaiUpulse: prior.kaiUpulse } : {}),
        minimumInclusiveLegacyKai: minimum,
      });
      runtime = core(record.snapshot, temporalExecution);
    }
    const result = await operation(runtime, temporalExecution ? readReceizLivingSubjectTemporalExecution(temporalExecution)[0] : undefined);
    if (result !== null && typeof result === "object" && "ok" in result && result.ok === false) return result;
    if (mutate) {
      const snapshot = runtime.testing.snapshot();
      const sources = source && !record.sources.some(s => s.artifactDigest === source.artifactDigest) ? [...record.sources, source] : record.sources;
      const temporalTransitions = temporalExecution ? [...(record.temporalTransitions ?? []), {
        legacyKaiUnit: "kai-pulse" as const, kind: "proof-execution" as const, previousSnapshotDigest: record.snapshot.snapshotDigest,
        snapshotDigest: snapshot.snapshotDigest, enclosingSourceArtifactDigests: sources.filter(value => value.role !== "portable-envelope").map(value => value.artifactDigest),
        coordinates: readReceizLivingSubjectTemporalExecution(temporalExecution),
      }] : source && snapshot.snapshotDigest !== record.snapshot.snapshotDigest ? [...(record.temporalTransitions ?? []), {
        legacyKaiUnit: "kai-pulse" as const, kind: "historical-source-import" as const,
        previousSnapshotDigest: record.snapshot.snapshotDigest, snapshotDigest: snapshot.snapshotDigest,
        enclosingSourceArtifactDigests: sources.filter(value => value.role !== "portable-envelope").map(value => value.artifactDigest), coordinates: [],
      }] : record.temporalTransitions;
      const next = makeRecord(snapshot, sources, temporalTransitions);
      if (next.revision !== record.revision && !await options.store.compareAndSet(record.revision, next)) throw new Error("SUBJECT_RUNTIME_DURABLE_CONFLICT");
      if (temporalTransitions) admittedTemporalHistories.add(temporalHistoryIdentity(next));
    }
    return result;
  };
  const authority = (actorSubjectId: string) => ({ actorSubjectId, ownerReceizId: owner });
  const authorities = (ids: readonly string[]) => ({ authorities: Object.fromEntries(ids.map(id => [id, authority(id)])) });
  // V120 iterators are finite snapshot traversals: subject additions cap at
  // 1000, world additions traverse one finite event array, and brain search
  // caps at 96 references. None subscribe to future producer events.
  const collect = async <T>(events: AsyncIterable<T>) => { const result: T[] = []; for await (const event of events) result.push(event); return result; };
  const stream = async function* <T>(pending: Promise<readonly T[]>) { for (const event of await pending) yield event; };
  const message = (input: Omit<ReceizSubjectTwinMessageInput, "ownerReceizId">): ReceizSubjectTwinMessageInput => ({ ...structuredClone(input), ownerReceizId: owner });

  return Object.freeze({
    version: "120.0.0" as const,
    registryDigest: options.registryDigest, reducerDigest: options.reducerDigest,
    exportSnapshot: async () => {
      const record = await options.store.load();
      if (!record) throw new Error("SUBJECT_RUNTIME_DURABLE_STATE_MISSING");
      validate(record); await verifyTemporalHistory(record);
      return portableSnapshot(record);
    },
    importSnapshot: async (source: ReceizV127SubjectRuntimeSource) => {
      const { snapshot, sources, temporalTransitions } = await openPortableSnapshot(await openSource(source));
      const record = await options.store.load();
      if (!record) throw new Error("SUBJECT_RUNTIME_DURABLE_STATE_MISSING");
      validate(record);
      if (record.snapshot.subjects.length || record.sources.length) throw new TypeError("SUBJECT_RUNTIME_ALREADY_INITIALIZED");
      const next = makeRecord(snapshot, sources, temporalTransitions);
      validate(next); await verifyTemporalHistory(next);
      if (!await options.store.compareAndSet(record.revision, next)) throw new Error("SUBJECT_RUNTIME_DURABLE_CONFLICT");
      return { subjectIds: snapshot.subjects.map(saved => saved.artifact.subject.subjectId), snapshotDigest: snapshot.snapshotDigest };
    },
    /** Restore only a verified extension of held causal history. A divergent crystal never replaces it. */
    restoreSnapshot: async (source: ReceizV127SubjectRuntimeSource) => {
      const { snapshot, sources, temporalTransitions } = await openPortableSnapshot(await openSource(source));
      const record = await options.store.load();
      if (!record) throw new Error("SUBJECT_RUNTIME_DURABLE_STATE_MISSING");
      validate(record); await verifyTemporalHistory(record);
      const next = makeRecord(snapshot, [...sources, ...record.sources.filter(row => row.role === "portable-envelope" && !sources.some(next => next.artifactDigest === row.artifactDigest))], temporalTransitions);
      validate(next); await verifyTemporalHistory(next);
      const exact = (a: unknown, b: unknown) => digestReceizCompositeCanonical(a) === digestReceizCompositeCanonical(b);
      const prefix = (a: readonly unknown[], b: readonly unknown[]) => a.length <= b.length && a.every((entry, index) => exact(entry, b[index]));
      const extendsHeld = (prior: ReceizV127SubjectRuntimeRecord, candidate: ReceizV127SubjectRuntimeRecord) => {
        const before = prior.temporalTransitions ?? [], after = candidate.temporalTransitions ?? [];
        if (after.length <= before.length || !prefix(before, after)
          || after[before.length]!.previousSnapshotDigest !== prior.snapshot.snapshotDigest) return false;
        if (!prior.sources.filter(row => row.role !== "portable-envelope").every(row => candidate.sources.some(next => exact(row, next)))) return false;
        // Preserve every already-held event and memory; proof coordinates cannot erase local history.
        for (const saved of prior.snapshot.subjects) {
          const found = candidate.snapshot.subjects.find(row => row.artifact.subject.subjectId === saved.artifact.subject.subjectId);
          if (!found || found.artifact.subject.identityDigest !== saved.artifact.subject.identityDigest
            || found.artifact.subject.genesisDigest !== saved.artifact.subject.genesisDigest
            || !prefix(saved.events, found.events) || !prefix(saved.memories, found.memories)
            || !prefix(saved.runtimeExecutions, found.runtimeExecutions)) return false;
        }
        for (const [world, events] of prior.snapshot.worldEvents) {
          const found = candidate.snapshot.worldEvents.find(([id]) => id === world);
          if (!found || !prefix(events, found[1])) return false;
        }
        return prefix(prior.snapshot.receipts, candidate.snapshot.receipts)
          && prefix(prior.snapshot.idempotentReceipts, candidate.snapshot.idempotentReceipts)
          && prefix(prior.snapshot.claimedInstrumentDigests, candidate.snapshot.claimedInstrumentDigests);
      };
      const empty = !record.snapshot.subjects.length && !record.sources.length;
      if ((exact(record.snapshot, next.snapshot) && exact(record.temporalTransitions ?? [], next.temporalTransitions ?? [])
        && exact(record.sources.filter(row => row.role !== "portable-envelope"), next.sources.filter(row => row.role !== "portable-envelope"))) || (!empty && extendsHeld(next, record))) {
        return { status: "already-held" as const, subjectIds: record.snapshot.subjects.map(row => row.artifact.subject.subjectId), snapshotDigest: record.snapshot.snapshotDigest };
      }
      if (!empty && !extendsHeld(record, next)) throw new TypeError("SUBJECT_RUNTIME_RESTORE_BRANCH_CONFLICT");
      if (!await options.store.compareAndSet(record.revision, next)) throw new Error("SUBJECT_RUNTIME_DURABLE_CONFLICT");
      return { status: empty ? "restored" as const : "extended" as const, subjectIds: snapshot.subjects.map(row => row.artifact.subject.subjectId), snapshotDigest: snapshot.snapshotDigest };
    },
    admitSubject: async (source: ReceizV127SubjectRuntimeSource) => {
      const opened = await openSource(source);
      const artifact = opened.payload as ReceizSubjectArtifactV1;
      if (artifact?.schema !== "receiz.subject.v1" || artifact.subject?.schema !== "receiz.subject.v1") throw new TypeError("SUBJECT_RUNTIME_EXACT_V120_PROTOCOL_REQUIRED");
      const subject = artifact.subject;
      if (subject.currentOwnerReceizId !== owner || subject.ownerReceizId !== owner) throw new TypeError("SUBJECT_RUNTIME_OWNER_MISMATCH");
      return access([], r => {
        // Only an exact genesis may initialize via this path. A successor needs
        // its enclosing snapshot/mind history; no successor is reminted.
        const admitted = r.admitSubject({ subjectId: subject.subjectId, proofObjectId: subject.proofObjectId,
          subjectType: subject.subjectType, ownerReceizId: owner, createdAtKai: subject.createdAtKai,
          identityDigest: subject.identityDigest, namespaces: subject.namespaces });
        if (digestReceizCompositeCanonical(admitted) !== digestReceizCompositeCanonical(artifact)) throw new TypeError("SUBJECT_RUNTIME_EXACT_GENESIS_OR_FULL_HISTORY_REQUIRED");
        // Preserve sealed historical creation verbatim; it cannot advance the execution clock.
        return admitted;
      }, true, opened.source);
    },
    subjects: Object.freeze({
      resolve: (id: string) => access([id], r => r.subjects.resolve(id)),
      state: (id: string) => access([id], r => r.subjects.state(id)),
      verify: (artifact: Argument<Subjects["verify"]>) => access([], r => ({ valid: r.subjects.verify(artifact), sourcePrimitive: "receiz.subject.v1" as const })),
      history: (id: string, input?: Argument<Subjects["history"], 1>) => access([id], r => r.subjects.history(id, input)),
      additions: (id: string, input?: Argument<Subjects["additions"], 1>) => access([id], r => r.subjects.additions(id, input)),
      subscribe: (id: string, input?: Argument<Subjects["subscribe"], 1>) => stream(access([id], r => collect(r.subjects.subscribe(id, input)))),
      brain: Object.freeze({
        head: (id: string) => access([id], r => r.subjects.brain.head(id)),
        search: (id: string, input: Argument<Subjects["brain"]["search"], 1>) => access([id], r => r.subjects.brain.search(id, input)),
        resolve: (id: string, input: Argument<ReturnType<typeof restoreReceizSubjectProofBrain>["resolveContext"]>) => access([id], r => {
          const saved = r.testing.snapshot().subjects.find(s => s.artifact.subject.subjectId === id)!;
          return restoreReceizSubjectProofBrain(saved.brain).resolveContext(input);
        }),
        stream: (id: string, input: Argument<Subjects["brain"]["stream"], 1>) => stream(access([id], r => collect(r.subjects.brain.stream(id, input)))),
        append: async (id: string, source: ReceizV127SubjectRuntimeSource) => {
          const opened = await openSource(source);
          return access([id], r => r.subjects.brain.append(id, opened.payload as Argument<Subjects["brain"]["append"], 1>), true, opened.source);
        },
      }),
      twin: Object.freeze({
        profile: (id: string) => access([id], r => r.subjects.twin.profile(id)),
        message: (id: string, input: Omit<ReceizSubjectTwinMessageInput, "ownerReceizId">) => access([id], r => r.subjects.twin.message(id, message(input)), true),
        stream: (id: string, input: Omit<ReceizSubjectTwinMessageInput, "ownerReceizId">) => stream(access([id], r => collect(r.subjects.twin.stream(id, message(input))), true)),
        streamPerformance: (id: string, input: Omit<ReceizSubjectTwinMessageInput, "ownerReceizId">) => stream(access([id], r => collect(r.subjects.twin.streamPerformance(id, message(input))), true)),
        exportMind: (id: string) => access([id], r => r.subjects.twin.exportMind(id), true),
        importMind: async (id: string, source: ReceizV127SubjectRuntimeSource) => {
          const opened = await openSource(source);
          const mind = opened.payload as ReceizSubjectMindArtifactV1;
          if (mind?.schema !== "receiz.subject.mind.v1" || mind.subjectArtifact.subject.currentOwnerReceizId !== owner) throw new TypeError("SUBJECT_RUNTIME_MIND_OWNER_OR_PROTOCOL_MISMATCH");
          if (mind.subjectArtifact.subject.ownerReceizId !== owner
            && (mind.privateMemoryIds.length > 0 || mind.portableWindow.some(object => object.visibility === "private"))) {
            throw new TypeError("SUBJECT_RUNTIME_PRIVATE_HISTORY_POLICY_REQUIRES_FULL_SNAPSHOT");
          }
          return access([], r => r.subjects.twin.importMind(id, mind), true, opened.source);
        },
        memorySummary: (id: string) => access([id], r => r.subjects.twin.memorySummary(id)),
      }),
      mandates: Object.freeze({
        get: (id: string) => access([id], r => r.subjects.mandates.get(id)),
        plan: (id: string, input: Argument<Subjects["mandates"]["plan"], 1>) => access([id], r => r.subjects.mandates.plan(id, input), true),
        // Existing V120 owner capability is an internal projection of admitted
        // identity custody. Caller-provided capability JSON is never consumed.
        activate: (id: string, mandateDigest: string) => access([id], r => {
          const mandate = r.subjects.mandates.get(id).find(m => m.mandateDigest === mandateDigest);
          if (!mandate) throw new TypeError("RECEIZ_SUBJECT_MANDATE_PLAN_INVALID");
          return r.subjects.mandates.activate(mandate, { schema: "receiz.subject.capability.v1", subjectId: id, receizId: owner,
            actions: ["mandate.activate"], expiresAtKai: mandate.policy.expiresAtKai, capabilityDigest: identity.artifactSha256 });
        }, true),
        pause: (id: string) => access([id], r => r.subjects.mandates.pause(id), true),
        revoke: (id: string) => access([id], r => r.subjects.mandates.revoke(id), true),
        explain: (id: string) => access([id], (r, coordinate) => ({ ...r.subjects.mandates.explain(id), temporalCoordinate: coordinate! }), false, undefined, { requireProof: true, operation: "subjects.mandates.explain" }),
      }),
      runtime: Object.freeze({
        enqueueTick: (input: Argument<Subjects["runtime"]["enqueueTick"]>) => access([input.subjectId], r => r.subjects.runtime.enqueueTick(input), true),
        status: (id: string) => access([], r => r.subjects.runtime.status(id)),
        pause: (id: string) => access([id], r => r.subjects.runtime.pause(id), true),
        catchUp: (id: string, input?: Argument<Subjects["runtime"]["catchUp"], 1>) => access([id], r => r.subjects.runtime.catchUp(id, input), true, undefined, {
          count: Math.max(1, Math.min(100, Math.trunc(input?.maximumTicks ?? 10))),
          ...(input?.throughKai === undefined ? {} : { throughKai: input.throughKai }), operation: "subjects.runtime.catchUp",
        }),
      }),
      memory: Object.freeze({
        query: (id: string, input?: Argument<Subjects["memory"]["query"], 1>) => access([id], r => r.subjects.memory.query(id, input)),
        project: (id: string, input: Argument<Subjects["memory"]["project"], 1>) => access([id], r => r.subjects.memory.project(id, input)),
        citations: (id: string, memoryId: string) => access([id], r => r.subjects.memory.citations(id, memoryId)),
        compact: (id: string, input?: Argument<Subjects["memory"]["compact"], 1>) => access([id], r => r.subjects.memory.compact(id, input)),
      }),
      relationships: Object.freeze({
        list: (id: string) => access([id], r => r.subjects.relationships.list(id)),
        history: (id: string) => access([id], r => r.subjects.relationships.history(id)),
        propose: (input: Argument<Subjects["relationships"]["propose"]>) => access([input.subjectId, input.targetSubjectId], r => r.subjects.relationships.propose(input)),
        respond: (input: Omit<Argument<Subjects["relationships"]["respond"]>, "authority">) => access([input.subjectId, input.targetSubjectId], r => r.subjects.relationships.respond({ ...input, authority: authorities([input.subjectId, input.targetSubjectId]) }), true),
      }),
      inventory: Object.freeze({
        list: (id: string) => access([id], r => r.subjects.inventory.list(id)),
        use: (input: Omit<Argument<Subjects["inventory"]["use"]>, "authority">) => access([input.subjectId], r => r.subjects.inventory.use({ ...input, authority: authority(input.subjectId) }), true),
      }),
      trades: Object.freeze({
        preview: (input: Argument<Subjects["trades"]["preview"]>) => access([input.fromSubjectId, input.toSubjectId], r => r.subjects.trades.preview(input)),
        execute: (preview: Argument<Subjects["trades"]["execute"]>) => access(preview.transaction.participants, r => r.subjects.trades.execute(preview, authorities(preview.transaction.participants)), true),
      }),
    }),
    world: Object.freeze({
      head: (id: string) => access([], r => r.world.head(id)),
      planCommand: (input: Argument<Runtime["world"]["planCommand"]>) => access([input.actorSubjectId], r => r.world.planCommand(input)),
      validateCommand: (input: Argument<Runtime["world"]["validateCommand"]>) => access([input.command.input.actorSubjectId], (r, coordinate) => ({ ...r.world.validateCommand(input), temporalCoordinate: coordinate! }), false, undefined, { requireProof: true, operation: "world.validateCommand" }),
      executeCommand: (input: Argument<Runtime["world"]["executeCommand"]>) => access(Object.keys(input.priorHeads), r => r.world.executeCommand(input, authority(input.command.input.actorSubjectId)), true),
      planTransaction: (input: Argument<Runtime["world"]["planTransaction"]>) => access(input.participants, r => r.world.planTransaction(input)),
      executeTransaction: (input: Argument<Runtime["world"]["executeTransaction"]>) => access(input.participants, r => r.world.executeTransaction(input, authorities(input.participants)), true),
      receipt: (id: string) => access([], r => r.world.receipt(id)),
      replay: (input: Argument<Runtime["world"]["replay"]>) => access([], r => r.world.replay(input)),
      additions: (input: Argument<Runtime["world"]["additions"]>) => access([], r => r.world.additions(input)),
      subscribe: (input: Argument<Runtime["world"]["subscribe"]>) => stream(access([], r => collect(r.world.subscribe(input)))),
    }),
  });
}

export type ReceizV127SubjectRuntimeAdapter = Awaited<ReturnType<typeof createReceizV127SubjectRuntimeAdapter>>;
