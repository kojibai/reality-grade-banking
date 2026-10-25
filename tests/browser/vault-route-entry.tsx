import {useCallback,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LiveActions} from '../../src/features/account/LiveActions';
import {parseRoute,routeHash} from '../../src/core/routes';
import type {UIAction} from '../../src/core/useBank';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
const identity={username:'vaultfixture',binding:{identityOwnerReceizId:'vaultfixture',artifactOwnerReceizId:'fixture.receiz.id'},needsPhrase:false,vaults:async()=>({list:async()=>[],create:async()=>{throw Error('FIXTURE_NO_FINANCIAL_ACTIONS');}})} as unknown as OpenIdentity;
function Fixture(){const [action,setAction]=useState<UIAction|null>(parseRoute(location.hash).sheet),[active,setActive]=useState(true);const sync=()=>{setActive(location.hash!=='#suspended');if(location.hash!=='#suspended')setAction(parseRoute(location.hash).sheet);};useEffect(()=>{addEventListener('popstate',sync);addEventListener('hashchange',sync);return()=>{removeEventListener('popstate',sync);removeEventListener('hashchange',sync);};},[]);const consume=useCallback(()=>{history.replaceState(null,'','#account/profile');setAction({kind:'profile'});},[]);return <main style={{padding:32}}><h1>Vault destination fixture</h1><p>Synthetic identity. No account creation, native signing, payment or booking.</p><a href="#account/profile/vaults/create" onClick={e=>{e.preventDefault();history.pushState(null,'',routeHash('account',{kind:'profile',vaults:'create'}));sync();}}>Open your vaults</a> <a href="#account/profile">Return to Identity</a>{action&&<LiveActions active={active} action={action} identity={identity} wallet={null} onVaultsEntryConsumed={consume} onClose={()=>{history.replaceState(null,'','#account');setAction(null);}} onForget={async()=>{}} onRefresh={()=>{}}/>}</main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
