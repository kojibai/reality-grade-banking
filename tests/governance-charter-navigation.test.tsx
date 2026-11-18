// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {GovernanceRegister} from '../src/features/voting/GovernanceRegister';
import {GovernanceDetail} from '../src/features/voting/GovernanceDetail';
import {rows} from '../src/features/voting/example/collection';
import {proposalEvidence} from '../src/receiz/governance-closure';
import {ofKind} from '../src/receiz/governance-view';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const charter=ofKind(rows,'charter')[0],poll=ofKind(rows,'proposal').find(r=>r.document.terms.decision==='Poll')!;
it('starts with charters, opens charter-specific decisions and keeps other record types under network activity',async()=>{
 const go=vi.fn(),host=document.createElement('div'),root=createRoot(host);
 const click=(label:string)=>act(async()=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.includes(label));expect(button).toBeDefined();button!.click();});
 try{
   await act(async()=>root.render(<GovernanceRegister rows={rows} network={rows} go={go} path={()=>null}/>));
   expect([...host.querySelectorAll('nav button')].map(b=>b.textContent)).toEqual(['Charters','Network activity']);
   await click(charter.document.terms.rules.name);expect(go).toHaveBeenCalledWith(charter.digest);
   await click('Network activity');
   await act(async()=>{const select=host.querySelector('select')!;select.value='Polls';select.dispatchEvent(new Event('change',{bubbles:true}));});
   expect(host.textContent).toContain(poll.document.terms.title);
   await act(async()=>root.render(<GovernanceDetail published={false} row={charter} rows={rows} actor={null} go={go} back={()=>{}} review={()=>{}} compose={()=>{}} download={()=>{}}/>));
   expect(host.textContent).toContain('Polls');
   await click(poll.document.terms.title);expect(go).toHaveBeenLastCalledWith(poll.digest);
   await click('People');expect(host.textContent).toContain('Voting members');
   await click('Charter rules');expect(host.textContent).toContain('Founding ratification');
 }finally{await act(async()=>root.unmount());}
});
it('keeps an unsigned directory addition from another charter or a nonmember out of the closure manifest',()=>{
 const ballots=ofKind(rows,'ballot').filter(r=>r.document.terms.proposal===poll.digest);
 const ballot=ballots[0],late={...ballot,digest:'aa'.repeat(32),pulse:'999999999999999'};
 const foreign={...ballot,digest:'bb'.repeat(32),document:{...ballot.document,author:'not-a-member'}};
 const other={...ballot,digest:'cc'.repeat(32),document:{...ballot.document,terms:{...ballot.document.terms,charter:'dd'.repeat(32)}}};
 const expected=proposalEvidence(poll,rows);
 expect(expected).toContain(ballot.digest);
 expect(proposalEvidence(poll,[...rows,late,foreign,other])).toEqual(expected);
});
