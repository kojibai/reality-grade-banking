import { expect, it, vi } from 'vitest';
import { createProofLibrary } from '../src/receiz/proof-library';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
const binding = { keyId: 'a'.repeat(64), artifactOwnerReceizId: 'fixture.receiz.id' };
it('the actual v129 SDK refuses a forged successful recovery without retaining or fetching anything', async () => {
  const commit = vi.fn(), network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
  try {
    const api = createProofLibrary({ binding, assertOpen: () => {}, readOwned: async () => [], readArchive: async () => [], readRecoveries: async () => [], readNotes: async () => [], commit });
    const fake = { schema: 'receiz.portable-execution-transition-recovery.v124', status: 'committed', transitionSet: { applicationId: BANK_APPLICATION_ID, members: [] }, members: [], verified: true };
    await expect(api.inspect(new File([JSON.stringify(fake)], 'forged.json'))).rejects.toThrow();
    expect(commit).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
  } finally { network.mockRestore(); }
});
it('the actual v129 SDK refuses a plain JSON balance as an original owned proof', async () => {
  const commit = vi.fn();
  const api = createProofLibrary({ binding, assertOpen: () => {}, readOwned: async () => [], readArchive: async () => [], readRecoveries: async () => [], readNotes: async () => [], commit });
  await expect(api.inspect(new File(['{"verified":true,"balance":1000000}'], 'pretend.receiz'))).rejects.toThrow();
  expect(commit).not.toHaveBeenCalled();
});
it('the actual v129 verifier refuses a forged asset receipt without import or network',async()=>{
 const commit=vi.fn(),network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
 try{
  const api=createProofLibrary({binding,assertOpen(){},readOwned:async()=>[],readArchive:async()=>[],readRecoveries:async()=>[],readNotes:async()=>[],commit});
  const fake={schema:'receiz.bank.native-asset-result.v1',status:'committed',source:{filename:'native-asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',exactBytesB64u:'e30',artifactSha256:'a'.repeat(64)}};
  await expect(api.inspect(new File([JSON.stringify(fake)],'forged-asset.json'))).rejects.toThrow();
  expect(commit).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
 }finally{network.mockRestore();}
});
