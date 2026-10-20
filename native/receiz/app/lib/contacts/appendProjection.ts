import { canonicalizeReceizConstitution } from "../../../packages/receiz-sdk/src/constitution";
import { sha256Hex } from "@/app/utils/sha256";
import type { ContactInteraction, ContactRecord } from "./types";

export type ContactsProjectionId = `contacts-register:${string}`;

type ContactsProjectionOperationCommonInput = Readonly<{
  effectiveAt: string;
}>;

export type ContactsProjectionOperationInput =
  | (ContactsProjectionOperationCommonInput & Readonly<{
      kind: "contact.append" | "contact.supersede" | "contact.restore";
      contact: ContactRecord;
    }>)
  | (ContactsProjectionOperationCommonInput & Readonly<{
      kind: "contact.archive";
      contactId: string;
    }>)
  | (ContactsProjectionOperationCommonInput & Readonly<{
      kind: "contact.event.append";
      contactId: string;
      event: ContactInteraction;
    }>)
  | (ContactsProjectionOperationCommonInput & Readonly<{
      kind: "contact.merge";
      primaryContactId: string;
      mergedContactIds: readonly string[];
    }>);

export type ContactsProjectionOperationV1 = ContactsProjectionOperationInput & Readonly<{
  schema: "receiz.contacts.operation.v1";
  artifactId: ContactsProjectionId;
  ownerUid: string;
  index: number;
  predecessorOperationDigest: string | null;
  operationDigest: string;
}>;

export type ContactsAppendProjectionV1 = Readonly<{
  schema: "receiz.contacts.composite-proof.v1";
  classification: "authenticated append projection";
  artifactId: ContactsProjectionId;
  ownerUid: string;
  predecessorHead: string | null;
  head: string;
  operationCount: number;
  projectionCommitment: string;
  complete: true;
  contacts: readonly ContactRecord[];
  archivedContactIds: readonly string[];
  operations: readonly ContactsProjectionOperationV1[];
  authority: Readonly<{
    classification: "authenticated-snapshot";
    outranksSealedTruth: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

// Kept as a wire identifier so already-held PWA state remains readable.
// The schema name does not confer proof authority.
const CONTACTS_LEGACY_WIRE_SCHEMA = "receiz.contacts.composite-proof.v1" as const;
const CONTACTS_OPERATION_SCHEMA = "receiz.contacts.operation.v1" as const;
const CONTACTS_AUTHORITY = Object.freeze({
  classification: "authenticated-snapshot",
  outranksSealedTruth: false,
  strongerTruth: "sealed-receiz-proof-object",
} as const);

function artifactIdForOwner(ownerUid: string): ContactsProjectionId {
  const normalized = ownerUid.trim();
  if (!normalized) throw new TypeError("CONTACTS_OWNER_REQUIRED");
  return `contacts-register:${normalized}`;
}

function canonicalEqual(left: unknown, right: unknown): boolean {
  return canonicalizeReceizConstitution(left) === canonicalizeReceizConstitution(right);
}

function contactOrder(left: ContactRecord, right: ContactRecord): number {
  const created = left.createdAt.localeCompare(right.createdAt);
  return created || left.id.localeCompare(right.id);
}

function operationDigestPayload(
  operation: Omit<ContactsProjectionOperationV1, "operationDigest">,
): string {
  return canonicalizeReceizConstitution(operation);
}

async function bindOperation(args: {
  artifactId: ContactsProjectionId;
  ownerUid: string;
  index: number;
  predecessorOperationDigest: string | null;
  input: ContactsProjectionOperationInput;
}): Promise<ContactsProjectionOperationV1> {
  const unsigned = {
    ...args.input,
    schema: CONTACTS_OPERATION_SCHEMA,
    artifactId: args.artifactId,
    ownerUid: args.ownerUid,
    index: args.index,
    predecessorOperationDigest: args.predecessorOperationDigest,
  } satisfies Omit<ContactsProjectionOperationV1, "operationDigest">;
  return {
    ...unsigned,
    operationDigest: await sha256Hex(operationDigestPayload(unsigned)),
  } as ContactsProjectionOperationV1;
}

function foldOperations(operations: readonly ContactsProjectionOperationV1[]): {
  contacts: ContactRecord[];
  archivedContactIds: string[];
} {
  const contacts = new Map<string, ContactRecord>();
  const archived = new Set<string>();

  for (const operation of operations) {
    if (
      operation.kind === "contact.append" ||
      operation.kind === "contact.supersede" ||
      operation.kind === "contact.restore"
    ) {
      contacts.set(operation.contact.id, operation.contact);
      archived.delete(operation.contact.id);
      continue;
    }
    if (operation.kind === "contact.archive") {
      contacts.delete(operation.contactId);
      archived.add(operation.contactId);
      continue;
    }
    if (operation.kind === "contact.event.append") {
      const current = contacts.get(operation.contactId);
      if (!current) continue;
      const interactions = current.interactions.some((event) => event.id === operation.event.id)
        ? current.interactions
        : [operation.event, ...current.interactions];
      contacts.set(operation.contactId, {
        ...current,
        interactions,
        lastInteractionAt: operation.event.occurredAt,
        updatedAt: operation.effectiveAt,
      });
      continue;
    }
    if (operation.kind !== "contact.merge") continue;
    const primary = contacts.get(operation.primaryContactId);
    if (!primary) continue;
    for (const mergedContactId of operation.mergedContactIds) {
      if (mergedContactId === operation.primaryContactId) continue;
      contacts.delete(mergedContactId);
      archived.add(mergedContactId);
    }
  }

  return {
    contacts: [...contacts.values()].sort(contactOrder),
    archivedContactIds: [...archived].sort(),
  };
}

async function projectionCommitment(args: {
  artifactId: ContactsProjectionId;
  ownerUid: string;
  operationCount: number;
  contacts: readonly ContactRecord[];
  archivedContactIds: readonly string[];
}): Promise<string> {
  return sha256Hex(canonicalizeReceizConstitution({
    schema: "receiz.contacts.projection.v1",
    ...args,
  }));
}

async function deriveHead(args: {
  artifactId: ContactsProjectionId;
  ownerUid: string;
  predecessorHead: string | null;
  operationCount: number;
  projectionCommitment: string;
  operations: readonly ContactsProjectionOperationV1[];
}): Promise<string> {
  return sha256Hex(canonicalizeReceizConstitution({
    schema: CONTACTS_LEGACY_WIRE_SCHEMA,
    artifactId: args.artifactId,
    ownerUid: args.ownerUid,
    predecessorHead: args.predecessorHead,
    operationCount: args.operationCount,
    projectionCommitment: args.projectionCommitment,
    operationDigests: args.operations.map((operation) => operation.operationDigest),
  }));
}

async function buildContactsAppendProjection(args: {
  ownerUid: string;
  predecessorHead: string | null;
  operations: readonly ContactsProjectionOperationV1[];
}): Promise<ContactsAppendProjectionV1> {
  const artifactId = artifactIdForOwner(args.ownerUid);
  const folded = foldOperations(args.operations);
  const commitment = await projectionCommitment({
    artifactId,
    ownerUid: args.ownerUid,
    operationCount: args.operations.length,
    contacts: folded.contacts,
    archivedContactIds: folded.archivedContactIds,
  });
  const head = await deriveHead({
    artifactId,
    ownerUid: args.ownerUid,
    predecessorHead: args.predecessorHead,
    operationCount: args.operations.length,
    projectionCommitment: commitment,
    operations: args.operations,
  });
  return Object.freeze({
    schema: CONTACTS_LEGACY_WIRE_SCHEMA,
    classification: "authenticated append projection",
    artifactId,
    ownerUid: args.ownerUid,
    predecessorHead: args.predecessorHead,
    head,
    operationCount: args.operations.length,
    projectionCommitment: commitment,
    complete: true,
    contacts: Object.freeze(folded.contacts),
    archivedContactIds: Object.freeze(folded.archivedContactIds),
    operations: Object.freeze([...args.operations]),
    authority: CONTACTS_AUTHORITY,
  });
}

export async function createContactsProjectionGenesis(args: {
  ownerUid: string;
  contacts: readonly ContactRecord[];
}): Promise<ContactsAppendProjectionV1> {
  const artifactId = artifactIdForOwner(args.ownerUid);
  const operations: ContactsProjectionOperationV1[] = [];
  for (const contact of [...args.contacts].sort(contactOrder)) {
    operations.push(await bindOperation({
      artifactId,
      ownerUid: args.ownerUid,
      index: operations.length,
      predecessorOperationDigest: operations.at(-1)?.operationDigest ?? null,
      input: {
        kind: "contact.append",
        contact,
        effectiveAt: contact.createdAt || contact.updatedAt,
      },
    }));
  }
  return buildContactsAppendProjection({
    ownerUid: args.ownerUid,
    predecessorHead: null,
    operations,
  });
}

export async function createContactsProjectionSuccessor(
  predecessor: ContactsAppendProjectionV1,
  inputs: readonly ContactsProjectionOperationInput[],
): Promise<ContactsAppendProjectionV1> {
  if (!(await verifyContactsAppendProjection(predecessor))) {
    throw new TypeError("CONTACTS_PREDECESSOR_INVALID");
  }
  const operations = [...predecessor.operations];
  for (const input of inputs) {
    operations.push(await bindOperation({
      artifactId: predecessor.artifactId,
      ownerUid: predecessor.ownerUid,
      index: operations.length,
      predecessorOperationDigest: operations.at(-1)?.operationDigest ?? null,
      input,
    }));
  }
  return buildContactsAppendProjection({
    ownerUid: predecessor.ownerUid,
    predecessorHead: predecessor.head,
    operations,
  });
}

export async function verifyContactsAppendProjection(value: unknown): Promise<boolean> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ContactsAppendProjectionV1>;
  if (
    candidate.schema !== CONTACTS_LEGACY_WIRE_SCHEMA ||
    candidate.classification !== "authenticated append projection" ||
    candidate.complete !== true ||
    typeof candidate.ownerUid !== "string" ||
    candidate.artifactId !== artifactIdForOwner(candidate.ownerUid) ||
    typeof candidate.head !== "string" ||
    typeof candidate.projectionCommitment !== "string" ||
    !Array.isArray(candidate.operations) ||
    !Array.isArray(candidate.contacts) ||
    !Array.isArray(candidate.archivedContactIds) ||
    candidate.operationCount !== candidate.operations.length
  ) {
    return false;
  }

  let predecessorOperationDigest: string | null = null;
  for (let index = 0; index < candidate.operations.length; index += 1) {
    const operation = candidate.operations[index]!;
    if (
      operation.schema !== CONTACTS_OPERATION_SCHEMA ||
      operation.artifactId !== candidate.artifactId ||
      operation.ownerUid !== candidate.ownerUid ||
      operation.index !== index ||
      operation.predecessorOperationDigest !== predecessorOperationDigest
    ) {
      return false;
    }
    const { operationDigest, ...unsigned } = operation;
    if (await sha256Hex(operationDigestPayload(unsigned)) !== operationDigest) {
      return false;
    }
    predecessorOperationDigest = operationDigest;
  }

  const folded = foldOperations(candidate.operations);
  if (
    !canonicalEqual(candidate.contacts, folded.contacts) ||
    !canonicalEqual(candidate.archivedContactIds, folded.archivedContactIds)
  ) {
    return false;
  }
  const commitment = await projectionCommitment({
    artifactId: candidate.artifactId,
    ownerUid: candidate.ownerUid,
    operationCount: candidate.operationCount,
    contacts: folded.contacts,
    archivedContactIds: folded.archivedContactIds,
  });
  if (commitment !== candidate.projectionCommitment) return false;
  return candidate.head === await deriveHead({
    artifactId: candidate.artifactId,
    ownerUid: candidate.ownerUid,
    predecessorHead: candidate.predecessorHead ?? null,
    operationCount: candidate.operationCount,
    projectionCommitment: commitment,
    operations: candidate.operations,
  });
}
