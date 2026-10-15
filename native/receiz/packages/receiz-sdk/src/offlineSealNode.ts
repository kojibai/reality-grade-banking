import { verifyReceizArtifact } from "./artifactVerification.js";
// Private device-host composition, absent from the generic SDK/MCP dispatcher.
export { createReceizIdentityDeviceRelaySigner } from "./artifactAdmission.js";
import { createReceizArtifactAdmissionEngine, readReceizIdentityPublicBinding } from "./artifactAdmission.js";
import { mkdir, readFile, open, lstat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { KeyObject } from "node:crypto";
import { createReceizOfflineSealer, type ReceizOfflineSealEnrollment, type ReceizOfflineSealStore } from "./offlineSeal.js";

/** Node custody is a private local file, never an MCP response or artifact payload. */
export function createReceizFileSealStore(directory: string): ReceizOfflineSealStore {
  const filename = join(directory, "signature-v4.json");
  return {
    async load() {
      let bytes: string;
      try {
        const stat = await lstat(filename);
        if (!stat.isFile() || (process.platform !== "win32" && (stat.mode & 0o077))) throw new Error("offline_seal_private_file_permissions");
        bytes = await readFile(filename, "utf8");
      } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
      const stored = JSON.parse(bytes) as { cert: ReceizOfflineSealEnrollment["cert"]; privateKeyPkcs8: string };
      const privateKey = await crypto.subtle.importKey("pkcs8", Buffer.from(stored.privateKeyPkcs8, "base64"), "Ed25519", false, ["sign"]);
      return { cert: stored.cert, privateKey };
    },
    async save(state) {
      await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
      const pkcs8 = KeyObject.from(state.privateKey).export({ format: "der", type: "pkcs8" });
      // Exclusive creation prevents concurrent enrollments from replacing custody.
      const file = await open(filename, "wx", 0o600);
      try {
        await file.writeFile(JSON.stringify({ cert: state.cert, privateKeyPkcs8: pkcs8.toString("base64") }));
        await file.sync();
      } finally { await file.close(); }
    },
  };
}

/** Proof resources ship in the package; startup and sealing make no network calls. */
export async function createReceizNodeOfflineSealer(options: {
  directory: string; enrollmentUrl?: string; fetch?: typeof globalThis.fetch;
  identityArtifactPath?: string; identityPassphrase?: string;
  /** Genuine same-process SDK admission only; serialized reports are rejected. */
  ownerIdentityAdmission?: unknown;
}) {
  if (options.ownerIdentityAdmission !== undefined && options.identityArtifactPath !== undefined) {
    throw new TypeError("offline_seal_identity_source_ambiguous");
  }
  if (options.ownerIdentityAdmission !== undefined) await readReceizIdentityPublicBinding(options.ownerIdentityAdmission);
  const [wasm, zkey] = await Promise.all([
    readFile(new URL("../offline-resources/sigil_proof.wasm", import.meta.url)),
    readFile(new URL("../offline-resources/document_seal_proof_final.zkey", import.meta.url)),
  ]);
  let ownerIdentityAdmission: unknown = options.ownerIdentityAdmission;
  if (options.identityArtifactPath) {
    const bytes = await readFile(options.identityArtifactPath);
    const verified = await verifyReceizArtifact(new File([bytes], basename(options.identityArtifactPath)));
    ownerIdentityAdmission = await createReceizArtifactAdmissionEngine()(verified, { profile: "identity", identityPassphrase: options.identityPassphrase ?? "" });
    // Fail during setup, before any enrollment or artifact write.
    await readReceizIdentityPublicBinding(ownerIdentityAdmission);
  }
  return createReceizOfflineSealer({ ...options, ...(ownerIdentityAdmission === undefined ? {} : { ownerIdentityAdmission }), store: createReceizFileSealStore(options.directory), resources: { wasm, zkey } });
}
