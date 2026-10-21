import {expect,it} from 'vitest';
import * as composer from '../src/receiz/asset-composer';
import {projectHeldDeposit} from '../src/receiz/deposit-source';
import type {ReceizOpenedArtifact} from '@receiz/sdk';
it('creates a complete asset definition from the title while keeping custom code and supply optional',()=>{
 const draft={title:'The Original',description:'A work',kind:'moment' as const,longForm:'Complete story',files:[]};
 expect(composer.composerDefinition(draft)).toEqual({name:'The Original',symbol:'THEORIGI',units:'1000',description:'A work',linkedProofDigest:null});
 expect(composer.composerDefinition(draft,{symbol:'ONE',units:'25.5'})).toMatchObject({symbol:'ONE',units:'25.5'});expect(()=>composer.composerDefinition(draft,{units:'0'})).toThrow();
});
it('retains the typed composer title, definition and source when opening a held original',()=>{
 const definition={name:'The Original',symbol:'ORG',units:'10',description:'A work',linkedProofDigest:null},content={schema:'receiz.bank.asset-content.v2',ownerReceizId:'owner.receiz.id',title:'The Original',description:'A work',kind:'moment',longForm:'Complete story',files:[],definition};
 const opened={sealedArtifact:{artifactSha256:'a'.repeat(64),continuity:{ownerReceizId:'owner.receiz.id'}},verifiedPayload:{filename:'asset-content.json',bytes:new TextEncoder().encode(JSON.stringify(content))},verification:{bundle:{kaiPulseEternal:'100'}}} as unknown as ReceizOpenedArtifact;
 expect(projectHeldDeposit(opened,new Uint8Array([1]),'original.receizbundle','owner.receiz.id')).toMatchObject({title:'The Original',assetDefinition:definition});
});
