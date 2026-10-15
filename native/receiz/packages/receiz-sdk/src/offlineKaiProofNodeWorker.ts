import { createReceizOfflineKaiProofFactory, type ReceizOfflineKaiProofFactory } from "./offlineKaiProof.js";

// This host worker owns only dependency execution and its worker lifetime.
// All temporal sampling, proof creation and admission remain in the existing
// live KKS authority composed by the public local resource factory.
if (!process.send) throw new Error("OFFLINE_KAI_PROOF_WORKER_REQUIRED");
let factory: ReturnType<typeof createReceizOfflineKaiProofFactory> | undefined;
let tail = Promise.resolve();
process.on("disconnect", () => process.exit(0));
process.on("message", (request: { id: number; input: Parameters<ReceizOfflineKaiProofFactory>[0]; resources?: { wasm: Uint8Array; zkey: Uint8Array } }) => {
  tail = tail.then(async () => {
    try {
      if (!factory) {
        if (!request.resources) throw new Error("OFFLINE_KAI_PROOF_RESOURCE_REQUIRED");
        factory = createReceizOfflineKaiProofFactory(request.resources);
      }
      const proof = await (await factory)(request.input);
      process.send!({ id: request.id, proof });
    } catch (error) {
      process.send!({ id: request.id, error: error instanceof Error ? error.message : "OFFLINE_KAI_PROOF_EXECUTION_FAILED" });
    }
  });
});
