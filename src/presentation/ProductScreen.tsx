/** Read-only product illustrations. Never mounted as an account or admitted as proof. */
import type {ReactNode} from 'react';
import {moneyExample} from '../content/money-examples.mjs';
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
function textMessage(body:string,id:string):ChatMessage{return{id:'example-'+id,conversationId:'example-only',senderUserId:'example-only',senderKind:'user',senderAiId:null,senderDisplay:'You',body,createdAt:'2026-10-20T12:00:00.000Z',receizedAt:'2026-10-20T12:00:00.000Z',receipt:null,sealedOriginalAvailable:false};}
function MessagesExample({example='overview'}:{example?:string}){const story=moneyExample(example);return <Sheet title="Your agent" active={false} onClose={noop}><section className="bank-messaging" data-example-scenario={example}><nav className="bank-messaging-nav"><button className="active">Your agent</button><button>Messages</button></nav><div className="bank-conversation-scroll"><div className="bank-thread-messages"><div className="bank-message-own"><PaymentMessage message={textMessage(story.question,'question')} accountUid="example-only" members={[]}/></div><div data-example-response data-example-answer={story.answer}><TypingBubble name="Your agent" text={story.answer}/></div><div className="bank-message-own" data-example-followup><PaymentMessage message={textMessage(story.followup,'followup')} accountUid="example-only" members={[]}/></div><div data-example-response data-example-followup data-example-answer={story.followupAnswer}><TypingBubble name="Your agent" text={story.followupAnswer}/></div></div></div><MessageComposer draft="" setDraft={noop} submit={event=>event.preventDefault()} placeholder="Ask about your money…" busy={false} maxLength={16000}/></section></Sheet>;}
export function ProductScreen({screen,example='overview'}:{screen:ProductScreenName|string;example?:string}){
 const sample=example!=='overview'||screen==='messages'?{...wallet,totalUsdCents:moneyExample(example).balanceCents,reserveUsdCents:moneyExample(example).balanceCents}:wallet;
 const sampleHistory=example!=='overview'||screen==='messages'?history.map(point=>({...point,totalUsdCents:sample.totalUsdCents!,reserveUsdCents:sample.reserveUsdCents!})):history;
 const sampleRecord=example==='action-followthrough'?{...record,id:'example-leah-deposit',sourceId:'example-leah-deposit',title:'Payment from Leah',detail:'Package deposit · Example payment',amountUsdCents:'90000',sender:'Leah · Example',recipient:'Example account',details:{note:'Package deposit',sender:'Leah · Example',recipient:'Example account'}}:record;
 let body:ReactNode,source:string;
 const sheet=(title:string,content:ReactNode)=><Sheet title={title} active={false} onClose={noop}>{content}</Sheet>;
 switch(screen){
 case 'entry':source='Entrance';body=<Entrance opening={false} busy={false} error={null} onCreate={async()=>forbidden()} onImport={async()=>forbidden()}/>;break;
 case 'deposit':source='ConsoleShell,Sheet,LiveDeposit';body=sheet('Deposit',<LiveDeposit identity={identity} onClose={noop} onRefresh={noop}/>);break;
 case 'receive':source='ConsoleShell,Sheet,LiveReceive';body=sheet('Receive',<LiveReceive identity={identity} active={false}/>);break;
 case 'send':source='ConsoleShell,Sheet,LiveSend';body=sheet('Send',<LiveSend identity={identity} wallet={wallet} initialRequest={{recipient:'alex',amount:'125.00'}} onClose={noop}/>);break;
 case 'record':source='ConsoleShell,Sheet,LedgerInspector';body=sheet('Transaction details',<LedgerInspector record={sampleRecord} value={{amountUsdCents:sampleRecord.amountUsdCents!,basis:'payment',pulse:null,considerationUsdCents:null}} inApp receiptMode/>);break;
 case 'vault':source='ConsoleShell,VaultExperience,Sheet';body=<VaultExperience identity={identity} initialMode="create" active={false} onClose={noop}/>;break;
 case 'messages':source='ConsoleShell,Sheet,MessageComposer,TypingBubble,PaymentMessage';body=<MessagesExample example={example}/>;break;
 default:source='ConsoleShell,LiveAccount,BalanceChart';body=<LiveAccount walletHistory={sampleHistory} wallet={sample} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>;
 }
 return <><div className="product-screen" data-product-example={screen} data-source-components={source}><div className="product-example-label">Actual interface · Example data</div><div className="product-screen-window" inert>{screen==='entry'?body:<ConsoleShell panel="account" active={false} identityLabel="EX" onNavigate={noop} onDeposit={noop} onProfile={noop} onMessages={noop}>{screen==='account'?body:<><LiveAccount walletHistory={sampleHistory} wallet={sample} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>{body}</>}</ConsoleShell>}</div></div>{screen==='messages'&&<details className="product-transcript"><summary>Read the conversation</summary><div><p><strong>You</strong>{moneyExample(example).question}</p><p><strong>Your agent</strong>{moneyExample(example).answer}</p><p><strong>You</strong>{moneyExample(example).followup}</p><p><strong>Your agent</strong>{moneyExample(example).followupAnswer}</p></div></details>}</>;
}
