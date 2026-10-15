import { sha256ReceizBytes } from "./artifacts.js";
import {
  parseReceizConversationParticipantBindingV1,
  type ReceizConversationParticipantBindingV1,
} from "./conversationDomain.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import {
  validateReceizSubjectAccessPublicBindingV122,
  type ReceizSubjectAccessKitV122,
  type ReceizSubjectAccessPublicBindingV122,
} from "./v122SubjectAccess.js";
import {
  decryptReceizPrivateWorldEnvelopeV122,
  planReceizPrivateCommandV122,
  type ReceizPrivateWorldEnvelopeV122,
} from "./v122PrivateWorld.js";
import { digestReceizCanonicalV122 } from "./v122Canonical.js";

const encoder = new TextEncoder();
const SHA256_RE = /^[0-9a-f]{64}$/;

export type ReceizConversationEpochSecretV1 = Readonly<{
  schema: "receiz.chat.epoch-secret.v1";
  conversationId: string;
  epoch: number;
  keyBytes: Uint8Array;
  keyDigest: string;
}>;

export type ReceizConversationEpochGrantBatchV1 = Readonly<{
  schema: "receiz.chat.epoch-grant-batch.v1";
  conversationId: string;
  epoch: number;
  batchIndex: number;
  recipientReceizIds: readonly string[];
  envelope: ReceizPrivateWorldEnvelopeV122;
  batchDigest: string;
}>;

export type ReceizConversationMessageCiphertextV1 = Readonly<{
  schema: "receiz.chat.message-ciphertext.v1";
  conversationId: string;
  epoch: number;
  messageId: string;
  senderReceizId: string;
  sealedOriginalDigest: string;
  nonceB64u: string;
  ciphertextB64u: string;
  aadDigest: string;
  ciphertextDigest: string;
  authority: Readonly<{
    ciphertextIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

type EpochGrantPrivatePayload = Readonly<{
  schema: "receiz.chat.epoch-grant-private.v1";
  conversationId: string;
  epoch: number;
  keyB64u: string;
  keyDigest: string;
  recipients: readonly Readonly<{
    receizId: string;
    subjectId: string;
    bindingDigest: string;
  }>[];
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || value.length > 512) {
    fail(code);
  }
  return value;
}

function uint(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function closedRecord(value: unknown, keys: readonly string[], code: string): Record<string, unknown> {
  if (!isPlainRecord(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(code);
  return value;
}

async function epochSecretDigest(input: Readonly<{
  conversationId: string;
  epoch: number;
  keyBytes: Uint8Array;
}>): Promise<string> {
  return digestReceizCanonicalV122({
    schema: "receiz.chat.epoch-secret-digest.v1",
    conversationId: input.conversationId,
    epoch: input.epoch,
    keyB64u: receizBase64UrlEncode(input.keyBytes),
  });
}

async function validateEpochSecret(
  value: ReceizConversationEpochSecretV1,
): Promise<ReceizConversationEpochSecretV1> {
  const code = "RECEIZ_CONVERSATION_EPOCH_SECRET_INVALID";
  if (value.schema !== "receiz.chat.epoch-secret.v1" || !(value.keyBytes instanceof Uint8Array)
    || value.keyBytes.byteLength !== 32 || !SHA256_RE.test(value.keyDigest)) fail(code);
  const conversationId = text(value.conversationId, code);
  const epoch = uint(value.epoch, code);
  if (value.keyDigest !== await epochSecretDigest({ conversationId, epoch, keyBytes: value.keyBytes })) fail(code);
  return value;
}

async function importMessageKey(bytes: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", exactBuffer(bytes), "AES-GCM", false, usages);
}

export async function createReceizConversationEpochSecretV1(input: Readonly<{
  conversationId: string;
  epoch: number;
}>): Promise<ReceizConversationEpochSecretV1> {
  const conversationId = text(input.conversationId, "RECEIZ_CONVERSATION_EPOCH_SECRET_INVALID");
  const epoch = uint(input.epoch, "RECEIZ_CONVERSATION_EPOCH_SECRET_INVALID");
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return Object.freeze({
    schema: "receiz.chat.epoch-secret.v1" as const,
    conversationId,
    epoch,
    keyBytes,
    keyDigest: await epochSecretDigest({ conversationId, epoch, keyBytes }),
  });
}

function grantBatchBasis(batch: Omit<ReceizConversationEpochGrantBatchV1, "batchDigest">) {
  return Object.freeze({
    schema: batch.schema,
    conversationId: batch.conversationId,
    epoch: batch.epoch,
    batchIndex: batch.batchIndex,
    recipientReceizIds: batch.recipientReceizIds,
    envelopeDigest: batch.envelope.envelopeDigest,
  });
}

export async function planReceizConversationEpochGrantBatchesV1(input: Readonly<{
  secret: ReceizConversationEpochSecretV1;
  recipients: readonly ReceizConversationParticipantBindingV1[];
  recipientBindings: readonly ReceizSubjectAccessPublicBindingV122[];
  maxRecipientsPerBatch: number;
  batchIndexOffset?: number;
}>): Promise<readonly ReceizConversationEpochGrantBatchV1[]> {
  const secret = await validateEpochSecret(input.secret);
  if (!Number.isSafeInteger(input.maxRecipientsPerBatch)
    || input.maxRecipientsPerBatch < 1
    || input.maxRecipientsPerBatch > 128) {
    fail("RECEIZ_CONVERSATION_EPOCH_GRANT_BATCH_BOUND_INVALID");
  }
  if (input.recipients.length === 0) fail("RECEIZ_CONVERSATION_EPOCH_RECIPIENT_REQUIRED");
  const batchIndexOffset = input.batchIndexOffset ?? 0;
  if (!Number.isSafeInteger(batchIndexOffset) || batchIndexOffset < 0) {
    fail("RECEIZ_CONVERSATION_EPOCH_GRANT_BATCH_OFFSET_INVALID");
  }
  const recipients = await Promise.all(input.recipients.map(parseReceizConversationParticipantBindingV1));
  if (new Set(recipients.map((entry) => entry.receizId)).size !== recipients.length) {
    fail("RECEIZ_CONVERSATION_EPOCH_RECIPIENT_DUPLICATE");
  }
  const publicBindings = new Map(input.recipientBindings.map((entry) => [entry.subjectId, entry]));
  const ordered = [...recipients].sort((left, right) => left.receizId.localeCompare(right.receizId));
  for (const recipient of ordered) {
    const binding = publicBindings.get(recipient.subjectId);
    if (!binding
      || !await validateReceizSubjectAccessPublicBindingV122(binding)
      || binding.subjectHead !== recipient.subjectHead
      || binding.accessKeyHead !== recipient.accessKeyHead) {
      fail("RECEIZ_CONVERSATION_EPOCH_RECIPIENT_BINDING_REQUIRED");
    }
  }

  const batches: ReceizConversationEpochGrantBatchV1[] = [];
  for (let offset = 0; offset < ordered.length; offset += input.maxRecipientsPerBatch) {
    const batchRecipients = ordered.slice(offset, offset + input.maxRecipientsPerBatch);
    const batchIndex = batchIndexOffset + batches.length;
    const recipientsPrivate = Object.freeze(batchRecipients.map((entry) => Object.freeze({
      receizId: entry.receizId,
      subjectId: entry.subjectId,
      bindingDigest: entry.bindingDigest,
    })));
    const privatePayload: EpochGrantPrivatePayload = Object.freeze({
      schema: "receiz.chat.epoch-grant-private.v1",
      conversationId: secret.conversationId,
      epoch: secret.epoch,
      keyB64u: receizBase64UrlEncode(secret.keyBytes),
      keyDigest: secret.keyDigest,
      recipients: recipientsPrivate,
    });
    const recipientSetDigest = await digestReceizCanonicalV122(recipientsPrivate);
    const planned = await planReceizPrivateCommandV122({
      worldId: `receiz:chat:${secret.conversationId}:epoch:${secret.epoch}:batch:${batchIndex}`,
      publicPayload: Object.freeze({
        schema: "receiz.chat.epoch-grant-public.v1",
        conversationId: secret.conversationId,
        epoch: secret.epoch,
        batchIndex,
        recipientSetDigest,
        keyDigest: secret.keyDigest,
      }),
      privatePayload,
      visibility: Object.freeze({
        mode: "invited" as const,
        recipientSubjectIds: Object.freeze(batchRecipients.map((entry) => entry.subjectId)),
      }),
      recipientBindings: batchRecipients.map((entry) => publicBindings.get(entry.subjectId)!),
    });
    const basis = Object.freeze({
      schema: "receiz.chat.epoch-grant-batch.v1" as const,
      conversationId: secret.conversationId,
      epoch: secret.epoch,
      batchIndex,
      recipientReceizIds: Object.freeze(batchRecipients.map((entry) => entry.receizId)),
      envelope: planned.privateEnvelope,
    });
    batches.push(Object.freeze({
      ...basis,
      batchDigest: await digestReceizCanonicalV122(grantBatchBasis(basis)),
    }));
  }
  return Object.freeze(batches);
}

function parseEpochGrantPrivatePayload(value: unknown): EpochGrantPrivatePayload {
  const code = "RECEIZ_CONVERSATION_EPOCH_GRANT_PAYLOAD_INVALID";
  const record = closedRecord(
    value,
    ["schema", "conversationId", "epoch", "keyB64u", "keyDigest", "recipients"],
    code,
  );
  if (record.schema !== "receiz.chat.epoch-grant-private.v1" || !Array.isArray(record.recipients)) fail(code);
  const recipients = Object.freeze(record.recipients.map((entry) => {
    const recipient = closedRecord(entry, ["receizId", "subjectId", "bindingDigest"], code);
    if (typeof recipient.bindingDigest !== "string" || !SHA256_RE.test(recipient.bindingDigest)) fail(code);
    return Object.freeze({
      receizId: text(recipient.receizId, code),
      subjectId: text(recipient.subjectId, code),
      bindingDigest: recipient.bindingDigest,
    });
  }));
  if (typeof record.keyB64u !== "string" || typeof record.keyDigest !== "string" || !SHA256_RE.test(record.keyDigest)) fail(code);
  return Object.freeze({
    schema: "receiz.chat.epoch-grant-private.v1" as const,
    conversationId: text(record.conversationId, code),
    epoch: uint(record.epoch, code),
    keyB64u: record.keyB64u,
    keyDigest: record.keyDigest,
    recipients,
  });
}

export async function openReceizConversationEpochGrantV1(input: Readonly<{
  batch: ReceizConversationEpochGrantBatchV1;
  accessKit: ReceizSubjectAccessKitV122;
  edgeWrappingKey: Uint8Array;
  currentSubjectHead: string;
  currentAccessKeyHead: string;
}>): Promise<ReceizConversationEpochSecretV1> {
  const { batchDigest, ...basis } = input.batch;
  if (!SHA256_RE.test(batchDigest)
    || batchDigest !== await digestReceizCanonicalV122(grantBatchBasis(basis))) {
    fail("RECEIZ_CONVERSATION_EPOCH_GRANT_DIGEST_INVALID");
  }
  const clear = parseEpochGrantPrivatePayload(await decryptReceizPrivateWorldEnvelopeV122({
    envelope: input.batch.envelope,
    accessKit: input.accessKit,
    edgeWrappingKey: input.edgeWrappingKey,
    currentSubjectHead: input.currentSubjectHead,
    currentAccessKeyHead: input.currentAccessKeyHead,
  }));
  if (clear.conversationId !== input.batch.conversationId || clear.epoch !== input.batch.epoch
    || !clear.recipients.some((entry) => entry.subjectId === input.accessKit.binding.subjectId
      && input.batch.recipientReceizIds.includes(entry.receizId))) {
    fail("RECEIZ_CONVERSATION_EPOCH_GRANT_BINDING_INVALID");
  }
  const keyBytes = receizBase64UrlDecode(clear.keyB64u);
  const secret: ReceizConversationEpochSecretV1 = Object.freeze({
    schema: "receiz.chat.epoch-secret.v1" as const,
    conversationId: clear.conversationId,
    epoch: clear.epoch,
    keyBytes,
    keyDigest: clear.keyDigest,
  });
  return validateEpochSecret(secret);
}

function messageCiphertextBasis(value: Omit<ReceizConversationMessageCiphertextV1, "ciphertextDigest" | "authority">) {
  return Object.freeze(value);
}

export async function encryptReceizConversationMessageV1(input: Readonly<{
  secret: ReceizConversationEpochSecretV1;
  messageId: string;
  senderReceizId: string;
  sealedOriginalBytes: Uint8Array;
}>): Promise<ReceizConversationMessageCiphertextV1> {
  const secret = await validateEpochSecret(input.secret);
  if (!(input.sealedOriginalBytes instanceof Uint8Array) || input.sealedOriginalBytes.byteLength === 0) {
    fail("RECEIZ_CONVERSATION_MESSAGE_ORIGINAL_REQUIRED");
  }
  const messageId = text(input.messageId, "RECEIZ_CONVERSATION_MESSAGE_CIPHERTEXT_INVALID");
  const senderReceizId = text(input.senderReceizId, "RECEIZ_CONVERSATION_MESSAGE_CIPHERTEXT_INVALID");
  const aadDigest = await digestReceizCanonicalV122({
    schema: "receiz.chat.message-aad.v1",
    conversationId: secret.conversationId,
    epoch: secret.epoch,
    messageId,
    senderReceizId,
  });
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: exactBuffer(nonce), additionalData: exactBuffer(encoder.encode(aadDigest)) },
    await importMessageKey(secret.keyBytes, ["encrypt"]),
    exactBuffer(input.sealedOriginalBytes),
  ));
  const basis = messageCiphertextBasis({
    schema: "receiz.chat.message-ciphertext.v1",
    conversationId: secret.conversationId,
    epoch: secret.epoch,
    messageId,
    senderReceizId,
    sealedOriginalDigest: await sha256ReceizBytes(input.sealedOriginalBytes),
    nonceB64u: receizBase64UrlEncode(nonce),
    ciphertextB64u: receizBase64UrlEncode(ciphertext),
    aadDigest,
  });
  return Object.freeze({
    ...basis,
    ciphertextDigest: await digestReceizCanonicalV122(basis),
    authority: Object.freeze({
      ciphertextIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

export async function decryptReceizConversationMessageV1(input: Readonly<{
  secret: ReceizConversationEpochSecretV1;
  ciphertext: ReceizConversationMessageCiphertextV1;
}>): Promise<Uint8Array> {
  const secret = await validateEpochSecret(input.secret);
  const { ciphertextDigest, authority: _authority, ...basis } = input.ciphertext;
  if (input.ciphertext.schema !== "receiz.chat.message-ciphertext.v1"
    || !SHA256_RE.test(ciphertextDigest)
    || ciphertextDigest !== await digestReceizCanonicalV122(messageCiphertextBasis(basis))) {
    fail("RECEIZ_CONVERSATION_MESSAGE_CIPHERTEXT_DIGEST_INVALID");
  }
  if (secret.conversationId !== input.ciphertext.conversationId || secret.epoch !== input.ciphertext.epoch) {
    fail("RECEIZ_CONVERSATION_MESSAGE_SECRET_MISMATCH");
  }
  const expectedAadDigest = await digestReceizCanonicalV122({
    schema: "receiz.chat.message-aad.v1",
    conversationId: input.ciphertext.conversationId,
    epoch: input.ciphertext.epoch,
    messageId: input.ciphertext.messageId,
    senderReceizId: input.ciphertext.senderReceizId,
  });
  if (input.ciphertext.aadDigest !== expectedAadDigest) {
    fail("RECEIZ_CONVERSATION_MESSAGE_AAD_INVALID");
  }
  let clear: Uint8Array;
  try {
    clear = new Uint8Array(await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: exactBuffer(receizBase64UrlDecode(input.ciphertext.nonceB64u)),
        additionalData: exactBuffer(encoder.encode(input.ciphertext.aadDigest)),
      },
      await importMessageKey(secret.keyBytes, ["decrypt"]),
      exactBuffer(receizBase64UrlDecode(input.ciphertext.ciphertextB64u)),
    ));
  } catch {
    return fail("RECEIZ_CONVERSATION_MESSAGE_DECRYPTION_FAILED");
  }
  if (await sha256ReceizBytes(clear) !== input.ciphertext.sealedOriginalDigest) {
    clear.fill(0);
    fail("RECEIZ_CONVERSATION_MESSAGE_ORIGINAL_DIGEST_INVALID");
  }
  return clear;
}
