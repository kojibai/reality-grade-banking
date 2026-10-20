import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { runtimeProjectionScopedStorageKey } from "@/app/lib/runtime/runtimeCoherence";
import {
  createContactsProjectionGenesis,
  createContactsProjectionSuccessor,
  verifyContactsAppendProjection,
  type ContactsAppendProjectionV1,
  type ContactsProjectionOperationInput,
} from "./appendProjection";
import type { ContactRecord } from "./types";

const CONTACTS_PROJECTION_STORAGE_KEY_BASE =
  "receiz.contacts.authenticated-append-projection.v1";
const CONTACTS_PROJECTION_STORAGE_SOURCE =
  "contacts-authenticated-append-projection";
const CONTACTS_PROJECTION_ADMITTED_EVENT =
  "receiz:contacts-append-projection-admitted";
const LEGACY_CONTACTS_PROJECTION_STORAGE_KEY_BASE =
  "receiz.contacts.proof-object.v1";
const contactsRecoveryRequests = new Map<string, Promise<ContactsAppendProjectionV1 | null>>();
const contactsLocalAppendRequests = new Map<string, Promise<ContactsAppendProjectionV1 | null>>();

function normalizedOwnerUid(ownerUid: string): string {
  return ownerUid.trim();
}

export function contactsAppendProjectionStorageKey(ownerUidInput: string): string {
  return `${CONTACTS_PROJECTION_STORAGE_KEY_BASE}.${normalizedOwnerUid(ownerUidInput)}`;
}

function legacyRuntimeStorageKey(ownerUid: string): string {
  return runtimeProjectionScopedStorageKey(
    LEGACY_CONTACTS_PROJECTION_STORAGE_KEY_BASE,
    ownerUid,
  );
}

function legacyStableStorageKey(ownerUid: string): string {
  return `${LEGACY_CONTACTS_PROJECTION_STORAGE_KEY_BASE}.${ownerUid}`;
}

function parseHeldContactsAppendProjection(
  raw: string | null,
  ownerUid: string,
): ContactsAppendProjectionV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as
      | (Partial<ContactsAppendProjectionV1> & { primitive?: unknown })
      | null;
    if (
      !parsed ||
      parsed.schema !== "receiz.contacts.composite-proof.v1" ||
      (
        parsed.classification !== "authenticated append projection" &&
        parsed.primitive !== "sealed composite proof object"
      ) ||
      parsed.complete !== true ||
      parsed.ownerUid !== ownerUid ||
      parsed.artifactId !== `contacts-register:${ownerUid}` ||
      typeof parsed.head !== "string" ||
      !parsed.head ||
      typeof parsed.projectionCommitment !== "string" ||
      !parsed.projectionCommitment ||
      !Number.isSafeInteger(parsed.operationCount) ||
      !Array.isArray(parsed.operations) ||
      !Array.isArray(parsed.contacts) ||
      !Array.isArray(parsed.archivedContactIds) ||
      parsed.operationCount !== parsed.operations.length
    ) {
      return null;
    }
    const { primitive: _legacyPrimitive, ...projection } = parsed;
    return {
      ...projection,
      classification: "authenticated append projection",
      authority: {
        classification: "authenticated-snapshot",
        outranksSealedTruth: false,
        strongerTruth: "sealed-receiz-proof-object",
      },
    } as ContactsAppendProjectionV1;
  } catch {
    return null;
  }
}

async function verifyHeldContactsAppendProjection(
  ownerUidInput: string,
  held: ContactsAppendProjectionV1,
): Promise<ContactsAppendProjectionV1 | null> {
  const ownerUid = normalizedOwnerUid(ownerUidInput);
  if (!ownerUid) return null;
  if (await verifyContactsAppendProjection(held)) return held;
  removeDurableLocalTruthItem(contactsAppendProjectionStorageKey(ownerUid), {
    maxRank: DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot,
    source: CONTACTS_PROJECTION_STORAGE_SOURCE,
  });
  return null;
}

export function peekContactsAppendProjection(
  ownerUidInput: string,
): ContactsAppendProjectionV1 | null {
  const ownerUid = normalizedOwnerUid(ownerUidInput);
  if (!ownerUid) return null;
  const stableKey = contactsAppendProjectionStorageKey(ownerUid);
  const stable = parseHeldContactsAppendProjection(
    readDurableLocalTruthItem(stableKey),
    ownerUid,
  );
  if (stable) return stable;

  const legacy =
    parseHeldContactsAppendProjection(
      readDurableLocalTruthItem(legacyStableStorageKey(ownerUid)),
      ownerUid,
    ) ??
    parseHeldContactsAppendProjection(
      readDurableLocalTruthItem(legacyRuntimeStorageKey(ownerUid)),
      ownerUid,
    );
  if (!legacy) return null;
  writeDurableLocalTruthItem(stableKey, JSON.stringify(legacy), {
    rank: DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot,
    source: CONTACTS_PROJECTION_STORAGE_SOURCE,
    allowSameRankOverwrite: true,
  });
  return parseHeldContactsAppendProjection(
    readDurableLocalTruthItem(stableKey),
    ownerUid,
  );
}

export async function admitContactsAppendProjection(
  candidate: unknown,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  if (!isCurrent() || !(await verifyContactsAppendProjection(candidate)) || !isCurrent()) return false;
  const next = candidate as ContactsAppendProjectionV1;
  const ownerUid = normalizedOwnerUid(next.ownerUid);
  if (!ownerUid || next.ownerUid !== ownerUid) return false;

  const heldCandidate = peekContactsAppendProjection(ownerUid);
  const held = heldCandidate
    ? await verifyHeldContactsAppendProjection(ownerUid, heldCandidate)
    : null;
  if (!isCurrent()) return false;
  if (held) {
    if (held.head === next.head) return true;
    if (held.contacts.length > 0 && next.contacts.length === 0) return false;
    if (next.operationCount <= held.operationCount) return false;
    if (next.predecessorHead !== held.head) return false;
  }

  writeDurableLocalTruthItem(
    contactsAppendProjectionStorageKey(ownerUid),
    JSON.stringify(next),
    {
    rank: DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot,
    source: CONTACTS_PROJECTION_STORAGE_SOURCE,
    allowSameRankOverwrite: true,
    },
  );

  return peekContactsAppendProjection(ownerUid)?.head === next.head;
}

type ContactsRecoveryFetcher = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

function contactsProjectionAnnouncementHead(
  projection: ContactsAppendProjectionV1,
): { id: string; updatedAtMs: number } | null {
  let head: { id: string; updatedAtMs: number } | null = null;
  const admit = (id: string, updatedAt: string): void => {
    const updatedAtMs = Date.parse(updatedAt);
    if (!id || !Number.isFinite(updatedAtMs)) return;
    if (!head || updatedAtMs > head.updatedAtMs || (updatedAtMs === head.updatedAtMs && id.localeCompare(head.id) > 0)) {
      head = { id, updatedAtMs };
    }
  };
  for (const contact of projection.contacts) admit(contact.id, contact.updatedAt || contact.createdAt);
  for (const operation of projection.operations) {
    const id = "contact" in operation
      ? operation.contact.id
      : "contactId" in operation
        ? operation.contactId
        : "primaryContactId" in operation
          ? operation.primaryContactId
          : "";
    admit(id, operation.effectiveAt);
  }
  return head;
}

async function remoteContactsAnnouncementIsNewer(
  ownerUid: string,
  held: ContactsAppendProjectionV1,
  fetcher: ContactsRecoveryFetcher,
): Promise<{ newer: boolean | null; recovered: ContactsAppendProjectionV1 | null }> {
  const response = await fetcher("/api/contacts?head=1", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    signedIn?: boolean;
    complete?: boolean;
    ownerUid?: string | null;
    head?: { id?: unknown; updatedAt?: unknown } | null;
    projection?: unknown;
    artifact?: unknown;
  } | null;
  if (!response.ok || payload?.ok !== true || payload.signedIn !== true || payload.complete !== true || payload.ownerUid !== ownerUid) {
    return { newer: null, recovered: null };
  }
  const recovered = payload.projection ?? payload.artifact;
  if (await verifyContactsAppendProjection(recovered)) {
    const projection = recovered as ContactsAppendProjectionV1;
    if (projection.ownerUid === ownerUid) return { newer: true, recovered: projection };
  }
  if (payload.head === null) return { newer: false, recovered: null };
  const remoteId = typeof payload.head?.id === "string" ? payload.head.id : "";
  const remoteUpdatedAt = typeof payload.head?.updatedAt === "string" ? Date.parse(payload.head.updatedAt) : Number.NaN;
  if (!remoteId || !Number.isFinite(remoteUpdatedAt)) return { newer: null, recovered: null };
  const local = contactsProjectionAnnouncementHead(held);
  if (!local) return { newer: true, recovered: null };
  return {
    newer: remoteUpdatedAt > local.updatedAtMs || (remoteUpdatedAt === local.updatedAtMs && remoteId.localeCompare(local.id) > 0),
    recovered: null,
  };
}

async function readAuthenticatedContactsProjection(
  fetcher: ContactsRecoveryFetcher,
): Promise<{
  ownerUid: string;
  projection: ContactsAppendProjectionV1;
} | null> {
  const response = await fetcher("/api/contacts", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    signedIn?: boolean;
    complete?: boolean;
    ownerUid?: string | null;
    projection?: unknown;
    artifact?: unknown;
  } | null;
  const ownerUid = normalizedOwnerUid(payload?.ownerUid ?? "");
  const projection = payload?.projection ?? payload?.artifact;
  if (
    !response.ok ||
    payload?.ok !== true ||
    payload.signedIn !== true ||
    payload.complete !== true ||
    !ownerUid ||
    !(await verifyContactsAppendProjection(projection)) ||
    (projection as ContactsAppendProjectionV1).ownerUid !== ownerUid
  ) {
    return null;
  }
  return {
    ownerUid,
    projection: projection as ContactsAppendProjectionV1,
  };
}

async function reconcileRecoveredContactsProjection(
  ownerUid: string,
  recovered: ContactsAppendProjectionV1,
): Promise<ContactsAppendProjectionV1 | null> {
  const heldCandidate = peekContactsAppendProjection(ownerUid);
  const held = heldCandidate
    ? await verifyHeldContactsAppendProjection(ownerUid, heldCandidate)
    : null;
  if (!held) {
    if (!(await admitContactsAppendProjection(recovered))) return null;
    const admitted = peekContactsAppendProjection(ownerUid);
    if (admitted) publishContactsAppendProjection(admitted);
    return admitted;
  }
  if (held.head === recovered.head) return held;
  if (held.contacts.length > 0 && recovered.contacts.length === 0) return held;
  const heldById = new Map(held.contacts.map((contact) => [contact.id, contact]));
  const heldArchived = new Set(held.archivedContactIds);
  const operations: ContactsProjectionOperationInput[] = [];

  for (const archivedContactId of recovered.archivedContactIds) {
    if (heldArchived.has(archivedContactId)) continue;
    if (!heldById.has(archivedContactId)) continue;
    operations.push({
      kind: "contact.archive",
      contactId: archivedContactId,
      effectiveAt: new Date().toISOString(),
    });
  }

  for (const contact of recovered.contacts) {
    const existing = heldById.get(contact.id);
    if (!existing) {
      operations.push({
        kind: "contact.append",
        contact,
        effectiveAt: contact.createdAt || contact.updatedAt,
      });
      continue;
    }
    if (!contactProjectionEqual(existing, contact)) {
      operations.push({
        kind: "contact.supersede",
        contact,
        effectiveAt: contact.updatedAt || new Date().toISOString(),
      });
    }
  }

  if (!operations.length) return held;
  const successor = await createContactsProjectionSuccessor(held, operations);
  if (!(await admitContactsAppendProjection(successor))) return null;
  publishContactsAppendProjection(successor);
  return successor;
}

export async function recoverCurrentSessionContactsAppendProjection(
  fetcher: ContactsRecoveryFetcher = fetch,
): Promise<{
  ownerUid: string;
  projection: ContactsAppendProjectionV1;
} | null> {
  try {
    const recovered = await readAuthenticatedContactsProjection(fetcher);
    if (!recovered) return null;
    const projection = await reconcileRecoveredContactsProjection(
      recovered.ownerUid,
      recovered.projection,
    );
    return projection
      ? { ownerUid: recovered.ownerUid, projection }
      : null;
  } catch {
    return null;
  }
}

export async function prewarmContactsAppendProjection(
  ownerUidInput: string,
  fetcher: ContactsRecoveryFetcher = fetch,
): Promise<ContactsAppendProjectionV1 | null> {
  const ownerUid = normalizedOwnerUid(ownerUidInput);
  if (!ownerUid) return null;
  const heldCandidate = peekContactsAppendProjection(ownerUid);
  const held = heldCandidate
    ? await verifyHeldContactsAppendProjection(ownerUid, heldCandidate)
    : null;
  if (held?.contacts.length) {
    void refreshContactsAppendProjection(ownerUid, fetcher, held);
    return held;
  }

  const existingRequest = contactsRecoveryRequests.get(ownerUid);
  if (existingRequest) return existingRequest;

  const request = (async (): Promise<ContactsAppendProjectionV1 | null> => {
    try {
      if (held) {
        const recovered = await refreshContactsAppendProjection(ownerUid, fetcher);
        return recovered ?? held;
      }

      const response = await fetcher("/api/contacts", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        signedIn?: boolean;
        complete?: boolean;
        ownerUid?: string | null;
        projection?: unknown;
        artifact?: unknown;
      } | null;
      if (
        !response.ok ||
        payload?.ok !== true ||
        payload.signedIn !== true ||
        payload.complete !== true ||
        payload.ownerUid !== ownerUid ||
        !(await admitContactsAppendProjection(payload.projection ?? payload.artifact))
      ) {
        return null;
      }
      const admitted = peekContactsAppendProjection(ownerUid);
      if (
        admitted &&
        typeof window !== "undefined" &&
        typeof window.dispatchEvent === "function"
      ) {
        window.dispatchEvent(new CustomEvent(CONTACTS_PROJECTION_ADMITTED_EVENT, {
          detail: {
            ownerUid,
            head: admitted.head,
          },
        }));
      }
      return admitted;
    } catch {
      return null;
    } finally {
      contactsRecoveryRequests.delete(ownerUid);
    }
  })();

  contactsRecoveryRequests.set(ownerUid, request);
  return request;
}

export async function recoverContactsAppendProjectionAfterSessionPublication(
  ownerUidInput: string,
  fetcher: ContactsRecoveryFetcher = fetch,
): Promise<ContactsAppendProjectionV1 | null> {
  const ownerUid = normalizedOwnerUid(ownerUidInput);
  if (!ownerUid) return null;
  const heldCandidate = peekContactsAppendProjection(ownerUid);
  const held = heldCandidate
    ? await verifyHeldContactsAppendProjection(ownerUid, heldCandidate)
    : null;
  if (held && held.contacts.length > 0) {
    return held;
  }

  const recovered = await refreshContactsAppendProjection(ownerUidInput, fetcher);
  if (recovered) return recovered;
  const retried = await refreshContactsAppendProjection(ownerUidInput, fetcher);
  return retried;
}

export async function refreshContactsAppendProjection(
  ownerUidInput: string,
  fetcher: ContactsRecoveryFetcher = fetch,
  verifiedHeld?: ContactsAppendProjectionV1 | null,
): Promise<ContactsAppendProjectionV1 | null> {
  const ownerUid = normalizedOwnerUid(ownerUidInput);
  if (!ownerUid) return null;

  try {
    const heldCandidate = verifiedHeld ?? peekContactsAppendProjection(ownerUid);
    const held = verifiedHeld?.ownerUid === ownerUid
      ? verifiedHeld
      : heldCandidate
        ? await verifyHeldContactsAppendProjection(ownerUid, heldCandidate)
        : null;
    if (held) {
      const announcement = await remoteContactsAnnouncementIsNewer(ownerUid, held, fetcher);
      if (announcement.recovered) {
        return reconcileRecoveredContactsProjection(ownerUid, announcement.recovered);
      }
      if (announcement.newer === false) return held;
    }
    const recovered = await readAuthenticatedContactsProjection(fetcher);
    if (!recovered || recovered.ownerUid !== ownerUid) return null;
    return reconcileRecoveredContactsProjection(ownerUid, recovered.projection);
  } catch {
    return null;
  }
}

function contactProjectionEqual(left: ContactRecord, right: ContactRecord): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function publishContactsAppendProjection(projection: ContactsAppendProjectionV1): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(new CustomEvent(CONTACTS_PROJECTION_ADMITTED_EVENT, {
    detail: {
      ownerUid: projection.ownerUid,
      head: projection.head,
    },
  }));
}

export async function appendLocalContactsAppendProjection(
  ownerUidInput: string,
  contacts: readonly ContactRecord[],
): Promise<ContactsAppendProjectionV1 | null> {
  const ownerUid = normalizedOwnerUid(ownerUidInput);
  if (!ownerUid) return null;
  const previous = contactsLocalAppendRequests.get(ownerUid) ?? Promise.resolve(null);
  const request = previous
    .catch(() => null)
    .then(async (): Promise<ContactsAppendProjectionV1 | null> => {
      const heldCandidate = peekContactsAppendProjection(ownerUid);
      const held = heldCandidate
        ? await verifyHeldContactsAppendProjection(ownerUid, heldCandidate)
        : null;
      if (!held && contacts.length === 0) return null;
      if (!held) {
        const genesis = await createContactsProjectionGenesis({ ownerUid, contacts });
        if (!(await admitContactsAppendProjection(genesis))) return null;
        publishContactsAppendProjection(genesis);
        return genesis;
      }

      const heldById = new Map(held.contacts.map((contact) => [contact.id, contact]));
      const operations: ContactsProjectionOperationInput[] = [];
      for (const contact of contacts) {
        const existing = heldById.get(contact.id);
        if (!existing) {
          operations.push({
            kind: "contact.append",
            contact,
            effectiveAt: contact.createdAt || contact.updatedAt,
          });
          continue;
        }
        if (!contactProjectionEqual(existing, contact)) {
          operations.push({
            kind: "contact.supersede",
            contact,
            effectiveAt: contact.updatedAt || new Date().toISOString(),
          });
        }
      }
      if (!operations.length) return held;

      const successor = await createContactsProjectionSuccessor(held, operations);
      if (!(await admitContactsAppendProjection(successor))) return null;
      publishContactsAppendProjection(successor);
      return successor;
    });

  contactsLocalAppendRequests.set(ownerUid, request);
  try {
    return await request;
  } finally {
    if (contactsLocalAppendRequests.get(ownerUid) === request) {
      contactsLocalAppendRequests.delete(ownerUid);
    }
  }
}

export function subscribeContactsAppendProjection(
  ownerUidInput: string,
  listener: (projection: ContactsAppendProjectionV1) => void,
): () => void {
  const ownerUid = normalizedOwnerUid(ownerUidInput);
  if (!ownerUid || typeof window === "undefined") return () => {};
  const onAdmitted = (event: Event) => {
    const detail = (event as CustomEvent<{ ownerUid?: string }>).detail;
    if (detail?.ownerUid !== ownerUid) return;
    const held = peekContactsAppendProjection(ownerUid);
    if (held) listener(held);
  };
  window.addEventListener(CONTACTS_PROJECTION_ADMITTED_EVENT, onAdmitted);
  return () =>
    window.removeEventListener(CONTACTS_PROJECTION_ADMITTED_EVENT, onAdmitted);
}
