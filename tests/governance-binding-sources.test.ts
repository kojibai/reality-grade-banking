import {expect, it, vi} from 'vitest';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {canonicalizeReceizV122, transportReceizSealedArtifactV124, type ReceizPortableSealedArtifactV124} from '@receiz/sdk';
import {RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR} from '../node_modules/@receiz/sdk/dist/v125TemporalAuthorityConformanceVector.js';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createGovernanceRegister,openGovernanceRegister,exactRegisterFile} from '../src/receiz/governance-execution-register';
import {sealGovernanceOriginal, type GovernanceTerms, type GovernanceOriginal, type CharterPayment} from '../src/receiz/governance-documents';
import {openCanonicalProofFile} from '../src/receiz/proof-capture';
import {closureOpens,proposalEvidence,reviewClosure} from '../src/receiz/governance-closure';
import {ofKind,ballotRegister,observedSeats} from '../src/receiz/governance-view';
import type {GovernanceRow} from '../src/receiz/governance-directory';
import type {OpenIdentity} from '../src/receiz/native-identity';

async function openNativeSource(file:File){
  const {sealedArtifact}=await openCanonicalProofFile(file);
  if(sealedArtifact.kind!=='receiz.native-record-seal')throw Error('Expected a native Record → Seal Original.');
  return sealedArtifact;
}

const ports=vi.hoisted(()=>({sdk:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>ports.sdk}));

it('seals a fixed electorate, a portable register and unanimous evidence for three decisions on an isolated test timeline',async()=>{
  const start=Date.UTC(2026,9,5,12),day=86_400_000;
  let elapsed=0;
  const clock=vi.spyOn(Date,'now').mockImplementation(()=>start+elapsed);
  const monotonic=vi.spyOn(performance,'now').mockImplementation(()=>start+elapsed-performance.timeOrigin);
  try {
    const f=await conformanceOfflineFixture({account:true,certificateDays:7});
    const sdk={...await import('@receiz/sdk'),...f.runtime};
    ports.sdk=sdk;
    async function reader(identity:typeof f.identity){
      const admission=await sdk.createReceizArtifactAdmissionEngine()(await sdk.verifyReceizArtifact(identity.bytes),{profile:'identity',identityPassphrase:identity.phrase});
      const binding=await sdk.readReceizIdentityPublicBinding(admission);
      const sealer=sdk.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('TEST_NETWORK_FORBIDDEN');}});
      return {binding,sealRecordExport:async input=>{
        const sealed=await sealer.seal(input);
        return new File([new Uint8Array(sealed.artifactBytes)],sealed.filename,{type:sealed.mimeType});
      }} as OpenIdentity;
    }

    const actors=[await reader(f.identity),await reader(await f.otherIdentity())];
    const members=actors.map(a=>a.binding.artifactOwnerReceizId);
    const custodian=members[0];
    const coordinate=await sdk.admitReceizKksV1ProofCoordinate(RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR);
    const registerFile=await createGovernanceRegister(custodian,coordinate,async(bytes,filename)=>{
      const file=await actors[0].sealRecordExport!({bytes,filename,mimeType:'application/json'});
      return openNativeSource(file);
    });
    const registerWire=await transportReceizSealedArtifactV124(registerFile);
    const {register}=await openGovernanceRegister(await exactRegisterFile(registerWire),custodian);
    // An exact payment request can be approved before a matching funded source exists.
    const digest=(text:string)=>sdk.sha256ReceizBytes(new TextEncoder().encode(text));
    const payment:CharterPayment={budgetId:'test:repair-fund',sourceProofObjectId:await digest('test:funding-source'),
      sourceValueHead:await digest('test:source-value-head'),destinationSubjectId:'receiz:subject:'+await digest('test:payee'),
      expectedDestinationHead:await digest('test:destination-head'),amountPhiMicro:'25000',installment:'repair-1'};
    const rows:GovernanceRow[]=[],sources=new Map<string,GovernanceOriginal>();
    async function add(by:number,terms:GovernanceTerms){
      elapsed+=60_000;
      const source=await sealGovernanceOriginal(actors[by],terms);
      rows.push({digest:source.digest,document:source.document,pulse:source.pulse,profileUid:null});
      sources.set(source.digest,source);
      return source;
    }
    const office='Workshop steward';
    const charter=await add(0,{kind:'charter',rules:{
      name:'Basin Workshop',purpose:'Share and repair community tools.',founders:members,electorate:members,
      membership:'Two named members.',decisions:'A majority and affirmative support from at least half of all members.',
      representation:'Members vote directly.',amendments:'Ratify a new charter.',appeals:'One day for objections.',
      treasury:'One named repair installment only.',approvalPercent:51,minimumSupportPercent:50,voteDays:1,appealDays:1,allowMandates:false,
      offices:[{name:office,seats:1,selection:'Election',eligibility:'Electorate',powers:'Coordinate work shifts.',term:'One season.',recall:'Assembly vote.',procedure:'Highest votes for one seat.'}],
      execution:{rule:'unanimous-evidence-closure-v1',custodian,registerProofObjectId:register.registerProofObjectId,registerGenesisHead:register.registerGenesisHead,treasury:payment},
    }});
    for(const i of [0,1])await add(i,{kind:'ratification',charter:charter.digest});
    const nominations=[];
    for(const i of [0,1])nominations.push((await add(i,{kind:'candidacy',charter:charter.digest,office,statement:'I stand for the workshop steward seat.'})).digest);
    const election=await add(1,{kind:'proposal',charter:charter.digest,decision:'Election',title:'Elect the workshop steward',text:'Choose one member.',office,nominations,choices:members});
    const treasury=await add(1,{kind:'proposal',charter:charter.digest,decision:'Treasury',title:'Authorize the repair installment',text:'Release one stated installment only upon separate native settlement.',choices:['Approve','Reject'],payment});
    const policy=await add(0,{kind:'proposal',charter:charter.digest,decision:'Policy',title:'Open on Saturdays',text:'Staff the tool bench on Saturday mornings.',choices:['Approve','Reject']});
    for(const i of [0,1]){
      for(const proposal of [election,treasury,policy])await add(i,{kind:'ballot',charter:charter.digest,proposal:proposal.digest,choice:proposal===election?members[1]:'Approve',previous:null});
    }
    const founding=ofKind(rows,'charter')[0],read=async(id:string)=>{
      const held=sources.get(id);if(!held)throw Error('Missing governance Original');return held;
    };
    const claims:Record<string,{schema:'bankeiz.governance.closure-sources.v1';proposal:string;originals:ReceizPortableSealedArtifactV124[]}>={};
    elapsed+=3*day;
    for(const proposal of ofKind(rows,'proposal')){
      const evidence=proposalEvidence(proposal,rows);
      const terms={kind:'closure',charter:charter.digest,proposal:proposal.digest,evidence} as const;
      const files=[...evidence];
      for(const i of [0,1]){
        await reviewClosure(terms,members[i],String(sdk.receizKaiNow().pulse),read,rows);
        const closure=await add(i,terms);
        expect(BigInt(closure.pulse)).toBeGreaterThanOrEqual(closureOpens(proposal,founding));
        files.push(closure.digest);
      }
      const tally=ballotRegister(proposal,founding,rows);
      expect(tally.admitted).toBe(true);expect(tally.disputed.size).toBe(0);expect(tally.effective.size).toBe(2);
      if(proposal.document.terms.decision==='Election')expect(observedSeats(tally.counts,1).leading).toEqual([members[1]]);
      else expect(tally.counts.get('Approve')).toBe(2);
      const originals:ReceizPortableSealedArtifactV124[]=[];
      for(const digest of files){const sealed=await openNativeSource((await read(digest)).file);originals.push(await transportReceizSealedArtifactV124(sealed));}
      claims[proposal.document.terms.decision.toLowerCase()]={schema:'bankeiz.governance.closure-sources.v1',proposal:proposal.digest,originals};
    }
    // The native adapter can independently replay only these public exact wire files.
    // Never serialize the admitted test identities or the device-signing store.
    const directory=process.env.BANKEIZ_TEST_GOVERNANCE_SOURCES_DIR;
    if(directory){
      await mkdir(directory,{recursive:true});
      const outputs={...claims,roots:f.roots,register:registerWire};
      for(const [name,data] of Object.entries(outputs))await writeFile(join(directory,name+'.json'),canonicalizeReceizV122(data)+'\n');
    }
  } finally {clock.mockRestore();monotonic.mockRestore();}
},120000);
