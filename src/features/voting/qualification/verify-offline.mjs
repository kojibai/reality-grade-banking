import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyGovernanceQualification,verifyQualificationSettlement} from './verify.ts';
const bytes=new Uint8Array(await readFile(new URL('./qualification.json',import.meta.url)));
const sources=JSON.parse(new TextDecoder().decode(bytes)),kind=sources.decision.decision.toLowerCase();
if(!['election','treasury'].includes(kind))throw Error('Unsupported qualification.');
const result=await verifyGovernanceQualification(kind,bytes);
for(const wire of [sources.predecessor,sources.successor,...sources.sources.originals]){
 const exact=await readFile(new URL('./originals/'+wire.artifactSha256+'.receizbundle',import.meta.url));
 if(createHash('sha256').update(exact).digest('hex')!==wire.artifactSha256||!exact.equals(Buffer.from(wire.exactBytesB64u,'base64url')))throw Error('Extracted Original differs from the verified source package.');
}
const settlement=kind==='treasury'?await verifyQualificationSettlement(result.decision,await readFile(new URL('./approved-intent.json',import.meta.url)),await readFile(new URL('./settlement.json',import.meta.url))):null;
process.stdout.write(JSON.stringify({...result,settlement},null,2)+'\n');
