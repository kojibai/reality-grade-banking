import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalizeReceizV122 } from '@receiz/sdk';
import { expect, it } from 'vitest';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import { inspectNativeAssetReceipt, nativeAssetChallenge, nativeAssetReviewFromChallenge, type NativeAssetReview } from '../src/receiz/native-asset-protocol';
import { NATIVE_ASSET_PUBLIC_DOMAIN, verifyNativeAssetPublicSignature } from '../src/receiz/native-asset-holding-protocol';

const policy = { kind: 'fixed-reserve-pool' as const, priceUsdCentsPerUnit: '25' };
const terms = { debitUsdCents: '0', debitPhiMicro: '0', creditUsdCents: '0', creditPhiMicro: '0', feeUsdCents: '0',
  quantityMicro: '2000000', assetDigest: null, recipient: null, expiresAtKaiUPulse: 1000000000 };
const authoredSource={schema:'receiz.imported-proof-source.v1',artifactSha256:'e'.repeat(64),byteLength:2,filename:'authored.receizbundle',
  mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'f'.repeat(64),byteLength:2,contentByteLength:2,height:0}} as const;
const issuance: NativeAssetReview = { schema: 'receiz.bank.native-asset-review.v1', keyId: 'a'.repeat(64), planDigest: 'b'.repeat(64), terms,
  request: { schema: 'bankeiz.operation-request.v1', applicationId: BANK_APPLICATION_ID, requestId: 'native-issue-fixture', actorReceizId: 'creator.receiz.id',
    kind: 'issue-currency', policy, authoredSource, definition: { name: 'Local unit', symbol: 'LOCAL', units: '2', description: '', linkedProofDigest: authoredSource.artifactSha256 } } };
const asset = { id: 'c'.repeat(64), supplyMicro: '2000000', ownerQuantityMicro: '0', sourceSha256: 'd'.repeat(64), status: 'active',
  backingRail: 'reserve', backingUsdCents: '0', backingPhiMicro: '0', currency: { policy, availableQuantityMicro: '2000000', liquidityReserveUsdCents: '0', liquidityReservePhiMicro: '0', liquiditySettlementPhiMicro:'0' } };

it('binds the exact declared price and zero allocation in the native review and receipt', () => {
  expect(() => nativeAssetChallenge({...issuance,request:{...issuance.request,authoredSource:{...authoredSource,artifactSha256:'a'.repeat(64)}}} as NativeAssetReview)).toThrow();
  expect(nativeAssetReviewFromChallenge(nativeAssetChallenge(issuance))).toEqual(issuance);
  expect(() => nativeAssetChallenge({ ...issuance, terms: { ...terms, debitPhiMicro: '1' } })).toThrow();
  const receipt = { schema: 'receiz.bank.native-asset-receipt.v1', domain: 'receiz.bank.native-asset.root-signature.v1', issuerRootKid: 'test', review: issuance,
    transactionId: 'transaction', kaiUPulse: '100000000', issuedAtKaiUPulse: '100000001', nativeAssetSourceSha256: asset.sourceSha256,
    actorAfter: { balancePhiMicro: '0', reserveUsdCents: '0', reserveBackingPhiMicro: '0' }, assetAfter: asset,
    rootSignature: { kid: 'test', alg: 'Ed25519', sig: 'a'.repeat(86) } };
  expect(inspectNativeAssetReceipt(receipt).assetAfter.currency).toEqual(asset.currency);
  expect(() => inspectNativeAssetReceipt({ ...receipt, assetAfter: { ...asset, ownerQuantityMicro: '1' } })).toThrow();
});

it('verifies currency liquidity on the existing public projection while preserving the separate legacy backing field', async () => {
  const key = generateKeyPairSync('ed25519'), kid = 'test.currency';
  const root = { kid, alg: 'Ed25519' as const, status: 'active' as const, publicKeyRawB64u: key.publicKey.export({ format: 'jwk' }).x! };
  const publicAsset = { id: asset.id, supplyMicro: asset.supplyMicro, backingRail: asset.backingRail, backingUsdCents: '0', backingPhiMicro: '0', status: asset.status,
    definition: { name: 'Local unit', symbol: 'LOCAL', supplyMicro: asset.supplyMicro, description: '', linkedProofDigest: null },
    issuanceSourceSha256: 'c'.repeat(64), headSourceSha256: asset.sourceSha256, headKaiUPulse: '100000000',
    currency: { ...asset.currency, availableQuantityMicro: '1000000', liquidityReserveUsdCents: '25', liquidityReservePhiMicro: '125000' } };
  const certificate = (value: typeof publicAsset) => {
    const payload = { schema: 'receiz.bank.native-asset-public.v1', domain: NATIVE_ASSET_PUBLIC_DOMAIN, issuerRootKid: kid, asset: value, issuedAtKaiUPulse: '100000001' };
    return { ...payload, rootSignature: { kid, alg: 'Ed25519', sig: sign(null, Buffer.from(canonicalizeReceizV122(payload)), key.privateKey).toString('base64url') } };
  };
  const roots = new Map([[kid, root]]);
  expect(await verifyNativeAssetPublicSignature(certificate(publicAsset), roots)).toMatchObject({ asset: publicAsset });
  expect(await verifyNativeAssetPublicSignature(certificate({ ...publicAsset, backingUsdCents: '25' }), roots)).toBeNull();
  expect(await verifyNativeAssetPublicSignature(certificate({ ...publicAsset, currency: { ...publicAsset.currency, liquidityReservePhiMicro: '0' } }), roots)).toBeNull();
});
