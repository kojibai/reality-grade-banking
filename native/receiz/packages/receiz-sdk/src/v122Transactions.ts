import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122, equalReceizExactHeadMaps, validateReceizExactCommandBytes, type ReceizV122ZeroWriteValidationFailure } from "./v122Canonical.js";

export type ReceizWorldCommandV122 = Readonly<{
  commandId: string;
  worldId: string;
  expectedWorldHead: string;
  actorSubjectId: string;
  participantSubjectIds: readonly string[];
  causalParents: readonly string[];
  command: unknown;
  exactCommandBytesB64u: string;
  commandDigest: string;
  planDigest: string;
  authorityDigest: string;
  mandateDigest: string | null;
}>;

export type ReceizWorldTransactionV122 = Readonly<{
  schema: "receiz.world.transaction.v122";
  transactionId: string;
  worldId: string;
  expectedWorldHead: string;
  participantHeads: Readonly<Record<string, string>>;
  commands: readonly ReceizWorldCommandV122[];
  registryDigest: string;
  reducerDigest: string;
  idempotencyKey: string;
  transactionDigest: string;
}>;

export type ReceizWorldCommandPlanInputV122 = Readonly<{
  commandId: string;
  worldId: string;
  expectedWorldHead: string;
  actorSubjectId: string;
  participantSubjectIds: readonly string[];
  causalParents: readonly string[];
  command: unknown;
  authority: unknown;
  mandateDigest?: string | null;
}>;

export type ReceizWorldTransactionPlanInputV122 = Readonly<{
  worldId: string;
  expectedWorldHead: string;
  participantHeads: Readonly<Record<string, string>>;
  commands: readonly ReceizWorldCommandV122[];
  registryDigest: string;
  reducerDigest: string;
  idempotencyKey: string;
}>;

const SHA256 = /^[0-9a-f]{64}$/;

function plannerFail(code: string): never {
  throw new TypeError(code);
}

function requiredText(value: string, code: string): string {
  const normalized = value?.trim();
  if (!normalized) plannerFail(code);
  return normalized;
}

function requiredDigest(value: string, code: string): string {
  if (!SHA256.test(value)) plannerFail(code);
  return value;
}

function exactSortedUnique(values: readonly string[], code: string, digestValues = false): readonly string[] {
  if (!Array.isArray(values)) plannerFail(code);
  const normalized = values.map((value) => digestValues ? requiredDigest(value, code) : requiredText(value, code));
  if (new Set(normalized).size !== normalized.length) plannerFail(code);
  return Object.freeze([...normalized].sort((left, right) => left.localeCompare(right)));
}

function plainHeadMap(value: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) plannerFail("V122_TRANSACTION_PARTICIPANT_HEADS_INVALID");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) plannerFail("V122_TRANSACTION_PARTICIPANT_HEADS_INVALID");
  const entries = Object.entries(value).map(([subjectId, head]) => [
    requiredText(subjectId, "V122_TRANSACTION_PARTICIPANT_HEADS_INVALID"),
    requiredDigest(head, "V122_TRANSACTION_PARTICIPANT_HEADS_INVALID"),
  ] as const).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) plannerFail("V122_TRANSACTION_PARTICIPANT_HEADS_INVALID");
  return Object.freeze(Object.fromEntries(entries));
}

function commandPlanBasis(command: ReceizWorldCommandV122) {
  return {
    commandId: command.commandId,
    worldId: command.worldId,
    expectedWorldHead: command.expectedWorldHead,
    actorSubjectId: command.actorSubjectId,
    participantSubjectIds: command.participantSubjectIds,
    causalParents: command.causalParents,
    commandDigest: command.commandDigest,
    authorityDigest: command.authorityDigest,
    mandateDigest: command.mandateDigest,
  };
}

async function assertCanonicalPlannedCommandV122(command: ReceizWorldCommandV122): Promise<void> {
  let exactBytes: Uint8Array;
  try {
    exactBytes = receizBase64UrlDecode(command.exactCommandBytesB64u);
  } catch {
    plannerFail("V122_COMMAND_BYTES_INVALID");
  }
  if (!validateReceizExactCommandBytes(command.command, exactBytes).ok) plannerFail("V122_COMMAND_BYTES_INVALID");
  if (command.commandDigest !== await digestReceizCanonicalV122(command.command)) plannerFail("V122_COMMAND_DIGEST_INVALID");
  if (command.planDigest !== await digestReceizCanonicalV122(commandPlanBasis(command))) plannerFail("V122_COMMAND_PLAN_DIGEST_INVALID");
  requiredDigest(command.authorityDigest, "V122_COMMAND_AUTHORITY_DIGEST_INVALID");
  if (command.mandateDigest !== null) requiredDigest(command.mandateDigest, "V122_COMMAND_MANDATE_DIGEST_INVALID");
}

export async function planReceizWorldCommandV122(input: ReceizWorldCommandPlanInputV122): Promise<ReceizWorldCommandV122> {
  const commandId = requiredText(input.commandId, "V122_COMMAND_ID_REQUIRED");
  const worldId = requiredText(input.worldId, "V122_COMMAND_WORLD_REQUIRED");
  const expectedWorldHead = requiredDigest(input.expectedWorldHead, "V122_COMMAND_WORLD_HEAD_INVALID");
  const actorSubjectId = requiredText(input.actorSubjectId, "V122_COMMAND_ACTOR_REQUIRED");
  const participantSubjectIds = exactSortedUnique(input.participantSubjectIds, "V122_COMMAND_PARTICIPANTS_INVALID");
  if (!participantSubjectIds.includes(actorSubjectId)) plannerFail("V122_COMMAND_ACTOR_PARTICIPANT_REQUIRED");
  const causalParents = exactSortedUnique(input.causalParents, "V122_COMMAND_CAUSAL_PARENTS_INVALID", true);
  if (input.command === undefined || input.authority === undefined) plannerFail("V122_COMMAND_INPUT_INVALID");
  const commandDigest = await digestReceizCanonicalV122(input.command);
  const authorityDigest = await digestReceizCanonicalV122(input.authority);
  const mandateDigest = input.mandateDigest ?? null;
  if (mandateDigest !== null) requiredDigest(mandateDigest, "V122_COMMAND_MANDATE_DIGEST_INVALID");
  const basis = { commandId, worldId, expectedWorldHead, actorSubjectId, participantSubjectIds, causalParents, commandDigest, authorityDigest, mandateDigest };
  const exactCommandBytesB64u = receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122(input.command)));
  return Object.freeze({
    ...basis,
    command: input.command,
    exactCommandBytesB64u,
    planDigest: await digestReceizCanonicalV122(basis),
  });
}

export async function planReceizWorldTransactionV122(input: ReceizWorldTransactionPlanInputV122): Promise<ReceizWorldTransactionV122> {
  const worldId = requiredText(input.worldId, "V122_TRANSACTION_WORLD_REQUIRED");
  const expectedWorldHead = requiredDigest(input.expectedWorldHead, "V122_TRANSACTION_WORLD_HEAD_INVALID");
  const participantHeads = plainHeadMap(input.participantHeads);
  const registryDigest = requiredDigest(input.registryDigest, "V122_TRANSACTION_REGISTRY_DIGEST_INVALID");
  const reducerDigest = requiredDigest(input.reducerDigest, "V122_TRANSACTION_REDUCER_DIGEST_INVALID");
  const idempotencyKey = requiredText(input.idempotencyKey, "V122_TRANSACTION_IDEMPOTENCY_REQUIRED");
  if (!Array.isArray(input.commands) || input.commands.length === 0) plannerFail("V122_TRANSACTION_COMMANDS_REQUIRED");
  const commands = Object.freeze([...input.commands]);
  const commandIds = new Set<string>();
  const affected = new Set<string>();
  for (const command of commands) {
    await assertCanonicalPlannedCommandV122(command);
    if (commandIds.has(command.commandId)) plannerFail("V122_TRANSACTION_COMMAND_DUPLICATE");
    commandIds.add(command.commandId);
    if (command.worldId !== worldId) plannerFail("V122_TRANSACTION_COMMAND_WORLD_MISMATCH");
    if (command.expectedWorldHead !== expectedWorldHead) plannerFail("V122_TRANSACTION_COMMAND_WORLD_HEAD_MISMATCH");
    affected.add(command.actorSubjectId);
    for (const subjectId of command.participantSubjectIds) affected.add(subjectId);
  }
  const participantIds = Object.keys(participantHeads).sort((left, right) => left.localeCompare(right));
  const affectedIds = [...affected].sort((left, right) => left.localeCompare(right));
  if (participantIds.length !== affectedIds.length || participantIds.some((value, index) => value !== affectedIds[index])) {
    plannerFail("V122_TRANSACTION_PARTICIPANT_SET_MISMATCH");
  }
  const identityBasis = { schema: "receiz.world.transaction-identity.v122" as const, worldId, expectedWorldHead, participantHeads, commands, registryDigest, reducerDigest, idempotencyKey };
  const transactionId = `receiz:world-transaction:${await digestReceizCanonicalV122(identityBasis)}`;
  const basis = { schema: "receiz.world.transaction.v122" as const, transactionId, worldId, expectedWorldHead, participantHeads, commands, registryDigest, reducerDigest, idempotencyKey };
  return Object.freeze({ ...basis, transactionDigest: await digestReceizCanonicalV122(basis) });
}

export type ReceizTransactionValidationFailureCodeV122 =
  | "participant_set_mismatch" | "participant_head_mismatch" | "duplicate_command"
  | "command_world_mismatch" | "command_world_head_mismatch" | "command_bytes_mismatch"
  | "command_digest_mismatch" | "plan_digest_mismatch" | "authority_missing"
  | "mandate_missing" | "registry_incompatible" | "reducer_incompatible"
  | "causal_parent_invalid" | "transaction_digest_mismatch";

export type ReceizTransactionValidationResultV122 =
  | Readonly<{ ok: true; transaction: ReceizWorldTransactionV122 }>
  | ReceizV122ZeroWriteValidationFailure<ReceizTransactionValidationFailureCodeV122>;

const fail = (code: ReceizTransactionValidationFailureCodeV122): ReceizTransactionValidationResultV122 => ({ ok: false, code, writesOnFailure: 0 });

export async function validateReceizTransactionV122(input: Readonly<{
  transaction: ReceizWorldTransactionV122;
  authenticatedParticipantHeads: Readonly<Record<string, string>>;
  registryDigest: string;
  reducerDigest: string;
  authorityDigests: ReadonlySet<string>;
  mandateRequiredForActors?: ReadonlySet<string>;
  mandateDigests?: ReadonlySet<string>;
  validCausalParents: ReadonlySet<string>;
}>): Promise<ReceizTransactionValidationResultV122> {
  const transaction = input.transaction;
  const plannedIds = Object.keys(transaction.participantHeads).sort();
  const currentIds = Object.keys(input.authenticatedParticipantHeads).sort();
  if (plannedIds.length !== currentIds.length || plannedIds.some((id, index) => id !== currentIds[index])) return fail("participant_set_mismatch");
  if (!equalReceizExactHeadMaps(transaction.participantHeads, input.authenticatedParticipantHeads)) return fail("participant_head_mismatch");
  if (transaction.registryDigest !== input.registryDigest) return fail("registry_incompatible");
  if (transaction.reducerDigest !== input.reducerDigest) return fail("reducer_incompatible");
  const commandIds = new Set<string>();
  for (const command of transaction.commands) {
    if (commandIds.has(command.commandId)) return fail("duplicate_command");
    commandIds.add(command.commandId);
    if (command.worldId !== transaction.worldId) return fail("command_world_mismatch");
    if (command.expectedWorldHead !== transaction.expectedWorldHead) return fail("command_world_head_mismatch");
    let exact: Uint8Array;
    try { exact = receizBase64UrlDecode(command.exactCommandBytesB64u); } catch { return fail("command_bytes_mismatch"); }
    if (!validateReceizExactCommandBytes(command.command, exact).ok) return fail("command_bytes_mismatch");
    if (await digestReceizCanonicalV122(command.command) !== command.commandDigest) return fail("command_digest_mismatch");
    const planBasis = { commandId: command.commandId, worldId: command.worldId, expectedWorldHead: command.expectedWorldHead, actorSubjectId: command.actorSubjectId, participantSubjectIds: command.participantSubjectIds, causalParents: command.causalParents, commandDigest: command.commandDigest, authorityDigest: command.authorityDigest, mandateDigest: command.mandateDigest };
    if (await digestReceizCanonicalV122(planBasis) !== command.planDigest) return fail("plan_digest_mismatch");
    if (!input.authorityDigests.has(command.authorityDigest)) return fail("authority_missing");
    if (input.mandateRequiredForActors?.has(command.actorSubjectId) && (!command.mandateDigest || !input.mandateDigests?.has(command.mandateDigest))) return fail("mandate_missing");
    if (command.causalParents.some((parent) => !input.validCausalParents.has(parent))) return fail("causal_parent_invalid");
    const participants = new Set(Object.keys(transaction.participantHeads));
    if (command.participantSubjectIds.some((id) => !participants.has(id)) || !participants.has(command.actorSubjectId)) return fail("participant_set_mismatch");
  }
  const { transactionDigest, ...basis } = transaction;
  if (await digestReceizCanonicalV122(basis) !== transactionDigest) return fail("transaction_digest_mismatch");
  return { ok: true, transaction };
}

export type ReceizExecutionOutcomeV122 =
  | Readonly<{ status: "committed"; transaction: ReceizWorldTransactionV122; receipt: unknown; events: readonly unknown[] }>
  | Readonly<{ status: "zero-write"; failure: unknown; currentHeads: Readonly<Record<string, string>>; worldHead: string }>
  | Readonly<{ status: "unknown" }>;

export async function validateReceizExecutionReceiptV122(input: Readonly<{
  outcome: ReceizExecutionOutcomeV122;
  expectedTransactionDigest: string;
  authenticateReceipt: (receipt: unknown) => boolean | Promise<boolean>;
}>): Promise<Readonly<{ ok: true }> | ReceizV122ZeroWriteValidationFailure<"receipt_invalid" | "transaction_mismatch" | "failure_writes_nonzero">> {
  if (input.outcome.status === "unknown") return { ok: true };
  if (input.outcome.status === "zero-write") {
    const failure = input.outcome.failure as { writes?: unknown; writesOnFailure?: unknown };
    return failure?.writes === 0 || failure?.writesOnFailure === 0 ? { ok: true } : { ok: false, code: "failure_writes_nonzero", writesOnFailure: 0 };
  }
  if (input.outcome.transaction.transactionDigest !== input.expectedTransactionDigest) return { ok: false, code: "transaction_mismatch", writesOnFailure: 0 };
  return await input.authenticateReceipt(input.outcome.receipt) ? { ok: true } : { ok: false, code: "receipt_invalid", writesOnFailure: 0 };
}
