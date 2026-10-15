import { hmacHex } from "@/app/lib/sign";
import { groth16 } from "snarkjs";
import { base64UrlEncode, sha256Hex } from "@/app/utils/sha256";

const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const ZK_PROVE_TIMEOUT_MS = 15_000;

const ROUND_CONSTANTS = [
  [1n, 2n],
  [3n, 4n],
  [5n, 6n],
  [7n, 8n],
  [9n, 10n],
  [11n, 12n],
  [13n, 14n],
  [15n, 16n],
] as const;

const MDS = [
  [1n, 2n],
  [3n, 4n],
] as const;

type Groth16ProofObject = Readonly<Record<string, unknown>>;
type Groth16Envelope = Readonly<{
  v: "receiz.g16.real.v1";
  proof: Groth16ProofObject;
  publicSignals: readonly string[];
}>;

function modField(value: bigint): bigint {
  const out = value % FIELD_MODULUS;
  return out >= 0n ? out : out + FIELD_MODULUS;
}

function pow5(value: bigint): bigint {
  const sq = modField(value * value);
  const quad = modField(sq * sq);
  return modField(quad * value);
}

// Poseidon(1) implementation used by our Circom document-seal circuit.
function poseidon1(secret: bigint): bigint {
  let x0 = modField(secret);
  let x1 = 0n;
  for (let i = 0; i < ROUND_CONSTANTS.length; i += 1) {
    const [rc0, rc1] = ROUND_CONSTANTS[i]!;
    const t0 = modField(x0 + rc0);
    const t1 = modField(x1 + rc1);
    const s0 = pow5(t0);
    const s1 = pow5(t1);
    x0 = modField(s0 * MDS[0][0] + s1 * MDS[0][1]);
    x1 = modField(s0 * MDS[1][0] + s1 * MDS[1][1]);
  }
  return x0;
}

async function deriveSealSecret(args: { signingKey: string; canonicalIdentity: string; artifactSha256Basis: string }): Promise<bigint> {
  const digestHex = await hmacHex(`receiz-doc-g16|${args.canonicalIdentity}|${args.artifactSha256Basis}`, args.signingKey);
  return modField(BigInt(`0x${digestHex}`));
}

function normalizeProofObject(value: unknown): Groth16ProofObject {
  return JSON.parse(JSON.stringify(value)) as Groth16ProofObject;
}

function normalizePublicSignals(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry));
}

function asHex32(fieldValue: bigint): string {
  return fieldValue.toString(16).padStart(64, "0");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutCode: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutCode)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function generateDocumentSealGroth16ProofWithResources(args: {
  signingKey: string;
  canonicalIdentity: string;
  artifactSha256Basis: string;
}, resources: Readonly<{ wasmPath: string | Uint8Array; zkeyPath: string | Uint8Array }>): Promise<{
  zkPoseidonHash: string;
  groth16Proof: string;
  groth16ProofDigest: string;
}> {
  const secret = await deriveSealSecret(args);
  const expectedHashField = poseidon1(secret);
  const expectedHashDec = expectedHashField.toString();

  const fullProveExtended = groth16.fullProve as unknown as (
    input: Record<string, string>,
    wasmPath: string | Uint8Array,
    zkeyPath: string | Uint8Array,
    logger?: unknown,
    wtnsCalcOptions?: unknown,
    proverOptions?: { singleThread?: boolean }
  ) => Promise<{ proof: unknown; publicSignals: unknown }>;

  const { proof, publicSignals } = await withTimeout(
    fullProveExtended(
      {
        secret: secret.toString(),
        expectedHash: expectedHashDec,
      },
      resources.wasmPath,
      resources.zkeyPath,
      undefined,
      undefined,
      { singleThread: true }
    ),
    ZK_PROVE_TIMEOUT_MS,
    "groth16_prove_timeout"
  );

  const normalizedProof = normalizeProofObject(proof);
  const normalizedSignals = normalizePublicSignals(publicSignals);

  if (normalizedSignals.length < 2) {
    throw new Error("groth16_public_signals_missing");
  }
  if (normalizedSignals[0] !== expectedHashDec || normalizedSignals[1] !== expectedHashDec) {
    throw new Error("groth16_public_signal_mismatch");
  }

  const envelope: Groth16Envelope = {
    v: "receiz.g16.real.v1",
    proof: normalizedProof,
    publicSignals: normalizedSignals,
  };

  const envelopeBytes = new TextEncoder().encode(JSON.stringify(envelope));
  const encodedProof = `g16:${base64UrlEncode(envelopeBytes)}`;
  const proofDigest = (await sha256Hex(encodedProof)).toLowerCase();

  return {
    zkPoseidonHash: asHex32(expectedHashField),
    groth16Proof: encodedProof,
    groth16ProofDigest: proofDigest,
  };
}
