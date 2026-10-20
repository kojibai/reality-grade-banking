"use client";

import { peekActiveReceizDeviceIdentityFromRegister } from "./receizDeviceIdentityRegister";
import { peekActiveReceizAccountBinding } from "./receizAccountBindings";
import { serializeReceizKeyFile, type ReceizKeyFile } from "@/app/utils/receizIdentityKey";

/** Complete admitted source, synchronously available before subordinate route stores. */
export function peekSelectedReceizAccountSource(expectedUserId?: string | null): ReceizKeyFile | null {
  const identity = peekActiveReceizDeviceIdentityFromRegister();
  if (!identity) return null;
  const expected = expectedUserId?.trim();
  if (!expected || identity.keyFile.owner.uid === expected) return identity.keyFile;
  const binding = peekActiveReceizAccountBinding();
  return binding?.receizKeyId === identity.keyFile.keyId && binding.session.uid === expected
    ? identity.keyFile : null;
}

const exactKeyText = new WeakMap<ReceizKeyFile, string>();
function sourceText(keyFile: ReceizKeyFile): string {
  let text = exactKeyText.get(keyFile);
  if (text === undefined) { text = serializeReceizKeyFile(keyFile); exactKeyText.set(keyFile, text); }
  return text;
}

/** Recheck after asynchronous work, before publishing a weaker materialization. */
export function isSelectedReceizAccountSource(keyFile: ReceizKeyFile): boolean {
  const selected = peekSelectedReceizAccountSource();
  return Boolean(selected && sourceText(selected) === sourceText(keyFile));
}

export function captureSelectedReceizAccountSourceGuard(keyFile: ReceizKeyFile): () => boolean {
  const binding = peekActiveReceizAccountBinding();
  const bindingId = binding?.id ?? null;
  return () => (peekActiveReceizAccountBinding()?.id ?? null) === bindingId
    && isSelectedReceizAccountSource(keyFile);
}
