import type {ExactByteBlockReference} from "../../transport/exactByteBlocks";
export type ImportedProofSourceDescriptor = Readonly<{
  schema: "receiz.imported-proof-source.v1";
  artifactSha256: string;
  byteLength: number;
  filename: string;
  mimeType: string;
}>;
export type ImportedProofSourceReference = ImportedProofSourceDescriptor & Readonly<{ bytes: ExactByteBlockReference }>;
