/** Read-only product illustrations. Never mounted as an account or admitted as proof. */
import type {ReactNode} from 'react';
import {ConsoleShell} from '../components/ConsoleShell';
import {Sheet} from '../components/Sheet';
import {Entrance} from '../features/identity/Entrance';
import {LiveAccount} from '../features/account/LiveAccount';
import {LiveDeposit} from '../features/deposit/LiveDeposit';
import {LiveSend,LiveReceive} from '../features/account/LivePayments';
import {LedgerInspector} from '../features/ledger/LedgerInspector';
import {VaultExperience} from '../features/vault/VaultExperience';
import {MessageComposer,TypingBubble} from '../features/messages/MessagesPanel';
import {PaymentMessage} from '../features/messages/PaymentMessage';
import type {OpenIdentity} from '../receiz/native-identity';
import type {WalletPoint} from '../receiz/wallet-series';
import type {SharedWallet} from '../receiz/shared-wallet';
import type {ChatMessage} from '../receiz/native-messaging';
import type {PublicRecord} from '../receiz/public-network';
const noop=()=>{};
const forbidden=()=>{throw Error('PRODUCT_EXAMPLE_IS_READ_ONLY');};
// Methods fail closed even if someone mistakenly mounts this static illustration.
const identity={username:'example',accountUsername:()=> 'example',vaults:forbidden} as unknown as OpenIdentity;
const wallet:SharedWallet={userId:'example-only',totalUsdCents:'112500',reserveUsdCents:'112500',settlementUsdCents:'0',balancePhiMicro:'0',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null};
// Example movements only: $1,000 opening value, $250 received, then $125 sent.
const history:WalletPoint[]=[['2026-10-18T12:00:00Z','100000'],['2026-10-19T12:00:00Z','125000'],['2026-10-20T12:00:00Z','112500']].map(([at,totalUsdCents])=>({userId:'example-only',at,kaiUPulse:'0',totalUsdCents,reserveUsdCents:totalUsdCents,settlementUsdCents:'0'}));
const record:PublicRecord={id:'example-payment',sourceId:'example-payment',source:'wallet',kind:'payment',title:'Payment to Alex',detail:'Design work · Example payment',time:'2026-10-20T12:00:00.000Z',actor:'Example account',amountUsdCents:'12500',kaiUpulse:null,pulse:null,sourceUrl:null,sender:'Example account',recipient:'Alex · Example',evidence:{},authority:'account-source-projection',details:{note:'Design work',sender:'Example account',recipient:'Alex · Example'}};
export const productScreenNames=['entry','account','deposit','receive','send','record','vault','messages'] as const;
export type ProductScreenName=typeof productScreenNames[number];
const question='What’s coming in, and what do I need to pay?';
const answer='In these example records: $1,200 is owed to you and $450 is due. Your account has $1,125. If every invoice is paid and those bills clear, you would have $1,875. Let’s look at the overdue payment first.';
function textMessage(body:string):ChatMessage{return{id:'example-question',conversationId:'example-only',senderUserId:'example-only',senderKind:'user',senderAiId:null,senderDisplay:'You',body,createdAt:'2026-10-20T12:00:00.000Z',receizedAt:'2026-10-20T12:00:00.000Z',receipt:null,sealedOriginalAvailable:false};}
function MessagesExample(){return <Sheet title="Your agent" active={false} onClose={noop}><section className="bank-messaging"><nav className="bank-messaging-nav"><button className="active">Your agent</button><button>Messages</button></nav><div className="bank-conversation-scroll"><div className="bank-thread-messages"><div className="bank-message-own"><PaymentMessage message={textMessage(question)} accountUid="example-only" members={[]}/></div><div data-example-response data-example-answer={answer}><TypingBubble name="Your agent" text={answer}/></div><div className="bank-message-own" data-example-followup><PaymentMessage message={textMessage('Help me follow up on the overdue invoice.')} accountUid="example-only" members={[]}/></div><div className="bank-twin-reply" data-example-followup><span className="bank-twin-reply-identity">Your agent · Example interpretation</span><p>Mira’s example invoice is $400. We can prepare a reminder with the amount and payment context together. Review the person and message before sending.</p></div></div></div><MessageComposer draft="" setDraft={noop} submit={event=>event.preventDefault()} placeholder="Ask about your money…" busy={false} maxLength={16000}/></section></Sheet>;}
export function ProductScreen({screen}:{screen:ProductScreenName|string}){
 let body:ReactNode,source:string;
 const sheet=(title:string,content:ReactNode)=><Sheet title={title} active={false} onClose={noop}>{content}</Sheet>;
 switch(screen){
 case 'entry':source='Entrance';body=<Entrance opening={false} busy={false} error={null} onCreate={async()=>forbidden()} onImport={async()=>forbidden()}/>;break;
 case 'deposit':source='ConsoleShell,Sheet,LiveDeposit';body=sheet('Deposit',<LiveDeposit identity={identity} onClose={noop} onRefresh={noop}/>);break;
 case 'receive':source='ConsoleShell,Sheet,LiveReceive';body=sheet('Receive',<LiveReceive identity={identity} active={false}/>);break;
 case 'send':source='ConsoleShell,Sheet,LiveSend';body=sheet('Send',<LiveSend identity={identity} wallet={wallet} initialRequest={{recipient:'alex',amount:'125.00'}} onClose={noop}/>);break;
 case 'record':source='ConsoleShell,Sheet,LedgerInspector';body=sheet('Transaction details',<LedgerInspector record={record} value={{amountUsdCents:'12500',basis:'payment',pulse:null,considerationUsdCents:null}} inApp receiptMode/>);break;
 case 'vault':source='ConsoleShell,VaultExperience,Sheet';body=<VaultExperience identity={identity} initialMode="create" active={false} onClose={noop}/>;break;
 case 'messages':source='ConsoleShell,Sheet,MessageComposer,TypingBubble,PaymentMessage';body=<MessagesExample/>;break;
 default:source='ConsoleShell,LiveAccount,BalanceChart';body=<LiveAccount walletHistory={history} wallet={wallet} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>;
 }
 return <div className="product-screen" data-product-example={screen} data-source-components={source}><div className="product-example-label">Actual interface · Example data</div><div className="product-screen-window" inert>{screen==='entry'?body:<ConsoleShell panel="account" active={false} identityLabel="EX" onNavigate={noop} onDeposit={noop} onProfile={noop} onMessages={noop}>{screen==='account'?body:<><LiveAccount walletHistory={history} wallet={wallet} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>{body}</>}</ConsoleShell>}</div></div>;
}
