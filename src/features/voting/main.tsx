import {createRoot,type Root} from 'react-dom/client';
import {useSyncExternalStore,type ReactNode} from 'react';
import {ProfileFooter} from '../../public-explorer/ProfileFooter';
import {startPublicDocumentRuntime} from '../../core/public-document-entry';
import {usePublicRuntimeActive} from '../../core/public-runtime';
import {registerBankWorker} from '../../pwa/updates';
import {governanceLocation} from '../../receiz/governance-links';
import {readProfileGovernanceOwner} from '../../receiz/profile-governance-access';
import {subscribeProfileActions} from '../../receiz/profile-actions';
import {VotingBoard} from './VotingBoard';

function PublicVoting({url,retained}:{url:URL;retained:boolean}){
 const owner=useSyncExternalStore(subscribeProfileActions,readProfileGovernanceOwner);
 const active=usePublicRuntimeActive('vote');
 const draft=url.searchParams.get('draft');
 return <VotingBoard activeWorkspace={!retained||active} accountIdentity={owner?.identity} accountUid={owner?.uid}
   initialDigest={governanceLocation(url)??undefined} initialDraft={draft==='receiz'?'Receiz':draft==='bankeiz'?'Bankeiz':undefined}/>;
}

const roots=new WeakMap<HTMLElement,Root>();
export function mountPublicDocument(element=document.querySelector<HTMLElement>('[data-public-runtime="vote"],#vote-root')){
 if(!element||roots.has(element))return;
 const root=createRoot(element);
 roots.set(element,root);
 const url=new URL(location.href),qualification=url.searchParams.get('qualification');
 const votingIndex=/^\/vote\/?$/.test(url.pathname);
 const show=(board:ReactNode,workspace=false)=>root.render(<><main className={workspace?'profile-voting-workspace':undefined}>{board}</main><ProfileFooter navigationLabel="Voting footer" resource="conformance" showVotingLink={false}/></>);
 if(votingIndex&&(qualification==='election'||qualification==='treasury')){
  void import('./GovernanceQualification').then(({GovernanceQualification})=>show(<GovernanceQualification name={qualification}/>));
 }else if(votingIndex&&url.searchParams.get('example')==='harbor-tool-library'){
  void import('./GovernanceExample').then(({GovernanceExample})=>show(<GovernanceExample/>));
 }else {
  show(<PublicVoting url={url} retained={element.dataset.publicRuntime==='vote'}/>,true);
 }
}

if(document.getElementById('vote-root')||document.getElementById('public-vote-root')||/^\/vote\/?$/.test(location.pathname)){
 const standalone=!document.getElementById('root');
 startPublicDocumentRuntime('vote',()=>mountPublicDocument());
 if(standalone&&import.meta.env.PROD&&'serviceWorker' in navigator)registerBankWorker(navigator.serviceWorker);
}
