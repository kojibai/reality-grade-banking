import { canonicalizeReceizV122 } from "../../../../packages/receiz-sdk/src/v122Canonical";
import { deriveReceizIdentityKeyIdFromPublicKeyRawB64u, receizBase64UrlDecode, receizBase64UrlEncode,
  verifyReceizIdentityPublicKeyProjectionSignature, type ReceizIdentityLoginProof } from "../../../../packages/receiz-sdk/src/identity";
import { readVerifiedReceizDocumentBytesCanonical } from "../../../../packages/receiz-sdk/src/verifier/canonical";
import { receizCurrentPinnedSignatureV4Roots } from "../../../../packages/receiz-sdk/src/verifier/roots";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import { advanceOriginalPieceLayout, canonicalOriginalByteRanges, digestOriginalPieceBytes, readOriginalPieceLayout, reconstructOriginalPieces,
  type OriginalByteRange, type OriginalPieceBytes, type OriginalPieceLayout } from "./originalPieceRanges";

export const ORIGINAL_PIECE_MIME = "application/vnd.receiz.bundle+json";
export const ORIGINAL_PIECE_SCHEMA = "receiz.original-piece.transfer.v1" as const;
export type OriginalPieceCommand = Readonly<{
  schema: typeof ORIGINAL_PIECE_SCHEMA;
  operationId: string;
  sourceIdentity: string;
  originalSha256: string;
  predecessorSha256: string;
  byteLength: number;
  senderReceizId: string;
  senderKeyId: string;
  recipientReceizId: string;
  recipientKeyId: string;
  ranges: readonly OriginalByteRange[];
}>;
export type OriginalPieceKey = Readonly<{ keyId: string; alg: "Ed25519" | "P-256"; publicKeyRawB64u: string }>;
export type OriginalPieceHead = Readonly<{
  schema: "receiz.original-piece.head.v1";
  issuerKid: string;
  revision: number;
  kaiUPulse: string;
  filename: string;
  mimeType: string;
  command: OriginalPieceCommand;
  consent: ReceizIdentityLoginProof;
  sender: OriginalPieceKey;
  layout: OriginalPieceLayout;
}>;
const verifiedHeads = new WeakSet<object>();
type Root = ReceizSignatureV4RootPublicKey;
export type OriginalPieceCanonicalReader = (bytes: Uint8Array, roots: ReadonlyMap<string, Root>) => Promise<Readonly<{
  payloadBytes: Uint8Array;
  ownerReceizId: unknown;
  kaiPulse: unknown;
}>>;
type RootSignature = Readonly<{ kid: string; alg: "Ed25519"; sig: string }>;
type SignedHead = OriginalPieceHead & Readonly<{ rootSignature: RootSignature }>;
const encoder = new TextEncoder(), decoder = new TextDecoder("utf-8", { fatal: true });
export function originalPieceFailure(code: string): never { throw new TypeError(`ORIGINAL_PIECE_${code}`); }
export const pieceDigest = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
const identity = (value: unknown) => typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,127}\.receiz\.id$/u.test(value);
const safeFilename = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 240 && !/[\x00-\x1f\x7f/\\]/u.test(value);
export const pieceCanonical = canonicalizeReceizV122;
const same = (a: unknown, b: unknown) => pieceCanonical(a) === pieceCanonical(b);

export function readOriginalPieceCommand(command: OriginalPieceCommand): OriginalPieceCommand {
  if (!command || command.schema !== ORIGINAL_PIECE_SCHEMA || !pieceDigest(command.operationId)
    || typeof command.sourceIdentity !== "string" || !command.sourceIdentity || command.sourceIdentity.length > 256
    || ![command.originalSha256, command.predecessorSha256, command.senderKeyId, command.recipientKeyId].every(pieceDigest)
    || !identity(command.senderReceizId) || !identity(command.recipientReceizId)
    || command.senderReceizId === command.recipientReceizId || command.senderKeyId === command.recipientKeyId
    || !Number.isSafeInteger(command.byteLength) || command.byteLength < 1) originalPieceFailure("COMMAND");
  const { schema, operationId, sourceIdentity, originalSha256, predecessorSha256, byteLength,
    senderReceizId, senderKeyId, recipientReceizId, recipientKeyId } = command;
  const ranges = canonicalOriginalByteRanges(command.ranges, byteLength);
  const checked = { schema, operationId, sourceIdentity, originalSha256, predecessorSha256, byteLength,
    senderReceizId, senderKeyId, recipientReceizId, recipientKeyId, ranges };
  if (!same(checked, command)) originalPieceFailure("COMMAND");
  return checked;
}

export function originalPieceChallenge(command: OriginalPieceCommand) {
  return receizBase64UrlEncode(encoder.encode(pieceCanonical(readOriginalPieceCommand(command))));
}

export async function verifyOriginalPieceConsent(command: OriginalPieceCommand, consent: ReceizIdentityLoginProof, sender: OriginalPieceKey) {
  if (!sender || !consent || consent.schema !== "receiz.identity.login_proof.v1" || sender.keyId !== command.senderKeyId
    || consent.keyId !== sender.keyId || consent.alg !== sender.alg || consent.challengeB64Url !== originalPieceChallenge(command)
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ ...sender, challengeB64Url: consent.challengeB64Url,
      signatureB64Url: consent.signatureB64Url })) originalPieceFailure("CONSENT");
}

export function selectedOriginalPieces(head: OriginalPieceHead) {
  const { ranges, recipientReceizId } = head.command;
  const pieces = head.layout.pieces.filter(piece => ranges.some(range => piece.offset >= range.offset
    && piece.offset + piece.byteLength <= range.offset + range.byteLength));
  if (pieces.some(piece => piece.ownerReceizId !== recipientReceizId)
    || pieces.reduce((total, piece) => total + piece.byteLength, 0) !== ranges.reduce((total, range) => total + range.byteLength, 0)) {
    originalPieceFailure("HEAD");
  }
  return pieces;
}

export async function openOriginalPieceHead(bytes: Uint8Array, readCanonical: OriginalPieceCanonicalReader,
  roots: ReadonlyMap<string, Root> = receizCurrentPinnedSignatureV4Roots()) {
  const opened = await readCanonical(bytes, roots);
  const exact = decoder.decode(opened.payloadBytes), value = JSON.parse(exact) as SignedHead;
  if (!value || exact !== pieceCanonical(value) || value.schema !== "receiz.original-piece.head.v1"
    || !Number.isSafeInteger(value.revision) || value.revision < 1 || !/^[1-9][0-9]{0,23}$/u.test(value.kaiUPulse)
    || !safeFilename(value.filename) || typeof value.mimeType !== "string" || !value.mimeType.includes("/")) originalPieceFailure("HEAD");
  const { rootSignature, ...payload } = value;
  const root = roots.get(payload.issuerKid), pulse = BigInt(payload.kaiUPulse) / 1_000_000n;
  if (!root || root.kid !== payload.issuerKid || root.alg !== "Ed25519" || !rootSignature
    || rootSignature.kid !== root.kid || rootSignature.alg !== "Ed25519" || !/^[A-Za-z0-9_-]{86}$/u.test(rootSignature.sig)
    || root.status !== "active" && (root.status !== "retired" || !root.retiredAtPulse)
    || root.activeFromPulse && pulse < BigInt(root.activeFromPulse) || root.retiredAtPulse && pulse > BigInt(root.retiredAtPulse)
    || !await verifyReceizIdentityPublicKeyProjectionSignature({
      keyId: await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u, "Ed25519"),
      alg: "Ed25519", publicKeyRawB64u: root.publicKeyRawB64u, challengeB64Url: receizBase64UrlEncode(encoder.encode(pieceCanonical(payload))),
      signatureB64Url: rootSignature.sig,
    })) originalPieceFailure("AUTHORITY");
  const command = readOriginalPieceCommand(payload.command), layout = readOriginalPieceLayout(payload.layout);
  if (layout.originalSha256 !== command.originalSha256 || layout.byteLength !== command.byteLength
    || !same(layout, payload.layout) || opened.ownerReceizId !== command.recipientReceizId
    || String(opened.kaiPulse) !== pulse.toString()) originalPieceFailure("HEAD");
  await verifyOriginalPieceConsent(command, payload.consent, payload.sender);
  const head = Object.freeze({ ...payload, layout, command: Object.freeze({ ...command,
    ranges: Object.freeze(command.ranges.map(range => Object.freeze(range))) }),
    sender: Object.freeze(payload.sender), consent: Object.freeze(payload.consent) });
  selectedOriginalPieces(head);
  verifiedHeads.add(head);
  return head;
}

export type OpenedOriginalPieceRevision = Readonly<{ head: OriginalPieceHead; headDigest: string; exactArtifact: Blob }>;
export type OriginalPieceDelivery = Readonly<{
  kind: "sealed-range-delivery";
  originalProof: "requires-exact-original";
  head: OriginalPieceHead;
  headDigest: string;
  ownerReceizId: string;
  pieces: readonly OriginalPieceBytes[];
  ancestry: readonly OpenedOriginalPieceRevision[];
}>;
const verifiedPieceDeliveries = new WeakMap<OriginalPieceDelivery, ReadonlyMap<string, Root>>();
export const readOriginalPieceDeliveryRoots = (delivery: OriginalPieceDelivery): ReadonlyMap<string, Root> | undefined => {
  const roots = verifiedPieceDeliveries.get(delivery);
  return roots && new Map(roots);
};

export const readCanonicalOriginalPieceSeal: OriginalPieceCanonicalReader = async (fileBytes, signatureV4RootPublicKeys) => {
  const opened = await readVerifiedReceizDocumentBytesCanonical({ fileBytes, filename: "original-ownership.receizbundle",
    mime: ORIGINAL_PIECE_MIME, signatureV4RootPublicKeys });
  if (!opened.ok || !opened.verification.integrity.ok || opened.payloadMimeType !== "application/json") originalPieceFailure("SEAL");
  const nativeSeal = opened.verification.bundle?.nativeRecordSeal as { ownerReceizId?: unknown } | undefined;
  return { payloadBytes: opened.payloadBytes, ownerReceizId: nativeSeal?.ownerReceizId, kaiPulse: opened.verification.bundle?.kaiPulseEternal };
};

export type ResolvePiecePredecessor = (artifactSha256: string) => Promise<Blob | Uint8Array | null>;
export const snapshotRoots = (roots: ReadonlyMap<string, Root>) => new Map([...roots].map(([kid, root]) => [kid, Object.freeze({ ...root })]));

export async function openPieceRevision(exactArtifact: Blob, headDigest: string, roots: ReadonlyMap<string, Root>): Promise<OpenedOriginalPieceRevision> {
  const head = await openOriginalPieceHead(new Uint8Array(await exactArtifact.arrayBuffer()), readCanonicalOriginalPieceSeal, roots);
  return Object.freeze({ head, headDigest, exactArtifact });
}

export async function openExactPredecessor(resolvePredecessor: ResolvePiecePredecessor, digest: string) {
  const retained = await resolvePredecessor(digest);
  if (!retained) originalPieceFailure("ANCESTRY");
  const exact = new Blob([retained instanceof Blob ? retained : new Uint8Array(retained)]);
  if (await digestOriginalPieceBytes(exact) !== digest) originalPieceFailure("ANCESTRY");
  return exact;
}

export async function openSealedRangeAncestry(latest: OpenedOriginalPieceRevision, roots: ReadonlyMap<string, Root>, resolvePredecessor: ResolvePiecePredecessor) {
  const ancestry = [latest];
  const visited = new Set([latest.headDigest]);
  const originalDigest = latest.head.command.originalSha256;
  let current = latest;
  for (;;) {
    const { command, filename, mimeType } = current.head;
    const previous = command.predecessorSha256;
    if (visited.has(previous)) originalPieceFailure("ANCESTRY");
    if (previous === originalDigest) return Object.freeze(ancestry.reverse());
    visited.add(previous);
    const prior = await openPieceRevision(await openExactPredecessor(resolvePredecessor, previous), previous, roots);
    if (prior.head.revision + 1 !== current.head.revision
      || BigInt(prior.head.kaiUPulse) >= BigInt(current.head.kaiUPulse)
      || prior.head.command.originalSha256 !== originalDigest
      || prior.head.command.sourceIdentity !== command.sourceIdentity || prior.head.command.byteLength !== command.byteLength
      || prior.head.filename !== filename || prior.head.mimeType !== mimeType) originalPieceFailure("ANCESTRY");
    ancestry.push(prior);
    current = prior;
  }
}

export async function replayOriginalPieceAncestry(ancestry: readonly OpenedOriginalPieceRevision[], ownerReceizId: string,
  checkLayoutBytes?: (layout: OriginalPieceLayout) => Promise<void>) {
  const { originalSha256, byteLength } = ancestry[0]!.head.command;
  let layout = readOriginalPieceLayout({ originalSha256, byteLength,
    pieces: [{ offset: 0, byteLength, sha256: originalSha256, ownerReceizId }] });
  const operations = new Set<string>();
  for (const { head } of ancestry) {
    if (operations.has(head.command.operationId)) originalPieceFailure("ANCESTRY");
    operations.add(head.command.operationId);
    layout = advanceOriginalPieceLayout(layout, head.command, head.layout);
    await checkLayoutBytes?.(layout);
  }
}

async function readOriginalPiecePackage(packageFile: Blob, readCanonical: OriginalPieceCanonicalReader, roots?: ReadonlyMap<string, Root>) {
  const value = JSON.parse(await packageFile.text()) as {
    schema?: unknown; head?: unknown; ownerReceizId?: unknown; pieces?: unknown; ancestorSeals?: unknown;
  };
  const keys = value?.ancestorSeals === undefined ? "head|ownerReceizId|pieces|schema" : "ancestorSeals|head|ownerReceizId|pieces|schema";
  if (!value || value.schema !== "receiz.original-piece.package.v1" || typeof value.head !== "string" || !Array.isArray(value.pieces)
    || !identity(value.ownerReceizId) || Object.keys(value).sort().join("|") !== keys
    || (value.ancestorSeals !== undefined && (!Array.isArray(value.ancestorSeals)
      || value.ancestorSeals.some(seal => typeof seal !== "string")))) originalPieceFailure("PACKAGE");
  const headBytes = receizBase64UrlDecode(value.head);
  if (receizBase64UrlEncode(headBytes) !== value.head) originalPieceFailure("PACKAGE");
  const head = await openOriginalPieceHead(headBytes, readCanonical, roots);
  const owned = new Map(head.layout.pieces.filter(piece => piece.ownerReceizId === value.ownerReceizId).map(piece => [piece.offset, piece]));
  if (!value.pieces.length || value.pieces.length > owned.size) originalPieceFailure("COVERAGE");
  const pieces: OriginalPieceBytes[] = [];
  for (const entry of value.pieces) {
    if (!entry || Object.keys(entry).sort().join("|") !== "bytes|offset") originalPieceFailure("COVERAGE");
    const piece = owned.get(entry.offset), encoded = entry.bytes;
    if (!piece) originalPieceFailure("COVERAGE");
    owned.delete(piece.offset);
    if (typeof encoded !== "string" || encoded.length > Math.ceil(piece.byteLength * 4 / 3)) originalPieceFailure("BYTES");
    const exact = receizBase64UrlDecode(encoded);
    const bytes = new Blob([new Uint8Array(exact)]);
    if (receizBase64UrlEncode(exact) !== encoded || bytes.size !== piece.byteLength
      || await digestOriginalPieceBytes(bytes) !== piece.sha256) originalPieceFailure("BYTES");
    pieces.push(Object.freeze({ ...piece, bytes }));
  }
  const exactArtifact = new Blob([new Uint8Array(headBytes)]);
  const headDigest = await digestOriginalPieceBytes(exactArtifact);
  return { head, headDigest, exactArtifact, ownerReceizId: value.ownerReceizId as string, pieces,
    ancestorSeals: (value.ancestorSeals ?? []) as string[] };
}

/** Opens the selected range bytes against the package's enclosing seal. */
export async function openOriginalPiecePackage(packageFile: Blob, readCanonical: OriginalPieceCanonicalReader, roots?: ReadonlyMap<string, Root>) {
  const { head, headDigest, ownerReceizId, pieces } = await readOriginalPiecePackage(packageFile, readCanonical, roots);
  return { head, headDigest, ownerReceizId, pieces };
}

/** Verifies a portable delivery witness using only the sealed range ancestry and delivered bytes.
 * The first signed head attests to the opening commitment. Canonical Original admission still requires its exact bytes.
 */
export async function openOriginalPieceDelivery(packageFile: Blob, roots = receizCurrentPinnedSignatureV4Roots()): Promise<OriginalPieceDelivery> {
  const canonicalRoots = snapshotRoots(roots);
  const { ancestorSeals, exactArtifact, head, headDigest, ownerReceizId, pieces } = await readOriginalPiecePackage(
    packageFile, readCanonicalOriginalPieceSeal, canonicalRoots);
  const held = new Map<string, Blob>();
  for (const seal of ancestorSeals) {
    const bytes = receizBase64UrlDecode(seal);
    if (receizBase64UrlEncode(bytes) !== seal) originalPieceFailure("ANCESTRY");
    const exact = new Blob([new Uint8Array(bytes)]);
    const digest = await digestOriginalPieceBytes(exact);
    if (held.has(digest)) originalPieceFailure("ANCESTRY");
    held.set(digest, exact);
  }
  const ancestry = await openSealedRangeAncestry(Object.freeze({ head, headDigest, exactArtifact }), canonicalRoots,
    async digest => held.get(digest) ?? null);
  if (ancestry.length !== held.size + 1) originalPieceFailure("ANCESTRY");
  await replayOriginalPieceAncestry(ancestry, ancestry[0]!.head.command.senderReceizId);
  const delivery = Object.freeze({ kind: "sealed-range-delivery", originalProof: "requires-exact-original",
    head, headDigest, ownerReceizId, pieces: Object.freeze(pieces), ancestry } as const);
  verifiedPieceDeliveries.set(delivery, canonicalRoots);
  return delivery;
}

/** Expected head must come from the caller's accepted Source selection. */
export async function assembleOwnedOriginal(head: OriginalPieceHead, pieces: readonly OriginalPieceBytes[]) {
  if (!verifiedHeads.has(head)) originalPieceFailure("HEAD");
  const bytes = await reconstructOriginalPieces(head.layout, pieces);
  return new File([bytes], head.filename, { type: head.mimeType });
}
