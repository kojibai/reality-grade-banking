import { blake3 } from "hash-wasm";

import { canonicalizeReceizV122 } from "./v122Canonical.js";
import {
  receizKaiMomentFromSealedUpulse,
  receizKaiNow,
  type ReceizKaiSealedUpulseMoment,
} from "./v124Kai.js";
import kaiSigilVerificationKey from "./kaiSigilVerificationKey.js";
import { sha256Hex } from "./verifier/crypto.js";

export const RECEIZ_KKS_V1_VERSION = "KKSv1.0" as const;
export const RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA = "receiz.kks-v1.proof-coordinate.v1" as const;
export const RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA = "receiz.kaisigil.temporal-proof.v1" as const;
export const RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA = "receiz.kaisigil.temporal-payload.v1" as const;
export const RECEIZ_KAI_SIGIL_GROTH16_SCHEMA = "receiz.kaisigil.groth16-poseidon.v1" as const;
export const RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID =
  "sha256:7889fc795b72acb774d72c86bb5c09cf726dcffdbb95c9c7b8ffb6337fbf2b21" as const;

export type ReceizKksV1CoordinateSource =
  | "live-monotonic-frequency-from-genesis"
  | "sealed-carried-coordinate";

export type ReceizKaiSigilTemporalPayloadV1 = Readonly<{
  schema: typeof RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA;
  kksVersion: typeof RECEIZ_KKS_V1_VERSION;
  kaiPulse: string;
  kaiUpulse: string;
  source: ReceizKksV1CoordinateSource;
  beat: number;
  stepIndex: number;
  weekday: ReceizKaiSealedUpulseMoment["weekday"];
  chakraDay: ReceizKaiSealedUpulseMoment["chakraDay"];
  previousKaiSigilProofHead: string | null;
}>;

export type ReceizKaiSigilGroth16ProofV1 = Readonly<{
  schema: typeof RECEIZ_KAI_SIGIL_GROTH16_SCHEMA;
  verificationKeyId: typeof RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID;
  proof: Readonly<{
    pi_a: readonly [string, string, string];
    pi_b: readonly [
      readonly [string, string],
      readonly [string, string],
      readonly [string, string],
    ];
    pi_c: readonly [string, string, string];
    protocol: "groth16";
    curve: "bn128";
  }>;
  publicSignals: readonly [string, string];
}>;

export type ReceizKaiSigilTemporalProofV1 = Readonly<{
  schema: typeof RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA;
  payload: ReceizKaiSigilTemporalPayloadV1;
  payloadHashBlake3: string;
  zkPoseidonHash: string;
  groth16: ReceizKaiSigilGroth16ProofV1;
  proofHead: string;
}>;

export type ReceizKksV1ProofCoordinate = Readonly<{
  schema: typeof RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA;
  kksVersion: typeof RECEIZ_KKS_V1_VERSION;
  kaiPulse: string;
  kaiUpulse: string;
  source: ReceizKksV1CoordinateSource;
  kaiSigil: ReceizKaiSigilTemporalProofV1;
  authority: Readonly<{
    temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
    intrinsicProof: "kaisigil-blake3-poseidon-groth16";
    causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse";
    chronosRole: "descriptive-projection-only";
    createdAtAuthority: false;
    networkRequired: false;
  }>;
}>;

export type ReceizKaiSigilProofFactoryV1 = (input: Readonly<{
  payload: ReceizKaiSigilTemporalPayloadV1;
  payloadHashBlake3: string;
  secret: string;
  zkPoseidonHash: string;
}>) => Promise<Readonly<{
  proof: ReceizKaiSigilGroth16ProofV1["proof"];
  publicSignals: readonly [string, string];
}>>;

export type ReceizKksV1AdmissionContext = Readonly<{
  expectedPreviousKaiSigilProofHead?: string | null;
  minimumExclusiveKaiUpulse?: string;
  maximumInclusiveKaiUpulse?: string;
}>;

const UINT = /^(0|[1-9][0-9]*)$/u;
const DECIMAL = /^(0|[1-9][0-9]*)$/u;
const HEX64 = /^[0-9a-f]{64}$/u;
const FIELD_MODULUS = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617",
);
const ROUND_CONSTANTS: readonly (readonly [bigint, bigint])[] = Object.freeze([
  [1n, 2n], [3n, 4n], [5n, 6n], [7n, 8n],
  [9n, 10n], [11n, 12n], [13n, 14n], [15n, 16n],
]);
const COORDINATE_KEYS = Object.freeze([
  "schema", "kksVersion", "kaiPulse", "kaiUpulse", "source", "kaiSigil", "authority",
] as const);
const AUTHORITY_KEYS = Object.freeze([
  "temporalAuthority", "intrinsicProof", "causalOrder", "chronosRole",
  "createdAtAuthority", "networkRequired",
] as const);
const TEMPORAL_PROOF_KEYS = Object.freeze([
  "schema", "payload", "payloadHashBlake3", "zkPoseidonHash", "groth16", "proofHead",
] as const);
const TEMPORAL_PAYLOAD_KEYS = Object.freeze([
  "schema", "kksVersion", "kaiPulse", "kaiUpulse", "source", "beat", "stepIndex",
  "weekday", "chakraDay", "previousKaiSigilProofHead",
] as const);
const GROTH16_KEYS = Object.freeze(["schema", "verificationKeyId", "proof", "publicSignals"] as const);
const RAW_PROOF_KEYS = Object.freeze(["pi_a", "pi_b", "pi_c", "protocol", "curve"] as const);

type Groth16Verify = (
  verificationKey: unknown,
  publicSignals: readonly string[],
  proof: unknown,
) => Promise<boolean>;

let groth16VerifyPromise: Promise<Groth16Verify | null> | null = null;

function fail(code: string): never {
  throw new TypeError(code);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length
    && sortedExpected.every((key, index) => keys[index] === key);
}

function exactDecimalTuple(value: unknown, length: number): string[] | null {
  if (!Array.isArray(value) || value.length !== length
    || !value.every((entry) => typeof entry === "string" && DECIMAL.test(entry))) return null;
  return value as string[];
}

function mod(value: bigint): bigint {
  const result = value % FIELD_MODULUS;
  if (result >= BigInt(0)) return result;
  return result + FIELD_MODULUS;
}

function pow5(value: bigint): bigint {
  const squared = mod(value * value);
  const fourth = mod(squared * squared);
  return mod(fourth * value);
}

function poseidonHash1(input: bigint): bigint {
  let left = mod(input);
  let right = 0n;
  for (const [leftConstant, rightConstant] of ROUND_CONSTANTS) {
    const leftSbox = pow5(mod(left + leftConstant));
    const rightSbox = pow5(mod(right + rightConstant));
    left = mod(leftSbox + rightSbox * 2n);
    right = mod(leftSbox * 3n + rightSbox * 4n);
  }
  return left;
}

function payloadFromUpulse(
  kaiUpulse: string,
  source: ReceizKksV1CoordinateSource,
  previousKaiSigilProofHead: string | null,
): ReceizKaiSigilTemporalPayloadV1 {
  if (!UINT.test(kaiUpulse)) return fail("V125_KKS_PROOF_COORDINATE_INVALID");
  if (previousKaiSigilProofHead !== null && !HEX64.test(previousKaiSigilProofHead)) {
    return fail("V125_KAI_SIGIL_PREVIOUS_HEAD_INVALID");
  }
  const upulse = BigInt(kaiUpulse);
  if (upulse > BigInt(Number.MAX_SAFE_INTEGER)) return fail("V125_KKS_PROOF_COORDINATE_RANGE_INVALID");
  const moment = receizKaiMomentFromSealedUpulse(upulse);
  return Object.freeze({
    schema: RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA,
    kksVersion: RECEIZ_KKS_V1_VERSION,
    kaiPulse: String(moment.pulse),
    kaiUpulse,
    source,
    beat: moment.beat,
    stepIndex: moment.stepIndex,
    weekday: moment.weekday,
    chakraDay: moment.chakraDay,
    previousKaiSigilProofHead,
  });
}

async function blake3Canonical(value: unknown): Promise<string> {
  return blake3(new TextEncoder().encode(canonicalizeReceizV122(value)));
}

async function proofCommitment(payload: ReceizKaiSigilTemporalPayloadV1): Promise<Readonly<{
  payloadHashBlake3: string;
  secret: string;
  zkPoseidonHash: string;
}>> {
  const payloadHashBlake3 = await blake3Canonical(payload);
  const secret = mod(BigInt(`0x${payloadHashBlake3}`)).toString();
  return Object.freeze({
    payloadHashBlake3,
    secret,
    zkPoseidonHash: poseidonHash1(BigInt(secret)).toString(),
  });
}

async function loadGroth16Verify(): Promise<Groth16Verify> {
  if (!groth16VerifyPromise) {
    groth16VerifyPromise = import("snarkjs")
      .then((module: unknown) => {
        const candidate = module as {
          groth16?: { verify?: Groth16Verify };
          default?: { groth16?: { verify?: Groth16Verify } };
        };
        if (typeof candidate.groth16?.verify === "function") {
          return candidate.groth16.verify.bind(candidate.groth16);
        }
        if (typeof candidate.default?.groth16?.verify === "function") {
          return candidate.default.groth16.verify.bind(candidate.default.groth16);
        }
        return null;
      })
      .catch(() => null);
  }
  const verify = await groth16VerifyPromise;
  if (!verify) {
    groth16VerifyPromise = null;
    return fail("V125_KAI_SIGIL_GROTH16_RUNTIME_UNAVAILABLE");
  }
  return verify;
}

function parseRawProof(value: unknown): ReceizKaiSigilGroth16ProofV1["proof"] {
  if (!isPlainRecord(value) || !hasExactKeys(value, RAW_PROOF_KEYS)
    || value.protocol !== "groth16" || value.curve !== "bn128") {
    return fail("V125_KAI_SIGIL_GROTH16_PROOF_INVALID");
  }
  const piA = exactDecimalTuple(value.pi_a, 3);
  const piC = exactDecimalTuple(value.pi_c, 3);
  if (!piA || !piC || !Array.isArray(value.pi_b) || value.pi_b.length !== 3) {
    return fail("V125_KAI_SIGIL_GROTH16_PROOF_INVALID");
  }
  const piB = value.pi_b.map((entry) => exactDecimalTuple(entry, 2));
  if (piB.some((entry) => entry === null)) return fail("V125_KAI_SIGIL_GROTH16_PROOF_INVALID");
  return Object.freeze({
    pi_a: Object.freeze([piA[0]!, piA[1]!, piA[2]!] as const),
    pi_b: Object.freeze([
      Object.freeze([piB[0]![0]!, piB[0]![1]!] as const),
      Object.freeze([piB[1]![0]!, piB[1]![1]!] as const),
      Object.freeze([piB[2]![0]!, piB[2]![1]!] as const),
    ] as const),
    pi_c: Object.freeze([piC[0]!, piC[1]!, piC[2]!] as const),
    protocol: "groth16" as const,
    curve: "bn128" as const,
  });
}

function parsePayload(value: unknown): ReceizKaiSigilTemporalPayloadV1 {
  if (!isPlainRecord(value) || !hasExactKeys(value, TEMPORAL_PAYLOAD_KEYS)
    || value.schema !== RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA
    || value.kksVersion !== RECEIZ_KKS_V1_VERSION
    || typeof value.kaiPulse !== "string" || !UINT.test(value.kaiPulse)
    || typeof value.kaiUpulse !== "string" || !UINT.test(value.kaiUpulse)
    || (value.source !== "live-monotonic-frequency-from-genesis" && value.source !== "sealed-carried-coordinate")
    || !Number.isSafeInteger(value.beat) || !Number.isSafeInteger(value.stepIndex)
    || typeof value.weekday !== "string" || typeof value.chakraDay !== "string"
    || (value.previousKaiSigilProofHead !== null
      && (typeof value.previousKaiSigilProofHead !== "string" || !HEX64.test(value.previousKaiSigilProofHead)))) {
    return fail("V125_KAI_SIGIL_TEMPORAL_PAYLOAD_INVALID");
  }
  const expected = payloadFromUpulse(value.kaiUpulse, value.source, value.previousKaiSigilProofHead as string | null);
  if (canonicalizeReceizV122(value) !== canonicalizeReceizV122(expected)) {
    return fail("V125_KAI_SIGIL_KKS_LATTICE_MISMATCH");
  }
  return expected;
}

async function parseKaiSigilProof(value: unknown): Promise<ReceizKaiSigilTemporalProofV1> {
  if (!isPlainRecord(value) || !hasExactKeys(value, TEMPORAL_PROOF_KEYS)
    || value.schema !== RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA
    || typeof value.payloadHashBlake3 !== "string" || !HEX64.test(value.payloadHashBlake3)
    || typeof value.zkPoseidonHash !== "string" || !DECIMAL.test(value.zkPoseidonHash)
    || typeof value.proofHead !== "string" || !HEX64.test(value.proofHead)) {
    return fail("V125_KAI_SIGIL_TEMPORAL_PROOF_INVALID");
  }
  const payload = parsePayload(value.payload);
  const commitment = await proofCommitment(payload);
  if (commitment.payloadHashBlake3 !== value.payloadHashBlake3
    || commitment.zkPoseidonHash !== value.zkPoseidonHash) {
    return fail("V125_KAI_SIGIL_COMMITMENT_MISMATCH");
  }
  if (!isPlainRecord(value.groth16) || !hasExactKeys(value.groth16, GROTH16_KEYS)
    || value.groth16.schema !== RECEIZ_KAI_SIGIL_GROTH16_SCHEMA
    || value.groth16.verificationKeyId !== RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID) {
    return fail("V125_KAI_SIGIL_GROTH16_PROOF_INVALID");
  }
  const proof = parseRawProof(value.groth16.proof);
  const publicSignals = exactDecimalTuple(value.groth16.publicSignals, 2);
  if (!publicSignals || publicSignals[0] !== commitment.zkPoseidonHash
    || publicSignals[1] !== commitment.zkPoseidonHash) {
    return fail("V125_KAI_SIGIL_GROTH16_PUBLIC_SIGNAL_MISMATCH");
  }
  const verified = await (await loadGroth16Verify())(
    kaiSigilVerificationKey,
    publicSignals,
    proof,
  ).catch(() => false);
  if (!verified) return fail("V125_KAI_SIGIL_GROTH16_VERIFICATION_FAILED");
  const groth16 = Object.freeze({
    schema: RECEIZ_KAI_SIGIL_GROTH16_SCHEMA,
    verificationKeyId: RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID,
    proof,
    publicSignals: Object.freeze([publicSignals[0]!, publicSignals[1]!] as const),
  });
  const basis = Object.freeze({
    schema: RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA,
    payload,
    payloadHashBlake3: commitment.payloadHashBlake3,
    zkPoseidonHash: commitment.zkPoseidonHash,
    groth16,
  });
  const proofHead = await sha256Hex(canonicalizeReceizV122(basis));
  if (proofHead !== value.proofHead) return fail("V125_KAI_SIGIL_PROOF_HEAD_MISMATCH");
  return Object.freeze({ ...basis, proofHead });
}

function coordinateFromKaiSigil(kaiSigil: ReceizKaiSigilTemporalProofV1): ReceizKksV1ProofCoordinate {
  const authority = Object.freeze({
    temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis" as const,
    intrinsicProof: "kaisigil-blake3-poseidon-groth16" as const,
    causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse" as const,
    chronosRole: "descriptive-projection-only" as const,
    createdAtAuthority: false as const,
    networkRequired: false as const,
  });
  return Object.freeze({
    schema: RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA,
    kksVersion: RECEIZ_KKS_V1_VERSION,
    kaiPulse: kaiSigil.payload.kaiPulse,
    kaiUpulse: kaiSigil.payload.kaiUpulse,
    source: kaiSigil.payload.source,
    kaiSigil,
    authority,
  });
}

function enforceAdmissionContext(
  kaiSigil: ReceizKaiSigilTemporalProofV1,
  context: ReceizKksV1AdmissionContext,
): void {
  if (context.expectedPreviousKaiSigilProofHead !== undefined
    && kaiSigil.payload.previousKaiSigilProofHead !== context.expectedPreviousKaiSigilProofHead) {
    return fail("V125_KAI_SIGIL_PREVIOUS_HEAD_MISMATCH");
  }
  if (context.minimumExclusiveKaiUpulse !== undefined) {
    if (!UINT.test(context.minimumExclusiveKaiUpulse)
      || BigInt(kaiSigil.payload.kaiUpulse) <= BigInt(context.minimumExclusiveKaiUpulse)) {
      return fail("V125_KAI_SIGIL_KAI_NONCAUSAL");
    }
  }
  if (context.maximumInclusiveKaiUpulse !== undefined) {
    if (!UINT.test(context.maximumInclusiveKaiUpulse)
      || BigInt(kaiSigil.payload.kaiUpulse) > BigInt(context.maximumInclusiveKaiUpulse)) {
      return fail("V125_KAI_SIGIL_KAI_FROM_FUTURE");
    }
  }
}

export async function admitReceizKksV1ProofCoordinate(
  input: unknown,
  context: ReceizKksV1AdmissionContext = {},
): Promise<ReceizKksV1ProofCoordinate> {
  if (!isPlainRecord(input) || !hasExactKeys(input, COORDINATE_KEYS)) {
    return fail("V125_KKS_PROOF_COORDINATE_SHAPE_INVALID");
  }
  const authority = input.authority;
  if (!isPlainRecord(authority) || !hasExactKeys(authority, AUTHORITY_KEYS)
    || authority.temporalAuthority !== "kai-pulse-monotonic-frequency-from-genesis"
    || authority.intrinsicProof !== "kaisigil-blake3-poseidon-groth16"
    || authority.causalOrder !== "verified-previous-head-then-strictly-greater-kai-upulse"
    || authority.chronosRole !== "descriptive-projection-only"
    || authority.createdAtAuthority !== false
    || authority.networkRequired !== false) {
    return fail("V125_KKS_PROOF_COORDINATE_AUTHORITY_INVALID");
  }
  if (input.schema !== RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA
    || input.kksVersion !== RECEIZ_KKS_V1_VERSION
    || typeof input.kaiPulse !== "string" || !UINT.test(input.kaiPulse)
    || typeof input.kaiUpulse !== "string" || !UINT.test(input.kaiUpulse)
    || (input.source !== "live-monotonic-frequency-from-genesis" && input.source !== "sealed-carried-coordinate")) {
    return fail("V125_KKS_PROOF_COORDINATE_INVALID");
  }
  const kaiSigil = await parseKaiSigilProof(input.kaiSigil);
  if (input.kaiPulse !== kaiSigil.payload.kaiPulse
    || input.kaiUpulse !== kaiSigil.payload.kaiUpulse
    || input.source !== kaiSigil.payload.source) {
    return fail("V125_KKS_PROOF_COORDINATE_MISMATCH");
  }
  enforceAdmissionContext(kaiSigil, context);
  return coordinateFromKaiSigil(kaiSigil);
}

async function createProofCoordinate(args: Readonly<{
  kaiUpulse: string;
  source: ReceizKksV1CoordinateSource;
  previousKaiSigilProofHead: string | null;
  prove: ReceizKaiSigilProofFactoryV1;
}>): Promise<ReceizKksV1ProofCoordinate> {
  const payload = payloadFromUpulse(args.kaiUpulse, args.source, args.previousKaiSigilProofHead);
  const commitment = await proofCommitment(payload);
  const generated = await args.prove({ payload, ...commitment });
  const groth16 = Object.freeze({
    schema: RECEIZ_KAI_SIGIL_GROTH16_SCHEMA,
    verificationKeyId: RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID,
    proof: generated.proof,
    publicSignals: generated.publicSignals,
  });
  const basis = Object.freeze({
    schema: RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA,
    payload,
    payloadHashBlake3: commitment.payloadHashBlake3,
    zkPoseidonHash: commitment.zkPoseidonHash,
    groth16,
  });
  const kaiSigil = Object.freeze({
    ...basis,
    proofHead: await sha256Hex(canonicalizeReceizV122(basis)),
  });
  return admitReceizKksV1ProofCoordinate(coordinateFromKaiSigil(kaiSigil));
}

/**
 * Samples one exact local KKS coordinate and seals it through the existing
 * KaiSigil BLAKE3 -> Poseidon -> Groth16 proof primitive supplied by `prove`.
 */
export async function createReceizKksV1LiveProofCoordinate(args: Readonly<{
  prove: ReceizKaiSigilProofFactoryV1;
  previousKaiSigilProofHead?: string | null;
}>): Promise<ReceizKksV1ProofCoordinate> {
  const now = receizKaiNow();
  return createProofCoordinate({
    kaiUpulse: String(now.uPulse),
    source: "live-monotonic-frequency-from-genesis",
    previousKaiSigilProofHead: args.previousKaiSigilProofHead ?? null,
    prove: args.prove,
  });
}

/** Project only an already verified, sealed KaiSigil coordinate. */
export async function projectReceizKksV1SealedProofCoordinate(
  input: unknown,
  context: ReceizKksV1AdmissionContext = {},
): Promise<Readonly<{
  coordinate: ReceizKksV1ProofCoordinate;
  moment: ReceizKaiSealedUpulseMoment;
}>> {
  const coordinate = await admitReceizKksV1ProofCoordinate(input, context);
  return Object.freeze({
    coordinate,
    moment: receizKaiMomentFromSealedUpulse(BigInt(coordinate.kaiUpulse)),
  });
}
