import {it,expect} from 'vitest';
import {parseQualificationProgress,createQualificationProgressReader} from '../src/qualification/source';
import {qualificationFixture} from './fixtures/originals-qualification';
it('reads private accepted completion and rejects wrong account, unsigned sources and fake economic activation',()=>{
 expect(parseQualificationProgress(qualificationFixture(),'owner').acceptance.status).toBe('qualified');
 for(const patch of [{accountUid:'other'},{economyActive:false},{settlementCreditUsdCents:'1'},{originals:0},{sourceOriginals:[]},{acceptance:{status:'qualified',entryId:null,entryHash:null}}])expect(()=>parseQualificationProgress({ok:true,qualification:{...qualificationFixture().qualification,...patch}},'owner')).toThrow();
});
it('completion survives outages and later incomplete observations',async()=>{
 let calls=0;const reader=createQualificationProgressReader('owner',async()=>{calls++;if(calls===2)throw Error('offline');return qualificationFixture();});
 const first=await reader.read();await expect(reader.read()).rejects.toThrow('offline');expect(reader.known()).toBe(first);expect((await reader.read()).acceptance.status).toBe('qualified');
});
it('does not accept a late response after identity close or read before requested',async()=>{
 let open=true,calls=0;const reader=createQualificationProgressReader('owner',async()=>{calls++;open=false;return qualificationFixture();},()=>open);
 expect(calls).toBe(0);await expect(reader.read()).rejects.toThrow('QUALIFICATION_ACCOUNT_CLOSED');expect(reader.known()).toBe(null);
});
it('routes private qualification through the existing exact native account transport only',async()=>{
 const {permittedNativePath}=await import('../src/receiz/native-transport');const {BANK_APPLICATION_ID}=await import('../src/receiz/config');
 const path=`/api/connect/originals-qualification?applicationId=${BANK_APPLICATION_ID}`;
 expect(permittedNativePath(path,'GET')).toBe(true);
 for(const [value,method]of [[path,'POST'],[path+'&accountUid=other','GET'],[path+'&applicationId='+BANK_APPLICATION_ID,'GET'],['/api/connect/originals-qualification?applicationId=rc_other','GET']])expect(permittedNativePath(value,method)).toBe(false);
});

it('one admitted signed source suffices even when the remaining Showcase is incomplete',()=>{
 const wire=qualificationFixture();Object.assign(wire.qualification,{membershipComplete:false,originals:null});
 expect(parseQualificationProgress(wire,'owner').earningEnabled).toBe(true);
});
it('does not promote a source count or client flags into accepted earning',()=>{
 for(const sourceOriginals of [[],[{...qualificationFixture().qualification.sourceOriginals[0],pbiReceiptHash:null}]]){
  const wire=qualificationFixture();Object.assign(wire.qualification,{sourceOriginals});expect(()=>parseQualificationProgress(wire,'owner')).toThrow();
 }
});
