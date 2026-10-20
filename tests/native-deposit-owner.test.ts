import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openCanonicalIdentity } from '../src/receiz/native-identity';

// Isolated SDK/vault boundary fixture. It creates no identity, admission or
// financial material; the bank's owner selection and private holding are real.
const fixture = vi.hoisted(() => ({ owner: 'fixture.receiz.id', payload: undefined as Uint8Array | undefined, sources: [] as { bytes: Uint8Array; filename: string }[],publication:null as unknown }));
vi.mock('../src/receiz/client', () => ({ loadReceiz: async () => ({
  verifyReceizArtifact: async () => ({ status: 'verified-artifact' }),
  createReceizArtifactAdmissionEngine: () => async () => ({ verdict: 'canonical-identity' }),
  isSdkIssuedReceizArtifactAdmission: () => true,
  readReceizIdentityPublicBinding: async () => ({ identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'fixture.receiz.id', keyId: 'fixture', artifactSha256: 'a'.repeat(64) }),
  readReceizIdentityArtifact: async () => ({ owner: { uid: 'receiz_device_fixture', username: 'fixture' }, crypto: { privateKeyCiphertextB64u: 'fixture' } }),
  projectReceizIdentityAccount: async () => ({}),
  receizKaiNow: () => ({ pulse: 1 }),
  sha256ReceizBytes:async()=> 'b'.repeat(64),
  createReceizClient: () => ({ artifacts: { verifyAndOpen: async () => ({
    sealedArtifact: { continuity: { ownerReceizId: fixture.owner }, artifactSha256: 'b'.repeat(64) },
    verifiedPayload: { bytes: fixture.payload ?? new TextEncoder().encode('fixture source'), filename: 'fixture.txt' }, verification: { bundle: {} },
  }) } }),
}) }));
vi.mock('@receiz/sdk/offline', () => ({ createReceizIndexedDbSealStore: () => ({}), createReceizOfflineSealer: () => ({ enroll: async () => {}, seal: async ({ bytes }: { bytes: Uint8Array }) => { fixture.payload = bytes; return { artifactBytes: bytes, filename: 'intake.receiz', mimeType: 'application/json' }; } }) }));
vi.mock('../src/receiz/identity-vault', () => ({
  loadWalletObservation: async () => null,
  saveDepositSource: async (_binding: unknown, bytes: Uint8Array, filename: string) => { fixture.sources.push({ bytes, filename }); },
  loadDepositSources: async () => fixture.sources,
  loadAssetPublicationState:async()=>fixture.publication,
  saveAssetPublicationState:async(_binding:unknown,next:unknown,previous:unknown)=>{expect(fixture.publication).toEqual(previous);fixture.publication=structuredClone(next);},
}));
beforeEach(() => { fixture.owner = 'fixture.receiz.id'; fixture.payload = undefined; fixture.sources = [];fixture.publication=null;vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:unknown,run:()=>Promise<unknown>)=>run()}}); });
afterEach(() => vi.unstubAllGlobals());
it('holds and reopens the account’s own proof using its admitted artifact owner, distinct from device ownership', async () => {
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture', 'identity.receiz');
  try {
    const file = new File(['fixture source'], 'fixture.receiz');
    const deposit = await identity.holdProof(file);
    expect(deposit.status).toBe('held-proof');
    expect((await identity.listDeposits()).map(value => value.digest)).toEqual(['b'.repeat(64)]);
  } finally { identity.dispose(); }
});
it('refuses a foreign owner before holding its proof', async () => {
  fixture.owner = 'foreign.receiz.id';
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture', 'identity.receiz');
  try { await expect(identity.holdProof(new File(['fixture source'], 'foreign.receiz'))).rejects.toThrow('different Receiz identity'); expect(await identity.listDeposits()).toEqual([]); }
  finally { identity.dispose(); }
});
it('the native intake pipeline seals and reopens the request-bound Receiz delivery instructions', async () => {
  vi.stubGlobal('fetch', async () => new Response(new Uint8Array([1])));
  const identity = await openCanonicalIdentity(new Uint8Array([1]), 'fixture', 'identity.receiz');
  try {
    const deposit = await identity.startAssetIntake({ title: 'Fixture Jordans', category: 'physical', quantity: '1', estimatedValue: '' });
    expect(deposit.delivery?.addressLines).toEqual(['1270 Ave of the Americas, 7th Fl', 'New York, NY 10020', 'United States']);
    const payload = JSON.parse(new TextDecoder().decode(deposit.bytes));
    expect(deposit.delivery?.reference).toBe(payload.requestId);
    expect(deposit.status).toBe('awaiting-custody');
    expect((await identity.listDeposits())[0].delivery).toEqual(deposit.delivery);
  } finally { identity.dispose(); }
});
it('seals moment originals and long-form text inside the account-owned asset proof',async()=>{
 vi.stubGlobal('fetch',async()=>new Response(new Uint8Array([1])));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'fixture','identity.receiz');
 try{
  const original=new File(['Exact authored words.'],'essay.txt',{type:'text/plain'});
  const held=await identity.createAsset({name:'A sealed moment',symbol:'MOMENT',units:'1000',description:'The moment claims authorship.',linkedProofDigest:null},{files:[original],title:'The story',text:'A longer account of this moment.'});
  const payload=JSON.parse(new TextDecoder().decode(held.bytes));
  expect(payload).toMatchObject({schema:'receiz.bank.asset-definition.v1',createsSpendableValue:false,backingCommitted:false,moment:{schema:'receiz.bank.moment-content.v1',title:'The story',text:'A longer account of this moment.',files:[{filename:'essay.txt',mimeType:'text/plain',size:21}]}});
  expect(held.title).toBe('A sealed moment');expect((await identity.listDeposits())[0].bytes).toEqual(held.bytes);
  expect(held.publication?.status).toBe('pending');expect(fixture.publication).toMatchObject({status:'pending',sourceDigest:held.digest});
  expect((await identity.pendingAssetPublication!())?.bytes).toEqual(held.bytes);
  expect((await identity.retryAssetPublication!()).digest).toBe(held.digest);expect(fixture.sources).toHaveLength(1);
 }finally{identity.dispose();}
});
