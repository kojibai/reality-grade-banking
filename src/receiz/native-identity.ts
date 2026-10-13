import type { ReceizClient, ReceizIdentityPublicBinding, ReceizKeyFile, ReceizIdentityAccountProjection } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID, BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_CARD_CONSENT, BANK_CARD_SCOPES, BANK_NATIVE_CONSENT, BANK_NATIVE_SCOPES } from './config';
import { parseCardCheckout, parseCardDepositStatus, parseDepositDollars, readCardOperation, type CardCheckout, type CardDepositStatus } from './card-deposit';
import { nativeFetch } from './native-transport';
import { loadDeviceIdentity, saveDeviceIdentity, loadWalletObservation, saveWalletObservation, loadDepositSources, saveDepositSource, loadCardOperation, saveCardOperation } from './identity-vault';
import { projectHeldDeposit, validateAssetIntake, type AssetIntake, type HeldDeposit } from './deposit-source';
import { protectIdentityKeyFile } from './identity-protection';
import type { ProtectedIdentityTransport } from './identity-vault';
import { identityNeedsPhrase } from './identity-lock';
import { parseSharedWallet } from './shared-wallet';
import { physicalDeliveryInstructions } from './custody-delivery';
import { BANK_NATIVE_OPERATIONS, summarizeNativeBankReadiness, type BankNativeReadiness } from './bank-native-readiness';

export interface OpenIdentity {
  binding: ReceizIdentityPublicBinding; needsPhrase: boolean; knownWallet: () => import('./wallet-observation').WalletObservation | null;
  username: string | null; localHistory: ReceizIdentityAccountProjection; readWallet: () => Promise<ReturnType<typeof parseSharedWallet>>;
  beginCardDeposit: (amount: string, approved: boolean) => Promise<CardCheckout>; checkCardDeposit: (checkout: CardCheckout) => Promise<CardDepositStatus>;
  pendingCardDeposit: () => Promise<CardCheckout | null>;
  startAssetIntake: (asset: AssetIntake, attachment?: File) => Promise<HeldDeposit>; holdProof: (file: File) => Promise<HeldDeposit>;
  listDeposits: () => Promise<HeldDeposit[]>;
  nativeReadiness: (approveNativeAccess?: boolean) => Promise<BankNativeReadiness>;
  persistDeviceCustody: () => Promise<void>;
  dispose: () => void; backup: () => { bytes: Uint8Array; filename: string; phrase: string };
}
// Exact private material is retained only inside this closure and encrypted device custody.
export async function openCanonicalIdentity(bytes: Uint8Array, phrase: string, filename: string, consentApproved = false, protectedTransport?: ProtectedIdentityTransport): Promise<OpenIdentity> {
  if (!bytes.length || bytes.length > 32 * 1024 * 1024) throw new Error('Identity Seal exceeds the supported device capacity.');
  const sdk = await loadReceiz(); const verification = await sdk.verifyReceizArtifact(bytes);
  if (verification.status !== 'verified-artifact') throw new Error('Import your complete, encrypted Receiz Identity Seal. This file is not a verified identity proof.');
  const admission = await sdk.createReceizArtifactAdmissionEngine()(verification, { profile: 'identity', identityPassphrase: phrase });
  if (admission.verdict !== 'canonical-identity' || !sdk.isSdkIssuedReceizArtifactAdmission(admission)) throw new Error('This Identity Seal could not be opened with that recovery phrase.');
  const binding = await sdk.readReceizIdentityPublicBinding(admission);
  const keyFile: ReceizKeyFile = await sdk.readReceizIdentityArtifact(bytes);
  const localHistory = await sdk.projectReceizIdentityAccount(keyFile);
  let knownWallet = await loadWalletObservation(binding);
  const lifetime = new AbortController();
  const heldFetch: typeof fetch = (input, init) => nativeFetch(input, { ...init, signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(60_000)]) });
  const unsigned = sdk.createReceizClient({ applicationId: BANK_APPLICATION_ID, baseUrl: 'https://receiz.com', fetchImpl: heldFetch });
  async function ownedSealer() {
    const resources = await Promise.all(['/zk/document-seal.wasm', '/zk/document-seal.zkey'].map(async path => { const response = await fetch(path, { credentials: 'omit', signal: lifetime.signal }); if (!response.ok) throw new Error('Receiz proof resources are unavailable.'); return new Uint8Array(await response.arrayBuffer()); }));
    const { createReceizOfflineSealer, createReceizIndexedDbSealStore } = await import('@receiz/sdk/offline');
    const sealer = createReceizOfflineSealer({ ownerIdentityAdmission: admission, store: createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'), resources: { wasm: resources[0], zkey: resources[1] }, fetch: heldFetch });
    await sealer.enroll(); return sealer;
  }
  let transportKeyFile = keyFile, transportPhrase = phrase, transportBytes = bytes, transportBinding = binding;
  if (keyFile.crypto.privateKeyPkcs8B64u) {
    if (!consentApproved) throw new Error('Approve account opening before protecting this ID for Receiz transport.');
    if (!protectedTransport) {
      const protectionPhrase = sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32))), protectedKey = await protectIdentityKeyFile(keyFile, protectionPhrase);
      const sealer = await ownedSealer();
      const sealed = await sealer.seal({ bytes: new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(protectedKey)), filename: 'protected-identity.receizkey', mimeType: 'application/json' });
      protectedTransport = { bytes: new Uint8Array(sealed.artifactBytes), phrase: protectionPhrase };
    }
    const protectedVerification = await sdk.verifyReceizArtifact(protectedTransport.bytes), protectedAdmission = await sdk.createReceizArtifactAdmissionEngine()(protectedVerification, { profile: 'identity', identityPassphrase: protectedTransport.phrase });
    if (protectedAdmission.verdict !== 'canonical-identity' || !sdk.isSdkIssuedReceizArtifactAdmission(protectedAdmission)) throw new Error('Your ID could not be protected for account opening.');
    transportBinding = await sdk.readReceizIdentityPublicBinding(protectedAdmission); transportKeyFile = await sdk.readReceizIdentityArtifact(protectedTransport.bytes);
    if (transportKeyFile.crypto.privateKeyPkcs8B64u || transportBinding.keyId !== binding.keyId || transportBinding.identityOwnerReceizId !== binding.identityOwnerReceizId || transportKeyFile.crypto.publicKeyRawB64u !== keyFile.crypto.publicKeyRawB64u) throw new Error('Protected custody does not carry the same identity.');
    transportPhrase = protectedTransport.phrase; transportBytes = protectedTransport.bytes;
  }
  let client: ReceizClient | null = null, expiresAtKai = 0, accountUid: string | null = null, grantedScopes: readonly string[] = [];
  async function connectClient(scopes: readonly string[], statement: string) {
    if (!consentApproved || lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    if (!client || sdk.receizKaiNow().pulse >= expiresAtKai || scopes.some(scope => !grantedScopes.includes(scope))) {
      // Signed transport metadata comes from the genuine admitted identity. It is not a replacement source.
      const continued = await unsigned.identity.continueReceizId({ schema: 'receiz.device.identity.v1', createdAt: keyFile.issuedAt, updatedAt: keyFile.issuedAt, localUid: keyFile.owner.uid, username: keyFile.owner.username ?? keyFile.keyId, displayName: keyFile.owner.displayName ?? keyFile.owner.username ?? 'Receiz account', deviceName: null, keyFile: transportKeyFile }, { passphrase: transportPhrase });
      const session = continued.session as { uid?: unknown } | undefined;
      if (continued.ok !== true || typeof session?.uid !== 'string') throw new Error('Your Receiz account could not be opened. Your local Identity Seal remains available.');
      const created = sdk.createReceizProofAuthorityChallenge({ applicationId: BANK_APPLICATION_ID, artifactDigest: transportBinding.artifactSha256, scopes, consentStatementDigest: await sdk.sha256ReceizBytes(new TextEncoder().encode(statement)), ttlPulses: 30 });
      const proof = await unsigned.identity.signLoginProof({ keyFile: transportKeyFile, passphrase: transportPhrase, challengeB64Url: created.challengeB64Url });
      const grant = await unsigned.identity.exchangeProofAuthority({ artifact: transportBytes, challenge: { ...created.challenge, proof }, applicationId: BANK_APPLICATION_ID, scopes });
      if (grant.applicationId !== BANK_APPLICATION_ID || grant.keyId !== transportBinding.keyId || grant.artifactDigest !== transportBinding.artifactSha256 || scopes.some(scope => !grant.grantedScopes.includes(scope))) throw new Error('Receiz did not grant this bank access to the same identity and scopes.');
      const protectedClient = sdk.createReceizClient({ applicationId: BANK_APPLICATION_ID, baseUrl: 'https://receiz.com', accessToken: grant.accessToken, fetchImpl: heldFetch });
      const granted = await protectedClient.auth.grantedScopes(); if (scopes.some(scope => !granted.includes(scope))) throw new Error('Receiz wallet permission is unavailable.');
      client = protectedClient; grantedScopes = granted; expiresAtKai = grant.expiresAtKai; accountUid = session.uid;
    }
    return client;
  }
  async function readWallet() {
    const current = await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT);
    const wallet = parseSharedWallet(await current.connect.wallet(), accountUid!);
    if (!lifetime.signal.aborted) { knownWallet = { wallet, observedAt: new Date().toISOString() }; await saveWalletObservation(binding, wallet, knownWallet.observedAt); }
    return wallet;
  }
  async function beginCardDeposit(amount: string, approved: boolean) {
    if (!approved) throw new Error('Approve this card deposit before continuing.');
    if (await loadCardOperation(binding)) throw new Error('Your previous card deposit is unfinished. Reopen Deposit to check it before starting another.');
    const exact = parseDepositDollars(amount), current = await connectClient(BANK_CARD_SCOPES, BANK_CARD_CONSENT);
    const returnUrl = `${location.origin}/?cardReturn=1&session_id={CHECKOUT_SESSION_ID}`;
    const operation = { schema: 'receiz.bank.card-operation.v1', stage: 'creating', operationId: crypto.randomUUID(), amountUsdCents: exact.amountUsdCents };
    await saveCardOperation(binding, operation, true);
    // A timeout or malformed reply retains this attempt. Never create another
    // checkout merely because the response was not delivered.
    const checkout = parseCardCheckout(await current.connect.checkout({ amountUsd: exact.amountUsd, currency: 'usd', uiMode: 'embedded', returnUrl, successUrl: returnUrl, referenceId: operation.operationId, description: 'Receiz Bank Reserve deposit' }), exact.amountUsdCents);
    await saveCardOperation(binding, { ...operation, stage: 'ready', checkout }); return checkout;
  }
  async function pendingCardDeposit() {
    const operation = readCardOperation(await loadCardOperation(binding));
    if (!operation) return null;
    if (operation.stage === 'creating') throw new Error(`Receiz may have opened your previous card checkout. Do not create another until its result is resolved. Deposit reference: ${operation.operationId}`);
    return operation.checkout!;
  }
  async function checkCardDeposit(checkout: CardCheckout) {
    const operation = readCardOperation(await loadCardOperation(binding)), held = operation?.checkout; if (!held || held.sessionId !== checkout.sessionId || held.amountUsdCents !== checkout.amountUsdCents) throw new Error('Open your actual unfinished deposit before checking it.');
    const current = await connectClient(BANK_CARD_SCOPES, BANK_CARD_CONSENT);
    const status = parseCardDepositStatus(await current.connect.checkoutSession({ sessionId: checkout.sessionId }), checkout.sessionId, checkout.amountUsdCents, accountUid!);
    if (['credited', 'expired', 'unpaid'].includes(status.status)) await saveCardOperation(binding, null, false, operation!.operationId);
    return status;
  }
  async function holdProof(file: File) {
    if (lifetime.signal.aborted) throw new Error('Open your identity before depositing a proof.');
    if (!file.size || file.size > 32 * 1024 * 1024) throw new Error('Choose an original proof up to 32 MB.');
    const exact = new Uint8Array(await file.arrayBuffer());
    const opened = await unsigned.artifacts.verifyAndOpen(new File([exact], file.name, { type: file.type }));
    const deposit = projectHeldDeposit(opened, exact, file.name, binding.artifactOwnerReceizId);
    if (lifetime.signal.aborted) throw new Error('The identity was closed before deposit.');
    await saveDepositSource(binding, exact, file.name, deposit.digest); return deposit;
  }
  async function listDeposits() {
    const sources = await loadDepositSources(binding), result: HeldDeposit[] = [];
    for (const source of sources) {
      try { const opened = await unsigned.artifacts.verifyAndOpen(new File([new Uint8Array(source.bytes)], source.filename)); result.push(projectHeldDeposit(opened, source.bytes, source.filename, binding.artifactOwnerReceizId)); } catch { /* Only actual reopened proof sources appear. */ }
    }
    return result;
  }
  async function startAssetIntake(input: AssetIntake, attachment?: File) {
    if (lifetime.signal.aborted) throw new Error('Open your identity before depositing an asset.');
    const asset = validateAssetIntake(input);
    if (attachment && attachment.size > 8 * 1024 * 1024) throw new Error('Use a photo or document up to 8 MB.');
    const evidence = attachment ? { filename: attachment.name, mimeType: attachment.type, bytesB64u: sdk.receizBase64UrlEncode(new Uint8Array(await attachment.arrayBuffer())) } : null;
    const requestId = crypto.randomUUID();
    const payload = { schema: 'receiz.bank.asset-intake-request.v1', requestId, asset, evidence, delivery: asset.category === 'physical' ? physicalDeliveryInstructions(requestId) : null, custody: 'awaiting-receipt', createsSpendableValue: false, kai: sdk.receizKaiNow() };
    const sealer = await ownedSealer();
    const sealed = await sealer.seal({ bytes: new TextEncoder().encode(JSON.stringify(payload)), filename: 'asset-deposit.json', mimeType: 'application/json' });
    return holdProof(new File([new Uint8Array(sealed.artifactBytes)], sealed.filename, { type: sealed.mimeType }));
  }
  async function nativeReadiness(approveNativeAccess = false) {
    const current = await connectClient(approveNativeAccess ? BANK_NATIVE_SCOPES : BANK_READ_SCOPES, approveNativeAccess ? BANK_NATIVE_CONSENT : BANK_READ_CONSENT);
    const missingScopes = BANK_NATIVE_SCOPES.filter(scope => !grantedScopes.includes(scope));
    // Report actual permission introspection before attempting native runtime
    // qualification. This is an access check, never an operational success.
    if (missingScopes.length) return { status: 'permissions-needed' as const, missingScopes, unavailableOperations: [], readyToTransact: false as const };
    const report = await current.runtime.qualifyV124({ applicationId: BANK_APPLICATION_ID, operations: BANK_NATIVE_OPERATIONS });
    return summarizeNativeBankReadiness(report);
  }
  return { binding, needsPhrase: identityNeedsPhrase(keyFile), knownWallet: () => knownWallet, username: keyFile.owner.username, localHistory, readWallet, beginCardDeposit, checkCardDeposit, pendingCardDeposit, startAssetIntake, holdProof, listDeposits, nativeReadiness, persistDeviceCustody: () => saveDeviceIdentity(bytes, filename, phrase, consentApproved, protectedTransport), dispose: () => { lifetime.abort(); client = null; }, backup: () => ({ bytes: new Uint8Array(bytes), filename, phrase }) };
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
  await identity.persistDeviceCustody(); return identity;
}
export async function importNativeIdentity(file: File, phrase: string, consentApproved: boolean): Promise<OpenIdentity> {
  if (!consentApproved) throw new Error('Approve account read access before importing your ID.');
  if (file.size > 32 * 1024 * 1024) throw new Error('Identity Seal exceeds the supported device capacity.');
  const bytes = new Uint8Array(await file.arrayBuffer()), identity = await openCanonicalIdentity(bytes, phrase, file.name, true);
  await identity.persistDeviceCustody(); return identity;
}
export async function restoreNativeIdentity(): Promise<OpenIdentity | null> { const saved = await loadDeviceIdentity(); return saved && saved.readConsent ? openCanonicalIdentity(saved.bytes, saved.phrase, saved.filename, true, saved.protectedTransport) : null; }
export { forgetDeviceIdentity, loadWalletObservation, saveWalletObservation, restoreKnownWalletObservation } from './identity-vault';
