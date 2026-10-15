import { createRequire } from "node:module";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.resolve("tsx"));
const { buildSync } = require("esbuild");
const output = buildSync({
  entryPoints: ["app/lib/documentSeal/offlineSdkSource.ts"], bundle: true,
  write: false, format: "esm", platform: "browser", target: "es2022",
  // Escape literal PDF xref whitespace without changing its runtime bytes.
  supported: { "template-literal": false },
  external: ["snarkjs", "hash-wasm", "fflate", "@noble/hashes/*"],
  legalComments: "none", minify: true,
}).outputFiles[0].text;
const target = "packages/receiz-sdk/src/offlineSealImplementation.js";
const bytes = `// Generated from the canonical app seal core by scripts/build_offline_sdk_runtime.mjs.\n${output}`;
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== bytes) throw Error("OFFLINE_SDK_RUNTIME_DRIFT");
} else writeFileSync(target, bytes);
mkdirSync("packages/receiz-sdk/offline-resources", { recursive: true });
const kaiWorker = buildSync({
  entryPoints: ["packages/receiz-sdk/src/offlineKaiProofNodeWorker.ts"], bundle: true,
  write: false, format: "esm", platform: "node", target: "es2022",
  external: ["snarkjs", "hash-wasm", "@noble/hashes/*"],
  legalComments: "none", minify: true,
}).outputFiles[0].text;
const kaiWorkerTarget = "packages/receiz-sdk/offline-resources/kai-proof-worker.mjs";
const kaiWorkerBytes = `// Generated from the SDK live KaiSigil proof composition by scripts/build_offline_sdk_runtime.mjs.\n${kaiWorker}`;
if (process.argv.includes("--check")) {
  if (readFileSync(kaiWorkerTarget, "utf8") !== kaiWorkerBytes) throw Error("OFFLINE_KAI_PROOF_WORKER_DRIFT");
} else writeFileSync(kaiWorkerTarget, kaiWorkerBytes);
for (const [name, source, hash] of [
  ["sigil_proof.wasm", "public/zk/document_seal_proof_js/sigil_proof.wasm", "fc72dd17e30f7e9b178eeac08f1deceec8fff5b757481455e465234fbc35e696"],
  ["document_seal_proof_final.zkey", "public/zk/document_seal_proof_final.zkey", "fc5bc8cce4c43dc163e44bc8a1e52c165b72813a0ccbde7fb1735f3cb01debd4"],
  ["kai_sigil_proof.wasm", "public/zk/sigil_proof_js/sigil_proof.wasm", "fc72dd17e30f7e9b178eeac08f1deceec8fff5b757481455e465234fbc35e696"],
  ["kai_sigil_proof_final.zkey", "public/zk/sigil_proof_final.zkey", "838d15799730189054f811e172176df804137374fa8bb6ab7bfd50630cc8986a"],
]) {
  if (createHash("sha256").update(readFileSync(source)).digest("hex") !== hash) throw Error("OFFLINE_RESOURCE_SOURCE_MISMATCH");
  const destination = `packages/receiz-sdk/offline-resources/${name}`;
  if (process.argv.includes("--check")) {
    if (createHash("sha256").update(readFileSync(destination)).digest("hex") !== hash) throw Error("OFFLINE_RESOURCE_PACKAGE_MISMATCH");
  } else copyFileSync(source, destination);
}
