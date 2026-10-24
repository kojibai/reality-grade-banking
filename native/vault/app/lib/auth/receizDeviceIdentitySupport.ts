"use client";

import { readDurableLocalTruthItem } from "@/app/lib/runtime/localTruthStore";
import { peekActiveReceizDeviceIdentityFromRegister, RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY } from "./receizDeviceIdentityRegister";
import { normalizeIdentityKeyId } from "@/app/utils/receizIdentityKey";

export const RECEIZ_DEVICE_IDENTITY_SCHEMA = "receiz.device.identity.v1";
export const RECEIZ_DEVICE_IDENTITY_STORAGE_KEY = "receiz.auth.receiz-device-identity.v1";

type StoredReceizDeviceIdentitySupportRecord = {
  schema?: unknown;
  keyFile?: {
    keyId?: unknown;
    alg?: unknown;
  } | null;
};

type ReceizIdPrimaryLoginBrowserInput = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

function normalizeStoredReceizIdentityAlgorithm(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function browserUserAgent(input?: ReceizIdPrimaryLoginBrowserInput): string {
  if (typeof input?.userAgent === "string") return input.userAgent;
  if (typeof navigator !== "undefined" && typeof navigator.userAgent === "string") return navigator.userAgent;
  return "";
}

function browserPlatform(input?: ReceizIdPrimaryLoginBrowserInput): string {
  if (typeof input?.platform === "string") return input.platform;
  if (typeof navigator !== "undefined" && typeof navigator.platform === "string") return navigator.platform;
  return "";
}

function browserMaxTouchPoints(input?: ReceizIdPrimaryLoginBrowserInput): number {
  if (typeof input?.maxTouchPoints === "number" && Number.isFinite(input.maxTouchPoints)) return input.maxTouchPoints;
  if (typeof navigator !== "undefined" && typeof navigator.maxTouchPoints === "number") return navigator.maxTouchPoints;
  return 0;
}

function parseIosMajorVersion(userAgent: string): number | null {
  const match =
    userAgent.match(/\b(?:CPU(?: iPhone)? OS|iPhone OS|CPU OS)\s+(\d{1,2})(?:[_\.]\d+)?/i) ||
    userAgent.match(/\bOS\s+(\d{1,2})(?:[_\.]\d+)?\s+like Mac OS X/i);
  if (!match) return null;
  const major = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(major) ? major : null;
}

function parseSafariVersionMajor(userAgent: string): number | null {
  const match = userAgent.match(/\bVersion\/(\d{1,2})(?:\.\d+)?/i);
  if (!match) return null;
  const major = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(major) ? major : null;
}

export function receizIdPrimaryLoginRequiresLegacyPbiForBrowser(input?: ReceizIdPrimaryLoginBrowserInput): boolean {
  const userAgent = browserUserAgent(input);
  if (!userAgent) return false;

  const directIos = /\b(iPhone|iPad|iPod)\b/i.test(userAgent);
  const platform = browserPlatform(input);
  const maxTouchPoints = browserMaxTouchPoints(input);
  const ipadOsDesktop =
    platform === "MacIntel" &&
    maxTouchPoints > 1 &&
    /\bMobile\//i.test(userAgent);

  if (!directIos && !ipadOsDesktop) return false;

  const iosMajor = parseIosMajorVersion(userAgent);
  if (iosMajor !== null) return iosMajor <= 17;

  if (ipadOsDesktop) {
    const safariMajor = parseSafariVersionMajor(userAgent);
    return safariMajor === null || safariMajor <= 17;
  }

  return false;
}

function readStoredReceizDeviceIdentitySupportRecord(): {
  keyId: string;
  alg: string;
} | null {
  if (readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY) !== null) {
    const held = peekActiveReceizDeviceIdentityFromRegister();
    return held ? { keyId: held.keyFile.keyId, alg: held.keyFile.alg } : null;
  }
  const raw = readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredReceizDeviceIdentitySupportRecord | null;
    if (!parsed || parsed.schema !== RECEIZ_DEVICE_IDENTITY_SCHEMA) return null;
    const keyId = normalizeIdentityKeyId(parsed.keyFile?.keyId);
    const alg = normalizeStoredReceizIdentityAlgorithm(parsed.keyFile?.alg);
    if (!keyId || !alg) return null;
    return { keyId, alg };
  } catch {
    return null;
  }
}

export function storedReceizDeviceIdentityIsUnsupportedPrimaryForKeyId(keyIdInput: unknown): boolean {
  const keyId = normalizeIdentityKeyId(keyIdInput);
  if (!keyId) return false;
  const identity = readStoredReceizDeviceIdentitySupportRecord();
  if (!identity || identity.keyId !== keyId) return false;
  return identity.alg !== "Ed25519" && identity.alg !== "P-256";
}
