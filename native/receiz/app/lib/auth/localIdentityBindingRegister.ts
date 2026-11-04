"use client";

import {
  LOCAL_IDENTITY_BINDING_SCHEMA,
  canonicalLocalIdentityBinding,
  type LocalIdentityBindingAppend,
} from "@/app/lib/auth/localIdentityBinding";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { sha256Hex } from "@/app/utils/sha256";
import { normalizeIdentityKeyId } from "@/app/utils/receizIdentityKey";

const LOCAL_IDENTITY_BINDING_REGISTER_SCHEMA = "receiz.identity.local-global-binding-register.v1";
const LOCAL_IDENTITY_BINDING_REGISTER_STORAGE_KEY = "receiz.identity.local-global-binding-register.v1";
const HEX64_RE = /^[0-9a-f]{64}$/;

type LocalIdentityBindingRegister = {
  schema: typeof LOCAL_IDENTITY_BINDING_REGISTER_SCHEMA;
  updatedAtMs: number;
  bindings: Record<string, LocalIdentityBindingAppend>;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBinding(value: unknown): LocalIdentityBindingAppend | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<LocalIdentityBindingAppend>;
  const keyId = normalizeIdentityKeyId(record.keyId);
  const localUid = normalizeText(record.localUid);
  const globalUid = normalizeText(record.globalUid);
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const pbiReceiptHash = normalizeText(record.pbiReceiptHash).toLowerCase();
  const pbiChallengeId = normalizeText(record.pbiChallengeId);
  const boundAt = normalizeText(record.boundAt);
  const appendHashHex = normalizeText(record.appendHashHex).toLowerCase();

  if (
    record.schema !== LOCAL_IDENTITY_BINDING_SCHEMA ||
    !keyId ||
    !localUid ||
    !globalUid ||
    !HEX64_RE.test(actionHashHex) ||
    !HEX64_RE.test(pbiReceiptHash) ||
    !pbiChallengeId ||
    !boundAt ||
    !HEX64_RE.test(appendHashHex)
  ) {
    return null;
  }

  return {
    schema: LOCAL_IDENTITY_BINDING_SCHEMA,
    localUid,
    globalUid,
    keyId,
    actionHashHex,
    pbiReceiptHash,
    pbiChallengeId,
    boundAt,
    appendHashHex,
  };
}

function emptyBindingRegister(): LocalIdentityBindingRegister {
  return {
    schema: LOCAL_IDENTITY_BINDING_REGISTER_SCHEMA,
    updatedAtMs: 0,
    bindings: {},
  };
}

function parseBindingRegister(raw: string): LocalIdentityBindingRegister | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LocalIdentityBindingRegister> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema !== LOCAL_IDENTITY_BINDING_REGISTER_SCHEMA) return null;
    if (!Number.isFinite(parsed.updatedAtMs)) return null;
    if (!parsed.bindings || typeof parsed.bindings !== "object" || Array.isArray(parsed.bindings)) return null;

    const bindings: Record<string, LocalIdentityBindingAppend> = {};
    for (const value of Object.values(parsed.bindings)) {
      const binding = normalizeBinding(value);
      if (binding) bindings[binding.keyId] = binding;
    }
    return {
      schema: LOCAL_IDENTITY_BINDING_REGISTER_SCHEMA,
      updatedAtMs: Number(parsed.updatedAtMs),
      bindings,
    };
  } catch {
    return null;
  }
}

export function readLocalIdentityBindingRegister(): LocalIdentityBindingRegister {
  const raw = readDurableLocalTruthItem(LOCAL_IDENTITY_BINDING_REGISTER_STORAGE_KEY);
  return raw ? parseBindingRegister(raw) ?? emptyBindingRegister() : emptyBindingRegister();
}

function writeLocalIdentityBindingRegister(register: LocalIdentityBindingRegister): void {
  writeDurableLocalTruthItem(LOCAL_IDENTITY_BINDING_REGISTER_STORAGE_KEY, JSON.stringify(register), {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source: "local-identity-binding-register",
    allowSameRankOverwrite: true,
  });
}

export async function admitLocalIdentityBinding(binding: LocalIdentityBindingAppend): Promise<LocalIdentityBindingAppend | null> {
  const normalized = normalizeBinding(binding);
  if (!normalized) return null;
  const expectedHash = await sha256Hex(
    canonicalLocalIdentityBinding({
      localUid: normalized.localUid,
      globalUid: normalized.globalUid,
      keyId: normalized.keyId,
      actionHashHex: normalized.actionHashHex,
      pbiReceiptHash: normalized.pbiReceiptHash,
      pbiChallengeId: normalized.pbiChallengeId,
      boundAt: normalized.boundAt,
    }),
  );
  if (expectedHash !== normalized.appendHashHex) return null;

  const register = readLocalIdentityBindingRegister();
  const existing = register.bindings[normalized.keyId];
  if (
    existing &&
    (existing.localUid !== normalized.localUid ||
      existing.globalUid !== normalized.globalUid ||
      existing.actionHashHex !== normalized.actionHashHex)
  ) {
    return existing;
  }

  const now = Date.now();
  writeLocalIdentityBindingRegister({
    schema: LOCAL_IDENTITY_BINDING_REGISTER_SCHEMA,
    updatedAtMs: now,
    bindings: {
      ...register.bindings,
      [normalized.keyId]: normalized,
    },
  });
  return normalized;
}
