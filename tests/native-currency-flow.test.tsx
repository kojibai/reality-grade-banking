// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LiveReceive } from '../src/features/account/LivePayments';
import { openCurrencyNoteFile } from '../src/receiz/currency-notes';
import { microPulsesSinceGenesis } from '../native/receiz/app/utils/kai_pulse';
import { CreateAsset } from '../src/features/assets/CreateAsset';
import { LiveDeposit } from '../src/features/deposit/LiveDeposit';
import { CurrencySettings } from '../src/features/assets/CurrencySettings';
import { LiveOwnership } from '../src/features/assets/LiveOwnership';
import type { OpenIdentity } from '../src/receiz/native-identity';
import * as nativeAsset from '../src/receiz/native-asset';
import type { BankOperationResult, BankOperationInput } from '../src/receiz/bank-operations';
import type { AssetComposerDraft } from '../src/receiz/asset-composer';
import type { HeldDeposit } from '../src/receiz/deposit-source';

const review=vi.hoisted(()=>({input:undefined as (()=>BankOperationInput)|undefined,operations:undefined as (()=>Promise<unknown>)|undefined,onResult:undefined as ((result:BankOperationResult)=>void)|undefined}));
vi.mock('../src/features/account/NativeOperation',()=>({NativeOperation:(props:{input:()=>BankOperationInput;operations?:()=>Promise<unknown>;onResult?:(result:BankOperationResult)=>void;children:React.ReactNode})=>{
 review.input=props.input;review.operations=props.operations;review.onResult=props.onResult;return props.children;
}}));
vi.mock('../src/receiz/currency-notes', async importOriginal => ({
 ...(await importOriginal<typeof import('../src/receiz/currency-notes')>()), openCurrencyNoteFile:vi.fn(),
}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function enter(host:HTMLElement,label:string,value:string) {
 const field=[...host.querySelectorAll('label')].find(element=>element.textContent?.startsWith(label))?.querySelector('input');
 expect(field).toBeDefined();
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);
 field!.dispatchEvent(new Event('input',{bubbles:true}));
}

it('opens currency issue inside An asset, preserves the Original draft, and stages an authored draft with the selected terms',async()=>{
 const host=document.createElement('div'),root=createRoot(host),operations=vi.fn((draft:AssetComposerDraft)=>({draft}));
 const identity={backedAssetPublication:async()=>({pending:async()=>null,operations}),currencyNotes:vi.fn()} as unknown as OpenIdentity;
 document.body.append(host);
 try {
  const props={identity,onClose:()=>{},onRefresh:()=>{}};
  await act(async()=>root.render(<LiveDeposit {...props} onCreateAsset={()=>root.render(<CreateAsset {...props}/>)}/>));
  expect([...host.querySelectorAll('.deposit-options button strong')].map(label=>label.textContent)).toEqual([
   'Add money','An asset','Notes',
  ]);
  const findButton=(name:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent?.trim()===name)!;
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('.deposit-options button')].find(button=>button.querySelector('strong')?.textContent==='An asset')!.click());
  expect(host.textContent).toContain('Make it yours.');
  await act(async()=>enter(host,'Title','An Original in progress'));
  const issue=findButton('Issue a currency');
  expect(issue.closest('.asset-canvas-empty')).toBe(host.querySelector('[aria-label="Use an existing proof"]')?.closest('.asset-canvas-empty'));
  await act(async()=>{issue.click();await vi.dynamicImportSettled();});
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Go back"]')!.click());
  expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')?.value).toBe('An Original in progress');
  expect(host.querySelector('.currency-creation')).toBeNull();
  await act(async()=>{issue.click();await vi.dynamicImportSettled();});
  expect(host.querySelector('input[aria-label="Supply cap"]')).toBeNull();
  await act(async()=>{
   enter(host,'Name','Field credit');
   enter(host,'Currency code','field');
  });
  expect(host.querySelector('[aria-label="Your currency preview"]')?.textContent).toContain('Field credit');
  const artwork = new File(['local artwork'], 'field.png', {type:'image/png'});
  const picker = host.querySelector<HTMLInputElement>('.currency-creation input[type=file]')!;
  Object.defineProperty(picker,'files',{value:[artwork]});
  await act(async()=>picker.dispatchEvent(new Event('change',{bubbles:true})));
  const click = (name:string) => act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.trim()===name)!.click());
  await click('Set currency terms');
  const advanced = host.querySelector<HTMLDetailsElement>('.currency-advanced')!;
  expect(advanced.open).toBe(false);
  expect(host.textContent).toContain('Community governance');
  await act(async()=>{
   enter(host,'Supply cap','10');
   enter(host,'Purchase price per unit','0.25');
  });
  await click('Edit currency details');
  expect(host.querySelector('img[alt="Selected currency artwork"]')).not.toBeNull();
  await click('Set currency terms');
  const selected=review.input?.();
  expect(selected).toMatchObject({kind:'issue-currency',definition:{name:'Field credit',symbol:'FIELD',units:'10'},policy:{priceUsdCentsPerUnit:'25'}});
  await act(async()=>host.querySelector<HTMLElement>('.currency-advanced summary')!.click());
  expect(host.querySelector<HTMLDetailsElement>('.currency-advanced')?.open).toBe(true);
  const optIn = host.querySelector<HTMLInputElement>('input[type=radio][value=managed]')!;
  await act(async()=>optIn.click());
  expect(review.input?.()).toMatchObject({policy:{issuerControls:true}});
  const opens = '2027-05-01T09:30', closes = '2027-05-02T09:30';
  await act(async()=>{
   enter(host,'Sales start',opens);
   enter(host,'Sales end',opens);
  });
  expect(()=>review.input?.()).toThrow('Enter an end date after the sales start.');
  await act(async()=>enter(host,'Sales end',closes));
  expect(review.input?.()).toMatchObject({policy:{salesWindow:{
   opensAtKaiUPulse:microPulsesSinceGenesis(new Date(opens)).toString(),
   closesAtKaiUPulse:microPulsesSinceGenesis(new Date(closes)).toString(),
  }}});

  await review.operations?.();
  expect(operations).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({title:'Field credit',
   definition:expect.objectContaining({units:'10'}),files:[{id:'currency-artwork',role:'primary',file:artwork}]}));
 } finally {await act(async()=>root.unmount());host.remove();}
});

it('opens the issued currency charter editor from the admitted source without rereading Market', async()=>{
 const host=document.createElement('div'),root=createRoot(host),id='a'.repeat(64),issuer='issuer.receiz.id';
 const actor={artifactSha256:'c'.repeat(64),artifactOwnerReceizId:issuer};
 const readPublicAsset=vi.fn();
 const identity={binding:actor,backedAssetPublication:async()=>({pending:async()=>null,readPublicAsset})} as unknown as OpenIdentity;
 const packet={schema:'receiz.bank.native-asset-result.v1',status:'committed',source:{
  filename:'native-asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',artifactSha256:'f'.repeat(64),exactBytesB64u:'e30',
 }}as const;
 const receipt={schema:'receiz.bank.native-asset-receipt.v1',review:{request:{kind:'issue-currency',actorReceizId:issuer,definition:{name:'Field credit',symbol:'FIELD'}}},
  assetAfter:{id,currency:{policy:{kind:'fixed-reserve-pool',priceUsdCentsPerUnit:'25',issuerControls:true},issuerAccountId:'00000000-0000-4000-8000-000000000001'}}};
 const verifier=vi.spyOn(nativeAsset,'verifyNativeAssetSource').mockResolvedValue({packet,receipt} as unknown as Awaited<ReturnType<typeof nativeAsset.verifyNativeAssetSource>>);
 const load=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Public governance reads unavailable'));
 const findButton=(text:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes(text));
 const click=(text:string)=>act(async()=>{findButton(text)!.click();await vi.dynamicImportSettled();});
 document.body.append(host);
 try {
  await act(async()=>root.render(<CreateAsset identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));
  await click('Issue a currency');
  await act(async()=>{enter(host,'Name','Field credit');enter(host,'Currency code','FIELD');});
  await click('Set currency terms');
  await act(async()=>host.querySelector<HTMLInputElement>('input[value=managed]')!.click());
  expect(findButton('Set up voting and governance')).toBeUndefined();
  await act(async()=>review.onResult?.({status:'committed',nativeAssetSource:packet}));
  await click('Set up voting and governance');
  await act(async()=>{await vi.dynamicImportSettled();});
  expect(verifier).toHaveBeenCalledExactlyOnceWith(packet);
  expect(readPublicAsset).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Field credit · FIELD');
  await click('Create charter');
  expect(host.textContent).toContain('Choose a separate voting membership');
  await act(async()=>enter(host,'Organization name','Field credit members'));
  await click('Continue');
  expect(host.textContent).toContain('Lowest purchase price (USD)');
  expect(host.textContent).toContain('Approval threshold (%)');
  const venuePricing = [...host.querySelectorAll('label')].find(label=>label.textContent?.includes('Set the purchase price from verified venue traffic'))!;
  expect(host.textContent).not.toContain('Observation signer’s Receiz ID');
  await act(async()=>venuePricing.querySelector('input')!.click());
  expect(host.textContent).toContain('Maximum purchase price (optional, USD)');
  expect(host.textContent).toContain('Issue new credits into Market when verified capacity is available');
  expect(host.textContent).toContain('Observation signer’s Receiz ID');
  await act(async()=>enter(host,'Venue identifier','discover'));
  expect(host.querySelector('fieldset legend')?.textContent).toBeTruthy();
 } finally {await act(async()=>root.unmount());host.remove();verifier.mockRestore();load.mockRestore();}
});

it.each(['Receive','Add'] as const)('reviews a currency note through the shared %s deposit picker',async(entry)=>{
 const host=document.createElement('div'),root=createRoot(host),inspect=vi.fn();
 const identity={username:'recipient',binding:{artifactSha256:'b'.repeat(64)},offlineNotes:async()=>({receivedNotes:async()=>[],inspect}),
  currencyNotes:async()=>({files:async()=>[]})} as unknown as OpenIdentity;
 const note={assetId:'a'.repeat(64),issuedBy:'issuer.receiz.id',quantityMicro:'2000000',recipient:null,
  claimCommitment:'c'.repeat(64),claimSecret:'d'.repeat(64),artwork:null};
 vi.mocked(openCurrencyNoteFile).mockClear().mockResolvedValueOnce(note);
 try {
  await act(async()=>root.render(entry==='Receive'
    ? <LiveReceive identity={identity}/>
    : <LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));
  const open = entry==='Receive'
    ? [...host.querySelectorAll('button')].find(button=>button.textContent==='Deposit note')
    : [...host.querySelectorAll<HTMLButtonElement>('.deposit-options button')].find(button=>button.querySelector('strong')?.textContent==='Notes');
  expect(open).toBeDefined();
  await act(async()=>open!.click());
  const picker=host.querySelector<HTMLInputElement>('input[type="file"]')!;
  expect(host.querySelectorAll('input[type="file"]')).toHaveLength(1);
  expect(picker.accept).toContain('.png');
  expect(picker.accept).toContain('.receizcurrency');
  expect(picker.closest('label')?.querySelector('strong')?.textContent).toBe('Choose a Note');
  expect(picker.closest('label')?.textContent).toContain('Original Note image or proof');
  expect(host.textContent).toContain('Review a Settlement or currency Note before depositing it.');
  const file=new File(['fixture'],'field.receizcurrency',{type:'application/json'});
  Object.defineProperty(picker,'files',{value:[file]});
  await act(async()=>picker.dispatchEvent(new Event('change',{bubbles:true})));
  await act(async()=>{await vi.dynamicImportSettled();});
  expect(host.querySelectorAll('input[type="file"]')).toHaveLength(1);
  expect(openCurrencyNoteFile).toHaveBeenCalledExactlyOnceWith(file);
  expect(inspect).not.toHaveBeenCalled();
  expect(review.input?.()).toEqual({kind:'redeem-currency-note',assetId:note.assetId,quantityMicro:note.quantityMicro,claimSecret:note.claimSecret});
 } finally {await act(async()=>root.unmount());}
});

it('uses one available balance when purchasing a public currency by stable asset ID',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 const identity={listDeposits:async()=>[]} as unknown as OpenIdentity, id='a'.repeat(64);
 try {
  await act(async()=>root.render(<LiveOwnership identity={identity} mode="buy" nativeAssetId={id} initialDigest={'b'.repeat(64)}
    publicCurrency={{symbol:'FIELD',priceUsdCentsPerUnit:'25',supplyMicro:'10000000'}} onRefresh={()=>{}}/>));
  expect(host.textContent).toContain('Purchase whole units at $0.25 each from your available balance.');
  expect(host.querySelector('select')).toBeNull();
  expect(review.input?.()).toEqual({kind:'buy-currency',assetId:id,quantityMicro:'1000000'});
 } finally {await act(async()=>root.unmount());}
});

it('sends whole currency units from the held source while preserving the Market share picker',async()=>{
 const host=document.createElement('div'),root=createRoot(host),assetId='a'.repeat(64),head='b'.repeat(64);
 const held:HeldDeposit={digest:'c'.repeat(64),executionDigest:head,filename:'field.receizbundle',title:'Field credit',kind:'proof',status:'held-proof',bytes:new Uint8Array([1]),pulse:'100',
  nativeAsset:{assetId,quantityMicro:'2000000',lockedQuantityMicro:'0',supplyMicro:'10000000',symbol:'FIELD',backingRail:'reserve',backingUsdCents:'0',backingPhiMicro:'0',status:'active',sourceKaiUPulse:'100000000',issuedAtKaiUPulse:'100000000',
   currency:{policy:{kind:'fixed-reserve-pool',priceUsdCentsPerUnit:'25'},availableQuantityMicro:'8000000',liquidityReserveUsdCents:'50',liquidityReservePhiMicro:'200000',liquiditySettlementPhiMicro:'0'}}};
 const marketPortfolio=vi.fn();
 const identity={binding:{artifactSha256:'d'.repeat(64)},knownDeposits:()=>[held],listDeposits:async()=>[held],
  knownMarketPortfolio:()=>({positions:[{id:'position',marketItemId:'asset:held',title:'Held Market share',shareQuantityMicro:'1000000'}]}),marketPortfolio,ownershipShares:vi.fn()} as unknown as OpenIdentity;
 const click=(label:string)=>act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes(label))!.click());
 try{
  await act(async()=>root.render(<LiveOwnership identity={identity} onRefresh={()=>{}}/>));
  expect(host.textContent).toContain('Held Market share');
  await click('Currencies');
  expect(host.textContent).not.toContain('Held Market share');
  await click('Field credit');
  const recipient=host.querySelector<HTMLInputElement>('input[placeholder="Receiz ID or public username"]')!;
  const amount=host.querySelector<HTMLInputElement>('input[aria-label="Whole units to send"]')!;
  await act(async()=>{
   const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
   set.call(recipient,'@receiver');recipient.dispatchEvent(new Event('input',{bubbles:true}));
   set.call(amount,'1.5');amount.dispatchEvent(new Event('input',{bubbles:true}));
  });
  expect(()=>review.input?.()).toThrow('Enter a positive whole number of units.');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='All')!.click());
  expect(review.input?.()).toEqual({kind:'send-ownership',assetDigest:head,quantityMicro:'2000000',recipient:'@receiver'});
  expect(host.textContent).toContain('Estimated market value $0.50');
  await click('USD');
  const dollars = host.querySelector<HTMLInputElement>('[aria-label="Amount in USD"]')!;
  expect(dollars.value).toBe('0.50');
  await act(async()=>enter(host,'Amount in USD','0.49'));
  expect(host.textContent).toContain('You send 1 FIELD');
  expect(host.textContent).toContain('Rounded down to whole FIELD units.');
  expect(review.input?.()).toEqual({kind:'send-ownership',assetDigest:head,quantityMicro:'1000000',recipient:'@receiver'});
  await act(async()=>enter(host,'Amount in USD','0.24'));
  expect(()=>review.input?.()).toThrow('Enter at least $0.25 for one FIELD.');
  await act(async()=>enter(host,'Amount in USD','0.75'));
  expect(()=>review.input?.()).toThrow('Enter a quantity within your available units.');
  await act(async()=>enter(host,'Amount in USD','0.49'));
  await act(async()=>host.querySelector<HTMLButtonElement>('.currency-send-denomination button')!.click());
  expect(host.querySelector<HTMLInputElement>('[aria-label="Whole units to send"]')!.value).toBe('1');
  expect(marketPortfolio).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());}
});

it('reviews creator changes against the exact admitted currency head', async()=>{
 const host=document.createElement('div'),root=createRoot(host),assetId='a'.repeat(64),head='b'.repeat(64),creator='00000000-0000-4000-8000-000000000001';
 const asset={id:assetId,headSourceSha256:head,currency:{
  policy:{kind:'fixed-reserve-pool',priceUsdCentsPerUnit:'25',issuerControls:true},
  issuerAccountId:creator,salesPaused:false,availableQuantityMicro:'1000000',liquidityReserveUsdCents:'0',
  liquidityReservePhiMicro:'0',liquiditySettlementPhiMicro:'0',
 }};
 const identity={backedAssetPublication:async()=>({readPublicAsset:async()=>({asset})})} as unknown as OpenIdentity;
 try {
  await act(async()=>root.render(<CurrencySettings identity={identity} accountUid={creator} assetId={assetId} onRefresh={()=>{}}/>));
  expect(host.textContent).toContain('Current purchase price $0.25');
  await act(async()=>{
   enter(host,'New purchase price per unit','0.40');
   host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
  });
  expect(review.input?.()).toEqual({kind:'manage-currency',assetDigest:head,changes:{priceUsdCentsPerUnit:'40',salesPaused:true}});
 } finally {await act(async()=>root.unmount());}
});

it.each(['service-credit', 'coupon', 'rewards'] as const)('issues the %s preset and requires pool funding when keeping units',async(preset)=>{
 const host=document.createElement('div'),root=createRoot(host);
 const identity={backedAssetPublication:async()=>({pending:async()=>null})} as unknown as OpenIdentity;
 const click=(name:string)=>act(async()=>{
  [...host.querySelectorAll('button')].find(button=>button.textContent?.trim()===name)!.click();
  await vi.dynamicImportSettled();
 });
 document.body.append(host);
 try {
  await act(async()=>root.render(<CreateAsset identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));
  await act(async()=>{
   [...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Issue a currency'))!.click();
   await vi.dynamicImportSettled();
  });
  await act(async()=>host.querySelector<HTMLInputElement>(`input[value="${preset}"]`)!.click());
  await act(async()=>{enter(host,'Name','Studio credit');enter(host,'Currency code','STUDIO');});
  await click('Set currency terms');
  await act(async()=>{enter(host,'Supply cap','10');enter(host,'Purchase price per unit','0.25');});
  expect(review.input?.()).toMatchObject({policy:{kind:'fixed-reserve-pool',preset,priceUsdCentsPerUnit:'25'}});
  await act(async()=>enter(host,'Units you keep','2'));
  expect(host.querySelector('[aria-label="Purchase price per unit"]')).toBeNull();
  expect(()=>review.input?.()).toThrow();
  await act(async()=>enter(host,'Starting liquidity','6'));
  expect(host.textContent).toContain('8 units go to Market');
  expect(review.input?.()).toMatchObject({policy:{kind:'constant-product-pool',preset,creatorQuantityMicro:'2000000',seedUsdCents:'600'}});
  expect((review.input?.() as Extract<BankOperationInput,{kind:'issue-currency'}>).policy).not.toHaveProperty('priceUsdCentsPerUnit');
  await act(async()=>enter(host,'Units you keep','9'));
  expect(()=>review.input?.()).toThrow(/at least two units/i);
  await act(async()=>enter(host,'Units you keep','0'));
  expect(review.input?.()).toMatchObject({policy:{kind:'fixed-reserve-pool',preset,priceUsdCentsPerUnit:'25'}});
  expect(host.textContent).not.toContain('Starting liquidity');
 } finally {await act(async()=>root.unmount());host.remove();}
});
