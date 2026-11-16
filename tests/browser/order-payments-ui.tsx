import {createRoot} from 'react-dom/client';
import {PaymentTools} from '../../src/features/account/PaymentTools';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
// Isolated actual component preview. No identity, account or financial adapters.
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:480,margin:'40px auto',padding:24}}><p style={{fontSize:12,color:'#718197',marginBottom:28}}>Account · Receive</p><h1 style={{fontWeight:500,fontSize:28,color:'#172b45'}}>Receive</h1><p className="body-copy small-copy">Share your payment link, or connect your website.</p><PaymentTools username="yourname" amount=""/></main>);
