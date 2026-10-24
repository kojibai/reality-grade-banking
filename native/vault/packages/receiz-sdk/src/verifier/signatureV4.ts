import { base64UrlDecode, isRecord, jcsCanonicalize, sha256Hex, toArrayBuffer } from "./crypto.js";
import {
  isCanonicalAlgorithmIdentifier,
  isCanonicalBase64Url,
  isCanonicalHex,
  isCanonicalKeyId,
  isPositiveSafeInteger,
  isSafeNonnegativeInteger,
  isVersionIdentifier,
} from "./canonicalSyntax.js";

export type ReceizSignatureV4RootPublicKey = Readonly<{
  kid: string;
  alg: "Ed25519";
  publicKeyRawB64u: string;
  status: "active" | "retired";
  activeFromPulse?: string;
  retiredAtPulse?: string;
}>;

type DeviceCert = Readonly<{
  version: 1;
  certType: "receiz.device.v1";
  certId: string;
  issuerKid: string;
  alg: "Ed25519";
  subjectPublicKeyRawB64u: string;
  issuedAtMs: number;
  expiresAtMs: number;
  sig: string;
}>;

export type ReceizSignatureV4CertificateStructure = Readonly<{
  record: Record<string, unknown>;
  version: number;
  certType: string;
  certId: string;
  issuerKid: string;
  alg: string;
  subjectPublicKeyRawB64u: string;
  issuedAtMs: number;
  expiresAtMs: number;
  sig: string;
}>;

export type ReceizSignatureV4Structure = Readonly<{
  record: Record<string, unknown>;
  version: number;
  alg: string;
  cert: ReceizSignatureV4CertificateStructure;
  sig: string;
  payloadHashSha256: string;
  signedAtMs: number;
}>;

function nonempty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recognizeDeviceCertStructure(value: unknown): ReceizSignatureV4CertificateStructure | null {
  if (
    !isRecord(value)
    || !isPositiveSafeInteger(value.version)
    || !isVersionIdentifier(value.certType, "receiz.device.v")
    || !isCanonicalHex(value.certId, 32)
    || !isCanonicalKeyId(value.issuerKid)
    || !isCanonicalAlgorithmIdentifier(value.alg)
    || !isCanonicalBase64Url(value.subjectPublicKeyRawB64u)
    || !isSafeNonnegativeInteger(value.issuedAtMs)
    || !isSafeNonnegativeInteger(value.expiresAtMs)
    || value.expiresAtMs <= value.issuedAtMs
    || !isCanonicalBase64Url(value.sig)
  ) return null;
  return {
    record: value,
    version: value.version,
    certType: value.certType,
    certId: value.certId,
    issuerKid: value.issuerKid,
    alg: value.alg,
    subjectPublicKeyRawB64u: value.subjectPublicKeyRawB64u,
    issuedAtMs: value.issuedAtMs,
    expiresAtMs: value.expiresAtMs,
    sig: value.sig,
  };
}

export function recognizeReceizSignatureV4Structure(value: unknown): ReceizSignatureV4Structure | null {
  if (!isRecord(value)) return null;
  const cert = recognizeDeviceCertStructure(value.cert);
  if (
    !isPositiveSafeInteger(value.version)
    || !isCanonicalAlgorithmIdentifier(value.alg)
    || !cert
    || !isCanonicalBase64Url(value.sig)
    || !isCanonicalHex(value.payloadHashSha256, 64)
    || !isSafeNonnegativeInteger(value.signedAtMs)
    || value.signedAtMs < cert.issuedAtMs
    || value.signedAtMs > cert.expiresAtMs
  ) return null;
  return {
    record: value,
    version: value.version,
    alg: value.alg,
    cert,
    sig: value.sig,
    payloadHashSha256: value.payloadHashSha256,
    signedAtMs: value.signedAtMs,
  };
}

function parseCert(value: unknown): DeviceCert | null {
  const structure = recognizeDeviceCertStructure(value);
  if (!structure || structure.version !== 1 || structure.certType !== "receiz.device.v1" || structure.alg !== "Ed25519") return null;
  return {
    version: 1,
    certType: "receiz.device.v1",
    certId: structure.certId.toLowerCase(),
    issuerKid: structure.issuerKid,
    alg: "Ed25519",
    subjectPublicKeyRawB64u: structure.subjectPublicKeyRawB64u,
    issuedAtMs: structure.issuedAtMs,
    expiresAtMs: structure.expiresAtMs,
    sig: structure.sig,
  };
}

function signedBundlePayload(bundle: Record<string, unknown>): string {
  return jcsCanonicalize({
    kind: bundle.kind,
    payloadVersion: bundle.payloadVersion,
    createdAtMs: bundle.createdAtMs,
    ts: bundle.ts,
    tsDisplay: bundle.tsDisplay ?? "",
    tzMinutesEast: typeof bundle.tzMinutesEast === "number" ? bundle.tzMinutesEast : null,
    code: bundle.code,
    slug: bundle.slug,
    verifyPath: bundle.verifyPath,
    verifyUrl: bundle.verifyUrl,
    kaiPulseEternal: bundle.kaiPulseEternal,
    kaiKlok: bundle.kaiKlok,
    signerKeyId: bundle.signerKeyId ?? "",
    anchorId: bundle.anchorId ?? "",
    receizClaimId: bundle.receizClaimId,
    sigilClaimSeed: bundle.sigilClaimSeed,
    zkPoseidonHash: bundle.zkPoseidonHash ?? "",
    groth16ProofDigest: bundle.groth16ProofDigest ?? "",
    artifactSha256Basis: bundle.artifactSha256Basis ?? "",
    ...(bundle.artifactBasis ? { artifactBasis: bundle.artifactBasis } : {}),
    ...(bundle.nativeRecordSeal ? { nativeRecordSeal: bundle.nativeRecordSeal } : {}),
    wireproof: bundle.wireproof ?? null,
  });
}

const importedEd25519Keys = new Map<string, Promise<CryptoKey | null>>();
const verifiedDeviceCertificates = new Map<string, Promise<boolean>>();
const MAX_VERIFIED_DEVICE_CERTIFICATES = 256;
const MAX_IMPORTED_ED25519_KEYS = 256;

function rememberDeviceCertificateVerification(
  key: string,
  verify: () => Promise<boolean>,
): Promise<boolean> {
  const existing = verifiedDeviceCertificates.get(key);
  if (existing) {
    verifiedDeviceCertificates.delete(key);
    verifiedDeviceCertificates.set(key, existing);
    return existing;
  }
  while (verifiedDeviceCertificates.size >= MAX_VERIFIED_DEVICE_CERTIFICATES) {
    const oldest = verifiedDeviceCertificates.keys().next().value;
    if (typeof oldest !== "string") break;
    verifiedDeviceCertificates.delete(oldest);
  }
  const pending = verify();
  verifiedDeviceCertificates.set(key, pending);
  void pending.then(
    (valid) => {
      if (!valid && verifiedDeviceCertificates.get(key) === pending) {
        verifiedDeviceCertificates.delete(key);
      }
    },
    () => {
      if (verifiedDeviceCertificates.get(key) === pending) {
        verifiedDeviceCertificates.delete(key);
      }
    },
  );
  return pending;
}

async function importEd25519(value: string): Promise<CryptoKey | null> {
  const existing = importedEd25519Keys.get(value);
  if (existing) {
    importedEd25519Keys.delete(value);
    importedEd25519Keys.set(value, existing);
    return existing;
  }
  while (importedEd25519Keys.size >= MAX_IMPORTED_ED25519_KEYS) {
    const oldest = importedEd25519Keys.keys().next().value;
    if (typeof oldest !== "string") break;
    importedEd25519Keys.delete(oldest);
  }
  const imported = (async () => {
    try {
      return await globalThis.crypto.subtle.importKey("raw", toArrayBuffer(base64UrlDecode(value)), { name: "Ed25519" }, false, ["verify"]);
    } catch {
      return null;
    }
  })();
  importedEd25519Keys.set(value, imported);
  void imported.then(
    (key) => {
      if (!key && importedEd25519Keys.get(value) === imported) {
        importedEd25519Keys.delete(value);
      }
    },
    () => {
      if (importedEd25519Keys.get(value) === imported) {
        importedEd25519Keys.delete(value);
      }
    },
  );
  return imported;
}

async function verifyEd25519(key: CryptoKey, signature: string, payload: Uint8Array): Promise<boolean> {
  try {
    return await globalThis.crypto.subtle.verify("Ed25519", key, toArrayBuffer(base64UrlDecode(signature)), toArrayBuffer(payload));
  } catch {
    return false;
  }
}

export async function verifyReceizSignatureV4(
  bundle: Record<string, unknown>,
  roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
): Promise<string | null> {
  const value = bundle.signatureV4;
  if (!isRecord(value) || value.version !== 1 || value.alg !== "Ed25519") return "Trusted signature is required for trusted verification (signatureV4).";
  const structure = recognizeReceizSignatureV4Structure(value);
  if (!structure) return "signatureV4 payload is malformed.";
  const cert = parseCert(value.cert);
  if (!cert) return "signatureV4 payload is malformed.";
  const sig = structure.sig;
  const claimedHash = structure.payloadHashSha256.toLowerCase();
  const signedAtMs = structure.signedAtMs;

  const payload = new TextEncoder().encode(signedBundlePayload(bundle));
  if (await sha256Hex(payload) !== claimedHash) return "signatureV4 payload hash mismatch.";
  const root = roots.get(cert.issuerKid);
  if (!root) return "signatureV4 root key not configured.";
  const pulse = nonempty(bundle.kaiPulseEternal);
  if (!pulse || !/^\d+$/.test(pulse)) return "signatureV4 bundle pulse is invalid.";
  if (root.activeFromPulse && BigInt(pulse) < BigInt(root.activeFromPulse)) return "signatureV4 root key predates activation pulse.";
  if (root.status === "retired" && !root.retiredAtPulse) return "signatureV4 root key retired without retirement pulse.";
  if (root.retiredAtPulse && BigInt(pulse) > BigInt(root.retiredAtPulse)) return "signatureV4 root key retired for this bundle pulse.";

  const identityPayload = jcsCanonicalize({ version: cert.version, certType: cert.certType, issuerKid: cert.issuerKid, alg: cert.alg, subjectPublicKeyRawB64u: cert.subjectPublicKeyRawB64u, issuedAtMs: cert.issuedAtMs, expiresAtMs: cert.expiresAtMs });
  if ((await sha256Hex(identityPayload)).slice(0, 32) !== cert.certId) return "signatureV4 device certificate ID mismatch.";
  const certPayload = new TextEncoder().encode(jcsCanonicalize({ version: cert.version, certType: cert.certType, certId: cert.certId, issuerKid: cert.issuerKid, alg: cert.alg, subjectPublicKeyRawB64u: cert.subjectPublicKeyRawB64u, issuedAtMs: cert.issuedAtMs, expiresAtMs: cert.expiresAtMs }));
  const certificateCacheKey = jcsCanonicalize({
    verifier: "receiz.signature-v4.device-certificate.v1",
    root,
    cert,
  });
  const certificateVerification = rememberDeviceCertificateVerification(
    certificateCacheKey,
    async () => {
      const rootKey = await importEd25519(root.publicKeyRawB64u);
      return Boolean(rootKey)
        && verifyEd25519(rootKey!, cert.sig, certPayload);
    },
  );
  if (!(await certificateVerification)) {
    return "signatureV4 device certificate verification failed.";
  }
  if (signedAtMs < cert.issuedAtMs) return "signatureV4 signedAtMs predates certificate issuance.";
  if (signedAtMs > cert.expiresAtMs) return "signatureV4 device certificate expired at signedAtMs.";
  const subjectKey = await importEd25519(cert.subjectPublicKeyRawB64u);
  if (!subjectKey || !(await verifyEd25519(subjectKey, sig, payload))) return "signatureV4 verification failed.";
  return null;
}
