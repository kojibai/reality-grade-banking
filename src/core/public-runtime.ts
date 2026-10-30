import {useEffect,useState} from 'react';
import {flushSync} from 'react-dom';

export type PublicRuntime='ledger'|'explore'|'verify'|'conformance'|'receipt'|'feed'|'discover';
export function publicRuntimeRoot(name:PublicRuntime):HTMLElement {
 const root=document.querySelector<HTMLElement>(`[data-public-runtime="${name}"]`)??document.getElementById('root');
 if(!root)throw Error('PUBLIC_WORKSPACE_ROOT_MISSING');
 return root;
}
/** Hidden retained workspaces keep their state while suspending live work. */
export function usePublicRuntimeActive(name:PublicRuntime):boolean {
 const read=()=>!publicRuntimeRoot(name).hidden;
 const [active,setActive]=useState(read);
 useEffect(()=>{const changed=()=>flushSync(()=>setActive(read()));addEventListener('receiz-bank:surface',changed);return()=>removeEventListener('receiz-bank:surface',changed);},[name]);
 return active;
}
