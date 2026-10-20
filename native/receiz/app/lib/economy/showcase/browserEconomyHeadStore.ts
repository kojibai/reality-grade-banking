"use client";

import { ECONOMY_SHOWCASE_ARTIFACT_ID } from "./types";

export const BROWSER_ECONOMY_DATABASE_NAME =
  "receiz-economy-showcase-edge-v1";
export const BROWSER_ECONOMY_LEGACY_HEAD_STORE = "sealed-heads";
export const BROWSER_ECONOMY_ADMISSION_STORE =
  "immutable-economy-admissions";
export const BROWSER_PROFILE_ADMISSION_STORE =
  "immutable-profile-admissions";
export const BROWSER_ECONOMY_ACTIVE_HEAD_STORE = "active-economy-head";

export type StoredBrowserEconomyAdmission = Readonly<{
  artifactDigest: string;
  exactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>;

type StoredActiveHead = Readonly<{
  artifactId: typeof ECONOMY_SHOWCASE_ARTIFACT_ID;
  artifactDigest: string;
}>;

export type BrowserEconomyHeadAdvanceResult =
  | Readonly<{ status: "advanced" }>
  | Readonly<{
    status: "conflict";
    activeArtifactDigest: string | null;
  }>;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function openBrowserEconomyDatabase(input: Readonly<{
  indexedDB: IDBFactory;
  databaseName?: string;
}>): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = input.indexedDB.open(
      input.databaseName?.trim() || BROWSER_ECONOMY_DATABASE_NAME,
      2,
    );
    request.onupgradeneeded = () => {
      const database = request.result;
      if (
        !database.objectStoreNames.contains(
          BROWSER_ECONOMY_LEGACY_HEAD_STORE,
        )
      ) {
        database.createObjectStore(BROWSER_ECONOMY_LEGACY_HEAD_STORE, {
          keyPath: "artifactId",
        });
      }
      if (
        !database.objectStoreNames.contains(
          BROWSER_ECONOMY_ADMISSION_STORE,
        )
      ) {
        database.createObjectStore(BROWSER_ECONOMY_ADMISSION_STORE, {
          keyPath: "artifactDigest",
        });
      }
      if (
        !database.objectStoreNames.contains(
          BROWSER_PROFILE_ADMISSION_STORE,
        )
      ) {
        database.createObjectStore(BROWSER_PROFILE_ADMISSION_STORE, {
          keyPath: "artifactDigest",
        });
      }
      if (
        !database.objectStoreNames.contains(
          BROWSER_ECONOMY_ACTIVE_HEAD_STORE,
        )
      ) {
        database.createObjectStore(BROWSER_ECONOMY_ACTIVE_HEAD_STORE, {
          keyPath: "artifactId",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readBrowserEconomyActiveHead(input: Readonly<{
  indexedDB: IDBFactory;
  databaseName?: string;
}>): Promise<string | null> {
  const database = await openBrowserEconomyDatabase(input);
  try {
    const active = await requestResult(
      database.transaction(
        BROWSER_ECONOMY_ACTIVE_HEAD_STORE,
        "readonly",
      )
        .objectStore(BROWSER_ECONOMY_ACTIVE_HEAD_STORE)
        .get(ECONOMY_SHOWCASE_ARTIFACT_ID),
    ) as StoredActiveHead | undefined;
    return active?.artifactDigest ?? null;
  } finally {
    database.close();
  }
}

export async function readBrowserEconomyAdmissionByDigest(
  input: Readonly<{
    indexedDB: IDBFactory;
    databaseName?: string;
    store: "economy" | "profile";
    artifactDigest: string;
  }>,
): Promise<StoredBrowserEconomyAdmission | null> {
  const database = await openBrowserEconomyDatabase(input);
  const storeName = input.store === "economy"
    ? BROWSER_ECONOMY_ADMISSION_STORE
    : BROWSER_PROFILE_ADMISSION_STORE;
  try {
    const stored = await requestResult(
      database.transaction(storeName, "readonly")
        .objectStore(storeName)
        .get(input.artifactDigest),
    ) as StoredBrowserEconomyAdmission | undefined;
    return stored ?? null;
  } finally {
    database.close();
  }
}

export async function readBrowserEconomyLegacyHead(input: Readonly<{
  indexedDB: IDBFactory;
  databaseName?: string;
}>): Promise<
  | (Omit<StoredBrowserEconomyAdmission, "artifactDigest"> & {
      artifactId: typeof ECONOMY_SHOWCASE_ARTIFACT_ID;
    })
  | null
> {
  const database = await openBrowserEconomyDatabase(input);
  try {
    const stored = await requestResult(
      database.transaction(
        BROWSER_ECONOMY_LEGACY_HEAD_STORE,
        "readonly",
      )
        .objectStore(BROWSER_ECONOMY_LEGACY_HEAD_STORE)
        .get(ECONOMY_SHOWCASE_ARTIFACT_ID),
    ) as
      | (Omit<StoredBrowserEconomyAdmission, "artifactDigest"> & {
          artifactId: typeof ECONOMY_SHOWCASE_ARTIFACT_ID;
        })
      | undefined;
    return stored ?? null;
  } finally {
    database.close();
  }
}

export async function writeEconomyAdmissionsAndCompareAdvance(
  input: Readonly<{
    indexedDB: IDBFactory;
    databaseName?: string;
    predecessor: StoredBrowserEconomyAdmission;
    successor: StoredBrowserEconomyAdmission;
    profile: StoredBrowserEconomyAdmission;
    expectedPredecessorDigest: string | null;
  }>,
): Promise<BrowserEconomyHeadAdvanceResult> {
  const database = await openBrowserEconomyDatabase(input);
  try {
    const transaction = database.transaction([
      BROWSER_ECONOMY_ADMISSION_STORE,
      BROWSER_PROFILE_ADMISSION_STORE,
      BROWSER_ECONOMY_ACTIVE_HEAD_STORE,
    ], "readwrite");
    transaction.objectStore(BROWSER_ECONOMY_ADMISSION_STORE)
      .put(input.predecessor);
    transaction.objectStore(BROWSER_ECONOMY_ADMISSION_STORE)
      .put(input.successor);
    transaction.objectStore(BROWSER_PROFILE_ADMISSION_STORE)
      .put(input.profile);
    const activeStore = transaction.objectStore(
      BROWSER_ECONOMY_ACTIVE_HEAD_STORE,
    );
    const active = await requestResult(
      activeStore.get(ECONOMY_SHOWCASE_ARTIFACT_ID),
    ) as StoredActiveHead | undefined;
    const activeArtifactDigest = active?.artifactDigest ?? null;
    const advanced =
      activeArtifactDigest === input.expectedPredecessorDigest;
    if (advanced) {
      activeStore.put({
        artifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
        artifactDigest: input.successor.artifactDigest,
      } satisfies StoredActiveHead);
    }
    await transactionComplete(transaction);
    return advanced
      ? { status: "advanced" }
      : { status: "conflict", activeArtifactDigest };
  } finally {
    database.close();
  }
}

export async function retryBrowserEconomyAppend<T>(
  input: Readonly<{
    maxAttempts: number;
    attempt(): Promise<
      | Readonly<{ status: "advanced"; value: T }>
      | Readonly<{ status: "conflict" }>
    >;
  }>,
): Promise<T> {
  if (!Number.isSafeInteger(input.maxAttempts) || input.maxAttempts < 1) {
    throw new TypeError("ECONOMY_SHOWCASE_HEAD_RETRY_BOUND_REQUIRED");
  }
  for (let attempt = 0; attempt < input.maxAttempts; attempt += 1) {
    const result = await input.attempt();
    if (result.status === "advanced") return result.value;
  }
  throw new TypeError(
    "ECONOMY_SHOWCASE_HEAD_CONFLICT_RETRY_EXHAUSTED",
  );
}
