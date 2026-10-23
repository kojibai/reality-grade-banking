import {useEffect,useState} from 'react';

/** Passive preparation cannot hold document loading open. Native Play stays
 * available on the same element throughout; no reload or timer is needed. */
export function usePassiveMediaPreload():'none'|'metadata'{
 const [settled,setSettled]=useState(()=>typeof document==='undefined'||document.readyState==='complete');
 useEffect(()=>{const loaded=()=>setSettled(true);if(document.readyState==='complete')loaded();else window.addEventListener('load',loaded,{once:true});return()=>window.removeEventListener('load',loaded);},[]);
 return settled?'metadata':'none';
}
