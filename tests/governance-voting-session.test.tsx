// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {VotingBoard} from '../src/features/voting/VotingBoard';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {checkoutIdentitySession} from '../src/checkout/checkout-identity';

vi.mock('../src/checkout/checkout-identity',()=>({checkoutIdentitySession:vi.fn()}));
vi.mock('../src/receiz/governance-live',()=>({followGovernanceAdditions:()=>()=>{},notifyGovernancePublication:vi.fn()}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const proofOwner='receiz_jvywaix82jqbwcxffq.receiz.id';
const identity={username:'receiz_jvywaix82jqbwcxffq',binding:{artifactOwnerReceizId:proofOwner},accountUsername:()=> 'receiz_jvywaix82jqbwcxffq'} as OpenIdentity;

it('shows the owner-bound profile handle separately from the proof signer and keeps visitors public',()=>{
  const profile={uid:'owner',name:'BJ Klock',publicName:'bjklock',ownerIdentity:identity};
  const owner=document.createElement('div');owner.innerHTML=renderToStaticMarkup(<VotingBoard profile={profile}/>);
  expect(owner.querySelector('details p')?.textContent).toBe('@bjklock');
  expect(owner.querySelector('.gov-proof-owner code')?.textContent).toBe(proofOwner);
  expect(owner.querySelector('a[href="/vote/"]')).toBeNull();
  const visitor=renderToStaticMarkup(<VotingBoard profile={{...profile,ownerIdentity:null}}/>);
  expect(visitor).not.toContain(proofOwner);expect(visitor).not.toContain('My Receiz ID');
});

it('closes only the voting session, keeps public browsing across reload and resumes explicit account entry',async()=>{
  const who={...identity,confirmedAccountUsername:()=> 'bjklock'};
  const session={restore:vi.fn(async()=>who),open:vi.fn(async()=>who),recoverPbi:vi.fn(async()=>who),import:vi.fn(),close:vi.fn()};
  vi.mocked(checkoutIdentitySession).mockResolvedValue(session);
  const host=document.createElement('div');document.body.append(host);
  let root=createRoot(host);
  const button=(label:string)=>host.querySelector<HTMLButtonElement>('button[aria-label="'+label+'"]');
  const click=async(el:HTMLButtonElement|null|undefined)=>{expect(el).toBeTruthy();await act(async()=>el!.click());};
  const create=()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Create charter');
  try{
    await act(async()=>root.render(<VotingBoard/>));
    expect(host.querySelector('.gov-account-bar .gov-session-name')?.textContent).toBe('@bjklock');
    expect(host.querySelector('details p')?.textContent).toBe('@bjklock');
    expect(button('Use Identity Record')).toBeNull();
    await click(button('Log out of voting'));
    expect(session.close).toHaveBeenCalledOnce();expect(host.textContent).not.toContain(proofOwner);expect(host.textContent).not.toContain('@bjklock');
    expect(button('Use Identity Record')).toBeTruthy();expect(button('Use PBI')).toBeTruthy();
    await act(async()=>root.unmount());root=createRoot(host);
    await act(async()=>root.render(<VotingBoard/>));
    expect(session.restore).toHaveBeenCalledOnce();
    await click(create());expect(session.open).not.toHaveBeenCalled();
    await click(button('Use PBI'));expect(session.recoverPbi).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('Found an organization');
  }finally{await act(async()=>root.unmount());host.remove();sessionStorage.clear();}
});
