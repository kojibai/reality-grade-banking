import {keepsWalletCashComposition} from './wallet-cash-basis';
import {currentWalletObservation,advanceCurrentWalletObservation} from './current-wallet-valuation';
import {createNativeMessaging} from './native-messaging';
import {createNativeTwin} from './native-twin';
import {isPeopleSearchQuery} from './people-search.js';
import {permittedTwinConversationRead} from './twin-conversations';
import {withDeviceIdentityEntry} from './device-identity-entry';
import {buildCheckoutReturn} from './checkout-request';
import {loadHostedCheckoutState,saveHostedCheckoutState,loadMerchantCounterState,saveMerchantCounterState} from './identity-vault';
import {BANK_MESSAGING_SCOPES,BANK_MESSAGING_CONSENT,BANK_ORGANIZER_SCOPES,BANK_ORGANIZER_CONSENT} from './config';
import {openMessagingRetention} from './messaging-retention';
import {loadMessagingConsent,saveMessagingConsent,loadMessagingDisplay,saveMessagingDisplay} from './identity-vault';
import {permittedNativeChatPath} from './native-chat-paths';
import {loadReceivedProofState,saveReceivedProofState} from './identity-vault';
import {loadMarketTradeState,saveMarketTradeState} from './identity-vault';
import {BANK_MARKET_READ_SCOPES,BANK_MARKET_TRADE_SCOPES,BANK_MARKET_CONSENT,BANK_MARKET_READ_CONSENT} from './config';
import {loadWalletSendState,saveWalletSendState,assertWalletSendCustody} from './identity-vault';
import {loadTwinCreditPurchaseState,saveTwinCreditPurchaseState} from './identity-vault';
import {createTwinCreditPurchaseCoordination,readTwinCreditPurchaseIntent,type RecoveredTwinCreditPurchase} from './twin-credit-purchase-intent';
import {BANK_WALLET_SEND_SCOPES,BANK_WALLET_SEND_CONSENT} from './config';
import { loadNativePaymentState, saveNativePaymentState, loadNativeAssetState, saveNativeAssetState, loadOfflineNoteState, saveOfflineNoteState, loadPreparedNoteState, savePreparedNoteState, saveOfflineNoteBlob, loadOfflineNoteBlob } from './identity-vault';
import { createBankNoteAttestationFetch } from './note-attestation-transport';
import { loadBankNoteRuntime, bankNoteArtwork, type BankOfflineNotes, type BankNoteRuntime } from './offline-notes';
import type { ReceizClient, ReceizIdentityPublicBinding, ReceizKeyFile, ReceizIdentityAccountProjection } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID, BANK_PREVIOUS_NATIVE_APPLICATION_ID, isBankNativeApplicationId, BANK_CARD_APPLICATION_IDS, BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_CARD_CONSENT, BANK_CARD_SCOPES, BANK_NATIVE_CONSENT, BANK_NATIVE_SCOPES, BANK_RECOVERY_SCOPES, BANK_RECOVERY_CONSENT } from './config';
import { cancelCardCheckout, parseCardCheckout, parseCardDepositStatus, parseDepositDollars, readCardOperation, type CardCheckout, type CardDepositStatus } from './card-deposit';
import { nativeFetch, nativeRequestTimeout } from './native-transport';
import { loadDeviceIdentity, saveDeviceIdentity, saveProtectedIdentityTransport, loadAccountLedgerState, saveAccountLedgerState, loadWalletObservation, saveWalletObservation, loadDepositSources, saveDepositSource, loadCardOperation, loadCardOperations, saveCardOperation, loadBankSessionIntent, saveBankSessionIntent, loadProofArchive, loadExportableRecoveries, retainProofBatch } from './identity-vault';
import { projectHeldDeposit, validateAssetIntake, type AssetIntake, type HeldDeposit } from './deposit-source';
import { protectIdentityKeyFile, unprotectIdentityKeyFile } from './identity-protection';
import type { ProtectedIdentityTransport } from './identity-vault';
import { identityNeedsPhrase } from './identity-lock';
import { parseSharedWallet, projectUnchangedWalletPhiSplit } from './shared-wallet';
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
import {canAdvanceCompositeWalletSource,readCompositeWalletSource,compositeWalletEndpointMatches,advanceCompositeWalletObservation,mergeCompositeWalletSources,reconcileCompositeWalletObservation,validCursor} from './composite-wallet-source';
import { hasSettledAccountView } from './account-view';
import {createLocalNoteInventory,createLocalNoteDepositQueue} from './note-local-inventory';
import {loadReceivedNoteDepositState,saveReceivedNoteDepositState} from './identity-vault';
import {atNoteStage} from './note-stage';
import {createReceivingUsernamePreparation,publicAccountUsername} from './receiving-username';
import {atIdentityCreationStage} from './identity-creation-stage';
import {certificateTimeSafeStore,certificateTimeSafeFetch} from './device-signer-time';
import type {AssetComposerDraft} from './asset-composer';
import type {AssetMomentDraft} from './asset-moment';
import {loadConnectedNoteState,saveConnectedNoteState} from './identity-vault';
import {createConnectedNoteApplication,openConnectedAccountNote,prepareConnectedAccountNoteClaim,submitConnectedAccountNoteClaim,isConnectedNote,readConnectedNote} from './connected-note-application';
import {createNoteImageExporter} from './note-image-seal';
import {recoverConnectedNoteDeposit,validateNativeNoteDeposit,holdsLegacyNoteReceivingCustody} from './native-note-deposit';
import {BANK_CONNECTED_NOTE_ISSUANCE_ENABLED} from './config';
import {ownerTwinAccountAccess} from './twin-access';
import {publishOpenPortfolio} from './market-portfolio-presentation';
import {createMarketPortfolio,parseMarketPortfolio,readSealedMarketPortfolio,type MarketPortfolio,type MarketPortfolioClient} from './market-portfolio';
import {loadMarketPortfolioState,saveMarketPortfolioState} from './identity-vault';

export interface OpenIdentity {
  meetingArchive?:()=>Promise<import('./meeting-capture').MeetingArchive>;
  profileInsights?:()=>Promise<import('./profile-insights').ProfileInsightsSource>;
  originalsQualification?:()=>Promise<import('../qualification/source').QualifiedProgress>;
  knownOriginalsQualification?:()=>import('../qualification/source').QualifiedProgress|null;
  shareCertificates?:()=>Promise<import('./share-certificates').ShareCertificates>;
  vaults?:()=>Promise<import('./vault/manager').VaultManager>;
  hostedCheckout?:()=>Promise<import('./hosted-checkout').HostedCheckoutController>;
  paidBooking?:(input:{username:string;options?:URLSearchParams})=>Promise<import('./paid-booking').PaidBookingController>;
  merchantCounter?:()=>Promise<import('./merchant-counter').MerchantCounterController>;
  moneyTools?:()=>Promise<import('./money-workspace').MoneyWorkspace & import('./money-conversation-retention').MoneyConversationRetention & {downloadSource(digest:string):Promise<File>}>;
  businessSetup?:()=>Promise<import('./business-chat').BusinessChat>;
  twinWorkspace?:()=>Promise<import('./twin-workspace').TwinWorkspace>;
  knownTwinWorkspace?:()=>import('./twin-workspace').TwinWorkspace|null;
  profile?:()=>Promise<import('./profile-edit').ProfileEditor>;
  knownProfile?:()=>import('./profile-edit').OwnerProfilePresentation|null;
  prepareAccountView: (options?:{resume?:boolean}) => Promise<import('./wallet-observation').WalletObservation>;
  refreshLocalValuation?: () => Promise<import('./wallet-observation').WalletObservation | null>;
  walletReceivingAddress?: () => string | null;
  prepareReceivingUsername?: () => Promise<string>;
  marketTrade?: () => Promise<import('./market-trade').MarketTrade>;
  marketPortfolio?: () => Promise<MarketPortfolioClient>;
  knownMarketPortfolio?: () => MarketPortfolio|null;
  walletSend?: () => Promise<import('./wallet-send').WalletSend>;
  operations?: () => Promise<import('./bank-operations').BankOperations>;
  accountProof?: () => Promise<import('./account-proof').VerifiedAccountProof>;
  retainAccountArtifactSource?: (file:File) => Promise<string>;
  accountProofSharing?: () => Promise<import('./account-proof-sharing').AccountProofSharing>;
  proofLibrary?: () => Promise<import('./proof-library').ProofLibrary>;
  executionRecovery?: () => BankExecutionRecovery;
  knownOrganizerDisplay?:()=>import('./organizer-types').OrganizerDisplay|null;
  knownOrganizer?:()=>import('./native-organizer').NativeOrganizer|null;
  knownMessagingDisplay?: () => import('./messaging-retention').MessagingDisplay|null;
  knownTwinAccess?: () => boolean|null;
  retainTwinAccessQuestions?: (questions:readonly import('./messaging-retention').TwinAccessQuestion[]) => void;
  upgradeTwin?: (input:import('./twin-upgrade').TwinUpgradeInput) => Promise<import('./twin-upgrade').TwinUpgradeResult>;
  recoverTwinCreditPurchase?:()=>Promise<RecoveredTwinCreditPurchase|null>;
  messaging?: (approved?:boolean) => Promise<import('./native-messaging').NativeMessaging>;
  receizTools?:()=>Promise<import('./native-receiz-tools').NativeReceizTools>;
  organizer?: () => Promise<import('./native-organizer').NativeOrganizer>;
  offlineNotes?: () => Promise<BankOfflineNotes>;
  knownReceivedNotes?: () => readonly import('./offline-notes').BankNoteDepositResult[];
  cancelUnsentNotes?: () => Promise<void>;
  binding: ReceizIdentityPublicBinding; needsPhrase: boolean; knownWallet: () => import('./wallet-observation').WalletObservation | null;
  username: string | null; accountUsername?: () => string | null; localHistory: ReceizIdentityAccountProjection; readWallet: () => Promise<ReturnType<typeof parseSharedWallet>>;
  beginCardDeposit: (amount: string, approved: boolean) => Promise<CardCheckout>; checkCardDeposit: (checkout: CardCheckout) => Promise<CardDepositStatus>;
  cancelCardDeposit?: (checkout:CardCheckout) => Promise<CardDepositStatus>;
  pendingCardDeposit: () => Promise<CardCheckout | null>;
  pendingCardDeposits?: () => Promise<CardCheckout[]>;
  startAssetIntake: (asset: AssetIntake, attachment?: File) => Promise<HeldDeposit>; holdProof: (file: File) => Promise<HeldDeposit>;
  listDeposits: () => Promise<HeldDeposit[]>;
  receivedProof?:()=>Promise<import('./received-proof').ReceivedProof>;
  createAsset: (definition: AssetDefinition, moment?: AssetMomentDraft) => Promise<HeldDeposit>;
  backedAssetPublication:()=>Promise<import('./backed-asset-client').BackedAssetClient>;
  publishAssetToMarket:(source:HeldDeposit)=>Promise<HeldDeposit>;
  createComposedAsset: (definition:AssetDefinition,draft:AssetComposerDraft)=>Promise<HeldDeposit>;
  pendingAssetPublication?: () => Promise<HeldDeposit | null>;
  retryAssetPublication?: () => Promise<HeldDeposit>;
  readPrivateHistory: (cursor?: string) => Promise<PrivateHistoryPage>;
  readNoteHistory?: () => Promise<import('./public-network').PublicRecord[]>;
  nativeReadiness: (approveNativeAccess?: boolean) => Promise<BankNativeReadiness>;
  connectNativeAccount: (approved: boolean) => Promise<{ subjectId: string; sourceDigest: string; sessionExpiresKaiUPulse: number; readyToTransact: false }>;
  persistDeviceCustody: (onlyIfEmpty?:boolean) => Promise<void>;
  dispose: () => void; backup: () => { bytes: Uint8Array; filename: string; phrase: string };
}
// Exact private material is retained only inside this closure and encrypted device custody.
export function openCanonicalIdentity(bytes: Uint8Array, phrase: string, filename: string, consentApproved = false, protectedTransport?: ProtectedIdentityTransport, messagingIncludedAtEntry = false): Promise<OpenIdentity> {
  return openIdentity(bytes, phrase, filename, consentApproved, protectedTransport, messagingIncludedAtEntry);
}
async function openIdentity(bytes: Uint8Array, phrase: string, filename: string, consentApproved = false, protectedTransport?: ProtectedIdentityTransport, messagingIncludedAtEntry = false, freshAccountCreation = false): Promise<OpenIdentity> {
  if (!bytes.length || bytes.length > 32 * 1024 * 1024) throw new Error('Identity Record exceeds the supported device capacity.');
  const sdk = await loadReceiz(); const verification = await sdk.verifyReceizArtifact(bytes);
  if (verification.status !== 'verified-artifact') throw new Error('Import your complete Receiz Identity Record. This file is not a verified identity proof.');
  const admission = await sdk.createReceizArtifactAdmissionEngine()(verification, { profile: 'identity', identityPassphrase: phrase });
  if (admission.verdict !== 'canonical-identity' || !sdk.isSdkIssuedReceizArtifactAdmission(admission)) throw new Error('This Identity Record could not be opened with that recovery phrase.');
  const ownerAdmission = admission;
  const binding = await sdk.readReceizIdentityPublicBinding(admission);
  const keyFile: ReceizKeyFile = await sdk.readReceizIdentityArtifact(bytes);
  // v129 already verified this segmented account projection during canonical
  // identity admission. Reuse that SDK-held result rather than verifying every
  // carried segment a second time on the entry path.
  const recovered = admission.recoveredState as unknown as ReceizIdentityAccountProjection | undefined;
  const localHistory = recovered?.schema === 'receiz.sdk.identity_account_projection.v1' && recovered.keyId === keyFile.keyId && recovered.owner?.uid === keyFile.owner.uid
    ? recovered : await sdk.projectReceizIdentityAccount(keyFile);
  // The admitted carrier selects its recovered account. Device-key ownership
  // and the account bound to that key are distinct; recency cannot replace the
  // signed account selection. The host still checks the active binding.
  const carriedAccountState=localHistory.verifiedState as {schema?:unknown;account?:{userId?:unknown}}|null;
  const carriedAccountUid=localHistory.schema==='receiz.sdk.identity_account_projection.v1'
    &&localHistory.keyId===keyFile.keyId&&localHistory.owner?.uid===keyFile.owner.uid
    &&localHistory.authority==='verified-identity-portable-state'&&localHistory.portableStateVerified
    &&carriedAccountState?.schema==='receiz.account.state.v3'
    &&typeof carriedAccountState.account?.userId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(carriedAccountState.account.userId)
    ?carriedAccountState.account.userId.toLowerCase():null;
  const [savedWallet,savedPortfolio] = await Promise.all([loadWalletObservation(binding),Promise.resolve().then(()=>loadMarketPortfolioState(binding)).catch(()=>null)]);
  let knownWallet = savedWallet&&(!carriedAccountUid||savedWallet.wallet.userId===carriedAccountUid)?savedWallet:null;
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
      if (!restored || lifetime.signal.aborted || carriedAccountUid&&restored.observation.wallet.userId!==carriedAccountUid) return;
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

  const heldFetch: typeof fetch = (input, init) => nativeFetch(input, { ...init, signal: AbortSignal.any([lifetime.signal, ...(init?.signal ? [init.signal] : []), AbortSignal.timeout(nativeRequestTimeout(input))]) });
  const unsigned = sdk.createReceizClient({ applicationId: BANK_APPLICATION_ID, baseUrl: 'https://receiz.com', fetchImpl: heldFetch });
  let sealingResources: { wasm: Uint8Array; zkey: Uint8Array } | undefined;
  async function ownedSealer() {
    sealingResources ??= await loadBankProofResources(fetch, undefined, lifetime.signal);
    const { createReceizOfflineSealer, createReceizIndexedDbSealStore } = await import('@receiz/sdk/offline');
    const sealer = createReceizOfflineSealer({ ownerIdentityAdmission: admission, store: certificateTimeSafeStore(createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer')), resources: sealingResources, fetch: certificateTimeSafeFetch(heldFetch) });
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
      // custody. Its guarded save runs alongside access, without holding login
      // open or replacing a changed identity, wallet head or pending operation.
      if (!suppliedTransport) void saveProtectedIdentityTransport(binding, protectedTransport).catch(() => {});
      transportReady = true;
    })();
    transportOpening = attempt;
    try { await attempt; } finally { if (transportOpening === attempt) transportOpening = undefined; }
  }
  let client: ReceizClient | null = null, clientApplicationId: string | null = null, expiresAtKai = 0, grantedScopes: readonly string[] = [];
  let callCleanupUntil=Infinity;
  const callMembershipAttempts=new Map<string,string|undefined>(),callMembershipQueue=new Map<string,Promise<unknown>>();
  function orderCallMembership<T>(path:string,operation:()=>Promise<T>):Promise<T>{
    const previous=callMembershipQueue.get(path)??Promise.resolve();
    const next=previous.catch(()=>{}).then(operation);callMembershipQueue.set(path,next);
    void next.finally(()=>{if(callMembershipQueue.get(path)===next)callMembershipQueue.delete(path);}).catch(()=>{});return next;
  }
  const callMembershipCleanup=new Map<string,()=>Promise<Response>>();
  const clientCallCleanup=new WeakMap<ReceizClient,(path:string)=>Promise<Response>>();
  const callMembershipPath=/^\/api\/chat\/conversations\/[a-f0-9-]{36}\/calls\/[a-f0-9-]{36}\/participants$/i;
  const clientFetches = new WeakMap<ReceizClient,(path:string,init?:RequestInit)=>Promise<Response>>();
  const clientAccounts = new WeakMap<ReceizClient, { applicationId: string; accountUid: string }>();
  type WalletReadRequest = { prefetched?: { client: ReceizClient; applicationId: string; accountUid: string; response: Promise<unknown> } };
  let presentationUsername = keyFile.owner.username;
  let confirmedUsername:string|null=null;
  let confirmedTwinAccess:boolean|null=null;
  function knownTwinAccess(){return confirmedTwinAccess??knownMessagingDisplay()?.twinAccess??null;}
  async function continueAccountPresentation(targetUnsigned=unsigned){
    async function switchCarriedAccount(){
      noteOpen();
      const challengeB64Url=sdk.receizBase64UrlEncode(new TextEncoder().encode([
        'RECEIZ_DEVICE_SWITCH_V1',`keyId=${keyFile.keyId}`,`localUid=${keyFile.owner.uid}`,
        `targetUid=${carriedAccountUid}`,`issuedAtMs=${Date.now()}`,
        `nonce=${sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(16)))}`,
      ].join('\n')));
      const signed=await targetUnsigned.identity.signLoginProof({keyFile:transportKeyFile,passphrase:transportPhrase,challengeB64Url});
      noteOpen();
      const switched=await targetUnsigned.request('/api/auth/receiz-id/switch',{method:'POST',body:{
        keyId:keyFile.keyId,alg:keyFile.alg,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u,
        localUid:keyFile.owner.uid,targetUid:carriedAccountUid,challengeB64Url,signatureB64Url:signed.signatureB64Url,
      }}) as {ok?:unknown;session?:{uid?:unknown;username?:unknown};profileProjectionPending?:unknown};
      if(switched.ok!==true||switched.session?.uid!==carriedAccountUid)throw Error('Your Identity Record did not open the same account. Your saved proof is unchanged.');
      return switched;
    }
    let continued=carriedAccountUid&&carriedAccountUid!==keyFile.owner.uid?await switchCarriedAccount():await targetUnsigned.identity.continueReceizId({schema:'receiz.device.identity.v1',createdAt:keyFile.issuedAt,updatedAt:keyFile.issuedAt,localUid:keyFile.owner.uid,username:keyFile.owner.username??keyFile.keyId,displayName:keyFile.owner.displayName??keyFile.owner.username??'Receiz account',deviceName:null,keyFile:transportKeyFile},{passphrase:transportPhrase});
    if(carriedAccountUid&&continued.session&&typeof continued.session==='object'&&(continued.session as {uid?:unknown}).uid!==carriedAccountUid)continued=await switchCarriedAccount();
    const session=continued.session as {uid?:unknown;username?:unknown}|undefined;
    if(continued.ok!==true||typeof session?.uid!=='string')throw Error('Your Receiz account could not be opened. Your local Identity Record remains available.');
    return {uid:session.uid,username:session.username,twinAccess:ownerTwinAccountAccess(session),profileProjectionPending:continued.profileProjectionPending===true};
  }
  async function openClient(scopes: readonly string[], statement: string, applicationId: string = BANK_APPLICATION_ID, walletRead?: WalletReadRequest) {
    if (!consentApproved || lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    if (!BANK_CARD_APPLICATION_IDS.some(id => id === applicationId)) throw new Error('Unsupported bank registration.');
    await prepareTransport();
    if (lifetime.signal.aborted) throw new Error('Receiz account read consent is required.');
    if (!client || clientApplicationId !== applicationId || sdk.receizKaiNow().pulse >= expiresAtKai || scopes.some(scope => !grantedScopes.includes(scope))) {
      const targetUnsigned = applicationId === BANK_APPLICATION_ID ? unsigned : sdk.createReceizClient({ applicationId, baseUrl: 'https://receiz.com', fetchImpl: heldFetch });
      // Signed transport metadata comes from the genuine admitted identity. It is not a replacement source.
      const continuing = continueAccountPresentation(targetUnsigned);
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
      // The exact exchange above already returned and checked this grant's
      // scopes. Resource endpoints enforce their bearer scope and revocation;
      // reading the same token's scope claims again adds no new permission.
      const granted = [...grant.grantedScopes];
      // Keep the prefetched wallet private until account continuation succeeds.
      const walletResponse = walletRead ? (knownWallet || typeof protectedClient.request !== 'function' ? protectedClient.connect.wallet() : protectedClient.request('/api/connect/wallet/me?history=1', {method:'GET'}).then<unknown>(response => response && typeof response === 'object' && 'wallet' in response ? response : protectedClient.connect.wallet())) : undefined;
      // The HTTP read can reject before account continuation completes.
      if (walletResponse) void walletResponse.catch(() => {});
      const session = await continuing;
      if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.');
      client = protectedClient; clientApplicationId = applicationId; grantedScopes = granted; expiresAtKai = grant.expiresAtKai; accountUid = session.uid;
      if(session.twinAccess!==null)confirmedTwinAccess=session.twinAccess;
      clientAccounts.set(protectedClient, { applicationId, accountUid: session.uid });
      clientCallCleanup.set(protectedClient,path=>{
        if(!callMembershipPath.test(path)||Date.now()>callCleanupUntil)throw Error('MESSAGING_CLEANUP_CLOSED');
        return nativeFetch(`https://receiz.com${path}`,{method:'DELETE',headers:{authorization:`Bearer ${grant.accessToken}`},signal:AbortSignal.timeout(20_000),keepalive:true});
      });
      clientFetches.set(protectedClient,(path,init)=>{
        const headers=new Headers(init?.headers);headers.set('authorization',`Bearer ${grant.accessToken}`);
        return heldFetch(`https://receiz.com${path}`,{...init,headers});
      });
      if (walletRead && walletResponse) walletRead.prefetched = { client: protectedClient, applicationId, accountUid: session.uid, response: walletResponse };
      // The confirmed account's profile name is display metadata, never proof ownership.
      const username=publicAccountUsername(session.username);if(username)presentationUsername=confirmedUsername=username;
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
  let vaultManager:import('./vault/manager').VaultManager|undefined,vaultOpening:Promise<import('./vault/manager').VaultManager>|undefined;
  function vaults(){
    if(lifetime.signal.aborted)return Promise.reject(Error('VAULT_CLOSED'));
    if(vaultManager)return Promise.resolve(vaultManager);
    return vaultOpening??=import('./vault/manager').then(({createVaultManager})=>{
      lifetime.signal.throwIfAborted();
      vaultManager=createVaultManager({ownerKeyId:binding.keyId,signal:lifetime.signal,parent:async()=>{
        const scopes=[...new Set([...BANK_NATIVE_SCOPES,...BANK_MARKET_TRADE_SCOPES,'receiz:vault.custody'])];
        const current=await connectClient(scopes,'Allow Bankeiz to create and open the separate Vault custody I choose, read its native sources, and prepare only my reviewed money and in-kind ownership movements. My ordinary account stays open separately. Each card deposit, transfer and ownership movement requires its own exact approval.');
        lifetime.signal.throwIfAborted();
        return{userId:receivingUid(),receizId:binding.artifactOwnerReceizId,identity:transportKeyFile,passphrase:transportPhrase,
          request:(path,options)=>current.request(path,options),
          beginCard:async(_amount,_referenceId,request,signal)=>{
            const {admitVaultCardCheckout,readVaultCardCheckoutRequest}=await import('./vault/card');
            const exact=readVaultCardCheckoutRequest(request),card=await connectClient(BANK_CARD_SCOPES,BANK_CARD_CONSENT);
            if(exact.referenceId!==_referenceId||parseDepositDollars(_amount).amountUsdCents!==exact.amountUsdCents)throw Error('VAULT_CARD_CONFLICT');
            const transport=clientFetches.get(card);if(!transport)throw Error('VAULT_CARD_UNAVAILABLE');
            signal?.throwIfAborted();
            const response=await transport('/api/connect/payments/checkout',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({vaultCheckout:exact}),signal});
            signal?.throwIfAborted();if(!response.ok)throw Error('VAULT_CARD_RESULT_UNKNOWN');const result=await response.json();
            return admitVaultCardCheckout(result,exact,receivingUid(),BANK_APPLICATION_ID);
          },
          // The Vault original carries the exact checkout. It can be checked on
          // a fresh device after the parent is separately opened, without an
          // ordinary-device checkout cache manufacturing or blocking authority.
          checkCard:async(checkout,beforeCredit)=>{const card=await connectClient(BANK_CARD_SCOPES,BANK_CARD_CONSENT);const status=parseCardDepositStatus(await card.connect.checkoutSession({sessionId:checkout.sessionId}),checkout.sessionId,checkout.amountUsdCents,receivingUid());if(status.status==='credited')await beforeCredit();return status;},
        };
      }});return vaultManager;
    }).catch(error=>{vaultOpening=undefined;throw error;});
  }
  // No organizer import, storage read or grant request runs during entry or
  // ordinary messaging. The same open ID supplies the account on explicit use.
  let receizToolsPromise:Promise<import('./native-receiz-tools').NativeReceizTools>|undefined;
  async function receizTools(){
    noteOpen();return receizToolsPromise??=(async()=>{
      const {createNativeReceizTools}=await import('./native-receiz-tools');const uid=receivingUid();noteOpen();
      let grant:Awaited<ReturnType<typeof unsigned.identity.exchangeProofAuthority>>|undefined,opening:Promise<void>|undefined;
      const assertOpen=()=>{noteOpen();if(receivingUid()!==uid)throw Error('RECEIZ_TOOL_OWNER_CHANGED');};
      const authorize=async()=>{assertOpen();if(grant&&sdk.receizKaiNow().pulse<grant.expiresAtKai)return;if(opening)return opening;
        opening=(async()=>{await prepareTransport();assertOpen();const scopes=['mcp:execute'],statementDigest=await sdk.sha256ReceizBytes(new TextEncoder().encode('Use my existing Receiz tools on my behalf. Each operation retains its native consent, custody and proof rules.'));
          const created=sdk.createReceizProofAuthorityChallenge({applicationId:BANK_APPLICATION_ID,artifactDigest:transportBinding.artifactSha256,scopes,consentStatementDigest:statementDigest,ttlPulses:30});
          const proof=await unsigned.identity.signLoginProof({keyFile:transportKeyFile,passphrase:transportPhrase,challengeB64Url:created.challengeB64Url});
          const actual=await unsigned.identity.exchangeProofAuthority({artifact:transportBytes,challenge:{...created.challenge,proof},applicationId:BANK_APPLICATION_ID,scopes});assertOpen();
          if(actual.applicationId!==BANK_APPLICATION_ID||actual.keyId!==transportBinding.keyId||actual.artifactDigest!==transportBinding.artifactSha256||!actual.grantedScopes.includes('mcp:execute'))throw Error('RECEIZ_TOOL_ACCESS_UNAVAILABLE');grant=actual;
        })().finally(()=>{opening=undefined;});return opening;
      };
      return createNativeReceizTools({assertOpen,request:async(path,init)=>{await authorize();assertOpen();const headers=new Headers(init?.headers);headers.set('authorization',`Bearer ${grant!.accessToken}`);return heldFetch('https://receiz.com'+path,{...init,headers});}});
    })().catch(cause=>{receizToolsPromise=undefined;throw cause;});
  }
  let insightsPromise:Promise<import('./profile-insights').ProfileInsightsSource>|undefined;
  function profileInsights(){
    const assertOpen=()=>{if(lifetime.signal.aborted)throw Error('PROFILE_INSIGHTS_IDENTITY_CLOSED');};assertOpen();
    if(insightsPromise)return insightsPromise;
    const attempt=(async()=>{
      const {createProfileInsights}=await import('./profile-insights');assertOpen();
      const uid=carriedAccountUid??accountUid??knownWallet?.wallet.userId;if(!uid)throw Error('PROFILE_INSIGHTS_ACCOUNT_REQUIRED');
      return createProfileInsights({accountUid:uid,assertOpen,request:async path=>{
        const current=await connectClient(['receiz:app_state.read'],'Read my existing private profile insights inside Bankeiz. This does not change my profile, publish private information or authorize payments.');assertOpen();
        if(clientAccounts.get(current)?.accountUid!==uid||clientAccounts.get(current)?.applicationId!==BANK_APPLICATION_ID)throw Error('PROFILE_INSIGHTS_IDENTITY_CHANGED');
        const send=clientFetches.get(current);if(!send)throw Error('PROFILE_INSIGHTS_UNAVAILABLE');return send(path);
      }});
    })();insightsPromise=attempt;void attempt.catch(()=>{if(insightsPromise===attempt)insightsPromise=undefined;});return attempt;
  }
  let heldOrganizer:import('./native-organizer').NativeOrganizer|null=null;
  const knownOrganizer=()=>{if(lifetime.signal.aborted)return null;return heldOrganizer?.accountUid===(accountUid??carriedAccountUid??knownWallet?.wallet.userId)?heldOrganizer:null;};
  const knownOrganizerDisplay=()=>{if(lifetime.signal.aborted)return null;const value=heldOrganizer?.known();return value&&value.accountUid===(accountUid??carriedAccountUid??knownWallet?.wallet.userId)?value:null;};
  let organizerPromise:Promise<import('./native-organizer').NativeOrganizer>|undefined;
  let organizerRequest:import('./native-organizer').OrganizerRequest|undefined;
  async function organizer(){
    const assertOpen=()=>{if(lifetime.signal.aborted)throw Error('ORGANIZER_IDENTITY_CLOSED');};assertOpen();
    if(organizerPromise)return organizerPromise;
    const attempt=(async()=>{
      const [{createNativeOrganizer},{openOrganizerRetention},storage,{permittedOrganizerPath},{readOrganizerDisplay}]=await Promise.all([import('./native-organizer'),import('./organizer-retention'),import('./identity-vault'),import('./organizer-paths'),import('./organizer-types')]);assertOpen();
      const saved=await storage.loadOrganizerDisplay(binding).catch(()=>null);assertOpen();
      let uid=carriedAccountUid??accountUid??knownWallet?.wallet.userId;
      let connected:ReceizClient|null=null,expires=0;
      // First-use wallet placement can precede account continuation. Bind a
      // missing organizer to that same checked connection before capturing its
      // owner. Complete retained/carried records still open without a grant.
      if(!carriedAccountUid&&!(uid&&readOrganizerDisplay(saved,uid))){
        connected=await connectClient(BANK_ORGANIZER_SCOPES,BANK_ORGANIZER_CONSENT);assertOpen();
        const owner=clientAccounts.get(connected);if(!owner||owner.applicationId!==BANK_APPLICATION_ID)throw Error('ORGANIZER_IDENTITY_CHANGED');
        uid=owner.accountUid;expires=expiresAtKai;
      }
      if(!uid)throw Error('ORGANIZER_ACCOUNT_REQUIRED');
      const retention=await openOrganizerRetention({accountUid:uid,load:async()=>saved,save:(value,expected)=>storage.saveOrganizerDisplay(binding,value,expected),isOpen:()=>!lifetime.signal.aborted});assertOpen();
      const request=async(path:string,init?:RequestInit)=>{
        assertOpen();if(!permittedOrganizerPath(new URL(path,'https://receiz.com'),init?.method??'GET'))throw Error('ORGANIZER_PATH_DENIED');
        if(!connected||sdk.receizKaiNow().pulse>=expires){connected=await connectClient(BANK_ORGANIZER_SCOPES,BANK_ORGANIZER_CONSENT);expires=expiresAtKai;}
        assertOpen();const owner=clientAccounts.get(connected);if(owner?.accountUid!==uid||owner.applicationId!==BANK_APPLICATION_ID)throw Error('ORGANIZER_IDENTITY_CHANGED');const send=clientFetches.get(connected);if(!send)throw Error('ORGANIZER_TRANSPORT_UNAVAILABLE');return send(path,init);
      };
      organizerRequest=request;
      return heldOrganizer=createNativeOrganizer({accountUid:uid,request,retained:retention.known(),carried:localHistory.portableStateVerified&&carriedAccountUid===uid?localHistory.verifiedState:null,onChange:display=>retention.capture(display),assertOpen});
    })();organizerPromise=attempt;void attempt.catch(()=>{if(organizerPromise===attempt)organizerPromise=undefined;});return attempt;
  }
  let messagingPromise:Promise<import('./native-messaging').NativeMessaging>|undefined;
  // Fresh account entry discloses messaging in the same approval. Legacy
  // read-only custody still needs its own exact retained messaging approval.
  let messagingApproved=consentApproved&&messagingIncludedAtEntry;
  const exactMessagingConsent=()=>({schema:'bankeiz.messaging-consent.v1',applicationId:BANK_APPLICATION_ID,keyId:binding.keyId,artifactDigest:binding.artifactSha256,scopes:[...BANK_MESSAGING_SCOPES],statement:BANK_MESSAGING_CONSENT});
  // Start the local-only read during identity preparation, never on icon tap.
  // The exact retained consent gates private display just as it gates transport.
  const messagingConsent=Promise.resolve().then(()=>loadMessagingConsent(binding)).catch(()=>null);
  const messagingRetention=openMessagingRetention({
    load:async()=>messagingApproved||JSON.stringify(await messagingConsent)===JSON.stringify(exactMessagingConsent())?loadMessagingDisplay(binding):null,
    save:(value,expected)=>saveMessagingDisplay(binding,value,expected),
    isOpen:()=>!lifetime.signal.aborted,
  });
  async function messaging(approved=false){
    if(lifetime.signal.aborted)throw Error('MESSAGING_IDENTITY_CLOSED');
    if(messagingPromise)return messagingPromise;
    const attempt=(async()=>{
      const previous=await messagingConsent;
      const exact=exactMessagingConsent();
      if(approved)messagingApproved=true;
      if(!messagingApproved&&JSON.stringify(previous)!==JSON.stringify(exact))throw Error('MESSAGING_CONSENT_REQUIRED');
      const current=await connectClient(BANK_MESSAGING_SCOPES,BANK_MESSAGING_CONSENT);
      const bound=clientAccounts.get(current);
      if(!bound||bound.applicationId!==BANK_APPLICATION_ID)throw Error('MESSAGING_IDENTITY_CHANGED');
      const uid=bound.accountUid;
      let messagingClient=current,messagingExpires=expiresAtKai;
      const assertOpen=()=>{if(lifetime.signal.aborted)throw Error('MESSAGING_IDENTITY_CLOSED');};
      const request=async(path:string,init?:RequestInit,controllerId?:string)=>{
        const perform=async()=>{
        const verb=(init?.method??'GET').toUpperCase();
        // A closed identity can only finish leaving a membership whose exact
        // join was already attempted under its admitted grant. Never refresh
        // credentials or accept a new selector after closure.
        if(verb==='DELETE'&&callMembershipCleanup.has(path)&&callMembershipAttempts.get(path)!==controllerId)throw Error('CALL_MEMBERSHIP_SUPERSEDED');
        if(lifetime.signal.aborted&&verb==='DELETE'&&init?.signal===null&&callMembershipCleanup.has(path)&&Date.now()<=callCleanupUntil)return callMembershipCleanup.get(path)!();
        assertOpen();const url=new URL(path,'https://receiz.com');
        const search=url.pathname==='/api/chat/users/search'&&verb==='GET'&&[...url.searchParams.keys()].join(',')==='q'&&isPeopleSearchQuery(url.searchParams.get('q'));
        const moneyJournal=url.pathname===`/api/developers/twin/${presentationUsername}/money`&&(['GET','POST'].includes(verb))&&(verb==='POST'?!url.search:[...url.searchParams.keys()].every(key=>key==='cursor')&&url.searchParams.getAll('cursor').length<=1&&(url.searchParams.get('cursor')===null||/^[A-Za-z0-9_-]{1,500}$/.test(url.searchParams.get('cursor')!)));
        const twin=url.pathname===`/api/developers/twin/${presentationUsername}/message`&&verb==='POST'&&!url.search;
        const twinHistory=url.pathname===`/api/developers/twin/${presentationUsername}/conversations`&&verb==='GET'&&permittedTwinConversationRead(url,uid);
        if(!path.startsWith('/api/')||url.origin!=='https://receiz.com'||url.hash||!permittedNativeChatPath(url,verb)&&!search&&!twin&&!moneyJournal&&!twinHistory)throw Error('MESSAGING_PATH_DENIED');
        const connected=sdk.receizKaiNow().pulse<messagingExpires?messagingClient:await connectClient(BANK_MESSAGING_SCOPES,BANK_MESSAGING_CONSENT),owner=clientAccounts.get(connected);
        if(connected!==messagingClient){messagingClient=connected;messagingExpires=expiresAtKai;}
        assertOpen();if(owner?.accountUid!==uid||owner.applicationId!==BANK_APPLICATION_ID)throw Error('MESSAGING_IDENTITY_CHANGED');
        const send=clientFetches.get(connected);if(!send)throw Error('MESSAGING_TRANSPORT_UNAVAILABLE');
        if(verb==='POST'&&callMembershipPath.test(path)&&typeof init?.body==='string'){
          let joining=false;try{joining=JSON.parse(init.body)?.action==='join';}catch{/* Existing host validates malformed input. */}
          const cleanup=clientCallCleanup.get(connected);if(joining&&cleanup){callMembershipAttempts.set(path,controllerId);callMembershipCleanup.set(path,()=>cleanup(path));}
        }
        return send(path,init);
        };
        return callMembershipPath.test(path)&&['POST','DELETE'].includes((init?.method??'GET').toUpperCase())?orderCallMembership(path,perform):perform();
      };
      assertOpen();
      // Profile display coordinates come from continuation; Receiz independently
      // enforces that this handle belongs to the bearer subject on every ask.
      const twin=createNativeTwin({accountUid:uid,username:()=>presentationUsername??'',request,assertOpen});
      const callTransport={heldFetch:request,forController:()=>{const controllerId=crypto.randomUUID();return{heldFetch:(path:string,init?:RequestInit)=>request(path,init,controllerId)};}};
      const retention=await messagingRetention;assertOpen();
      const api=Object.assign(createNativeMessaging({request,accountUid:uid,callTransport,retained:retention.known(),onChange:source=>{const twinAccess=knownTwinAccess();retention.capture({...source,...(twinAccess===null?{}:{twinAccess})});}}),{twin,knownTwinAccess});
      if(approved)await saveMessagingConsent(binding,exact,previous).catch(()=>{});
      assertOpen();return api;
    })();
    messagingPromise=attempt;
    try{return await attempt;}catch(cause){if(messagingPromise===attempt)messagingPromise=undefined;throw cause;}
  }
  async function requestNativeTwinUpgrade(input:import('./twin-upgrade').TwinUpgradeInput){
      if(lifetime.signal.aborted)throw Error('MESSAGING_IDENTITY_CLOSED');
      await prepareTransport();
      if(!accountUid)await connectClient(BANK_MESSAGING_SCOPES,BANK_MESSAGING_CONSENT);
      const uid=accountUid;if(!uid)throw Error('MESSAGING_IDENTITY_CHANGED');
      const creditsReserveEligible=input.action==='credits-quote'?await qualifyTwinReserveCredits():undefined;
      const proof=await unsigned.identity.buildReceizIdContinueRequest({schema:'receiz.device.identity.v1',createdAt:keyFile.issuedAt,updatedAt:keyFile.issuedAt,localUid:keyFile.owner.uid,username:keyFile.owner.username??keyFile.keyId,displayName:keyFile.owner.displayName??keyFile.owner.username??'Receiz account',deviceName:null,keyFile:transportKeyFile},{passphrase:transportPhrase});
      const {requestTwinUpgrade}=await import('./twin-upgrade');
      const result=await requestTwinUpgrade(uid,proof,input);
      if(lifetime.signal.aborted||accountUid!==uid)throw Error('MESSAGING_IDENTITY_CHANGED');
      confirmedTwinAccess=result.twinAccess;
      const retention=await messagingRetention,held=retention.known();
      if(held?.accountUid===uid)retention.capture({...held,twinAccess:result.twinAccess});
      return creditsReserveEligible===undefined?result:{...result,creditsReserveEligible};
  }
  async function twinCreditPurchaseCoordination(){
    noteOpen();await prepareTransport();
    if(!accountUid)await connectClient(BANK_MESSAGING_SCOPES,BANK_MESSAGING_CONSENT);
    const uid=accountUid;if(!uid)throw Error('MESSAGING_IDENTITY_CHANGED');
    return createTwinCreditPurchaseCoordination({ownerUid:uid,identityDigest:binding.artifactSha256,
      read:()=>loadTwinCreditPurchaseState(binding),write:(next,previous)=>saveTwinCreditPurchaseState(binding,next,previous),
      request:requestNativeTwinUpgrade,onCompleted:result=>recordTwinReserveCompletion(result,uid)});
  }
  async function upgradeTwin(input:import('./twin-upgrade').TwinUpgradeInput){
    if(input.action==='credits-purchase')return withAccountExecutionLock(()=>noteLock(async()=>{await assertWalletSendReady(undefined,input.operationId);return(await twinCreditPurchaseCoordination()).execute(input.operationId,input.fundingMode);}));
    if(input.action==='credits-purchase-status')return(await twinCreditPurchaseCoordination()).status(input.operationId,input.fundingMode);
    if(input.action==='credits-checkout')await assertNoPendingTwinCreditPurchase();
    return requestNativeTwinUpgrade(input);
  }
  async function recoverTwinCreditPurchase():Promise<RecoveredTwinCreditPurchase|null>{
    return withAccountExecutionLock(()=>noteLock(async()=>{
      if(!await readPendingTwinCreditPurchase())return null;
      return(await twinCreditPurchaseCoordination()).recover();
    }));
  }
  let twinWorkspacePromise:Promise<import('./twin-workspace').TwinWorkspace>|undefined;
  let heldTwinWorkspace:import('./twin-workspace').TwinWorkspace|null=null;
  const knownTwinWorkspace=()=>!lifetime.signal.aborted&&heldTwinWorkspace?.accountUid===accountUid?heldTwinWorkspace:null;
  async function twinWorkspace(){
    lifetime.signal.throwIfAborted();
    return twinWorkspacePromise??=(async()=>{
      const [current,{createTwinWorkspace}]=await Promise.all([connectClient(BANK_MESSAGING_SCOPES,BANK_MESSAGING_CONSENT),import('./twin-workspace')]);
      const uid=clientAccounts.get(current)?.accountUid;
      if(!uid||uid!==accountUid)throw Error('TWIN_WORKSPACE_IDENTITY_CHANGED');
      const assertOpen=()=>{lifetime.signal.throwIfAborted();if(accountUid!==uid)throw Error('TWIN_WORKSPACE_IDENTITY_CHANGED');};
      assertOpen();
      return heldTwinWorkspace=createTwinWorkspace({accountUid:uid,assertOpen,onContacts:async(owner,contacts)=>{if(organizerPromise){const held=await organizerPromise;assertOpen();held.mergeSavedContacts(owner,contacts);}},request:async(input,file)=>{
        assertOpen();await prepareTransport();assertOpen();
        const continuation=await unsigned.identity.buildReceizIdContinueRequest({schema:'receiz.device.identity.v1',createdAt:keyFile.issuedAt,updatedAt:keyFile.issuedAt,localUid:keyFile.owner.uid,username:keyFile.owner.username??keyFile.keyId,displayName:keyFile.owner.displayName??keyFile.owner.username??'Receiz account',deviceName:null,keyFile:transportKeyFile},{passphrase:transportPhrase});assertOpen();
        const data={...input,accountUid:uid,continuation:typeof continuation==='string'?continuation:JSON.stringify(continuation)};
        const form=file?new FormData():null;if(form){form.set('input',JSON.stringify(data));form.set('image',file!);}
        const response=await fetch('/api/bank/twin-workspace',{method:'POST',credentials:'omit',redirect:'error',signal:lifetime.signal,...(form?{body:form}:{headers:{'content-type':'application/json'},body:JSON.stringify(data)})});assertOpen();return response.json();
      }});
    })().catch(error=>{twinWorkspacePromise=undefined;throw error;});
  }
  let businessChat:Promise<import('./business-chat').BusinessChat>|undefined;
  async function businessSetup(){
    lifetime.signal.throwIfAborted();
    return businessChat??=(async()=>{
      const [current,[{createBusinessChat},{createBusinessSetupTools},{createBusinessProfileTools},{createBusinessDnsTools}]]=await Promise.all([connectClient(BANK_MESSAGING_SCOPES,BANK_MESSAGING_CONSENT),Promise.all([import('./business-chat'),import('./business-setup'),import('./business-profile-tools'),import('./business-dns-tools')])]);
      const uid=clientAccounts.get(current)?.accountUid;
      if(!uid||uid!==accountUid)throw Error('BUSINESS_SETUP_IDENTITY_CHANGED');
      const assertOpen=()=>{lifetime.signal.throwIfAborted();if(accountUid!==uid)throw Error('BUSINESS_SETUP_IDENTITY_CHANGED');};assertOpen();
      const requestHost=async(path:'/api/bank/business/setup'|'/api/bank/business/dns',details:Record<string,unknown>)=>{
        assertOpen();await prepareTransport();assertOpen();
        const continuation=await unsigned.identity.buildReceizIdContinueRequest({schema:'receiz.device.identity.v1',createdAt:keyFile.issuedAt,updatedAt:keyFile.issuedAt,localUid:keyFile.owner.uid,username:keyFile.owner.username??keyFile.keyId,displayName:keyFile.owner.displayName??keyFile.owner.username??'Receiz account',deviceName:null,keyFile:transportKeyFile},{passphrase:transportPhrase});assertOpen();
        const response=await fetch(path,{method:'POST',credentials:'omit',redirect:'error',headers:{'content-type':'application/json'},signal:lifetime.signal,body:JSON.stringify({...details,accountUid:uid,continuation:typeof continuation==='string'?continuation:JSON.stringify(continuation)})});assertOpen();return await response.json();
      };
      const setup=createBusinessSetupTools({accountUid:uid,assertOpen,invoke:call=>requestHost('/api/bank/business/setup',call)});
      const profiles=createBusinessProfileTools({accountUid:uid,ownerReceizId:binding.artifactOwnerReceizId,assertOpen,profile,verifyOriginal:async file=>unsigned.artifacts.verifyAndOpen(file),publication:()=>openAssetPublicationRuntime(),prepareOriginal:async draft=>{
        assertOpen();const [sealDocument,{prepareConnectedComposerSource}]=await Promise.all([
          (async()=>{const native=await loadBankNoteRuntime(),sealer=await ownedSealer();return native.createBankNativeNoteSealer({enrollment:await sealer.enroll(),resources:sealingResources!});})(),
          import('./business-seal-runtime').then(module=>module.loadBusinessSealRuntime()),
        ]);assertOpen();
        return prepareConnectedComposerSource({draft,ownerReceizId:binding.artifactOwnerReceizId,sealDocument,assertCurrent:assertOpen});
      }});
      const dns=async(provider?:string,expectedHostname?:string)=>createBusinessDnsTools({accountUid:uid,expectedHostname,assertOpen,execute:(tool,args)=>setup.execute(tool,args),connection:async hostname=>{
        const names:Record<string,string>={cloudflare:'cloudflare',godaddy:'godaddy',vercel:'vercel',digitalocean:'digitalocean',dnsimple:'dnsimple',porkbun:'porkbun',route53:'route53','aws route 53':'route53','google cloud dns':'google-cloud-dns','google-cloud-dns':'google-cloud-dns','azure dns':'azure-dns','azure-dns':'azure-dns',namecheap:'namecheap'};
        const selected=provider?names[provider.toLowerCase().trim()]:null;if(!selected)return null;
        const result=await requestHost('/api/bank/business/dns',{provider:selected,hostname,action:'connect'});assertOpen();
        if(result.accountUid!==uid||result.hostname!==hostname)throw Error('BUSINESS_DNS_CONNECTION_UNCONFIRMED');
        if(result.status==='manual')return typeof result.reason==='string'&&result.reason.length<=2000?{accountUid:uid,provider:selected,canWrite:false,reason:result.reason,apply:async()=>{throw Error('BUSINESS_DNS_PROVIDER_ACTION_REQUIRED');}}:null;
        if(result.status==='connect'){
          const action=result.action,url=new URL(action?.href);if(!['https://vercel.com','https://connect.vercel.com'].includes(url.origin)||url.username||url.password||url.hash||typeof action.label!=='string')throw Error('BUSINESS_DNS_CONNECTION_UNCONFIRMED');
          const {BusinessDnsConnectionRequired}=await import('./business-dns-tools');throw new BusinessDnsConnectionRequired({label:action.label,href:url.href},hostname);
        }
        if(result.status!=='ready')throw Error('BUSINESS_DNS_CONNECTION_UNCONFIRMED');
        return{accountUid:uid,provider:selected,canWrite:true,apply:async plan=>{const response=await requestHost('/api/bank/business/dns',{provider:selected,hostname:plan.hostname,action:'apply'});assertOpen();if(response.accountUid!==uid||response.hostname!==hostname)throw Error('BUSINESS_DNS_CONNECTION_UNCONFIRMED');return response.result;}};
      }});
      return createBusinessChat({accountUid:uid,assertOpen,organizer,receizTools,twinWorkspace,username:()=>presentationUsername||confirmedUsername||undefined,setup:async()=>setup,profile:async()=>profiles,dns,retainOriginal:async file=>{await holdProof(file);assertOpen();}});
    })().catch(cause=>{businessChat=undefined;throw cause;});
  }
  let moneyWorkspace:Promise<import('./money-workspace').MoneyWorkspace & import('./money-conversation-retention').MoneyConversationRetention & {downloadSource(digest:string):Promise<File>}>|undefined;
  async function moneyTools(){
    lifetime.signal.throwIfAborted();
    return moneyWorkspace??=(async()=>{
      const [api,[{createMoneyWorkspace},{searchMoneyHistory},{heldAccountProofBytes},vault,{createMoneyConversationRetention}]]=await Promise.all([messaging(),Promise.all([import('./money-workspace'),import('./money-history'),import('./account-proof'),import('./identity-vault'),import('./money-conversation-retention')])]);noteOpen();const uid=api.accountUid;
      const assertOpen=()=>{noteOpen();if(accountUid!==uid)throw Error('MONEY_IDENTITY_CHANGED');};assertOpen();
      const sources=new Map<string,import('./account-proof').VerifiedAccountProof>();let heldSourceJson:string|undefined,heldProof:import('./account-proof').VerifiedAccountProof|null=null;
      const proof=async()=>{
        assertOpen();const state=await loadAccountLedgerState(binding) as {sourceJson?:string}|null;assertOpen();
        if(!heldProof||state?.sourceJson!==heldSourceJson){heldProof=await localLedger.original();heldSourceJson=state?.sourceJson;}
        heldProof??=await accountProof();assertOpen();sources.set(heldProof.sourceDigest,heldProof);return heldProof;
      };
      const workspace=createMoneyWorkspace({accountUid:uid,identityDigest:binding.artifactSha256,assertOpen,
        store:{read:()=>vault.loadMoneyWorkspaceState(binding),write:(next,previous)=>vault.saveMoneyWorkspaceState(binding,next,previous)},
        lock:async work=>{assertOpen();if(!navigator.locks)throw Error('MONEY_DEVICE_LOCK_REQUIRED');return navigator.locks.request(`receiz-bank-money-workspace:${binding.artifactSha256}`,{signal:lifetime.signal},work);},
        journal:api.twin.moneyJournal,counter:merchantCounter,messages:async()=>api,history:async query=>{const source=await proof();assertOpen();return searchMoneyHistory(source,binding,query);},
      });
      const continuation=createMoneyConversationRetention({accountUid:uid,identityDigest:binding.artifactSha256,assertOpen,
        store:{read:()=>vault.loadMoneyConversationState(binding),write:(next,previous)=>vault.saveMoneyConversationState(binding,next,previous)},
        lock:async work=>{assertOpen();if(!navigator.locks)throw Error('MONEY_DEVICE_LOCK_REQUIRED');return navigator.locks.request(`receiz-bank-money-workspace:${binding.artifactSha256}`,{signal:lifetime.signal},work);},
      });
      return Object.freeze({...workspace,...continuation,async downloadSource(digest:string){assertOpen();if(!/^[a-f0-9]{64}$/.test(digest))throw Error('MONEY_SOURCE_REQUIRED');let source=sources.get(digest);if(!source){const current=await proof();if(current.sourceDigest===digest)source=current;}if(!source)throw Error('MONEY_EXACT_SOURCE_NOT_HELD');return new File([new Uint8Array(heldAccountProofBytes(source))],`account-proof-${digest.slice(0,16)}.json`,{type:'application/json'});}});
    })().catch(cause=>{moneyWorkspace=undefined;throw cause;});
  }
  const prepareReceivingUsername=createReceivingUsernamePreparation({signal:lifetime.signal,confirmed:()=>confirmedUsername,
    connect:async()=>{const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT),bound=clientAccounts.get(current);if(!bound||bound.applicationId!==BANK_APPLICATION_ID)throw Error('RECEIVING_USERNAME_IDENTITY_CHANGED');return bound.accountUid;},
    read:()=>continueAccountPresentation(),publish:(username,uid)=>{if(accountUid!==uid||lifetime.signal.aborted)throw Error('RECEIVING_USERNAME_IDENTITY_CHANGED');presentationUsername=confirmedUsername=username;},
  });
  function protectedChartFrame(){return knownWallet?.source==='local-note-head'||knownWallet?.walletScope==='native-full'||!!knownWallet&&isWalletQuoteHeld(knownWallet);}
  let profileEditor:import('./profile-edit').ProfileEditor|undefined,profilePresentation:import('./profile-edit').OwnerProfilePresentation|null=null;
  async function profile(){
    if(profileEditor)return profileEditor;
    const statement='Update the profile of my existing Receiz account with the details I choose. This changes public presentation and does not authorize a payment.';
    const connect=()=>connectClient([...BANK_READ_SCOPES,'profile'],statement);
    const [current,{createProfileEditor,readProfileImageUpdate,ownerProfilePresentation}]=await Promise.all([connect(),import('./profile-edit')]);
    const uid=clientAccounts.get(current)?.accountUid;
    if(!uid||lifetime.signal.aborted)throw Error('PROFILE_ACCOUNT_CLOSED');
    return profileEditor=createProfileEditor({accountUid:uid,current:()=>!lifetime.signal.aborted&&accountUid===uid,
      update:async input=>{const next=await connect();if(clientAccounts.get(next)?.accountUid!==uid)throw Error('PROFILE_ACCOUNT_MISMATCH');return next.profile.update(input);},availability:async username=>{const next=await connect();if(clientAccounts.get(next)?.accountUid!==uid)throw Error('PROFILE_ACCOUNT_MISMATCH');return next.identity.checkUsernameAvailability(username);},
      uploadImage:async(file,kind)=>{const next=await connect();if(clientAccounts.get(next)?.accountUid!==uid)throw Error('PROFILE_ACCOUNT_MISMATCH');const request=clientFetches.get(next);if(!request)throw Error('PROFILE_ACCOUNT_CLOSED');const body=new FormData();body.set('kind',kind);body.set('file',file);const response=await request('/api/profile/me/media',{method:'POST',body,signal:lifetime.signal}),value=await response.json();if(!response.ok||value?.ok!==true)throw Error('PROFILE_IMAGE_UNAVAILABLE');return readProfileImageUpdate(value,uid,kind);},
      publish:result=>{
        profilePresentation=ownerProfilePresentation(result);
        const view=result.profile as {profile?:{username?:unknown;isPrivate?:boolean}};
        const username=publicAccountUsername(view.profile?.username);if(username)presentationUsername=confirmedUsername=username;
        dispatchEvent(new Event('bankeiz:profile-updated'));
        void import('./public-profile').then(module=>{if(lifetime.signal.aborted||accountUid!==uid)return;try{if(view.profile?.isPrivate){module.forgetPublicProfilesForAccount(uid);module.forgetPublicProfile(username!);dispatchEvent(new Event('bankeiz:profile-updated'));return;}const next=module.parsePublicProfile({ok:true,profile:result.profile},username!);module.retainPublicProfile(next);dispatchEvent(new Event('bankeiz:profile-updated'));}catch{/* Private profile fields are never retained in public presentation. */}});
      }});
  }
  async function adoptChartResponse(response:unknown, expectedUserId:string) {
    if(protectedChartFrame())return null;
    const raw=(response as {wallet?:{chartSource?:import('./composite-wallet-history').CompositeWalletSource}}|null)?.wallet?.chartSource;
    if(!raw||raw.userId!==expectedUserId)return null;
    let source;
    try{if(raw.transport?.after){
      if(!knownWallet?.chartSource||raw.transport.after!==knownWallet.chartSource.transport?.cursor)return null;
      source=readCompositeWalletSource(mergeCompositeWalletSources(knownWallet.chartSource,raw),expectedUserId);
    }else source=readCompositeWalletSource(knownWallet?.chartSource?mergeCompositeWalletSources(knownWallet.chartSource,raw):raw,expectedUserId);}catch{return null;}
    if(!source)return null;
    source={...source,transport:{after:source.transport?.after??null,cursor:source.transport?.cursor??null,capturedKaiUPulse:source.transport?.capturedKaiUPulse??source.throughKaiUPulse}};
    const {prepareCompositeWallet}=await import('./prepare-composite-wallet');
    const wallet=parseSharedWallet(response,expectedUserId), retained=knownWallet?.historyBasis?.kind==='portfolio-model-v129'?knownWallet:undefined;
    const {projectCompositeWalletAt}=await import('./composite-wallet-history');
    const originalPoint=projectCompositeWalletAt(source,source.throughKaiUPulse);
    if(!compositeWalletEndpointMatches(source,wallet,originalPoint))return null;
    const now=String(sdk.receizKaiNow().uPulse);
    if(canAdvanceCompositeWalletSource(source)&&/^\d{1,30}$/.test(now)&&BigInt(now)>BigInt(source.throughKaiUPulse)){source={...source,throughKaiUPulse:now};const point=projectCompositeWalletAt(source,now);const projected={...wallet,totalUsdCents:point.totalUsdCents,settlementUsdCents:point.settlementUsdCents,reserveUsdCents:point.reserveUsdCents,balancePhiMicro:point.balancePhiMicro??wallet.balancePhiMicro};Object.assign(wallet,projected,projectUnchangedWalletPhiSplit(wallet,projected));}
    const observation=await prepareCompositeWallet({wallet,observedAt:new Date().toISOString()},source,lifetime.signal,retained);noteOpen();
    if(protectedChartFrame())return null;
    return observation ? advanceCompositeWalletObservation(observation,String(sdk.receizKaiNow().uPulse)) ?? observation : null;
  }
  async function prepareCompositeChart() {
    if(protectedChartFrame())return null;
    const walletAtStart=knownWallet?.wallet;
    const financialHeadChanged=()=>knownWallet?.wallet!==walletAtStart&&(!knownWallet||!walletAtStart||!sameWalletFinancialState(knownWallet.wallet,walletAtStart));
    const startedRevision=walletRevision,current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT),bound=clientAccounts.get(current);
    if(!bound||bound.applicationId!==BANK_APPLICATION_ID)return null;
    const cursor=knownWallet?.chartSource?.transport?.cursor,cashUpgrade=knownWallet?.wallet.currentBalanceSource?.cashBasis&&knownWallet.chartSource?.composition!=='cash-plus-originals',after=!cashUpgrade&&validCursor(cursor)?`&after=${encodeURIComponent(cursor)}`:'';
    let response=await current.request(`/api/connect/wallet/me?history=1${after}`,{method:'GET'});noteOpen();
    if(financialHeadChanged())return knownWallet;
    if(walletRevision!==startedRevision||hasLocalWalletHead())return null;
    const returnedSource=(response as {wallet?:{chartSource?:import('./composite-wallet-history').CompositeWalletSource}}|null)?.wallet?.chartSource;
    if(after&&knownWallet?.chartSource&&returnedSource
      &&(returnedSource.composition??'profile-plus-ledger')!==(knownWallet.chartSource.composition??'profile-plus-ledger')){
      // Composition changed, so a suffix cannot reclassify earlier seed rows.
      // Request the complete source once; ordinary unchanged reads retain it.
      response=await current.request('/api/connect/wallet/me?history=1',{method:'GET'});noteOpen();
    }
    if(financialHeadChanged())return knownWallet;
    if(walletRevision!==startedRevision||hasLocalWalletHead())return null;
    const observation=await adoptChartResponse(response,bound.accountUid);
    // Entry may now finish while this display read/worker is pending. A newer
    // ordinary wallet refresh is as decisive as a recorded payment revision.
    if(financialHeadChanged())return knownWallet;
    if(!observation||walletRevision!==startedRevision||protectedChartFrame())return null;
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
    return adoptConnectedWalletResponse(response,bound?.applicationId === BANK_APPLICATION_ID ? bound.accountUid : '',startedRevision);
  }
  async function adoptConnectedWalletResponse(response:unknown,expectedUserId:string,startedRevision:number,publishBeforeChart=false){
    noteOpen();let wallet = parseSharedWallet(response,expectedUserId);
    // A read that began before a completed local note result cannot overwrite
    // that result when its delayed response finally arrives. A later shared
    // transaction can supersede a read-only projection only with a strictly
    // newer carried coordinate. Prepared local custody always wins.
    const laterSharedCoordinate = () => knownWallet && wallet.userId === knownWallet.wallet.userId && wallet.kaiUpulse && knownWallet.wallet.kaiUpulse
      && /^\d{1,30}$/.test(wallet.kaiUpulse) && /^\d{1,30}$/.test(knownWallet.wallet.kaiUpulse)
      && BigInt(wallet.kaiUpulse) > BigInt(knownWallet.wallet.kaiUpulse);
    const olderSharedCoordinate = () => knownWallet && wallet.userId === knownWallet.wallet.userId && wallet.kaiUpulse && knownWallet.wallet.kaiUpulse
      && /^\d{1,30}$/.test(wallet.kaiUpulse) && /^\d{1,30}$/.test(knownWallet.wallet.kaiUpulse)
      && BigInt(wallet.kaiUpulse) < BigInt(knownWallet.wallet.kaiUpulse);
    if ((hasLocalWalletHead() || olderSharedCoordinate() || startedRevision !== walletRevision && !laterSharedCoordinate()) && knownWallet) return knownWallet.wallet;
    if(knownWallet&&!keepsWalletCashComposition([knownWallet.wallet.currentBalanceSource,knownWallet.chartSource],wallet.currentBalanceSource)){
      if(!publishBeforeChart&&!laterSharedCoordinate())return knownWallet.wallet;
      // A completed financial result still moves immediately. Retain the older
      // exact calculation only as context. Equal amounts are not evidence that
      // an older capture includes this completed result's new movements.
      wallet={...wallet,currentBalanceSource:knownWallet.wallet.currentBalanceSource?{...knownWallet.wallet.currentBalanceSource,historicalContextOnly:true}:undefined};
    }
    const candidateKai=wallet.currentBalanceSource?String(sdk.receizKaiNow().uPulse):undefined;
    const currentCandidate=candidateKai?currentWalletObservation(wallet,knownWallet,candidateKai):null;
    if(wallet.currentBalanceSource&&knownWallet?.historyBasis?.kind==='current-valuation-v129'&&!currentCandidate&&!publishBeforeChart&&!laterSharedCoordinate())return knownWallet.wallet;
    if (publishBeforeChart && !lifetime.signal.aborted) {
      // The authenticated absolute balance is already admitted. A chart worker
      // enriches its presentation; it must not hold a retained payment open.
      const previous = knownWallet?.source === 'account-genesis' ? {...knownWallet, history: knownWallet.history?.map(point=>({...point,userId:wallet.userId}))} : knownWallet;
      const projectedPulse=(response as {wallet?:{sync?:{profileProjectionKaiPulse?:unknown}}}).wallet?.sync?.profileProjectionKaiPulse;
      const retained=previous&&reconcileCompositeWalletObservation(previous,wallet,
        typeof projectedPulse==='number'&&Number.isSafeInteger(projectedPulse)&&projectedPulse>=0?String(BigInt(projectedPulse)*1000000n)
        :previous.chartSource?.composition==='account-only'&&sameWalletFinancialState(previous.wallet,wallet)?previous.historyBasis?.endKaiUPulse??'': '');
      const published=retained??currentCandidate??{...extendWalletHistory(previous,wallet,new Date().toISOString(),candidateKai??String(sdk.receizKaiNow().uPulse)),...(previous?.chartSource?{chartSource:previous.chartSource}:{})};
      knownWallet=published;void persistWalletObservation(published).catch(()=>{});
      if(typeof dispatchEvent==='function')dispatchEvent(new Event('bankeiz:account-observation'));
      setTimeout(()=>{void (async()=>{
        if(lifetime.signal.aborted||knownWallet!==published||hasLocalWalletHead())return;
        const chart=await adoptChartResponse(response,wallet.userId);noteOpen();
        if(knownWallet!==published||hasLocalWalletHead()||protectedChartFrame())return;
        if(chart){knownWallet=chart;void persistWalletObservation(chart).catch(()=>{});if(typeof dispatchEvent==='function')dispatchEvent(new Event('bankeiz:account-observation'));}
        else if(previous?.chartSource&&!retained)await prepareCompositeChart();
      })().catch(()=>{});},0);
      return published.wallet;
    }
    if (!lifetime.signal.aborted) {
      const beforeChart = knownWallet;
      const chart=await adoptChartResponse(response,wallet.userId);noteOpen();
      // Chart preparation may yield while a completed Send adopts a new head.
      // Compare against that current head, never the pre-await observation.
      if((hasLocalWalletHead()||olderSharedCoordinate()||protectedChartFrame()&&knownWallet!==beforeChart||startedRevision!==walletRevision&&!laterSharedCoordinate())&&knownWallet)return knownWallet.wallet;
      const previous = knownWallet?.source === 'account-genesis' ? {...knownWallet, history: knownWallet.history?.map(point=>({...point,userId:wallet.userId}))} : knownWallet;
      const projectedPulse=(response as {wallet?:{sync?:{profileProjectionKaiPulse?:unknown}}}).wallet?.sync?.profileProjectionKaiPulse;
      const retained=previous&&reconcileCompositeWalletObservation(previous,wallet,
        typeof projectedPulse==='number'&&Number.isSafeInteger(projectedPulse)&&projectedPulse>=0?String(BigInt(projectedPulse)*1000000n)
        :previous.chartSource?.composition==='account-only'&&sameWalletFinancialState(previous.wallet,wallet)?previous.historyBasis?.endKaiUPulse??'': '');
      knownWallet = chart ?? retained ?? currentCandidate ?? {...extendWalletHistory(previous, wallet, new Date().toISOString(), candidateKai??String(sdk.receizKaiNow().uPulse)),...(previous?.chartSource?{chartSource:previous.chartSource}:{})};
      if(previous?.chartSource&&!chart&&!retained)void prepareCompositeChart().catch(()=>{});
      void persistWalletObservation(knownWallet).catch(()=>{});
    }
    return knownWallet?.chartSource||knownWallet?.historyBasis?.kind==='current-valuation-v129'||startedRevision!==walletRevision?knownWallet?.wallet??wallet:wallet;
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
    if(before?.wallet.currentBalanceSource&&basis?.kind==='current-valuation-v129'&&!activeNoteOperations&&!lifetime.signal.aborted){
      const next=advanceCurrentWalletObservation(before,String(sdk.receizKaiNow().uPulse));
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
    const withoutDisplayOperands=(wallet:ReturnType<typeof parseSharedWallet>)=>Object.fromEntries(Object.entries(wallet).filter(([field])=>!['reservePhiMicro','settlementPhiMicro','originalProofReferences','reserveFundingSource','currentBalanceSource','balanceSourceSha256'].includes(field)));
    if (!display || sdk.canonicalizeReceizConstitution(withoutDisplayOperands(source)) === sdk.canonicalizeReceizConstitution(withoutDisplayOperands(display.wallet))) return true;
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
    const withoutQuotes = (wallet: ReturnType<typeof parseSharedWallet>) => Object.fromEntries(Object.entries(withoutDisplayOperands(wallet)).filter(([field])=>field!=='totalUsdCents'&&field!=='settlementUsdCents'));
    return sdk.canonicalizeReceizConstitution(withoutQuotes(source)) === sdk.canonicalizeReceizConstitution(withoutQuotes(display.wallet));
  }
  let noteRuntime: BankNoteRuntime | undefined;
  let preparedNoteRuntime: import('./offline-notes').BankPreparedNoteRuntime | undefined;
  const noteOpen = () => { if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.'); };
  let localNotes:BankOfflineNotes|undefined;
  let localNoteInventory:ReturnType<typeof createLocalNoteInventory>|undefined;
  let receivedNoteQueue:ReturnType<typeof createLocalNoteDepositQueue>|undefined;
  let receivedNoteQueueUid:string|undefined;
  let receivedNoteDisplay:import('./offline-notes').BankNoteDepositResult[]=[];
  let connectedNotes:ReturnType<typeof createConnectedNoteApplication>|undefined,connectedNotesUid:string|undefined;
  let noteFileSealer:ReturnType<typeof ownedSealer>|undefined;
  const noteImages=createNoteImageExporter({assertOpen:noteOpen,
    inspect:async image=>(await offlineNotes()).inspect(image),
    verify:async image=>(await sdk.verifyReceizArtifact(new File([new Uint8Array(image)],'note.png',{type:'image/png'}))).status==='verified-artifact',
    seal:async input=>{
      noteFileSealer??=ownedSealer().catch(error=>{noteFileSealer=undefined;throw error;});
      const sealed=await(await noteFileSealer).seal(input);noteOpen();return sealed;
    },
  });
  let noteHistory:ReturnType<typeof import('./note-history').createNoteHistoryReader>|undefined,noteHistoryUid:string|undefined;
  async function noteHistoryReader(){
    noteOpen();const uid=receivingUid();
    if(!noteHistory||noteHistoryUid!==uid){
      const {createNoteHistoryReader}=await import('./note-history');noteOpen();
      if(receivingUid()!==uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');
      // A live receipt and the initial history view can share this lazy import.
      // Recheck after it resolves so both keep the same admitted-source reuse.
      if(!noteHistory||noteHistoryUid!==uid){noteHistoryUid=uid;noteHistory=createNoteHistoryReader({accountUid:uid,keyId:binding.keyId,readConnected:()=>loadConnectedNoteState(binding),readReceived:()=>loadReceivedNoteDepositState(binding),restore:ref=>loadOfflineNoteBlob(binding,ref),module:loadBankNoteRuntime});}
    }
    return noteHistory;
  }
  async function readNoteHistory(){const records=await(await noteHistoryReader()).read();noteOpen();return records;}
  function noteHistoryRecorded(){if(typeof dispatchEvent==='function')dispatchEvent(new CustomEvent('bankeiz:note-history-recorded',{detail:{identityDigest:binding.artifactSha256,accountUid:receivingUid()}}));}
  async function connectedContext(){
    await prepareTransport();const current=await connectClient(BANK_NATIVE_SCOPES,BANK_NATIVE_CONSENT);noteOpen();
    return{uid:receivingUid(),identity:transportKeyFile,passphrase:transportPhrase,request:(path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>})=>current.request(path,options),wallet:()=>current.connect.wallet()};
  }
  function localConnectedNotes(){
    const uid=receivingUid();if(connectedNotes&&connectedNotesUid===uid)return connectedNotes;
    connectedNotesUid=uid;
    connectedNotes=createConnectedNoteApplication({uid,keyId:binding.keyId,assertOpen:()=>{noteOpen();if(receivingUid()!==uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');},
      read:()=>loadConnectedNoteState(binding),write:(next,previous)=>saveConnectedNoteState(binding,next,previous),retain:bytes=>saveOfflineNoteBlob(binding,bytes),restore:ref=>loadOfflineNoteBlob(binding,ref),
      module:loadBankNoteRuntime,context:connectedContext,sdk,artwork:bankNoteArtwork,sealImage:noteImages.exportImage,
      onFundingVerified:(source,opening,proof)=>{void noteHistoryReader().then(reader=>reader.rememberFunding(source,opening,proof)).catch(()=>{});},
      onIssued:()=>{walletRevision++;if(knownWallet){knownWallet={...knownWallet,historyBasis:undefined,walletScope:undefined,quoteHold:createWalletQuoteHold(knownWallet.wallet)};void persistWalletObservation(knownWallet).catch(()=>{});}noteHistoryRecorded();},
    });return connectedNotes;
  }
  function receivingUid(){return accountUid??carriedAccountUid??knownWallet?.wallet.userId??keyFile.owner.uid;}
  function localReceivedNotes(){
    const uid=receivingUid(),context={receiverUserId:uid,receiverKeyId:binding.keyId};
    if(receivedNoteQueue&&receivedNoteQueueUid===uid)return receivedNoteQueue;
    // An empty local genesis may become a native account after first binding.
    // Reopen under that destination; load() still refuses any nonempty foreign
    // checkpoint. Never rewrite or discard a financial row to rebind it.
    receivedNoteQueueUid=uid;
    const assertQueueOpen=()=>{noteOpen();if(receivingUid()!==uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');};
    receivedNoteQueue=createLocalNoteDepositQueue({uid,keyId:binding.keyId,assertOpen:assertQueueOpen,
      read:()=>loadReceivedNoteDepositState(binding),write:(next,previous)=>saveReceivedNoteDepositState(binding,next,previous),
      retain:bytes=>saveOfflineNoteBlob(binding,bytes),restore:ref=>loadOfflineNoteBlob(binding,ref),
      verify:async bytes=>{const module=await loadBankNoteRuntime();return await isConnectedNote(module,bytes)?openConnectedAccountNote(module,bytes,context):module.openBankNoteAccountDeposit(bytes,context);},
      prepare:async bytes=>{
        const module=await loadBankNoteRuntime();assertQueueOpen();
        const body=await isConnectedNote(module,bytes)?await prepareConnectedAccountNoteClaim({module,bytes,context:await connectedContext(),encode:sdk.receizBase64UrlEncode}):new TextEncoder().encode(JSON.stringify(await module.prepareBankNoteAccountDepositSubmission(bytes,context)));
        assertQueueOpen();return body;
      },
      submit:async(bytes,{recoverFirst,preparedRequestBytes})=>{
        assertQueueOpen();
        const module=await loadBankNoteRuntime();
        if(await isConnectedNote(module,bytes)){
          if(!preparedRequestBytes)throw Error('BANK_NOTE_SOURCE_REQUIRED');
          const credited=await submitConnectedAccountNoteClaim({module,bytes,prepared:preparedRequestBytes,recoverFirst,context:await connectedContext(),decode:sdk.receizBase64UrlDecode,onCreditVerified:(source,proof)=>{void noteHistoryReader().then(reader=>reader.rememberCredit(source,proof)).catch(()=>{});}});assertQueueOpen();return credited;
        }
        const held=await module.openBankNoteAccountDeposit(bytes,context);
        const current=await connectClient(BANK_NATIVE_SCOPES,BANK_NATIVE_CONSENT),path=`/api/connect/offline-notes/redemption?origin=${encodeURIComponent(location.origin)}`;
        assertQueueOpen();
        const recovered=recoverFirst?await current.request(`${path}&noteId=${encodeURIComponent(held.noteId)}`,{method:'GET'})as {found?:boolean}:{found:false};assertQueueOpen();
        let response:unknown=recovered;
        if(recovered.found===false){
          const body=preparedRequestBytes?JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(preparedRequestBytes)):await module.prepareBankNoteAccountDepositSubmission(held.terminalSourceBytes,context);
          response=await current.request(path,{method:'POST',body});
        }
        const credit=await module.verifyBankNoteAccountDepositCredit(response,bytes,context);noteOpen();return credit;
      },
    });return receivedNoteQueue;
  }
  async function paintReceivedNotes(){receivedNoteDisplay=await localReceivedNotes().list({pendingOnly:true});noteOpen();if(typeof dispatchEvent==='function')dispatchEvent(new Event('bankeiz:account-observation'));}
  async function finishSelfDeposits(){const connected=localConnectedNotes();for(const id of await connected.pendingSelfDeposits()){const confirmed=await localReceivedNotes().confirmed(id);noteOpen();if(confirmed)await connected.confirmSelfDeposit(id,confirmed.proofBytes);}}
  async function reconcileReceivedNotesLocked(refresh=false){
    const queue=localReceivedNotes(),before=await queue.list({pendingOnly:true});
    if(!before.some(note=>note.status==='received')){await finishSelfDeposits();return;}
    if(typeof navigator!=='undefined'&&navigator.onLine===false)throw Error('BANK_NOTE_DEPOSIT_RECONCILIATION_REQUIRED');
    // Each exact credit is committed durably before the next submission. A
    // later failure must not leave a confirmed amount in Received Notes or let
    // an older in-flight wallet observation replace the execution boundary.
    try{await queue.reconcile();}
    finally{noteOpen();await finishSelfDeposits();walletRevision++;await paintReceivedNotes();noteHistoryRecorded();}
    if(refresh)await readAndAdoptWallet();
  }
  function synchronizeReceivedNotes(){
    return withAccountExecutionLock(()=>navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},async()=>{await assertNoOtherPending(false);await reconcileReceivedNotesLocked(true);}));
  }
  let receivedNotesStarted=false;
  function startReceivedNotes(){
    if(receivedNotesStarted)return;receivedNotesStarted=true;
    // Optional retention opens after the admitted account frame. Empty queues
    // load neither the native proof module nor a transport session.
    void paintReceivedNotes().then(()=>{if(receivedNoteDisplay.some(note=>note.status==='received')&&navigator.onLine!==false)return synchronizeReceivedNotes();}).catch(()=>{});
    if(typeof addEventListener==='function')addEventListener('online',()=>{if(receivedNoteDisplay.some(note=>note.status==='received'))void synchronizeReceivedNotes().catch(()=>{});},{signal:lifetime.signal});
  }
  async function assertNoPendingWalletSend(){noteOpen();if(await hasPendingMarketTrade(await loadMarketTradeState(binding)))throw Error('BANK_EXECUTION_PENDING');if(hasPendingWalletSend(await loadWalletSendState(binding)))throw Error('BANK_EXECUTION_PENDING');noteOpen();}
  async function notePending(){
    const legacy=await localNoteInventory!.pending(),connected=await localConnectedNotes().pending();
    if(legacy&&connected)throw Error('BANK_NOTE_COMPETING_ATTEMPTS');return connected??legacy;
  }
  async function assertNoteCreateState(){if(!await notePending())await assertNoOtherPending();if(!BANK_PREPARED_NOTE_CREDIT_ENABLED&&await localNoteInventory!.preparedPending())throw Error('BANK_NOTE_PREPARED_RECOVERY_REQUIRED');}
  async function noteLock<T>(run:()=>Promise<T>){if(!navigator.locks)throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');return navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},run);}
  async function offlineNotes():Promise<BankOfflineNotes>{
    noteOpen();if(localNotes)return localNotes;
    // Inspection opens the complete note image, without constructing signing
    // custody or modifying either encrypted financial state family.
    const inspect=async(image:Uint8Array)=>{
      const module=await loadBankNoteRuntime();noteOpen();
      if(await isConnectedNote(module,image)){const note=await readConnectedNote(module,image);noteOpen();return {...note,consumption:'connection-required' as const};}
      if(module.isBankNoteAccountDeposit(image)){const note=await module.readBankNoteAccountDeposit(image);noteOpen();return {rail:note.rail,noteId:note.noteId,amountPhiMicro:note.amountPhiMicro,amountUsdCents:note.amountUsdCents};}
      const readonly=module.createBankOfflineNotesRuntime({keyId:binding.keyId,uid:accountUid??carriedAccountUid??knownWallet?.wallet.userId??keyFile.owner.uid,localUid:keyFile.owner.uid,origin:location.origin,passphrase:phrase,
        request:async()=>{throw Error('BANK_NOTE_EXPLICIT_ACTION_REQUIRED');},fetchImpl:async()=>{throw Error('BANK_NOTE_EXPLICIT_ACTION_REQUIRED');},sealDocument:async()=>{throw Error('BANK_NOTE_EXPLICIT_ACTION_REQUIRED');},
        read:async()=>{throw Error('BANK_NOTE_EXPLICIT_ACTION_REQUIRED');},write:async()=>{throw Error('BANK_NOTE_EXPLICIT_ACTION_REQUIRED');},retain:async()=>{throw Error('BANK_NOTE_EXPLICIT_ACTION_REQUIRED');},restore:(ref:string)=>loadOfflineNoteBlob(binding,ref),assertOpen:noteOpen,artwork:bankNoteArtwork});
      return readonly.inspectNote(image);
    };
    const inventory=createLocalNoteInventory({keyId:binding.keyId,uid:()=>accountUid??knownWallet?.wallet.userId??null,readLegacy:()=>atNoteStage('saved-notes',()=>loadOfflineNoteState(binding)),readPrepared:()=>atNoteStage('prepared-notes',()=>loadPreparedNoteState(binding)),restore:ref=>atNoteStage('note-image',()=>loadOfflineNoteBlob(binding,ref)),inspect,assertOpen:noteOpen});
    localNoteInventory=inventory;
    const action=async<T,>(operation:()=>Promise<T>):Promise<T>=>{noteOpen();activeNoteOperations++;noteOperationEpoch++;try{return await operation();}finally{activeNoteOperations--;}};
    localNotes={exportImage:noteImages.exportImage,savedNotes:async()=>[...await inventory.savedNotes(),...(await localConnectedNotes().savedNotes()).map(note=>({...note,consumption:'connection-required' as const}))],pending:notePending,inspect,receivedNotes:()=>localReceivedNotes().list(),reconcileReceivedNotes:async()=>{await synchronizeReceivedNotes();return localReceivedNotes().list();},
      validateDeposit:async image=>{
        const module=await loadBankNoteRuntime(),uid=receivingUid();noteOpen();
        await validateNativeNoteDeposit({image,module,context:{receiverUserId:uid,receiverKeyId:binding.keyId},connected:localConnectedNotes(),savedNotes:()=>inventory.savedNotes(),inspectLegacy:inspect,
          holdsLegacyReceivingCustody:source=>holdsLegacyNoteReceivingCustody({image:source,uid,keyId:binding.keyId,read:()=>loadOfflineNoteState(binding),inspectCommitment:async bytes=>(await import('./note-proof-portability')).inspectLegacyReceivingCommitment(bytes)}),
          holdsReceivingCustody:async source=>{
            if(!BANK_PREPARED_NOTE_CREDIT_ENABLED||!module.createBankPreparedBrowserRuntime)return false;
            const deny=async()=>{throw Error('BANK_NOTE_EXPLICIT_ACTION_REQUIRED');};
            // This reader neither enrolls nor sends the identity anywhere. A
            // clear original needs only a protected in-memory parser input.
            const passphrase=transportKeyFile.crypto.privateKeyPkcs8B64u?sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32))):transportPhrase;
            const identity=transportKeyFile.crypto.privateKeyPkcs8B64u?await protectIdentityKeyFile(transportKeyFile,passphrase):transportKeyFile;
            const reader=module.createBankPreparedBrowserRuntime({identity,keyId:binding.keyId,uid,localUid:keyFile.owner.uid,passphrase,origin:location.origin,assertOpen:noteOpen,
              read:()=>loadPreparedNoteState(binding),restore:(ref:string)=>loadOfflineNoteBlob(binding,ref),write:deny,retain:deny,fetchImpl:deny,sealDocument:deny,artwork:deny});
            return reader.holdsReceivingCustody(source);
          },
        });
        noteOpen();if(receivingUid()!==uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');
      },
      recoverDeposit:async image=>{
        const module=await loadBankNoteRuntime();noteOpen();
        if(await isConnectedNote(module,image)||module.isBankNoteAccountDeposit(image)){
          const connected=await isConnectedNote(module,image),row=connected?await readConnectedNote(module,image):await inspect(image);
          return withAccountExecutionLock(()=>noteLock(async()=>{
            await assertNoOtherPending(false);
            return recoverConnectedNoteDeposit({noteId:row.noteId,funding:connected&&'kind'in row&&row.kind==='funding',connected:localConnectedNotes(),received:localReceivedNotes(),reconcile:()=>reconcileReceivedNotesLocked(true)});
          }));
        }
        const row=await inspect(image),saved=await loadOfflineNoteState(binding) as {schema?:string;deposits?:Record<string,unknown>}|null;noteOpen();
        // The existing runtime reopens its original intent and GET recovery.
        // No saved attempt means Check must not create a new redemption.
        if(saved?.schema!=='receiz.bank.offline-notes-device.v1'||!saved.deposits?.[row.noteId])return null;
        return(await openNotesExecution()).deposit(image);
      },
      review:amount=>action(()=>withAccountExecutionLock(async()=>{
        await assertNoteCreateState();const pending=await notePending();
        if(pending){if(pending.amountUsdCents!==amount)throw Error('BANK_NOTE_EXACT_RESUME_REQUIRED');return{...pending,rail:pending.rail??'reserve'};}
        if(navigator.onLine===false)throw Error('BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');
        if(!BANK_CONNECTED_NOTE_ISSUANCE_ENABLED)throw Error('BANK_NOTE_SERVICE_UNAVAILABLE');
        await connectedContext();return noteLock(()=>localConnectedNotes().review(amount));
      })),
      prepareResources:count=>action(()=>withAccountExecutionLock(async()=>{await assertNoPendingWalletSend();return(await openNotesExecution()).prepareResources!(count);})),
      create:(amount,rail)=>action(()=>withAccountExecutionLock(async()=>{
        await assertNoteCreateState();
        const connected=await localConnectedNotes().pending();let legacy=await inventory.pending();
        if(!connected&&BANK_CONNECTED_NOTE_ISSUANCE_ENABLED&&legacy&&navigator.onLine!==false){
          // A pre-upgrade registration attempt has no allocation while it is
          // still preparing. Retire it through the existing local cancellation
          // checks before selecting connected creation. Funded, unknown and
          // issuing attempts retain their original recovery path.
          await noteLock(async()=>{const held=await loadOfflineNoteState(binding) as {create?:{phase?:string}}|null;if(held?.create?.phase==='preparing')await cancelUnsentNotesLocked();});
          legacy=await inventory.pending();
        }
        if(connected||BANK_CONNECTED_NOTE_ISSUANCE_ENABLED&&!legacy&&navigator.onLine!==false){
          if(!connected)await connectedContext();
          return noteLock(async()=>{await assertNoteCreateState();const result=await localConnectedNotes().create(amount,rail);return{...result,consumption:'connection-required' as const};});
        }
        if(!legacy&&navigator.onLine===false&&!BANK_PREPARED_NOTE_CREDIT_ENABLED)throw Error('BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');
        try{return await(await openNotesExecution()).create(amount,rail??legacy?.rail);}
        catch(cause){await cancelRejectedNotePreparation(cause);throw cause;}
      })),
      cancelUnfunded:()=>action(()=>withAccountExecutionLock(async()=>{if(await localConnectedNotes().pending())return noteLock(()=>localConnectedNotes().cancelUnfunded());if(await inventory.preparedPending())throw Error('BANK_NOTE_PREPARED_RECOVERY_REQUIRED');return(await openNotesExecution()).cancelUnfunded();})),
      receivingRequest:()=>action(async()=>{
        // First native binding is necessary routing discovery, using the same
        // admitted account access. Known destinations require no request.
        if(receivingUid().startsWith('receiz_device_'))await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);
        const module=await loadBankNoteRuntime();noteOpen();return module.createBankNoteAccountReceivingRequest({identity:keyFile,passphrase:phrase,accountUserId:receivingUid()});
      }),
      transfer:(id,request)=>action(async()=>await localConnectedNotes().hasNote(id)?withAccountExecutionLock(()=>noteLock(()=>localConnectedNotes().transfer(id,request))):(await openNotesExecution()).transfer(id,request)),
      deposit:image=>action(async()=>{
        const module=await loadBankNoteRuntime();noteOpen();
        if(!await isConnectedNote(module,image)&&!module.isBankNoteAccountDeposit(image))return(await openNotesExecution()).deposit(image);
        const result=await withAccountExecutionLock(()=>navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},async()=>{
          let original=image;
          if(await isConnectedNote(module,image)){
            const held=await readConnectedNote(module,image);
            if(await localReceivedNotes().confirmed(held.noteId))throw Error('BANK_NOTE_ALREADY_DEPOSITED');
            if(held.kind==='funding'&&await localConnectedNotes().hasNote(held.noteId)){
              const request=await module.createBankNoteAccountReceivingRequest({identity:keyFile,passphrase:phrase,accountUserId:receivingUid()});
              original=(await localConnectedNotes().prepareSelfDeposit(held.noteId,request)).sourceBytes;
            }
          }
          const received=await localReceivedNotes().receive(original);
          if(received.status==='confirmed')throw Error('BANK_NOTE_ALREADY_DEPOSITED');
          await paintReceivedNotes();return received;
        }));
        if(navigator.onLine!==false)void synchronizeReceivedNotes().catch(()=>{});
        return result;
      }),
    };
    return localNotes;
  }
  // Called only under execution → Notes locks. The pinned runtime owns the
  // cancellation: preparing is local; funding requires its durable host
  // tombstone. Issuing, prepared custody and unreadable state are never cleared.
  async function cancelUnsentNotesLocked():Promise<void>{
    const pending=await(await offlineNotes()).pending();
    if(!pending?.canCancel)return;
    noteOpen();activeNoteOperations++;noteOperationEpoch++;
    try{
      if(await localConnectedNotes().pending()){await localConnectedNotes().cancelUnfunded();noteOpen();return;}
      const state=await loadOfflineNoteState(binding) as {create?:{phase?:string}}|null;
      if(state?.create?.phase!=='preparing')await atNoteStage('identity-transport',prepareTransport);
      const module=await loadBankNoteRuntime();noteOpen();
      const forbidden=async()=>{throw Error('BANK_NOTE_CANCELLATION_ONLY');};
      const cancellation=module.createBankOfflineNotesRuntime({keyId:binding.keyId,uid:accountUid??carriedAccountUid??knownWallet?.wallet.userId??keyFile.owner.uid,localUid:keyFile.owner.uid,origin:location.origin,passphrase:transportPhrase,
        request:async(path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>})=>{noteOpen();const current=await connectClient(BANK_NATIVE_SCOPES,BANK_NATIVE_CONSENT);const result=await current.request(path,options);noteOpen();return result;},
        fetchImpl:forbidden,sealDocument:forbidden,retain:forbidden,restore:(ref:string)=>loadOfflineNoteBlob(binding,ref),read:()=>loadOfflineNoteState(binding),write:(next:unknown,previous:unknown)=>saveOfflineNoteState(binding,next,previous),assertOpen:noteOpen,artwork:bankNoteArtwork});
      await cancellation.cancelUnfunded();noteOpen();
    }finally{activeNoteOperations--;}
  }
  // The execution lock is still held after Create releases its Note lock.
  // Only a known registration refusal and an independently reopened preparing
  // phase permit local cancellation. Unknown funding and stronger custody stay
  // retained; cleanup failure must never replace the original diagnostic.
  async function cancelRejectedNotePreparation(cause:unknown):Promise<void>{
    if(!(cause instanceof Error)||!/^(?:OFFLINE_NOTE_CUSTODY_UNSUPPORTED:)?OFFLINE_NOTE_CUSTODY_(?:ATTESTATION_NOT_PROVIDED|ATTESTATION_FORMAT_UNSUPPORTED|ATTESTATION_CHAIN_REQUIRED|BACKUP_CAPABLE|BACKUP_ELIGIBLE|BACKUP_STATE|BACKED_UP|COUNTER_UNAVAILABLE)$/.test(cause.message))return;
    try{
      await navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},async()=>{
        noteOpen();
        const state=await loadOfflineNoteState(binding) as {create?:{phase?:string}}|null;
        if(state?.create?.phase==='preparing')await cancelUnsentNotesLocked();
      });
    }catch{/* Keep the exact pending source and original registration error. */}
  }
  const cancelUnsentNotes=async():Promise<void>=>{await withAccountExecutionLock(async()=>{await navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},cancelUnsentNotesLocked);});};
  async function openNotesExecution(): Promise<BankOfflineNotes> {
    noteOpen(); await atNoteStage('identity-transport',prepareTransport); noteOpen();
    accountUid ??= knownWallet?.wallet.userId ?? null;
    if (!accountUid) await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT);
    if (!noteRuntime) {
      const module = await loadBankNoteRuntime(); await atNoteStage('device-signer',ownedSealer);
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
        fetchImpl:createBankNoteAttestationFetch({origin:location.origin,request:async(path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>})=>{noteOpen();const current=await connectClient(BANK_NATIVE_SCOPES,BANK_NATIVE_CONSENT);return current.request(path,options);},signal:lifetime.signal}),
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
      prepareResources:count=>lock(async()=>{await assertNoPendingWalletSend();return local().prepareResources(count);}),
      savedNotes: async () => [...await held.savedNotes(), ...(prepared ? await prepared.savedNotes() : [])],
      pending: async () => await prepared?.pending() ?? held.pending(),
      create: (amount, rail = 'reserve') => lock(async () => {
        // Recheck after asynchronous setup, while holding the existing device
        // operation lock. A competing tab may have retained an attempt meanwhile.
        await assertNoteCreateState();
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
        await assertNoPendingWalletSend();await prepared.prepareResources({notes:2,receivers:1});return prepared.receivingRequest();
      }),
      transfer: (noteId, request) => lock(async () => prepared && (await prepared.savedNotes()).some(note=>note.noteId===noteId) ? local().transferNote(noteId,request) : held.transferNote(noteId, request)),
      inspect: image => held.inspectNote(image),
      deposit: image => lock(async () => {
        if (BANK_PREPARED_NOTE_CREDIT_ENABLED && prepared && await prepared.holdsReceivingCustody(image)) return prepared.depositNote(image,transportKeyFile);
        const result = await held.depositNote(image); noteOpen(); void readWallet().catch(() => {}); return result; }),
    };
  }
  let qualificationReader:ReturnType<typeof import('../qualification/source').createQualificationProgressReader>|undefined;
  async function originalsQualification(){
    noteOpen();const uid=receivingUid();
    if(!qualificationReader){
      const {createQualificationProgressReader}=await import('../qualification/source');noteOpen();
      qualificationReader=createQualificationProgressReader(uid,async()=>{
        const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);noteOpen();
        if(clientAccounts.get(current)?.accountUid!==uid)throw Error('QUALIFICATION_ACCOUNT_MISMATCH');
        return current.request(`/api/connect/originals-qualification?applicationId=${BANK_APPLICATION_ID}`,{method:'GET'});
      },()=>!lifetime.signal.aborted&&receivingUid()===uid);
    }
    return qualificationReader.read();
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
  async function beginCardDeposit(amount: string, approved: boolean, paymentReference?:string, checkoutContext?:import('./wallet-send').CheckoutContext) {
    if (!approved) throw new Error('Approve this card deposit before continuing.');
    const exact = parseDepositDollars(amount);
    if(paymentReference){
      if(!/^[a-f0-9-]{36}$/i.test(paymentReference))throw Error('BANK_WALLET_FUNDING_REFERENCE_INVALID');
      const retained=(await loadCardOperations(binding)).map(readCardOperation).find(value=>value?.operationId===paymentReference);
      if(retained){if(retained.amountUsdCents!==exact.amountUsdCents||retained.applicationId!==BANK_APPLICATION_ID)throw Error('BANK_WALLET_FUNDING_MISMATCH');if(retained.stage==='ready')return retained.checkout!;throw Error('Your saved checkout is still being confirmed. Keep this device and check again.');}
    }
    const previous = readCardOperation(await loadCardOperation(binding));
    if (previous?.stage === 'creating') throw new Error(`Your previous checkout’s result is unknown. Keep its reference and resolve it before starting another: ${previous.operationId}`);
    const current = await connectClient(BANK_CARD_SCOPES, BANK_CARD_CONSENT);
    const returnUrl = checkoutContext?(checkoutContext.booking?(await import('./paid-booking')).buildPaidBookingReturn(checkoutContext,location.origin):buildCheckoutReturn(checkoutContext,location.origin)):`${location.origin}/?cardReturn=1${paymentReference?'&sendReturn=1':''}&session_id={CHECKOUT_SESSION_ID}`;
    const operation = { schema: 'receiz.bank.card-operation.v1', applicationId: BANK_APPLICATION_ID, stage: 'creating', operationId: paymentReference??crypto.randomUUID(), amountUsdCents: exact.amountUsdCents };
    await saveCardOperation(binding, operation, true, previous?.operationId, Boolean(previous));
    // A known checkout is retained for explicit resumption; a new reviewed amount
    // is a distinct user intent. A timeout or malformed reply retains this attempt. Never create another
    // checkout merely because the response was not delivered.
    const fundingRequest:Parameters<typeof current.connect.checkout>[0]&{accountFunding:true}={ accountFunding:true,amountUsd: exact.amountUsd, currency: 'usd', uiMode: 'embedded', returnUrl, successUrl: returnUrl, referenceId: operation.operationId, description: 'Bankeiz Reserve deposit' };
    const checkout = parseCardCheckout(await current.connect.checkout(fundingRequest), exact.amountUsdCents);
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
  async function checkCardDeposit(checkout: CardCheckout, beforeCredit?:()=>Promise<void>, cancel=false) {
    const operation = (await loadCardOperations(binding)).map(readCardOperation).find(value => value?.checkout?.sessionId === checkout.sessionId && value.checkout.amountUsdCents === checkout.amountUsdCents);
    if (!operation?.checkout) throw new Error('Open your actual unfinished deposit before checking it.');
    const current = await connectClient(BANK_CARD_SCOPES, BANK_CARD_CONSENT, operation.applicationId);
    const status = cancel?await cancelCardCheckout(current,checkout,accountUid!):parseCardDepositStatus(await current.connect.checkoutSession({ sessionId: checkout.sessionId }), checkout.sessionId, checkout.amountUsdCents, accountUid!);
    if(status.status==='credited'&&beforeCredit)await beforeCredit();
    // A generic deposit-return screen cannot discard the paid session before
    // the saved Send approval has retained its credit and continued payment.
    const send=['credited','expired','unpaid'].includes(status.status)?await loadWalletSendState(binding) as import('./wallet-send').WalletSendState|null:null;
    const matchingSend=send?.current.status==='funding'&&send.current.funding?.amountUsdCents===checkout.amountUsdCents&&(send.current.funding?.checkout?.sessionId===checkout.sessionId||send.current.body.clientNonce===operation.operationId);
    let retainedForSend=matchingSend&&(!beforeCredit||send.current.funding?.stage!=='credited');
    if(cancel&&matchingSend&&['expired','unpaid'].includes(status.status)){
      const api=await walletSend();
      try{await api.cancelFunding(send.current.body.clientNonce);}catch(error){if((await api.retainedResult(send.current.body.clientNonce))?.outcome.status!=='not-sent')throw error;}
      retainedForSend=false;
    }
    if (['credited', 'expired', 'unpaid'].includes(status.status)&&!retainedForSend) await saveCardOperation(binding, null, false, operation.operationId);
    return status;
  }
  async function projectOwnedSource(exact:Uint8Array,filename:string,verified?:import('@receiz/sdk').ReceizOpenedArtifact){
    const opened=verified??await unsigned.artifacts.verifyAndOpen(new File([new Uint8Array(exact)],filename));
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
  let receivedProofPromise:Promise<import('./received-proof').ReceivedProof>|undefined;
  const receivedProof=()=>receivedProofPromise??=import('./received-proof').then(({createReceivedProof})=>createReceivedProof({
    owner:binding.artifactOwnerReceizId,assertOpen:()=>lifetime.signal.throwIfAborted(),
    open:file=>unsigned.artifacts.verifyAndOpen(file),
    claim:async source=>{const current=await connectClient([...BANK_READ_SCOPES,'receiz:record','receiz:seal'],'Receive the exact bearer original I review into this Receiz identity. This appends its native ownership claim and retains the complete proof; it does not authorize a payment or credit cash.');lifetime.signal.throwIfAborted();return current.ownership.claimBearerAsset(source);},
    retain:async(sources,opened)=>{const owned=sources.find(source=>source.kind==='owned-source');if(!owned)throw Error('PROOF_RECEIVE_SUCCESSOR_REQUIRED');await projectOwnedSource(owned.bytes,owned.filename,opened);lifetime.signal.throwIfAborted();await retainProofBatch(binding,sources);},
    store:{read:()=>loadReceivedProofState(binding),write:(next,previous)=>saveReceivedProofState(binding,next,previous)},
    lock:async run=>{if(!navigator.locks)throw Error('PROOF_RECEIVE_DEVICE_LOCK_REQUIRED');return navigator.locks.request(`receiz-bank-received-proof:${binding.artifactSha256}`,{signal:lifetime.signal},run);},
  })).catch(cause=>{receivedProofPromise=undefined;throw cause;});
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
  async function openAssetPublicationRuntime(artwork?:Blob){
    const [adoption,{loadAssetPublicationRuntime,createAssetPublicationFetch},username]=await Promise.all([import('./asset-publication-adoption'),import('./asset-publication-runtime'),prepareReceivingUsername()]);
      const connected=await connectClient([...BANK_READ_SCOPES,'profile','receiz:record','receiz:seal'],'Seal the original I choose and publish its exact verified source, media and full text on my public profile and in Market. This does not authorize a payment or asset funding.'),account=clientAccounts.get(connected),request=clientFetches.get(connected);
      if(!account||!request||account.applicationId!==BANK_APPLICATION_ID)throw Error('BANK_ASSET_PUBLICATION_ACCOUNT_CHANGED');
      const assertCurrent=()=>{lifetime.signal.throwIfAborted();if(clientAccounts.get(connected)?.accountUid!==account.accountUid||presentationUsername&&presentationUsername!==username)throw Error('BANK_ASSET_PUBLICATION_ACCOUNT_CHANGED');};
      const [native,{createReceizIndexedDbSealStore},publication]=await Promise.all([loadBankNoteRuntime(),import('@receiz/sdk/offline'),loadAssetPublicationRuntime()]);
      await ownedSealer();
      const enrollment=await createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer').load();
      if(!enrollment||!sealingResources)throw Error('Your device sealing key is unavailable.');
      const sealDocument=await native.createBankNativeNoteSealer({enrollment,resources:sealingResources});
      return publication.createConnectedAssetPublicationRuntime({identity:new Uint8Array(bytes),passphrase:phrase,account:{uid:account.accountUid,username},sealDocument,assertCurrent,onLocalAdmission:admission=>{assertCurrent();adoption.retainAssetPublicationAdmission(admission,{identityDigest:binding.artifactSha256,accountUid:account.accountUid,isCurrent:()=>!lifetime.signal.aborted&&clientAccounts.get(connected)?.accountUid===account.accountUid&&(!presentationUsername||presentationUsername===username),artwork});},fetchImpl:createAssetPublicationFetch({applicationId:BANK_APPLICATION_ID,username,assertCurrent,request:async(path,init)=>{const held=await loadDeviceIdentity();if(!held||await sdk.sha256ReceizBytes(held.bytes)!==binding.artifactSha256)throw Error('BANK_ASSET_PUBLICATION_ACCOUNT_CHANGED');return request(path,init);}})});
  }
  async function createAsset(input: AssetDefinition | null, draft?: AssetMomentDraft, localOnly=false, composed?:AssetComposerDraft): Promise<HeldDeposit> {
    lifetime.signal.throwIfAborted();
    const definition = input ? validateAssetDefinition(input) : null;
    const linked = definition?.linkedProofDigest ? (await listDeposits()).find(source => source.kind === 'proof' && source.digest === definition.linkedProofDigest) : null;
    if (definition?.linkedProofDigest && !linked) throw new Error('The selected original proof is no longer held by this ID.');
    const moment=draft?await(await import('./asset-moment')).prepareAssetMoment(draft):null;
    lifetime.signal.throwIfAborted();
    let intent:unknown=definition?{definition,linkedSource:linked?{digest:linked.digest,filename:linked.filename,exactArtifactB64u:sdk.receizBase64UrlEncode(linked.bytes)}:null,...(moment?{moment}:{})}:undefined;
    const {createAssetPublication}=await import('./asset-publication'),{loadAssetPublicationState,saveAssetPublicationState}=await import('./identity-vault');
    const adoption=await import('./asset-publication-adoption');let publicationDigest:string|undefined;
    let attemptSealer:ReturnType<typeof ownedSealer>|undefined;
    const openAttemptSealer=()=>attemptSealer??=ownedSealer();
    let publicationRuntime:Promise<Awaited<ReturnType<import('./asset-publication-runtime').AssetPublicationRuntimeModule['createConnectedAssetPublicationRuntime']>>>|undefined;
    const openPublicationRuntime=()=>publicationRuntime??=openAssetPublicationRuntime(composed?.files.find(file=>file.role==='cover')?.file??(composed?.kind==='image'?composed.files.find(file=>file.role==='primary')?.file:undefined));
    if(composed){if(!definition||definition.linkedProofDigest)throw Error('BANK_ASSET_COMPOSER_DEFINITION_INVALID');const {validateComposerAssetDraft,readComposerCapacity}=await import('./asset-composer');const selected=validateComposerAssetDraft({...composed,title:definition.name,description:definition.description,definition},readComposerCapacity());intent={composer:await(await openPublicationRuntime()).prepareContent(selected)};}
    const publication=createAssetPublication({ownerReceizId:binding.artifactOwnerReceizId,assertOpen:()=>lifetime.signal.throwIfAborted(),
      lock:async run=>{if(!navigator.locks)throw Error('BANK_ASSET_PUBLICATION_DEVICE_LOCK_REQUIRED');return await navigator.locks.request(`receiz-bank-asset-publication:${binding.artifactSha256}`,{signal:lifetime.signal},async()=>await run());},
      read:()=>loadAssetPublicationState(binding),write:(next,previous)=>saveAssetPublicationState(binding,next,previous),
      readIntent:async file=>{
        const exact=new Uint8Array(await file.arrayBuffer()),opened=await unsigned.artifacts.verifyAndOpen(file);
        projectHeldDeposit(opened,exact,file.name,binding.artifactOwnerReceizId);publicationDigest=opened.sealedArtifact.artifactSha256;adoption.retainAssetPublicationSource(publicationDigest,file);
        const carried=JSON.parse(new TextDecoder().decode(opened.verifiedPayload.bytes));
        if(carried?.schema==='receiz.bank.asset-content.v2')return{composer:(await import('./asset-composer')).readComposerAssetContent(carried,binding.artifactOwnerReceizId)};
        if(carried?.schema!=='receiz.bank.asset-definition.v1')throw Error('BANK_ASSET_PUBLICATION_SOURCE_INVALID');
        const definition=validateAssetDefinition(carried.definition);if(carried.moment)await(await import('./asset-moment')).readAssetMoment(carried.moment);
        return{definition,linkedSource:carried.linkedSource??null,...(carried.moment?{moment:carried.moment}:{})};
      },
      seal:async()=>{
        if(!intent||!definition)throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');
        if(composed)return(await(await openPublicationRuntime()).sealContent((intent as {composer:import('./asset-composer').ComposerAssetContent}).composer)).artifact;
        const payload={schema:'receiz.bank.asset-definition.v1',...intent,issuerReceizId:binding.artifactOwnerReceizId,createsSpendableValue:false,backingCommitted:false,kai:sdk.receizKaiNow()},payloadBytes=new TextEncoder().encode(JSON.stringify(payload));
        if(payloadBytes.length>10*1024*1024)throw Error('This moment and its linked proof exceed the supported combined capacity. Use smaller originals.');
        const sealer=await openAttemptSealer();lifetime.signal.throwIfAborted();
        const sealed=await sealer.seal({bytes:payloadBytes,filename:`${definition.symbol.toLowerCase()}.receiz-asset.json`,mimeType:'application/json'});
        return new File([new Uint8Array(sealed.artifactBytes)],sealed.filename,{type:sealed.mimeType});
      },
      retain:async file=>{const held=await holdProof(file);publicationDigest=held.digest;adoption.retainAssetPublicationSource(held.digest,file);return held.digest;},
      restore:async(digest,filename,mimeType)=>{for(const source of await loadDepositSources(binding)){if(await sdk.sha256ReceizBytes(source.bytes)===digest)return new File([new Uint8Array(source.bytes)],filename,{type:mimeType});}throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');},
      publish:async file=>{const receipt=await(await openPublicationRuntime()).publish(file);lifetime.signal.throwIfAborted();if(!publicationDigest)throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');adoption.acknowledgeAssetPublication(publicationDigest,receipt);if(receipt.status==='published')void adoption.refreshAssetPublicationCatalog(publicationDigest);return receipt;},
    });
    const result=localOnly?await publication.pending():input?await publication.create(intent):await publication.resume();
    if(!result)throw Error('BANK_ASSET_PUBLICATION_NONE');
    const deposit=await projectOwnedSource(new Uint8Array(await result.file.arrayBuffer()),result.file.name);
    return Object.assign(deposit,{publication:result.publication});
  }
  async function publishAssetToMarket(source:HeldDeposit):Promise<HeldDeposit>{
    noteOpen();let held:Awaited<ReturnType<typeof loadDepositSources>>[number]|undefined;for(const value of await loadDepositSources(binding))if(await sdk.sha256ReceizBytes(value.bytes)===source.digest){held=value;break;}
    if(!held||await sdk.sha256ReceizBytes(held.bytes)!==source.digest)throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');
    const file=new File([new Uint8Array(held.bytes)],source.filename,{type:'application/vnd.receiz.bundle+json'}),runtime=await openAssetPublicationRuntime();noteOpen();
    const receipt=await runtime.publish(file,async input=>{
      const {readAssetPbiCredential}=await import('./asset-pbi-credential'),{signAssetMarketPublication}=await import('./asset-market-pbi');noteOpen();
      const uid=accountUid??knownWallet?.wallet.userId;if(!uid)throw Error('PBI_ACCOUNT_MISMATCH');let credential=readAssetPbiCredential(binding.keyId,uid);
      if(!credential){const {connectPbiToAccount}=await import('./pbi-account-connect');await connectPbiToAccount({binding,backup:()=>({bytes:new Uint8Array(bytes),filename,phrase}),knownWallet:()=>knownWallet,readWallet},noteOpen);noteOpen();credential=readAssetPbiCredential(binding.keyId,uid);}
      if(!credential)throw Error('PBI_ACCOUNT_CREDENTIAL_REQUIRED');
      return signAssetMarketPublication(input,credential,noteOpen);
    });noteOpen();
    const adoption=await import('./asset-publication-adoption');adoption.acknowledgeAssetPublication(source.digest,receipt);
    if(receipt.status==='published')void adoption.refreshAssetPublicationCatalog(source.digest);
    const delivery:import('./asset-publication').AssetPublicationDelivery=receipt.status==='published'?{status:'published',showcaseArtifactDigest:receipt.artifactDigest}:{status:receipt.status,code:receipt.code};
    return {...source,pbiSigned:true,publication:source.publication?.status==='published'?source.publication:delivery,marketPublication:delivery};
  }
  let backedPublicationPromise:Promise<import('./backed-asset-client').BackedAssetClient>|undefined;
  const backedAssetPublication=()=>backedPublicationPromise??=import('./backed-asset-client').then(async({createBackedAssetClient})=>{
    const vault=await import('./identity-vault');return createBackedAssetClient({ownerReceizId:binding.artifactOwnerReceizId,assertOpen:noteOpen,
      lock:async run=>await navigator.locks.request(`receiz-bank-backed-publication:${binding.artifactSha256}`,{signal:lifetime.signal},async()=>await run()),
      read:()=>vault.loadBackedAssetPublicationState(binding),write:(next,previous)=>vault.saveBackedAssetPublicationState(binding,next,previous),
      runtime:openAssetPublicationRuntime,operations,retain:holdProof,
      restore:async(digest,filename,mimeType)=>{for(const source of await loadDepositSources(binding))if(await sdk.sha256ReceizBytes(source.bytes)===digest)return new File([new Uint8Array(source.bytes)],filename,{type:mimeType});throw Error('BANK_BACKED_PUBLICATION_SOURCE_UNAVAILABLE');},
      recoverFunding:async nonce=>(await nativeAssets()).recoverOperation(nonce),
      publicProjection:async assetId=>{const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);noteOpen();return current.request(`/api/connect/bank/assets/public-projection?applicationId=${BANK_APPLICATION_ID}`,{method:'POST',body:{assetId}});},
    });
  }).catch(error=>{backedPublicationPromise=undefined;throw error;});
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
  async function assertNoOtherPending(reconcileNotes=true,continuingFundingNonce?:string,checkedMarket?:{state:import('./market-trade').MarketTradeState|null},continuingCreditOperation?:string) {
    noteOpen();
    await assertNoPendingTwinCreditPurchase(continuingCreditOperation);
    const certificates=await(await import('./identity-vault')).loadShareCertificateState(binding);
    if(certificates&&(await import('./share-certificates')).readShareCertificateCheckpoint(certificates,binding.artifactSha256)?.current.status==='pending')throw Error('BANK_EXECUTION_PENDING');
    const legacy = await deviceBankExecutionStore(binding).load();
    if (legacy && ['prepared', 'unknown'].includes(legacy.state)) throw Error('BANK_EXECUTION_PENDING');
    const heldCheckout=await loadHostedCheckoutState(binding);noteOpen();
    if(heldCheckout){const {readHostedCheckoutState,hasPendingBookingCheckout}=await import('./checkout-state');const bookingState=await readHostedCheckoutState(heldCheckout,binding.artifactSha256);noteOpen();if(bookingState&&hasPendingBookingCheckout(bookingState,continuingFundingNonce))throw Error('BANK_EXECUTION_PENDING');}
    const [payments, assets, sends, market] = await Promise.all([loadNativePaymentState(binding), loadNativeAssetState(binding),loadWalletSendState(binding),checkedMarket?Promise.resolve(checkedMarket.state):loadMarketTradeState(binding)]);
    noteOpen();
    if (hasPendingNative(payments, 'payments') || hasPendingNative(assets, 'assets') || hasPendingWalletSend(sends,continuingFundingNonce) || await hasPendingMarketTrade(market,!!checkedMarket)) throw Error('BANK_EXECUTION_PENDING');
    if(reconcileNotes)await reconcileReceivedNotesLocked();
  }
  function hasPendingWalletSend(raw:unknown,continuingFundingNonce?:string):boolean {
    if(raw==null)return false;const s=raw as import('./wallet-send').WalletSendState;
    if(s.schema!=='bank.wallet-sends.v1'||s.authority!=='wallet-observation'||!s.current||!Array.isArray(s.history)||s.history.length>1000||[...s.history,s.current].some(c=>!c||!['unknown','recorded','not-sent','funding'].includes(c.status)))throw Error('BANK_WALLET_CHECKPOINT_INVALID');
    return [...s.history,s.current].some(c=>c.status==='unknown'||c.status==='funding'&&!(c===s.current&&continuingFundingNonce&&c.body?.clientNonce===continuingFundingNonce));
  }
  async function hasPendingMarketTrade(raw:unknown,alreadyValidated=false):Promise<boolean>{
    if(raw==null)return false;const s=raw as import('./market-trade').MarketTradeState;
    if(s.schema!=='bank.market-trades.v1'||s.authority!=='market-observation'||!s.current||!Array.isArray(s.history)||s.history.length>1000||[...s.history,s.current].some(c=>!c||!['unknown','recorded','not-sent'].includes(c.status)))throw Error('BANK_MARKET_CHECKPOINT_INVALID');
    if([...s.history,s.current].some(c=>c.status==='unknown'))return true;
    if(!alreadyValidated)await(await import('./market-trade')).validateMarketTradeState(raw,binding.artifactOwnerReceizId);return false;
  }
  async function withAccountExecutionLock<T>(operation:()=>Promise<T>):Promise<T>{
    if(!navigator.locks)throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');
    return navigator.locks.request(`receiz-bank-execution:${binding.artifactSha256}`,{signal:lifetime.signal},operation);
  }
  async function assertWalletExecutionQualification(reconcileNotes:boolean,continuingFundingNonce?:string,continuingCreditOperation?:string){
    if(hasLocalWalletHead())throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');
    if(continuingCreditOperation===undefined)await assertNoOtherPending(reconcileNotes,continuingFundingNonce);
    else await assertNoOtherPending(reconcileNotes,continuingFundingNonce,undefined,continuingCreditOperation);
    if(await(await offlineNotes()).pending())throw Error('BANK_NOTE_ATTEMPT_PENDING');
    await assertWalletSendCustody(binding);
    if(hasLocalWalletHead())throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');
  }
  async function assertWalletSendReady(continuingFundingNonce?:string,continuingCreditOperation?:string){
    if(hasLocalWalletHead())throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');
    await assertNoPendingTwinCreditPurchase(continuingCreditOperation);
    const certificates=await(await import('./identity-vault')).loadShareCertificateState(binding);
    if(certificates&&(await import('./share-certificates')).readShareCertificateCheckpoint(certificates,binding.artifactSha256)?.current.status==='pending')throw Error('BANK_EXECUTION_PENDING');
    await cancelUnsentNotesLocked();
    await assertWalletExecutionQualification(true,continuingFundingNonce,continuingCreditOperation);
  }
  async function qualifyTwinReserveCredits(){
    try{await assertWalletExecutionQualification(false);return true;}
    catch{noteOpen();return false;}
  }
  async function recordConnectedWalletResponse(response:unknown,uid:string){
    try{if(response&&knownWallet?.walletScope!=='native-full'&&!hasLocalWalletHead()&&(!knownWallet||!isWalletQuoteHeld(knownWallet)))await adoptConnectedWalletResponse(response,uid,walletRevision,true);}
    finally{if(!lifetime.signal.aborted)walletRevision++;}
  }
  function announceConnectedWalletRecord(uid:string){
    if(!lifetime.signal.aborted)dispatchEvent(new CustomEvent('bankeiz:wallet-send-recorded',{detail:{identityDigest:binding.artifactSha256,accountUid:uid}}));
  }
  async function refreshTwinReserveWallet(uid:string,earlierRead:Promise<unknown>|undefined){
    try{
      // A pre-debit reader must drain before reading the newly recorded source.
      // The partial purchase response is never a complete wallet projection.
      await earlierRead?.catch(()=>{});
      if(lifetime.signal.aborted||accountUid!==uid||hasLocalWalletHead())return;
      await readWallet();
      if(!lifetime.signal.aborted&&accountUid===uid)dispatchEvent(new Event('bankeiz:account-observation'));
    }catch{/* Retained purchase remains terminal when optional display is unavailable. */}
  }
  async function readPendingTwinCreditPurchase(){
    return readTwinCreditPurchaseIntent(await loadTwinCreditPurchaseState(binding),binding.artifactSha256,accountUid??undefined);
  }
  async function assertNoPendingTwinCreditPurchase(continuingOperationId?:string){
    const pending=await readPendingTwinCreditPurchase();
    if(pending&&pending.operationId!==continuingOperationId)throw Error('BANK_EXECUTION_PENDING');
  }
  async function recordTwinReserveCompletion(result:import('./twin-upgrade').TwinUpgradeResult,uid:string){
    const debitId=result.creditFunding?.purchase?.walletDebitId;
    if(typeof debitId==='string'&&!recordedTwinReserveDebits.has(debitId)){
      recordedTwinReserveDebits.add(debitId);
      const earlierRead=walletReading;
      await recordConnectedWalletResponse(undefined,uid);
      announceConnectedWalletRecord(uid);
      void refreshTwinReserveWallet(uid,earlierRead);
    }
  }
  const recordedTwinReserveDebits=new Set<string>();
  let walletSendPromise:Promise<import('./wallet-send').WalletSend>|undefined;
  const walletSend=()=>walletSendPromise??=import('./wallet-send').then(({createWalletSend})=>createWalletSend({
    ownerReceizId:binding.artifactOwnerReceizId,assertOpen:noteOpen,
    onRecorded:recordConnectedWalletResponse,
    afterRecorded:async(_response,uid)=>announceConnectedWalletRecord(uid),
    assertNoOtherPending:assertWalletSendReady,
    store:{read:()=>loadWalletSendState(binding),write:(next,previous)=>saveWalletSendState(binding,next,previous)},
    connect:async readOnly=>{const connected=await connectClient(readOnly?BANK_READ_SCOPES:BANK_WALLET_SEND_SCOPES,readOnly?BANK_READ_CONSENT:BANK_WALLET_SEND_CONSENT);noteOpen();const account=clientAccounts.get(connected);if(!account)throw Error('BANK_WALLET_IDENTITY_CHANGED');return{client:connected,accountUid:account.accountUid};},
    lock:async operation=>withAccountExecutionLock(async()=>await navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},operation)),
    funding:{begin:(amount,referenceId,context)=>beginCardDeposit(amount,true,referenceId,context),check:(checkout,beforeCredit)=>checkCardDeposit(checkout,beforeCredit)},
  })).catch(error=>{walletSendPromise=undefined;throw error;});
  let hostedCheckoutPromise:Promise<import('./hosted-checkout').HostedCheckoutController>|undefined,checkoutController:import('./hosted-checkout').HostedCheckoutController|undefined;
  const hostedCheckout=()=>hostedCheckoutPromise??=Promise.all([import('./hosted-checkout'),import('./checkout-notes')]).then(([{createHostedCheckout},{createCheckoutNotes}])=>{
    noteOpen();const notes=createCheckoutNotes({identity:{offlineNotes},storeSource:bytes=>saveOfflineNoteBlob(binding,bytes),restoreSource:digest=>loadOfflineNoteBlob(binding,digest),assertCurrent:noteOpen});
    checkoutController=createHostedCheckout({identityDigest:binding.artifactSha256,assertCurrent:noteOpen,walletSend,notes,readWallet,store:{read:()=>loadHostedCheckoutState(binding),write:(next,previous)=>saveHostedCheckoutState(binding,next,previous)},lock:async work=>{if(!navigator.locks)throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');return await navigator.locks.request(`receiz-bank-checkout:${binding.artifactSha256}`,{signal:lifetime.signal},work);}});return checkoutController;
  }).catch(error=>{hostedCheckoutPromise=undefined;throw error;});
  const paidBookingControllers=new Set<import('./paid-booking').PaidBookingController>();
  const paidBooking=async(value:{username:string;options?:URLSearchParams})=>{
    noteOpen();const [api,checkout,{createPaidBooking}]=await Promise.all([organizer(),hostedCheckout(),import('./paid-booking')]);noteOpen();
    if(!organizerRequest)throw Error('ORGANIZER_TRANSPORT_UNAVAILABLE');const uid=api.accountUid;
    const controller=createPaidBooking({...value,accountUid:uid,checkout,request:organizerRequest,assertCurrent:()=>{noteOpen();if((accountUid??carriedAccountUid??knownWallet?.wallet.userId)!==uid)throw Error('PAID_BOOKING_IDENTITY_CHANGED');}});
    paidBookingControllers.add(controller);return controller;
  };
  let merchantPromise:Promise<import('./merchant-counter').MerchantCounterController>|undefined,merchantController:import('./merchant-counter').MerchantCounterController|undefined;
  const merchantCounter=()=>merchantPromise??=Promise.all([import('./merchant-counter'),import('./merchant-receive'),prepareReceivingUsername()]).then(async([{createMerchantCounter},{createMerchantReceive,readMerchantResponse},username])=>{
    noteOpen();const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT),bound=clientAccounts.get(current);if(!bound||bound.applicationId!==BANK_APPLICATION_ID)throw Error('MERCHANT_ACCOUNT_MISMATCH');const uid=bound.accountUid;
    const receive=createMerchantReceive({accountUid:uid,request:async(path,signal)=>{noteOpen();signal.throwIfAborted();const connected=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);noteOpen();if(clientAccounts.get(connected)?.accountUid!==uid)throw Error('MERCHANT_ACCOUNT_MISMATCH');const send=clientFetches.get(connected);if(!send)throw Error('MERCHANT_RECEIVING_UNAVAILABLE');return readMerchantResponse(await send(path,{method:'GET',signal:AbortSignal.any([signal,lifetime.signal])}));}});
    merchantController=createMerchantCounter({identityDigest:binding.artifactSha256,accountUid:uid,username,archive:{retain:bytes=>saveOfflineNoteBlob(binding,bytes),restore:ref=>loadOfflineNoteBlob(binding,ref)},assertCurrent:noteOpen,receive,store:{read:()=>loadMerchantCounterState(binding),write:(next,previous)=>saveMerchantCounterState(binding,next,previous)},lock:async work=>{if(!navigator.locks)throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');return await navigator.locks.request(`receiz-bank-counter:${binding.artifactSha256}`,{signal:lifetime.signal},work);}});return merchantController;
  }).catch(error=>{merchantPromise=undefined;throw error;});
  let portfolioPromise:Promise<MarketPortfolioClient>|undefined,portfolioView:MarketPortfolio|null=null,portfolioSeedUid:string|null=null,portfolioStored:unknown=savedPortfolio;
  const knownMarketPortfolio=()=>{
    const uid=accountUid??carriedAccountUid??knownWallet?.wallet.userId??keyFile.owner.uid;
    if(uid&&portfolioSeedUid!==uid){portfolioSeedUid=uid;portfolioView=readSealedMarketPortfolio(localHistory,uid);try{const retained=parseMarketPortfolio(portfolioStored,uid);if(!portfolioView||Date.parse(retained.observedAt)>=Date.parse(portfolioView.observedAt))portfolioView=retained;}catch{/* Same-owner encrypted retention only. */}}
    // Only the fresh-creation caller can project its verified empty genesis.
    // The continued account is the same new identity; restore never enters here.
    if(uid&&!portfolioView&&freshAccountCreation&&carriedWallet?.source==='account-genesis')portfolioView={schema:'bankeiz.market-portfolio.v1',authority:'market-observation',accountUid:uid,observedAt:carriedWallet.observedAt,source:'sealed-head',positions:[],trades:[]};
    return portfolioView;
  };
  const marketPortfolio=()=>portfolioPromise??=(async()=>{
    noteOpen();let uid:string|undefined=accountUid??carriedAccountUid??knownWallet?.wallet.userId??keyFile.owner.uid;
    if(!accountUid&&!knownWallet?.wallet.userId||!uid||uid.startsWith('receiz_device_')){const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);noteOpen();uid=clientAccounts.get(current)?.accountUid;}
    if(!uid||uid.startsWith('receiz_device_'))throw Error('MARKET_PORTFOLIO_ACCOUNT_REQUIRED');
    const ownerUid=uid,initial=knownMarketPortfolio();
    const api=createMarketPortfolio({accountUid:ownerUid,initial:initial?.accountUid===ownerUid?initial:null,assertOpen:noteOpen,request:async()=>{const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);noteOpen();if(clientAccounts.get(current)?.accountUid!==ownerUid)throw Error('MARKET_PORTFOLIO_ACCOUNT_MISMATCH');return current.request('/api/connect/market/portfolio',{method:'GET'});},save:async next=>{noteOpen();await saveMarketPortfolioState(binding,next,portfolioStored);portfolioStored=next;}});
    portfolioSeedUid=ownerUid;portfolioView=api.known();api.subscribe(()=>{portfolioView=api.known();publishOpenPortfolio(binding.artifactSha256,portfolioView);});return api;
  })().catch(cause=>{portfolioPromise=undefined;throw cause;});
  let certificatesPromise:Promise<import('./share-certificates').ShareCertificates>|undefined;
  const shareCertificates=()=>certificatesPromise??=Promise.all([import('./share-certificates'),import('./identity-vault')]).then(([{createShareCertificates},storage])=>createShareCertificates({
    identityDigest:binding.artifactSha256,assertOpen:noteOpen,
    guard:async()=>{if(hasLocalWalletHead())throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');await assertNoOtherPending();if(await(await offlineNotes()).pending())throw Error('BANK_NOTE_ATTEMPT_PENDING');await assertWalletSendCustody(binding);},
    lock:async operation=>withAccountExecutionLock(async()=>await navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},operation)),
    store:{read:()=>storage.loadShareCertificateState(binding),write:(next,previous)=>storage.saveShareCertificateState(binding,next,previous)},
    archive:{retain:bytes=>saveOfflineNoteBlob(binding,bytes),restore:ref=>loadOfflineNoteBlob(binding,ref)},
    connect:async readOnly=>{const current=await connectClient(readOnly?BANK_MARKET_READ_SCOPES:BANK_MARKET_TRADE_SCOPES,readOnly?BANK_MARKET_READ_CONSENT:BANK_MARKET_CONSENT),account=clientAccounts.get(current),fetch=clientFetches.get(current);noteOpen();if(!account||!fetch)throw Error('CERTIFICATE_ACCOUNT_REQUIRED');return{accountUid:account.accountUid,fetch};},
    afterRecorded:async operation=>{if(lifetime.signal.aborted)return;walletRevision++;const api=await marketPortfolio();api.invalidate();dispatchEvent(new CustomEvent('bankeiz:wallet-send-recorded',{detail:{identityDigest:binding.artifactSha256,accountUid:accountUid}}));dispatchEvent(new CustomEvent('bankeiz:market-shares-changed',{detail:{clientNonce:operation.clientNonce}}));},
  })).catch(error=>{certificatesPromise=undefined;throw error;});
  let marketTradePromise:Promise<import('./market-trade').MarketTrade>|undefined;
  const marketTrade=()=>marketTradePromise??=import('./market-trade').then(({createMarketTrade})=>createMarketTrade({
    ownerReceizId:binding.artifactOwnerReceizId,assertOpen:noteOpen,
    onRecorded:async(_uid,original)=>{if(!lifetime.signal.aborted){walletRevision++;const api=await marketPortfolio();noteOpen();api.adoptRecorded(original);}},
    afterRecorded:async(uid)=>{if(!lifetime.signal.aborted){try{const api=await marketPortfolio();noteOpen();api.invalidate();}finally{if(!lifetime.signal.aborted)dispatchEvent(new CustomEvent('bankeiz:wallet-send-recorded',{detail:{identityDigest:binding.artifactSha256,accountUid:uid}}));}}},
    assertNoOtherPending:async checkedMarket=>{if(hasLocalWalletHead())throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');await assertNoOtherPending(true,undefined,{state:checkedMarket});if(await(await offlineNotes()).pending())throw Error('BANK_NOTE_ATTEMPT_PENDING');await assertWalletSendCustody(binding);if(hasLocalWalletHead())throw Error('BANK_WALLET_LOCAL_HEAD_REQUIRED');},
    store:{read:()=>loadMarketTradeState(binding),write:(next,previous)=>saveMarketTradeState(binding,next,previous)},
    connect:async readOnly=>{const connected=await connectClient(readOnly?BANK_MARKET_READ_SCOPES:BANK_MARKET_TRADE_SCOPES,readOnly?BANK_MARKET_READ_CONSENT:BANK_MARKET_CONSENT);noteOpen();const account=clientAccounts.get(connected);if(!account)throw Error('BANK_MARKET_IDENTITY_CHANGED');return{client:connected,accountUid:account.accountUid};},
    lock:async operation=>withAccountExecutionLock(async()=>await navigator.locks.request(`receiz-bank-notes:${binding.keyId}`,{signal:lifetime.signal},operation)),
  })).catch(error=>{marketTradePromise=undefined;throw error;});
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
    readNotes: async () => [...await(await import('./note-proof-portability')).readRetainedNoteProofs({ keyId: binding.keyId, read: () => loadOfflineNoteState(binding), restore: digest => loadOfflineNoteBlob(binding, digest) }),
      ...(await localConnectedNotes().savedNotes()).map(note=>({kind:'note-image' as const,filename:`note-${note.noteId}.png`,bytes:note.image})),
      ...(await localReceivedNotes().list()).map(note=>({kind:'note-deposit' as const,filename:`note-${note.status==='received'?'received':'deposit'}-${note.noteId}.receiz.json`,bytes:note.proofBytes}))],
    readAccount: async () => {
      const proof = await localLedger.original(); if (!proof) return [];
      const { heldAccountProofBytes } = await import('./account-proof');
      return [{ kind: 'account-source' as const, filename: `bankeiz-account-proof-${proof.sourceDigest.slice(0,16)}.json`, bytes: heldAccountProofBytes(proof) }];
    },
    commit: sources => retainProofBatch(binding, sources),
    restoreAccounts: async proofs => {
      noteOpen();
      // The authenticated/carried account alias is routing only. An imported
      // archive never supplies its own alias or replaces a local custody head.
      const uid = accountUid ?? knownWallet?.wallet.userId;
      if (!uid || hasLocalWalletHead() || !proofs.length || proofs.some(proof => !['bankeiz.public-account-statement.v2','bankeiz.public-account-statement.v3','bankeiz.public-account-statement.v4'].includes(proof.statement.schema))) return false;
      let candidate = proofs[0];
      if (proofs.length > 1) {
        const { verifyAccountProofContinuation } = await import('./account-proof-public');
        // Validate the whole imported history family before changing a local
        // projection. Multiple individually valid branches remain evidence.
        for (const proof of proofs.slice(1)) {
          try { verifyAccountProofContinuation(candidate, proof); candidate = proof; }
          catch { verifyAccountProofContinuation(proof, candidate); }
        }
      }
      const before = knownWallet, revision = walletRevision;
      const retained = await localLedger.retain(candidate, uid); noteOpen();
      if (walletRevision !== revision || knownWallet !== before || !canAdoptAccountLedgerObservation(before, retained.observation)) return false;
      const observation = mergeAccountLedgerObservation(before, retained.observation);
      if (observation !== before) {
        const headChanged = observation.wallet !== before?.wallet || observation.source !== before?.source || observation.localHeadDigest !== before?.localHeadDigest;
        knownWallet = observation; if (headChanged) walletRevision++;
        void persistWalletObservation(observation).catch(() => {});
        if (typeof dispatchEvent === 'function') dispatchEvent(new Event('bankeiz:account-observation'));
      }
      return true;
    },
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
    if (!knownWallet || !hasSettledAccountView(knownWallet)) throw Error('Your complete account history could not be opened. Your Identity Record is unchanged. Try again when its source is available.');
    return knownWallet;
  }
  const prepareAccountView = (options?:{resume?:boolean}) => {
    // A saved authenticated balance and its held curve remain usable after a
    // newer balance head invalidates their complete-history marker. Reopening
    // that display is not a request to wait for another remote reconciliation.
    // Keep the missing marker explicit; never promote it to financial evidence.
    if(options?.resume&&knownWallet?.history?.length&&!hasSettledAccountView(knownWallet)){
      noteOpen();startReceivedNotes();return Promise.resolve(knownWallet);
    }
    if (preparingView) return preparingView;
    const attempt = settleAccountView().catch(cause => { if (knownWallet) { if (!knownWallet.history?.length) knownWallet={...knownWallet,history:appendWalletPoint([],knownWallet.wallet,knownWallet.observedAt,knownWallet.wallet.kaiUpulse)}; return knownWallet; } throw new Error('Your account balance source is temporarily unavailable. Your Identity Record is unchanged. Try again when its source is available.', {cause}); }).then(view=>{startReceivedNotes();return view;}); preparingView = attempt;
    void attempt.finally(()=>{if(preparingView===attempt)preparingView=undefined;}).catch(()=>{});
    return attempt;
  };
  async function persistDeviceCustody(onlyIfEmpty=false) {
    await saveDeviceIdentity(bytes, filename, phrase, consentApproved, protectedTransport,onlyIfEmpty);
    if(consentApproved&&messagingIncludedAtEntry){
      // Reuse the existing encrypted, identity-bound consent record. This
      // performs no chat request, credential exchange or eager inbox read.
      const previous=await loadMessagingConsent(binding).catch(()=>null),exact=exactMessagingConsent();
      if(JSON.stringify(previous)!==JSON.stringify(exact))await saveMessagingConsent(binding,exact,previous).catch(()=>{});
    }
    // Seed display retention through the same revision-checked queue as later
    // reads. A delayed import save cannot overwrite a newer account frame.
    if (knownWallet) void persistWalletObservation(knownWallet).catch(() => {});
  }
  const retainedMessaging=await messagingRetention;
  const knownMessagingDisplay=()=>{const display=retainedMessaging.known(),uid=accountUid??knownWallet?.wallet.userId;return display&&(!uid||display.accountUid===uid)?display:null;};
  const retainTwinAccessQuestions=(questions:readonly import('./messaging-retention').TwinAccessQuestion[])=>{
    if(lifetime.signal.aborted)return;
    const uid=accountUid??knownWallet?.wallet.userId;if(!uid)return;
    retainedMessaging.retainTwinAccessQuestions(uid,questions);
  };
  async function meetingArchive():Promise<import('./meeting-capture').MeetingArchive>{
    noteOpen();const storage=await import('./identity-vault');
    return{read:async id=>{noteOpen();return storage.loadMeetingCapture(binding,id);},write:async(id,value,expected)=>{noteOpen();await storage.saveMeetingCapture(binding,id,value,expected);},retain:async bytes=>{noteOpen();return storage.saveOfflineNoteBlob(binding,bytes);},restore:async digest=>{noteOpen();return storage.loadOfflineNoteBlob(binding,digest);},seal:async(bytes,filename)=>{noteOpen();const {sealMeetingRecord}=await import('./sealed-meeting-record');const file=await sealMeetingRecord(await ownedSealer(),bytes,filename);noteOpen();return file;}};
  }
  return { meetingArchive,profileInsights, originalsQualification, knownOriginalsQualification:()=>qualificationReader?.known()??null, shareCertificates, organizer,knownOrganizerDisplay,knownOrganizer,receizTools,moneyTools,businessSetup,twinWorkspace,knownTwinWorkspace,vaults, hostedCheckout, paidBooking, merchantCounter, profile, knownProfile:()=>profilePresentation, messaging, knownMessagingDisplay, knownTwinAccess, retainTwinAccessQuestions, upgradeTwin, recoverTwinCreditPurchase, knownReceivedNotes:()=>receivedNoteDisplay, prepareAccountView, prepareReceivingUsername, cancelUnsentNotes, refreshLocalValuation, walletReceivingAddress:()=>accountUid??knownWallet?.wallet.userId??null, walletSend, marketTrade, marketPortfolio, knownMarketPortfolio, operations, accountProof, retainAccountArtifactSource, accountProofSharing, proofLibrary, executionRecovery: () => executionRecovery, offlineNotes, binding, needsPhrase: identityNeedsPhrase(keyFile), knownWallet: () => knownWallet, username: keyFile.owner.username, accountUsername: () => presentationUsername, localHistory, readWallet, readPrivateHistory, readNoteHistory, beginCardDeposit, checkCardDeposit, cancelCardDeposit:(checkout:CardCheckout)=>checkCardDeposit(checkout,undefined,true), pendingCardDeposit, pendingCardDeposits, startAssetIntake, holdProof, listDeposits, createAsset, publishAssetToMarket, backedAssetPublication, createComposedAsset:(definition,draft)=>createAsset(definition,undefined,false,draft), pendingAssetPublication:async()=>{try{return await createAsset(null,undefined,true);}catch(error){if(error instanceof Error&&error.message==='BANK_ASSET_PUBLICATION_NONE')return null;throw error;}},retryAssetPublication:()=>createAsset(null), receivedProof, nativeReadiness, connectNativeAccount, persistDeviceCustody, dispose: () => { vaultManager?.dispose();for(const paid of paidBookingControllers)paid.dispose();checkoutController?.dispose();merchantController?.dispose();if(!lifetime.signal.aborted){callCleanupUntil=Date.now()+90_000;for(const [path,leave] of callMembershipCleanup)void orderCallMembership(path,leave).catch(()=>{});} lifetime.abort(); publishOpenPortfolio(binding.artifactSha256,null); client = null; }, backup: () => ({ bytes: new Uint8Array(bytes), filename, phrase }) };
}
async function createFreshNativeIdentity(consentApproved: boolean): Promise<OpenIdentity> {
  if (!consentApproved) throw new Error('Approve account read access before creating your ID.');
  const sdk = await loadReceiz();
  const resources = await atIdentityCreationStage('proof-resources',()=>loadBankProofResources(fetch));
  const { createReceizOfflineSealer, createReceizIndexedDbSealStore } = await import('@receiz/sdk/offline');
  const signerStore=certificateTimeSafeStore(createReceizIndexedDbSealStore('receiz-bank-canonical-device-signer'));
  const sealer = createReceizOfflineSealer({ store: signerStore, resources, fetch: certificateTimeSafeFetch(nativeFetch) });
  await atIdentityCreationStage('device-signer',()=>sealer.enroll());
  // v129's onboarding sealer requires protected bootstrap custody. This secret
  // stays internal; the actual user-held download is sealed with the same key
  // in its supported no-phrase form, then independently admitted again.
  const protectionSecret = sdk.receizBase64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const protectedSeal = await atIdentityCreationStage('identity-seal',()=>sealer.createIdentity({ passphrase: protectionSecret }));
  const verification = await sdk.verifyReceizArtifact(protectedSeal.artifactBytes);
  const admission = await sdk.createReceizArtifactAdmissionEngine()(verification, { profile: 'identity', identityPassphrase: protectionSecret });
  const protectedBinding = await sdk.readReceizIdentityPublicBinding(admission);
  const protectedKey = await sdk.readReceizIdentityArtifact(protectedSeal.artifactBytes);
  const initializedKey = await atIdentityCreationStage('account-genesis',()=>initializeFreshBankAccount(protectedKey, protectionSecret));
  const portableKey = await unprotectIdentityKeyFile(initializedKey, protectionSecret);
  const owned = createReceizOfflineSealer({ ownerIdentityAdmission: admission, store: signerStore, resources, fetch: certificateTimeSafeFetch(nativeFetch) });
  const sealed = await atIdentityCreationStage('portable-identity',async()=>{
    const { createNewIdentityImageSource } = await import('./identity-image');
    return owned.seal(await createNewIdentityImageSource(portableKey, protectedKey));
  });
  const identity = await openIdentity(sealed.artifactBytes, '', sealed.filename, true, { bytes: new Uint8Array(protectedSeal.artifactBytes), phrase: protectionSecret }, true, true);
  if (identity.needsPhrase || identity.binding.keyId !== protectedBinding.keyId || identity.binding.artifactOwnerReceizId !== protectedBinding.artifactOwnerReceizId) { identity.dispose(); throw new Error('The self-contained Identity Record did not preserve its original identity.'); }
  const genesis = identity.knownWallet();
  if (!genesis || genesis.source !== 'account-genesis') { identity.dispose(); throw new Error('The signed account genesis could not be opened.'); }
  try{await atIdentityCreationStage('device-custody',()=>identity.persistDeviceCustody(true));}catch(error){identity.dispose();throw error;}
  return identity;
}
async function importNativeIdentityUnlocked(file: File, phrase: string, consentApproved: boolean): Promise<OpenIdentity> {
  if (!consentApproved) throw new Error('Approve account read access before importing your ID.');
  if (file.size > 32 * 1024 * 1024) throw new Error('Identity Record exceeds the supported device capacity.');
  const bytes = new Uint8Array(await file.arrayBuffer()), identity = await openCanonicalIdentity(bytes, phrase, file.name, true, undefined, true);
  await identity.persistDeviceCustody(); return identity;
}
export async function restoreNativeIdentity(): Promise<OpenIdentity | null> { const saved = await loadDeviceIdentity(); return saved && saved.readConsent ? openCanonicalIdentity(saved.bytes, saved.phrase, saved.filename, true, saved.protectedTransport) : null; }
export async function createNativeIdentity(consentApproved:boolean):Promise<OpenIdentity>{
 if(!consentApproved)throw Error('Approve account read access before creating your ID.');
 return withDeviceIdentityEntry(async()=>{const saved=await loadDeviceIdentity();if(saved){if(!saved.readConsent)throw Error('Your saved identity needs to be reopened.');return openCanonicalIdentity(saved.bytes,saved.phrase,saved.filename,true,saved.protectedTransport);}return createFreshNativeIdentity(true);});
}
export function importNativeIdentity(file:File,phrase:string,consentApproved:boolean){return withDeviceIdentityEntry(()=>importNativeIdentityUnlocked(file,phrase,consentApproved));}
export function forgetDeviceIdentity(){return withDeviceIdentityEntry(async()=>{await(await import('./identity-vault')).forgetDeviceIdentity();});}
export {loadWalletObservation, saveWalletObservation, restoreKnownWalletObservation } from './identity-vault';
