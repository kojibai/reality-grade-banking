import {readReceiptSnapshot,receiptSnapshotDigest,receiptSnapshotUrl} from '../src/receiz/receipt-snapshot';
import {readReceiptLink,type LedgerReceipt} from '../src/receiz/ledger-receipts';
import {BANK_PUBLIC_ORIGIN} from '../src/receiz/config';
import {formatMoney} from '../src/core/money';
import {ledgerRecordTitle} from '../src/receiz/ledger-payment-records';
import {ledgerValueLabel} from '../src/receiz/ledger-value';

type PreviewDependencies={page():Promise<string>;image(receipt:LedgerReceipt):Promise<Uint8Array>};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const clean=(value:string,max:number)=>value.replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function receiptPreviewText(receipt:LedgerReceipt){
 const cents=receipt.value?receipt.value.amountUsdCents:receipt.amountUsdCents;
 const amount=cents===null?'Source record':formatMoney(cents);
 const title=clean(ledgerRecordTitle({kind:receipt.kind,title:receipt.title,source:receipt.source} as Parameters<typeof ledgerRecordTitle>[0]),60);
 const parties=[receipt.sender,receipt.recipient].filter(Boolean).map(name=>clean(name!,40)).join(' → ');
 const time=receipt.time?new Date(receipt.time).toLocaleString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' UTC':receipt.pulse?`☤KAI ${BigInt(receipt.pulse).toLocaleString('en-US')}`:'Source-carried receipt';
 return {amount,title,parties,time,valueLabel:receipt.value?ledgerValueLabel(receipt.value):'Recorded amount'};
}
function receiptHtml(html:string,receipt:LedgerReceipt,canonical:string,packet:string,shortDigest?:string){
 const text=receiptPreviewText(receipt),title=`${text.amount} · ${text.title} | Bankeiz`,description=[text.parties,text.time,'Open the receipt for its carried record and technical details.'].filter(Boolean).join(' · ');
 const image=`${BANK_PUBLIC_ORIGIN}/api/receipt?${shortDigest?'s='+shortDigest:'r='+packet}&image=1`;
 const tags=`<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="no-referrer">
<link rel="canonical" href="${escape(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bankeiz">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(canonical)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1730">
<meta property="og:image:height" content="909">
<meta property="og:image:alt" content="${escape([text.amount,text.title,text.parties,text.time].filter(Boolean).join(' · '))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(image)}">
<meta name="twitter:image:alt" content="${escape(text.amount+' · '+text.title)}">`;
 return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'')
  .replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|robots|referrer|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'')
  .replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi,'')
  .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<\/head>/i,()=>tags+'\n</head>')
  .replace(/<\/body>/i,()=>(shortDigest?`<script type="application/json" id="receipt-snapshot" data-digest="${shortDigest}">${JSON.stringify(receipt).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}</script>`:'')+'</body>');
}
export async function handleReceiptPreview(request:Request,deps?:PreviewDependencies):Promise<Response>{
 const headers=new Headers({'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
 if(!['GET','HEAD'].includes(request.method)){headers.set('Allow','GET, HEAD');return new Response(null,{status:405,headers});}
 let receipt:LedgerReceipt|undefined,packet='',image=false,shortDigest:string|null=null;
 try{
  const url=new URL(request.url);
  shortDigest=receiptSnapshotDigest(url.origin+url.pathname);
  if(!['/receipt/','/api/receipt'].includes(url.pathname)&&!shortDigest||url.hash||[...url.searchParams.keys()].some(key=>!['r','s','digest','image'].includes(key)||url.searchParams.getAll(key).length!==1)||url.searchParams.has('image')&&url.searchParams.get('image')!=='1')throw Error();
  const selected=url.searchParams.get('s');
  if(selected!==null){if((url.pathname!=='/api/receipt'&&shortDigest!==selected)||shortDigest!==null&&shortDigest!==selected||url.searchParams.has('r')||!/^[a-f0-9]{64}$/.test(selected))throw Error();shortDigest=selected;}
  // Hosting may carry the named path parameter as well as our explicit
  // selector. Every supplied coordinate must identify the same exact record.
  if(url.searchParams.has('digest')&&url.searchParams.get('digest')!==shortDigest)throw Error();
  if(shortDigest&&url.searchParams.has('r'))throw Error();
  packet=url.searchParams.get('r')??'';image=url.searchParams.get('image')==='1';
  if(!shortDigest)receipt=readReceiptLink(`${BANK_PUBLIC_ORIGIN}/receipt/?r=${packet}`);
 }catch{return new Response(request.method==='HEAD'?null:'Receipt link is incomplete or unsupported.',{status:400,headers});}
 headers.set('Content-Type',image?'image/png':'text/html; charset=utf-8');
 // Metadata probes never read the template, load fonts or render an image.
 if(request.method==='HEAD')return new Response(null,{headers});
 try{
  const dependencies=deps??{
   page:async()=>(await import('node:fs/promises')).readFile('dist/receipt/index.html','utf8'),
   image:async(receipt:LedgerReceipt)=>(await import('./receipt-preview-render')).renderReceiptImage(receipt),
  };
  // Prepare only the existing HTML template. Its failure cannot outrank the
  // exact receipt read, and a rejected template never becomes unhandled.
  const page=image?null:dependencies.page().then(value=>({ok:true as const,value}),error=>({ok:false as const,error}));
  if(shortDigest){receipt=await readReceiptSnapshot(shortDigest);headers.set('Cache-Control','public, max-age=60, s-maxage=300');}
  if(!receipt)throw Error('RECEIPT_INVALID');
  if(image){const bytes=await dependencies.image(receipt);headers.set('Cache-Control','public, max-age=31536000, immutable');return new Response(bytes as Uint8Array<ArrayBuffer>,{headers});}
  const template=await page!;if(!template.ok)throw template.error;
  return new Response(receiptHtml(template.value,receipt,shortDigest?receiptSnapshotUrl(shortDigest):`${BANK_PUBLIC_ORIGIN}/receipt/?r=${packet}`,packet,shortDigest??undefined),{headers});
 }catch(error){headers.set('Cache-Control','no-store');return new Response(error instanceof Error&&error.message==='RECEIPT_NOT_FOUND'?'Receipt not found.':'Receipt preview is temporarily unavailable.',{status:error instanceof Error&&error.message==='RECEIPT_NOT_FOUND'?404:503,headers});}
}
