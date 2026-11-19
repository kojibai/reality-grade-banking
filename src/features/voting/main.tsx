import {createRoot} from 'react-dom/client';
import type {ReactNode} from 'react';
import {ProfileFooter} from '../../public-explorer/ProfileFooter';
import {registerBankWorker} from '../../pwa/updates';
import {governanceLocation} from '../../receiz/governance-links';
import {VotingBoard} from './VotingBoard';

const url=new URL(location.href),digest=governanceLocation(url),qualification=url.searchParams.get('qualification');
const root=createRoot(document.getElementById('vote-root')!);
const show=(board:ReactNode)=>root.render(<><main>{board}</main><ProfileFooter navigationLabel="Voting footer" resource="conformance"/></>);
if((qualification==='election'||qualification==='treasury')&&/^\/vote\/?$/.test(url.pathname)){
  void import('./GovernanceQualification').then(({GovernanceQualification})=>show(<GovernanceQualification name={qualification}/>));
}else if(url.searchParams.get('example')==='harbor-tool-library'&&/^\/vote\/?$/.test(location.pathname)){
  void import('./GovernanceExample').then(({GovernanceExample})=>show(<GovernanceExample/>));
}else {
  const draft=url.searchParams.get('draft');
  show(<VotingBoard initialDigest={digest??undefined} initialDraft={draft==='receiz'?'Receiz':draft==='bankeiz'?'Bankeiz':undefined}/>);
}

if(import.meta.env.PROD&&'serviceWorker' in navigator)registerBankWorker(navigator.serviceWorker);
