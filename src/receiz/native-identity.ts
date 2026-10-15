import type { ReceizClient, ReceizIdentityPublicBinding, ReceizKeyFile, ReceizIdentityAccountProjection } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID, BANK_CARD_APPLICATION_IDS, BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_CARD_CONSENT, BANK_CARD_SCOPES, BANK_NATIVE_CONSENT, BANK_NATIVE_SCOPES } from './config';
import { parseCardCheckout, parseCardDepositStatus, parseDepositDollars, readCardOperation, type CardCheckout, type CardDepositStatus } from './card-deposit';
import { nativeFetch } from './native-transport';
import { loadDeviceIdentity, saveDeviceIdentity, loadWalletObservation, saveWalletObservation, loadDepositSources, saveDepositSource, loadCardOperation, loadCardOperations, saveCardOperation, loadBankSessionIntent, saveBankSessionIntent } from './identity-vault';
import { projectHeldDeposit, validateAssetIntake, type AssetIntake, type HeldDeposit } from './deposit-source';
import { protectIdentityKeyFile, unprotectIdentityKeyFile } from './identity-protection';
import type { ProtectedIdentityTransport } from './identity-vault';
import { identityNeedsPhrase } from './identity-lock';
import { parseSharedWallet } from './shared-wallet';
import { physicalDeliveryInstructions } from './custody-delivery';
import { BANK_NATIVE_OPERATIONS, summarizeNativeBankReadiness, type BankNativeReadiness } from './bank-native-readiness';
import { BankConnectionError } from './bank-connection-error';
import { createBankSubjectSource, openBankSubjectSource, type BankSubjectSource } from './bank-native-source';
import { createBankNativeSession } from './bank-native-session';
import { browserBankKaiFactory } from './bank-kai';
import { validateAssetDefinition, type AssetDefinition } from './asset-definition';
import { readCarriedWalletObservation } from './wallet-observation';
import { appendWalletPoint } from './wallet-series';
import { parsePrivateHistoryPage, privateHistoryPath, type PrivateHistoryPage } from './private-history';

export interface OpenIdentity {
  binding: ReceizIdentityPublicBinding; needsPhrase: boolean; knownWallet: () => import('./wallet-observation').WalletObservation | null;
  username: string | null; accountUsername?: () => string | null; localHistory: ReceizIdentityAccountProjection; readWallet: () => Promise<ReturnType<typeof parseSharedWallet>>;
  beginCardDeposit: (amount: string, approved: boolean) => Promise<CardCheckout>; checkCardDeposit: (checkout: CardCheckout) => Promise<CardDepositStatus>;
  pendingCardDeposit: () => Promise<CardCheckout | null>;
  pendingCardDeposits?: () => Promise<CardCheckout[]>;
  startAssetIntake: (asset: AssetIntake, attachment?: File) => Promise<HeldDeposit>; holdProof: (file: File) => Promise<HeldDeposit>;
  listDeposits: () => Promise<HeldDeposit[]>;
  createAsset: (definition: AssetDefinition) => Promise<HeldDeposit>;
  readPrivateHistory: (cursor?: string) => Promise<PrivateHistoryPage>;
  nativeReadiness: (approveNativeAccess?: boolean) => Promise<BankNativeReadiness>;
  connectNativeAccount: (approved: boolean) => Promise<{ subjectId: string; sourceDigest: string; sessionExpiresKaiUPulse: number; readyToTransact: false }>;
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
  const ownerAdmission = admission;
  const binding = await sdk.readReceizIdentityPublicBinding(admission);
  const keyFile: ReceizKeyFile = await sdk.readReceizIdentityArtifact(bytes);
  const localHistory = await sdk.projectReceizIdentityAccount(keyFile);
  let knownWallet = await loadWalletObservation(binding);
  // Known same-owner source truth paints immediately. Foreign account placement
  // still requires continuation plus a protected same-account wallet read.
  knownWallet ??= readCarriedWalletObservation(localHistory);
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
  let client: ReceizClient | null = null, clientApplicationId: string | null = null, expiresAtKai = 0, accountUid: string | null = null, grantedScopes: readonly string[] = [];
  let presentationUsername = keyFile.owner.username;
  async function connectClient(scopes: readonly string[], statement: string, applicationId: string = BANK_APPLICATION_ID) {
    if (!consentApproved || lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    if (!BANK_CARD_APPLICATION_IDS.some(id => id === applicationId)) throw new Error('Unsupported bank registration.');
    if (!client || clientApplicationId !== applicationId || sdk.receizKaiNow().pulse >= expiresAtKai || scopes.some(scope => !grantedScopes.includes(scope))) {
      const targetUnsigned = applicationId === BANK_APPLICATION_ID ? unsigned : sdk.createReceizClient({ applicationId, baseUrl: 'https://receiz.com', fetchImpl: heldFetch });
      // Signed transport metadata comes from the genuine admitted identity. It is not a replacement source.
      const continued = await targetUnsigned.identity.continueReceizId({ schema: 'receiz.device.identity.v1', createdAt: keyFile.issuedAt, updatedAt: keyFile.issuedAt, localUid: keyFile.owner.uid, username: keyFile.owner.username ?? keyFile.keyId, displayName: keyFile.owner.displayName ?? keyFile.owner.username ?? 'Receiz account', deviceName: null, keyFile: transportKeyFile }, { passphrase: transportPhrase });
      const session = continued.session as { uid?: unknown; username?: unknown } | undefined;
      if (continued.ok !== true || typeof session?.uid !== 'string') throw new Error('Your Receiz account could not be opened. Your local Identity Seal remains available.');
      const created = sdk.createReceizProofAuthorityChallenge({ applicationId, artifactDigest: transportBinding.artifactSha256, scopes, consentStatementDigest: await sdk.sha256ReceizBytes(new TextEncoder().encode(statement)), ttlPulses: 30 });
      const proof = await targetUnsigned.identity.signLoginProof({ keyFile: transportKeyFile, passphrase: transportPhrase, challengeB64Url: created.challengeB64Url });
      const grant = await targetUnsigned.identity.exchangeProofAuthority({ artifact: transportBytes, challenge: { ...created.challenge, proof }, applicationId, scopes });
      if (grant.applicationId !== applicationId || grant.keyId !== transportBinding.keyId || grant.artifactDigest !== transportBinding.artifactSha256 || scopes.some(scope => !grant.grantedScopes.includes(scope))) throw new Error('Receiz did not grant this bank access to the same identity and scopes.');
      const protectedClient = sdk.createReceizClient({ applicationId, baseUrl: 'https://receiz.com', accessToken: grant.accessToken, fetchImpl: heldFetch });
      const granted = await protectedClient.auth.grantedScopes(); if (scopes.some(scope => !granted.includes(scope))) throw new Error('Receiz account permission is unavailable.');
      client = protectedClient; clientApplicationId = applicationId; grantedScopes = granted; expiresAtKai = grant.expiresAtKai; accountUid = session.uid;
      // The confirmed account's profile name is display metadata, never proof ownership.
      if (typeof session.username === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(session.username)) presentationUsername = session.username;
    }
    return client;
  }
  async function readWallet() {
    const current = await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT);
    const wallet = parseSharedWallet(await current.connect.wallet(), accountUid!);
    if (!lifetime.signal.aborted) { const observedAt = new Date().toISOString(); const history = appendWalletPoint(knownWallet?.history ?? [], wallet, observedAt, String(sdk.receizKaiNow().uPulse)); knownWallet = { wallet, observedAt, history }; await saveWalletObservation(binding, wallet, observedAt, history); }
    return wallet;
  }
  async function readPrivateHistory(cursor?: string) {
    const path = privateHistoryPath(cursor), current = await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT);
    return parsePrivateHistoryPage(await current.request(path), accountUid!);
  }
  async function beginCardDeposit(amount: string, approved: boolean) {
    if (!approved) throw new Error('Approve this card deposit before continuing.');
    const previous = readCardOperation(await loadCardOperation(binding));
    if (previous?.stage === 'creating') throw new Error(`Your previous checkout’s result is unknown. Keep its reference and resolve it before starting another: ${previous.operationId}`);
    const exact = parseDepositDollars(amount), current = await connectClient(BANK_CARD_SCOPES, BANK_CARD_CONSENT);
    const returnUrl = `${location.origin}/?cardReturn=1&session_id={CHECKOUT_SESSION_ID}`;
    const operation = { schema: 'receiz.bank.card-operation.v1', applicationId: BANK_APPLICATION_ID, stage: 'creating', operationId: crypto.randomUUID(), amountUsdCents: exact.amountUsdCents };
    await saveCardOperation(binding, operation, true, previous?.operationId, Boolean(previous));
    // A known checkout is retained for explicit resumption; a new reviewed amount
    // is a distinct user intent. A timeout or malformed reply retains this attempt. Never create another
    // checkout merely because the response was not delivered.
    const checkout = parseCardCheckout(await current.connect.checkout({ amountUsd: exact.amountUsd, currency: 'usd', uiMode: 'embedded', returnUrl, successUrl: returnUrl, referenceId: operation.operationId, description: 'Receiz Bank Reserve deposit' }), exact.amountUsdCents);
    await saveCardOperation(binding, { ...operation, stage: 'ready', checkout }, false, operation.operationId); return checkout;
  }
  async function pendingCardDeposit() {
    const operation = readCardOperation(await loadCardOperation(binding));
    if (!operation) return null;
    if (operation.stage === 'creating') throw new Error(`Receiz may have opened your previous card checkout. Do not create another until its result is resolved. Deposit reference: ${operation.operationId}`);
    return operation.checkout!;
  }
  async function pendingCardDeposits() {
    const operations = (await loadCardOperations(binding)).map(readCardOperation).filter(value => value !== null);
    // An unresolved current request blocks new creation, but cannot hide older
    // known checkout sessions that remain safe to inspect or explicitly resume.
    return operations.filter(value => value.stage === 'ready').map(value => value.checkout!);
  }
  async function checkCardDeposit(checkout: CardCheckout) {
    const operation = (await loadCardOperations(binding)).map(readCardOperation).find(value => value?.checkout?.sessionId === checkout.sessionId && value.checkout.amountUsdCents === checkout.amountUsdCents);
    if (!operation?.checkout) throw new Error('Open your actual unfinished deposit before checking it.');
    const current = await connectClient(BANK_CARD_SCOPES, BANK_CARD_CONSENT, operation.applicationId);
    const status = parseCardDepositStatus(await current.connect.checkoutSession({ sessionId: checkout.sessionId }), checkout.sessionId, checkout.amountUsdCents, accountUid!);
    if (['credited', 'expired', 'unpaid'].includes(status.status)) await saveCardOperation(binding, null, false, operation.operationId);
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
      if (source.role === 'account-coordination' || source.role === 'account-genesis') continue;
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
    let current: ReceizClient;
    try { current = await connectClient(approveNativeAccess ? BANK_NATIVE_SCOPES : BANK_READ_SCOPES, approveNativeAccess ? BANK_NATIVE_CONSENT : BANK_READ_CONSENT); }
    catch (error) { throw new BankConnectionError('account-access', error); }
    const missingScopes = BANK_NATIVE_SCOPES.filter(scope => !grantedScopes.includes(scope));
    // Report actual permission introspection before attempting native runtime
    // qualification. This is an access check, never an operational success.
    if (missingScopes.length) return { status: 'permissions-needed' as const, missingScopes, unavailableOperations: [], readyToTransact: false as const };
    try { return summarizeNativeBankReadiness(await current.runtime.qualifyV124({ applicationId: BANK_APPLICATION_ID, operations: BANK_NATIVE_OPERATIONS })); }
    catch (error) { throw new BankConnectionError('native-services', error); }
  }
  async function createAsset(input: AssetDefinition): Promise<HeldDeposit> {
    const definition = validateAssetDefinition(input);
    const linked = definition.linkedProofDigest ? (await listDeposits()).find(source => source.kind === 'proof' && source.digest === definition.linkedProofDigest) : null;
    if (definition.linkedProofDigest && !linked) throw new Error('The selected original proof is no longer held by this ID.');
    const payload = { schema: 'receiz.bank.asset-definition.v1', definition, issuerReceizId: binding.artifactOwnerReceizId, createsSpendableValue: false, backingCommitted: false, kai: sdk.receizKaiNow(), linkedSource: linked ? { digest: linked.digest, filename: linked.filename, exactArtifactB64u: sdk.receizBase64UrlEncode(linked.bytes) } : null };
    const sealer = await ownedSealer();
    const sealed = await sealer.seal({ bytes: new TextEncoder().encode(JSON.stringify(payload)), filename: `${definition.symbol.toLowerCase()}.receiz-asset.json`, mimeType: 'application/json' });
    return holdProof(new File([new Uint8Array(sealed.artifactBytes)], sealed.filename, { type: sealed.mimeType }));
  }
  let nativeConnectionBusy = false;
  const nativeSessions = new WeakMap<ReceizClient, Map<string, ReturnType<typeof createBankNativeSession>>>();
  async function connectNativeAccount(approved: boolean) {
    if (!approved || lifetime.signal.aborted) throw new Error('BANK_ACCOUNT_PROOF_CONSENT_REQUIRED');
    if (nativeConnectionBusy) throw new Error('BANK_SESSION_IN_PROGRESS');
    nativeConnectionBusy = true;
    let stage: 'account-access' | 'account-proof' = 'account-access';
    try {
      const current = await connectClient(BANK_NATIVE_SCOPES, BANK_NATIVE_CONSENT);
      stage = 'account-proof';
      const saved = await loadDepositSources(binding);
      let source: BankSubjectSource | null = null;
      let legacySeed: { bytes: Uint8Array; filename: string } | undefined;
      let missingCurrentSource = false;
      // A complete held proof is not a durable subject admission. Publish only
      // a source matching the canonical subject API's current accepted state.
      for (const original of saved) {
        if (original.role !== 'account-coordination') continue;
        const opened = await openBankSubjectSource(new File([new Uint8Array(original.bytes)], original.filename), ownerAdmission);
        try {
          const state = await current.subjects.state(opened.subjectId);
          if (state.stateDigest !== opened.stateDigest || state.head !== opened.subjectHead || state.ownerReceizId !== binding.artifactOwnerReceizId) { missingCurrentSource = true; continue; }
          source = opened; break;
        } catch (error) {
          if ((error as { status?: unknown })?.status !== 404) throw error;
          // Preserve this unadmitted document as an original genesis source;
          // its JSON projection cannot become a remote subject by publication.
          legacySeed ??= original;
        }
      }
      if (!source) {
        if (missingCurrentSource) throw new Error('BANK_SUBJECT_CURRENT_SOURCE_REQUIRED');
        const seed = saved.find(original => original.role === 'account-genesis') ?? legacySeed;
        const created = await createBankSubjectSource({ ownerIdentityAdmission: ownerAdmission, sealer: await ownedSealer(), kaiFactory: await browserBankKaiFactory(), client: current, seed, retainSeed: value => saveDepositSource(binding, value.bytes, value.filename, value.digest, 'account-genesis') });
        if (lifetime.signal.aborted) throw new Error('BANK_SESSION_IDENTITY_CLOSED');
        await saveDepositSource(binding, created.bytes, created.filename, created.source.artifactDigest, 'account-coordination');
        source = created.source;
      }
      let sessionsBySource = nativeSessions.get(current);
      if (!sessionsBySource) { sessionsBySource = new Map(); nativeSessions.set(current, sessionsBySource); }
      let sessions = sessionsBySource.get(source.artifactDigest);
      if (!sessions) {
        const sourceDigest = source.artifactDigest;
        sessions = createBankNativeSession({ client: current, identityBytes: transportBytes, signal: lifetime.signal, store: { load: () => loadBankSessionIntent(binding, sourceDigest), save: (value, expected) => saveBankSessionIntent(binding, value, expected) }, signFreshChallenge: async () => {
          const created = sdk.createReceizProofAuthorityChallenge({ applicationId: BANK_APPLICATION_ID, artifactDigest: transportBinding.artifactSha256, scopes: BANK_NATIVE_SCOPES, consentStatementDigest: await sdk.sha256ReceizBytes(new TextEncoder().encode(BANK_NATIVE_CONSENT)), ttlPulses: 30 });
          const proof = await unsigned.identity.signLoginProof({ keyFile: transportKeyFile, passphrase: transportPhrase, challengeB64Url: created.challengeB64Url });
          return { ...created.challenge, proof };
        } });
        sessionsBySource.set(source.artifactDigest, sessions);
      }
      const session = await sessions.connect(source);
      return { subjectId: source.subjectId, sourceDigest: source.artifactDigest, sessionExpiresKaiUPulse: session.expiresAtKaiUPulse, readyToTransact: false as const };
    } catch (error) { throw error instanceof BankConnectionError ? error : new BankConnectionError(stage, error); }
    finally { nativeConnectionBusy = false; }
  }
  return { binding, needsPhrase: identityNeedsPhrase(keyFile), knownWallet: () => knownWallet, username: keyFile.owner.username, accountUsername: () => presentationUsername, localHistory, readWallet, readPrivateHistory, beginCardDeposit, checkCardDeposit, pendingCardDeposit, pendingCardDeposits, startAssetIntake, holdProof, listDeposits, createAsset, nativeReadiness, connectNativeAccount, persistDeviceCustody: () => saveDeviceIdentity(bytes, filename, phrase, consentApproved, protectedTransport), dispose: () => { lifetime.abort(); client = null; }, backup: () => ({ bytes: new Uint8Array(bytes), filename, phrase }) };
}
export async function createNativeIdentity(consentApproved: boolean): Promise<OpenIdentity> {
  if (!consentApproved) throw new Error('Approve account read access before creating your ID.');
  const sdk = await loadReceiz();
  const resources = await Promise.all(['/zk/document-seal.wasm', '/zk/document-seal.zkey'].map(async path => { const response = await fetch(path, { credentials: 'omit' }); if (!response.ok) throw new Error('Receiz proof resources are unavailable.'); return new Uint8Array(await response.arrayBuffer()); }));
  const { createReceizOfflineSealer, createReceizIndexedDbSealStore } = await import('@receiz/sdk/offline');
  const sealer = createReceizOfflineSealer({ store: createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'), resources: { wasm: resources[0], zkey: resources[1] }, fetch: nativeFetch });
  await sealer.enroll();
  // v129's onboarding sealer requires protected bootstrap custody. This secret
  // stays internal; the actual user-held download is sealed with the same key
  // in its supported no-phrase form, then independently admitted again.
  const protectionSecret = sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const protectedSeal = await sealer.createIdentity({ passphrase: protectionSecret });
  const verification = await sdk.verifyReceizArtifact(protectedSeal.artifactBytes);
  const admission = await sdk.createReceizArtifactAdmissionEngine()(verification, { profile: 'identity', identityPassphrase: protectionSecret });
  const protectedBinding = await sdk.readReceizIdentityPublicBinding(admission);
  const protectedKey = await sdk.readReceizIdentityArtifact(protectedSeal.artifactBytes);
  const portableKey = await unprotectIdentityKeyFile(protectedKey, protectionSecret);
  const owned = createReceizOfflineSealer({ ownerIdentityAdmission: admission, store: createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'), resources: { wasm: resources[0], zkey: resources[1] }, fetch: nativeFetch });
  const sealed = await owned.seal({ bytes: new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(portableKey)), filename: 'identity.receizkey', mimeType: 'application/json' });
  const identity = await openCanonicalIdentity(sealed.artifactBytes, '', sealed.filename, true, { bytes: new Uint8Array(protectedSeal.artifactBytes), phrase: protectionSecret });
  if (identity.needsPhrase || identity.binding.keyId !== protectedBinding.keyId || identity.binding.artifactOwnerReceizId !== protectedBinding.artifactOwnerReceizId) { identity.dispose(); throw new Error('The self-contained Identity Seal did not preserve its original identity.'); }
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
