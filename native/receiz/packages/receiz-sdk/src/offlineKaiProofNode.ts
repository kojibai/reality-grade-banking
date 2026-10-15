import { readFile } from "node:fs/promises";
import { fork, type ChildProcess } from "node:child_process";
import { createReceizOfflineKaiProofFactory, RECEIZ_OFFLINE_KAI_PROOF_RESOURCES, type ReceizOfflineKaiProofFactory } from "./offlineKaiProof.js";
import type { ReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";

/** Load the shipped canonical KaiSigil circuit locally. No enrollment,
 * network, caller clock, raw pulse, proof callback or alternate root exists. */
export async function createReceizNodeOfflineKaiProofFactory(): Promise<ReceizOfflineKaiProofFactory> {
  let wasm: Uint8Array;
  let zkey: Uint8Array;
  try {
    [wasm, zkey] = await Promise.all([
      readFile(new URL(`../offline-resources/${RECEIZ_OFFLINE_KAI_PROOF_RESOURCES.wasm.filename}`, import.meta.url)),
      readFile(new URL(`../offline-resources/${RECEIZ_OFFLINE_KAI_PROOF_RESOURCES.zkey.filename}`, import.meta.url)),
    ]);
  } catch {
    throw new Error("OFFLINE_KAI_PROOF_PACKAGED_RESOURCE_UNAVAILABLE");
  }
  // Admit the packaged resources before exposing the factory. The isolated
  // worker repeats this check and owns snarkjs' retained verifier workers.
  await createReceizOfflineKaiProofFactory({ wasm, zkey });
  let worker: ChildProcess | undefined;
  let supplyResources = false;
  let sequence = 0;
  const pending = new Map<number, {
    resolve: (proof: ReceizKksV1ProofCoordinate) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  const fail = (error: Error) => {
    const failed = worker;
    worker = undefined;
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear();
    if (failed) failed.kill();
  };
  return Object.freeze(async (input: NonNullable<Parameters<ReceizOfflineKaiProofFactory>[0]> = {}) => {
    if (!worker) {
      const active = fork(new URL("../offline-resources/kai-proof-worker.mjs", import.meta.url), {
        serialization: "advanced", stdio: ["ignore", "ignore", "ignore", "ipc"],
        // Evaluation-only flags such as --input-type must not become worker
        // startup flags. The shipped worker is an ordinary ESM file.
        execArgv: [],
      });
      worker = active;
      supplyResources = true;
      active.on("message", (message: { id: number; proof?: ReceizKksV1ProofCoordinate; error?: string }) => {
        const request = pending.get(message.id);
        if (!request) return;
        pending.delete(message.id);
        clearTimeout(request.timer);
        if (message.error || !message.proof) request.reject(new Error(message.error ?? "OFFLINE_KAI_PROOF_EXECUTION_FAILED"));
        else request.resolve(message.proof);
        if (pending.size === 0) { active.unref(); active.channel?.unref(); }
      });
      active.on("error", error => { if (worker === active) fail(error); });
      active.on("exit", code => {
        if (worker === active) fail(new Error(`OFFLINE_KAI_PROOF_WORKER_EXIT:${code}`));
      });
    }
    worker.ref();
    worker.channel?.ref();
    const active = worker;
    return new Promise<ReceizKksV1ProofCoordinate>((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => fail(new Error("OFFLINE_KAI_PROOF_EXECUTION_TIMEOUT")), 60_000);
      pending.set(id, { resolve, reject, timer });
      try {
        active.send({ id, input, ...(supplyResources ? { resources: { wasm, zkey } } : {}) }, error => { if (error && worker === active) fail(error); });
        supplyResources = false;
      }
      catch (error) {
        pending.delete(id); clearTimeout(timer);
        if (pending.size === 0) { active.unref(); active.channel?.unref(); }
        reject(error instanceof Error ? error : new Error("OFFLINE_KAI_PROOF_INPUT_INVALID"));
      }
    });
  });
}
