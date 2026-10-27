import {describe,it,expect} from 'vitest';
import {calculateQualification, type QualificationInput} from '../src/qualification/policy';
const baseline={pbi:true,avatar:true,header:true,threeOriginals:true,verifiedOriginal:true};
const input=(patch:Partial<QualificationInput>={}):QualificationInput=>({originals:0,witnessedBreaths:0,retention:{starts:0,retained:0},fundingUsdCents:'0',baseline,...patch});
describe('Earn from Originals contribution policy',()=>{
 it.each([
  [0,0,0,1000,'25000000'],[100,0,0,1000,'22500000'],
  [500,150000,399,1000,'12500000'],[250,75000,400,1000,'12500000'],
  [500,150000,400,1000,'0'],[900,900000,400,1000,'0'],
  [0,1,400,1000,'24999917'],
 ])('requires exact funding for %s Originals and %s breaths at %s/%s retention',(originals,witnessedBreaths,retained,starts,required)=>{
  expect(calculateQualification(input({originals,witnessedBreaths,retention:{retained,starts}})).requiredFundingUsdCents).toBe(required);
 });
 it('funding and work combine without creating money or enabling earning',()=>{
  const result=calculateQualification(input({originals:250,witnessedBreaths:75000,retention:{starts:1000,retained:400},fundingUsdCents:'12500000'}));
  expect(result).toMatchObject({remainingFundingUsdCents:'0',requirementsMet:true,economyActive:false,settlementCreditUsdCents:'0'});
 });
 it('does not let a rounded 40% release the witnessed contribution',()=>{
  const result=calculateQualification(input({originals:500,witnessedBreaths:150000,retention:{starts:10000,retained:3999}}));
  expect(result.retentionMet).toBe(false);expect(result.requirementsMet).toBe(false);expect(result.requiredFundingUsdCents).toBe('12500000');
 });
 it('fails each independent work boundary without funding',()=>{
  for(const patch of [{originals:499},{witnessedBreaths:149999},{retention:{starts:1000,retained:399}}]){
   expect(calculateQualification(input({originals:500,witnessedBreaths:150000,retention:{starts:1000,retained:400},...patch})).requirementsMet).toBe(false);
  }
 });
 it('requires the shared baseline even with full funding',()=>{
  for(const key of Object.keys(baseline))expect(calculateQualification(input({fundingUsdCents:'25000000',baseline:{...baseline,[key]:false}})).requirementsMet).toBe(false);
 });
 it('does not manufacture zero, exact retention or qualification from unavailable evidence',()=>{
  const result=calculateQualification(input({originals:null,retention:null,fundingUsdCents:null}));
  expect(result).toMatchObject({requiredFundingUsdCents:null,remainingFundingUsdCents:null,requirementsMet:null});
 });
 it('work alone completes without needing an unavailable funding counter',()=>{
  expect(calculateQualification(input({originals:500,witnessedBreaths:150000,retention:{starts:10,retained:4},fundingUsdCents:null}))).toMatchObject({requiredFundingUsdCents:'0',remainingFundingUsdCents:'0',requirementsMet:true});
 });
 it('rejects negative, fractional and unsafe counters and noninteger money',()=>{
  for(const originals of [-1,0.5,Infinity,Number.MAX_SAFE_INTEGER+1])expect(()=>calculateQualification(input({originals}))).toThrow();
  for(const fundingUsdCents of ['-1','1.2','1e4'])expect(()=>calculateQualification(input({fundingUsdCents}))).toThrow();
 });
});
