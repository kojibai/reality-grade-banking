import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ReceivedOriginal} from '../../src/features/deposit/ReceivedOriginal';
import {LiveDeposit} from '../../src/features/deposit/LiveDeposit';
import {SiteFooter} from '../../src/components/SiteFooter';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
const digest='a'.repeat(64),checkout={sessionId:'cs_synthetic123456',clientSecret:'synthetic-only-not-a-secret',amountUsdCents:'25000'};
const received={status:async()=>({status:'unknown',digest,filename:'sample-original.receizbundle'}),resume:async()=>({status:'held',digest,filename:'sample-received.receizbundle'}),exportHeld:async()=>new File(['synthetic-ui-only'],'sample-received.txt')};
const identity={receivedProof:async()=>received,pendingCardDeposits:async()=>[checkout],checkCardDeposit:async()=>({status:'credited'})}as unknown as OpenIdentity;
function Preview(){const [mode,setMode]=useState('receive');return <><main style={{maxWidth:390,margin:'30px auto',padding:18}}><p className="body-copy small-copy">Synthetic UI fixtures · no proof claimed or payment executed</p><div className="segmented"><button onClick={()=>setMode('receive')}>Receive recovery</button><button onClick={()=>setMode('card')}>Card return</button><button onClick={()=>setMode('footer')}>Footer</button></div>{mode==='receive'?<ReceivedOriginal identity={identity} onRefresh={()=>{}} onClose={()=>setMode('footer')}/>:mode==='card'?<LiveDeposit identity={identity} resumeSessionId={checkout.sessionId} onRefresh={()=>{}} onClose={()=>setMode('footer')}/>:<h1 className="page-title">Bankeiz</h1>}</main>{mode==='footer'&&<SiteFooter/>}</>;}
createRoot(document.getElementById('root')!).render(<Preview/>);
