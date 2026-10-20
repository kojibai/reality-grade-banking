"use client";

import {
  encodeSignalRunCardClaimCompact,
  signalRunCardArtDirective,
  type SignalRunCardClaim,
  type SignalRunCardKind,
} from "@/app/lib/game/signalRunCard";

export type SignalRunCardGeneratedArt = {
  schema: "receiz.signal_run.card.generated_art.v1";
  collectibleId: string;
  claimHash: string;
  renderId: string;
  subjectName: string;
  subjectKind: SignalRunCardKind;
  provider: string;
  model: string;
  mime: "image/png";
  sha256Hex: string;
  promptHash: string;
  imageDataUrl: string;
  createdAtMs: number;
};

const memoryArt = new Map<string, SignalRunCardGeneratedArt>();
const pendingArt = new Map<string, Promise<SignalRunCardGeneratedArt | null>>();
const ART_DB_NAME = "receiz.signal_run.card_art.db.v1";
const ART_DB_STORE = "generated_art";
let artDbPromise: Promise<IDBDatabase | null> | null = null;

function storageKey(claimHash: string): string {
  return `receiz.signal_run.card_art.v1:${claimHash}`;
}

function openSignalRunCardArtDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  if (artDbPromise) return artDbPromise;

  artDbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(ART_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ART_DB_STORE)) {
          db.createObjectStore(ART_DB_STORE, { keyPath: "claimHash" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return artDbPromise;
}

function isSignalRunCardGeneratedArt(value: unknown, claim: SignalRunCardClaim): value is SignalRunCardGeneratedArt {
  if (!value || typeof value !== "object") return false;
  const art = value as Partial<SignalRunCardGeneratedArt>;
  return art.schema === "receiz.signal_run.card.generated_art.v1" &&
    art.collectibleId === claim.collectibleId &&
    art.claimHash === claim.claimHash &&
    typeof art.renderId === "string" &&
    typeof art.subjectName === "string" &&
    art.subjectName.trim().length > 0 &&
    typeof art.subjectKind === "string" &&
    art.subjectKind.trim().length > 0 &&
    art.mime === "image/png" &&
    typeof art.sha256Hex === "string" &&
    typeof art.promptHash === "string" &&
    typeof art.imageDataUrl === "string" &&
    art.imageDataUrl.toLowerCase().startsWith("data:image/png;");
}

function readStoredArt(claim: SignalRunCardClaim): SignalRunCardGeneratedArt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(claim.claimHash));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isSignalRunCardGeneratedArt(parsed, claim) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredArt(art: SignalRunCardGeneratedArt): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(art.claimHash), JSON.stringify(art));
  } catch {
    // The sealed card asset still carries the realized art even if browser storage is full.
  }
}

async function readIndexedDbArt(claim: SignalRunCardClaim): Promise<SignalRunCardGeneratedArt | null> {
  const db = await openSignalRunCardArtDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const request = db.transaction(ART_DB_STORE, "readonly").objectStore(ART_DB_STORE).get(claim.claimHash);
      request.onsuccess = () => {
        const parsed = request.result as unknown;
        resolve(isSignalRunCardGeneratedArt(parsed, claim) ? parsed : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeIndexedDbArt(art: SignalRunCardGeneratedArt): void {
  void openSignalRunCardArtDb().then((db) => {
    if (!db) return;
    try {
      db.transaction(ART_DB_STORE, "readwrite").objectStore(ART_DB_STORE).put(art);
    } catch {
      // LocalStorage and the sealed asset remain available if IndexedDB is blocked.
    }
  });
}

export function storeSignalRunCardArt(art: SignalRunCardGeneratedArt): void {
  memoryArt.set(art.claimHash, art);
  writeStoredArt(art);
  writeIndexedDbArt(art);
}

export function parseSignalRunCardGeneratedArtText(
  text: string | null | undefined,
  claim: SignalRunCardClaim,
): SignalRunCardGeneratedArt | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return isSignalRunCardGeneratedArt(parsed, claim) ? parsed : null;
  } catch {
    return null;
  }
}

export function readSignalRunCardArt(claim: SignalRunCardClaim): SignalRunCardGeneratedArt | null {
  const cached = memoryArt.get(claim.claimHash);
  if (cached && cached.collectibleId === claim.collectibleId) return cached;
  const stored = readStoredArt(claim);
  if (stored) {
    memoryArt.set(claim.claimHash, stored);
    writeIndexedDbArt(stored);
  }
  return stored;
}

export async function readSignalRunCardArtAsync(claim: SignalRunCardClaim): Promise<SignalRunCardGeneratedArt | null> {
  const cached = readSignalRunCardArt(claim);
  if (cached) return cached;
  const stored = await readIndexedDbArt(claim);
  if (!stored) return null;
  memoryArt.set(claim.claimHash, stored);
  writeStoredArt(stored);
  return stored;
}

export async function readPersistedSignalRunCardArtFromServer(claim: SignalRunCardClaim): Promise<SignalRunCardGeneratedArt | null> {
  const params = new URLSearchParams({
    claim: encodeSignalRunCardClaimCompact(claim),
  });
  const response = await fetch(`/api/game/signal-run/cards/art?${params.toString()}`, {
    cache: "no-store",
    credentials: "same-origin",
  }).catch(() => null);
  if (!response?.ok) return null;
  const payload = (await response.json().catch(() => null)) as { art?: unknown } | null;
  return isSignalRunCardGeneratedArt(payload?.art, claim) ? payload.art : null;
}

export async function hydrateSignalRunCardArt(claim: SignalRunCardClaim): Promise<SignalRunCardGeneratedArt | null> {
  const local = await readSignalRunCardArtAsync(claim);
  if (local) return local;
  const persisted = await readPersistedSignalRunCardArtFromServer(claim);
  if (persisted) storeSignalRunCardArt(persisted);
  return persisted;
}

export async function ensureSignalRunCardArt(claim: SignalRunCardClaim): Promise<SignalRunCardGeneratedArt | null> {
  const cached = await readSignalRunCardArtAsync(claim);
  if (cached) return cached;
  const existing = pendingArt.get(claim.claimHash);
  if (existing) return existing;

  const promise = (async () => {
    const directive = signalRunCardArtDirective(claim);
    const response = await fetch("/api/game/signal-run/cards/art", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claim: encodeSignalRunCardClaimCompact(claim),
        renderId: directive.renderId,
      }),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as { ok?: unknown; art?: unknown } | null;
    if (!response.ok || payload?.ok !== true || !isSignalRunCardGeneratedArt(payload.art, claim)) return null;
    storeSignalRunCardArt(payload.art);
    return payload.art;
  })().catch(() => null).finally(() => {
    pendingArt.delete(claim.claimHash);
  });

  pendingArt.set(claim.claimHash, promise);
  return promise;
}
