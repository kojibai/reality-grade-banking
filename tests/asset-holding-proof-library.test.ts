import {beforeEach,expect,it,vi} from 'vitest';
import {createProofLibrary,proofDigest} from '../src/receiz/proof-library';

// Canonical enclosure is isolated to test the additional financial-domain
// boundary. A canonical owned document alone cannot admit an asset holding.
const fixture=vi.hoisted(()=>({payload:{schema:'receiz.bank.native-asset-holding.v1',verified:true},digest:''}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({...await import('@receiz/sdk'),createReceizClient:()=>({artifacts:{verifyAndOpen:async()=>({
 sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:fixture.digest,continuity:{ownerReceizId:'sender.receiz.id'}},
 verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify(fixture.payload)),filename:'holding.json'},verification:{bundle:{kaiPulseEternal:'1'}},
})}})})}));
beforeEach(()=>{fixture.payload={schema:'receiz.bank.native-asset-holding.v1',verified:true};});
it('requires a typed root-signed asset holding beneath an owned canonical enclosure',async()=>{
 const bytes=new TextEncoder().encode('canonical-enclosure-fixture-only');fixture.digest=await proofDigest(bytes);
 const commit=vi.fn(),network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));
 try{
  const library=createProofLibrary({binding:{keyId:'a'.repeat(64),artifactOwnerReceizId:'sender.receiz.id'},assertOpen(){},readOwned:async()=>[],readArchive:async()=>[],readNotes:async()=>[],readRecoveries:async()=>[],commit});
  await expect(library.inspect(new File([bytes],'holding.receizbundle'))).rejects.toThrow('BANK_ASSET_HOLDING_UNVERIFIED');
  expect(commit).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
 }finally{network.mockRestore();}
});
