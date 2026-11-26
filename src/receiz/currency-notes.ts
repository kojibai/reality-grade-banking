import { loadReceiz } from './client';
import { assetHex } from './native-asset-protocol';
import { verifyNativeAssetSource, type NativeAssetPacket, type NativeAssetState } from './native-asset';

const SCHEMA = 'bankeiz.currency-note.v1';
const MIME = 'application/json';
const TYPES = ['image/png','image/jpeg','image/webp'] as const;
const artworkLimit = 768 * 1024;
type Artwork = { mimeType: typeof TYPES[number]; bytesB64u: string };
type Draft = { claimSecret: string; artwork: Artwork | null };

export async function currencyNoteCommitment(secret: string) {
  if (!assetHex(secret)) throw Error('BANK_CURRENCY_NOTE_INVALID');
  const sdk = await loadReceiz();
  return sdk.sha256ReceizBytes(new TextEncoder().encode(`receiz.bank.currency-note.claim.v1:${secret}`));
}

async function artworkDigest(art: Artwork | null) {
  if (art === null) return null;
  if (!art || Object.keys(art).sort().join('|') !== 'bytesB64u|mimeType' || !TYPES.includes(art.mimeType)
    || typeof art.bytesB64u !== 'string' || art.bytesB64u.length > artworkLimit * 4 / 3 + 4) throw Error('BANK_CURRENCY_NOTE_ARTWORK_INVALID');
  const sdk = await loadReceiz(), bytes = sdk.receizBase64UrlDecode(art.bytesB64u);
  if (!bytes.length || bytes.length > artworkLimit || sdk.receizBase64UrlEncode(bytes) !== art.bytesB64u) throw Error('BANK_CURRENCY_NOTE_ARTWORK_INVALID');
  return sdk.sha256ReceizBytes(bytes);
}

async function inspect(issue: unknown, draft: Draft) {
  const { packet, receipt } = await verifyNativeAssetSource(issue);
  if (receipt.schema !== 'receiz.bank.native-asset-receipt.v1') throw Error('BANK_CURRENCY_NOTE_SOURCE_REQUIRED');
  const terms = receipt.review.request;
  if (terms.kind !== 'issue-currency-note' || !receipt.assetAfter.currency || !assetHex(receipt.assetAfter.id)
    || typeof draft.claimSecret !== 'string' || await currencyNoteCommitment(draft.claimSecret) !== terms.claimCommitment
    || await artworkDigest(draft.artwork) !== terms.artworkSha256) throw Error('BANK_CURRENCY_NOTE_INVALID');
  return { packet, assetId: receipt.assetAfter.id, issuedBy: terms.actorReceizId,
    quantityMicro: terms.quantityMicro, recipient: terms.recipient, claimCommitment: terms.claimCommitment };
}

export const isCurrencyNoteFile = (filename: string) => /\.receizcurrency$/iu.test(filename);

export async function openCurrencyNoteFile(file: File) {
  if (!file.size || file.size > 8 * 1024 * 1024) throw Error('BANK_CURRENCY_NOTE_INVALID');
  const source = JSON.parse(await file.text());
  if (!source || Object.keys(source).sort().join('|') !== 'artwork|claimSecret|issue|schema' || source.schema !== SCHEMA) {
    throw Error('BANK_CURRENCY_NOTE_INVALID');
  }
  const { assetId, issuedBy, quantityMicro, recipient, claimCommitment } = await inspect(source.issue, source);
  return { assetId, issuedBy, quantityMicro, recipient, claimCommitment,
    claimSecret: source.claimSecret as string, artwork: source.artwork as Artwork | null };
}

export function createCurrencyNotes(input: {
  owner: string; assertOpen(): void; readAssetState(): Promise<unknown>;
  saveDraft(commitment: string, draft: Draft): Promise<void>; readDraft(commitment: string): Promise<unknown>;
}) {
  return {
    async prepareClaim(artworkFile: File | null) {
      input.assertOpen();
      const sdk = await loadReceiz();
      const claimSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      let artwork: Artwork | null = null;
      if (artworkFile) {
        const mimeType = TYPES.find(type => type === artworkFile.type);
        if (!mimeType || !artworkFile.size || artworkFile.size > artworkLimit) throw Error('Choose a PNG, JPEG or WebP under 768 KB.');
        artwork = { mimeType, bytesB64u: sdk.receizBase64UrlEncode(new Uint8Array(await artworkFile.arrayBuffer())) };
      }
      const [claimCommitment, artworkSha256] = await Promise.all([currencyNoteCommitment(claimSecret), artworkDigest(artwork)]);
      input.assertOpen();
      await input.saveDraft(claimCommitment, { claimSecret, artwork });
      input.assertOpen();
      return { claimCommitment, artworkSha256 };
    },
    async files(assetId?: string, committed?: NativeAssetPacket) {
      input.assertOpen();
      const state = await input.readAssetState() as NativeAssetState | null;
      const fromHistory = state ? [state.current, ...state.history.slice().reverse()]
        .filter(row => row.state === 'committed' && row.prepared.request.kind === 'issue-currency-note' && row.source)
        .map(row => row.source!) : [];
      const packets = new Map([...(committed ? [committed] : []), ...fromHistory]
        .map(packet => [packet.source.artifactSha256, packet]));
      const files: { file: File; quantityMicro: string; claimCommitment: string; recipient: string | null }[] = [];
      for (const issue of packets.values()) {
        const {receipt} = await verifyNativeAssetSource(issue);
        if (receipt.schema !== 'receiz.bank.native-asset-receipt.v1' || assetId!==undefined&&receipt.assetAfter.id !== assetId
          || receipt.review.request.kind !== 'issue-currency-note' || receipt.review.request.actorReceizId !== input.owner) continue;
        const draft = await input.readDraft(receipt.review.request.claimCommitment) as Draft | null;
        if (!draft) continue;
        input.assertOpen();
        const verified = await inspect(issue, draft);
        const file = new File([JSON.stringify({ schema: SCHEMA, issue: verified.packet, ...draft })],
          `currency-note-${verified.claimCommitment.slice(0,16)}.receizcurrency`, { type: MIME });
        files.push({file, quantityMicro: verified.quantityMicro, recipient: verified.recipient, claimCommitment: verified.claimCommitment});
      }
      return files;
    },
  };
}
export type CurrencyNotes = ReturnType<typeof createCurrencyNotes>;
