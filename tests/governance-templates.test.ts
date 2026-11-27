import {expect,it} from 'vitest';
import {readGovernanceTerms, type DecisionKind} from '../src/receiz/governance-documents';
import {charterTemplates,proposalDraft,proposalTemplates} from '../src/features/voting/governance-templates';

const id='c9'.repeat(32);
const rules={...charterTemplates.Cooperative,name:'Workshop assembly',founders:['test.member']};
it('preserves independent charter terms and requires an explicit founder custody term',()=>{
  const execution={
    rule:'registered-roll-closure-v1',custodian:'test.custodian',registerProofObjectId:id,registerGenesisHead:id,
    treasury:null,currency:{assetId:id,minimumPriceUsdCents:'1',maximumPriceUsdCents:'10',allowSalesPause:true},
    custodianKeyId:id,registrationDays:7,rollReviewDays:1,quorumPercent:20,
  };
  const charter=(e:unknown)=>({kind:'charter',rules:{...rules,allowMandates:false,execution:e}});
  expect(readGovernanceTerms(charter(execution))).toEqual(charter(execution));
  const founder={...execution,custodian:rules.founders[0],custody:'founder-custodian-v1'};
  expect(readGovernanceTerms(charter(founder))).toEqual(charter(founder));
  expect(()=>readGovernanceTerms(charter({...execution,custodian:rules.founders[0]}))).toThrow();
  expect(()=>readGovernanceTerms(charter({...founder,custody:'unknown'}))).toThrow();
  expect(()=>readGovernanceTerms(charter({...founder,custodian:'test.unrelated'}))).toThrow();
});
it('each populated starting charter can be reviewed with only the actual organization name and founding member',()=>{
  for(const [label,draft] of Object.entries(charterTemplates)){
    if(label==='Custom')continue;
    const input={kind:'charter',rules:{...draft,name:'Workshop assembly',founders:['test.member']}};
    expect(readGovernanceTerms(input)).toEqual(input);
    expect(draft).not.toHaveProperty('execution');
    expect(draft).not.toHaveProperty('founders');
    expect(draft.articles.length).toBeGreaterThan(0);
  }
  expect(charterTemplates['Representative council'].offices).toHaveLength(2);
  expect(charterTemplates['Working group'].offices).toEqual([]);
});
it('builds valid proposals for every starting point and takes actual nominees from the selected charter',()=>{
  for(const kind of Object.keys(proposalTemplates) as DecisionKind[]){
    const samples=Object.keys(proposalTemplates[kind]);
    expect(samples.length).toBeGreaterThanOrEqual(2);
    for(const label of samples){
      const {title,text,choices}=proposalDraft(kind,label,rules,'Workshop steward');
      expect(text).toContain(rules.name);
      const nomination=kind==='Election'?{office:'Workshop steward',nominations:['e1'.repeat(32)],choices:['test.candidate']}:{choices};
      if(kind==='Election'){expect(title).toContain('Workshop steward');expect(choices).toEqual([]);}
      const input={kind:'proposal',decision:kind,charter:id,title,text,...nomination};
      expect(readGovernanceTerms(input)).toEqual(input);
      expect(input).not.toHaveProperty('payment');
    }
    expect(proposalDraft(kind,'Custom',rules)).toEqual({title:'',text:'',choices:[]});
  }
});
