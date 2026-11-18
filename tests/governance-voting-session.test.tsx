// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {VotingBoard} from '../src/features/voting/VotingBoard';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {GovernanceComposer} from '../src/features/voting/GovernanceComposer';
import {GovernanceFacts} from '../src/features/voting/GovernanceDetail';
import {useGovernanceMemberNames} from '../src/features/voting/governance-member-names';
import {rows} from '../src/features/voting/example/collection';
import {ofKind} from '../src/receiz/governance-view';
import type {GovernanceRow} from '../src/receiz/governance-directory';
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

it('shows the public default username for a new account and presents names on charter creation and review',()=>{
  const profile={uid:'owner',name:'New account',ownerIdentity:identity};
  const host=document.createElement('div');
  host.innerHTML=renderToStaticMarkup(<VotingBoard profile={profile}/>);
  expect(host.querySelector('.gov-kicker')?.textContent).toBe('@jvywaix82jqbwcxffq');
  const named=(id:string)=>id===proofOwner?'@bjklock':id;
  host.innerHTML=renderToStaticMarkup(<GovernanceComposer member={named} owner={proofOwner} rows={[]} mode="charter" charters={[]} onCharter={()=>{}} onFound={()=>{}} onCancel={()=>{}} onReview={()=>{}}/>);
  expect(host.textContent).toContain('Founding member @bjklock');expect(host.innerHTML).not.toContain(proofOwner);
  const charter=ofKind(rows,'charter')[0].document.terms;
  host.innerHTML=renderToStaticMarkup(<GovernanceFacts terms={{...charter,rules:{...charter.rules,founders:[proofOwner],electorate:[proofOwner]}}} member={named}/>);
  expect(host.textContent).toContain('Founders@bjklock');expect(host.textContent).not.toContain(proofOwner);
});

it('labels a published signer only through their matching public account, even with a conflicting publisher',async()=>{
  const uid='dfa7312a-bca3-48ad-a1d5-f63ddcb756de',other='11111111-1111-4111-8111-111111111111';
  const row={...rows[0],profileUid:uid,document:{...rows[0].document,author:proofOwner,accountUid:uid}};
  const request=vi.fn(async()=>Response.json({ok:true,schema:'bank.public-profile-directory.v1',nextCursor:null,
    publicProfileHeads:[{profile:{userId:uid,username:'bjklock',isPrivate:false},viewer:{canView:true},stats:{}}]}));
  vi.stubGlobal('fetch',request);
  function Labels({records}:{records:GovernanceRow[]}){const name=useGovernanceMemberNames(records,null,null);return <p>{name(proofOwner)}</p>;}
  const host=document.createElement('div'),root=createRoot(host);
  try{
    await act(async()=>root.render(<Labels records={[row]}/>));
    expect(host.textContent).toBe('@bjklock');
    expect(request).toHaveBeenCalledWith('/api/bank/public-profile-directory?after=dfa7312a-bca3-48ad-a1d5-f63ddcb756dd',expect.anything());
    await act(async()=>root.render(<Labels records={[{...row,profileUid:other}]}/>));
    expect(host.textContent).toBe('@jvywaix82jqbwcxffq');expect(request).toHaveBeenCalledTimes(1);
  }finally{await act(async()=>root.unmount());vi.unstubAllGlobals();}
});
