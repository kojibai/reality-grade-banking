import type { ReceizIdentityLoginProof } from '@receiz/sdk';
import type { OriginalByteRange, OriginalPiece, OriginalPieceBytes, OriginalPieceLayout } from '../../native/receiz/app/lib/profile/showcase/originalPieceRanges';

export const ORIGINAL_PIECE_SCHEMA: 'receiz.original-piece.transfer.v1';
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

export function openOriginalPieceDelivery(packageFile: Blob): Promise<OriginalPieceDelivery>;
export function originalPieceChallenge(command: OriginalPieceCommand): string;
export function pieceCanonical(value: unknown): string;
export function pieceDigest(value: unknown): value is string;
export function readOriginalPieceCommand(command: OriginalPieceCommand): OriginalPieceCommand;
export function selectedOriginalPieces(head: OriginalPieceHead): readonly OriginalPiece[];
export function verifyOriginalPieceConsent(command: OriginalPieceCommand, consent: ReceizIdentityLoginProof, sender: OriginalPieceKey): Promise<void>;
