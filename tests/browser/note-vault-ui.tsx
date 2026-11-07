// Synthetic presentation fixture only: actual UI, manager, storage, AES-GCM and
// browser WebAuthn PRF. Image seal/Note admission ports are display-only fixtures;
// canonical and native admission is separately qualified by the real-SDK tests.
import {createRoot} from 'react-dom/client';
import {NoteVaultExperience} from '../../src/features/vault/NoteVaultExperience';
import {createNoteVaultManager} from '../../src/receiz/vault/note-manager';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF0sAAAAASUVORK5CYII='),v=>v.charCodeAt(0));
const note={noteId:'10000000-0000-4000-8000-000000000002',rail:'reserve' as const,amountUsdCents:'12500',amountPhiMicro:'1000000'},bytes=new TextEncoder().encode(JSON.stringify(note));
const manager=createNoteVaultManager({owner:{keyId:'f'.repeat(64),receizId:'example.receiz.id'},kai:()=> '15028607000000',images:{render:async()=>png,seal:async value=>({artifactBytes:value.bytes}),verify:async()=>true},admission:{inspectNote:async input=>{if(new TextDecoder().decode(input)!==new TextDecoder().decode(bytes))throw Error('SYNTHETIC_FIXTURE_MISMATCH');return note;}}});
const identity={binding:{artifactOwnerReceizId:'example.receiz.id'},noteVaults:async()=>manager,knownDeposits:()=>[],offlineNotes:async()=>({savedNotes:async()=>[{...note,image:bytes}],exportNote:async()=>({...note,image:bytes})})} as unknown as OpenIdentity;
createRoot(document.getElementById('root')!).render(<><div style={{padding:20,color:'#718797',fontSize:12}}>Synthetic Vault display qualification · no financial value</div><NoteVaultExperience identity={identity} onClose={()=>{}} onEarlierOriginal={()=>{throw Error('UNEXPECTED_LEGACY');}}/></>);
