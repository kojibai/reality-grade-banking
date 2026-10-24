import documentSealVerificationKey from "./documentSealVerificationKey.js";
import { base64UrlDecode, isRecord, sha256Hex } from "./crypto.js";
import {
  isCanonicalBase64Url,
  isCanonicalDecimal,
  isCanonicalHex,
  isVersionIdentifier,
} from "./canonicalSyntax.js";

type Groth16Verify = (verificationKey: unknown, publicSignals: readonly string[], proof: unknown) => Promise<boolean>;
let verifierPromise: Promise<Groth16Verify | null> | null = null;

export type ReceizGroth16Structure = Readonly<{
  proofText: string;
  versionMarker: string;
  proof: Record<string, unknown>;
  publicSignals: readonly string[];
}>;

function isDecimalTuple(value: unknown, length: number): value is string[] {
  return Array.isArray(value)
    && value.length === length
    && value.every((entry) => isCanonicalDecimal(entry));
}

function isPairTuple(value: unknown): value is [string, string] {
  return isDecimalTuple(value, 2);
}

export function recognizeReceizGroth16Structure(value: unknown): ReceizGroth16Structure | null {
  if (typeof value !== "string") return null;
  const separator = value.indexOf(":");
  if (separator < 0 || value.slice(0, separator) !== "g16") return null;
  const payload = value.slice(separator + 1);
  if (!isCanonicalBase64Url(payload)) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
  if (
    !isRecord(decoded)
    || !isVersionIdentifier(decoded.v, "receiz.g16.real.v")
    || !isRecord(decoded.proof)
    || decoded.proof.protocol !== "groth16"
    || decoded.proof.curve !== "bn128"
    || !isDecimalTuple(decoded.proof.pi_a, 3)
    || !Array.isArray(decoded.proof.pi_b)
    || decoded.proof.pi_b.length !== 3
    || !decoded.proof.pi_b.every(isPairTuple)
    || !isDecimalTuple(decoded.proof.pi_c, 3)
    || !Array.isArray(decoded.publicSignals)
    || decoded.publicSignals.length < 2
    || !decoded.publicSignals.every((entry) => isCanonicalDecimal(entry))
  ) return null;
  return {
    proofText: value,
    versionMarker: decoded.v,
    proof: decoded.proof,
    publicSignals: decoded.publicSignals,
  };
}

async function loadVerifier(): Promise<Groth16Verify | null> {
  if (!verifierPromise) {
    verifierPromise = import("snarkjs")
      .then((module: unknown) => {
        const row = module as { groth16?: { verify?: Groth16Verify }; default?: { groth16?: { verify?: Groth16Verify } } };
        const groth16 = row.groth16 ?? row.default?.groth16;
        return typeof groth16?.verify === "function" ? groth16.verify.bind(groth16) : null;
      })
      .catch(() => null);
  }
  const verifier = await verifierPromise;
  if (!verifier) verifierPromise = null;
  return verifier;
}

export async function verifyReceizGroth16(input: {
  zkPoseidonHash: unknown;
  groth16Proof: unknown;
  groth16ProofDigest: unknown;
}): Promise<string | null> {
  const zkPoseidonHash = typeof input.zkPoseidonHash === "string" ? input.zkPoseidonHash.trim().toLowerCase() : "";
  const groth16Proof = typeof input.groth16Proof === "string" ? input.groth16Proof : "";
  const groth16ProofDigest = typeof input.groth16ProofDigest === "string" ? input.groth16ProofDigest.trim().toLowerCase() : "";
  if (!isCanonicalHex(zkPoseidonHash, 64) || !isCanonicalHex(groth16ProofDigest, 64)) return "Groth16 proof metadata is missing or malformed.";
  const structure = recognizeReceizGroth16Structure(groth16Proof);
  if (!structure) return "Real Groth16 bundle payload is invalid.";
  if (structure.versionMarker !== "receiz.g16.real.v1") return "Unsupported real Groth16 bundle version.";
  const publicSignals = structure.publicSignals;
  const expected = BigInt(`0x${zkPoseidonHash}`).toString();
  if (publicSignals[0] !== expected || publicSignals[1] !== expected) return "Real Groth16 public signal mismatch for zkPoseidonHash.";
  if (await sha256Hex(groth16Proof) !== groth16ProofDigest) return "Real Groth16 proof digest mismatch.";
  const verify = await loadVerifier();
  if (!verify) return "Groth16 verifier runtime unavailable.";
  try {
    return await verify(documentSealVerificationKey, publicSignals, structure.proof) ? null : "Groth16 proof verification failed.";
  } catch {
    return "Groth16 proof verification failed.";
  }
}
