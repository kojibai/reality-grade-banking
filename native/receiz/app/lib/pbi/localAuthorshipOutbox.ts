"use client";

import {
  normalizeLocalPbiAuthorshipProof,
  verifyLocalPbiAuthorshipProof,
  type LocalPbiAuthorshipProofV1,
} from "@/app/lib/pbi/localAuthorship";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthAtomicSnapshot,
  transformDurableLocalTruthItemAtomically,
  type DurableLocalTruthAtomicSnapshot,
} from "@/app/lib/runtime/localTruthStore";
import {
  createLocalPbiProofObjectAuthorshipReconciliationReceipt,
  createLocalPbiProofObjectAuthorshipReconciliationReceiptFromLegacyAck,
  normalizeLocalPbiProofObjectAuthorshipReconciliationInput,
  normalizeLocalPbiProofObjectAuthorshipReconciliationReceipt,
  verifyLocalPbiProofObjectAuthorshipReconciliationAck,
  type LocalPbiProofObjectAuthorshipReconciliationInput,
  type LocalPbiProofObjectAuthorshipReconciliationReceipt,
} from "@/app/lib/pbi/proofObjectAuthorshipReconciliation";

const LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA = "receiz.pbi.authorship.publication-outbox.v1";
const LOCAL_PBI_AUTHORSHIP_OUTBOX_STORAGE_KEY = "receiz.pbi.authorship.publication-outbox.v1";
const HEX64_RE = /^[0-9a-f]{64}$/;
const DEFAULT_FLUSH_BATCH_SIZE = 12;
const MAX_FLUSH_BATCH_SIZE = 48;
const MAX_FLUSH_QUIESCENCE_PASSES = 8;

export const LOCAL_PBI_AUTHORSHIP_OUTBOX_EVENT = "receiz:pbi-authorship-outbox";

export type LocalPbiSignedArtifact = {
  slug: string;
  code: string;
  pulse: string;
  claimHashHex: string;
  pbiReceiptHash: string;
  signerId: string;
  storagePath: string;
  createdAt: string;
};

export type {
  LocalPbiProofObjectAuthorshipReconciliationInput,
  LocalPbiProofObjectAuthorshipReconciliationAck,
  LocalPbiProofObjectAuthorshipReconciliationReceipt,
} from "@/app/lib/pbi/proofObjectAuthorshipReconciliation";

export type LocalPbiAuthorshipPublicationEntry = {
  actionHashHex: string;
  status: "pending" | "artifact-published";
  proof: LocalPbiAuthorshipProofV1;
  createdAtMs: number;
  updatedAtMs: number;
  publicationAttempts: number;
  lastPublicationStatus: number | null;
  lastError: string | null;
  artifactPublishedAtMs: number | null;
  downloadUrl: string | null;
  signedArtifact: LocalPbiSignedArtifact | null;
  proofObjectAuthorshipReconciliation: LocalPbiProofObjectAuthorshipReconciliationInput | null;
};

type LocalPbiAuthorshipOutbox = {
  schema: typeof LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA;
  updatedAtMs: number;
  entries: Record<string, LocalPbiAuthorshipPublicationEntry>;
  reconciliationReceipts: Record<
    string,
    LocalPbiProofObjectAuthorshipReconciliationReceipt
  >;
  reconciliationQuarantine: Record<string, unknown>;
};

type SignedRenderResponse = {
  already?: boolean;
  downloadUrl?: unknown;
  signedArtifact?: unknown;
  error?: unknown;
  detail?: unknown;
};

type LocalAuthorshipAppendResponse = {
  ok?: unknown;
  receiptHash?: unknown;
  downloadUrl?: unknown;
  signedArtifact?: unknown;
  proofObjectAuthorshipReconciliationAck?: unknown;
  error?: unknown;
  detail?: unknown;
};

let flushPromise: Promise<void> | null = null;
let migrationPromise: Promise<void> | null = null;
let runtimeUninstall: (() => void) | null = null;

export type FlushLocalPbiAuthorshipPublicationOptions = {
  fetchImpl?: typeof fetch;
  verifyProof?: (proof: LocalPbiAuthorshipProofV1) => Promise<boolean>;
  batchSize?: number;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function createSafeRecord<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

function copyOpaqueJsonRecord(
  source: Record<string, unknown>,
): Record<string, unknown> {
  const copy = createSafeRecord<unknown>();
  for (const key of Object.keys(source)) {
    Object.defineProperty(copy, key, {
      configurable: true,
      enumerable: true,
      value: source[key],
      writable: true,
    });
  }
  return copy;
}

function emptyOutbox(): LocalPbiAuthorshipOutbox {
  return {
    schema: LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA,
    updatedAtMs: 0,
    entries: createSafeRecord<LocalPbiAuthorshipPublicationEntry>(),
    reconciliationReceipts:
      createSafeRecord<LocalPbiProofObjectAuthorshipReconciliationReceipt>(),
    reconciliationQuarantine: createSafeRecord<unknown>(),
  };
}

function normalizeSignedArtifact(value: unknown): LocalPbiSignedArtifact | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalPbiSignedArtifact>;
  const slug = normalizeText(record.slug);
  const code = normalizeText(record.code).toUpperCase();
  const pulse = normalizeText(record.pulse);
  const claimHashHex = normalizeText(record.claimHashHex).toLowerCase();
  const pbiReceiptHash = normalizeText(record.pbiReceiptHash).toLowerCase();
  const signerId = normalizeText(record.signerId);
  const storagePath = normalizeText(record.storagePath);
  const createdAt = normalizeText(record.createdAt);
  if (
    !slug ||
    !code ||
    !pulse ||
    !HEX64_RE.test(claimHashHex) ||
    !HEX64_RE.test(pbiReceiptHash) ||
    !signerId ||
    !storagePath ||
    !createdAt
  ) {
    return null;
  }
  return { slug, code, pulse, claimHashHex, pbiReceiptHash, signerId, storagePath, createdAt };
}

function normalizeEntry(value: unknown): LocalPbiAuthorshipPublicationEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalPbiAuthorshipPublicationEntry>;
  const proof = normalizeLocalPbiAuthorshipProof(record.proof);
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const createdAtMs = Number(record.createdAtMs);
  const updatedAtMs = Number(record.updatedAtMs);
  const downloadUrl = normalizeNullableText(record.downloadUrl);
  const signedArtifact = record.signedArtifact ? normalizeSignedArtifact(record.signedArtifact) : null;
  const proofObjectAuthorshipReconciliation = record.proofObjectAuthorshipReconciliation
    ? normalizeLocalPbiProofObjectAuthorshipReconciliationInput(
        record.proofObjectAuthorshipReconciliation,
      )
    : null;
  if (
    record.proofObjectAuthorshipReconciliation
    && !proofObjectAuthorshipReconciliation
  ) return null;
  const status = record.status === "artifact-published"
    ? "artifact-published"
    : "pending";
  if (!proof || !HEX64_RE.test(actionHashHex) || actionHashHex !== proof.actionHashHex || !Number.isFinite(createdAtMs)) {
    return null;
  }
  if (status === "artifact-published" && (!downloadUrl || !signedArtifact)) return null;
  if (status === "artifact-published" && proofObjectAuthorshipReconciliation) return null;
  return {
    actionHashHex,
    status,
    proof,
    createdAtMs,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : createdAtMs,
    publicationAttempts: Math.max(0, Math.trunc(Number(record.publicationAttempts) || 0)),
    lastPublicationStatus: Number.isFinite(record.lastPublicationStatus) ? Number(record.lastPublicationStatus) : null,
    lastError: normalizeNullableText(record.lastError),
    artifactPublishedAtMs: Number.isFinite(record.artifactPublishedAtMs) ? Number(record.artifactPublishedAtMs) : null,
    downloadUrl,
    signedArtifact,
    proofObjectAuthorshipReconciliation,
  };
}

function parseOutbox(raw: string | null): {
  outbox: LocalPbiAuthorshipOutbox;
  needsPersistence: boolean;
} {
  if (!raw) return { outbox: emptyOutbox(), needsPersistence: false };
  try {
    const parsed = JSON.parse(raw) as Partial<LocalPbiAuthorshipOutbox> | null;
    if (
      !isPlainJsonObject(parsed)
      || parsed.schema !== LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA
      || !isPlainJsonObject(parsed.entries)
    ) {
      throw new Error("local_pbi_authorship_outbox_corrupt");
    }
    const entries =
      createSafeRecord<LocalPbiAuthorshipPublicationEntry>();
    const reconciliationReceipts: Record<
      string,
      LocalPbiProofObjectAuthorshipReconciliationReceipt
    > = createSafeRecord<LocalPbiProofObjectAuthorshipReconciliationReceipt>();
    if (
      parsed.reconciliationQuarantine !== undefined
      && !isPlainJsonObject(parsed.reconciliationQuarantine)
    ) {
      throw new Error("local_pbi_authorship_outbox_corrupt");
    }
    const reconciliationQuarantine = parsed.reconciliationQuarantine
      ? copyOpaqueJsonRecord(parsed.reconciliationQuarantine)
      : createSafeRecord<unknown>();
    if (
      parsed.reconciliationReceipts !== undefined
      && !isPlainJsonObject(parsed.reconciliationReceipts)
    ) {
      throw new Error("local_pbi_authorship_outbox_corrupt");
    }
    if (parsed.reconciliationReceipts) {
      for (const value of Object.values(parsed.reconciliationReceipts)) {
        const receipt =
          normalizeLocalPbiProofObjectAuthorshipReconciliationReceipt(value);
        if (receipt) {
          reconciliationReceipts[receipt.actionHashHex] = receipt;
        } else {
          throw new Error("local_pbi_authorship_outbox_corrupt");
        }
      }
    }
    for (const value of Object.values(parsed.entries)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const legacy = value as Record<string, unknown>;
        if (legacy.status === "reconciliation-queued") {
          const pending = normalizeEntry(value);
          const reconciliation = pending?.proofObjectAuthorshipReconciliation;
          const scope = pending?.proof.input.proofObjectScope;
          const receipt = (
            pending
            && reconciliation
            && scope
            && reconciliation.predecessorArtifactSha256
              === scope.predecessorArtifactSha256
            && reconciliation.pbiReceiptHash === pending.proof.pbiReceiptHash
            && reconciliation.receizId === scope.receizId
            && reconciliation.createdAt === pending.proof.verifiedAt
          )
            ? createLocalPbiProofObjectAuthorshipReconciliationReceiptFromLegacyAck({
                ack: legacy.proofObjectAuthorshipReconciliationAck,
                actionHashHex: pending.actionHashHex,
                reconciliation,
                queuedAtMs: pending.updatedAtMs,
              })
            : null;
          if (receipt) {
            reconciliationReceipts[receipt.actionHashHex] = receipt;
          } else if (pending) {
            entries[pending.actionHashHex] = pending;
          } else {
            throw new Error("local_pbi_authorship_outbox_corrupt");
          }
          continue;
        }
      }
      const entry = normalizeEntry(value);
      if (!entry) throw new Error("local_pbi_authorship_outbox_corrupt");
      entries[entry.actionHashHex] = entry;
    }
    for (const actionHashHex of Object.keys(reconciliationReceipts)) {
      delete entries[actionHashHex];
      delete reconciliationQuarantine[actionHashHex];
    }
    const outbox: LocalPbiAuthorshipOutbox = {
      schema: LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA,
      updatedAtMs: Number.isFinite(parsed.updatedAtMs) ? Number(parsed.updatedAtMs) : 0,
      entries,
      reconciliationReceipts,
      reconciliationQuarantine,
    };
    return { outbox, needsPersistence: JSON.stringify(outbox) !== raw };
  } catch {
    throw new Error("local_pbi_authorship_outbox_corrupt");
  }
}

function dispatchOutboxChange(): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOCAL_PBI_AUTHORSHIP_OUTBOX_EVENT));
}

type OutboxTransformResult<T> = {
  outbox: LocalPbiAuthorshipOutbox;
  value: T;
};

async function transformOutbox<T>(
  update: (outbox: LocalPbiAuthorshipOutbox) => OutboxTransformResult<T>,
  expectedSnapshot?: DurableLocalTruthAtomicSnapshot,
): Promise<T> {
  let value: T | undefined;
  const result = await transformDurableLocalTruthItemAtomically(
    LOCAL_PBI_AUTHORSHIP_OUTBOX_STORAGE_KEY,
    (payload) => {
      const current = parseOutbox(payload).outbox;
      const next = update(current);
      value = next.value;
      return JSON.stringify(next.outbox);
    },
    {
      rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
      source: "local-pbi-authorship-publication-outbox",
      allowSameRankOverwrite: true,
      ...(expectedSnapshot ? { expectedSnapshot } : {}),
      maxAttempts: 4,
    },
  );
  if (result.changed) dispatchOutboxChange();
  return value as T;
}

function beginOutboxMigration(
  expectedSnapshot: DurableLocalTruthAtomicSnapshot,
): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = transformOutbox(
    (outbox) => ({
      outbox,
      value: undefined,
    }),
    expectedSnapshot,
  ).finally(() => {
    migrationPromise = null;
  });
  return migrationPromise;
}

export function migrateLocalPbiAuthorshipOutbox(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  const expectedSnapshot = readDurableLocalTruthAtomicSnapshot(
    LOCAL_PBI_AUTHORSHIP_OUTBOX_STORAGE_KEY,
  );
  const normalized = parseOutbox(expectedSnapshot.entry?.payload ?? null);
  if (!normalized.needsPersistence) return Promise.resolve();
  return beginOutboxMigration(expectedSnapshot);
}

function readOutbox(): LocalPbiAuthorshipOutbox {
  const expectedSnapshot = readDurableLocalTruthAtomicSnapshot(
    LOCAL_PBI_AUTHORSHIP_OUTBOX_STORAGE_KEY,
  );
  const normalized = parseOutbox(expectedSnapshot.entry?.payload ?? null);
  if (normalized.needsPersistence) {
    void beginOutboxMigration(expectedSnapshot).catch(() => null);
  }
  return normalized.outbox;
}

async function updateEntry(
  actionHashHex: string,
  update: (entry: LocalPbiAuthorshipPublicationEntry) => LocalPbiAuthorshipPublicationEntry,
): Promise<LocalPbiAuthorshipPublicationEntry | null> {
  return transformOutbox((outbox) => {
    const existing = outbox.entries[actionHashHex];
    if (!existing) return { outbox, value: null };
    const next = update(existing);
    return {
      outbox: {
        schema: LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA,
        updatedAtMs: next.updatedAtMs,
        entries: { ...outbox.entries, [actionHashHex]: next },
        reconciliationReceipts: outbox.reconciliationReceipts,
        reconciliationQuarantine: outbox.reconciliationQuarantine,
      },
      value: next,
    };
  });
}

export function peekLocalPbiAuthorshipPublication(actionHashHexValue: string): LocalPbiAuthorshipPublicationEntry | null {
  const actionHashHex = normalizeText(actionHashHexValue).toLowerCase();
  if (!HEX64_RE.test(actionHashHex)) return null;
  return readOutbox().entries[actionHashHex] ?? null;
}

export function peekLocalPbiProofObjectAuthorshipReconciliationReceipt(
  actionHashHexValue: string,
): LocalPbiProofObjectAuthorshipReconciliationReceipt | null {
  const actionHashHex = normalizeText(actionHashHexValue).toLowerCase();
  if (!HEX64_RE.test(actionHashHex)) return null;
  return readOutbox().reconciliationReceipts[actionHashHex] ?? null;
}

export async function enqueueLocalPbiAuthorshipPublication(
  proofValue: LocalPbiAuthorshipProofV1,
  verifyProof: (proof: LocalPbiAuthorshipProofV1) => Promise<boolean> = verifyLocalPbiAuthorshipProof,
): Promise<LocalPbiAuthorshipPublicationEntry> {
  const proof = normalizeLocalPbiAuthorshipProof(proofValue);
  if (!proof) throw new Error("local_pbi_authorship_proof_invalid");
  if (!(await verifyProof(proof))) throw new Error("local_pbi_authorship_proof_invalid");
  const now = Date.now();
  const entry: LocalPbiAuthorshipPublicationEntry = {
    actionHashHex: proof.actionHashHex,
    status: "pending",
    proof,
    createdAtMs: now,
    updatedAtMs: now,
    publicationAttempts: 0,
    lastPublicationStatus: null,
    lastError: null,
    artifactPublishedAtMs: null,
    downloadUrl: null,
    signedArtifact: null,
    proofObjectAuthorshipReconciliation: null,
  };
  return transformOutbox((outbox) => {
    if (
      outbox.reconciliationReceipts[proof.actionHashHex]
      || outbox.reconciliationQuarantine[proof.actionHashHex]
    ) {
      throw new Error("local_pbi_authorship_reconciliation_already_queued");
    }
    const existing = outbox.entries[proof.actionHashHex];
    if (existing) return { outbox, value: existing };
    return {
      outbox: {
        schema: LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA,
        updatedAtMs: now,
        entries: { ...outbox.entries, [proof.actionHashHex]: entry },
        reconciliationReceipts: outbox.reconciliationReceipts,
        reconciliationQuarantine: outbox.reconciliationQuarantine,
      },
      value: entry,
    };
  });
}

export async function enqueueLocalPbiProofObjectAuthorshipReconciliation(
  args: {
    proof: LocalPbiAuthorshipProofV1;
    reconciliation: LocalPbiProofObjectAuthorshipReconciliationInput;
  },
  verifyProof: (proof: LocalPbiAuthorshipProofV1) => Promise<boolean> = verifyLocalPbiAuthorshipProof,
): Promise<LocalPbiAuthorshipPublicationEntry> {
  const proof = normalizeLocalPbiAuthorshipProof(args.proof);
  const reconciliation =
    normalizeLocalPbiProofObjectAuthorshipReconciliationInput(args.reconciliation);
  const scope = proof?.input.proofObjectScope;
  if (
    !proof
    || !reconciliation
    || !scope
    || !(await verifyProof(proof))
    || reconciliation.predecessorArtifactSha256 !== scope.predecessorArtifactSha256
    || reconciliation.pbiReceiptHash !== proof.pbiReceiptHash
    || reconciliation.receizId !== scope.receizId
    || reconciliation.createdAt !== proof.verifiedAt
  ) {
    throw new Error("local_pbi_proof_object_authorship_reconciliation_invalid");
  }

  const now = Date.now();
  return transformOutbox((outbox) => {
    if (
      outbox.reconciliationReceipts[proof.actionHashHex]
      || outbox.reconciliationQuarantine[proof.actionHashHex]
    ) {
      throw new Error(
        "local_pbi_proof_object_authorship_reconciliation_already_queued",
      );
    }
    const existing = outbox.entries[proof.actionHashHex];
    if (
      existing
      && JSON.stringify(existing.proof) !== JSON.stringify(proof)
    ) {
      throw new Error(
        "local_pbi_proof_object_authorship_reconciliation_conflict",
      );
    }
    if (existing?.proofObjectAuthorshipReconciliation) {
      if (
        JSON.stringify(existing.proofObjectAuthorshipReconciliation)
          !== JSON.stringify(reconciliation)
      ) {
        throw new Error(
          "local_pbi_proof_object_authorship_reconciliation_conflict",
        );
      }
      return { outbox, value: existing };
    }

    const entry: LocalPbiAuthorshipPublicationEntry = existing
      ? {
          ...existing,
          updatedAtMs: now,
          proofObjectAuthorshipReconciliation: reconciliation,
        }
      : {
        actionHashHex: proof.actionHashHex,
        status: "pending",
        proof,
        createdAtMs: now,
        updatedAtMs: now,
        publicationAttempts: 0,
        lastPublicationStatus: null,
        lastError: null,
        artifactPublishedAtMs: null,
        downloadUrl: null,
        signedArtifact: null,
        proofObjectAuthorshipReconciliation: reconciliation,
      };
    return {
      outbox: {
        schema: LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA,
        updatedAtMs: now,
        entries: { ...outbox.entries, [proof.actionHashHex]: entry },
        reconciliationReceipts: outbox.reconciliationReceipts,
        reconciliationQuarantine: outbox.reconciliationQuarantine,
      },
      value: entry,
    };
  });
}

export async function publishLocalPbiAuthorshipArtifact(args: {
  actionHashHex: string;
  fetchImpl?: typeof fetch;
  verifyProof?: (proof: LocalPbiAuthorshipProofV1) => Promise<boolean>;
}): Promise<LocalPbiAuthorshipPublicationEntry | null> {
  const actionHashHex = normalizeText(args.actionHashHex).toLowerCase();
  if (!HEX64_RE.test(actionHashHex)) return null;
  const entry = peekLocalPbiAuthorshipPublication(actionHashHex);
  if (!entry || entry.status !== "pending") return entry;
  const verifyProof = args.verifyProof ?? verifyLocalPbiAuthorshipProof;
  if (!(await verifyProof(entry.proof))) {
    throw new Error("local_pbi_authorship_proof_invalid");
  }

  const attemptedAt = Date.now();
  const attemptedEntry = await updateEntry(actionHashHex, (current) => ({
    ...current,
    updatedAtMs: attemptedAt,
    publicationAttempts: current.publicationAttempts + 1,
    lastError: null,
  }));
  if (!attemptedEntry) return null;

  const fetchImpl = args.fetchImpl ?? fetch;
  const requestAppend = (): Promise<Response> => fetchImpl("/api/pbi/authorship/local-append", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      proof: entry.proof,
      ...(entry.proofObjectAuthorshipReconciliation
        ? {
            proofObjectAuthorshipReconciliation:
              entry.proofObjectAuthorshipReconciliation,
          }
        : {}),
    }),
  });

  let appendResponse: Response;
  try {
    appendResponse = await requestAppend();
    if (appendResponse.status === 401) {
      await import("@/app/lib/auth/localIdentityPublishOutbox")
        .then(({ flushPendingLocalIdentityPublications }) => flushPendingLocalIdentityPublications())
        .catch(() => null);
      appendResponse = await requestAppend();
    }
  } catch (error) {
    return await updateEntry(actionHashHex, (current) => ({
      ...current,
      updatedAtMs: Date.now(),
      lastError: error instanceof Error ? error.message : "pbi_authorship_append_unavailable",
    }));
  }

  const appendPayload = (await appendResponse.json().catch(() => null)) as LocalAuthorshipAppendResponse | null;
  const appendedReceiptHash = normalizeText(appendPayload?.receiptHash).toLowerCase();
  if (!appendResponse.ok || appendPayload?.ok !== true || appendedReceiptHash !== entry.proof.pbiReceiptHash) {
    return await updateEntry(actionHashHex, (current) => ({
      ...current,
      updatedAtMs: Date.now(),
      lastPublicationStatus: appendResponse.status,
      lastError:
        normalizeNullableText(appendPayload?.error) ??
        normalizeNullableText(appendPayload?.detail) ??
        `pbi_authorship_append_http_${appendResponse.status}`,
      }));
  }

  const proofObjectAuthorshipReconciliationAck =
    entry.proofObjectAuthorshipReconciliation
    ? await verifyLocalPbiProofObjectAuthorshipReconciliationAck({
        ack: appendPayload?.proofObjectAuthorshipReconciliationAck,
        actionHashHex: entry.actionHashHex,
        reconciliation: entry.proofObjectAuthorshipReconciliation,
      })
    : null;
  if (
    entry.proofObjectAuthorshipReconciliation
    && !proofObjectAuthorshipReconciliationAck
  ) {
    return await updateEntry(actionHashHex, (current) => ({
      ...current,
      updatedAtMs: Date.now(),
      lastPublicationStatus: appendResponse.status,
      lastError: "proof_object_authorship_reconciliation_ack_invalid",
    }));
  }

  if (proofObjectAuthorshipReconciliationAck) {
    const queuedAtMs = Date.now();
    const receipt =
      createLocalPbiProofObjectAuthorshipReconciliationReceipt(
        proofObjectAuthorshipReconciliationAck,
        queuedAtMs,
      );
    await transformOutbox((outbox) => {
      const current = outbox.entries[actionHashHex];
      if (!current) return { outbox, value: undefined };
      if (
        JSON.stringify(current.proofObjectAuthorshipReconciliation)
        !== JSON.stringify(entry.proofObjectAuthorshipReconciliation)
      ) {
        return { outbox, value: undefined };
      }
      const entries = { ...outbox.entries };
      delete entries[actionHashHex];
      return {
        outbox: {
          schema: LOCAL_PBI_AUTHORSHIP_OUTBOX_SCHEMA,
          updatedAtMs: queuedAtMs,
          entries,
          reconciliationReceipts: {
            ...outbox.reconciliationReceipts,
            [actionHashHex]: receipt,
          },
          reconciliationQuarantine: outbox.reconciliationQuarantine,
        },
        value: undefined,
      };
    });
    return null;
  }

  const appendedSignedArtifact = normalizeSignedArtifact(appendPayload?.signedArtifact);
  const appendedDownloadUrl = normalizeNullableText(appendPayload?.downloadUrl);
  if (
    appendedSignedArtifact &&
    appendedDownloadUrl &&
    appendedSignedArtifact.slug === entry.proof.input.slug &&
    appendedSignedArtifact.code === entry.proof.input.code &&
    appendedSignedArtifact.pulse === entry.proof.input.pulse &&
    appendedSignedArtifact.pbiReceiptHash === entry.proof.pbiReceiptHash &&
    appendedSignedArtifact.claimHashHex === entry.proof.input.claimHashHex
  ) {
    return await updateEntry(actionHashHex, (current) => ({
      ...current,
      status: "artifact-published",
      updatedAtMs: Date.now(),
      lastPublicationStatus: appendResponse.status,
      lastError: null,
      artifactPublishedAtMs: Date.now(),
      downloadUrl: appendedDownloadUrl,
      signedArtifact: appendedSignedArtifact,
    }));
  }

  let response: Response;
  try {
    response = await fetchImpl("/api/receiz/signed/render", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ...entry.proof.input,
        pbiReceiptHash: entry.proof.pbiReceiptHash,
      }),
    });
  } catch (error) {
    return await updateEntry(actionHashHex, (current) => ({
      ...current,
      updatedAtMs: Date.now(),
      lastError: error instanceof Error ? error.message : "signed_artifact_publication_unavailable",
    }));
  }

  const payload = (await response.json().catch(() => null)) as SignedRenderResponse | null;
  const signedArtifact = normalizeSignedArtifact(payload?.signedArtifact);
  const downloadUrl = normalizeNullableText(payload?.downloadUrl);
  if (
    !response.ok ||
    !signedArtifact ||
    !downloadUrl ||
    signedArtifact.pbiReceiptHash !== entry.proof.pbiReceiptHash ||
    signedArtifact.claimHashHex !== entry.proof.input.claimHashHex
  ) {
    return await updateEntry(actionHashHex, (current) => ({
      ...current,
      updatedAtMs: Date.now(),
      lastPublicationStatus: response.status,
      lastError:
        normalizeNullableText(payload?.error) ??
        normalizeNullableText(payload?.detail) ??
        `signed_artifact_publication_http_${response.status}`,
    }));
  }

  return await updateEntry(actionHashHex, (current) => ({
    ...current,
    status: "artifact-published",
    updatedAtMs: Date.now(),
    lastPublicationStatus: response.status,
    lastError: null,
    artifactPublishedAtMs: Date.now(),
    downloadUrl,
    signedArtifact,
  }));
}

function flushOptions(
  optionsOrFetch?: FlushLocalPbiAuthorshipPublicationOptions | typeof fetch,
): FlushLocalPbiAuthorshipPublicationOptions {
  return typeof optionsOrFetch === "function" ? { fetchImpl: optionsOrFetch } : (optionsOrFetch ?? {});
}

function boundedBatchSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_FLUSH_BATCH_SIZE;
  return Math.max(1, Math.min(MAX_FLUSH_BATCH_SIZE, Math.trunc(value)));
}

function yieldToVisibleWork(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function flushPendingLocalPbiAuthorshipPublications(
  optionsOrFetch?: FlushLocalPbiAuthorshipPublicationOptions | typeof fetch,
): Promise<void> {
  if (flushPromise) return flushPromise;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const options = flushOptions(optionsOrFetch);
  flushPromise = (async () => {
    const batchSize = boundedBatchSize(options.batchSize);
    const attempted = new Set<string>();
    for (
      let pass = 0;
      pass < MAX_FLUSH_QUIESCENCE_PASSES;
      pass += 1
    ) {
      const pending = Object.values(readOutbox().entries)
        .filter(
          (entry) =>
            entry.status === "pending"
            && !attempted.has(entry.actionHashHex),
        )
        .sort((left, right) => left.createdAtMs - right.createdAtMs);
      if (pending.length === 0) break;
      for (let offset = 0; offset < pending.length; offset += batchSize) {
        const batch = pending.slice(offset, offset + batchSize);
        for (const entry of batch) {
          attempted.add(entry.actionHashHex);
          await publishLocalPbiAuthorshipArtifact({
            actionHashHex: entry.actionHashHex,
            ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
            ...(options.verifyProof ? { verifyProof: options.verifyProof } : {}),
          }).catch(() => null);
        }
        if (offset + batchSize < pending.length) await yieldToVisibleWork();
      }
      if (pass + 1 < MAX_FLUSH_QUIESCENCE_PASSES) {
        await yieldToVisibleWork();
      }
    }
  })().finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}

export function ensureLocalPbiAuthorshipReconnectFlush(): void {
  installLocalPbiAuthorshipOutboxRuntime();
}

export function installLocalPbiAuthorshipOutboxRuntime(): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return () => {};
  if (runtimeUninstall) return runtimeUninstall;

  const flush = (): void => {
    void flushPendingLocalPbiAuthorshipPublications().catch(() => null);
  };
  const onVisible = (): void => {
    if (document.visibilityState === "visible") flush();
  };
  const uninstall = (): void => {
    window.removeEventListener("online", flush);
    window.removeEventListener("focus", flush);
    window.removeEventListener(LOCAL_PBI_AUTHORSHIP_OUTBOX_EVENT, flush);
    document.removeEventListener("visibilitychange", onVisible);
    if (runtimeUninstall === uninstall) runtimeUninstall = null;
  };

  runtimeUninstall = uninstall;
  window.addEventListener("online", flush);
  window.addEventListener("focus", flush);
  window.addEventListener(LOCAL_PBI_AUTHORSHIP_OUTBOX_EVENT, flush);
  document.addEventListener("visibilitychange", onVisible);
  flush();
  return uninstall;
}
