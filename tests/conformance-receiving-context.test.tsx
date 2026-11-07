// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {receivingInvitationUrl,RECEIVING_MESSAGE} from '../src/adoption/invitation';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
// This navigation test does not exercise or replace identity admission.
vi.mock('../src/conformance/ConformanceIdentity',()=>({ConformanceIdentity:()=>null}));
import ConformanceApp from '../src/conformance/ConformanceApp';
it('carries the selected institution locally into preparation before credentials and removes the invitation fragment',()=>{
 const invitation=receivingInvitationUrl({schema:'bankeiz.receiving-invitation.v1',message:RECEIVING_MESSAGE,institution:{name:'Independent Example Bank',id:'independent-example'}});
 history.replaceState(null,'','/conformance/'+new URL(invitation).hash);
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{act(()=>root.render(<ConformanceApp/>));
  expect(host.querySelector('[role=tab][aria-selected=true]')?.textContent).toBe('Assess implementation');
  expect(location.hash).toBe('#assess');expect(host.querySelector('.receiving-preparation-institution')?.textContent).toContain('Independent Example Bank');
  const prep=host.querySelector('.receiving-preparation')!,workspace=host.querySelector('.institution-workspace')!;
  expect(prep.compareDocumentPosition(workspace)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(workspace.textContent).toContain('Open conformance credential');expect(host.querySelector('[data-preparation-requirements]')).not.toBeNull();
 }finally{act(()=>root.unmount());host.remove();history.replaceState(null,'','/conformance/');}
});
it('leaves another retained public surface invitation for its own reader',()=>{
 const invitation=receivingInvitationUrl({schema:'bankeiz.receiving-invitation.v1',message:RECEIVING_MESSAGE,institution:{name:'Receiving Guide Institution'}}),fragment=new URL(invitation).hash;
 history.replaceState(null,'','/receiving/'+fragment);const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ConformanceApp activeSurface={false}/>));expect(location.hash).toBe(fragment);expect(host.querySelector('.receiving-preparation-institution')).toBeNull();}
 finally{act(()=>root.unmount());history.replaceState(null,'','/conformance/');}
});
