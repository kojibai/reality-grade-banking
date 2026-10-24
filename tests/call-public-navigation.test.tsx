// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import App from '../src/App';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {NativeMessaging} from '../src/receiz/native-messaging';
import {requestBankNavigation} from '../src/core/bank-navigation';
import {directoryContent,fitContent} from '../scripts/business-fit-pages.mjs';
import {cooperativeContent} from '../scripts/cooperative-page.mjs';
import {businessFits} from '../src/content/business-fits.mjs';
const account=vi.hoisted(()=>({identity:null as unknown as OpenIdentity}));
vi.mock('../src/receiz/useNativeAccount',()=>({useNativeAccount:()=>({identity:account.identity,wallet:null,refresh:async()=>{},forget:async()=>{}})}));
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>({catalog:null,status:'loading'})}));
vi.mock('../src/receiz/usePrivateHistory',()=>({usePrivateHistory:()=>({cache:null})}));
vi.mock('../src/features/account/LiveAccount',()=>({LiveAccount:()=>null}));
vi.mock('../src/features/assets/LiveAssets',()=>({LiveAssets:()=>null}));
vi.mock('../src/features/ledger/Ledger',()=>({Ledger:()=>null}));
vi.mock('../src/features/market/Market',()=>({Market:()=>null}));
vi.mock('../src/features/market/PublicAssetTradePortal',()=>({PublicAssetTradePortal:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

it('returns the retained call from actual public paths through the production App and public navigation pipeline',async()=>{
 const uid='33333333-3333-4333-8333-333333333333',cid='11111111-1111-4111-8111-111111111111';
 const peer={kind:'user' as const,userId:'44444444-4444-4444-8444-444444444444',username:'studio',displayName:'Studio',avatarUrl:null};
 const conversation={id:cid,kind:'dm',title:'Studio',members:[peer],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:'2026-10-20T12:00:00Z',updatedAt:'2026-10-20T12:00:00Z',lastMessageAt:null};
 const call={id:'22222222-2222-4222-8222-222222222222',conversationId:cid,mode:'voice',status:'active',topology:'mesh',participants:[{participantKind:'user',userId:uid,leftAt:null,displayName:'You'}],activeParticipantCount:1,viewerPermissions:{canEndCall:true}};
 const heldFetch=vi.fn(async(path:string,init?:RequestInit)=>path.endsWith('/ice')?Response.json({ok:true,iceServers:[{urls:'stun:synthetic.invalid'}],source:'fallback'}):path.includes('/signals?')?Response.json({ok:true,signals:[],lastSignalAt:null}):Response.json({ok:true,call,activeCall:call,calls:[call],method:init?.method}));
 const api={accountUid:uid,twin:{readiness:()=>({status:'configured'})},knownConversations:()=>[conversation],knownMessages:()=>null,conversations:async()=>[conversation],messages:async()=>({conversation,messages:[],hasMore:false,nextCursor:null}),callTransport:{heldFetch}} as unknown as NativeMessaging;
 account.identity={binding:{identityOwnerReceizId:'synthetic'},localHistory:{},knownTwinAccess:()=>false,messaging:async()=>api} as unknown as OpenIdentity;
 const stop=vi.fn(),track={kind:'audio',id:'synthetic-call-audio',enabled:true,readyState:'live',stop},stream=Object.assign(new MediaStream([track as unknown as MediaStreamTrack]),{getTracks:()=>[track]});
 const media=vi.fn(async()=>stream);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:media}});
 const outbound=vi.fn(()=>{throw Error('No real network allowed');});vi.stubGlobal('fetch',outbound);
 history.replaceState(null,'','/#market/messages');document.head.innerHTML='<title>Bank</title>';
 const host=document.createElement('div');host.id='root';document.body.append(host);const root=createRoot(host),data=document.createElement('script');data.id='receiz-navigation';
 const style=document.createElement('style');style.dataset.bankStylesheet='/fixture-bank.css';style.media='all';document.head.append(style);
 data.textContent=JSON.stringify({pages:{'/cooperatives/':{head:'<title>Cooperatives</title><style data-public-page-style="cooperatives">.coop{color:navy}</style>',content:cooperativeContent()},'/business/for/':{head:'<title>Fits</title>',content:directoryContent()},'/business/for/agencies/':{head:'<title>Agencies</title>',content:fitContent(businessFits[0])},'/asset/example/':{head:'<title>Public asset</title>',content:'<main>Public asset</main>'},'/learn/guide/':{head:'<title>Guide</title><style data-public-page-style="guide">.guide{color:navy}</style>',content:'<main class="guide">Guide</main>'}},bank:{head:'<title>Bank</title>',styles:['/fixture-bank.css'],entry:'/never-import-bank.js'}});document.body.append(data);
 const load=vi.fn(async()=>{}),scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const click=async(label:string)=>{const button=document.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);expect(button,label).not.toBeNull();await act(async()=>button!.click());};
 const go=async(href:string)=>{const link=document.createElement('a');link.href=href;document.body.append(link);await act(async()=>link.click());link.remove();};
 try{
  await act(async()=>root.render(<App/>));
  const source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];new Function('loadModule',source.replaceAll('import(','loadModule('))(load);
  await click('Open conversation Studio');await act(async()=>{await import('../src/features/messages/CallPanel');});await click('Voice call');await click('Join call');
  const video=document.querySelector<HTMLVideoElement>('.bank-call video')!,originalRoot=host,originalDocument=document;expect(video,document.querySelector('.bank-call')?.textContent??'No call').not.toBeNull();expect(video.srcObject).toBe(stream);
  for(const path of['/asset/example/','/learn/guide/','/business/for/','/business/for/agencies/','/cooperatives/']){
   await go(path);expect(location.pathname).toBe(path);expect(host.hidden).toBe(true);expect(style.media).toBe('not all');expect(document.querySelector('.bank-call-minimized video')).toBe(video);
   expect(requestBankNavigation('https://example.invalid/#account/messages')).toBe(false);expect(location.pathname).toBe(path);
   await click('Return to call');
   expect(location.pathname).toBe('/');expect(location.hash).toBe('#market/messages');expect(document.title).toBe('Bank');expect(style.media).toBe('all');expect(document.querySelector('style[data-public-page-style]')).toBeNull();expect(host.hidden).toBe(false);expect(host.hasAttribute('inert')).toBe(false);expect(document.querySelector('#public-learn-root')?.getAttribute('hidden')).not.toBeNull();
   expect(document.getElementById('root')).toBe(originalRoot);expect(document).toBe(originalDocument);expect(document.querySelector('.bank-call:not(.bank-call-minimized) video')).toBe(video);expect(video.srcObject).toBe(stream);expect(host.querySelector('dialog')?.open).toBe(true);expect(stop).not.toHaveBeenCalled();
  }
  // A requested Bank hash must also beat the generic remembered bankUrl for
  // ordinary anchors. Hashless Enter Bank links retain their old behavior.
  await go('/learn/guide/');await go('/#ledger/messages');expect(location.hash).toBe('#ledger/messages');expect(host.hidden).toBe(false);expect(document.querySelector('.bank-call video')).toBe(video);
  expect(media).toHaveBeenCalledOnce();expect(heldFetch.mock.calls.filter(([,init])=>init?.method==='POST'&&String(init.body).includes('"action":"join"'))).toHaveLength(1);expect(heldFetch.mock.calls.filter(([,init])=>init?.method==='DELETE')).toHaveLength(0);expect(load).not.toHaveBeenCalled();expect(outbound).not.toHaveBeenCalled();
  await click('Leave call');expect(stop).toHaveBeenCalledOnce();expect(heldFetch.mock.calls.filter(([,init])=>init?.method==='DELETE')).toHaveLength(1);
 }finally{act(()=>root.unmount());host.remove();data.remove();document.getElementById('public-learn-root')?.remove();style.remove();scroll.mockRestore();vi.unstubAllGlobals();history.replaceState(null,'','/');}
});
