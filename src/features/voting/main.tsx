import {createRoot} from 'react-dom/client';
import {registerBankWorker} from '../../pwa/updates';
import {governanceLocation} from '../../receiz/governance-links';
import {VotingBoard} from './VotingBoard';

const url=new URL(location.href),digest=governanceLocation(url),qualification=url.searchParams.get('qualification');
const root=createRoot(document.getElementById('vote-root')!);
if((qualification==='election'||qualification==='treasury')&&/^\/vote\/?$/.test(url.pathname)){
  void import('./GovernanceQualification').then(({GovernanceQualification})=>root.render(<GovernanceQualification name={qualification}/>));
}else if(url.searchParams.get('example')==='harbor-tool-library'&&/^\/vote\/?$/.test(location.pathname)){
  void import('./GovernanceExample').then(({GovernanceExample})=>root.render(<GovernanceExample/>));
}else root.render(<VotingBoard initialDigest={digest??undefined}/>);

if(import.meta.env.PROD&&'serviceWorker' in navigator)registerBankWorker(navigator.serviceWorker);
