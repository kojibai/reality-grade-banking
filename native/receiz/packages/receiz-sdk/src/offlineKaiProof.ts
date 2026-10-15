import { sha256Hex } from "./verifier/crypto.js";
import {
  createReceizKksV1LiveProofCoordinate,
  RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID,
  type ReceizKaiSigilProofFactoryV1,
  type ReceizKksV1ProofCoordinate,
} from "./v125KaiAuthority.js";

/** These are the canonical KaiSigil circuit resources. The document-seal
 * proving key is a different key and cannot substitute for this one. */
export const RECEIZ_OFFLINE_KAI_PROOF_RESOURCES = Object.freeze({
  wasm: Object.freeze({ filename: "kai_sigil_proof.wasm", sha256: "fc72dd17e30f7e9b178eeac08f1deceec8fff5b757481455e465234fbc35e696" }),
  zkey: Object.freeze({ filename: "kai_sigil_proof_final.zkey", sha256: "838d15799730189054f811e172176df804137374fa8bb6ab7bfd50630cc8986a" }),
  verificationKeyId: RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID,
});

export type ReceizOfflineKaiProofFactory = (input?: Readonly<{
  /** The consumer must verify this head against its admitted predecessor. */
  previousKaiSigilProofHead?: string | null;
}>) => Promise<ReceizKksV1ProofCoordinate>;

type FullProve = (
  input: Readonly<{ secret: string; expectedHash: string }>,
  wasm: Uint8Array,
  zkey: Uint8Array,
  logger: undefined,
  witnessOptions: undefined,
  proverOptions: Readonly<{ singleThread: true }>,
) => Promise<Readonly<{ proof: unknown; publicSignals: unknown }>>;

/** Browser-compatible local resource composition. Callers supply already
 * available bytes, never a URL, clock, pulse, verification key or prover. */
export async function createReceizOfflineKaiProofFactory(resources: Readonly<{
  wasm: Uint8Array;
  zkey: Uint8Array;
}>): Promise<ReceizOfflineKaiProofFactory> {
  if (!resources || !(resources.wasm instanceof Uint8Array) || !(resources.zkey instanceof Uint8Array)
    || resources.wasm.byteLength === 0 || resources.zkey.byteLength === 0) {
    throw new TypeError("OFFLINE_KAI_PROOF_RESOURCE_REQUIRED");
  }
  if (Object.keys(resources).some(key => key !== "wasm" && key !== "zkey")) throw new TypeError("OFFLINE_KAI_PROOF_RESOURCE_INPUT_INVALID");
  // Retain private copies before the first await. External buffer mutation
  // cannot change the circuit that was admitted by these pinned digests.
  const wasm = new Uint8Array(resources.wasm);
  const zkey = new Uint8Array(resources.zkey);
  const [wasmHash, zkeyHash] = await Promise.all([sha256Hex(wasm), sha256Hex(zkey)]);
  if (wasmHash !== RECEIZ_OFFLINE_KAI_PROOF_RESOURCES.wasm.sha256
    || zkeyHash !== RECEIZ_OFFLINE_KAI_PROOF_RESOURCES.zkey.sha256) {
    throw new TypeError("OFFLINE_KAI_PROOF_RESOURCE_MISMATCH");
  }
  const snarkjs = await import("snarkjs") as unknown as {
    groth16?: { fullProve?: FullProve };
    default?: { groth16?: { fullProve?: FullProve } };
  };
  const groth16 = snarkjs.groth16 ?? snarkjs.default?.groth16;
  if (typeof groth16?.fullProve !== "function") throw new TypeError("OFFLINE_KAI_PROOF_RUNTIME_UNAVAILABLE");
  const fullProve = groth16.fullProve.bind(groth16);
  const prove: ReceizKaiSigilProofFactoryV1 = async ({ secret, zkPoseidonHash }) => {
    const result = await fullProve({ secret, expectedHash: zkPoseidonHash }, wasm, zkey, undefined, undefined, { singleThread: true });
    if (!Array.isArray(result.publicSignals) || result.publicSignals.length !== 2
      || result.publicSignals[0] !== zkPoseidonHash || result.publicSignals[1] !== zkPoseidonHash) {
      throw new TypeError("OFFLINE_KAI_PROOF_PUBLIC_SIGNAL_MISMATCH");
    }
    // The existing live authority parses every proof field and verifies it
    // against its pinned KaiSigil verification key before returning a coordinate.
    return { proof: result.proof as Awaited<ReturnType<ReceizKaiSigilProofFactoryV1>>["proof"], publicSignals: [result.publicSignals[0], result.publicSignals[1]] };
  };
  return Object.freeze(async (input: NonNullable<Parameters<ReceizOfflineKaiProofFactory>[0]> = {}) => {
    if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).some(key => key !== "previousKaiSigilProofHead")) {
      throw new TypeError("OFFLINE_KAI_PROOF_INPUT_INVALID");
    }
    // snarkjs may unref worker handles in Node. A bounded execution watchdog
    // keeps the pending proof/admission alive; elapsed time is never proof data.
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        createReceizKksV1LiveProofCoordinate({ prove,
          ...(input.previousKaiSigilProofHead === undefined ? {} : { previousKaiSigilProofHead: input.previousKaiSigilProofHead }),
        }),
        new Promise<never>((_, reject) => {
          watchdog = setTimeout(() => reject(new Error("OFFLINE_KAI_PROOF_EXECUTION_TIMEOUT")), 30_000);
        }),
      ]);
    } finally { if (watchdog !== undefined) clearTimeout(watchdog); }
  });
}
