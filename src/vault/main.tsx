import {StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {VaultPage} from '../features/vault/VaultPage';
import {vaultLocation} from '../receiz/vault/location';
import '../styles/tokens.css';
import '../styles/app.css';
function Original(){const [route,setRoute]=useState(()=>vaultLocation(location.href));useEffect(()=>{const changed=()=>setRoute(vaultLocation(location.href));addEventListener('popstate',changed);return()=>removeEventListener('popstate',changed);},[]);return route?<VaultPage route={route}/>:<main className="vault-public-page"><h1>Open the exact original.</h1><p>This address does not identify a complete Vault record.</p><a href="/">Return to your account</a></main>;}
createRoot(document.getElementById('root')!).render(<StrictMode><Original/></StrictMode>);
