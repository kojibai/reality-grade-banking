"use client";

import type {
  ReceizKeyFile,
  ReceizVerifiedIdentityArtifactAdmission,
} from "../../../packages/receiz-sdk/src/index";

export type ActiveIdentityCustodyContext = Readonly<{
  ownerReceizId: string;
  actorId: string;
  issuerKeyId: string;
  artifactSha256: string;
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  keyFile: ReceizKeyFile;
  unlock(): string;
}>;

type ActiveIdentityCustodyInput = Readonly<{
  ownerReceizId: string;
  actorId: string;
  issuerKeyId: string;
  artifactSha256: string;
  actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  keyFile: ReceizKeyFile;
  passphrase: string;
}>;

let activeContext: ActiveIdentityCustodyContext | null = null;
let activeAdmissionGeneration = 0;

function requiredText(value: string, code: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(code);
  return normalized;
}

/**
 * Keeps the exact already-admitted Identity Record selector and its signing
 * material in this JavaScript runtime only. Serializable enumeration exposes
 * proof identity, never the key file or unlock secret.
 */
function installActiveIdentityCustodyContext(
  input: ActiveIdentityCustodyInput,
): ActiveIdentityCustodyContext {
  const ownerReceizId = requiredText(
    input.ownerReceizId,
    "RECEIZ_ACTIVE_IDENTITY_OWNER_REQUIRED",
  );
  const actorId = requiredText(
    input.actorId,
    "RECEIZ_ACTIVE_IDENTITY_ACTOR_REQUIRED",
  );
  const issuerKeyId = requiredText(
    input.issuerKeyId,
    "RECEIZ_ACTIVE_IDENTITY_ISSUER_REQUIRED",
  );
  const artifactSha256 = requiredText(
    input.artifactSha256,
    "RECEIZ_ACTIVE_IDENTITY_ARTIFACT_REQUIRED",
  );
  if (
    input.keyFile.keyId !== issuerKeyId
    || input.keyFile.owner.uid !== actorId
    || input.actorAdmission.artifactSha256 !== artifactSha256
    || typeof input.passphrase !== "string"
  ) {
    throw new TypeError("RECEIZ_ACTIVE_IDENTITY_CUSTODY_MISMATCH");
  }
  const passphrase = input.passphrase;
  const context = {
    ownerReceizId,
    actorId,
    issuerKeyId,
    artifactSha256,
  } as ActiveIdentityCustodyContext;
  Object.defineProperties(context, {
    keyFile: {
      value: input.keyFile,
      enumerable: false,
      writable: false,
      configurable: false,
    },
    actorAdmission: {
      value: input.actorAdmission,
      enumerable: false,
      writable: false,
      configurable: false,
    },
    unlock: {
      value: () => passphrase,
      enumerable: false,
      writable: false,
      configurable: false,
    },
  });
  activeContext = Object.freeze(context);
  return activeContext;
}

export function admitActiveIdentityCustodyContext(
  input: ActiveIdentityCustodyInput,
): ActiveIdentityCustodyContext {
  activeAdmissionGeneration += 1;
  return installActiveIdentityCustodyContext(input);
}

/**
 * Begins one accepted identity transition. Any older deferred finalizer becomes
 * unable to install custody after logout or a newer accepted identity.
 */
export function beginActiveIdentityCustodyAdmission(): number {
  activeAdmissionGeneration += 1;
  activeContext = null;
  return activeAdmissionGeneration;
}

export function admitActiveIdentityCustodyContextIfCurrent(
  input: ActiveIdentityCustodyInput,
  expectedGeneration: number,
): ActiveIdentityCustodyContext | null {
  if (
    !Number.isSafeInteger(expectedGeneration)
    || expectedGeneration !== activeAdmissionGeneration
  ) return null;
  return installActiveIdentityCustodyContext(input);
}

export function peekActiveIdentityCustodyContext(
  ownerReceizId?: string | null,
): ActiveIdentityCustodyContext | null {
  if (!activeContext) return null;
  const owner = ownerReceizId?.trim();
  return owner && activeContext.ownerReceizId !== owner ? null : activeContext;
}

export function clearActiveIdentityCustodyContext(): void {
  activeAdmissionGeneration += 1;
  activeContext = null;
}
