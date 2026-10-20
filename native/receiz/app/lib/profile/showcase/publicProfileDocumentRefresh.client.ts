"use client";

export type AcceptedPublicProfileDocumentHead = Readonly<{
  username: string;
  artifactDigest: string;
  operationCount: number;
  runtimeId?: string;
  /** Exact Source-bound public membership stamp; it is not ordered by digest. */
  publicInventoryRevision?: string;
}>;

export type PublicProfileDocumentRefresh = "held" | "pending" | "unavailable";

const requestedHeads = new Map<string, AcceptedPublicProfileDocumentHead>();
const heldDocumentHeads = new Map<string, AcceptedPublicProfileDocumentHead>();
const documentRequests = new WeakMap<ServiceWorker, Map<string, Promise<PublicProfileDocumentRefresh>>>();
const documentWakeListeners = new Set<() => void>();

/** Controller readiness renews representation custody beneath already admitted
 * source. It never changes the visible route or repeats source admission. */
export function installAcceptedPublicProfileDocumentRuntime(): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const container = navigator.serviceWorker;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let queued = false;
  let attempt = 0;
  const wake = (): void => {
    if (stopped) return;
    if (running) { queued = true; return; }
    if (timer !== null) clearTimeout(timer);
    timer = null;
    running = true;
    const heads = new Map([...requestedHeads, ...[...heldDocumentHeads.values()].map(head => [documentHeadKey(head), head] as const)]);
    void Promise.all([...heads.values()].map(requestAcceptedPublicProfileDocument))
      .then(results => {
        if (results.includes("pending")) {
          const delay = Math.min(60_000, 2_000 * 2 ** attempt++);
          if (!stopped) timer = setTimeout(wake, delay);
        } else attempt = 0;
      }).finally(() => {
        running = false;
        if (queued && !stopped) { queued = false; queueMicrotask(wake); }
      });
  };
  container.addEventListener("controllerchange", wake);
  documentWakeListeners.add(wake);
  if (typeof window !== "undefined") window.addEventListener("online", wake);
  queueMicrotask(wake);
  return () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    container.removeEventListener("controllerchange", wake);
    documentWakeListeners.delete(wake);
    if (typeof window !== "undefined") window.removeEventListener("online", wake);
  };
}

function documentHeadKey(head: AcceptedPublicProfileDocumentHead): string {
  return `${head.username}:${head.artifactDigest}:${head.operationCount}:${head.publicInventoryRevision ?? ""}`;
}

/** Advance the browser's held anonymous document only after the worker admits
 * the exact server-rendered sealed successor. This does not alter the screen. */
export async function refreshAcceptedPublicProfileDocument(
  head: AcceptedPublicProfileDocumentHead,
): Promise<PublicProfileDocumentRefresh> {
  const runtimeId = (head.runtimeId ?? process.env.NEXT_PUBLIC_RECEIZ_PROFILE_RUNTIME_ID ?? "").trim();
  if (runtimeId) head = { ...head, runtimeId };
  if (!/^[a-z0-9_]{3,24}$/.test(head.username)
    || !/^[a-f0-9]{64}$/.test(head.artifactDigest)
    || !Number.isSafeInteger(head.operationCount) || head.operationCount < 0
    || (head.publicInventoryRevision !== undefined && !/^[A-Za-z0-9._:-]{1,200}$/.test(head.publicInventoryRevision))) return "pending";
  const headKey = documentHeadKey(head);
  const prior = requestedHeads.get(headKey);
  // A requested head is retry intent, not admission or authority. Only the
  // worker's exact held document may reject an older/conflicting successor.
  requestedHeads.set(headKey, Object.freeze({ ...head }));
  if (!prior || prior.artifactDigest !== head.artifactDigest || prior.operationCount !== head.operationCount
    || prior.runtimeId !== head.runtimeId)
    queueMicrotask(() => { for (const wake of documentWakeListeners) wake(); });
  return requestAcceptedPublicProfileDocument(head);
}

/** Retry the recorded exact coordinate without manufacturing another intent. */
async function requestAcceptedPublicProfileDocument(head: AcceptedPublicProfileDocumentHead): Promise<PublicProfileDocumentRefresh> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return "unavailable";
  const worker = navigator.serviceWorker.controller;
  if (!worker) return "unavailable";
  let requests = documentRequests.get(worker);
  if (!requests) { requests = new Map(); documentRequests.set(worker, requests); }
  const key = `${documentHeadKey(head)}:${head.runtimeId ?? ""}`;
  const existing = requests.get(key);
  if (existing) return existing;

  const predecessor = heldDocumentHeads.get(head.username);
  const capturedRequests = new Set(requestedHeads.keys());
  const request = new Promise<PublicProfileDocumentRefresh>((resolve) => {
    const channel = new MessageChannel();
    let settled = false;
    const finish = (accepted: PublicProfileDocumentRefresh) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      if (accepted === "held") {
        const known = heldDocumentHeads.get(head.username);
        // A digest is equality only. An ACK may replace its captured
        // predecessor, never a distinct revision admitted while it waited.
        if (known && (known.operationCount > head.operationCount
          || known.operationCount === head.operationCount
            && documentHeadKey(known) !== documentHeadKey(head) && known !== predecessor)) {
          resolve("pending");
          return;
        }
        heldDocumentHeads.set(head.username, head);
        // Retire only intent captured by this request. A later announced
        // membership revision remains pending until its own exact ACK.
        for (const [key, requested] of requestedHeads)
          if (requested.username === head.username && capturedRequests.has(key)
            && requested.operationCount <= head.operationCount) requestedHeads.delete(key);
      }
      resolve(accepted);
    };
    const timeout = setTimeout(() => finish("pending"), 120_000);
    channel.port1.onmessage = (event: MessageEvent) => {
      const value = event.data;
      finish(value?.status === "accepted"
        && value.artifactDigest === head.artifactDigest
        && value.operationCount === head.operationCount
        && (head.publicInventoryRevision === undefined || value.publicInventoryRevision === head.publicInventoryRevision) ? "held" : "pending");
    };
    try {
      worker.postMessage({ type: "REFRESH_ACCEPTED_PUBLIC_PROFILE_DOCUMENT", ...head }, [channel.port2]);
    } catch {
      finish("pending");
    }
  }).finally(() => { if (requests.get(key) === request) requests.delete(key); });
  requests.set(key, request);
  return request;
}
