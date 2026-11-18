import {expect,it} from 'vitest';
import {ballotRegister,charterRatification,eligibleCandidates,eligibleProposal,observedSeats,ofKind,voteEnds} from '../src/receiz/governance-view';
import {governanceSchema,readGovernanceTerms,type CharterRules,type GovernanceTerms} from '../src/receiz/governance-documents';
import type {GovernanceRow} from '../src/receiz/governance-directory';
import {governanceCursorKey} from '../src/receiz/governance-cursor';
const id=(n:number)=>n.toString(16).padStart(64,'0');
const office={name:'Council',seats:2,selection:'Election',eligibility:'Open',powers:'Review operations.',term:'One season.',recall:'Members may recall each seat.',procedure:'Single choice, highest totals fill seats.'} as const;
const rules:CharterRules={name:'River assembly',purpose:'Water access',founders:['writer'],membership:'Residents',electorate:['m1','m2','m3'],offices:[office],articles:[{title:'Water rights',text:'Every resident has access.'}],decisions:'One vote per resident.',representation:'Optional',amendments:'Vote',appeals:'Review',treasury:'Separate authorization',approvalPercent:60,minimumSupportPercent:34,voteDays:1,appealDays:1,allowMandates:true};
function row(n:number,author:string,terms:GovernanceTerms,pulse=100):GovernanceRow{return{profileUid:null,digest:id(n),pulse:String(pulse),document:{schema:governanceSchema,author,accountUid:null,visibility:'public',terms:readGovernanceTerms(terms)}};}
const charter=row(1,'writer',{kind:'charter',rules}),founding=ofKind([charter],'charter')[0],ratify=row(2,'writer',{kind:'ratification',charter:charter.digest});
const candidates=['guest','m1','another'].map((v,i)=>row(3+i,v,{kind:'candidacy',charter:charter.digest,office:'Council',statement:'I stand for election.'},101));
const body={kind:'proposal',decision:'Election',title:'Choose council',text:'Fill two seats.',charter:charter.digest,office:'Council',nominations:candidates.map(r=>r.digest),choices:candidates.map(r=>r.document.author)} as const;
const election=ofKind([row(8,'m1',body,103)],'proposal')[0];
const baseline=[founding,ratify,...candidates,election];
const ballot=(n:number,actor:string,choice:string,pulse=104)=>row(n,actor,{kind:'ballot',charter:id(1),proposal:id(8),choice,previous:null},pulse);
const mandate=(n:number,actor:string,delegate:string|null,previous:string|null=null,scope='Election',untilKaiPulse='110')=>row(n,actor,{kind:'mandate',scope,delegate,charter:id(1),untilKaiPulse,previous},102);
it('keeps founders, electorate and candidates independent and binds all nominations to one office',()=>{
 expect(charterRatification(founding,baseline).complete).toBe(true);
 expect(eligibleCandidates(founding,'Council',baseline)).toHaveLength(3);
 expect(eligibleProposal(election,founding,baseline)).toBe(true);
 expect(eligibleProposal({...election,document:{...election.document,author:'writer'}},founding,baseline)).toBe(false);
 expect(eligibleProposal(election,founding,baseline.filter(r=>r.digest!==id(3)))).toBe(false);
 expect(eligibleProposal(election,founding,baseline.map(r=>r===ratify?{...r,pulse:'109'}:r))).toBe(false);
 const register=ballotRegister(election,founding,[...baseline,ballot(10,'writer','guest'),ballot(11,'m1','guest'),ballot(12,'m2','another'),ballot(13,'m3','guest')]);
 expect(register.excluded).toHaveLength(1);expect(observedSeats(register.counts,2)).toEqual({leading:['guest','another'],tied:[]});
 expect(observedSeats(new Map([['a',2],['b',1],['c',1]]),2)).toEqual({leading:['a'],tied:['b','c']});
});
it('applies a scoped mandate once, respects direct override, revocation, expiry, cutoff and ambiguity',()=>{
 const direct=ballot(11,'m1','guest'),m=mandate(20,'m2','m1');
 const count=(rows:GovernanceRow[])=>ballotRegister(election,founding,[...baseline,direct,...rows]);
 expect(count([m,m]).counts.get('guest')).toBe(2);expect(count([m,ballot(12,'m2','another')]).represented.size).toBe(0);
 expect(count([m,mandate(21,'m2',null,m.digest)]).represented.size).toBe(0);
 expect(count([mandate(20,'m2','m1',null,'Treasury'),mandate(21,'m3','m1',null,'Election','104')]).represented.size).toBe(0);
 expect(count([m,mandate(21,'m2','m3')]).disputed.has('m2')).toBe(true);
 expect(count([m,mandate(21,'m3','m2')]).represented.size).toBe(1);
 expect(count([ballot(13,'m3','guest',Number(voteEnds(election,founding)))]).excluded.length).toBe(1);
});
it('accepts custom laws and offices without creating a leader, rejects duplicate definitions',()=>{
 const custom={...rules,offices:[{...office,name:'Mediator',selection:'Custom'}]};
 expect(readGovernanceTerms({kind:'charter',rules:custom})).toMatchObject({rules:{offices:[{selection:'Custom'}]}});
 expect(readGovernanceTerms({kind:'charter',rules:{...rules,offices:[]}})).toMatchObject({rules:{offices:[]}});
 expect(()=>readGovernanceTerms({kind:'charter',rules:{...rules,offices:[office,office]}})).toThrow();
});
it('compares the full server microsecond cursor and rejects unexpected query syntax',()=>{
 const u='11111111-1111-4111-8111-111111111111';
 expect(governanceCursorKey('2026-11-18T10:00:00.01+00:00~'+u)).toBe(governanceCursorKey('2026-11-18T10:00:00.010000Z~'+u));
 expect(governanceCursorKey('2026-11-18T10:00:00Z~'+u+',x')).toBeNull();
});
