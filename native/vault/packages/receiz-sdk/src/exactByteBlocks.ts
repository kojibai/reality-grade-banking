import { ReceizProtocolLimitError } from "./verificationLimits.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { canonicalizeReceizV122 as jcsCanonicalize } from "./v122Canonical.js";

/** Storage/request boundaries only. There is no aggregate proof/member limit. */
export const EXACT_BYTE_BLOCK_MAX_BYTES = 1024 * 1024;
export const EXACT_BYTE_BLOCK_BRANCH_FANOUT = 16;
const BRANCH_SCHEMA = "receiz.exact-byte-block-branch.v1";
const encoder = new TextEncoder();

/** A location/reconstruction descriptor, never proof or admission authority.
 * sha256 addresses this block; branch contentByteLength describes joined bytes.
 * It is not the sealed artifact digest and cannot stand in for canonical opening.
 */
export type ExactByteBlockReference = Readonly<{
  kind: "bytes" | "branch";
  sha256: string;
  byteLength: number;
  contentByteLength: number;
  height: number;
}>;
export type ExactByteBlockWriter = (
  reference: ExactByteBlockReference, exactBlockBytes: Uint8Array,
) => Promise<void>;
export type ExactByteBlockResolver = (
  reference: ExactByteBlockReference,
) => Promise<Uint8Array | null>;

/** Consumer execution capacity, never source validity or a membership limit. */
export type ExactByteBlockExecution = Readonly<{
  component: string;
  maxContentBytes: number;
  maxBlockReads: number;
}>;
export class ExactByteBlockExecutionUnavailable extends ReceizProtocolLimitError {
  constructor(readonly component: string, observed: number, maximum: number, work = false) {
    super(work ? "VERIFICATION_BUDGET_EXCEEDED" : "VERIFICATION_RESOURCE_UNAVAILABLE", "verification-runtime", observed, maximum);
  }
}
export function assertExactByteBlockExecution(execution: ExactByteBlockExecution, bytes: number): void {
  if (!Number.isSafeInteger(execution.maxContentBytes) || execution.maxContentBytes < 0
    || !Number.isSafeInteger(execution.maxBlockReads) || execution.maxBlockReads < 0) {
    throw new TypeError("EXACT_BYTE_BLOCK_EXECUTION_OPTIONS_INVALID");
  }
  if (bytes > execution.maxContentBytes) throw new ExactByteBlockExecutionUnavailable(execution.component, bytes, execution.maxContentBytes);
}

function invalid(): never { throw new TypeError("EXACT_BYTE_BLOCK_INVALID"); }
function safeLength(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseExactByteBlockReference(value: unknown): ExactByteBlockReference {
  if (!object(value) || Object.keys(value).sort().join(",") !== "byteLength,contentByteLength,height,kind,sha256"
    || (value.kind !== "bytes" && value.kind !== "branch")
    || typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(value.sha256)
    || !safeLength(value.byteLength) || value.byteLength > EXACT_BYTE_BLOCK_MAX_BYTES
    || !safeLength(value.contentByteLength) || !safeLength(value.height)
    // A balanced byte tree needs fewer than 53 levels across JS safe lengths.
    // This bounds recursive mechanics, not collection membership.
    || value.height > 53
    || (value.kind === "bytes" && (value.height !== 0 || value.contentByteLength !== value.byteLength))
    || (value.kind === "branch" && (value.height === 0 || value.byteLength === 0 || value.contentByteLength < 2))) {
    throw new TypeError("EXACT_BYTE_BLOCK_DESCRIPTOR_INVALID");
  }
  return Object.freeze({ kind: value.kind, sha256: value.sha256, byteLength: value.byteLength,
    contentByteLength: value.contentByteLength, height: value.height });
}

/** Writes exact leaves before bounded recursive indexes. A failed write throws;
 * no root is returned. The caller alone decides when canonical acceptance may
 * publish a latest source. Immutable/idempotent storage belongs in writeBlock.
 * Blob preserves exact bytes without building one aggregate request body.
 */
export async function writeExactByteBlocks(
  source: Blob, writeBlock: ExactByteBlockWriter,
): Promise<ExactByteBlockReference> {
  if (!(source instanceof Blob) || !safeLength(source.size)) {
    throw new TypeError("EXACT_BYTE_BLOCK_INPUT_INVALID");
  }
  const store = async (kind: ExactByteBlockReference["kind"], bytes: Uint8Array, contentByteLength: number, height: number) => {
    const reference = parseExactByteBlockReference({ kind, sha256: bytesToHex(sha256(bytes)), byteLength: bytes.length, contentByteLength, height });
    await writeBlock(reference, bytes);
    return reference;
  };
  let level: ExactByteBlockReference[] = [];
  for (let offset = 0; offset < source.size || (offset === 0 && source.size === 0); offset += EXACT_BYTE_BLOCK_MAX_BYTES) {
    const bytes = new Uint8Array(await source.slice(offset, offset + EXACT_BYTE_BLOCK_MAX_BYTES).arrayBuffer());
    level.push(await store("bytes", bytes, bytes.length, 0));
  }
  while (level.length > 1) {
    const next: ExactByteBlockReference[] = [];
    for (let start = 0; start < level.length; start += EXACT_BYTE_BLOCK_BRANCH_FANOUT) {
      const children = level.slice(start, start + EXACT_BYTE_BLOCK_BRANCH_FANOUT);
      // A final singleton is already a descriptor; it needs no unary wrapper.
      if (children.length === 1) { next.push(children[0]!); continue; }
      const contentByteLength = children.reduce((sum, child) => sum + child.contentByteLength, 0);
      const bytes = encoder.encode(jcsCanonicalize({ schema: BRANCH_SCHEMA, children }));
      next.push(await store("branch", bytes, contentByteLength, 1 + Math.max(...children.map(({ height }) => height))));
    }
    level = next;
  }
  return level[0]!;
}

/** Reads sequentially with bounded block IO. Each block is checked before it is
 * yielded. Consumers must finish reconstruction AND open the enclosing proof;
 * an emitted prefix is not completeness or proof admission.
 */
export async function* readExactByteBlocks(
  root: ExactByteBlockReference, resolveBlock: ExactByteBlockResolver, execution?: ExactByteBlockExecution,
): AsyncGenerator<Uint8Array> {
  const rootReference = parseExactByteBlockReference(root);
  if (execution) assertExactByteBlockExecution(execution, rootReference.contentByteLength);
  let reads = 0;
  async function* visit(reference: ExactByteBlockReference): AsyncGenerator<Uint8Array> {
  if (execution && ++reads > execution.maxBlockReads) {
    throw new ExactByteBlockExecutionUnavailable(execution.component, reads, execution.maxBlockReads, true);
  }
  const resolved = await resolveBlock(reference);
  if (resolved === null) throw new TypeError("EXACT_BYTE_BLOCK_MISSING");
  if (!(resolved instanceof Uint8Array) || resolved.length !== reference.byteLength) invalid();
  // Resolver mutation across a yield cannot change already-checked bytes.
  const bytes = resolved.slice();
  if (bytes.length !== reference.byteLength || bytesToHex(sha256(bytes)) !== reference.sha256) invalid();
  if (reference.kind === "bytes") { yield bytes; return; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { invalid(); }
  if (!object(value) || Object.keys(value).sort().join(",") !== "children,schema"
    || value.schema !== BRANCH_SCHEMA || !Array.isArray(value.children)
    || value.children.length < 2 || value.children.length > EXACT_BYTE_BLOCK_BRANCH_FANOUT) invalid();
  const children = value.children.map(parseExactByteBlockReference);
  const total = children.reduce((sum, child) => sum + child.contentByteLength, 0);
  if (!safeLength(total) || total !== reference.contentByteLength
    || children.some((child) => child.contentByteLength === 0 || child.height >= reference.height)
    || reference.height !== 1 + Math.max(...children.map(({ height }) => height))
    || new TextDecoder().decode(bytes) !== jcsCanonicalize(value)) invalid();
  for (const child of children) yield* visit(child);
  }
  yield* visit(rootReference);
}

/** Contiguous consumers must declare their allocation/work capacity before IO.
 * Streaming/spooled consumers continue to use readExactByteBlocks. No prefix is
 * returned on an execution denial, and no proof validity verdict is inferred.
 */
export async function reconstructExactByteBlocks(
  root: ExactByteBlockReference, resolveBlock: ExactByteBlockResolver, execution: ExactByteBlockExecution,
): Promise<Uint8Array> {
  const reference = parseExactByteBlockReference(root);
  assertExactByteBlockExecution(execution, reference.contentByteLength);
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(reference.contentByteLength); } catch {
    throw new ExactByteBlockExecutionUnavailable(execution.component, reference.contentByteLength, execution.maxContentBytes);
  }
  let offset = 0;
  for await (const chunk of readExactByteBlocks(reference, resolveBlock, execution)) {
    if (offset + chunk.length > bytes.length) invalid();
    bytes.set(chunk, offset); offset += chunk.length;
  }
  if (offset !== reference.contentByteLength) invalid();
  return bytes;
}
