export const RECEIZ_VAULT_ROOT_PATH = "root.receizvault.json";
export const RECEIZ_VAULT_MIME = "application/vnd.receiz.vault+zip";
export const RECEIZ_VAULT_EXTENSION = ".receizvault";
export const DEFAULT_RECEIZ_VAULT_CHUNK_BYTES = 256 * 1024;

export type ReceizVaultBuildPhase = "index" | "chunk" | "merkle" | "package" | "save" | "restore" | "verify";

export type ReceizVaultProgress = {
  phase: ReceizVaultBuildPhase;
  label: string;
  done: number;
  total: number;
};

export type ReceizVaultInputFile = {
  path: string;
  name?: string;
  mime?: string;
  size: number;
  lastModified?: number;
  readBytes: (start: number, end: number) => Promise<Uint8Array>;
};

export type ReceizVaultBytesFile = {
  path: string;
  name?: string;
  mime?: string;
  lastModified?: number;
  bytes: Uint8Array | ArrayBuffer | ArrayBufferView;
};

export type ReceizVaultKaiCoordinate = {
  pulse: number;
  label: string;
  beat: number;
  stepIndex: number;
  weekday: string;
  chakraDay: string;
  uri: string;
};

export type ReceizVaultMerkleSiblingV1 = {
  side: "left" | "right";
  sha256: string;
};

export type ReceizVaultFibonacciLinkV1 = {
  distance: number;
  leafIndex: number;
  path: string;
  chunkIndex: number;
  leafSha256: string;
};

export type ReceizVaultShardV1 = {
  kind: "receiz.vault.shard.v1";
  version: 1;
  vaultId: string;
  fileId: string;
  path: string;
  coordinate: ReceizVaultKaiCoordinate & {
    leafIndex: number;
  };
  chunk: {
    index: number;
    total: number;
    offset: number;
    size: number;
    sha256: string;
    encoding: "base64url.raw";
    dataB64u: string;
  };
  leafSha256: string;
  merkle: {
    algorithm: "sha256/jcs/paired-duplicate-last";
    rootSha256: string;
    path: ReceizVaultMerkleSiblingV1[];
  };
  fibonacci: {
    basis: "deterministic-backlinks";
    links: ReceizVaultFibonacciLinkV1[];
  };
};

export type ReceizVaultShardRefV1 = {
  index: number;
  leafIndex: number;
  path: string;
  offset: number;
  size: number;
  chunkSha256: string;
  leafSha256: string;
};

export type ReceizVaultFileEntryV1 = {
  fileId: string;
  path: string;
  name: string;
  mime: string;
  size: number;
  lastModified?: number;
  chunkBytes: number;
  chunkCount: number;
  chunkRootSha256: string;
  shards: ReceizVaultShardRefV1[];
};

export type ReceizVaultTwinMindFileKindV1 =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "text"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "code"
  | "data"
  | "binary";

export type ReceizVaultTwinMindFileV1 = {
  fileId: string;
  path: string;
  name: string;
  folder: string;
  mime: string;
  kind: ReceizVaultTwinMindFileKindV1;
  size: number;
  chunkRootSha256: string;
  merkleLeafCount: number;
  context: string;
};

export type ReceizVaultTwinMindIndexV1 = {
  schema: "receiz.vault.twin-mind-index.v1";
  version: 1;
  source: "receiz-vault";
  scope: "vault-file-corpus";
  vaultId: string;
  generatedAt: string;
  merkleRootSha256: string;
  summary: string;
  folders: string[];
  corpus: string[];
  files: ReceizVaultTwinMindFileV1[];
};

export type ReceizVaultRootV1 = {
  kind: "receiz.vault.root.v1";
  version: 1;
  format: "receiz-vault/self-contained-proof-block-graph";
  vaultId: string;
  createdAt: string;
  kai: ReceizVaultKaiCoordinate;
  chunkBytes: number;
  totals: {
    files: number;
    bytes: number;
    chunks: number;
  };
  merkle: {
    algorithm: "sha256/jcs/paired-duplicate-last";
    rootSha256: string;
    leafCount: number;
  };
  fibonacci: {
    basis: "deterministic-backlinks";
    leafOrder: "path-ascending/chunk-index";
    distances: number[];
  };
  files: ReceizVaultFileEntryV1[];
  restore: {
    method: "concatenate-file-blocks-by-index";
    encoding: "base64url.raw";
    fileOrder: string[];
  };
  twinMind?: ReceizVaultTwinMindIndexV1;
  integrity: {
    canonicalSha256: string;
  };
};

export type ReceizVaultSummary = {
  vaultId: string;
  shortVaultId: string;
  rootSha256: string;
  files: number;
  bytes: number;
  chunks: number;
  chunkBytes: number;
  createdAt: string;
  kaiPulse: number;
  kaiLabel: string;
};

export type ReceizVaultRestoredFile = {
  fileId: string;
  path: string;
  mime: string;
  size: number;
  chunkRootSha256: string;
  bytes: Uint8Array;
};

export type ReceizVaultBuildOptions = {
  chunkBytes?: number;
  createdAt?: string | Date;
  packageName?: string;
  onProgress?: (progress: ReceizVaultProgress) => void;
};

export type ReceizVaultBuildResult = {
  root: ReceizVaultRootV1;
  packageBytes: Uint8Array;
  filename: string;
  summary: ReceizVaultSummary;
};

export type ReceizVaultStreamBuildResult = {
  root: ReceizVaultRootV1;
  filename: string;
  summary: ReceizVaultSummary;
  bytesWritten: number;
};

export type ReceizVaultVerifyOptions = {
  restoreFiles?: boolean;
  onProgress?: (progress: ReceizVaultProgress) => void;
};

export type ReceizVaultPackageRestoreOptions = {
  fileIds?: string[];
  onProgress?: (progress: ReceizVaultProgress) => void;
};

export type ReceizVaultVerifyResult = {
  ok: boolean;
  errors: string[];
  root?: ReceizVaultRootV1;
  summary?: ReceizVaultSummary;
  restoredFiles?: ReceizVaultRestoredFile[];
};
