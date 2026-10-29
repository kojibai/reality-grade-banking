import { beforeEach, expect, it, vi } from 'vitest';
import { createProofLibrary, type ProofSource } from '../src/receiz/proof-library';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
const boundary = vi.hoisted(() => ({ open: vi.fn(), recover: vi.fn() }));
vi.mock('../src/receiz/client', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/receiz/client')>();
  return { ...actual, loadReceiz: async () => ({ ...await import('@receiz/sdk'),
    createReceizClient: () => ({ artifacts: { verifyAndOpen: boundary.open } }),
    recoverReceizPortableExecutionTransitionSetV124: boundary.recover,
  }) };
});
// Choreography fixtures simulate the SDK admission boundary. Separate tests
// below use the real pinned SDK to reject forged sources; no money is qualified.
const binding = { keyId: 'a'.repeat(64), artifactOwnerReceizId: 'fixture.receiz.id' };
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const recovery = () => ({ schema: 'receiz.portable-execution-transition-recovery.v124', transitionSet: { applicationId: BANK_APPLICATION_ID, members: [{ participantId: 'one', operationPlan: { applicationId: BANK_APPLICATION_ID, attemptId: 'fixture-attempt', operationKind: 'fixture-check', exactPlanDigest: 'b'.repeat(64) } }] }, members: [{}] });
beforeEach(() => {
  vi.clearAllMocks(); boundary.recover.mockResolvedValue({ status: 'recovered-portable-execution-transition-set' });
  boundary.open.mockImplementation(async (file: File) => ({ sealedArtifact: { artifactSha256: await digest(new Uint8Array(await file.arrayBuffer())), continuity: { ownerReceizId: binding.artifactOwnerReceizId } }, verifiedPayload: { filename: file.name, bytes: new Uint8Array([1]) }, verification: { bundle: {} } }));
});
async function digest(value: Uint8Array) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(value)))].map(x => x.toString(16).padStart(2, '0')).join(''); }
function fixture() {
  let closed = false;
  const held = [{ kind: 'owned-source' as const, filename: 'original.receiz', bytes: new Uint8Array([1, 2, 3]) }];
  const commit = vi.fn(async (_sources: ProofSource[]) => ({ added: 1, alreadyHeld: 0 }));
  const api = createProofLibrary({ binding, assertOpen: () => { if (closed) throw Error('IDENTITY_CLOSED'); }, readOwned: async () => held, readArchive: async () => [], readRecoveries: async () => [], readNotes: async () => [], commit });
  return { api, commit, held, close: () => { closed = true; } };
}
it('exports byte-exact verified originals and imports only after explicit review', async () => {
  const { api, commit } = fixture(), backup = await api.exportBackup();
  expect(boundary.open).toHaveBeenCalledOnce(); expect(commit).not.toHaveBeenCalled();
  const review = await api.inspect(new File([new Uint8Array(backup.bytes)], backup.filename));
  expect(review.items).toHaveLength(1); expect(commit).not.toHaveBeenCalled();
  await expect(api.retain({ ...review })).rejects.toThrow('PROOF_REVIEW_REQUIRED');
  await api.retain(review);
  expect(commit).toHaveBeenCalledOnce(); expect(commit.mock.calls[0][0][0].bytes).toEqual(new Uint8Array([1, 2, 3]));
});
it('refuses tampered, foreign and mixed invalid collections before retaining anything', async () => {
  const { api, commit } = fixture(), backup = await api.exportBackup(), pack = JSON.parse(new TextDecoder().decode(backup.bytes));
  pack.sources[0].bytesB64u = 'BAUG';
  await expect(api.inspect(new File([JSON.stringify(pack)], 'tampered.json'))).rejects.toThrow('PROOF_SOURCE_DIGEST_MISMATCH');
  const foreign = JSON.parse(new TextDecoder().decode(backup.bytes)); foreign.keyId = 'c'.repeat(64);
  await expect(api.inspect(new File([JSON.stringify(foreign)], 'foreign.json'))).rejects.toThrow('PROOF_BACKUP_IDENTITY_MISMATCH');
  const mixed = JSON.parse(new TextDecoder().decode(backup.bytes)); mixed.sources.push({ ...mixed.sources[0], kind: 'invented' });
  await expect(api.inspect(new File([JSON.stringify(mixed)], 'mixed.json'))).rejects.toThrow('PROOF_SOURCE_INVALID');
  expect(commit).not.toHaveBeenCalled();
});
it('imports recovery as evidence without submitting or replacing a pending execution', async () => {
  const { api, commit } = fixture();
  const review = await api.inspect(new File([bytes(recovery())], 'recovery.json'));
  expect(review.items[0]).toMatchObject({ kind: 'execution-recovery', title: 'Transaction recovery', operationId: 'fixture-attempt', participantCount: 1 });
  expect(boundary.recover).toHaveBeenCalledWith(recovery(), { audience: BANK_APPLICATION_ID });
  await api.retain(review); expect(commit).toHaveBeenCalledOnce();
});
it('rejects an invalid recovery or source before committing the batch', async () => {
  const { api, commit } = fixture(); boundary.recover.mockRejectedValueOnce(Error('SDK_SOURCE_REFUSED'));
  await expect(api.inspect(new File([bytes(recovery())], 'recovery.json'))).rejects.toThrow('SDK_SOURCE_REFUSED');
  boundary.open.mockRejectedValueOnce(Error('SDK_OWNER_REFUSED'));
  await expect(api.inspect(new File([new Uint8Array([1])], 'proof.receiz'))).rejects.toThrow('SDK_OWNER_REFUSED');
  expect(commit).not.toHaveBeenCalled();
});
it('cannot retain after the identity closes or accept an oversized file', async () => {
  const { api, close, commit } = fixture(), review = await api.inspect(new File([bytes(recovery())], 'recovery.json'));
  close(); await expect(api.retain(review)).rejects.toThrow('IDENTITY_CLOSED'); expect(commit).not.toHaveBeenCalled();
  const fresh = fixture(); await expect(fresh.api.inspect({ size: 100 * 1024 * 1024 } as File)).rejects.toThrow('PROOF_BACKUP_CAPACITY');
});
it('backs up a received predecessor as evidence without converting it into an owned holding or another claim',async()=>{
 const commit=vi.fn(),source={kind:'received-original' as const,filename:'predecessor.receiz',bytes:new Uint8Array([4,5,6])};
 boundary.open.mockImplementation(async(file:File)=>({sealedArtifact:{artifactSha256:await digest(new Uint8Array(await file.arrayBuffer())),continuity:{ownerReceizId:'previous.receiz.id'}},verifiedPayload:{filename:'original.txt'}}));
 const api=createProofLibrary({binding,assertOpen(){},readOwned:async()=>[],readArchive:async()=>[source],readRecoveries:async()=>[],readNotes:async()=>[],commit});
 const backup=await api.exportBackup(),review=await api.inspect(new File([new Uint8Array(backup.bytes)],backup.filename));expect(review.items[0]).toMatchObject({kind:'received-original',title:'Received original · original.txt'});await api.retain(review);expect(commit.mock.calls[0][0]).toEqual([source]);
});
it('starts all retained backup families together while preserving exact ordered bytes and verification',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),started:number[]=[];
 const read=(n:number)=>async()=>{started.push(n);if(n===1)await gate;return[{kind:'received-original' as const,filename:`${n}.receiz`,bytes:new Uint8Array([n])}];};
 const api=createProofLibrary({binding,assertOpen(){},readOwned:read(1),readArchive:read(2),readRecoveries:read(3),readNotes:read(4),readAccount:read(5),commit:vi.fn()});
 const work=api.exportBackup();await Promise.resolve();const before=[...started];release();const result=JSON.parse(new TextDecoder().decode((await work).bytes));
 expect(before).toEqual([1,2,3,4,5]);expect(result.sources.map((s:{filename:string;bytesB64u:string})=>[s.filename,s.bytesB64u])).toEqual([['1.receiz','AQ'],['2.receiz','Ag'],['3.receiz','Aw'],['4.receiz','BA'],['5.receiz','BQ']]);expect(boundary.open).toHaveBeenCalledTimes(5);
});
it('keeps family failure precedence and rejects an identity closed during backup preparation',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let closed=false;
 const api=createProofLibrary({binding,assertOpen(){if(closed)throw Error('IDENTITY_CLOSED');},readOwned:async()=>{await gate;return[];},readArchive:async()=>[],readRecoveries:async()=>[],readNotes:async()=>[],commit:vi.fn()});
 const work=api.exportBackup();closed=true;release();await expect(work).rejects.toThrow('IDENTITY_CLOSED');
 const failed=createProofLibrary({binding,assertOpen(){},readOwned:async()=>{await Promise.resolve();throw Error('FIRST_SOURCE_REFUSED');},readArchive:async()=>{throw Error('LATER_SOURCE_REFUSED');},readRecoveries:async()=>[],readNotes:async()=>[],commit:vi.fn()});
 await expect(failed.exportBackup()).rejects.toThrow('FIRST_SOURCE_REFUSED');
});
