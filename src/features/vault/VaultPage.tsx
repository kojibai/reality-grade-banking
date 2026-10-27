import {InlineOpening} from '../../components/InlineOpening';
import {lazy,Suspense,useState} from 'react';
import type {VaultLocation} from '../../receiz/vault/location';
import {VaultPublicPage} from './VaultPublicPage';
const PrivateVault=lazy(()=>import('./VaultExperience').then(module=>({default:module.VaultExperience})));
/** Public evidence never opens an identity. Only an explicitly selected private
 * original enters the isolated child-custody experience. */
export function VaultPage({route}:{route:VaultLocation}){
 const [original,setOriginal]=useState<Uint8Array|null>(null);
 return <><VaultPublicPage route={route} onOpenPrivate={setOriginal}/>{original&&<Suspense fallback={<p role="status" className="vault-loading"><InlineOpening label="Preparing your private original"/></p>}><PrivateVault key={route.vaultId} initialBytes={original} onClose={()=>setOriginal(null)}/></Suspense>}</>;
}
