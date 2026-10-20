import type {
  ProfileShowcaseCompletePublicSource,
  ProfileShowcasePublicAncestryArtifact,
} from "./boundedEdgeVault";
import type { ProfileShowcaseChildReference } from "./types";
import {
  parseExactByteBlockReference, readExactByteBlocks, reconstructExactByteBlocks, writeExactByteBlocks, ExactByteBlockExecutionUnavailable,
  type ExactByteBlockReference, type ExactByteBlockResolver, type ExactByteBlockWriter,
} from "@/app/lib/transport/exactByteBlocks";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { readImportedSourceTransportReference } from "./importedSourceProjection";
import type { ImportedProofSourceReference } from "./importedSource";

const SCHEMA = "receiz.profile-showcase.complete-source-transport.v2";
const encoder = new TextEncoder();
const MAX_CONCURRENT_CHILD_SOURCE_READS = 8;

/** Servant byte locations beneath the same sealed artifact digest, not a new
 * proof object. v1 publication/first-paint objects are not rewritten by v2.
 * The optional ancestry inventory lives in the root envelope, not this descriptor.
 * Updated readers accept old v2 envelopes that do not contain ancestry.
 */
export type ProfileShowcaseCompleteSourceTransport = Readonly<{
  transportVersion: 2;
  artifactDigest: string;
  root: ExactByteBlockReference;
}>;

/** Capacities of this aggregate publication consumer, not proof validity rules.
 * A denial retains caller/source-block custody for retry by a capable executor.
 */
export const COMPLETE_SOURCE_EXECUTION_CAPACITY = Object.freeze({
  envelopeBytes: 64 * 1024,
  artifactBytes: 64 * 1024 * 1024,
  inventoryBytes: 64 * 1024 * 1024,
  inventoryLineBytes: 1024 * 1024,
  inventoryRecords: 100_000,
  retainedBytes: 512 * 1024 * 1024,
  blockReads: 131_072,
});
export type CompleteSourceExecutionCapacity = { readonly [K in keyof typeof COMPLETE_SOURCE_EXECUTION_CAPACITY]: number };

function invalid(): never { throw new TypeError("PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID"); }
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function digest(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(",") === keys.sort().join(",");
}
function publicReference(value: ProfileShowcaseChildReference): ProfileShowcaseChildReference {
  return { stableChildArtifactId: value.stableChildArtifactId, immutableVersion: value.immutableVersion,
    childArtifactDigest: value.childArtifactDigest, admissionEvidenceRoot: value.admissionEvidenceRoot,
    contentDigest: value.contentDigest };
}
function parseReference(value: unknown): ProfileShowcaseChildReference {
  if (!object(value) || !exactKeys(value, ["stableChildArtifactId", "immutableVersion", "childArtifactDigest", "admissionEvidenceRoot", "contentDigest"])
    || typeof value.stableChildArtifactId !== "string" || !value.stableChildArtifactId
    || typeof value.immutableVersion !== "string" || !value.immutableVersion
    || !digest(value.childArtifactDigest) || !digest(value.admissionEvidenceRoot) || !digest(value.contentDigest)) invalid();
  return publicReference(value as ProfileShowcaseChildReference);
}
function blob(bytes: Uint8Array): Blob {
  if (!(bytes instanceof Uint8Array) || bytes.length === 0) invalid();
  return new Blob([bytes.slice().buffer as ArrayBuffer]);
}

type AncestryDescriptor = Readonly<{
  artifactDigest: string;
  bytes: ExactByteBlockReference;
}>;

/** Select public carrier fields only. Extra owner-custody fields never enter
 * the snapshot. Duplicate digests and the current head are not ancestors.
 */
function publicAncestry(
  value: unknown,
  currentArtifactDigest: string,
): ProfileShowcasePublicAncestryArtifact[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) invalid();
  const seen = new Set<string>([currentArtifactDigest]);
  const ancestry: ProfileShowcasePublicAncestryArtifact[] = [];
  for (const ancestor of value) {
    if (!object(ancestor) || !digest(ancestor.artifactDigest)
      || !(ancestor.exactSealedArtifactBytes instanceof Uint8Array)
      || ancestor.exactSealedArtifactBytes.length === 0
      || seen.has(ancestor.artifactDigest)) invalid();
    seen.add(ancestor.artifactDigest);
    ancestry.push({ artifactDigest: ancestor.artifactDigest,
      exactSealedArtifactBytes: ancestor.exactSealedArtifactBytes });
  }
  return ancestry.sort((left, right) =>
    left.artifactDigest.localeCompare(right.artifactDigest));
}

/** Transport integrity only. A matching hash does not verify signature,
 * ownership, parent relationships, or permission to publish a source.
 */
async function assertAncestryDigest(
  ancestor: ProfileShowcasePublicAncestryArtifact,
): Promise<void> {
  const hash = await crypto.subtle.digest(
    "SHA-256", ancestor.exactSealedArtifactBytes.slice().buffer as ArrayBuffer,
  );
  const actual = Array.from(new Uint8Array(hash), byte =>
    byte.toString(16).padStart(2, "0")).join("");
  if (actual !== ancestor.artifactDigest) {
    throw new TypeError("PROFILE_SHOWCASE_COMPLETE_TRANSPORT_ANCESTRY_DIGEST_MISMATCH");
  }
}

/** Snapshot only the public export's material. No private actorIdentityRecord,
 * derived projection, session or receipt is a member of the public envelope.
 * Each exact artifact is segmented independently. Node/child/ancestry inventories
 * use the same recursive block mechanics instead of enlarging a POST body.
 * Ancestors are supplemental evidence, never historical visible-child exports.
 */
export async function writeProfileShowcaseCompleteSourceTransport(
  input: ProfileShowcaseCompletePublicSource, writeBlock: ExactByteBlockWriter,
  options: Readonly<{ exportImportedSource?: (reference: ImportedProofSourceReference, write: ExactByteBlockWriter) => Promise<void> }> = {},
): Promise<ProfileShowcaseCompleteSourceTransport> {
  if (!digest(input.artifactDigest) || !Array.isArray(input.witnessNodes) || !Array.isArray(input.children)) invalid();
  const ancestry = publicAncestry(input.ancestry, input.artifactDigest);
  // Snapshot synchronously before the first await; select only public fields.
  const source = structuredClone({ artifactDigest: input.artifactDigest,
    exactSealedArtifactBytes: input.exactSealedArtifactBytes, witnessNodes: input.witnessNodes,
    ancestry,
    legacyPredecessor: input.legacyPredecessor ? {
      artifactDigest: input.legacyPredecessor.artifactDigest,
      exactSealedArtifactBytes: input.legacyPredecessor.exactSealedArtifactBytes,
    } : undefined,
    checkpointBoundary: input.checkpointBoundary ? {
      artifactDigest: input.checkpointBoundary.artifactDigest, exactSealedArtifactBytes: input.checkpointBoundary.exactSealedArtifactBytes,
      predecessor: { artifactDigest: input.checkpointBoundary.predecessor.artifactDigest,
        exactSealedArtifactBytes: input.checkpointBoundary.predecessor.exactSealedArtifactBytes },
    } : undefined,
    children: input.children.map((child) => ({ reference: publicReference(child.reference), exactSealedArtifactBytes: child.exactSealedArtifactBytes })),
  });
  const writeJson = (value: unknown) => writeExactByteBlocks(new Blob([encoder.encode(jcsCanonicalize(value))]), writeBlock);
  const carrier = await writeExactByteBlocks(blob(source.exactSealedArtifactBytes), writeBlock);
  // Inventories are newline-delimited JSON records, segmented as bytes. They
  // never require one aggregate JSON string or one unbounded descriptor POST.
  const writeInventory = (values: readonly unknown[]) => writeExactByteBlocks(new Blob(
    values.map((value) => `${jcsCanonicalize(value)}\n`),
  ), writeBlock);
  const nodes = await writeInventory(source.witnessNodes);
  const childDescriptors = [];
  for (const child of source.children) {
    const imported = await readImportedSourceTransportReference(child.exactSealedArtifactBytes);
    if (imported) {
      if (!options.exportImportedSource) throw new TypeError("IMPORTED_SOURCE_EXPORT_REQUIRED");
      await options.exportImportedSource(imported, writeBlock);
    }
    childDescriptors.push({ reference: parseReference(child.reference),
      bytes: await writeExactByteBlocks(blob(child.exactSealedArtifactBytes), writeBlock) });
  }
  const children = await writeInventory(childDescriptors);
  let legacyPredecessor: { artifactDigest: string; bytes: ExactByteBlockReference } | null = null;
  if (source.legacyPredecessor) {
    if (!digest(source.legacyPredecessor.artifactDigest)) invalid();
    legacyPredecessor = { artifactDigest: source.legacyPredecessor.artifactDigest,
      bytes: await writeExactByteBlocks(blob(source.legacyPredecessor.exactSealedArtifactBytes), writeBlock) };
  }
  const checkpointBoundary = source.checkpointBoundary ? {
    artifactDigest: source.checkpointBoundary.artifactDigest,
    bytes: await writeExactByteBlocks(blob(source.checkpointBoundary.exactSealedArtifactBytes), writeBlock),
    predecessor: { artifactDigest: source.checkpointBoundary.predecessor.artifactDigest,
      bytes: await writeExactByteBlocks(blob(source.checkpointBoundary.predecessor.exactSealedArtifactBytes), writeBlock) },
  } : undefined;
  const ancestryDescriptors: AncestryDescriptor[] = [];
  for (const ancestor of source.ancestry) {
    await assertAncestryDigest(ancestor);
    ancestryDescriptors.push({ artifactDigest: ancestor.artifactDigest,
      bytes: await writeExactByteBlocks(blob(ancestor.exactSealedArtifactBytes), writeBlock) });
  }
  // Only one inventory root enters the envelope. An empty/absent ancestry
  // leaves the old envelope and its exact transport root unchanged.
  const ancestryRoot = ancestryDescriptors.length > 0
    ? await writeInventory(ancestryDescriptors) : undefined;
  const root = await writeJson({ schema: SCHEMA, artifactDigest: source.artifactDigest, carrier, nodes, children, legacyPredecessor,
    ...(checkpointBoundary ? { checkpointBoundary } : {}),
    ...(ancestryRoot ? { ancestry: ancestryRoot } : {}) });
  return Object.freeze({ transportVersion: 2, artifactDigest: source.artifactDigest, root });
}

function parseCompleteSourceTransport(input: ProfileShowcaseCompleteSourceTransport) {
  if (!object(input) || !exactKeys(input, ["transportVersion", "artifactDigest", "root"])
    || input.transportVersion !== 2 || !digest(input.artifactDigest)) invalid();
  return { artifactDigest: input.artifactDigest, root: parseExactByteBlockReference(input.root) };
}
function completeSourceEnvelope(envelope: unknown, artifactDigest: string): Record<string, unknown> {
  if (!object(envelope) || !exactKeys(envelope, ["schema", "artifactDigest", "carrier", "nodes", "children", "legacyPredecessor",
    ...("checkpointBoundary" in envelope ? ["checkpointBoundary"] : []),
    ...("ancestry" in envelope ? ["ancestry"] : [])])
    || envelope.schema !== SCHEMA || envelope.artifactDigest !== artifactDigest) invalid();
  return envelope;
}
async function* readCompleteSourceInventory(reference: unknown, resolve: ExactByteBlockResolver,
  capacity: CompleteSourceExecutionCapacity, reserve: (bytes: number) => void, record: () => void): AsyncGenerator<unknown> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let remainder = "";
  const root = parseExactByteBlockReference(reference);
  reserve(root.contentByteLength);
  let lineBytes = 0;
  for await (const bytes of readExactByteBlocks(root, resolve, { component: "complete publication inventory", maxContentBytes: capacity.inventoryBytes, maxBlockReads: capacity.blockReads })) {
    // Count raw UTF-8 bytes before decoding/retaining any unbounded line.
    for (const byte of bytes) {
      if (byte === 10) lineBytes = 0;
      else if (++lineBytes > capacity.inventoryLineBytes) throw new ExactByteBlockExecutionUnavailable("complete publication inventory line", lineBytes, capacity.inventoryLineBytes);
    }
    let text: string;
    try { text = decoder.decode(bytes, { stream: true }); } catch { return invalid(); }
    remainder += text;
    let newline: number;
    while ((newline = remainder.indexOf("\n")) >= 0) {
      const line = remainder.slice(0, newline);
      remainder = remainder.slice(newline + 1);
      record();
      let parsed: unknown;
      try { parsed = JSON.parse(line); } catch { return invalid(); }
      yield parsed;
    }
  }
  try { remainder += decoder.decode(); } catch { return invalid(); }
  if (remainder.length) invalid();
}

export type ProfileShowcaseCompleteSourceChildDescriptor = Readonly<{
  reference: ProfileShowcaseChildReference;
  bytes: ExactByteBlockReference;
}>;
/** Byte locators only, for explicit verified publication/startup indexing.
 * Reuses the exact envelope/NDJSON decoder and its execution capacities. It
 * never opens child, carrier, witness or ancestor bodies and admits no source.
 * A media consumer must bind its locator to CURRENT canonical membership and
 * reopen the enclosing child/material through the existing proof verifier.
 */
export async function* iterateProfileShowcaseCompleteSourceChildDescriptors(
  input: ProfileShowcaseCompleteSourceTransport, resolveBlock: ExactByteBlockResolver,
  capacity: CompleteSourceExecutionCapacity = COMPLETE_SOURCE_EXECUTION_CAPACITY,
): AsyncGenerator<ProfileShowcaseCompleteSourceChildDescriptor> {
  const transport = parseCompleteSourceTransport(input);
  let blockReads = 0, retainedBytes = 0, records = 0;
  const reserve = (bytes: number, component: string, maximum: number) => {
    if (bytes > maximum) throw new ExactByteBlockExecutionUnavailable(component, bytes, maximum);
    if (retainedBytes + bytes > capacity.retainedBytes) throw new ExactByteBlockExecutionUnavailable("complete publication retained source", retainedBytes + bytes, capacity.retainedBytes);
    retainedBytes += bytes;
  };
  const resolve: ExactByteBlockResolver = reference => {
    if (++blockReads > capacity.blockReads) throw new ExactByteBlockExecutionUnavailable("complete publication traversal", blockReads, capacity.blockReads, true);
    return resolveBlock(reference);
  };
  reserve(transport.root.contentByteLength, "complete publication envelope", capacity.envelopeBytes);
  const bytes = await reconstructExactByteBlocks(transport.root, resolve,
    { component: "complete publication envelope", maxContentBytes: capacity.envelopeBytes, maxBlockReads: capacity.blockReads });
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return invalid(); }
  const envelope = completeSourceEnvelope(value, transport.artifactDigest);
  for await (const child of readCompleteSourceInventory(envelope.children, resolve, capacity,
    length => reserve(length, "complete publication inventory", capacity.inventoryBytes), () => {
      if (++records > capacity.inventoryRecords) throw new ExactByteBlockExecutionUnavailable("complete publication inventory records", records, capacity.inventoryRecords, true);
    })) {
    if (!object(child) || !exactKeys(child, ["reference", "bytes"])) invalid();
    yield Object.freeze({ reference: Object.freeze(parseReference(child.reference)), bytes: Object.freeze(parseExactByteBlockReference(child.bytes)) });
  }
}

/** Reconstructs unadmitted public source only. The publisher/cold reader MUST
 * subsequently call buildAcceptedProfileShowcaseCompletePublicProjection with
 * the exact source and expected owner artifact id. Neither successful transport,
 * descriptor counts, nor a matching transport digest establishes completeness,
 * creator, signature, visibility, route binding or proof acceptance. Reconstructed
 * ancestry is still unadmitted: the server must verify its exact causal links.
 */
export async function reconstructProfileShowcaseCompleteSourceTransport(
  input: ProfileShowcaseCompleteSourceTransport, resolveBlock: ExactByteBlockResolver,
  capacity: CompleteSourceExecutionCapacity = COMPLETE_SOURCE_EXECUTION_CAPACITY,
): Promise<ProfileShowcaseCompletePublicSource> {
  let retainedBytes = 0;
  let blockReads = 0;
  let records = 0;
  const reserve = (bytes: number, component: string, maximum: number) => {
    if (bytes > maximum) throw new ExactByteBlockExecutionUnavailable(component, bytes, maximum);
    if (retainedBytes + bytes > capacity.retainedBytes) throw new ExactByteBlockExecutionUnavailable("complete publication retained source", retainedBytes + bytes, capacity.retainedBytes);
    retainedBytes += bytes;
  };
  const resolve: ExactByteBlockResolver = reference => {
    if (++blockReads > capacity.blockReads) throw new ExactByteBlockExecutionUnavailable("complete publication traversal", blockReads, capacity.blockReads, true);
    return resolveBlock(reference);
  };
  const readBytes = (value: unknown, component: string, maximum = capacity.artifactBytes) => {
    const reference = parseExactByteBlockReference(value);
    reserve(reference.contentByteLength, component, maximum);
    return reconstructExactByteBlocks(reference, resolve, { component, maxContentBytes: maximum, maxBlockReads: capacity.blockReads });
  };
  const transport = parseCompleteSourceTransport(input);
  const readJson = async (reference: unknown): Promise<unknown> => {
    const bytes = await readBytes(reference, "complete publication envelope", capacity.envelopeBytes);
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return invalid(); }
  };
  const envelope = completeSourceEnvelope(await readJson(transport.root), transport.artifactDigest);
  const exactSealedArtifactBytes = await readBytes(envelope.carrier, "complete publication carrier");
  if (!exactSealedArtifactBytes.length) invalid();
  const readInventory = (reference: unknown) => readCompleteSourceInventory(reference, resolve, capacity,
    bytes => reserve(bytes, "complete publication inventory", capacity.inventoryBytes), () => {
      if (++records > capacity.inventoryRecords) throw new ExactByteBlockExecutionUnavailable("complete publication inventory records", records, capacity.inventoryRecords, true);
    });
  const nodes: unknown[] = [];
  for await (const node of readInventory(envelope.nodes)) nodes.push(node);
  const childDescriptors: Array<Readonly<{
    reference: ProfileShowcaseChildReference;
    bytes: ExactByteBlockReference;
  }>> = [];
  for await (const child of readInventory(envelope.children)) {
    if (!object(child) || !exactKeys(child, ["reference", "bytes"])) invalid();
    childDescriptors.push({
      reference: parseReference(child.reference),
      bytes: parseExactByteBlockReference(child.bytes),
    });
  }
  // Children are independent exact byte trees. Bounded concurrent transport
  // reads preserve inventory order and still verify every block before the
  // complete source is returned to the canonical admission verifier.
  const children: ProfileShowcaseCompletePublicSource["children"][number][] = new Array(childDescriptors.length);
  let nextChild = 0;
  const readChild = async () => {
    for (;;) {
      const index = nextChild++;
      if (index >= childDescriptors.length) return;
      const descriptor = childDescriptors[index]!;
      const bytes = await readBytes(descriptor.bytes, "complete publication child");
      if (!bytes.length) invalid();
      children[index] = { reference: descriptor.reference, exactSealedArtifactBytes: bytes };
    }
  };
  const childReads = await Promise.allSettled(Array.from({ length: Math.min(MAX_CONCURRENT_CHILD_SOURCE_READS, childDescriptors.length) }, readChild));
  for (const read of childReads) if (read.status === "rejected") throw read.reason;
  let legacyPredecessor: ProfileShowcaseCompletePublicSource["legacyPredecessor"];
  if (envelope.legacyPredecessor !== null) {
    const legacy = envelope.legacyPredecessor;
    if (!object(legacy) || !exactKeys(legacy, ["artifactDigest", "bytes"]) || !digest(legacy.artifactDigest)) invalid();
    const bytes = await readBytes(legacy.bytes, "complete publication legacy predecessor");
    if (!bytes.length) invalid();
    legacyPredecessor = { artifactDigest: legacy.artifactDigest, exactSealedArtifactBytes: bytes };
  }
  let checkpointBoundary: ProfileShowcaseCompletePublicSource["checkpointBoundary"];
  if (envelope.checkpointBoundary !== undefined) {
    const checkpoint = envelope.checkpointBoundary;
    if (!object(checkpoint) || !exactKeys(checkpoint, ["artifactDigest", "bytes", "predecessor"]) || !digest(checkpoint.artifactDigest)
      || !object(checkpoint.predecessor) || !exactKeys(checkpoint.predecessor, ["artifactDigest", "bytes"])
      || !digest(checkpoint.predecessor.artifactDigest)) invalid();
    checkpointBoundary = { artifactDigest: checkpoint.artifactDigest,
      exactSealedArtifactBytes: await readBytes(checkpoint.bytes, "complete publication checkpoint"),
      predecessor: { artifactDigest: checkpoint.predecessor.artifactDigest,
        exactSealedArtifactBytes: await readBytes(checkpoint.predecessor.bytes, "complete publication checkpoint predecessor") } };
  }
  let ancestry: readonly ProfileShowcasePublicAncestryArtifact[] | undefined;
  if ("ancestry" in envelope) {
    const recovered: ProfileShowcasePublicAncestryArtifact[] = [];
    const seen = new Set<string>([transport.artifactDigest]);
    // Reuse the SAME counters and capacity limits as all other inventories.
    // A failed/missing ancestor never returns a partially reconstructed source.
    for await (const ancestor of readInventory(envelope.ancestry)) {
      if (!object(ancestor) || !exactKeys(ancestor, ["artifactDigest", "bytes"])
        || !digest(ancestor.artifactDigest) || seen.has(ancestor.artifactDigest)) invalid();
      seen.add(ancestor.artifactDigest);
      const bytes = await readBytes(ancestor.bytes, "complete publication ancestry carrier");
      if (!bytes.length) invalid();
      const entry: ProfileShowcasePublicAncestryArtifact = {
        artifactDigest: ancestor.artifactDigest, exactSealedArtifactBytes: bytes,
      };
      await assertAncestryDigest(entry);
      recovered.push(Object.freeze(entry));
    }
    ancestry = Object.freeze(recovered);
  }
  // Node semantics, complete rooted membership and synthetic predecessor replay
  // belong exclusively to the existing canonical complete-source consumer.
  return { artifactDigest: transport.artifactDigest, exactSealedArtifactBytes,
    witnessNodes: nodes as ProfileShowcaseCompletePublicSource["witnessNodes"],
    children, ...(legacyPredecessor ? { legacyPredecessor } : {}), ...(checkpointBoundary ? { checkpointBoundary } : {}),
    ...(ancestry ? { ancestry } : {}) };
}
