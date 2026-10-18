import { loadNativePaymentState, saveNativePaymentState, loadOfflineNoteState, saveOfflineNoteState, loadPreparedNoteState, savePreparedNoteState, saveOfflineNoteBlob, loadOfflineNoteBlob } from './identity-vault';
import { createBankNoteAttestationFetch } from './note-attestation-transport';
import { loadBankNoteRuntime, bankNoteArtwork, type BankOfflineNotes, type BankNoteRuntime } from './offline-notes';
import type { ReceizClient, ReceizIdentityPublicBinding, ReceizKeyFile, ReceizIdentityAccountProjection } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID, BANK_PREVIOUS_NATIVE_APPLICATION_ID, isBankNativeApplicationId, BANK_CARD_APPLICATION_IDS, BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_CARD_CONSENT, BANK_CARD_SCOPES, BANK_NATIVE_CONSENT, BANK_NATIVE_SCOPES, BANK_RECOVERY_SCOPES, BANK_RECOVERY_CONSENT } from './config';
import { parseCardCheckout, parseCardDepositStatus, parseDepositDollars, readCardOperation, type CardCheckout, type CardDepositStatus } from './card-deposit';
import { nativeFetch } from './native-transport';
import { loadDeviceIdentity, saveDeviceIdentity, loadWalletObservation, saveWalletObservation, loadDepositSources, saveDepositSource, loadCardOperation, loadCardOperations, saveCardOperation, loadBankSessionIntent, saveBankSessionIntent, loadProofArchive, loadExportableRecoveries, retainProofBatch } from './identity-vault';
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
import { createBankExecutionRecovery, type BankExecutionRecovery } from './bank-execution-recovery';
import { deviceBankExecutionStore } from './bank-execution-vault';
import { createBankCommittedSourceRestoration } from './bank-committed-sources';
import { initializeFreshBankAccount } from './new-account-genesis';
import {loadBankProofResources} from './proof-resource-continuity';
import {readLocalAccountCheckpoint} from './local-account-checkpoint';
import {BANK_PREPARED_NOTE_CREDIT_ENABLED} from './config';
import { readNoteAccountObservation } from './note-account-observation';

export interface OpenIdentity {
  operations?: () => Promise<import('./bank-operations').BankOperations>;
  accountProof?: () => Promise<import('./account-proof').VerifiedAccountProof>;
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
  const localHistory = await sdk.projectReceizIdentityAccount(keyFile);
  let knownWallet = await loadWalletObservation(binding);
  let walletRevision = 0;
  let walletPersistence = Promise.resolve();
  function persistWalletObservation(observation: NonNullable<typeof knownWallet>) {
    const write = walletPersistence.catch(() => {}).then(async () => {
      if (lifetime.signal.aborted || knownWallet !== observation) return;
      await saveWalletObservation(binding, observation.wallet, observation.observedAt, observation.history, observation.source, observation.localHeadDigest);
    });
    walletPersistence = write;
    return write;
  }
  // Known same-owner source truth paints immediately. Foreign account placement
  // still requires continuation plus a protected same-account wallet read.
  knownWallet ??= readCarriedWalletObservation(localHistory);
  const lifetime = new AbortController();
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
  const hasLocalWalletHead = () => knownWallet?.source === 'local-note-head';
  async function readWallet() {
    if (hasLocalWalletHead() && knownWallet) return knownWallet.wallet;
    const startedRevision = walletRevision;
    const current = await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT);
    const wallet = parseSharedWallet(await current.connect.wallet(), accountUid!);
    // A read that began before a completed local note result cannot overwrite
    // that result when its delayed response finally arrives.
    if ((startedRevision !== walletRevision || hasLocalWalletHead()) && knownWallet) return knownWallet.wallet;
    if (!lifetime.signal.aborted) { const observedAt = new Date().toISOString(); const prior = knownWallet?.source === 'account-genesis' ? knownWallet.history?.map(point => ({ ...point, userId: wallet.userId })) ?? [] : knownWallet?.history ?? []; const history = appendWalletPoint(prior, wallet, observedAt, String(sdk.receizKaiNow().uPulse)); knownWallet = { wallet, observedAt, history }; await persistWalletObservation(knownWallet); }
    return startedRevision !== walletRevision && knownWallet ? knownWallet.wallet : wallet;
  }
  let noteRuntime: BankNoteRuntime | undefined;
  let preparedNoteRuntime: import('./offline-notes').BankPreparedNoteRuntime | undefined;
  const noteOpen = () => { if (lifetime.signal.aborted) throw new Error('This identity was closed. Reopen your account to continue.'); };
  async function offlineNotes(): Promise<BankOfflineNotes> {
    noteOpen();
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
      return navigator.locks.request(`receiz-bank-notes:${binding.keyId}`, { signal: lifetime.signal }, async () => { noteOpen(); return operation(); });
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
          sourceMatchesDisplay = !displayBaseline || sdk.canonicalizeReceizConstitution(sourceWallet) === sdk.canonicalizeReceizConstitution(displayBaseline.wallet);
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
          knownWallet = observation; walletRevision++;
          await persistWalletObservation(observation); noteOpen();
          return result;
        } catch {
          noteOpen();
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
  const legacyExecutionRecovery = createBankExecutionRecovery({
    store: deviceBankExecutionStore(binding),
    connect: applicationId => connectClient(BANK_RECOVERY_SCOPES, BANK_RECOVERY_CONSENT, applicationId),
    assertOpen: () => { if (lifetime.signal.aborted) throw new Error('BANK_EXECUTION_IDENTITY_CLOSED'); },
    lock: async operation => {
      if (!navigator.locks) throw new Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');
      return navigator.locks.request(`receiz-bank-execution:${binding.artifactSha256}`, { signal: lifetime.signal }, operation);
    },
  });
  let nativePaymentsPromise: Promise<ReturnType<typeof import('./native-payment').createNativePayments>> | undefined;
  const nativePayments = () => nativePaymentsPromise ??= import('./native-payment').then(({createNativePayments})=>createNativePayments({
    ownerReceizId:binding.artifactOwnerReceizId,keyId:binding.keyId,
    assertNoOtherPending:async()=>{const retained=await deviceBankExecutionStore(binding).load();if(retained&&['prepared','unknown'].includes(retained.state))throw Error('BANK_EXECUTION_PENDING');},
    assertOpen:()=>{if(lifetime.signal.aborted)throw Error('BANK_EXECUTION_IDENTITY_CLOSED');},
    store:{read:()=>loadNativePaymentState(binding),write:(value,expected)=>saveNativePaymentState(binding,value,expected)},
    sign:challengeB64Url=>unsigned.identity.signLoginProof({keyFile:transportKeyFile,passphrase:transportPhrase,challengeB64Url}),
    request:async(path,body,readOnly)=>{const applicationId=readOnly?new URL(path,'https://receiz.com').searchParams.get('applicationId'):BANK_APPLICATION_ID;if(!isBankNativeApplicationId(applicationId))throw Error('BANK_PAYMENT_APPLICATION_MISMATCH');const connected=await connectClient(readOnly?BANK_RECOVERY_SCOPES:BANK_NATIVE_SCOPES,readOnly?BANK_RECOVERY_CONSENT:BANK_NATIVE_CONSENT,applicationId);if(lifetime.signal.aborted)throw Error('BANK_EXECUTION_IDENTITY_CLOSED');return connected.request(path,{method:'POST',body});},
    lock:async operation=>{if(!navigator.locks)throw Error('BANK_EXECUTION_DEVICE_LOCK_REQUIRED');return navigator.locks.request(`receiz-bank-execution:${binding.artifactSha256}`,{signal:lifetime.signal},operation);},
  })).catch(error=>{nativePaymentsPromise=undefined;throw error;});
  const selectedRecovery=async()=>{const legacy=await legacyExecutionRecovery.status();if(legacy&&['prepared','unknown'].includes(legacy.state))return legacyExecutionRecovery;const payments=(await nativePayments()).recovery;return await payments.status()?payments:legacyExecutionRecovery;};
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
    payments:await nativePayments(),
    ownerReceizId: binding.artifactOwnerReceizId, store: deviceBankExecutionStore(binding),
    assertOpen: () => { if (lifetime.signal.aborted) throw Error('BANK_EXECUTION_IDENTITY_CLOSED'); },
    context: async rails => {
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
  async function accountProof() {
    const module = await import('./account-proof');
    const assertOpen=()=>{if(lifetime.signal.aborted)throw Error('ACCOUNT_PROOF_IDENTITY_CLOSED');};
    return module.readAccountProof({owner:binding,assertOpen,request:async path=>{
      const current=await connectClient(BANK_READ_SCOPES,BANK_READ_CONSENT);assertOpen();
      return current.request(path,{method:'GET'});
    }});
  }
  async function accountProofSharing() {
    const { createAccountProofSharing } = await import('./account-proof-sharing');
    const make = (applicationId: string, previous?: import('./account-proof-sharing').AccountProofSharing): import('./account-proof-sharing').AccountProofSharing => createAccountProofSharing({ applicationId, previous, keyId: binding.keyId, receizId: binding.artifactOwnerReceizId, assertOpen: () => { if (lifetime.signal.aborted) throw Error('ACCOUNT_PROOF_IDENTITY_CLOSED'); },
      signConsent: challengeB64Url => unsigned.identity.signLoginProof({ keyFile: transportKeyFile, passphrase: transportPhrase, challengeB64Url }),
      request: async (path, method, body) => {
        const current = method === 'GET' ? await connectClient(BANK_READ_SCOPES, BANK_READ_CONSENT, applicationId) : await connectClient([...BANK_READ_SCOPES, 'receiz:domains.write'], 'Allow Bankeiz to apply the public account-proof sharing choice I explicitly review: publish my verified balances and complete transaction statement, optionally keep future proofs publicly updated, or turn off live updates. This does not authorize a payment or export my signing key.', applicationId);
        return current.request(path, { method, ...(body ? { body } : {}) });
      } });
    return make(BANK_APPLICATION_ID, make(BANK_PREVIOUS_NATIVE_APPLICATION_ID));
  }
  return { operations, accountProof, accountProofSharing, proofLibrary, executionRecovery: () => executionRecovery, offlineNotes, binding, needsPhrase: identityNeedsPhrase(keyFile), knownWallet: () => knownWallet, username: keyFile.owner.username, accountUsername: () => presentationUsername, localHistory, readWallet, readPrivateHistory, beginCardDeposit, checkCardDeposit, pendingCardDeposit, pendingCardDeposits, startAssetIntake, holdProof, listDeposits, createAsset, nativeReadiness, connectNativeAccount, persistDeviceCustody: () => saveDeviceIdentity(bytes, filename, phrase, consentApproved, protectedTransport), dispose: () => { lifetime.abort(); client = null; }, backup: () => ({ bytes: new Uint8Array(bytes), filename, phrase }) };
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
  await saveWalletObservation(identity.binding, genesis.wallet, genesis.observedAt, genesis.history, genesis.source);
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
