import {createRoot} from 'react-dom/client';
import {CreateAsset} from '../../src/features/assets/CreateAsset';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
const fixture={created:0,retried:0,definition:null as unknown,draft:null as unknown};Object.assign(window,{composerFixture:fixture});
const result={bytes:new Uint8Array([1]),filename:'synthetic-original.receizbundle',title:'A complete release',digest:'a'.repeat(64),kind:'proof' as const,status:'held-proof' as const,pulse:'1'};
const identity={username:'artist',accountUsername:()=> 'artist',pendingAssetPublication:async()=>null,createComposedAsset:async(definition:unknown,draft:unknown)=>{fixture.created++;fixture.definition=definition;fixture.draft=draft;return{...result,publication:{status:'pending' as const}};},retryAssetPublication:async()=>{fixture.retried++;return{...result,publication:{status:'published' as const}};}} as unknown as OpenIdentity;
createRoot(document.getElementById('root')!).render(<main className="sheet-content" style={{maxWidth:520,margin:'20px auto',padding:22}}><CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/></main>);
