import{productExampleCatalog as exampleCatalog,productExamplePortfolio as examplePortfolio,productExampleWallet as wallet,productExampleCashHistory as history,productExampleInvestmentHistory as exampleInvestmentHistory,productExampleHeldSources as exampleHeldSources}from'./product-fixtures';
import {DailyMoneyWorkflow} from './DailyMoneyWorkflow';
import {dailyMoneyStories} from '../content/daily-money-stories.mjs';
import {AgentWorkflowExample} from './AgentWorkflowExample';
/** Read-only product illustrations. Never mounted as an account or admitted as proof. */
import type {ReactNode} from 'react';
import {calculateWalletFundingAttributions} from '../receiz/ledger-wallet-fifo';
import {indexLedgerRelations} from '../receiz/ledger-economy';
import {readLedgerDetails} from '../receiz/ledger-inspection';
import {exampleAssets} from '../content/product-example-assets.mjs';
import {Market} from '../features/market/Market';
import {MarketOverviewView} from '../features/market/MarketOverview';
import {publicShareCapitalization} from '../receiz/market-share-inventory';
import {PublicAssetDetail} from '../features/market/PublicAssetDetail';
import {LiveAssets} from '../features/assets/LiveAssets';
import {LiveOwnership} from '../features/assets/LiveOwnership';
import {Ledger} from '../features/ledger/Ledger';
import {IdentityProfile} from '../features/account/IdentityProfile';
import {OfflineNotes} from '../features/notes/OfflineNotes';
import {CreateAsset} from '../features/assets/CreateAsset';
import {CreatedAssetResult,type CreatedAssetResultValue} from '../features/assets/CreatedAssetResult';
import {MerchantCounter} from '../features/account/MerchantCounter';
import {WalletPaymentReview,WalletPaymentResult} from '../features/account/WalletSendOperation';
import type {WalletSendReview} from '../receiz/wallet-send';

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
import type {ChatMessage} from '../receiz/native-messaging';
import type {PublicRecord} from '../receiz/public-network';
const noop=()=>{};
const forbidden=()=>{throw Error('PRODUCT_EXAMPLE_IS_READ_ONLY');};
// Methods fail closed even if someone mistakenly mounts this static illustration.
const identity={username:'example',accountUsername:()=> 'example',binding:{identityOwnerReceizId:'example.receiz.id',artifactOwnerReceizId:'example.receiz.id'},needsPhrase:false,knownDeposits:()=>exampleHeldSources,knownPortfolio:()=>examplePortfolio,vaults:forbidden} as unknown as OpenIdentity;
const record:PublicRecord={id:'example-payment',sourceId:'example-payment',source:'wallet',kind:'payment',title:'Payment to Alex',detail:'Design work · Example payment',time:'2026-10-20T12:00:00Z',actor:'Example account',amountUsdCents:'12500',kaiUpulse:null,pulse:null,sourceUrl:null,sender:'Example account',recipient:'Alex · Example',evidence:{},authority:'account-source-projection',details:{note:'Design work',sender:'Example account',recipient:'Alex · Example'}};
const exampleFundingRows=[{id:'example-opening',user_id:'example-only',direction:'credit',entry_kind:'market_sell',amount_usd_cents:'100000',amount_phi_micro:'50000000',created_at:'2026-10-18T12:00:00Z',kai_upulse:'100000000',metadata:{source:'market_trade',marketItemId:'example-book'}},{id:'example-credit-in',user_id:'example-only',direction:'credit',entry_kind:'admin_adjustment',amount_usd_cents:'25000',amount_phi_micro:'12500000',created_at:'2026-10-19T12:00:00Z',kai_upulse:'110000000',metadata:{source:'stripe_checkout_wallet_deposit'}},{id:'example-payment',user_id:'example-only',direction:'debit',entry_kind:'payment',amount_usd_cents:'12500',amount_phi_micro:'6250000',created_at:'2026-10-20T12:00:00Z',kai_upulse:'120000000',metadata:{settledUsdCents:'12500'}}];
record.kaiUpulse='120000000';record.pulse='120';
record.details=readLedgerDetails({...record.details,publicNote:'Design work',fundingAttribution:calculateWalletFundingAttributions(exampleFundingRows,'example-only',true).get('example-payment')});
record.valueOperands={amountPhiMicro:'6250000',usdPerPhiMicrocents:'2000000000',settledUsdCents:'12500',phiUsdCents:'0'};
const exampleFundingRecord:PublicRecord={id:'example-credit-in',sourceId:'example-credit-in',source:'wallet',kind:'deposit',title:'Account deposit · Example',detail:'Incoming payment · Example data',time:'2026-10-19T12:00:00Z',actor:'Example account',amountUsdCents:'25000',kaiUpulse:'110000000',pulse:null,sourceUrl:null,sender:'Example payer',recipient:'Example account',evidence:{},authority:'account-source-projection',details:{}};
const exampleMarketCap=publicShareCapitalization(exampleCatalog);
const exampleMarketPoints=['850000','1000000','1125000'].map((value,index)=>({at:`2026-10-${18+index}T12:00:00Z`,pulse:index+1,usdCents:(BigInt(exampleMarketCap.usdCents)*BigInt(value)/1125000n).toString()}));
const exampleReview:WalletSendReview={schema:'bank.wallet-send-review.v1',ownerReceizId:'example.receiz.id',accountUid:'example-only',recipientUserId:'alex-example',recipientLabel:'Alex · Example',amountUsdCents:'12500',clientNonce:'example-not-a-payment',digest:'example-not-an-approval',note:'Design work',quote:{amountUsdCents:'12500',amountPhiMicro:'6250000',usdPerPhiMicrocents:'2000000000',settledUsdCents:'12500',ecosystemUsdCents:'0',fundingRule:'settled_first_then_phi'}};
const exampleCreatedAsset:CreatedAssetResultValue={title:exampleCatalog.items[0].title,digest:'Example source · not an admitted proof',publication:{status:'published'},assetDefinition:{name:exampleCatalog.items[0].title,symbol:'FIELD',units:'1000',description:'Example asset',linkedProofDigest:null}};
export const productScreenNames=['entry','account','deposit','receive','send','record','vault','messages','market','assets','ledger','identity','note-create','note-review','note-deposit','send-ownership','send-review','send-complete','receive-checkout','receive-embedded','counter','create-asset','created-asset','signed-asset','deposit-asset','add-money','asset-detail',...exampleAssets.map(asset=>'asset-detail-'+asset.id)] as const;
export type ProductScreenName=typeof productScreenNames[number];
function textMessage(body:string,id:string):ChatMessage{return{id:'example-'+id,conversationId:'example-only',senderUserId:'example-only',senderKind:'user',senderAiId:null,senderDisplay:'You',body,createdAt:'2026-10-20T12:00:00.000Z',receizedAt:'2026-10-20T12:00:00.000Z',receipt:null,sealedOriginalAvailable:false};}
function MessagesExample({example='overview'}:{example?:string}){if(example==='agent-workflow')return <AgentWorkflowExample/>;if(dailyMoneyStories[example])return <DailyMoneyWorkflow example={example}/>;const story=moneyExample(example);return <Sheet title="Your agent" active={false} onClose={noop}><section className="bank-messaging" data-example-scenario={example}><nav className="bank-messaging-nav"><button className="active">Your agent</button><button>Messages</button></nav><div className="bank-conversation-scroll"><div className="bank-thread-messages"><div className="bank-message-own"><PaymentMessage message={textMessage(story.question,'question')} accountUid="example-only" members={[]}/></div><div data-example-response data-example-answer={story.answer}><TypingBubble name="Your agent" text={story.answer}/></div><div className="bank-message-own" data-example-followup><PaymentMessage message={textMessage(story.followup,'followup')} accountUid="example-only" members={[]}/></div><div data-example-response data-example-followup data-example-answer={story.followupAnswer}><TypingBubble name="Your agent" text={story.followupAnswer}/></div></div></div><MessageComposer draft="" setDraft={noop} submit={event=>event.preventDefault()} placeholder="Ask about your money…" busy={false} maxLength={16000}/></section></Sheet>;}
export function ProductScreen({screen,example='overview',financialStage='before'}:{screen:ProductScreenName|string;example?:string;financialStage?:'before'|'after'}){
 const exampleCents=financialStage==='after'&&dailyMoneyStories[example]?dailyMoneyStories[example].remainingBalanceCents:moneyExample(example).balanceCents;
 const sample=example!=='overview'||screen==='messages'?{...wallet,totalUsdCents:exampleCents,reserveUsdCents:exampleCents}:wallet;
 const sampleHistory=example!=='overview'||screen==='messages'?history.map(point=>({...point,totalUsdCents:sample.totalUsdCents!,reserveUsdCents:sample.reserveUsdCents!})):history;
 const sampleRecord=example==='action-followthrough'?{...record,id:'example-leah-deposit',sourceId:'example-leah-deposit',title:'Payment from Leah',valueOperands:{amountPhiMicro:'45000000',usdPerPhiMicrocents:'2000000000',settledUsdCents:'90000',phiUsdCents:'0'},detail:'Package deposit · Example payment',amountUsdCents:'90000',sender:'Leah · Example',recipient:'Example account',details:{note:'Package deposit',publicNote:'Package deposit',sender:'Leah · Example',recipient:'Example account'}}:record;
 let body:ReactNode,source:string;
 const sheet=(title:string,content:ReactNode)=><Sheet title={title} active={false} onClose={noop}>{content}</Sheet>;
 const selectedExample=screen.startsWith('asset-detail-')?exampleCatalog.items.find(item=>item.id===screen.slice('asset-detail-'.length))??exampleCatalog.items[0]:exampleCatalog.items[0];
 switch(screen.startsWith('asset-detail-')?'asset-detail':screen){
 case 'asset-detail':source='ConsoleShell,Sheet,PublicAssetDetail';body=sheet('Your asset',<PublicAssetDetail item={selectedExample} onTrade={noop}/>);break;
 case 'market':source='ConsoleShell,Market,MarketOverview,PublicObjectRow';body=<Market overview={<MarketOverviewView catalog={exampleCatalog} period="ALL" onPeriodChange={noop} onExplore={noop} projection={{source:{currentUsd:Number(exampleMarketCap.usdCents)/100,shareCapitalization:exampleMarketCap,marketAssetsPriced:exampleAssets.length,cardsInCirculation:0,generatedAt:'2026-10-20T12:00:00Z'} as never,points:exampleMarketPoints as never,status:'live'}}/>} active={false} sourceActive={false} onAction={noop} source={{catalog:exampleCatalog,historyCatalog:exampleCatalog,status:'live',quoteStatus:'fresh',sportsStatus:'retained',error:null,refresh:async()=>{}} as never}/>;break;
 case 'assets':source='ConsoleShell,LiveAssets,Investments,PublicObjectRow';body=<LiveAssets identity={identity} active={false} revision={0} showcase={exampleCatalog.items} investments={{data:examplePortfolio,busy:false,error:false}} investmentHistory={exampleInvestmentHistory} marketItems={exampleCatalog.items} source={{sources:exampleHeldSources,error:'',busy:false}} onOpen={noop}/>;break;
 case 'ledger':source='ConsoleShell,Ledger,LedgerInspector';body=<Ledger active={false} initialTab="mine" personalHistory={{available:true,completeAtSealedHead:true,records:[{...record,accountFlow:'out'}]}}/>;break;
 case 'identity':source='ConsoleShell,Sheet,IdentityProfile';body=sheet('Your account',<IdentityProfile identity={identity} active={false} onForget={async()=>forbidden()} onRefresh={noop}/>);break;
 case 'note-create':case 'note-review':case 'note-deposit':source='ConsoleShell,Sheet,OfflineNotes,OfflineNotePreview';body=sheet(screen==='note-deposit'?'Receive':'Send',<OfflineNotes identity={identity} mode={screen==='note-deposit'?'deposit':'create'} initialReview={screen==='note-review'} onBack={noop} onRefresh={noop}/>);break;
 case 'send-ownership':source='ConsoleShell,Sheet,LiveOwnership';body=sheet('Send',<LiveOwnership identity={identity} onRefresh={noop}/>);break;
 case 'send-review':source='ConsoleShell,Sheet,WalletPaymentReview';body=sheet('Send',<WalletPaymentReview review={exampleReview} approved={false} busy={false} onApprove={noop} onSend={noop} onEdit={noop}/>);break;
 case 'send-complete':source='ConsoleShell,Sheet,WalletPaymentResult';body=sheet('Send',<WalletPaymentResult outcome={{status:'recorded',clientNonce:'example-not-a-payment',transferId:'example-not-a-transfer'}} busy={false} onCheck={noop} onAgain={noop}/>);break;
 case 'receive-checkout':case 'receive-embedded':source='ConsoleShell,Sheet,LiveReceive,PaymentTools';body=sheet('Receive',<LiveReceive identity={identity} active={false} initialLinkMode="checkout" initialToolsMode={screen==='receive-embedded'?'checkout':'button'}/>);break;
 case 'counter':source='ConsoleShell,Sheet,MerchantCounter';body=sheet('Receive',<MerchantCounter identity={identity} visible={false} onBack={noop}/>);break;
 case 'create-asset':source='ConsoleShell,Sheet,CreateAsset';body=sheet('Create an asset',<CreateAsset identity={identity} onClose={noop} onRefresh={noop}/>);break;
 case 'created-asset':case 'signed-asset':source='ConsoleShell,Sheet,CreatedAssetResult';body=sheet('Create an asset',<CreatedAssetResult result={{...exampleCreatedAsset,pbiSigned:screen==='signed-asset'}} settings={{symbol:'FIELD',units:'1000'}} busy={false} error="" username="example" publicItem={exampleCatalog.items[0]} onRetryDelivery={forbidden} onPublishMarket={forbidden} onOpenAsset={forbidden} onSave={forbidden} onClose={noop}/>);break;
 case 'deposit-asset':source='ConsoleShell,Sheet,LiveDeposit';body=sheet('Add',<LiveDeposit identity={identity} initialKind="asset" onCreateAsset={noop} onClose={noop} onRefresh={noop}/>);break;
 case 'add-money':source='ConsoleShell,Sheet,LiveDeposit';body=sheet('Add',<LiveDeposit identity={identity} onClose={noop} onRefresh={noop} funding={{purpose:'payment',onCredited:noop}}/>);break;
 case 'entry':source='Entrance';body=<Entrance opening={false} busy={false} error={null} onCreate={async()=>forbidden()} onImport={async()=>forbidden()}/>;break;
 case 'deposit':source='ConsoleShell,Sheet,LiveDeposit';body=sheet('Add',<LiveDeposit identity={identity} onClose={noop} onRefresh={noop}/>);break;
 case 'receive':source='ConsoleShell,Sheet,LiveReceive';body=sheet('Receive',<LiveReceive identity={identity} active={false}/>);break;
 case 'send':source='ConsoleShell,Sheet,LiveSend';body=sheet('Send',<LiveSend identity={identity} wallet={wallet} initialRequest={{recipient:'alex',amount:'125.00'}} initialMemo="Design work" onClose={noop}/>);break;
 case 'record':source='ConsoleShell,Sheet,LedgerInspector';body=sheet('Transaction details',<LedgerInspector record={sampleRecord} value={{amountUsdCents:sampleRecord.amountUsdCents!,basis:'payment',pulse:null,considerationUsdCents:null}} relations={indexLedgerRelations([sampleRecord,exampleFundingRecord])} inApp initiallyExpanded/>);break;
 case 'vault':source='ConsoleShell,VaultExperience,Sheet';body=<VaultExperience identity={identity} initialMode="create" active={false} onClose={noop}/>;break;
 case 'messages':source=example==='agent-workflow'?'ConsoleShell,Sheet,MessageComposer,TypingBubble,PaymentMessage,ContactsView,PersonView,CalendarView,EventView,LedgerInspector':'ConsoleShell,Sheet,MessageComposer,TypingBubble,PaymentMessage';body=<MessagesExample example={example}/>;break;
 default:source='ConsoleShell,LiveAccount,BalanceChart,AccountInvestmentValue,AccountAssetSummary';body=<LiveAccount portfolio={examplePortfolio} marketItems={exampleCatalog.items} showcase={exampleCatalog.items} walletHistory={sampleHistory} wallet={sample} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>;
 }
 return <><div className="product-screen" data-product-example={screen} data-source-components={source}><div className="product-example-label">Actual interface · Example data</div><div className="product-screen-window" inert>{screen==='entry'?body:<ConsoleShell panel={['market','assets','ledger'].includes(screen)?screen as 'market'|'assets'|'ledger':'account'} active={false} identityLabel="EX" onNavigate={noop} onDeposit={noop} onProfile={noop} onMessages={noop}>{['account','market','assets','ledger'].includes(screen)?body:<><LiveAccount portfolio={examplePortfolio} marketItems={exampleCatalog.items} showcase={exampleCatalog.items} walletHistory={sampleHistory} wallet={sample} busy={false} error={null} observedAt={null} onRefresh={noop} onSend={noop} onReceive={noop} onBalance={noop} onAssets={noop} onLedger={noop}/>{body}</>}</ConsoleShell>}</div></div>{screen==='messages'&&<details className="product-transcript"><summary>Read the conversation</summary><div><p><strong>You</strong>{moneyExample(example).question}</p><p><strong>Your agent</strong>{moneyExample(example).answer}</p><p><strong>You</strong>{moneyExample(example).followup}</p><p><strong>Your agent</strong>{moneyExample(example).followupAnswer}</p></div></details>}</>;
}
