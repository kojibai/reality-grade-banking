import {createRoot} from 'react-dom/client';
import {Ledger} from '../../src/features/ledger/Ledger';
import {parsePublicNetworkPage} from '../../src/receiz/public-network';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
const shared={transferId:'synthetic-ui-payment',amountUsdCents:'100',createdAt:'2026-10-19T04:30:00Z',pulse:14717287};
const records=[...parsePublicNetworkPage('actions',{ok:true,actions:[{...shared,id:'synthetic-ui-action',actionKind:'wallet.transfer.connect',summary:'Delegated wallet transfer',entryHash:'a'.repeat(64)}]}).records,...parsePublicNetworkPage('wallet',{ok:true,events:[{...shared,id:'synthetic-ui-transfer',kind:'chat_transfer'}]}).records].map(record=>({...record,authority:'account-source-projection' as const}));
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:390,margin:'30px auto',padding:18}}><p className="body-copy small-copy">Synthetic UI fixture · no payment executed</p><Ledger active={false} personalHistory={{available:true,completeAtSealedHead:true,records}}/></main>);
