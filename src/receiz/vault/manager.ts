import type { ReceizIdentityLoginProof } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from '../config';
import { type BankNoteInspection, type BankNoteRail, loadBankNoteRuntime } from '../offline-notes';
import { parseDepositDollars,parseCardCheckout, type CardCheckout, type CardDepositStatus } from '../card-deposit';
import { createVaultStore, type VaultStore, type LockedVaultSummary } from './store';
import { createVaultContext } from './context';
import { createImageVault, type VaultCarrier } from './carrier';
import { createVaultHeader, encryptVaultBytes, type VaultHeader, type VaultCredential } from './encryption';
import { registerVaultCredential, requestVaultPresence } from './presence';
import { prepareVaultCustody, completeVaultCustodyCreation, admitVaultCustodyForBank, admitPreparedVaultCustody, createVaultChildAuthority, type VaultCustodyParent } from './custody';
import { encodeVaultPrivateSource,type VaultPrivateSource } from './source';
import { createVaultMoney, createVaultMoneyNative, type VaultMoneyNative, type VaultMoneyIntent } from './money';
import {admitVaultPrivateWorkflowsForBank} from './admit';
import {readVaultCardCheckoutRequest,type VaultCardCheckoutRequest} from './card';
import { createVaultAssets, admitVaultAssetSourceForBank,admitVaultAssetSuccessorForBank, admitVaultAssetPreflightForBank, admitVaultAssetResultForBank, admitVaultAssetConsentForBank, type VaultAssetIntent, type VaultAssetProjection } from './assets';
import { createVaultMarket, type VaultMarketIntent, type VaultMarketProjection } from './market';
import { openVaultImage, exportVaultPrivateImage, exportVaultPublicImage, rasterizeVaultArtwork, type VaultImagePorts } from './export';
import { createVaultDisclosure, inspectVaultDisclosure } from './disclose';
import { prepareVaultOperation, acknowledgeVaultBackup, submitVaultOperation, settleVaultOperation } from './journal';
import { vaultBytes, vaultCanonical, vaultDigest } from './encoding';
import type { VaultNativeRuntime, VaultNativeCustodySubmission } from './runtime';
const json = (v: unknown) => new TextEncoder().encode(vaultCanonical(v));
const parse = (bytes: Uint8Array): any => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
function coordinatesOf(source:VaultPrivateSource){return{vaultId:source.vaultId,owner:{...source.owner},custody:{accountId:source.custody.accountId,keyId:source.custody.keyId,submissionRef:source.custody.submissionRef}};}
export type VaultImage = {
    bytes: Uint8Array;
    filename: string;
    mimeType: 'image/png';
    digest: string;
};
export type VaultReview = {
    kind: 'create' | 'money' | 'asset' | 'investment' | 'card' | 'public';
    vaultId: string;
    digest: string;
    intent: unknown;
};
export type VaultInteraction = {
    /** Cancels only this caller's open/create/import and unlocked session. */
    signal?:AbortSignal;
    review(review: VaultReview): Promise<boolean>;
    /** Must return bytes read from the file the owner actually saved and selected. */
    saveAndReopen(image: VaultImage): Promise<Uint8Array>;
};
export type VaultParent = VaultCustodyParent & {
    beginCard?(amount: string, referenceId: string,request:VaultCardCheckoutRequest,signal?:AbortSignal): Promise<CardCheckout>;
    checkCard?(checkout: CardCheckout, beforeCredit: () => Promise<void>): Promise<CardDepositStatus>;
};
export type VaultSnapshot = {
    id: string;
    name: string;
    protection: 'image' | 'passkey';
    phase: 'prepared' | 'ready';
    ownerReceizId: string;
    money: (BankNoteInspection & {
        sourceRef: string;
    })[];
    assets: VaultAssetProjection[];
    investments: VaultMarketProjection[];
    pending: boolean;
    /** Admitted financial workflows only; card checkout coordination is separate. */
    financialPending?:boolean;
    cards: {
        id: string;
        amountUsdCents: string;
        phase: 'creating'|'checkout'|'allocated';
        checkout: CardCheckout | null;
    }[];
};
export type VaultSession = {
    snapshot(): Promise<VaultSnapshot>;
    addBalance(request: {
        id?: string;
        amountUsdCents: string;
        rail?: BankNoteRail;
    }): Promise<unknown>;
    addCard(request: {
        id?: string;
        amount: string;
    }): Promise<{
        id: string;
        checkout: CardCheckout;
    }>;
    checkCard(id: string): Promise<CardDepositStatus>;
    moveAsset(intent: VaultAssetIntent): Promise<unknown>;
    moveInvestment(intent: VaultMarketIntent): Promise<unknown>;
    sendMoney(request: {
        id?: string;
        amountUsdCents: string;
        rail: 'reserve' | 'settlement';
        recipient: string;
    }): Promise<unknown>;
    returnMoney(request: {
        id?: string;
        amountUsdCents: string;
        rail: 'reserve' | 'settlement';
    }): Promise<unknown>;
    resume(): Promise<void>;
    exportPrivate(): Promise<VaultImage>;
    exportPublic(selection: {
        money?: boolean;
        assets?: string[];
        investments?: string[];
        publish?: boolean;
    }): Promise<VaultImage & {
        publicUrl: string;
    }>;
    lock(): void;
};
export type VaultManagerOptions = {
    ownerKeyId?: string;
    parent?: () => Promise<VaultParent>;
    signal?: AbortSignal;
    store?: VaultStore;
    images?: VaultImagePorts;
    sdk?: () => Promise<typeof import('@receiz/sdk')>;
    native?: () => Promise<VaultNativeRuntime>;
    fetch?: typeof fetch;
    register?: (owner: {
        keyId: string;
        receizId: string;
    }, signal: AbortSignal) => Promise<VaultCredential>;
    presence?: (header: VaultHeader, action: unknown, signal: AbortSignal) => Promise<Uint8Array>;
    lock?<T>(id: string, signal: AbortSignal, work: () => Promise<T>): Promise<T>;
    /** Test qualification uses the actual controller with synthetic native sources. */
    moneyNative?: (input: Parameters<typeof createVaultMoneyNative>[0]) => VaultMoneyNative;
};
export type VaultManager = {
    list(): Promise<LockedVaultSummary[]>;
    create(input: {
        name: string;
        protection?: 'image' | 'passkey';
    }, interaction: VaultInteraction): Promise<VaultSession>;
    open(id: string, interaction: VaultInteraction): Promise<VaultSession>;
    importPrivate(bytes: Uint8Array, interaction: VaultInteraction): Promise<VaultSession>;
    dispose(): void;
};
/** Generic canonical device seal: the enclosed native child/custody sources,
 * rather than an invented parent identity admission, establish Vault rights. */
async function defaultImages(signal: AbortSignal): Promise<VaultImagePorts> {
    const [{ createReceizOfflineSealer, createReceizIndexedDbSealStore }, { loadBankProofResources }, { certificateTimeSafeStore, certificateTimeSafeFetch }, { nativeFetch }, sdk] = await Promise.all([import('@receiz/sdk/offline'), import('../proof-resource-continuity'), import('../device-signer-time'), import('../native-transport'), import('@receiz/sdk')]);
    const held: typeof fetch = (input, init) => nativeFetch(input, { ...init, signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]) });
    let sealing: Promise<ReturnType<typeof createReceizOfflineSealer>> | undefined;
    const signer = () => sealing ??= (async () => { const resources = await loadBankProofResources(fetch, undefined, signal); signal.throwIfAborted(); return createReceizOfflineSealer({ store: certificateTimeSafeStore(createReceizIndexedDbSealStore('receiz-bank-vault-device-signer')), resources, fetch: certificateTimeSafeFetch(held) }); })().catch(error => { sealing = undefined; throw error; });
    return { render: rasterizeVaultArtwork, seal: async (input) => { signal.throwIfAborted(); const sealer = await signer(); await sealer.enroll(); signal.throwIfAborted(); return sealer.seal(input); }, verify: async (bytes) => { signal.throwIfAborted(); const result = await sdk.verifyReceizArtifact(bytes); signal.throwIfAborted(); return result.status === 'verified-artifact'; } };
}
/** Constructing a manager performs no storage, native, presence or network work.
 * Only explicit open/create/import calls create an unlocked lifetime. */
export function createVaultManager(options: VaultManagerOptions = {}): VaultManager {
    const store = options.store ?? createVaultStore(), lifetime = new AbortController(), sessions = new Set<VaultSession>();
    const openings=new Set<AbortController>();
    const signal = options.signal ? AbortSignal.any([lifetime.signal, options.signal]) : lifetime.signal;
    let imageOpening: Promise<VaultImagePorts> | undefined;
    const images = () => options.images ? Promise.resolve(options.images) : imageOpening ??= defaultImages(signal);
    const alive = () => { if (signal.aborted)
        throw Error('VAULT_CLOSED'); };
    const parent = async () => { alive(); if (!options.parent)
        throw Error('VAULT_PARENT_REQUIRED'); const p = await options.parent(); alive(); if (options.ownerKeyId && p.identity.keyId !== options.ownerKeyId)
        throw Error('VAULT_OWNER_MISMATCH'); return p; };
    const presence = async (header: VaultHeader, action: unknown, s: AbortSignal) => options.presence ? options.presence(header, action, s) : (await requestVaultPresence(header, action, s)).secret;
    const locked = async <T>(id: string, s: AbortSignal, work: () => Promise<T>): Promise<T> => { if (options.lock)
        return options.lock(id, s, work); if (typeof navigator === 'undefined' || !navigator.locks)
        throw Error('VAULT_DEVICE_LOCK_REQUIRED'); let result!: T; await navigator.locks.request(`bank-vault:${id}`, { signal: s }, async () => { result = await work(); }); return result; };
    async function action<T>(interaction:VaultInteraction,work:(signal:AbortSignal)=>Promise<T>):Promise<T>{
        alive();interaction.signal?.throwIfAborted();
        if(typeof document!=='undefined'&&document.visibilityState==='hidden')throw Error('VAULT_CLOSED');
        const opening=new AbortController();openings.add(opening);
        const selected=AbortSignal.any([signal,opening.signal,...(interaction.signal?[interaction.signal]:[])]);
        try{const result=await work(selected);selected.throwIfAborted();return result;}finally{openings.delete(opening);}
    }
    async function openStored(initial: VaultCarrier, interaction: VaultInteraction, initialDigest: string,openingSignal:AbortSignal): Promise<VaultSession> {
        alive();
        const opened = new AbortController(), sessionSignal = AbortSignal.any([signal, openingSignal,opened.signal]);
        let envelope = initial, digest = initialDigest;
        const sdk = await (options.sdk ? options.sdk() : import('@receiz/sdk'));
        sessionSignal.throwIfAborted();
        const loaders = { sdk: async () => sdk, native: options.native, signal: sessionSignal };
        let child: Awaited<ReturnType<typeof createVaultChildAuthority>> | null = null;
        let context: ReturnType<typeof createVaultContext>;
        sessionSignal.addEventListener('abort',()=>context?.lock(),{once:true});
        const live = () => { if (sessionSignal.aborted)
            throw Error('VAULT_CLOSED'); context.assertOpen(); };
        function makeContext() { return createVaultContext({ envelope, expectedDigest: digest, presence: (action, s) => envelope.schema === 'bank.vault.encrypted.v1' ? presence(envelope.header, action, s) : Promise.reject(Error('VAULT_PROTECTION_REQUIRED')), admit: async (source) => source.custody.sourceRef ? admitVaultCustodyForBank(source, loaders) : admitPreparedVaultCustody(source, loaders, BANK_APPLICATION_ID), persist: async (next, expected) => { sessionSignal.throwIfAborted(); const saved = await store.save(next.header.owner.keyId, context.snapshot().name, next, expected); sessionSignal.throwIfAborted(); envelope = next; digest = saved.digest; return saved.digest; } }); }
        context = makeContext();
        try{await context.open();sessionSignal.throwIfAborted();}
        catch(error){opened.abort();context.lock();throw error;}
        const name = () => context.snapshot().name;
        async function review(kind: VaultReview['kind'], intent: unknown, reviewDigest: string) { live(); if (await interaction.review({ kind, vaultId: envelope.header.id, digest: reviewDigest, intent: structuredClone(intent) }) !== true)
            throw Error('VAULT_REVIEW_CANCELLED'); live(); await context.authorize({ kind, digest: reviewDigest }); live(); }
        const exportPrivate = async () => { live(); const source = context.snapshot(); const image = await exportVaultPrivateImage(envelope, { name: source.name, kaiUPulse: String(sdk.receizKaiNow().uPulse), holdings: ((source.workflows.money as {
                notes?: unknown[];
                nativeRef?: string;
            } | null)?.notes?.length ?? 0) + ((source.workflows.money as {
                nativeRef?: string;
            } | null)?.nativeRef ? 1 : 0) + ((source.workflows.assets as {
                holdings?: unknown[];
            } | null)?.holdings?.length ?? 0) + ((source.workflows.market as {
                lots?: unknown[];
            } | null)?.lots?.length ?? 0) }, await images()); live(); return image; };
        async function backup() { live(); const expected = context.exportPrivate().digest, image = await exportPrivate(); live(); const chosen = await interaction.saveAndReopen({ bytes: new Uint8Array(image.bytes), filename: image.filename, mimeType: image.mimeType, digest: image.digest }); live(); const reopened = await openVaultImage(chosen, (await images()).verify); live(); if (reopened.kind !== 'private' || context.exportPrivate().digest !== expected)
            throw Error('VAULT_EXACT_ORIGINAL_REQUIRED'); await context.reopenPrepared(json(reopened.value)); live(); }
        const actor = async (role: 'owner' | 'vault') => { live(); if (role === 'owner') {
            const p = await parent(), s = context.snapshot();
            if (p.userId !== s.owner.accountId || p.receizId !== s.owner.receizId || p.identity.keyId !== s.owner.keyId)
                throw Error('VAULT_OWNER_MISMATCH');
            return {...p,request:async(path:string,init:Parameters<VaultParent['request']>[1])=>{
                live();const requestSignal=init.signal?AbortSignal.any([sessionSignal,init.signal]):sessionSignal;
                const result=await p.request(path,{...init,signal:requestSignal});live();return result;
            }};
        } if (!child)
            child = await createVaultChildAuthority({ source: context.snapshot(), applicationId: BANK_APPLICATION_ID, assertOpen: live, ...loaders, fetch: options.fetch }); live(); return child.account(); };
        const sign = async (role: 'owner' | 'vault', challengeB64Url: string): Promise<ReceizIdentityLoginProof> => { const p = await actor(role); const proof = await sdk.signReceizIdentityLoginProof({ keyFile: p.identity, passphrase: p.passphrase, challengeB64Url }); live(); return proof; };
        const custodyRequest = async (role: 'owner' | 'vault', operation: string, submission: unknown) => { const a = await actor(role); return a.request(`/api/connect/vault/custody?applicationId=${BANK_APPLICATION_ID}`, { method: 'POST', body: { operation, submission } }); };
        const source = coordinatesOf(context.snapshot()), nativeInput = { applicationId: BANK_APPLICATION_ID, vaultId: source.vaultId, ownerUserId: source.owner.accountId, owner: () => actor('owner'), child: () => actor('vault'), module: loadBankNoteRuntime, sdk, assertOpen: live, origin: typeof location === 'undefined' ? 'https://bankeiz.com' : location.origin, transferSource: async (sourceSha256: string) => json(await custodyRequest('vault', 'money-source', { sourceSha256 })) };
        const moneyNative = options.moneyNative ? options.moneyNative(nativeInput) : createVaultMoneyNative(nativeInput);
        const assertCapacity=async(additional:number)=>{
            live();
            if(!Number.isSafeInteger(additional)||additional<=0||encodeVaultPrivateSource(context.snapshot()).length+additional>32*1024*1024||json(envelope).length+Math.ceil(additional*4/3)>44*1024*1024)throw Error('VAULT_SOURCE_CAPACITY');
        };
        const common = { assertCapacity,assertOpen: live, lock: <T>(work: () => Promise<T>) => locked(source.vaultId, sessionSignal, work), retain: (bytes: Uint8Array) => context.retain(bytes), restore: (ref: string) => context.restore(ref) };
        const money = createVaultMoney({ ...common, vaultId: source.vaultId, ownerKeyId: source.owner.keyId, childKeyId: source.custody.keyId, ownerRecipient: source.owner.accountId, read: () => context.read('money'), write: (next, previous) => context.write('money', next, previous), backupAndReopen: async (expected) => { await backup(); return await context.read('money') as typeof expected; }, approve: (intent: VaultMoneyIntent, d) => review('money', intent, d), native: moneyNative });
        const coordinates = { vaultId: source.vaultId, ownerReceizId: source.owner.receizId, ownerAccountId: source.owner.accountId, ownerKeyId: source.owner.keyId, custodyAccountId: source.custody.accountId, custodyKeyId: source.custody.keyId };
        const submission = () => parse(vaultBytes(context.snapshot().blocks.find(b => b.sha256 === source.custody.submissionRef)!.exactBytesB64u, 23 * 1024 * 1024)) as VaultNativeCustodySubmission;
        const assets = createVaultAssets({ ...common, ...coordinates, receivingAddress: `vault-${source.custody.accountId}.receiz.id`, read: () => context.read('assets'), write: (next, previous) => context.write('assets', next, previous), backupAndReopen: async (expected) => { await backup(); return await context.read('assets') as typeof expected; }, approve: (intent, d) => review('asset', intent, d), sign, request: async (role, action, body) => role==='vault'&&action==='prepare'?custodyRequest('vault','asset-prepare',{request:body}):(await actor(role)).request(`/api/connect/bank/assets/${action}?applicationId=${BANK_APPLICATION_ID}`, { method: 'POST', body }), preflightDeposit: async (intent) => json(await custodyRequest('owner', 'asset-original-preflight', { assetId: intent.assetId })), admitPreflight: (bytes, intent) => admitVaultAssetPreflightForBank(bytes, intent, { native: options.native }), source: async (assetId,sourceHead) => json(await custodyRequest('vault', 'asset-source', { assetId,...(sourceHead?{sourceHead}:{}) })), admitSuccessor:(previous,next)=>admitVaultAssetSuccessorForBank(previous,next,{...coordinates,applicationId:BANK_APPLICATION_ID,accountId:source.custody.accountId,keyId:source.custody.keyId,native:options.native}), admitSource: bytes => admitVaultAssetSourceForBank(bytes, { ...coordinates, applicationId: BANK_APPLICATION_ID, accountId: source.custody.accountId, keyId: source.custody.keyId, native: options.native }), admitResult: admitVaultAssetResultForBank, admitConsent: (proof, r, role) => admitVaultAssetConsentForBank(proof, r, role === 'owner' ? submission().request.parent : submission().request.custody) });
        const market = createVaultMarket({ ...common, ...coordinates, read: () => context.read('market'), write: (next, previous) => context.write('market', next, previous), backupAndReopen: async (expected) => { await backup(); return await context.read('market') as typeof expected; }, approve: (intent, d) => review('investment', intent, d), sign, request: async (role, action, body) => (await actor(role)).request(`/api/connect/vault/market-shares/${action}?applicationId=${BANK_APPLICATION_ID}`, { method: 'POST', body }) });
        const admission={sdk:async()=>sdk,native:options.native,signal:sessionSignal,money:options.moneyNative?moneyNative:undefined};
        async function qualifyWorkflows() { await admitVaultPrivateWorkflowsForBank(context.snapshot(),admission);live(); }
        try{await qualifyWorkflows();}catch(error){opened.abort();context.lock();throw error;}
        async function ready() { live(); if (context.snapshot().custody.sourceRef)
            return; await common.lock(async () => { if (context.snapshot().custody.sourceRef)
            return; const previous = context.snapshot(); await admitPreparedVaultCustody(previous, loaders, BANK_APPLICATION_ID); await backup(); if (!context.hasReopenedPrepared())
            throw Error('VAULT_PREPARED_BACKUP_REQUIRED'); const result = await completeVaultCustodyCreation(previous, { ...loaders, applicationId: BANK_APPLICATION_ID, vaultId: source.vaultId, name: name(), parent, save: async (next, expected) => { live(); if (vaultCanonical(context.snapshot()) !== vaultCanonical(expected))
                throw Error('VAULT_STORAGE_CONFLICT'); let carrier: VaultCarrier; if (envelope.schema === 'bank.vault.image-custody.v1')
                carrier = createImageVault(encodeVaultPrivateSource(next), envelope.header);
            else {
                const key = await presence(envelope.header, { kind: 'complete-custody', vaultId: source.vaultId }, sessionSignal);
                try {
                    carrier = await encryptVaultBytes(encodeVaultPrivateSource(next), envelope.header, key);
                }
                finally {
                    key.fill(0);
                }
            } const saved = await store.save(next.owner.keyId, next.name, carrier, digest); sessionSignal.throwIfAborted(); context.lock(); envelope = carrier; digest = saved.digest; context = makeContext(); await context.open(); } }); if (!result.custody.sourceRef)
            throw Error('VAULT_CUSTODY_REQUIRED'); }); }
        function cardRows() { return context.snapshot().journal.entries.filter(e => e.kind === 'card.fund').map(e => { const block = context.snapshot().blocks.find(b => b.sha256 === (e.outcomeRef ?? e.requestRef)); if (!block)
            throw Error('VAULT_SOURCE_REQUIRED'); return { entry: e, value: parse(vaultBytes(block.exactBytesB64u, 23 * 1024 * 1024)) }; }); }
        async function recoverCard(id:string){
            live();const row=cardRows().find(v=>v.entry.id===id);if(!row)throw Error('VAULT_CARD_RESULT_UNKNOWN');
            if(row.value.checkout)return {id,checkout:row.value.checkout as CardCheckout};
            if(row.value.schema!=='bank.vault.card-request.v1'||row.value.id!==id||!row.value.checkoutRequest)throw Error('VAULT_CARD_RESULT_UNKNOWN');
            const request=readVaultCardCheckoutRequest(row.value.checkoutRequest);
            if(request.vaultId!==source.vaultId||request.referenceId!==id||request.amountUsdCents!==row.value.amountUsdCents)throw Error('VAULT_CARD_CONFLICT');
            const p=await actor('owner') as VaultParent;if(!p.beginCard)throw Error('VAULT_CARD_UNAVAILABLE');
            if(row.entry.phase==='prepared'){
                await review('card',row.value,row.entry.requestRef);await backup();let journal=context.snapshot().journal;
                await context.writeJournal(await acknowledgeVaultBackup(journal,id,row.entry.requestRef,context.exportPrivate().digest),journal);
                journal=context.snapshot().journal;await context.writeJournal(await submitVaultOperation(journal,id),journal);
            }else if(row.entry.phase!=='submitted')throw Error('VAULT_CARD_CONFLICT');
            const cents=BigInt(request.amountUsdCents),amount=`${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
            const checkout=parseCardCheckout({ok:true,checkout:{...await p.beginCard(amount,id,structuredClone(request),sessionSignal),mode:'embedded',currency:'usd'}},request.amountUsdCents);live();
            const result=await context.retain(json({...row.value,checkout})),journal=context.snapshot().journal;
            await context.writeJournal(await settleVaultOperation(journal,id,{status:'committed',sourceRef:result}),journal);return{id,checkout};
        }
        const session: VaultSession = {
            async snapshot() {
                live();const s=context.snapshot(),prepared=!s.custody.sourceRef;
                const projection=await admitVaultPrivateWorkflowsForBank(s,admission);
                const financialPending=prepared||Object.values(s.workflows).some(w=>(w as {operations?:{complete?:boolean;phase?:string}[]}|null)?.operations?.some(o=>o.complete===false||['prepared','submitted','pending'].includes(o.phase??'')))||s.journal.entries.some(e=>e.kind!=='card.fund'&&(e.phase==='prepared'||e.phase==='submitted'));
                const snapshot:VaultSnapshot={id:s.vaultId,name:s.name,protection:envelope.schema==='bank.vault.encrypted.v1'?'passkey':'image',phase:prepared?'prepared':'ready',ownerReceizId:s.owner.receizId,...projection,pending:prepared||projection.pending,financialPending,cards:cardRows().map(({entry,value})=>({id:entry.id,phase:(s.workflows.money as {operations:{intent:{id:string};complete:boolean;result:string|null}[]}|null)?.operations.some(o=>o.intent.id===`card-${entry.id}`&&o.complete&&o.result==='committed')?'allocated':value.checkout?'checkout':'creating',amountUsdCents:value.amountUsdCents,checkout:value.checkout??null}))};
                live();return snapshot;
            },
            async addBalance(request) { await ready(); await actor('owner'); return money.add({ ...request, id: request.id ?? crypto.randomUUID() }); },
            async sendMoney(request) { await ready(); return money.send({ ...request, id: request.id ?? crypto.randomUUID() }); },
            async returnMoney(request) { await ready(); return money.returnToOwner({ ...request, id: request.id ?? crypto.randomUUID() }); },
            async moveAsset(intent) { await ready(); return assets.move(intent); }, async moveInvestment(intent) { await ready(); return market.move(intent); },
            async addCard(request) { await ready(); return common.lock(async () => { const amount = parseDepositDollars(request.amount), id = request.id ?? crypto.randomUUID(); if (!/^[a-f0-9-]{36}$/i.test(id))
                throw Error('VAULT_CARD_REFERENCE_INVALID'); const old = cardRows().find(v => v.entry.id === id); if (old) {
                if (old.value.amountUsdCents !== amount.amountUsdCents)
                    throw Error('VAULT_CARD_CONFLICT');
                if (old.value.checkout)
                    return { id, checkout: old.value.checkout };
                return recoverCard(id);
            } const p = await actor('owner') as VaultParent; if (!p.beginCard)
                throw Error('VAULT_CARD_UNAVAILABLE'); const checkoutRequest:VaultCardCheckoutRequest={schema:'receiz.bank.vault-checkout.v1',vaultId:source.vaultId,referenceId:id,amountUsdCents:amount.amountUsdCents,returnUrl:`${typeof location==='undefined'?'https://bankeiz.com':location.origin}/?cardReturn=1&session_id={CHECKOUT_SESSION_ID}`};const intent = { schema: 'bank.vault.card-request.v1', id, amountUsdCents: amount.amountUsdCents,checkoutRequest }, ref = await context.retain(json(intent)); await review('card', intent, ref); let journal = context.snapshot().journal, next = await prepareVaultOperation(journal, { id, kind: 'card.fund', requestRef: ref }); await context.writeJournal(next, journal); await backup(); journal = context.snapshot().journal; next = await acknowledgeVaultBackup(journal, id, ref, context.exportPrivate().digest); await context.writeJournal(next, journal); journal = context.snapshot().journal; await context.writeJournal(await submitVaultOperation(journal, id), journal); return recoverCard(id); }); },
            async checkCard(id) {
                await ready();
                if(!cardRows().find(v=>v.entry.id===id)?.value.checkout)await common.lock(()=>recoverCard(id));
                const row=cardRows().find(v=>v.entry.id===id);
                if(!row?.value.checkout)throw Error('VAULT_CARD_RESULT_UNKNOWN');
                const p=await actor('owner') as VaultParent;
                if(!p.checkCard)throw Error('VAULT_CARD_UNAVAILABLE');
                const checkout=row.value.checkout as CardCheckout;
                const status=await p.checkCard(checkout,async()=>{live();});
                live();
                // A retained provider observation is recovery evidence, never
                // money authority. Only the native allocation below can move
                // actual admitted Reserve into this child custody.
                await context.retain(json({schema:'bank.vault.card-status.v1',id,checkoutRef:row.entry.outcomeRef,sessionId:checkout.sessionId,amountUsdCents:checkout.amountUsdCents,status}));
                if(status.status==='credited')await money.add({id:`card-${id}`,amountUsdCents:checkout.amountUsdCents,rail:'reserve'});
                return status;
            },
            async resume() {
                await ready();await money.resume();
                const asset=await assets.resume();
                if(asset?.status==='unknown')throw Error('VAULT_OPERATION_PENDING');
                const investment=await market.resume();
                if(investment?.status==='unknown'||investment?.status==='pending')throw Error('VAULT_OPERATION_PENDING');
                for(const row of cardRows().filter(v=>v.entry.phase==='prepared'||v.entry.phase==='submitted'))await common.lock(()=>recoverCard(row.entry.id));
                live();
            },
            exportPrivate,
            async exportPublic(selection) { await ready(); return common.lock(async () => { const s = context.snapshot(), holdings: {
                kind: 'money' | 'asset' | 'investment';
                source: unknown;
            }[] = []; if (selection.money)
                holdings.push({ kind: 'money', source: await money.publicWitness(crypto.randomUUID()) }); for (const assetId of selection.assets ?? [])
                holdings.push({ kind: 'asset', source: await custodyRequest('vault', 'asset-public', { assetId }) }); const requested = new Set(selection.investments ?? []); for (const h of await market.holdings())
                if (requested.has(h.lotId)) {
                    holdings.push({ kind: 'investment', source: h.publicWitness });
                    requested.delete(h.lotId);
                } if (requested.size)
                throw Error('VAULT_PUBLIC_SELECTION_INVALID'); const custodyWitness=await custodyRequest('vault','custody-witness',{});const payload = { schema: 'receiz.bank.vault-public-record.v1' as const, applicationId: BANK_APPLICATION_ID, vaultId: s.vaultId, name: s.name, kaiUPulse: String(sdk.receizKaiNow().uPulse), custodyWitness, holdings }; await review('public', selection, await vaultDigest(json(payload))); const disclosure = await createVaultDisclosure(payload, challenge => sign('vault', challenge), { native: options.native }); live(); const image = await exportVaultPublicImage(disclosure.record, value => inspectVaultDisclosure(value, undefined, { native: options.native }), await images()); live(); if (selection.publish)
                await custodyRequest('vault', 'publish-public', disclosure.record); live(); return image; }); },
            lock() { if (!opened.signal.aborted)
                opened.abort(); child?.lock(); child = null; context.lock(); sessions.delete(session); },
        };
        const close = () => session.lock();
        sessionSignal.addEventListener('abort', close, { once: true });
        sessions.add(session);
        return session;
    }
    const manager: VaultManager = {
        async list() { alive(); if (!options.ownerKeyId)
            return []; return store.list(options.ownerKeyId); },
        create:(input,interaction)=>action(interaction,async selected=>{
            const name=input.name.trim(),id=crypto.randomUUID(),protection=input.protection??'image';
            if(!name||name.length>80)throw Error('VAULT_NAME_INVALID');
            if(!['image','passkey'].includes(protection))throw Error('VAULT_PROTECTION_REQUIRED');
            const intent={name,protection};
            if(await interaction.review({kind:'create',vaultId:id,intent,digest:await vaultDigest(json(intent))})!==true)throw Error('VAULT_REVIEW_CANCELLED');
            selected.throwIfAborted();
            const p=await parent();selected.throwIfAborted();
            const owner={keyId:p.identity.keyId,receizId:p.receizId};
            let header:VaultHeader|undefined;
            if(protection==='passkey')header=createVaultHeader({purpose:'vault-private',id,owner,credential:await(options.register??registerVaultCredential)(owner,selected)});
            selected.throwIfAborted();
            let preparedCarrier:VaultCarrier|undefined,preparedDigest='';
            await prepareVaultCustody({applicationId:BANK_APPLICATION_ID,vaultId:id,name,parent:async()=>p,sdk:options.sdk,native:options.native,signal:selected,save:async(next,expected)=>{
                selected.throwIfAborted();
                if(expected!==null)throw Error('VAULT_STORAGE_CONFLICT');
                const clear=encodeVaultPrivateSource(next);
                try{
                    if(header){const key=await presence(header,{kind:'create',vaultId:id},selected);try{selected.throwIfAborted();preparedCarrier=await encryptVaultBytes(clear,header,key);}finally{key.fill(0);}}
                    else preparedCarrier=createImageVault(clear,{id,owner});
                }finally{clear.fill(0);}
                selected.throwIfAborted();
                preparedDigest=(await store.save(owner.keyId,name,preparedCarrier,null)).digest;
            }});
            selected.throwIfAborted();
            const session=await openStored(preparedCarrier!,interaction,preparedDigest,selected);
            try{await session.resume();selected.throwIfAborted();return session;}catch(error){session.lock();throw error;}
        }),
        open:(id,interaction)=>action(interaction,async selected=>{
            if(!options.ownerKeyId)throw Error('VAULT_OWNER_REQUIRED');
            const stored=await store.load(options.ownerKeyId,id);selected.throwIfAborted();
            if(!stored)throw Error('VAULT_ORIGINAL_REQUIRED');
            return openStored(stored.envelope,interaction,stored.summary.digest,selected);
        }),
        importPrivate:(bytes,interaction)=>action(interaction,async selected=>{
            const original=await openVaultImage(bytes,(await images()).verify);selected.throwIfAborted();
            if(original.kind!=='private')throw Error('VAULT_PRIVATE_ORIGINAL_REQUIRED');
            const carrier=original.value;
            if(options.ownerKeyId&&carrier.header.owner.keyId!==options.ownerKeyId)throw Error('VAULT_OWNER_MISMATCH');
            const digest=await vaultDigest(json(carrier)),existing=await store.load(carrier.header.owner.keyId,carrier.header.id);selected.throwIfAborted();
            if(existing&&existing.summary.digest!==digest)throw Error('VAULT_STORAGE_CONFLICT');
            const session=await openStored(carrier,interaction,digest,selected);
            try{
                const snapshot=await session.snapshot();selected.throwIfAborted();
                if(!existing)await store.save(carrier.header.owner.keyId,snapshot.name,carrier,null);
                selected.throwIfAborted();return session;
            }catch(error){session.lock();throw error;}
        }),
        dispose() { if (!lifetime.signal.aborted)
            lifetime.abort(); for (const session of [...sessions])
            session.lock(); },
    };
    const closeAll=()=>{for(const opening of openings)opening.abort(Error('VAULT_CLOSED'));for(const session of [...sessions])session.lock();};
    const background = () => { if(typeof document!=='undefined'&&document.visibilityState==='hidden')closeAll(); };
    if (!signal.aborted&&typeof document !== 'undefined')
        document.addEventListener('visibilitychange', background);
    if(!signal.aborted&&typeof window!=='undefined')window.addEventListener('pagehide',closeAll);
    signal.addEventListener('abort', () => { for(const opening of openings)opening.abort(Error('VAULT_CLOSED'));for (const session of [...sessions])
        session.lock(); if (typeof document !== 'undefined')
        document.removeEventListener('visibilitychange', background);if(typeof window!=='undefined')window.removeEventListener('pagehide',closeAll); }, { once: true });
    return Object.freeze(manager);
}
/** Public pages can open a genuine private original without an ordinary login.
 * The returned session owns only the isolated child. Fresh parent deposits fail
 * explicitly until the owner separately opens the ordinary Identity Record. */
export async function openVaultPrivateOriginal(bytes: Uint8Array, interaction: VaultInteraction, options: Omit<VaultManagerOptions, 'ownerKeyId' | 'parent'> = {}): Promise<VaultSession> {
    const { parent: _parent, ownerKeyId: _owner, ...childOnly } = options as VaultManagerOptions;
    const manager = createVaultManager(childOnly);
    try {
        const session=await manager.importPrivate(bytes, interaction),lock=session.lock;
        let closed=false;
        // This helper owns one manager and one session. Both an explicit lock
        // and the manager's own background callback must release its listeners.
        session.lock=()=>{if(closed)return;closed=true;try{lock();}finally{manager.dispose();}};
        return session;
    }
    catch (error) {
        manager.dispose();
        throw error;
    }
}
