import type { ReceizKeyFile } from '@receiz/sdk';
import { serializeReceizIdentityArtifact, receizKaiNow } from '@receiz/sdk';
import artworkBuild from '../../public/native/identity-artwork.v129.manifest.json';

interface Creation { createdAt: string; creationKaiMicroPulse: string | null }
export interface IdentityArtworkRuntime {
  creation(input: { ownerUserId: string; profileUserId: string; snapshot: unknown }): Creation | null;
  head(snapshot: unknown): { kaiPulse: string | null; kaiUpulse: string | null };
  artwork(input: {
    userId: string; createdAt: string; creationKaiMicroPulse: string;
    receizId: string; receizIdentityKeyId: string; pbiReceiptHash: string | null;
    pbiSignedAt: string | null; pbiSignedKaiMicroPulse: string | null;
  }): { bannerSvg: string; pulse: string; seedHash: string };
  insertText(bytes: Uint8Array, chunks: { keyword: string; text: string }[]): Uint8Array;
}

let runtime: Promise<IdentityArtworkRuntime> | undefined;
function loadArtwork(): Promise<IdentityArtworkRuntime> {
  const url = new URL(`/native/identity-artwork.v129.mjs?build=${artworkBuild.moduleSha256}`, location.origin).href;
  return runtime ??= import(/* @vite-ignore */ url).catch(error => { runtime = undefined; throw error; });
}

interface Stamp { creationKaiPulse: string; accountHeadKaiPulse: string | null; savedKaiPulse: string }

/** Same 1600 × 600 artwork and Kai overlay used by Receiz's PNG export. */
async function rasterizeArtwork(svg: string, stamp: Stamp): Promise<Uint8Array> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(Error('IDENTITY_IMAGE_RENDER_FAILED'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 600;
    const context = canvas.getContext('2d');
    if (!context) throw Error('IDENTITY_IMAGE_CANVAS_UNAVAILABLE');
    context.drawImage(image, 0, 0, 1600, 600);
    context.save();
    context.fillStyle = 'rgba(4, 18, 34, 0.88)';
    context.strokeStyle = 'rgba(111, 231, 188, 0.72)';
    context.lineWidth = 2;
    const x = 1190, y = 34, width = 340, height = 76, radius = 18;
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath(); context.fill(); context.stroke();
    context.fillStyle = 'rgba(187, 255, 232, 0.96)';
    context.font = '700 17px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(`HEAD KAI ${stamp.accountHeadKaiPulse ?? stamp.creationKaiPulse}`, 1214, 66, 292);
    context.fillStyle = 'rgba(203, 213, 225, 0.92)';
    context.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(`SAVED KAI ${stamp.savedKaiPulse}`, 1214, 92, 292);
    context.restore();
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(Error('IDENTITY_IMAGE_ENCODE_FAILED')), 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  } finally { URL.revokeObjectURL(url); }
}

/** Creation-only PNG source. The admitted creation key supplies original birth
 * artwork; its same-key portable successor supplies the full recovery payload.
 * The caller seals this complete source with the existing owned SDK sealer. */
export async function createNewIdentityImageSource(keyFile: ReceizKeyFile, creationKey: ReceizKeyFile, dependencies?: {
  runtime: IdentityArtworkRuntime;
  rasterize(svg: string, stamp: Stamp): Promise<Uint8Array>;
  kai(): { pulse: number; uPulse: number | bigint };
  now(): Date;
}) {
  if (keyFile.keyId !== creationKey.keyId || keyFile.owner.uid !== creationKey.owner.uid || keyFile.crypto.publicKeyRawB64u !== creationKey.crypto.publicKeyRawB64u) throw Error('IDENTITY_IMAGE_OWNER_MISMATCH');
  const native = dependencies?.runtime ?? await loadArtwork();
  const creation = native.creation({ ownerUserId: creationKey.owner.uid, profileUserId: creationKey.owner.uid, snapshot: creationKey.portableState?.snapshot });
  if (!creation?.creationKaiMicroPulse) throw Error('IDENTITY_IMAGE_CREATION_SOURCE_REQUIRED');
  const name = keyFile.owner.username ?? keyFile.owner.uid;
  const art = native.artwork({
    userId: keyFile.owner.uid, createdAt: creation.createdAt, creationKaiMicroPulse: creation.creationKaiMicroPulse,
    receizId: name, receizIdentityKeyId: keyFile.keyId,
    pbiReceiptHash: keyFile.attestation?.pbiReceiptHash ?? null,
    pbiSignedAt: keyFile.attestation?.attestedAt ?? null,
    pbiSignedKaiMicroPulse: keyFile.attestation?.pbiSignedKaiMicroPulse ?? creation.creationKaiMicroPulse,
  });
  const kai = (dependencies?.kai ?? receizKaiNow)();
  const savedAt = (dependencies?.now ?? (() => new Date()))().toISOString();
  const head = native.head(keyFile.portableState?.snapshot);
  const stamp = { creationKaiPulse: String(BigInt(creation.creationKaiMicroPulse) / 1000000n), accountHeadKaiPulse: head.kaiPulse, savedKaiPulse: String(kai.pulse) };
  const image = await (dependencies?.rasterize ?? rasterizeArtwork)(art.bannerSvg, stamp);
  // Both native chunks precede the owned seal: no key-bearing suffix is added
  // after verification, and the complete signed portable state is retained.
  const bytes = native.insertText(image, [
    { keyword: 'receiz.identity_record.v1', text: JSON.stringify({ schema: 'receiz.identity_record.v1', kind: 'identity-record', keyId: keyFile.keyId, ownerUid: keyFile.owner.uid, receizId: name, pulse: art.pulse, seedHash: art.seedHash, issuedAt: keyFile.issuedAt, embeddedAt: savedAt, kaiStamp: { schema: 'receiz.identity_record.kai_stamp.v1', ...stamp, accountHeadKaiUpulse: head.kaiUpulse, savedAt } }) },
    { keyword: 'receiz.identity_record.keyfile.v1', text: serializeReceizIdentityArtifact(keyFile) },
  ]);
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'account';
  return { bytes, filename: `identity_record_${slug}.png`, mimeType: 'image/png' };
}
