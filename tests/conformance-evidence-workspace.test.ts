import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {renderConformanceEvidencePng} from '../src/conformance/evidence-renderer';
import {beforeAll,expect,it,vi} from 'vitest';
import {referenceContractAdapter,runContractAssessment} from '../src/conformance/contract.ts';
import {createConformanceEvidenceObject} from '../src/conformance/evidence-object.ts';
import {openConformanceEvidenceWorkspace,sealConformanceEvidenceObject,type EvidenceIdentitySource,type EvidenceSealPorts,type SealedConformanceEvidence} from '../src/conformance/receiz-evidence-seal.ts';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
const vault=vi.hoisted(()=>({loadDeviceIdentity:vi.fn()}));
vi.mock('../src/receiz/identity-vault',()=>vault);
let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>,credential:SealedConformanceEvidence,other:EvidenceIdentitySource;
beforeAll(async()=>{
 fixture=await conformanceOfflineFixture();other=await fixture.otherIdentity();
 const object=await createConformanceEvidenceObject(await runContractAssessment(referenceContractAdapter,{name:'Synthetic Institution Workspace',buildSha256:'a'.repeat(64)},'workspace-private-holder-test'));
 credential=await sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity},{...fixture.ports,render:renderConformanceEvidencePng});
},60000);
function readOnlyPorts():EvidenceSealPorts{
 const forbidden=async()=>{throw Error('WORKSPACE_SIGNER_RESOURCE_OR_RENDER_FORBIDDEN');};
 return{...fixture.ports,offline:forbidden,resources:forbidden,render:forbidden,store:{load:forbidden,save:forbidden}};
}
it('opens a verified certificate only for its matching private admitted Receiz ID without signer or proving effects',async()=>{
 const workspace=await openConformanceEvidenceWorkspace(credential.bytes,{identitySource:async()=>fixture.identity},readOnlyPorts());
 expect(workspace.holderReceizId).toBe(credential.object.report.credentialHolder!.receizId);
 expect(workspace.credential.object.report).toEqual(credential.object.report);
 expect(await workspace.stillCurrent()).toBe(true);
 expect(Object.keys(workspace).sort()).toEqual(['credential','holderReceizId','stillCurrent']);
},60000);
it('does not unlock a copied certificate without the matching private identity',async()=>{
 await expect(openConformanceEvidenceWorkspace(credential.bytes.slice(),{identitySource:async()=>null},readOnlyPorts())).rejects.toMatchObject({code:'CONFORMANCE_IDENTITY_REQUIRED'});
});
it('uses only a read-consented default vault identity and invalidates when consent is removed',async()=>{
 vault.loadDeviceIdentity.mockResolvedValue({...fixture.identity,readConsent:true});
 const workspace=await openConformanceEvidenceWorkspace(credential.bytes,{},readOnlyPorts());
 expect(await workspace.stillCurrent()).toBe(true);
 vault.loadDeviceIdentity.mockResolvedValue({...fixture.identity,readConsent:false});
 expect(await workspace.stillCurrent()).toBe(false);
 await expect(openConformanceEvidenceWorkspace(credential.bytes,{},readOnlyPorts())).rejects.toMatchObject({code:'CONFORMANCE_IDENTITY_REQUIRED'});
});
it('refuses a genuine private identity belonging to another verified Receiz holder',async()=>{
 await expect(openConformanceEvidenceWorkspace(credential.bytes,{identitySource:async()=>other},readOnlyPorts())).rejects.toMatchObject({code:'CONFORMANCE_HOLDER_MISMATCH'});
});
it.each(['certificate-only','wrong-phrase']as const)('requires actual private identity admission for %s input',async source=>{
 const identity=source==='certificate-only'?{bytes:credential.bytes,phrase:''}:{...fixture.identity,phrase:'wrong-private-identity-phrase'};
 await expect(openConformanceEvidenceWorkspace(credential.bytes,{identitySource:async()=>identity},readOnlyPorts())).rejects.toMatchObject({code:'CONFORMANCE_IDENTITY_REQUIRED'});
});
it.each(['removed','changed']as const)('refuses an identity %s during initial admission',async change=>{
 let reads=0;
 await expect(openConformanceEvidenceWorkspace(credential.bytes,{identitySource:async()=>++reads===1?fixture.identity:change==='removed'?null:other},readOnlyPorts())).rejects.toMatchObject({code:'CONFORMANCE_IDENTITY_CHANGED'});
});
it.each(['removed','changed','wrong-phrase']as const)('invalidates an open workspace when the selected identity is %s',async change=>{
 let current:EvidenceIdentitySource|null=fixture.identity;
 const workspace=await openConformanceEvidenceWorkspace(credential.bytes,{identitySource:async()=>current},readOnlyPorts());
 expect(await workspace.stillCurrent()).toBe(true);
 current=change==='removed'?null:change==='changed'?other:{...fixture.identity,phrase:'different-current-phrase'};
 expect(await workspace.stillCurrent()).toBe(false);
});
it('runs the emitted helper in plain Node with the default pinned offline SDK verifier and exact Original continuity',async()=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),output=await mkdtemp(join(root,'.conformance-node-'));
 try{
  // Match the production Registry Node emitter, using declared dependencies.
  // Preferred TypeScript sources are compiled; no loader or test roots enter Node.
  const helper=join(output,'helper.mjs');
  await build({absWorkingDir:root,entryPoints:['src/conformance/receiz-evidence-seal.ts'],outfile:helper,bundle:true,splitting:false,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning'});
  const source=new URL('./fixtures/public-essay-record.png',import.meta.url).href,original=new URL('../public/conformance/bankeiz-public-conformance.png',import.meta.url).href;
  const program=`import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {openSealedConformanceEvidenceObject} from ${JSON.stringify(helper)};let reads=0;globalThis.fetch=async()=>{reads++;throw Error('UNEXPECTED_NETWORK');};try{await openSealedConformanceEvidenceObject(new Uint8Array(await readFile(new URL(${JSON.stringify(source)}))));throw Error('PUBLIC_UNOWNED_DOCUMENT_ACCEPTED');}catch(error){if(error.code!=='CONFORMANCE_CONTINUITY_REQUIRED')throw error;}const held=await openSealedConformanceEvidenceObject(new Uint8Array(await readFile(new URL(${JSON.stringify(original)}))));assert.equal(held.artifactSha256,'42639bee60e2650d4f58901ab9e66456ed2421a88330621c88d26e4e1889d75f');assert.equal(held.object.verifiedReport.assessmentPassed,true);assert.equal(reads,0);process.stdout.write('CONFORMANCE_CONTINUITY_REQUIRED;EXACT_ORIGINAL_OFFLINE');`;
  expect(execFileSync(process.execPath,['--input-type=module','-e',program],{cwd:resolve(root),encoding:'utf8'})).toBe('CONFORMANCE_CONTINUITY_REQUIRED;EXACT_ORIGINAL_OFFLINE');
 }finally{await rm(output,{recursive:true,force:true});}
});
