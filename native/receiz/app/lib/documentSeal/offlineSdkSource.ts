// Packaging entry only: the SDK composes these exact existing implementations.
export { receizeDocumentBytesCore, receizedContentType } from "./receizeDocumentBytesCore";
export { generateDocumentSealGroth16ProofWithResources } from "./realGroth16ProofCore";
export { maybeSignReceizBundleV4, coerceReceizSignatureV4DeviceCert } from "../security/receizSignatureV4";
export { DOCUMENT_SEAL_GROTH16_PROOF_MANIFEST } from "./proofResourceManifest";
