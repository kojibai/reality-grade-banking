import {beforeAll, afterEach, expect, it, vi} from 'vitest';
import {Window} from 'happy-dom';
import {createOwnerDocumentWorkspace, readOwnerDocumentOutputs, openOwnerDocumentOutput} from '../src/receiz/owner-document-workspace';
import {buildBusinessDocumentContext} from '../src/receiz/business-document-context';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createProofLibrary, type ProofSource} from '../src/receiz/proof-library';
import {createRecordProofExports, type RecordProofExportCheckpoint, type RecordProofExportInput} from '../src/receiz/record-proof-export';
import {readBusinessDocumentMetadata, renderBusinessDocument, type BusinessDocumentDraft} from '../src/receiz/business-document';
import type {NativeTwinAsk, NativeTwinReply} from '../src/receiz/native-twin';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {NativeMessaging} from '../src/receiz/native-messaging';

const sdkPort = vi.hoisted(() => ({runtime: null as unknown}));
vi.mock('../src/receiz/client', () => ({loadReceiz: async () => sdkPort.runtime}));
const ownerUid = '11111111-1111-4111-8111-111111111111', threadKey = `api:${ownerUid}:33333333-3333-4333-8333-333333333333`;
const draft: BusinessDocumentDraft = {kind: 'document', title: 'Operating report', summary: 'The complete reviewed operating plan.', sections: [{heading: 'Plan', body: 'Keep the source records and document the agreed operating steps.'}], tables: [{title: 'Actions', columns: ['Action', 'Owner'], rows: [['Review the booking flow', 'Studio']]}]};
let fixture: Awaited<ReturnType<typeof conformanceOfflineFixture>>, binding: {keyId: string; artifactOwnerReceizId: string}, sealer: ReturnType<typeof fixture.runtime.offline.createReceizOfflineSealer>, foreign: typeof sealer;
beforeAll(async () => {
  fixture = await conformanceOfflineFixture({account: true}); sdkPort.runtime = fixture.runtime;
  const admission = await fixture.runtime.createReceizArtifactAdmissionEngine()(await fixture.runtime.verifyReceizArtifact(fixture.identity.bytes), {profile: 'identity', identityPassphrase: fixture.identity.phrase});
  binding = await fixture.runtime.readReceizIdentityPublicBinding(admission);
  sealer = fixture.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission: admission, store: fixture.store, resources: fixture.resources, fetch: async () => {throw Error('NETWORK_FORBIDDEN');}});
  const other = await fixture.otherIdentity(), otherAdmission = await fixture.runtime.createReceizArtifactAdmissionEngine()(await fixture.runtime.verifyReceizArtifact(other.bytes), {profile: 'identity', identityPassphrase: other.phrase});
  foreign = fixture.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission: otherAdmission, store: fixture.store, resources: fixture.resources, fetch: async () => {throw Error('NETWORK_FORBIDDEN');}});
}, 60000);
afterEach(() => vi.unstubAllGlobals());
const reply = (value = draft): NativeTwinReply => ({requestId: 'fixture-request', message: JSON.stringify(value), authority: 'generated-interpretation', source: 'upstream', memoryScope: 'session', memory: [], sourceReferences: [], sharedContext: [], actionHandoffs: []});
function setup(options: {context?: readonly {id: string; title: string; text: string}[]; files?: readonly File[]} = {}) {
  let current = true, account = ownerUid, retained: unknown = null, archive: ProofSource[] = [];
  const records = options.context ?? Array.from({length: 20}, (_, i) => ({id: `memory-${i}`, title: `Private Ledger ${i}`, text: `Approved selected operating context ${i}. ${'Prior details. '.repeat(200)}`}));
  const library = createProofLibrary({binding, assertOpen() {if (!current) throw Error('CLOSED');}, readOwned: async () => [], readArchive: async () => archive, readRecoveries: async () => [], readNotes: async () => [], commit: async sources => {archive = [...archive, ...sources]; return {added: sources.length, alreadyHeld: 0};}});
  const checkpoints = new Map<string, RecordProofExportCheckpoint>(), blobs = new Map<string, Uint8Array>();
  const exports = createRecordProofExports({assertOpen() {if (!current) throw Error('CLOSED');}, read: async key => checkpoints.get(key) ?? null, write: async (key, next) => {checkpoints.set(key, next);}, retain: async bytes => {const digest = await fixture.runtime.sha256ReceizBytes(bytes); blobs.set(digest, new Uint8Array(bytes)); return digest;}, restore: async digest => {const bytes = blobs.get(digest); if (!bytes) throw Error('MISSING'); return new Uint8Array(bytes);}, seal: input => sealer.seal(input)});
  const ask = vi.fn(async (_question: NativeTwinAsk) => reply()), seal = vi.fn((input: RecordProofExportInput) => exports.export(input));
  const save = vi.fn(async (_key: string, value: unknown) => {retained = structuredClone(value);});
  const api = {accountUid: ownerUid, twin: {ask}, knownOwnerDocumentWork: () => structuredClone(retained), saveOwnerDocumentWork: save, send: vi.fn(), uploadAttachment: vi.fn(), messages: vi.fn(), createConversation: vi.fn()} as unknown as NativeMessaging;
  const readRecord = vi.fn((descriptor: Parameters<typeof exports.readDescriptor>[0]) => exports.readDescriptor(descriptor));
  const identity = {binding, walletReceivingAddress: () => account, knownProfile: () => ({userId: account, displayName: 'Studio', username: 'studio'}), accountUsername: () => 'studio', username: 'studio', sealRecordExport: seal, readRecordExport: readRecord, proofLibrary: async () => library} as unknown as OpenIdentity;
  const make = (files = options.files ?? []) => createOwnerDocumentWorkspace({identity, api, threadKey, context: records, files, isCurrent: () => current});
  return {work: make(), make, api, identity, ask, seal, readRecord, save, library, retained: () => structuredClone(retained), setRetained(value: unknown) {retained = structuredClone(value);}, leave() {current = false;}, returnToSameOwner() {current = true;}, switchAccount() {account = '22222222-2222-4222-8222-222222222222';}};
}

it('starts a private owner workspace without making a human conversation or native message', () => {
  const ownerUid = '11111111-1111-4111-8111-111111111111';
  const identity = {binding: {artifactOwnerReceizId: 'owner.receiz.id'}} as unknown as OpenIdentity;
  const api = {accountUid: ownerUid, knownOwnerDocumentWork: () => null} as unknown as NativeMessaging;
  const work = createOwnerDocumentWorkspace({identity, api, threadKey: `api:${ownerUid}`, context: [], isCurrent: () => true});
  expect(work.snapshot()).toMatchObject({mode: 'private', phase: 'idle', terms: null, original: null, sentMessage: null});
  expect(readOwnerDocumentOutputs(null)).toEqual([]);
});
it('refuses another owner’s Twin thread before any work can start', () => {
  expect(() => createOwnerDocumentWorkspace({identity: {} as OpenIdentity, api: {accountUid: 'owner'} as NativeMessaging, threadKey: 'api:someone-else', context: [], isCurrent: () => true})).toThrow();
});

it('uses the exact existing owner thread and full instruction with bounded approved excerpts and no mutation tools', async () => {
  const s = setup(), instruction = `Prepare my operating report. ${'Complete requirements. '.repeat(95)}`;
  expect(instruction.length).toBeGreaterThan(1200); await s.work.generate('document', instruction);
  expect(s.ask).toHaveBeenCalledOnce(); const question = s.ask.mock.calls[0][0]; expect(question.threadKey).toBe(threadKey); expect(question.message.length).toBeLessThanOrEqual(1200);
  expect(question.context?.records[0]).toMatchObject({title: 'Your document request', text: instruction}); expect(question.context!.records.length).toBeLessThanOrEqual(12);
  expect(question.context!.records.reduce((sum, row) => sum + row.id.length + row.title.length + row.text.length, 0)).toBeLessThanOrEqual(16000);
  for (const flag of ['receizTools', 'businessSetup', 'moneyTools', 'organizerTools', 'worldTools']) expect(question).not.toHaveProperty(flag);
  expect(s.work.snapshot()).toMatchObject({mode: 'private', phase: 'review', draft, hasEarlier: true, terms: null, sentMessage: null});
  expect(s.seal).not.toHaveBeenCalled(); expect(s.api.send).not.toHaveBeenCalled(); expect(s.api.uploadAttachment).not.toHaveBeenCalled(); expect(s.api.createConversation).not.toHaveBeenCalled();
});

it('rejects an oversized complete instruction without truncating or asking the Twin', async () => {
  const s = setup(); await s.work.generate('document', 'x'.repeat(2401)); expect(s.ask).not.toHaveBeenCalled(); expect(s.work.snapshot().error).toContain('2400'); expect(s.seal).not.toHaveBeenCalled();
});

it('previews real private payload metadata without exposing context titles or source filenames', async () => {
  const file = new File(['Selected facts for the report.'], 'confidential-source-ledger.txt', {type: 'text/plain'}), s = setup({files: [file]});
  await s.work.generate('document', 'Use the selected file.'); await s.work.preview(); const state = s.work.snapshot(); expect(state.phase, state.error).toBe('ready');
  const raw = await readBusinessDocumentMetadata(new Uint8Array(await state.payload!.arrayBuffer()), state.payload!.type), metadata = JSON.parse(raw);
  expect(metadata).toMatchObject({schema: 'bankeiz.owner-document.v1', threadKey, ownerUid, ownerReceizId: binding.artifactOwnerReceizId, draft});
  expect(metadata).not.toHaveProperty('conversationId'); expect(metadata).not.toHaveProperty('signatureRequested'); expect(metadata.source.refs.every((row: Record<string, unknown>) => Object.keys(row).sort().join('|') === 'digest|id')).toBe(true);
  expect(metadata.source.files[0]).toMatchObject({size: file.size, mime: file.type, canonical: false}); expect(raw).not.toContain('Private Ledger'); expect(raw).not.toContain(file.name);
  expect(JSON.stringify(s.ask.mock.calls[0][0].context)).toContain(file.name); expect(s.seal).not.toHaveBeenCalled();
});

it.each(['pdf', 'docx', 'xlsx', 'pptx'] as const)('creates and retains a real SDK-owned private %s Original without messaging', async format => {
  const s = setup({context: []}); s.work.updateDraft(draft); s.work.setFormat(format); await s.work.preview(); expect(s.work.snapshot().phase, s.work.snapshot().error).toBe('ready');
  const payload = s.work.snapshot().payload!; await s.work.send(); const state = s.work.snapshot(); expect(state.phase, state.error).toBe('created'); expect(state.terms).toBeNull(); expect(state.sentMessage).toBeNull();
  expect(s.seal).toHaveBeenCalledOnce(); const captured = s.seal.mock.calls[0][0]; expect(captured.filename).toBe(payload.name); expect(captured.mimeType).toBe(payload.type); expect(captured.bytes).toEqual(new Uint8Array(await payload.arrayBuffer()));
  const opened = await fixture.runtime.createReceizClient().artifacts.verifyAndOpen(state.original!); expect(opened.sealedArtifact.continuity.ownerReceizId).toBe(binding.artifactOwnerReceizId); expect(opened.verifiedPayload.bytes).toEqual(new Uint8Array(await payload.arrayBuffer()));
  const output = readOwnerDocumentOutputs(s.retained())[0]; expect(output).toMatchObject({title: draft.title, format, termsDigest: captured.recordHash});
  expect((await s.library.exportProof(output.artifactSha256)).bytes).toEqual(new Uint8Array(await state.original!.arrayBuffer()));
  const creating = s.save.mock.calls.findIndex(([, value]) => (value as {phase: string}).phase === 'creating'); expect(creating).toBeGreaterThanOrEqual(0); expect(s.save.mock.invocationCallOrder[creating]).toBeLessThan(s.seal.mock.invocationCallOrder[0]);
  expect(JSON.stringify(s.retained())).not.toMatch(/artifactBytes|fileBytes|proofbundle|pbiAuthorship|privateKey|passphrase/); expect(s.api.send).not.toHaveBeenCalled(); expect(s.api.uploadAttachment).not.toHaveBeenCalled();
  await s.work.send(); expect(s.seal).toHaveBeenCalledOnce();
}, 60000);

it('fails closed before sealing when the reviewed private checkpoint cannot be saved', async () => {
  const s = setup({context: []}); s.work.updateDraft(draft); await s.work.preview(); s.save.mockRejectedValueOnce(Error('Encrypted storage is unavailable.'));
  await s.work.send(); expect(s.seal).not.toHaveBeenCalled(); expect(s.work.snapshot().phase).not.toBe('created'); expect(s.work.snapshot().error).toContain('storage');
});

it('rejects raw and foreign-owner returned files through the real SDK guard', async () => {
  for (const mode of ['raw', 'foreign']) {
    const s = setup({context: []}); s.work.updateDraft(draft); await s.work.preview();
    s.seal.mockImplementationOnce(async input => {if (mode === 'raw') return new File([new Uint8Array(input.bytes)], input.filename, {type: input.mimeType}); const sealed = await foreign.seal({bytes: input.bytes, filename: input.filename, mimeType: input.mimeType}); return new File([new Uint8Array(sealed.artifactBytes)], sealed.filename, {type: sealed.mimeType});});
    await s.work.send(); expect(s.work.snapshot().phase).not.toBe('created'); expect(await s.library.list()).toEqual([]); expect(readOwnerDocumentOutputs(s.retained())).toEqual([]);
  }
}, 60000);

it('restores a cold output only on explicit check and preserves older exact Originals when new work starts', async () => {
  const s = setup({context: []}); s.work.updateDraft(draft); await s.work.preview(); await s.work.send(); const first = s.work.snapshot().original!, firstOutput = readOwnerDocumentOutputs(s.retained())[0];
  s.work.updateDraft({...draft, title: 'A second report'}); await s.work.preview(); await s.work.send(); expect(s.work.snapshot().phase, s.work.snapshot().error).toBe('created'); expect(readOwnerDocumentOutputs(s.retained())).toHaveLength(2);
  const cold = s.make([]); expect(cold.snapshot()).toMatchObject({phase: 'created', original: null, payload: null}); await cold.check(); expect(cold.snapshot().original).not.toBeNull(); expect(s.seal).toHaveBeenCalledTimes(2);
  const held = await openOwnerDocumentOutput({identity: s.identity, api: s.api, threadKey, artifactSha256: firstOutput.artifactSha256}); expect(held.draft).toEqual(draft); expect(new Uint8Array(await held.original.arrayBuffer())).toEqual(new Uint8Array(await first.arrayBuffer())); expect(s.seal).toHaveBeenCalledTimes(2);
}, 60000);

it('finds the exact retained Original after an output-checkpoint failure without resealing on cold recovery', async () => {
  const s = setup({context: []}); s.work.updateDraft(draft); await s.work.preview(); const save = s.save.getMockImplementation()!;
  s.save.mockImplementation(async (key, value) => {if ((value as {phase: string}).phase === 'created') throw Error('Lost output checkpoint'); await save(key, value);});
  await s.work.send(); expect(s.work.snapshot().phase).toBe('unknown'); expect(await s.library.list()).toHaveLength(1); expect(s.retained()).toMatchObject({phase: 'creating'});
  s.save.mockImplementation(save); const cold = s.make([]); expect(cold.snapshot().phase).toBe('unknown'); await cold.send(); expect(s.seal).toHaveBeenCalledOnce(); await cold.check(); expect(cold.snapshot().phase, cold.snapshot().error).toBe('created'); expect(s.seal).toHaveBeenCalledOnce();
}, 60000);

it('recovers the same retained Original in the live workspace after its final checkpoint failed', async () => {
  const s = setup({context: []}); s.work.updateDraft(draft); await s.work.preview(); const save = s.save.getMockImplementation()!;
  s.save.mockImplementation(async (key, value) => {if ((value as {phase: string}).phase === 'created') throw Error('Lost output checkpoint'); await save(key, value);});
  await s.work.send(); expect(s.work.snapshot().phase).toBe('unknown'); s.save.mockImplementation(save);
  await s.work.check(); expect(s.work.snapshot().phase, s.work.snapshot().error).toBe('created'); expect(s.seal).toHaveBeenCalledOnce(); expect(readOwnerDocumentOutputs(s.retained())).toHaveLength(1);
}, 60000);

it('reopens the exact retained seal checkpoint after library admission failed, without scanning or resealing', async () => {
  const s = setup({context: []}), inspect = vi.fn(s.library.inspect).mockRejectedValueOnce(Error('Library unavailable after seal'));
  s.identity.proofLibrary = async () => ({...s.library, inspect});
  s.work.updateDraft(draft); await s.work.preview(); const payload = s.work.snapshot().payload!; await s.work.send();
  expect(s.work.snapshot().phase).toBe('unknown'); expect(await s.library.list()).toEqual([]); expect(s.seal).toHaveBeenCalledOnce();
  const cold = s.make([]); await cold.check(); expect(cold.snapshot().phase, cold.snapshot().error).toBe('created'); expect(s.seal).toHaveBeenCalledOnce(); expect(s.readRecord).toHaveBeenCalledOnce();
  expect(new Uint8Array(await cold.snapshot().payload!.arrayBuffer())).toEqual(new Uint8Array(await payload.arrayBuffer())); expect(await s.library.list()).toHaveLength(1);
}, 60000);

it('recovers the exact old-thread Original after the view closes immediately after sealing', async () => {
  const s = setup({context: []}); s.work.updateDraft(draft); await s.work.preview(); const seal = s.seal.getMockImplementation()!;
  s.seal.mockImplementationOnce(async input => {const original = await seal(input); s.leave(); return original;});
  await s.work.send(); expect(s.work.snapshot().phase).toBe('unknown'); expect(s.retained()).toMatchObject({threadKey, phase: 'creating'});
  s.returnToSameOwner(); const cold = s.make([]); await cold.check(); expect(cold.snapshot().phase, cold.snapshot().error).toBe('created'); expect(s.seal).toHaveBeenCalledOnce(); expect(s.readRecord).toHaveBeenCalledOnce();
}, 60000);

it('refuses a substituted output locator and stops stale or switched-owner work before sealing', async () => {
  const s = setup({context: []}); s.work.updateDraft(draft); await s.work.preview(); s.switchAccount(); await s.work.send(); expect(s.seal).not.toHaveBeenCalled();
  const valid = setup({context: []}); valid.work.updateDraft(draft); await valid.work.preview(); await valid.work.send(); const saved = valid.retained() as {outputs: Record<string, unknown>[]}; const digest = String(saved.outputs[0].artifactSha256); saved.outputs[0].payloadSha256 = 'f'.repeat(64); valid.setRetained(saved);
  await expect(openOwnerDocumentOutput({identity: valid.identity, api: valid.api, threadKey, artifactSha256: digest})).rejects.toThrow();
  const stale = setup({context: []}); stale.work.updateDraft(draft); await stale.work.preview(); stale.leave(); await stale.work.send(); expect(stale.seal).not.toHaveBeenCalled();
}, 60000);

it('does not send PBI or private-key material to the Twin and never treats a failed proof carrier as plain text', async () => {
  const sensitive = setup({context: [{id: 'private', title: 'Identity', text: '{"privateKey":"do-not-disclose"}'}]}); await sensitive.work.generate('document'); expect(sensitive.ask).not.toHaveBeenCalled();
  const fake = new File(['{"kind":"receiz.bundle.v1","proofbundle":{},"originalBase64":"ZmFrZQ"}'], 'fake-proof.json', {type: 'application/json'}), s = setup({files: [fake], context: []});
  await s.work.generate('document'); expect(s.ask).not.toHaveBeenCalled(); expect(s.work.snapshot().phase).toBe('error');
});

it.each(['privateKeyPkcs8B64u', 'privateKeyPkcs8CiphertextB64u', 'wrapping_key_b64u', 'identityPassphrase', 'secretTokenB64u', 'pbiAuthorshipHistory'])('rejects actual custody and signature field %s before model disclosure', async field => {
  const s = setup({context: [{id: 'custody', title: 'Identity data', text: JSON.stringify({[field]: 'synthetic-do-not-disclose'})}]});
  await s.work.generate('document'); expect(s.ask).not.toHaveBeenCalled(); expect(s.work.snapshot().phase).toBe('error');
});

it('denies SDK identity schemas even without visible keys, including a canonically sealed Identity Record', async () => {
  const raw = setup({context: [{id: 'identity', title: 'Identity', text: JSON.stringify({schema: 'receiz.key.v1', owner: {receizId: 'public-id'}, crypto: {}})}]}); await raw.work.generate('document'); expect(raw.ask).not.toHaveBeenCalled();
  const identityFile = new File([new Uint8Array(fixture.identity.bytes)], 'identity.png', {type: 'image/png'}), selected = setup({context: [], files: [identityFile]});
  await selected.work.generate('document'); expect(selected.ask).not.toHaveBeenCalled(); expect(selected.work.snapshot().phase).toBe('error'); expect(selected.work.snapshot().error).toContain('credentials');
});

it('rejects escaped credential JSON keys and raw selected JSON files before asking the model', async () => {
  const hidden = setup({context: [{id: 'private', title: 'Selected JSON', text: '{"private\\u004beyPkcs8B64u":"synthetic"}'}]}); await hidden.work.generate('document'); expect(hidden.ask).not.toHaveBeenCalled();
  const file = new File([JSON.stringify({crypto: {privateKeyPkcs8CiphertextB64u: 'synthetic'}})], 'source.json', {type: 'application/json'}), selected = setup({context: [], files: [file]});
  await selected.work.generate('document'); expect(selected.ask).not.toHaveBeenCalled(); expect(selected.work.snapshot().error).toContain('credentials');
});

it('keeps ordinary Unicode financial business JSON available as approved context', async () => {
  const text = JSON.stringify({customer: 'Élodie · Анна · 你好', amountUsdCents: '10000', iban: 'DE89370400440532013000', note: 'Invoice payment terms'}), s = setup({context: [{id: 'invoice-source', title: 'Client invoice', text}]});
  await s.work.generate('document'); expect(s.ask).toHaveBeenCalledOnce(); expect(s.ask.mock.calls[0][0].context?.records[0].text).toBe(text);
});

it('reads bounded real raw Office context and a canonical Original payload without passing the proof bundle', async () => {
  vi.stubGlobal('DOMParser', new Window().DOMParser);
  const raw = await renderBusinessDocument({draft, format: 'docx', issuerName: 'Studio', createdAt: '2026-11-15T22:00:00.000Z'}), parts = await buildBusinessDocumentContext({context: [], files: [raw], assertCurrent() {}});
  expect(parts.records[0].text).toContain(draft.title); expect(parts.records[0].text).toContain('Full file SHA-256'); expect(parts.files[0].canonical).toBe(false);
  const sealed = await sealer.seal({bytes: new Uint8Array(await raw.arrayBuffer()), filename: raw.name, mimeType: raw.type}), original = new File([new Uint8Array(sealed.artifactBytes)], sealed.filename, {type: sealed.mimeType});
  const held = await buildBusinessDocumentContext({context: [], files: [original], assertCurrent() {}}); expect(held.files[0].canonical).toBe(true); expect(held.records[0].text).toContain(draft.title); expect(JSON.stringify(held.records)).not.toMatch(/proofbundle|pbiAuthorship|privateKey|passphrase/);
}, 60000);
