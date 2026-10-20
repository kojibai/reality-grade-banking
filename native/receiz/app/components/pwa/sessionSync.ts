"use client";

export const SERVICE_WORKER_SESSION_SYNC_EVENT = "receiz:session-sync";
const SERVICE_WORKER_LOCAL_ACTOR_STORAGE_KEY = "receiz.pwa.local-actor-namespace.v1";

function normalizeActorNamespace(value: string | null | undefined): string | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return null;
  const normalized = raw.replace(/[^a-z0-9:_-]+/g, "");
  return normalized ? normalized.slice(0, 160) : null;
}

function readStoredLocalActorNamespace(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeActorNamespace(window.localStorage.getItem(SERVICE_WORKER_LOCAL_ACTOR_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredLocalActorNamespace(actorNamespace: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (actorNamespace) {
      window.localStorage.setItem(SERVICE_WORKER_LOCAL_ACTOR_STORAGE_KEY, actorNamespace);
    } else {
      window.localStorage.removeItem(SERVICE_WORKER_LOCAL_ACTOR_STORAGE_KEY);
    }
  } catch {
    // best-effort only
  }
}

async function postMessageToServiceWorkers(
  message: Record<string, unknown>,
  registration?: ServiceWorkerRegistration | null,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const resolvedRegistration = registration ?? (await navigator.serviceWorker.getRegistration("/"));
    if (!resolvedRegistration) return;

    const targets = [resolvedRegistration.active, resolvedRegistration.waiting, resolvedRegistration.installing].filter(
      (worker): worker is ServiceWorker => Boolean(worker),
    );
    for (const target of targets) {
      target.postMessage(message);
    }
  } catch {
    // best-effort only
  }
}

export function requestServiceWorkerSessionSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SERVICE_WORKER_SESSION_SYNC_EVENT));
}

export function setServiceWorkerLocalActorNamespace(actorNamespace: string | null): void {
  const normalized = normalizeActorNamespace(actorNamespace);
  writeStoredLocalActorNamespace(normalized);
  void postMessageToServiceWorkers({
    type: "SET_LOCAL_ACTOR_NAMESPACE",
    actorNamespace: normalized,
  });
}

export async function syncStoredLocalActorNamespaceToServiceWorker(
  registration?: ServiceWorkerRegistration | null,
): Promise<void> {
  const actorNamespace = readStoredLocalActorNamespace();
  if (!actorNamespace) return;
  await postMessageToServiceWorkers(
    {
      type: "SET_LOCAL_ACTOR_NAMESPACE",
      actorNamespace,
    },
    registration,
  );
}

export async function clearServiceWorkerSessionState(): Promise<void> {
  writeStoredLocalActorNamespace(null);
  await postMessageToServiceWorkers({
    type: "CLEAR_SESSION_STATE",
  });
}
