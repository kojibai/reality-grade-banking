import type { ReceizClient, ReceizIdentityPublicBinding, ReceizKeyFile, ReceizIdentityAccountProjection } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID, BANK_READ_CONSENT, BANK_READ_SCOPES } from './config';
import { nativeFetch } from './native-transport';
import { loadDeviceIdentity, saveDeviceIdentity, forgetDeviceIdentity } from './identity-vault';
import { parseSharedWallet } from './shared-wallet';

export interface OpenIdentity { binding: ReceizIdentityPublicBinding; username: string | null; localHistory: ReceizIdentityAccountProjection; readWallet: () => Promise<ReturnType<typeof parseSharedWallet>>; dispose: () => void; backup: () => { bytes: Uint8Array; filename: string; phrase: string }; }
// Exact private material is retained only inside this closure and encrypted device custody.
export async function openCanonicalIdentity(bytes: Uint8Array, phrase: string, filename: string, consentApproved = false): Promise<OpenIdentity> {
  if (!bytes.length || bytes.length > 32 * 1024 * 1024) throw new Error('Identity Seal exceeds the supported device capacity.');
  const sdk = await loadReceiz(); const verification = await sdk.verifyReceizArtifact(bytes);
  if (verification.status !== 'verified-artifact') throw new Error('Import your complete, encrypted Receiz Identity Seal. This file is not a verified identity proof.');
  const admission = await sdk.createReceizArtifactAdmissionEngine()(verification, { profile: 'identity', identityPassphrase: phrase });
  if (admission.verdict !== 'canonical-identity' || !sdk.isSdkIssuedReceizArtifactAdmission(admission)) throw new Error('This Identity Seal could not be opened with that recovery phrase.');
  const binding = await sdk.readReceizIdentityPublicBinding(admission);
  const keyFile: ReceizKeyFile = await sdk.readReceizIdentityArtifact(bytes);
  if (keyFile.crypto.privateKeyPkcs8B64u) throw new Error('Use an encrypted Identity Seal so the signing key stays private.');
  const localHistory = await sdk.projectReceizIdentityAccount(keyFile);
  const lifetime = new AbortController();
  const heldFetch: typeof fetch = (input, init) => nativeFetch(input, { ...init, signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(60_000)]) });
  const unsigned = sdk.createReceizClient({ applicationId: BANK_APPLICATION_ID, baseUrl: 'https://receiz.com', fetchImpl: heldFetch });
  let client: ReceizClient | null = null, expiresAtKai = 0, accountUid: string | null = null;
  async function readWallet() {
    if (!consentApproved || lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    if (!client || sdk.receizKaiNow().pulse >= expiresAtKai) {
      // Signed transport metadata comes from the genuine admitted identity. It is not a replacement source.
      const continued = await unsigned.identity.continueReceizId({ schema: 'receiz.device.identity.v1', createdAt: keyFile.issuedAt, updatedAt: keyFile.issuedAt, localUid: keyFile.owner.uid, username: keyFile.owner.username ?? keyFile.keyId, displayName: keyFile.owner.displayName ?? keyFile.owner.username ?? 'Receiz account', deviceName: null, keyFile }, { passphrase: phrase });
      const session = continued.session as { uid?: unknown } | undefined;
      if (continued.ok !== true || typeof session?.uid !== 'string') throw new Error('Your Receiz account could not be opened. Your local Identity Seal remains available.');
      const created = sdk.createReceizProofAuthorityChallenge({ applicationId: BANK_APPLICATION_ID, artifactDigest: binding.artifactSha256, scopes: BANK_READ_SCOPES, consentStatementDigest: await sdk.sha256ReceizBytes(new TextEncoder().encode(BANK_READ_CONSENT)), ttlPulses: 30 });
      const proof = await unsigned.identity.signLoginProof({ keyFile, passphrase: phrase, challengeB64Url: created.challengeB64Url });
      const grant = await unsigned.identity.exchangeProofAuthority({ artifact: bytes, challenge: { ...created.challenge, proof }, applicationId: BANK_APPLICATION_ID, scopes: BANK_READ_SCOPES });
      if (grant.applicationId !== BANK_APPLICATION_ID || grant.keyId !== binding.keyId || grant.artifactDigest !== binding.artifactSha256 || BANK_READ_SCOPES.some(scope => !grant.grantedScopes.includes(scope))) throw new Error('Receiz did not grant this bank access to the same identity and scopes.');
      const protectedClient = sdk.createReceizClient({ applicationId: BANK_APPLICATION_ID, baseUrl: 'https://receiz.com', accessToken: grant.accessToken, fetchImpl: heldFetch });
      const granted = await protectedClient.auth.grantedScopes(); if (BANK_READ_SCOPES.some(scope => !granted.includes(scope))) throw new Error('Receiz wallet permission is unavailable.');
      client = protectedClient; expiresAtKai = grant.expiresAtKai; accountUid = session.uid;
    }
    return parseSharedWallet(await client.connect.wallet(), accountUid!);
  }
  return { binding, username: keyFile.owner.username, localHistory, readWallet, dispose: () => { lifetime.abort(); client = null; }, backup: () => ({ bytes: new Uint8Array(bytes), filename, phrase }) };
}
export async function createNativeIdentity(consentApproved: boolean): Promise<OpenIdentity> {
  if (!consentApproved) throw new Error('Approve account read access before creating your ID.');
  const sdk = await loadReceiz();
  const resources = await Promise.all(['/zk/document-seal.wasm', '/zk/document-seal.zkey'].map(async path => { const response = await fetch(path, { credentials: 'omit' }); if (!response.ok) throw new Error('Receiz proof resources are unavailable.'); return new Uint8Array(await response.arrayBuffer()); }));
  const { createReceizOfflineSealer, createReceizIndexedDbSealStore } = await import('@receiz/sdk/offline');
  const sealer = createReceizOfflineSealer({ store: createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'), resources: { wasm: resources[0], zkey: resources[1] }, fetch: nativeFetch });
  await sealer.enroll();
  const phrase = sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const sealed = await sealer.createIdentity({ passphrase: phrase });
  const identity = await openCanonicalIdentity(sealed.artifactBytes, phrase, sealed.filename, true);
  await saveDeviceIdentity(sealed.artifactBytes, sealed.filename, phrase, true); return identity;
}
export async function importNativeIdentity(file: File, phrase: string, consentApproved: boolean): Promise<OpenIdentity> {
  if (!consentApproved) throw new Error('Approve account read access before importing your ID.');
  if (file.size > 32 * 1024 * 1024) throw new Error('Identity Seal exceeds the supported device capacity.');
  const bytes = new Uint8Array(await file.arrayBuffer()), identity = await openCanonicalIdentity(bytes, phrase, file.name, true);
  await saveDeviceIdentity(bytes, file.name, phrase, true); return identity;
}
export async function restoreNativeIdentity(): Promise<OpenIdentity | null> { const saved = await loadDeviceIdentity(); return saved && saved.readConsent ? openCanonicalIdentity(saved.bytes, saved.phrase, saved.filename, true) : null; }
export { forgetDeviceIdentity };
