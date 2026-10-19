import { loadNativePaymentState, saveNativePaymentState, loadNativeAssetState, saveNativeAssetState, loadOfflineNoteState, saveOfflineNoteState, loadPreparedNoteState, savePreparedNoteState, saveOfflineNoteBlob, loadOfflineNoteBlob } from './identity-vault';
import { createBankNoteAttestationFetch } from './note-attestation-transport';
import { loadBankNoteRuntime, bankNoteArtwork, type BankOfflineNotes, type BankNoteRuntime } from './offline-notes';
import type { ReceizClient, ReceizIdentityPublicBinding, ReceizKeyFile, ReceizIdentityAccountProjection } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID, BANK_PREVIOUS_NATIVE_APPLICATION_ID, isBankNativeApplicationId, BANK_CARD_APPLICATION_IDS, BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_CARD_CONSENT, BANK_CARD_SCOPES, BANK_NATIVE_CONSENT, BANK_NATIVE_SCOPES, BANK_RECOVERY_SCOPES, BANK_RECOVERY_CONSENT } from './config';
import { parseCardCheckout, parseCardDepositStatus, parseDepositDollars, readCardOperation, type CardCheckout, type CardDepositStatus } from './card-deposit';
import { nativeFetch } from './native-transport';
import { loadDeviceIdentity, saveDeviceIdentity, saveProtectedIdentityTransport, loadAccountLedgerState, saveAccountLedgerState, loadWalletObservation, saveWalletObservation, loadDepositSources, saveDepositSource, loadCardOperation, loadCardOperations, saveCardOperation, loadBankSessionIntent, saveBankSessionIntent, loadProofArchive, loadExportableRecoveries, retainProofBatch } from './identity-vault';
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
import { readCarriedWalletObservation, createWalletQuoteHold, isWalletQuoteHeld, sameWalletFinancialState } from './wallet-observation';
import { appendWalletPoint } from './wallet-series';
import { parsePrivateHistoryPage, privateHistoryPath, type PrivateHistoryPage } from './private-history';
import { createBankExecutionRecovery, type BankExecutionRecovery } from './bank-execution-recovery';
import { deviceBankExecutionStore } from './bank-execution-vault';
import { createBankCommittedSourceRestoration } from './bank-committed-sources';
import { initializeFreshBankAccount } from './new-account-genesis';
import {loadBankProofResources} from './proof-resource-continuity';
import {readLocalAccountCheckpoint} from './local-account-checkpoint';
import {BANK_PREPARED_NOTE_CREDIT_ENABLED} from './config';
import { readNoteAccountObservation } from './note-account-observation';
import {readCompositeWalletSource,advanceCompositeWalletObservation,mergeCompositeWalletSources,reconcileCompositeWalletObservation,validCursor} from './composite-wallet-source';
import { hasSettledAccountView } from './account-view';

export interface OpenIdentity {
  prepareAccountView: () => Promise<import('./wallet-observation').WalletObservation>;
  refreshLocalValuation?: () => Promise<import('./wallet-observation').WalletObservation | null>;
  operations?: () => Promise<import('./bank-operations').BankOperations>;
  accountProof?: () => Promise<import('./account-proof').VerifiedAccountProof>;
  retainAccountArtifactSource?: (file:File) => Promise<string>;
  accountProofSharing?: () => Promise<import('./account-proof-sharing').AccountProofSharing>;
  proofLibrary?: () => Promise<import('./proof-library').ProofLibrary>;
  executionRecovery?: () => BankExecutionRecovery;
  offlineNotes?: () => Promise<BankOfflineNotes>;
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
  // v129 already verified this segmented account projection during canonical
  // identity admission. Reuse that SDK-held result rather than verifying every
  // carried segment a second time on the entry path.
  const recovered = admission.recoveredState as unknown as ReceizIdentityAccountProjection | undefined;
  const localHistory = recovered?.schema === 'receiz.sdk.identity_account_projection.v1' && recovered.keyId === keyFile.keyId && recovered.owner?.uid === keyFile.owner.uid
    ? recovered : await sdk.projectReceizIdentityAccount(keyFile);
  let knownWallet = await loadWalletObservation(binding);
  let walletRevision = 0;
  let activeNoteOperations = 0, noteOperationEpoch = 0;
  let walletPersistence = Promise.resolve();
  function persistWalletObservation(observation: NonNullable<typeof knownWallet>) {
    const write = walletPersistence.catch(() => {}).then(async () => {
      if (lifetime.signal.aborted || knownWallet !== observation) return;
      await saveWalletObservation(binding, observation.wallet, observation.observedAt, observation.history, observation.source, observation.localHeadDigest, observation.historyBasis, observation.walletScope, observation.quoteHold, observation.chartSource);
    });
    walletPersistence = write;
    return write;
  }
  // Known same-owner source truth paints immediately. Foreign account placement
  // still requires continuation plus a protected same-account wallet read.
  const carriedWallet = readCarriedWalletObservation(localHistory);
  knownWallet ??= carriedWallet;
  let enrichedCarriedHistory = false;
  const carriedRows=(localHistory.verifiedState as {wallet?:{ledgerEntries?:unknown[]}}|null)?.wallet?.ledgerEntries;
  const cachedStart=knownWallet?.historyBasis?.startKaiUPulse;
  const hasEarlierCarriedBalance=!!cachedStart&&Array.isArray(carriedRows)&&carriedRows.some(value=>{const kai=(value as {kai_upulse?:unknown}|null)?.kai_upulse;return (typeof kai==='string'||typeof kai==='number'&&Number.isSafeInteger(kai))&&/^\d{1,30}$/.test(String(kai))&&BigInt(String(kai))<BigInt(cachedStart);});
  if (knownWallet && carriedWallet && knownWallet.source !== 'local-note-head' && localHistory.completeAtSealedHead && (!hasSettledAccountView(knownWallet)||hasEarlierCarriedBalance)) {
    try {
      const {mergeCarriedWalletHistory}=await import('./carried-wallet-history');
      const enriched=mergeCarriedWalletHistory(knownWallet,carriedWallet,localHistory);
      if(enriched!==knownWallet){knownWallet=enriched;enrichedCarriedHistory=true;}
    }catch{/* An optional earlier display source cannot prevent identity entry. */}
  }
  const lifetime = new AbortController();
  if (enrichedCarriedHistory && knownWallet) void persistWalletObservation(knownWallet).catch(() => {});
  const {createLocalAccountLedger,canAdoptAccountLedgerObservation,mergeAccountLedgerObservation}=await import('./account-ledger');
  const {extendWalletHistory}=await import('./extend-wallet-history');
  const localLedger=createLocalAccountLedger({owner:binding,read:()=>loadAccountLedgerState(binding),write:(value,expected)=>saveAccountLedgerState(binding,value,expected),assertOpen:()=>{if(lifetime.signal.aborted)throw Error('ACCOUNT_LEDGER_IDENTITY_CLOSED');}});
  let accountUid: string | null = null;
  async function restoreLedger() {
    try {
      const restored = await localLedger.restore(knownWallet);
      if (!restored || lifetime.signal.aborted) return;
      if (canAdoptAccountLedgerObservation(knownWallet, restored.observation)) {
        const observation = mergeAccountLedgerObservation(knownWallet, restored.observation);
        if (observation !== knownWallet) {
          const financialChange = !knownWallet || (['totalUsdCents','reserveUsdCents','settlementUsdCents','balancePhiMicro','kaiUpulse'] as const).some(key=>observation.wallet[key]!==knownWallet!.wallet[key]);
          knownWallet = observation; if (financialChange) walletRevision++;
          void persistWalletObservation(observation).catch(()=>{});
          if (typeof dispatchEvent === 'function') dispatchEvent(new Event('bankeiz:account-observation'));
        }
      }
      if (!accountUid && knownWallet?.wallet.userId === restored.observation.wallet.userId) accountUid = restored.observation.wallet.userId;
    } catch { /* Optional source enrichment cannot replace the verified identity or invent a balance. */ }
  }
  // A complete retained frame needs no second verification/repricing pass on
  // entry. Balance-only legacy caches must finish their original history first.
  const restoringLedger = restoreLedger();
  if (!knownWallet) await restoringLedger;

  const heldFetch: typeof fetch = (input, init) => nativeFetch(input, { ...init, signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(60_000)]) });
  const unsigned = sdk.createReceizClient({ applicationId: BANK_APPLICATION_ID, baseUrl: 'https://receiz.com', fetchImpl: heldFetch });
  let sealingResources: { wasm: Uint8Array; zkey: Uint8Array } | undefined;
  async function ownedSealer() {
    sealingResources ??= await loadBankProofResources(fetch, undefined, lifetime.signal);
    const { createReceizOfflineSealer, createReceizIndexedDbSealStore } = await import('@receiz/sdk/offline');
    const sealer = createReceizOfflineSealer({ ownerIdentityAdmission: admission, store: createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'), resources: sealingResources, fetch: heldFetch });
    await sealer.enroll(); return sealer;
  }
  let transportKeyFile = keyFile, transportPhrase = phrase, transportBytes = bytes, transportBinding = binding;
  if (keyFile.crypto.privateKeyPkcs8B64u && !consentApproved) throw new Error('Approve account opening before protecting this ID for Receiz transport.');
  const suppliedTransport = protectedTransport;
  let transportReady = !keyFile.crypto.privateKeyPkcs8B64u, transportOpening: Promise<void> | undefined;
  async function prepareTransport() {
    if (transportReady) return;
    if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.');
    if (transportOpening) return transportOpening;
    const attempt = (async () => {
      if (!protectedTransport) {
        const protectionPhrase = sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32))), protectedKey = await protectIdentityKeyFile(keyFile, protectionPhrase);
        const sealer = await ownedSealer();
        const sealed = await sealer.seal({ bytes: new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(protectedKey)), filename: 'protected-identity.receizkey', mimeType: 'application/json' });
        protectedTransport = { bytes: new Uint8Array(sealed.artifactBytes), phrase: protectionPhrase };
      }
      const protectedVerification = await sdk.verifyReceizArtifact(protectedTransport.bytes), protectedAdmission = await sdk.createReceizArtifactAdmissionEngine()(protectedVerification, { profile: 'identity', identityPassphrase: protectedTransport.phrase });
      if (protectedAdmission.verdict !== 'canonical-identity' || !sdk.isSdkIssuedReceizArtifactAdmission(protectedAdmission)) throw new Error('Your ID could not be protected for account opening.');
      const nextBinding = await sdk.readReceizIdentityPublicBinding(protectedAdmission), nextKeyFile = await sdk.readReceizIdentityArtifact(protectedTransport.bytes);
      if (nextKeyFile.crypto.privateKeyPkcs8B64u || nextBinding.keyId !== binding.keyId || nextBinding.identityOwnerReceizId !== binding.identityOwnerReceizId || nextKeyFile.crypto.publicKeyRawB64u !== keyFile.crypto.publicKeyRawB64u) throw new Error('Protected custody does not carry the same identity.');
      if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.');
      transportBinding = nextBinding; transportKeyFile = nextKeyFile; transportPhrase = protectedTransport.phrase; transportBytes = protectedTransport.bytes;
      // This derived encrypted carrier is optional reuse beneath exact original
      // custody. Saving it may not replace a changed identity or block local entry.
      if (!suppliedTransport) await saveProtectedIdentityTransport(binding, protectedTransport).catch(() => {});
      transportReady = true;
    })();
    transportOpening = attempt;
    try { await attempt; } finally { if (transportOpening === attempt) transportOpening = undefined; }
  }
  let client: ReceizClient | null = null, clientApplicationId: string | null = null, expiresAtKai = 0, grantedScopes: readonly string[] = [];
  const clientAccounts = new WeakMap<ReceizClient, { applicationId: string; accountUid: string }>();
  type WalletReadRequest = { prefetched?: { client: ReceizClient; applicationId: string; accountUid: string; response: Promise<unknown> } };
  let presentationUsername = keyFile.owner.username;
  async function openClient(scopes: readonly string[], statement: string, applicationId: string = BANK_APPLICATION_ID, walletRead?: WalletReadRequest) {
    if (!consentApproved || lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    if (!BANK_CARD_APPLICATION_IDS.some(id => id === applicationId)) throw new Error('Unsupported bank registration.');
    await prepareTransport();
    if (lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    if (!client || clientApplicationId !== applicationId || sdk.receizKaiNow().pulse >= expiresAtKai || scopes.some(scope => !grantedScopes.includes(scope))) {
      const targetUnsigned = applicationId === BANK_APPLICATION_ID ? unsigned : sdk.createReceizClient({ applicationId, baseUrl: 'https://receiz.com', fetchImpl: heldFetch });
      // Signed transport metadata comes from the genuine admitted identity. It is not a replacement source.
      const continuing = targetUnsigned.identity.continueReceizId({ schema: 'receiz.device.identity.v1', createdAt: keyFile.issuedAt, updatedAt: keyFile.issuedAt, localUid: keyFile.owner.uid, username: keyFile.owner.username ?? keyFile.keyId, displayName: keyFile.owner.displayName ?? keyFile.owner.username ?? 'Receiz account', deviceName: null, keyFile: transportKeyFile }, { passphrase: transportPhrase }).then(continued => {
        const session = continued.session as { uid?: unknown; username?: unknown } | undefined;
        if (continued.ok !== true || typeof session?.uid !== 'string') throw new Error('Your Receiz account could not be opened. Your local Identity Seal remains available.');
        return { uid: session.uid, username: session.username };
      });
      // Existing key bindings can grant access while continuation is in flight.
      // Either operation can fail first; neither result alone opens the account.
      void continuing.catch(() => {});
      const statementDigest = await sdk.sha256ReceizBytes(new TextEncoder().encode(statement));
      const exchange = async () => {
        const created = sdk.createReceizProofAuthorityChallenge({ applicationId, artifactDigest: transportBinding.artifactSha256, scopes, consentStatementDigest: statementDigest, ttlPulses: 30 });
        const proof = await targetUnsigned.identity.signLoginProof({ keyFile: transportKeyFile, passphrase: transportPhrase, challengeB64Url: created.challengeB64Url });
        return targetUnsigned.identity.exchangeProofAuthority({ artifact: transportBytes, challenge: { ...created.challenge, proof }, applicationId, scopes });
      };
      const grant = await exchange().catch(async cause => {
        const payload = cause instanceof sdk.ReceizHttpError ? cause.payload as { code?: unknown; writes?: unknown } | null : null;
        if (payload?.code !== 'IDENTITY_NOT_BOUND' || payload.writes !== 0) throw cause;
        // First use may need continuation to create the server key binding.
        // Only its explicit zero-write response permits one fresh exchange.
        await continuing;
        if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.');
        return exchange();
      });
      if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.');
      if (grant.applicationId !== applicationId || grant.keyId !== transportBinding.keyId || grant.artifactDigest !== transportBinding.artifactSha256 || scopes.some(scope => !grant.grantedScopes.includes(scope))) throw new Error('Receiz did not grant this bank access to the same identity and scopes.');
      const protectedClient = sdk.createReceizClient({ applicationId, baseUrl: 'https://receiz.com', accessToken: grant.accessToken, fetchImpl: heldFetch });
      const checkingScopes = protectedClient.auth.grantedScopes().then(granted => {
        if (scopes.some(scope => !granted.includes(scope))) throw new Error('Receiz account permission is unavailable.');
        return granted;
      });
      // A requested wallet read enforces its own bearer scope on the server.
      // Keep its result private until the independent scope check succeeds.
      const walletResponse = walletRead ? (knownWallet || typeof protectedClient.request !== 'function' ? protectedClient.connect.wallet() : protectedClient.request('/api/connect/wallet/me?history=1', {method:'GET'}).then<unknown>(response => response && typeof response === 'object' && 'wallet' in response ? response : protectedClient.connect.wallet())) : undefined;
      // The HTTP read can reject before the slower scope check completes.
      if (walletResponse) void walletResponse.catch(() => {});
      const [granted, session] = await Promise.all([checkingScopes, continuing]);
      if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.');
      client = protectedClient; clientApplicationId = applicationId; grantedScopes = granted; expiresAtKai = grant.expiresAtKai; accountUid = session.uid;
      clientAccounts.set(protectedClient, { applicationId, accountUid: session.uid });
      if (walletRead && walletResponse) walletRead.prefetched = { client: protectedClient, applicationId, accountUid: session.uid, response: walletResponse };
      // The confirmed account's profile name is display metadata, never proof ownership.
      if (typeof session.username === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(session.username)) presentationUsername = session.username;
    }
    return client;
  }
  let connectionOpening: { applicationId: string; statement: string; scopes: readonly string[]; promise: Promise<ReceizClient> } | null = null;
  async function connectClient(scopes: readonly string[], statement: string, applicationId: string = BANK_APPLICATION_ID, walletRead?: WalletReadRequest): Promise<ReceizClient> {
    if (!consentApproved || lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    const pendingConnection = connectionOpening;
    if (pendingConnection) {
      if (pendingConnection.applicationId === applicationId && pendingConnection.statement === statement && scopes.every(scope => pendingConnection.scopes.includes(scope))) {
        const connected = await pendingConnection.promise;
        if (lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
        return connected;
      }
      // A different registration or approved scope must get its own checked
      // grant after the existing connection completes, never borrow its token.
      await pendingConnection.promise.catch(() => {});
      return connectClient(scopes, statement, applicationId, walletRead);
    }
    const attempt = { applicationId, statement, scopes: [...scopes], promise: openClient(scopes, statement, applicationId, walletRead) };
    connectionOpening = attempt;
    try {
      const connected = await attempt.promise;
      if (lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
      return connected;
    }
    finally { if (connectionOpening === attempt) connectionOpening = null; }
  }
  function protectedChartFrame(){return knownWallet?.source==='local-note-head'||knownWallet?.walletScope==='native-full'||!!knownWallet&&isWalletQuoteHeld(knownWallet);}
  async function adoptChartResponse(response:unknown, expectedUserId:string) {
    if(protectedChartFrame())return null;
    const raw=(response as {wallet?:{chartSource?:import('./composite-wallet-history').CompositeWalletSource}}|null)?.wallet?.chartSource;
    if(!raw||raw.userId!==expectedUserId)return null;
    let source;
    try{if(raw.transport?.after){
      if(!knownWallet?.chartSource||raw.transport.after!==knownWallet.chartSource.transport?.cursor)return null;
      source=readCompositeWalletSource(mergeCompositeWalletSources(knownWallet.chartSource,raw),expectedUserId);
    }else source=readCompositeWalletSource(raw,expectedUserId);}catch{return null;}
    if(!source)return null;
    source={...source,transport:{after:source.transport?.after??null,cursor:source.transport?.cursor??null,capturedKaiUPulse:source.transport?.capturedKaiUPulse??source.throughKaiUPulse}};
    const {prepareCompositeWallet}=await import('./prepare-composite-wallet');
    const wallet=parseSharedWallet(response,expectedUserId), retained=knownWallet?.historyBasis?.kind==='portfolio-model-v129'?knownWallet:undefined;
    const {projectCompositeWalletAt}=await import('./composite-wallet-history');
    const originalPoint=projectCompositeWalletAt(source,source.throughKaiUPulse);
    if(!(['totalUsdCents','settlementUsdCents','reserveUsdCents','balancePhiMicro']as const).every(field=>originalPoint[field]===wallet[field]))return null;
    const now=String(sdk.receizKaiNow().uPulse);
    if(/^\d{1,30}$/.test(now)&&BigInt(now)>BigInt(source.throughKaiUPulse)){source={...source,throughKaiUPulse:now};const point=projectCompositeWalletAt(source,now);Object.assign(wallet,{totalUsdCents:point.totalUsdCents,settlementUsdCents:point.settlementUsdCents,reserveUsdCents:point.reserveUsdCents,balancePhiMicro:point.balancePhiMicro});}
    const observation=await prepareCompositeWallet({wallet,observedAt:new Date().toISOString()},source,lifetime.signal,retained);noteOpen();
    if(protectedChartFrame())return null;
    return observation ? advanceCompositeWalletObservation(observation,String(sdk.receizKaiNow().uPulse)) ?? observation : null;
  }
  async function prepareCompositeChart() {
    if(protectedChartFrame())return null;
    const startedRevision=walletRevision,current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT),bound=clientAccounts.get(current);
    if(!bound||bound.applicationId!==BANK_APPLICATION_ID)return null;
    const cursor=knownWallet?.chartSource?.transport?.cursor,after=validCursor(cursor)?`&after=${encodeURIComponent(cursor)}`:'';
    const response=await current.request(`/api/connect/wallet/me?history=1${after}`,{method:'GET'});noteOpen();
    if(walletRevision!==startedRevision||hasLocalWalletHead())return null;
    const observation=await adoptChartResponse(response,bound.accountUid);if(!observation||walletRevision!==startedRevision||protectedChartFrame())return null;
    knownWallet=observation;void persistWalletObservation(observation).catch(()=>{});return observation;
  }
  const hasLocalWalletHead = () => knownWallet?.source === 'local-note-head';
  let walletReading: Promise<ReturnType<typeof parseSharedWallet>> | undefined;
  function readWallet(): Promise<ReturnType<typeof parseSharedWallet>> {
    if (lifetime.signal.aborted) return Promise.reject(new Error('This identity was closed. Reopen your account to continue.'));
    if (hasLocalWalletHead() && knownWallet) return Promise.resolve(knownWallet.wallet);
    if (walletReading) return walletReading;
    const attempt = readAndAdoptWallet();
    walletReading = attempt;
    void attempt.finally(() => { if (walletReading === attempt) walletReading = undefined; }).catch(() => {});
    return attempt;
  }
  async function readAndAdoptWallet() {
    const startedRevision = walletRevision;
    const walletRead: WalletReadRequest = {};
    const current = await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT, BANK_APPLICATION_ID, walletRead);
    const bound = clientAccounts.get(current), prefetched = walletRead.prefetched;
    delete walletRead.prefetched;
    const response = await (prefetched && prefetched.client === current && prefetched.applicationId === BANK_APPLICATION_ID && prefetched.accountUid === bound?.accountUid
      ? prefetched.response : current.connect.wallet());
    if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.');
    const wallet = parseSharedWallet(response, bound?.applicationId === BANK_APPLICATION_ID ? bound.accountUid : '');
    // A read that began before a completed local note result cannot overwrite
    // that result when its delayed response finally arrives. A later shared
    // transaction can supersede a read-only projection only with a strictly
    // newer carried coordinate. Prepared local custody always wins.
    const laterSharedCoordinate = knownWallet && wallet.userId === knownWallet.wallet.userId && wallet.kaiUpulse && knownWallet.wallet.kaiUpulse
      && /^\d{1,30}$/.test(wallet.kaiUpulse) && /^\d{1,30}$/.test(knownWallet.wallet.kaiUpulse)
      && BigInt(wallet.kaiUpulse) > BigInt(knownWallet.wallet.kaiUpulse);
    const olderSharedCoordinate = knownWallet && wallet.userId === knownWallet.wallet.userId && wallet.kaiUpulse && knownWallet.wallet.kaiUpulse
      && /^\d{1,30}$/.test(wallet.kaiUpulse) && /^\d{1,30}$/.test(knownWallet.wallet.kaiUpulse)
      && BigInt(wallet.kaiUpulse) < BigInt(knownWallet.wallet.kaiUpulse);
    if ((hasLocalWalletHead() || olderSharedCoordinate || startedRevision !== walletRevision && !laterSharedCoordinate) && knownWallet) return knownWallet.wallet;
    if (!lifetime.signal.aborted) {
      const previous = knownWallet?.source === 'account-genesis' ? {...knownWallet, history: knownWallet.history?.map(point=>({...point,userId:wallet.userId}))} : knownWallet;
      const chart=await adoptChartResponse(response,wallet.userId);noteOpen();
      const projectedPulse=(response as {wallet?:{sync?:{profileProjectionKaiPulse?:unknown}}}).wallet?.sync?.profileProjectionKaiPulse;
      const retained=previous&&typeof projectedPulse==='number'&&Number.isSafeInteger(projectedPulse)&&projectedPulse>=0?reconcileCompositeWalletObservation(previous,wallet,String(BigInt(projectedPulse)*1000000n)):null;
      if(hasLocalWalletHead()||protectedChartFrame()&&knownWallet!==previous||startedRevision!==walletRevision&& !laterSharedCoordinate)return knownWallet!.wallet;
      knownWallet = chart ?? retained ?? {...extendWalletHistory(previous, wallet, new Date().toISOString(), String(sdk.receizKaiNow().uPulse)),...(previous?.chartSource?{chartSource:previous.chartSource}:{})};
      if(previous?.chartSource&&!chart&&!retained)void prepareCompositeChart().catch(()=>{});
      void persistWalletObservation(knownWallet).catch(()=>{});
    }
    return knownWallet?.chartSource||startedRevision!==walletRevision?knownWallet?.wallet??wallet:wallet;
  }
  async function refreshLocalValuation() {
    const before = knownWallet, basis = before?.historyBasis, startedNoteEpoch = noteOperationEpoch;
    if(before?.chartSource&&basis?.kind==='portfolio-model-v129'&&!activeNoteOperations&&!lifetime.signal.aborted){
      const kai=String(sdk.receizKaiNow().uPulse);
      if(BigInt(kai)/1000000n<=BigInt(basis.endKaiUPulse)/1000000n)return null;
      const next=advanceCompositeWalletObservation(before,kai);
      if(next&&knownWallet===before&&startedNoteEpoch===noteOperationEpoch){knownWallet=next;void persistWalletObservation(next).catch(()=>{});return next;}
      return null;
    }
    if (lifetime.signal.aborted || activeNoteOperations || !before || isWalletQuoteHeld(before) || !basis || basis.kind !== undefined || before.walletScope !== 'native-full' || before.wallet.projectionComplete !== true
      || basis.balancePhiMicro !== before.wallet.balancePhiMicro || basis.reserveUsdCents !== before.wallet.reserveUsdCents
      || typeof basis.settlementPhiMicro !== 'string' || !/^\d{1,30}$/.test(basis.endKaiUPulse)) return null;
    // Whole-pulse prices do not change on the intervening one-second checks.
    const kai = String(sdk.receizKaiNow().uPulse);
    if (!/^\d{1,30}$/.test(kai) || BigInt(kai) / 1_000_000n <= BigInt(basis.endKaiUPulse) / 1_000_000n) return null;
    try {
      const { revalueKnownWallet } = await import('./local-wallet-valuation');
      if (lifetime.signal.aborted || activeNoteOperations || startedNoteEpoch !== noteOperationEpoch || knownWallet !== before) return null;
      const next = revalueKnownWallet(before, kai, new Date().toISOString());
      if (!next || lifetime.signal.aborted || activeNoteOperations || startedNoteEpoch !== noteOperationEpoch || knownWallet !== before) return null;
      knownWallet = next;
      // A quote changes no financial revision. A genuine same-head account read
      // may still replace it with its independently authenticated observation.
      void persistWalletObservation(next).catch(() => {});
      return next;
    } catch { return null; }
  }
  function matchesNoteDisplay(source: ReturnType<typeof parseSharedWallet>, display: NonNullable<typeof knownWallet> | null) {
    if (!display || sdk.canonicalizeReceizConstitution(source) === sdk.canonicalizeReceizConstitution(display.wallet)) return true;
    const basis = display.historyBasis;
    if (isWalletQuoteHeld(display) || display.walletScope !== 'native-full' || !hasSettledAccountView(display) || !basis || basis.kind !== undefined
      || display.wallet.projectionComplete !== true || display.history?.at(-1)?.valuation !== 'deterministic-v129'
      || basis.balancePhiMicro !== display.wallet.balancePhiMicro || basis.reserveUsdCents !== display.wallet.reserveUsdCents
      || typeof basis.settlementPhiMicro !== 'string' || !/^(0|[1-9]\d{0,39})$/.test(basis.settlementPhiMicro)
      || BigInt(basis.settlementPhiMicro) > BigInt(display.wallet.balancePhiMicro)
      || !display.wallet.kaiUpulse || !/^\d{1,30}$/.test(display.wallet.kaiUpulse)
      || !sameWalletFinancialState(source, display.wallet)) return false;
    // Only the two display quotes can differ beneath this unchanged native
    // source. Funding still uses the exact protected response, never this match.
    const withoutQuotes = (wallet: ReturnType<typeof parseSharedWallet>) => Object.fromEntries(Object.entries(wallet).filter(([field]) => field !== 'totalUsdCents' && field !== 'settlementUsdCents'));
    return sdk.canonicalizeReceizConstitution(withoutQuotes(source)) === sdk.canonicalizeReceizConstitution(withoutQuotes(display.wallet));
  }
  let noteRuntime: BankNoteRuntime | undefined;
  let preparedNoteRuntime: import('./offline-notes').BankPreparedNoteRuntime | undefined;
  const noteOpen = () => { if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.'); };
  async function offlineNotes(): Promise<BankOfflineNotes> {
    noteOpen(); await prepareTransport(); noteOpen();
    accountUid ??= knownWallet?.wallet.userId ?? null;
    if (!accountUid) await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT);
    if (!noteRuntime) {
      const module = await loadBankNoteRuntime(); await ownedSealer();
      const { createReceizIndexedDbSealStore } = await import('@receiz/sdk/offline');
      const enrollment = await createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer').load();
      if (!enrollment || !sealingResources) throw new Error('Your device sealing key is unavailable.');
      const sealDocument = await module.createBankNativeNoteSealer({ enrollment, resources: sealingResources });
      const request = async (path: string, options: { method: 'GET' | 'POST'; body?: Record<string, unknown> }) => { noteOpen(); const current = await connectClient(BANK_NATIVE_SCOPES, BANK_NATIVE_CONSENT); const response = await current.request(path, options); noteOpen(); return response; };
      noteRuntime = module.createBankOfflineNotesRuntime({ keyId: binding.keyId, uid: accountUid!, localUid: keyFile.owner.uid, origin: location.origin, passphrase: transportPhrase, request, fetchImpl: createBankNoteAttestationFetch({ origin: location.origin, request, signal: lifetime.signal }), sealDocument, read: () => loadOfflineNoteState(binding), retain: (bytes: Uint8Array) => saveOfflineNoteBlob(binding, bytes), restore: (digest: string) => loadOfflineNoteBlob(binding, digest), write: (next: unknown, previous: unknown) => saveOfflineNoteState(binding, next, previous), assertOpen: noteOpen, artwork: bankNoteArtwork });
    }
    if (!preparedNoteRuntime) {
      const module = await loadBankNoteRuntime();
      if (typeof module.createBankPreparedBrowserRuntime === 'function') preparedNoteRuntime = module.createBankPreparedBrowserRuntime({
        keyId:binding.keyId,uid:accountUid!,localUid:keyFile.owner.uid,identity:transportKeyFile,passphrase:transportPhrase,origin:location.origin,
        fetchImpl:createBankNoteAttestationFetch({origin:location.origin,request:async(path,options)=>{noteOpen();const current=await connectClient(BANK_NATIVE_SCOPES,BANK_NATIVE_CONSENT);return current.request(path,options);},signal:lifetime.signal}),
        sealDocument:await module.createBankNativeNoteSealer({enrollment:await (await import('@receiz/sdk/offline')).createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer').load(),resources:sealingResources}),
        read:()=>loadPreparedNoteState(binding),retain:(source:Uint8Array)=>saveOfflineNoteBlob(binding,source),restore:(ref:string)=>loadOfflineNoteBlob(binding,ref),assertOpen:noteOpen,artwork:bankNoteArtwork,
        write:async(next:unknown,previous:unknown,proof?:unknown)=>{
          const observation=proof?await readLocalAccountCheckpoint(proof as ReceizKeyFile,transportKeyFile,accountUid!,knownWallet,new Date().toISOString()):undefined;
          noteOpen();await savePreparedNoteState(binding,next,previous,observation);noteOpen();
          if(observation){knownWallet=observation;walletRevision++;}
        },
      });
    }
    const held = noteRuntime!;
    const lock = async <T,>(operation: () => Promise<T>) => {
      if (!navigator.locks) throw new Error('This browser cannot safely retain Offline Notes. Use a current browser with device custody support.');
      return navigator.locks.request(`receiz-bank-notes:${binding.keyId}`, { signal: lifetime.signal }, async () => {
        noteOpen(); activeNoteOperations++; noteOperationEpoch++;
        // A quote may not replace a captured native-operation baseline. The
        // epoch also discards a quote begun before this operation, even if its
        // async module load finishes after the operation has already ended.
        try { return await operation(); }
        finally { activeNoteOperations--; }
      });
    };
    const prepared = preparedNoteRuntime;
    const local = () => {
      if (!BANK_PREPARED_NOTE_CREDIT_ENABLED || !prepared) throw Error('BANK_LOCAL_CREDIT_QUALIFICATION_REQUIRED');
      return prepared;
    };
    return {
      prepareResources:count=>lock(()=>local().prepareResources(count)),
      savedNotes: async () => [...await held.savedNotes(), ...(prepared ? await prepared.savedNotes() : [])],
      pending: async () => await prepared?.pending() ?? held.pending(),
      create: (amount, rail = 'reserve') => lock(async () => {
        if (BANK_PREPARED_NOTE_CREDIT_ENABLED && prepared) {
          const pending=await prepared.pending();
          if(pending||await prepared.hasPreparedFunding(rail)){
            // Refill only the resource this explicitly reviewed action needs.
            // Existing ready capacity is discovered locally by the native runtime.
            if(!pending)await prepared.prepareResources({notes:1,receivers:0});
            return prepared.createNote(amount,transportKeyFile,rail);
          }
        }
        const pending = await held.pending();
        const displayBaseline = knownWallet;
        let sourceMatchesDisplay = !displayBaseline;
        let source: unknown = transportKeyFile;
        if (!pending) {
          const current = await connectClient(BANK_NATIVE_SCOPES, BANK_NATIVE_CONSENT), response = await current.connect.wallet() as { ok?: boolean; wallet?: Record<string, unknown> };
          const sourceWallet = parseSharedWallet(response, accountUid!);
          sourceMatchesDisplay = matchesNoteDisplay(sourceWallet, displayBaseline);
          const prior = transportKeyFile.portableState?.snapshot as Record<string, unknown> | undefined;
          source = await sdk.appendReceizIdentityPortableState({ keyFile: transportKeyFile, passphrase: transportPhrase, schema: 'receiz.account.state.v3', snapshot: { ...prior, schema: 'receiz.account.state.v3', account: { ...(prior?.account as Record<string, unknown> | undefined), userId: accountUid! }, wallet: { ...(prior?.wallet as Record<string, unknown> | undefined), routeSummary: response.wallet } } });
        }
        const result = await held.createNote(amount, source, rail); noteOpen();
        // Issuance has already verified and retained its financial sources.
        // Reverify its signed account successor for display without making a
        // second online request a condition of saving the completed note.
        try {
          // A resumed attempt uses its original retained account source. It
          // cannot replace a later observation, even with a new display time.
          if (pending || !sourceMatchesDisplay || knownWallet !== displayBaseline) throw Error('BANK_NOTE_ACCOUNT_BASELINE_CHANGED');
          const observation = await readNoteAccountObservation(result.successorAccountProof as ReceizKeyFile, transportKeyFile, accountUid!); noteOpen();
          if (knownWallet !== displayBaseline) throw Error('BANK_NOTE_ACCOUNT_BASELINE_CHANGED');
          // Display when this completed result was observed. The proof's
          // export time may precede a long-running funding/recovery attempt.
          observation.observedAt = new Date().toISOString();
          observation.history = appendWalletPoint(knownWallet?.history ?? [], observation.wallet, observation.observedAt, String(sdk.receizKaiNow().uPulse));
          // The successor is a real observation, but a new financial movement
          // needs its own complete replay before extending chart coverage.
          knownWallet = observation; walletRevision++;
          await persistWalletObservation(observation); noteOpen();
          return result;
        } catch {
          noteOpen();
          const stale = knownWallet;
          if (stale && displayBaseline && (stale === displayBaseline || sameWalletFinancialState(stale.wallet, displayBaseline.wallet)) && (stale.historyBasis || stale.walletScope || !isWalletQuoteHeld(stale))) {
            // The saved note may have spent these holdings. Keep the observed
            // amounts/source, but stop quoting its old units until a complete
            // current source reopens. A genuinely newer financial state stays.
            knownWallet = { ...stale, historyBasis: undefined, walletScope: undefined, quoteHold: createWalletQuoteHold(stale.wallet) };
            await persistWalletObservation(knownWallet).catch(() => {}); noteOpen();
          }
          return { ...result, accountUpdateWarning: 'Your note is saved. Refresh your account to update its displayed balance.' };
        }
      }),
      cancelUnfunded: () => lock(() => held.cancelUnfunded()),
      receivingRequest: () => lock(async () => {
        if (!BANK_PREPARED_NOTE_CREDIT_ENABLED || !prepared) return held.receivingRequest();
        try {return await prepared.receivingRequest();}
        catch(cause){if(!(cause instanceof Error)||cause.message!=='BANK_NOTE_PREPARED_RECEIVER_REQUIRED')throw cause;}
        // A fresh receiver is an explicit user preparation action. Already held
        // capacity above never depends on refilling unrelated note resources.
        await prepared.prepareResources({notes:2,receivers:1});return prepared.receivingRequest();
      }),
      transfer: (noteId, request) => lock(async () => prepared && (await prepared.savedNotes()).some(note=>note.noteId===noteId) ? local().transferNote(noteId,request) : held.transferNote(noteId, request)),
      inspect: image => held.inspectNote(image),
      deposit: image => lock(async () => {
        if (BANK_PREPARED_NOTE_CREDIT_ENABLED && prepared && await prepared.holdsReceivingCustody(image)) return prepared.depositNote(image,transportKeyFile);
        const result = await held.depositNote(image); noteOpen(); void readWallet().catch(() => {}); return result; }),
    };
  }
  async function readPrivateHistory(cursor?: string) {
    const path = privateHistoryPath(cursor), current = await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT);
    const page=parsePrivateHistoryPage(await current.request(path), accountUid!);
    if(!cursor){
      const basis=accountUid+':'+(page.records[0]?.id??'empty')+':'+(page.records[0]?.kaiUpulse??'');
      if(ledgerProofBasis!==basis&&!ledgerProofPending){
        ledgerProofBasis=basis;
        ledgerProofPending=accountProof().then(()=>{}).catch(()=>{if(ledgerProofBasis===basis)ledgerProofBasis=null;}).finally(()=>{ledgerProofPending=undefined;});
      }
    }
    return page;
  }
  let ledgerProofBasis:string|null=null,ledgerProofPending:Promise<void>|undefined;
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
    const checkout = parseCardCheckout(await current.connect.checkout({ amountUsd: exact.amountUsd, currency: 'usd', uiMode: 'embedded', returnUrl, successUrl: returnUrl, referenceId: operation.operationId, description: 'Bankeiz Reserve deposit' }), exact.amountUsdCents);
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
  async function projectOwnedSource(exact:Uint8Array,filename:string){
    const opened=await unsigned.artifacts.verifyAndOpen(new File([new Uint8Array(exact)],filename));
    let payload:unknown;try{payload=JSON.parse(new TextDecoder().decode(opened.verifiedPayload.bytes));}catch{/* Ordinary non-JSON original. */}
    if((payload as {schema?:unknown})?.schema==='receiz.bank.native-asset-holding.v1')return (await import('./native-asset-holding')).openNativeAssetHolding(exact,filename,binding).then(v=>v.deposit);
    return projectHeldDeposit(opened,exact,filename,binding.artifactOwnerReceizId);
  }
  async function holdProof(file: File) {
    if (lifetime.signal.aborted) throw new Error('Open your identity before depositing a proof.');
    if (!file.size || file.size > 32 * 1024 * 1024) throw new Error('Choose an original proof up to 32 MB.');
    const exact = new Uint8Array(await file.arrayBuffer()),deposit=await projectOwnedSource(exact,file.name);
    if (lifetime.signal.aborted) throw new Error('The identity was closed before deposit.');
    await saveDepositSource(binding, exact, file.name, deposit.digest); return deposit;
  }
  let nativeHoldingsReadAt=0,nativeHoldingsRefresh:Promise<void>|null=null,nativeHoldingsDirty=false;
  async function refreshNativeHoldings(){
    const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);if(lifetime.signal.aborted)return;
    const wire=await current.request(`/api/connect/bank/assets/portfolio?applicationId=${BANK_APPLICATION_ID}`,{method:'POST',body:{}}) as {schema?:unknown;sources?:unknown};
    if(!wire||Object.keys(wire).sort().join('|')!=='schema|sources'||wire.schema!=='receiz.bank.native-asset-portfolio.v1'||!Array.isArray(wire.sources)||wire.sources.length>1000)throw Error('BANK_ASSET_PORTFOLIO_INVALID');
    const verified:HeldDeposit[]=[];let bytesTotal=0;
    const {openNativeAssetHolding}=await import('./native-asset-holding');
    for(const value of wire.sources){const p=value as {filename:string;mimeType:string;artifactSha256:string;exactBytesB64u:string};
      if(!p||Object.keys(p).sort().join('|')!=='artifactSha256|exactBytesB64u|filename|mimeType'||p.filename!=='native-asset-holding.receizbundle'||p.mimeType!=='application/vnd.receiz.bundle+json'||typeof p.exactBytesB64u!=='string'||p.exactBytesB64u.length>32*1024*1024)throw Error('BANK_ASSET_PORTFOLIO_INVALID');
      const exact=sdk.receizBase64UrlDecode(p.exactBytesB64u);bytesTotal+=exact.length;if(bytesTotal>32*1024*1024)throw Error('BANK_ASSET_PORTFOLIO_CAPACITY');
      const held=await openNativeAssetHolding(exact,p.filename,binding);if(held.deposit.digest!==p.artifactSha256)throw Error('BANK_ASSET_PORTFOLIO_INVALID');verified.push(held.deposit);
    }
    if(lifetime.signal.aborted)return;
    const prior=await loadDepositSources(binding),known=new Set(await Promise.all(prior.map(s=>sdk.sha256ReceizBytes(s.bytes))));let changed=false;
    for(const source of verified){if(lifetime.signal.aborted)return;if(!known.has(source.digest)){await saveDepositSource(binding,source.bytes,source.filename,source.digest);changed=true;}}
    if(changed&&!lifetime.signal.aborted)dispatchEvent(new Event('bankeiz:asset-sources'));
  }
  function scheduleNativeHoldingsRefresh(force=false){
    if(lifetime.signal.aborted)return;
    if(force){nativeHoldingsReadAt=0;nativeHoldingsDirty=true;}
    if(nativeHoldingsRefresh||!nativeHoldingsDirty&&Date.now()-nativeHoldingsReadAt<=15000)return;
    nativeHoldingsDirty=false;nativeHoldingsReadAt=Date.now();
    nativeHoldingsRefresh=refreshNativeHoldings().catch(()=>{}).finally(()=>{nativeHoldingsRefresh=null;if(nativeHoldingsDirty)scheduleNativeHoldingsRefresh();});
  }
  async function listDeposits() {
    // Reopen held originals immediately. Current source delivery enriches the
    // same view asynchronously; a network refusal cannot erase local custody.
    scheduleNativeHoldingsRefresh();
    const sources = await loadDepositSources(binding), result: HeldDeposit[] = [];
    for (const source of sources) {
      if (source.role === 'account-coordination' || source.role === 'account-genesis') continue;
      try {result.push(await projectOwnedSource(source.bytes,source.filename));} catch { /* Only actual reopened proof sources appear. */ }
    }
    return (await import('./native-asset-holding')).selectNativeAssetHoldings(result);
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
  const legacyExecutionRecovery = createBankExecutionRecovery({
    store: deviceBankExecutionStore(binding),
    connect: applicationId => connectClient(BANK_RECOVERY_SCOPES, BANK_RECOVERY_CONSENT, applicationId),
    assertOpen: () => { if (lifetime.signal.aborted) throw new Error('BANK_EXECUTION_IDENTITY_CLOSED'); },
    lock: async operation => {
      if (!navigator.locks) throw new Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');
      return navigator.locks.request(`receiz-bank-execution:${binding.artifactSha256}`, { signal: lifetime.signal }, operation);
    },
  });
  function hasPendingNative(value: unknown, family: 'payments' | 'assets'): boolean {
    if (value === null || value === undefined) return false;
    const state = value as { schema?: unknown; current?: { state?: unknown }; history?: { state?: unknown }[] };
    if (state.schema !== `bank.native-${family}.v1` || !state.current || !Array.isArray(state.history) || state.history.length > 1000
      || [...state.history, state.current].some(checkpoint => !checkpoint || !['prepared', 'unknown', 'committed', 'zero-write'].includes(String(checkpoint.state)))) throw Error('BANK_EXECUTION_CHECKPOINT_INVALID');
    return [...state.history, state.current].some(checkpoint => checkpoint.state === 'prepared' || checkpoint.state === 'unknown');
  }
  async function assertNoOtherPending() {
    noteOpen();
    const legacy = await deviceBankExecutionStore(binding).load();
    if (legacy && ['prepared', 'unknown'].includes(legacy.state)) throw Error('BANK_EXECUTION_PENDING');
    const [payments, assets] = await Promise.all([loadNativePaymentState(binding), loadNativeAssetState(binding)]);
    noteOpen();
    if (hasPendingNative(payments, 'payments') || hasPendingNative(assets, 'assets')) throw Error('BANK_EXECUTION_PENDING');
  }
  let nativePaymentsPromise: Promise<ReturnType<typeof import('./native-payment').createNativePayments>> | undefined;
  const nativePayments = () => nativePaymentsPromise ??= import('./native-payment').then(({createNativePayments})=>createNativePayments({
    ownerReceizId:binding.artifactOwnerReceizId,keyId:binding.keyId,
    assertNoOtherPending,
    assertOpen:()=>{if(lifetime.signal.aborted)throw Error('BANK_EXECUTION_IDENTITY_CLOSED');},
    store:{read:()=>loadNativePaymentState(binding),write:(value,expected)=>saveNativePaymentState(binding,value,expected)},
    sign:async challengeB64Url=>{await prepareTransport();return unsigned.identity.signLoginProof({keyFile:transportKeyFile,passphrase:transportPhrase,challengeB64Url});},
    request:async(path,body,readOnly)=>{const applicationId=readOnly?new URL(path,'https://receiz.com').searchParams.get('applicationId'):BANK_APPLICATION_ID;if(!isBankNativeApplicationId(applicationId))throw Error('BANK_PAYMENT_APPLICATION_MISMATCH');const connected=await connectClient(readOnly?BANK_RECOVERY_SCOPES:BANK_NATIVE_SCOPES,readOnly?BANK_RECOVERY_CONSENT:BANK_NATIVE_CONSENT,applicationId);if(lifetime.signal.aborted)throw Error('BANK_EXECUTION_IDENTITY_CLOSED');return connected.request(path,{method:'POST',body});},
    lock:async operation=>{if(!navigator.locks)throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');return navigator.locks.request(`receiz-bank-execution:${binding.artifactSha256}`,{signal:lifetime.signal},operation);},
  })).catch(error=>{nativePaymentsPromise=undefined;throw error;});
  let nativeAssetsPromise: Promise<ReturnType<typeof import('./native-asset').createNativeAssets>> | undefined;
  const nativeAssets = () => nativeAssetsPromise ??= import('./native-asset').then(({createNativeAssets})=>createNativeAssets({
    onCommitted:()=>scheduleNativeHoldingsRefresh(true),
    ownerReceizId:binding.artifactOwnerReceizId,keyId:binding.keyId,
    assertNoOtherPending,
    assertOpen:()=>{if(lifetime.signal.aborted)throw Error('BANK_EXECUTION_IDENTITY_CLOSED');},
    store:{read:()=>loadNativeAssetState(binding),write:(value,expected)=>saveNativeAssetState(binding,value,expected)},
    sign:async challengeB64Url=>{await prepareTransport();noteOpen();return unsigned.identity.signLoginProof({keyFile:transportKeyFile,passphrase:transportPhrase,challengeB64Url});},
    request:async(path,body,readOnly)=>{const applicationId=readOnly?new URL(path,'https://receiz.com').searchParams.get('applicationId'):BANK_APPLICATION_ID;if(!isBankNativeApplicationId(applicationId))throw Error('BANK_ASSET_APPLICATION_MISMATCH');const connected=await connectClient(readOnly?[...BANK_READ_SCOPES,...BANK_RECOVERY_SCOPES]:BANK_NATIVE_SCOPES,readOnly?BANK_RECOVERY_CONSENT:BANK_NATIVE_CONSENT,applicationId);noteOpen();return connected.request(path,{method:'POST',body});},
    lock:async operation=>{if(!navigator.locks)throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');return navigator.locks.request(`receiz-bank-execution:${binding.artifactSha256}`,{signal:lifetime.signal},operation);},
  })).catch(error=>{nativeAssetsPromise=undefined;throw error;});
  const selectedRecovery=async()=>{
    noteOpen();
    const [legacy,payments,assets]=await Promise.all([deviceBankExecutionStore(binding).load(),loadNativePaymentState(binding),loadNativeAssetState(binding)]);
    noteOpen();
    // Pending custody must remain reachable even if a different family's old
    // terminal receipt is unavailable or cannot be reopened.
    if(legacy&&['prepared','unknown'].includes(legacy.state))return legacyExecutionRecovery;
    const pending=(value:unknown)=>['prepared','unknown'].includes(String((value as {current?:{state?:unknown}}|null)?.current?.state));
    if(pending(payments))return(await nativePayments()).recovery;
    if(pending(assets))return(await nativeAssets()).recovery;
    if(hasPendingNative(payments,'payments'))return(await nativePayments()).recovery;
    if(hasPendingNative(assets,'assets'))return(await nativeAssets()).recovery;
    if(assets)return(await nativeAssets()).recovery;
    if(payments)return(await nativePayments()).recovery;
    return legacyExecutionRecovery;
  };
  const executionRecovery: ReturnType<typeof createBankExecutionRecovery>={status:async()=> (await selectedRecovery()).status(),resolve:async approved=>(await selectedRecovery()).resolve(approved),exportRecovery:async()=>(await selectedRecovery()).exportRecovery()};
  let proofLibraryPromise: Promise<import('./proof-library').ProofLibrary> | undefined;
  const proofLibrary = () => proofLibraryPromise ??= import('./proof-library').then(({ createProofLibrary }) => createProofLibrary({
    binding, assertOpen: () => { if (lifetime.signal.aborted) throw Error('PROOF_IDENTITY_CLOSED'); },
    readOwned: async () => (await loadDepositSources(binding, { requireComplete: true, originalsOnly: true })).map(source => ({ kind: 'owned-source' as const, filename: source.filename, bytes: source.bytes })),
    readArchive: () => loadProofArchive(binding), readRecoveries: () => loadExportableRecoveries(binding),
    readNotes: async () => (await import('./note-proof-portability')).readRetainedNoteProofs({ keyId: binding.keyId, read: () => loadOfflineNoteState(binding), restore: digest => loadOfflineNoteBlob(binding, digest) }),
    commit: sources => retainProofBatch(binding, sources),
  })).catch(cause => { proofLibraryPromise = undefined; throw cause; });
  const nativeSessions = new WeakMap<ReceizClient, Map<string, ReturnType<typeof createBankNativeSession>>>();
  async function connectNativeContext(approved: boolean, rails: readonly ('reserve' | 'settlement')[] = []) {
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
      const session = await sessions.connect(source, rails);
      return { client: current, session, source };
    } catch (error) { throw error instanceof BankConnectionError ? error : new BankConnectionError(stage, error); }
    finally { nativeConnectionBusy = false; }
  }
  async function connectNativeAccount(approved: boolean) {
    const { source, session } = await connectNativeContext(approved);
    return { subjectId: source.subjectId, sourceDigest: source.artifactDigest, sessionExpiresKaiUPulse: session.expiresAtKaiUPulse, readyToTransact: false as const };
  }
  let operationsPromise: Promise<import('./bank-operations').BankOperations> | undefined;
  const restoreCommittedBankSources = createBankCommittedSourceRestoration({
    store: deviceBankExecutionStore(binding), ownerReceizId: binding.artifactOwnerReceizId,
    assertOpen: () => { if (lifetime.signal.aborted) throw Error('BANK_EXECUTION_IDENTITY_CLOSED'); },
    openSubject: file => openBankSubjectSource(file, ownerAdmission),
    saveSource: (exact, filename, digest, role) => saveDepositSource(binding, exact, filename, digest, role),
  });
  const operations = () => operationsPromise ??= import('./bank-operations').then(async ({ createBankOperations }) => createBankOperations({
    payments:await nativePayments(),assets:await nativeAssets(),
    ownerReceizId: binding.artifactOwnerReceizId, store: deviceBankExecutionStore(binding),
    assertOpen: () => { if (lifetime.signal.aborted) throw Error('BANK_EXECUTION_IDENTITY_CLOSED'); },
    context: async rails => {
      await assertNoOtherPending();
      await restoreCommittedBankSources();
      const report = await nativeReadiness();
      if (report.missingScopes.length) throw Error('BANK_OPERATION_ACCESS_REQUIRED');
      if (report.unavailableOperations.length) throw Error('BANK_OPERATION_RUNTIME_UNAVAILABLE');
      return connectNativeContext(true, rails);
    },
    retainCommitted: restoreCommittedBankSources,
    sources: async operation => {
      const digests = 'assetDigest' in operation ? [operation.assetDigest] : operation.kind === 'fund-asset' && operation.definition.linkedProofDigest ? [operation.definition.linkedProofDigest] : [];
      if (!digests.length) return [];
      const saved = await loadDepositSources(binding, { requireComplete: true, originalsOnly: true, digests }), sources: import('@receiz/sdk').ReceizPortableSealedArtifactV124[] = [];
      for (const source of saved) {
        let identitySource = false;
        try { await sdk.readReceizIdentityArtifact(source.bytes); identitySource = true; } catch { /* Only non-identity proof originals may be supplied here. */ }
        if (identitySource) throw Error('BANK_OPERATION_IDENTITY_SOURCE_FORBIDDEN');
        const opened = await unsigned.artifacts.verifyAndOpen(new File([new Uint8Array(source.bytes)], source.filename));
        if (opened.sealedArtifact.kind !== 'receiz.native-record-seal') throw Error('BANK_OPERATION_CURRENT_SOURCE_REQUIRED');
        if (opened.sealedArtifact.continuity.ownerReceizId !== binding.artifactOwnerReceizId || !digests.includes(opened.sealedArtifact.artifactSha256)) throw Error('BANK_OPERATION_SOURCE_MISMATCH');
        sources.push(await sdk.transportReceizSealedArtifactV124(opened.sealedArtifact));
      }
      return sources;
    },
    lock: async operation => {
      if (!navigator.locks) throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');
      return await navigator.locks.request(`receiz-bank-execution:${binding.artifactSha256}`, { signal: lifetime.signal }, operation);
    },
  })).catch(error => { operationsPromise = undefined; throw error; });
  const assertPublicAccountSource=()=>{if(hasLocalWalletHead())throw Error('ACCOUNT_PROOF_LOCAL_CUSTODY_SOURCE_REQUIRED');};
  async function accountProof() {
    assertPublicAccountSource();
    const module = await import('./account-proof');
    const assertOpen=()=>{if(lifetime.signal.aborted)throw Error('ACCOUNT_PROOF_IDENTITY_CLOSED');};
    const before=knownWallet,revision=walletRevision;
    const proof=await module.readAccountProof({owner:binding,assertOpen,request:async path=>{
      assertPublicAccountSource();
      const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);assertOpen();
      assertPublicAccountSource();
      return current.request(path,{method:'GET'});
    }});
    assertPublicAccountSource();
    if(['bankeiz.public-account-statement.v2','bankeiz.public-account-statement.v3','bankeiz.public-account-statement.v4'].includes(proof.statement.schema)&&accountUid){
      try{
        const retained=await localLedger.retain(proof,accountUid);assertOpen();
        if(retained.proof.sourceDigest===proof.sourceDigest&&walletRevision===revision&&knownWallet===before&&canAdoptAccountLedgerObservation(before,retained.observation)){
          const observation=mergeAccountLedgerObservation(before,retained.observation);
          if(observation!==before){
            // Chart enrichment preserves the wallet and source head. Repaint it
            // without invalidating a pending honest read at that same head.
            const headChanged=observation.wallet!==before?.wallet||observation.source!==before?.source||observation.localHeadDigest!==before?.localHeadDigest;
            knownWallet=observation;if(headChanged)walletRevision++;void persistWalletObservation(observation).catch(()=>{});assertOpen();
            if(typeof dispatchEvent==='function')dispatchEvent(new Event('bankeiz:account-observation'));
          }
        }
      }catch(cause){
        ledgerProofBasis=null;
        if(cause instanceof Error&&/ACCOUNT_PROOF_CONTINUITY_MISMATCH|ACCOUNT_LEDGER_ACCOUNT_MISMATCH|ACCOUNT_LEDGER_OWNER_MISMATCH/.test(cause.message))throw cause;
        // Failure to retain an optional copy cannot erase an existing balance
        // or change the independently verified original returned to its reader.
      }
    }
    assertPublicAccountSource();return proof;
  }
  async function retainAccountArtifactSource(file:File) {
    const {retainAccountArtifactSource:retain}=await import('./account-proof-sources');
    return retain({file,assertOpen:()=>{if(lifetime.signal.aborted)throw Error('ACCOUNT_PROOF_IDENTITY_CLOSED');},request:async(path,body)=>{
      const current=await connectClient([...BANK_READ_SCOPES,'receiz:domains.write'],'Allow the original artifact archive I choose to be retained privately for account-proof verification. This does not publish the archive, transfer value, or export my signing key.');
      if(lifetime.signal.aborted)throw Error('ACCOUNT_PROOF_IDENTITY_CLOSED');return current.request(path,{method:'POST',body});
    }});
  }
  async function accountProofSharing() {
    const { createAccountProofSharing } = await import('./account-proof-sharing');
    const make = (applicationId: string, previous?: import('./account-proof-sharing').AccountProofSharing): import('./account-proof-sharing').AccountProofSharing => createAccountProofSharing({ applicationId, previous, keyId: binding.keyId, receizId: binding.artifactOwnerReceizId, assertOpen: () => { if (lifetime.signal.aborted) throw Error('ACCOUNT_PROOF_IDENTITY_CLOSED'); },
      signConsent: async challengeB64Url => { await prepareTransport(); return unsigned.identity.signLoginProof({ keyFile: transportKeyFile, passphrase: transportPhrase, challengeB64Url }); },
      request: async (path, method, body) => {
        if(method==='POST'&&body?.action==='publish')assertPublicAccountSource();
        const current = method === 'GET' ? await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT, applicationId) : await connectClient([...BANK_READ_SCOPES, 'receiz:domains.write'], 'Allow Bankeiz to apply the public account-proof sharing choice I explicitly review: publish my verified balances and complete transaction statement, optionally keep future proofs publicly updated, or turn off live updates. This does not authorize a payment or export my signing key.', applicationId);
        if(method==='POST'&&body?.action==='publish')assertPublicAccountSource();
        return current.request(path, { method, ...(body ? { body } : {}) });
      } });
    const api=make(BANK_APPLICATION_ID, make(BANK_PREVIOUS_NATIVE_APPLICATION_ID));
    return {...api,async publish(...args:Parameters<typeof api.publish>){assertPublicAccountSource();const result=await api.publish(...args);if(hasLocalWalletHead())throw Error('ACCOUNT_PROOF_LOCAL_CUSTODY_PUBLICATION_UNCONFIRMED');return result;}};
  }
  let preparingView: Promise<import('./wallet-observation').WalletObservation> | undefined;
  async function settleAccountView() {
    noteOpen();
    await refreshLocalValuation(); noteOpen();
    // The admitted carrier or exact retained frame already contains the whole
    // chart. Optional source enrichment must not hold its first paint open.
    if (knownWallet && hasSettledAccountView(knownWallet)) return knownWallet;
    // Older caches contain a balance or login observations, not full history.
    // Finish the retained-source path before deciding a network read is needed.
    await restoringLedger; noteOpen();
    if (knownWallet && hasSettledAccountView(knownWallet)) return knownWallet;
    // Older aggregate wallets and held Note successors are valid sources for
    // their current amounts, but do not imply a complete native cash timeline.
    // Preserve access and genuine observations without inventing that history.
    if (knownWallet) {
      // A balance-only cache must not bypass the full history source on every
      // subsequent opening. Reuse its independently verified retained result
      // before admitting this first frame. Local custody never uses a remote
      // shared checkpoint as a substitute for its successor.
      if (!hasLocalWalletHead()) {
        try { const chart=await prepareCompositeChart();if(chart)return chart; } catch {noteOpen();}
        try { await accountProof(); noteOpen(); } catch { noteOpen(); }
      }
      if (!knownWallet.history?.length) knownWallet = {...knownWallet, history: appendWalletPoint([], knownWallet.wallet, knownWallet.observedAt, knownWallet.wallet.kaiUpulse)};
      return knownWallet;
    }
    const walletResult = await readWallet().then(value=>({status:'fulfilled' as const,value}),reason=>({status:'rejected' as const,reason}));noteOpen();
    if(knownWallet&&hasSettledAccountView(knownWallet))return knownWallet;
    const proofResult = await accountProof().then(value=>({status:'fulfilled' as const,value}),reason=>({status:'rejected' as const,reason}));noteOpen();
    // accountProof already retained and projected its source. Reuse that frame
    // instead of running the same historical valuation pass a second time.
    if (knownWallet && hasSettledAccountView(knownWallet)) return knownWallet;
    if (proofResult.status === 'rejected') { if (knownWallet) return knownWallet; if (walletResult.status === 'rejected') throw new AggregateError([walletResult.reason, proofResult.reason], 'Receiz account sources are temporarily unavailable.'); throw proofResult.reason; }
    const proof = proofResult.value;
    const {accountLedgerObservation} = await import('./account-ledger');
    const observation = await accountLedgerObservation(proof, accountUid!, new Date().toISOString()); noteOpen();
    if (canAdoptAccountLedgerObservation(knownWallet, observation)) {
      knownWallet = mergeAccountLedgerObservation(knownWallet, observation);
      void persistWalletObservation(knownWallet).catch(()=>{});
    }
    if (!knownWallet || !hasSettledAccountView(knownWallet)) throw Error('Your complete account history could not be opened. Your Identity Seal is unchanged. Try again when its source is available.');
    return knownWallet;
  }
  const prepareAccountView = () => {
    if (preparingView) return preparingView;
    const attempt = settleAccountView().catch(cause => { if (knownWallet) { if (!knownWallet.history?.length) knownWallet={...knownWallet,history:appendWalletPoint([],knownWallet.wallet,knownWallet.observedAt,knownWallet.wallet.kaiUpulse)}; return knownWallet; } throw new Error('Your account balance source is temporarily unavailable. Your Identity Seal is unchanged. Try again when its source is available.', {cause}); }); preparingView = attempt;
    void attempt.finally(()=>{if(preparingView===attempt)preparingView=undefined;}).catch(()=>{});
    return attempt;
  };
  async function persistDeviceCustody() {
    await saveDeviceIdentity(bytes, filename, phrase, consentApproved, protectedTransport);
    // Seed display retention through the same revision-checked queue as later
    // reads. A delayed import save cannot overwrite a newer account frame.
    if (knownWallet) void persistWalletObservation(knownWallet).catch(() => {});
  }
  return { prepareAccountView, refreshLocalValuation, operations, accountProof, retainAccountArtifactSource, accountProofSharing, proofLibrary, executionRecovery: () => executionRecovery, offlineNotes, binding, needsPhrase: identityNeedsPhrase(keyFile), knownWallet: () => knownWallet, username: keyFile.owner.username, accountUsername: () => presentationUsername, localHistory, readWallet, readPrivateHistory, beginCardDeposit, checkCardDeposit, pendingCardDeposit, pendingCardDeposits, startAssetIntake, holdProof, listDeposits, createAsset, nativeReadiness, connectNativeAccount, persistDeviceCustody, dispose: () => { lifetime.abort(); client = null; }, backup: () => ({ bytes: new Uint8Array(bytes), filename, phrase }) };
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
  const initializedKey = await initializeFreshBankAccount(protectedKey, protectionSecret);
  const portableKey = await unprotectIdentityKeyFile(initializedKey, protectionSecret);
  const owned = createReceizOfflineSealer({ ownerIdentityAdmission: admission, store: createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'), resources: { wasm: resources[0], zkey: resources[1] }, fetch: nativeFetch });
  const sealed = await owned.seal({ bytes: new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(portableKey)), filename: 'identity.receizkey', mimeType: 'application/json' });
  const identity = await openCanonicalIdentity(sealed.artifactBytes, '', sealed.filename, true, { bytes: new Uint8Array(protectedSeal.artifactBytes), phrase: protectionSecret });
  if (identity.needsPhrase || identity.binding.keyId !== protectedBinding.keyId || identity.binding.artifactOwnerReceizId !== protectedBinding.artifactOwnerReceizId) { identity.dispose(); throw new Error('The self-contained Identity Seal did not preserve its original identity.'); }
  const genesis = identity.knownWallet();
  if (!genesis || genesis.source !== 'account-genesis') { identity.dispose(); throw new Error('The signed account genesis could not be opened.'); }
  await identity.persistDeviceCustody();
  return identity;
}
export async function importNativeIdentity(file: File, phrase: string, consentApproved: boolean): Promise<OpenIdentity> {
  if (!consentApproved) throw new Error('Approve account read access before importing your ID.');
  if (file.size > 32 * 1024 * 1024) throw new Error('Identity Seal exceeds the supported device capacity.');
  const bytes = new Uint8Array(await file.arrayBuffer()), identity = await openCanonicalIdentity(bytes, phrase, file.name, true);
  await identity.persistDeviceCustody(); return identity;
}
export async function restoreNativeIdentity(): Promise<OpenIdentity | null> { const saved = await loadDeviceIdentity(); return saved && saved.readConsent ? openCanonicalIdentity(saved.bytes, saved.phrase, saved.filename, true, saved.protectedTransport) : null; }
export { forgetDeviceIdentity, loadWalletObservation, saveWalletObservation, restoreKnownWalletObservation } from './identity-vault';
