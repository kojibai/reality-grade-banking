import {spawnSync} from 'node:child_process';
import {expect,it} from 'vitest';

it('verifies the genuine Original and renders identical artwork after independent renderer module reloads',()=>{
 const program=`
  import assert from 'node:assert/strict';
  import {readFile} from 'node:fs/promises';
  import {openSealedConformanceEvidenceObject} from './src/conformance/receiz-evidence-seal.ts';
  import {renderConformanceEvidencePng} from './src/conformance/evidence-renderer.ts';
  globalThis.fetch=async()=>{throw Error('RENDERER_RELOAD_MUST_REMAIN_OFFLINE');};
  const bytes=new Uint8Array(await readFile('public/conformance/bankeiz-public-conformance.png'));
  const original=await openSealedConformanceEvidenceObject(bytes);
  assert.equal(original.object.verifiedReport.assessmentPassed,true);
  assert.equal(original.object.report.cases.length,33);
  const expected=await renderConformanceEvidencePng(original.object.svg);
  const renderers=await Promise.all([
   import('./src/conformance/evidence-renderer.ts?reload-one'),
   import('./src/conformance/evidence-renderer.ts?reload-two'),
  ]);
  const artwork=await Promise.all(renderers.map(renderer=>renderer.renderConformanceEvidencePng(original.object.svg)));
  for(const png of artwork)assert.deepEqual(png,expected);
  assert.equal(await renderers[1].verifyConformanceEvidenceArtwork(original.object.svg,expected),true);
  const changed=expected.slice();changed[changed.length-1]^=1;
  assert.equal(await renderers[0].verifyConformanceEvidenceArtwork(original.object.svg,changed),false);
  console.log('Genuine Original and byte-exact artwork verified across renderer reloads.');
 `;
 const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:process.cwd(),encoding:'utf8',timeout:30000});
 expect(result.error,result.stderr).toBeUndefined();
 expect(result.status,result.stderr).toBe(0);
 expect(result.stdout).toContain('Genuine Original and byte-exact artwork verified across renderer reloads.');
},35000);
