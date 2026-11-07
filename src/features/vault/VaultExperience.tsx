import {useState,type ComponentProps} from 'react';
import {VaultExperience as LegacyVaultExperience} from './LegacyVaultExperience';
import {NoteVaultExperience} from './NoteVaultExperience';
import {isNoteVaultImage} from '../../receiz/vault/export';

/** Format hints only route input. Both readers independently admit its proofs. */
export function VaultExperience(props:ComponentProps<typeof LegacyVaultExperience>){
 const [earlier,setEarlier]=useState<Uint8Array|null>(null);
 const [earlierSaved,setEarlierSaved]=useState(false);
 const modern=props.initialBytes?isNoteVaultImage(props.initialBytes):Boolean(props.identity?.noteVaults);
 if(earlier||earlierSaved)return <LegacyVaultExperience {...props} allowCreate={false} initialMode="home" initialBytes={earlier??undefined} onClose={()=>{setEarlier(null);setEarlierSaved(false);}}/>;
 return modern?<NoteVaultExperience {...props} onEarlierOriginal={setEarlier} onEarlierSaved={()=>setEarlierSaved(true)}/>:<LegacyVaultExperience {...props}/>;
}
