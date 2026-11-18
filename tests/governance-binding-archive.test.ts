import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {canonicalizeReceizV122,type ReceizPortableSealedArtifactV124} from '@receiz/sdk';
import {readVerifiedReceizDocumentBytesCanonical} from '../node_modules/@receiz/sdk/dist/verifier/canonical.js';
import type {ReceizSignatureV4RootPublicKey} from '../node_modules/@receiz/sdk/dist/verifier/signatureV4.js';
import {governanceSchema,readGovernanceTerms,type GovernanceDocument} from '../src/receiz/governance-documents';
import type {GovernanceRow} from '../src/receiz/governance-directory';
import {ballotRegister,ofKind} from '../src/receiz/governance-view';
import {closureOpens,proposalEvidence} from '../src/receiz/governance-closure';

type Wire=ReceizPortableSealedArtifactV124;
type Case={schema:string;proposal:string;originals:Wire[]};
type Archive={roots:ReceizSignatureV4RootPublicKey[];register:Wire;election:Case;treasury:Case;policy:Case};

// Stable exact input for independently replaying the native governance adapter.
it('reopens the archived register and the post-appeal election, policy and treasury closures',async()=>{
  const archive:Archive=JSON.parse(gunzipSync(await readFile('tests/fixtures/governance-example/binding-sources.json.gz')).toString('utf8'));
  const roots=new Map(archive.roots.map(root=>[root.kid,root]));
  async function open(wire:Wire){
    const bytes=Buffer.from(wire.exactBytesB64u,'base64url');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(wire.artifactSha256);
    const opened=await readVerifiedReceizDocumentBytesCanonical({fileBytes:bytes,filename:wire.filename,mime:wire.mimeType,signatureV4RootPublicKeys:roots});
    if(!opened.ok)throw Error('Could not open archived sealed source '+wire.artifactSha256);
    expect(opened.verification.integrity.ok).toBe(true);
    expect(createHash('sha256').update(opened.payloadBytes).digest('hex')).toBe(wire.payloadSha256);
    return opened;
  }
  const register=JSON.parse(new TextDecoder().decode((await open(archive.register)).payloadBytes));
  for(const name of ['election','treasury','policy'] as const){
    const selected=archive[name],rows:GovernanceRow[]=[];
    expect(selected.schema).toBe('bankeiz.governance.closure-sources.v1');
    for(const wire of selected.originals){
      const source=await open(wire);
      const raw=new TextDecoder().decode(source.payloadBytes),doc:GovernanceDocument=JSON.parse(raw);
      expect(canonicalizeReceizV122(doc)).toBe(raw);
      expect(doc.schema).toBe(governanceSchema);expect(doc.visibility).toBe('public');
      expect(source.verification.bundle?.nativeRecordSeal).toMatchObject({ownerReceizId:doc.author});
      rows.push({digest:wire.artifactSha256,document:{...doc,terms:readGovernanceTerms(doc.terms)},pulse:String(source.verification.bundle?.kaiPulseEternal),profileUid:null});
    }
    const charter=ofKind(rows,'charter')[0],proposal=ofKind(rows,'proposal')[0],closures=ofKind(rows,'closure');
    expect(proposal.digest).toBe(selected.proposal);
    expect(proposal.document.terms.decision.toLowerCase()).toBe(name);
    const rules=charter.document.terms.rules;
    expect(rules.execution?.registerProofObjectId).toBe(register.payload.sha256);
    expect(rules.execution?.custodian).toBe(register.ownership.ownerReceizId);
    expect(rules.execution?.registerGenesisHead).toBe(register.receizProofHistory.history.rootDigest);
    expect(closures.map(row=>row.document.author).sort()).toEqual([...rules.founders].sort());
    const evidence=proposalEvidence(proposal,rows);
    for(const closure of closures){
      expect(closure.document.terms.charter).toBe(charter.digest);
      expect(closure.document.terms.proposal).toBe(proposal.digest);
      expect(closure.document.terms.evidence).toEqual(evidence);
      expect(BigInt(closure.pulse)).toBeGreaterThanOrEqual(closureOpens(proposal,charter));
    }
    const tally=ballotRegister(proposal,charter,rows);
    expect(tally.admitted).toBe(true);expect(tally.effective.size).toBe(2);expect(tally.disputed.size).toBe(0);
    if(name==='election')expect([...tally.counts.values()]).toEqual([0,2]);
    else expect(tally.counts.get('Approve')).toBe(2);
    if(name==='treasury')expect(proposal.document.terms.payment).toEqual(rules.execution?.treasury);
  }
},30000);
