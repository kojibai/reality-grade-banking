import {createRoot} from 'react-dom/client';
import {CreateAsset} from '../../src/features/assets/CreateAsset';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
const identity={listDeposits:async()=>[],createAsset:async()=>{throw Error('Layout fixture only. This page does not create or sign proof objects.');}} as unknown as OpenIdentity;
const width=new URLSearchParams(location.search).get('width');
if(width==='390'){
 const frame=document.createElement('iframe');frame.title='390px moment composer viewport';frame.src=location.pathname;frame.style.cssText='display:block;width:390px;height:844px;border:0;margin:0 auto;background:#fcfbf8';document.getElementById('root')!.append(frame);
}else createRoot(document.getElementById('root')!).render(<main style={{maxWidth:460,margin:'24px auto',padding:20}}><p style={{fontSize:11,color:'#7b899d',lineHeight:1.6}}>Local composer layout check. No account, sealing or financial operations.</p><CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/></main>);
