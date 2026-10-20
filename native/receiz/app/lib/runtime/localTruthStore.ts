import { sha256Hex } from "@/app/utils/sha256";

const DURABLE_LOCAL_TRUTH_SCHEMA = "receiz.local.truth.v1";
const DEFAULT_LOCAL_TRUTH_RANK = 0;
const DEFAULT_ATOMIC_TRANSFORM_ATTEMPTS = 4;
const MAX_ATOMIC_TRANSFORM_ATTEMPTS = 8;
const DURABLE_LOCAL_TRUTH_ATOMIC_LOCK_PREFIX =
  "receiz:durable-local-truth:";

export const DURABLE_LOCAL_TRUTH_RANK = {
  experienceSeed: 10,
  deterministicSnapshot: 40,
  authenticatedSnapshot: 60,
  verifiedRegisterBlock: 80,
} as const;

export type DurableLocalTruthWriteOptions = {
  rank?: number;
  source?: string;
  allowDowngrade?: boolean;
  allowSameRankOverwrite?: boolean;
};

export type DurableLocalTruthRemoveOptions = {
  /**
   * Refuse removal when the stored entry is stronger than this rank.
   * Example: maxRank: DURABLE_LOCAL_TRUTH_RANK.experienceSeed only clears seeds.
   */
  maxRank?: number;

  /**
   * Only remove when the stored entry came from this source.
   * Useful when a cleanup path should not delete another authority's truth.
   */
  source?: string;

  /**
   * Explicit escape hatch for true sign-out, confirmed account mismatch,
   * or destructive reset flows.
   */
  allowStrongerRemoval?: boolean;
};

export type DurableLocalTruthEntry = {
  schema: typeof DURABLE_LOCAL_TRUTH_SCHEMA;
  storedAtMs: number;
  revision: number;
  rank: number;
  source: string;
  payload: string;
};

export type DurableLocalTruthStoredEntry = {
  storageKey: string;
  entry: DurableLocalTruthEntry;
};

export type DurableLocalTruthAtomicTransformOptions =
  DurableLocalTruthWriteOptions & {
    expectedSnapshot?: DurableLocalTruthAtomicSnapshot;
    maxAttempts?: number;
  };

export type DurableLocalTruthAtomicSnapshot = {
  raw: string | null;
  entry: DurableLocalTruthEntry | null;
};

export type DurableLocalTruthAtomicTransformResult = {
  payload: string;
  revision: number;
  payloadDigestSha256: string;
  attempts: number;
  conflicts: number;
  changed: boolean;
};

export function hasDurableLocalTruthStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function normalizeTruthRank(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : DEFAULT_LOCAL_TRUTH_RANK;
}

function normalizeTruthSource(value: unknown): string {
  if (typeof value !== "string") return "unknown";

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, 120) : "unknown";
}

function normalizeTruthRevision(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function parseDurableLocalTruthEntry(raw: string): DurableLocalTruthEntry | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DurableLocalTruthEntry> | null;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema !== DURABLE_LOCAL_TRUTH_SCHEMA) return null;
    if (!Number.isFinite(parsed.storedAtMs)) return null;
    if (typeof parsed.payload !== "string") return null;

    return {
      schema: DURABLE_LOCAL_TRUTH_SCHEMA,
      storedAtMs: Number(parsed.storedAtMs),
      revision: normalizeTruthRevision(parsed.revision),
      rank: normalizeTruthRank(parsed.rank),
      source: normalizeTruthSource(parsed.source),
      payload: parsed.payload,
    };
  } catch {
    return null;
  }
}

function asDurableLocalTruthEntry(raw: string): DurableLocalTruthEntry {
  return (
    parseDurableLocalTruthEntry(raw) ?? {
      schema: DURABLE_LOCAL_TRUTH_SCHEMA,
      storedAtMs: 0,
      revision: 0,
      rank: DEFAULT_LOCAL_TRUTH_RANK,
      source: "legacy",
      payload: raw,
    }
  );
}

function serializeDurableLocalTruthEntry(
  payload: string,
  options?: DurableLocalTruthWriteOptions,
  revision = 1,
): string {
  const entry: DurableLocalTruthEntry = {
    schema: DURABLE_LOCAL_TRUTH_SCHEMA,
    storedAtMs: Date.now(),
    revision: normalizeTruthRevision(revision),
    rank: normalizeTruthRank(options?.rank),
    source: normalizeTruthSource(options?.source),
    payload,
  };

  return JSON.stringify(entry);
}

function canRemoveDurableLocalTruthEntry(
  entry: DurableLocalTruthEntry | null,
  options?: DurableLocalTruthRemoveOptions,
): boolean {
  if (!entry) return true;

  if (!options) return true;

  const expectedSource = options.source ? normalizeTruthSource(options.source) : null;

  if (expectedSource && entry.source !== expectedSource) {
    return false;
  }

  const maxRank =
    typeof options.maxRank === "number" && Number.isFinite(options.maxRank)
      ? normalizeTruthRank(options.maxRank)
      : null;

  if (maxRank !== null && entry.rank > maxRank && options.allowStrongerRemoval !== true) {
    return false;
  }

  return true;
}

export function readDurableLocalTruthEntry(storageKey: string): DurableLocalTruthEntry | null {
  return readDurableLocalTruthAtomicSnapshot(storageKey).entry;
}

export function readDurableLocalTruthAtomicSnapshot(
  storageKey: string,
): DurableLocalTruthAtomicSnapshot {
  if (!hasDurableLocalTruthStorage()) {
    return {
      raw: null,
      entry: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    return {
      raw,
      entry: raw === null ? null : asDurableLocalTruthEntry(raw),
    };
  } catch {
    return {
      raw: null,
      entry: null,
    };
  }
}

export function readDurableLocalTruthItem(storageKey: string): string | null {
  return readDurableLocalTruthEntry(storageKey)?.payload ?? null;
}

export function readDurableLocalTruthEntriesByPrefix(
  storageKeyPrefix: string,
  options: { source?: string } = {},
): DurableLocalTruthStoredEntry[] {
  if (!hasDurableLocalTruthStorage()) return [];
  if (typeof window.localStorage.key !== "function") return [];

  const expectedSource = options.source
    ? normalizeTruthSource(options.source)
    : null;
  const matches: DurableLocalTruthStoredEntry[] = [];

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const storageKey = window.localStorage.key(index);
      if (!storageKey?.startsWith(storageKeyPrefix)) continue;
      const entry = readDurableLocalTruthEntry(storageKey);
      if (!entry || (expectedSource && entry.source !== expectedSource)) continue;
      matches.push({ storageKey, entry });
    }
  } catch {
    return [];
  }

  return matches;
}

export function writeDurableLocalTruthItem(
  storageKey: string,
  value: string,
  options?: DurableLocalTruthWriteOptions,
): void {
  if (!hasDurableLocalTruthStorage()) return;

  try {
    const current = readDurableLocalTruthEntry(storageKey);
    const nextRank = normalizeTruthRank(options?.rank);

    if (current && !options?.allowDowngrade && current.rank > nextRank) {
      return;
    }

    if (
      current &&
      !options?.allowSameRankOverwrite &&
      current.rank === nextRank &&
      nextRank >= DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock &&
      current.payload !== value
    ) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      serializeDurableLocalTruthEntry(
        value,
        options,
        (current?.revision ?? 0) + 1,
      ),
    );
  } catch {
    // Storage availability can fail; known in-memory truth remains authoritative for the active surface.
  }
}

type DurableLocalTruthAtomicState = {
  raw: string | null;
  entry: DurableLocalTruthEntry | null;
  revision: number;
  payload: string | null;
  payloadDigestSha256: string;
};

type CrossContextLockManager = {
  request<T>(
    name: string,
    callback: (lock: unknown) => Promise<T> | T,
  ): Promise<T>;
};

function atomicTransformAttempts(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_ATOMIC_TRANSFORM_ATTEMPTS;
  }
  return Math.max(
    1,
    Math.min(MAX_ATOMIC_TRANSFORM_ATTEMPTS, Math.trunc(value)),
  );
}

async function atomicSnapshot(
  raw: string | null,
): Promise<DurableLocalTruthAtomicState> {
  const entry = raw === null ? null : asDurableLocalTruthEntry(raw);
  const payload = entry?.payload ?? null;
  return {
    raw,
    entry,
    revision: entry?.revision ?? 0,
    payload,
    payloadDigestSha256: await sha256Hex(
      JSON.stringify({
        present: entry !== null,
        payload,
      }),
    ),
  };
}

function sameAtomicSnapshot(
  left: DurableLocalTruthAtomicState,
  right: DurableLocalTruthAtomicState,
): boolean {
  return left.raw === right.raw
    && left.revision === right.revision
    && left.payloadDigestSha256 === right.payloadDigestSha256
    && left.payload === right.payload;
}

function readAtomicRaw(storageKey: string): string | null {
  return window.localStorage.getItem(storageKey);
}

function crossContextLockManager(): CrossContextLockManager | null {
  try {
    if (
      typeof navigator === "undefined"
      || !navigator.locks
      || typeof navigator.locks.request !== "function"
    ) {
      return null;
    }
    return navigator.locks as CrossContextLockManager;
  } catch {
    return null;
  }
}

export function durableLocalTruthAtomicLockName(storageKey: string): string {
  return `${DURABLE_LOCAL_TRUTH_ATOMIC_LOCK_PREFIX}${storageKey}`;
}

export async function transformDurableLocalTruthItemAtomically(
  storageKey: string,
  update: (payload: string | null) => string | Promise<string>,
  options?: DurableLocalTruthAtomicTransformOptions,
): Promise<DurableLocalTruthAtomicTransformResult> {
  if (!hasDurableLocalTruthStorage()) {
    throw new Error("durable_local_truth_atomic_storage_unavailable");
  }
  const lockManager = crossContextLockManager();
  if (!lockManager) {
    throw new Error("durable_local_truth_atomic_lock_unavailable");
  }
  const maxAttempts = atomicTransformAttempts(options?.maxAttempts);
  let expected = await atomicSnapshot(
    options?.expectedSnapshot
      ? options.expectedSnapshot.raw
      : readAtomicRaw(storageKey),
  );

  return lockManager.request(
    durableLocalTruthAtomicLockName(storageKey),
    async () => {
      let conflicts = 0;
      for (let attempts = 1; attempts <= maxAttempts; attempts += 1) {
        const current = await atomicSnapshot(readAtomicRaw(storageKey));
        if (!sameAtomicSnapshot(current, expected)) {
          conflicts += 1;
          expected = current;
          if (attempts === maxAttempts) break;
          continue;
        }

        const nextPayload = await update(current.payload);
        if (typeof nextPayload !== "string") {
          throw new TypeError("durable_local_truth_atomic_payload_invalid");
        }
        const latest = await atomicSnapshot(readAtomicRaw(storageKey));
        const latestEntry = latest.entry;
        if (!sameAtomicSnapshot(latest, current)) {
          conflicts += 1;
          expected = latest;
          if (attempts === maxAttempts) break;
          continue;
        }

        const nextRank = normalizeTruthRank(options?.rank);
        if (
          latestEntry
          && options?.allowDowngrade !== true
          && latestEntry.rank > nextRank
        ) {
          return {
            payload: latestEntry.payload,
            revision: latestEntry.revision,
            payloadDigestSha256: latest.payloadDigestSha256,
            attempts,
            conflicts,
            changed: false,
          };
        }
        if (
          latestEntry
          && options?.allowSameRankOverwrite !== true
          && latestEntry.rank === nextRank
          && nextRank >= DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock
          && latestEntry.payload !== nextPayload
        ) {
          return {
            payload: latestEntry.payload,
            revision: latestEntry.revision,
            payloadDigestSha256: latest.payloadDigestSha256,
            attempts,
            conflicts,
            changed: false,
          };
        }
        if (latestEntry?.payload === nextPayload) {
          return {
            payload: nextPayload,
            revision: latestEntry.revision,
            payloadDigestSha256: latest.payloadDigestSha256,
            attempts,
            conflicts,
            changed: false,
          };
        }

        const nextRevision = latest.revision + 1;
        const serialized = serializeDurableLocalTruthEntry(
          nextPayload,
          options,
          nextRevision,
        );
        window.localStorage.setItem(storageKey, serialized);
        const committed = await atomicSnapshot(readAtomicRaw(storageKey));
        if (committed.raw === serialized) {
          return {
            payload: nextPayload,
            revision: nextRevision,
            payloadDigestSha256: committed.payloadDigestSha256,
            attempts,
            conflicts,
            changed: true,
          };
        }

        conflicts += 1;
        expected = committed;
        if (attempts === maxAttempts) break;
      }

      throw new Error("durable_local_truth_atomic_conflict");
    },
  );
}

export function removeDurableLocalTruthItem(storageKey: string, options?: DurableLocalTruthRemoveOptions): void {
  if (!hasDurableLocalTruthStorage()) return;

  try {
    const current = readDurableLocalTruthEntry(storageKey);

    if (!canRemoveDurableLocalTruthEntry(current, options)) {
      return;
    }

    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore cleanup failures.
  }
}
