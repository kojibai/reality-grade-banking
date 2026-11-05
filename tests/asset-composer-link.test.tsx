// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import * as composer from '../src/receiz/asset-composer';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const base={title:'Example original',description:'A caption',kind:'moment' as const,longForm:'The complete essay.',files:[]};
it.each([
 [' example.com/work ','A caption\nLink https://example.com/work'],
 ['http://example.com/work','A caption\nLink http://example.com/work'],
 ['HTTPS://example.com/work?edition=2#part','A caption\nLink HTTPS://example.com/work?edition=2#part'],
])('normalizes %s into the existing sealed claim format', (link,expected)=>{
 const selected=composer.composerDraftWithLink(base,link);
 expect(selected.description).toBe(expected);expect(composer.composerDefinition(selected).linkedProofDigest).toBeNull();
 expect(composer.readComposerAssetContent({schema:'receiz.bank.asset-content.v2',ownerReceizId:'example.receiz.id',...selected},'example.receiz.id').description).toBe(expected);
 expect(base.description).toBe('A caption');expect(selected.longForm).toBe('The complete essay.');
});
it('keeps existing multiline claim content unchanged when no link is supplied',()=>{
 const draft={...base,description:'  A caption.\nSecond line.  '};
 for(const link of [undefined,'','   '])expect(composer.composerDraftWithLink(draft,link)).toEqual(composer.validateComposerAssetDraft(draft,composer.readComposerCapacity()));
});
it('refuses unusable links or an over-capacity combined claim without reading any file',()=>{
 for(const link of ['javascript:alert(1)','ftp://example.com/work','https://user:secret@example.com','https://','https://example.com/a\nb'])expect(()=>composer.composerDraftWithLink(base,link)).toThrow('COMPOSER_LINK_INVALID');
 expect(()=>composer.composerDraftWithLink({...base,description:'x'.repeat(1980)},'example.com/work')).toThrow('COMPOSER_LINK_CLAIM_CAPACITY');
});
function edit(host:HTMLElement,label:string,value:string){const node=host.querySelector<HTMLInputElement|HTMLTextAreaElement>(`[aria-label="${label}"]`)!;expect(node,label).not.toBeNull();Object.getOwnPropertyDescriptor(node instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));}
for(const backed of [false,true])it(`carries the normalized link into the exact ${backed?'backed':'ordinary'} composer draft and definition`,async()=>{
 let selected:unknown,definition:unknown;
 const api={pending:async()=>({state:null}),operations:async(draft:unknown)=>{selected=draft;return {prepare:async(request:{definition:unknown})=>{definition=request.definition;throw Error('CONTROLLED_STOP_BEFORE_SOURCE_OR_FUNDS');}};}};
 const identity={username:'example',accountUsername:()=> 'example',backedAssetPublication:async()=>api,pendingAssetPublication:async()=>null,createComposedAsset:async(next:unknown,draft:unknown)=>{selected=draft;definition=next;throw Error('CONTROLLED_STOP_BEFORE_SOURCE_OR_FUNDS');}} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  await act(()=>{edit(host,'Title','Example original');edit(host,'Description','A caption\nwith context.');});
  await act(()=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Details')!.click());
  await act(()=>edit(host,'Link',' example.com/work '));
  if(backed){await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Add backing"]')!.click());await act(()=>edit(host,'Backing amount','1.00'));}
  const submit=backed?Array.from(host.querySelectorAll('button')).find(button=>button.textContent?.startsWith('Review asset creation')):host.querySelector<HTMLButtonElement>('[aria-label="Create asset"]');
  await act(async()=>submit!.click());
  const expected='A caption with context.\nLink https://example.com/work';
  expect(selected).toMatchObject({title:'Example original',description:expected,kind:'moment',files:[]});
  expect(definition).toMatchObject({name:'Example original',description:expected,linkedProofDigest:null});
  expect(composer.readComposerAssetContent({schema:'receiz.bank.asset-content.v2',ownerReceizId:'example.receiz.id',...selected as object},'example.receiz.id').description).toBe(expected);
  expect(selected).not.toHaveProperty('link');
 }finally{act(()=>root.unmount());}
});
