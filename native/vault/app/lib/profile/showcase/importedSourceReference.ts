import {parseExactByteBlockReference,type ExactByteBlockReference} from "../../transport/exactByteBlocks";
export type ImportedProofSourceDescriptor = Readonly<{
  schema: "receiz.imported-proof-source.v1";
  artifactSha256: string;
  byteLength: number;
  filename: string;
  mimeType: string;
}>;
export type ImportedProofSourceReference = ImportedProofSourceDescriptor & Readonly<{ bytes: ExactByteBlockReference }>;

export function parseImportedProofSourceReference(input: ImportedProofSourceReference): ImportedProofSourceReference {
  // Snapshot caller properties before asynchronous IO; subsequent mutation of
  // either descriptor cannot change this execution's exact commitment.
  const value = input && { ...input, bytes: input.bytes && { ...input.bytes } };
  if (!value || Object.keys(value).sort().join(",") !== "artifactSha256,byteLength,bytes,filename,mimeType,schema"
    || value.schema !== "receiz.imported-proof-source.v1" || !/^[0-9a-f]{64}$/.test(value.artifactSha256)
    || !Number.isSafeInteger(value.byteLength) || value.byteLength <= 0
    || typeof value.filename !== "string" || !value.filename || typeof value.mimeType !== "string" || !value.mimeType) {
    throw new TypeError("IMPORTED_SOURCE_DESCRIPTOR_INVALID");
  }
  const descriptor = Object.freeze({ ...value, bytes: parseExactByteBlockReference(value.bytes) });
  if (descriptor.bytes.contentByteLength !== descriptor.byteLength) throw new TypeError("IMPORTED_SOURCE_EXACT_BINDING_MISMATCH");
  return descriptor;
}
