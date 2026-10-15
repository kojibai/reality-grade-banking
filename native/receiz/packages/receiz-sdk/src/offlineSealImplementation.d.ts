import type { ReceizOfflineSealCertificate } from "./offlineSeal.js";
export function coerceReceizSignatureV4DeviceCert(value: unknown): ReceizOfflineSealCertificate | null;
export function maybeSignReceizBundleV4(bundle: Record<string, unknown>, signer: {
  cert: ReceizOfflineSealCertificate; sign(bytes: Uint8Array): Promise<Uint8Array>;
}): Promise<Record<string, unknown> | null>;
export const DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST: {
  wasmSha256: string; zkeySha256: string;
};
export function generateDocumentSealGroth16ProofWithResources(args: {
  signingKey: string; canonicalIdentity: string; artifactSha256Basis: string;
}, resources: { wasmPath: Uint8Array; zkeyPath: Uint8Array }): Promise<{
  zkPoseidonHash: string; groth16Proof: string; groth16ProofDigest: string;
}>;
export function receizeDocumentBytesCore(args: {
  fileBytes: Uint8Array; filename: string; mime: string;
  options?: { nativeRecordSeal?: { ownerReceizId: string; recordId: string } };
}, deps: {
  signingKey: string; verifyOrigin: string;
  generateProof: (args: { signingKey: string; canonicalIdentity: string; artifactSha256Basis: string }) => Promise<{
    zkPoseidonHash: string; groth16Proof: string; groth16ProofDigest: string;
  }>;
  attachTrustedSignature: (bundle: Record<string, unknown>) => Promise<Record<string, unknown>>;
}): Promise<{ artifactBytes: Uint8Array; downloadName: string; kind: string }>;
export function receizedContentType(kind: string, mime: string): string;
