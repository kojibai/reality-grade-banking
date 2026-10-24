import { expect, it, vi } from 'vitest';
import * as sdk from '@receiz/sdk';
import { createVaultManager, openVaultPrivateOriginal, type VaultManagerOptions, type VaultInteraction, type VaultImage } from '../src/receiz/vault/manager';
import { type VaultStore, type StoredVault } from '../src/receiz/vault/store';
import { vaultBase64, vaultBytes, vaultCanonical, vaultDigest } from '../src/receiz/vault/encoding';
import type { VaultNativeRuntime, VaultNativeCustodySubmission } from '../src/receiz/vault/runtime';
import type { VaultMoneyNative } from '../src/receiz/vault/money';
import { openVaultImage } from '../src/receiz/vault/export';
import { insertPngTextChunks,stripPngTextChunksByKeyword } from '../native/receiz/app/utils/pngChunks';
import { readVaultPrivateSource } from '../src/receiz/vault/source';
import { conformanceOfflineFixture } from './helpers/conformance-offline-sealer';
import { admitVaultPrivateSourceForBank } from '../src/receiz/vault/admit';
const json = (v: unknown) => new TextEncoder().encode(vaultCanonical(v));
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF0sAAAAASUVORK5CYII=', 'base64'));
const parentId = 'f7f13a26-cf61-4fab-823c-85eaab01cc73';
function memoryStore() {
    const values = new Map<string, StoredVault>();
    const store: VaultStore = { async list(ownerKeyId) { return [...values.values()].map(v => v.summary).filter(s => s.ownerKeyId === ownerKeyId); }, async load(owner, id) { return structuredClone(values.get(owner + '|' + id) ?? null); }, async save(ownerKeyId, name, envelope, expected) { const key = ownerKeyId + '|' + envelope.header.id, previous = values.get(key); if ((previous?.summary.digest ?? null) !== expected)
            throw Error('VAULT_STORAGE_CONFLICT'); const summary = { id: envelope.header.id, ownerKeyId, name, digest: await vaultDigest(json(envelope)), savedAt: new Date().toISOString() }; values.set(key, structuredClone({ summary, envelope })); return summary; }, async retainBlock() { throw Error('unexpected'); }, async restoreBlock() { throw Error('unexpected'); } };
    return { store, values };
}
async function fixture() {
    const parent = await sdk.createReceizIdentityKeyFile({ owner: { uid: parentId } }), memory = memoryStore(), saved: VaultImage[] = [], reviews: string[] = [];
    let parents = 0, creates = 0, executions = 0, secretRequests = 0, cardStarts = 0, childCalls = 0;
    const native = { VAULT_CHILD_SCOPES: ['receiz:wallet.read', 'receiz:reserve.read', 'receiz:reserve.write', 'receiz:settlement.read', 'receiz:settlement.write', 'receiz:domains.read'], async deriveVaultCustodyAccountId() { return 'f7f13a26-cf61-5fab-823c-85eaab01cc74'; }, vaultCustodyChallenge: (r: unknown) => vaultBase64(json(r)), async inspectVaultCustodySubmission(s: VaultNativeCustodySubmission) { for (const [proof, key] of [[s.parentProof, s.request.parent], [s.childProof, s.request.custody]] as const)
            if (!await sdk.verifyReceizIdentityPublicKeyProjectionSignature({ keyId: key.keyId, alg: key.alg, publicKeyRawB64u: key.publicKeyRawB64u, challengeB64Url: vaultBase64(json(s.request)), signatureB64Url: proof.signatureB64Url }))
                throw Error('invalid exact custody consent'); return s; }, async verifyVaultCustodySource(value: unknown) { return (value as {
            admission: unknown;
        }).admission; } } as unknown as VaultNativeRuntime;
    const moneyNative: VaultMoneyNative = { async preflightTransfer(intent,originals){let available=0n;for(const bytes of originals){const note=await moneyNative.inspectNote(bytes);if(note.rail===intent.rail)available+=BigInt(note.amountUsdCents);}if(available<BigInt(intent.amountUsdCents))throw Error('SYNTHETIC_INSUFFICIENT_RAIL');}, async reserve(kind,request){const outcome=json({kind,request:vaultBase64(request),accepted:true});return{schema:'receiz.bank.vault-money-capacity.v1',requestSha256:await vaultDigest(request),currentNativeHead:null,outcomeMaxBytes:outcome.length,reservedSourceBytes:outcome.length*16};}, async prepare(kind, intent) { if (kind === 'change-reserve' || kind === 'change-settlement')
            return null; return json({ kind, intent }); }, async execute(kind, request) { executions++; return json({ kind, request: vaultBase64(request), accepted: true }); }, async admit(kind, request, original) { const v = JSON.parse(new TextDecoder().decode(original)); if (v.accepted !== true || v.kind !== kind || v.request !== vaultBase64(request))
            throw Error('exact native result required'); return { status: 'committed' }; }, async inspectNote(bytes) { const result = JSON.parse(new TextDecoder().decode(bytes)), request = JSON.parse(new TextDecoder().decode(vaultBytes(result.request, 1024 * 1024))); return { noteId: request.intent.id, rail: request.intent.rail ?? 'reserve', amountUsdCents: request.intent.amountUsdCents, amountPhiMicro: '100', summary: 'native test note' } as never; }, async inspectRemainder() { throw Error('unexpected'); }, async remainder() { return null; } };
    const parentContext = { userId: parentId, receizId: 'owner.receiz.id', identity: parent.keyFile, passphrase: '', async request(_route: string, { body }: {
            body?: Record<string, unknown>;
        }) { if (body?.operation === 'prepare-owner')
            return { schema: 'receiz.bank.vault-owner-binding.v1', parentSourceSha256: 'a'.repeat(64), owner: { userId: parentId, receizId: 'owner.receiz.id', keyId: parent.keyId, alg: parent.alg, publicKeyRawB64u: parent.publicKeyRawB64u } }; if (body?.operation !== 'create')
            throw Error('unexpected'); creates++; expect(saved.length).toBeGreaterThan(0); const submission = body.submission as VaultNativeCustodySubmission, r = submission.request; return { schema: 'test-native-source', submission, admission: { owner: { userId: parentId, receizId: 'owner.receiz.id', keyId: parent.keyId }, custody: r.custody, vaultId: r.vaultId, applicationId: r.applicationId, parentHead: r.parentSourceSha256, custodyHead: 'b'.repeat(64), receivingAddress: `vault-${r.custody.accountId}.receiz.id` } }; }, async beginCard(_amount: string, _reference: string) { cardStarts++; return { sessionId: 'cs_actual_session', clientSecret: 'secret', amountUsdCents: '100' }; }, async checkCard(_checkout: unknown, before: () => Promise<void>) { await before(); return { status: 'credited' as const, amountPhiMicro: '100' }; } };
    const options: VaultManagerOptions = { ownerKeyId: parent.keyId, parent: async () => { parents++; return parentContext; }, store: memory.store, sdk: async () => sdk, native: async () => native, moneyNative: input => ({ ...moneyNative, execute: async (kind, request, recover) => { if (kind === 'issue-owner')
                await input.owner();
            else {
                childCalls++;
                const c = await input.child();
                expect(c.userId).toBe('f7f13a26-cf61-5fab-823c-85eaab01cc74');
                expect(c.identity.keyId).not.toBe(parent.keyId);
            } return moneyNative.execute(kind, request, recover); } }), images: { render: async () => png, seal: async (input) => ({ artifactBytes: input.bytes }), verify: async () => true }, lock: async (_id, signal, run) => { signal.throwIfAborted(); return run(); }, register: async () => ({ id: 'AQI', publicKeySpki: 'AwQ', rpId: 'bankeiz.com', origin: 'https://bankeiz.com' }), presence: async () => { secretRequests++; return new Uint8Array(32).fill(7); } };
    const interaction: VaultInteraction = { review: async (r) => { reviews.push(r.kind); return true; }, saveAndReopen: async (image) => { saved.push(structuredClone(image)); return new Uint8Array(image.bytes); } };
    return { options, interaction, parent, memory, saved, reviews, counts: () => ({ parents, creates, executions, secretRequests, cardStarts, childCalls }) };
}
it('constructs without opening storage, requesting presence or acquiring parent access', () => {
    let calls = 0;
    const manager = createVaultManager({ ownerKeyId: 'a'.repeat(64), parent: async () => { calls++; throw Error('unexpected parent'); }, store: { list: async () => { calls++; return []; } } as never });
    expect(calls).toBe(0);
    manager.dispose();
    expect(calls).toBe(0);
});
it('exports the SDK micro-pulse coordinate in the private original artwork',async()=>{
    const f=await fixture(),artwork:string[]=[];
    const manager=createVaultManager({...f.options,sdk:async()=>({...sdk,receizKaiNow:()=>({pulse:17,uPulse:17000001})}),images:{...f.options.images!,render:async svg=>{artwork.push(svg);return png;}}});
    const session=await manager.create({name:'Coordinate'},f.interaction);await session.exportPrivate();
    expect(artwork.length).toBeGreaterThan(0);for(const svg of artwork)expect(svg).toContain('KAI μPULSE 17000001');
    manager.dispose();
});
it('cancels one caller-owned open and session without disposing the identity shared manager',async()=>{
    const f=await fixture(),manager=createVaultManager(f.options),session=await manager.create({name:'Protected',protection:'passkey'},f.interaction);
    const id=(await session.snapshot()).id;session.lock();
    const cancelled=new AbortController();cancelled.abort(Error('CALLER_CLOSED'));
    const before=f.counts();
    await expect(manager.open(id,{...f.interaction,signal:cancelled.signal})).rejects.toThrow('CALLER_CLOSED');
    expect(f.counts()).toEqual(before);
    const current=new AbortController(),opened=await manager.open(id,{...f.interaction,signal:current.signal});
    current.abort();await expect(opened.snapshot()).rejects.toThrow('CLOSED');
    const next=await manager.open(id,f.interaction);expect((await next.snapshot()).phase).toBe('ready');
    manager.dispose();
});
it('independently projects a complete private source without session, account access, writes or credential output', async () => {
    const f=await fixture(),manager=createVaultManager(f.options),session=await manager.create({name:'Independent'},f.interaction);
    await session.addBalance({id:'independent-add-1',amountUsdCents:'100'});
    const image=await session.exportPrivate(),opened=await openVaultImage(image.bytes,async()=>true);
    if(opened.kind!=='private'||opened.value.schema!=='bank.vault.image-custody.v1')throw Error('expected private image');
    const source=await readVaultPrivateSource(vaultBytes(opened.value.sourceB64u,32*1024*1024));
    manager.dispose();
    const before=f.counts(),fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
    try{
        const money=f.options.moneyNative!({} as never),inspect=money.inspectNote;
        money.inspectNote=async bytes=>({...await inspect(bytes),proofBytes:new Uint8Array([1,2,3]),accountAfter:{balancePhiMicro:'private parent balance'},privateAccountOpening:'private source opening'});
        const projection=await admitVaultPrivateSourceForBank(source,{sdk:async()=>sdk,native:f.options.native,money});
        expect(projection).toMatchObject({phase:'ready',nativeAccountAdmitted:true,name:'Independent',ownerReceizId:'owner.receiz.id',pending:false,money:[{amountUsdCents:'100'}],assets:[],investments:[]});
        expect(JSON.stringify(projection)).not.toContain(source.custody.keyFileText);
        expect(projection).not.toHaveProperty('source');
        expect(projection).not.toHaveProperty('custody');
        expect(projection.money[0]).not.toHaveProperty('proofBytes');
        expect(projection.money[0]).not.toHaveProperty('accountAfter');
        expect(projection.money[0]).not.toHaveProperty('privateAccountOpening');
        expect(fetcher).not.toHaveBeenCalled();
        expect(f.counts()).toEqual(before);
        const other=await sdk.createReceizIdentityKeyFile({owner:{uid:source.custody.accountId}});
        await expect(admitVaultPrivateSourceForBank({...source,custody:{...source.custody,keyFileText:sdk.serializeReceizIdentityArtifact(other.keyFile)}},{sdk:async()=>sdk,native:f.options.native})).rejects.toThrow('KEY_MISMATCH');
        const changed=structuredClone(source);(changed.workflows.money as {childKeyId:string}).childKeyId='c'.repeat(64);
        await expect(admitVaultPrivateSourceForBank(changed,{sdk:async()=>sdk,native:f.options.native,money:f.options.moneyNative!({} as never)})).rejects.toThrow('CUSTODY_CHANGED');
    }finally{fetcher.mockRestore();}
});
it('independent private admission identifies prepared custody without claiming accepted native ownership',async()=>{
    const f=await fixture(),manager=createVaultManager(f.options);
    await expect(manager.create({name:'Prepared'}, {...f.interaction,saveAndReopen:async()=>png})).rejects.toThrow();
    const stored=[...f.memory.values.values()][0];
    if(stored.envelope.schema!=='bank.vault.image-custody.v1')throw Error('expected image');
    const before=f.counts(),projection=await admitVaultPrivateSourceForBank(vaultBytes(stored.envelope.sourceB64u,32*1024*1024),{sdk:async()=>sdk,native:f.options.native});
    expect(projection).toMatchObject({phase:'prepared',nativeAccountAdmitted:false,pending:true,money:[],assets:[],investments:[]});
    expect(f.counts()).toEqual(before);manager.dispose();
});
it('rejects a public or malformed image before requesting ordinary account authority', async () => {
    await expect(openVaultPrivateOriginal(new Uint8Array([1, 2, 3]), { review: async () => true, saveAndReopen: async (image) => image.bytes }, { images: { verify: async () => false } as never })).rejects.toThrow('SEAL');
});
it('requires the actual saved prepared PNG before native custody creation and retains the same child for retry', async () => {
    const f = await fixture(), manager = createVaultManager(f.options);
    await expect(manager.create({ name: 'Family' }, { ...f.interaction, saveAndReopen: async () => png })).rejects.toThrow('FORMAT');
    expect(f.counts().creates).toBe(0);
    expect(f.counts().executions).toBe(0);
    const [locked] = await manager.list();
    expect(locked.name).toBe('Family');
    const session = await manager.open(locked.id, f.interaction);
    expect((await session.snapshot()).phase).toBe('prepared');
    const before = f.memory.values.get(f.parent.keyId + '|' + locked.id)!.envelope;
    await session.resume();
    expect((await session.snapshot()).phase).toBe('ready');
    expect(f.counts().creates).toBe(1);
    const carrier = f.memory.values.get(f.parent.keyId + '|' + locked.id)!.envelope;
    if (before.schema !== 'bank.vault.image-custody.v1' || carrier.schema !== 'bank.vault.image-custody.v1')
        throw Error('expected image');
    const a = await readVaultPrivateSource(vaultBytes(before.sourceB64u, 32 * 1024 * 1024)), b = await readVaultPrivateSource(vaultBytes(carrier.sourceB64u, 32 * 1024 * 1024));
    expect(a.custody.keyId).toBe(b.custody.keyId);
    expect(a.custody.submissionRef).toBe(b.custody.submissionRef);
    expect(JSON.stringify(b)).not.toContain(f.parent.keyFile.crypto.privateKeyPkcs8B64u!);
    manager.dispose();
});
it('composes actual money controller retention, exact backup and once-only resume without ordinary stores', async () => {
    const f = await fixture(), manager = createVaultManager(f.options), session = await manager.create({ name: 'Money' }, f.interaction);
    await session.addBalance({ id: 'exact-add-1', amountUsdCents: '100', rail: 'reserve' });
    expect(f.counts().executions).toBe(1);
    const snapshot = await session.snapshot();
    expect(snapshot.money[0].amountUsdCents).toBe('100');
    expect(snapshot.pending).toBe(false);
    await session.addBalance({ id: 'exact-add-1', amountUsdCents: '100', rail: 'reserve' });
    await session.resume();
    expect(f.counts().executions).toBe(1);
    expect(f.saved.length).toBeGreaterThanOrEqual(2);
    expect(f.reviews).toEqual(['create', 'money']);
    const image = await session.exportPrivate(), fresh = memoryStore();
    session.lock();
    const child = await openVaultPrivateOriginal(image.bytes, f.interaction, { ...f.options, store: fresh.store });
    expect((await child.snapshot()).money[0].noteId).toBe('exact-add-1');
    expect(f.counts().executions).toBe(1);
    await child.resume();
    expect(f.counts().executions).toBe(1);
    child.lock();
    manager.dispose();
});
it('passes no parent capability to standalone original opening and fails new parent-required custody explicitly', async () => {
    const f = await fixture(), manager = createVaultManager(f.options), session = await manager.create({ name: 'Private' }, f.interaction), image = await session.exportPrivate();
    manager.dispose();
    const before = f.counts().parents;
    const { parent: _parent, ownerKeyId: _owner, ...childOptions } = f.options;
    const independent = await openVaultPrivateOriginal(image.bytes, f.interaction, { ...childOptions, store: memoryStore().store });
    expect(f.counts().parents).toBe(before);
    await expect(independent.addCard({ amount: '1.00' })).rejects.toThrow('PARENT_REQUIRED');
    expect(f.counts().cardStarts).toBe(0);
    independent.lock();
});
it('releases standalone manager background listeners when its only private session locks',async()=>{
    const f=await fixture(),manager=createVaultManager(f.options),session=await manager.create({name:'Lifetime'},f.interaction),image=await session.exportPrivate();manager.dispose();
    const documentTarget=Object.assign(new EventTarget(),{visibilityState:'visible'}),windowTarget=new EventTarget();
    const removeDocument=vi.spyOn(documentTarget,'removeEventListener'),removeWindow=vi.spyOn(windowTarget,'removeEventListener');
    vi.stubGlobal('document',documentTarget);vi.stubGlobal('window',windowTarget);
    try{
        const independent=await openVaultPrivateOriginal(image.bytes,f.interaction,{...f.options,store:memoryStore().store});
        independent.lock();
        expect(removeDocument).toHaveBeenCalledWith('visibilitychange',expect.any(Function));
        expect(removeWindow).toHaveBeenCalledWith('pagehide',expect.any(Function));
        await expect(independent.snapshot()).rejects.toThrow('CLOSED');
    }finally{vi.unstubAllGlobals();}
});
it('rejects a stale imported original rather than replacing a stronger local source', async () => {
    const f = await fixture(), manager = createVaultManager(f.options), session = await manager.create({ name: 'Family' }, f.interaction), old = await session.exportPrivate();
    await session.addBalance({ id: 'exact-add-2', amountUsdCents: '100' });
    await expect(manager.importPrivate(old.bytes, f.interaction)).rejects.toThrow('CONFLICT');
    expect((await session.snapshot()).money).toHaveLength(1);
    manager.dispose();
});
it('rejects public proof images and late approvals after lock before any native value write', async () => {
    const f = await fixture(), manager = createVaultManager(f.options), image = insertPngTextChunks(png, [{ keyword: 'receiz.bank.vault.public.v1', text: '{}' }]);
    await expect(manager.importPrivate(image, f.interaction)).rejects.toThrow('PRIVATE_ORIGINAL');
    let release!: (v: boolean) => void, entered!: () => void;
    const ready = new Promise<void>(r => { entered = r; });
    const session = await manager.create({ name: 'Family' }, { ...f.interaction, review: async (r) => r.kind === 'money' ? new Promise(resolve => { release = resolve; entered(); }) : true });
    const run = session.addBalance({ id: 'exact-add-3', amountUsdCents: '100' });
    await ready;
    session.lock();
    release(true);
    await expect(run).rejects.toThrow('CLOSED');
    expect(f.counts().executions).toBe(0);
    manager.dispose();
});
it('forwards the Vault lifetime to parent transport and refuses a late parent response after locking',async()=>{
    const f=await fixture(),baseParent=f.options.parent!,baseMoney=f.options.moneyNative!;
    let pendingSignal:AbortSignal|undefined,entered!:()=>void,release!:()=>void;
    const ready=new Promise<void>(resolve=>{entered=resolve;});
    const manager=createVaultManager({...f.options,parent:async()=>{const p=await baseParent();return{...p,request:async(path,options)=>{if(path!=='/synthetic-late-request')return p.request(path,options);pendingSignal=options.signal;entered();await new Promise<void>(resolve=>{release=resolve;});return{};}};},moneyNative:input=>{const n=baseMoney(input);return{...n,execute:async(kind,request,recover,capacity)=>{await(await input.owner()).request('/synthetic-late-request',{method:'POST',body:{}});return n.execute(kind,request,recover,capacity);}};}});
    const session=await manager.create({name:'Scoped'},f.interaction),running=session.addBalance({id:'scoped-parent-deposit',amountUsdCents:'100'});
    await ready;session.lock();
    expect(pendingSignal?.aborted).toBe(true);release();
    await expect(running).rejects.toThrow('CLOSED');expect(f.counts().executions).toBe(0);manager.dispose();
});
it('keeps passkey protection and requires the same key on a fresh imported original', async () => {
    const f = await fixture(), manager = createVaultManager(f.options), session = await manager.create({ name: 'Protected', protection: 'passkey' }, f.interaction), image = await session.exportPrivate();
    expect((await session.snapshot()).protection).toBe('passkey');
    const opened = await openVaultImage(image.bytes, async () => true);
    if (opened.kind !== 'private')
        throw Error('expected private');
    expect(opened.value.schema).toBe('bank.vault.encrypted.v1');
    expect(JSON.stringify(opened.value)).not.toContain('custody');
    await expect(openVaultPrivateOriginal(image.bytes, f.interaction, { ...f.options, store: memoryStore().store, presence: async () => new Uint8Array(32).fill(8) })).rejects.toThrow();
    expect(f.counts().executions).toBe(0);
    manager.dispose();
});
it('seals and independently verifies a child-only private PNG using the actual canonical generic SDK sealer', async () => {
    const f = await fixture(), canonical = await conformanceOfflineFixture(), offline = canonical.runtime.offline;
    const sealer = offline.createReceizOfflineSealer({ store: canonical.store, resources: await canonical.ports.resources!(), fetch: async () => { throw Error('LIVE_ENROLLMENT_FORBIDDEN'); } });
    const verify = async (bytes: Uint8Array) => (await canonical.runtime.verifyReceizArtifact(bytes)).status === 'verified-artifact';
    const manager = createVaultManager({ ...f.options, images: { render: async () => png, seal: input => sealer.seal(input), verify } }), session = await manager.create({ name: 'Canonical' }, f.interaction), image = await session.exportPrivate();
    expect(await verify(image.bytes)).toBe(true);
    const stripped=stripPngTextChunksByKeyword(image.bytes,'receiz.bank.vault.private.v1');
    const changed=insertPngTextChunks(stripped.pngBytes,[{keyword:'receiz.bank.vault.private.v1',text:'{}'}]);
    expect(await verify(changed)).toBe(false);
    const opened = await openVaultImage(image.bytes, verify);
    expect(opened.kind).toBe('private');
    if (opened.kind !== 'private')
        throw Error('expected private');
    expect(opened.value.header.owner.keyId).toBe(f.parent.keyId);
    const { parent: _parent, ownerKeyId: _owner, ...options } = f.options;
    const restored = await openVaultPrivateOriginal(image.bytes, f.interaction, { ...options, store: memoryStore().store, images: { render: async () => png, seal: input => sealer.seal(input), verify } });
    expect((await restored.snapshot()).name).toBe('Canonical');
    restored.lock();
    manager.dispose();
}, 60000);
it('retains exact card intent before checkout and refuses another creation after a lost reply', async () => {
    const f = await fixture(), manager = createVaultManager({ ...f.options, parent: async () => { const p = await f.options.parent!(); return { ...p, beginCard: async () => { throw Error('lost reply'); } }; } }), session = await manager.create({ name: 'Card' }, f.interaction), id = crypto.randomUUID();
    await expect(session.addCard({ id, amount: '1.00' })).rejects.toThrow('lost reply');
    expect((await session.snapshot()).cards).toEqual([{ id, amountUsdCents: '100', phase: 'creating', checkout: null }]);
    await expect(session.addCard({ id, amount: '1.00' })).rejects.toThrow('lost reply');
    expect(f.counts().executions).toBe(0);
    manager.dispose();
});
it('recovers the same card request after a lost checkout reply without creating another charge',async()=>{
 const f=await fixture();let accepted=0,replies=0,exact:unknown;const checkout={sessionId:'cs_recovered_original',clientSecret:'original-secret',amountUsdCents:'100'};
 const manager=createVaultManager({...f.options,parent:async()=>({...await f.options.parent!(),beginCard:async(_amount,reference,request)=>{expect(request).toBeDefined();if(!exact){exact=structuredClone(request);accepted++;}else expect(request).toEqual(exact);expect((request as {referenceId:string}).referenceId).toBe(reference);if(++replies===1)throw Error('lost reply');return checkout;}})});
 const session=await manager.create({name:'Recover'},f.interaction),id=crypto.randomUUID();await expect(session.addCard({id,amount:'1.00'})).rejects.toThrow('lost reply');await session.resume();expect((await session.snapshot()).cards).toEqual([{id,amountUsdCents:'100',phase:'checkout',checkout}]);expect((await session.snapshot()).pending).toBe(false);expect(accepted).toBe(1);expect(f.counts().executions).toBe(0);manager.dispose();
});
it('recovers the original pre-submission card backup on a fresh device with identical provider parameters',async()=>{
 const f=await fixture();let exact:unknown,accepted=0;const checkout={sessionId:'cs_recovered_original',clientSecret:'original-secret',amountUsdCents:'100'};
 const parent=async()=>({...await f.options.parent!(),beginCard:async(_amount:string,_reference:string,request?:unknown)=>{if(!exact){exact=structuredClone(request);accepted++;throw Error('lost reply');}expect(request).toEqual(exact);return checkout;}});
 const manager=createVaultManager({...f.options,parent}),session=await manager.create({name:'Recover backup'},f.interaction),id=crypto.randomUUID();await expect(session.addCard({id,amount:'1.00'})).rejects.toThrow('lost reply');const backup=f.saved.at(-1)!;manager.dispose();
 const restored=createVaultManager({...f.options,parent,store:memoryStore().store}),cold=await restored.importPrivate(backup.bytes,f.interaction);await cold.resume();expect((await cold.snapshot()).cards[0]).toEqual({id,amountUsdCents:'100',phase:'checkout',checkout});expect(accepted).toBe(1);expect(f.counts().executions).toBe(0);cold.lock();
});
it('checks the carried card session and allocates its Reserve once through the native money controller', async () => {
    const f = await fixture(), manager = createVaultManager(f.options), session = await manager.create({ name: 'Card' }, f.interaction), id = crypto.randomUUID();
    const started = await session.addCard({ id, amount: '1.00' });
    expect(started.checkout.amountUsdCents).toBe('100');
    expect(f.counts().cardStarts).toBe(1);
    await session.checkCard(id);
    await session.checkCard(id);
    expect(f.counts().executions).toBe(1);
    expect((await session.snapshot()).money[0].rail).toBe('reserve');
    manager.dispose();
});
it('sends and returns using only carried child authority after a cold private import', async () => {
    for (const kind of ['send', 'return'] as const) {
        const f = await fixture(), manager = createVaultManager(f.options), session = await manager.create({ name: 'Child custody' }, f.interaction);
        await session.addBalance({ id: 'parent-deposit', amountUsdCents: '100', rail: 'reserve' });
        const image = await session.exportPrivate();
        manager.dispose();
        const before = f.counts().parents;
        const restored = await openVaultPrivateOriginal(image.bytes, f.interaction, { ...f.options, store: memoryStore().store });
        if (kind === 'send')
            await restored.sendMoney({ id: 'child-outgoing', amountUsdCents: '100', rail: 'reserve', recipient: 'recipient.receiz.id' });
        else
            await restored.returnMoney({ id: 'child-outgoing', amountUsdCents: '100', rail: 'reserve' });
        expect((await restored.snapshot()).money).toEqual([]);
        expect(f.counts().parents).toBe(before);
        expect(f.counts().childCalls).toBe(2);
        await restored.resume();
        expect(f.counts().executions).toBe(3);
        await expect(restored.addBalance({ amountUsdCents: '100' })).rejects.toThrow('PARENT_REQUIRED');
        expect((await restored.snapshot()).pending).toBe(false);
        restored.lock();
    }
});

it('cancelled creation acquires no parent grant, storage or passkey',async()=>{
 const f=await fixture(),manager=createVaultManager(f.options);
 await expect(manager.create({name:'Cancelled',protection:'passkey'},{...f.interaction,review:async()=>false})).rejects.toThrow('CANCELLED');
 expect(f.counts().parents).toBe(0);expect(f.counts().secretRequests).toBe(0);expect(f.memory.values.size).toBe(0);manager.dispose();
});

it('backgrounding aborts an opening passkey prompt and cannot return an unlocked late session',async()=>{
 const document=new(class extends EventTarget{visibilityState='visible';})();vi.stubGlobal('document',document);
 try{
  const f=await fixture();let defer=false,release!:(v:Uint8Array)=>void,entered!:()=>void;const enteredPrompt=new Promise<void>(r=>{entered=r;});
  const manager=createVaultManager({...f.options,presence:async()=>{if(!defer)return new Uint8Array(32).fill(7);entered();return new Promise(resolve=>{release=resolve;});}});
  const session=await manager.create({name:'Protected',protection:'passkey'},f.interaction),id=(await session.snapshot()).id;session.lock();defer=true;
  const opening=manager.open(id,f.interaction);await enteredPrompt;document.visibilityState='hidden';document.dispatchEvent(new Event('visibilitychange'));release(new Uint8Array(32).fill(7));
  await expect(opening).rejects.toThrow('CLOSED');manager.dispose();
 }finally{vi.unstubAllGlobals();}
});

it('uses the exact complete source and carrier sizes to refuse a native money reservation before execution',async()=>{
 const f=await fixture(),base=f.options.moneyNative!,manager=createVaultManager({...f.options,moneyNative:input=>({...base(input),reserve:async(kind,request,originals)=>({...await base(input).reserve(kind,request,originals),reservedSourceBytes:33*1024*1024})})});
 const session=await manager.create({name:'Capacity'},f.interaction);
 await expect(session.addBalance({id:'capacity-deposit',amountUsdCents:'100'})).rejects.toThrow('SOURCE_CAPACITY');
 expect(f.counts().executions).toBe(0);expect((await session.snapshot()).pending).toBe(true);manager.dispose();
});

it('does not return a private image if its sealing callback finishes after the session is locked',async()=>{
 const f=await fixture();let deferred=false,release!:(v:{artifactBytes:Uint8Array})=>void,entered!:()=>void,held!:Uint8Array;const pendingSeal=new Promise<void>(r=>{entered=r;});
 const manager=createVaultManager({...f.options,images:{...f.options.images!,seal:async input=>{if(!deferred)return{artifactBytes:input.bytes};held=input.bytes;entered();return new Promise(resolve=>{release=resolve;});}}});
 const session=await manager.create({name:'Private'},f.interaction);deferred=true;
 const exporting=session.exportPrivate();await pendingSeal;session.lock();release({artifactBytes:held});
 await expect(exporting).rejects.toThrow('CLOSED');manager.dispose();
});

it('cancelled money review leaves no pending intent and permits a different reviewed amount',async()=>{
 const f=await fixture(),manager=createVaultManager(f.options);let cancel=true;
 const session=await manager.create({name:'Review'}, {...f.interaction,review:async review=>review.kind==='money'&&cancel?false:true});
 await expect(session.addBalance({id:'cancelled-money',amountUsdCents:'100'})).rejects.toThrow('REVIEW_CANCELLED');
 expect((await session.snapshot()).pending).toBe(false);expect(f.counts().executions).toBe(0);cancel=false;
 await session.addBalance({id:'different-money',amountUsdCents:'50'});expect((await session.snapshot()).money[0].amountUsdCents).toBe('50');manager.dispose();
});

it('keeps unresolved card coordination separate from lawful movement of already admitted Vault value',async()=>{
 const f=await fixture(),manager=createVaultManager({...f.options,parent:async()=>({...await f.options.parent!(),beginCard:async()=>{throw Error('VAULT_CARD_RESULT_UNKNOWN');}})}),session=await manager.create({name:'Independent value'},f.interaction),id=crypto.randomUUID();
 await session.addBalance({id:'existing-reserve',amountUsdCents:'100',rail:'reserve'});await expect(session.addCard({id,amount:'1.00'})).rejects.toThrow('RESULT_UNKNOWN');
 await session.returnMoney({id:'return-existing-reserve',amountUsdCents:'100',rail:'reserve'});const view=await session.snapshot();expect(view.money).toEqual([]);expect(view.pending).toBe(true);expect(view.financialPending).toBe(false);expect(view.cards).toEqual([{id,amountUsdCents:'100',phase:'creating',checkout:null}]);manager.dispose();
});
it('independent private projection never emits the retained card secret or provider session',async()=>{
 const f=await fixture(),manager=createVaultManager(f.options),session=await manager.create({name:'Card privacy'},f.interaction);await session.addCard({amount:'1.00'});
 const image=await session.exportPrivate(),opened=await openVaultImage(image.bytes,async()=>true);if(opened.kind!=='private'||opened.value.schema!=='bank.vault.image-custody.v1')throw Error('private expected');
 const projection=await admitVaultPrivateSourceForBank(vaultBytes(opened.value.sourceB64u,32*1024*1024),{sdk:async()=>sdk,native:f.options.native,money:f.options.moneyNative!({} as never)});
 expect(JSON.stringify(projection)).not.toContain('cs_actual_session');expect(projection).not.toHaveProperty('cards');expect(projection).not.toHaveProperty('clientSecret');expect(projection.money).toEqual([]);manager.dispose();
});
it('adopts a retained checkout after the caller locks between provider response and Vault journal retention',async()=>{
 const f=await fixture();let first=true,accepted=0,lock:()=>void=()=>{};const checkout={sessionId:'cs_recovered_original',clientSecret:'original-secret',amountUsdCents:'100'};
 const manager=createVaultManager({...f.options,parent:async()=>({...await f.options.parent!(),beginCard:async()=>{if(first){first=false;accepted++;lock();}return checkout;}})}),session=await manager.create({name:'Late checkout'},f.interaction),vaultId=(await session.snapshot()).id,id=crypto.randomUUID();lock=()=>session.lock();
 await expect(session.addCard({id,amount:'1.00'})).rejects.toThrow('CLOSED');const restored=await manager.open(vaultId,f.interaction);expect(await restored.addCard({id,amount:'1.00'})).toEqual({id,checkout});expect(accepted).toBe(1);expect((await restored.snapshot()).pending).toBe(false);expect(f.counts().executions).toBe(0);manager.dispose();
});
it('checking an unresolved exact checkout reconciles first and allocates actual native Reserve only once',async()=>{
 const f=await fixture();let first=true;const manager=createVaultManager({...f.options,parent:async()=>({...await f.options.parent!(),beginCard:async()=>{if(first){first=false;throw Error('lost reply');}return{sessionId:'cs_recovered_original',clientSecret:'original-secret',amountUsdCents:'100'};}})}),session=await manager.create({name:'Check recovery'},f.interaction),id=crypto.randomUUID();
 await expect(session.addCard({id,amount:'1.00'})).rejects.toThrow('lost reply');expect(await session.checkCard(id)).toMatchObject({status:'credited'});await session.checkCard(id);expect(f.counts().executions).toBe(1);expect((await session.snapshot()).cards[0].phase).toBe('allocated');manager.dispose();
});

it('a pending native allocation stays financially pending even when the same Vault has an unresolved card',async()=>{
 const f=await fixture();let fail=false;const base=f.options.moneyNative!;
 const manager=createVaultManager({...f.options,parent:async()=>({...await f.options.parent!(),beginCard:async()=>{throw Error('VAULT_CARD_RESULT_UNKNOWN');}}),moneyNative:input=>{const n=base(input);return{...n,execute:async(...args)=>{if(fail)throw Error('lost native reply');return n.execute(...args);}};}}),session=await manager.create({name:'Two distinct pending boundaries'},f.interaction);
 await session.addBalance({id:'held-value',amountUsdCents:'100',rail:'reserve'});await expect(session.addCard({id:crypto.randomUUID(),amount:'1.00'})).rejects.toThrow('RESULT_UNKNOWN');fail=true;await expect(session.addBalance({id:'pending-native-add',amountUsdCents:'100',rail:'reserve'})).rejects.toThrow('lost native reply');
 const view=await session.snapshot();expect(view.pending).toBe(true);expect(view.financialPending).toBe(true);expect(view.cards[0].phase).toBe('creating');await expect(session.returnMoney({id:'must-stay-fenced',amountUsdCents:'100',rail:'reserve'})).rejects.toThrow('OPERATION_PENDING');manager.dispose();
});
it('a credited card with an unknown native Note allocation remains financially pending',async()=>{
 const f=await fixture(),base=f.options.moneyNative!,manager=createVaultManager({...f.options,moneyNative:input=>({...base(input),execute:async()=>{throw Error('lost allocation reply');}})}),session=await manager.create({name:'Credited allocation recovery'},f.interaction),id=crypto.randomUUID();await session.addCard({id,amount:'1.00'});await expect(session.checkCard(id)).rejects.toThrow('lost allocation reply');const view=await session.snapshot();expect(view.pending).toBe(true);expect(view.financialPending).toBe(true);expect(view.cards[0].phase).toBe('checkout');manager.dispose();
});
