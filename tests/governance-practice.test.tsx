// @vitest-environment happy-dom
import {afterEach,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {GovernanceExample} from '../src/features/voting/GovernanceExample';
import {PracticeActions} from '../src/features/voting/PracticeActions';
import {practiceRows,restorePractice,savePractice,type PracticeRecord} from '../src/features/voting/example/practice-state';
import {rows} from '../src/features/voting/example/collection';
import {ballotRegister,charterRatification,ofKind} from '../src/receiz/governance-view';

const charter=ofKind(rows,'charter')[0],election=ofKind(rows,'proposal').find(p=>p.document.terms.decision==='Election')!;
const [founder,cofounder]=charter.document.terms.rules.founders;
const draftId='a'.repeat(64),storage='bankeiz.vote.practice.harbor.v1';
afterEach(()=>sessionStorage.removeItem(storage));
it('retains existing tab drafts and ballots when the local practice model gains member statements',()=>{
  sessionStorage.setItem(storage,JSON.stringify({drafts:{[draftId]:charter.document.terms},ballots:{[election.digest]:election.document.terms.choices[0]}}));
  const practice=restorePractice(founder,rows);
  expect(practice.actor).toBe(founder);
  expect(practice.records[0]).toMatchObject({id:draftId,author:founder,terms:charter.document.terms});
  expect(practice.records[1].terms).toMatchObject({kind:'ballot',charter:charter.digest,proposal:election.digest,previous:null});
  savePractice(practice);expect(restorePractice(founder,rows)).toEqual(practice);
  expect(localStorage.getItem(storage)).toBeNull();
});
it('keeps practice statements outside the example census and requires each named founder before charter actions',()=>{
  const base:PracticeRecord={id:draftId,author:founder,pulse:'100',terms:charter.document.terms};
  const approval=(id:string,author:string):PracticeRecord=>({id:id.repeat(64),author,pulse:'101',terms:{kind:'ratification',charter:draftId}});
  const local=practiceRows([base,approval('b',founder)]),draft=ofKind(local,'charter')[0];
  const props={panel:'Decisions' as const,charter:draft,examples:rows,practice:local,save:()=>{},compose:()=>{}};
  expect(renderToStaticMarkup(<PracticeActions {...props} actor={cofounder}/>)).toContain('Ratify practice charter');
  expect(renderToStaticMarkup(<PracticeActions {...props} actor={founder}/>)).not.toContain('Ratify practice charter');
  const after=practiceRows([base,approval('b',founder),approval('c',cofounder)]);
  expect(renderToStaticMarkup(<PracticeActions {...props} practice={after} actor={founder}/>)).toContain('Create proposal');
  expect(charterRatification(charter,rows).approvals).toHaveLength(2);
  expect([...ballotRegister(election,charter,rows).counts.values()]).toEqual([1,3]);
});

it('offers one creation action appropriate to the directory or charter',()=>{
  const page='/vote/?example=harbor-tool-library';
  const original=location.href;
  const buttons=()=>Array.from(new DOMParser().parseFromString(renderToStaticMarkup(<GovernanceExample/>),'text/html').querySelectorAll('button')).map(b=>b.textContent?.trim()).filter(s=>s==='Create charter'||s==='Create proposal');
  try{
    history.replaceState(null,'',page);
    expect(buttons()).toEqual(['Create charter']);
    history.replaceState(null,'',page+'&record='+charter.digest);
    expect(buttons()).toEqual(['Create proposal']);
    history.replaceState(null,'',page+'&record='+election.digest);
    expect(buttons()).toEqual([]);
  }finally{history.replaceState(null,'',original);}
});
