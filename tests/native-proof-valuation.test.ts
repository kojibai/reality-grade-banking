import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {verifyReceizArtifact as installedVerify} from '@receiz/sdk';
import {loadOfflineProofVerifier} from '../src/receiz/ledger-offline-proof';
import {useEmittedNativeProofRuntime} from './helpers/native-proof-runtime';
const bytes=new Uint8Array(readFileSync('tests/fixtures/public-essay-record.png'));
beforeEach(useEmittedNativeProofRuntime);
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

it('keeps actual Source verification, projection and replay in the emitted Native SDK custody',async()=>{
 const read=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('DATA_NETWORK_FORBIDDEN'));
 const runtime=await loadOfflineProofVerifier(),api=runtime.valuation;
 const source=await api.verifyReceizArtifact(bytes);expect(source.status).toBe('verified-artifact');if(source.status!=='verified-artifact')return;
 expect(source.verification.carriedAuthorship).toBeUndefined();
 const basis={source,expectedProofDigest:source.artifactDigest.value};
 const projected=await api.projectReceizProofValueV129({...basis,valuationKaiUPulse:'14710100000123'});
 expect(projected.status).toBe('available');expect(projected.writesPerformed).toBe(0);
 const replay=await api.exportReceizProofValueReplayV129({...basis,valuationKaiUPulses:['14710100000123']});
 expect(replay.sdkVersion).toBe('129.5.1');expect((await api.verifyReceizProofValueReplayV129(replay)).status).toBe('verified-replay');
 expect(typeof runtime.readArtifact).toBe('function');expect(typeof runtime.inspectArtifact).toBe('function');expect(read).not.toHaveBeenCalled();
});

it('refuses a foreign installed-SDK verification, a cloned Source and changed bytes',async()=>{
 const read=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('DATA_NETWORK_FORBIDDEN'));
 const api=(await loadOfflineProofVerifier()).valuation,source=await api.verifyReceizArtifact(bytes),foreign=await installedVerify(bytes);
 expect(source.status).toBe('verified-artifact');expect(foreign.status).toBe('verified-artifact');
 for(const value of [structuredClone(source),foreign])await expect(api.projectReceizProofValueV129({source:value,valuationKaiUPulse:'14710100000123'})).rejects.toThrow(/CUSTODIED|ADMISSION_NOT_VERIFIED/);
 const changed=bytes.slice();changed[Math.floor(changed.length/2)]^=1;expect((await api.verifyReceizArtifact(changed)).status).not.toBe('verified-artifact');expect(read).not.toHaveBeenCalled();
});

it('preserves the exact issued old replay and rejects a changed replay under the same emitted interpreter',async()=>{
 const read=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('DATA_NETWORK_FORBIDDEN'));
 const api=(await loadOfflineProofVerifier()).valuation,replay=JSON.parse(readFileSync('tests/fixtures/proof-value-legacy-replay-v129.0.0.json','utf8'));
 expect(replay.sdkVersion).toBe('129.0.0');const verified=await api.verifyReceizProofValueReplayV129(replay);expect(verified.status).toBe('verified-replay');
 if(verified.status==='verified-replay')expect(verified.samples.map(sample=>sample.status==='available'?sample.projectionDigest:null)).toEqual(replay.expectedProjectionDigests);
 const changed=structuredClone(replay);changed.expectedProjectionDigests[0]='0'.repeat(64);expect((await api.verifyReceizProofValueReplayV129(changed)).status).toBe('invalid-replay');expect(read).not.toHaveBeenCalled();
});
